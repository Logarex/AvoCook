const tokens = new Map();
let adminToken;
const firestoreRoot = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function authenticate(request, env, fetcher = fetch) {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Response("Sign in required", { status: 401 });
  const idToken = authorization.slice(7);
  if (idToken.length > 8192) throw new Response("Invalid token", { status: 401 });
  const cached = tokens.get(idToken);
  if (cached?.expires > Date.now()) return { uid: cached.uid, authorization };
  // Google validates the Firebase token for this project's public Web API key.
  const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Response("Invalid sign-in", { status: 401 });
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!uid || data.users[0].disabled) throw new Response("Invalid sign-in", { status: 401 });
  // No user token is persisted. Keep only a short, bounded in-memory cache.
  if (tokens.size >= 100) tokens.clear();
  tokens.set(idToken, { uid, expires: Date.now() + 60000 });
  return { uid, authorization };
}

export async function readList(code, authorization, env, fetcher = fetch) {
  // Using the caller's ID token preserves the project's existing Firestore rules.
  const response = await fetcher(`${firestoreRoot(env)}/sharedLists/${code}`, {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Response("List is unavailable", { status: response.status === 404 ? 404 : 403 });
  return response.json();
}

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const encode = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)));

export async function googleReadToken(env, fetcher = fetch) {
  if (adminToken?.project === env.FIREBASE_PROJECT_ID && adminToken.expires > Date.now()) return adminToken.token;
  if (!env.GOOGLE_SERVICE_ACCOUNT) throw new Error("Missing read-only service account");
  const account = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  if (account.project_id !== env.FIREBASE_PROJECT_ID || !account.client_email || !account.private_key) throw new Error("Invalid service account project");
  const pem = account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (character) => character.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64url(new Uint8Array(signature))}` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Read-only Google authorization failed");
  const data = await response.json();
  if (!data.access_token) throw new Error("Missing Google access token");
  adminToken = { project: env.FIREBASE_PROJECT_ID, token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export async function changedLists(cursor, env, fetcher = fetch) {
  const token = await googleReadToken(env, fetcher);
  const query = {
    from: [{ collectionId: "sharedLists" }],
    orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "ASCENDING" }, { field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
    startAt: { values: [{ timestampValue: cursor.timestamp }, ...(cursor.name ? [{ referenceValue: cursor.name }] : [])], before: !cursor.name },
    limit: 100,
  };
  const response = await fetcher(`${firestoreRoot(env)}:runQuery`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: query }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Firestore recovery query failed (${response.status})`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid Firestore recovery response");
  return rows.flatMap((row) => row.document ? [row.document] : []);
}
