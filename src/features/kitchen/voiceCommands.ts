import { normalizeFood } from "./kitchen";
export type CookingCommand =
  | "next"
  | "previous"
  | "ingredients"
  | "timer"
  | "stop";
const commands: Record<CookingCommand, string[]> = {
  next: [
    "suivant",
    "etape suivante",
    "next",
    "next step",
    "weiter",
    "nachster schritt",
    "siguiente",
    "paso siguiente",
    "avanti",
    "passaggio successivo",
    "naeste",
    "naeste trin",
  ],
  previous: [
    "precedent",
    "etape precedente",
    "previous",
    "previous step",
    "zuruck",
    "vorheriger schritt",
    "anterior",
    "paso anterior",
    "indietro",
    "passaggio precedente",
    "forrige",
    "forrige trin",
  ],
  ingredients: [
    "ingredients",
    "show ingredients",
    "zutaten",
    "ingredientes",
    "ingredienti",
    "ingredienser",
  ],
  timer: [
    "minuteur",
    "demarrer le minuteur",
    "timer",
    "start timer",
    "timer starten",
    "temporizador",
    "avvia timer",
    "start ur",
  ],
  stop: [
    "arreter l ecoute",
    "stop listening",
    "zuhoren beenden",
    "dejar de escuchar",
    "interrompi ascolto",
    "stop med at lytte",
  ],
};
export function cookingCommand(text: string): CookingCommand | null {
  const normalized = normalizeFood(text).replace(/[.!?,;:]+$/g, "");
  return (
    (Object.keys(commands) as CookingCommand[]).find((command) =>
      commands[command].includes(normalized),
    ) ?? null
  );
}
