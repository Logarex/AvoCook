import { renderMarkdownHtml } from "../markdown/markdown";
import type { Recipe } from "../recipes/types";
export type BookLabels = {
  title: string;
  ingredients: string;
  instructions: string;
  servings: string;
};
export function createRecipeBookHtml(
  recipes: Recipe[],
  labels: BookLabels,
): string {
  const inline = (value: string) => renderMarkdownHtml(value, true);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${inline(labels.title)}</title><style>
    @page { margin: 20mm; } body { font: 12pt -apple-system, sans-serif; color: #182d27; line-height: 1.5; }
    article { break-before: page; } h1 { font-size: 28pt; line-height: 1.2; } h2 { font-size: 17pt; } li { margin-bottom: 10pt; }
    img { max-width: 100%; } .cover { padding-top: 35mm; } a { color: #176b56; } ul, ol { padding-left: 22pt; }
    </style></head><body><div class="cover"><p>AvoCook</p><h1>${inline(labels.title)}</h1><ol>${recipes.map((recipe) => `<li>${inline(recipe.name)}</li>`).join("")}</ol></div>
    ${recipes.map((recipe) => `<article><h1>${inline(recipe.name)}</h1>${renderMarkdownHtml(recipe.description)}<p>${recipe.recipeYield} ${inline(labels.servings)}</p><h2>${inline(labels.ingredients)}</h2><ul>${recipe.recipeIngredient.map((line) => `<li>${renderMarkdownHtml(line)}</li>`).join("")}</ul><h2>${inline(labels.instructions)}</h2><ol>${recipe.recipeInstructions.map((step) => `<li>${renderMarkdownHtml(step)}</li>`).join("")}</ol></article>`).join("")}</body></html>`;
}
