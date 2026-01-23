// routes/documents.js
const express = require("express");
const router = express.Router();
const db = require("../../db/pool");

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const { UPLOAD_DIR } = require("../../config/paths");

// =====================
// Upload setup
// =====================
const DOC_SUBDIR = "documents";
const DOC_UPLOAD_DIR = path.join(UPLOAD_DIR, DOC_SUBDIR);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(DOC_UPLOAD_DIR);

function safeExt(originalname) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (!ext || ext.length > 10) return "";
  return ext.replace(/[^a-z0-9.]/g, "");
}

function makeStoredName(originalname) {
  const ext = safeExt(originalname);
  const rand = crypto.randomBytes(8).toString("hex");
  return `${Date.now()}_${rand}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(DOC_UPLOAD_DIR);
    cb(null, DOC_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, makeStoredName(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (ปรับได้)
});

// =====================
// Helpers
// =====================
const SORT_MAP = {
  updatedAt: "d.updated_at",
  name: "d.name",
  type: "d.type",
  size: "d.size_bytes",
};

function normalizeType(t) {
  const v = String(t || "").toLowerCase();
  if (["docs", "excel", "ppt", "pdf", "txt", "other"].includes(v)) return v;
  return "other";
}

function parseTags(input) {
  // รองรับ tags[], tags (comma string)
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap((x) => String(x).split(","))
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  return String(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function tagsCsvToArr(csv) {
  if (!csv) return [];
  return String(csv)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildPublicUrl(req, storedName) {
  // ให้ serve uploads ผ่าน express.static (ดู server.js ด้านล่าง)
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${DOC_SUBDIR}/${storedName}`;
}

async function getDocById(id) {
  const [rows] = await db.query(
    `
    SELECT
      d.id, d.name, d.type, d.mime_type, d.size_bytes,
      d.owner, d.folder_path, d.storage_key, d.view_url, d.download_url,
      d.description, d.is_deleted, d.deleted_at, d.created_at, d.updated_at,
      GROUP_CONCAT(DISTINCT t.tag ORDER BY t.tag SEPARATOR ',') AS tags_csv
    FROM documents d
    LEFT JOIN document_tags t ON t.doc_id = d.id
    WHERE d.id = ?
    GROUP BY d.id
    LIMIT 1
    `,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    mimeType: r.mime_type,
    size: Number(r.size_bytes || 0),
    owner: r.owner,
    path: r.folder_path,
    storageKey: r.storage_key,
    viewUrl: r.view_url,
    downloadUrl: r.download_url,
    description: r.description,
    isDeleted: !!r.is_deleted,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags: tagsCsvToArr(r.tags_csv),
  };
}

// =====================
// GET /api/documents
// list + search + filter + sort + paginate
// =====================
router.get("/", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const type = String(req.query.type || "").trim().toLowerCase();
    const includeDeleted = String(req.query.includeDeleted || "0") === "1";

    const sortKey = SORT_MAP[String(req.query.sortKey || "updatedAt")] || SORT_MAP.updatedAt;
    const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (!includeDeleted) {
      where.push("d.is_deleted = 0");
    }

    if (type && type !== "all") {
      where.push("d.type = ?");
      params.push(normalizeType(type));
    }

    if (query) {
      // search: name/desc/owner/path/tags
      where.push(`
        (
          d.name LIKE ?
          OR d.description LIKE ?
          OR d.owner LIKE ?
          OR d.folder_path LIKE ?
          OR EXISTS (
            SELECT 1 FROM document_tags tt
            WHERE tt.doc_id = d.id AND tt.tag LIKE ?
          )
        )
      `);
      const like = `%${query}%`;
      params.push(like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // total count
    const [countRows] = await db.query(
      `
      SELECT COUNT(DISTINCT d.id) AS total
      FROM documents d
      ${whereSql}
      `,
      params
    );
    const total = Number(countRows?.[0]?.total || 0);

    // items
    const [rows] = await db.query(
      `
      SELECT
        d.id, d.name, d.type, d.mime_type, d.size_bytes,
        d.owner, d.folder_path, d.storage_key, d.view_url, d.download_url,
        d.description, d.created_at, d.updated_at,
        GROUP_CONCAT(DISTINCT t.tag ORDER BY t.tag SEPARATOR ',') AS tags_csv
      FROM documents d
      LEFT JOIN document_tags t ON t.doc_id = d.id
      ${whereSql}
      GROUP BY d.id
      ORDER BY ${sortKey} ${sortDir}
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      mimeType: r.mime_type,
      size: Number(r.size_bytes || 0),
      owner: r.owner,
      path: r.folder_path,
      storageKey: r.storage_key,
      viewUrl: r.view_url,
      downloadUrl: r.download_url,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      tags: tagsCsvToArr(r.tags_csv),
    }));

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error("GET /documents error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// GET /api/documents/:id
// =====================
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const doc = await getDocById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    res.json(doc);
  } catch (err) {
    console.error("GET /documents/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// GET /api/documents/:id/download
// =====================
router.get("/:id/download", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const doc = await getDocById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.isDeleted) return res.status(410).json({ message: "Document deleted" });

    const stored = doc.storageKey;
    if (!stored) return res.status(400).json({ message: "No file" });

    const abs = path.join(DOC_UPLOAD_DIR, stored);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: "File missing" });

    // download name = doc.name
    res.download(abs, doc.name || stored);
  } catch (err) {
    console.error("GET /documents/:id/download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// POST /api/documents
// create + upload file (multipart/form-data)
// field: file (single)
// body: title, type, owner, folder_path, description, tags[] or tags
// =====================
router.post("/", upload.single("file"), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "file is required" });

    const title = String(req.body.title || req.body.name || file.originalname).trim();
    const type = normalizeType(req.body.type);
    const owner = String(req.body.owner || "").trim() || null;
    const folderPath = String(req.body.folder_path || req.body.path || "").trim() || null;
    const description = String(req.body.description || "").trim() || null;
    const tags = parseTags(req.body["tags[]"] ?? req.body.tags);

    const storageKey = file.filename;
    const mimeType = file.mimetype || null;
    const sizeBytes = Number(file.size || 0);

    // create URLs (optional)
    const publicUrl = buildPublicUrl(req, storageKey);

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `
      INSERT INTO documents
        (name, type, mime_type, size_bytes, owner, folder_path, storage_key, view_url, download_url, description)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        type,
        mimeType,
        sizeBytes,
        owner,
        folderPath,
        storageKey,
        publicUrl, // view_url
        publicUrl, // download_url (หรือให้ใช้ /:id/download ก็ได้)
        description,
      ]
    );

    const docId = ins.insertId;

    if (tags.length) {
      const values = tags.map((t) => [docId, t]);
      await conn.query(`INSERT INTO document_tags (doc_id, tag) VALUES ?`, [values]);
    }

    await conn.commit();

    const created = await getDocById(docId);
    res.status(201).json(created);
  } catch (err) {
    await conn.rollback();
    console.error("POST /documents error:", err);

    // ถ้า insert fail ให้ลบไฟล์ที่อัปโหลดแล้วทิ้ง
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {}

    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// =====================
// PATCH /api/documents/:id
// update metadata + tags
// body: name, type, owner, folder_path, description, tags[] or tags
// =====================
router.patch("/:id", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const name = req.body.name != null ? String(req.body.name).trim() : undefined;
    const type = req.body.type != null ? normalizeType(req.body.type) : undefined;
    const owner = req.body.owner != null ? String(req.body.owner).trim() || null : undefined;
    const folderPath = req.body.folder_path != null ? String(req.body.folder_path).trim() || null : undefined;
    const description = req.body.description != null ? String(req.body.description).trim() || null : undefined;

    const hasTags = req.body["tags[]"] != null || req.body.tags != null;
    const tags = hasTags ? parseTags(req.body["tags[]"] ?? req.body.tags) : null;

    await conn.beginTransaction();

    // check exists
    const [existsRows] = await conn.query(`SELECT id FROM documents WHERE id = ? LIMIT 1`, [id]);
    if (!existsRows[0]) {
      await conn.rollback();
      return res.status(404).json({ message: "Not found" });
    }

    // build update
    const sets = [];
    const params = [];

    if (name !== undefined) {
      sets.push("name = ?");
      params.push(name);
    }
    if (type !== undefined) {
      sets.push("type = ?");
      params.push(type);
    }
    if (owner !== undefined) {
      sets.push("owner = ?");
      params.push(owner);
    }
    if (folderPath !== undefined) {
      sets.push("folder_path = ?");
      params.push(folderPath);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      params.push(description);
    }

    if (sets.length) {
      params.push(id);
      await conn.query(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`, params);
    }

    // tags replace
    if (hasTags) {
      await conn.query(`DELETE FROM document_tags WHERE doc_id = ?`, [id]);
      if (tags.length) {
        const values = tags.map((t) => [id, t]);
        await conn.query(`INSERT INTO document_tags (doc_id, tag) VALUES ?`, [values]);
      }
    }

    await conn.commit();

    const updated = await getDocById(id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    console.error("PATCH /documents/:id error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// =====================
// DELETE /api/documents/:id
// soft delete
// =====================
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [r] = await db.query(
      `UPDATE documents SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (!r.affectedRows) return res.status(404).json({ message: "Not found (or already deleted)" });
    res.json({ ok: true, id });
  } catch (err) {
    console.error("DELETE /documents/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// POST /api/documents/bulk-delete
// body: { ids: [1,2,3] }
// =====================
router.post("/bulk-delete", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => Number(x)).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ message: "ids required" });

    const placeholders = ids.map(() => "?").join(",");
    const [r] = await db.query(
      `UPDATE documents SET is_deleted = 1, deleted_at = NOW() WHERE id IN (${placeholders}) AND is_deleted = 0`,
      ids
    );

    res.json({ ok: true, deleted: r.affectedRows || 0 });
  } catch (err) {
    console.error("POST /documents/bulk-delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
