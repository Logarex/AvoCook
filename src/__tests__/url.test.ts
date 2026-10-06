import { describe, expect, it } from "vitest";
import { normalizeNextcloudUrl } from "../utils/url";

describe("normalizeNextcloudUrl", () => {
  it.each([
    ["cloud.example.com/nextcloud/", "https://cloud.example.com/nextcloud"],
    ["192.168.1.50:8080/nextcloud", "https://192.168.1.50:8080/nextcloud"],
    ["https://cloud.example.com/", "https://cloud.example.com"],
    [
      " http://192.168.1.50:8080/nextcloud///?login=1#top ",
      "http://192.168.1.50:8080/nextcloud"
    ],
    ["HTTP://NEXTCLOUD.LOCAL:8080/", "http://nextcloud.local:8080"],
    ["http://nextcloud/", "http://nextcloud"],
    ["http://cloud.example.com/nextcloud", "http://cloud.example.com/nextcloud"],
    ["http://[fd00::1]:8080/nextcloud/", "http://[fd00::1]:8080/nextcloud"],
    ["http://localhost:8080", "http://localhost:8080"],
    ["http://127.0.0.1:8080", "http://127.0.0.1:8080"],
    ["http://[::1]:8080", "http://[::1]:8080"]
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeNextcloudUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "http://",
    "http://192.168.1.50:invalid",
    "ftp://nextcloud.local",
    "file:///nextcloud",
    "javascript:alert(1)",
    "http://user:password@nextcloud.local"
  ])("rejects invalid or unsupported address %s", (input) => {
    expect(() => normalizeNextcloudUrl(input)).toThrow("INVALID_URL");
  });
});
