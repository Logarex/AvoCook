import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeFridgePhoto,
  generateFridgeRecipe,
  parseFridgeIngredients,
  parseFridgeRecipe,
  FridgePhotoError,
  FridgeInputError,
  FridgeResponseError,
  fridgeErrorKey,
  MAX_FRIDGE_PHOTO_LENGTH,
} from "../features/kitchen/fridgeAssistant";
import {
  LLM_PROVIDERS,
  LlmApiError,
  LlmConfigurationError,
  LlmNotFoodError,
  LlmTimeoutError,
  requestLlmContent,
  type LlmRequestSettings,
} from "../features/import/photoRecipeImport";

const settings: LlmRequestSettings = {
  apiKey: "fake-test-key",
  providerId: "openai",
  baseUrl: "",
  model: "user-selected-model",
};
const input = {
  ingredients: "2 eggs, cheese",
  wishes: "No oven",
  servings: 2,
  minutes: 20,
};
const output = {
  name: "Omelette",
  recipeYield: 2,
  recipeIngredient: ["2 eggs", "30 g cheese"],
  recipeInstructions: ["Whisk eggs", "Cook gently"],
  prepTime: "PT5M",
  cookTime: "PT10M",
  totalTime: "PT15M",
};
const fakeJpeg = "/9j/AA==";
const fetcher = vi.fn();
function reply(content: unknown, anthropic = false) {
  return {
    ok: true,
    status: 200,
    json: async () =>
      anthropic
        ? { content: [{ type: "text", text: JSON.stringify(content) }] }
        : { choices: [{ message: { content: JSON.stringify(content) } }] },
  };
}
beforeEach(() => {
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fridge assistant transport and generation", () => {
  it.each(LLM_PROVIDERS)(
    "keeps the configured $id provider and model",
    async (preset) => {
      fetcher.mockResolvedValue(reply(output, preset.id === "claude"));
      const config = {
        ...settings,
        providerId: preset.id,
        baseUrl: "http://localhost:1234/v1",
      };
      const recipe = await generateFridgeRecipe(input, config, "en");
      const [url, request] = fetcher.mock.calls[0];
      expect(url).toBe(
        `${preset.id === "custom" ? config.baseUrl : preset.baseUrl.replace(/\/$/, "")}${preset.id === "claude" ? "/v1/messages" : "/chat/completions"}`,
      );
      const body = JSON.parse(request.body);
      expect(body.model).toBe("user-selected-model");
      expect(body.messages[0].content).toContain(JSON.stringify(input));
      expect(
        request.headers[preset.id === "claude" ? "x-api-key" : "Authorization"],
      ).toBe(
        preset.id === "claude" ? settings.apiKey : `Bearer ${settings.apiKey}`,
      );
      expect(request.body).not.toContain(settings.apiKey);
      expect(recipe).toMatchObject({
        id: null,
        name: "Omelette",
        recipeYield: 2,
        image: "",
        url: "",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    ["fr-FR", "French"],
    ["en", "English"],
    ["de", "German"],
    ["es", "Spanish"],
    ["it", "Italian"],
    ["da-DK", "Danish"],
  ])("requests photo names and recipes in %s", async (locale, language) => {
    fetcher
      .mockResolvedValueOnce(
        reply({ ingredients: ["eggs"], uncertain: ["a jar"] }),
      )
      .mockResolvedValueOnce(reply(output));
    expect(await analyzeFridgePhoto(fakeJpeg, settings, locale)).toEqual({
      ingredients: ["eggs"],
      uncertain: ["a jar"],
    });
    const photo = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(photo.messages[0].content[0]).toEqual({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${fakeJpeg}` },
    });
    expect(photo.messages[0].content[1].text).toContain(language);
    await generateFridgeRecipe(input, settings, locale);
    expect(
      JSON.parse(fetcher.mock.calls[1][1].body).messages[0].content,
    ).toContain(language);
    expect(
      JSON.parse(fetcher.mock.calls[1][1].body).messages[0].content,
    ).not.toContain(fakeJpeg);
  });
  it("uses Anthropic image content without leaking the key or guessing a different provider", async () => {
    fetcher.mockResolvedValue(
      reply({ ingredients: ["eggs"], uncertain: [] }, true),
    );
    await analyzeFridgePhoto(
      fakeJpeg,
      { ...settings, providerId: "claude" },
      "fr",
    );
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: fakeJpeg },
    });
  });
  it("rejects invalid configuration before sending any data", async () => {
    for (const config of [
      { ...settings, apiKey: " " },
      { ...settings, providerId: "custom" as const, baseUrl: "not-a-url" },
      {
        ...settings,
        providerId: "custom" as const,
        baseUrl: "https://user:password@example.com/v1",
      },
    ]) {
      await expect(
        generateFridgeRecipe(input, config, "en"),
      ).rejects.toBeInstanceOf(LlmConfigurationError);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects unsupported or oversized photos and invalid text inputs before network activity", async () => {
    for (const photo of [
      "",
      "iVBORw0KGgo=",
      "/9j/" + "a".repeat(MAX_FRIDGE_PHOTO_LENGTH),
    ])
      await expect(
        analyzeFridgePhoto(photo, settings, "en"),
      ).rejects.toBeInstanceOf(FridgePhotoError);
    for (const change of [
      { ingredients: " " },
      { ingredients: "a".repeat(6001) },
      { servings: 0 },
      { servings: 2.5 },
      { minutes: 241 },
    ])
      await expect(
        generateFridgeRecipe({ ...input, ...change }, settings, "en"),
      ).rejects.toBeInstanceOf(FridgeInputError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("times out during a stalled response body, aborts transport and never retries", async () => {
    vi.useFakeTimers();
    fetcher.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const request = requestLlmContent("food", settings);
    const failure = expect(request).rejects.toBeInstanceOf(LlmTimeoutError);
    await vi.advanceTimersByTimeAsync(60001);
    await failure;
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels a request even if its transport ignores cancellation", async () => {
    const controller = new AbortController();
    fetcher.mockImplementation(() => new Promise(() => {}));
    const request = requestLlmContent(
      "food",
      settings,
      null,
      controller.signal,
    );
    const failure = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await failure;
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    await expect(
      requestLlmContent("food", settings, null, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([400, 401, 403, 404, 429, 500])(
    "reports HTTP %i without showing the provider's raw response",
    async (status) => {
      fetcher.mockResolvedValue({
        ok: false,
        status,
        text: async () => "private echoed payload",
      });
      try {
        await generateFridgeRecipe(input, settings, "en");
        throw new Error("Expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(LlmApiError);
        expect(fridgeErrorKey(error)).not.toContain("private");
        expect(fridgeErrorKey(error)).toMatch(/^(kitchen|importRecipe)\./);
      }
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects a mismatched serving count instead of silently relabelling ingredient quantities", async () => {
    fetcher.mockResolvedValue(reply({ ...output, recipeYield: 4 }));
    await expect(
      generateFridgeRecipe(input, settings, "en"),
    ).rejects.toBeInstanceOf(FridgeResponseError);
  });
  it("handles no suitable recipe and non-food responses", async () => {
    fetcher
      .mockResolvedValueOnce(reply({ error: "NO_SUITABLE_RECIPE" }))
      .mockResolvedValueOnce(reply({ error: "NOT_FOOD" }));
    await expect(
      generateFridgeRecipe(input, settings, "en"),
    ).rejects.toBeInstanceOf(FridgeInputError);
    await expect(
      analyzeFridgePhoto(fakeJpeg, settings, "en"),
    ).rejects.toBeInstanceOf(LlmNotFoodError);
  });
});

describe("strict fridge output parsing", () => {
  it("keeps uncertainty separate from ingredients and bounds malformed output", () => {
    expect(
      parseFridgeIngredients(
        '```json\n{"ingredients":["eggs","eggs"],"uncertain":["a jar"]}\n```',
      ),
    ).toEqual({ ingredients: ["eggs"], uncertain: ["a jar"] });
    for (const data of [
      "nonsense",
      "[]",
      '{"ingredients":[42]}',
      '{"ingredients":[" "]}',
      JSON.stringify({ ingredients: Array(41).fill("eggs") }),
    ])
      expect(() => parseFridgeIngredients(data)).toThrow(FridgeResponseError);
    expect(() =>
      parseFridgeIngredients('{"ingredients":[],"uncertain":["a jar"]}'),
    ).toThrow(LlmNotFoodError);
  });
  it("preserves repeated instructions and ignores model-supplied URLs, IDs, images and nutrition", () => {
    const parsed = parseFridgeRecipe(
      JSON.stringify({
        ...output,
        id: "99",
        url: "https://untrusted.invalid/",
        image: "https://untrusted.invalid/photo",
        localMeta: { cachedImage: "file:///private" },
        nutrition: { calories: 500 },
        recipeInstructions: ["Stir", "Wait", "Stir"],
      }),
    );
    expect(parsed.recipeInstructions).toEqual(["Stir", "Wait", "Stir"]);
    expect(parsed).toMatchObject({
      id: null,
      url: "",
      image: "",
      imageUrl: "",
      nutrition: null,
      localMeta: undefined,
    });
  });
  it.each([
    { ...output, name: " " },
    { ...output, recipeIngredient: [] },
    { ...output, recipeInstructions: [false] },
    { ...output, recipeInstructions: [] },
  ])("rejects an incomplete recipe", (value) => {
    expect(() => parseFridgeRecipe(JSON.stringify(value))).toThrow(
      FridgeResponseError,
    );
  });
});
