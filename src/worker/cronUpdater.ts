/**
 * KiloRadar (kiloradar.com) — Automatic Nightly Cron Updater (0 3 * * *)
 * 100% Algorithmic & Rule-Based Shrinkflation Detection Engine
 * Developed and operated by KM TECH LABS
 */

import { parseMeasure, calculateShrinkflationIndex } from '../utils/shrinkAlgorithm';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface CronEnv {
  DB?: D1Database;
  KASSAL_API_KEY?: string;
  APP_URL?: string;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface TrackedRow {
  ean: string;
  name: string;
  brand: string;
  category: string;
  country_code: string;
}

interface PriceHistoryRow {
  id: number;
  ean: string;
  weight_grams: number;
  measure_unit: string;
  price: number;
  unit_price: number;
  recorded_at: string;
}

/**
 * Fetches latest product weight & metadata from Open Food Facts (100% free API)
 */
async function fetchOpenFoodFactsByEan(ean: string): Promise<{
  name?: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
} | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}.json`, {
      headers: {
        'User-Agent': 'KiloRadar/1.0 (https://kiloradar.com; support@kiloradar.com)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      product?: Record<string, string>;
    };
    if (data.status !== 1 || !data.product) return null;

    return {
      name:
        data.product.product_name_no ||
        data.product.product_name_sv ||
        data.product.product_name_da ||
        data.product.product_name_pl ||
        data.product.product_name,
      brand: data.product.brands,
      quantity: data.product.quantity,
      imageUrl: data.product.image_front_small_url || data.product.image_small_url,
    };
  } catch {
    return null;
  }
}

/**
 * Optional Norwegian price enrichment via Kassal.app API when KASSAL_API_KEY is configured
 */
async function fetchKassalAppPriceByEan(
  ean: string,
  apiKey?: string
): Promise<{ price: number; weightGrams?: number; storeName?: string } | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        products?: Array<{
          current_price?: { price?: number };
          weight?: number;
          store?: { name?: string };
        }>;
      };
    };
    const items = json.data?.products || [];
    const valid = items.find((p) => typeof p.current_price?.price === 'number');
    if (!valid || !valid.current_price?.price) return null;

    return {
      price: valid.current_price.price,
      weightGrams: valid.weight,
      storeName: valid.store?.name,
    };
  } catch {
    return null;
  }
}

/**
 * Runs every night at 03:00 UTC (cron: "0 3 * * *")
 * Compares newly observed package weight/volume and price against the latest row in `price_history`
 * and automatically logs new shrinkflation events into D1.
 */
export async function runNightlyShrinkflationSync(env: CronEnv): Promise<{
  checkedCount: number;
  newShrinkFindings: number;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  if (!env.DB) {
    return { checkedCount: 0, newShrinkFindings: 0, timestamp };
  }

  const { results: trackedProducts } = await env.DB.prepare(
    'SELECT ean, name, brand, category, country_code FROM products LIMIT 100'
  ).all<TrackedRow>();

  let checkedCount = 0;
  let newShrinkFindings = 0;

  for (const prod of trackedProducts) {
    checkedCount++;

    // 1. Get most recent history record for this EAN
    const lastRecord = await env.DB.prepare(
      'SELECT id, ean, weight_grams, measure_unit, price, unit_price, recorded_at FROM price_history WHERE ean = ? ORDER BY recorded_at DESC LIMIT 1'
    )
      .bind(prod.ean)
      .first<PriceHistoryRow>();

    // 2. Fetch fresh metadata from Open Food Facts
    const offData = await fetchOpenFoodFactsByEan(prod.ean);

    // 3. Optionally fetch live store price from Kassal.app if Norwegian product and KASSAL_API_KEY is set
    const kassalData =
      prod.country_code === 'no'
        ? await fetchKassalAppPriceByEan(prod.ean, env.KASSAL_API_KEY)
        : null;

    let observedGrams = lastRecord?.weight_grams || 200;
    let measureUnit = lastRecord?.measure_unit || 'g';

    if (offData?.quantity) {
      const m = offData.quantity.match(/(\d+(?:[.,]\d+)?\s*(?:g|kg|hg|ml|cl|dl|l|stk))/i);
      if (m) {
        try {
          const parsed = parseMeasure(m[1]);
          observedGrams =
            parsed.baseUnit === 'kg' || parsed.baseUnit === 'l'
              ? Math.round(parsed.normalizedAmount * 1000)
              : parsed.normalizedAmount;
          measureUnit = parsed.baseUnit === 'l' ? 'ml' : parsed.baseUnit === 'kg' ? 'g' : 'stk';
        } catch {
          // Keep previous weight if quantity string is non-standard
        }
      }
    } else if (kassalData?.weightGrams && kassalData.weightGrams > 0) {
      observedGrams = kassalData.weightGrams;
    }

    const observedPrice = kassalData?.price ?? lastRecord?.price ?? 39.9;
    const normalizedKgOrL = measureUnit === 'stk' ? observedGrams : observedGrams / 1000;
    const computedUnitPrice = Math.round((observedPrice / normalizedKgOrL) * 100) / 100;

    // Update product image if found
    if (offData?.imageUrl) {
      await env.DB.prepare('UPDATE products SET image_url = ?, updated_at = ? WHERE ean = ?')
        .bind(offData.imageUrl, timestamp, prod.ean)
        .run();
    }

    // Compare against last record: insert new row if weight dropped or price changed
    const hasChanged =
      !lastRecord ||
      Math.abs(lastRecord.weight_grams - observedGrams) > 0.5 ||
      Math.abs(lastRecord.price - observedPrice) > 0.05;

    if (hasChanged) {
      await env.DB.prepare(
        'INSERT INTO price_history (ean, weight_grams, measure_unit, price, unit_price, store_name, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          prod.ean,
          observedGrams,
          measureUnit,
          observedPrice,
          computedUnitPrice,
          kassalData?.storeName || null,
          timestamp
        )
        .run();

      if (lastRecord) {
        const shrinkIndex = calculateShrinkflationIndex(
          lastRecord.price,
          lastRecord.weight_grams,
          observedPrice,
          observedGrams
        );
        if (shrinkIndex > 2) {
          newShrinkFindings++;
        }
      }
    }
  }

  return {
    checkedCount,
    newShrinkFindings,
    timestamp,
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: CronEnv): Promise<void> {
    await runNightlyShrinkflationSync(env);
  },
};
