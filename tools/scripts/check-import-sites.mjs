import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error("Usage: npm run import:check -- <recipe-url> [recipe-url…]");
  process.exitCode = 1;
} else {
  const require = createRequire(import.meta.url);
  const cache = new Map();
  function loadTypeScript(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const localRequire = (specifier) => specifier.startsWith(".")
      ? loadTypeScript(resolve(dirname(path), `${specifier}.ts`))
      : require(specifier);
    new Function("require", "module", "exports", source)(localRequire, module, module.exports);
    return module.exports;
  }
  const { importRecipeFromWeb } = loadTypeScript(fileURLToPath(new URL("../../src/features/import/schemaRecipeParser.ts", import.meta.url)));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => originalFetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  for (const input of urls) {
    try {
      const url = new URL(input);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Use an HTTP or HTTPS URL");
      const recipe = await importRecipeFromWeb(url.href);
      console.log(JSON.stringify({ url: url.href, name: recipe.name, ingredients: recipe.recipeIngredient.length, steps: recipe.recipeInstructions.length, prepTime: recipe.prepTime, cookTime: recipe.cookTime }));
    } catch (error) {
      console.error(`${input}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  globalThis.fetch = originalFetch;
}
