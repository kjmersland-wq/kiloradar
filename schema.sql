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
