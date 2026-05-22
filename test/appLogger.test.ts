import { describe, expect, it } from "vitest";
import { formatLogEntry, type AppLogEntry } from "../src/features/logging/appLogger";

describe("appLogger diagnostics anonymization", () => {
  it("redacts Nextcloud profile fields without mangling HTTP dates", () => {
    const entry: AppLogEntry = {
      id: "1",
      timestamp: "2026-05-22T16:16:35.459Z",
      level: "info",
      category: "network",
      message: "HTTP response",
      context: {
        url: "https://cloud.secret.example/remote.php/dav/files/logarex/AvoCook%20Images/photo.jpg",
        responseHeaders: {
          date: "Fri, 22 May 2026 16:14:53 GMT",
          "x-user-id": "logarex"
        },
        responseBodyPreview: {
          ocs: {
            data: {
              id: "logarex",
              displayname: "Louis CHABERT",
              email: "louis@example.com",
              phone: "+33614488907",
              address: "Toulouse",
              storageLocation: "/var/www/html/data/logarex",
              groups: ["admin"],
              timezone: "Europe/Paris"
            }
          }
        },
        legacyPreview:
          '{"displayname":"Louis CHABERT","phone":"+33614488907","groups":["admin"]}'
      }
    };

    const report = formatLogEntry(entry, { anonymize: true });

    expect(report).toContain("Fri, 22 May 2026 16:14:53 GMT");
    expect(report).toContain("https://nextcloud.example/remote.php/dav/files/[user]/[path]");
    expect(report).not.toContain("Louis");
    expect(report).not.toContain("logarex");
    expect(report).not.toContain("+33614488907");
    expect(report).not.toContain("Toulouse");
    expect(report).not.toContain("louis@example.com");
    expect(report).not.toContain("/var/www/html/data");
    expect(report).not.toContain("admin");
  });
});
