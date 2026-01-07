// src/utils/files.js
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { UPLOAD_DIR } = require("../config/paths");

// ✅ delete file on disk if it is under /uploads (safe)
async function deleteUploadRelSafe(imageRel) {
  try {
    if (!imageRel || typeof imageRel !== "string") return;
    if (!imageRel.startsWith("/uploads/")) return;

    const relPath = imageRel.replace(/^\/uploads\//, "");
    const diskPath = path.join(UPLOAD_DIR, relPath);

    const normalized = path.normalize(diskPath);
    const base = path.normalize(UPLOAD_DIR + path.sep);
    if (!normalized.startsWith(base)) return;

    await fsp.unlink(normalized).catch(() => {});
  } catch {}
}

module.exports = { deleteUploadRelSafe };
