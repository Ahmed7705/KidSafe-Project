import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toBool, toInt } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

router.get("/unread-count", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const params = [];
  let userFilter = "WHERE user_id = ?";
  let childFilter = "";

  if (req.user.isAdmin) {
    userFilter = "WHERE 1=1";
  } else {
    params.push(req.user.id);
  }

  if (childId) {
    childFilter = "AND child_id = ?";
    params.push(childId);
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM alerts ${userFilter} AND is_read = 0 ${childFilter}`,
    params
  );
  return res.json({ count: Number(rows[0]?.count || 0) });
});

router.get("/", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const alertType = req.query.alertType || null;
  const limit = Math.min(toInt(req.query.limit, 50) || 50, 200);

  const params = [];
  let userFilter = "WHERE alerts.user_id = ?";
  let childFilter = "";
  let typeFilter = "";

  if (req.user.isAdmin) {
    userFilter = "WHERE 1=1";
  } else {
    params.push(req.user.id);
  }

  if (childId) {
    childFilter = "AND alerts.child_id = ?";
    params.push(childId);
  }
  if (alertType) {
    typeFilter = "AND alerts.alert_type = ?";
    params.push(alertType);
  }
  params.push(limit);

  const [rows] = await pool.query(
    `SELECT alerts.id, alerts.alert_type, alerts.message, alerts.is_read, alerts.created_at,
            children.name AS child_name,
            activity_logs.hostname AS hostname,
            activity_logs.url AS url
     FROM alerts
     JOIN children ON alerts.child_id = children.id
     LEFT JOIN activity_logs ON alerts.activity_log_id = activity_logs.id
     ${userFilter} ${childFilter} ${typeFilter}
     ORDER BY alerts.created_at DESC
     LIMIT ?`,
    params
  );

  return res.json(
    rows.map((row) => ({
      id: row.id,
      alertType: row.alert_type,
      message: row.message,
      isRead: toBool(row.is_read),
      createdAt: row.created_at,
      childName: row.child_name,
      hostname: row.hostname,
      url: row.url
    }))
  );
});

router.put("/:id/read", async (req, res) => {
  const alertId = toInt(req.params.id);
  if (!alertId) {
    return res.status(400).json({ error: "Invalid alert id" });
  }
  const targetUserId = req.user.isAdmin ? null : req.user.id;
  const [rows] = await pool.query(
    targetUserId ? "SELECT id FROM alerts WHERE id = ? AND user_id = ?" : "SELECT id FROM alerts WHERE id = ?",
    targetUserId ? [alertId, targetUserId] : [alertId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Alert not found" });
  }
  await pool.query("UPDATE alerts SET is_read = 1 WHERE id = ?", [alertId]);
  return res.json({ status: "ok" });
});

// Mark all alerts as read
router.put("/read-all", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const params = [];
  let userFilter = "WHERE user_id = ?";
  let childFilter = "";

  if (req.user.isAdmin) {
    userFilter = "WHERE 1=1";
  } else {
    params.push(req.user.id);
  }

  if (childId) {
    childFilter = "AND child_id = ?";
    params.push(childId);
  }
  await pool.query(
    `UPDATE alerts SET is_read = 1 ${userFilter} AND is_read = 0 ${childFilter}`,
    params
  );
  return res.json({ status: "ok" });
});

// Get alert statistics
router.get("/stats", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT alert_type, COUNT(*) AS count
     FROM alerts
     WHERE user_id = ?
     GROUP BY alert_type`,
    [req.user.id]
  );
  const stats = {};
  rows.forEach((row) => {
    stats[row.alert_type] = Number(row.count);
  });
  return res.json(stats);
});

export default router;
