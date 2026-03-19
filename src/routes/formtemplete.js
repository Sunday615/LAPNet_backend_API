const express = require("express");
const path = require("path");
const fsp = require("fs/promises");
const sharp = require("sharp");

const pool = require("../db/pool");

const router = express.Router();

const JSON_LIMIT = process.env.FORM_TEMPLATE_JSON_LIMIT || "25mb";
const URLENCODED_LIMIT = process.env.FORM_TEMPLATE_URLENCODED_LIMIT || "25mb";
const MAX_IMAGE_BYTES = Number(process.env.FORM_TEMPLATE_MAX_IMAGE_BYTES || 8 * 1024 * 1024);
const MAX_TOTAL_IMAGE_BYTES = Number(process.env.FORM_TEMPLATE_MAX_TOTAL_IMAGE_BYTES || 20 * 1024 * 1024);
const MAX_IMAGES_PER_REQUEST = Number(process.env.FORM_TEMPLATE_MAX_IMAGES_PER_REQUEST || 50);
const MAX_IMAGE_PIXELS = Number(process.env.FORM_TEMPLATE_MAX_IMAGE_PIXELS || 25_000_000);
const WEBP_QUALITY = Number(process.env.FORM_TEMPLATE_WEBP_QUALITY || 82);
const ALLOW_CLEAR_ALL = String(process.env.ALLOW_FORM_TEMPLATE_CLEAR_ALL || "").toLowerCase() === "true";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "formtemplate");

router.use(express.json({ limit: JSON_LIMIT }));
router.use(express.urlencoded({ extended: true, limit: URLENCODED_LIMIT }));

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function toTinyInt01(value, fallback = 0) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "on", "yes"].includes(normalized)) return 1;
    if (["0", "false", "off", "no"].includes(normalized)) return 0;
  }

  return fallback ? 1 : 0;
}

function toDigitsString(value) {
  if (value == null) return "";
  const str = String(value).trim();
  return /^\d+$/.test(str) ? str : "";
}

function pickSourceFormId(body) {
  return toDigitsString(body?.sourceFormId ?? body?.source_form_id);
}

function sanitizePathPart(value, fallback = "x") {
  const str = String(value ?? "").trim();
  const cleaned = str.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || fallback;
}

function mapRow(row) {
  return {
    id: row?.id != null ? String(row.id) : "",
    sourceFormId: row?.sourceFormId != null ? String(row.sourceFormId) : "",
    name: row?.name ?? "",
    note: row?.note ?? null,
    payload: safeJsonParse(row?.payload) ?? row?.payload ?? null,
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    activetoggle: Number(row?.activetoggle) ? 1 : 0,
  };
}

async function ensureDir(dirAbs) {
  await fsp.mkdir(dirAbs, { recursive: true });
}

async function rmSafe(absPath) {
  try {
    await fsp.rm(absPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failure
  }
}

function parseImageDataUrl(dataUrl) {
  const raw = String(dataUrl || "");
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);

  if (!match) {
    throw createHttpError(400, "Invalid image data URL");
  }

  const mime = match[1].toLowerCase();
  const base64 = match[2];

  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw createHttpError(400, `Unsupported image mime type: ${mime}`);
  }

  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw createHttpError(400, "Invalid base64 image payload");
  }

  if (!buffer.length) {
    throw createHttpError(400, "Image payload is empty");
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw createHttpError(413, `Image exceeds ${MAX_IMAGE_BYTES} bytes limit`);
  }

  return { mime, buffer };
}

function isDataUrlImage(src) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(String(src || ""));
}

function toPosixRelUploads(sourceFormId, questionId, fileName) {
  const relPath = path.posix.join("uploads", "formtemplate", String(sourceFormId), String(questionId), String(fileName));
  return `/${relPath}`;
}

async function saveDataUrlAsWebp({ dataUrl, outAbs }) {
  const parsed = parseImageDataUrl(dataUrl);
  const image = sharp(parsed.buffer, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
  });

  const metadata = await image.metadata().catch(() => null);
  if (!metadata || !metadata.width || !metadata.height) {
    throw createHttpError(400, "Invalid image file");
  }

  await image.rotate().webp({ quality: WEBP_QUALITY }).toFile(outAbs);

  const stat = await fsp.stat(outAbs);

  return {
    sizeBytes: Number(stat?.size || 0),
    mime: "image/webp",
  };
}

function getQuestions(payloadObj) {
  return Array.isArray(payloadObj?.questions) ? payloadObj.questions : [];
}

function collectReferencedAssetPaths(payloadObj, sourceFormId) {
  const prefix = `/uploads/formtemplate/${sourceFormId}/`;
  const refs = new Set();

  for (const question of getQuestions(payloadObj)) {
    const images = Array.isArray(question?.images) ? question.images : [];
    for (const image of images) {
      const src = String(image?.src || "").trim();
      if (src.startsWith(prefix)) {
        refs.add(src);
      }
    }
  }

  return refs;
}

async function processPayloadImages({ payloadObj, sourceFormId }) {
  const assets = [];
  const createdFiles = [];
  const questions = getQuestions(payloadObj);

  let totalImages = 0;
  let totalBytes = 0;

  for (const question of questions) {
    const questionId = sanitizePathPart(question?.id || "q");
    if (!Array.isArray(question.images)) {
      question.images = [];
    }

    for (const image of question.images) {
      const src = String(image?.src || "").trim();
      if (!src || !isDataUrlImage(src)) {
        continue;
      }

      totalImages += 1;
      if (totalImages > MAX_IMAGES_PER_REQUEST) {
        throw createHttpError(413, `Too many inline images. Limit is ${MAX_IMAGES_PER_REQUEST}`);
      }

      const imageId = sanitizePathPart(image?.id || `${Date.now()}_${totalImages}`);
      const dirAbs = path.join(UPLOAD_ROOT, String(sourceFormId), questionId);
      await ensureDir(dirAbs);

      const fileName = `${imageId}.webp`;
      const outAbs = path.join(dirAbs, fileName);

      const { sizeBytes, mime } = await saveDataUrlAsWebp({
        dataUrl: src,
        outAbs,
      });

      totalBytes += sizeBytes;
      if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
        throw createHttpError(413, `Total inline image payload exceeds ${MAX_TOTAL_IMAGE_BYTES} bytes`);
      }

      createdFiles.push(outAbs);

      const relPath = toPosixRelUploads(sourceFormId, questionId, fileName);
      image.src = relPath;
      image.kind = "webp";

      assets.push({
        sourceFormId: String(sourceFormId),
        questionId: String(questionId),
        imageId: String(imageId),
        fileName,
        mime,
        sizeBytes,
        relPath,
      });
    }
  }

  return { payloadObj, assets, createdFiles };
}

async function rollbackCreatedFiles(paths) {
  for (const filePath of Array.isArray(paths) ? paths : []) {
    try {
      await fsp.unlink(filePath);
    } catch {
      // Ignore cleanup failure
    }
  }
}

async function syncTemplateAssets(conn, { templateId, sourceFormId, payloadObj, assets }) {
  const referencedRelPaths = collectReferencedAssetPaths(payloadObj, sourceFormId);
  const staleRelPaths = [];

  for (const asset of assets) {
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
        asset.sourceFormId,
        asset.questionId,
        asset.imageId,
        asset.fileName,
        asset.mime,
        asset.sizeBytes,
        asset.relPath,
      ]
    );
  }

  const [existingRows] = await conn.query(
    `
    SELECT rel_path AS relPath
    FROM form_template_assets
    WHERE template_id = ?
    `,
    [templateId]
  );

  for (const row of existingRows || []) {
    const relPath = String(row?.relPath || "").trim();
    if (!relPath) continue;

    if (!referencedRelPaths.has(relPath)) {
      staleRelPaths.push(relPath);
    }
  }

  if (staleRelPaths.length) {
    await conn.query(
      `
      DELETE FROM form_template_assets
      WHERE template_id = ?
        AND rel_path IN (?)
      `,
      [templateId, staleRelPaths]
    );
  }

  return staleRelPaths;
}

async function fetchTemplateById(id) {
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

  return rows && rows[0] ? rows[0] : null;
}

function parsePayloadOrThrow(payload) {
  const parsed = safeJsonParse(payload);
  if (!parsed || typeof parsed !== "object") {
    throw createHttpError(400, "payload must be a valid JSON object or array");
  }
  return parsed;
}

router.get("/", async (req, res, next) => {
  try {
    const activeQuery = req.query?.active;
    const activeFilter = activeQuery == null ? null : toTinyInt01(activeQuery, 0);

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
    return res.json({ ok: true, items: (rows || []).map(mapRow) });
  } catch (err) {
    console.error("GET FORM TEMPLATES ERROR:", {
      code: err?.code,
      message: err?.message,
    });
    return next(err);
  }
});

router.get("/by-source/:sourceFormId", async (req, res, next) => {
  try {
    const sourceFormId = toDigitsString(req.params.sourceFormId);
    if (!sourceFormId) {
      throw createHttpError(400, "sourceFormId must be digits string");
    }

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
      [sourceFormId]
    );

    if (!rows || rows.length === 0) {
      throw createHttpError(404, "Template not found");
    }

    return res.json({ ok: true, item: mapRow(rows[0]) });
  } catch (err) {
    console.error("GET FORM TEMPLATE BY SOURCE ERROR:", {
      code: err?.code,
      message: err?.message,
      sourceFormId: req.params.sourceFormId,
    });
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = toDigitsString(req.params.id);
    if (!id) {
      throw createHttpError(400, "id must be digits string");
    }

    const row = await fetchTemplateById(id);
    if (!row) {
      throw createHttpError(404, "Template not found");
    }

    return res.json({ ok: true, item: mapRow(row) });
  } catch (err) {
    console.error("GET FORM TEMPLATE BY ID ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

router.post("/upsert", async (req, res, next) => {
  let conn = null;
  let createdFiles = [];
  let staleRelPaths = [];

  try {
    const { name, note, payload, activetoggle } = req.body || {};
    const sourceFormId = pickSourceFormId(req.body);

    if (!sourceFormId) {
      throw createHttpError(400, "sourceFormId must be digits string");
    }

    const payloadObj0 = parsePayloadOrThrow(payload);
    const processed = await processPayloadImages({
      payloadObj: payloadObj0,
      sourceFormId,
    });

    const payloadObj = processed.payloadObj;
    createdFiles = processed.createdFiles || [];
    const assets = processed.assets || [];

    const templateName =
      String(name || "").trim() ||
      String(payloadObj?.meta?.title || "").trim() ||
      "Untitled template";

    const templateNote = note == null ? null : String(note);
    const active = toTinyInt01(activetoggle, 0);
    const payloadJson = JSON.stringify(payloadObj);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
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
      [sourceFormId, templateName, templateNote, payloadJson, active]
    );

    const templateId = result?.insertId != null ? String(result.insertId) : null;
    if (!templateId) {
      throw createHttpError(500, "Failed to resolve template id");
    }

    staleRelPaths = await syncTemplateAssets(conn, {
      templateId,
      sourceFormId,
      payloadObj,
      assets,
    });

    await conn.commit();
    conn.release();
    conn = null;

    for (const relPath of staleRelPaths) {
      await rmSafe(path.join(process.cwd(), relPath.replace(/^\/+/, "")));
    }

    return res.json({
      ok: true,
      id: templateId,
      sourceFormId,
      activetoggle: active,
      assetsSaved: assets.length,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // Ignore rollback failure
      }
    }

    await rollbackCreatedFiles(createdFiles);

    console.error("UPSERT FORM TEMPLATE ERROR:", {
      code: err?.code,
      message: err?.message,
    });

    return next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  let conn = null;
  let createdFiles = [];
  let staleRelPaths = [];

  try {
    const id = toDigitsString(req.params.id);
    if (!id) {
      throw createHttpError(400, "id must be digits string");
    }

    const currentRow = await fetchTemplateById(id);
    if (!currentRow) {
      throw createHttpError(404, "Template not found");
    }

    const sourceFormId = toDigitsString(currentRow?.sourceFormId);
    if (!sourceFormId) {
      throw createHttpError(500, "Invalid source_form_id");
    }

    const { name, note, payload, activetoggle } = req.body || {};
    const payloadObj0 = parsePayloadOrThrow(payload);
    const processed = await processPayloadImages({
      payloadObj: payloadObj0,
      sourceFormId,
    });

    const payloadObj = processed.payloadObj;
    createdFiles = processed.createdFiles || [];
    const assets = processed.assets || [];

    const templateName =
      String(name || "").trim() ||
      String(payloadObj?.meta?.title || "").trim() ||
      "Untitled template";

    const templateNote = note == null ? null : String(note);
    const active = toTinyInt01(activetoggle, 0);
    const payloadJson = JSON.stringify(payloadObj);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
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
      [templateName, templateNote, payloadJson, active, id]
    );

    if (!result?.affectedRows) {
      throw createHttpError(404, "Template not found");
    }

    staleRelPaths = await syncTemplateAssets(conn, {
      templateId: id,
      sourceFormId,
      payloadObj,
      assets,
    });

    await conn.commit();
    conn.release();
    conn = null;

    for (const relPath of staleRelPaths) {
      await rmSafe(path.join(process.cwd(), relPath.replace(/^\/+/, "")));
    }

    return res.json({
      ok: true,
      id: String(id),
      activetoggle: active,
      assetsSaved: assets.length,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // Ignore rollback failure
      }
    }

    await rollbackCreatedFiles(createdFiles);

    console.error("UPDATE FORM TEMPLATE ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });

    return next(err);
  }
});

async function handleToggle(req, res, next) {
  try {
    const id = toDigitsString(req.params.id);
    if (!id) {
      throw createHttpError(400, "id must be digits string");
    }

    const nextValue = toTinyInt01(req.body?.activetoggle, 0);

    const [result] = await pool.query(
      `
      UPDATE form_templates
      SET activetoggle = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [nextValue, id]
    );

    if (!result?.affectedRows) {
      throw createHttpError(404, "Template not found");
    }

    return res.json({ ok: true, id, activetoggle: nextValue });
  } catch (err) {
    console.error("TOGGLE FORM TEMPLATE ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
}

router.patch("/:id/activetoggle", handleToggle);
router.patch("/:id/toggle", handleToggle);

router.delete("/:id", async (req, res, next) => {
  let conn = null;

  try {
    const id = toDigitsString(req.params.id);
    if (!id) {
      throw createHttpError(400, "id must be digits string");
    }

    const row = await fetchTemplateById(id);
    if (!row) {
      throw createHttpError(404, "Template not found");
    }

    const sourceFormId = toDigitsString(row?.sourceFormId);

    const [assetRows] = await pool.query(
      `
      SELECT rel_path AS relPath
      FROM form_template_assets
      WHERE template_id = ?
      `,
      [id]
    );

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(`DELETE FROM form_templates WHERE id = ?`, [id]);
    if (!result?.affectedRows) {
      throw createHttpError(404, "Template not found");
    }

    await conn.query(`DELETE FROM form_template_assets WHERE template_id = ?`, [id]);

    await conn.commit();
    conn.release();
    conn = null;

    for (const rowItem of assetRows || []) {
      const relPath = String(rowItem?.relPath || "").trim();
      if (!relPath) continue;
      await rmSafe(path.join(process.cwd(), relPath.replace(/^\/+/, "")));
    }

    if (sourceFormId) {
      const folderAbs = path.join(UPLOAD_ROOT, String(sourceFormId));
      await rmSafe(folderAbs);
    }

    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // Ignore rollback failure
      }
    }

    console.error("DELETE FORM TEMPLATE ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });

    return next(err);
  }
});

router.delete("/", async (_req, res, next) => {
  let conn = null;

  try {
    if (!ALLOW_CLEAR_ALL) {
      throw createHttpError(403, "Bulk delete is disabled");
    }

    const [assetRows] = await pool.query(`SELECT rel_path AS relPath FROM form_template_assets`);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(`DELETE FROM form_template_assets`);
    await conn.query(`DELETE FROM form_templates`);

    await conn.commit();
    conn.release();
    conn = null;

    for (const row of assetRows || []) {
      const relPath = String(row?.relPath || "").trim();
      if (!relPath) continue;
      await rmSafe(path.join(process.cwd(), relPath.replace(/^\/+/, "")));
    }

    await rmSafe(UPLOAD_ROOT);

    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch {
        // Ignore rollback failure
      }
    }

    console.error("CLEAR FORM TEMPLATE ERROR:", {
      code: err?.code,
      message: err?.message,
    });

    return next(err);
  }
});

module.exports = router;