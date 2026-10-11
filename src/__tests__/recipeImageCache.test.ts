import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistRecipeImage } from "../features/recipes/recipeImages";

const files = vi.hoisted(() => new Set<string>());
const downloads = vi.hoisted(() => vi.fn());
vi.mock("expo-crypto", async () => {
  const { createHash } = await import("node:crypto");
  return { CryptoDigestAlgorithm: { SHA256: "sha256" },
    digestStringAsync: async (algorithm: string, value: string) => createHash(algorithm).update(value).digest("hex") };
});
vi.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => typeof part === "string" ? part : part.uri).join("/");
    }
    get exists() { return files.has(this.uri); }
    static async downloadFileAsync(uri: string, destination: File, options: unknown) {
      downloads(uri, options); files.add(destination.uri); return destination;
    }
  }
  return { File, Directory: class {
    uri: string;
    constructor(...parts: string[]) { this.uri = parts.join("/"); }
    create() {}
  }, Paths: { document: "file:///documents" } };
});
beforeEach(() => { files.clear(); downloads.mockClear(); });

describe("Authenticated recipe photo cache", () => {
  it("does not reuse another account's authenticated photo at the same URL", async () => {
    const url = "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image";
    const alice = await persistRecipeImage(url, { headers: { Authorization: "Basic alice" } });
    const bob = await persistRecipeImage(url, { headers: { Authorization: "Basic bob" } });
    expect(alice).not.toBe(bob);
    expect(downloads).toHaveBeenCalledTimes(2);
    expect(alice).not.toContain("alice");
    expect(await persistRecipeImage(url, { headers: { authorization: "Basic alice" } })).toBe(alice);
    expect(downloads).toHaveBeenCalledTimes(2);
  });

  it("keeps sharing the cache for public photos without authentication", async () => {
    const first = await persistRecipeImage("https://images.example.com/soup.jpg");
    expect(await persistRecipeImage("https://images.example.com/soup.jpg")).toBe(first);
    expect(downloads).toHaveBeenCalledTimes(1);
  });
});
