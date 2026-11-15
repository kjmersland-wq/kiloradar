/**
 * KiloRadar Worker entry.
 * - GET /api/catalog?market=no  -> real Open Food Facts catalog from Cloudflare D1
 * - everything else             -> static assets (the Vite SPA) via the ASSETS binding
 *
 * Only /api/* reaches this Worker first (see run_worker_first in wrangler.toml).
 */

interface D1Result<T> {
  results?: T[];
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1Statement;
}
interface Env {
  DB?: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const VALID_MARKETS = new Set(['global', 'no', 'se', 'dk', 'pl', 'de', 'fr', 'es', 'us', 'uk']);

interface CatalogRow {
  ean: string;
  name: string;
  brand: string | null;
  category: string | null;
  measure: string;
  image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  last_checked: string | null;
  verification: string | null;
  price: number | null;
  price_currency: string | null;
  price_date: string | null;
  price_store: string | null;
  price_source: string | null;
  price_url: string | null;
  unit_price: number | null;
  unit_label: string | null;
}

interface HistoryRow {
  ean: string;
  recorded_on: string;
  measure: string;
}

/** Converts "250 g", "1,5 kg", "75 cl", "2 x 150 g" to a comparable number (g or ml). */
function measureToBase(measure: string): number | null {
  const m = measure.trim().toLowerCase().replace(',', '.');
  const multi = m.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  const single = m.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  let qty: number;
  let unit: string;
  if (multi) {
    qty = parseFloat(multi[1]) * parseFloat(multi[2]);
    unit = multi[3];
  } else if (single) {
    qty = parseFloat(single[1]);
    unit = single[2];
  } else {
    return null;
  }
  const factor: Record<string, number> = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000 };
  return unit in factor ? qty * factor[unit] : null;
}

function json(body: unknown, status = 200, cache = 'public, max-age=300'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

async function handleCatalog(url: URL, env: Env): Promise<Response> {
  const market = (url.searchParams.get('market') || '').toLowerCase();
  if (!VALID_MARKETS.has(market)) {
    return json({ error: 'invalid market' }, 400, 'no-store');
  }
  if (!env.DB) {
    return json({ error: 'database not bound' }, 503, 'no-store');
  }

  try {
    const { results: rows = [] } = await env.DB.prepare(
      `SELECT ean, name, brand, category, measure, image_url, source_name, source_url,
              last_checked, verification, price, price_currency, price_date, price_store,
              price_source, price_url, unit_price, unit_label
       FROM catalog_products WHERE market = ? ORDER BY name`
    )
      .bind(market)
      .all<CatalogRow>();

    const { results: history = [] } = await env.DB.prepare(
      `SELECT ean, recorded_on, measure FROM catalog_size_history
       WHERE market = ? ORDER BY recorded_on ASC`
    )
      .bind(market)
      .all<HistoryRow>();

    const byEan = new Map<string, HistoryRow[]>();
    for (const h of history) {
      const list = byEan.get(h.ean) ?? [];
      list.push(h);
      byEan.set(h.ean, list);
    }

    const catalog = rows.map((r) => {
      const hist = byEan.get(r.ean) ?? [];
      const shrinkEvents: Array<{ date: string; from: string; to: string }> = [];
      for (let i = 1; i < hist.length; i++) {
        const before = measureToBase(hist[i - 1].measure);
        const after = measureToBase(hist[i].measure);
        if (before !== null && after !== null && after < before) {
          shrinkEvents.push({ date: hist[i].recorded_on, from: hist[i - 1].measure, to: hist[i].measure });
        }
      }
      return {
        id: `${market}-off-${r.ean}`,
        barcode: r.ean,
        name: r.name,
        brand: r.brand ?? undefined,
        category: r.category ?? '',
        measure: r.measure,
        imageUrl: r.image_url,
        sources: [
          ...(r.source_name
            ? [{ name: r.source_name, url: r.source_url ?? undefined, checked: r.last_checked ?? undefined }]
            : []),
          ...(r.price !== null && r.price_url
            ? [{ name: 'Open Prices (ODbL)', url: r.price_url, checked: r.price_date ?? undefined }]
            : []),
        ],
        price:
          r.price !== null && r.price_currency
            ? {
                value: r.price,
                currency: r.price_currency,
                date: r.price_date ?? undefined,
                store: r.price_store ?? undefined,
                unitPrice: r.unit_price ?? undefined,
                unitLabel: r.unit_label ?? undefined,
                source: r.price_source ?? 'Open Prices',
                url: r.price_url ?? undefined,
              }
            : undefined,
        lastChecked: r.last_checked,
        verification: r.verification ?? 'unverified',
        sizeHistory: hist.map((h) => ({ date: h.recorded_on, value: h.measure })),
        shrinkEvents,
      };
    });

    return json({ source: 'cloudflare-d1', market, count: catalog.length, catalog });
  } catch {
    return json({ error: 'database query failed' }, 500, 'no-store');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/catalog' && request.method === 'GET') {
      return handleCatalog(url, env);
    }
    return env.ASSETS.fetch(request);
  },
};
