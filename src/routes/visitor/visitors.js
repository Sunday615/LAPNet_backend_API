// src/routes/visitor/visitors.js
const express = require("express");
const crypto = require("crypto");
const geoip = require("geoip-lite");
const pool = require("../../db/pool"); // :contentReference[oaicite:3]{index=3}

const router = express.Router();

function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

function getClientIp(req) {
  // if have behide Cloudflare / Proxy
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();

  // express like have req.ip but assign trust proxy corllect at app.js
  if (req.ip) return req.ip;

  return req.socket?.remoteAddress || null;
}

function getCountryFromReq(req, ip) {
  // Cloudflare header (optional)
  const cfCountry = req.headers["cf-ipcountry"];
  if (cfCountry && cfCountry !== "XX") {
    return { country_code: String(cfCountry), country_name: String(cfCountry) };
  }

  if (!ip) return { country_code: null, country_name: null };

  // geoip-lite
  const geo = geoip.lookup(ip);
  if (!geo?.country) return { country_code: null, country_name: null };

  return { country_code: geo.country, country_name: geo.country };
}

function normalizeRange(range) {
  // 1day, 1week, 1month, 3month
  if (range === "1d") return { days: 1, bucket: "hour" };
  if (range === "7d") return { days: 7, bucket: "day" };
  if (range === "30d") return { days: 30, bucket: "day" };
  if (range === "90d") return { days: 90, bucket: "day" };
  // default
  return { days: 7, bucket: "day" };
}

function makeSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

/**
 * POST /api/visitor/track
 * frontend get api by pageview (loading /change route)
 * body: { path, referrer }
 */
router.post("/track", express.json(), async (req, res) => {
  try {
    let sid = getCookie(req, "vid");
    if (!sid) {
      sid = makeSessionId();
      res.cookie("vid", sid, {
        httpOnly: true,
        sameSite: "Lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });
    }

    const ip = getClientIp(req);
    const ua = req.headers["user-agent"] || null;
    const path = req.body?.path || req.query?.path || req.headers["x-page-path"] || null;
    const referrer = req.body?.referrer || req.headers["referer"] || null;
    const { country_code, country_name } = getCountryFromReq(req, ip);

    // 1) upsert sessions
    await pool.execute(
      `
      INSERT INTO visitors_sessions
        (session_id, first_seen_at, last_seen_at, ip, country_code, country_name, user_agent, pageviews)
      VALUES
        (?, NOW(), NOW(), ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        last_seen_at = NOW(),
        pageviews = pageviews + 1,
        ip = VALUES(ip),
        country_code = VALUES(country_code),
        country_name = VALUES(country_name),
        user_agent = VALUES(user_agent)
      `,
      [sid, ip, country_code, country_name, ua]
    );

    // 2) insert event
    await pool.execute(
      `
      INSERT INTO visitors_events
        (occurred_at, session_id, ip, country_code, country_name, path, referrer, user_agent)
      VALUES
        (NOW(), ?, ?, ?, ?, ?, ?, ?)
      `,
      [sid, ip, country_code, country_name, path, referrer, ua]
    );

    res.json({ ok: true, session_id: sid });
  } catch (err) {
    // dont addd fuction tracking website is down 
    res.status(200).json({ ok: false });
  }
});

/**
 * POST /api/visitor/ping
 * use for  realtime (heartbeat) — frontend realtime with around 15 sec for checking realtime user
 */
router.post("/ping", async (req, res) => {
  try {
    const sid = getCookie(req, "vid");
    if (!sid) return res.json({ ok: true });

    await pool.execute(
      `UPDATE visitors_sessions SET last_seen_at = NOW() WHERE session_id = ?`,
      [sid]
    );

    res.json({ ok: true });
  } catch {
    res.status(200).json({ ok: false });
  }
});

/**
 * GET /api/visitor/stats?range=1d|7d|30d|90d
 * return totals + series (graph) + topPages + byCountry
 */
router.get("/stats", async (req, res) => {
  try {
    const { days, bucket } = normalizeRange(String(req.query.range || "7d"));
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [[totals]] = await pool.execute(
      `
      SELECT
        COUNT(*) AS pageviews,
        COUNT(DISTINCT session_id) AS uniqueVisitors
      FROM visitors_events
      WHERE occurred_at >= ?
      `,
      [from]
    );

    let seriesSql;
    if (bucket === "hour") {
      seriesSql = `
        SELECT
          DATE_FORMAT(occurred_at, '%Y-%m-%d %H:00:00') AS bucket,
          COUNT(*) AS pageviews,
          COUNT(DISTINCT session_id) AS uniqueVisitors
        FROM visitors_events
        WHERE occurred_at >= ?
        GROUP BY bucket
        ORDER BY bucket
      `;
    } else {
      seriesSql = `
        SELECT
          DATE_FORMAT(occurred_at, '%Y-%m-%d') AS bucket,
          COUNT(*) AS pageviews,
          COUNT(DISTINCT session_id) AS uniqueVisitors
        FROM visitors_events
        WHERE occurred_at >= ?
        GROUP BY bucket
        ORDER BY bucket
      `;
    }

    const [series] = await pool.execute(seriesSql, [from]);

    const [topPages] = await pool.execute(
      `
      SELECT COALESCE(path, '(unknown)') AS path, COUNT(*) AS pageviews
      FROM visitors_events
      WHERE occurred_at >= ?
      GROUP BY path
      ORDER BY pageviews DESC
      LIMIT 20
      `,
      [from]
    );

    const [byCountry] = await pool.execute(
      `
      SELECT
        COALESCE(country_code, '??') AS country_code,
        COALESCE(country_name, 'Unknown') AS country,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT session_id) AS uniqueVisitors
      FROM visitors_events
      WHERE occurred_at >= ?
      GROUP BY country_code, country
      ORDER BY pageviews DESC
      LIMIT 50
      `,
      [from]
    );

    res.json({
      ok: true,
      range: String(req.query.range || "7d"),
      from: from.toISOString(),
      totals,
      series,
      topPages,
      byCountry,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "stats_failed" });
  }
});

/**
 * GET /api/visitor/realtime?windowSec=300
 * activeVisitors = sessions at last_seen_at in window
 */
router.get("/realtime", async (req, res) => {
  try {
    const windowSec = Math.max(30, Math.min(3600, Number(req.query.windowSec || 300)));
    const since = new Date(Date.now() - windowSec * 1000);

    const [[active]] = await pool.execute(
      `SELECT COUNT(*) AS activeVisitors FROM visitors_sessions WHERE last_seen_at >= ?`,
      [since]
    );

    const [byCountry] = await pool.execute(
      `
      SELECT
        COALESCE(country_code, '??') AS country_code,
        COALESCE(country_name, 'Unknown') AS country,
        COUNT(*) AS activeVisitors
      FROM visitors_sessions
      WHERE last_seen_at >= ?
      GROUP BY country_code, country
      ORDER BY activeVisitors DESC
      LIMIT 20
      `,
      [since]
    );

    res.json({ ok: true, windowSec, since: since.toISOString(), ...active, byCountry });
  } catch {
    res.status(500).json({ ok: false, error: "realtime_failed" });
  }
});

/**
 * GET /api/visitor/realtime/stream?windowSec=300
 * SSE for  admin dashboard (update around 2 sec)
 */
router.get("/realtime/stream", async (req, res) => {
  const windowSec = Math.max(30, Math.min(3600, Number(req.query.windowSec || 300)));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const timer = setInterval(async () => {
    try {
      const since = new Date(Date.now() - windowSec * 1000);
      const [[active]] = await pool.execute(
        `SELECT COUNT(*) AS activeVisitors FROM visitors_sessions WHERE last_seen_at >= ?`,
        [since]
      );
      res.write(`data: ${JSON.stringify({ ok: true, windowSec, activeVisitors: active.activeVisitors })}\n\n`);
    } catch {
      // ignore
    }
  }, 2000);

  req.on("close", () => {
    clearInterval(timer);
    res.end();
  });
});

module.exports = router;
