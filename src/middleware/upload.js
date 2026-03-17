// src/middleware/upload.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const {
  UPLOAD_DIR,
  MEMBER_DIR,
  NEWS_DIR,
  NEWS_GALLERY_DIR,
  ANNOUNCEMENT_DIR,
} = require("../config/paths");

const MAX_DISK_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE || 10 * 1024 * 1024);
const MAX_MEMORY_FILE_SIZE = Number(process.env.UPLOAD_MEMORY_MAX_FILE_SIZE || 15 * 1024 * 1024);

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getAnnouncementImageFields() {
  return new Set(["image", "imageurl", "imageUrl", "Image_url", "Image"]);
}

function isAnnouncementImageUpload(req, file) {
  const url = String(req.originalUrl || "");
  return url.startsWith("/api/announcement") && getAnnouncementImageFields().has(file.fieldname);
}

function resolveUploadTarget(req, file) {
  if (isAnnouncementImageUpload(req, file)) {
    return {
      dir: ANNOUNCEMENT_DIR,
      prefix: "announcement",
    };
  }

  if (file.fieldname === "image") {
    return {
      dir: MEMBER_DIR,
      prefix: "member",
    };
  }

  if (file.fieldname === "hero_img") {
    return {
      dir: NEWS_DIR,
      prefix: "news_hero",
    };
  }

  if (file.fieldname === "gallery_files[]" || file.fieldname === "gallery_files") {
    return {
      dir: NEWS_GALLERY_DIR,
      prefix: "news_gallery",
    };
  }

  return {
    dir: UPLOAD_DIR,
    prefix: "file",
  };
}

function getSafeExtension(file) {
  return ALLOWED_IMAGE_TYPES[file.mimetype] || "";
}

function createSafeFilename(req, file) {
  const { prefix } = resolveUploadTarget(req, file);
  const extension = getSafeExtension(file);
  const uniqueId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

  return `${prefix}_${Date.now()}_${uniqueId}${extension}`;
}

function imageFileFilter(req, file, cb) {
  const isAllowed = Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_TYPES, file.mimetype);

  if (!isAllowed) {
    return cb(new Error("Only JPG, PNG, WEBP, GIF, and AVIF image files are allowed"));
  }

  return cb(null, true);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { dir } = resolveUploadTarget(req, file);
      return cb(null, ensureDir(dir));
    } catch (error) {
      return cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      return cb(null, createSafeFilename(req, file));
    } catch (error) {
      return cb(error);
    }
  },
});

function createUploader({ useMemoryStorage = false, maxFileSize }) {
  return multer({
    storage: useMemoryStorage ? multer.memoryStorage() : storage,
    limits: {
      fileSize: maxFileSize,
      files: Number(process.env.UPLOAD_MAX_FILES || 10),
    },
    fileFilter: imageFileFilter,
  });
}

const upload = createUploader({
  useMemoryStorage: false,
  maxFileSize: MAX_DISK_FILE_SIZE,
});

const uploadMem = createUploader({
  useMemoryStorage: true,
  maxFileSize: MAX_MEMORY_FILE_SIZE,
});

module.exports = {
  upload,
  uploadMem,
};