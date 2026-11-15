-- Migration 002: optional crowdsourced price (Open Prices, ODbL) on catalog products.
-- Run once against the existing D1 database:
--   wrangler d1 execute kiloradar --remote --file=scripts/migrations/002_catalog_prices.sql
ALTER TABLE catalog_products ADD COLUMN price REAL;
ALTER TABLE catalog_products ADD COLUMN price_currency TEXT;
ALTER TABLE catalog_products ADD COLUMN price_date TEXT;
ALTER TABLE catalog_products ADD COLUMN price_store TEXT;
ALTER TABLE catalog_products ADD COLUMN price_source TEXT;
ALTER TABLE catalog_products ADD COLUMN price_url TEXT;
ALTER TABLE catalog_products ADD COLUMN unit_price REAL;
ALTER TABLE catalog_products ADD COLUMN unit_label TEXT;
