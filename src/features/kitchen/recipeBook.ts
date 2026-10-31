import { markdownToPlainText, renderMarkdownHtml } from "../markdown/markdown";
import type { Recipe } from "../recipes/types";
import { humanDuration } from "../../utils/duration";

export type BookLabels = {
  title: string;
  ingredients: string;
  instructions: string;
  servings: string;
  contents?: string;
  recipes?: string;
  prepTime?: string;
  cookTime?: string;
};
const escape = (value: string | number) => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (value: string) => escape(markdownToPlainText(value));
const number = (index: number) => String(index + 1).padStart(2, "0");

export function createRecipeBookHtml(recipes: Recipe[], labels: BookLabels, images: readonly string[] = []): string {
  const photo = (index: number, className: string) => {
    const source = images[index] ?? "";
    // Only self-contained images: no file URLs, credentials or active HTML.
    return /^data:image\/(?:jpeg|png|webp|gif|heic);base64,[a-z0-9+/=\s]+$/i.test(source)
      ? `<img class="${className}" src="${escape(source)}" alt="${text(recipes[index].name)}">` : "";
  };
  const coverIndex = recipes.findIndex((_, index) => Boolean(photo(index, "cover-photo")));
  const coverPhoto = coverIndex >= 0 ? photo(coverIndex, "cover-photo") : "";
  const inline = (value: string) => renderMarkdownHtml(value, true);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${text(labels.title)}</title><style>
    @page { size: A4; margin: 22mm 22mm 24mm; }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font: 10.5pt -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #243d37; line-height: 1.55; overflow-wrap: anywhere; }
    h1, h2, p { margin-top: 0; } h1 { font-size: 27pt; line-height: 1.15; letter-spacing: -0.7pt; color: #164c45; margin-bottom: 13pt; }
    h2 { font-size: 15pt; line-height: 1.3; color: #164c45; margin: 22pt 0 12pt; break-after: avoid; }
    a { color: #176b56; text-decoration: none; } img { max-width: 100%; }
    .brand { font-size: 11pt; font-weight: 700; letter-spacing: 2pt; color: #176b56; }
    .rule { height: 4pt; background: #176b56; border-radius: 3pt; margin: 14pt 0 24pt; }
    .cover { padding-top: 12mm; } .cover h1 { font-size: 43pt; max-width: 95%; margin: 18pt 0 22pt; }
    .cover-photo { width: 100%; height: 290pt; object-fit: cover; border-radius: 18pt; display: block; }
    .cover-art { height: 270pt; border-radius: 18pt; background: #e7f0e7; padding: 40pt; color: #176b56; font-size: 94pt; font-family: Georgia, serif; }
    .cover-count { display: inline-block; background: #f7ead8; color: #905125; border-radius: 12pt; padding: 7pt 15pt; margin: 22pt 0 0; font-size: 11pt; }
    .toc, article { break-before: page; page-break-before: always; }
    .toc { padding-top: 10pt; } .toc ol { padding: 0; list-style: none; }
    .toc li { border-bottom: 1pt solid #e2e8e3; padding: 12pt 0; break-inside: avoid; }
    .toc-number { color: #b3603e; font-size: 12pt; font-weight: 700; display: inline-block; width: 30pt; vertical-align: top; }
    .toc-name { display: inline-block; width: 89%; font-weight: 600; } .toc-category { display: block; font-size: 9pt; color: #6e7b74; margin-top: 2pt; font-weight: 400; }
    .recipe-top { font-size: 9pt; font-weight: 700; letter-spacing: 1pt; text-transform: uppercase; color: #a45132; margin-bottom: 11pt; }
    .recipe-photo { width: 100%; height: 155pt; object-fit: cover; border-radius: 12pt; display: block; margin: 0 0 16pt; }
    .description { color: #5b6e65; margin-bottom: 15pt; } .description p:last-child { margin-bottom: 0; }
    .meta { margin-bottom: 17pt; } .meta span { display: inline-block; margin: 0 6pt 6pt 0; border-radius: 8pt; background: #edf3ec; color: #285a4b; padding: 5pt 10pt; font-size: 9pt; }
    .recipe-body.compact { display: table; table-layout: fixed; width: 100%; }
    .compact .ingredient-column { display: table-cell; vertical-align: top; width: 35%; padding-right: 17pt; }
    .compact .method-column { display: table-cell; vertical-align: top; width: 65%; }
    .compact .method-column h2 { margin-top: 0; }
    .compact .ingredients { padding: 12pt; font-size: 10pt; }
    .compact .ingredients li { padding: 5pt 0; }
    .compact .ingredients h2 { font-size: 13pt; }
    .ingredients { background: #f5f1e8; border-left: 4pt solid #d4a65a; padding: 15pt 19pt; border-radius: 0 10pt 10pt 0; }
    .ingredients h2 { margin: 0 0 9pt; } .ingredients ul { list-style: none; margin: 0; padding: 0; }
    .ingredients li { padding: 5pt 0; border-bottom: 0.5pt solid #e6dfd0; break-inside: avoid; } .ingredients li:last-child { border-bottom: 0; }
    li p { margin: 0; } .steps { list-style: none; counter-reset: step; padding: 0; }
    .steps > li { counter-increment: step; position: relative; padding: 0 0 0 33pt; margin-bottom: 16pt; orphans: 3; widows: 3; }
    .steps > li::before { content: counter(step, decimal-leading-zero); position: absolute; top: 0; left: 0; color: #a45132; font-size: 13pt; font-weight: 700; }
    .steps p { margin-bottom: 7pt; } ul, ol { padding-left: 19pt; } pre { white-space: pre-wrap; }
    .recipe-end { border-top: 1pt solid #dbe5dc; padding-top: 9pt; margin-top: 24pt; color: #6e7b74; font-size: 8pt; letter-spacing: 1pt; }
    .ingredients, .steps { orphans: 3; widows: 3; } .recipe-photo, .meta { break-inside: avoid; }
  </style></head><body>
    <section class="cover"><div class="brand">AVOCOOK</div><div class="rule"></div><h1>${inline(labels.title)}</h1>
      ${coverPhoto || '<div class="cover-art">A.</div>'}
      <div class="cover-count">${recipes.length}${labels.recipes ? ` &nbsp; ${text(labels.recipes)}` : ""}</div>
    </section>
    <section class="toc"><div class="brand">AVOCOOK</div><div class="rule"></div><h1>${text(labels.contents ?? labels.title)}</h1><ol>${recipes.map((recipe, index) =>
      `<li><a href="#recipe-${index}"><span class="toc-number">${number(index)}</span><span class="toc-name">${inline(recipe.name)}${recipe.recipeCategory ? `<span class="toc-category">${text(recipe.recipeCategory)}</span>` : ""}</span></a></li>`).join("")}</ol></section>
    ${recipes.map((recipe, index) => {
      const prep = humanDuration(recipe.prepTime);
      const cook = humanDuration(recipe.cookTime);
      const compact = recipe.recipeIngredient.length <= 12 &&
        recipe.recipeInstructions.join(" ").length <= 1600;
      return `<article><div class="recipe-top">${number(index)} &nbsp; / &nbsp; ${text(recipe.recipeCategory || "AvoCook")}</div>
        <h1 id="recipe-${index}">${inline(recipe.name)}</h1>${photo(index, "recipe-photo")}
        ${recipe.description ? `<div class="description">${renderMarkdownHtml(recipe.description)}</div>` : ""}
        <div class="meta">${recipe.recipeYield ? `<span>${escape(recipe.recipeYield)} ${text(labels.servings)}</span>` : ""}${prep && labels.prepTime ? `<span>${text(labels.prepTime)} · ${escape(prep)}</span>` : ""}${cook && labels.cookTime ? `<span>${text(labels.cookTime)} · ${escape(cook)}</span>` : ""}</div>
        <div class="recipe-body${compact ? " compact" : ""}"><div class="ingredient-column"><section class="ingredients"><h2>${text(labels.ingredients)}</h2><ul>${recipe.recipeIngredient.map((line) => `<li>${renderMarkdownHtml(line)}</li>`).join("")}</ul></section></div>
        <div class="method-column"><h2>${text(labels.instructions)}</h2><ol class="steps">${recipe.recipeInstructions.map((step) => `<li>${renderMarkdownHtml(step)}</li>`).join("")}</ol></div></div>
        <div class="recipe-end">AVOCOOK &nbsp; · &nbsp; ${number(index)}</div></article>`;
    }).join("")}</body></html>`;
}
