import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload) {
  const secret = process.env.JWT_SECRET || "change_me";
  return jwt.sign(payload, secret, { expiresIn: "12h" });
}

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET || "change_me";
  return jwt.verify(token, secret);
}

export function generateDeviceToken() {
  return crypto.randomBytes(24).toString("hex");
}
