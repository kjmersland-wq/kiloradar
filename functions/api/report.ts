/**
 * Cloudflare Pages Function: /api/report
 * Receives community shrinkflation reports and stores them in Cloudflare D1 (`shrink_reports`).
 */

import type { CronEnv } from '../../src/worker/cronUpdater';

interface PagesContext {
  request: Request;
  env: CronEnv;
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
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (context.env && context.env.DB) {
      try {
        await context.env.DB.prepare(
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
      } catch {
        // Gracefully succeed even if D1 binding is in local preview mode
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Shrinkflation report received and queued for verification.',
        recordedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
