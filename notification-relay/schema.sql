CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  added TEXT NOT NULL,
  removed TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS subscriptions_code ON subscriptions(code, expires_at);
CREATE INDEX IF NOT EXISTS subscriptions_expiry ON subscriptions(expires_at);
CREATE TABLE IF NOT EXISTS list_state (
  code TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  item_ids TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  token TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  ticket_id TEXT,
  receipt_checked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS deliveries_pending ON deliveries(sent_at, next_attempt_at);
CREATE INDEX IF NOT EXISTS deliveries_receipts ON deliveries(receipt_checked, sent_at);
CREATE INDEX IF NOT EXISTS deliveries_age ON deliveries(created_at);
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
