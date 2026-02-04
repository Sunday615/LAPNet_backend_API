// src/routes/boarddirector.js (UPDATED: ✅ accept multiple file field aliases + better multer error)
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const sharp = require("sharp");

const pool = require("../db/pool");
const { UPLOAD_DIR } = require("../config/paths");

const router = express.Router();

const TABLE = "boarddirector";
const PK = "idboarddirector";

// ---------- upload dir ----------
const UP_SUBDIR = path.join(UPLOAD_DIR, "boarddirector");
fs.mkdirSync(UP_SUBDIR, { recursive: true });

// ✅ memoryStorage for buffer -> webp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // ✅ 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

// helper: support multiple body keys
function pickBody(req) {
  const b = req.body || {};
  return {
    committee: b.committee,
    name: b.personName ?? b.person_name ?? b.name,
    role: b.role ?? b.position ?? b.board_role,
    bankname: b.bankName ?? b.bank_name ?? b.bankname ?? b.bank,
    createat: b.timestamp ?? b.createat ?? b.date_time,
  };
}

function unwrap(resultRaw) {
  return Array.isArray(resultRaw) ? resultRaw[0] : resultRaw;
}

async function db(sql, params = []) {
  const raw = await pool.query(sql, params);
  return unwrap(raw);
}

function toMysqlDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

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

function safeUnlinkFromUploads(urlPath) {
  try {
    if (!urlPath || typeof urlPath !== "string") return;
    if (!urlPath.startsWith("/uploads/")) return;

    const rel = urlPath.replace(/^\/uploads\//, "");
    const base = path.resolve(UPLOAD_DIR);
    const full = path.resolve(path.join(UPLOAD_DIR, rel));

    if (!full.startsWith(base + path.sep) && full !== base) return;
    fs.unlink(full, () => {});
  } catch {
    // ignore
  }
}

// ✅ multer fields (accept aliases to avoid LIMIT_UNEXPECTED_FILE)
const uploadFields = upload.fields([
  // bank logo aliases
  { name: "bankLogo", maxCount: 1 },
  { name: "bank_logo", maxCount: 1 },
   { name: "banklogo", maxCount: 1 }, 
  { name: "logo", maxCount: 1 },

  // profile aliases
  { name: "profileImage", maxCount: 1 },
  { name: "profile_image", maxCount: 1 },
  { name: "profileimage", maxCount: 1 },
  { name: "profile", maxCount: 1 },
  { name: "photo", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
]);

function pickFiles(req) {
  const files = req.files || {};

  const bankLogoFile =
    files.bankLogo?.[0] ||
    files.bank_logo?.[0] ||
    files.banklogo?.[0] ||   // ✅ ADD
    files.logo?.[0] ||
    null;

  const profileFile =
    files.profileImage?.[0] ||
    files.profile_image?.[0] ||
    files.profileimage?.[0] || // ✅ ADD
    files.profile?.[0] ||
    files.photo?.[0] ||
    files.avatar?.[0] ||
    null;

  return { bankLogoFile, profileFile };
}


// ---------- GET /api/boarddirector (list) ----------
router.get("/", async (req, res, next) => {
  try {
    const { committee, bankname, name, role, limit, offset } = req.query;

    const where = [];
    const params = [];

    if (committee) {
      where.push("committee = ?");
      params.push(String(committee));
    }
    if (bankname) {
      where.push("bankname = ?");
      params.push(String(bankname));
    }
    if (name) {
      where.push("name LIKE ?");
      params.push(`%${String(name)}%`);
    }
    if (role) {
      where.push("role LIKE ?");
      params.push(`%${String(role)}%`);
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

// ---------- GET /api/boarddirector/:id (single) ----------
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

// ---------- POST /api/boarddirector ----------
router.post("/", uploadFields, async (req, res, next) => {
  try {
    const { committee, name, role, bankname, createat } = pickBody(req);
    const { bankLogoFile, profileFile } = pickFiles(req);

    if (!committee) return res.status(400).json({ ok: false, message: "committee is required" });
    if (!name) return res.status(400).json({ ok: false, message: "name/personName is required" });
    if (!role) return res.status(400).json({ ok: false, message: "role is required" });
    if (!bankname) return res.status(400).json({ ok: false, message: "bankName/bankname is required" });

    if (!bankLogoFile) return res.status(400).json({ ok: false, message: "bankLogo file is required" });
    if (!profileFile) return res.status(400).json({ ok: false, message: "profileImage file is required" });

    const createAtValue = createat ? toMysqlDateTime(createat) : toMysqlDateTime(new Date());
    if (createat && !createAtValue) return res.status(400).json({ ok: false, message: "createat is invalid date" });

    const bankLogoWebp = await saveWebp(bankLogoFile.buffer, "banklogo");
    const profileWebp = await saveWebp(profileFile.buffer, "profile");

    const banklogoUrl = `/uploads/boarddirector/${bankLogoWebp}`;
    const profileUrl = `/uploads/boarddirector/${profileWebp}`;

    const sql = `
      INSERT INTO \`${TABLE}\`
        (committee, name, role, profile, bankname, createat, banklogo)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db(sql, [committee, name, role, profileUrl, bankname, createAtValue, banklogoUrl]);

    return res.status(201).json({
      ok: true,
      message: "Inserted (images converted to .webp)",
      id: result.insertId,
      data: {
        committee,
        name,
        role,
        bankname,
        profile: profileUrl,
        banklogo: banklogoUrl,
        createat: createAtValue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- PATCH /api/boarddirector/:id ----------
router.patch("/:id", uploadFields, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const findSql = `SELECT * FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`;
    const found = await db(findSql, [id]);
    if (!found?.length) return res.status(404).json({ ok: false, message: "Not found" });
    const old = found[0];

    const { committee, name, role, bankname, createat } = pickBody(req);
    const { bankLogoFile, profileFile } = pickFiles(req);

    const updates = [];
    const params = [];

    if (committee !== undefined) {
      if (!committee) return res.status(400).json({ ok: false, message: "committee cannot be empty" });
      updates.push("committee = ?");
      params.push(committee);
    }
    if (name !== undefined) {
      if (!name) return res.status(400).json({ ok: false, message: "name cannot be empty" });
      updates.push("name = ?");
      params.push(name);
    }
    if (role !== undefined) {
      if (!role) return res.status(400).json({ ok: false, message: "role cannot be empty" });
      updates.push("role = ?");
      params.push(role);
    }
    if (bankname !== undefined) {
      if (!bankname) return res.status(400).json({ ok: false, message: "bankname cannot be empty" });
      updates.push("bankname = ?");
      params.push(bankname);
    }
    if (createat !== undefined && createat !== "") {
      const d = toMysqlDateTime(createat);
      if (!d) return res.status(400).json({ ok: false, message: "createat is invalid date" });
      updates.push("createat = ?");
      params.push(d);
    }

    let newBanklogoUrl;
    let newProfileUrl;

    if (bankLogoFile) {
      const bankLogoWebp = await saveWebp(bankLogoFile.buffer, "banklogo");
      newBanklogoUrl = `/uploads/boarddirector/${bankLogoWebp}`;
      updates.push("banklogo = ?");
      params.push(newBanklogoUrl);
    }

    if (profileFile) {
      const profileWebp = await saveWebp(profileFile.buffer, "profile");
      newProfileUrl = `/uploads/boarddirector/${profileWebp}`;
      updates.push("profile = ?");
      params.push(newProfileUrl);
    }

    if (!updates.length) {
      return res.status(400).json({ ok: false, message: "No fields to update" });
    }

    const updSql = `UPDATE \`${TABLE}\` SET ${updates.join(", ")} WHERE \`${PK}\` = ?`;
    params.push(id);

    const updResult = await db(updSql, params);

    if (newBanklogoUrl && old.banklogo) safeUnlinkFromUploads(old.banklogo);
    if (newProfileUrl && old.profile) safeUnlinkFromUploads(old.profile);

    const afterSql = `SELECT \`${PK}\` AS id, \`${TABLE}\`.* FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`;
    const afterRows = await db(afterSql, [id]);

    res.json({
      ok: true,
      message: "Updated",
      affectedRows: updResult?.affectedRows ?? undefined,
      data: afterRows?.[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- DELETE /api/boarddirector/:id ----------
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

    const findSql = `SELECT * FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`;
    const found = await db(findSql, [id]);

    if (!found?.length) return res.status(404).json({ ok: false, message: "Not found" });
    const old = found[0];

    const delSql = `DELETE FROM \`${TABLE}\` WHERE \`${PK}\` = ?`;
    const delResult = await db(delSql, [id]);

    if (old.banklogo) safeUnlinkFromUploads(old.banklogo);
    if (old.profile) safeUnlinkFromUploads(old.profile);

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

/* ✅ multer error handler (so client gets readable message) */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        ok: false,
        message: `Unexpected file field: ${err.field}. Allowed: bankLogo/profileImage (and aliases).`,
      });
    }
    return res.status(400).json({ ok: false, message: err.message, code: err.code });
  }
  if (err && String(err.message || "").includes("Only image files")) {
    return res.status(400).json({ ok: false, message: err.message });
  }
  next(err);
});

module.exports = router;
