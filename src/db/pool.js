// db/pool.js
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Load .env in local dev (Render will ignore if env vars already set)
require("dotenv").config();

function envStr(name, fallback = "") {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : fallback;
}

function envBool(name, fallback = false) {
  const v = envStr(name, "");
  if (!v) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(v.toLowerCase());
}

function normalizePem(pem) {
  if (!pem) return "";
  const s = String(pem).trim();

  // Support env values that contain escaped newlines: "\n"
  const fixed = s.includes("\\n") ? s.replace(/\\n/g, "\n") : s;

  // Remove wrapping quotes if user accidentally included them in env UI
  return fixed.replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1").trim();
}

/**
 * Build SSL config for mysql2.
 * Fixes the common issue: "self-signed certificate in certificate chain"
 * by ensuring CA is loaded correctly and passed as a Buffer.
 */
function buildSSL() {
  const enableSSL = envBool("DB_SSL", true);
  if (!enableSSL) return undefined;

  const rejectUnauthorized = envBool("DB_SSL_REJECT_UNAUTHORIZED", true);

  // Option A: CA cert from env (Render-friendly)
  const caFromEnv = normalizePem(process.env.DB_CA_CERT);
  if (caFromEnv) {
    return {
      ca: Buffer.from(caFromEnv, "utf8"),
      rejectUnauthorized,
      // Optional but helps SNI in some environments
      servername: envStr("DB_SSL_SERVERNAME", envStr("DB_HOST", "")) || undefined,
    };
  }

  // Option B: CA cert from file (local/dev)
  const caPath = envStr("DB_CA_PATH", "") || path.join(__dirname, "certs", "ca.pem");
  if (caPath && fs.existsSync(caPath)) {
    const caFromFile = fs.readFileSync(caPath, "utf8");
    return {
      ca: Buffer.from(caFromFile, "utf8"),
      rejectUnauthorized,
      servername: envStr("DB_SSL_SERVERNAME", envStr("DB_HOST", "")) || undefined,
    };
  }

  // Dev-only fallback: allow SSL without verification
  if (!rejectUnauthorized) {
    return {
      rejectUnauthorized: false,
      servername: envStr("DB_SSL_SERVERNAME", envStr("DB_HOST", "")) || undefined,
    };
  }

  return undefined;
}

const port = envStr("DB_PORT", "") ? Number(envStr("DB_PORT")) : 3306;
const ssl = buildSSL();

const rawPool = mysql.createPool({
  host: envStr("DB_HOST", ""),
  port,
  user: envStr("DB_USER", ""),
  password: process.env.DB_PASS,
  database: envStr("DB_NAME", ""),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  connectTimeout: envStr("DB_CONNECT_TIMEOUT_MS", "") ? Number(envStr("DB_CONNECT_TIMEOUT_MS")) : 20000,

  ...(ssl ? { ssl } : {}),
});

// Helpful: log pool errors (won't crash silently)
rawPool.on("error", (err) => {
  console.error("[MySQL Pool Error]", {
    code: err && err.code,
    errno: err && err.errno,
    message: err && err.message,
    syscall: err && err.syscall,
    fatal: err && err.fatal,
  });
});

module.exports = rawPool.promise();