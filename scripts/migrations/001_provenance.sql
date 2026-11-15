-- Migration 001: provenance, sources and shrink events.
-- Run once against an existing D1 database created from the older schema.sql:
--   wrangler d1 execute <DB_NAME> --remote --file=scripts/migrations/001_provenance.sql
-- (Fresh databases created from schema.sql already include these changes.)

ALTER TABLE products ADD COLUMN last_checked TEXT;
ALTER TABLE products ADD COLUMN match_confidence REAL;
ALTER TABLE products ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE price_history ADD COLUMN source TEXT;

CREATE TABLE IF NOT EXISTS product_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL REFERENCES products(ean) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    source_url TEXT,
    checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_product_sources_ean ON product_sources(ean);

CREATE TABLE IF NOT EXISTS shrink_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL REFERENCES products(ean) ON DELETE CASCADE,
    event_date TEXT,
    old_measure TEXT NOT NULL,
    new_measure TEXT NOT NULL,
    shrink_index REAL
);
CREATE INDEX IF NOT EXISTS idx_shrink_events_ean ON shrink_events(ean);
