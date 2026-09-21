import { describe, expect, it, beforeEach } from "vitest";
import { logService } from "../features/logging/logService";

describe("logService", () => {
  beforeEach(() => {
    logService.clearLogs();
  });

  it("sanitizes sensitive fields like passwords and auth tokens", () => {
    const rawString = "User password is secret123 and token is Bearer abc123def";
    const sanitized = logService.sanitizeString(rawString);
    expect(sanitized).not.toContain("secret123");
    expect(sanitized).not.toContain("abc123def");

    const rawObj = {
      username: "john",
      appPassword: "supersecretpassword",
      authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ="
    };
    const sanitizedObj = logService.sanitizeObject(rawObj) as Record<string, unknown>;
    expect(sanitizedObj.username).toBe("john");
    expect(sanitizedObj.appPassword).toBe("***");
    expect(sanitizedObj.authorization).toBe("***");
  });

  it("adds log entries and retrieves them", () => {
    logService.info("test", "Hello world");
    logService.error("network", "Failed connection", { status: 500 });

    const logs = logService.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[logs.length - 2].message).toBe("Hello world");
    expect(logs[logs.length - 1].level).toBe("ERROR");
  });

  it("correctly identifies SSL self-signed certificate errors", () => {
    expect(logService.isLikelySelfSignedSslError("SSLHandshakeException: Trust anchor for certification path not found")).toBe(true);
    expect(logService.isLikelySelfSignedSslError("TypeError: Network request failed")).toBe(true);
    expect(logService.isLikelySelfSignedSslError("HTTP 401 Unauthorized")).toBe(false);
  });

  it("generates a formatted markdown report including platform info", () => {
    logService.info("auth", "Attempting login to https://cloud.example.com");
    logService.error("auth", "Network request failed", "javax.net.ssl.SSLHandshakeException");

    const report = logService.generateReport("https://cloud.example.com");
    expect(report).toContain("AvoCook Debug & Connection Log Report");
    expect(report).toContain("Target Server: https://cloud.example.com");
    expect(report).toContain("SSL / TLS Certificate Issue Detected");
    expect(report).toContain("Network request failed");
  });

  it("intercepts fetch requests automatically", async () => {
    const initialLogsCount = logService.getLogs().length;

    await fetch("https://example.invalid").catch(() => undefined);

    const logs = logService.getLogs();
    expect(logs.length).toBeGreaterThan(initialLogsCount);
    const networkLog = logs.find(
      (l) => l.tag === "network" && l.message.includes("example.invalid")
    );
    expect(networkLog).toBeDefined();
  });
});
