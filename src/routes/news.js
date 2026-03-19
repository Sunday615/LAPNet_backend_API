const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");

const pool = require("../db/pool");
const { NEWS_TABLE } = require("../config/tables");
const { upload } = require("../middleware/upload");
const { deleteUploadRelSafe } = require("../utils/files");
const { absUrl } = require("../utils/url");
const {
  normalizeNewsRow,
  safeJson,
  safeJsonArray,
  parseJsonMaybe,
  pickFirst,
  normalize01,
} = require("../utils/normalize");

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

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

async function ensureDir(dirAbs) {
  try {
    await fs.mkdir(dirAbs, { recursive: true });
  } catch (_error) {}
}

function isWebpFilename(name) {
  return String(name || "").toLowerCase().endsWith(".webp");
}

function replaceExtToWebp(filename) {
  const base = String(filename || "").replace(/\.[^.]+$/, "");
  return `${base}.webp`;
}

function relToAbs(rel) {
  const clean = String(rel || "").replace(/^[\\/]+/, "");
  return path.join(PROJECT_ROOT, clean);
}

async function cleanupFiles(rels) {
  for (const rel of Array.isArray(rels) ? rels : []) {
    await deleteUploadRelSafe(rel).catch(() => {});
  }
}

function parseTagsInput(raw) {
  const parsed = safeJson(raw, []);
  if (!Array.isArray(parsed)) {
    throw createHttpError(400, "tags must be a JSON array");
  }
  return parsed;
}

function parseKeepGalleryInput(raw) {
  const parsed = safeJsonArray(parseJsonMaybe(raw, raw), []);
  return Array.isArray(parsed) ? parsed : [];
}

async function convertUploadToWebp(file, relOld, relNew) {
  if (!file) {
    return { relFinal: relOld, converted: false };
  }

  if (isWebpFilename(file.filename) || isWebpFilename(relOld)) {
    return { relFinal: relOld, converted: false };
  }

  const absNew = relToAbs(relNew);
  await ensureDir(path.dirname(absNew));

  const srcAbs = file.path ? path.resolve(file.path) : relToAbs(relOld);

  await sharp(srcAbs)
    .rotate()
    .webp({ quality: 82 })
    .toFile(absNew);

  await deleteUploadRelSafe(relOld).catch(() => {});
  return { relFinal: relNew, converted: true };
}

const uploadNews = upload.fields([
  { name: "hero_img", maxCount: 1 },
  { name: "gallery_files[]", maxCount: 30 },
  { name: "gallery_files", maxCount: 30 },
]);

router.post(["/insert", "/"], uploadNews, async (req, res, next) => {
  const createdRels = [];

  try {
    const {
      header_news,
      category,
      date_time,
      sub_header = "",
      tags = "[]",
      description_news,
    } = req.body || {};

    if (!String(header_news || "").trim()) {
      throw createHttpError(400, "header_news is required");
    }
    if (!String(category || "").trim()) {
      throw createHttpError(400, "category is required");
    }
    if (!String(date_time || "").trim()) {
      throw createHttpError(400, "date_time is required");
    }
    if (!String(description_news || "").trim()) {
      throw createHttpError(400, "description_news is required");
    }

    const heroFile = pickFirst(req.files?.hero_img);
    if (!heroFile) {
      throw createHttpError(400, "hero_img file is required");
    }

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];

    const heroRelOld = `/uploads/news/${heroFile.filename}`;
    const heroRelNew = `/uploads/news/${replaceExtToWebp(heroFile.filename)}`;

    const heroConv = await convertUploadToWebp(heroFile, heroRelOld, heroRelNew);
    const heroUrl = heroConv.relFinal;
    createdRels.push(heroUrl);

    const galleryUrls = [];
    for (const file of galleryFiles) {
      const relOld = `/uploads/news/gallery/${file.filename}`;
      const relNew = `/uploads/news/gallery/${replaceExtToWebp(file.filename)}`;
      const conv = await convertUploadToWebp(file, relOld, relNew);

      galleryUrls.push(conv.relFinal);
      createdRels.push(conv.relFinal);
    }

    const tagsFinal = parseTagsInput(tags);

    const sql = `
      INSERT INTO ${NEWS_TABLE}
      (header_news, category, date_time, sub_header, tags, description_news, hero_img, gallery)
      VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON))
    `;

    const params = [
      String(header_news).trim(),
      String(category).trim(),
      String(date_time).trim(),
      String(sub_header || "").trim() || null,
      JSON.stringify(tagsFinal),
      String(description_news).trim(),
      heroUrl,
      JSON.stringify(galleryUrls),
    ];

    const [result] = await pool.execute(sql, params);

    return res.status(201).json({
      ok: true,
      idnews: result.insertId,
      data: {
        idnews: result.insertId,
        header_news: String(header_news).trim(),
        category: String(category).trim(),
        date_time: String(date_time).trim(),
        sub_header: String(sub_header || "").trim() || null,
        tags: tagsFinal,
        description_news: String(description_news).trim(),
        hero_img: heroUrl,
        hero_img_url: absUrl(req, heroUrl),
        gallery: galleryUrls,
        gallery_urls: galleryUrls.map((item) => absUrl(req, item)),
      },
    });
  } catch (err) {
    console.error("INSERT NEWS ERROR:", {
      code: err?.code,
      message: err?.message,
    });

    await cleanupFiles(createdRels);
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} ORDER BY idnews DESC`);
    return res.json({ ok: true, data: rows.map((row) => normalizeNewsRow(req, row)) });
  } catch (err) {
    console.error("GET NEWS ERROR:", {
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

    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    return res.json({ ok: true, data: normalizeNewsRow(req, rows[0]) });
  } catch (err) {
    console.error("GET NEWS BY ID ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

router.patch("/:id", uploadNews, async (req, res, next) => {
  let newHeroRel = "";
  let newGalleryRels = [];
  const createdRels = [];

  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const oldRow = rows[0];

    const oldHeroRel = String(oldRow?.hero_img || "").trim();
    const oldTags = safeJsonArray(parseJsonMaybe(oldRow?.tags, oldRow?.tags), []);
    const oldGallery = safeJsonArray(parseJsonMaybe(oldRow?.gallery, oldRow?.gallery), []);

    const header_news =
      req.body?.header_news !== undefined
        ? String(req.body.header_news || "").trim()
        : String(oldRow?.header_news || "").trim();

    const category =
      req.body?.category !== undefined
        ? String(req.body.category || "").trim()
        : String(oldRow?.category || "").trim();

    const date_time =
      req.body?.date_time !== undefined
        ? String(req.body.date_time || "").trim()
        : String(oldRow?.date_time || "").trim();

    const sub_header =
      req.body?.sub_header !== undefined
        ? String(req.body.sub_header || "").trim() || null
        : String(oldRow?.sub_header || "").trim() || null;

    let tagsFinal = oldTags;
    if (req.body?.tags !== undefined) {
      tagsFinal = parseTagsInput(req.body.tags);
    }

    const description_news =
      req.body?.description_news !== undefined
        ? String(req.body.description_news || "").trim()
        : String(oldRow?.description_news || "").trim();

    if (!header_news) {
      throw createHttpError(400, "header_news is required");
    }
    if (!category) {
      throw createHttpError(400, "category is required");
    }
    if (!date_time) {
      throw createHttpError(400, "date_time is required");
    }
    if (!description_news) {
      throw createHttpError(400, "description_news is required");
    }

    const heroFile = pickFirst(req.files?.hero_img);
    const heroRemove = req.body?.hero_remove !== undefined ? normalize01(req.body.hero_remove, 0) : 0;

    let heroFinal = oldHeroRel;

    if (heroFile) {
      const heroRelOld = `/uploads/news/${heroFile.filename}`;
      const heroRelNewCandidate = `/uploads/news/${replaceExtToWebp(heroFile.filename)}`;

      const conv = await convertUploadToWebp(heroFile, heroRelOld, heroRelNewCandidate);
      newHeroRel = conv.relFinal;
      heroFinal = conv.relFinal;
      createdRels.push(conv.relFinal);
    } else if (heroRemove === 1) {
      throw createHttpError(400, "hero_img cannot be removed because this field is required");
    } else if (req.body?.keep_hero_img !== undefined) {
      const keepHero = String(req.body.keep_hero_img || "").trim();
      heroFinal = keepHero || oldHeroRel;
    }

    if (!heroFinal) {
      throw createHttpError(400, "hero_img is required");
    }

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];

    newGalleryRels = [];
    for (const file of galleryFiles) {
      const relOld = `/uploads/news/gallery/${file.filename}`;
      const relNew = `/uploads/news/gallery/${replaceExtToWebp(file.filename)}`;
      const conv = await convertUploadToWebp(file, relOld, relNew);

      newGalleryRels.push(conv.relFinal);
      createdRels.push(conv.relFinal);
    }

    let keepGallery = null;
    if (req.body?.keep_gallery !== undefined) {
      keepGallery = parseKeepGalleryInput(req.body.keep_gallery);
    }

    let galleryFinal = oldGallery;
    if (keepGallery !== null || newGalleryRels.length > 0) {
      const baseGallery = keepGallery !== null ? keepGallery : oldGallery;
      galleryFinal = [...baseGallery, ...newGalleryRels];
    }

    const sql = `
      UPDATE ${NEWS_TABLE}
      SET
        header_news = ?,
        category = ?,
        date_time = ?,
        sub_header = ?,
        tags = CAST(? AS JSON),
        description_news = ?,
        hero_img = ?,
        gallery = CAST(? AS JSON)
      WHERE idnews = ?
    `;

    const params = [
      header_news,
      category,
      date_time,
      sub_header,
      JSON.stringify(tagsFinal),
      description_news,
      heroFinal,
      JSON.stringify(Array.isArray(galleryFinal) ? galleryFinal : []),
      id,
    ];

    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    if (newHeroRel && oldHeroRel && oldHeroRel !== newHeroRel) {
      await deleteUploadRelSafe(oldHeroRel).catch(() => {});
    }

    if (keepGallery !== null || newGalleryRels.length > 0) {
      const removedGallery = (Array.isArray(oldGallery) ? oldGallery : []).filter((rel) => !galleryFinal.includes(rel));
      for (const rel of removedGallery) {
        await deleteUploadRelSafe(rel).catch(() => {});
      }
    }

    const [updatedRows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    return res.json({ ok: true, message: "Updated", data: normalizeNewsRow(req, updatedRows[0]) });
  } catch (err) {
    console.error("PATCH NEWS ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });

    await cleanupFiles(createdRels);
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(`SELECT hero_img, gallery FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const heroRel = rows[0]?.hero_img || "";
    const galleryRaw = rows[0]?.gallery;
    const galleryArr = safeJsonArray(parseJsonMaybe(galleryRaw, galleryRaw), []);

    const [result] = await pool.execute(`DELETE FROM ${NEWS_TABLE} WHERE idnews = ?`, [id]);
    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    await deleteUploadRelSafe(heroRel).catch(() => {});
    for (const rel of galleryArr) {
      await deleteUploadRelSafe(rel).catch(() => {});
    }

    return res.json({
      ok: true,
      message: "Deleted",
      idnews: id,
      deleted_files: {
        hero_img: heroRel || null,
        gallery: Array.isArray(galleryArr) ? galleryArr : [],
      },
    });
  } catch (err) {
    console.error("DELETE NEWS ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

module.exports = router;