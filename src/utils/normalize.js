// src/utils/normalize.js
const { absUrl } = require("./url");
const { parseJsonMaybe, safeJson, safeJsonArray } = require("./json");

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

function pickFirst(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
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
        } catch {}
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
  const parsed = parseJsonMaybe(raw, raw);

  let heading = null;
  let items = [];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    heading = parsed.heading ?? parsed.features_heading ?? parsed.title ?? null;
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } else if (typeof parsed === "string") {
    const s = parsed.trim();
    if (s) items = s.split(/\r?\n/g).map((x) => x.trim()).filter(Boolean);
  }

  if (headingOverride !== undefined) {
    const h = String(headingOverride || "").trim();
    heading = h ? h : null;
  }

  items = (items || []).map((x) => String(x || "").trim()).filter(Boolean);
  return { heading, items };
}

function normalizeJobsListRow(row) {
  const r = { ...row };

  r.time = sqlDateTime(r.time);

  const f = normalizeJobsFeatures(r.features);
  r.features = f;
  r.features_heading = f.heading;
  r.features_items = f.items;

  let a = r.active;
  if (Buffer.isBuffer(a)) a = a[0];
  if (a instanceof Uint8Array) a = a[0];
  r.active = Number(a) === 1 ? 1 : 0;

  return r;
}

function normalizeTimeForShow(raw, def = 3) {
  if (raw === undefined || raw === null || raw === "") return def;

  let n = raw;
  if (Buffer.isBuffer(n)) n = n[0];
  if (n instanceof Uint8Array) n = n[0];

  const num = Number(String(n).trim());
  if (!Number.isFinite(num)) return def;
  if (num <= 0) return def;
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

module.exports = {
  normalize01,
  pickFirst,
  parseFormArrayFromBody,
  parseItemsObj,
  classifyProductsFromFilterproduct,
  normalizeMemberRow,
  normalizeNewsRow,
  safeJson,
  safeJsonArray,
  parseJsonMaybe,
  sqlDateTime,
  normalizeJobsFeatures,
  normalizeJobsListRow,
  normalizeTimeForShow,
  nowSqlTimestamp,
  isSqlDatetimeLike,
  normalizeAnnouncementRow,
};
