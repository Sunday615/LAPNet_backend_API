// src/config/tables.js
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

module.exports = {
  assertSafeTableName,
  NEWS_TABLE,
  MEMBERS_TABLE,
  ANNOUNCEMENT_TABLE,
  JOBS_LIST_TABLE,
};
