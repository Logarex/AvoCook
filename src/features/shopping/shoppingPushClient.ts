import Constants from "expo-constants";
import { waitForAuth } from "../firebase/firebaseClient";

export function shoppingRelayUrl(): string | null {
  const configured = Constants.expoConfig?.extra?.shoppingPushRelayUrl;
  if (typeof configured !== "string" || !configured.trim()) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
}

export async function requestShoppingRelay(path: "/subscription" | "/notify", data: unknown) {
  const base = shoppingRelayUrl();
  if (!base) throw new Error("Shopping push relay is not configured");
  const user = await waitForAuth();
  if (!user) throw new Error("Shopping push sign-in unavailable");
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Shopping push relay failed (${response.status})`);
    return await response.json() as { enabled?: boolean; accepted?: boolean };
  } finally { clearTimeout(timeout); }
}

export async function notifySharedListChanged(code: string) {
  // Firebase writes stay independent of notification availability and free quotas.
  if (!shoppingRelayUrl()) return;
  try { await requestShoppingRelay("/notify", { code: code.trim().toUpperCase() }); }
  catch { console.warn("[ShoppingPush] Immediate notification failed; the server recovery will retry."); }
}
