// src/routes/news.js
const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");

const pool = require("../db/pool");
const { NEWS_TABLE } = require("../config/tables");
const { upload } = require("../middleware/upload");
const { deleteUploadRelSafe } = require("../utils/files");
const {
  normalizeNewsRow,
  safeJson,
  safeJsonArray,
  parseJsonMaybe,
  pickFirst,
  normalize01,
} = require("../utils/normalize");

const router = express.Router();

/**
 * Project root assumption:
 * - This file is in: src/routes/news.js
 * - Upload folder is in: <projectRoot>/uploads/...
 */
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

async function ensureDir(dirAbs) {
  try {
    await fs.mkdir(dirAbs, { recursive: true });
  } catch (_) {}
}

function isWebpFilename(name) {
  return String(name || "").toLowerCase().endsWith(".webp");
}

function replaceExtToWebp(filename) {
  const base = String(filename || "").replace(/\.[^.]+$/, "");
  return `${base}.webp`;
}

function relToAbs(rel) {
  const clean = String(rel || "").replace(/^[\\/]+/, ""); // remove leading "/" or "\"
  return path.join(PROJECT_ROOT, clean);
}

/**
 * Convert uploaded file (multer disk file) to .webp and return new relative url.
 * - Keeps the same folder.
 * - Deletes the original uploaded file after successful conversion.
 */
async function convertUploadToWebp(file, relOld, relNew) {
  if (!file) return { relFinal: relOld, converted: false };

  // If already .webp by name, keep it (still safe)
  if (isWebpFilename(file.filename) || isWebpFilename(relOld)) {
    return { relFinal: relOld, converted: false };
  }

  const absNew = relToAbs(relNew);
  const absNewDir = path.dirname(absNew);
  await ensureDir(absNewDir);

  // multer diskStorage typically provides file.path
  const srcAbs = file.path ? path.resolve(file.path) : relToAbs(relOld);

  // Convert -> write .webp
  await sharp(srcAbs)
    .rotate() // keep orientation
    .webp({ quality: 82 })
    .toFile(absNew);

  // Remove original file safely
  await deleteUploadRelSafe(relOld);

  return { relFinal: relNew, converted: true };
}

const uploadNews = upload.fields([
  { name: "hero_img", maxCount: 1 },
  { name: "gallery_files[]", maxCount: 30 },
  { name: "gallery_files", maxCount: 30 },
]);

// POST /api/news  (alias /api/news/insert)
router.post(["/insert", "/"], uploadNews, async (req, res) => {
  // Track newly-created files for cleanup on error
  const createdRels = [];

  try {
    const { header_news, category, date_time, sub_header = "", tags = "[]", description_news } = req.body || {};

    if (!header_news?.trim()) return res.status(400).json({ ok: false, message: "header_news is required" });
    if (!category?.trim()) return res.status(400).json({ ok: false, message: "category is required" });
    if (!date_time?.trim()) return res.status(400).json({ ok: false, message: "date_time is required" });
    if (!description_news?.trim()) return res.status(400).json({ ok: false, message: "description_news is required" });

    const heroFile = pickFirst(req.files?.hero_img);
    if (!heroFile) return res.status(400).json({ ok: false, message: "hero_img file is required" });

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];

    // Build original rel paths (as your system expects)
    const heroRelOld = `/uploads/news/${heroFile.filename}`;
    const heroWebpName = replaceExtToWebp(heroFile.filename);
    const heroRelNew = `/uploads/news/${heroWebpName}`;

    // Convert hero -> webp
    const heroConv = await convertUploadToWebp(heroFile, heroRelOld, heroRelNew);
    const heroUrl = heroConv.relFinal;
    createdRels.push(heroUrl);

    // Gallery convert -> webp
    const galleryUrls = [];
    for (const f of galleryFiles) {
      const relOld = `/uploads/news/gallery/${f.filename}`;
      const relNew = `/uploads/news/gallery/${replaceExtToWebp(f.filename)}`;

      const conv = await convertUploadToWebp(f, relOld, relNew);
      galleryUrls.push(conv.relFinal);
      createdRels.push(conv.relFinal);
    }

    const tagsArr = safeJson(tags, []);
    const tagsFinal = Array.isArray(tagsArr) ? tagsArr : [];

    const sql = `
      INSERT INTO ${NEWS_TABLE}
      (header_news, category, date_time, sub_header, tags, description_news, hero_img, gallery)
      VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON))
    `;

    const params = [
      header_news.trim(),
      category.trim(),
      date_time.trim(),
      (sub_header || "").trim() || null,
      JSON.stringify(tagsFinal),
      description_news,
      heroUrl,
      JSON.stringify(galleryUrls),
    ];

    const [result] = await pool.execute(sql, params);

    res.status(201).json({
      ok: true,
      idnews: result.insertId,
      data: {
        idnews: result.insertId,
        header_news: header_news.trim(),
        category: category.trim(),
        date_time: date_time.trim(),
        sub_header: (sub_header || "").trim() || null,
        tags: tagsFinal,
        description_news,
        hero_img: heroUrl,
        hero_img_url: require("../utils/url").absUrl(req, heroUrl),
        gallery: galleryUrls,
        gallery_urls: galleryUrls.map((x) => require("../utils/url").absUrl(req, x)),
      },
    });
  } catch (err) {
    console.error("INSERT NEWS ERROR:", err);

    // Cleanup any files created by conversion
    for (const rel of createdRels) {
      await deleteUploadRelSafe(rel);
    }

    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/news
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} ORDER BY idnews DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeNewsRow(req, r)) });
  } catch (err) {
    console.error("GET NEWS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/news/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, data: normalizeNewsRow(req, rows[0]) });
  } catch (err) {
    console.error("GET NEWS BY ID ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// PATCH /api/news/:id
router.patch("/:id", uploadNews, async (req, res) => {
  let newHeroRel = "";
  let newGalleryRels = [];

  // Track conversion outputs for cleanup on error
  const createdRels = [];

  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const oldRow = rows[0];

    const oldHeroRel = String(oldRow?.hero_img || "").trim();
    const oldTags = safeJsonArray(parseJsonMaybe(oldRow?.tags, oldRow?.tags), []);
    const oldGallery = safeJsonArray(parseJsonMaybe(oldRow?.gallery, oldRow?.gallery), []);

    const header_news =
      req.body?.header_news !== undefined
        ? String(req.body.header_news || "").trim()
        : String(oldRow?.header_news || "").trim();

    const category =
      req.body?.category !== undefined ? String(req.body.category || "").trim() : String(oldRow?.category || "").trim();

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
      const tagsArr = safeJson(req.body.tags, []);
      tagsFinal = Array.isArray(tagsArr) ? tagsArr : [];
    }

    const description_news =
      req.body?.description_news !== undefined
        ? String(req.body.description_news || "").trim()
        : String(oldRow?.description_news || "").trim();

    if (!header_news) return res.status(400).json({ ok: false, message: "header_news is required" });
    if (!category) return res.status(400).json({ ok: false, message: "category is required" });
    if (!date_time) return res.status(400).json({ ok: false, message: "date_time is required" });
    if (!description_news) return res.status(400).json({ ok: false, message: "description_news is required" });

    const heroFile = pickFirst(req.files?.hero_img);
    const heroRemove = req.body?.hero_remove !== undefined ? normalize01(req.body.hero_remove, 0) : 0;

    let heroFinal = oldHeroRel;

    if (heroFile) {
      const heroRelOld = `/uploads/news/${heroFile.filename}`;
      const heroRelNewCandidate = `/uploads/news/${replaceExtToWebp(heroFile.filename)}`;

      const conv = await convertUploadToWebp(heroFile, heroRelOld, heroRelNewCandidate);
      newHeroRel = conv.relFinal; // for old deletion logic below
      heroFinal = conv.relFinal;

      createdRels.push(conv.relFinal);
    } else if (heroRemove === 1) {
      heroFinal = null;
    } else if (req.body?.keep_hero_img !== undefined) {
      const keep = String(req.body.keep_hero_img || "").trim();
      heroFinal = keep || oldHeroRel;
    }

    if (!heroFinal) return res.status(400).json({ ok: false, message: "hero_img is required (cannot be empty)" });

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];

    newGalleryRels = [];
    for (const f of galleryFiles) {
      const relOld = `/uploads/news/gallery/${f.filename}`;
      const relNew = `/uploads/news/gallery/${replaceExtToWebp(f.filename)}`;
      const conv = await convertUploadToWebp(f, relOld, relNew);

      newGalleryRels.push(conv.relFinal);
      createdRels.push(conv.relFinal);
    }

    let keepGallery = null;
    if (req.body?.keep_gallery !== undefined) {
      keepGallery = safeJsonArray(parseJsonMaybe(req.body.keep_gallery, req.body.keep_gallery), []);
    }

    let galleryFinal = oldGallery;
    if (keepGallery !== null || newGalleryRels.length) {
      const base = keepGallery !== null ? keepGallery : oldGallery;
      galleryFinal = [...base, ...newGalleryRels];
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
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    // Delete old hero if replaced/removed
    if (newHeroRel && oldHeroRel && oldHeroRel !== newHeroRel) await deleteUploadRelSafe(oldHeroRel);
    if (!heroFinal && oldHeroRel) await deleteUploadRelSafe(oldHeroRel);

    // Delete removed gallery files (only if client provided keep list or uploaded new items)
    if (keepGallery !== null || newGalleryRels.length) {
      const removed = (Array.isArray(oldGallery) ? oldGallery : []).filter((rel) => !galleryFinal.includes(rel));
      for (const rel of removed) await deleteUploadRelSafe(rel);
    }

    const [rows2] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    res.json({ ok: true, message: "Updated", data: normalizeNewsRow(req, rows2[0]) });
  } catch (err) {
    console.error("PATCH NEWS ERROR:", err);

    // Cleanup any converted files created in this request
    for (const rel of createdRels) {
      await deleteUploadRelSafe(rel);
    }

    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// DELETE /api/news/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT hero_img, gallery FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const heroRel = rows[0]?.hero_img || "";
    const galleryRaw = rows[0]?.gallery;
    const galleryArr = safeJsonArray(parseJsonMaybe(galleryRaw, galleryRaw), []);

    const [result] = await pool.execute(`DELETE FROM ${NEWS_TABLE} WHERE idnews = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    await deleteUploadRelSafe(heroRel);
    for (const rel of galleryArr) await deleteUploadRelSafe(rel);

    res.json({
      ok: true,
      message: "Deleted",
      idnews: id,
      deleted_files: { hero_img: heroRel || null, gallery: Array.isArray(galleryArr) ? galleryArr : [] },
    });
  } catch (err) {
    console.error("DELETE NEWS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

module.exports = router;