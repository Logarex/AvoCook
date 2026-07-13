import { jsonLdToRecipe } from "./schemaRecipeParser";
import type { Recipe } from "../recipes/types";
import { logError, logInfo } from "../logging/appLogger";

// ---------------------------------------------------------------------------
// Provider presets
// ---------------------------------------------------------------------------

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
  /** Some providers use a different API format */
  apiFormat: "openai" | "anthropic";
};

export const LLM_PROVIDERS: LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    modelDocsUrl: "https://platform.openai.com/docs/models",
    apiFormat: "openai"
  },
  {
    id: "gemini",
    label: "Google Gemini",
    // Google provides an OpenAI-compatible endpoint
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-flash",
    modelDocsUrl: "https://ai.google.dev/gemini-api/docs/models/gemini",
    apiFormat: "openai"
  },
  {
    id: "groq",
    label: "Groq (Fast Inference)",
    baseUrl: "https://api.groq.com/openai/v1",
    // Groq vision models change frequently; check modelDocsUrl for the latest.
    // meta-llama/llama-4-scout-17b-16e-instruct is the current stable vision model.
    defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    modelDocsUrl: "https://console.groq.com/docs/models",
    apiFormat: "openai"
  },
  {
    id: "grok",
    label: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3",
    modelDocsUrl: "https://docs.x.ai/docs/models",
    apiFormat: "openai"
  },
  {
    id: "mistral",
    label: "Mistral (Le Chat)",
    baseUrl: "https://api.mistral.ai/v1",
    // Use the "latest" alias so Mistral automatically points to their current
    // multimodal small model without requiring a code update.
    defaultModel: "mistral-small-latest",
    modelDocsUrl: "https://docs.mistral.ai/getting-started/models/models_overview/",
    apiFormat: "openai"
  },
  {
    id: "claude",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    // claude-haiku-4-5 is Anthropic's current fast/affordable vision model (2026).
    defaultModel: "claude-haiku-4-5",
    modelDocsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    apiFormat: "anthropic"
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    defaultModel: "",
    modelDocsUrl: "",
    apiFormat: "openai"
  }
];

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * Build a language-aware extraction prompt.
 * All text fields in the returned JSON must be in the user's locale language.
 */
function buildExtractionPrompt(userLocale: string): string {
  // Map locale codes to natural language names for clarity in the prompt
  const langMap: Record<string, string> = {
    fr: "French",
    en: "English",
    de: "German",
    es: "Spanish",
    it: "Italian"
  };
  const language = langMap[userLocale.split("-")[0]] ?? "the user's language";

  return `You are a precise recipe extraction assistant. Analyse the image and extract or infer a complete recipe.

Rules:
- If the image contains text (cookbook page, handwritten note, printed recipe), extract the recipe exactly as written.
- If the image shows a finished dish without text, infer the most likely recipe for that dish.
- IMPORTANT: You must only extract or infer recipes for FOOD or BEVERAGES. If the image is not related to food, cooking, or recipes, return EXACTLY {"error": "NOT_FOOD"} and nothing else.
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

/**
 * Build a text-only generation prompt.
 */
function buildTextPrompt(userLocale: string, userPrompt: string): string {
  const langMap: Record<string, string> = {
    fr: "French",
    en: "English",
    de: "German",
    es: "Spanish",
    it: "Italian"
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

// ---------------------------------------------------------------------------
// Dynamic model list (fetched live from the provider)
// ---------------------------------------------------------------------------

/**
 * Fetch the list of model IDs available for the given provider and API key.
 * Uses the /v1/models endpoint (OpenAI-compatible) or Anthropic's equivalent.
 * Returns an array of model IDs sorted alphabetically, or throws LlmApiError.
 *
 * This lets the Settings UI show a real-time picker of available models,
 * so the user is never blocked by a deprecated hardcoded model name.
 */
export async function fetchAvailableModels(
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string
): Promise<string[]> {
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";
  const baseUrl = providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);

  if (!apiKey.trim() || !baseUrl.trim()) {
    throw new Error("API key and base URL are required");
  }

  if (format === "anthropic") {
    return fetchAnthropicModels(apiKey, baseUrl);
  }
  return fetchOpenAiModels(apiKey, baseUrl);
}

async function fetchOpenAiModels(apiKey: string, baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal as RequestInit["signal"]
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

async function fetchAnthropicModels(apiKey: string, baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      signal: controller.signal as RequestInit["signal"]
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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function extractRecipeFromPhoto(
  imageBase64: string,
  apiKey: string,
  providerId: LlmProviderId,
  userBaseUrl: string,
  userModel: string,
  userLocale: string = "en"
): Promise<Recipe> {
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";

  // For standard providers, always use the preset baseUrl.
  // Use the user's selected model if available, otherwise fall back to the preset's default.
  const baseUrl = providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);
  const model = userModel || (preset?.defaultModel ?? "");
  const modelDocsUrl = preset?.modelDocsUrl ?? "";
  const prompt = buildExtractionPrompt(userLocale);

  logInfo("network", `Requesting recipe extraction from ${providerId} (${model}) in locale ${userLocale}`);

  let responseText: string;
  try {
    if (format === "anthropic") {
      responseText = await callAnthropicApi(imageBase64, apiKey, baseUrl, model, prompt);
    } else {
      responseText = await callOpenAiCompatibleApi(imageBase64, apiKey, baseUrl, model, prompt);
    }
  } catch (err) {
    logError("network", "Failed to call LLM API for photo import", err);
    // Re-wrap model-not-found errors with provider docs URL so the UI can help.
    if (err instanceof LlmApiError && isModelNotFoundError(err)) {
      throw new LlmModelNotFoundError(err.status, err.message, model, modelDocsUrl);
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
  userLocale: string = "en"
): Promise<Recipe> {
  const preset = LLM_PROVIDERS.find((p) => p.id === providerId);
  const format = preset?.apiFormat ?? "openai";

  const baseUrl = providerId === "custom" ? userBaseUrl : (preset?.baseUrl ?? userBaseUrl);
  const model = userModel || (preset?.defaultModel ?? "");
  const modelDocsUrl = preset?.modelDocsUrl ?? "";
  const prompt = buildTextPrompt(userLocale, textPrompt);

  logInfo("network", `Requesting recipe generation from ${providerId} (${model}) in locale ${userLocale}`);

  let responseText: string;
  try {
    if (format === "anthropic") {
      responseText = await callAnthropicApi(null, apiKey, baseUrl, model, prompt);
    } else {
      responseText = await callOpenAiCompatibleApi(null, apiKey, baseUrl, model, prompt);
    }
  } catch (err) {
    logError("network", "Failed to call LLM API for text generation", err);
    if (err instanceof LlmApiError && isModelNotFoundError(err)) {
      throw new LlmModelNotFoundError(err.status, err.message, model, modelDocsUrl);
    }
    throw err;
  }

  return parseRecipeFromLlmResponse(responseText);
}

// ---------------------------------------------------------------------------
// OpenAI-compatible API (OpenAI, Gemini, Groq, Mistral, Custom)
// ---------------------------------------------------------------------------

async function callOpenAiCompatibleApi(
  imageBase64: string | null,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const messagesContent = imageBase64 
    ? [
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        },
        {
          type: "text",
          text: prompt
        }
      ]
    : prompt;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: messagesContent
          }
        ]
      }),
      signal: controller.signal as RequestInit["signal"]
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La requête a expiré (timeout de 60s). Veuillez vérifier votre connexion.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LlmApiError(response.status, body);
  }

  const data = (await response.json()) as OpenAiResponse;
  const resultContent = data?.choices?.[0]?.message?.content;
  if (!resultContent) {
    throw new Error("Empty response from LLM");
  }
  return resultContent;
}

// ---------------------------------------------------------------------------
// Anthropic Messages API (Claude)
// ---------------------------------------------------------------------------

async function callAnthropicApi(
  imageBase64: string | null,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/messages`;

  const messagesContent = imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: imageBase64
          }
        },
        {
          type: "text",
          text: prompt
        }
      ]
    : prompt;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: messagesContent
          }
        ]
      }),
      signal: controller.signal as RequestInit["signal"]
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La requête a expiré (timeout de 60s). Veuillez vérifier votre connexion.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LlmApiError(response.status, body);
  }

  const data = (await response.json()) as AnthropicResponse;
  const block = data?.content?.find((b) => b.type === "text");
  if (!block?.text) {
    throw new Error("Empty response from LLM");
  }
  return block.text;
}

// ---------------------------------------------------------------------------
// Parse LLM response -> Recipe
// ---------------------------------------------------------------------------

function parseRecipeFromLlmResponse(responseText: string): Recipe {
  let cleaned = responseText.trim();
  
  // Try to extract JSON from markdown code block if present
  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1].trim();
  } else {
    // If no markdown block, try to find the first { and last }
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
    logError("app", "LLM did not return valid JSON", { err, responseText, cleaned });
    throw new Error("LLM did not return valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    logError("app", "LLM response is not a JSON object", { parsed });
    throw new Error("LLM response is not a JSON object");
  }

  if ("error" in parsed && parsed.error === "NOT_FOOD") {
    throw new LlmNotFoodError();
  }

  try {
    return jsonLdToRecipe(parsed as Record<string, unknown>);
  } catch (err) {
    logError("app", "Failed to convert JSON-LD to Recipe", { err, parsed });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class LlmApiError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`LLM API error ${status}: ${body.slice(0, 200)}`);
    this.name = "LlmApiError";
    this.status = status;
  }
}

/** Thrown when the API returns a 400/404 indicating the model name is invalid. */
export class LlmModelNotFoundError extends LlmApiError {
  readonly model: string;
  readonly modelDocsUrl: string;
  constructor(status: number, originalMessage: string, model: string, modelDocsUrl: string) {
    super(status, originalMessage);
    this.name = "LlmModelNotFoundError";
    this.model = model;
    this.modelDocsUrl = modelDocsUrl;
  }
}

/** Thrown when the user uploads an image or uses a prompt that is not related to food/beverages. */
export class LlmNotFoodError extends Error {
  constructor() {
    super("The provided content is not related to food or beverages.");
    this.name = "LlmNotFoodError";
  }
}

/**
 * Heuristic to detect "model not found" errors across providers.
 * Each provider formats this differently in the error body.
 */
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

// ---------------------------------------------------------------------------
// Response types (minimal)
// ---------------------------------------------------------------------------

type OpenAiResponse = {
  choices?: { message?: { content?: string } }[];
};

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
};
