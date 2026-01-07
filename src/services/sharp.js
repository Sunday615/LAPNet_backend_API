// src/services/sharp.js
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("⚠️ sharp not installed. /api/optimize will return 501. Run: npm i sharp");
}

function getSharp() {
  return sharp;
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

module.exports = { getSharp, convertDiskImageToWebpOrThrow };
