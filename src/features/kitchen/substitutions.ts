export type SubstitutionContext = "muffins" | "white" | "flax" | "butter";
export const EGG_SUBSTITUTION_SOURCE =
  "https://www.kingarthurbaking.com/blog/2023/02/03/bake-egg-free";
export const BAKING_SUBSTITUTION_SOURCE =
  "https://www.chla.org/sites/default/files/atoms/files/CHLA-Baking-Substitution-Guide.pdf";
// Advice only; callers must ask for the preparation context. Never rewrite a recipe.
export function substitutionAmount(
  context: string,
  amount: number,
): { amount: number; water?: number; unit: "g" | "ml" | "tbsp" } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (context === "butter")
    return amount <= 10000 ? { amount: amount * 0.75, unit: "ml" } : null;
  if (!Number.isInteger(amount) || amount > 3) return null;
  if (context === "muffins") return { amount: amount * 57, unit: "g" };
  if (context === "white") return { amount: amount * 28, unit: "g" };
  if (context === "flax") return { amount, water: amount * 3, unit: "tbsp" };
  return null;
}
