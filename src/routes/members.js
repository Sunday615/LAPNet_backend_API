// src/routes/members.js
const express = require("express");
const fs = require("fs");
const fsp = fs.promises;

const pool = require("../db/pool");
const { MEMBERS_TABLE } = require("../config/tables");
const { upload } = require("../middleware/upload");
const { absUrl, isValidUrl } = require("../utils/url");
const { deleteUploadRelSafe } = require("../utils/files");
const {
  parseFormArrayFromBody,
  parseItemsObj,
  classifyProductsFromFilterproduct,
  normalizeMemberRow,
  safeJson,
} = require("../utils/normalize");
const { convertDiskImageToWebpOrThrow } = require("../services/sharp");

const router = express.Router();

// POST /api/members
router.post("/", upload.single("image"), async (req, res) => {
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
      const outFile = require("path").basename(outPath);

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
    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => {});
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/members
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} ORDER BY idmember DESC`);
    res.json({ ok: true, data: rows.map((r) => normalizeMemberRow(req, r)) });
  } catch (err) {
    console.error("GET MEMBERS ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/members/:id
router.get("/:id", async (req, res) => {
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

// PATCH /api/members/:id (multipart + optional image + delete old)
router.patch("/:id", upload.single("image"), async (req, res) => {
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

    const oldColor = require("../utils/json").parseJsonMaybe(oldRow.Color, oldRow.Color) || {};
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
      const outFile = require("path").basename(outPath);

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
    if (uploadedDiskPath) await fsp.unlink(uploadedDiskPath).catch(() => {});
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// DELETE /api/members/:id
router.delete("/:id", async (req, res) => {
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

module.exports = router;
