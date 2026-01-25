import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { requireFields, toInt, toBool } from "../utils/validation.js";
import { generateDeviceToken } from "../utils/security.js";

const router = express.Router();

router.use(authRequired);

async function getChildById(childId, userId) {
  const [rows] = await pool.query(
    "SELECT id, name, birth_year, created_at FROM children WHERE id = ? AND user_id = ?",
    [childId, userId]
  );
  return rows[0];
}

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, birth_year, created_at FROM children WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      birthYear: row.birth_year,
      createdAt: row.created_at
    }))
  );
});

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
  await pool.query("DELETE FROM children WHERE id = ?", [childId]);
  return res.status(204).send();
});

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
    "SELECT devices.id FROM devices JOIN children ON devices.child_id = children.id WHERE devices.id = ? AND children.user_id = ?",
    [deviceId, req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Device not found" });
  }
  await pool.query("DELETE FROM devices WHERE id = ?", [deviceId]);
  return res.status(204).send();
});

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
