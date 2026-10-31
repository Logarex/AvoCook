import { shoppingChanges, shoppingMessage } from "./shoppingMessages.js";

// Normalize nanoseconds so Firestore versions can be compared without rounding.
export function versionKey(value) {
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(value ?? "");
  if (!match) throw new Error("Invalid document version");
  return `${match[1]}.${(match[2] ?? "").padEnd(9, "0")}Z`;
}
export function documentState(document) {
  const code = document.name?.split("/").at(-1);
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code ?? "")) throw new Error("Invalid list code");
  const values = document.fields?.items?.arrayValue?.values ?? [];
  if (values.length > 5000) throw new Error("List too large");
  return { code, version: versionKey(document.updateTime), ids: [...new Set(values.flatMap((item) => {
    const id = item.mapValue?.fields?.id?.stringValue;
    return typeof id === "string" ? [id] : [];
  }))], actor: document.fields?.lastUpdatedBy?.stringValue ?? "" };
}

export async function syncDocument(document, env, { knownOnly = false, now = Date.now(), attempt = 0 } = {}) {
  if (attempt > 3) throw new Error("Concurrent list changes; recovery will retry");
  const current = documentState(document);
  const previous = await env.DB.prepare("SELECT * FROM list_state WHERE code = ?").bind(current.code).first();
  if (!previous) {
    if (!knownOnly) await env.DB.prepare("INSERT OR IGNORE INTO list_state VALUES (?, ?, ?, ?)")
      .bind(current.code, current.version, JSON.stringify(current.ids), now).run();
    return;
  }
  if (current.version <= previous.version) return;
  const changes = shoppingChanges(JSON.parse(previous.item_ids).map((id) => ({ id })), current.ids.map((id) => ({ id })));
  const eventId = `${current.code}:${current.version}`;
  const statements = [];
  // Recovery must not deliver a backlog of obsolete notifications.
  if ((changes.added || changes.removed) && now - Date.parse(current.version) < 3600000) {
    const { results } = await env.DB.prepare(`SELECT * FROM subscriptions WHERE code = ? AND expires_at > ?
      AND token NOT IN (SELECT token FROM subscriptions WHERE code = ? AND device_id = ?) LIMIT 100`)
      .bind(current.code, now, current.code, current.actor).all();
    for (const subscription of results) {
      const message = shoppingMessage(subscription, changes, current.code, eventId);
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO deliveries
        (id, subscription_id, token, message, created_at)
        SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM list_state WHERE code = ? AND version = ?)`)
        .bind(`${eventId}:${subscription.id}`, subscription.id, subscription.token, JSON.stringify(message), now, current.code, previous.version));
    }
  }
  // D1 batches are transactional: only one concurrent reader may advance this version and enqueue messages.
  statements.push(env.DB.prepare("UPDATE list_state SET version = ?, item_ids = ?, updated_at = ? WHERE code = ? AND version = ?")
    .bind(current.version, JSON.stringify(current.ids), now, current.code, previous.version));
  const result = await env.DB.batch(statements);
  if (result.at(-1).meta.changes === 0) {
    // Another invocation advanced the baseline. Recompute the delta rather than
    // letting recovery advance its cursor past an update that was not processed.
    await syncDocument(document, env, { knownOnly, now, attempt: attempt + 1 });
  }
}

export async function dispatch(env, fetcher = fetch, now = Date.now()) {
  const { results } = await env.DB.prepare(`SELECT d.* FROM deliveries d JOIN subscriptions s ON s.id = d.subscription_id AND s.token = d.token
    WHERE d.sent_at IS NULL AND d.next_attempt_at <= ? AND d.created_at > ? AND s.expires_at > ?
    AND s.code = json_extract(d.message, '$.data.code') LIMIT 100`).bind(now, now - 3600000, now).all();
  if (!results.length) return;
  const claims = await env.DB.batch(results.map((row) => env.DB.prepare(`UPDATE deliveries SET next_attempt_at = ?, attempts = attempts + 1
    WHERE id = ? AND sent_at IS NULL AND next_attempt_at = ?`).bind(now + 60000, row.id, row.next_attempt_at)));
  const claimed = results.filter((_, index) => claims[index].meta.changes === 1);
  if (!claimed.length) return;
  const response = await fetcher("https://exp.host/--/api/v2/push/send", {
    method: "POST", headers: { "Content-Type": "application/json", ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(claimed.map((row) => JSON.parse(row.message))), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Expo send failed (${response.status})`);
  const payload = await response.json();
  const tickets = Array.isArray(payload.data) ? payload.data : [payload.data];
  for (let index = 0; index < claimed.length; index++) {
    const row = claimed[index];
    const ticket = tickets[index];
    if (ticket?.status === "ok" && typeof ticket.id === "string") {
      await env.DB.prepare("UPDATE deliveries SET sent_at = ?, ticket_id = ? WHERE id = ?").bind(now, ticket.id, row.id).run();
    } else if (ticket?.details?.error === "DeviceNotRegistered") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM subscriptions WHERE id = ? AND token = ?").bind(row.subscription_id, row.token),
        env.DB.prepare("UPDATE deliveries SET sent_at = ?, receipt_checked = 1 WHERE id = ?").bind(now, row.id),
      ]);
    } else {
      // Keep the message for a later free cron invocation, with bounded backoff.
      await env.DB.prepare("UPDATE deliveries SET next_attempt_at = ? WHERE id = ?")
        .bind(now + Math.min(300000, 60000 * 2 ** Math.min(row.attempts, 3)), row.id).run();
    }
  }
}

export async function checkReceipts(env, fetcher = fetch, now = Date.now()) {
  const { results } = await env.DB.prepare(`SELECT * FROM deliveries WHERE receipt_checked = 0
    AND ticket_id IS NOT NULL AND sent_at < ? LIMIT 100`).bind(now - 15 * 60000).all();
  if (!results.length) return;
  const response = await fetcher("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST", headers: { "Content-Type": "application/json", ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify({ ids: results.map((row) => row.ticket_id) }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Expo receipts failed (${response.status})`);
  const { data } = await response.json();
  for (const row of results) {
    const receipt = data?.[row.ticket_id];
    if (!receipt && now - row.sent_at < 86400000) continue;
    if (receipt?.details?.error === "DeviceNotRegistered") await env.DB.prepare("DELETE FROM subscriptions WHERE id = ? AND token = ?")
      .bind(row.subscription_id, row.token).run();
    if (receipt?.status === "error") console.error("Push delivery failed", receipt.details?.error);
    await env.DB.prepare("UPDATE deliveries SET receipt_checked = 1 WHERE id = ?").bind(row.id).run();
  }
}
