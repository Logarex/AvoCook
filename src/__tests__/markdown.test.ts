import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasBlockMarkdown, isSafeMarkdownLink, markdownToPlainText, parseMarkdown, renderMarkdownHtml, splitRecipeText } from "../features/markdown/markdown";
import { normalizeRecipe, toCookbookRecipe } from "../features/recipes/types";
import { expandEditableListItem } from "../screens/recipeEditorHelpers";
import { getRecipeAlphabetLetter, getRecipeSearchScore, getRecipeSearchText, normalizeSearchText } from "../screens/recipeList/recipeListHelpers";
import { findRecipeJsonLd, jsonLdToRecipe } from "../features/import/schemaRecipeParser";
import en from "../i18n/locales/en";
import fr from "../i18n/locales/fr";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";

const languages = { en: [en, "Mix crème"], fr: [fr, "Mélanger la crème"], de: [de, "Crème verrühren"], es: [es, "Mezclar la nata"], it: [itLocale, "Mescolare la panna"], da: [da, "Bland fløden"] } as const;

describe("optional recipe Markdown", () => {
  it("keeps formatted names findable by their visible text and alphabet letter", () => {
    const recipe = normalizeRecipe({ name: "**Crème** *fraîche*", recipeIngredient: ["**200 g** rice"] });
    expect(getRecipeSearchScore(recipe, normalizeSearchText("crème fraîche"))).toBe(0);
    expect(normalizeSearchText(getRecipeSearchText(recipe))).toContain("200 g rice");
    expect(getRecipeAlphabetLetter("**Épinard**")).toBe("E");
    expect(getRecipeAlphabetLetter("*Œufs*")).toBe("O");
    expect(getRecipeAlphabetLetter("[Apple](https://example.com)")).toBe("A");
  });
  it.each(Object.entries(languages))("preserves every text field through save, sync and JSON restore in %s", (_language, [, text]) => {
    const block = `## ${text}\n\n- **200 g**\n  - *crème*\n\n> ${text}\n\n\`\`\`text\n  ${text}\n\`\`\``;
    const input = normalizeRecipe({ name: `**${text}**`, description: block, recipeCategory: `*${text}*`, keywords: `**${text}**, *crème*`, sourceName: `[${text}](https://example.com/recipe)`, recipeIngredient: [block, "2 eggs"], recipeInstructions: [block, text], tool: [block, "Whisk"], nutrition: { calories: "**420** kcal", servingSize: `*${text}*` }, localMeta: { timers: [{ id: "timer", label: `**${text}**`, minutes: 10 }] } });
    const restored = normalizeRecipe(JSON.parse(JSON.stringify(input)));
    expect(restored).toEqual(input);
    const payload = toCookbookRecipe(restored);
    for (const key of ["name", "description", "recipeCategory", "keywords", "sourceName", "recipeIngredient", "recipeInstructions", "tool", "nutrition"] as const) {
      expect(payload[key]).toEqual(input[key]);
    }
    expect(payload.localMeta).toBeUndefined();
    const html = renderMarkdownHtml(restored.description);
    expect(html).toContain(`<h2>${text}</h2>`);
    expect(html).toContain("<strong>200 g</strong>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("  " + text);
  });

  it("renders headings, nested ordered lists, quotes, code, tables, strikethrough and line breaks", () => {
    const html = renderMarkdownHtml("# Soup\n\n3. **Mix**\n   - *salt*\n\n> Cool\n\n`2 tsp`\n\n~~burnt~~\n\n| Tool | Use |\n| --- | --- |\n| Spoon | Mix |\n\nFirst\nSecond");
    for (const tag of ["<h1>", '<ol start="3">', "<ul>", "<strong>", "<em>", "<blockquote>", "<code>", "<s>", "<table>", "<br>"]) expect(html).toContain(tag);
  });

  it("leaves ordinary recipe text, fractions, accents and Unicode readable", () => {
    for (const text of ["200 g farine", "½ citron", "180°C & 40% crème", "日本語 中文 한국어", "مرحبا بالعالم", "*unclosed", "B12 + C++"]) {
      expect(markdownToPlainText(text)).toBe(text);
      expect(parseMarkdown(text)[0].type).toBe("paragraph");
    }
    expect(markdownToPlainText("**Crème** *fraîche* [recipe](https://example.com)")).toBe("Crème fraîche recipe");
  });

  it("keeps Markdown paste blocks intact without breaking plain multiline paste", () => {
    const block = "## Sauce\n\n- Mix\n  - Salt\n\n```\n  Cool\n```";
    expect(hasBlockMarkdown(block)).toBe(true);
    expect(expandEditableListItem([""], 0, block)).toEqual([block]);
    expect(splitRecipeText(block)).toEqual([block]);
    expect(expandEditableListItem([""], 0, "200 g flour\n\n2 eggs")).toEqual(["200 g flour", "2 eggs"]);
    expect(splitRecipeText("Whisk\nSpoon")).toEqual(["Whisk", "Spoon"]);
    const paragraph = "**Mix** gently.\n\nRest for ten minutes.";
    expect(splitRecipeText(paragraph)).toEqual([paragraph]);
  });

  it("preserves Markdown when importing schema.org recipe fields", () => {
    const block = "## Sauce\n\n- **Mix**\n  - salt\n\n```\n  Cool\n```";
    const recipe = jsonLdToRecipe(findRecipeJsonLd(`<script type="application/ld+json">${JSON.stringify({ "@type": "Recipe", name: "**Soup**", description: block, recipeIngredient: ["**200 g** flour"], recipeInstructions: [{ "@type": "HowToStep", text: block }], tool: [block] })}</script>`)!, "https://example.com/recipe");
    expect(recipe?.description).toBe(block);
    expect(recipe?.recipeInstructions).toEqual([block]);
    expect(recipe?.tool).toEqual([block]);
  });

  it("preserves the indentation of code blocks across normalization and import", () => {
    const code = "    200 g flour\n    2 eggs";
    const recipe = normalizeRecipe({ description: code, recipeInstructions: [code], tool: [code] });
    expect(recipe.description).toBe(code);
    expect(recipe.recipeInstructions).toEqual([code]);
    expect(recipe.tool).toEqual([code]);
    expect(splitRecipeText(code)).toEqual([code]);
    expect(renderMarkdownHtml(recipe.recipeInstructions[0])).toContain("<pre><code>200 g flour");
    const imported = jsonLdToRecipe({ "@type": "Recipe", description: code, recipeInstructions: [code] });
    expect(imported.description).toBe(code);
    expect(imported.recipeInstructions).toEqual([code]);
  });

  it.each(["javascript:alert(1)", "data:text/html,unsafe", "file:///etc/passwd", "avocook://settings", "//example.com", "https://example.com\nunsafe"])("rejects unsafe link destination %s", (url) => {
    expect(isSafeMarkdownLink(url)).toBe(false);
    expect(renderMarkdownHtml(`[click](${url})`)).not.toContain("<a href=");
  });

  it("escapes embedded HTML and exposes images only as safe links", () => {
    const html = renderMarkdownHtml('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[Recipe](https://example.com/?q=%22)\n\n![Photo](https://example.com/photo.jpg)');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('<a href="https://example.com/photo.jpg">Photo</a>');
    expect(isSafeMarkdownLink("mailto:chef@example.com")).toBe(true);
  });

  it.each(Object.entries(languages))("documents optional Markdown in the app and README for %s", (language, [locale]) => {
    const help = locale.translation.editor.markdownHelp;
    expect(help).toContain("Markdown");
    expect(help).toContain("**");
    expect(locale.translation.editor.toolItem).toContain("{{count}}");
    const path = language === "en" ? "../../README.md" : `../../docs/${language}/README.md`;
    const readme = readFileSync(new URL(path, import.meta.url), "utf8");
    expect(readme).toContain("Markdown");
    expect(readme).toContain("https://example.com");
  });
});
