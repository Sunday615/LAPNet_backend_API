const fs = require("fs");
const path = require("path");
const express = require("express");
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

const OPT_ATM_INQUERY = "ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM";
const OPT_ATM_CASHWITHDRAW = "ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM";
const OPT_ATM_TRANSFER = "ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM";

const OPT_MOBILE_TRANSFER_ACC = "ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ";
const OPT_MOBILE_TRANSFER_QR = "ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE";
const OPT_QR_PAYMENT = "ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE";

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

function parsePositiveInt(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toTinyInt(value, defaultValue = 0) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return 1;
  if (["0", "false", "no", "off"].includes(normalized)) return 0;

  return defaultValue;
}

function validateRequiredHttpUrl(value, fieldName) {
  const url = String(value || "").trim();
  if (!url) {
    throw createHttpError(400, `${fieldName} is required`);
  }
  if (!isValidUrl(url)) {
    throw createHttpError(400, `${fieldName} must be URL (http/https)`);
  }
  return url;
}

function computeProductFlags(cardATM, mobileBanking, crossborder) {
  const atmItems = Array.isArray(cardATM?.items) ? cardATM.items : [];
  const mobileItems = Array.isArray(mobileBanking?.items) ? mobileBanking.items : [];
  const crossItems = Array.isArray(crossborder?.items) ? crossborder.items : [];

  return {
    atminquery: atmItems.includes(OPT_ATM_INQUERY) ? 1 : 0,
    atmcashwithdraw: atmItems.includes(OPT_ATM_CASHWITHDRAW) ? 1 : 0,
    atmtransfer: atmItems.includes(OPT_ATM_TRANSFER) ? 1 : 0,
    mobiletransfer:
      mobileItems.includes(OPT_MOBILE_TRANSFER_ACC) || mobileItems.includes(OPT_MOBILE_TRANSFER_QR) ? 1 : 0,
    qrpayment: mobileItems.includes(OPT_QR_PAYMENT) ? 1 : 0,
    crossborderproduct: crossItems.length > 0 ? 1 : 0,
  };
}

function getStoredFintechValue(row) {
  return row?.fintech ?? row?.Fintech ?? row?.FINTECH;
}

async function cleanupUploadedFile(uploadedDiskPath) {
  if (uploadedDiskPath) {
    await fsp.unlink(uploadedDiskPath).catch(() => {});
  }
}

router.post("/", upload.single("image"), async (req, res, next) => {
  let uploadedDiskPath = "";
  let imageUrlForCleanup = "";

  try {
    const { bankcode, title, subtitle, link1, link2, gradA, gradB } = req.body || {};
    const fintech = toTinyInt(req.body?.fintech ?? req.body?.Fintech, 0);

    const bankcodeValue = String(bankcode || "").trim();
    const titleValue = String(title || "").trim();
    const subtitleValue = String(subtitle || "").trim();

    if (!bankcodeValue) {
      throw createHttpError(400, "bankcode is required");
    }
    if (!titleValue) {
      throw createHttpError(400, "title is required");
    }

    const link1Value = validateRequiredHttpUrl(link1, "link1");
    const link2Value = validateRequiredHttpUrl(link2, "link2");

    const productOptionsATM = parseFormArrayFromBody(req.body, "productOptionsATM");
    const hasProductOptionsATM = productOptionsATM.length > 0;

    const hasExplicitItems =
      req.body?.CardATM !== undefined ||
      req.body?.Mbbankking !== undefined ||
      req.body?.Mbbanking !== undefined ||
      req.body?.Crossborder !== undefined ||
      hasProductOptionsATM;

    let cardATM = { items: [] };
    let mobileBanking = { items: [] };
    let crossborder = { items: [] };

    if (hasExplicitItems) {
      if (req.body.CardATM !== undefined) {
        cardATM = parseItemsObj(req.body.CardATM, []);
      } else if (hasProductOptionsATM) {
        cardATM = parseItemsObj(productOptionsATM, []);
      }

      mobileBanking = parseItemsObj(req.body.Mbbankking ?? req.body.Mbbanking, []);
      crossborder = parseItemsObj(req.body.Crossborder, []);
    } else {
      const filterProduct = safeJson(req.body?.filterproduct, []);
      if (!Array.isArray(filterProduct)) {
        throw createHttpError(400, "filterproduct must be JSON array");
      }

      const classified = classifyProductsFromFilterproduct(filterProduct);
      cardATM = classified.CardATM;
      mobileBanking = classified.Mbbankking;
      crossborder = classified.Crossborder;
    }

    const memberATM = cardATM.items.length > 0 ? 1 : 0;
    const membermobile = mobileBanking.items.length > 0 ? 1 : 0;
    const membercrossborder = crossborder.items.length > 0 ? 1 : 0;

    const productFlags = computeProductFlags(cardATM, mobileBanking, crossborder);

    const color = {
      primary: String(gradA || "").trim() || "#38bdf8",
      secondary: String(gradB || "").trim() || "#6366f1",
    };

    let imageUrl = "";

    if (req.file) {
      uploadedDiskPath = req.file.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageUrl = `/uploads/members/${outFile}`;
      imageUrlForCleanup = imageUrl;
      uploadedDiskPath = outPath;
    }

    const sql = `
      INSERT INTO ${MEMBERS_TABLE}
      (
        Bankcode, BanknameLA, BanknameEN, Color,
        LinkFB, LinkWeb,
        CardATM, Mbbankking, Crossborder,
        memberATM, membermobile, membercrossborder,
        atminquery, atmcashwithdraw, atmtransfer, mobiletransfer, qrpayment, crossborderproduct,
        fintech,
        image
      )
      VALUES (
        ?, ?, ?, CAST(? AS JSON),
        ?, ?,
        CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON),
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?,
        ?
      )
    `;

    const params = [
      bankcodeValue,
      titleValue,
      subtitleValue,
      JSON.stringify(color),
      link1Value,
      link2Value,
      JSON.stringify(parseItemsObj(cardATM, [])),
      JSON.stringify(parseItemsObj(mobileBanking, [])),
      JSON.stringify(parseItemsObj(crossborder, [])),
      memberATM,
      membermobile,
      membercrossborder,
      productFlags.atminquery,
      productFlags.atmcashwithdraw,
      productFlags.atmtransfer,
      productFlags.mobiletransfer,
      productFlags.qrpayment,
      productFlags.crossborderproduct,
      fintech,
      imageUrl,
    ];

    const [result] = await pool.execute(sql, params);

    return res.status(201).json({
      ok: true,
      idmember: result.insertId,
      fintech,
      image: imageUrl,
      image_url: absUrl(req, imageUrl),
      flags: {
        memberATM,
        membermobile,
        membercrossborder,
        ...productFlags,
        fintech,
      },
      items: {
        CardATM: parseItemsObj(cardATM, []),
        Mbbankking: parseItemsObj(mobileBanking, []),
        Crossborder: parseItemsObj(crossborder, []),
      },
    });
  } catch (err) {
    console.error("INSERT MEMBER ERROR:", {
      code: err?.code,
      message: err?.message,
    });

    await cleanupUploadedFile(uploadedDiskPath);
    if (imageUrlForCleanup) {
      await deleteUploadRelSafe(imageUrlForCleanup).catch(() => {});
    }
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} ORDER BY idmember DESC`);
    return res.json({
      ok: true,
      data: rows.map((row) => {
        const normalized = normalizeMemberRow(req, row);
        return { ...normalized, fintech: toTinyInt(getStoredFintechValue(row), 0) };
      }),
    });
  } catch (err) {
    console.error("GET MEMBERS ERROR:", {
      code: err?.code,
      message: err?.message,
    });
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const normalized = normalizeMemberRow(req, rows[0]);
    return res.json({
      ok: true,
      data: {
        ...normalized,
        fintech: toTinyInt(getStoredFintechValue(rows[0]), 0),
      },
    });
  } catch (err) {
    console.error("GET MEMBER BY ID ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

router.patch("/:id", upload.single("image"), async (req, res, next) => {
  let uploadedDiskPath = "";
  let newImageUrl = "";

  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const oldRow = rows[0];
    const oldImageRel = String(oldRow?.image || "").trim();

    const bankcode =
      req.body?.bankcode !== undefined ? String(req.body.bankcode || "").trim() : String(oldRow.Bankcode || "").trim();

    const title =
      req.body?.title !== undefined ? String(req.body.title || "").trim() : String(oldRow.BanknameLA || "").trim();

    const subtitle =
      req.body?.subtitle !== undefined
        ? String(req.body.subtitle || "").trim()
        : String(oldRow.BanknameEN || "").trim();

    if (!bankcode) {
      throw createHttpError(400, "bankcode is required");
    }
    if (!title) {
      throw createHttpError(400, "title is required");
    }

    const link1 =
      req.body?.link1 !== undefined
        ? validateRequiredHttpUrl(req.body.link1, "link1")
        : validateRequiredHttpUrl(oldRow.LinkFB, "link1");

    const link2 =
      req.body?.link2 !== undefined
        ? validateRequiredHttpUrl(req.body.link2, "link2")
        : validateRequiredHttpUrl(oldRow.LinkWeb, "link2");

    const oldColor = require("../utils/json").parseJsonMaybe(oldRow.Color, oldRow.Color) || {};
    const color = {
      primary:
        req.body?.gradA !== undefined
          ? String(req.body.gradA || "").trim() || oldColor.primary || "#38bdf8"
          : oldColor.primary || "#38bdf8",
      secondary:
        req.body?.gradB !== undefined
          ? String(req.body.gradB || "").trim() || oldColor.secondary || "#6366f1"
          : oldColor.secondary || "#6366f1",
    };

    const fintech =
      req.body?.fintech !== undefined || req.body?.Fintech !== undefined
        ? toTinyInt(req.body?.fintech ?? req.body?.Fintech, 0)
        : toTinyInt(getStoredFintechValue(oldRow), 0);

    const productOptionsATM = parseFormArrayFromBody(req.body, "productOptionsATM");
    const hasProductOptionsATM = productOptionsATM.length > 0;

    const hasExplicitItems =
      req.body?.CardATM !== undefined ||
      req.body?.Mbbankking !== undefined ||
      req.body?.Mbbanking !== undefined ||
      req.body?.Crossborder !== undefined ||
      hasProductOptionsATM;

    let cardATM = parseItemsObj(oldRow.CardATM, []);
    let mobileBanking = parseItemsObj(oldRow.Mbbankking, []);
    let crossborder = parseItemsObj(oldRow.Crossborder, []);

    if (hasExplicitItems) {
      if (req.body?.CardATM !== undefined) {
        cardATM = parseItemsObj(req.body.CardATM, cardATM.items);
      } else if (hasProductOptionsATM) {
        cardATM = parseItemsObj(productOptionsATM, cardATM.items);
      }

      if (req.body?.Mbbankking !== undefined || req.body?.Mbbanking !== undefined) {
        mobileBanking = parseItemsObj(req.body.Mbbankking ?? req.body.Mbbanking, mobileBanking.items);
      }

      if (req.body?.Crossborder !== undefined) {
        crossborder = parseItemsObj(req.body.Crossborder, crossborder.items);
      }
    } else if (req.body?.filterproduct !== undefined) {
      const filterProduct = safeJson(req.body.filterproduct, []);
      if (!Array.isArray(filterProduct)) {
        throw createHttpError(400, "filterproduct must be JSON array");
      }

      const classified = classifyProductsFromFilterproduct(filterProduct);
      cardATM = parseItemsObj(classified.CardATM, []);
      mobileBanking = parseItemsObj(classified.Mbbankking, []);
      crossborder = parseItemsObj(classified.Crossborder, []);
    }

    const memberATM = cardATM?.items?.length ? 1 : 0;
    const membermobile = mobileBanking?.items?.length ? 1 : 0;
    const membercrossborder = crossborder?.items?.length ? 1 : 0;

    const productFlags = computeProductFlags(cardATM, mobileBanking, crossborder);

    let imageUrl = oldImageRel || "";

    if (req.file) {
      uploadedDiskPath = req.file.path;
      const outPath = await convertDiskImageToWebpOrThrow(uploadedDiskPath, 82, 1024);
      const outFile = path.basename(outPath);

      imageUrl = `/uploads/members/${outFile}`;
      newImageUrl = imageUrl;
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
        atminquery = ?,
        atmcashwithdraw = ?,
        atmtransfer = ?,
        mobiletransfer = ?,
        qrpayment = ?,
        crossborderproduct = ?,
        fintech = ?,
        image = ?
      WHERE idmember = ?
    `;

    const params = [
      bankcode,
      title,
      subtitle,
      JSON.stringify(color),
      link1,
      link2,
      JSON.stringify(parseItemsObj(cardATM, [])),
      JSON.stringify(parseItemsObj(mobileBanking, [])),
      JSON.stringify(parseItemsObj(crossborder, [])),
      memberATM,
      membermobile,
      membercrossborder,
      productFlags.atminquery,
      productFlags.atmcashwithdraw,
      productFlags.atmtransfer,
      productFlags.mobiletransfer,
      productFlags.qrpayment,
      productFlags.crossborderproduct,
      fintech,
      imageUrl,
      id,
    ];

    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    if (req.file && oldImageRel && oldImageRel !== imageUrl) {
      await deleteUploadRelSafe(oldImageRel).catch(() => {});
    }

    const [updatedRows] = await pool.query(`SELECT * FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    const normalized = normalizeMemberRow(req, updatedRows[0]);

    return res.json({
      ok: true,
      message: "Updated",
      data: {
        ...normalized,
        fintech: toTinyInt(getStoredFintechValue(updatedRows[0]), 0),
      },
    });
  } catch (err) {
    console.error("PATCH MEMBER ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });

    await cleanupUploadedFile(uploadedDiskPath);
    if (newImageUrl) {
      await deleteUploadRelSafe(newImageUrl).catch(() => {});
    }
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      throw createHttpError(400, "Invalid id");
    }

    const [rows] = await pool.query(`SELECT image FROM ${MEMBERS_TABLE} WHERE idmember = ? LIMIT 1`, [id]);
    if (!rows.length) {
      throw createHttpError(404, "Not found");
    }

    const imageRel = rows[0]?.image || "";
    const [result] = await pool.execute(`DELETE FROM ${MEMBERS_TABLE} WHERE idmember = ?`, [id]);

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Not found");
    }

    await deleteUploadRelSafe(imageRel).catch(() => {});

    return res.json({ ok: true, message: "Deleted", idmember: id });
  } catch (err) {
    console.error("DELETE MEMBER ERROR:", {
      code: err?.code,
      message: err?.message,
      id: req.params.id,
    });
    return next(err);
  }
});

module.exports = router;