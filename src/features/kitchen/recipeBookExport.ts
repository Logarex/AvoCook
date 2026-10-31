import type { CookbookClient } from "../nextcloud/cookbookClient";
import type { Recipe } from "../recipes/types";
import { getRecipePrintImageDataUri } from "../recipes/recipeSharing";
import { createRecipeBookHtml, type BookLabels } from "./recipeBook";

export async function createIllustratedRecipeBookHtml(recipes: Recipe[], labels: BookLabels, client: CookbookClient | null) {
  const images = new Array<string>(recipes.length).fill("");
  let next = 0;
  // Bound native downloads/decoding for large books while preserving selection order.
  await Promise.all(Array.from({ length: Math.min(3, recipes.length) }, async () => {
    while (next < recipes.length) {
      const index = next++;
      try {
        images[index] = await getRecipePrintImageDataUri(recipes[index], client);
      } catch (error) {
        console.warn("Could not prepare recipe book image", error);
      }
    }
  }));
  return createRecipeBookHtml(recipes, labels, images);
}
