import type { Recipe } from "./types";

export function getRecipeShareFilename(
  recipe: Pick<Recipe, "name">,
  extension: "json" | "pdf"
) {
  const basename = sanitizeFilename(recipe.name || "Recette");
  return extension === "json"
    ? `${basename}.avocook.json`
    : `${basename}.pdf`;
}

function sanitizeFilename(value: string) {
  const normalized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return normalized || "Recette";
}
