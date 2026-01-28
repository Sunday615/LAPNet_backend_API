// src/socket/chatSocket.js
const pool = require("../../db/pool");

const asyncWrap = (fn) => (...args) =>
  Promise.resolve(fn(...args)).catch(() => {
    const socket = args[0];
    if (socket?.emit) socket.emit("chat:error", { message: "SOCKET_ERROR" });
  });

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function sanitizeBody(body) {
  const s = String(body || "").replace(/\r/g, "").trim();
  if (s.length > 5000) return s.slice(0, 5000);
  return s;
}

/**
 * ✅ dev auth เหมือน REST ของคุณ
 * - admin: auth: { role: "admin" }
 * - bank : auth: { role: "bank", bankcode: "ABC123" }
 */
function getSocketUser(socket) {
  const role = normalizeRole(socket.handshake.auth?.role);
  const bankcode = String(socket.handshake.auth?.bankcode || "").trim();

  if (role === "admin") return { role: "admin" };
  if (role === "bank") return { role: "bank", bankcode };
  return null;
}

/** DB helpers (เหมือน routes/chat/chat.js ของคุณ) */
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

async function authorizeConversation(user, conversationId) {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true;

  const bankcode = await getConversationBankcode(conversationId);
  if (!bankcode) return false;
  return String(bankcode) === String(user.bankcode);
}

module.exports = function registerChatSocket(io) {
  // auth middleware
  io.use((socket, next) => {
    const u = getSocketUser(socket);
    if (!u) return next(new Error("UNAUTHORIZED"));
    if (u.role === "bank" && !u.bankcode) return next(new Error("MISSING_BANKCODE"));
    socket.user = u;
    next();
  });

  io.on("connection", (socket) => {
    const u = socket.user;

    // ห้องกลางสำหรับ admin (ไว้รับ inbox update)
    if (u.role === "admin") socket.join("admin:inbox");

    /**
     * chat:join
     * - bank: ส่ง {} ก็ได้ (ใช้ bankcode จาก auth)
     * - admin: ส่ง { bankcode } หรือ { conversation_id }
     */
    socket.on(
      "chat:join",
      asyncWrap(async (payload = {}, ack) => {
        let conversation_id = Number(payload.conversation_id || 0);
        let bankcode = String(payload.bankcode || "").trim();

        if (!conversation_id) {
          if (u.role === "bank") bankcode = u.bankcode;
          if (!bankcode) return ack?.({ ok: false, error: "bankcode_required" });

          conversation_id = await ensureConversationByBankcode(bankcode);
        } else {
          const ok = await authorizeConversation(u, conversation_id);
          if (!ok) return ack?.({ ok: false, error: "forbidden" });

          bankcode = (await getConversationBankcode(conversation_id)) || bankcode;
        }

        const room = `chat:conv:${conversation_id}`;
        socket.join(room);

        ack?.({ ok: true, conversation_id, bankcode });
      })
    );

    /**
     * chat:send
     * payload: { conversation_id, body, client_msg_id? }
     */
    socket.on(
      "chat:send",
      asyncWrap(async (payload = {}, ack) => {
        const conversation_id = Number(payload.conversation_id || 0);
        if (!conversation_id) return ack?.({ ok: false, error: "conversation_id_required" });

        const ok = await authorizeConversation(u, conversation_id);
        if (!ok) return ack?.({ ok: false, error: "forbidden" });

        const body = sanitizeBody(payload.body);
        if (!body) return ack?.({ ok: false, error: "body_required" });

        const role = normalizeRole(u.role);
        const sender_role = role === "admin" ? "admin" : "bank";
        const sender_bankcode = sender_role === "bank" ? String(u.bankcode) : null;
        const client_msg_id = payload.client_msg_id ? String(payload.client_msg_id).slice(0, 80) : null;

        let messageRow = null;

        try {
          const [result] = await pool.query(
            `
            INSERT INTO chat_messages
              (conversation_id, sender_role, sender_bankcode, body, client_msg_id)
            VALUES (?, ?, ?, ?, ?)
            `,
            [conversation_id, sender_role, sender_bankcode, body, client_msg_id]
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

          messageRow = rows?.[0] || null;
        } catch (e) {
          // ถ้า client_msg_id ซ้ำ -> คืนตัวเดิม (เหมือน REST)
          if (String(e?.code || "") === "ER_DUP_ENTRY" && client_msg_id) {
            const [rows] = await pool.query(
              `
              SELECT id, conversation_id, sender_role, sender_bankcode, body, client_msg_id, created_at
              FROM chat_messages
              WHERE conversation_id = ? AND client_msg_id = ?
              LIMIT 1
              `,
              [conversation_id, client_msg_id]
            );
            messageRow = rows?.[0] || null;
          } else {
            throw e;
          }
        }

        const room = `chat:conv:${conversation_id}`;
        io.to(room).emit("chat:new_message", messageRow);

        // inbox update สำหรับ admin ทั้งหมด
        const bankcode = await getConversationBankcode(conversation_id);
        io.to("admin:inbox").emit("chat:inbox_update", {
          conversation_id,
          bankcode,
          last_preview: messageRow?.body || "",
          last_at: messageRow?.created_at || null,
        });

        ack?.({ ok: true, message: messageRow });
      })
    );
  });
};
