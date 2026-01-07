// src/routes/announcement.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const pool = require("../db/pool");
const { ANNOUNCEMENT_TABLE } = require("../config/tables");
const { upload } = require("../middleware/upload");
const { deleteUploadRelSafe } = require("../utils/files");
const { isValidUrl } = require("../utils/url");

const {
  pickFirst,
  normalize01,
  normalizeTimeForShow,
  nowSqlTimestamp,
  isSqlDatetimeLike,
  normalizeAnnouncementRow,
} = require("../utils/normalize");

// ✅ OPTIONAL sharp (won't crash)
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("⚠️ sharp not installed. Announcement image webp convert will return 501. Run: npm i sharp");
}

async function convertDiskImageToWebpOrThrow(filePath, quality = 82, resizeWidth = 1024) {
  if (!sharp) {
    const err = new Error("Sharp not installed - cannot convert to webp. Run: npm i sharp");
    err.statusCode = 501;
    throw err;
  }

  const dir = path.dirname(filePath);
  const parsed = path.parse(filePath);
  const outPath = path.join(dir, `${parsed.name}.webp`);

  await sharp(filePath)
    .rotate()
    .resize({ width: resizeWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(outPath);

  await fsp.unlink(filePath).catch(() => {});
  return outPath;
}

const router = express.Router();

const uploadAnnouncement = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "imageurl", maxCount: 1 },
  { name: "imageUrl", maxCount: 1 },
  { name: "Image_url", maxCount: 1 },
  { name: "Image", maxCount: 1 },
]);

function pickAnnouncementImageFile(files) {
  return (
    pickFirst(files?.image) ||
    pickFirst(files?.imageurl) ||
    pickFirst(files?.imageUrl) ||
    pickFirst(files?.Image_url) ||
    pickFirst(files?.Image) ||
    null
  );
}

function pickAnnouncementImageBodyValue(body) {
  if (!body || typeof body !== "object") return undefined;
  const keys = ["image", "imageurl", "imageUrl", "Image_url", "Image"];
  for (const k of keys) {
    if (body[k] !== undefined) return body[k];
  }
  return undefined;
}

function normalizeAnnouncementImageInput(raw) {
  // undefined = not provided (do nothing)
  if (raw === undefined) return undefined;

  // explicit null/empty => remove (แต่ตาราง image NOT NULL -> route จะ reject ตอน insert)
  if (raw === null) return null;

  let v = raw;
  if (Array.isArray(v)) v = v[0];

  const s = String(v || "").trim();
  if (!s) return null;

  // local upload path
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;

  // external URL
  if (/^https?:\/\//i.test(s)) {
    if (!isValidUrl(s)) {
      const err = new Error("image must be a valid http/https URL");
      err.statusCode = 400;
      throw err;
    }
    return s;
  }

  const err = new Error("image must be file upload, '/uploads/...' path, or 'http(s)://...' URL");
  err.statusCode = 400;
  throw err;
}

// POST /api/announcement
router.post("/", uploadAnnouncement, async (req, res) => {
  let uploadedDiskPath = ""; // ✅ for cleanup if convert fails
  let uploadedWebpRel = "";  // ✅ for cleanup if DB insert fails after convert
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const active = normalize01(req.body?.active, 0);

    const tfsRaw =
      req.body?.timeforshow ?? req.body?.timeForShow ?? req.body?.range ?? req.body?.Range ?? req.body?.hours;
    const timeforshow = normalizeTimeForShow(tfsRaw, 3);

    const linkRaw = String(req.body?.linkpath ?? req.body?.linkPath ?? req.body?.link ?? "").trim();
    const linkpath = linkRaw ? linkRaw : null;
    if (!isValidUrl(linkpath)) return res.status(400).json({ ok: false, message: "linkpath must be URL (http/https)" });

    const timeRaw = req.body?.time !== undefined ? String(req.body.time || "").trim() : "";
    if (timeRaw && !isSqlDatetimeLike(timeRaw)) {
      return res.status(400).json({ ok: false, message: "time must be 'YYYY-MM-DD HH:mm:ss'" });
    }

    if (!title) return res.status(400).json({ ok: false, message: "title is required" });

    // ✅ image: prefer file, else accept body string
    const imageFile = pickAnnouncementImageFile(req.files);
    let imageFinal = null;

    if (imageFile) {
      // ✅ convert uploaded image -> webp
      uploadedDiskPath = imageFile.path; // multer disk path
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageFinal = `/uploads/announcement/${outFile}`;
      uploadedWebpRel = imageFinal;
      uploadedDiskPath = ""; // original already removed
    } else {
      const bodyImgRaw = pickAnnouncementImageBodyValue(req.body);
      const normalized = normalizeAnnouncementImageInput(bodyImgRaw);
      imageFinal = normalized ?? null;
    }

    if (!imageFinal) {
      return res.status(400).json({ ok: false, message: "image is required (file upload or URL/path string)" });
    }

    const cols = ["`image`", "`title`", "`description`", "`active`", "`timeforshow`", "`linkpath`"];
    const vals = ["?", "?", "?", "?", "?", "?"];
    const params = [imageFinal, title, description, active, timeforshow, linkpath];

    if (timeRaw) {
      cols.splice(4, 0, "`time`");
      vals.splice(4, 0, "?");
      params.splice(4, 0, timeRaw);
    }

    const sql = `INSERT INTO \`${ANNOUNCEMENT_TABLE}\` (${cols.join(", ")}) VALUES (${vals.join(", ")})`;
    const [result] = await pool.execute(sql, params);

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json({ ok: true, idannouncement: result.insertId, data: normalizeAnnouncementRow(req, rows[0]) });
  } catch (err) {
    console.error("INSERT ANNOUNCEMENT ERROR:", err);

    // cleanup: original upload if still exists
    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => {});
    // cleanup: webp if convert succeeded but insert failed
    if (uploadedWebpRel) await deleteUploadRelSafe(uploadedWebpRel);

    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/announcement
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` ORDER BY \`idannouncement\` DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeAnnouncementRow(req, r)) });
  } catch (err) {
    console.error("GET ANNOUNCEMENT ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/announcement/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, data: normalizeAnnouncementRow(req, rows[0]) });
  } catch (err) {
    console.error("GET ANNOUNCEMENT BY ID ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// PATCH /api/announcement/:id
router.patch("/:id", uploadAnnouncement, async (req, res) => {
  let uploadedDiskPath = ""; // ✅ for cleanup if convert fails
  let uploadedWebpRel = "";  // ✅ for cleanup if DB update fails after convert
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [oldRows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );
    if (!oldRows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const oldRow = oldRows[0];
    const oldImageRel = String(oldRow?.image || "").trim();

    const sets = [];
    const params = [];

    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ ok: false, message: "title cannot be empty" });
      sets.push("`title` = ?");
      params.push(title);
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      sets.push("`description` = ?");
      params.push(description ? description : null);
    }

    if (req.body?.active !== undefined) {
      const active = normalize01(req.body.active, 0);
      sets.push("`active` = ?");
      params.push(active);
    }

    if (
      req.body?.timeforshow !== undefined ||
      req.body?.timeForShow !== undefined ||
      req.body?.range !== undefined ||
      req.body?.Range !== undefined ||
      req.body?.hours !== undefined
    ) {
      const raw =
        req.body?.timeforshow ?? req.body?.timeForShow ?? req.body?.range ?? req.body?.Range ?? req.body?.hours;
      const timeforshow = normalizeTimeForShow(raw, 3);
      sets.push("`timeforshow` = ?");
      params.push(timeforshow);
    }

    if (req.body?.linkpath !== undefined || req.body?.linkPath !== undefined || req.body?.link !== undefined) {
      const linkRaw = String(req.body?.linkpath ?? req.body?.linkPath ?? req.body?.link ?? "").trim();
      const linkpath = linkRaw ? linkRaw : null;
      if (!isValidUrl(linkpath)) {
        return res.status(400).json({ ok: false, message: "linkpath must be URL (http/https)" });
      }
      sets.push("`linkpath` = ?");
      params.push(linkpath);
    }

    if (req.body?.time !== undefined) {
      const timeRaw = String(req.body.time || "").trim();
      if (timeRaw && !isSqlDatetimeLike(timeRaw)) {
        return res.status(400).json({ ok: false, message: "time must be 'YYYY-MM-DD HH:mm:ss'" });
      }
      const timeFinal = timeRaw ? timeRaw : nowSqlTimestamp();
      sets.push("`time` = ?");
      params.push(timeFinal);
    }

    // ✅ image update (file OR body string OR image_remove)
    const imageFile = pickAnnouncementImageFile(req.files);
    const bodyImgRaw = pickAnnouncementImageBodyValue(req.body);

    const imgRemoveRaw =
      req.body?.image_remove ?? req.body?.imageRemove ?? req.body?.remove_image ?? req.body?.removeImage;
    const imageRemove = imgRemoveRaw !== undefined ? normalize01(imgRemoveRaw, 0) : 0;

    let newImageFinal = undefined;

    if (imageFile) {
      // ✅ convert uploaded image -> webp
      uploadedDiskPath = imageFile.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      newImageFinal = `/uploads/announcement/${outFile}`;
      uploadedWebpRel = newImageFinal;
      uploadedDiskPath = "";

      sets.push("`image` = ?");
      params.push(newImageFinal);
    } else if (bodyImgRaw !== undefined) {
      newImageFinal = normalizeAnnouncementImageInput(bodyImgRaw);
      if (!newImageFinal) {
        return res.status(400).json({ ok: false, message: "image cannot be empty (table image NOT NULL)" });
      }
      sets.push("`image` = ?");
      params.push(newImageFinal);
    } else if (imageRemove === 1) {
      newImageFinal = "";
      sets.push("`image` = ?");
      params.push(newImageFinal);
    }

    if (!sets.length) return res.status(400).json({ ok: false, message: "No fields to update" });

    params.push(id);

    const sql = `UPDATE \`${ANNOUNCEMENT_TABLE}\` SET ${sets.join(", ")} WHERE \`idannouncement\` = ?`;
    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    // ✅ delete old image if replaced/removed (only local uploads)
    const didChangeImage = newImageFinal !== undefined && String(newImageFinal ?? "") !== oldImageRel;
    if (didChangeImage && oldImageRel) await deleteUploadRelSafe(oldImageRel);

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );

    res.json({ ok: true, data: normalizeAnnouncementRow(req, rows[0]) });
  } catch (err) {
    console.error("PATCH ANNOUNCEMENT ERROR:", err);

    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => {});
    if (uploadedWebpRel) await deleteUploadRelSafe(uploadedWebpRel);

    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// DELETE /api/announcement/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(
      `SELECT \`image\` FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const imageRel = rows[0]?.image || "";

    const [result] = await pool.execute(`DELETE FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    await deleteUploadRelSafe(imageRel);

    res.json({ ok: true, message: "Deleted", idannouncement: id, deleted_files: { image: imageRel || null } });
  } catch (err) {
    console.error("DELETE ANNOUNCEMENT ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

module.exports = router;
