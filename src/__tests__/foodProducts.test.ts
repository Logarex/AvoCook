import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupFoodProduct, parseFoodProduct } from "../features/kitchen/foodProducts";
import { emptyKitchen, parseKitchenData } from "../features/kitchen/kitchen";

afterEach(() => vi.unstubAllGlobals());
describe("food barcode lookup", () => {
  it("uses the localized name, normalizes real grades and ignores unknown scores", () => {
    expect(parseFoodProduct("12345678", { product: { product_name: "Milk", product_name_fr: "Lait", quantity: "1 l", nutrition_grades: "b", environmental_score_grade: "unknown" } }, "fr-FR")).toEqual({ barcode: "12345678", name: "Lait", quantity: "1 l", nutriScore: "B", greenScore: undefined });
    expect(parseFoodProduct("12345678", { product: { product_name: "Milk", ecoscore_grade: "c" } }, "da")?.greenScore).toBe("C");
    expect(parseFoodProduct("12345678", { status: 0 }, "fr")).toBeNull();
  });
  it("keeps missing data absent and never copies a catalog expiry into someone's stock", () => {
    const result = parseFoodProduct("12345678", { product: { product_name: "Bread", expiration_date: "2020-01-01", nutrition_grades: "not-applicable", environmental_score_grade: "z" } }, "en");
    expect(result).toEqual({ barcode: "12345678", name: "Bread", quantity: "", nutriScore: undefined, greenScore: undefined });
    expect(result).not.toHaveProperty("expires");
  });
  it("validates codes before a request and distinguishes unknown products from outages", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(lookupFoodProduct("https://example.com", "en")).rejects.toThrow("invalidBarcode");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce({ status: 404 });
    expect(await lookupFoodProduct("12345678", "en")).toBeNull();
    fetcher.mockResolvedValueOnce({ status: 503, ok: false });
    await expect(lookupFoodProduct("12345678", "en")).rejects.toThrow("productNetworkError");
  });
  it("preserves barcode and grades through backup parsing, including separate batches of one product", () => {
    const data = { ...emptyKitchen(), stock: ["first", "second"].map((id) => ({ id, name: "Lait", quantity: "1 l", expires: "2026-11-01", location: "fridge", barcode: "12345678", nutriScore: "B", greenScore: "C" })) };
    expect(parseKitchenData(data).stock).toEqual(data.stock);
    data.stock[0].nutriScore = "unknown";
    expect(() => parseKitchenData(data)).toThrow();
  });
});
