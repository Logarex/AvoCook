import test from "node:test";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { authenticate, readList, googleReadToken, changedLists } from "./google.js";

const project = "avocook-5eb31";
test("Firebase ID tokens are validated by Google rather than trusted from client claims", async () => {
  const request = new Request("https://relay/", { headers: { Authorization: "Bearer valid-test-token" } });
  const result = await authenticate(request, { FIREBASE_WEB_API_KEY: "test-key" }, async (url, options) => {
    assert.equal(url, "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key");
    assert.deepEqual(JSON.parse(options.body), { idToken: "valid-test-token" });
    return Response.json({ users: [{ localId: "verified-user" }] });
  });
  assert.equal(result.uid, "verified-user");
});
test("invalid Firebase tokens cannot access the relay", async () => {
  await assert.rejects(authenticate(new Request("https://relay/", { headers: { Authorization: "Bearer invalid-test-token" } }),
    { FIREBASE_WEB_API_KEY: "test-key" }, async () => new Response("Invalid", { status: 400 })), (error) => error instanceof Response && error.status === 401);
});
test("list reads use the caller's token and preserve Firestore rules", async () => {
  await assert.rejects(readList("ABC234", "Bearer caller-token", { FIREBASE_PROJECT_ID: project }, async (url, options) => {
    assert.ok(url.endsWith("/documents/sharedLists/ABC234"));
    assert.equal(options.headers.Authorization, "Bearer caller-token");
    return new Response("Forbidden", { status: 403 });
  }), (error) => error instanceof Response && error.status === 403);
});
test("recovery uses a signed server-only service account token and an exclusive timestamp/name cursor", async () => {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const key = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const env = { FIREBASE_PROJECT_ID: project, GOOGLE_SERVICE_ACCOUNT: JSON.stringify({ project_id: project,
    client_email: "reader@example.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----` }) };
  const fetcher = async (url, options) => {
    if (url.includes("oauth2.googleapis.com")) {
      const assertion = options.body.get("assertion");
      const [header, claims, signature] = assertion.split(".");
      assert.equal(JSON.parse(Buffer.from(claims, "base64url")).scope, "https://www.googleapis.com/auth/datastore");
      assert.equal(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, Buffer.from(signature, "base64url"), new TextEncoder().encode(`${header}.${claims}`)), true);
      return Response.json({ access_token: "server-token", expires_in: 3600 });
    }
    assert.equal(options.headers.Authorization, "Bearer server-token");
    const query = JSON.parse(options.body).structuredQuery;
    assert.equal(query.limit, 100);
    assert.equal(query.startAt.before, false);
    assert.equal(query.startAt.values[1].referenceValue, "previous-document");
    return Response.json([{ readTime: "time" }]);
  };
  assert.equal(await googleReadToken(env, fetcher), "server-token");
  assert.deepEqual(await changedLists({ timestamp: "2026-10-30T12:00:00Z", name: "previous-document" }, env, fetcher), []);
});
