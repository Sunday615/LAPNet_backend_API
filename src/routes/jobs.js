// src/routes/jobs.js
const express = require("express");
const pool = require("../db/pool");
const { JOBS_LIST_TABLE } = require("../config/tables");
const { normalize01, normalizeJobsListRow, normalizeJobsFeatures, safeJsonArray } = require("../utils/normalize");

const router = express.Router();

// GET /api/jobs (or /api/jobs-list)
router.get("/", async (req, res) => {
  try {
    const sql = `SELECT * FROM \`${JOBS_LIST_TABLE}\` ORDER BY \`job_id\` DESC`;
    const [rows] = await pool.query(sql);
    res.json({ ok: true, data: rows.map(normalizeJobsListRow) });
  } catch (err) {
    console.error("GET JOBS_LIST ERROR:", err);
    res.status(500).json({ ok: false, code: err.code, message: err.message, sqlMessage: err.sqlMessage });
  }
});

// GET /api/jobs/:id
router.get("/:id", async (req, res) => {
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

// POST /api/jobs
router.post("/", async (req, res) => {
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
      } catch {}
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

// PATCH /api/jobs/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [oldRows] = await pool.query(`SELECT * FROM \`${JOBS_LIST_TABLE}\` WHERE \`job_id\` = ? LIMIT 1`, [id]);
    if (!oldRows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const oldRow = oldRows[0];
    const oldFeatures = normalizeJobsFeatures(oldRow.features);

    const sets = [];
    const params = [];

    if (req.body?.department !== undefined) {
      const department = String(req.body.department || "").trim();
      if (!department) return res.status(400).json({ ok: false, message: "department cannot be empty" });
      sets.push("`department` = ?");
      params.push(department);
    }

    if (req.body?.levels !== undefined || req.body?.level !== undefined) {
      const levels = String(req.body.levels ?? req.body.level ?? "").trim();
      if (!levels) return res.status(400).json({ ok: false, message: "levels cannot be empty" });
      sets.push("`levels` = ?");
      params.push(levels);
    }

    if (req.body?.time !== undefined) {
      const time = String(req.body.time || "").trim();
      if (!time) return res.status(400).json({ ok: false, message: "time cannot be empty" });
      sets.push("`time` = ?");
      params.push(time);
    }

    if (req.body?.title !== undefined || req.body?.position !== undefined || req.body?.role !== undefined) {
      const title = String(req.body.title ?? req.body.position ?? req.body.role ?? "").trim();
      if (!title) return res.status(400).json({ ok: false, message: "title cannot be empty" });
      sets.push("`title` = ?");
      params.push(title);
    }

    if (req.body?.active !== undefined) {
      const active = normalize01(req.body.active, 0);
      sets.push("`active` = ?");
      params.push(active);
    }

    const hasFeatures =
      req.body?.features !== undefined || req.body?.feature !== undefined || req.body?.bullets !== undefined;
    const hasHeading = req.body?.features_heading !== undefined || req.body?.heading !== undefined;

    if (hasFeatures || hasHeading) {
      let headingIncoming = req.body?.features_heading ?? req.body?.heading ?? undefined;
      let featuresVal = req.body?.features ?? req.body?.feature ?? req.body?.bullets ?? undefined;

      let headingFinal = oldFeatures.heading;
      let itemsFinal = oldFeatures.items;

      if (headingIncoming !== undefined) {
        const h = String(headingIncoming || "").trim();
        headingFinal = h ? h : null;
      }

      if (featuresVal !== undefined) {
        if (typeof featuresVal === "string") {
          try { featuresVal = JSON.parse(featuresVal); } catch {}
        }

        if (featuresVal && typeof featuresVal === "object" && !Array.isArray(featuresVal)) {
          const items = Array.isArray(featuresVal.items) ? featuresVal.items : [];
          if (!items.length) return res.status(400).json({ ok: false, message: "features.items must be array (>=1)" });

          itemsFinal = items.map((x) => String(x || "").trim()).filter(Boolean);

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

// DELETE /api/jobs/:id
router.delete("/:id", async (req, res) => {
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

module.exports = router;
