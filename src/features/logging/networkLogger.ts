import {
  logError,
  logInfo,
  normalizeLogError
} from "./appLogger";

const RESPONSE_PREVIEW_LIMIT = 6000;
const NETWORK_LOGGER_STATE_KEY = "__avocookNetworkLoggerState";

type NetworkLoggerState = {
  installed: boolean;
  originalFetch: typeof fetch | null;
};

type GlobalWithNetworkLoggerState = typeof globalThis & {
  [NETWORK_LOGGER_STATE_KEY]?: NetworkLoggerState;
};

function getNetworkLoggerState() {
  const globalState = globalThis as GlobalWithNetworkLoggerState;
  globalState[NETWORK_LOGGER_STATE_KEY] ??= {
    installed: false,
    originalFetch: null
  };
  return globalState[NETWORK_LOGGER_STATE_KEY];
}

export function installNetworkLogger() {
  const state = getNetworkLoggerState();
  if (state.installed || typeof globalThis.fetch !== "function") {
    return;
  }

  state.installed = true;
  state.originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = getRequestSnapshot(input, init);
    const startedAt = Date.now();
    logInfo("network", "HTTP request", request);

    try {
      const response = await state.originalFetch?.(input, init);
      if (!response) {
        throw new Error("fetch returned no response");
      }

      logInfo("network", "HTTP response", {
        ...request,
        durationMs: Date.now() - startedAt,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: headersToObject(response.headers),
        responseBodyPreview: await getResponsePreview(response)
      });

      return response;
    } catch (error) {
      logError("network", "HTTP request failed", {
        ...request,
        durationMs: Date.now() - startedAt,
        error: normalizeLogError(error)
      });
      throw error;
    }
  };
}

function getRequestSnapshot(input: RequestInfo | URL, init?: RequestInit) {
  const requestLike =
    typeof input === "object" && input && "url" in input
      ? (input as Request)
      : null;
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : requestLike?.url ?? String(input);
  const method =
    init?.method ?? requestLike?.method ?? (init?.body ? "POST" : "GET");

  return {
    url,
    method,
    requestCredentials: init?.credentials ?? requestLike?.credentials,
    requestHeaders: {
      ...headersToObject(requestLike?.headers),
      ...headersToObject(init?.headers)
    },
    requestBody: getRequestBodySnapshot(init?.body)
  };
}

function getRequestBodySnapshot(body: BodyInit | null | undefined) {
  if (!body) {
    return undefined;
  }

  if (typeof body === "string") {
    return previewString(body);
  }

  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer ${body.byteLength} bytes]`;
  }

  if (ArrayBuffer.isView(body)) {
    return `[${body.constructor.name} ${body.byteLength} bytes]`;
  }

  return `[${body.constructor?.name ?? "body"}]`;
}

function headersToObject(headers?: HeadersInit | Headers | null) {
  if (!headers) {
    return {};
  }

  try {
    const normalized = new Headers(headers);
    return Object.fromEntries(normalized.entries());
  } catch {
    return {};
  }
}

async function getResponsePreview(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("application/xml") &&
    !contentType.includes("text/xml") &&
    !contentType.startsWith("text/")
  ) {
    return `[${contentType || "unknown content type"}]`;
  }

  try {
    const text = await response.clone().text();
    const preview = previewString(text);
    if (
      contentType.includes("application/json") &&
      preview.length === text.length
    ) {
      try {
        return JSON.parse(preview) as unknown;
      } catch {
        return preview;
      }
    }

    return preview;
  } catch (error) {
    return {
      unavailable: true,
      error: normalizeLogError(error)
    };
  }
}

function previewString(value: string) {
  if (value.length <= RESPONSE_PREVIEW_LIMIT) {
    return value;
  }

  return `${value.slice(0, RESPONSE_PREVIEW_LIMIT)}…[truncated ${value.length - RESPONSE_PREVIEW_LIMIT} chars]`;
}
