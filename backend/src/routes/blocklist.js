import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { requireFields, toBool, toInt } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

router.get("/categories", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, description, default_blocked FROM categories ORDER BY name ASC"
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      defaultBlocked: toBool(row.default_blocked)
    }))
  );
});

router.get("/rules", async (req, res) => {
  const targetUserId = req.user.isAdmin && req.query.userId ? toInt(req.query.userId) : req.user.id;
  const [rows] = await pool.query(
    "SELECT id, category_id, pattern, rule_type, is_active, created_at FROM block_rules WHERE user_id = ? ORDER BY created_at DESC",
    [targetUserId]
  );
  return res.json(
    rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      pattern: row.pattern,
      ruleType: row.rule_type,
      isActive: toBool(row.is_active),
      createdAt: row.created_at
    }))
  );
});

router.post("/rules", async (req, res) => {
  const { pattern, ruleType, categoryId, isActive } = req.body || {};
  const required = requireFields(req.body, ["pattern", "ruleType"]);
  if (!required.ok) {
    return res.status(400).json({ error: "Missing fields", missing: required.missing });
  }
  const allowedTypes = ["domain", "keyword", "regex"];
  if (!allowedTypes.includes(ruleType)) {
    return res.status(400).json({ error: "Invalid rule type" });
  }

  const targetUserId = req.user.isAdmin && req.body.userId ? toInt(req.body.userId) : req.user.id;
  const [result] = await pool.query(
    "INSERT INTO block_rules (user_id, category_id, pattern, rule_type, is_active) VALUES (?, ?, ?, ?, ?)",
    [targetUserId, toInt(categoryId, null), pattern, ruleType, isActive === undefined ? 1 : toBool(isActive) ? 1 : 0]
  );

  return res.status(201).json({
    id: result.insertId,
    categoryId: toInt(categoryId, null),
    pattern,
    ruleType,
    isActive: true
  });
});

router.put("/rules/:id", async (req, res) => {
  const ruleId = toInt(req.params.id);
  if (!ruleId) {
    return res.status(400).json({ error: "Invalid rule id" });
  }
  const { pattern, ruleType, categoryId, isActive } = req.body || {};
  const targetUserId = req.user.isAdmin && req.body.userId ? toInt(req.body.userId) : req.user.id;
  
  const [rows] = await pool.query(
    "SELECT id FROM block_rules WHERE id = ? AND user_id = ?",
    [ruleId, targetUserId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Rule not found" });
  }
  if (ruleType && !["domain", "keyword", "regex"].includes(ruleType)) {
    return res.status(400).json({ error: "Invalid rule type" });
  }
  await pool.query(
    "UPDATE block_rules SET pattern = COALESCE(?, pattern), rule_type = COALESCE(?, rule_type), category_id = COALESCE(?, category_id), is_active = COALESCE(?, is_active) WHERE id = ?",
    [pattern || null, ruleType || null, toInt(categoryId, null), isActive === undefined ? null : toBool(isActive) ? 1 : 0, ruleId]
  );
  const [updatedRows] = await pool.query(
    "SELECT id, category_id, pattern, rule_type, is_active FROM block_rules WHERE id = ?",
    [ruleId]
  );
  const row = updatedRows[0];
  return res.json({
    id: row.id,
    categoryId: row.category_id,
    pattern: row.pattern,
    ruleType: row.rule_type,
    isActive: toBool(row.is_active)
  });
});

router.delete("/rules/:id", async (req, res) => {
  const ruleId = toInt(req.params.id);
  if (!ruleId) {
    return res.status(400).json({ error: "Invalid rule id" });
  }
  const targetUserId = req.user.isAdmin && req.query.userId ? toInt(req.query.userId) : req.user.id;
  const [rows] = await pool.query(
    "SELECT id FROM block_rules WHERE id = ? AND user_id = ?",
    [ruleId, targetUserId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Rule not found" });
  }
  await pool.query("DELETE FROM block_rules WHERE id = ?", [ruleId]);
  return res.status(204).send();
});

export default router;
