// routes/formSubmissions.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../../db/pool");

// =====================
// folders
// =====================
const TMP_DIR = path.join(process.cwd(), "uploads", "tmp");
const ASSETS_ROOT = path.join(process.cwd(), "uploads", "submit_assets");

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(ASSETS_ROOT, { recursive: true });

// =====================
// multer (upload to tmp first)
// =====================
const upload = multer({
  dest: TMP_DIR,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB ต่อไฟล์
    files: 30,
  },
});

// =====================
// helpers
// =====================
function safeJsonParse(x, fallback = null) {
  try {
    if (x == null) return fallback;
    if (typeof x === "object") return x;
    return JSON.parse(String(x));
  } catch {
    return fallback;
  }
}

function safeName(s) {
  return String(s || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 140);
}

function getQuestionIdFromField(fieldname) {
  const f = String(fieldname || "").trim();
  if (!f) return "unknown";
  if (f.startsWith("file_")) return f.slice(5) || "unknown";
  return f;
}

async function unlinkIfExists(p) {
  try {
    await fsp.unlink(p);
  } catch {}
}

async function rmDirSafe(dir) {
  try {
    await fsp.rm(dir, { recursive: true, force: true });
  } catch {}
}

function toSqlDateTime(d) {
  // MySQL DATETIME(3)
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.` +
    `${pad(d.getMilliseconds(), 3)}`
  );
}

function mapSubmissionRow(r) {
  const out = {
    id: r.id,
    templateId: r.template_id,
    sourceFormId: r.source_form_id,
    email: r.email,
    answers: r.answers,
    submittedAt: r.submitted_at,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

  try {
    if (typeof out.answers === "string") out.answers = JSON.parse(out.answers);
  } catch {}

  return out;
}

function mapFileRow(r) {
  return {
    id: r.id,
    submissionId: r.submission_id,
    questionId: r.question_id,
    fieldName: r.field_name,
    originalName: r.original_name,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    storageDriver: r.storage_driver,
    storagePath: r.storage_path,
    createdAt: r.created_at,
  };
}

// =====================
// POST /api/form-submissions
// =====================
router.post("/", upload.any(), async (req, res) => {
  const conn = await pool.getConnection();
  let createdAssetsDir = null;

  try {
    const templateId = String(req.body.templateId || "").trim();
    const sourceFormId = req.body.sourceFormId ? String(req.body.sourceFormId).trim() : null;

    if (!templateId) {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(400).json({ ok: false, message: "templateId is required" });
    }

    const answersObj = safeJsonParse(req.body.answers, null);
    if (!answersObj || typeof answersObj !== "object") {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(400).json({ ok: false, message: "answers (JSON) is required" });
    }

    const emailFromAnswers = answersObj.__email ? String(answersObj.__email).trim() : null;
    const email = req.body.email ? String(req.body.email).trim() : emailFromAnswers;

    const submittedAt = req.body.submittedAt ? new Date(req.body.submittedAt) : new Date();
    if (Number.isNaN(submittedAt.getTime())) {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(400).json({ ok: false, message: "submittedAt is invalid" });
    }

    await conn.beginTransaction();

    const [ins] = await conn.execute(
      `
      INSERT INTO form_submissions
        (template_id, source_form_id, email, answers, submitted_at, ip, user_agent)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        templateId,
        sourceFormId,
        email || null,
        JSON.stringify(answersObj),
        toSqlDateTime(submittedAt),
        req.ip || null,
        String(req.get("user-agent") || "").slice(0, 255) || null,
      ]
    );

    const submissionId = ins.insertId;

    const files = Array.isArray(req.files) ? req.files : [];
    const savedFiles = [];

    if (files.length) {
      createdAssetsDir = path.join(ASSETS_ROOT, String(submissionId));
      await fsp.mkdir(createdAssetsDir, { recursive: true });

      for (const f of files) {
        const questionId = getQuestionIdFromField(f.fieldname);
        const ext = path.extname(f.originalname || "");
        const rand = crypto.randomBytes(6).toString("hex");

        const base = safeName(questionId || "file");
        const finalName = `${base}_${Date.now()}_${rand}${ext}`;
        const finalPath = path.join(createdAssetsDir, finalName);

        await fsp.rename(f.path, finalPath);

        const relativePath = path
          .relative(process.cwd(), finalPath)
          .split(path.sep)
          .join("/");

        await conn.execute(
          `
          INSERT INTO form_submission_files
            (submission_id, question_id, field_name, original_name, mime_type, size_bytes, storage_driver, storage_path)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            String(questionId),
            String(f.fieldname || ""),
            String(f.originalname || ""),
            String(f.mimetype || ""),
            Number(f.size || 0),
            "local",
            relativePath,
          ]
        );

        savedFiles.push({
          questionId: String(questionId),
          field: String(f.fieldname || ""),
          originalName: String(f.originalname || ""),
          mime: String(f.mimetype || ""),
          size: Number(f.size || 0),
          path: relativePath,
        });
      }
    }

    await conn.commit();

    return res.json({
      ok: true,
      submissionId,
      assetsFolder: files.length ? `uploads/submit_assets/${submissionId}` : null,
      files: savedFiles,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}

    for (const f of req.files || []) await unlinkIfExists(f.path);
    if (createdAssetsDir) await rmDirSafe(createdAssetsDir);

    return res.status(500).json({ ok: false, message: e?.message || "Server error" });
  } finally {
    conn.release();
  }
});

// =====================
// GET /api/form-submissions
// =====================
router.get("/", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const templateId = req.query.templateId ? String(req.query.templateId).trim() : "";
    const email = req.query.email ? String(req.query.email).trim() : "";

    let limit = Number(req.query.limit ?? 50);
    let offset = Number(req.query.offset ?? 0);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    limit = Math.floor(limit);
    offset = Math.floor(offset);

    const where = [];
    const params = [];

    if (templateId) {
      where.push("s.template_id = ?");
      params.push(templateId);
    }
    if (email) {
      where.push("s.email = ?");
      params.push(email);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sqlSubs = `
      SELECT s.*
      FROM form_submissions s
      ${whereSql}
      ORDER BY s.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [subRows] = await conn.execute(sqlSubs, params);

    const submissions = subRows.map(mapSubmissionRow);
    const ids = submissions.map((s) => s.id);

    const filesBySubmissionId = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [fileRows] = await conn.execute(
        `
        SELECT f.*
        FROM form_submission_files f
        WHERE f.submission_id IN (${placeholders})
        ORDER BY f.submission_id ASC, f.id ASC
        `,
        ids
      );

      for (const fr of fileRows) {
        const f = mapFileRow(fr);
        const arr = filesBySubmissionId.get(f.submissionId) || [];
        arr.push(f);
        filesBySubmissionId.set(f.submissionId, arr);
      }
    }

    const items = submissions.map((s) => {
      const files = filesBySubmissionId.get(s.id) || [];
      return {
        ...s,
        files,
        assetsFolder: files.length ? `uploads/submit_assets/${s.id}` : null,
      };
    });

    return res.json({ ok: true, items, limit, offset });
  } catch (e) {
    console.error("[GET /api/form-submissions] ERROR:", e);
    return res.status(500).json({
      ok: false,
      message: e?.sqlMessage || e?.message || "Server error",
      code: e?.code || null,
    });
  } finally {
    try {
      if (conn) conn.release();
    } catch {}
  }
});

// =====================
// GET /api/form-submissions/:id
// =====================
router.get("/:id", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const submissionId = Number(req.params.id);
    if (!Number.isFinite(submissionId) || submissionId <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const [subRows] = await conn.execute(
      `
      SELECT s.*
      FROM form_submissions s
      WHERE s.id = ?
      LIMIT 1
      `,
      [submissionId]
    );

    if (!subRows.length) {
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    const submission = mapSubmissionRow(subRows[0]);

    const [fileRows] = await conn.execute(
      `
      SELECT f.*
      FROM form_submission_files f
      WHERE f.submission_id = ?
      ORDER BY f.id ASC
      `,
      [submissionId]
    );

    const files = fileRows.map(mapFileRow);

    return res.json({
      ok: true,
      item: submission,
      files,
      assetsFolder: files.length ? `uploads/submit_assets/${submissionId}` : null,
    });
  } catch (e) {
    console.error("[GET /api/form-submissions/:id] ERROR:", e);
    return res.status(500).json({
      ok: false,
      message: e?.sqlMessage || e?.message || "Server error",
      code: e?.code || null,
    });
  } finally {
    try {
      if (conn) conn.release();
    } catch {}
  }
});

// =====================
// PATCH /api/form-submissions/:id
// =====================
router.patch("/:id", upload.any(), async (req, res) => {
  const conn = await pool.getConnection();
  let createdAssetsDir = null;

  try {
    const submissionId = Number(req.params.id);
    if (!Number.isFinite(submissionId) || submissionId <= 0) {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const [chk] = await conn.execute(`SELECT id FROM form_submissions WHERE id = ? LIMIT 1`, [submissionId]);
    if (!chk.length) {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    const answersObj = safeJsonParse(req.body.answers, undefined);
    const email = req.body.email != null ? String(req.body.email).trim() : undefined;
    const submittedAt = req.body.submittedAt != null ? new Date(req.body.submittedAt) : undefined;

    if (submittedAt && Number.isNaN(submittedAt.getTime())) {
      for (const f of req.files || []) await unlinkIfExists(f.path);
      return res.status(400).json({ ok: false, message: "submittedAt is invalid" });
    }

    const sets = [];
    const params = [];

    if (answersObj !== undefined) {
      if (!answersObj || typeof answersObj !== "object") {
        for (const f of req.files || []) await unlinkIfExists(f.path);
        return res.status(400).json({ ok: false, message: "answers must be JSON object" });
      }
      sets.push("answers = ?");
      params.push(JSON.stringify(answersObj));
    }

    if (email !== undefined) {
      sets.push("email = ?");
      params.push(email || null);
    }

    if (submittedAt !== undefined) {
      sets.push("submitted_at = ?");
      params.push(toSqlDateTime(submittedAt));
    }

    await conn.beginTransaction();

    if (sets.length) {
      params.push(submissionId);
      await conn.execute(`UPDATE form_submissions SET ${sets.join(", ")} WHERE id = ?`, params);
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const savedFiles = [];

    if (files.length) {
      createdAssetsDir = path.join(ASSETS_ROOT, String(submissionId));
      await fsp.mkdir(createdAssetsDir, { recursive: true });

      for (const f of files) {
        const questionId = getQuestionIdFromField(f.fieldname);
        const ext = path.extname(f.originalname || "");
        const rand = crypto.randomBytes(6).toString("hex");

        const base = safeName(questionId || "file");
        const finalName = `${base}_${Date.now()}_${rand}${ext}`;
        const finalPath = path.join(createdAssetsDir, finalName);

        await fsp.rename(f.path, finalPath);

        const relativePath = path
          .relative(process.cwd(), finalPath)
          .split(path.sep)
          .join("/");

        await conn.execute(
          `
          INSERT INTO form_submission_files
            (submission_id, question_id, field_name, original_name, mime_type, size_bytes, storage_driver, storage_path)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            String(questionId),
            String(f.fieldname || ""),
            String(f.originalname || ""),
            String(f.mimetype || ""),
            Number(f.size || 0),
            "local",
            relativePath,
          ]
        );

        savedFiles.push({
          questionId: String(questionId),
          field: String(f.fieldname || ""),
          originalName: String(f.originalname || ""),
          mime: String(f.mimetype || ""),
          size: Number(f.size || 0),
          path: relativePath,
        });
      }
    }

    await conn.commit();

    return res.json({
      ok: true,
      id: submissionId,
      updated: true,
      addedFiles: savedFiles,
      assetsFolder: `uploads/submit_assets/${submissionId}`,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}

    for (const f of req.files || []) await unlinkIfExists(f.path);

    return res.status(500).json({ ok: false, message: e?.message || "Server error" });
  } finally {
    conn.release();
  }
});

// =====================
// ✅ DELETE /api/form-submissions/:id
// - delete submission + files rows + assets folder
// =====================
router.delete("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const submissionId = Number(req.params.id);
    if (!Number.isFinite(submissionId) || submissionId <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const [chk] = await conn.execute(`SELECT id FROM form_submissions WHERE id = ? LIMIT 1`, [submissionId]);
    if (!chk.length) {
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    await conn.beginTransaction();

    await conn.execute(`DELETE FROM form_submission_files WHERE submission_id = ?`, [submissionId]);
    await conn.execute(`DELETE FROM form_submissions WHERE id = ?`, [submissionId]);

    await conn.commit();

    // remove assets folder (best-effort)
    const dir = path.join(ASSETS_ROOT, String(submissionId));
    await rmDirSafe(dir);

    return res.json({ ok: true, id: submissionId, deleted: true });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    return res.status(500).json({ ok: false, message: e?.sqlMessage || e?.message || "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;
