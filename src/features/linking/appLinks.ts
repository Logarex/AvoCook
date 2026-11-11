/** Links opened by widgets, Live Activities, Spotlight and Siri (avocook://…). */
export type AppLink =
  | { kind: "recipe"; id: string }
  | { kind: "today" }
  | { kind: "stock" }
  | { kind: "shopping"; add?: string }
  | { kind: "community"; id: string };

const MAX_ITEM_LENGTH = 200;

export function parseAppLink(url: string | null | undefined): AppLink | null {
  if (!url) return null;
  const match = url.match(/^avocook:\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?/i);
  if (!match) return null;
  const host = match[1].toLowerCase();
  const segments = (match[2] ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return "";
      }
    });
  const query = new URLSearchParams(match[3] ?? "");
  const id = segments[0]?.trim();
  switch (host) {
    case "recipe":
      return id ? { kind: "recipe", id } : null;
    case "community":
      return id ? { kind: "community", id } : null;
    case "today":
      return { kind: "today" };
    case "stock":
      return { kind: "stock" };
    case "shopping": {
      const add = query.get("add")?.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH);
      return add ? { kind: "shopping", add } : { kind: "shopping" };
    }
    default:
      return null;
  }
}
