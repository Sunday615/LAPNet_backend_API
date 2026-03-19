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

let sharp = null;
try {
  sharp = require("sharp");
} catch (_error) {
  console.warn("sharp is not installed. Announcement image conversion will be unavailable.");
}

async function convertDiskImageToWebpOrThrow(filePath, quality = 82, resizeWidth = 1024) {
  if (!sharp) {
    const err = new Error("Image conversion service is unavailable");
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

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

function parsePositiveInt(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateOptionalHttpUrl(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const url = String(value).trim();
  if (!url) {
    return null;
  }

  if (!isValidUrl(url)) {
    throw createHttpError(400, `${fieldName} must be a valid http/https URL`);
  }

  return url;
}

async function cleanupAnnouncementArtifacts(uploadedDiskPath, uploadedWebpRel) {
  if (uploadedDiskPath) {
    await fsp.unlink(uploadedDiskPath).catch(() => {});
  }

  if (uploadedWebpRel) {
    await deleteUploadRelSafe(uploadedWebpRel).catch(() => {});
  }
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
  for (const key of keys) {
    if (body[key] !== undefined) {
      return body[key];
    }
  }

  return undefined;
}

function normalizeAnnouncementImageInput(raw) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  let value = raw;
  if (Array.isArray(value)) {
    value = value[0];
  }

  const str = String(value || "").trim();
  if (!str) {
    return null;
  }

  if (str.startsWith("/uploads/")) {
    return str;
  }

  if (str.startsWith("uploads/")) {
    return `/${str}`;
  }

  if (/^https?:\/\//i.test(str)) {
    if (!isValidUrl(str)) {
      throw createHttpError(400, "image must be a valid http/https URL");
    }
    return str;
  }

  throw createHttpError(400, "image must be file upload, '/uploads/...' path, or 'http(s)://...' URL");
}

router.post("/", uploadAnnouncement, async (req, res, next) => {
  let uploadedDiskPath = "";
  let uploadedWebpRel = "";

  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const active = normalize01(req.body?.active, 0);

    const timeForShowRaw =
      req.body?.timeforshow ?? req.body?.timeForShow ?? req.body?.range ?? req.body?.Range ?? req.body?.hours;
    const timeforshow = normalizeTimeForShow(timeForShowRaw, 3);

    const linkpath = validateOptionalHttpUrl(
      req.body?.linkpath ?? req.body?.linkPath ?? req.body?.link ?? null,
      "linkpath"
    );

    const timeRaw = req.body?.time !== undefined ? String(req.body.time || "").trim() : "";
    if (timeRaw && !isSqlDatetimeLike(timeRaw)) {
      throw createHttpError(400, "time must be 'YYYY-MM-DD HH:mm:ss'");
    }

    if (!title) {
      throw createHttpError(400, "title is required");
    }

    const imageFile = pickAnnouncementImageFile(req.files);
    let imageFinal = null;

    if (imageFile) {
      uploadedDiskPath = imageFile.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageFinal = `/uploads/announcement/${outFile}`;
      uploadedWebpRel = imageFinal;
      uploadedDiskPath = "";
    } else {
      const bodyImgRaw = pickAnnouncementImageBodyValue(req.body);
      imageFinal = normalizeAnnouncementImageInput(bodyImgRaw) ?? null;
    }

    if (!imageFinal) {
      throw createHttpError(400, "image is required (file upload or URL/path string)");
    }

    const columns = ["`image`", "`title`", "`description`", "`active`", "`timeforshow`", "`linkpath`"];
    const values = ["?", "?", "?", "?", "?", "?"];
    const params = [imageFinal, title, description, active, timeforshow, linkpath];

    if (timeRaw) {
      columns.splice(4, 0, "`time`");
      values.splice(4, 0, "?");
      params.splice(4, 0, timeRaw);
    }

    const sql = `INSERT INTO \`${ANNOUNCEMENT_TABLE}\` (${columns.join(", ")}) VALUES (${values.join(", ")})`;
    const [result] = await pool.execute(sql, params);

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      ok: true,
      idannouncement: result.insertId,
      data: normalizeAnnouncementRow(req, rows[0]),
    });
  } catch (err) {
    console.error("INSERT ANNOUNCEMENT ERROR:", {
      code: err?.code,
      message: err?.message,
      statusCode: err?.statusCode,
    });

    await cleanupAnnouncementArtifacts(uploadedDiskPath, uploadedWebpRel);
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` ORDER BY \`idannouncement\` DESC`);
    return res.json({ ok: true, data: rows.map((row) => normalizeAnnouncementRow(req, row)) });
  } catch (err) {
    console.error("GET ANNOUNCEMENT ERROR:", {
      code: err?.code,
      message: err?.message,
    });
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    return res.json({ ok: true, data: normalizeAnnouncementRow(req, rows[0]) });
  } catch (err) {
    console.error("GET ANNOUNCEMENT BY ID ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

router.patch("/:id", uploadAnnouncement, async (req, res, next) => {
  let uploadedDiskPath = "";
  let uploadedWebpRel = "";

  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [oldRows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );

    if (!oldRows.length) {
      throw createHttpError(404, "Not found");
    }

    const oldRow = oldRows[0];
    const oldImageRel = String(oldRow?.image || "").trim();

    const sets = [];
    const params = [];

    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) {
        throw createHttpError(400, "title cannot be empty");
      }
      sets.push("`title` = ?");
      params.push(title);
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      sets.push("`description` = ?");
      params.push(description || null);
    }

    if (req.body?.active !== undefined) {
      sets.push("`active` = ?");
      params.push(normalize01(req.body.active, 0));
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
      sets.push("`timeforshow` = ?");
      params.push(normalizeTimeForShow(raw, 3));
    }

    if (req.body?.linkpath !== undefined || req.body?.linkPath !== undefined || req.body?.link !== undefined) {
      const linkpath = validateOptionalHttpUrl(
        req.body?.linkpath ?? req.body?.linkPath ?? req.body?.link ?? null,
        "linkpath"
      );
      sets.push("`linkpath` = ?");
      params.push(linkpath);
    }

    if (req.body?.time !== undefined) {
      const timeRaw = String(req.body.time || "").trim();
      if (timeRaw && !isSqlDatetimeLike(timeRaw)) {
        throw createHttpError(400, "time must be 'YYYY-MM-DD HH:mm:ss'");
      }

      sets.push("`time` = ?");
      params.push(timeRaw || nowSqlTimestamp());
    }

    const imageFile = pickAnnouncementImageFile(req.files);
    const bodyImgRaw = pickAnnouncementImageBodyValue(req.body);

    const imageRemoveRaw =
      req.body?.image_remove ?? req.body?.imageRemove ?? req.body?.remove_image ?? req.body?.removeImage;
    const imageRemove = imageRemoveRaw !== undefined ? normalize01(imageRemoveRaw, 0) : 0;

    let newImageFinal = undefined;

    if (imageFile) {
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
        throw createHttpError(400, "image cannot be empty");
      }
      sets.push("`image` = ?");
      params.push(newImageFinal);
    } else if (imageRemove === 1) {
      throw createHttpError(400, "image cannot be removed because this field is required");
    }

    if (!sets.length) {
      throw createHttpError(400, "No fields to update");
    }

    params.push(id);

    const sql = `UPDATE \`${ANNOUNCEMENT_TABLE}\` SET ${sets.join(", ")} WHERE \`idannouncement\` = ?`;
    const [result] = await pool.execute(sql, params);

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    const didChangeImage = newImageFinal !== undefined && String(newImageFinal || "") !== oldImageRel;
    if (didChangeImage && oldImageRel) {
      await deleteUploadRelSafe(oldImageRel).catch(() => {});
    }

    const [rows] = await pool.query(
      `SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );

    return res.json({ ok: true, data: normalizeAnnouncementRow(req, rows[0]) });
  } catch (err) {
    console.error("PATCH ANNOUNCEMENT ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });

    await cleanupAnnouncementArtifacts(uploadedDiskPath, uploadedWebpRel);
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(
      `SELECT \`image\` FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const imageRel = rows[0]?.image || "";
    const [result] = await pool.execute(`DELETE FROM \`${ANNOUNCEMENT_TABLE}\` WHERE \`idannouncement\` = ?`, [id]);

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    await deleteUploadRelSafe(imageRel).catch(() => {});

    return res.json({
      ok: true,
      message: "Deleted",
      idannouncement: id,
      deleted_files: { image: imageRel || null },
    });
  } catch (err) {
    console.error("DELETE ANNOUNCEMENT ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

module.exports = router;