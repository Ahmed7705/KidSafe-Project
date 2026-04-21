import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toInt } from "../utils/validation.js";

const router = express.Router();

// Middleware to ensure user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT is_admin FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0 || !rows[0].is_admin) {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.use(authRequired, requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) as totalUsers FROM users");
  const [[{ totalChildren }]] = await pool.query("SELECT COUNT(*) as totalChildren FROM children");
  const [[{ totalDevices }]] = await pool.query("SELECT COUNT(*) as totalDevices FROM devices");
  const [[{ totalAlerts }]] = await pool.query("SELECT COUNT(*) as totalAlerts FROM alerts");

  return res.json({
    totalUsers,
    totalChildren,
    totalDevices,
    totalAlerts
  });
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const [users] = await pool.query(
    `SELECT u.id, u.email, u.full_name as fullName, u.created_at as createdAt, u.is_admin as isAdmin,
     (SELECT COUNT(*) FROM children c WHERE c.user_id = u.id) as childCount
     FROM users u
     ORDER BY u.created_at DESC`
  );
  return res.json(users);
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  const targetId = toInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "Cannot delete yourself" });
  }

  const [existing] = await pool.query("SELECT is_admin FROM users WHERE id = ?", [targetId]);
  if (existing.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Optional: Prevent deleting other admins
  if (existing[0].is_admin) {
    return res.status(403).json({ error: "Cannot delete another administrator" });
  }

  // Because of ON DELETE CASCADE on foreign keys, deleting the user will delete their:
  // - children (which deletes devices, alerts, screen time rules, block rules, apps)
  // - categories
  // - child_guardians memberships
  await pool.query("DELETE FROM users WHERE id = ?", [targetId]);

  return res.json({ status: "ok" });
});

// GET /api/admin/alerts (Global view of recent emergency/malicious activity)
router.get("/alerts", async (req, res) => {
  const [alerts] = await pool.query(
    `SELECT a.id, a.alert_type, a.message, a.created_at, c.name as childName, u.email as parentEmail
     FROM alerts a
     JOIN children c ON a.child_id = c.id
     JOIN users u ON a.user_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 50`
  );
  return res.json(alerts);
});

// GET /api/admin/users/:id/details
router.get("/users/:id/details", async (req, res) => {
  const targetId = toInt(req.params.id);
  if (!targetId) return res.status(400).json({ error: "Invalid user ID" });

  const [children] = await pool.query(
    "SELECT id, name, birth_year as birthYear FROM children WHERE user_id = ?",
    [targetId]
  );

  const [alerts] = await pool.query(
    `SELECT a.id, a.alert_type, a.message, a.created_at, c.name as childName
     FROM alerts a
     JOIN children c ON a.child_id = c.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [targetId]
  );

  return res.json({ children, alerts });
});

// ===== RECOMMENDATIONS CRUD =====

// GET /api/admin/recommendations
router.get("/recommendations", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM app_recommendations ORDER BY created_at DESC");
  return res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    url: r.url,
    minAge: r.min_age,
    maxAge: r.max_age
  })));
});

// POST /api/admin/recommendations
router.post("/recommendations", async (req, res) => {
  const { name, description, category, url, minAge, maxAge } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: "Name and Category are required" });
  }

  const [result] = await pool.query(
    "INSERT INTO app_recommendations (name, description, category, url, min_age, max_age) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description, category, url || null, toInt(minAge) || 0, toInt(maxAge) || 99]
  );

  return res.json({ id: result.insertId });
});

// PUT /api/admin/recommendations/:id
router.put("/recommendations/:id", async (req, res) => {
  const targetId = toInt(req.params.id);
  const { name, description, category, url, minAge, maxAge } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: "Name and Category are required" });
  }

  await pool.query(
    "UPDATE app_recommendations SET name = ?, description = ?, category = ?, url = ?, min_age = ?, max_age = ? WHERE id = ?",
    [name, description, category, url || null, toInt(minAge) || 0, toInt(maxAge) || 99, targetId]
  );

  return res.json({ status: "ok" });
});

// DELETE /api/admin/recommendations/:id
router.delete("/recommendations/:id", async (req, res) => {
  const targetId = toInt(req.params.id);
  await pool.query("DELETE FROM app_recommendations WHERE id = ?", [targetId]);
  return res.json({ status: "ok" });
});

export default router;
