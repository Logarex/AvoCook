const urls = process.argv.slice(2);

if (!urls.length) {
  console.log("Usage: npm run import:check -- https://site.example/recette");
  process.exit(0);
}

const results = [];

for (const url of urls) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 compatible; NextcloudCookbookImportCheck/0.1"
      }
    });
    const html = await response.text();
    const recipe = findRecipeJsonLd(html);
    results.push({
      url,
      status: response.status,
      ok: response.ok && Boolean(recipe?.name),
      name: recipe?.name ?? null,
      ingredients: Array.isArray(recipe?.recipeIngredient)
        ? recipe.recipeIngredient.length
        : 0,
      instructions: countInstructions(recipe?.recipeInstructions),
      image: Boolean(recipe?.image)
    });
  } catch (error) {
    results.push({
      url,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

console.table(results);

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}

function findRecipeJsonLd(html) {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application(?:\/|&#x2F;)ld(?:\+|&#x2B;)json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const script of scripts) {
    const parsed = safeJsonParse(decodeHtmlEntities(script[1].trim()));
    const recipe = findRecipeObject(parsed);
    if (recipe) {
      return recipe;
    }
  }

  return null;
}

function safeJsonParse(rawJson) {
  try {
    return JSON.parse(rawJson);
  } catch {
    try {
      return JSON.parse(rawJson.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

function findRecipeObject(value) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipeObject(item);
      if (recipe) {
        return recipe;
      }
    }
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }

  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (
    types.some(
      (type) => typeof type === "string" && type.toLowerCase() === "recipe"
    )
  ) {
    return value;
  }
  if (Array.isArray(value["@graph"])) {
    return findRecipeObject(value["@graph"]);
  }
  return null;
}

function countInstructions(value) {
  if (!value) {
    return 0;
  }
  if (typeof value === "string") {
    return value.trim() ? 1 : 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  return 1;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
