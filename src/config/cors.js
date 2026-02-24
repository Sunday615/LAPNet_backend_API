// src/config/cors.js
const cors = require("cors");
const net = require("net");

// ==============================
// ✅ Strict allowlists (defaults)
// ==============================
const DEFAULT_ALLOWLIST_IPS =
  "175.28.0.0/16,175.17.4.0/24,175.17.5.0/24";
const DEFAULT_ALLOWLIST_DOMAINS =
  "lapnet.com.la,test.lapnet.com.la";

// You can override via env if you want:
// ALLOWLIST_IPS="175.28.0.0/16,175.17.4.0/24,175.17.5.0/24"
// ALLOWLIST_DOMAINS="lapnet.com.la,test.lapnet.com.la"
const ALLOWLIST_IPS = (process.env.ALLOWLIST_IPS || DEFAULT_ALLOWLIST_IPS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWLIST_DOMAINS = (process.env.ALLOWLIST_DOMAINS || DEFAULT_ALLOWLIST_DOMAINS)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const allowedDomainsSet = new Set(ALLOWLIST_DOMAINS);

// ========================================
// ✅ IPv4 CIDR match (no extra dependency)
// ========================================
function normalizeClientIp(ip) {
  // Express may give: "::ffff:175.17.4.10"
  if (typeof ip !== "string") return "";
  const v = ip.trim();
  if (v.startsWith("::ffff:")) return v.slice(7);
  // If somehow "ip:port"
  return v.split(":").slice(-1)[0];
}

function ipToInt(ipv4) {
  const parts = ipv4.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = Number(p);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = (n << 8) + x;
  }
  return n >>> 0;
}

function cidrToRange(cidr) {
  // "175.28.0.0/16"
  const [ip, prefixStr] = cidr.split("/");
  const prefix = Number(prefixStr);
  if (!ip || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  if (net.isIP(ip) !== 4) return null;
  const base = ipToInt(ip);
  if (base === null) return null;

  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const network = (base & mask) >>> 0;
  return { network, mask };
}

const allowRanges = ALLOWLIST_IPS.map(cidrToRange).filter(Boolean);

function isAllowedIp(reqIp) {
  const ip = normalizeClientIp(reqIp);
  if (net.isIP(ip) !== 4) return false;

  const val = ipToInt(ip);
  if (val === null) return false;

  return allowRanges.some(({ network, mask }) => ((val & mask) >>> 0) === network);
}

// =========================
// ✅ Domain allowlist checks
// =========================
function isAllowedHostname(hostname) {
  if (!hostname) return false;
  const h = String(hostname).trim().toLowerCase();
  return allowedDomainsSet.has(h);
}

// ===================================
// ✅ Middleware: block by IP + domain
// ===================================
function ipAllowlistMiddleware(req, res, next) {
  // IMPORTANT: If behind nginx/ALB/Cloudflare, set:
  // app.set("trust proxy", 1)  (or correct hop count)
  // so req.ip is the real client IP.
  if (isAllowedIp(req.ip)) return next();

  return res.status(403).json({
    message: "Forbidden",
    reason: "IP not allowed",
  });
}

function hostAllowlistMiddleware(req, res, next) {
  // Express hostname comes from Host header (trusted if behind proper proxy)
  if (isAllowedHostname(req.hostname)) return next();

  return res.status(403).json({
    message: "Forbidden",
    reason: "Host/domain not allowed",
  });
}

// ============================
// ✅ CORS (browser-side control)
// ============================
const corsOptions = {
  origin: (origin, cb) => {
    // Non-browser clients may not send Origin; allow them IF they passed IP+Host checks.
    if (!origin) return cb(null, true);

    try {
      const u = new URL(origin);
      // Only allow exact hostnames in allowlist
      if (isAllowedHostname(u.hostname)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    } catch {
      return cb(new Error("Invalid Origin"));
    }
  },
};

module.exports = {
  corsOptions,
  corsMiddleware: cors(corsOptions),
  ipAllowlistMiddleware,
  hostAllowlistMiddleware,
};