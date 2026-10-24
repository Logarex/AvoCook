import { APP_VERSION } from "../../version";

export type FoodProduct = {
  barcode: string;
  name: string;
  quantity: string;
  nutriScore?: string;
  greenScore?: string;
};
const productCache = new Map<string, { product: FoodProduct; until: number }>();
const grade = (value: unknown): string | undefined =>
  typeof value === "string" && /^[a-e]$/i.test(value) ? value.toUpperCase() : undefined;
export function parseFoodProduct(barcode: string, data: unknown, language: string): FoodProduct | null {
  const response = data as { product?: Record<string, unknown> } | null;
  const p = response?.product;
  if (!p) return null;
  const localized = p[`product_name_${language.split("-")[0]}`];
  const name = typeof localized === "string" && localized.trim() ? localized : p.product_name;
  if (typeof name !== "string" || !name.trim()) return null;
  return {
    barcode, name: name.trim(), quantity: typeof p.quantity === "string" ? p.quantity : "",
    nutriScore: grade(p.nutrition_grades),
    greenScore: grade(p.environmental_score_grade ?? p.ecoscore_grade),
  };
}
export async function lookupFoodProduct(barcode: string, language: string, signal?: AbortSignal) {
  if (!/^\d{8,14}$/.test(barcode)) throw new Error("invalidBarcode");
  const lang = language.split("-")[0].replace(/[^a-z]/g, "");
  const cacheKey = `${lang}:${barcode}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.product;
  const fields = `product_name,product_name_${lang},quantity,nutrition_grades,environmental_score_grade,ecoscore_grade`;
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`, {
    signal, headers: { "User-Agent": `AvoCook/${APP_VERSION} (https://github.com/Logarex/AvoCook)` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("productNetworkError");
  const product = parseFoodProduct(barcode, await response.json(), lang);
  if (product) {
    if (productCache.size >= 50) productCache.delete(productCache.keys().next().value!);
    productCache.set(cacheKey, { product, until: Date.now() + 3600000 });
  }
  return product;
}
