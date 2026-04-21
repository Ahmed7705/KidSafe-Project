import { verifyJwt } from "../utils/security.js";

import pool from "../db.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = verifyJwt(token);
    const [rows] = await pool.query("SELECT is_admin FROM users WHERE id = ?", [payload.id]);
    const isAdmin = rows.length > 0 && rows[0].is_admin === 1;
    req.user = { ...payload, isAdmin };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
