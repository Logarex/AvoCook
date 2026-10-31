import { localDate, shiftDate, type StockItem } from "./kitchen";
import type { StockReminder } from "./kitchenNative";
export function stockReminderPlan(
  stock: StockItem[],
  now: Date,
  title: string,
  body: (names: string) => string,
): StockReminder[] {
  const groups = new Map<string, { date: string; names: string[] }>();
  for (const item of stock) {
    if (!item.expires) continue;
    // Never silently drop products added after the normal J-2 reminder.
    if (item.expires < localDate(now)) continue;
    let reminder = new Date(`${shiftDate(item.expires, -2)}T09:00:00`);
    if (reminder.getTime() <= now.getTime()) {
      reminder = new Date(now);
      reminder.setHours(9, 0, 0, 0);
      if (reminder.getTime() <= now.getTime()) reminder.setDate(reminder.getDate() + 1);
      if (localDate(reminder) > item.expires) reminder = new Date(now.getTime() + 60000);
    }
    const date = reminder.toISOString();
    const id = shiftDate(item.expires, -2);
    const group = groups.get(id) ?? { date, names: [] };
    group.names.push(item.name);
    groups.set(id, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 20)
    .map(([id, { date, names }]) => ({
      id,
      title,
      body: body([...new Set(names)].join(", ")),
      date: new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z"),
    }));
}
