// src/routes/login/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../../db/pool");

const router = express.Router();

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const USER_COLUMNS_CACHE_TTL_MS = Number(process.env.USER_COLUMNS_CACHE_TTL_MS || 10 * 60 * 1000);
const PASSWORD_MIN_LENGTH = Number(process.env.USER_PASSWORD_MIN_LENGTH || 8);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const JWT_ISSUER = process.env.JWT_ISSUER || "lapnet-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "lapnet-client";
const ALLOW_DEV_USER_MANAGEMENT_WITHOUT_AUTH =
  !IS_PROD && String(process.env.ALLOW_DEV_USER_MANAGEMENT_WITHOUT_AUTH || "true").toLowerCase() === "true";

const ALLOWED_ROLES = new Set(["admin", "staff", "viewer", "bank"]);
const ADMIN_ROLES = new Set(["admin", "staff"]);

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

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (secret) {
    return secret;
  }

  if (IS_PROD) {
    throw createHttpError(500, "JWT configuration is invalid");
  }

  return "dev_secret_change_me";
}

function cleanStr(value) {
  return String(value ?? "").trim();
}

function normalizeUsername(value) {
  return cleanStr(value);
}

function normRole(value) {
  const role = cleanStr(value).toLowerCase();
  return ALLOWED_ROLES.has(role) ? role : null;
}

function normBankcode(value) {
  const normalized = cleanStr(value).toUpperCase();
  if (!normalized) return null;

  const safe = normalized.replace(/[^\w-]/g, "");
  return safe || null;
}

function toBool01(value, fallback = 1) {
  if (value === undefined || value === null || value === "") return fallback ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return 1;
  if (["0", "false", "no", "off"].includes(normalized)) return 0;

  return fallback ? 1 : 0;
}

function parsePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validateUsername(username) {
  if (!username || username.length < 3) {
    throw createHttpError(400, "username must be at least 3 characters");
  }

  if (username.length > 150) {
    throw createHttpError(400, "username is too long");
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    throw createHttpError(400, "username contains invalid characters");
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    throw createHttpError(400, `password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > 1024) {
    throw createHttpError(400, "password is too long");
  }
}

function ensureAllowedRole(role) {
  const normalized = normRole(role);
  if (!normalized) {
    throw createHttpError(400, "invalid role");
  }
  return normalized;
}

async function getColumns(table) {
  const now = Date.now();

  if (table === "users" && userColumnsCache.columns && userColumnsCache.expiresAt > now) {
    return userColumnsCache.columns;
  }

  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  const columns = new Set((rows || []).map((row) => row.Field));

  if (table === "users") {
    userColumnsCache = {
      columns,
      expiresAt: now + USER_COLUMNS_CACHE_TTL_MS,
    };
  }

  return columns;
}

function hasCol(columns, name) {
  return columns && columns.has(name);
}

async function validateBankcodeInMembers(bankcode) {
  if (!bankcode) return true;

  try {
    const memberCols = await getColumns("members");
    const candidates = ["Bankcode", "BankCode", "bankcode", "id", "code"];
    const bankCol = candidates.find((item) => memberCols.has(item));

    if (!bankCol) return true;

    const [rows] = await pool.query(
      `SELECT 1 AS ok FROM members WHERE \`${bankCol}\` = ? LIMIT 1`,
      [bankcode]
    );

    return rows.length > 0;
  } catch {
    return true;
  }
}

function buildUserSelect(columns) {
  return [
    "id",
    "username",
    "role",
    hasCol(columns, "bankcode") ? "bankcode" : "NULL AS bankcode",
    hasCol(columns, "member_id") ? "member_id" : "NULL AS member_id",
    "is_active",
    "created_at",
    "updated_at",
  ];
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === "admin") {
    return true;
  }

  if (actorRole === "staff") {
    return targetRole !== "admin";
  }

  return false;
}

function authRequired(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Missing Authorization Bearer token",
      });
    }

    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({
      ok: false,
      message: "Invalid token",
    });
  }
}

function adminOnly(req, res, next) {
  const role = cleanStr(req.user?.role).toLowerCase();

  if (!ADMIN_ROLES.has(role)) {
    return res.status(403).json({
      ok: false,
      message: "Forbidden",
    });
  }

  return next();
}


function getActorContext(req) {
  const actorId = parsePositiveInt(req.user?.id);
  const actorRole = cleanStr(req.user?.role).toLowerCase();
  const hasAuthUser = !!actorId && !!actorRole;

  if (hasAuthUser) {
    return {
      actorId,
      actorRole,
      bypassAuth: false,
      isAdminLike: ADMIN_ROLES.has(actorRole),
    };
  }

  if (ALLOW_DEV_USER_MANAGEMENT_WITHOUT_AUTH) {
    return {
      actorId: null,
      actorRole: "admin",
      bypassAuth: true,
      isAdminLike: true,
    };
  }

  throw createHttpError(401, "Missing Authorization Bearer token");
}

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const userId = parsePositiveInt(req.user?.id);
    if (!userId) {
      throw createHttpError(401, "Invalid token payload");
    }

    const cols = await getColumns("users");
    const select = buildUserSelect(cols);

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")} FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      throw createHttpError(404, "User not found");
    }

    return res.json({
      ok: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("GET /api/users/me ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
    });
    return next(err);
  }
});

router.get("/", async (_req, res, next) => {
  try {
    const cols = await getColumns("users");
    const select = buildUserSelect(cols);

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")} FROM users ORDER BY id DESC`
    );

    return res.json({
      ok: true,
      data: rows,
    });
  } catch (err) {
    console.error("GET /api/users ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
    });
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "invalid id");
    }

    const cols = await getColumns("users");
    const select = buildUserSelect(cols);

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")} FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      throw createHttpError(404, "not found");
    }

    return res.json({
      ok: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("GET /api/users/:id ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      id: req.params.id,
    });
    return next(err);
  }
});


router.post("/", async (req, res, next) => {
  try {
    const cols = await getColumns("users");
    const hasBankcode = hasCol(cols, "bankcode");
    const hasMemberId = hasCol(cols, "member_id");

    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");
    const role = ensureAllowedRole(req.body?.role);
    const isActive = toBool01(req.body?.is_active, 1);

    validateUsername(username);
    validatePassword(password);

    const { actorRole } = getActorContext(req);

    if (!canManageRole(actorRole, role)) {
      throw createHttpError(403, "Forbidden to create this role");
    }

    let finalBankcode = null;
    if (hasBankcode) {
      finalBankcode = normBankcode(req.body?.bankcode);
      if (finalBankcode) {
        const exists = await validateBankcodeInMembers(finalBankcode);
        if (!exists) {
          throw createHttpError(400, "bankcode not found in members");
        }
      }
    }

    let finalMemberId = null;
    if (hasMemberId) {
      const rawMemberId = req.body?.member_id ?? req.body?.memberId ?? null;
      if (rawMemberId !== null && rawMemberId !== "") {
        const parsedMemberId = Number(rawMemberId);
        if (!Number.isInteger(parsedMemberId) || parsedMemberId <= 0) {
          throw createHttpError(400, "member_id must be a positive integer");
        }
        finalMemberId = parsedMemberId;
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const fields = ["username", "password_hash", "role", "is_active"];
    const values = [username, passwordHash, role, isActive];

    if (hasBankcode) {
      fields.push("bankcode");
      values.push(finalBankcode);
    }

    if (hasMemberId) {
      fields.push("member_id");
      values.push(finalMemberId);
    }

    const placeholders = fields.map(() => "?").join(", ");

    const [result] = await pool.query(
      `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`,
      values
    );

    return res.status(201).json({
      ok: true,
      message: "created",
      id: result.insertId,
      username,
      role,
      bankcode: hasBankcode ? finalBankcode : null,
      member_id: hasMemberId ? finalMemberId : null,
      is_active: isActive,
    });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "username already exists",
      });
    }

    console.error("POST /api/users ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
    });
    return next(err);
  }
});

async function updateUser(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "invalid id");
    }

    const { actorRole } = getActorContext(req);

    const cols = await getColumns("users");
    const hasBankcode = hasCol(cols, "bankcode");
    const hasMemberId = hasCol(cols, "member_id");

    const [existsRows] = await pool.query(
      `SELECT id, role FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existsRows.length) {
      throw createHttpError(404, "not found");
    }

    const targetRoleCurrent = cleanStr(existsRows[0]?.role).toLowerCase();
    if (!canManageRole(actorRole, targetRoleCurrent)) {
      throw createHttpError(403, "Forbidden to modify this user");
    }

    const body = req.body || {};
    const updates = [];
    const params = [];

    if (body.username !== undefined) {
      const username = normalizeUsername(body.username);
      validateUsername(username);
      updates.push("username = ?");
      params.push(username);
    }

    if (body.role !== undefined) {
      const nextRole = ensureAllowedRole(body.role);

      if (!canManageRole(actorRole, nextRole)) {
        throw createHttpError(403, "Forbidden to assign this role");
      }

      updates.push("role = ?");
      params.push(nextRole);
    }

    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(toBool01(body.is_active, 1));
    }

    if (hasBankcode && body.bankcode !== undefined) {
      const bankcode = normBankcode(body.bankcode);

      if (bankcode) {
        const exists = await validateBankcodeInMembers(bankcode);
        if (!exists) {
          throw createHttpError(400, "bankcode not found in members");
        }
      }

      updates.push("bankcode = ?");
      params.push(bankcode);
    }

    if (hasMemberId && (body.member_id !== undefined || body.memberId !== undefined)) {
      const rawMemberId = body.member_id ?? body.memberId ?? null;

      if (rawMemberId === null || rawMemberId === "") {
        updates.push("member_id = ?");
        params.push(null);
      } else {
        const memberId = Number(rawMemberId);
        if (!Number.isInteger(memberId) || memberId <= 0) {
          throw createHttpError(400, "member_id must be a positive integer");
        }

        updates.push("member_id = ?");
        params.push(memberId);
      }
    }

    if (body.password !== undefined) {
      const password = String(body.password ?? "");
      if (password.trim()) {
        validatePassword(password);
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        updates.push("password_hash = ?");
        params.push(passwordHash);
      }
    }

    if (!updates.length) {
      throw createHttpError(400, "no fields to update");
    }

    params.push(id);

    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    const select = buildUserSelect(cols);
    const [rows] = await pool.query(
      `SELECT ${select.join(", ")} FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    return res.json({
      ok: true,
      message: "updated",
      data: rows[0],
    });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "username already exists",
      });
    }

    console.error("PATCH /api/users/:id ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      id: req.params.id,
    });
    return next(err);
  }
}

router.patch("/:id", updateUser);
router.put("/:id", updateUser);

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "invalid id");
    }

    const { actorId, actorRole, bypassAuth } = getActorContext(req);

    if (!bypassAuth && actorId && actorId === id) {
      throw createHttpError(400, "cannot delete your own account");
    }

    const [rows] = await pool.query(
      `SELECT id, username, role FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      throw createHttpError(404, "not found");
    }

    if (!canManageRole(actorRole, cleanStr(rows[0]?.role).toLowerCase())) {
      throw createHttpError(403, "Forbidden to delete this user");
    }

    await pool.query(`DELETE FROM users WHERE id = ?`, [id]);

    return res.json({
      ok: true,
      message: "deleted",
      id,
      username: rows[0].username,
    });
  } catch (err) {
    console.error("DELETE /api/users/:id ERROR:", {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      id: req.params.id,
    });
    return next(err);
  }
});

module.exports = router;