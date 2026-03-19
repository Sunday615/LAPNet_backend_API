const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../../db/pool");

const router = express.Router();

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const INVALID_LOGIN_MESSAGE = "Invalid username or password.";
const USER_COLUMNS_CACHE_TTL_MS = Number(process.env.USER_COLUMNS_CACHE_TTL_MS || 10 * 60 * 1000);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_ISSUER = process.env.JWT_ISSUER || "lapnet-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "lapnet-client";

let userColumnsCache = {
  expiresAt: 0,
  columns: null,
};

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

async function getUserColumns() {
  const now = Date.now();

  if (userColumnsCache.columns && userColumnsCache.expiresAt > now) {
    return userColumnsCache.columns;
  }

  const [rows] = await pool.query("SHOW COLUMNS FROM `users`");
  const columns = new Set((rows || []).map((row) => row.Field));

  userColumnsCache = {
    columns,
    expiresAt: now + USER_COLUMNS_CACHE_TTL_MS,
  };

  return columns;
}

function hasColumn(columns, name) {
  return columns && columns.has(name);
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function validateLoginInput(username, password) {
  if (!username || !password) {
    throw createHttpError(400, "username and password are required");
  }

  if (username.length > 150) {
    throw createHttpError(400, "username is too long");
  }

  if (password.length > 1024) {
    throw createHttpError(400, "password is too long");
  }
}

function isUserActive(user) {
  const raw = user?.is_active;

  if (raw === 1 || raw === true) return true;
  if (raw === 0 || raw === false) return false;

  const normalized = String(raw ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return Boolean(raw);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret && String(secret).trim()) {
    return String(secret);
  }

  if (IS_PROD) {
    throw createHttpError(500, "JWT configuration is invalid");
  }

  return "dev_secret_change_me";
}

function buildTokenPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    bankcode: user.bankcode || null,
    member_id: user.member_id || null,
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");

    validateLoginInput(username, password);

    const columns = await getUserColumns();

    const select = [
      "id",
      "username",
      "password_hash",
      "role",
      "is_active",
      hasColumn(columns, "bankcode") ? "bankcode" : "NULL AS bankcode",
      hasColumn(columns, "member_id") ? "member_id" : "NULL AS member_id",
    ];

    const [rows] = await pool.query(
      `
      SELECT ${select.join(", ")}
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({
        ok: false,
        message: INVALID_LOGIN_MESSAGE,
      });
    }

    const user = rows[0];
    const passwordHash = String(user?.password_hash || "");

    if (!passwordHash) {
      return res.status(401).json({
        ok: false,
        message: INVALID_LOGIN_MESSAGE,
      });
    }

    const passwordMatched = await bcrypt.compare(password, passwordHash);
    if (!passwordMatched) {
      return res.status(401).json({
        ok: false,
        message: INVALID_LOGIN_MESSAGE,
      });
    }

    if (!isUserActive(user)) {
      return res.status(403).json({
        ok: false,
        message: "User is inactive. Please contact admin.",
      });
    }

    const tokenPayload = buildTokenPayload(user);
    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      algorithm: "HS256",
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: String(user.id),
    });

    return res.json({
      ok: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        bankcode: user.bankcode || null,
        member_id: user.member_id || null,
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
    });

    return next(err);
  }
});

module.exports = router;