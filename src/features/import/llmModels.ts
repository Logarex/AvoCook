/**
 * Picks the model AvoCook uses when the user leaves the choice on "Automatic",
 * from the provider's own list of models. Providers release and retire models
 * every few months: these rules look at name patterns and version numbers
 * rather than fixed IDs, so a newer model is picked up without an app update.
 */

export type ModelInfo = {
  id: string;
  /** Known only for providers that publish capabilities (Anthropic). */
  supportsImages?: boolean;
  /** Set when the provider announces a retirement date. */
  retiring?: boolean;
};

/** Models that cannot answer a chat request with text (audio, images, search, embeddings…). */
const NOT_CHAT =
  /embed|whisper|tts|transcri|speech|audio|realtime|dall-e|(^|[-/_.])image([-_.]|$)|imagen|imagine|veo|video|moderation|guard|search|computer-use|codex|davinci|babbage|rerank|ocr|aqa|learnlm|gemma|multi-agent|safety|prompt-guard|tool-use|deep-research|-live|-native-audio/i;
/** Dated snapshots and previews: the plain or "-latest" names are the stable ones. */
const SNAPSHOT = /-\d{4}(?:-\d{2}-\d{2})?(?:[-_]|$)|\d{8}|preview|experimental|-exp\b|-exp-|beta|alpha/i;
/** Small, fast and cheap tiers, best for reading a recipe. */
const LIGHT_TIERS = ["mini", "luna", "flash", "haiku", "small", "lite", "fast"];

/** Version numbers found in an ID, e.g. "gpt-6.1-mini" → [6, 1], "claude-haiku-5-5" → [5, 5]. */
export function modelVersion(id: string): number[] {
  return (id.match(/\d+(?:\.\d+)*/g) ?? [])
    .flatMap((part) => part.split("."))
    .map(Number)
    .filter((value) => Number.isFinite(value) && value < 1000);
}

function compareVersions(a: number[], b: number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? -1) - (b[index] ?? -1);
    if (difference) return difference;
  }
  return 0;
}

function isChatModel(id: string) {
  return !NOT_CHAT.test(id);
}

/** Newest first; at equal versions, the shorter (plainer) name wins. */
function newest(ids: string[]): string[] {
  return [...ids].sort((a, b) => compareVersions(modelVersion(b), modelVersion(a)) || a.length - b.length);
}

/** The newest light model of a family, or the newest model of the family. */
function newestLight(ids: string[], family: RegExp): string | undefined {
  const members = ids.filter((id) => family.test(id) && isChatModel(id) && !SNAPSHOT.test(id));
  const light = members.filter((id) => LIGHT_TIERS.some((tier) => new RegExp(`(^|[-/_.])${tier}([-_.]|$)`, "i").test(id)));
  // A light tier must not stay behind for ever: when the newest light model is
  // two generations older than the newest model, the newest model is used.
  const bestLight = newest(light)[0];
  const best = newest(members.filter((id) => !/(^|[-/_.])(pro|max|ultra|opus|large|heavy|reasoning)([-_.]|$)/i.test(id)))[0] ?? newest(members)[0];
  if (bestLight && best && (modelVersion(best)[0] ?? 0) - (modelVersion(bestLight)[0] ?? 0) >= 2) return best;
  return bestLight ?? best;
}

/** Picks the recommended model from the provider's list, or undefined when none fits. */
export function pickRecommendedModel(providerId: string, models: ModelInfo[]): string | undefined {
  const usable = models
    .map((model) => ({ ...model, id: model.id.replace(/^models\//, "") }))
    .filter((model) => model.id && !model.retiring && model.supportsImages !== false);
  const ids = usable.map((model) => model.id);
  switch (providerId) {
    case "claude":
      // Anthropic lists the newest models first and publishes capabilities.
      return (
        usable.find((model) => /haiku/i.test(model.id) && !SNAPSHOT.test(model.id))?.id ??
        usable.find((model) => /haiku/i.test(model.id))?.id ??
        usable.find((model) => /sonnet/i.test(model.id))?.id ??
        usable[0]?.id
      );
    case "gemini":
      // Google keeps "gemini-flash-latest" pointing at its current Flash model.
      return ids.find((id) => id === "gemini-flash-latest") ?? newestLight(ids.filter((id) => !/lite/i.test(id)), /^gemini-/i);
    case "openai":
      return newestLight(ids.filter((id) => !/chat-latest|instruct|^o\d/i.test(id)), /^gpt-\d/i);
    case "grok":
      return ids.find((id) => /^grok-[\d.]+-latest$/i.test(id) && !NOT_CHAT.test(id)) ?? newestLight(ids, /^grok-\d/i);
    case "mistral":
      return (
        ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest", "pixtral-large-latest"].find((id) =>
          ids.includes(id),
        ) ?? newestLight(ids, /^(mistral|pixtral|ministral)-/i)
      );
    case "groq":
      // Groq hosts many open models; those known to read images come first.
      return (
        newest(ids.filter((id) => isChatModel(id) && /scout|maverick|vision|(^|[-/])vl([-_.]|$)|muse|qwen3/i.test(id)))[0] ??
        newest(ids.filter(isChatModel))[0]
      );
    default:
      return ids.find(isChatModel);
  }
}

/**
 * Defaults that earlier versions stored in the settings. A user who never
 * changed them gets the automatic choice instead of a model that may be retired.
 */
const LEGACY_DEFAULTS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
  groq: ["meta-llama/llama-4-scout-17b-16e-instruct"],
  grok: ["grok-3", "grok-2-vision-1212"],
  mistral: ["mistral-small-latest"],
  claude: ["claude-haiku-4-5", "claude-3-5-haiku-latest"],
};

export function isLegacyDefaultModel(providerId: string, model: string): boolean {
  return LEGACY_DEFAULTS[providerId]?.includes(model.trim()) ?? false;
}
