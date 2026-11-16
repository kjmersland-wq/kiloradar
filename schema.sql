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

-- 6. Discovered catalog (real Open Food Facts products; prices are not tracked yet)
CREATE TABLE IF NOT EXISTS catalog_products (
    market TEXT NOT NULL,
    ean TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    measure TEXT NOT NULL,
    image_url TEXT,
    source_name TEXT,
    source_url TEXT,
    last_checked TEXT,
    verification TEXT NOT NULL DEFAULT 'unverified',
    match_confidence REAL,
    price REAL,                -- crowdsourced price from Open Prices (ODbL), NULL = "Pris kommer"
    price_currency TEXT,
    price_date TEXT,
    price_store TEXT,
    price_source TEXT,
    price_url TEXT,
    unit_price REAL,           -- price per kg / l / piece
    unit_label TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (market, ean)
);
CREATE INDEX IF NOT EXISTS idx_catalog_market ON catalog_products(market);

CREATE TABLE IF NOT EXISTS catalog_size_history (
    market TEXT NOT NULL,
    ean TEXT NOT NULL,
    recorded_on TEXT NOT NULL,
    measure TEXT NOT NULL,
    PRIMARY KEY (market, ean, recorded_on)
);
-- User-submitted prices (no login). Shown on product cards as "brukerinnsendt" with store and date.
-- ip_hash is a salted SHA-256 of the sender's address: used only for rate limiting and one vote per person.
CREATE TABLE IF NOT EXISTS user_prices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  market        TEXT    NOT NULL,
  ean           TEXT    NOT NULL,
  price         REAL    NOT NULL,
  currency      TEXT    NOT NULL,
  store         TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 0,
  reports       INTEGER NOT NULL DEFAULT 0,
  ip_hash       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_prices_market_ean ON user_prices (market, ean, created_at);
CREATE INDEX IF NOT EXISTS idx_user_prices_ip ON user_prices (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS user_price_votes (
  price_id INTEGER NOT NULL,
  ip_hash  TEXT    NOT NULL,
  kind     TEXT    NOT NULL CHECK (kind IN ('confirm', 'report')),
  PRIMARY KEY (price_id, ip_hash)
);
-- Optional public nickname for the "top contributors this month" list. Anonymous submissions stay anonymous.
ALTER TABLE user_prices ADD COLUMN nickname TEXT;
-- Optional country shown next to the nickname on the "top contributors" list.
ALTER TABLE user_prices ADD COLUMN country TEXT;
