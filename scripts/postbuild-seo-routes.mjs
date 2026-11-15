import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const distDir = path.resolve('dist');
const baseHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(baseHtmlPath)) {
  process.exit(0);
}

const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');


// Bundle the TypeScript SEO data and locale configs so titles, descriptions and JSON-LD are
// generated from the same source the app uses at runtime.
const bundled = await build({
  stdin: {
    contents:
      "export { ALL_COUNTRY_LOCALES } from './src/locales/index.ts';" +
      "export { buildJsonLdGraph } from './src/utils/seoData.ts';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const { ALL_COUNTRY_LOCALES, buildJsonLdGraph } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);

const escAttr = (v) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const escText = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const jsonLdTag = (code) => {
  const loc = ALL_COUNTRY_LOCALES[code];
  const graph = buildJsonLdGraph(code, loc.seoTitle, loc.seoDescription, loc.currencyCode, loc.htmlLang);
  // "<" is escaped so the JSON can never close the script tag early.
  return `<script type="application/ld+json" id="kiloradar-jsonld">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script>`;
};

const ROUTE_CONFIGS = [
  {
    folders: ['us'],
    code: 'us',
    htmlLang: 'en-US',
    ogLocale: 'en_US',
    canonical: 'https://www.kiloradar.com/us/',
    title: 'KiloRadar US — Unit Price Calculator, Price per Ounce/Pound/Kilo & Shrinkflation Tracker (USD)',
    description:
      'Ever feel like your groceries run out faster? Calculate true unit prices per ounce, pound, or kilo (oz, lb, fl oz, g, kg), uncover hidden shrinkflation, and find the cheapest US grocery store.',
  },
  {
    folders: ['uk'],
    code: 'uk',
    htmlLang: 'en-GB',
    ogLocale: 'en_GB',
    canonical: 'https://www.kiloradar.com/uk/',
    title: 'KiloRadar UK — Unit Price Calculator, Price per Kilo & Shrinkflation Tracker (GBP £)',
    description:
      'Ever feel like your weekly shop runs out faster? Use our UK Unit Price Calculator and Shrinkflation Tracker to check the real price per kilo and compare Aldi, Lidl, Tesco, Sainsbury’s & Asda.',
  },
  {
    folders: ['no'],
    code: 'no',
    htmlLang: 'nb-NO',
    ogLocale: 'nb_NO',
    canonical: 'https://www.kiloradar.com/no/',
    title: 'KiloRadar Norge — Kilopriskalkulator, Enhetspris & Krympflasjon i matbutikken (NOK)',
    description:
      'Føles det som om favorittvarene dine varer litt kortere enn før? Beregn reell kilopris og enhetspris, avslør krympflasjon og finn billigste matbutikk i Norge med KiloRadar.',
  },
  {
    folders: ['sv', 'se'],
    code: 'se',
    htmlLang: 'sv-SE',
    ogLocale: 'sv_SE',
    canonical: 'https://www.kiloradar.com/sv/',
    title: 'KiloRadar Sverige — Jämförpris, Kilopris kalkylator & Krympflation i matbutiken (SEK)',
    description:
      'Känns det som att favoritvarorna i skafferiet tar slut snabbare? Räkna ut verkligt jämförpris och kilopris, avslöja krympflation och hitta billigaste matbutiken med KiloRadar.',
  },
  {
    folders: ['da', 'dk'],
    code: 'dk',
    htmlLang: 'da-DK',
    ogLocale: 'da_DK',
    canonical: 'https://www.kiloradar.com/da/',
    title: 'KiloRadar Danmark — Kilopris beregner, Enhedspris & Skrumpflation / Shrinkflation (DKK)',
    description:
      'Føles det som om dine yndlingsvarer slipper hurtigere op? Brug vores kilopris beregner til at tjekke reel enhedspris, afsløre skrumpflation og finde det billigste supermarked.',
  },
  {
    folders: ['pl'],
    code: 'pl',
    htmlLang: 'pl-PL',
    ogLocale: 'pl_PL',
    canonical: 'https://www.kiloradar.com/pl/',
    title: 'KiloRadar Polska — Kalkulator ceny za kilogram, Cena jednostkowa & Shrinkflacja / Downsizing (PLN)',
    description:
      'Masz wrażenie, że Twoje ulubione produkty kończą się szybciej? Oblicz realną cenę za kilogram i cenę jednostkową, wykryj downsizing i sprawdź najtańszy sklep z KiloRadar.',
  },
  {
    folders: ['de'],
    code: 'de',
    htmlLang: 'de-DE',
    ogLocale: 'de_DE',
    canonical: 'https://www.kiloradar.com/de/',
    title: 'KiloRadar Deutschland — Kilopreis Rechner, Grundpreis berechnen & Mogelpackung / Shrinkflation (EUR)',
    description:
      'Sind Ihre Lieblingsprodukte schneller leer als früher? Mit dem KiloRadar Kilopreis Rechner sofort den echten Grundpreis berechnen, Mogelpackungen entlarven und den günstigsten Supermarkt finden.',
  },
  {
    folders: ['fr'],
    code: 'fr',
    htmlLang: 'fr-FR',
    ogLocale: 'fr_FR',
    canonical: 'https://www.kiloradar.com/fr/',
    title: 'KiloRadar France — Calculateur prix au kilo, Prix unitaire & Réduflation / Shrinkflation (EUR)',
    description:
      'Avez-vous l’impression que vos produits préférés se terminent plus vite ? Utilisez notre calculateur de prix au kilo pour vérifier le vrai prix unitaire, démasquer la réduflation et comparer E.Leclerc, Lidl et Carrefour.',
  },
  {
    folders: ['es'],
    code: 'es',
    htmlLang: 'es-ES',
    ogLocale: 'es_ES',
    canonical: 'https://www.kiloradar.com/es/',
    title: 'KiloRadar España — Calculadora precio por kilo, Precio unitario & Reduflación / Shrinkflation (EUR)',
    description:
      '¿Sientes que tus productos favoritos se acaban antes que antes? Calcula el verdadero precio por kilo y precio unitario, descubre la reduflación y compara Mercadona, Lidl, Carrefour y Aldi.',
  },
];

ROUTE_CONFIGS.push({
  folders: [],
  code: 'en',
  htmlLang: 'en',
  ogLocale: 'en_US',
  canonical: 'https://www.kiloradar.com/',
  title: '',
  description: '',
});

for (const cfg of ROUTE_CONFIGS) {
  cfg.title = ALL_COUNTRY_LOCALES[cfg.code].seoTitle;
  cfg.description = ALL_COUNTRY_LOCALES[cfg.code].seoDescription;
  const ogImg = `https://www.kiloradar.com/og/og-${cfg.code}.png`;
  let localizedHtml = baseHtml
    .replace('<html lang="en"', `<html lang="${cfg.htmlLang}"`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(cfg.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escAttr(cfg.description)}" />`
    )
    .replace(
      /<link rel="canonical" href="https:\/\/www\.kiloradar\.com\/" \/>/,
      `<link rel="canonical" href="${cfg.canonical}" />`
    )
    .replace(
      /<meta property="og:url" content="https:\/\/www\.kiloradar\.com\/" \/>/,
      `<meta property="og:url" content="${cfg.canonical}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escAttr(cfg.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escAttr(cfg.description)}" />`
    )
    .replace(
      /<meta property="og:locale" content="en_US" \/>/,
      `<meta property="og:locale" content="${cfg.ogLocale}" />`
    )
    .replaceAll('https://www.kiloradar.com/og/og-en.png', ogImg)
    .replace(
      /<meta name="twitter:url" content="https:\/\/www\.kiloradar\.com\/" \/>/,
      `<meta name="twitter:url" content="${cfg.canonical}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escAttr(cfg.title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escAttr(cfg.description)}" />`
    );

  localizedHtml = localizedHtml
    .replace(/<script[^>]*id="kiloradar-jsonld"[^>]*>[\s\S]*?<\/script>/, '')
    .replace('</head>', `    ${jsonLdTag(cfg.code)}
  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>
    <noscript><h1>${escText(cfg.title)}</h1><p>${escText(cfg.description)}</p></noscript>`
    );

  if (cfg.code === 'en') {
    fs.writeFileSync(baseHtmlPath, localizedHtml, 'utf8');
  }

  for (const folder of cfg.folders) {
    const targetDir = path.join(distDir, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), localizedHtml, 'utf8');
  }
}

const sitemapPath = path.join(distDir, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const today = new Date().toISOString().slice(0, 10);
  const xml = fs.readFileSync(sitemapPath, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  fs.writeFileSync(sitemapPath, xml, 'utf8');
}

console.log('✔ Generated localized SEO & Open Graph index.html files for all 10 market routes.');