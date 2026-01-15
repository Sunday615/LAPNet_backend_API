
const express = require("express");


const poolMod = require("../db/pool");
const rawPool = poolMod.pool || poolMod;

// ✅ if  callback pool convert to promise pool
const pool = typeof rawPool.promise === "function" ? rawPool.promise() : rawPool;



const router = express.Router();

/**
 * POST /api/form-templates/upsert
 * body: { template_uid, source_form_id, name, note, payload }
 */
router.post("/upsert", async (req, res) => {
  try {
    const { template_uid, source_form_id, name, note, payload } = req.body || {};

    if (!template_uid || !name || payload == null) {
      return res.status(400).json({
        ok: false,
        message: "template_uid, name, payload are required",
      });
    }

    const payloadStr = JSON.stringify(payload);

    // ✅ Compatible syntax (MySQL 5.7/8.0)
    const sql = `
      INSERT INTO form_templates (template_uid, source_form_id, name, note, payload)
      VALUES (?, ?, ?, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        source_form_id = VALUES(source_form_id),
        name          = VALUES(name),
        note          = VALUES(note),
        payload       = VALUES(payload),
        updated_at    = CURRENT_TIMESTAMP(3)
    `;

    await db.execute(sql, [
      String(template_uid),
      source_form_id != null && String(source_form_id).trim() ? String(source_form_id) : null,
      String(name),
      String(note || ""),
      payloadStr,
    ]);

    const [rows] = await db.execute(
      "SELECT id FROM form_templates WHERE template_uid = ? LIMIT 1",
      [String(template_uid)]
    );

    return res.json({ ok: true, id: rows?.[0]?.id || null });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

module.exports = router;
