// routes/membersbank/announcements.js
const express = require("express");
const router = express.Router();
const db = require("../../db/pool");

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { UPLOAD_DIR } = require("../../config/paths");

// =====================
// Upload setup
// =====================
const ANN_SUBDIR = "announcementtomember";
const ANN_UPLOAD_DIR = path.join(UPLOAD_DIR, ANN_SUBDIR);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(ANN_UPLOAD_DIR);

function safeExt(originalname) {
  const ext = path.extname(originalname || "").toLowerCase();
  // keep ext only if reasonable, else empty
  if (!ext || ext.length > 10) return "";
  return ext;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(ANN_UPLOAD_DIR);
    cb(null, ANN_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = safeExt(file.originalname);
    const rand = Math.random().toString(16).slice(2);
    cb(null, `ann_${Date.now()}_${rand}${ext}`);
  },
});

// รับไฟล์ key ชื่อ "attachments" (หลายไฟล์ได้)
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB ต่อไฟล์
    files: 10,
  },
});

// =====================
// Helpers
// =====================
function toBool(v, def = false) {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function parseJsonMaybe(v, fallback) {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "object") return v;
  const s = String(v).trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function parseTags(v) {
  // รองรับ: ["a","b"] หรือ "a,b" หรือ "a"
  if (Array.isArray(v)) return v;
  const j = parseJsonMaybe(v, null);
  if (Array.isArray(j)) return j;
  const s = (v ?? "").toString().trim();
  if (!s) return [];
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
  return [s];
}

function parseMemberIds(v) {
  // รองรับ: [1,2] หรือ "1,2" หรือ "1"
  if (Array.isArray(v)) return v.map((x) => Number(x)).filter(Boolean);
  const j = parseJsonMaybe(v, null);
  if (Array.isArray(j)) return j.map((x) => Number(x)).filter(Boolean);
  const s = (v ?? "").toString().trim();
  if (!s) return [];
  if (s.includes(",")) return s.split(",").map((x) => Number(x.trim())).filter(Boolean);
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? [n] : [];
}

// =====================
// Routes
// =====================
/**
 * ✅ รองรับ 2 แบบ:
 * 1) application/json
 * 2) multipart/form-data (มีไฟล์ attachments)
 *
 * Fields:
 * - title (required)
 * - paragraph (recommended) or detail (fallback)
 * - tags (JSON array OR "a,b")
 * - collect_email (true/false/1/0)
 * - status ("draft"|"published")
 * - target_all (true/false)
 * - member_ids (JSON array OR "1,2,3")  // when target_all=false
 *
 * Files:
 * - attachments (multiple)
 */

// ✅ CREATE announcement + targets (transaction) + upload media
router.post("/", upload.array("attachments", 10), async (req, res) => {
  const {
    title,
    paragraph,
    detail,
    tags,
    collect_email,
    status = "published",
    target_all,
    member_ids,
  } = req.body;

  const bodyTitle = (title ?? "").toString().trim();
  const bodyParagraph = (paragraph ?? detail ?? "").toString().trim(); // fallback
  const bodyTags = parseTags(tags);
  const bodyCollect = toBool(collect_email, false);
  const bodyTargetAll = toBool(target_all, false);
  const bodyMemberIds = parseMemberIds(member_ids);

  if (!bodyTitle || !bodyParagraph) {
    return res.status(400).json({ message: "title and paragraph/detail are required" });
  }
  if (!["draft", "published"].includes(status)) {
    return res.status(400).json({ message: "status must be draft or published" });
  }
  if (!bodyTargetAll && bodyMemberIds.length === 0) {
    return res.status(400).json({ message: "member_ids is required when target_all=false" });
  }

  // build attachments from uploaded files
  const files = Array.isArray(req.files) ? req.files : [];
  const attachments = files.map((f) => ({
    name: f.originalname,
    url: `/uploads/${ANN_SUBDIR}/${f.filename}`,
    size: f.size,
    mime: f.mimetype,
  }));

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) insert announcements
    // เก็บทั้ง detail และ paragraph ให้ compatibility (detail = paragraph)
    const [r1] = await conn.query(
      `
      INSERT INTO announcements (title, detail, paragraph, tags, attachments, collect_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        bodyTitle,
        bodyParagraph, // detail
        bodyParagraph, // paragraph
        JSON.stringify(bodyTags || []),
        JSON.stringify(attachments || []),
        bodyCollect ? 1 : 0,
        status,
      ]
    );

    const announcementId = r1.insertId;

    // 2) insert mapping targets
    if (!bodyTargetAll) {
      const uniqIds = [...new Set(bodyMemberIds)];

      // Validate members exist
      const [existRows] = await conn.query(
        `SELECT idmember FROM members WHERE idmember IN (?)`,
        [uniqIds]
      );
      const existSet = new Set(existRows.map((r) => r.idmember));
      const missing = uniqIds.filter((id) => !existSet.has(id));
      if (missing.length) {
        await conn.rollback();
        return res.status(400).json({ message: "Some member_ids not found", missing });
      }

      const values = uniqIds.map((idmember) => [announcementId, idmember]);
      await conn.query(
        `INSERT INTO announcement_members (announcement_id, idmember) VALUES ?`,
        [values]
      );
    }

    await conn.commit();
    res.json({ ok: true, id: announcementId, attachments });
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/announcements error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ LIST announcements (summary)
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, title, status, collect_email, created_at, updated_at
      FROM announcements
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/announcements error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET announcement detail + targets ids
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [aRows] = await db.query(
      `
      SELECT id, title, detail, paragraph, tags, attachments, collect_email, status, created_at, updated_at
      FROM announcements
      WHERE id = ?
      `,
      [id]
    );
    if (!aRows.length) return res.status(404).json({ message: "Not found" });

    const announcement = aRows[0];

    const [tRows] = await db.query(
      `SELECT idmember FROM announcement_members WHERE announcement_id = ? ORDER BY idmember ASC`,
      [id]
    );

    // parse json
    let parsedTags = announcement.tags;
    try {
      if (typeof parsedTags === "string") parsedTags = JSON.parse(parsedTags);
    } catch {}
    announcement.tags = parsedTags;

    let parsedAttachments = announcement.attachments;
    try {
      if (typeof parsedAttachments === "string") parsedAttachments = JSON.parse(parsedAttachments);
    } catch {}
    announcement.attachments = parsedAttachments;

    res.json({
      ...announcement,
      member_ids: tRows.map((r) => r.idmember),
      target_all: tRows.length === 0,
    });
  } catch (err) {
    console.error("GET /api/announcements/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET targets as full member objects
router.get("/:id/targets", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [rows] = await db.query(
      `
      SELECT m.idmember, m.Bankcode, m.BanknameLA, m.image
      FROM announcement_members am
      JOIN members m ON m.idmember = am.idmember
      WHERE am.announcement_id = ?
      ORDER BY CASE WHEN m.idmember = 1 THEN 0 ELSE 1 END, m.idmember ASC
      `,
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/announcements/:id/targets error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ UPDATE announcement + replace targets (transaction)
// รองรับ JSON เท่านั้น (ถ้าจะอัปโหลดไฟล์ตอนแก้ เดี๋ยวผมเพิ่ม endpoint แยกให้)
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  const {
    title,
    paragraph,
    detail,
    tags,
    collect_email,
    status,
    target_all = false,
    member_ids = [],
  } = req.body;

  if (status && !["draft", "published"].includes(status)) {
    return res.status(400).json({ message: "status must be draft or published" });
  }

  const bodyTargetAll = toBool(target_all, false);
  const bodyMemberIds = parseMemberIds(member_ids);

  if (!bodyTargetAll && Array.isArray(bodyMemberIds) && bodyMemberIds.length === 0) {
    return res.status(400).json({ message: "member_ids is required when target_all=false" });
  }

  const nextTitle = title === undefined ? undefined : String(title).trim();
  const nextParagraph =
    paragraph !== undefined ? String(paragraph).trim()
    : detail !== undefined ? String(detail).trim()
    : undefined;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [exist] = await conn.query(`SELECT id FROM announcements WHERE id = ?`, [id]);
    if (!exist.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Not found" });
    }

    const nextTags = tags === undefined ? undefined : JSON.stringify(parseTags(tags));

    await conn.query(
      `
      UPDATE announcements
      SET
        title = COALESCE(?, title),
        detail = COALESCE(?, detail),
        paragraph = COALESCE(?, paragraph),
        tags = COALESCE(?, tags),
        collect_email = COALESCE(?, collect_email),
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      [
        nextTitle ?? null,
        nextParagraph ?? null, // detail
        nextParagraph ?? null, // paragraph
        nextTags === undefined ? null : nextTags,
        collect_email === undefined ? null : (toBool(collect_email) ? 1 : 0),
        status ?? null,
        id,
      ]
    );

    await conn.query(`DELETE FROM announcement_members WHERE announcement_id = ?`, [id]);

    if (!bodyTargetAll) {
      const uniqIds = [...new Set(bodyMemberIds)];

      const [existRows] = await conn.query(
        `SELECT idmember FROM members WHERE idmember IN (?)`,
        [uniqIds]
      );
      const existSet = new Set(existRows.map((r) => r.idmember));
      const missing = uniqIds.filter((mid) => !existSet.has(mid));
      if (missing.length) {
        await conn.rollback();
        return res.status(400).json({ message: "Some member_ids not found", missing });
      }

      const values = uniqIds.map((mid) => [id, mid]);
      await conn.query(
        `INSERT INTO announcement_members (announcement_id, idmember) VALUES ?`,
        [values]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("PUT /api/announcements/:id error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ DELETE announcement (cascade delete mapping)
// (ไฟล์ใน uploads ไม่ลบอัตโนมัติ — ถ้าต้องการลบไฟล์ด้วย บอกผมได้)
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [r] = await db.query(`DELETE FROM announcements WHERE id = ?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/announcements/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
