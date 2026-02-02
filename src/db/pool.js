// db/pool.js
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Load .env in local dev (Render will ignore if env vars already set)
require("dotenv").config();

/**
 * Aiven MySQL requires SSL.
 * You can provide CA in 2 ways:
 * 1) DB_CA_CERT (recommended on Render): paste the CA cert content (multiline)
 * 2) Put ca.pem in ./db/certs/ca.pem (or change path below) for local/dev
 */
function buildSSL() {
  // Option A: CA cert from env (Render-friendly)
  if (process.env.DB_CA_CERT && process.env.DB_CA_CERT.trim()) {
    return {
      ca: process.env.DB_CA_CERT,
      rejectUnauthorized: true,
    };
  }

  // Option B: CA cert from file (repo/local)
  // Put your downloaded Aiven CA file here: db/certs/ca.pem
  const caPath =
    process.env.DB_CA_PATH ||
    path.join(__dirname, "certs", "ca.pem");

  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath, "utf8"),
      rejectUnauthorized: true,
    };
  }

  // If no CA provided, return undefined (might fail with Aiven)
  return undefined;
}

const port =
  process.env.DB_PORT && String(process.env.DB_PORT).trim()
    ? Number(process.env.DB_PORT)
    : 3306;

const ssl = buildSSL();

const rawPool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // IMPORTANT: Aiven usually requires SSL
  ...(ssl ? { ssl } : {}),
});

// Helpful: log pool errors (won't crash silently)
rawPool.on("error", (err) => {
  console.error("[MySQL Pool Error]", {
    code: err.code,
    errno: err.errno,
    message: err.message,
    syscall: err.syscall,
    fatal: err.fatal,
  });
});

// ✅ export promise pool
module.exports = rawPool.promise();
