import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  extractRecipeFromPhoto,
  generateRecipeFromText,
  isLlmBillingError,
  LlmApiError,
} from "../features/import/photoRecipeImport";

const recipe = { name: "Omelette", recipeIngredient: ["2 eggs"], recipeInstructions: ["Cook."] };
const fetcher = vi.fn();
const json = (status: number, body: unknown) => ({
  ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body),
});
const apiError = (message: string) => json(400, { type: "error", error: { type: "invalid_request_error", message } });

// Same rules as the Messages API: newer models refuse sampling parameters and
// can answer with a thinking block first.
beforeEach(() => {
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetcher.mockReset().mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const legacy = /haiku-4-5|-4-6/.test(body.model);
    if (!legacy && ["temperature", "top_p", "top_k"].some((key) => key in body))
      return apiError("`temperature` may only be set to 1 for this model.");
    return json(200, { content: [
      ...(legacy ? [] : [{ type: "thinking", thinking: "" }]),
      { type: "text", text: JSON.stringify(recipe) },
    ] });
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const models = ["", "claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"];
it.each(models)("generates a recipe from text with Claude model '%s'", async (model) => {
  await expect(generateRecipeFromText("Omelette", "key", "claude", "", model, "en")).resolves.toMatchObject({ name: "Omelette" });
});
it.each(models)("extracts a recipe from a photo with Claude model '%s'", async (model) => {
  await expect(extractRecipeFromPhoto("/9j/AA==", "key", "claude", "", model, "en")).resolves.toMatchObject({ name: "Omelette" });
});
it("leaves room for thinking, which counts toward max_tokens", async () => {
  await generateRecipeFromText("Omelette", "key", "claude", "", "claude-opus-5-5", "en");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).max_tokens).toBeGreaterThanOrEqual(16000);
});
it("recognizes an exhausted Claude balance without treating every 400 as billing", async () => {
  fetcher.mockResolvedValue(apiError("Your credit balance is too low to access the Anthropic API."));
  const error = await generateRecipeFromText("Omelette", "key", "claude", "", "", "en").catch((e) => e);
  expect(error).toBeInstanceOf(LlmApiError);
  expect(isLlmBillingError(error)).toBe(true);
  expect(isLlmBillingError(new LlmApiError(402, ""))).toBe(true);
  expect(isLlmBillingError(new LlmApiError(400, "bad parameter"))).toBe(false);
});
