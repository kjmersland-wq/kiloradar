-- KiloRadar (kiloradar.com) — Cloudflare D1 SQLite Schema
-- Developed and operated by KM TECH LABS

-- 1. Products Catalog Table
CREATE TABLE IF NOT EXISTS products (
    ean TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'no',
    image_url TEXT,
    last_checked TEXT,                 -- date the product was last checked against a source
    match_confidence REAL,             -- 0..1 agreement between our data and the source
    verification TEXT NOT NULL DEFAULT 'unverified', -- verified | partial | mismatch | unverified
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Historical Weight & Price Tracking Table
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL REFERENCES products(ean) ON DELETE CASCADE,
    weight_grams REAL NOT NULL,
    measure_unit TEXT NOT NULL DEFAULT 'g',
    price REAL NOT NULL,
    unit_price REAL NOT NULL,
    store_name TEXT,
    source TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_history_ean_date ON price_history(ean, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_country ON products(country_code);

-- 3. Community Shrinkflation Reports Table (/api/report)
CREATE TABLE IF NOT EXISTS shrink_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL,
    product_name TEXT,
    country_code TEXT NOT NULL DEFAULT 'no',
    old_weight TEXT NOT NULL,
    new_weight TEXT NOT NULL,
    old_price REAL,
    new_price REAL,
    store_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Documented sources per product (transparency: where does this data come from?)
CREATE TABLE IF NOT EXISTS product_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL REFERENCES products(ean) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    source_url TEXT,
    checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_product_sources_ean ON product_sources(ean);

-- 5. Shrink events (pack got smaller), derived from size history
CREATE TABLE IF NOT EXISTS shrink_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean TEXT NOT NULL REFERENCES products(ean) ON DELETE CASCADE,
    event_date TEXT,
    old_measure TEXT NOT NULL,
    new_measure TEXT NOT NULL,
    shrink_index REAL
);
CREATE INDEX IF NOT EXISTS idx_shrink_events_ean ON shrink_events(ean);
