import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { requireFields, toInt, toBool, isEmail } from "../utils/validation.js";
import { generateDeviceToken } from "../utils/security.js";

const router = express.Router();

router.use(authRequired);

async function getChildById(childId, userId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.birth_year, c.user_id, c.created_at
     FROM children c
     LEFT JOIN child_guardians cg ON c.id = cg.child_id AND cg.user_id = ?
     WHERE c.id = ? AND (c.user_id = ? OR cg.user_id = ?)`,
    [userId, childId, userId, userId]
  );
  return rows[0];
}

// GET /api/children — list children for the authenticated user (or all children if admin)
router.get("/", async (req, res) => {
  if (req.user.isAdmin) {
    const [rows] = await pool.query(
      `SELECT c.*, u.email as parent_email, c.user_id as parent_id 
       FROM children c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    return res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        birthYear: row.birth_year,
        deviceMac: row.device_mac,
        parentEmail: row.parent_email,
        parentId: row.parent_id
      }))
    );
  }

  const [rows] = await pool.query(
    `SELECT c.* FROM children c
     LEFT JOIN child_guardians cg ON c.id = cg.child_id AND cg.user_id = ?
     WHERE c.user_id = ? OR cg.user_id = ?
     ORDER BY c.created_at DESC`,
    [req.user.id, req.user.id, req.user.id]
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      birthYear: row.birth_year,
      deviceMac: row.device_mac,
      parentId: row.user_id
    }))
  );
});

// Create child + auto-add primary guardian
router.post("/", async (req, res) => {
  const { name, birthYear } = req.body || {};
  const required = requireFields(req.body, ["name"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }
  const [result] = await pool.query(
    "INSERT INTO children (user_id, name, birth_year) VALUES (?, ?, ?)",
    [req.user.id, name, toInt(birthYear, null)]
  );

  // Auto-insert primary guardian
  await pool.query(
    "INSERT IGNORE INTO child_guardians (child_id, user_id, role) VALUES (?, ?, 'primary')",
    [result.insertId, req.user.id]
  );

  return res.status(201).json({
    id: result.insertId,
    name,
    birthYear: toInt(birthYear, null)
  });
});

router.put("/:id", async (req, res) => {
  const childId = toInt(req.params.id);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const { name, birthYear } = req.body || {};
  if (!name && birthYear === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  await pool.query(
    "UPDATE children SET name = COALESCE(?, name), birth_year = COALESCE(?, birth_year) WHERE id = ?",
    [name || null, toInt(birthYear, null), childId]
  );
  const updated = await getChildById(childId, req.user.id);
  return res.json({
    id: updated.id,
    name: updated.name,
    birthYear: updated.birth_year,
    createdAt: updated.created_at
  });
});

router.delete("/:id", async (req, res) => {
  const childId = toInt(req.params.id);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  // Only primary owner can delete
  if (child.user_id !== req.user.id) {
    return res.status(403).json({ error: "Only the primary guardian can delete a child" });
  }
  await pool.query("DELETE FROM children WHERE id = ?", [childId]);
  return res.status(204).send();
});

// ===== GUARDIANS =====

// List guardians for a child
router.get("/:id/guardians", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const [rows] = await pool.query(
    `SELECT cg.id, cg.role, cg.created_at, u.id AS user_id, u.email, u.full_name
     FROM child_guardians cg
     JOIN users u ON cg.user_id = u.id
     WHERE cg.child_id = ?
     ORDER BY cg.role ASC, cg.created_at ASC`,
    [childId]
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      createdAt: row.created_at
    }))
  );
});

// Invite a guardian by email
router.post("/:id/guardians", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  const { email } = req.body || {};
  if (!email || !isEmail(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  // Find user by email
  const [users] = await pool.query("SELECT id, email, full_name FROM users WHERE email = ?", [email]);
  if (users.length === 0) {
    return res.status(404).json({ error: "No user found with this email. They must register first." });
  }

  const targetUser = users[0];

  // Check if already a guardian
  const [existing] = await pool.query(
    "SELECT id FROM child_guardians WHERE child_id = ? AND user_id = ?",
    [childId, targetUser.id]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: "This user is already a guardian for this child" });
  }

  const [result] = await pool.query(
    "INSERT INTO child_guardians (child_id, user_id, role, invited_by) VALUES (?, ?, 'guardian', ?)",
    [childId, targetUser.id, req.user.id]
  );

  return res.status(201).json({
    id: result.insertId,
    userId: targetUser.id,
    email: targetUser.email,
    fullName: targetUser.full_name,
    role: "guardian"
  });
});

// Remove a guardian
router.delete("/:id/guardians/:guardianId", async (req, res) => {
  const childId = toInt(req.params.id);
  const guardianId = toInt(req.params.guardianId);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  // Check guardian exists and is not primary
  const [rows] = await pool.query(
    "SELECT id, role FROM child_guardians WHERE id = ? AND child_id = ?",
    [guardianId, childId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Guardian not found" });
  }
  if (rows[0].role === "primary") {
    return res.status(403).json({ error: "Cannot remove the primary guardian" });
  }

  await pool.query("DELETE FROM child_guardians WHERE id = ?", [guardianId]);
  return res.status(204).send();
});

// ===== DEVICES =====

router.get("/:id/devices", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const [rows] = await pool.query(
    "SELECT id, device_name, api_token, last_seen_at, created_at FROM devices WHERE child_id = ? ORDER BY created_at DESC",
    [childId]
  );
  return res.json(rows);
});

router.post("/:id/devices", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const required = requireFields(req.body, ["deviceName"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }
  const token = generateDeviceToken();
  const [result] = await pool.query(
    "INSERT INTO devices (child_id, device_name, api_token) VALUES (?, ?, ?)",
    [childId, req.body.deviceName, token]
  );
  return res.status(201).json({
    id: result.insertId,
    deviceName: req.body.deviceName,
    apiToken: token
  });
});

router.delete("/devices/:id", async (req, res) => {
  const deviceId = toInt(req.params.id);
  if (!deviceId) {
    return res.status(400).json({ error: "Invalid device id" });
  }
  const [rows] = await pool.query(
    `SELECT devices.id FROM devices
     JOIN children ON devices.child_id = children.id
     LEFT JOIN child_guardians cg ON children.id = cg.child_id AND cg.user_id = ?
     WHERE devices.id = ? AND (children.user_id = ? OR cg.user_id = ?)`,
    [req.user.id, deviceId, req.user.id, req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Device not found" });
  }
  await pool.query("DELETE FROM devices WHERE id = ?", [deviceId]);
  return res.status(204).send();
});

// ===== CATEGORIES =====

router.get("/:id/categories", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.description,
            COALESCE(ccs.is_blocked, c.default_blocked) AS is_blocked
     FROM categories c
     LEFT JOIN child_category_settings ccs
       ON c.id = ccs.category_id AND ccs.child_id = ?
     ORDER BY c.name ASC`,
    [childId]
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isBlocked: toBool(row.is_blocked)
    }))
  );
});

router.put("/:id/categories", async (req, res) => {
  const childId = toInt(req.params.id);
  const child = await getChildById(childId, req.user.id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }
  const { categories } = req.body || {};
  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: "Categories must be an array" });
  }
  await pool.query("DELETE FROM child_category_settings WHERE child_id = ?", [childId]);
  if (categories.length > 0) {
    const values = categories.map((category) => [
      childId,
      toInt(category.id),
      toBool(category.isBlocked) ? 1 : 0
    ]);
    await pool.query(
      "INSERT INTO child_category_settings (child_id, category_id, is_blocked) VALUES ?",
      [values]
    );
  }
  return res.json({ status: "ok" });
});

export default router;
