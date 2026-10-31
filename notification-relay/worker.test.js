import test from "node:test";
import assert from "node:assert/strict";
import { database, document, subscribe } from "./testDatabase.js";
import { handleRequest, recover } from "./worker.js";
import { syncDocument, dispatch } from "./delivery.js";

const request = (path, body) => new Request(`https://relay.workers.dev${path}`, { method: "POST", body: JSON.stringify(body) });
const context = () => ({ pending: [], waitUntil(promise) { this.pending.push(promise); } });
const services = {
  authenticate: async () => ({ uid: "user", authorization: "Bearer token" }),
  readList: async () => document([]), dispatch: async () => {},
};
const enrollment = { deviceId: "device", code: "ABC234", token: "ExpoPushToken[device]", title: "Courses", added: "Ajout", removed: "Suppression" };

test("requires authentication before accessing notification data", async () => {
  const env = { DB: database() };
  const response = await handleRequest(request("/subscription", enrollment), env, context());
  assert.equal(response.status, 401);
});
test("a forbidden Firestore list cannot be subscribed to", async () => {
  const env = { DB: database(), GOOGLE_SERVICE_ACCOUNT: "test-only" };
  const response = await handleRequest(request("/subscription", enrollment), env, context(), {
    ...services, readList: async () => { throw new Response("Forbidden", { status: 403 }); },
  });
  assert.equal(response.status, 403);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions").first()).count, 0);
});
test("enrolls only after seeding a baseline and removes only the caller's device", async () => {
  const env = { DB: database(), GOOGLE_SERVICE_ACCOUNT: "test-only" };
  let response = await handleRequest(request("/subscription", enrollment), env, context(), services);
  assert.equal(response.status, 200);
  assert.ok(await env.DB.prepare("SELECT * FROM list_state").first());
  await subscribe(env.DB, "other-device");
  response = await handleRequest(request("/subscription", { deviceId: "device", code: null, token: null }), env, context(), services);
  assert.equal(response.status, 200);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions").first()).count, 1);
});
test("hints never trust client-provided counts or recipients", async () => {
  const env = { DB: database() };
  const now = Date.now();
  await syncDocument(document([], new Date(now - 1000).toISOString()), env);
  await subscribe(env.DB);
  const response = await handleRequest(request("/notify", { code: "ABC234", added: 999, to: "attacker" }), env, context(), {
    ...services, readList: async () => document(["milk"], new Date(now).toISOString()),
  });
  assert.equal(response.status, 202);
  const message = JSON.parse((await env.DB.prepare("SELECT * FROM deliveries").first()).message);
  assert.equal(message.to, "ExpoPushToken[receiver]");
  assert.equal(message.body, "1 ajouts");
});
test("server recovery delivers a change even when the sender never calls the relay", async () => {
  const now = Date.now();
  const env = { DB: database() };
  await syncDocument(document([], new Date(now - 1000).toISOString()), env, { now });
  await subscribe(env.DB, "receiver", "ABC234", now);
  let sent = 0;
  const recovery = {
    changedLists: async () => [document(["milk"], new Date(now).toISOString())],
    dispatch: (environment) => dispatch(environment, async () => { sent++; return Response.json({ data: [{ status: "ok", id: "ticket" }] }); }, now),
    checkReceipts: async () => {},
  };
  await recover(env, recovery, now);
  await recover(env, recovery, now + 1000);
  assert.equal(sent, 1);
  const cursor = JSON.parse((await env.DB.prepare("SELECT * FROM metadata WHERE key = 'cursor'").first()).value);
  assert.equal(cursor.name, document([]).name);
});
test("no registered devices means no periodic Firebase reads", async () => {
  const env = { DB: database() };
  await recover(env, { changedLists: async () => { throw new Error("Should not read Firebase"); } });
});
