import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("schema.sql", import.meta.url), "utf8"));
  const prepare = (sql, values = []) => ({
    sql, values,
    bind: (...next) => prepare(sql, next),
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...values) }; },
    async run() { return { meta: { changes: sqlite.prepare(sql).run(...values).changes } }; },
  });
  return {
    sqlite, prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((statement) => ({ meta: { changes: sqlite.prepare(statement.sql).run(...statement.values).changes } }));
        sqlite.exec("COMMIT"); return result;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
}

export function document(ids, timestamp = new Date().toISOString(), actor = "sender") {
  return {
    name: "projects/avocook-5eb31/databases/(default)/documents/sharedLists/ABC234",
    updateTime: timestamp,
    fields: {
      items: { arrayValue: { values: ids.map((id) => ({ mapValue: { fields: { id: { stringValue: id } } } })) } },
      lastUpdatedBy: { stringValue: actor }, updatedAt: { timestampValue: timestamp },
    },
  };
}
export async function subscribe(DB, device = "receiver", code = "ABC234", now = Date.now()) {
  await DB.prepare("INSERT OR REPLACE INTO subscriptions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(`user:${device}`, "user", device, code, `ExpoPushToken[${device}]`, "Courses", "{count} ajouts", "{count} suppressions", now + 86400000).run();
}
