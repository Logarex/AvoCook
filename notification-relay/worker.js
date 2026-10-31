import { authenticate, readList, changedLists } from "./google.js";
import { syncDocument, dispatch, checkReceipts, versionKey } from "./delivery.js";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const validCode = (code) => typeof code === "string" && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code);
const logFailure = () => console.error("Notification relay operation failed; check service configuration and free quotas.");

export async function handleRequest(request, env, context, services = {}) {
  const auth = services.authenticate ?? authenticate;
  const read = services.readList ?? readList;
  const send = services.dispatch ?? dispatch;
  try {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/health") {
      return json({ configured: Boolean(env.DB && env.GOOGLE_SERVICE_ACCOUNT && env.FIREBASE_PROJECT_ID && env.FIREBASE_WEB_API_KEY), service: "avocook-notifications", billing: "Use Workers Free and Firebase Spark" });
    }
    if (request.method !== "POST" || !["/subscription", "/notify"].includes(path)) return json({ error: "Not found" }, 404);
    const { uid, authorization } = await auth(request, env);
    const raw = await request.text();
    if (raw.length > 8192) return json({ error: "Request too large" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid request" }, 400);
    if (path === "/notify") {
      if (!validCode(body.code)) return json({ error: "Invalid code" }, 400);
      const document = await read(body.code, authorization, env);
      await syncDocument(document, env, { knownOnly: true });
      context.waitUntil(send(env).catch(logFailure));
      return json({ accepted: true }, 202);
    }
    if (typeof body.deviceId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.deviceId)) return json({ error: "Invalid device" }, 400);
    const id = `${uid}:${body.deviceId}`;
    if (body.code === null || body.token === null) {
      await env.DB.prepare("DELETE FROM subscriptions WHERE id = ?").bind(id).run();
      return json({ enabled: false });
    }
    if (!validCode(body.code) || typeof body.token !== "string" || body.token.length > 250 ||
      !/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(body.token) ||
      ![body.title, body.added, body.removed].every((value) => typeof value === "string" && value.length > 0 && value.length <= 250)) {
      return json({ error: "Invalid subscription" }, 400);
    }
    if (!env.GOOGLE_SERVICE_ACCOUNT) return json({ error: "Recovery service is not configured" }, 503);
    const document = await read(body.code, authorization, env);
    // Initialize the baseline before enrolling: joining must not replay old changes.
    await syncDocument(document, env);
    const now = Date.now();
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions WHERE code = ? AND expires_at > ? AND id != ?")
      .bind(body.code, now, id).first();
    if (count.count >= 100) return json({ error: "List notification capacity reached" }, 429);
    await env.DB.prepare(`INSERT OR REPLACE INTO subscriptions
      (id, uid, device_id, code, token, title, added, removed, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, uid, body.deviceId, body.code, body.token, body.title, body.added, body.removed, now + 90 * 86400000).run();
    context.waitUntil(send(env).catch(logFailure));
    return json({ enabled: true });
  } catch (error) {
    if (error instanceof Response) return error;
    logFailure(error);
    return json({ error: "Notification service temporarily unavailable" }, 503);
  }
}

export async function recover(env, services = {}, now = Date.now()) {
  const send = services.dispatch ?? dispatch;
  const receipts = services.checkReceipts ?? checkReceipts;
  // Bound retention using ordinary D1 deletes, with no paid Firestore TTL.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM subscriptions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM deliveries WHERE created_at < ?").bind(now - 2 * 86400000),
    env.DB.prepare("DELETE FROM list_state WHERE updated_at < ? AND code NOT IN (SELECT code FROM subscriptions)").bind(now - 90 * 86400000),
  ]);
  const active = await env.DB.prepare("SELECT id FROM subscriptions LIMIT 1").first();
  if (!active) return;
  // Already queued notifications can still be retried if the Firestore read quota is exhausted.
  await send(env);
  await receipts(env);
  const saved = await env.DB.prepare("SELECT value FROM metadata WHERE key = 'cursor'").first();
  const cursor = saved ? JSON.parse(saved.value) : { timestamp: new Date(now - 3600000).toISOString() };
  const documents = await (services.changedLists ?? changedLists)(cursor, env);
  for (const document of documents) {
    await syncDocument(document, env, { knownOnly: true, now });
    const timestamp = document.fields?.updatedAt?.timestampValue;
    if (!timestamp) throw new Error("Missing list update timestamp");
    // Advance only after durable processing. An interrupted invocation safely replays this page.
    await env.DB.prepare(`INSERT INTO metadata VALUES ('cursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value
      WHERE json_extract(metadata.value, '$.timestamp') < json_extract(excluded.value, '$.timestamp')
      OR (json_extract(metadata.value, '$.timestamp') = json_extract(excluded.value, '$.timestamp')
        AND json_extract(metadata.value, '$.name') < json_extract(excluded.value, '$.name'))`)
      .bind(JSON.stringify({ timestamp: versionKey(timestamp), name: document.name })).run();
  }
  await send(env);
}

export default {
  fetch: handleRequest,
  async scheduled(_event, env, context) {
    context.waitUntil(recover(env).catch(logFailure));
  },
};
