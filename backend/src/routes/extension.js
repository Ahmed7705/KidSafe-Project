import express from "express";
import pool from "../db.js";
import { evaluateUrl } from "../services/filtering.js";
import { sendAlertEmail } from "../services/alerts.js";
import { requireFields } from "../utils/validation.js";

const router = express.Router();

function parseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed;
  } catch (error) {
    return null;
  }
}

async function getDeviceContext(token) {
  if (!token) {
    return null;
  }
  const [rows] = await pool.query(
    `SELECT devices.id AS device_id, devices.child_id AS child_id, children.user_id AS user_id,
            users.alert_email AS alert_email, children.name AS child_name
     FROM devices
     JOIN children ON devices.child_id = children.id
     JOIN users ON children.user_id = users.id
     WHERE devices.api_token = ?`,
    [token]
  );
  return rows[0];
}

async function getCategoryMap(childId) {
  const [rows] = await pool.query(
    `SELECT c.id, COALESCE(ccs.is_blocked, c.default_blocked) AS is_blocked
     FROM categories c
     LEFT JOIN child_category_settings ccs
       ON c.id = ccs.category_id AND ccs.child_id = ?`,
    [childId]
  );
  return new Map(rows.map((row) => [row.id, row.is_blocked === 1]));
}

router.get("/blocklist", async (req, res) => {
  const token = req.headers["x-device-token"] || req.query.deviceToken;
  const context = await getDeviceContext(token);
  if (!context) {
    return res.status(401).json({ error: "Invalid device token" });
  }
  const [rules] = await pool.query(
    "SELECT id, category_id, pattern, rule_type FROM block_rules WHERE user_id = ? AND is_active = 1",
    [context.user_id]
  );
  const categoryMap = await getCategoryMap(context.child_id);
  const filtered = rules.filter((rule) => {
    if (rule.category_id && categoryMap.has(rule.category_id)) {
      return categoryMap.get(rule.category_id);
    }
    return true;
  });
  return res.json({
    rules: filtered.map((rule) => ({
      id: rule.id,
      pattern: rule.pattern,
      ruleType: rule.rule_type
    }))
  });
});

router.post("/logs", async (req, res) => {
  const token = req.headers["x-device-token"] || req.body.deviceToken;
  const context = await getDeviceContext(token);
  if (!context) {
    return res.status(401).json({ error: "Invalid device token" });
  }
  const required = requireFields(req.body, ["url"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }

  const parsed = parseUrl(req.body.url);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid url" });
  }
  const hostname = parsed.hostname;

  const [rules] = await pool.query(
    "SELECT id, category_id, pattern, rule_type FROM block_rules WHERE user_id = ? AND is_active = 1",
    [context.user_id]
  );
  const categoryMap = await getCategoryMap(context.child_id);
  const evaluation = await evaluateUrl({
    url: parsed.href,
    hostname,
    rules,
    categoryMap
  });

  const [logResult] = await pool.query(
    "INSERT INTO activity_logs (child_id, device_id, url, hostname, verdict, reason) VALUES (?, ?, ?, ?, ?, ?)",
    [context.child_id, context.device_id, parsed.href, hostname, evaluation.verdict, evaluation.reason]
  );

  if (evaluation.verdict === "blocked" || evaluation.verdict === "malicious") {
    const message = `${context.child_name} attempted to access ${hostname}`;
    await pool.query(
      "INSERT INTO alerts (user_id, child_id, activity_log_id, alert_type, message) VALUES (?, ?, ?, ?, ?)",
      [context.user_id, context.child_id, logResult.insertId, evaluation.verdict, message]
    );
    if (context.alert_email) {
      try {
        await sendAlertEmail({
          to: context.alert_email,
          subject: `KidSafe alert: ${evaluation.verdict}`,
          text: `${message}. Reason: ${evaluation.reason}`
        });
      } catch (error) {
        console.warn("Alert email failed", error.message || error);
      }
    }
  }

  await pool.query("UPDATE devices SET last_seen_at = NOW() WHERE id = ?", [context.device_id]);

  return res.json({
    verdict: evaluation.verdict,
    reason: evaluation.reason
  });
});

router.post("/heartbeat", async (req, res) => {
  const token = req.headers["x-device-token"] || req.body.deviceToken;
  const context = await getDeviceContext(token);
  if (!context) {
    return res.status(401).json({ error: "Invalid device token" });
  }
  await pool.query("UPDATE devices SET last_seen_at = NOW() WHERE id = ?", [context.device_id]);
  return res.json({ status: "ok" });
});

export default router;
