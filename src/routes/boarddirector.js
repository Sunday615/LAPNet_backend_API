// src/routes/boarddirector.js
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

// ✅ ใช้ memoryStorage เพื่อเอา buffer ไปแปลงเป็น webp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

// helper: รองรับได้ทั้ง bankName/bankname, personName/name
function pickBody(req) {
  const b = req.body || {};
  return {
    committee: b.committee,
    name: b.personName ?? b.name,
    role: b.role,
    bankname: b.bankName ?? b.bankname,
    createat: b.timestamp ?? b.createat, // optional
  };
}

function unwrap(resultRaw) {
  return Array.isArray(resultRaw) ? resultRaw[0] : resultRaw;
}

// ✅ ใช้ query เสมอ (หลบปัญหา stmt_execute ของ execute)
async function db(sql, params = []) {
  const raw = await pool.query(sql, params);
  return unwrap(raw);
}

// แปลงเป็น MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
function toMysqlDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ✅ แปลง buffer -> webp แล้วเซฟไฟล์
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

// ลบไฟล์จาก URL ที่เก็บเป็น /uploads/...
function safeUnlinkFromUploads(urlPath) {
  try {
    if (!urlPath || typeof urlPath !== "string") return;
    if (!urlPath.startsWith("/uploads/")) return;

    const rel = urlPath.replace(/^\/uploads\//, ""); // e.g. boarddirector/xxx.webp
    const base = path.resolve(UPLOAD_DIR);
    const full = path.resolve(path.join(UPLOAD_DIR, rel));

    if (!full.startsWith(base + path.sep) && full !== base) return;

    fs.unlink(full, () => {});
  } catch {
    // ignore
  }
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

    // ✅ ไม่ใช้ LIMIT ? OFFSET ? (กันปัญหา driver บางตัว)
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
router.post(
  "/",
  upload.fields([
    { name: "bankLogo", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { committee, name, role, bankname, createat } = pickBody(req);

      const bankLogoFile = req.files?.bankLogo?.[0];
      const profileFile = req.files?.profileImage?.[0];

      // validate
      if (!committee) return res.status(400).json({ ok: false, message: "committee is required" });
      if (!name) return res.status(400).json({ ok: false, message: "name/personName is required" });
      if (!role) return res.status(400).json({ ok: false, message: "role is required" });
      if (!bankname) return res.status(400).json({ ok: false, message: "bankName/bankname is required" });

      if (!bankLogoFile) return res.status(400).json({ ok: false, message: "bankLogo file is required" });
      if (!profileFile) return res.status(400).json({ ok: false, message: "profileImage file is required" });

      const createAtValue = createat ? toMysqlDateTime(createat) : toMysqlDateTime(new Date());
      if (createat && !createAtValue) return res.status(400).json({ ok: false, message: "createat is invalid date" });

      // convert -> webp
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

      const result = await db(sql, [
        committee,
        name,
        role,
        profileUrl,
        bankname,
        createAtValue,
        banklogoUrl,
      ]);

      return res.status(201).json({
        ok: true,
        message: "Inserted (images converted to .webp)",
        id: result.insertId, // = idboarddirector
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
  }
);

// ---------- PATCH /api/boarddirector/:id ----------
router.patch(
  "/:id",
  upload.fields([
    { name: "bankLogo", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "invalid id" });

      const findSql = `SELECT * FROM \`${TABLE}\` WHERE \`${PK}\` = ? LIMIT 1`;
      const found = await db(findSql, [id]);
      if (!found?.length) return res.status(404).json({ ok: false, message: "Not found" });
      const old = found[0];

      const { committee, name, role, bankname, createat } = pickBody(req);
      const bankLogoFile = req.files?.bankLogo?.[0];
      const profileFile = req.files?.profileImage?.[0];

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
  }
);

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

module.exports = router;
