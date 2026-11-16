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
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number; last_row_id?: number } }>;
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

// ---------------------------------------------------------------------------------------------
// User-submitted prices (no login). Stored at once, shown to everyone, clearly marked as such.
// ---------------------------------------------------------------------------------------------

const MARKET_CURRENCY: Record<string, string> = {
  global: 'EUR', no: 'NOK', se: 'SEK', dk: 'DKK', pl: 'PLN', de: 'EUR', fr: 'EUR', es: 'EUR', us: 'USD', uk: 'GBP',
};
const MAX_SUBMISSIONS_PER_HOUR = 20;
const PRICE_MAX_AGE_DAYS = 180;
const HIDE_AFTER_REPORTS = 3;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function clientHash(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  return sha256(`kiloradar-prices-v1:${ip}`);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > 2048) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function cleanStore(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const store = raw.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  return store.length >= 2 && store.length <= 40 ? store : null;
}

/** Optional public nickname: 2-20 letters/digits/space/dot/dash/underscore. Anything else = anonymous. */
function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const nick = raw.replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{N} ._-]{2,20}$/u.test(nick) ? nick : null;
}

const CONTRIBUTOR_COUNTRIES = new Set(['NO', 'SE', 'DK', 'PL', 'DE', 'FR', 'ES', 'US', 'GB']);
function cleanCountry(raw: unknown): string | null {
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return CONTRIBUTOR_COUNTRIES.has(code) ? code : null;
}

function parsePrice(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 9999) return null;
  return Math.round(n * 100) / 100;
}

interface UserPriceRow {
  id: number;
  ean: string;
  price: number;
  currency: string;
  store: string;
  created_at: string;
  confirmations: number;
  reports: number;
}

async function handleSubmitPrice(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'database not bound' }, 503, 'no-store');
  const body = await readJson(request);
  if (!body) return json({ error: 'invalid' }, 400, 'no-store');

  const market = String(body.market ?? '').toLowerCase();
  const ean = String(body.barcode ?? '').replace(/\s+/g, '');
  const price = parsePrice(body.price);
  const store = cleanStore(body.store);
  if (!VALID_MARKETS.has(market) || !/^\d{8,14}$/.test(ean) || price === null || store === null) {
    return json({ error: 'invalid' }, 400, 'no-store');
  }
  const currency = MARKET_CURRENCY[market];

  try {
    const hash = await clientHash(request);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM user_prices WHERE ip_hash = ? AND created_at > ?')
      .bind(hash, since)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) return json({ error: 'rate_limited' }, 429, 'no-store');

    // A price far from the measured one is almost certainly a typo (e.g. 4,50 entered as 45).
    const known = await env.DB.prepare(
      'SELECT name, price, price_currency FROM catalog_products WHERE market = ? AND ean = ?'
    )
      .bind(market, ean)
      .first<{ name: string; price: number | null; price_currency: string | null }>();
    if (known?.price && known.price_currency === currency) {
      const ratio = price / known.price;
      if (ratio > 4 || ratio < 0.25) return json({ error: 'unusual', reference: known.price }, 422, 'no-store');
    }

    const createdAt = new Date().toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO user_prices (market, ean, price, currency, store, created_at, ip_hash, nickname, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(market, ean, price, currency, store, createdAt, hash, cleanNickname(body.nickname), cleanCountry(body.country))
      .run();

    return json(
      {
        ok: true,
        inCatalog: Boolean(known),
        price: {
          id: result.meta?.last_row_id ?? 0,
          ean,
          price,
          currency,
          store,
          created_at: createdAt,
          confirmations: 0,
          reports: 0,
        },
      },
      201,
      'no-store'
    );
  } catch {
    return json({ error: 'database query failed' }, 500, 'no-store');
  }
}

async function handleListPrices(url: URL, env: Env): Promise<Response> {
  const market = (url.searchParams.get('market') || '').toLowerCase();
  if (!VALID_MARKETS.has(market)) return json({ error: 'invalid market' }, 400, 'no-store');
  if (!env.DB) return json({ error: 'database not bound' }, 503, 'no-store');
  try {
    const since = new Date(Date.now() - PRICE_MAX_AGE_DAYS * 86400_000).toISOString();
    const { results = [] } = await env.DB.prepare(
      `SELECT id, ean, price, currency, store, created_at, confirmations, reports
       FROM user_prices
       WHERE market = ? AND created_at > ? AND NOT (reports >= ? AND reports > confirmations)
       ORDER BY created_at DESC LIMIT 3000`
    )
      .bind(market, since, HIDE_AFTER_REPORTS)
      .all<UserPriceRow>();
    // newest visible price per barcode
    const latest = new Map<string, UserPriceRow>();
    for (const row of results) if (!latest.has(row.ean)) latest.set(row.ean, row);
    return json({ market, prices: [...latest.values()] }, 200, 'no-store');
  } catch {
    return json({ error: 'database query failed' }, 500, 'no-store');
  }
}

/** Top contributors of a calendar month: distinct (product, store) prices per person, reported prices excluded. */
async function handleContributors(url: URL, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'database not bound' }, 503, 'no-store');
  const now = new Date();
  const requested = url.searchParams.get('month');
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : now.toISOString().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT market,
              COUNT(DISTINCT ean || '|' || store) AS prices,
              (SELECT u2.nickname FROM user_prices u2
                WHERE u2.ip_hash = u.ip_hash AND u2.nickname IS NOT NULL ORDER BY u2.id DESC LIMIT 1) AS nickname,
              (SELECT u3.country FROM user_prices u3
                WHERE u3.ip_hash = u.ip_hash AND u3.country IS NOT NULL ORDER BY u3.id DESC LIMIT 1) AS country
       FROM user_prices u
       WHERE created_at >= ? AND created_at < ? AND NOT (reports >= ? AND reports > confirmations)
       GROUP BY ip_hash, market
       HAVING nickname IS NOT NULL
       ORDER BY prices DESC, nickname ASC
       LIMIT 10`
    )
      .bind(`${month}-01`, `${next}-01`, HIDE_AFTER_REPORTS)
      .all<{ market: string; prices: number; nickname: string; country: string | null }>();
    return json({ month, contributors: results }, 200, 'public, max-age=60');
  } catch {
    return json({ error: 'database query failed' }, 500, 'no-store');
  }
}

async function handleVote(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'database not bound' }, 503, 'no-store');
  const body = await readJson(request);
  const id = Number(body?.id);
  const kind = body?.kind;
  if (!body || !Number.isInteger(id) || id <= 0 || (kind !== 'confirm' && kind !== 'report')) {
    return json({ error: 'invalid' }, 400, 'no-store');
  }
  try {
    const hash = await clientHash(request);
    const row = await env.DB.prepare('SELECT ip_hash FROM user_prices WHERE id = ?')
      .bind(id)
      .first<{ ip_hash: string }>();
    if (!row) return json({ error: 'not_found' }, 404, 'no-store');
    if (row.ip_hash === hash) return json({ error: 'own_price' }, 409, 'no-store');

    const inserted = await env.DB.prepare('INSERT OR IGNORE INTO user_price_votes (price_id, ip_hash, kind) VALUES (?, ?, ?)')
      .bind(id, hash, kind)
      .run();
    if ((inserted.meta?.changes ?? 0) === 1) {
      const column = kind === 'confirm' ? 'confirmations' : 'reports';
      await env.DB.prepare(`UPDATE user_prices SET ${column} = ${column} + 1 WHERE id = ?`).bind(id).run();
    }
    const counts = await env.DB.prepare('SELECT confirmations, reports FROM user_prices WHERE id = ?')
      .bind(id)
      .first<{ confirmations: number; reports: number }>();
    return json({ ok: true, alreadyVoted: (inserted.meta?.changes ?? 0) === 0, ...counts }, 200, 'no-store');
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
    if (url.pathname === '/api/prices' && request.method === 'GET') {
      return handleListPrices(url, env);
    }
    if (url.pathname === '/api/contributors' && request.method === 'GET') {
      return handleContributors(url, env);
    }
    if (url.pathname === '/api/price' && request.method === 'POST') {
      return handleSubmitPrice(request, env);
    }
    if (url.pathname === '/api/price/vote' && request.method === 'POST') {
      return handleVote(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
