export const BAD_WORDS = [
  "sex", "drug", "drugs", "pussy", "dick", "cock", "cunt", "fuck", "bitch", "shit", "whore", "slut", "porn",
  "sexe", "drogue", "drogues", "chatte", "bite", "salope", "pute", "connard", "connasse", "couille", "baise", "viol", "meurtre",
  "sexo", "droga", "drogas", "coño", "polla", "puta", "zorra", "mierda", "joder", "cabrón", "cabron", "violación", "violacion",
  "sesso", "droga", "droghe", "cazzo", "figa", "troia", "puttana", "merda", "stronzo", "stupro",
  "droge", "drogen", "fotze", "schlampe", "hure", "scheiße", "scheisse", "ficken", "vergewaltigung",
  "narko", "stoffer", "fisse", "pik", "luder", "lort", "kneppe", "voldtægt"
];

const profanityRegex = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "i");

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  return profanityRegex.test(text);
}
