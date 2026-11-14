/**
 * Cloudflare Pages Function: /api/report
 * Receives community shrinkflation reports and stores them in Cloudflare D1 (`shrink_reports`).
 * Gracefully handles missing D1 binding (`env.DB`) before the database is bound in Cloudflare Dashboard.
 */

import type { CronEnv } from '../../src/worker/cronUpdater';

interface PagesContext {
  request: Request;
  env?: Partial<CronEnv>;
}

interface ReportPayload {
  ean?: string;
  productName?: string;
  countryCode?: string;
  oldWeight?: string;
  newWeight?: string;
  oldPrice?: number;
  newPrice?: number;
  storeName?: string;
  notes?: string;
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  try {
    const body = (await context.request.json()) as ReportPayload;
    const ean = (body.ean || '').trim() || 'UNKNOWN';
    const oldWeight = (body.oldWeight || '').trim();
    const newWeight = (body.newWeight || '').trim();

    if (!oldWeight || !newWeight) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing oldWeight or newWeight' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    let savedToD1 = false;
    const db = context?.env?.DB;
    if (db && typeof db.prepare === 'function') {
      try {
        await db
          .prepare(
            `INSERT INTO shrink_reports
             (ean, product_name, country_code, old_weight, new_weight, old_price, new_price, store_name, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            ean,
            body.productName || null,
            body.countryCode || 'no',
            oldWeight,
            newWeight,
            body.oldPrice ?? null,
            body.newPrice ?? null,
            body.storeName || null,
            body.notes || null
          )
          .run();
        savedToD1 = true;
      } catch {
        // Gracefully succeed even if D1 binding is not yet initialized with schema.sql
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        storedInD1: savedToD1,
        message: 'Shrinkflation report received and queued for verification.',
        recordedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
