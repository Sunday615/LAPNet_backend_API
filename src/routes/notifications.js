const express = require("express");
const router = express.Router();
const pool = require("../db/pool"); // ตามโครงสร้างมี src/db/pool.js

const toInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// GET /api/notifications?unread=1&entity=member&action=insert&q=...
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(toInt(req.query.limit, 50), 200);
    const offset = Math.max(toInt(req.query.offset, 0), 0);

    const unread = req.query.unread === "1" || req.query.unread === "true";
    const entity = req.query.entity?.trim();
    const action = req.query.action?.trim();
    const q = req.query.q?.trim();

    const where = [];
    const params = [];

    if (unread) where.push("`is_read`=0");
    if (entity) {
      where.push("`entity`=?");
      params.push(entity);
    }
    if (action) {
      where.push("`action`=?");
      params.push(action);
    }
    if (q) {
      where.push("(`title` LIKE ? OR `message` LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT *
       FROM notifications
       ${whereSql}
       ORDER BY \`time\` DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ items: rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE `is_read`=0"
    );
    res.json({ unread: row?.unread ?? 0 });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [result] = await pool.query(
      "UPDATE notifications SET `is_read`=1, `read_time`=NOW() WHERE idnotification=?",
      [id]
    );

    res.json({ ok: true, affected: result?.affectedRows ?? 0 });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "UPDATE notifications SET `is_read`=1, `read_time`=NOW() WHERE `is_read`=0"
    );
    res.json({ ok: true, affected: result?.affectedRows ?? 0 });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [result] = await pool.query(
      "DELETE FROM notifications WHERE idnotification=?",
      [id]
    );
    res.json({ ok: true, affected: result?.affectedRows ?? 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
