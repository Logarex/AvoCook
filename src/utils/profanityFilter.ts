export const BAD_WORDS = [
  // English
  "sex", "drug", "drugs", "pussy", "dick", "cock", "cunt", "fuck", "bitch", "shit", "whore", "slut", "porn",
  // French
  "sexe", "drogue", "drogues", "chatte", "bite", "salope", "pute", "connard", "connasse", "couille", "baise", "viol", "meurtre",
  // Spanish
  "sexo", "droga", "drogas", "coño", "polla", "puta", "zorra", "mierda", "joder", "cabrón", "cabron", "violación", "violacion",
  // Italian
  "sesso", "droga", "droghe", "cazzo", "figa", "troia", "puttana", "merda", "stronzo", "stupro",
  // German
  "droge", "drogen", "fotze", "schlampe", "hure", "scheiße", "scheisse", "ficken", "vergewaltigung",
  // Danish
  "narko", "stoffer", "fisse", "pik", "luder", "lort", "kneppe", "voldtægt"
];

const profanityRegex = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "i");

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  return profanityRegex.test(text);
}
