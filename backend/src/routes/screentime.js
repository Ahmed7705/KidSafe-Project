import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toInt, toBool } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

async function verifyChildAccess(childId, user) {
  if (user.isAdmin) return true;
  const [rows] = await pool.query(
    `SELECT c.id FROM children c
     LEFT JOIN child_guardians cg ON c.id = cg.child_id AND cg.user_id = ?
     WHERE c.id = ? AND (c.user_id = ? OR cg.user_id = ?)`,
    [user.id, childId, user.id, user.id]
  );
  return rows.length > 0;
}

// GET /api/screentime/:childId — get screen time rules
router.get("/:childId", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const [rules] = await pool.query(
    "SELECT * FROM screen_time_rules WHERE child_id = ?",
    [childId]
  );
  const rule = rules[0] || null;

  return res.json({
    dailyLimitMinutes: rule?.daily_limit_minutes || null,
    bedtimeStart: rule?.bedtime_start || null,
    bedtimeEnd: rule?.bedtime_end || null,
    daysOfWeek: rule?.days_of_week || "0,1,2,3,4,5,6",
    isActive: rule ? toBool(rule.is_active) : false
  });
});

// PUT /api/screentime/:childId — update screen time rules
router.put("/:childId", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const { dailyLimitMinutes, bedtimeStart, bedtimeEnd, daysOfWeek, isActive } = req.body || {};

  const limitVal = toInt(dailyLimitMinutes, null);
  const activeVal = isActive === undefined ? 1 : toBool(isActive) ? 1 : 0;
  const daysVal = daysOfWeek || "0,1,2,3,4,5,6";

  await pool.query(
    `INSERT INTO screen_time_rules (child_id, daily_limit_minutes, bedtime_start, bedtime_end, days_of_week, is_active)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       daily_limit_minutes = VALUES(daily_limit_minutes),
       bedtime_start = VALUES(bedtime_start),
       bedtime_end = VALUES(bedtime_end),
       days_of_week = VALUES(days_of_week),
       is_active = VALUES(is_active)`,
    [childId, limitVal, bedtimeStart || null, bedtimeEnd || null, daysVal, activeVal]
  );

  return res.json({
    dailyLimitMinutes: limitVal,
    bedtimeStart: bedtimeStart || null,
    bedtimeEnd: bedtimeEnd || null,
    daysOfWeek: daysVal,
    isActive: toBool(activeVal)
  });
});

// GET /api/screentime/:childId/usage — get usage for today or date range
router.get("/:childId/usage", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const days = Math.min(toInt(req.query.days, 7) || 7, 30);
  const [rows] = await pool.query(
    `SELECT date, usage_minutes, last_activity_at
     FROM screen_time_usage
     WHERE child_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date DESC`,
    [childId, days]
  );

  return res.json(
    rows.map((row) => ({
      date: row.date,
      usageMinutes: row.usage_minutes,
      lastActivityAt: row.last_activity_at
    }))
  );
});

// GET /api/screentime/:childId/status — check if child is currently allowed (used by extension)
router.get("/:childId/status", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }

  const [rules] = await pool.query(
    "SELECT * FROM screen_time_rules WHERE child_id = ? AND is_active = 1",
    [childId]
  );
  const rule = rules[0];
  if (!rule) {
    return res.json({ allowed: true, reason: "No screen time rules" });
  }

  const now = new Date();
  const currentDay = now.getDay();
  const allowedDays = (rule.days_of_week || "0,1,2,3,4,5,6").split(",").map(Number);

  if (!allowedDays.includes(currentDay)) {
    return res.json({ allowed: false, reason: "Not an allowed day" });
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
      // Overnight bedtime (e.g., 21:00 - 07:00)
      isBedtime = currentTime >= start || currentTime <= end;
    }

    if (isBedtime) {
      return res.json({ allowed: false, reason: "Bedtime mode is active" });
    }
  }

  // Check daily limit
  if (rule.daily_limit_minutes) {
    const today = now.toISOString().slice(0, 10);
    const [usage] = await pool.query(
      "SELECT usage_minutes FROM screen_time_usage WHERE child_id = ? AND date = ?",
      [childId, today]
    );
    const usedMinutes = usage[0]?.usage_minutes || 0;

    if (usedMinutes >= rule.daily_limit_minutes) {
      return res.json({
        allowed: false,
        reason: "Daily screen time limit reached",
        usedMinutes,
        limitMinutes: rule.daily_limit_minutes
      });
    }

    return res.json({
      allowed: true,
      reason: "Within limits",
      usedMinutes,
      limitMinutes: rule.daily_limit_minutes,
      remainingMinutes: rule.daily_limit_minutes - usedMinutes
    });
  }

  return res.json({ allowed: true, reason: "Within limits" });
});

// ===== PER-SITE LIMITS =====

// GET /api/screentime/:childId/sites
router.get("/:childId/sites", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) return res.status(400).json({ error: "Invalid child id" });
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) return res.status(404).json({ error: "Child not found" });

  const today = new Date().toISOString().slice(0, 10);
  
  const [rows] = await pool.query(
    `SELECT l.id, l.hostname, l.limit_minutes, COALESCE(u.usage_minutes, 0) as usage_minutes
     FROM site_time_limits l
     LEFT JOIN site_time_usage u ON l.child_id = u.child_id AND l.hostname = u.hostname AND u.date = ?
     WHERE l.child_id = ?
     ORDER BY l.created_at DESC`,
    [today, childId]
  );
  
  return res.json(rows.map((r) => ({
    id: r.id,
    hostname: r.hostname,
    limitMinutes: r.limit_minutes,
    usageMinutes: r.usage_minutes
  })));
});

// POST /api/screentime/:childId/sites
router.post("/:childId/sites", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) return res.status(400).json({ error: "Invalid child id" });
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) return res.status(404).json({ error: "Child not found" });

  const { hostname, limitMinutes } = req.body || {};
  if (!hostname || typeof hostname !== "string") {
    return res.status(400).json({ error: "Valid hostname required" });
  }
  const limitVal = toInt(limitMinutes);
  if (!limitVal || limitVal < 1) {
    return res.status(400).json({ error: "Valid limit minutes required" });
  }
  
  // Clean hostname (strip http://, paths, etc)
  let cleanHost = hostname.trim().toLowerCase();
  try {
    if (!cleanHost.startsWith("http")) cleanHost = "http://" + cleanHost;
    cleanHost = new URL(cleanHost).hostname;
    if (cleanHost.startsWith("www.")) {
      cleanHost = cleanHost.substring(4);
    }
  } catch(e) {
    // ignore
  }

  const [result] = await pool.query(
    `INSERT INTO site_time_limits (child_id, hostname, limit_minutes)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE limit_minutes = VALUES(limit_minutes)`,
    [childId, cleanHost, limitVal]
  );

  return res.json({ status: "ok" });
});

// DELETE /api/screentime/:childId/sites/:siteId
router.delete("/:childId/sites/:siteId", async (req, res) => {
  const childId = toInt(req.params.childId);
  const siteId = toInt(req.params.siteId);
  if (!childId || !siteId) return res.status(400).json({ error: "Invalid parameters" });
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) return res.status(404).json({ error: "Child not found" });

  await pool.query("DELETE FROM site_time_limits WHERE id = ? AND child_id = ?", [siteId, childId]);
  return res.json({ status: "ok" });
});

export default router;
