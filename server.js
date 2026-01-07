// server.js (CommonJS)
// ✅ Members + News Insert (multipart/form-data)
// ✅ Optional Sharp Optimize (auto-disable if sharp not installed)
// ✅ Serve /uploads static
// ✅ Parse MySQL JSON columns to real objects on GET
// ✅ Return BOTH relative + absolute image URLs (image_url, hero_img_url, gallery_urls)
// ✅ JOBS_LIST API (table: jobs_list) GET + INSERT + GET by id + PATCH + DELETE
// ✅ Mount jobs_list routes at BOTH: /api/jobs-list AND /api/jobs
// ✅ FIX: Express/router new versions ไม่รับ app.options("*") -> ใช้ app.options(/.*/)
// ✅ FIX: normalize active -> 0/1 เสมอ (รองรับ BIT(1) ที่ออกมาเป็น Buffer)
// ✅ FIX: Add DELETE /api/members/:id so frontend can delete member
// ✅ NEW: Add PATCH /api/members/:id so frontend can EDIT member (multipart + optional image + delete old)
// ✅ FIX (NEW): Add DELETE /api/news/:id so dashboard can delete news + remove hero/gallery files
// ✅ NEW: Add PATCH /api/news/:id (EDIT NEWS) multipart + keep/remove hero/gallery + delete removed files
// ✅ FIX (IMPORTANT): ANNOUNCEMENT API ปรับให้ตรงตารางจริง:
//    table: announcement
//    columns: idannouncement, image, title, description, active, time, timeforshow, linkpath
// ✅ NEW (IMPORTANT FIX): Announcement INSERT/PATCH accept image value in body (imageUrl as string) as well as file upload ✅✅✅

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");

console.log("✅ RUNNING FILE:", __filename);

// ==============================
// ✅ OPTIONAL sharp (won't crash)
// ==============================
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("⚠️ sharp not installed. /api/optimize will return 501. Run: npm i sharp");
}

const app = express();
app.set("trust proxy", true);

// ==============================
// ✅ CORS
// ==============================
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "*").trim();
const corsOptions =
  CORS_ORIGIN === "*"
    ? { origin: true }
    : {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed = CORS_ORIGIN.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return allowed.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"));
      },
    };

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // ✅ FIX

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.originalUrl);
  next();
});

// ==============================
// ✅ MySQL Pool
// ==============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "lapnet",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==============================
// ✅ Table names (safe)
// ==============================
function assertSafeTableName(name, fallback) {
  const v = String(name || fallback || "").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(v)) {
    throw new Error(`Invalid table name: "${v}". Only [a-zA-Z0-9_] allowed.`);
  }
  return v;
}

const NEWS_TABLE = assertSafeTableName(process.env.NEWS_TABLE, "news");
const MEMBERS_TABLE = assertSafeTableName(process.env.MEMBERS_TABLE, "members");
const ANNOUNCEMENT_TABLE = assertSafeTableName(process.env.ANNOUNCEMENT_TABLE, "announcement");
const JOBS_LIST_TABLE = "jobs_list";

// ==============================
// ✅ Upload folders
// ==============================
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const MEMBER_DIR = path.join(UPLOAD_DIR, "members");
const NEWS_DIR = path.join(UPLOAD_DIR, "news");
const NEWS_GALLERY_DIR = path.join(NEWS_DIR, "gallery");
const ANNOUNCEMENT_DIR = path.join(UPLOAD_DIR, "announcement");

for (const dir of [UPLOAD_DIR, MEMBER_DIR, NEWS_DIR, NEWS_GALLERY_DIR, ANNOUNCEMENT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ✅ Serve uploaded files
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: "7d",
    etag: true,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (CORS_ORIGIN === "*") res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

// ==============================
// ✅ Helpers
// ==============================
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

function absUrl(req, rel) {
  if (!rel) return "";
  const s = String(rel).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  if (s.startsWith("/")) return `${base}${s}`;
  return `${base}/${s}`;
}

// ✅ only accept http/https (and allow empty)
function isValidUrl(v) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseJsonMaybe(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return fallback;
  const s = v.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function safeJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeJsonArray(v, fallback = []) {
  if (v == null || v === "") return fallback;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function pickFirst(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// ✅ normalize BIT/TINY/boolean/string -> 0/1
function normalize01(raw, def = 0) {
  if (raw === undefined || raw === null || raw === "") return def;

  if (Buffer.isBuffer(raw)) return raw[0] === 1 ? 1 : 0;
  if (raw instanceof Uint8Array) return raw[0] === 1 ? 1 : 0;

  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (typeof raw === "number") return raw === 1 ? 1 : 0;

  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "1" || s === "true" || s === "on" || s === "active" ? 1 : 0;
  }

  return def;
}

/**
 * ✅ parse array from multipart/form-data fields:
 * - productOptionsATM = '["a","b"]'
 * - productOptionsATM[] = a (repeated)
 * - productOptionsATM[0]=a, productOptionsATM[1]=b
 */
function parseFormArrayFromBody(body, baseName) {
  const out = [];
  if (!body || typeof body !== "object") return out;

  const pushVal = (v) => {
    if (v === undefined || v === null) return;

    if (Array.isArray(v)) {
      for (const it of v) pushVal(it);
      return;
    }

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return;

      if (
        (s.startsWith("[") && s.endsWith("]")) ||
        (s.startsWith("{") && s.endsWith("}")) ||
        (s.startsWith('"') && s.endsWith('"'))
      ) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return pushVal(parsed);
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) return pushVal(parsed.items);
          if (typeof parsed === "string") {
            const ss = parsed.trim();
            if (ss) out.push(ss);
            return;
          }
        } catch { }
      }

      out.push(s);
      return;
    }

    const ss = String(v).trim();
    if (ss) out.push(ss);
  };

  pushVal(body[baseName]);
  pushVal(body[`${baseName}[]`]);

  const re = new RegExp(`^${baseName}\\[(\\d+)\\]$`);
  const indexed = [];
  for (const [k, v] of Object.entries(body)) {
    const m = k.match(re);
    if (!m) continue;
    indexed.push({ idx: Number(m[1]), v });
  }
  indexed.sort((a, b) => a.idx - b.idx);
  for (const it of indexed) pushVal(it.v);

  const cleaned = [];
  const seen = new Set();
  for (const x of out) {
    const s = String(x || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
  }
  return cleaned;
}

// ✅ parse {items:[...]} from object or JSON string (also accepts array or single string)
function parseItemsObj(v, fallbackItems = []) {
  const parsed = parseJsonMaybe(v, v);

  let items = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } else if (typeof parsed === "string") {
    const s = parsed.trim();
    items = s ? [s] : [];
  } else {
    items = fallbackItems;
  }

  const cleaned = items.map((x) => String(x || "").trim()).filter(Boolean);
  return { items: cleaned };
}

function classifyProductsFromFilterproduct(fp) {
  const CardATM = { items: [] };
  const Mbbankking = { items: [] };
  const Crossborder = { items: [] };

  for (const item of fp) {
    const s = String(item || "").trim();
    if (!s) continue;

    if (s.includes("ATM") || s.includes("ຕູ້ ATM")) CardATM.items.push(s);
    else if (s.includes("ເທິງມືຖື") || s.includes("Mobile") || s.includes("QR CODE")) Mbbankking.items.push(s);

    if (
      s.includes("ຂ້າມແດນ") ||
      s.includes("ກຳປູເຈຍ") ||
      s.includes("ໄທ") ||
      s.includes("ຫວຽດນາມ") ||
      s.includes("ຈີນ")
    ) {
      Crossborder.items.push(s);
    }
  }

  CardATM.items = Array.from(new Set(CardATM.items));
  Mbbankking.items = Array.from(new Set(Mbbankking.items));
  Crossborder.items = Array.from(new Set(Crossborder.items));

  return { CardATM, Mbbankking, Crossborder };
}

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

    await fsp.unlink(normalized).catch(() => { });
  } catch { }
}

function normalizeMemberRow(req, row) {
  const r = { ...row };

  r.Color = parseJsonMaybe(r.Color, r.Color);
  r.CardATM = parseItemsObj(r.CardATM, []);
  r.Mbbankking = parseItemsObj(r.Mbbankking, []);
  r.Crossborder = parseItemsObj(r.Crossborder, []);

  if (r.memberATM !== undefined) r.memberATM = normalize01(r.memberATM, 0);
  if (r.membermobile !== undefined) r.membermobile = normalize01(r.membermobile, 0);
  if (r.membercrossborder !== undefined) r.membercrossborder = normalize01(r.membercrossborder, 0);

  r.id = r.idmember ?? r.id ?? r._id ?? r.uuid ?? null;
  r.image_url = absUrl(req, r.image);

  return r;
}

function normalizeNewsRow(req, row) {
  const r = { ...row };

  r.tags = parseJsonMaybe(r.tags, r.tags);
  r.gallery = parseJsonMaybe(r.gallery, r.gallery);

  r.hero_img_url = absUrl(req, r.hero_img);
  r.gallery_urls = Array.isArray(r.gallery) ? r.gallery.map((x) => absUrl(req, x)) : [];

  return r;
}

function sqlDateTime(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(
      v.getMinutes()
    )}:${pad(v.getSeconds())}`;
  }
  return String(v);
}

function normalizeJobsFeatures(raw, headingOverride) {
  // raw may be: string(JSON), array, object
  const parsed = parseJsonMaybe(raw, raw);

  let heading = null;
  let items = [];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    heading = parsed.heading ?? parsed.features_heading ?? parsed.title ?? null;
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } else if (typeof parsed === "string") {
    // fallback: split by newline
    const s = parsed.trim();
    if (s) items = s.split(/\r?\n/g).map((x) => x.trim()).filter(Boolean);
  }

  // apply headingOverride if provided
  if (headingOverride !== undefined) {
    const h = String(headingOverride || "").trim();
    heading = h ? h : null;
  }

  // clean items
  items = (items || []).map((x) => String(x || "").trim()).filter(Boolean);

  return { heading, items };
}

function normalizeJobsListRow(row) {
  const r = { ...row };

  // ✅ Normalize time (avoid Date object causing wrong display)
  r.time = sqlDateTime(r.time);

  // ✅ Normalize features to OBJECT always: {heading, items}
  const f = normalizeJobsFeatures(r.features);
  r.features = f;               // always object now
  r.features_heading = f.heading;
  r.features_items = f.items;

  // ✅ normalize active to 0/1
  let a = r.active;
  if (Buffer.isBuffer(a)) a = a[0];
  if (a instanceof Uint8Array) a = a[0];
  r.active = Number(a) === 1 ? 1 : 0;

  return r;
}

// ==============================
// ✅ Convert on-disk image file -> webp (member insert / edit)
// ==============================
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

  await fsp.unlink(filePath).catch(() => { });
  return outPath;
}

// ==============================
// ✅ Multer config (disk)
// ==============================
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

// ==============================
// ✅ API: Optimize image -> WebP
// ==============================
app.post("/api/optimize", uploadMem.single("file"), async (req, res) => {
  try {
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

// ======================================================================
// ✅ MEMBERS API
// ======================================================================
app.post("/api/members", upload.single("image"), async (req, res) => {
  let uploadedDiskPath = "";
  try {
    const { bankcode, title, subtitle, link1, link2, gradA, gradB } = req.body;

    if (!bankcode?.trim()) return res.status(400).json({ ok: false, message: "bankcode is required" });
    if (!title?.trim()) return res.status(400).json({ ok: false, message: "title is required" });
    if (!isValidUrl(link1)) return res.status(400).json({ ok: false, message: "link1 must be URL (http/https)" });
    if (!isValidUrl(link2)) return res.status(400).json({ ok: false, message: "link2 must be URL (http/https)" });

    const productOptionsATM = parseFormArrayFromBody(req.body, "productOptionsATM");
    const hasProductOptionsATM = productOptionsATM.length > 0;

    const hasExplicitItems =
      req.body?.CardATM !== undefined ||
      req.body?.Mbbankking !== undefined ||
      req.body?.Mbbanking !== undefined ||
      req.body?.Crossborder !== undefined ||
      hasProductOptionsATM;

    let CardATM = { items: [] };
    let Mbbankking = { items: [] };
    let Crossborder = { items: [] };

    if (hasExplicitItems) {
      if (req.body.CardATM !== undefined) CardATM = parseItemsObj(req.body.CardATM, []);
      else if (hasProductOptionsATM) CardATM = parseItemsObj(productOptionsATM, []);
      else CardATM = { items: [] };

      Mbbankking = parseItemsObj(req.body.Mbbankking ?? req.body.Mbbanking, []);
      Crossborder = parseItemsObj(req.body.Crossborder, []);
    } else {
      const fp = safeJson(req.body?.filterproduct, []);
      if (!Array.isArray(fp)) return res.status(400).json({ ok: false, message: "filterproduct must be JSON array" });

      const classified = classifyProductsFromFilterproduct(fp);
      CardATM = classified.CardATM;
      Mbbankking = classified.Mbbankking;
      Crossborder = classified.Crossborder;
    }

    const memberATM = CardATM.items.length > 0 ? 1 : 0;
    const membermobile = Mbbankking.items.length > 0 ? 1 : 0;
    const membercrossborder = Crossborder.items.length > 0 ? 1 : 0;

    const Color = {
      primary: (gradA || "").trim() || "#38bdf8",
      secondary: (gradB || "").trim() || "#6366f1",
    };

    let imageUrl = "";

    if (req.file) {
      uploadedDiskPath = req.file.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageUrl = `/uploads/members/${outFile}`;
      uploadedDiskPath = outPath;
    }

    const sql = `
      INSERT INTO ${MEMBERS_TABLE}
      (
        Bankcode, BanknameLA, BanknameEN, Color,
        LinkFB, LinkWeb,
        CardATM, Mbbankking, Crossborder,
        memberATM, membermobile, membercrossborder,
        image
      )
      VALUES (
        ?, ?, ?, CAST(? AS JSON),
        ?, ?,
        CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON),
        ?, ?, ?,
        ?
      )
    `;

    const params = [
      bankcode.trim(),
      title.trim(),
      (subtitle || "").trim(),
      JSON.stringify(Color),
      (link1 || "").trim(),
      (link2 || "").trim(),
      JSON.stringify(parseItemsObj(CardATM, [])),
      JSON.stringify(parseItemsObj(Mbbankking, [])),
      JSON.stringify(parseItemsObj(Crossborder, [])),
      memberATM,
      membermobile,
      membercrossborder,
      imageUrl,
    ];

    const [result] = await pool.execute(sql, params);

    res.status(201).json({
      ok: true,
      idmember: result.insertId,
      image: imageUrl,
      image_url: absUrl(req, imageUrl),
      flags: { memberATM, membermobile, membercrossborder },
      items: {
        CardATM: parseItemsObj(CardATM, []),
        Mbbankking: parseItemsObj(Mbbankking, []),
        Crossborder: parseItemsObj(Crossborder, []),
      },
    });
  } catch (err) {
    console.error("INSERT MEMBER ERROR:", err);
    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => { });
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/members", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} ORDER BY idmember DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeMemberRow(req, r)) });
  } catch (err) {
    console.error("GET MEMBERS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/members/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, data: normalizeMemberRow(req, rows[0]) });
  } catch (err) {
    console.error("GET MEMBER BY ID ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.patch("/api/members/:id", upload.single("image"), async (req, res) => {
  let uploadedDiskPath = "";
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const oldRow = rows[0];
    const oldImageRel = oldRow?.image || "";

    const bankcodeRaw = req.body?.bankcode;
    const titleRaw = req.body?.title;
    const subtitleRaw = req.body?.subtitle;
    const link1Raw = req.body?.link1;
    const link2Raw = req.body?.link2;
    const gradARaw = req.body?.gradA;
    const gradBRaw = req.body?.gradB;

    const filterproductRaw = req.body?.filterproduct;

    const productOptionsATM = parseFormArrayFromBody(req.body, "productOptionsATM");
    const hasProductOptionsATM = productOptionsATM.length > 0;

    const hasExplicitItems =
      req.body?.CardATM !== undefined ||
      req.body?.Mbbankking !== undefined ||
      req.body?.Mbbanking !== undefined ||
      req.body?.Crossborder !== undefined ||
      hasProductOptionsATM;

    const bankcode =
      bankcodeRaw !== undefined ? String(bankcodeRaw || "").trim() : String(oldRow.Bankcode || "").trim();
    const title = titleRaw !== undefined ? String(titleRaw || "").trim() : String(oldRow.BanknameLA || "").trim();
    const subtitle =
      subtitleRaw !== undefined ? String(subtitleRaw || "").trim() : String(oldRow.BanknameEN || "").trim();

    const link1 = link1Raw !== undefined ? String(link1Raw || "").trim() : String(oldRow.LinkFB || "").trim();
    const link2 = link2Raw !== undefined ? String(link2Raw || "").trim() : String(oldRow.LinkWeb || "").trim();

    if (!bankcode) return res.status(400).json({ ok: false, message: "bankcode is required" });
    if (!title) return res.status(400).json({ ok: false, message: "title is required" });
    if (!isValidUrl(link1)) return res.status(400).json({ ok: false, message: "link1 must be URL (http/https)" });
    if (!isValidUrl(link2)) return res.status(400).json({ ok: false, message: "link2 must be URL (http/https)" });

    const oldColor = parseJsonMaybe(oldRow.Color, oldRow.Color) || {};
    const Color = {
      primary:
        gradARaw !== undefined
          ? String(gradARaw || "").trim() || oldColor.primary || "#38bdf8"
          : oldColor.primary || "#38bdf8",
      secondary:
        gradBRaw !== undefined
          ? String(gradBRaw || "").trim() || oldColor.secondary || "#6366f1"
          : oldColor.secondary || "#6366f1",
    };

    let CardATM = parseItemsObj(oldRow.CardATM, []);
    let Mbbankking = parseItemsObj(oldRow.Mbbankking, []);
    let Crossborder = parseItemsObj(oldRow.Crossborder, []);

    if (hasExplicitItems) {
      if (req.body?.CardATM !== undefined) CardATM = parseItemsObj(req.body.CardATM, CardATM.items);
      else if (hasProductOptionsATM) CardATM = parseItemsObj(productOptionsATM, CardATM.items);

      if (req.body?.Mbbankking !== undefined || req.body?.Mbbanking !== undefined) {
        Mbbankking = parseItemsObj(req.body.Mbbankking ?? req.body.Mbbanking, Mbbankking.items);
      }
      if (req.body?.Crossborder !== undefined) {
        Crossborder = parseItemsObj(req.body.Crossborder, Crossborder.items);
      }
    } else if (filterproductRaw !== undefined) {
      const fp = safeJson(filterproductRaw, []);
      if (!Array.isArray(fp)) return res.status(400).json({ ok: false, message: "filterproduct must be JSON array" });

      const classified = classifyProductsFromFilterproduct(fp);
      CardATM = parseItemsObj(classified.CardATM, []);
      Mbbankking = parseItemsObj(classified.Mbbankking, []);
      Crossborder = parseItemsObj(classified.Crossborder, []);
    }

    const memberATM = CardATM?.items?.length ? 1 : 0;
    const membermobile = Mbbankking?.items?.length ? 1 : 0;
    const membercrossborder = Crossborder?.items?.length ? 1 : 0;

    let imageUrl = oldImageRel || "";

    if (req.file) {
      uploadedDiskPath = req.file.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageUrl = `/uploads/members/${outFile}`;
      uploadedDiskPath = outPath;
    }

    const sql = `
      UPDATE ${MEMBERS_TABLE}
      SET
        Bankcode = ?,
        BanknameLA = ?,
        BanknameEN = ?,
        Color = CAST(? AS JSON),
        LinkFB = ?,
        LinkWeb = ?,
        CardATM = CAST(? AS JSON),
        Mbbankking = CAST(? AS JSON),
        Crossborder = CAST(? AS JSON),
        memberATM = ?,
        membermobile = ?,
        membercrossborder = ?,
        image = ?
      WHERE idmember = ?
    `;

    const params = [
      bankcode,
      title,
      subtitle,
      JSON.stringify(Color),
      link1,
      link2,
      JSON.stringify(parseItemsObj(CardATM, [])),
      JSON.stringify(parseItemsObj(Mbbankking, [])),
      JSON.stringify(parseItemsObj(Crossborder, [])),
      memberATM,
      membermobile,
      membercrossborder,
      imageUrl,
      id,
    ];

    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    if (req.file && oldImageRel && oldImageRel !== imageUrl) {
      await deleteUploadRelSafe(oldImageRel);
    }

    const [rows2] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    res.json({ ok: true, message: "Updated", data: normalizeMemberRow(req, rows2[0]) });
  } catch (err) {
    console.error("PATCH MEMBER ERROR:", err);
    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => { });
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.delete("/api/members/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await pool.query(`SELECT image FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const imageRel = rows[0]?.image || "";

    const [result] = await pool.execute(`DELETE FROM ${MEMBERS_TABLE} WHERE idmember = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    await deleteUploadRelSafe(imageRel);

    res.json({ ok: true, message: "Deleted", idmember: id });
  } catch (err) {
    console.error("DELETE MEMBER ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// ======================================================================
// ✅ NEWS API
// ======================================================================
const uploadNews = upload.fields([
  { name: "hero_img", maxCount: 1 },
  { name: "gallery_files[]", maxCount: 30 },
  { name: "gallery_files", maxCount: 30 },
]);

app.post(["/api/news/insert", "/api/news"], uploadNews, async (req, res) => {
  try {
    const { header_news, category, date_time, sub_header = "", tags = "[]", description_news } = req.body || {};

    if (!header_news?.trim()) return res.status(400).json({ ok: false, message: "header_news is required" });
    if (!category?.trim()) return res.status(400).json({ ok: false, message: "category is required" });
    if (!date_time?.trim()) return res.status(400).json({ ok: false, message: "date_time is required" });
    if (!description_news?.trim()) return res.status(400).json({ ok: false, message: "description_news is required" });

    const heroFile = pickFirst(req.files?.hero_img);
    if (!heroFile) return res.status(400).json({ ok: false, message: "hero_img file is required" });

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];

    const heroUrl = `/uploads/news/${heroFile.filename}`;
    const galleryUrls = galleryFiles.map((f) => `/uploads/news/gallery/${f.filename}`);

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
        hero_img_url: absUrl(req, heroUrl),
        gallery: galleryUrls,
        gallery_urls: galleryUrls.map((x) => absUrl(req, x)),
      },
    });
  } catch (err) {
    console.error("INSERT NEWS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${NEWS_TABLE} ORDER BY idnews DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeNewsRow(req, r)) });
  } catch (err) {
    console.error("GET NEWS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/news/:id", async (req, res) => {
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

// ✅ NEWS PATCH / DELETE
app.patch("/api/news/:id", uploadNews, async (req, res) => {
  let newHeroRel = "";
  let newGalleryRels = [];

  // helper (local to route)
  const normalizeTinyActive = (raw, def = 0) => normalize01(raw, def);

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
    const heroRemove = req.body?.hero_remove !== undefined ? normalizeTinyActive(req.body.hero_remove, 0) : 0;

    let heroFinal = oldHeroRel;

    if (heroFile) {
      newHeroRel = `/uploads/news/${heroFile.filename}`;
      heroFinal = newHeroRel;
    } else if (heroRemove === 1) {
      heroFinal = null;
    } else if (req.body?.keep_hero_img !== undefined) {
      const keep = String(req.body.keep_hero_img || "").trim();
      heroFinal = keep || oldHeroRel;
    }

    if (!heroFinal) return res.status(400).json({ ok: false, message: "hero_img is required (cannot be empty)" });

    const galleryFiles = [...(req.files?.["gallery_files[]"] || []), ...(req.files?.["gallery_files"] || [])];
    newGalleryRels = galleryFiles.map((f) => `/uploads/news/gallery/${f.filename}`);

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

    if (newHeroRel && oldHeroRel && oldHeroRel !== newHeroRel) await deleteUploadRelSafe(oldHeroRel);
    if (!heroFinal && oldHeroRel) await deleteUploadRelSafe(oldHeroRel);

    if (keepGallery !== null || newGalleryRels.length) {
      const removed = (Array.isArray(oldGallery) ? oldGallery : []).filter((rel) => !galleryFinal.includes(rel));
      for (const rel of removed) await deleteUploadRelSafe(rel);
    }

    const [rows2] = await pool.query(`SELECT * FROM ${NEWS_TABLE} WHERE idnews = ? LIMIT 1`, [id]);
    res.json({ ok: true, message: "Updated", data: normalizeNewsRow(req, rows2[0]) });
  } catch (err) {
    console.error("PATCH NEWS ERROR:", err);

    if (newHeroRel) await deleteUploadRelSafe(newHeroRel);
    if (Array.isArray(newGalleryRels) && newGalleryRels.length) {
      for (const rel of newGalleryRels) await deleteUploadRelSafe(rel);
    }

    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.delete("/api/news/:id", async (req, res) => {
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

// ======================================================================
// ✅ ANNOUNCEMENT HELPERS + API (MATCH TABLE STRUCTURE)
// table: announcement
// columns: idannouncement, image, title, description, active, time, timeforshow, linkpath
// ======================================================================
function normalizeTinyActive(raw, def = 0) {
  return normalize01(raw, def);
}

function normalizeTimeForShow(raw, def = 3) {
  if (raw === undefined || raw === null || raw === "") return def;

  let n = raw;
  if (Buffer.isBuffer(n)) n = n[0];
  if (n instanceof Uint8Array) n = n[0];

  const num = Number(String(n).trim());
  if (!Number.isFinite(num)) return def;
  if (num <= 0) return def;

  // ถ้าอยาก "ล็อกค่า" เฉพาะ 3/7/24 ให้ใช้บรรทัดนี้แทน:
  // return [3, 7, 24].includes(num) ? num : def;

  return Math.floor(num);
}

function nowSqlTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function isSqlDatetimeLike(s) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(s || "").trim());
}

function normalizeAnnouncementRow(req, row) {
  const r = { ...row };

  let a = r.active;
  if (Buffer.isBuffer(a)) a = a[0];
  if (a instanceof Uint8Array) a = a[0];
  r.active = Number(a) === 1 ? 1 : 0;

  // ✅ match table fields
  r.image = r.image ?? null;
  r.image_url = r.image ? absUrl(req, r.image) : null;

  r.time = r.time ?? null;

  let tfs = r.timeforshow;
  if (Buffer.isBuffer(tfs)) tfs = tfs[0];
  if (tfs instanceof Uint8Array) tfs = tfs[0];
  const tfsNum = Number(tfs);
  r.timeforshow = Number.isFinite(tfsNum) ? tfsNum : null;

  r.linkpath = r.linkpath ?? null;

  return r;
}

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

// ✅ accept image string in body too
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

  // explicit null/empty => remove (แต่ตาราง image NOT NULL -> route จะ reject)
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

// ✅ INSERT announcement (multipart OR json)
// REQUIRED: image (because table image NOT NULL)
// REQUIRED: timeforshow (table NOT NULL) -> default to 3 if not provided
app.post("/api/announcement", uploadAnnouncement, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const active = normalizeTinyActive(req.body?.active, 0);

    // accept timeforshow from: timeforshow / timeForShow / range / Range / hours
    const tfsRaw =
      req.body?.timeforshow ?? req.body?.timeForShow ?? req.body?.range ?? req.body?.Range ?? req.body?.hours;
    const timeforshow = normalizeTimeForShow(tfsRaw, 3);

    const linkRaw = String(req.body?.linkpath ?? req.body?.linkPath ?? req.body?.link ?? "").trim();
    const linkpath = linkRaw ? linkRaw : null;
    if (!isValidUrl(linkpath)) return res.status(400).json({ ok: false, message: "linkpath must be URL (http/https)" });

    // time: optional (DB has DEFAULT CURRENT_TIMESTAMP)
    const timeRaw = req.body?.time !== undefined ? String(req.body.time || "").trim() : "";
    if (timeRaw && !isSqlDatetimeLike(timeRaw)) {
      return res.status(400).json({ ok: false, message: "time must be 'YYYY-MM-DD HH:mm:ss'" });
    }

    if (!title) return res.status(400).json({ ok: false, message: "title is required" });

    // ✅ image: prefer file, else accept body string
    const imageFile = pickAnnouncementImageFile(req.files);
    let imageFinal = null;

    if (imageFile) {
      imageFinal = `/uploads/announcement/${imageFile.filename}`;
    } else {
      const bodyImgRaw = pickAnnouncementImageBodyValue(req.body);
      const normalized = normalizeAnnouncementImageInput(bodyImgRaw);
      imageFinal = normalized ?? null;
    }

    if (!imageFinal) {
      return res.status(400).json({ ok: false, message: "image is required (file upload or URL/path string)" });
    }

    // Build INSERT (include time only if provided)
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
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/announcement", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${ANNOUNCEMENT_TABLE}\` ORDER BY \`idannouncement\` DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeAnnouncementRow(req, r)) });
  } catch (err) {
    console.error("GET ANNOUNCEMENT ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.get("/api/announcement/:id", async (req, res) => {
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

// ✅ PATCH announcement (JSON or multipart)
// supports: title/description/active/timeforshow/linkpath/time + image(file OR body string)
// NOTE: image NOT NULL -> ไม่อนุญาตให้ remove image ให้เป็นว่าง
app.patch("/api/announcement/:id", uploadAnnouncement, async (req, res) => {
  let uploadedNewRel = "";
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
      const active = normalizeTinyActive(req.body.active, 0);
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
    const imageRemove = imgRemoveRaw !== undefined ? normalizeTinyActive(imgRemoveRaw, 0) : 0;

    let newImageFinal = undefined; // undefined = not changing, string = change

    if (imageFile) {
      uploadedNewRel = `/uploads/announcement/${imageFile.filename}`;
      newImageFinal = uploadedNewRel;
      sets.push("`image` = ?");
      params.push(newImageFinal);
    } else if (bodyImgRaw !== undefined) {
      // body provides image (string path or URL)
      newImageFinal = normalizeAnnouncementImageInput(bodyImgRaw); // may be null
      if (!newImageFinal) {
        return res.status(400).json({ ok: false, message: "image cannot be empty (table image NOT NULL)" });
      }
      sets.push("`image` = ?");
      params.push(newImageFinal);
    } else if (imageRemove === 1) {
      // ✅ REMOVE image: set to empty string (safe for NOT NULL varchar)
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
    if (uploadedNewRel) await deleteUploadRelSafe(uploadedNewRel);
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.delete("/api/announcement/:id", async (req, res) => {
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

// ==============================
// ✅ JOBS_LIST API (table: jobs_list)
// ==============================
const jobsListRouter = express.Router();

jobsListRouter.get("/", async (req, res) => {
  try {
    const sql = `SELECT * FROM \`${JOBS_LIST_TABLE}\` ORDER BY \`job_id\` DESC`;
    const [rows] = await pool.query(sql);
    res.json({ ok: true, data: rows.map(normalizeJobsListRow) });
  } catch (err) {
    console.error("GET JOBS_LIST ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

jobsListRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const sql = `SELECT * FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ? LIMIT 1`;
    const [rows] = await pool.query(sql, [id]);

    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, data: normalizeJobsListRow(rows[0]) });
  } catch (err) {
    console.error("GET JOBS_LIST BY ID ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

jobsListRouter.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    // ✅ load old row first (for heading-only update / keep items)
    const [oldRows] = await pool.query(`SELECT * FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ? LIMIT 1`, [id]);
    if (!oldRows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const oldRow = oldRows[0];
    const oldFeatures = normalizeJobsFeatures(oldRow.features);

    const sets = [];
    const params = [];

    // department
    if (req.body?.department !== undefined) {
      const department = String(req.body.department || "").trim();
      if (!department) return res.status(400).json({ ok: false, message: "department cannot be empty" });
      sets.push("`department` = ?");
      params.push(department);
    }

    // levels
    if (req.body?.levels !== undefined || req.body?.level !== undefined) {
      const levels = String(req.body.levels ?? req.body.level ?? "").trim();
      if (!levels) return res.status(400).json({ ok: false, message: "levels cannot be empty" });
      sets.push("`levels` = ?");
      params.push(levels);
    }

    // time
    if (req.body?.time !== undefined) {
      const time = String(req.body.time || "").trim();
      if (!time) return res.status(400).json({ ok: false, message: "time cannot be empty" });
      sets.push("`time` = ?");
      params.push(time);
    }

    // title
    if (req.body?.title !== undefined || req.body?.position !== undefined || req.body?.role !== undefined) {
      const title = String(req.body.title ?? req.body.position ?? req.body.role ?? "").trim();
      if (!title) return res.status(400).json({ ok: false, message: "title cannot be empty" });
      sets.push("`title` = ?");
      params.push(title);
    }

    // active
    if (req.body?.active !== undefined) {
      const active = normalize01(req.body.active, 0);
      sets.push("`active` = ?");
      params.push(active);
    }

    // ✅ features + features_heading
    const hasFeatures =
      req.body?.features !== undefined || req.body?.feature !== undefined || req.body?.bullets !== undefined;
    const hasHeading =
      req.body?.features_heading !== undefined || req.body?.heading !== undefined;

    if (hasFeatures || hasHeading) {
      let headingIncoming =
        req.body?.features_heading ?? req.body?.heading ?? undefined;

      let featuresVal = req.body?.features ?? req.body?.feature ?? req.body?.bullets ?? undefined;

      // start from old
      let headingFinal = oldFeatures.heading;
      let itemsFinal = oldFeatures.items;

      // apply heading (can update without items)
      if (headingIncoming !== undefined) {
        const h = String(headingIncoming || "").trim();
        headingFinal = h ? h : null;
      }

      // apply items if provided
      if (featuresVal !== undefined) {
        if (typeof featuresVal === "string") {
          try { featuresVal = JSON.parse(featuresVal); } catch {}
        }

        if (featuresVal && typeof featuresVal === "object" && !Array.isArray(featuresVal)) {
          const items = Array.isArray(featuresVal.items) ? featuresVal.items : [];
          if (!items.length) return res.status(400).json({ ok: false, message: "features.items must be array (>=1)" });

          itemsFinal = items.map((x) => String(x || "").trim()).filter(Boolean);

          // allow object.heading override
          if (featuresVal.heading !== undefined) {
            const hh = String(featuresVal.heading || "").trim();
            headingFinal = hh ? hh : headingFinal;
          }
        } else {
          const arr = safeJsonArray(featuresVal, []);
          if (!arr.length) return res.status(400).json({ ok: false, message: "features must be array (>=1)" });
          itemsFinal = arr.map((x) => String(x || "").trim()).filter(Boolean);
        }
      }

      const featuresToStore = { heading: headingFinal, items: itemsFinal };
      if (!featuresToStore.items.length) {
        return res.status(400).json({ ok: false, message: "features must have at least 1 item" });
      }

      sets.push("`features` = CAST(? AS JSON)");
      params.push(JSON.stringify(featuresToStore));
    }

    if (!sets.length) return res.status(400).json({ ok: false, message: "No fields to update" });

    params.push(id);
    const sql = `UPDATE \`${JOBS_LIST_TABLE}\` SET ${sets.join(", ")} WHERE \`job_id\` = ?`;
    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    const [rows] = await pool.query(`SELECT * FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ? LIMIT 1`, [id]);
    res.json({ ok: true, job_id: id, data: normalizeJobsListRow(rows[0]) });
  } catch (err) {
    console.error("PATCH JOBS_LIST ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});


jobsListRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [result] = await pool.execute(`DELETE FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, message: "Deleted", job_id: id });
  } catch (err) {
    console.error("DELETE JOBS_LIST ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

jobsListRouter.post("/", async (req, res) => {
  try {
    const department = String(req.body?.department || "").trim();
    const levels = String(req.body?.levels ?? req.body?.level ?? "").trim();
    const time = String(req.body?.time || "").trim();

    const title = String(req.body?.title ?? req.body?.position ?? req.body?.role ?? "").trim();
    const titleFinal = title ? title : null;

    let active = 1;
    if (req.body?.active !== undefined) active = normalize01(req.body.active, 1);

    let featuresVal = req.body?.features ?? req.body?.feature ?? req.body?.bullets ?? [];

    if (typeof featuresVal === "string") {
      try {
        featuresVal = JSON.parse(featuresVal);
      } catch { }
    }

    if (!department) return res.status(400).json({ ok: false, message: "department is required" });
    if (!levels) return res.status(400).json({ ok: false, message: "levels is required" });
    if (!time) return res.status(400).json({ ok: false, message: "time is required (YYYY-MM-DD HH:mm:ss)" });

    const heading = String(req.body?.features_heading || req.body?.heading || "").trim() || null;

    let featuresToStore = null;

    if (featuresVal && typeof featuresVal === "object" && !Array.isArray(featuresVal)) {
      const items = Array.isArray(featuresVal.items) ? featuresVal.items : [];
      if (!items.length) return res.status(400).json({ ok: false, message: "features.items must be array (>= 1 item)" });

      featuresToStore = {
        heading: String(featuresVal.heading || heading || "").trim() || null,
        items: items.map((x) => String(x || "").trim()).filter(Boolean),
      };
    } else {
      const featuresArr = safeJsonArray(featuresVal, []);
      if (!featuresArr.length) return res.status(400).json({ ok: false, message: "features must be JSON array (>= 1 item)" });

      featuresToStore = {
        heading,
        items: featuresArr.map((x) => String(x || "").trim()).filter(Boolean),
      };
    }


    const sql = `
      INSERT INTO \`${JOBS_LIST_TABLE}\`
      (\`department\`, \`levels\`, \`time\`, \`title\`, \`features\`, \`active\`)
      VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)
    `;

    const params = [department, levels, time, titleFinal, JSON.stringify(featuresToStore), active];
    const [result] = await pool.execute(sql, params);

    const [rows] = await pool.query(`SELECT * FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ? LIMIT 1`, [
      result.insertId,
    ]);

    res.status(201).json({ ok: true, data: normalizeJobsListRow(rows[0]) });
  } catch (err) {
    console.error("INSERT JOBS_LIST ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

app.use("/api/jobs-list", jobsListRouter);
app.use("/api/jobs", jobsListRouter);

// ==============================
// ✅ Health + Root
// ==============================
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("OK");
  } catch {
    res.status(500).send("DB ERROR");
  }
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API running",
    routes: [
      "/health",
      "/api/jobs (GET, POST)",
      "/api/jobs/:id (GET, PATCH, DELETE)",
      "/api/jobs-list (GET, POST)",
      "/api/jobs-list/:id (GET, PATCH, DELETE)",
      "/api/members (GET, POST)",
      "/api/members/:id (GET, PATCH, DELETE)",
      "/api/news (GET, POST)",
      "/api/news/:id (GET, PATCH, DELETE)",
      "/api/news/insert (POST multipart)  (alias of POST /api/news)",
      "/api/announcement (GET, POST multipart/json)  [image required, timeforshow supported, linkpath supported]",
      "/api/announcement/:id (GET, PATCH, DELETE)",
    ],
  });
});

// ==============================
// ✅ 404 handler
// ==============================
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// ==============================
// ✅ Multer/Server error handler
// ==============================
app.use((err, req, res, next) => {
  if (!err) return next();
  const isMulter = err instanceof multer.MulterError;
  console.error("SERVER ERROR:", err);

  res.status(400).json({
    ok: false,
    message: isMulter ? `Upload error: ${err.code}` : err.message || "Unknown error",
  });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
