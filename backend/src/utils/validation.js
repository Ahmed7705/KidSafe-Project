export function requireFields(payload, fields) {
  const missing = fields.filter((field) => !payload || payload[field] === undefined || payload[field] === "");
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}

export function isEmail(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

export function toInt(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
