import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInstance } from "i18next";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import en from "../i18n/locales/en";
import fr from "../i18n/locales/fr";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";
import { SUPPORTED_LANGUAGES, resolveAppLanguage } from "../i18n/languages";
import { RELEASE_NOTE_KEYS } from "../features/updates/releaseNotes";
import { APP_VERSION } from "../version";

function flatten(object: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(object).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? Object.entries(flatten(value as Record<string, unknown>, path))
      : [[path, value as string]];
  }));
}

const resources = { en, fr, de, es, it: itLocale, da };
const reference = flatten(en.translation);
const variables = (value: string) => [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1]).sort();
const sourceRoot = fileURLToPath(new URL("../", import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.name === "__tests__") return [];
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe("translations before release", () => {
  it("keeps app, package, lockfile and website versions aligned", () => {
    const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
    expect(readJson("../../app.json").expo.version).toBe(APP_VERSION);
    const lockfile = readJson("../../package-lock.json");
    expect(lockfile.version).toBe(APP_VERSION);
    expect(lockfile.packages[""].version).toBe(APP_VERSION);
    expect(readFileSync(new URL("../../site/index.html", import.meta.url), "utf8"))
      .toContain(`class="hero-badge-pill">v${APP_VERSION}</span>`);
  });

  it.each(Object.entries(resources))("renders the current release and every release note in %s", async (language, resource) => {
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: resource }, interpolation: { escapeValue: false } });
    const subtitle = i18n.t("update.subtitle", { version: APP_VERSION });
    expect(subtitle).toContain(`v${APP_VERSION}`);
    expect(subtitle).not.toContain("{{");
    for (const key of RELEASE_NOTE_KEYS) {
      for (const suffix of ["Title", "Body"]) {
        const translationKey = `update.${key}${suffix}`;
        expect(i18n.exists(translationKey), `${language}:${translationKey}`).toBe(true);
        expect(i18n.t(translationKey).trim(), `${language}:${translationKey}`).not.toBe("");
      }
    }
  });

  it("includes every supported app and native permission language", () => {
    const config = JSON.parse(readFileSync(new URL("../../app.json", import.meta.url), "utf8")).expo;
    const expected = SUPPORTED_LANGUAGES.map(({ value }) => value).sort();
    expect(Object.keys(resources).sort()).toEqual(expected);
    expect(Object.keys(config.locales).sort()).toEqual(expected);
    const nativeKeys = Object.keys(JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8"))).sort();
    for (const language of expected) {
      const permissions = JSON.parse(readFileSync(new URL(`../../locales/${language}.json`, import.meta.url), "utf8"));
      expect(Object.keys(permissions).sort(), language).toEqual(nativeKeys);
      for (const value of Object.values(permissions)) expect(String(value).trim(), language).not.toBe("");
    }
  });

  it.each(Object.entries(resources))("preserves all keys, text and interpolation variables in %s", (language, resource) => {
    const locale = flatten(resource.translation);
    expect(Object.keys(locale).sort()).toEqual(Object.keys(reference).sort());
    for (const [key, value] of Object.entries(locale)) {
      expect(typeof value, `${language}:${key}`).toBe("string");
      // Empty placeholders intentionally leave room for the user's own text.
      if (!["editor.ingredientPlaceholder", "editor.instructionPlaceholder"].includes(key)) {
        expect(value.trim(), `${language}:${key}`).not.toBe("");
      }
      expect(variables(value), `${language}:${key}`).toEqual(variables(reference[key]));
      expect(value, `${language}:${key}`).not.toMatch(/\uFFFD|\{\{[^}]*$/);
    }
  });

  it("defines every literal translation key used by the app, even when a fallback is provided", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(sourceRoot)) {
      const text = readFileSync(file, "utf8");
      if (!/\bt\s*\(/.test(text)) continue;
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && (
          (ts.isIdentifier(node.expression) && node.expression.text === "t") ||
          (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "t")
        )) {
          const key = node.arguments[0];
          if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) && !(key.text in reference)) {
            missing.push(`${file.slice(sourceRoot.length)}:${source.getLineAndCharacterOfPosition(key.getStart()).line + 1}: ${key.text}`);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(missing).toEqual([]);
  }, 20000);

  it.each(Object.entries(resources))("renders singular and plural counts in %s", async (language, resource) => {
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: resource }, interpolation: { escapeValue: false } });
    const locale = flatten(resource.translation);
    for (const key of Object.keys(reference).filter((key) => key.endsWith("_one"))) {
      const base = key.slice(0, -4);
      expect(locale[`${base}_other`], `${language}:${base}`).toBeTypeOf("string");
      for (const count of [0, 1, 2, 5, 21]) {
        const translated = i18n.t(base, { count });
        const suffix = new Intl.PluralRules(language).select(count);
        const expected = (count === 0 ? locale[`${base}_zero`] : undefined) ?? locale[`${base}_${suffix}`] ?? locale[`${base}_other`];
        expect(translated).toBe(expected.replace(/\{\{count\}\}/g, String(count)));
        expect(translated).not.toContain("{{");
      }
    }
  });

  it.each([["fr-FR", "fr"], ["de_AT", "de"], [" DA-dk ", "da"], ["zh", "en"], [null, "en"]])("resolves device language %s to %s", (input, expected) => {
    expect(resolveAppLanguage(input)).toBe(expected);
  });
});
