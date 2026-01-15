// src/middleware/upload.js
const path = require("path");
const multer = require("multer");

const { UPLOAD_DIR, MEMBER_DIR, NEWS_DIR, NEWS_GALLERY_DIR, ANNOUNCEMENT_DIR } = require("../config/paths");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const url = String(req.originalUrl || "");

    // announcement (accept many field names)
    const isAnnouncement = url.startsWith("/api/announcement");
    const isAnnouncementImageField = ["image", "imageurl", "imageUrl", "Image_url", "Image"].includes(file.fieldname);
    if (isAnnouncement && isAnnouncementImageField) return cb(null, ANNOUNCEMENT_DIR);

    // members
    if (file.fieldname === "image") return cb(null, MEMBER_DIR);

    // news
    if (file.fieldname === "hero_img") return cb(null, NEWS_DIR);
 

    // gallery
    if (file.fieldname === "gallery_files[]" || file.fieldname === "gallery_files") return cb(null, NEWS_GALLERY_DIR);

    return cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";

    const url = String(req.originalUrl || "");
    const isAnnouncement = url.startsWith("/api/announcement");
    const isAnnouncementImageField = ["image", "imageurl", "imageUrl", "Image_url", "Image"].includes(file.fieldname);

    const prefix =
      isAnnouncement && isAnnouncementImageField
        ? "announcement"
        : file.fieldname === "image"
        ? "member"
        : file.fieldname === "hero_img"
        ? "news_hero"
        : file.fieldname === "gallery_files[]" || file.fieldname === "gallery_files"
        ? "news_gallery"
        : "file";

    cb(null, `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

module.exports = { upload, uploadMem };
