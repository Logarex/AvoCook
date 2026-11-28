import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLegacyDefaultModel, modelVersion, pickRecommendedModel } from "../features/import/llmModels";
import {
  clearRecommendedModelCache,
  generateRecipeFromText,
  LlmModelNotFoundError,
  lowerTokenLimit,
  requestLlmContent,
} from "../features/import/photoRecipeImport";

const ids = (...list: string[]) => list.map((id) => ({ id }));

describe("pickRecommendedModel", () => {
  it("picks the newest light Claude model that reads images and is not retired", () => {
    const listed = [
      { id: "claude-fable-5-2", supportsImages: true },
      { id: "claude-opus-5-5", supportsImages: true },
      { id: "claude-sonnet-5-5", supportsImages: true },
      { id: "claude-haiku-5-5", supportsImages: true },
      { id: "claude-haiku-4-5-20251001", supportsImages: true },
    ];
    expect(pickRecommendedModel("claude", listed)).toBe("claude-haiku-5-5");
    // A future release listed first is used without an app update.
    expect(pickRecommendedModel("claude", [{ id: "claude-haiku-6", supportsImages: true }, ...listed])).toBe("claude-haiku-6");
    expect(pickRecommendedModel("claude", [{ id: "claude-haiku-6", retiring: true }, ...listed])).toBe("claude-haiku-5-5");
    expect(pickRecommendedModel("claude", [{ id: "claude-haiku-6", supportsImages: false }, ...listed])).toBe("claude-haiku-5-5");
  });

  it("picks the newest small OpenAI chat model and skips other kinds of models", () => {
    const listed = ids(
      "gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-5-mini", "gpt-6", "gpt-6-pro", "gpt-6-luna", "gpt-6-luna-2026-05-01",
      "gpt-image-1", "text-embedding-3-small", "whisper-1", "tts-1", "o4-mini", "gpt-5.3-chat-latest",
      "gpt-4o-realtime-preview", "gpt-6-luna-search", "gpt-3.5-turbo-instruct",
    );
    expect(pickRecommendedModel("openai", listed)).toBe("gpt-6-luna");
    expect(pickRecommendedModel("openai", [...listed, ...ids("gpt-7", "gpt-7-mini")])).toBe("gpt-7-mini");
    // A small tier two generations behind is not kept for ever.
    expect(pickRecommendedModel("openai", ids("gpt-9", "gpt-9-pro", "gpt-6-luna"))).toBe("gpt-9");
  });

  it("prefers Google's Flash alias and otherwise the newest stable Flash", () => {
    expect(pickRecommendedModel("gemini", ids("models/gemini-2.5-flash", "models/gemini-flash-latest", "models/embedding-001"))).toBe(
      "gemini-flash-latest",
    );
    expect(
      pickRecommendedModel("gemini", ids("gemini-3.5-flash", "gemini-4-flash", "gemini-4-flash-preview", "gemini-4-flash-lite", "gemini-4-pro")),
    ).toBe("gemini-4-flash");
  });

  it("picks current Grok, Mistral and Groq models", () => {
    expect(
      pickRecommendedModel("grok", ids("grok-4.7", "grok-4.6", "grok-4.20-0309-reasoning", "grok-4.20-multi-agent-0309", "grok-imagine-image")),
    ).toBe("grok-4.7");
    expect(pickRecommendedModel("grok", ids("grok-4.7", "grok-5-latest"))).toBe("grok-5-latest");
    expect(pickRecommendedModel("mistral", ids("mistral-large-latest", "mistral-medium-latest", "mistral-ocr-latest", "codestral-latest"))).toBe(
      "mistral-medium-latest",
    );
    expect(pickRecommendedModel("mistral", ids("mistral-medium-latest", "mistral-small-latest"))).toBe("mistral-small-latest");
    expect(
      pickRecommendedModel("groq", ids("llama-3.3-70b-versatile", "whisper-large-v3", "qwen/qwen3.8-27b", "meta-llama/llama-guard-4-12b")),
    ).toBe("qwen/qwen3.8-27b");
    expect(pickRecommendedModel("groq", ids("whisper-large-v3", "llama-3.3-70b-versatile"))).toBe("llama-3.3-70b-versatile");
  });

  it("takes the first chat model of a custom server and nothing from an empty list", () => {
    expect(pickRecommendedModel("custom", ids("nomic-embed-text", "llama3.2-vision"))).toBe("llama3.2-vision");
    expect(pickRecommendedModel("openai", [])).toBeUndefined();
  });

  it("reads version numbers", () => {
    expect(modelVersion("gpt-6.1-mini")).toEqual([6, 1]);
    expect(modelVersion("claude-haiku-5-5")).toEqual([5, 5]);
    expect(modelVersion("grok-4.20")).toEqual([4, 20]);
  });

  it("recognizes defaults stored by earlier versions", () => {
    expect(isLegacyDefaultModel("openai", "gpt-4o")).toBe(true);
    expect(isLegacyDefaultModel("claude", "claude-haiku-4-5")).toBe(true);
    expect(isLegacyDefaultModel("openai", "claude-haiku-4-5")).toBe(false);
    expect(isLegacyDefaultModel("gemini", "gemini-3.5-flash")).toBe(false);
  });
});

describe("requests with the automatic model", () => {
  const fetcher = vi.fn();
  const recipe = { name: "Omelette", recipeIngredient: ["3 eggs"], recipeInstructions: ["Cook."] };
  const json = (status: number, body: unknown) => ({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  const chatReply = json(200, { choices: [{ message: { content: JSON.stringify(recipe) } }] });
  const chatModels = () => fetcher.mock.calls.filter(([url]) => String(url).endsWith("/chat/completions")).map(([, init]) => JSON.parse(init.body).model);

  beforeEach(() => {
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetcher.mockReset();
    clearRecommendedModelCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the provider's newest suitable model and remembers it", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith("/models") ? json(200, { data: ids("gpt-5-mini", "gpt-6-luna", "whisper-1") }) : chatReply,
    );
    await generateRecipeFromText("omelette", "key", "openai", "", "", "en");
    await generateRecipeFromText("omelette", "key", "openai", "", "", "en");
    expect(chatModels()).toEqual(["gpt-6-luna", "gpt-6-luna"]);
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/models"))).toHaveLength(1);
  });

  it("sends only the model and the message to OpenAI-compatible providers", async () => {
    fetcher.mockResolvedValue(chatReply);
    await generateRecipeFromText("omelette", "key", "mistral", "", "mistral-small-latest", "en");
    expect(Object.keys(JSON.parse(fetcher.mock.calls[0][1].body))).toEqual(["model", "messages"]);
  });

  it("replaces a retired model once with the recommended one", async () => {
    fetcher.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/models")) return json(200, { data: ids("grok-4.7", "grok-4.6") });
      return JSON.parse(String(init?.body)).model === "grok-3"
        ? json(404, { error: { message: "The model grok-3 does not exist" } })
        : chatReply;
    });
    await expect(generateRecipeFromText("omelette", "key", "grok", "", "grok-3", "en")).resolves.toMatchObject({ name: "Omelette" });
    expect(chatModels()).toEqual(["grok-3", "grok-4.7"]);
  });

  it("reports the user's model when no replacement works", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith("/models") ? json(200, { data: ids("gpt-6-luna") }) : json(400, { error: { message: "model has been decommissioned" } }),
    );
    const error = await generateRecipeFromText("omelette", "key", "groq", "", "old-model", "en").catch((e) => e);
    expect(error).toBeInstanceOf(LlmModelNotFoundError);
    expect(error.model).toBe("old-model");
    expect(chatModels()).toHaveLength(2);
  });

  it("does not retry for errors that are not about the model", async () => {
    fetcher.mockResolvedValue(json(401, { error: { message: "invalid key" } }));
    await expect(requestLlmContent("food", { apiKey: "key", providerId: "openai", baseUrl: "", model: "gpt-6-luna" })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back to the built-in model when the list cannot be read", async () => {
    fetcher.mockImplementation(async (url: string) => (url.endsWith("/models") ? json(500, {}) : chatReply));
    await requestLlmContent("food", { apiKey: "key", providerId: "gemini", baseUrl: "", model: "" });
    expect(chatModels()).toEqual(["gemini-flash-latest"]);
  });

  it("lists Claude models with Anthropic's headers and keeps their capabilities", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/v1/models")
        ? json(200, {
            data: [
              { id: "claude-haiku-6", capabilities: { image_input: { supported: true } }, deprecated_at: null },
              { id: "claude-haiku-5-5", capabilities: { image_input: { supported: true } }, deprecated_at: "2020-01-01T00:00:00Z" },
            ],
          })
        : json(200, { content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(recipe) }] }),
    );
    await generateRecipeFromText("omelette", "key", "claude", "", "", "en");
    const [listUrl, listInit] = fetcher.mock.calls[0];
    expect(listUrl).toBe("https://api.anthropic.com/v1/models?limit=100");
    expect(listInit.headers).toMatchObject({ "x-api-key": "key", "anthropic-version": "2023-06-01" });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ model: "claude-haiku-6", max_tokens: 16000 });
  });

  it("lowers Claude's max_tokens when a model has a smaller output limit", async () => {
    fetcher
      .mockResolvedValueOnce(json(400, { error: { message: "max_tokens: 16000 > 8192, which is the maximum allowed number of output tokens" } }))
      .mockResolvedValueOnce(json(200, { content: [{ type: "text", text: JSON.stringify(recipe) }] }));
    await generateRecipeFromText("omelette", "key", "claude", "", "claude-haiku-4-5", "en");
    expect(fetcher.mock.calls.map(([, init]) => JSON.parse(init.body).max_tokens)).toEqual([16000, 8192]);
    expect(lowerTokenLimit("max_tokens is too large", 16000)).toBe(4096);
    expect(lowerTokenLimit("max_tokens is too large", 4096)).toBeNull();
  });

  it("reads answers returned as a list of parts", async () => {
    fetcher.mockResolvedValue(json(200, { choices: [{ message: { content: [{ type: "text", text: JSON.stringify(recipe) }] } }] }));
    await expect(generateRecipeFromText("omelette", "key", "openai", "", "gpt-6-luna", "en")).resolves.toMatchObject({ name: "Omelette" });
  });
});
