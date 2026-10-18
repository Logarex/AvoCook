const themes = [
  "onePot",
  "soups",
  "pulses",
  "seasonal",
  "salads",
  "picnic",
  "noCook",
  "tomatoes",
  "lunchbox",
  "squash",
  "budget",
  "celebration",
] as const;
export function monthlyChallenge(date = new Date()) {
  const id = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return { id, marker: `[AvoCook-${id}]`, theme: themes[date.getMonth()] };
}
export function challengeDescription(description: string, marker: string) {
  const text = description.trim();
  return text.includes(marker) ? text : `${text}${text ? "\n\n" : ""}${marker}`;
}
