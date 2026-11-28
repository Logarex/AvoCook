import { createEmptyRecipe, normalizeRecipe, type Recipe } from "../recipes/types";

/**
 * Turns plain recipe text (pasted, read from a PDF or recognized on the
 * device from a photo) into a recipe draft, without any AI service.
 * The user always reviews the draft before it is saved.
 */

/** A line recognized by the device, with a box in 0–1 page coordinates (top-left origin). */
export type OcrLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ParsedRecipeText = {
  recipe: Recipe;
  /** True when both ingredients and steps were found. */
  complete: boolean;
};

const FRACTIONS = "½¼¾⅓⅔⅛⅜⅝⅞";
const STEP_MARKER =
  /^(?:(?:[eé]tape|step|schritt|paso|passo|trin|fase)\s*\d{1,2}\b\s*[:.)\-–—]?|\d{1,2}\s*[.)\-–—]\s+|\d{1,2}\s*[.)](?=\S))\s*/i;
const BULLET = /^[•·▪●○◦■□►▶➢\-–—*+✓]\s*/;
const SENTENCE_END = /[.!?…:)]$/;

const INGREDIENT_HEADINGS = [
  "ingredients",
  "ingredient",
  "ingredienser",
  "ingredientes",
  "ingredienti",
  "zutaten",
  "liste des ingredients",
  "il vous faut",
  "you will need",
  "you need",
  "du skal bruge",
  "was sie brauchen",
  "was du brauchst",
];
const STEP_HEADINGS = [
  "preparation",
  "preparations",
  "instructions",
  "etapes",
  "etapes de preparation",
  "realisation",
  "deroulement",
  "deroulement de la recette",
  "methode",
  "method",
  "methods",
  "directions",
  "steps",
  "procedure",
  "zubereitung",
  "anleitung",
  "so geht's",
  "so gehts",
  "zubereitungsschritte",
  "preparacion",
  "elaboracion",
  "instrucciones",
  "pasos",
  "modo de preparacion",
  "preparazione",
  "procedimento",
  "istruzioni",
  "fremgangsmade",
  "tilberedning",
  "sadan gor du",
  "vejledning",
];
const NOTE_HEADINGS = [
  "astuce",
  "astuces",
  "conseil",
  "conseils",
  "note",
  "notes",
  "remarque",
  "remarques",
  "variante",
  "variantes",
  "tip",
  "tips",
  "variation",
  "variations",
  "hinweis",
  "hinweise",
  "tipp",
  "tipps",
  "consejo",
  "consejos",
  "nota",
  "notas",
  "consiglio",
  "consigli",
  "noter",
  "gode rad",
];

const PREP_LABELS = [
  "temps de preparation",
  "preparation",
  "prep time",
  "preparation time",
  "prep",
  "vorbereitungszeit",
  "vorbereitung",
  "zubereitungszeit",
  "arbeitszeit",
  "tiempo de preparacion",
  "preparacion",
  "tempo di preparazione",
  "preparazione",
  "forberedelsestid",
  "forberedelse",
  "arbejdstid",
];
const COOK_LABELS = [
  "temps de cuisson",
  "cuisson",
  "cooking time",
  "cook time",
  "cooking",
  "cook",
  "baking time",
  "kochzeit",
  "backzeit",
  "garzeit",
  "tiempo de coccion",
  "coccion",
  "tempo di cottura",
  "cottura",
  "tilberedningstid",
  "bagetid",
  "kogetid",
  "stegetid",
];
const TOTAL_LABELS = [
  "temps total",
  "total time",
  "total",
  "gesamtzeit",
  "tiempo total",
  "tempo totale",
  "samlet tid",
  "tid i alt",
  "i alt",
];
const YIELD_WORDS =
  "personnes?|pers\\.?|parts?|portions?|people|persons?|servings?|personen|portionen|stuck|stucke|personas|porciones|raciones|persone|porzioni|personer|portioner|stk\\.?";
const YIELD_BEFORE = new RegExp(`(\\d{1,2})\\s*(?:a|-|–)?\\s*(?:\\d{1,2}\\s*)?(?:${YIELD_WORDS})\\b`);
const YIELD_AFTER =
  /\b(?:pour|for|serves|makes|yield|yields|donne|fur|para|per|til|rendement|portionen|porciones|porzioni|portioner|portions|servings)\s*:?\s*(\d{1,2})\b/;
const HOURS = "h|heures?|hours?|hrs?|std\\.?|stunden?|horas?|ore|timer?|t";
const MINUTES = "min\\.?|minutes?|mins|minuten?|minutos?|minuti|minutter|m";
const DURATION = new RegExp(
  `(?:(\\d{1,2})\\s*(?:${HOURS})\\s*(?:(\\d{1,2})\\s*(?:${MINUTES})?)?|(\\d{1,3})\\s*(?:${MINUTES}))(?![a-z])`,
);
const QUANTITY_WORDS =
  "un|une|deux|trois|quatre|cinq|six|sept|huit|dix|douze|quelques|a|an|one|two|three|four|five|six|some|ein|eine|einen|zwei|drei|vier|funf|etwas|uno|una|dos|tres|cuatro|cinco|unas|due|tre|quattro|cinque|qualche|en|et|to|tre|fire|fem|lidt";
const STARTS_WITH_QUANTITY = new RegExp(
  `^(?:\\d+(?:[.,/]\\d+)?|[${FRACTIONS}]|(?:${QUANTITY_WORDS})\\s)`,
  "i",
);

/** Lower case, no accents, no trailing colon: used only to compare words. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function headingKey(line: string): string {
  return fold(line)
    .replace(/^[#*\s]+/, "")
    .replace(/[\s:.\-–—*]+$/, "")
    .trim();
}

function matchesHeading(line: string, headings: string[]): boolean {
  if (line.length > 60) return false;
  const key = headingKey(line);
  return headings.some(
    (heading) =>
      key === heading ||
      // "Ingrédients (pour 4 personnes)", "Zutaten für 4 Personen"
      (key.startsWith(`${heading} `) && !/[.!?]$/.test(key) && key.length <= heading.length + 30) ||
      key.startsWith(`${heading} (`),
  );
}

function durationMinutes(text: string): number | null {
  const match = DURATION.exec(text);
  if (!match) return null;
  if (match[3]) return Number(match[3]);
  return Number(match[1]) * 60 + Number(match[2] ?? 0);
}

export function toIsoDuration(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 7 * 24 * 60) return null;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `PT${hours ? `${hours}H` : ""}${rest || !hours ? `${rest}M` : ""}`;
}

type Times = { prep?: number; cook?: number; total?: number };

/** Reads "Préparation : 15 min – Cuisson : 1 h 10" style lines. */
function readTimes(line: string): Times | null {
  const folded = fold(line);
  const times: Times = {};
  const labels: [keyof Times, string[]][] = [
    ["total", TOTAL_LABELS],
    ["prep", PREP_LABELS],
    ["cook", COOK_LABELS],
  ];
  for (const [kind, words] of labels) {
    for (const word of words) {
      const index = folded.search(new RegExp(`(?:^|[^a-z])${word.replace(/ /g, "\\s")}(?![a-z])`));
      if (index < 0) continue;
      const after = folded.slice(index + word.length + 1, index + word.length + 30);
      if (!/^\s*[:=\-–—]?\s*(?:env\.?|ca\.?|about|circa|cerca|omkring)?\s*\d/.test(after)) continue;
      const minutes = durationMinutes(after);
      if (minutes !== null && times[kind] === undefined) times[kind] = minutes;
      break;
    }
  }
  return Object.keys(times).length ? times : null;
}

function readYield(line: string): number | null {
  const folded = fold(line);
  const match = YIELD_BEFORE.exec(folded) ?? YIELD_AFTER.exec(folded);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 99 ? value : null;
}

const METADATA_START = new RegExp(
  `^(?:${[...TOTAL_LABELS, ...PREP_LABELS, ...COOK_LABELS].join("|")}|pour|for|serves|makes|fur|para|per|til|portions?|servings?)\\b`,
);

/**
 * A line that only gives times or servings. Inside the ingredients or the
 * steps, it must start with such a label: "Cook 20 minutes" stays a step.
 */
function isMetadataLine(line: string, inBody = false): boolean {
  if (line.length > (inBody ? 60 : 90)) return false;
  const folded = fold(line);
  if (inBody && !METADATA_START.test(folded)) return false;
  // Inside a section, a time needs "label:" ("Cuisson : 20 min"), so "Cook 2 minutes…" stays a step.
  if (readTimes(line) && (!inBody || /^[^:=]{2,30}[:=]/.test(folded))) return true;
  // "Pour 4 personnes", "Serves 6", "4 portions".
  return (
    readYield(line) !== null &&
    line.length <= 45 &&
    (METADATA_START.test(folded) || new RegExp(`^\\d{1,2}\\s*(?:${YIELD_WORDS})\\s*$`).test(folded))
  );
}

function isNoise(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length < 2 ||
    /^\d{1,3}$/.test(trimmed) || // page numbers
    /^[\W_]+$/.test(trimmed) // decorations
  );
}

function stripStepMarker(line: string): { text: string; marked: boolean } {
  const stepMatch = STEP_MARKER.exec(line);
  // "250 g de farine" is not a step marker; "1. Mix" and "1) Mix" are.
  if (stepMatch && !/^\d+\s*[.,]\d/.test(line)) {
    return { text: line.slice(stepMatch[0].length).trim(), marked: true };
  }
  const bullet = BULLET.exec(line);
  if (bullet) return { text: line.slice(bullet[0].length).trim(), marked: true };
  return { text: line.trim(), marked: false };
}

function startsLowercase(text: string): boolean {
  return /^[a-zà-öø-ÿ]/.test(text);
}

/** Joins "choco-" + "lat" and lines cut in the middle of a sentence. */
function appendContinuation(previous: string, next: string): string {
  if (/[A-Za-zÀ-ÿ]-$/.test(previous) && startsLowercase(next)) {
    return previous.slice(0, -1) + next;
  }
  return `${previous} ${next}`;
}

function startsWithQuantity(text: string): boolean {
  return STARTS_WITH_QUANTITY.test(fold(text));
}

function collectIngredients(lines: string[]): string[] {
  const items: string[] = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const { text, marked } = stripStepMarker(raw);
    if (!text) continue;
    const previous = items[items.length - 1];
    const continues =
      previous !== undefined &&
      !marked &&
      !startsWithQuantity(text) &&
      (startsLowercase(text) || /[,(-]$|\b(?:de|d'|of|von|de la|del|di|af|et|and|und|y|e|og)$/i.test(previous));
    if (continues) items[items.length - 1] = appendContinuation(previous, text);
    else items.push(text);
  }
  return items;
}

function collectSteps(lines: string[]): string[] {
  const steps: string[] = [];
  const numbered =
    lines.filter((line) => (STEP_MARKER.test(line) || STEP_MARKER.test(`${line} `)) && !/^\d+\s*[.,]\d/.test(line)).length >= 2;
  let paragraphBreak = true;
  let markerOnly = false;
  for (const raw of lines) {
    if (!raw.trim()) {
      paragraphBreak = true;
      continue;
    }
    const { text, marked } = stripStepMarker(raw);
    if (!text) {
      markerOnly = marked;
      continue;
    }
    const previous = steps[steps.length - 1];
    let startsNew: boolean;
    if (previous === undefined || markerOnly) startsNew = true;
    else if (numbered) startsNew = marked;
    else
      startsNew =
        marked ||
        (paragraphBreak && SENTENCE_END.test(previous)) ||
        // Without numbers or blank lines, a finished sentence followed by a capital starts a step.
        (!lines.includes("") && /[.!?…]$/.test(previous) && /^[A-ZÀ-Ý]/.test(text));
    if (startsNew) steps.push(text);
    else steps[steps.length - 1] = appendContinuation(previous, text);
    paragraphBreak = false;
    markerOnly = false;
  }
  return steps;
}

function isStepLike(line: string): boolean {
  const { text, marked } = stripStepMarker(line);
  if (STEP_MARKER.test(line) && !/^\d+\s*[.,]\d/.test(line) && !startsWithQuantity(text)) return true;
  return !marked && text.length >= 55 && !startsWithQuantity(text);
}

function isIngredientLike(line: string): boolean {
  const { text } = stripStepMarker(line);
  return (startsWithQuantity(text) || BULLET.test(line) || text.length <= 40) && !/[.!?]$/.test(text);
}

type Section = "intro" | "ingredients" | "steps" | "notes";

/** Builds a recipe from recognized or pasted text. Never invents content. */
export function parseRecipeText(input: string | string[]): ParsedRecipeText {
  const lines = (Array.isArray(input) ? input : input.replace(/\r\n?/g, "\n").split("\n"))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, index, all) => (line ? !isNoise(line) : index > 0 && all[index - 1] !== ""));

  const sections: Record<Section, string[]> = { intro: [], ingredients: [], steps: [], notes: [] };
  let section: Section = "intro";
  let recipeYield: number | null = null;
  const times: Times = {};
  let sawHeading = false;

  for (const line of lines) {
    if (line && matchesHeading(line, INGREDIENT_HEADINGS)) {
      section = "ingredients";
      sawHeading = true;
      recipeYield ??= readYield(line);
      continue;
    }
    if (line && matchesHeading(line, STEP_HEADINGS) && !readTimes(line)) {
      section = "steps";
      sawHeading = true;
      continue;
    }
    if (line && matchesHeading(line, NOTE_HEADINGS)) {
      section = "notes";
      continue;
    }
    if (line && isMetadataLine(line, section !== "intro")) {
      const found = readTimes(line);
      if (found) {
        times.prep ??= found.prep;
        times.cook ??= found.cook;
        times.total ??= found.total;
      }
      recipeYield ??= readYield(line);
      continue;
    }
    sections[section].push(line);
  }

  const intro = sections.intro.filter(Boolean);
  let name = "";
  let introRest: string[] = [];
  const titleIndex = intro.findIndex(
    (line) => line.length >= 3 && line.length <= 90 && !startsWithQuantity(line) && !STEP_MARKER.test(line),
  );
  if (titleIndex >= 0) {
    name = intro[titleIndex].replace(/[:.]$/, "").trim();
    introRest = intro.slice(titleIndex + 1);
  } else {
    introRest = intro;
  }

  let ingredientLines = sections.ingredients;
  let stepLines = sections.steps;
  let descriptionLines = introRest;

  if (!sawHeading || (!ingredientLines.length && !stepLines.length)) {
    // No headings: ingredients are the short or quantified lines before the first step-like line.
    const body = introRest;
    const firstStep = body.findIndex((line) => line && isStepLike(line));
    const before = firstStep >= 0 ? body.slice(0, firstStep) : body;
    const firstIngredient = before.findIndex((line) => line && isIngredientLike(line) && startsWithQuantity(stripStepMarker(line).text));
    if (firstIngredient >= 0) {
      descriptionLines = before.slice(0, firstIngredient);
      ingredientLines = before.slice(firstIngredient);
    } else {
      descriptionLines = before;
      ingredientLines = [];
    }
    stepLines = firstStep >= 0 ? body.slice(firstStep) : [];
  } else if (!ingredientLines.length && stepLines.length) {
    // Only a steps heading: quantified lines just before it are the ingredients.
    const split = introRest.findIndex((line) => line && startsWithQuantity(stripStepMarker(line).text));
    if (split >= 0) {
      descriptionLines = introRest.slice(0, split);
      ingredientLines = introRest.slice(split);
    }
  } else if (ingredientLines.length && !stepLines.length) {
    // Only an ingredients heading: the steps start at the first long sentence or number.
    const firstStep = ingredientLines.findIndex((line) => line && isStepLike(line));
    if (firstStep > 0) {
      stepLines = ingredientLines.slice(firstStep);
      ingredientLines = ingredientLines.slice(0, firstStep);
    }
  }

  const recipeIngredient = collectIngredients(ingredientLines);
  const recipeInstructions = collectSteps(stepLines);
  const description = [...descriptionLines, ...sections.notes]
    .filter(Boolean)
    .reduce<string[]>((paragraphs, line) => {
      const last = paragraphs[paragraphs.length - 1];
      if (last !== undefined && !SENTENCE_END.test(last)) paragraphs[paragraphs.length - 1] = appendContinuation(last, line);
      else paragraphs.push(line);
      return paragraphs;
    }, [])
    .join("\n");

  const recipe = normalizeRecipe({
    ...createEmptyRecipe(),
    name: name || recipeInstructions[0]?.slice(0, 60) || "",
    description,
    recipeYield: recipeYield ?? 1,
    prepTime: times.prep ? toIsoDuration(times.prep) : null,
    cookTime: times.cook ? toIsoDuration(times.cook) : null,
    totalTime: times.total ? toIsoDuration(times.total) : null,
    recipeIngredient,
    recipeInstructions,
  });
  return { recipe, complete: recipeIngredient.length > 0 && recipeInstructions.length > 0 };
}

/**
 * Puts recognized lines back in reading order: pieces of the same row are
 * joined, columns are read one after the other, and a larger vertical gap
 * becomes an empty line (a paragraph break).
 */
export function orderOcrLines(input: OcrLine[]): string[] {
  const lines = input
    .filter((line) => line.text.trim() && line.width > 0 && line.height > 0)
    .map((line) => ({ ...line, text: line.text.trim() }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  // 1. Join pieces of the same row ("200 g" | "farine") when they are close.
  const rows: OcrLine[] = [];
  for (const line of lines) {
    const row = rows.find((candidate) => {
      const overlap =
        Math.min(candidate.y + candidate.height, line.y + line.height) - Math.max(candidate.y, line.y);
      const gap = line.x - (candidate.x + candidate.width);
      return overlap > 0.5 * Math.min(candidate.height, line.height) && gap > -0.01 && gap < 0.08;
    });
    if (row) {
      row.text = `${row.text} ${line.text}`;
      const right = Math.max(row.x + row.width, line.x + line.width);
      row.y = Math.min(row.y, line.y);
      row.height = Math.max(row.height, line.height);
      row.width = right - row.x;
    } else rows.push({ ...line });
  }

  // 2. Group rows into columns by their aligned left edge (a page photographed a
  //    little askew drifts slowly). A row crossing several columns starts a new band.
  type Column = { left: number; right: number; top: number; lastX: number; rows: OcrLine[] };
  const output: string[] = [];
  let columns: Column[] = [];
  const flush = () => {
    // Side-by-side columns are read left to right; a column starting clearly lower comes after.
    columns.sort((a, b) => (Math.abs(a.top - b.top) < 0.06 ? a.left - b.left : a.top - b.top));
    for (const column of columns) {
      if (output.length && output[output.length - 1] !== "") output.push("");
      let previous: OcrLine | null = null;
      for (const row of column.rows) {
        if (previous && row.y - (previous.y + previous.height) > 0.9 * Math.max(previous.height, row.height)) {
          output.push("");
        }
        output.push(row.text);
        previous = row;
      }
    }
    columns = [];
  };
  for (const row of rows.sort((a, b) => a.y - b.y || a.x - b.x)) {
    // Compare with each column's latest row: a wide title above must not glue two columns together.
    const crossed = columns.filter((column) => {
      const last = column.rows[column.rows.length - 1];
      const overlap = Math.min(last.x + last.width, row.x + row.width) - Math.max(last.x, row.x);
      return overlap > 0.3 * Math.min(last.width, row.width);
    });
    if (row.width > 0.6) {
      // A full-width row (title, intro) is a band of its own.
      flush();
      columns.push({ left: row.x, right: row.x + row.width, top: row.y, lastX: row.x, rows: [row] });
      flush();
      continue;
    }
    if (crossed.length >= 2) flush();
    const column = columns
      .filter((candidate) => Math.abs(candidate.lastX - row.x) < 0.05)
      .sort((a, b) => Math.abs(a.lastX - row.x) - Math.abs(b.lastX - row.x))[0];
    if (column) {
      column.rows.push(row);
      column.left = Math.min(column.left, row.x);
      column.right = Math.max(column.right, row.x + row.width);
      column.lastX = row.x;
    } else {
      columns.push({ left: row.x, right: row.x + row.width, top: row.y, lastX: row.x, rows: [row] });
    }
  }
  flush();
  while (output[0] === "") output.shift();
  return output;
}

/** Shape returned by on-device AI models, checked before use. */
export type StructuredRecipe = {
  name?: unknown;
  description?: unknown;
  servings?: unknown;
  prepMinutes?: unknown;
  cookMinutes?: unknown;
  ingredients?: unknown;
  steps?: unknown;
};

function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .map((item) => stripStepMarker(item).text)
    .filter((item) => item.length > 0 && item.length <= 2000)
    .slice(0, max);
}

/** Converts an on-device AI answer into a recipe, or null if it is not usable. */
export function recipeFromStructured(data: StructuredRecipe | null | undefined): Recipe | null {
  if (!data || typeof data !== "object") return null;
  const recipeIngredient = cleanList(data.ingredients, 80);
  const recipeInstructions = cleanList(data.steps, 60);
  if (!recipeIngredient.length || !recipeInstructions.length) return null;
  const minutes = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? toIsoDuration(Math.round(value)) : null;
  const servings =
    typeof data.servings === "number" && Number.isInteger(data.servings) && data.servings >= 1 && data.servings <= 99
      ? data.servings
      : 1;
  return normalizeRecipe({
    ...createEmptyRecipe(),
    name: typeof data.name === "string" ? data.name.trim().slice(0, 200) : "",
    description: typeof data.description === "string" ? data.description.trim().slice(0, 3000) : "",
    recipeYield: servings,
    prepTime: minutes(data.prepMinutes),
    cookTime: minutes(data.cookMinutes),
    recipeIngredient,
    recipeInstructions,
  });
}
