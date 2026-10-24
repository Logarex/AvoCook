import { normalizeFood, parseIngredient, type StockItem } from "./kitchen";
export const stockLocations = ["fridge", "cupboard", "freezer"] as const;
export type StockFilter = StockItem["location"] | "all";
export function stockDuplicates(items: StockItem[], item: Pick<StockItem, "name" | "barcode"> & { id?: string }) {
  const key = parseIngredient(item.name).key;
  return items.filter((other) => other.id !== item.id && (
    item.barcode && other.barcode ? item.barcode === other.barcode : !!key && parseIngredient(other.name).key === key
  ));
}
export function stockGroups(items: StockItem[], query: string, location: StockFilter, language: string) {
  const search = normalizeFood(query);
  const compareNames = new Intl.Collator(language).compare;
  return stockLocations
    .filter((key) => location === "all" || key === location)
    .map((key) => ({
      location: key,
      items: items.filter((item) => item.location === key && normalizeFood(item.name).includes(search))
        .sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999") || compareNames(a.name, b.name)),
    })).filter((group) => group.items.length > 0);
}
