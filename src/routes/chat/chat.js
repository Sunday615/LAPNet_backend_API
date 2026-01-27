// src/routes/chat/chat.js
const express = require("express");
const router = express.Router();
const pool = require("../../db/pool");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

/** =========================
 * ✅ dev auth (ไว้เทสง่าย)
 * - admin:  x-role: admin
 * - bank:   x-role: bank  +  x-bankcode: ABC123
 * ========================= */
function getAuthUser(req) {
  if (req.user) return req.user;

  const role = normalizeRole(req.headers["x-role"]);
  const bankcode = String(req.headers["x-bankcode"] || "").trim();

  if (role === "admin") return { role: "admin" };
  if (role === "bank") return { role: "bank", bankcode };
  return null;
}

function requireAuth(req, res, next) {
  const u = getAuthUser(req);
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  if (u.role === "bank" && !u.bankcode) return res.status(401).json({ message: "Missing bankcode" });
  req.user = u;
  next();
}

function requireAdmin(req, res, next) {
  const role = normalizeRole(req.user?.role);
  if (role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
}

/** =========================
 * DB helpers
 * ========================= */
async function ensureConversationByBankcode(bankcode) {
  // ต้องมี UNIQUE KEY(chat_conversations.bankcode)
  const sql = `
    INSERT INTO chat_conversations (bankcode)
    VALUES (?)
    ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
  `;
  const [result] = await pool.query(sql, [bankcode]);
  return Number(result.insertId);
}

async function getConversationBankcode(conversationId) {
  const [rows] = await pool.query(
    `SELECT bankcode FROM chat_conversations WHERE id = ? LIMIT 1`,
    [conversationId]
  );
  return rows?.[0]?.bankcode || null;
}

async function authorizeConversation(req, conversationId) {
  const role = normalizeRole(req.user?.role);
  if (role === "admin") return true;

  const bankcode = await getConversationBankcode(conversationId);
  if (!bankcode) return false;
  return String(bankcode) === String(req.user.bankcode);
}

function sanitizeBody(body) {
  const s = String(body || "").replace(/\r/g, "").trim();
  if (s.length > 5000) return s.slice(0, 5000);
  return s;
}

/** =========================
 * ✅ 0) PING (เทส route)
 * GET /api/chat/ping
 * ========================= */
router.get("/ping", (_req, res) => {
  res.json({ ok: true, message: "chat routes online" });
});

/** =========================
 * ✅ 1) ENSURE CONVERSATION
 * POST /api/chat/conversations/ensure
 * - bank: ไม่ต้องส่ง bankcode (ใช้ req.user.bankcode)
 * - admin: ส่ง { bankcode }
 * ========================= */
router.post(
  "/conversations/ensure",
  requireAuth,
  asyncHandler(async (req, res) => {
    const role = normalizeRole(req.user.role);
    const bankcode =
      role === "bank"
        ? String(req.user.bankcode || "").trim()
        : String(req.body?.bankcode || "").trim();

    if (!bankcode) return res.status(400).json({ message: "bankcode is required" });

    const conversation_id = await ensureConversationByBankcode(bankcode);
    res.json({ conversation_id, bankcode });
  })
);

/** =========================
 * ✅ 2) POST MESSAGE
 * POST /api/chat/conversations/:id/messages
 * body: { body: "text", client_msg_id?: "..." }
 * ========================= */
router.post(
  "/conversations/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const ok = await authorizeConversation(req, conversationId);
    if (!ok) return res.status(403).json({ message: "Forbidden" });

    const role = normalizeRole(req.user.role);
    const sender_role = role === "admin" ? "admin" : "bank";
    const sender_bankcode = sender_role === "bank" ? String(req.user.bankcode) : null;

    const body = sanitizeBody(req.body?.body);
    if (!body) return res.status(400).json({ message: "body is required" });

    const client_msg_id = req.body?.client_msg_id ? String(req.body.client_msg_id).slice(0, 80) : null;

    try {
      const [result] = await pool.query(
        `
        INSERT INTO chat_messages
          (conversation_id, sender_role, sender_bankcode, body, client_msg_id)
        VALUES (?, ?, ?, ?, ?)
        `,
        [conversationId, sender_role, sender_bankcode, body, client_msg_id]
      );

      const insertedId = Number(result.insertId);
      const [rows] = await pool.query(
        `
        SELECT id, conversation_id, sender_role, sender_bankcode, body, client_msg_id, created_at
        FROM chat_messages
        WHERE id = ?
        LIMIT 1
        `,
        [insertedId]
      );

      res.json({ message: rows?.[0] || null });
    } catch (e) {
      // ถ้า client_msg_id ซ้ำ -> คืนตัวเดิม
      if (String(e?.code || "") === "ER_DUP_ENTRY" && client_msg_id) {
        const [rows] = await pool.query(
          `
          SELECT id, conversation_id, sender_role, sender_bankcode, body, client_msg_id, created_at
          FROM chat_messages
          WHERE conversation_id = ? AND client_msg_id = ?
          LIMIT 1
          `,
          [conversationId, client_msg_id]
        );
        return res.json({ message: rows?.[0] || null });
      }
      throw e;
    }
  })
);

/** =========================
 * ✅ 3) GET MESSAGES  (นี่แหละที่ทำให้ Postman ไม่ 404)
 * GET /api/chat/conversations/:id/messages?limit=50
 * ========================= */
router.get(
  "/conversations/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const ok = await authorizeConversation(req, conversationId);
    if (!ok) return res.status(403).json({ message: "Forbidden" });

    const limitRaw = parseInt(String(req.query.limit || "50"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const [rows] = await pool.query(
      `
      SELECT id, conversation_id, sender_role, sender_bankcode, body, client_msg_id, created_at
      FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT ?
      `,
      [conversationId, limit]
    );

    res.json({ items: rows });
  })
);

/** =========================
 * ✅ 4) ADMIN META: list banks from conversations + last message
 * GET /api/chat/admin/banks
 * ========================= */
router.get(
  "/admin/banks",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    // ดึง conversation ทั้งหมด + last message ต่อ bankcode
    const [rows] = await pool.query(
      `
      SELECT
        c.id AS conversation_id,
        c.bankcode,
        lm.body AS last_preview,
        lm.created_at AS last_at,
        0 AS unread_count
      FROM chat_conversations c
      LEFT JOIN (
        SELECT m1.conversation_id, m1.body, m1.created_at
        FROM chat_messages m1
        INNER JOIN (
          SELECT conversation_id, MAX(created_at) AS max_created
          FROM chat_messages
          GROUP BY conversation_id
        ) mx ON mx.conversation_id = m1.conversation_id AND mx.max_created = m1.created_at
      ) lm ON lm.conversation_id = c.id
      ORDER BY (lm.created_at IS NULL) ASC, lm.created_at DESC, c.id DESC
      `
    );

    res.json({ items: rows });
  })
);

module.exports = router;
