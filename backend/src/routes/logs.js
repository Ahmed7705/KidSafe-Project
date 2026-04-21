import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toInt } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  const childId = toInt(req.query.childId || null, null);
  const limit = Math.min(toInt(req.query.limit, 50) || 50, 200);

  const params = [];
  let userFilter = "WHERE children.user_id = ?";
  let childFilter = "";

  if (req.user.isAdmin) {
    userFilter = "WHERE 1=1";
  } else {
    params.push(req.user.id);
  }

  if (childId) {
    childFilter = "AND children.id = ?";
    params.push(childId);
  }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT activity_logs.id, activity_logs.url, activity_logs.hostname, activity_logs.verdict,
            activity_logs.reason, activity_logs.created_at, children.name AS child_name,
            devices.device_name AS device_name
     FROM activity_logs
     JOIN children ON activity_logs.child_id = children.id
     LEFT JOIN devices ON activity_logs.device_id = devices.id
     ${userFilter} ${childFilter}
     ORDER BY activity_logs.created_at DESC
     LIMIT ?`,
    params
  );

  return res.json(
    rows.map((row) => ({
      id: row.id,
      url: row.url,
      hostname: row.hostname,
      verdict: row.verdict,
      reason: row.reason,
      createdAt: row.created_at,
      childName: row.child_name,
      deviceName: row.device_name
    }))
  );
});

export default router;
