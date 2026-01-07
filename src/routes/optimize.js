// src/routes/optimize.js
const express = require("express");
const { uploadMem } = require("../middleware/upload");
const { getSharp } = require("../services/sharp");

const router = express.Router();

// ✅ API: Optimize image -> WebP
router.post("/optimize", uploadMem.single("file"), async (req, res) => {
  try {
    const sharp = getSharp();
    if (!sharp) return res.status(501).send("Sharp not installed");

    const preset = String(req.query.preset || "main");
    if (!req.file) return res.status(400).send("Missing file");

    const conf = preset === "gallery" ? { width: 1600, quality: 78 } : { width: 2000, quality: 82 };

    const out = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: conf.width, withoutEnlargement: true })
      .webp({ quality: conf.quality })
      .toBuffer();

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "no-store");
    res.send(out);
  } catch (err) {
    console.error("OPTIMIZE ERROR:", err);
    res.status(500).send("Optimize failed");
  }
});

module.exports = router;
