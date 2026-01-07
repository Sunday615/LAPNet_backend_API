// src/utils/json.js
function parseJsonMaybe(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return fallback;
  const s = v.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function safeJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeJsonArray(v, fallback = []) {
  if (v == null || v === "") return fallback;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

module.exports = { parseJsonMaybe, safeJson, safeJsonArray };
