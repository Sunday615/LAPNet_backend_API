const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const sharp = require("sharp");

// ✅ Body parsing (เพิ่ม limit เพราะ base64 รูปใหญ่)
router.use(express.json({ limit: "25mb" }));
router.use(express.urlencoded({ extended: true, limit: "25mb" }));

/**
 * =====================
 * Storage config
 * =====================

 *   /uploads/formtemplate/<sourceFormId>/<questionId>/<imageId>.webp
 */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "formtemplate");

/**
 * =====================
 * helpers
 * =====================
 */
function safeJsonParse(x) {
  if (x == null) return null;
  if (typeof x === "object") return x;
  try {
    return JSON.parse(String(x));
  } catch {
    return null;
  }
}

function toTinyInt01(v, fallback = 0) {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "on", "yes"].includes(s)) return 1;
    if (["0", "false", "off", "no"].includes(s)) return 0;
  }
  return fallback ? 1 : 0;
}

function toDigitsString(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return /^\d+$/.test(s) ? s : "";
}

function pickSourceFormId(body) {
  return toDigitsString(body?.sourceFormId ?? body?.source_form_id);
}

function mapRow(r) {
  return {
    id: r?.id != null ? String(r.id) : "",
    sourceFormId: r?.sourceFormId != null ? String(r.sourceFormId) : "",
    name: r?.name ?? "",
    note: r?.note ?? null,
    payload: safeJsonParse(r?.payload) ?? r?.payload ?? null,
    createdAt: r?.createdAt ?? null,
    updatedAt: r?.updatedAt ?? null,
    activetoggle: Number(r?.activetoggle) ? 1 : 0,
  };
}

function sanitizePathPart(s, fallback = "x") {
  const v = String(s ?? "").trim();
  const cleaned = v.replace(/[^a-zA-Z0-9_\-:.]/g, "_");
  return cleaned || fallback;
}

async function ensureDir(dirAbs) {
  await fsp.mkdir(dirAbs, { recursive: true });
}

function parseImageDataUrl(dataUrl) {
  const s = String(dataUrl || "");
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  let buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  return { mime, buffer: buf };
}

function isDataUrlImage(src) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(src || ""));
}

function toPosixRelUploads(sourceFormId, questionId, fileName) {
  // ต้องเป็น /uploads/... เสมอ (posix)
  const p = path.posix.join(
    "uploads",
    "formtemplate",
    String(sourceFormId),
    String(questionId),
    String(fileName)
  );
  return `/${p}`;
}

async function rmSafe(absPath) {
  try {
    await fsp.rm(absPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

/**
 * ✅ convert dataURL -> webp file
 */
async function saveDataUrlAsWebp({ dataUrl, outAbs }) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid image dataURL");

  // sharp: auto rotate + webp quality
  const out = await sharp(parsed.buffer)
    .rotate()
    .webp({ quality: 82 })
    .toFile(outAbs);

  return {
    sizeBytes: Number(out?.size || 0),
    mime: "image/webp",
  };
}

/**
 * ✅ Process payload images:
 * - ถ้า images[].src เป็น base64 dataURL -> convert -> save -> replace src เป็น /uploads/...webp
 * - เก็บรายการ assets ไว้ insert ลง table form_template_assets
 */
async function processPayloadImages({ payloadObj, sourceFormId }) {
  const assets = [];
  const createdFiles = []; // เผื่อ rollback ลบไฟล์

  if (!payloadObj || typeof payloadObj !== "object") return { payloadObj, assets, createdFiles };

  const qs = Array.isArray(payloadObj?.questions) ? payloadObj.questions : [];
  for (const q of qs) {
    const qid = sanitizePathPart(q?.id || "q");
    if (!Array.isArray(q.images)) q.images = [];

    for (const img of q.images) {
      const src = String(img?.src || "");
      if (!src) continue;

      // เฉพาะ base64 dataURL เท่านั้น
      if (!isDataUrlImage(src)) continue;

      const imgId = sanitizePathPart(img?.id || `${Date.now()}`);
      const dirAbs = path.join(UPLOAD_ROOT, String(sourceFormId), qid);
      await ensureDir(dirAbs);

      // เขียนทับได้ (ถ้า id เดิม)
      const fileName = `${imgId}.webp`;
      const outAbs = path.join(dirAbs, fileName);

      const { sizeBytes, mime } = await saveDataUrlAsWebp({ dataUrl: src, outAbs });
      createdFiles.push(outAbs);

      const relPath = toPosixRelUploads(sourceFormId, qid, fileName);

      // ✅ replace ใน payload
      img.src = relPath;
      img.kind = "webp";

      assets.push({
        sourceFormId: String(sourceFormId),
        questionId: String(qid),
        imageId: String(imgId),
        fileName,
        mime,
        sizeBytes,
        relPath,
      });
    }
  }

  return { payloadObj, assets, createdFiles };
}

/**
 * =====================
 * GET / -> list templates
 * =====================
 */
router.get("/", async (req, res) => {
  try {
    const activeQ = req.query?.active;
    const activeFilter = activeQ == null ? null : toTinyInt01(activeQ, 0);

    const sql = `
      SELECT
        id,
        source_form_id AS sourceFormId,
        name,
        note,
        payload,
        created_at AS createdAt,
        updated_at AS updatedAt,
        activetoggle
      FROM form_templates
      ${activeFilter == null ? "" : "WHERE activetoggle = ?"}
      ORDER BY updated_at DESC, id DESC
    `;

    const [rows] = await pool.query(sql, activeFilter == null ? [] : [activeFilter]);
    const items = (rows || []).map(mapRow);
    return res.json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * GET /by-source/:sourceFormId
 * =====================
 */
router.get("/by-source/:sourceFormId", async (req, res) => {
  try {
    const sfi = toDigitsString(req.params.sourceFormId);
    if (!sfi) return res.status(400).json({ ok: false, message: "sourceFormId must be digits string" });

    const [rows] = await pool.query(
      `
      SELECT
        id,
        source_form_id AS sourceFormId,
        name,
        note,
        payload,
        created_at AS createdAt,
        updated_at AS updatedAt,
        activetoggle
      FROM form_templates
      WHERE source_form_id = ?
      LIMIT 1
      `,
      [sfi]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, message: "Template not found" });
    return res.json({ ok: true, item: mapRow(rows[0]) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * GET /:id
 * =====================
 */
router.get("/:id", async (req, res) => {
  try {
    const id = toDigitsString(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "id must be digits string" });

    const [rows] = await pool.query(
      `
      SELECT
        id,
        source_form_id AS sourceFormId,
        name,
        note,
        payload,
        created_at AS createdAt,
        updated_at AS updatedAt,
        activetoggle
      FROM form_templates
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, message: "Template not found" });
    return res.json({ ok: true, item: mapRow(rows[0]) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * POST /upsert
 * ✅ อัปโหลดรูป (base64) -> convert webp -> save file -> replace payload src -> insert assets table
 * =====================
 */
router.post("/upsert", async (req, res) => {
  let conn = null;
  let createdFiles = [];

  try {
    const { name, note, payload, activetoggle } = req.body || {};
    const sfi = pickSourceFormId(req.body);

    if (!sfi) {
      return res.status(400).json({ ok: false, message: "sourceFormId must be digits string" });
    }

    // payload ต้องเป็น object/array
    const payloadObj0 = safeJsonParse(payload);
    if (!payloadObj0 || typeof payloadObj0 !== "object") {
      return res.status(400).json({ ok: false, message: "payload must be a valid JSON object/array" });
    }

    // ✅ convert images
    const processed = await processPayloadImages({ payloadObj: payloadObj0, sourceFormId: sfi });
    const payloadObj = processed.payloadObj;
    createdFiles = processed.createdFiles || [];
    const assets = processed.assets || [];

    const tplName =
      String(name || "").trim() ||
      String(payloadObj?.meta?.title || "").trim() ||
      "Untitled template";

    const tplNote = note == null ? null : String(note);
    const active = toTinyInt01(activetoggle, 0);

    // ✅ ต้อง stringify เพื่อ CAST(? AS JSON)
    const payloadJson = JSON.stringify(payloadObj);

    // ✅ ใช้ transaction เพราะต้อง insert assets ด้วย
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // upsert template
    const [r] = await conn.query(
      `
      INSERT INTO form_templates (source_form_id, name, note, payload, activetoggle)
      VALUES (?, ?, ?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        name = VALUES(name),
        note = VALUES(note),
        payload = VALUES(payload),
        activetoggle = VALUES(activetoggle),
        updated_at = CURRENT_TIMESTAMP
      `,
      [sfi, tplName, tplNote, payloadJson, active]
    );

    const templateId = r?.insertId != null ? String(r.insertId) : null;

    // insert assets (ถ้ามี)
    if (assets.length && templateId) {
      for (const a of assets) {
        await conn.query(
          `
          INSERT INTO form_template_assets
            (template_id, source_form_id, question_id, image_id, file_name, mime, size_bytes, rel_path)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            template_id = VALUES(template_id),
            file_name = VALUES(file_name),
            mime = VALUES(mime),
            size_bytes = VALUES(size_bytes),
            rel_path = VALUES(rel_path),
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            templateId,
            a.sourceFormId,
            a.questionId,
            a.imageId,
            a.fileName,
            a.mime,
            a.sizeBytes,
            a.relPath,
          ]
        );
      }
    }

    await conn.commit();
    conn.release();
    conn = null;

    return res.json({
      ok: true,
      id: templateId,
      sourceFormId: sfi,
      activetoggle: active,
      assetsSaved: assets.length,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // ignore
      }
    }

    // ลบไฟล์ที่เพิ่งสร้าง (กันไฟล์ค้าง)
    for (const p of createdFiles) {
      try {
        await fsp.unlink(p);
      } catch {
        // ignore
      }
    }

    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * PUT /:id -> update by id
 * ✅ รองรับ convert รูปเหมือนกัน
 * =====================
 */
router.put("/:id", async (req, res) => {
  let conn = null;
  let createdFiles = [];

  try {
    const id = toDigitsString(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "id must be digits string" });

    // หา source_form_id ก่อน เพื่อใช้ path
    const [rows0] = await pool.query(`SELECT source_form_id AS sfi FROM form_templates WHERE id=? LIMIT 1`, [id]);
    if (!rows0 || rows0.length === 0) return res.status(404).json({ ok: false, message: "Template not found" });
    const sfi = toDigitsString(rows0[0]?.sfi);
    if (!sfi) return res.status(500).json({ ok: false, message: "Invalid source_form_id" });

    const { name, note, payload, activetoggle } = req.body || {};

    const payloadObj0 = safeJsonParse(payload);
    if (!payloadObj0 || typeof payloadObj0 !== "object") {
      return res.status(400).json({ ok: false, message: "payload must be a valid JSON object/array" });
    }

    const processed = await processPayloadImages({ payloadObj: payloadObj0, sourceFormId: sfi });
    const payloadObj = processed.payloadObj;
    createdFiles = processed.createdFiles || [];
    const assets = processed.assets || [];

    const tplName =
      String(name || "").trim() ||
      String(payloadObj?.meta?.title || "").trim() ||
      "Untitled template";

    const tplNote = note == null ? null : String(note);
    const active = toTinyInt01(activetoggle, 0);
    const payloadJson = JSON.stringify(payloadObj);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [r] = await conn.query(
      `
      UPDATE form_templates
      SET
        name = ?,
        note = ?,
        payload = CAST(? AS JSON),
        activetoggle = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [tplName, tplNote, payloadJson, active, id]
    );

    if (!r?.affectedRows) {
      await conn.rollback();
      conn.release();
      conn = null;
      return res.status(404).json({ ok: false, message: "Template not found" });
    }

    // insert assets
    if (assets.length) {
      for (const a of assets) {
        await conn.query(
          `
          INSERT INTO form_template_assets
            (template_id, source_form_id, question_id, image_id, file_name, mime, size_bytes, rel_path)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            template_id = VALUES(template_id),
            file_name = VALUES(file_name),
            mime = VALUES(mime),
            size_bytes = VALUES(size_bytes),
            rel_path = VALUES(rel_path),
            updated_at = CURRENT_TIMESTAMP
          `,
          [id, sfi, a.questionId, a.imageId, a.fileName, a.mime, a.sizeBytes, a.relPath]
        );
      }
    }

    await conn.commit();
    conn.release();
    conn = null;

    return res.json({ ok: true, id: String(id), activetoggle: active, assetsSaved: assets.length });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // ignore
      }
    }

    for (const p of createdFiles) {
      try {
        await fsp.unlink(p);
      } catch {
        // ignore
      }
    }

    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * PATCH toggle
 * =====================
 */
async function handleToggle(req, res) {
  try {
    const id = toDigitsString(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "id must be digits string" });

    const next = toTinyInt01(req.body?.activetoggle, 0);

    const [r] = await pool.query(
      `UPDATE form_templates SET activetoggle = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [next, id]
    );

    if (!r?.affectedRows) return res.status(404).json({ ok: false, message: "Template not found" });
    return res.json({ ok: true, id, activetoggle: next });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
}
router.patch("/:id/activetoggle", handleToggle);
router.patch("/:id/toggle", handleToggle);

/**
 * =====================
 * DELETE /:id
 * ✅ ลบ template + assets + โฟลเดอร์ uploads/formtemplate/<sourceFormId>
 * =====================
 */
router.delete("/:id", async (req, res) => {
  let conn = null;

  try {
    const id = toDigitsString(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "id must be digits string" });

    // หา source_form_id ก่อน
    const [rows0] = await pool.query(`SELECT source_form_id AS sfi FROM form_templates WHERE id=? LIMIT 1`, [id]);
    if (!rows0 || rows0.length === 0) return res.status(404).json({ ok: false, message: "Template not found" });
    const sfi = toDigitsString(rows0[0]?.sfi);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // ลบ row (assets จะ cascade delete ถ้า FK เปิด)
    const [r] = await conn.query(`DELETE FROM form_templates WHERE id = ?`, [id]);
    if (!r?.affectedRows) {
      await conn.rollback();
      conn.release();
      conn = null;
      return res.status(404).json({ ok: false, message: "Template not found" });
    }

    // กันกรณี FK ไม่ได้ใช้: ลบ assets ด้วย
    await conn.query(`DELETE FROM form_template_assets WHERE template_id = ?`, [id]);

    await conn.commit();
    conn.release();
    conn = null;

    // ลบ folder ไฟล์
    if (sfi) {
      const folderAbs = path.join(UPLOAD_ROOT, String(sfi));
      await rmSafe(folderAbs);
    }

    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // ignore
      }
    }
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

/**
 * =====================
 * DELETE / -> clear all
 * ✅ ลบ DB ทั้งหมด + ลบ uploads/formtemplate ทั้งโฟลเดอร์
 * =====================
 */
router.delete("/", async (_req, res) => {
  let conn = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(`DELETE FROM form_template_assets`);
    await conn.query(`DELETE FROM form_templates`);

    await conn.commit();
    conn.release();
    conn = null;

    await rmSafe(UPLOAD_ROOT);

    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // ignore
      }
    }
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
});

module.exports = router;
