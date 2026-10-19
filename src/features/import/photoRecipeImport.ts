import { jsonLdToRecipe } from "./schemaRecipeParser";
import type { Recipe } from "../recipes/types";

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
  defaultModel: string;
  modelDocsUrl: string;
  apiFormat: "openai" | "anthropic";
};

export const LLM_PROVIDERS: LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    modelDocsUrl: "https://platform.openai.com/docs/models",
    apiFormat: "openai",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-flash",
    modelDocsUrl: "https://ai.google.dev/gemini-api/docs/models/gemini",
    apiFormat: "openai",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    modelDocsUrl: "https://console.groq.com/docs/models",
    apiFormat: "openai",
  },
  {
    id: "grok",
    label: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3",
    modelDocsUrl: "https://docs.x.ai/docs/models",
    apiFormat: "openai",
  },
  {
    id: "mistral",
    label: "Mistral (Le Chat)",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    modelDocsUrl:
      "https://docs.mistral.ai/getting-started/models/models_overview/",
    apiFormat: "openai",
  },
  {
    id: "claude",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-haiku-4-5",
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
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";
  const baseUrl =
    providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);

  if (!apiKey.trim() || !baseUrl.trim()) {
    throw new Error("API key and base URL are required");
  }

  if (format === "anthropic") {
    return fetchAnthropicModels(apiKey, baseUrl);
  }
  return fetchOpenAiModels(apiKey, baseUrl);
}

async function fetchOpenAiModels(
  apiKey: string,
  baseUrl: string,
): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal as RequestInit["signal"],
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new LlmApiError(response.status, body);
    }
    const data = (await response.json()) as { data?: { id: string }[] };
    return (data?.data ?? []).map((m) => m.id).sort();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAnthropicModels(
  apiKey: string,
  baseUrl: string,
): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal as RequestInit["signal"],
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new LlmApiError(response.status, body);
    }
    const data = (await response.json()) as { data?: { id: string }[] };
    return (data?.data ?? []).map((m) => m.id).sort();
  } finally {
    clearTimeout(timeoutId);
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
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";

  const baseUrl =
    providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);
  const model = userModel || (preset?.defaultModel ?? "");
  const modelDocsUrl = preset?.modelDocsUrl ?? "";
  const prompt = buildExtractionPrompt(userLocale);

  console.info(
    "network",
    `Requesting recipe extraction from ${providerId} (${model}) in locale ${userLocale}`,
  );

  let responseText: string;
  try {
    if (format === "anthropic") {
      responseText = await callAnthropicApi(
        imageBase64,
        apiKey,
        baseUrl,
        model,
        prompt,
      );
    } else {
      responseText = await callOpenAiCompatibleApi(
        imageBase64,
        apiKey,
        baseUrl,
        model,
        prompt,
      );
    }
  } catch (err) {
    console.error("network", "Failed to call LLM API for photo import", err);
    if (err instanceof LlmApiError && isModelNotFoundError(err)) {
      throw new LlmModelNotFoundError(
        err.status,
        err.message,
        model,
        modelDocsUrl,
      );
    }
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
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";

  const baseUrl =
    providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);
  const model = userModel || (preset?.defaultModel ?? "");
  const modelDocsUrl = preset?.modelDocsUrl ?? "";
  const prompt = buildTextPrompt(userLocale, textPrompt);

  console.info(
    "network",
    `Requesting recipe generation from ${providerId} (${model}) in locale ${userLocale}`,
  );

  let responseText: string;
  try {
    if (format === "anthropic") {
      responseText = await callAnthropicApi(
        null,
        apiKey,
        baseUrl,
        model,
        prompt,
      );
    } else {
      responseText = await callOpenAiCompatibleApi(
        null,
        apiKey,
        baseUrl,
        model,
        prompt,
      );
    }
  } catch (err) {
    console.error("network", "Failed to call LLM API for text generation", err);
    if (err instanceof LlmApiError && isModelNotFoundError(err)) {
      throw new LlmModelNotFoundError(
        err.status,
        err.message,
        model,
        modelDocsUrl,
      );
    }
    throw err;
  }

  return parseRecipeFromLlmResponse(responseText);
}

export type LlmRequestSettings = {
  apiKey: string;
  providerId: LlmProviderId;
  baseUrl: string;
  model: string;
};

/** Shared transport; keeps the user's provider/model and never retries a paid request. */
export async function requestLlmContent(
  prompt: string,
  settings: LlmRequestSettings,
  imageBase64: string | null = null,
  signal?: AbortSignal,
): Promise<string> {
  const preset = LLM_PROVIDERS.find(
    (provider) => provider.id === settings.providerId,
  );
  const baseUrl =
    settings.providerId === "custom"
      ? settings.baseUrl.trim()
      : (preset?.baseUrl ?? "");
  const model = settings.model.trim() || preset?.defaultModel || "";
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new LlmConfigurationError();
  }
  if (
    !settings.apiKey.trim() ||
    !model ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new LlmConfigurationError();
  return preset?.apiFormat === "anthropic"
    ? callAnthropicApi(
        imageBase64,
        settings.apiKey.trim(),
        baseUrl,
        model,
        prompt,
        signal,
      )
    : callOpenAiCompatibleApi(
        imageBase64,
        settings.apiKey.trim(),
        baseUrl,
        model,
        prompt,
        signal,
      );
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
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      }),
    },
    signal,
  )) as OpenAiResponse;
  const result = data?.choices?.[0]?.message?.content;
  if (typeof result !== "string" || !result.trim())
    throw new Error("Empty response from LLM");
  return result;
}

async function callAnthropicApi(
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
  const data = (await fetchLlmJson(
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
        temperature: 0.2,
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      }),
    },
    signal,
  )) as AnthropicResponse;
  const result = data?.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
  if (typeof result !== "string" || !result.trim())
    throw new Error("Empty response from LLM");
  return result;
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

function isModelNotFoundError(err: LlmApiError): boolean {
  if (err.status === 404) return true;
  if (err.status === 400) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("model not found") ||
      msg.includes("invalid model") ||
      msg.includes("does not exist") ||
      msg.includes("unknown model") ||
      msg.includes("no such model")
    );
  }
  return false;
}

type OpenAiResponse = {
  choices?: { message?: { content?: string } }[];
};

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
};
