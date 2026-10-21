import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = readFileSync(resolve(root, "site/main.js"), "utf8");
const html = readFileSync(resolve(root, "site/index.html"), "utf8");
const translations = runInNewContext(`${source.split("function readPreference")[0]}; translations`) as Record<string, Record<string, string>>;

function browser(options: { search?: string; storageBlocked?: boolean } = {}) {
  const stored = new Map<string, string>();
  const makeElement = (attributes: Record<string, string> = {}) => ({
    attributes,
    textContent: "",
    innerHTML: "",
    alt: "",
    href: "",
    src: "",
    style: { display: "" },
    nextElementSibling: { style: { display: "none" } },
    onload: (() => {}) as () => void,
    onerror: (() => {}) as () => void,
    getAttribute(key: string) { return this.attributes[key]; },
    setAttribute(key: string, value: string) { this.attributes[key] = value; },
    classList: { toggle() {} },
  });
  const text = makeElement({ "data-i18n": "feat_6_name" });
  const richText = makeElement({ "data-i18n-html": "hero_title" });
  const image = makeElement({ "data-i18n-img": "screenshots/{lang}/recipe.png", "data-i18n-alt": "ph_detail" });
  const privacy = makeElement();
  const buttons = Object.keys(translations).map(lang => makeElement({ "data-lang": lang }));
  const elements = new Map<string, ReturnType<typeof makeElement>>();
  const document = {
    title: "",
    documentElement: { lang: "", setAttribute() {} },
    addEventListener() {},
    getElementById(key: string) {
      if (!elements.has(key)) elements.set(key, makeElement());
      return elements.get(key)!;
    },
    querySelector(key: string) { return this.getElementById(key); },
    querySelectorAll(key: string) {
      return ({ "[data-i18n]": [text], "[data-i18n-html]": [richText], "[data-i18n-img]": [image], "[data-i18n-alt]": [image], "[data-privacy-link]": [privacy], ".lang-btn": buttons } as Record<string, ReturnType<typeof makeElement>[]>)[key] ?? [];
    },
  };
  const context = {
    document,
    URLSearchParams,
    navigator: { language: "en-GB" },
    window: { location: { search: options.search ?? "" }, matchMedia: () => ({ matches: false }) },
    localStorage: {
      getItem(key: string) {
        if (options.storageBlocked) throw new Error("Storage unavailable");
        return stored.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (options.storageBlocked) throw new Error("Storage unavailable");
        stored.set(key, value);
      },
    },
  };
  runInNewContext(source, context);
  return { context, document, text, image, privacy, buttons, stored, elements, run: (code: string) => runInNewContext(code, context) };
}

describe("public website and documentation", () => {
  it("translates every visible website key in every app language", () => {
    expect(Object.keys(translations).sort()).toEqual(SUPPORTED_LANGUAGES.map(language => language.value).sort());
    const reference = Object.keys(translations.en).sort();
    const used = [...html.matchAll(/data-i18n(?:-html|-alt)?="([^"]+)"/g)].map(match => match[1]);
    for (const [lang, strings] of Object.entries(translations)) {
      expect(Object.keys(strings).sort(), lang).toEqual(reference);
      for (const key of used) expect(strings[key]?.trim(), `${lang}:${key}`).toBeTruthy();
    }
  });

  it.each(SUPPORTED_LANGUAGES.map(language => language.value))("applies %s to content, metadata, controls and privacy links", lang => {
    const page = browser({ storageBlocked: true });
    page.run(`applyLanguage(${JSON.stringify(lang)})`);
    const strings = translations[lang];
    expect(page.document.documentElement.lang).toBe(lang);
    expect(page.document.title).toBe(strings.meta_title);
    expect(page.text.textContent).toBe(strings.feat_6_name);
    expect(page.image.alt).toBe(strings.ph_detail);
    expect(page.elements.get('meta[name="description"]')?.attributes.content).toBe(strings.meta_description);
    expect(page.elements.get("theme-toggle")?.attributes["aria-label"]).toBe(strings.theme_label);
    expect(page.buttons.filter(button => button.attributes["aria-pressed"] === "true").map(button => button.attributes["data-lang"])).toEqual([lang]);
    const privacyPath = lang === "en" ? "PRIVACY.md" : `docs/${lang}/PRIVACY.md`;
    expect(page.privacy.href).toBe(`https://github.com/Logarex/AvoCook/blob/main/${privacyPath}`);
    expect(existsSync(resolve(root, privacyPath))).toBe(true);
    expect(existsSync(resolve(root, "assets", page.image.src))).toBe(true);
  });

  it("recovers hidden screenshots on a language change and uses bundled English images for Danish", () => {
    const page = browser();
    page.run('applyLanguage("fr")');
    page.image.onerror();
    expect(page.image.style.display).toBe("none");
    page.run('applyLanguage("da")');
    expect(page.image.src).toBe("screenshots/en/recipe.png");
    page.image.onload();
    expect(page.image.style.display).toBe("");
    expect(page.image.nextElementSibling.style.display).toBe("none");
    for (const language of Object.keys(translations)) {
      for (const [, template] of html.matchAll(/data-i18n-img="([^"]+)"/g)) {
        const path = template.replace("{lang}", language === "da" ? "en" : language);
        expect(existsSync(resolve(root, "assets", path)), `${language}:${path}`).toBe(true);
      }
    }
  });

  it("ignores invalid language/theme preferences and works when storage is blocked", () => {
    const page = browser({ search: "?lang=constructor", storageBlocked: true });
    expect(page.run("detectLanguage()")).toBe("en");
    expect(() => page.run('applyLanguage(detectLanguage()); initTheme()')).not.toThrow();
    const valid = browser({ search: "?lang=de" });
    valid.stored.set("avocook-lang", "fr");
    expect(valid.run("detectLanguage()")).toBe("de");
    expect(() => valid.run('applyLanguage("__proto__")')).not.toThrow();
  });

  it("keeps local README links and screenshot paths valid in all six languages", () => {
    for (const lang of Object.keys(translations)) {
      const path = resolve(root, lang === "en" ? "README.md" : `docs/${lang}/README.md`);
      const markdown = readFileSync(path, "utf8");
      const links = [...markdown.matchAll(/\]\(([^)]+)\)|<img[^>]+src="([^"]+)"/g)];
      for (const link of links) {
        const target = link[1] ?? link[2];
        if (/^(?:https?:|#|mailto:)/.test(target)) continue;
        expect(existsSync(resolve(dirname(path), target)), `${lang}:${target}`).toBe(true);
      }
      for (const guide of ["LOCAL_KITCHEN.md", "SEASONAL_CATALOG.md", "NEXTCLOUD_PANTRY.md"]) expect(markdown, lang).toContain(guide);
    }
  });
});
