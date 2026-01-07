// src/config/paths.js
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MEMBER_DIR = path.join(UPLOAD_DIR, "members");
const NEWS_DIR = path.join(UPLOAD_DIR, "news");
const NEWS_GALLERY_DIR = path.join(NEWS_DIR, "gallery");
const ANNOUNCEMENT_DIR = path.join(UPLOAD_DIR, "announcement");

for (const dir of [UPLOAD_DIR, MEMBER_DIR, NEWS_DIR, NEWS_GALLERY_DIR, ANNOUNCEMENT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  UPLOAD_DIR,
  MEMBER_DIR,
  NEWS_DIR,
  NEWS_GALLERY_DIR,
  ANNOUNCEMENT_DIR,
};
