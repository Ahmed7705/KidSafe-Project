import express from "express";
import pool from "../db.js";
import { hashPassword, comparePassword, signJwt } from "../utils/security.js";
import { authRequired } from "../middleware/auth.js";
import { requireFields, isEmail } from "../utils/validation.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, fullName } = req.body || {};
  const required = requireFields(req.body, ["email", "password", "fullName"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const [result] = await pool.query(
    "INSERT INTO users (email, password_hash, full_name, alert_email) VALUES (?, ?, ?, ?)",
    [email, passwordHash, fullName, email]
  );

  const user = {
    id: result.insertId,
    email,
    fullName,
    alertEmail: email
  };
  const token = signJwt({ id: user.id, email: user.email });
  return res.json({ token, user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const required = requireFields(req.body, ["email", "password"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }

  const [rows] = await pool.query(
    "SELECT id, email, full_name, password_hash, alert_email FROM users WHERE email = ?",
    [email]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const userRow = rows[0];
  const valid = await comparePassword(password, userRow.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = {
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    alertEmail: userRow.alert_email
  };
  const token = signJwt({ id: user.id, email: user.email });
  return res.json({ token, user });
});

router.get("/me", authRequired, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, email, full_name, alert_email, created_at FROM users WHERE id = ?",
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  const userRow = rows[0];
  return res.json({
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    alertEmail: userRow.alert_email,
    createdAt: userRow.created_at
  });
});

router.put("/profile", authRequired, async (req, res) => {
  const { fullName, alertEmail } = req.body || {};
  if (!fullName && !alertEmail) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  if (alertEmail && !isEmail(alertEmail)) {
    return res.status(400).json({ error: "Invalid alert email" });
  }
  await pool.query(
    "UPDATE users SET full_name = COALESCE(?, full_name), alert_email = COALESCE(?, alert_email) WHERE id = ?",
    [fullName || null, alertEmail || null, req.user.id]
  );
  const [rows] = await pool.query(
    "SELECT id, email, full_name, alert_email FROM users WHERE id = ?",
    [req.user.id]
  );
  const userRow = rows[0];
  return res.json({
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    alertEmail: userRow.alert_email
  });
});

export default router;
