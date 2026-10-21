import catalog from "./seasonalCatalog.json";
export const SEASONAL_AREA_IDS = [
  "FR",
  "BE-WAL",
  "CH",
  "DE",
  "ES",
  "IT",
  "GB",
  "DK",
  "CA-ON",
  "US-NY",
  "AU-SYD",
] as const;
export type SeasonalAreaId = (typeof SEASONAL_AREA_IDS)[number];
export function isSeasonalArea(value: unknown): value is SeasonalAreaId {
  return (
    typeof value === "string" &&
    (SEASONAL_AREA_IDS as readonly string[]).includes(value)
  );
}
export type SeasonalArea = {
  id: string;
  country: string;
  source: string;
  sourceUrl: string;
  reviewed: string;
  basis: string;
  entries: {
    food: string;
    months: number[];
    storageMonths?: number[];
  }[];
  additionalSources?: string[];
};
export const seasonalAreas: SeasonalArea[] = catalog.areas;
export function seasonalArea(value: string | undefined) {
  return seasonalAreas.find((area) => area.id === value);
}
