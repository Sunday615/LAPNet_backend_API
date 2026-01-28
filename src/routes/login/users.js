// src/routes/login/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ use your project pool (same as app.js uses ./db/pool)
const pool = require("../../db/pool");

const router = express.Router();

// ✅ roles (เพิ่ม bank)
const ALLOWED_ROLES = new Set(["admin", "staff", "viewer", "bank"]);

// -----------------------------
// Auth middleware (JWT)
// -----------------------------
function authRequired(req, res, next) {
  try {
    const h = String(req.headers.authorization || "");
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) return res.status(401).json({ ok: false, message: "Missing Authorization Bearer token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload; // {id, username, role, bankcode?}
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Invalid token", error: e?.message });
  }
}

// -----------------------------
// Helpers
// -----------------------------
function toBool01(v, def = 1) {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return 1;
  if (["0", "false", "no", "off"].includes(s)) return 0;
  return def;
}
function cleanStr(v) {
  return String(v ?? "").trim();
}
function normRole(v) {
  const r = cleanStr(v).toLowerCase();
  return ALLOWED_ROLES.has(r) ? r : "viewer";
}
function normBankcode(v) {
  const s = cleanStr(v).toUpperCase();
  if (!s) return null;
  const safe = s.replace(/[^\w\-]/g, "");
  return safe || null;
}
async function getColumns(table) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((r) => r.Field));
}
function hasCol(cols, name) {
  return cols && cols.has(name);
}

// best-effort validate bankcode exists in members
async function validateBankcodeInMembers(bankcode) {
  if (!bankcode) return true;
  try {
    const memCols = await getColumns("members");
    const candidates = ["Bankcode", "BankCode", "bankcode", "id", "code"];
    const bankCol = candidates.find((c) => memCols.has(c));
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

// -----------------------------
// ✅ GET /api/users/me (current user)
// -----------------------------
router.get("/me", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, message: "Invalid token payload (missing id)" });

    const cols = await getColumns("users");
    const select = [
      "id",
      "username",
      "role",
      hasCol(cols, "bankcode") ? "bankcode" : "NULL AS bankcode",
      hasCol(cols, "member_id") ? "member_id" : "NULL AS member_id",
      "is_active",
      "created_at",
      "updated_at",
    ];

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")} FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "user not found" });

    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
});

// -----------------------------
// GET /api/users (list users)
// -----------------------------
router.get("/", async (_req, res) => {
  try {
    const cols = await getColumns("users");

    const select = [
      "id",
      "username",
      "role",
      hasCol(cols, "bankcode") ? "bankcode" : "NULL AS bankcode",
      hasCol(cols, "member_id") ? "member_id" : "NULL AS member_id",
      "is_active",
      "created_at",
      "updated_at",
    ];

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")}
       FROM users
       ORDER BY id DESC`
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
});

// -----------------------------
// GET /api/users/:id (get by id)
// -----------------------------
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const cols = await getColumns("users");

    const select = [
      "id",
      "username",
      "role",
      hasCol(cols, "bankcode") ? "bankcode" : "NULL AS bankcode",
      hasCol(cols, "member_id") ? "member_id" : "NULL AS member_id",
      "is_active",
      "created_at",
      "updated_at",
    ];

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")}
       FROM users
       WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "not found" });
    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
});

// -----------------------------
// POST /api/users (create user)
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const { username, password, role, is_active, bankcode, member_id, memberId } = req.body || {};

    const cleanUsername = cleanStr(username);
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ message: "username must be at least 3 characters" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    const finalRole = normRole(role);
    const finalActive = toBool01(is_active, 1);

    const cols = await getColumns("users");
    const hasBankcode = hasCol(cols, "bankcode");
    const hasMemberId = hasCol(cols, "member_id");

    let finalBankcode = null;
    let finalMemberId = null;

    if (hasBankcode) {
      finalBankcode = normBankcode(bankcode);
      if (finalBankcode) {
        const ok = await validateBankcodeInMembers(finalBankcode);
        if (!ok) return res.status(400).json({ message: "bankcode not found in members", bankcode: finalBankcode });
      }
    }

    if (hasMemberId) {
      const raw = member_id ?? memberId ?? null;
      const n = raw === null || raw === "" ? null : Number(raw);
      finalMemberId = Number.isFinite(n) ? n : null;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const fields = ["username", "password_hash", "role", "is_active"];
    const vals = [cleanUsername, passwordHash, finalRole, finalActive];

    if (hasBankcode) { fields.push("bankcode"); vals.push(finalBankcode); }
    if (hasMemberId) { fields.push("member_id"); vals.push(finalMemberId); }

    const placeholders = fields.map(() => "?").join(", ");

    const [result] = await pool.query(
      `INSERT INTO users (${fields.join(", ")})
       VALUES (${placeholders})`,
      vals
    );

    return res.status(201).json({
      ok: true,
      message: "created",
      id: result.insertId,
      username: cleanUsername,
      role: finalRole,
      bankcode: hasBankcode ? finalBankcode : null,
      member_id: hasMemberId ? finalMemberId : null,
      is_active: finalActive,
    });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "username already exists" });
    console.error("POST /api/users error:", err);
    return res.status(500).json({ message: "server error", error: err?.message });
  }
});

// -----------------------------
// PATCH/PUT /api/users/:id (update user)
// -----------------------------
async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const cols = await getColumns("users");
    const hasBankcode = hasCol(cols, "bankcode");
    const hasMemberId = hasCol(cols, "member_id");

    const [existsRows] = await pool.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [id]);
    if (!existsRows.length) return res.status(404).json({ ok: false, message: "not found" });

    const body = req.body || {};
    const updates = [];
    const params = [];

    if (body.username !== undefined) {
      const u = cleanStr(body.username);
      if (!u || u.length < 3) return res.status(400).json({ message: "username must be at least 3 characters" });
      updates.push("username = ?");
      params.push(u);
    }

    if (body.role !== undefined) {
      const r = normRole(body.role);
      updates.push("role = ?");
      params.push(r);
    }

    if (body.is_active !== undefined) {
      const a = toBool01(body.is_active, 1);
      updates.push("is_active = ?");
      params.push(a);
    }

    if (hasBankcode && body.bankcode !== undefined) {
      const bc = normBankcode(body.bankcode);
      if (bc) {
        const ok = await validateBankcodeInMembers(bc);
        if (!ok) return res.status(400).json({ message: "bankcode not found in members", bankcode: bc });
      }
      updates.push("bankcode = ?");
      params.push(bc);
    }

    if (hasMemberId && (body.member_id !== undefined || body.memberId !== undefined)) {
      const raw = body.member_id ?? body.memberId ?? null;
      const n = raw === null || raw === "" ? null : Number(raw);
      const mid = Number.isFinite(n) ? n : null;
      updates.push("member_id = ?");
      params.push(mid);
    }

    if (body.password !== undefined) {
      const p = String(body.password ?? "");
      if (p.trim().length > 0) {
        if (p.length < 6) return res.status(400).json({ message: "password must be at least 6 characters" });
        const hash = await bcrypt.hash(p, 10);
        updates.push("password_hash = ?");
        params.push(hash);
      }
    }

    if (!updates.length) return res.status(400).json({ ok: false, message: "no fields to update" });

    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    const select = [
      "id",
      "username",
      "role",
      hasBankcode ? "bankcode" : "NULL AS bankcode",
      hasMemberId ? "member_id" : "NULL AS member_id",
      "is_active",
      "created_at",
      "updated_at",
    ];
    const [rows] = await pool.query(`SELECT ${select.join(", ")} FROM users WHERE id = ? LIMIT 1`, [id]);

    return res.json({ ok: true, message: "updated", data: rows[0] });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "username already exists" });
    console.error("PATCH /api/users/:id error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
}
router.patch("/:id", updateUser);
router.put("/:id", updateUser);

// -----------------------------
// DELETE /api/users/:id
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const [rows] = await pool.query(`SELECT id, username FROM users WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "not found" });

    await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
    return res.json({ ok: true, message: "deleted", id, username: rows[0].username });
  } catch (err) {
    console.error("DELETE /api/users/:id error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
});

module.exports = router; // ✅ สำคัญมาก: ห้ามใช้ exports = router
