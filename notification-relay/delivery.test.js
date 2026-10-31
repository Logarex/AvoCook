import test from "node:test";
import assert from "node:assert/strict";
import { database, document, subscribe } from "./testDatabase.js";
import { versionKey, syncDocument, dispatch, checkReceipts } from "./delivery.js";

const now = Date.parse("2026-10-30T12:00:00Z");
async function fixture() {
  const env = { DB: database() };
  await subscribe(env.DB, "receiver", "ABC234", now);
  await subscribe(env.DB, "sender", "ABC234", now);
  await syncDocument(document([], new Date(now - 1000).toISOString()), env, { now });
  return env;
}
const count = async (env) => (await env.DB.prepare("SELECT COUNT(*) AS count FROM deliveries").first()).count;

test("Firestore versions preserve nanosecond ordering", () => {
  assert.equal(versionKey("2026-10-30T12:00:00Z"), "2026-10-30T12:00:00.000000000Z");
  assert.ok(versionKey("2026-10-30T12:00:00.000000002Z") > versionKey("2026-10-30T12:00:00.000000001Z"));
});
test("notifies the receiver, including the first item in an empty list, but excludes the sender", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  assert.equal(await count(env), 1);
  const row = await env.DB.prepare("SELECT * FROM deliveries").first();
  assert.equal(JSON.parse(row.message).to, "ExpoPushToken[receiver]");
  assert.equal(JSON.parse(row.message).body, "1 ajouts");
});
test("concurrent hints and recovery enqueue the same change only once", async () => {
  const env = await fixture();
  const updated = document(["milk"], new Date(now).toISOString());
  await Promise.all([syncDocument(updated, env, { now }), syncDocument(updated, env, { now })]);
  assert.equal(await count(env), 1);
});
test("concurrent different updates recompute the delta instead of losing the newer update", async () => {
  const env = await fixture();
  await Promise.all([
    syncDocument(document(["milk"], new Date(now).toISOString()), env, { now }),
    syncDocument(document(["milk", "bread"], new Date(now + 1).toISOString()), env, { now }),
  ]);
  const state = await env.DB.prepare("SELECT * FROM list_state").first();
  assert.deepEqual(JSON.parse(state.item_ids), ["milk", "bread"]);
  const { results } = await env.DB.prepare("SELECT message FROM deliveries").all();
  assert.equal(results.reduce((total, row) => total + Number(JSON.parse(row.message).body.split(" ")[0]), 0), 2);
});
test("old snapshots cannot roll back the baseline or repeat notifications", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  await syncDocument(document([], new Date(now - 500).toISOString()), env, { now });
  assert.equal(await count(env), 1);
  assert.deepEqual(JSON.parse((await env.DB.prepare("SELECT * FROM list_state").first()).item_ids), ["milk"]);
});
test("unchanged item IDs do not create a notification", async () => {
  const env = await fixture();
  await syncDocument(document([], new Date(now).toISOString()), env, { now });
  assert.equal(await count(env), 0);
});
test("old offline changes update the baseline without delivering a backlog", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now: now + 7200000 });
  assert.equal(await count(env), 0);
});
test("unsubscribing or changing lists suppresses pending sends", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  await subscribe(env.DB, "receiver", "DEF567", now);
  await dispatch(env, () => { throw new Error("Must not contact Expo"); }, now);
  assert.equal((await env.DB.prepare("SELECT * FROM deliveries").first()).sent_at, null);
});
test("durable messages are retried after an Expo outage without depending on the app", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  await assert.rejects(dispatch(env, async () => new Response("Unavailable", { status: 503 }), now));
  let sends = 0;
  const send = async (_url, options) => {
    sends++; assert.equal(JSON.parse(options.body).length, 1);
    return Response.json({ data: [{ status: "ok", id: "ticket" }] });
  };
  await dispatch(env, send, now + 61000);
  await dispatch(env, send, now + 62000);
  assert.equal(sends, 1);
  assert.equal((await env.DB.prepare("SELECT * FROM deliveries").first()).ticket_id, "ticket");
});
test("concurrent delivery attempts claim a message once", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  let sends = 0;
  const send = async () => { sends++; return Response.json({ data: [{ status: "ok", id: "ticket" }] }); };
  await Promise.all([dispatch(env, send, now), dispatch(env, send, now)]);
  assert.equal(sends, 1);
});
test("receipts remove invalid device registrations", async () => {
  const env = await fixture();
  await syncDocument(document(["milk"], new Date(now).toISOString()), env, { now });
  await dispatch(env, async () => Response.json({ data: [{ status: "ok", id: "ticket" }] }), now);
  await checkReceipts(env, async () => Response.json({ data: { ticket: { status: "error", details: { error: "DeviceNotRegistered" } } } }), now + 16 * 60000);
  assert.equal(await env.DB.prepare("SELECT * FROM subscriptions WHERE device_id = 'receiver'").first(), null);
});
