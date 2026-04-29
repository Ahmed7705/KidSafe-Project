import express from "express";
import pool from "../db.js";
import { evaluateUrl } from "../services/filtering.js";
import { sendAlertEmail } from "../services/alerts.js";
import { requireFields, toBool } from "../utils/validation.js";

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
            users.alert_email AS alert_email, children.name AS child_name, children.birth_year AS birth_year
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

async function checkScreenTime(childId) {
  const [rules] = await pool.query(
    "SELECT * FROM screen_time_rules WHERE child_id = ? AND is_active = 1",
    [childId]
  );
  const rule = rules[0];
  if (!rule) {
    return { allowed: true };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const allowedDays = (rule.days_of_week || "0,1,2,3,4,5,6").split(",").map(Number);

  if (!allowedDays.includes(currentDay)) {
    return { allowed: false, reason: "Not an allowed day" };
  }

  // Check bedtime
  if (rule.bedtime_start && rule.bedtime_end) {
    const currentTime = now.toTimeString().slice(0, 5);
    const start = rule.bedtime_start.slice(0, 5);
    const end = rule.bedtime_end.slice(0, 5);

    let isBedtime = false;
    if (start <= end) {
      isBedtime = currentTime >= start && currentTime <= end;
    } else {
      isBedtime = currentTime >= start || currentTime <= end;
    }

    if (isBedtime) {
      return { allowed: false, reason: "Bedtime mode is active" };
    }
  }

  // Check daily limit
  if (rule.daily_limit_minutes) {
    const [usage] = await pool.query(
      "SELECT usage_minutes FROM screen_time_usage WHERE child_id = ? AND DATE(date) = CURDATE()",
      [childId]
    );
    const usedMinutes = usage[0]?.usage_minutes || 0;

    if (usedMinutes >= rule.daily_limit_minutes) {
      return { allowed: false, reason: "Daily screen time limit reached" };
    }
  }

  return { allowed: true };
}

async function incrementScreenTime(childId, deviceId, hostname) {
  // Use CURDATE() everywhere so MySQL's timezone is the single source of truth.
  // This avoids JS UTC date strings mismatching MySQL stored dates.

  // Atomic upsert for general screen time with 50-second race-condition guard
  await pool.query(
    `INSERT INTO screen_time_usage (child_id, device_id, date, usage_minutes, last_activity_at)
     VALUES (?, ?, CURDATE(), 1, NOW())
     ON DUPLICATE KEY UPDATE
       usage_minutes = usage_minutes + IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, 1, 0),
       last_activity_at = IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, NOW(), last_activity_at)`,
    [childId, deviceId]
  );

  // Per-site time limit logic
  let cleanHost = null;
  if (hostname) {
    try {
      cleanHost = hostname.trim().toLowerCase();
      if (!cleanHost.startsWith("http")) cleanHost = "http://" + cleanHost;
      cleanHost = new URL(cleanHost).hostname;
      if (cleanHost.startsWith("www.")) {
        cleanHost = cleanHost.substring(4);
      }
    } catch (e) { }
  }

  if (cleanHost) {
    // Atomic upsert for per-site usage with 50-second race-condition guard
    await pool.query(
      `INSERT INTO site_time_usage (child_id, hostname, date, usage_minutes, first_activity_at, last_activity_at)
       VALUES (?, ?, CURDATE(), 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         usage_minutes = usage_minutes + IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, 1, 0),
         last_activity_at = IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, NOW(), last_activity_at)`,
      [childId, cleanHost]
    );
  }
}

async function checkSiteTimeLimits(childId) {
  // Use DATE(u.date) = CURDATE() so comparison works regardless of time component
  const [rows] = await pool.query(
    `SELECT l.hostname, u.first_activity_at, u.last_activity_at 
     FROM site_time_limits l
     JOIN site_time_usage u ON l.child_id = u.child_id AND l.hostname = u.hostname AND DATE(u.date) = CURDATE()
     WHERE l.child_id = ? AND u.usage_minutes >= l.limit_minutes`,
    [childId]
  );
  return rows;
}

async function getSafeSearchSettings(childId) {
  const [rows] = await pool.query(
    "SELECT * FROM safe_search_settings WHERE child_id = ?",
    [childId]
  );
  if (rows.length === 0) {
    return { google: true, youtube: true, bing: true };
  }
  return {
    google: toBool(rows[0].google_safe_search),
    youtube: toBool(rows[0].youtube_restricted),
    bing: toBool(rows[0].bing_safe_search)
  };
}

function checkSafeSearchEnforcement(url, hostname, safeSearchSettings) {
  // Google Safe Search
  if (safeSearchSettings.google && hostname && (hostname.includes("google.com") || hostname.includes("google.co"))) {
    if (url.includes("/search") && !url.includes("safe=active")) {
      return {
        enforce: true,
        reason: "Google Safe Search not enabled",
        redirectUrl: url.includes("?") ? `${url}&safe=active` : `${url}?safe=active`
      };
    }
  }

  // YouTube Restricted Mode
  if (safeSearchSettings.youtube && hostname && hostname.includes("youtube.com")) {
    // YouTube restricted mode is handled by extension cookies/headers
    return { enforce: false, youtubeRestricted: true };
  }

  // Bing Safe Search
  if (safeSearchSettings.bing && hostname && hostname.includes("bing.com")) {
    if (url.includes("/search") && !url.includes("adlt=strict")) {
      return {
        enforce: true,
        reason: "Bing Safe Search not enabled",
        redirectUrl: url.includes("?") ? `${url}&adlt=strict` : `${url}?adlt=strict`
      };
    }
  }

  return { enforce: false };
}

// Track rapid blocked attempts for emergency alerts
const blockedAttempts = new Map();

async function checkEmergencyAlert(context, hostname) {
  const key = `${context.child_id}`;
  const now = Date.now();
  const window = 5 * 60 * 1000; // 5 minutes
  const threshold = 5;

  if (!blockedAttempts.has(key)) {
    blockedAttempts.set(key, []);
  }

  const attempts = blockedAttempts.get(key);
  attempts.push(now);

  // Clean old entries
  const recent = attempts.filter((t) => now - t < window);
  blockedAttempts.set(key, recent);

  if (recent.length >= threshold) {
    // Create emergency alert
    const message = `⚠️ ${context.child_name} made ${recent.length} blocked access attempts in 5 minutes!`;
    await pool.query(
      "INSERT INTO alerts (user_id, child_id, alert_type, message) VALUES (?, ?, 'emergency', ?)",
      [context.user_id, context.child_id, message]
    );

    if (context.alert_email) {
      try {
        await sendAlertEmail({
          to: context.alert_email,
          subject: "🚨 KidSafe EMERGENCY Alert",
          text: message
        });
      } catch (error) {
        console.warn("Emergency email failed", error.message || error);
      }
    }

    // Also send to all guardians
    const [guardians] = await pool.query(
      `SELECT u.alert_email FROM child_guardians cg
       JOIN users u ON cg.user_id = u.id
       WHERE cg.child_id = ? AND u.alert_email IS NOT NULL AND u.id != ?`,
      [context.child_id, context.user_id]
    );
    for (const guardian of guardians) {
      try {
        await sendAlertEmail({
          to: guardian.alert_email,
          subject: "🚨 KidSafe EMERGENCY Alert",
          text: message
        });
      } catch (error) {
        console.warn("Guardian email failed", error.message || error);
      }
    }

    // Reset counter
    blockedAttempts.set(key, []);
  }
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

  // Get safe search settings
  const safeSearch = await getSafeSearchSettings(context.child_id);

  // Get screen time rules
  const [screenTimeRules] = await pool.query(
    "SELECT * FROM screen_time_rules WHERE child_id = ? AND is_active = 1",
    [context.child_id]
  );
  const screenTimeRule = screenTimeRules[0] || null;

  // Get app settings
  const [appSettings] = await pool.query(
    "SELECT * FROM child_app_settings WHERE child_id = ?",
    [context.child_id]
  );
  const appSetting = appSettings[0] || null;

  return res.json({
    rules: filtered.map((rule) => ({
      id: rule.id,
      pattern: rule.pattern,
      ruleType: rule.rule_type
    })),
    safeSearch,
    screenTime: screenTimeRule ? {
      dailyLimitMinutes: screenTimeRule.daily_limit_minutes,
      bedtimeStart: screenTimeRule.bedtime_start,
      bedtimeEnd: screenTimeRule.bedtime_end,
      daysOfWeek: screenTimeRule.days_of_week
    } : null,
    appSettings: appSetting ? {
      blockGamingSites: toBool(appSetting.block_gaming_sites),
      blockAppStores: toBool(appSetting.block_app_stores),
      blockInAppPurchases: toBool(appSetting.block_in_app_purchases)
    } : null
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

  // Check screen time first
  const screenTimeResult = await checkScreenTime(context.child_id);
  if (!screenTimeResult.allowed) {
    const [logResult] = await pool.query(
      "INSERT INTO activity_logs (child_id, device_id, url, hostname, verdict, reason) VALUES (?, ?, ?, ?, 'blocked', ?)",
      [context.child_id, context.device_id, parsed.href, hostname, screenTimeResult.reason]
    );

    await pool.query(
      "INSERT INTO alerts (user_id, child_id, activity_log_id, alert_type, message) VALUES (?, ?, ?, 'screen_time', ?)",
      [context.user_id, context.child_id, logResult.insertId, `${context.child_name}: ${screenTimeResult.reason}`]
    );

    return res.json({
      verdict: "blocked",
      reason: screenTimeResult.reason
    });
  }

  // Check safe search enforcement
  const safeSearch = await getSafeSearchSettings(context.child_id);
  const safeSearchResult = checkSafeSearchEnforcement(parsed.href, hostname, safeSearch);
  if (safeSearchResult.enforce && safeSearchResult.redirectUrl) {
    return res.json({
      verdict: "redirect",
      reason: safeSearchResult.reason,
      redirectUrl: safeSearchResult.redirectUrl
    });
  }

  // Normal filtering
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
    const alertType = evaluation.verdict === "malicious" ? "suspicious" : "blocked";
    const message = `${context.child_name} attempted to access ${hostname}`;
    await pool.query(
      "INSERT INTO alerts (user_id, child_id, activity_log_id, alert_type, message) VALUES (?, ?, ?, ?, ?)",
      [context.user_id, context.child_id, logResult.insertId, alertType, message]
    );

    // Send email to primary user
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

    // Send email to all guardians
    const [guardians] = await pool.query(
      `SELECT u.alert_email FROM child_guardians cg
       JOIN users u ON cg.user_id = u.id
       WHERE cg.child_id = ? AND u.alert_email IS NOT NULL AND u.id != ?`,
      [context.child_id, context.user_id]
    );
    for (const guardian of guardians) {
      try {
        await sendAlertEmail({
          to: guardian.alert_email,
          subject: `KidSafe alert: ${evaluation.verdict}`,
          text: `${message}. Reason: ${evaluation.reason}`
        });
      } catch (error) {
        console.warn("Guardian alert email failed", error.message || error);
      }
    }

    // Check for emergency pattern
    await checkEmergencyAlert(context, hostname);
  }

  // Screen time usage is incremented only in the /heartbeat endpoint
  // to avoid over-counting usage based on page navigations.

  await pool.query("UPDATE devices SET last_seen_at = NOW() WHERE id = ?", [context.device_id]);

  return res.json({
    verdict: evaluation.verdict,
    reason: evaluation.reason,
    safeSearch: safeSearchResult.youtubeRestricted ? { youtubeRestricted: true } : undefined
  });
});

router.post("/heartbeat", async (req, res) => {
  const token = req.headers["x-device-token"] || req.body.deviceToken;
  const context = await getDeviceContext(token);
  if (!context) {
    return res.status(401).json({ error: "Invalid device token" });
  }
  await pool.query("UPDATE devices SET last_seen_at = NOW() WHERE id = ?", [context.device_id]);

  const { hostname } = req.body;

  // Also increment screen time on heartbeat
  await incrementScreenTime(context.child_id, context.device_id, hostname);

  // Return screen time status
  const screenTimeResult = await checkScreenTime(context.child_id);
  const blockedSites = await checkSiteTimeLimits(context.child_id);

  return res.json({
    status: "ok",
    screenTime: screenTimeResult,
    blockedSites
  });
});

// SSE endpoint for real-time alerts
router.get("/alerts/stream", async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  // Verify token belongs to a valid user
  const { verifyJwt } = await import("../utils/security.js");
  let userId;
  try {
    const payload = verifyJwt(token);
    userId = payload.id;
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const sendAlerts = async () => {
    try {
      const [rows] = await pool.query(
        `SELECT alerts.id, alerts.alert_type, alerts.message, alerts.created_at, children.name AS child_name
         FROM alerts
         JOIN children ON alerts.child_id = children.id
         WHERE alerts.user_id = ? AND alerts.is_read = 0
         ORDER BY alerts.created_at DESC
         LIMIT 5`,
        [userId]
      );
      res.write(`data: ${JSON.stringify(rows)}\n\n`);
    } catch (error) {
      console.warn("SSE alert fetch failed", error.message || error);
    }
  };

  await sendAlerts();
  const intervalId = setInterval(sendAlerts, 10000);

  req.on("close", () => {
    clearInterval(intervalId);
  });
});

export default router;
