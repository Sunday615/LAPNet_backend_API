// src/routes/login/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../db/pool");

const router = express.Router();

async function getColumns(table) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((r) => r.Field));
}
function hasCol(cols, name) {
  return cols && cols.has(name);
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username และ password must use" });
    }

    const cols = await getColumns("users");
    const select = [
      "id",
      "username",
      "password_hash",
      "role",
      "is_active",
      hasCol(cols, "bankcode") ? "bankcode" : "NULL AS bankcode",
      hasCol(cols, "member_id") ? "member_id" : "NULL AS member_id",
    ];

    const [rows] = await pool.query(
      `SELECT ${select.join(", ")}
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [String(username).trim()]
    );

    if (!rows.length) return res.status(401).json({ message: "Invalid username or password." });

    const user = rows[0];
    if (String(user.is_active) === "0") {
      return res.status(403).json({ message: "User is inactive. Please contact admin." });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid username or password." });

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      bankcode: user.bankcode || null,
      member_id: user.member_id || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        bankcode: user.bankcode || null,
        member_id: user.member_id || null,
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return res.status(500).json({ message: "server error", error: err?.message });
  }
});

module.exports = router;
