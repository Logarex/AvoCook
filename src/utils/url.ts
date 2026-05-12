export function normalizeNextcloudUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isLocalUrl(url: string): boolean {
  const parsed = new URL(url);
  return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
}

export function assertSecureNextcloudUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !isLocalUrl(url)) {
    throw new Error("INSECURE_URL");
  }
}
