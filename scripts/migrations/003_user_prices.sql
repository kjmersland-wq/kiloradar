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
