// src/routes/login/users.js
const express = require("express");
const bcrypt = require("bcryptjs");

// ✅ ใช้ pool ของโปรเจคคุณ (ตามที่ app.js ใช้ ./db/pool)
const pool = require("../../db/pool");

const router = express.Router();
const ALLOWED_ROLES = new Set(["admin", "staff", "viewer"]);



// ✅ GET /api/users (list users)
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, role, is_active, created_at, updated_at
       FROM users
       ORDER BY id DESC`
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return res.status(500).json({ ok: false, message: "server error", error: err?.message });
  }
});

// ✅ GET /api/users/:id (get by id)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const [rows] = await pool.query(
      `SELECT id, username, role, is_active, created_at, updated_at
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

router.post("/", async (req, res) => {
  try {
    const { username, password, role, is_active } = req.body || {};

    // ✅ validate username
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ message: "username ต้องมีอย่างน้อย 3 ตัวอักษร" });
    }

    // ✅ validate password
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "password ต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const cleanUsername = username.trim();

    // ✅ role
    const finalRole = role && ALLOWED_ROLES.has(role) ? role : "viewer";

    // ✅ is_active (รับได้ boolean / number / string)
    let finalActive = 1;
    if (typeof is_active === "boolean") finalActive = is_active ? 1 : 0;
    else if (typeof is_active === "number") finalActive = is_active ? 1 : 0;
    else if (typeof is_active === "string") finalActive = is_active === "1" ? 1 : 0;

    // ✅ hash -> password_hash
    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ insert
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES (?, ?, ?, ?)`,
      [cleanUsername, passwordHash, finalRole, finalActive]
    );

    return res.status(201).json({
      message: "created",
      id: result.insertId,
      username: cleanUsername,
      role: finalRole,
      is_active: finalActive,
    });
  } catch (err) {
    // ✅ duplicate username
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "username นี้มีอยู่แล้ว" });
    }

    console.error("POST /api/users error:", err);
    return res.status(500).json({ message: "server error", error: err?.message });
  }
});

module.exports = router;
