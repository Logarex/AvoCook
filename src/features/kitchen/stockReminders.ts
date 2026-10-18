import { localDate, shiftDate, type StockItem } from "./kitchen";
import type { StockReminder } from "./kitchenNative";
export function stockReminderPlan(
  stock: StockItem[],
  now: Date,
  title: string,
  body: (names: string) => string,
): StockReminder[] {
  const groups = new Map<string, string[]>();
  for (const item of stock) {
    if (!item.expires) continue;
    const date = `${shiftDate(item.expires, -2)}T09:00:00`;
    if (new Date(date).getTime() <= now.getTime()) continue;
    const names = groups.get(date) ?? [];
    names.push(item.name);
    groups.set(date, names);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 20)
    .map(([date, names]) => ({
      id: localDate(new Date(date)),
      title,
      body: body([...new Set(names)].join(", ")),
      date: new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z"),
    }));
}
