import { jsonLdToRecipe } from "./schemaRecipeParser";
import type { Recipe } from "../recipes/types";
import { pickRecommendedModel, type ModelInfo } from "./llmModels";

export type LlmProviderId =
  | "openai"
  | "gemini"
  | "groq"
  | "grok"
  | "mistral"
  | "claude"
  | "custom";

export type LlmProviderPreset = {
  id: LlmProviderId;
  label: string;
  baseUrl: string;
  /**
   * Used only when the provider's model list cannot be read: by default the
   * app picks the recommended model from that list (see llmModels.ts).
   */
  defaultModel: string;
  modelDocsUrl: string;
  apiFormat: "openai" | "anthropic";
};

export const LLM_PROVIDERS: LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-6-luna",
    modelDocsUrl: "https://platform.openai.com/docs/models",
    apiFormat: "openai",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-flash-latest",
    modelDocsUrl: "https://ai.google.dev/gemini-api/docs/models/gemini",
    apiFormat: "openai",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "qwen/qwen3.8-27b",
    modelDocsUrl: "https://console.groq.com/docs/models",
    apiFormat: "openai",
  },
  {
    id: "grok",
    label: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.7",
    modelDocsUrl: "https://docs.x.ai/docs/models",
    apiFormat: "openai",
  },
  {
    id: "mistral",
    label: "Mistral (Le Chat)",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-medium-latest",
    modelDocsUrl:
      "https://docs.mistral.ai/getting-started/models/models_overview/",
    apiFormat: "openai",
  },
  {
    id: "claude",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-haiku-5-5",
    modelDocsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    apiFormat: "anthropic",
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    defaultModel: "",
    modelDocsUrl: "",
    apiFormat: "openai",
  },
];

function buildExtractionPrompt(userLocale: string): string {
  const langMap: Record<string, string> = {
    fr: "French",
    en: "English",
    de: "German",
    es: "Spanish",
    it: "Italian",
    da: "Danish",
  };
  const language = langMap[userLocale.split("-")[0]] ?? "the user's language";

  return `You are a precise recipe extraction assistant. Analyse the image and extract or infer a complete recipe.

Rules:
- If the image contains text (cookbook page, handwritten note, printed recipe), extract the recipe exactly as written and PRESERVE the original language. Do not translate the recipe.
- If the image shows a finished dish without text, infer the most likely recipe for that dish, and write all text values in ${language}.
- IMPORTANT: You must only extract or infer recipes for FOOD or BEVERAGES. If the image is not related to food, cooking, or recipes, return EXACTLY {"error": "NOT_FOOD"} and nothing else.
- Return ONLY a valid JSON object following the schema.org/Recipe format. No markdown, no explanation, no code block — just raw JSON.

Required JSON fields:
- "name" (string): recipe title
- "recipeIngredient" (array of strings): each ingredient on one line, e.g. "200 g farine"
- "recipeInstructions" (array of strings): each step as a separate string

Include these fields whenever possible (even if estimated):
- "description" (string): one-sentence description
- "recipeYield" (string): number of servings, e.g. "4 personnes"
- "prepTime" (ISO 8601 duration, e.g. "PT15M" for 15 minutes)
- "cookTime" (ISO 8601 duration)
- "totalTime" (ISO 8601 duration)
- "recipeCategory" (string): dish category, e.g. "Plat principal"
- "recipeCuisine" (string): cuisine style, e.g. "Française"
- "keywords" (string): comma-separated keywords
- "tool" (array of strings): kitchen equipment needed
- "nutrition" (object) with these sub-fields (all numeric strings):
  - "calories" (e.g. "350 calories")
  - "carbohydrateContent" (e.g. "45 g")
  - "sugarContent" (e.g. "10 g")
  - "fatContent" (e.g. "12 g")
  - "saturatedFatContent" (e.g. "4 g")
  - "fiberContent" (e.g. "3 g")
  - "proteinContent" (e.g. "20 g")
  - "sodiumContent" (e.g. "500 mg")

If a value is genuinely unknown and cannot be reasonably estimated, omit that field entirely. Do not use null.`;
}

function buildTextPrompt(userLocale: string, userPrompt: string): string {
  const langMap: Record<string, string> = {
    fr: "French",
    en: "English",
    de: "German",
    es: "Spanish",
    it: "Italian",
    da: "Danish",
  };
  const language = langMap[userLocale.split("-")[0]] ?? "the user's language";

  return `You are a precise recipe generation assistant. Generate a complete recipe based on the following description:
"${userPrompt}"

Rules:
- IMPORTANT: You must only generate recipes for FOOD or BEVERAGES. If the prompt asks for something unrelated to food, cooking, or recipes (like how to build a chair, etc.), return EXACTLY {"error": "NOT_FOOD"} and nothing else.
- Return ONLY a valid JSON object following the schema.org/Recipe format. No markdown, no explanation, no code block — just raw JSON.
- All text values (name, description, ingredients, instructions, keywords) MUST be written in ${language}.

Required JSON fields:
- "name" (string): recipe title
- "recipeIngredient" (array of strings): each ingredient on one line, e.g. "200 g farine"
- "recipeInstructions" (array of strings): each step as a separate string

Include these fields whenever possible (even if estimated):
- "description" (string): one-sentence description
- "recipeYield" (string): number of servings, e.g. "4 personnes"
- "prepTime" (ISO 8601 duration, e.g. "PT15M" for 15 minutes)
- "cookTime" (ISO 8601 duration)
- "totalTime" (ISO 8601 duration)
- "recipeCategory" (string): dish category, e.g. "Plat principal"
- "recipeCuisine" (string): cuisine style, e.g. "Française"
- "keywords" (string): comma-separated keywords
- "tool" (array of strings): kitchen equipment needed
- "nutrition" (object) with these sub-fields (all numeric strings):
  - "calories" (e.g. "350 calories")
  - "carbohydrateContent" (e.g. "45 g")
  - "sugarContent" (e.g. "10 g")
  - "fatContent" (e.g. "12 g")
  - "saturatedFatContent" (e.g. "4 g")
  - "fiberContent" (e.g. "3 g")
  - "proteinContent" (e.g. "20 g")
  - "sodiumContent" (e.g. "500 mg")

If a value is genuinely unknown and cannot be reasonably estimated, omit that field entirely. Do not use null.`;
}

export async function fetchAvailableModels(
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string,
): Promise<string[]> {
  const models = await listProviderModels(apiKey, providerId, userBaseUrl);
  return models.map((model) => model.id).sort();
}

function providerPreset(providerId: LlmProviderId) {
  return LLM_PROVIDERS.find((preset) => preset.id === providerId);
}

function providerBaseUrl(providerId: LlmProviderId, userBaseUrl: string) {
  return providerId === "custom"
    ? userBaseUrl.trim()
    : (providerPreset(providerId)?.baseUrl ?? userBaseUrl.trim());
}

type ListedModel = {
  id?: unknown;
  name?: unknown;
  capabilities?: { image_input?: { supported?: unknown } };
  deprecated_at?: unknown;
};

/** The provider's models, in the provider's own order (Anthropic lists the newest first). */
export async function listProviderModels(
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string,
): Promise<ModelInfo[]> {
  const anthropic = providerPreset(providerId)?.apiFormat === "anthropic";
  const baseUrl = providerBaseUrl(providerId, userBaseUrl).replace(/\/$/, "");
  if (!apiKey.trim() || !baseUrl) {
    throw new Error("API key and base URL are required");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(anthropic ? `${baseUrl}/v1/models?limit=100` : `${baseUrl}/models`, {
      headers: anthropic
        ? { "x-api-key": apiKey.trim(), "anthropic-version": "2023-06-01" }
        : { Authorization: `Bearer ${apiKey.trim()}` },
      signal: controller.signal as RequestInit["signal"],
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new LlmApiError(response.status, body);
    }
    const data = (await response.json()) as { data?: ListedModel[]; models?: ListedModel[] };
    const now = Date.now();
    return (data?.data ?? data?.models ?? []).flatMap((model) => {
      const rawId = typeof model.id === "string" ? model.id : typeof model.name === "string" ? model.name : "";
      const id = rawId.replace(/^models\//, "");
      if (!id) return [];
      const supported = model.capabilities?.image_input?.supported;
      const deprecated = typeof model.deprecated_at === "string" && Date.parse(model.deprecated_at) <= now;
      return [{ id, supportsImages: typeof supported === "boolean" ? supported : undefined, retiring: deprecated }];
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const RECOMMENDED_MODEL_TTL_MS = 6 * 60 * 60 * 1000;
const recommendedModels = new Map<string, { model: string | null; at: number }>();

/** Test hook. */
export function clearRecommendedModelCache() {
  recommendedModels.clear();
}

/**
 * The newest suitable model the provider offers, read from its own list and
 * remembered for a few hours; the preset fallback when the list cannot be read.
 */
export async function recommendedModel(settings: LlmRequestSettings, refresh = false): Promise<string | null> {
  const key = `${settings.providerId}|${providerBaseUrl(settings.providerId, settings.baseUrl)}|${settings.apiKey.trim().slice(-8)}`;
  const cached = recommendedModels.get(key);
  if (!refresh && cached && Date.now() - cached.at < RECOMMENDED_MODEL_TTL_MS) return cached.model;
  let model: string | null = null;
  try {
    model =
      pickRecommendedModel(
        settings.providerId,
        await listProviderModels(settings.apiKey, settings.providerId, settings.baseUrl),
      ) ?? null;
  } catch (error) {
    console.warn("network", "Could not list the provider's models; using the built-in fallback", error);
  }
  model ??= providerPreset(settings.providerId)?.defaultModel || null;
  recommendedModels.set(key, { model, at: Date.now() });
  return model;
}

type LlmRequest = { prompt: string; imageBase64: string | null; signal?: AbortSignal };

function callProvider(settings: LlmRequestSettings, model: string, request: LlmRequest): Promise<string> {
  const baseUrl = providerBaseUrl(settings.providerId, settings.baseUrl);
  const apiKey = settings.apiKey.trim();
  return providerPreset(settings.providerId)?.apiFormat === "anthropic"
    ? callAnthropicApi(request.imageBase64, apiKey, baseUrl, model, request.prompt, request.signal)
    : callOpenAiCompatibleApi(request.imageBase64, apiKey, baseUrl, model, request.prompt, request.signal);
}

function modelNotFound(error: LlmApiError, model: string, providerId: LlmProviderId) {
  return new LlmModelNotFoundError(error.status, error.message, model, providerPreset(providerId)?.modelDocsUrl ?? "");
}

/**
 * Sends the request with the user's model, or the recommended one when the
 * choice is "Automatic". When the provider says the model no longer exists,
 * it retries once with the recommended model, so a retired model never stops imports.
 */
async function runWithModel(settings: LlmRequestSettings, request: LlmRequest): Promise<string> {
  const chosen = settings.model.trim();
  const first = chosen || (await recommendedModel(settings));
  if (!first) throw new LlmConfigurationError();
  console.info("network", `Requesting ${settings.providerId} (${first}${chosen ? "" : ", automatic"})`);
  try {
    return await callProvider(settings, first, request);
  } catch (error) {
    if (!(error instanceof LlmApiError) || !isModelNotFoundError(error)) throw error;
    const replacement = await recommendedModel(settings, true);
    if (!replacement || replacement === first) throw modelNotFound(error, first, settings.providerId);
    console.warn("network", `Model ${first} is not available any more; using ${replacement}`);
    try {
      return await callProvider(settings, replacement, request);
    } catch (retryError) {
      if (retryError instanceof LlmApiError && isModelNotFoundError(retryError)) {
        throw modelNotFound(retryError, first, settings.providerId);
      }
      throw retryError;
    }
  }
}

export async function extractRecipeFromPhoto(
  imageBase64: string,
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string,
  userModel: string,
  userLocale: string = "en",
): Promise<Recipe> {
  let responseText: string;
  try {
    responseText = await runWithModel(
      { apiKey, providerId, baseUrl: userBaseUrl, model: userModel },
      { prompt: buildExtractionPrompt(userLocale), imageBase64 },
    );
  } catch (err) {
    console.error("network", "Failed to call LLM API for photo import", err);
    throw err;
  }
  return parseRecipeFromLlmResponse(responseText);
}

export async function generateRecipeFromText(
  textPrompt: string,
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string,
  userModel: string,
  userLocale: string = "en",
): Promise<Recipe> {
  let responseText: string;
  try {
    responseText = await runWithModel(
      { apiKey, providerId, baseUrl: userBaseUrl, model: userModel },
      { prompt: buildTextPrompt(userLocale, textPrompt), imageBase64: null },
    );
  } catch (err) {
    console.error("network", "Failed to call LLM API for text generation", err);
    throw err;
  }
  return parseRecipeFromLlmResponse(responseText);
}

export type LlmRequestSettings = {
  apiKey: string;
  providerId: LlmProviderId;
  baseUrl: string;
  /** Empty means "Automatic": the recommended model of the provider. */
  model: string;
};

export async function requestLlmContent(
  prompt: string,
  settings: LlmRequestSettings,
  imageBase64: string | null = null,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = providerBaseUrl(settings.providerId, settings.baseUrl);
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new LlmConfigurationError();
  }
  if (
    !settings.apiKey.trim() ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new LlmConfigurationError();
  if (signal?.aborted) throw llmAbortError();
  return runWithModel(settings, { prompt, imageBase64, signal });
}

export class LlmConfigurationError extends Error {
  constructor() {
    super("Invalid assistant configuration");
    this.name = "LlmConfigurationError";
  }
}
export class LlmTimeoutError extends Error {
  constructor() {
    super("Assistant request timed out");
    this.name = "LlmTimeoutError";
  }
}
export function llmAbortError() {
  return Object.assign(new Error("Assistant request cancelled"), {
    name: "AbortError",
  });
}

async function fetchLlmJson(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) throw llmAbortError();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let rejectAbort: () => void = () => {};
  const cancellation = new Promise<never>((_, reject) => {
    rejectAbort = () =>
      reject(signal?.aborted ? llmAbortError() : new LlmTimeoutError());
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  const timeoutId = setTimeout(abort, 60000);
  try {
    return await Promise.race([
      cancellation,
      (async () => {
        const response = await fetch(url, {
          ...init,
          redirect: "error",
          signal: controller.signal as RequestInit["signal"],
        });
        if (!response.ok)
          throw new LlmApiError(
            response.status,
            await response.text().catch(() => ""),
          );
        const data: unknown = await response.json();
        if (signal?.aborted) throw llmAbortError();
        if (controller.signal.aborted) throw new LlmTimeoutError();
        return data;
      })(),
    ]);
  } catch (error) {
    if (signal?.aborted) throw llmAbortError();
    if (controller.signal.aborted) throw new LlmTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", rejectAbort);
  }
}

/**
 * Only the model and the message are sent: sampling and length settings are
 * left to the provider, because newer models reject the older ones
 * (`temperature`, `max_tokens`) and the defaults suit a recipe.
 */
async function callOpenAiCompatibleApi(
  imageBase64: string | null,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const content = imageBase64
    ? [
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
        { type: "text", text: prompt },
      ]
    : prompt;
  const data = (await fetchLlmJson(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content }] }),
    },
    signal,
  )) as OpenAiResponse;
  const message = data?.choices?.[0]?.message?.content;
  // Some providers return the answer as a list of parts.
  const result = Array.isArray(message)
    ? message.map((part) => (typeof part?.text === "string" ? part.text : "")).join("")
    : message;
  if (typeof result !== "string" || !result.trim())
    throw new Error("Empty response from LLM");
  return result;
}

const ANTHROPIC_MAX_TOKENS = 16000;

/**
 * Claude needs `max_tokens`, and its thinking counts toward it. A model with a
 * smaller output limit says so in a 400; the request is then sent again within it.
 */
async function callAnthropicApi(
  imageBase64: string | null,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
  maxTokens = ANTHROPIC_MAX_TOKENS,
): Promise<string> {
  const content = imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: imageBase64,
          },
        },
        { type: "text", text: prompt },
      ]
    : prompt;
  let data: AnthropicResponse;
  try {
    data = (await fetchLlmJson(
      `${baseUrl.replace(/\/$/, "")}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content }],
        }),
      },
      signal,
    )) as AnthropicResponse;
  } catch (error) {
    const lower = error instanceof LlmApiError && error.status === 400 && /max_tokens/i.test(error.message)
      ? lowerTokenLimit(error.message, maxTokens)
      : null;
    if (lower) return callAnthropicApi(imageBase64, apiKey, baseUrl, model, prompt, signal, lower);
    throw error;
  }
  const result = data?.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
  if (typeof result !== "string" || !result.trim())
    throw new Error("Empty response from LLM");
  return result;
}

/** "max_tokens: 16000 > 8192, which is the maximum…" → 8192. */
export function lowerTokenLimit(message: string, current: number): number | null {
  const limits = (message.match(/\d{3,6}/g) ?? []).map(Number).filter((value) => value >= 256 && value < current);
  if (limits.length) return Math.max(...limits);
  return current > 4096 ? 4096 : null;
}

function parseRecipeFromLlmResponse(responseText: string): Recipe {
  let cleaned = responseText.trim();

  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned) as unknown;
  } catch (err) {
    console.error("app", "LLM did not return valid JSON", {
      err,
      responseText,
      cleaned,
    });
    throw new Error("LLM did not return valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    console.error("app", "LLM response is not a JSON object", { parsed });
    throw new Error("LLM response is not a JSON object");
  }

  if ("error" in parsed && parsed.error === "NOT_FOOD") {
    throw new LlmNotFoodError();
  }

  try {
    return jsonLdToRecipe(parsed as Record<string, unknown>);
  } catch (err) {
    console.error("app", "Failed to convert JSON-LD to Recipe", {
      err,
      parsed,
    });
    throw err;
  }
}

export class LlmApiError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`LLM API error ${status}: ${body.slice(0, 200)}`);
    this.name = "LlmApiError";
    this.status = status;
  }
}

export class LlmModelNotFoundError extends LlmApiError {
  readonly model: string;
  readonly modelDocsUrl: string;
  constructor(
    status: number,
    originalMessage: string,
    model: string,
    modelDocsUrl: string,
  ) {
    super(status, originalMessage);
    this.name = "LlmModelNotFoundError";
    this.model = model;
    this.modelDocsUrl = modelDocsUrl;
  }
}

export class LlmNotFoodError extends Error {
  constructor() {
    super("The provided content is not related to food or beverages.");
    this.name = "LlmNotFoodError";
  }
}

export function isLlmBillingError(err: LlmApiError): boolean {
  return (
    err.status === 402 ||
    err.status === 403 ||
    // Anthropic reports an empty credit balance as a 400.
    (err.status === 400 && /credit balance/i.test(err.message))
  );
}

/** The provider no longer offers this model, or this account cannot use it. */
export function isModelNotFoundError(err: LlmApiError): boolean {
  if (err.status === 404 || err.status === 410) return true;
  if (err.status !== 400 && err.status !== 403) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("model not found") ||
    msg.includes("model_not_found") ||
    msg.includes("invalid model") ||
    msg.includes("does not exist") ||
    msg.includes("unknown model") ||
    msg.includes("no such model") ||
    msg.includes("decommissioned") ||
    msg.includes("has been deprecated") ||
    msg.includes("is deprecated") ||
    msg.includes("retired") ||
    msg.includes("no longer available") ||
    msg.includes("no longer supported") ||
    /do not have access to (the )?model|not allowed to (use|access) (the )?model|must be verified to use the model/.test(msg)
  );
}

type OpenAiResponse = {
  choices?: { message?: { content?: string | { text?: string }[] } }[];
};

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
};
