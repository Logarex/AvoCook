export type LogLevel = "INFO" | "WARN" | "ERROR" | "NETWORK";

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  details?: string;
};

const MAX_LOGS = 500;

function safeGetClipboard() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-clipboard");
  } catch {
    return null;
  }
}

function safeGetSharing() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-sharing");
  } catch {
    return null;
  }
}

function safeGetFileSystem() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-file-system");
  } catch {
    return null;
  }
}

function safeGetConstants() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants");
    return Constants?.default ?? Constants;
  } catch {
    return null;
  }
}

class LogService {
  private logs: LogEntry[] = [];
  private idCounter = 0;

  constructor() {
    this.initConsoleHooks();
    this.initFetchInterceptor();
    this.initGlobalErrorHandlers();
  }

  private initConsoleHooks() {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      this.captureConsole("INFO", args);
    };

    console.info = (...args: unknown[]) => {
      originalInfo.apply(console, args);
      this.captureConsole("INFO", args);
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      this.captureConsole("WARN", args);
    };

    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      this.captureConsole("ERROR", args);
    };
  }

  private initFetchInterceptor() {
    const originalFetch = globalThis.fetch;
    if (!originalFetch) return;

    if ((originalFetch as unknown as { __isLogServiceWrapped?: boolean }).__isLogServiceWrapped) {
      return;
    }

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      const method =
        init?.method ??
        (typeof input === "object" && input && "method" in input ? (input as Request).method : "GET") ??
        "GET";
      const sanitizedUrl = this.sanitizeString(urlStr);
      const startTime = Date.now();

      this.addLog("NETWORK", "network", `-> ${method} ${sanitizedUrl}`);

      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;
        const status = response.status;
        const statusText = response.statusText || "";

        if (response.ok) {
          this.addLog(
            "NETWORK",
            "network",
            `<- ${method} ${sanitizedUrl} [HTTP ${status} ${statusText}] (${duration}ms)`
          );
        } else {
          this.addLog(
            "ERROR",
            "network",
            `<- ${method} ${sanitizedUrl} [HTTP ${status} ${statusText}] (${duration}ms)`,
            { status, statusText }
          );
        }
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errMsg = error instanceof Error ? error.message : String(error);
        this.addLog(
          "ERROR",
          "network",
          `<- ${method} ${sanitizedUrl} FAILED (${duration}ms): ${errMsg}`,
          error
        );
        throw error;
      }
    };

    (wrappedFetch as unknown as { __isLogServiceWrapped?: boolean }).__isLogServiceWrapped = true;
    globalThis.fetch = wrappedFetch;
  }

  private initGlobalErrorHandlers() {
    try {
      const g = globalThis as unknown as {
        ErrorUtils?: {
          getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
          setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
        };
      };
      if (g.ErrorUtils?.setGlobalHandler) {
        const previousHandler = g.ErrorUtils.getGlobalHandler?.();
        g.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
          this.addLog(
            "ERROR",
            "global",
            `Unhandled ${isFatal ? "FATAL " : ""}Error: ${error instanceof Error ? error.message : String(error)}`,
            error
          );
          if (previousHandler) previousHandler(error, isFatal);
        });
      }
    } catch {
      // Ignore if ErrorUtils is unavailable
    }
  }

  private captureConsole(level: LogLevel, args: unknown[]) {
    if (args.length === 0) return;
    const tag = typeof args[0] === "string" ? args[0] : "app";
    const message = args.slice(1).map((a) => this.formatArg(a)).join(" ");
    this.addLog(level, tag, message || (typeof args[0] === "string" ? args[0] : this.formatArg(args[0])));
  }

  private formatArg(arg: unknown): string {
    if (arg === undefined || arg === null) return String(arg);
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ""}`;
    }
    if (typeof arg === "object") {
      try {
        return JSON.stringify(this.sanitizeObject(arg));
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }

  public sanitizeString(str: string): string {
    if (!str) return str;
    return str
      .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, "$1***")
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1***")
      .replace(/("?(?:appPassword|password|token|authorization|auth|secret)"?\s*[:=]\s*")[^"]+(")/gi, '$1***$2')
      .replace(/("?(?:appPassword|password|token|authorization|auth|secret)"?\s*[:=]\s*)[^\s&,;]+/gi, '$1***')
      .replace(/(password\s+is\s+)[^\s&,;]+/gi, '$1***')
      .replace(/(token\s+is\s+)[^\s&,;]+/gi, '$1***')
      .replace(/(https?:\/\/[^:]+:)[^@]+(@)/gi, "$1***$2");
  }

  public sanitizeObject(obj: unknown): unknown {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("secret")
      ) {
        sanitized[key] = "***";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public addLog(level: LogLevel, tag: string, message: string, details?: unknown) {
    const formattedDetails = details ? this.sanitizeString(this.formatArg(details)) : undefined;
    const entry: LogEntry = {
      id: `${Date.now()}-${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      level,
      tag: this.sanitizeString(tag),
      message: this.sanitizeString(message),
      details: formattedDetails
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }
  }

  public info(tag: string, message: string, details?: unknown) {
    this.addLog("INFO", tag, message, details);
  }

  public warn(tag: string, message: string, details?: unknown) {
    this.addLog("WARN", tag, message, details);
  }

  public error(tag: string, message: string, details?: unknown) {
    this.addLog("ERROR", tag, message, details);
  }

  public network(message: string, details?: unknown) {
    this.addLog("NETWORK", "network", message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public isLikelySelfSignedSslError(errorMsg?: string): boolean {
    const logsText = (errorMsg || "") + " " + this.logs.map((l) => `${l.message} ${l.details || ""}`).join(" ");
    return /certificate|cert|ssl|tls|trust anchor|network request failed|handshake|self-signed/i.test(logsText);
  }

  private getPlatformInfo() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Platform } = require("react-native");
      return { osName: Platform.OS, osVersion: Platform.Version };
    } catch {
      return { osName: "unknown", osVersion: "" };
    }
  }

  public generateReport(serverUrl?: string): string {
    const constants = safeGetConstants();
    const appVersion = constants?.expoConfig?.version ?? "Unknown";
    const { osName, osVersion } = this.getPlatformInfo();
    const hasSslIssue = this.isLikelySelfSignedSslError();

    const header = [
      "==========================================",
      "AvoCook Debug & Connection Log Report",
      "==========================================",
      `Date: ${new Date().toISOString()}`,
      `App Version: ${appVersion}`,
      `Platform: ${osName} (OS Version: ${osVersion})`,
      serverUrl ? `Target Server: ${this.sanitizeString(serverUrl)}` : null,
      "==========================================",
      ""
    ]
      .filter(Boolean)
      .join("\n");

    const diagnosis = hasSslIssue
      ? [
          "⚠️ DIAGNOSIS WARNING: SSL / TLS Certificate Issue Detected!",
          "--------------------------------------------------",
          "Android's native network stack rejects self-signed certificates by default.",
          "Because TLS handshake aborts before HTTP data is sent, NO logs will appear in Apache/Nextcloud server logs.",
          "Possible Fixes:",
          " 1. Install a valid CA certificate (e.g. via Let's Encrypt / Certbot).",
          " 2. Import your self-signed CA certificate into Android System Trusted Credentials.",
          "--------------------------------------------------",
          ""
        ].join("\n")
      : "";

    const logLines = this.logs
      .map((log) => {
        const line = `[${log.timestamp}] [${log.level}] [${log.tag}] ${log.message}`;
        return log.details ? `${line}\n  Details: ${log.details}` : line;
      })
      .join("\n");

    return `${header}\n${diagnosis}Log History (${this.logs.length} entries):\n${logLines || "No logs recorded."}\n`;
  }

  public async copyLogsToClipboard(serverUrl?: string): Promise<boolean> {
    const report = this.generateReport(serverUrl);
    const Clipboard = safeGetClipboard();
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(report);
      return true;
    }
    return false;
  }

  public async shareLogReport(serverUrl?: string): Promise<boolean> {
    try {
      const report = this.generateReport(serverUrl);
      const fs = safeGetFileSystem();
      const Sharing = safeGetSharing();

      if (fs && Sharing) {
        const filename = `avocook-logs-${Date.now()}.txt`;
        const fileUri = `${fs.Paths?.cache?.uri || ""}/${filename}`;
        const file = new fs.File(fileUri);
        if (file.create) file.create();
        if (file.write) file.write(report);

        const available = Sharing.isAvailableAsync ? await Sharing.isAvailableAsync() : false;
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/plain",
            dialogTitle: "AvoCook Debug Logs",
            UTI: "public.plain-text"
          });
          return true;
        }
      }
      return await this.copyLogsToClipboard(serverUrl);
    } catch (err) {
      console.error("logService", "Failed to share logs file", err);
      return await this.copyLogsToClipboard(serverUrl);
    }
  }
}

export const logService = new LogService();
