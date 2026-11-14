/**
 * Cloudflare Pages Function: /api/products
 * Queries Cloudflare D1 SQLite database (`products` + `price_history`) for a given `?lang=` country code,
 * and seamlessly falls back to the curated local dataset (`src/locales/`) if D1 is not bound yet.
 */

import { ALL_COUNTRY_LOCALES, CountryRouteCode } from '../../src/locales';
import type { ProductItem } from '../../src/utils/shrinkAlgorithm';
import type { CronEnv } from '../../src/worker/cronUpdater';

interface PagesContext {
  request: Request;
  env: CronEnv;
}

interface DbProductJoinedRow {
  ean: string;
  name: string;
  brand: string;
  category: string;
  country_code: string;
  image_url: string | null;
  latest_weight: number;
  latest_unit: string;
  latest_price: number;
  prev_weight: number | null;
  prev_price: number | null;
  recorded_at: string;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const langParam = (url.searchParams.get('lang') || 'en').toLowerCase() as CountryRouteCode;
  const validLang: CountryRouteCode = ALL_COUNTRY_LOCALES[langParam] ? langParam : 'en';
  const fallbackConfig = ALL_COUNTRY_LOCALES[validLang];

  // Try querying Cloudflare D1 if bound
  if (context.env && context.env.DB) {
    try {
      const { results } = await context.env.DB.prepare(
        `SELECT
           p.ean,
           p.name,
           p.brand,
           p.category,
           p.country_code,
           p.image_url,
           h1.weight_grams AS latest_weight,
           h1.measure_unit AS latest_unit,
           h1.price AS latest_price,
           h1.recorded_at,
           h2.weight_grams AS prev_weight,
           h2.price AS prev_price
         FROM products p
         JOIN price_history h1 ON h1.id = (
           SELECT id FROM price_history WHERE ean = p.ean ORDER BY recorded_at DESC LIMIT 1
         )
         LEFT JOIN price_history h2 ON h2.id = (
           SELECT id FROM price_history WHERE ean = p.ean ORDER BY recorded_at DESC LIMIT 1 OFFSET 1
         )
         WHERE p.country_code = ?
         LIMIT 50`
      )
        .bind(validLang)
        .all<DbProductJoinedRow>();

      if (results && results.length > 0) {
        const mapped: ProductItem[] = results.map((row) => {
          const oldW = row.prev_weight ?? row.latest_weight;
          const oldP = row.prev_price ?? row.latest_price;
          return {
            id: `d1-${row.ean}`,
            name: row.name,
            brand: row.brand,
            category: row.category,
            store: fallbackConfig.stores[0]?.store || 'Store',
            barcode: row.ean,
            oldMeasure: `${oldW} ${row.latest_unit}`,
            newMeasure: `${row.latest_weight} ${row.latest_unit}`,
            oldPrice: oldP,
            newPrice: row.latest_price,
            detectedDate: row.recorded_at.slice(0, 10),
            imageUrl: row.image_url || undefined,
          };
        });

        return new Response(
          JSON.stringify({
            source: 'cloudflare-d1',
            country: validLang,
            lastSynced: new Date().toISOString().slice(0, 10),
            products: mapped,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300',
            },
          }
        );
      }
    } catch {
      // Fall back to curated locale dataset if D1 tables aren't migrated yet
    }
  }

  return new Response(
    JSON.stringify({
      source: 'locale-fallback',
      country: validLang,
      lastSynced: new Date().toISOString().slice(0, 10),
      products: fallbackConfig.products,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
