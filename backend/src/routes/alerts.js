import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toBool, toInt } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

router.get("/unread-count", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const params = [req.user.id];
  let childFilter = "";
  if (childId) {
    childFilter = "AND child_id = ?";
    params.push(childId);
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM alerts WHERE user_id = ? AND is_read = 0 ${childFilter}`,
    params
  );
  return res.json({ count: Number(rows[0]?.count || 0) });
});

router.get("/", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const limit = Math.min(toInt(req.query.limit, 50) || 50, 200);

  const params = [req.user.id];
  let childFilter = "";
  if (childId) {
    childFilter = "AND alerts.child_id = ?";
    params.push(childId);
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
     WHERE alerts.user_id = ? ${childFilter}
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
  const [rows] = await pool.query(
    "SELECT id FROM alerts WHERE id = ? AND user_id = ?",
    [alertId, req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Alert not found" });
  }
  await pool.query("UPDATE alerts SET is_read = 1 WHERE id = ?", [alertId]);
  return res.json({ status: "ok" });
});

export default router;
