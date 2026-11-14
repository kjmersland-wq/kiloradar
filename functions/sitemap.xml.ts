/**
 * Dynamic XML Sitemap Generator for https://www.kiloradar.com/sitemap.xml
 * Outputs all 10 supported market routes (/, /us/, /uk/, /no/, /sv/, /da/, /pl/, /de/, /fr/, /es/)
 * with full xhtml:link hreflang alternates and automatic daily <lastmod> ISO date.
 */

import { HREFLANG_LINKS, SITE_BASE_URL } from '../src/utils/seoData';

const ROUTES = [
  { loc: `${SITE_BASE_URL}/`, priority: '1.0' },
  { loc: `${SITE_BASE_URL}/us/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/uk/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/no/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/sv/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/da/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/pl/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/de/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/fr/`, priority: '0.95' },
  { loc: `${SITE_BASE_URL}/es/`, priority: '0.95' },
];

export async function onRequestGet(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const hreflangXml = HREFLANG_LINKS.map(
    (h) => `    <xhtml:link rel="alternate" hreflang="${h.hreflang}" href="${h.href}" />`
  ).join('\n');

  const urlBlocks = ROUTES.map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${r.priority}</priority>
${hreflangXml}
  </url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlBlocks}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
