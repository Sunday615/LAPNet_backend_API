// src/utils/url.js
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

function absUrl(req, rel) {
  if (!rel) return "";
  const s = String(rel).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  if (s.startsWith("/")) return `${base}${s}`;
  return `${base}/${s}`;
}

// ✅ only accept http/https (and allow empty)
function isValidUrl(v) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = { absUrl, isValidUrl };
