import i18n from "../i18n";

const unicodeFractions: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875
};

const unicodeFractionPattern = /(?:(\d+)[ \t]*)?([¼½¾⅓⅔⅛⅜⅝⅞])/g;

export function scaleIngredientLine(ingredient: string, factor: number) {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) {
    return ingredient;
  }

  const placeholders: { token: string; value: string }[] = [];
  const protectText = (value: string) => {
    const token = String.fromCharCode(0xe000 + placeholders.length);
    placeholders.push({
      token,
      value
    });
    return token;
  };
  const protect = (quantity: number) => protectText(formatScaledQuantity(quantity * factor));
  const protectedMarkdown = ingredient
    .replace(/(`+)[\s\S]*?\1/g, (code) => protectText(code))
    .replace(/\]\(([^\n]*?)\)/g, (_, destination: string) => `](${protectText(destination)})`)
    .replace(/<https?:\/\/[^>]+>/g, (url) => protectText(url))
    .replace(/https?:\/\/[^\s<>]+/g, (url) => protectText(url))
    .replace(/^\s{0,3}\[[^\]]+\]:[^\n]+/gm, (reference) => protectText(reference))
    .replace(/^(\s*)(\d+)([.)]\s+)/gm, (_, space: string, number: string, marker: string) => `${space}${protectText(number)}${marker}`)
    .replace(/\b\d+(?:[,.]\d+)?\s*%/g, (percentage) => protectText(percentage));

  const withMixedFractions = protectedMarkdown.replace(
    /\b(\d+)\s+(\d+)\/(\d+)\b/g,
    (_, whole: string, numerator: string, denominator: string) => {
      const parsed =
        Number(whole) + Number(numerator) / Math.max(1, Number(denominator));
      return protect(parsed);
    }
  );

  const withAsciiFractions = withMixedFractions.replace(
    /\b(\d+)\/(\d+)\b/g,
    (_, numerator: string, denominator: string) =>
      protect(Number(numerator) / Math.max(1, Number(denominator)))
  );

  const withUnicodeFractions = withAsciiFractions.replace(
    unicodeFractionPattern,
    (_, whole: string | undefined, fraction: string) =>
      protect(Number(whole ?? 0) + (unicodeFractions[fraction] ?? 0))
  );

  const withNumbers = withUnicodeFractions.replace(
    /\b(\d+(?:[,.]\d+)?)(?=\s*[a-zA-ZÀ-ÿ%]|\b)/g,
    (match) => protect(Number(match.replace(",", ".")))
  );

  return placeholders.reduce(
    (line, placeholder) => line.replace(placeholder.token, placeholder.value),
    withNumbers
  );
}

function formatScaledQuantity(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(rounded);
}
