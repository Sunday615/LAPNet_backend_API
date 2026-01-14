// services/notify.service.js
import db from "../db.js";

// replace {{key}} ด้วย value
function renderTemplate(tpl = "", ctx = {}) {
  return String(tpl).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = ctx[key];
    return val === undefined || val === null ? "" : String(val);
  });
}

async function getRule(module, event) {
  const [rows] = await db.query(
    `SELECT * FROM notification_rules WHERE module=? AND event=? AND enabled=1 LIMIT 1`,
    [module, event]
  );
  return rows?.[0] || null;
}

async function insertNotificationRow(payload) {
  const {
    rule_id,
    module,
    event,
    entity_id,
    actor,
    title,
    message,
    channel,
    recipients,
    status = "queued",
    meta = null,
  } = payload;

  const [res] = await db.query(
    `INSERT INTO notifications
      (rule_id, module, event, entity_id, actor, title, message, channel, recipients, status, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule_id ?? null,
      module,
      event,
      entity_id ?? null,
      actor ?? null,
      title,
      message,
      channel,
      JSON.stringify(recipients || []),
      status,
      meta ? JSON.stringify(meta) : null,
    ]
  );

  return res.insertId;
}

/**
 * เรียกอันนี้หลัง insert/edit/delete/set_active สำเร็จ
 * ctx: { module, event, entityId, actor, meta }
 */
export async function notify(ctx) {
  const { module, event, entityId, actor, meta } = ctx;

  const rule = await getRule(module, event);
  if (!rule) return { ok: true, skipped: true };

  const channels = JSON.parse(rule.channels || "{}");
  const recipients = JSON.parse(rule.recipients || "[]");

  const templateCtx = {
    module,
    event,
    entity_id: entityId,
    actor: actor || "system",
    ...(meta || {}),
  };

  const title =
    rule.title_template?.length
      ? renderTemplate(rule.title_template, templateCtx)
      : `${module}: ${event}`;

  const message =
    rule.body_template?.length
      ? renderTemplate(rule.body_template, templateCtx)
      : `event=${event} module=${module} entity_id=${entityId || "-"}`;

  const createdIds = [];

  // in-app
  if (channels.inApp === true) {
    createdIds.push(
      await insertNotificationRow({
        rule_id: rule.rule_id,
        module,
        event,
        entity_id: entityId,
        actor,
        title,
        message,
        channel: "in-app",
        recipients,
        status: "sent",
        meta,
      })
    );
  }

  
  if (channels.email === true) {
    createdIds.push(
      await insertNotificationRow({
        rule_id: rule.rule_id,
        module,
        event,
        entity_id: entityId,
        actor,
        title,
        message,
        channel: "email",
        recipients,
        status: "queued",
        meta,
      })
    );
  }

 
  if (channels.push === true) {
    createdIds.push(
      await insertNotificationRow({
        rule_id: rule.rule_id,
        module,
        event,
        entity_id: entityId,
        actor,
        title,
        message,
        channel: "push",
        recipients,
        status: "queued",
        meta,
      })
    );
  }

  return { ok: true, rule_id: rule.rule_id, createdIds };
}
