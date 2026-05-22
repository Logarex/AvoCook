import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLogLevel = "debug" | "info" | "warn" | "error";

export type AppLogCategory =
  | "app"
  | "auth"
  | "local"
  | "network"
  | "settings"
  | "sync";

export type AppLogEntry = {
  id: string;
  timestamp: string;
  level: AppLogLevel;
  category: AppLogCategory;
  message: string;
  context?: unknown;
};

const LOG_STORAGE_KEY = "diagnostics.appLogs.v1";
const MAX_LOG_ENTRIES = 50;
const MAX_CONTEXT_STRING_LENGTH = 5000;
const SECRET_KEY_PATTERN =
  /authorization|appPassword|password|passwd|token|cookie|secret|session/i;
const PERSONAL_KEY_NAMES = [
  "name",
  "payloadName",
  "sourceName",
  "description",
  "username",
  "userId",
  "id",
  "displayname",
  "display-name",
  "display_name",
  "email",
  "additional_mail",
  "phone",
  "address",
  "website",
  "twitter",
  "bluesky",
  "fediverse",
  "organisation",
  "organization",
  "role",
  "headline",
  "biography",
  "pronouns",
  "storageLocation",
  "manager",
  "groups",
  "notify_email",
  "language",
  "locale",
  "timezone",
  "x-user-id"
] as const;
const PERSONAL_KEY_PATTERN = new RegExp(
  `^(?:${PERSONAL_KEY_NAMES.map(escapeRegExp).join("|")})$`,
  "i"
);
const PERSONAL_JSON_KEY_PATTERN = PERSONAL_KEY_NAMES.map(escapeRegExp).join("|");
const PERSONAL_JSON_STRING_PATTERN = new RegExp(
  String.raw`"(${PERSONAL_JSON_KEY_PATTERN})"\s*:\s*"[^"]*"`,
  "gi"
);
const ESCAPED_PERSONAL_JSON_STRING_PATTERN = new RegExp(
  String.raw`\\"(${PERSONAL_JSON_KEY_PATTERN})\\"\s*:\s*\\"[^\\"]*\\"`,
  "gi"
);
const PERSONAL_JSON_ARRAY_PATTERN = new RegExp(
  String.raw`"(${PERSONAL_JSON_KEY_PATTERN})"\s*:\s*\[[^\]]*\]`,
  "gi"
);
const ESCAPED_PERSONAL_JSON_ARRAY_PATTERN = new RegExp(
  String.raw`\\"(${PERSONAL_JSON_KEY_PATTERN})\\"\s*:\s*\[[^\]]*\]`,
  "gi"
);

let cachedEntries: AppLogEntry[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();
const subscribers = new Set<(entries: AppLogEntry[]) => void>();

export type AppLogMode = "errors" | "all";
const LOG_MODE_KEY = "preferences.logMode";
let cachedLogMode: AppLogMode | null = null;

export async function getLogMode(): Promise<AppLogMode> {
  if (cachedLogMode !== null) {
    return cachedLogMode;
  }
  try {
    const stored = await AsyncStorage.getItem(LOG_MODE_KEY);
    cachedLogMode = (stored === "all" ? "all" : "errors") as AppLogMode;
  } catch {
    cachedLogMode = "errors";
  }
  return cachedLogMode;
}

export async function setLogMode(mode: AppLogMode) {
  cachedLogMode = mode;
  await AsyncStorage.setItem(LOG_MODE_KEY, mode);
  await pruneLogs(mode);
}

export function isLogLevelEnabled(level: AppLogLevel): boolean {
  const mode = cachedLogMode ?? "errors";
  if (mode === "errors") {
    return level === "error" || level === "warn";
  }
  return true;
}

function pruneLogEntries(entries: AppLogEntry[]): AppLogEntry[] {
  if (entries.length <= MAX_LOG_ENTRIES) {
    return entries;
  }

  const errorOrWarnEntries = entries.filter(
    (e) => e.level === "error" || e.level === "warn"
  );

  if (errorOrWarnEntries.length >= MAX_LOG_ENTRIES) {
    return errorOrWarnEntries.slice(-MAX_LOG_ENTRIES);
  }

  const allowedNonErrorCount = MAX_LOG_ENTRIES - errorOrWarnEntries.length;
  const debugOrInfoEntries = entries.filter(
    (e) => e.level !== "error" && e.level !== "warn"
  );
  const debugOrInfoToKeep = new Set(
    debugOrInfoEntries.slice(-allowedNonErrorCount)
  );

  return entries.filter(
    (e) =>
      e.level === "error" ||
      e.level === "warn" ||
      debugOrInfoToKeep.has(e)
  );
}

async function pruneLogs(mode: AppLogMode) {
  writeQueue = writeQueue
    .then(async () => {
      let entries = await ensureEntries();
      if (mode === "errors") {
        entries = entries.filter(
          (e) => e.level === "error" || e.level === "warn"
        );
      }
      entries = pruneLogEntries(entries);
      cachedEntries = entries;
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
      notifySubscribers();
    })
    .catch(() => undefined);
  await writeQueue;
}

// Trigger log mode loading asynchronously on module import
void getLogMode();

export function logDebug(
  category: AppLogCategory,
  message: string,
  context?: unknown
) {
  appendAppLog("debug", category, message, context);
}

export function logInfo(
  category: AppLogCategory,
  message: string,
  context?: unknown
) {
  appendAppLog("info", category, message, context);
}

export function logWarn(
  category: AppLogCategory,
  message: string,
  context?: unknown
) {
  appendAppLog("warn", category, message, context);
}

export function logError(
  category: AppLogCategory,
  message: string,
  context?: unknown
) {
  appendAppLog("error", category, message, context);
}

export async function loadLogEntries() {
  return [...(await ensureEntries())];
}

export function subscribeToLogEntries(
  listener: (entries: AppLogEntry[]) => void
) {
  subscribers.add(listener);
  void loadLogEntries().then(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export async function clearLogEntries() {
  cachedEntries = [];
  await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify([]));
  notifySubscribers();
}

export async function createDiagnosticsReport({
  anonymize
}: {
  anonymize: boolean;
}) {
  const entries = await loadLogEntries();
  const body = entries
    .map((entry) => formatLogEntry(entry, { anonymize }))
    .join("\n\n");

  return [
    "AvoCook diagnostics report",
    `Generated: ${new Date().toISOString()}`,
    `Anonymized: ${anonymize ? "yes" : "no"}`,
    `Entries: ${entries.length}`,
    "",
    body || "No log entries."
  ].join("\n");
}

export function formatLogEntry(
  entry: AppLogEntry,
  { anonymize }: { anonymize: boolean }
) {
  const context =
    entry.context === undefined
      ? ""
      : `\n${formatContext(entry.context, { anonymize })}`;
  const line = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}`;
  return anonymize ? anonymizeText(`${line}${context}`) : `${line}${context}`;
}

export function normalizeLogError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return sanitizeForStorage(error);
}

function appendAppLog(
  level: AppLogLevel,
  category: AppLogCategory,
  message: string,
  context?: unknown
) {
  if (!isLogLevelEnabled(level)) {
    return;
  }

  const entry: AppLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    context: context === undefined ? undefined : sanitizeForStorage(context)
  };

  writeQueue = writeQueue
    .then(async () => {
      const mode = await getLogMode();
      if (mode === "errors" && level !== "error" && level !== "warn") {
        return;
      }

      let entries = await ensureEntries();
      entries.push(entry);
      entries = pruneLogEntries(entries);
      cachedEntries = entries;
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
      notifySubscribers();
    })
    .catch(() => undefined);
}

async function ensureEntries() {
  if (cachedEntries) {
    return cachedEntries;
  }

  try {
    const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    let entries = Array.isArray(parsed) ? parsed.filter(isLogEntry) : [];

    const mode = await getLogMode();
    if (mode === "errors") {
      entries = entries.filter(
        (e) => e.level === "error" || e.level === "warn"
      );
    }
    entries = pruneLogEntries(entries);
    cachedEntries = entries;
  } catch {
    cachedEntries = [];
  }

  return cachedEntries;
}

function notifySubscribers() {
  const snapshot = [...(cachedEntries ?? [])];
  for (const subscriber of subscribers) {
    subscriber(snapshot);
  }
}

function sanitizeForStorage(value: unknown, key = "", depth = 0): unknown {
  if (SECRET_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(redactSecrets(value));
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return normalizeLogError(value);
  }

  if (depth >= 5) {
    return "[max-depth]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 80)
      .map((item) => sanitizeForStorage(item, key, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 120)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeForStorage(entryValue, entryKey, depth + 1)
        ])
    );
  }

  return String(value);
}

function formatContext(
  context: unknown,
  { anonymize }: { anonymize: boolean }
) {
  const text = JSON.stringify(
    anonymize ? anonymizeForReport(context) : context,
    null,
    2
  );
  return anonymize ? anonymizeText(text) : text;
}

function anonymizeText(text: string) {
  let anonymized = text;
  anonymized = anonymized.replace(
    /https?:\/\/([^/\s"'<>]+)([^\s"'<>]*)/gi,
    (_match, _host: string, path: string) =>
      `https://nextcloud.example${anonymizePath(path)}`
  );
  anonymized = anonymized.replace(
    /\/remote\.php\/dav\/files\/[^/\s"'<>]+/gi,
    "/remote.php/dav/files/[user]"
  );
  anonymized = anonymized.replace(
    /file:\/\/\/[^\s"'<>]+/gi,
    "file:///[local-path]"
  );
  anonymized = redactPersonalJsonValues(anonymized);
  anonymized = anonymized.replace(
    /\/AvoCook Images\/[^"\n]+/g,
    "/AvoCook Images/[file]"
  );
  anonymized = anonymized.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[email]"
  );
  anonymized = anonymized.replace(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    "[ip-address]"
  );
  anonymized = anonymized.replace(
    /\b(?=(?:[0-9a-f]{1,4}:){3}|(?:[0-9a-f]*[a-f][0-9a-f]*:))[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){2,7}\b/gi,
    "[ip-address]"
  );
  anonymized = anonymized.replace(/\+\d[\d\s().-]{7,}\d/g, "[phone]");
  return anonymized;
}

function anonymizePath(path: string) {
  return path
    .replace(
      /\/remote\.php\/dav\/files\/[^/]+\/?.*/i,
      "/remote.php/dav/files/[user]/[path]"
    )
    .replace(/\/remote\.php\/webdav\/?.*/i, "/remote.php/webdav/[path]")
    .replace(/\/AvoCook(?:%20| )Images\/[^?]+/i, "/AvoCook%20Images/[file]");
}

function anonymizeForReport(value: unknown, key = "", depth = 0): unknown {
  if (SECRET_KEY_PATTERN.test(key) || PERSONAL_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return anonymizeText(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return anonymizeForReport(normalizeLogError(value), key, depth + 1);
  }

  if (depth >= 5) {
    return "[max-depth]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 80)
      .map((item) => anonymizeForReport(item, key, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 120)
        .map(([entryKey, entryValue]) => [
          entryKey,
          anonymizeForReport(entryValue, entryKey, depth + 1)
        ])
    );
  }

  return String(value);
}

function redactPersonalJsonValues(text: string) {
  return text
    .replace(PERSONAL_JSON_STRING_PATTERN, '"$1": "[redacted]"')
    .replace(
      ESCAPED_PERSONAL_JSON_STRING_PATTERN,
      '\\"$1\\":\\"[redacted]\\"'
    )
    .replace(PERSONAL_JSON_ARRAY_PATTERN, '"$1": "[redacted]"')
    .replace(
      ESCAPED_PERSONAL_JSON_ARRAY_PATTERN,
      '\\"$1\\":\\"[redacted]\\"'
    );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactSecrets(value: string) {
  return value
    .replace(/Basic\s+[A-Za-z0-9+/=._~-]+/gi, "Basic [redacted]")
    .replace(/Bearer\s+[A-Za-z0-9+/=._~-]+/gi, "Bearer [redacted]")
    .replace(/:\/\/([^:/\s]+):([^@\s]+)@/g, "://[credentials]@");
}

function truncateString(value: string) {
  if (value.length <= MAX_CONTEXT_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_STRING_LENGTH)}…[truncated ${value.length - MAX_CONTEXT_STRING_LENGTH} chars]`;
}

function isLogEntry(value: unknown): value is AppLogEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<AppLogEntry>;
  return Boolean(
    typeof entry.id === "string" &&
      typeof entry.timestamp === "string" &&
      typeof entry.level === "string" &&
      typeof entry.category === "string" &&
      typeof entry.message === "string"
  );
}
