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

// ✅ support BOTH field names: "files" and "attachments"
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
});

// ✅ make Multer errors return readable 400 JSON
function multerFieldsSafe(fields) {
  const mw = upload.fields(fields);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next();

      const code = err.code || "UPLOAD_ERROR";
      const msg = err.message || "Upload error";

      return res.status(400).json({
        message: msg,
        code,
        hint:
          code === "LIMIT_UNEXPECTED_FILE"
            ? "Use file field name: 'attachments' or 'files' (not attachments[])."
            : code === "LIMIT_FILE_SIZE"
            ? "File too large (max 50MB each)."
            : code === "LIMIT_FILE_COUNT"
            ? "Too many files (max 10)."
            : "Check multipart/form-data fields.",
      });
    });
  };
}

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

function normalizeTag(t) {
  return String(t || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "")
    .slice(0, 32);
}

function parseTags(v) {
  if (Array.isArray(v)) return v.map(normalizeTag).filter(Boolean);
  const j = parseJsonMaybe(v, null);
  if (Array.isArray(j)) return j.map(normalizeTag).filter(Boolean);
  const s = (v ?? "").toString().trim();
  if (!s) return [];
  const arr = s.includes(",") ? s.split(",") : [s];
  return arr.map(normalizeTag).filter(Boolean);
}

function parseMemberIds(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter((x) => x && x !== "0");
  const j = parseJsonMaybe(v, null);
  if (Array.isArray(j)) return j.map((x) => String(x).trim()).filter((x) => x && x !== "0");
  const s = (v ?? "").toString().trim();
  if (!s) return [];
  const parts = s.includes(",") ? s.split(",") : [s];
  return parts.map((x) => String(x).trim()).filter((x) => x && x !== "0");
}

function pickFiles(req) {
  const f = req.files || {};
  const a = Array.isArray(f.files) ? f.files : [];
  const b = Array.isArray(f.attachments) ? f.attachments : [];
  return a.concat(b);
}

async function unlinkSafe(p) {
  try {
    await fs.promises.unlink(p);
  } catch {}
}

async function getColumns(conn, table) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((r) => r.Field));
}

function firstExisting(set, candidates) {
  for (const c of candidates) if (set.has(c)) return c;
  return null;
}

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x)))];
}

function storagePathToAbs(_storagePathOrUrl, storedName) {
  if (!storedName) return null;
  return path.join(ANN_UPLOAD_DIR, storedName);
}

/**
 * Pick member source to match your /api/members mapping.
 * It will try tables in order:
 *  - memberbank
 *  - membersbank
 *  - members
 *
 * And auto-detect columns for:
 *  - id: Bankcode / member_id / id / code
 *  - name: BanknameLA / name
 *  - logo: image / bank_logo / logo / bankLogo
 */
async function pickMemberSource(conn) {
  const candidates = [{ table: "memberbank" }, { table: "membersbank" }, { table: "members" }];

  for (const c of candidates) {
    try {
      const cols = await getColumns(conn, c.table);

      const idCol =
        firstExisting(cols, ["Bankcode", "BankCode", "bankcode", "member_id", "MemberId", "id", "code"]) || null;
      const nameCol =
        firstExisting(cols, ["BanknameLA", "BankNameLA", "banknameLA", "name", "Name"]) || null;
      const logoCol =
        firstExisting(cols, ["image", "Image", "bank_logo", "bankLogo", "logo", "Logo"]) || null;

      if (idCol && nameCol) return { table: c.table, idCol, nameCol, logoCol, cols };
    } catch {
      // table doesn't exist -> try next
    }
  }

  return null;
}

/**
 * Validate member ids exist in the same source used by /api/members (best-effort).
 * If no member source table found, it will NOT block (returns ok=true).
 */
async function validateMemberIds(conn, ids) {
  const src = await pickMemberSource(conn);
  if (!src) return { ok: true, missing: [], used: null };

  const uniqIds = uniq(ids);
  const [rows] = await conn.query(
    `SELECT \`${src.idCol}\` AS mid FROM \`${src.table}\` WHERE \`${src.idCol}\` IN (?)`,
    [uniqIds]
  );

  const set = new Set(rows.map((r) => String(r.mid)));
  const missing = uniqIds.filter((x) => !set.has(String(x)));

  return { ok: missing.length === 0, missing, used: { table: src.table, col: src.idCol } };
}

// =====================
// Routes
// =====================

router.post(
  "/",
  multerFieldsSafe([
    { name: "files", maxCount: 10 },
    { name: "attachments", maxCount: 10 },
  ]),
  async (req, res) => {
    const {
      title,
      body,
      paragraph,
      detail,
      tags,
      collect_email,
      status = "published",
      target_all,
      memberIds,
      member_ids,
    } = req.body || {};

    const bodyTitle = (title ?? "").toString().trim();
    const bodyText = (body ?? paragraph ?? detail ?? "").toString().trim();

    const bodyTags = parseTags(tags);
    const bodyCollect = toBool(collect_email, false);
    const bodyTargetAll = toBool(target_all, false);
    const bodyMemberIds = parseMemberIds(memberIds ?? member_ids);

    if (!bodyTitle || !bodyText) {
      return res.status(400).json({ message: "title and body/paragraph/detail are required" });
    }
    if (!["draft", "published", "archived"].includes(String(status))) {
      return res.status(400).json({ message: "status must be draft/published/archived" });
    }
    if (!bodyTargetAll && bodyMemberIds.length === 0) {
      return res.status(400).json({ message: "memberIds/member_ids is required when target_all=false" });
    }

    const files = pickFiles(req);

    const attachmentRows = files.map((f) => ({
      original_name: f.originalname,
      stored_name: f.filename,
      mime_type: f.mimetype,
      size_bytes: f.size,
      storage_path: `/uploads/${ANN_SUBDIR}/${f.filename}`,
      abs_path: f.path,
    }));

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // --- Detect columns for announcements compatibility ---
      const annCols = await getColumns(conn, "announcements");
      const annTargetCol = firstExisting(annCols, ["target_all", "send_to_all"]) || "target_all";
      const annCollectCol = firstExisting(annCols, ["collect_email"]) || "collect_email";
      const annBodyCol = firstExisting(annCols, ["body", "detail", "paragraph"]) || "body";
      const annStatusCol = firstExisting(annCols, ["status"]) || "status";

      // 1) insert announcements
      const insertCols = ["title", annBodyCol];
      const insertVals = [bodyTitle, bodyText];

      if (annCols.has(annTargetCol)) {
        insertCols.push(annTargetCol);
        insertVals.push(bodyTargetAll ? 1 : 0);
      }
      if (annCols.has(annStatusCol)) {
        insertCols.push(annStatusCol);
        insertVals.push(String(status));
      }
      if (annCols.has(annCollectCol)) {
        insertCols.push(annCollectCol);
        insertVals.push(bodyCollect ? 1 : 0);
      }

      const [r1] = await conn.query(
        `INSERT INTO announcements (${insertCols.map((c) => `\`${c}\``).join(", ")})
         VALUES (${insertCols.map(() => "?").join(", ")})`,
        insertVals
      );

      const announcementId = r1.insertId;

      // 2) insert tags
      if (bodyTags.length) {
        const uniqTags = uniq(bodyTags).slice(0, 12);
        const values = uniqTags.map((t) => [announcementId, t]);
        await conn.query(`INSERT IGNORE INTO announcement_tags (announcement_id, tag) VALUES ?`, [values]);
      }

      // 3) insert targets
      if (!bodyTargetAll) {
        const uniqIds = uniq(bodyMemberIds);

        // ✅ validate against memberbank/membersbank/members (auto)
        const check = await validateMemberIds(conn, uniqIds);
        if (!check.ok) {
          await conn.rollback();
          for (const a of attachmentRows) await unlinkSafe(a.abs_path);
          return res.status(400).json({
            message: "Some member ids not found",
            missing: check.missing,
            used: check.used,
            hint: "memberIds must match Bankcode from GET /api/members",
          });
        }

        const values = uniqIds.map((mid) => [announcementId, String(mid)]);
        await conn.query(`INSERT IGNORE INTO announcement_targets (announcement_id, member_id) VALUES ?`, [values]);
      }

      // 4) insert attachments
      if (attachmentRows.length) {
        const attCols = await getColumns(conn, "announcement_attachments");
        const attPathCol = firstExisting(attCols, ["storage_path", "file_url"]) || "storage_path";

        const cols = ["announcement_id", "original_name", "stored_name", attPathCol, "mime_type", "size_bytes"].filter(
          (c) => attCols.has(c) || c === "announcement_id"
        );

        const values = attachmentRows.map((a) => {
          const row = [];
          for (const c of cols) {
            if (c === "announcement_id") row.push(announcementId);
            else if (c === "original_name") row.push(a.original_name);
            else if (c === "stored_name") row.push(a.stored_name);
            else if (c === attPathCol) row.push(a.storage_path);
            else if (c === "mime_type") row.push(a.mime_type);
            else if (c === "size_bytes") row.push(a.size_bytes);
            else row.push(null);
          }
          return row;
        });

        await conn.query(
          `INSERT INTO announcement_attachments (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES ?`,
          [values]
        );
      }

      await conn.commit();

      res.json({
        ok: true,
        id: announcementId,
        announcement_id: announcementId,
        title: bodyTitle,
        body: bodyText,
        status: String(status),
        collect_email: bodyCollect,
        target_all: bodyTargetAll,
        tags: uniq(bodyTags).slice(0, 12),
        member_ids: bodyTargetAll ? [] : uniq(bodyMemberIds),
        attachments: attachmentRows.map((a) => ({
          name: a.original_name,
          url: a.storage_path,
          size: a.size_bytes,
          mime: a.mime_type,
        })),
      });
    } catch (err) {
      await conn.rollback();
      const filesNow = pickFiles(req);
      for (const f of filesNow) await unlinkSafe(f.path);

      console.error("POST /announcements error:", err);
      res.status(500).json({ message: err?.message || "Server error" });
    } finally {
      conn.release();
    }
  }
);

/**
 * ✅ GET /announcements  (FULL: announcements + tags + targets + attachments)
 * This returns data from ALL tables in your screenshot:
 *  - announcements
 *  - announcement_tags
 *  - announcement_targets
 *  - announcement_attachments
 */
router.get("/", async (_req, res) => {
  const conn = await db.getConnection();
  try {
    const annCols = await getColumns(conn, "announcements");
    const annIdCol = firstExisting(annCols, ["id", "announcement_id"]) || "id";
    const annTargetCol = firstExisting(annCols, ["target_all", "send_to_all"]) || "target_all";
    const annBodyCol = firstExisting(annCols, ["body", "detail", "paragraph"]) || "body";

    const select = [
      `\`${annIdCol}\` AS id`,
      `\`${annIdCol}\` AS announcement_id`,
      "title",
      annCols.has(annBodyCol) ? `\`${annBodyCol}\` AS body` : "'' AS body",
      annCols.has("status") ? "status" : "'published' AS status",
      annCols.has("collect_email") ? "collect_email" : "0 AS collect_email",
      annCols.has(annTargetCol) ? `\`${annTargetCol}\` AS target_all` : "0 AS target_all",
      annCols.has("created_at") ? "created_at" : "NULL AS created_at",
      annCols.has("updated_at") ? "updated_at" : "NULL AS updated_at",
    ];

    const [annRows] = await conn.query(`
      SELECT ${select.join(", ")}
      FROM announcements
      ORDER BY ${annCols.has("created_at") ? "created_at" : `\`${annIdCol}\``} DESC
    `);

    if (!annRows.length) return res.json([]);

    const ids = annRows.map((r) => Number(r.id)).filter(Boolean);

    // ---------- tags ----------
    let tagRows = [];
    try {
      const [rows] = await conn.query(
        `SELECT announcement_id, tag
         FROM announcement_tags
         WHERE announcement_id IN (?)
         ORDER BY announcement_id ASC, tag ASC`,
        [ids]
      );
      tagRows = rows;
    } catch {
      tagRows = [];
    }
    const tagsMap = new Map();
    for (const r of tagRows) {
      const k = Number(r.announcement_id);
      if (!tagsMap.has(k)) tagsMap.set(k, []);
      tagsMap.get(k).push(r.tag);
    }

    // ---------- targets ----------
    let targetRows = [];
    try {
      const [rows] = await conn.query(
        `SELECT announcement_id, member_id
         FROM announcement_targets
         WHERE announcement_id IN (?)
         ORDER BY announcement_id ASC, member_id ASC`,
        [ids]
      );
      targetRows = rows;
    } catch {
      targetRows = [];
    }
    const targetsMap = new Map();
    for (const r of targetRows) {
      const k = Number(r.announcement_id);
      if (!targetsMap.has(k)) targetsMap.set(k, []);
      targetsMap.get(k).push(String(r.member_id));
    }

    // ---------- attachments ----------
    let attRows = [];
    try {
      const attCols = await getColumns(conn, "announcement_attachments");
      const attIdCol = firstExisting(attCols, ["id", "attachment_id"]) || "id";
      const pathCol = firstExisting(attCols, ["storage_path", "file_url"]) || "storage_path";

      const attSelect = [
        "announcement_id",
        attCols.has("original_name") ? "original_name" : "'' AS original_name",
        attCols.has("stored_name") ? "stored_name" : "'' AS stored_name",
        attCols.has("mime_type") ? "mime_type" : "'' AS mime_type",
        attCols.has("size_bytes") ? "size_bytes" : "0 AS size_bytes",
        `\`${pathCol}\` AS url`,
        attCols.has("created_at") ? "created_at" : "NULL AS created_at",
      ];

      const [rows] = await conn.query(
        `SELECT ${attSelect.join(", ")}
         FROM announcement_attachments
         WHERE announcement_id IN (?)
         ORDER BY announcement_id ASC, \`${attIdCol}\` ASC`,
        [ids]
      );
      attRows = rows;
    } catch {
      attRows = [];
    }

    const attsMap = new Map();
    for (const a of attRows) {
      const k = Number(a.announcement_id);
      if (!attsMap.has(k)) attsMap.set(k, []);
      attsMap.get(k).push({
        name: a.original_name,
        stored_name: a.stored_name,
        mime: a.mime_type,
        size: Number(a.size_bytes || 0),
        url: a.url,
        created_at: a.created_at,
      });
    }

    // ---------- merge ----------
    const out = annRows.map((a) => {
      const id = Number(a.id);
      const member_ids = targetsMap.get(id) || [];
      const computedTargetAll = toBool(a.target_all, false) || member_ids.length === 0;

      return {
        id: id,
        announcement_id: id,
        title: a.title,
        body: a.body,
        status: a.status,
        collect_email: toBool(a.collect_email, false),
        target_all: computedTargetAll,
        created_at: a.created_at,
        updated_at: a.updated_at,
        tags: tagsMap.get(id) || [],
        member_ids,
        attachments: attsMap.get(id) || [],
      };
    });

    res.json(out);
  } catch (err) {
    console.error("GET /announcements (FULL) error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ (OPTIONAL) old summary endpoint (kept for compatibility / lighter list)
router.get("/summary", async (_req, res) => {
  const conn = await db.getConnection();
  try {
    const annCols = await getColumns(conn, "announcements");
    const annIdCol = firstExisting(annCols, ["id", "announcement_id"]) || "id";
    const annTargetCol = firstExisting(annCols, ["target_all", "send_to_all"]) || "target_all";

    const select = [
      `\`${annIdCol}\` AS id`,
      `\`${annIdCol}\` AS announcement_id`,
      "title",
      annCols.has("status") ? "status" : "'published' AS status",
      annCols.has("collect_email") ? "collect_email" : "0 AS collect_email",
      annCols.has(annTargetCol) ? `\`${annTargetCol}\` AS target_all` : "0 AS target_all",
      annCols.has("created_at") ? "created_at" : "NULL AS created_at",
      annCols.has("updated_at") ? "updated_at" : "NULL AS updated_at",
    ];

    const [rows] = await conn.query(`
      SELECT ${select.join(", ")}
      FROM announcements
      ORDER BY ${annCols.has("created_at") ? "created_at" : `\`${annIdCol}\``} DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /announcements/summary error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ (OPTIONAL) raw dump: returns each table separately
router.get("/dump/all", async (_req, res) => {
  const conn = await db.getConnection();
  try {
    const [announcements] = await conn.query(`SELECT * FROM announcements ORDER BY id DESC`);
    const [announcement_tags] = await conn.query(`SELECT * FROM announcement_tags ORDER BY announcement_id DESC, tag ASC`);
    const [announcement_targets] = await conn.query(
      `SELECT * FROM announcement_targets ORDER BY announcement_id DESC, member_id ASC`
    );
    const [announcement_attachments] = await conn.query(
      `SELECT * FROM announcement_attachments ORDER BY announcement_id DESC, id ASC`
    );

    res.json({
      announcements,
      announcement_tags,
      announcement_targets,
      announcement_attachments,
    });
  } catch (err) {
    console.error("GET /announcements/dump/all error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ GET announcement detail + tags + targets + attachments
router.get("/:id", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const annCols = await getColumns(conn, "announcements");
    const annIdCol = firstExisting(annCols, ["id", "announcement_id"]) || "id";
    const annTargetCol = firstExisting(annCols, ["target_all", "send_to_all"]) || "target_all";
    const annBodyCol = firstExisting(annCols, ["body", "detail", "paragraph"]) || "body";

    const select = [
      `\`${annIdCol}\` AS id`,
      `\`${annIdCol}\` AS announcement_id`,
      "title",
      `\`${annBodyCol}\` AS body`,
      annCols.has("status") ? "status" : "'published' AS status",
      annCols.has("collect_email") ? "collect_email" : "0 AS collect_email",
      annCols.has(annTargetCol) ? `\`${annTargetCol}\` AS target_all` : "0 AS target_all",
      annCols.has("created_at") ? "created_at" : "NULL AS created_at",
      annCols.has("updated_at") ? "updated_at" : "NULL AS updated_at",
    ];

    const [aRows] = await conn.query(
      `SELECT ${select.join(", ")} FROM announcements WHERE \`${annIdCol}\` = ?`,
      [id]
    );
    if (!aRows.length) return res.status(404).json({ message: "Not found" });
    const announcement = aRows[0];

    const [tagRows] = await conn.query(
      `SELECT tag FROM announcement_tags WHERE announcement_id = ? ORDER BY tag ASC`,
      [id]
    );

    const [tRows] = await conn.query(
      `SELECT member_id FROM announcement_targets WHERE announcement_id = ? ORDER BY member_id ASC`,
      [id]
    );

    let attachments = [];
    try {
      const attCols = await getColumns(conn, "announcement_attachments");
      const attIdCol = firstExisting(attCols, ["id", "attachment_id"]) || "id";
      const pathCol = firstExisting(attCols, ["storage_path", "file_url"]) || "storage_path";

      const sel = [
        attCols.has("original_name") ? "original_name" : "'' AS original_name",
        attCols.has("stored_name") ? "stored_name" : "'' AS stored_name",
        attCols.has("mime_type") ? "mime_type" : "'' AS mime_type",
        attCols.has("size_bytes") ? "size_bytes" : "0 AS size_bytes",
        `\`${pathCol}\` AS url`,
        attCols.has("created_at") ? "created_at" : "NULL AS created_at",
      ];

      const [attRows] = await conn.query(
        `SELECT ${sel.join(", ")}
         FROM announcement_attachments
         WHERE announcement_id = ?
         ORDER BY \`${attIdCol}\` ASC`,
        [id]
      );

      attachments = attRows.map((a) => ({
        name: a.original_name,
        stored_name: a.stored_name,
        mime: a.mime_type,
        size: a.size_bytes,
        url: a.url,
        created_at: a.created_at,
      }));
    } catch {
      attachments = [];
    }

    res.json({
      ...announcement,
      tags: tagRows.map((r) => r.tag),
      member_ids: tRows.map((r) => r.member_id),
      target_all: toBool(announcement.target_all, false) || tRows.length === 0,
      attachments,
    });
  } catch (err) {
    console.error("GET /announcements/:id error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ GET targets as full member objects (joins memberbank/membersbank/members automatically)
router.get("/:id/targets", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const src = await pickMemberSource(conn);

    // If no source table found, return just ids from targets table
    if (!src) {
      const [rows] = await conn.query(
        `SELECT member_id AS id, member_id AS Bankcode FROM announcement_targets WHERE announcement_id = ? ORDER BY member_id ASC`,
        [id]
      );
      return res.json(rows);
    }

    const select = [
      `m.\`${src.idCol}\` AS member_id`,
      `m.\`${src.nameCol}\` AS name`,
      src.logoCol ? `m.\`${src.logoCol}\` AS bank_logo` : "'' AS bank_logo",
      // aliases for frontend compatibility
      `m.\`${src.idCol}\` AS Bankcode`,
      `m.\`${src.nameCol}\` AS BanknameLA`,
      src.logoCol ? `m.\`${src.logoCol}\` AS image` : "'' AS image",
    ];

    const [rows] = await conn.query(
      `
      SELECT ${select.join(", ")}
      FROM announcement_targets t
      JOIN \`${src.table}\` m ON m.\`${src.idCol}\` = t.member_id
      WHERE t.announcement_id = ?
      ORDER BY m.\`${src.nameCol}\` ASC
      `,
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /announcements/:id/targets error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ UPDATE announcement + replace tags + replace targets (JSON only)
router.put("/:id", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const {
      title,
      body,
      paragraph,
      detail,
      tags,
      collect_email,
      status,
      target_all = false,
      memberIds,
      member_ids,
    } = req.body || {};

    if (status && !["draft", "published", "archived"].includes(String(status))) {
      return res.status(400).json({ message: "status must be draft/published/archived" });
    }

    const bodyTargetAll = toBool(target_all, false);
    const bodyMemberIds = parseMemberIds(memberIds ?? member_ids);

    if (!bodyTargetAll && bodyMemberIds.length === 0) {
      return res.status(400).json({ message: "memberIds/member_ids is required when target_all=false" });
    }

    const nextTitle = title === undefined ? undefined : String(title).trim();
    const nextBody =
      body !== undefined
        ? String(body).trim()
        : paragraph !== undefined
        ? String(paragraph).trim()
        : detail !== undefined
        ? String(detail).trim()
        : undefined;

    const nextTagsArr = tags === undefined ? undefined : parseTags(tags);
    const nextCollect = collect_email === undefined ? undefined : (toBool(collect_email) ? 1 : 0);

    await conn.beginTransaction();

    const annCols = await getColumns(conn, "announcements");
    const annIdCol = firstExisting(annCols, ["id", "announcement_id"]) || "id";
    const annTargetCol = firstExisting(annCols, ["target_all", "send_to_all"]) || "target_all";
    const annBodyCol = firstExisting(annCols, ["body", "detail", "paragraph"]) || "body";

    const [exist] = await conn.query(
      `SELECT \`${annIdCol}\` AS id FROM announcements WHERE \`${annIdCol}\` = ?`,
      [id]
    );
    if (!exist.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Not found" });
    }

    const sets = [];
    const vals = [];

    if (nextTitle !== undefined && annCols.has("title")) {
      sets.push("`title` = ?");
      vals.push(nextTitle);
    }

    if (nextBody !== undefined && annCols.has(annBodyCol)) {
      sets.push(`\`${annBodyCol}\` = ?`);
      vals.push(nextBody);
    }

    if (status !== undefined && annCols.has("status")) {
      sets.push("`status` = ?");
      vals.push(String(status));
    }

    if (nextCollect !== undefined && annCols.has("collect_email")) {
      sets.push("`collect_email` = ?");
      vals.push(nextCollect);
    }

    if (annCols.has(annTargetCol)) {
      sets.push(`\`${annTargetCol}\` = ?`);
      vals.push(bodyTargetAll ? 1 : 0);
    }

    if (sets.length) {
      vals.push(id);
      await conn.query(`UPDATE announcements SET ${sets.join(", ")} WHERE \`${annIdCol}\` = ?`, vals);
    }

    // replace tags if provided
    if (nextTagsArr !== undefined) {
      await conn.query(`DELETE FROM announcement_tags WHERE announcement_id = ?`, [id]);
      if (nextTagsArr.length) {
        const uniqTags = uniq(nextTagsArr).slice(0, 12);
        const values = uniqTags.map((t) => [id, t]);
        await conn.query(`INSERT IGNORE INTO announcement_tags (announcement_id, tag) VALUES ?`, [values]);
      }
    }

    // replace targets
    await conn.query(`DELETE FROM announcement_targets WHERE announcement_id = ?`, [id]);

    if (!bodyTargetAll) {
      const uniqIds = uniq(bodyMemberIds);

      // ✅ validate against memberbank/membersbank/members (auto)
      const check = await validateMemberIds(conn, uniqIds);
      if (!check.ok) {
        await conn.rollback();
        return res.status(400).json({
          message: "Some member ids not found",
          missing: check.missing,
          used: check.used,
          hint: "memberIds must match Bankcode from GET /api/members",
        });
      }

      const values = uniqIds.map((mid) => [id, String(mid)]);
      await conn.query(`INSERT IGNORE INTO announcement_targets (announcement_id, member_id) VALUES ?`, [values]);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("PUT /announcements/:id error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    conn.release();
  }
});

// ✅ DELETE announcement (+ remove files on disk best-effort)
router.delete("/:id", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const annCols = await getColumns(conn, "announcements");
    const annIdCol = firstExisting(annCols, ["id", "announcement_id"]) || "id";

    // fetch attachments to delete files (best-effort)
    let storedNames = [];
    try {
      const attCols = await getColumns(conn, "announcement_attachments");
      if (attCols.has("stored_name")) {
        const [rows] = await conn.query(`SELECT stored_name FROM announcement_attachments WHERE announcement_id = ?`, [
          id,
        ]);
        storedNames = rows.map((r) => r.stored_name).filter(Boolean);
      }
    } catch {}

    const [r] = await conn.query(`DELETE FROM announcements WHERE \`${annIdCol}\` = ?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Not found" });

    for (const sn of storedNames) {
      const abs = storagePathToAbs(null, sn);
      if (abs) await unlinkSafe(abs);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /announcements/:id error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;
