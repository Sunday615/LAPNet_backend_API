// routes/form.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const { nanoid } = require("nanoid");
const fs = require("fs");

const poolMod = require("../db/pool");
const rawPool = poolMod.pool || poolMod;

// ✅ ถ้าเป็น callback pool ให้แปลงเป็น promise pool
const pool = typeof rawPool.promise === "function" ? rawPool.promise() : rawPool;

const { UPLOAD_DIR } = require("../config/paths"); // ✅ ใช้ dir เดียวกับ static ใน app.js

const router = express.Router();

// ✅ ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}_${nanoid(10)}${ext}`);
  },
});
const upload = multer({ storage });

// helpers
const allowedTypes = new Set([
  "short","long","option","checkbox","dropdown",
  "upload","score","table_option","table_checkbox",
  "date","time"
]);

function parseJsonMaybe(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "object") return v; // mysql อาจคืน object มาแล้ว
  try { return JSON.parse(v); } catch { return fallback; }
}

function normalizeQuestion(q, index) {
  const type = String(q?.type || "short");
  const safeType = allowedTypes.has(type) ? type : "short";

  const obj = {
    question_uid: String(q?.id || ""),
    type: safeType,
    title: String(q?.title ?? ""),
    description: String(q?.description ?? ""),
    required: !!q?.required,
    sort_order: Number(q?.sort_order ?? (index + 1)),

    images: Array.isArray(q?.images) ? q.images : [],
    options: Array.isArray(q?.options) ? q.options : [],
    upload: q?.upload ?? null,
    score: q?.score ?? null,
    table_config: q?.table ?? null,
  };

  if (!obj.question_uid) throw Object.assign(new Error("question.id is required"), { status: 400 });

  // normalize JSON fields
  obj.images = obj.images.filter(x => x?.src && String(x.src).trim().length > 0);
  obj.options = obj.options.map(x => String(x ?? "")).filter(x => x.trim().length > 0);

  // keep configs only if type matches
  if (obj.type !== "upload") obj.upload = null;
  if (obj.type !== "score") obj.score = null;
  if (obj.type !== "table_option" && obj.type !== "table_checkbox") obj.table_config = null;

  return obj;
}

// 1) CREATE form
router.post("/", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const meta = req.body?.meta || {};
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    const title = String(meta.title ?? "");
    const description = String(meta.description ?? "");
    const collectEmail = !!meta.collectEmail;
    const allowEditAfterSubmit = !!meta.allowEditAfterSubmit;

    if (!questions.length) {
      return res.status(400).json({ ok: false, message: "questions is required" });
    }

    await conn.beginTransaction();

    const [r1] = await conn.execute(
      `INSERT INTO forms (title, description, collect_email, allow_edit_after_submit)
       VALUES (?, ?, ?, ?)`,
      [title, description, collectEmail ? 1 : 0, allowEditAfterSubmit ? 1 : 0]
    );

    const formId = r1.insertId;

    const insertQSql = `
      INSERT INTO form_questions
        (form_id, question_uid, type, title, description, required, sort_order, images, options, upload, score, table_config)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (let i = 0; i < questions.length; i++) {
      const q = normalizeQuestion(questions[i], i);
      await conn.execute(insertQSql, [
        formId,
        q.question_uid,
        q.type,
        q.title,
        q.description,
        q.required ? 1 : 0,
        i + 1,
        JSON.stringify(q.images),
        JSON.stringify(q.options),
        q.upload ? JSON.stringify(q.upload) : null,
        q.score ? JSON.stringify(q.score) : null,
        q.table_config ? JSON.stringify(q.table_config) : null,
      ]);
    }

    await conn.commit();
    res.json({ ok: true, id: formId });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    conn.release();
  }
});

// 2) UPDATE form + UPSERT questions (by form_id + question_uid)
router.put("/:id", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const formId = Number(req.params.id);
    if (!formId) return res.status(400).json({ ok: false, message: "Invalid form id" });

    const meta = req.body?.meta || {};
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    if (!questions.length) return res.status(400).json({ ok: false, message: "questions is required" });

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE forms
       SET title=?, description=?, collect_email=?, allow_edit_after_submit=?
       WHERE id=?`,
      [
        String(meta.title ?? ""),
        String(meta.description ?? ""),
        meta.collectEmail ? 1 : 0,
        meta.allowEditAfterSubmit ? 1 : 0,
        formId
      ]
    );

    const upsertSql = `
      INSERT INTO form_questions
        (form_id, question_uid, type, title, description, required, sort_order, images, options, upload, score, table_config)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        type=VALUES(type),
        title=VALUES(title),
        description=VALUES(description),
        required=VALUES(required),
        sort_order=VALUES(sort_order),
        images=VALUES(images),
        options=VALUES(options),
        upload=VALUES(upload),
        score=VALUES(score),
        table_config=VALUES(table_config)
    `;

    const seen = new Set();
    for (let i = 0; i < questions.length; i++) {
      const q = normalizeQuestion(questions[i], i);
      seen.add(q.question_uid);

      await conn.execute(upsertSql, [
        formId,
        q.question_uid,
        q.type,
        q.title,
        q.description,
        q.required ? 1 : 0,
        i + 1,
        JSON.stringify(q.images),
        JSON.stringify(q.options),
        q.upload ? JSON.stringify(q.upload) : null,
        q.score ? JSON.stringify(q.score) : null,
        q.table_config ? JSON.stringify(q.table_config) : null,
      ]);
    }

    // optional: delete removed questions
    const [existing] = await conn.execute(
      `SELECT question_uid FROM form_questions WHERE form_id=?`,
      [formId]
    );
    const toDelete = existing.map(x => x.question_uid).filter(uid => !seen.has(uid));

    if (toDelete.length) {
      await conn.query(
        `DELETE FROM form_questions WHERE form_id=? AND question_uid IN (${toDelete.map(() => "?").join(",")})`,
        [formId, ...toDelete]
      );
    }

    await conn.commit();
    res.json({ ok: true, id: formId });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    conn.release();
  }
});

// 3) GET form + questions
router.get("/:id", async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    if (!formId) return res.status(400).json({ ok: false, message: "Invalid form id" });

    const [forms] = await pool.execute(`SELECT * FROM forms WHERE id=?`, [formId]);
    const form = forms?.[0];
    if (!form) return res.status(404).json({ ok: false, message: "Form not found" });

    const [qs] = await pool.execute(
      `SELECT question_uid AS id, type, title, description, required, sort_order,
              images, options, upload, score, table_config
       FROM form_questions
       WHERE form_id=?
       ORDER BY sort_order ASC`,
      [formId]
    );

    const questions = qs.map(q => ({
      ...q,
      images: parseJsonMaybe(q.images, []),
      options: parseJsonMaybe(q.options, []),
      upload: parseJsonMaybe(q.upload, null),
      score: parseJsonMaybe(q.score, null),
      table: parseJsonMaybe(q.table_config, null),
    }));

    res.json({
      ok: true,
      id: form.id,
      meta: {
        title: form.title,
        description: form.description,
        collectEmail: !!form.collect_email,
        allowEditAfterSubmit: !!form.allow_edit_after_submit
      },
      questions
    });
  } catch (err) {
    next(err);
  }
});

// 4) SUBMIT answers + files (multipart)
router.post("/:id/submissions", upload.any(), async (req, res, next) => {
  const conn = await pool.getConnection();
  const savedFiles = req.files || [];

  try {
    const formId = Number(req.params.id);
    if (!formId) return res.status(400).json({ ok: false, message: "Invalid form id" });

    const raw = req.body?.payload;
    if (!raw) return res.status(400).json({ ok: false, message: "payload is required" });

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return res.status(400).json({ ok: false, message: "payload must be valid JSON" }); }

    const respondentEmail = parsed.respondentEmail ? String(parsed.respondentEmail) : null;
    const answers = Array.isArray(parsed.answers) ? parsed.answers : [];

    const [qs] = await conn.execute(
      `SELECT question_uid, type, required
       FROM form_questions WHERE form_id=?`,
      [formId]
    );
    const qMap = new Map(qs.map(x => [x.question_uid, x]));

    // group files by question_uid จาก fieldname: file_<qid>
    const filesByQid = new Map();
    for (const f of savedFiles) {
      const field = String(f.fieldname || "");
      const m = field.match(/^file_(.+)$/);
      if (!m) continue;
      const qid = m[1];
      if (!filesByQid.has(qid)) filesByQid.set(qid, []);
      filesByQid.get(qid).push(f);
    }

    // validate required
    for (const [qid, q] of qMap.entries()) {
      if (!q.required) continue;

      if (q.type === "upload") {
        const hasFiles = (filesByQid.get(qid) || []).length > 0;
        if (!hasFiles) return res.status(400).json({ ok: false, message: `Required upload: ${qid}` });
      } else {
        const a = answers.find(x => String(x.questionId) === qid);
        const v = a?.value;

        const empty =
          v === null || v === undefined ||
          (typeof v === "string" && v.trim().length === 0) ||
          (Array.isArray(v) && v.length === 0) ||
          (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

        if (empty) return res.status(400).json({ ok: false, message: `Required: ${qid}` });
      }
    }

    await conn.beginTransaction();

    const [formRows] = await conn.execute(
      `SELECT allow_edit_after_submit FROM forms WHERE id=?`,
      [formId]
    );
    const allowEdit = !!formRows?.[0]?.allow_edit_after_submit;
    const editToken = allowEdit ? nanoid(24) : null;

    const [r1] = await conn.execute(
      `INSERT INTO form_submissions (form_id, respondent_email, edit_token)
       VALUES (?, ?, ?)`,
      [formId, respondentEmail, editToken]
    );
    const submissionId = r1.insertId;

    // insert answers (skip upload)
    const insAns = `
      INSERT INTO form_submission_answers (submission_id, question_uid, value)
      VALUES (?, ?, ?)
    `;

    for (const a of answers) {
      const qid = String(a?.questionId || "");
      if (!qid || !qMap.has(qid)) continue;

      const qType = qMap.get(qid).type;
      if (qType === "upload") continue;

      const val = a?.value ?? null;
      await conn.execute(insAns, [submissionId, qid, val === null ? null : JSON.stringify(val)]);
    }

    // insert files metadata
    const insFile = `
      INSERT INTO form_submission_files
        (submission_id, question_uid, file_name, storage_key, mime_type, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const [qid, files] of filesByQid.entries()) {
      if (!qMap.has(qid)) continue;

      for (const f of files) {
        // ✅ storage_key เก็บแค่ filename (เรียกดูผ่าน /uploads/<filename>)
        await conn.execute(insFile, [
          submissionId,
          qid,
          f.originalname || f.filename,
          f.filename,
          f.mimetype || null,
          Number(f.size || 0),
        ]);
      }
    }

    await conn.commit();
    res.json({ ok: true, submissionId, editToken });
  } catch (err) {
    try { await conn.rollback(); } catch {}

    // cleanup uploaded files if DB fail
    for (const f of savedFiles) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, f.filename)); } catch {}
    }

    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
