// src/routes/emp_lapnet.js   (CommonJS)
// CRUD for table: emp_lapnet
// PK: emp_id
// fields: emp_id, name, role, department, position, create_at, imageprofile (and/or imageprodfile)
//
// ✅ Supports:
// - GET    /api/emp_lapnet
// - GET    /api/emp_lapnet/:id
// - POST   /api/emp_lapnet              (multipart upload OR send image url string)
// - PATCH  /api/emp_lapnet/:id          (partial update + optional new image)
// - DELETE /api/emp_lapnet/:id
//
// ✅ Follows your project structure like boarddirector.js:
//   - pool from ../db/pool
//   - UPLOAD_DIR from ../config/paths
//   - multer memoryStorage + sharp -> webp
//
// Notes:
// - Accept upload field names: image, imageprofile, imageprodfile
// - Accept body aliases from your Vue form: empName->name, row->position, timestamp->create_at
// - If your table has BOTH imageprofile & imageprodfile, it will write the same URL to both (safe for NOT NULL)

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const sharp = require("sharp");

const pool = require("../db/pool");
const { UPLOAD_DIR } = require("../config/paths");

const router = express.Router();

const TABLE = "emp_lapnet";
const PK = "emp_id";

// ---------- upload dir ----------
const UP_SUBDIR = path.join(UPLOAD_DIR, TABLE);
fs.mkdirSync(UP_SUBDIR, { recursive: true });

// ✅ memoryStorage -> convert to webp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

// ---------- helpers ----------
function unwrap(resultRaw) {
  return Array.isArray(resultRaw) ? resultRaw[0] : resultRaw;
}

// ✅ use query() always
async function db(sql, params = []) {
  const raw = await pool.query(sql, params);
  return unwrap(raw);
}

function toMysqlDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function pickBody(req) {
  const b = req.body || {};
  return {
    // aliases from your Vue form
    name: b.empName ?? b.name,
    role: b.role,
    department: b.department,
    position: b.row ?? b.position,
    create_at: b.timestamp ?? b.create_at,

    // if client sends url string (no upload)
    imageprofile: b.imageprofile,
    imageprodfile: b.imageprodfile,
  };
}

function pickAnyImageFile(req) {
  // accept multiple possible field names
  return (
    req.files?.image?.[0] ||
    req.files?.imageprofile?.[0] ||
    req.files?.imageprodfile?.[0] ||
    null
  );
}

async function getImageColumns() {
  // detect if your table uses imageprofile and/or imageprodfile
  const cols = await db(`SHOW COLUMNS FROM \`${TABLE}\``);
  const names = new Set((cols || []).map((c) => String(c.Field)));

  const list = [];
  if (names.has("imageprodfile")) list.push("imageprodfile");
  if (names.has("imageprofile")) list.push("imageprofile");

  // fallback (should not happen)
  if (!list.length) return { all: [], primary: "" };

  return { all: list, primary: list[0] };
}

// ✅ buffer -> webp
async function saveWebp(buffer, prefix) {
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.webp`;
  const fullpath = path.join(UP_SUBDIR, filename);

  await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(fullpath);

  return filename;
}

// delete file from /uploads/...
function safeUnlinkFromUploads(urlPath) {
  try {
    if (!urlPath || typeof urlPath !== "string") return;
    if (!urlPath.startsWith("/uploads/")) return;

    const rel = urlPath.replace(/^\/uploads\//, ""); // e.g. emp_lapnet/xxx.webp
    const base = path.resolve(UPLOAD_DIR);
    const full = path.resolve(path.join(UPLOAD_DIR, rel));

    if (!full.startsWith(base + path.sep) && full !== base) return;

    fs.unlink(full, () => {});
  } catch {
    // ignore
  }
}

function must(v, msg) {
  const s = String(v ?? "").trim();
  if (!s) {
    const e = new Error(msg);
    e.status = 400;
    throw e;
  }
  return s;
}

// ---------- GET /api/emp_lapnet (list) ----------
router.get("/", async (req, res, next) => {
  try {
    const { search, department, position, limit, offset } = req.query;

    const where = [];
    const params = [];

    if (search) {
      const s = `%${String(search)}%`;
      where.push("(`name` LIKE ? OR `role` LIKE ? OR `department` LIKE ? OR `position` LIKE ?)");
      params.push(s, s, s, s);
    }
    if (department) {
      where.push("department = ?");
      params.push(String(department));
    }
    if (position) {
      where.push("position = ?");
      params.push(String(position));
    }

    const lim = Math.min(Math.max(parseInt(limit ?? "50", 10) || 50, 1), 200);
    const off = Math.max(parseInt(offset ?? "0", 10) || 0, 0);

    const sql = `
      SELECT \`${PK}\` AS id, \`${TABLE}\`.*
      FROM \`${TABLE}\`
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY \`${PK}\` DESC
      LIMIT ${off}, ${lim}
    `;

    const rows = await db(sql, params);

    res.json({
      ok: true,
      paging: { limit: lim, offset: off, returned: rows.length },
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/emp_lapnet/:id (single) ----------
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const sql = `SELECT \`${PK}\` AS id, \`${TABLE}\`.* FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`;
    const rows = await db(sql, [id]);

    if (!rows?.length) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/emp_lapnet ----------
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "imageprofile", maxCount: 1 },
    { name: "imageprodfile", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { name, role, department, position, create_at, imageprofile, imageprodfile } = pickBody(req);

      must(name, "name/empName is required");
      must(role, "role is required");
      must(department, "department is required");
      must(position, "position/row is required");

      const createAtValue = create_at ? toMysqlDateTime(create_at) : toMysqlDateTime(new Date());
      if (create_at && !createAtValue) return res.status(400).json({ ok: false, message: "create_at is invalid date" });

      const file = pickAnyImageFile(req);

      const { all: imgCols, primary } = await getImageColumns();
      if (!imgCols.length) return res.status(500).json({ ok: false, message: "No image column found in table" });

      // must have either upload file OR url string
      const imgString = String(imageprodfile ?? imageprofile ?? "").trim();
      if (!file && !imgString) {
        return res.status(400).json({ ok: false, message: `${primary} is required (upload image or send url string)` });
      }

      let imageUrl = imgString;

      if (file) {
        const webp = await saveWebp(file.buffer, "empimg");
        imageUrl = `/uploads/${TABLE}/${webp}`;
      }

      // build INSERT with dynamic img columns
      const cols = ["name", "role", "department", "position", "create_at", ...imgCols];
      const placeholders = cols.map(() => "?").join(", ");
      const values = [name, role, department, position, createAtValue, ...imgCols.map(() => imageUrl)];

      const insSql = `INSERT INTO \`${TABLE}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
      const result = await db(insSql, values);

      const after = await db(`SELECT \`${PK}\` AS id, \`${TABLE}\`.* FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`, [
        result.insertId,
      ]);

      return res.status(201).json({
        ok: true,
        message: "Inserted (image converted to .webp if uploaded)",
        id: result.insertId,
        data: after?.[0] ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- PATCH /api/emp_lapnet/:id ----------
router.patch(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "imageprofile", maxCount: 1 },
    { name: "imageprodfile", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

      const found = await db(`SELECT * FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`, [id]);
      if (!found?.length) return res.status(404).json({ ok: false, message: "Not found" });
      const old = found[0];

      const { name, role, department, position, create_at, imageprofile, imageprodfile } = pickBody(req);
      const file = pickAnyImageFile(req);

      const { all: imgCols, primary } = await getImageColumns();
      if (!imgCols.length) return res.status(500).json({ ok: false, message: "No image column found in table" });

      const updates = [];
      const params = [];

      if (name !== undefined) {
        if (!String(name).trim()) return res.status(400).json({ ok: false, message: "name cannot be empty" });
        updates.push("`name` = ?");
        params.push(String(name).trim());
      }
      if (role !== undefined) {
        if (!String(role).trim()) return res.status(400).json({ ok: false, message: "role cannot be empty" });
        updates.push("`role` = ?");
        params.push(String(role).trim());
      }
      if (department !== undefined) {
        if (!String(department).trim()) return res.status(400).json({ ok: false, message: "department cannot be empty" });
        updates.push("`department` = ?");
        params.push(String(department).trim());
      }
      if (position !== undefined) {
        if (!String(position).trim()) return res.status(400).json({ ok: false, message: "position cannot be empty" });
        updates.push("`position` = ?");
        params.push(String(position).trim());
      }
      if (create_at !== undefined && create_at !== "") {
        const d = toMysqlDateTime(create_at);
        if (!d) return res.status(400).json({ ok: false, message: "create_at is invalid date" });
        updates.push("`create_at` = ?");
        params.push(d);
      }

      // allow update by url string (no file)
      const imgString = String(imageprodfile ?? imageprofile ?? "").trim();
      if (!file && (imageprodfile !== undefined || imageprofile !== undefined)) {
        if (!imgString) return res.status(400).json({ ok: false, message: `${primary} cannot be empty` });
        for (const c of imgCols) {
          updates.push(`\`${c}\` = ?`);
          params.push(imgString);
        }
      }

      let newImageUrl = "";
      if (file) {
        const webp = await saveWebp(file.buffer, "empimg");
        newImageUrl = `/uploads/${TABLE}/${webp}`;
        for (const c of imgCols) {
          updates.push(`\`${c}\` = ?`);
          params.push(newImageUrl);
        }
      }

      if (!updates.length) return res.status(400).json({ ok: false, message: "No fields to update" });

      const updSql = `UPDATE \`${TABLE}\` SET ${updates.join(", ")} WHERE \`${PK}\` = ?`;
      params.push(id);

      const updResult = await db(updSql, params);

      // delete old local file if replaced by upload
      if (newImageUrl) {
        for (const c of imgCols) {
          if (old?.[c]) safeUnlinkFromUploads(old[c]);
        }
      }

      const after = await db(`SELECT \`${PK}\` AS id, \`${TABLE}\`.* FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`, [id]);

      res.json({
        ok: true,
        message: "Updated",
        affectedRows: updResult?.affectedRows ?? undefined,
        data: after?.[0] ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- DELETE /api/emp_lapnet/:id ----------
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const found = await db(`SELECT * FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`, [id]);
    if (!found?.length) return res.status(404).json({ ok: false, message: "Not found" });
    const old = found[0];

    const { all: imgCols } = await getImageColumns();

    const delResult = await db(`DELETE FROM \`${TABLE}\` WHERE \`${PK}\` = ?`, [id]);

    for (const c of imgCols) {
      if (old?.[c]) safeUnlinkFromUploads(old[c]);
    }

    res.json({
      ok: true,
      message: "Deleted",
      affectedRows: delResult?.affectedRows ?? undefined,
      id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
