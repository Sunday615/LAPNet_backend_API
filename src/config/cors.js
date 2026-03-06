// src/config/cors.js

/**
 * CORS middleware with safe defaults.
 *
 * - If CORS_ALLOW_ORIGINS is NOT set: allow all origins by reflecting the request Origin.
 * - If CORS_ALLOW_ORIGINS IS set (comma-separated): only allow listed origins.
 * - Supports credentialed requests by reflecting Origin + setting Access-Control-Allow-Credentials.
 * - Handles preflight OPTIONS globally.
 */

const DEFAULT_ALLOW_HEADERS =
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-role, x-bankcode";

const DEFAULT_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

function parseAllowlist() {
  const raw = String(process.env.CORS_ALLOW_ORIGINS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

const ALLOWLIST = parseAllowlist();
const ALLOW_ALL = ALLOWLIST.length === 0;

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOW_ALL) return true;
  return ALLOWLIST.includes(origin);
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  // If browser sends Origin, reflect it (or block if allowlist is configured)
  if (origin) {
    if (!isOriginAllowed(origin)) {
      // Keep this as JSON to make debugging easy from the browser
      return res.status(403).json({
        message: "CORS blocked",
        origin,
        allowlist: ALLOWLIST,
        hint: "Set CORS_ALLOW_ORIGINS=comma,separated,origins or remove it to allow all (dev).",
      });
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    // Credentialed requests require a non-wildcard origin
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin, Access-Control-Request-Headers, Access-Control-Request-Method");
  } else {
    // Non-browser clients (no Origin)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  const reqAllowHeaders = req.headers["access-control-request-headers"];
  res.setHeader("Access-Control-Allow-Headers", reqAllowHeaders || DEFAULT_ALLOW_HEADERS);

  const reqAllowMethod = req.headers["access-control-request-method"];
  res.setHeader("Access-Control-Allow-Methods", reqAllowMethod ? `${reqAllowMethod}, OPTIONS` : DEFAULT_ALLOW_METHODS);

  // Cache preflight for 1 day
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
}

// ✅ Allow-all middlewares (temporary)
function ipAllowlistMiddleware(req, res, next) {
  return next();
}

function hostAllowlistMiddleware(req, res, next) {
  return next();
}

module.exports = {
  ipAllowlistMiddleware,
  hostAllowlistMiddleware,
  corsMiddleware,
};