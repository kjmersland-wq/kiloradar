import type { CountryRouteCode } from '../locales/types';

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ShareUiStrings {
  label: string;
  copyLink: string;
  copiedConfirm: string;
  shareText: string;
}

export interface LocaleSeoMetadata {
  canonicalUrl: string;
  ogLocale: string;
  keywords: string;
  h1KeywordKicker: string;
  faqHeading: string;
  faqSubheading: string;
  faqs: FaqEntry[];
  share: ShareUiStrings;
}

export const SITE_BASE_URL = 'https://www.kiloradar.com';

export const HREFLANG_LINKS: Array<{ hreflang: string; href: string }> = [
  { hreflang: 'x-default', href: `${SITE_BASE_URL}/` },
  { hreflang: 'en', href: `${SITE_BASE_URL}/` },
  { hreflang: 'en-US', href: `${SITE_BASE_URL}/us/` },
  { hreflang: 'en-GB', href: `${SITE_BASE_URL}/uk/` },
  { hreflang: 'nb-NO', href: `${SITE_BASE_URL}/no/` },
  { hreflang: 'sv-SE', href: `${SITE_BASE_URL}/sv/` },
  { hreflang: 'da-DK', href: `${SITE_BASE_URL}/da/` },
  { hreflang: 'pl-PL', href: `${SITE_BASE_URL}/pl/` },
  { hreflang: 'de-DE', href: `${SITE_BASE_URL}/de/` },
  { hreflang: 'fr-FR', href: `${SITE_BASE_URL}/fr/` },
  { hreflang: 'es-ES', href: `${SITE_BASE_URL}/es/` },
];

export const SEO_METADATA_BY_LOCALE: Record<CountryRouteCode, LocaleSeoMetadata> = {
  en: {
    canonicalUrl: `${SITE_BASE_URL}/`,
    ogLocale: 'en_US',
    keywords:
      'Unit Price Calculator, Price per Kilo, Price per Ounce, Shrinkflation Tracker, grocery unit price comparison, cost per kg, cost per liter, barcode price scanner',
    h1KeywordKicker: 'Unit Price Calculator, Price per Kilo/Ounce & Shrinkflation Tracker',
    faqHeading: 'Frequently Asked Questions: Unit Price Calculator & Shrinkflation Tracker',
    faqSubheading:
      'Everything you need to know about calculating true price per kilo or ounce and spotting hidden package downsizing.',
    faqs: [
      {
        question: 'How does the Unit Price Calculator find the real price per kilo or ounce?',
        answer:
          'KiloRadar automatically converts every package weight and volume (g, kg, ml, l, oz, lb, fl oz, and multipacks) into a standardized unit price so you can compare any two items fairly in seconds.',
      },
      {
        question: 'What is shrinkflation and how does the Shrinkflation Tracker work?',
        answer:
          'Shrinkflation happens when a manufacturer reduces package size (e.g., from 250g to 200g) while keeping the retail price the same or higher. KiloRadar computes the real unit-price surge with ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100.',
      },
      {
        question: 'How do you compare weekly grocery baskets across supermarkets?',
        answer:
          'By weighting everyday staples and tracked brand items by their normalized unit price, KiloRadar ranks major supermarkets for 1 week, 1 month, and 1 year.',
      },
      {
        question: 'Can I scan product barcodes with my phone camera?',
        answer:
          'Yes! Tap "Scan with camera" or enter any EAN/UPC barcode to pull package weight from Open Food Facts and calculate unit price on the spot.',
      },
    ],
    share: {
      label: 'Share Unit Price Calculator & Shrinkflation Tracker:',
      copyLink: 'Copy link',
      copiedConfirm: 'Link copied!',
      shareText:
        'Check what you truly pay per kilo or ounce and uncover hidden shrinkflation with KiloRadar:',
    },
  },
  us: {
    canonicalUrl: `${SITE_BASE_URL}/us/`,
    ogLocale: 'en_US',
    keywords:
      'Unit Price Calculator, Price per Ounce, Price per Pound, Price per Kilo, Shrinkflation Tracker, oz to lb calculator, US grocery price comparison, Aldi, Walmart, Kroger, Trader Joes',
    h1KeywordKicker: 'US Unit Price Calculator (oz, lb, fl oz, kg) & Shrinkflation Tracker',
    faqHeading: 'FAQ: US Unit Price Calculator (Price per Ounce, Pound & Kilo) & Shrinkflation',
    faqSubheading:
      'Compare US grocery packages in ounces (oz), pounds (lb), fluid ounces (fl oz), or metric units and uncover hidden shrinkflation.',
    faqs: [
      {
        question: 'Does the US Unit Price Calculator support ounces (oz), pounds (lb), and fluid ounces (fl oz)?',
        answer:
          'Yes! You can enter measurements like "16 oz", "14.5 oz", "1.5 lb", "52 fl oz", or metric "500 g" directly into the calculator to compare unit prices and spot shrinkflation.',
      },
      {
        question: 'How do you calculate the hidden cost of shrinkflation on US groceries?',
        answer:
          'When a 25.9 oz coffee canister shrinks to 22.6 oz or a 52 fl oz orange juice bottle drops to 46 fl oz, our formula ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100 reveals the exact percentage jump in true unit cost.',
      },
      {
        question: 'Which US grocery store has the lowest weekly basket cost?',
        answer:
          'KiloRadar compares typical weekly, monthly, and annual household baskets across Aldi US, Walmart, Trader Joe’s, Kroger, and Target.',
      },
      {
        question: 'Can I scan UPC barcodes in US grocery stores?',
        answer:
          'Yes! Use the built-in camera barcode scanner or type any UPC/EAN code to fetch product size from Open Food Facts and compute the real price per ounce, pound, or kilo.',
      },
    ],
    share: {
      label: 'Share the US Unit Price & Shrinkflation Calculator:',
      copyLink: 'Copy link',
      copiedConfirm: 'Link copied!',
      shareText:
        'Calculate true price per ounce, pound, or kilo and spot grocery shrinkflation with KiloRadar US:',
    },
  },
  uk: {
    canonicalUrl: `${SITE_BASE_URL}/uk/`,
    ogLocale: 'en_GB',
    keywords:
      'Unit Price Calculator UK, Price per Kilo, Shrinkflation Tracker UK, supermarket price comparison, Aldi, Lidl, Tesco, Sainsburys, Asda',
    h1KeywordKicker: 'UK Unit Price Calculator, Price per Kilo (£/kg) & Shrinkflation Tracker',
    faqHeading: 'Frequently Asked Questions: UK Unit Price Calculator & Shrinkflation Tracker',
    faqSubheading:
      'How to check true £/kg and £/l unit prices and beat shrinkflation across British supermarkets.',
    faqs: [
      {
        question: 'How does KiloRadar UK calculate true price per kilo (£/kg)?',
        answer:
          'We convert every pack weight and volume (grams, kilograms, millilitres, litres, and multipacks) into a standardised £/kg or £/l unit price so you can compare any two items fairly.',
      },
      {
        question: 'How does the UK Shrinkflation Tracker spot smaller packs?',
        answer:
          'When a sharing bar drops from 200g to 180g or butter shrinks from 500g to 400g, we calculate the exact unit-price jump using ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100.',
      },
      {
        question: 'Which UK supermarket is cheapest for a weekly shop?',
        answer:
          'We compare a standard household trolley across Aldi UK, Lidl UK, Asda, Tesco, and Sainsbury’s for 1 week, 1 month, and 1 year.',
      },
      {
        question: 'Can I scan UK barcodes on my mobile?',
        answer:
          'Yes—tap "Scan with camera" to scan any EAN barcode via Open Food Facts and check the real £/kg price immediately.',
      },
    ],
    share: {
      label: 'Share the UK Unit Price & Shrinkflation Tracker:',
      copyLink: 'Copy link',
      copiedConfirm: 'Link copied!',
      shareText:
        'Check what you truly pay per kilo (£/kg) and uncover supermarket shrinkflation with KiloRadar UK:',
    },
  },
  no: {
    canonicalUrl: `${SITE_BASE_URL}/no/`,
    ogLocale: 'nb_NO',
    keywords:
      'Kilopriskalkulator, Enhetspris, Krympflasjon, kilopris, matpriser, billigste matbutikk, REMA 1000, KIWI, Coop Extra, Oda, Meny',
    h1KeywordKicker: 'Kilopriskalkulator, Enhetspris og Krympflasjon i norske matbutikker',
    faqHeading: 'Ofte stilte spørsmål: Kilopriskalkulator, enhetspris og krympflasjon',
    faqSubheading:
      'Alt du trenger å vite for å regne ut reell kilopris (kr/kg), sammenligne enhetspris og avsløre krympflasjon.',
    faqs: [
      {
        question: 'Hvordan fungerer KiloRadar som kilopriskalkulator og enhetspriskalkulator?',
        answer:
          'KiloRadar regner automatisk om alle pakningsstørrelser (gram, hektogram, kilo, milliliter, desiliter, liter og stykk/multipack) til en standardisert enhetspris i kr per kilo (kr/kg) eller kr per liter (kr/l).',
      },
      {
        question: 'Hva er krympflasjon, og hvordan avslører dere skjulte prisøkninger?',
        answer:
          'Krympflasjon skjer når innholdet i pakken reduseres (f.eks. fra 250 g til 200 g) mens prisen på hylla holdes lik eller økes. Vi beregner den eksakte økningen i kilopris med formelen ((nyPris / nyMengde) / (gammelPris / gammelMengde) - 1) × 100.',
      },
      {
        question: 'Hvilken matbutikk er billigst på ukeshandelen i Norge?',
        answer:
          'Ved å sammenligne reell enhetspris på tvers av basisvarer og kjente merkevarer viser KiloRadar totalprisen for 1 uke, 1 måned og 1 år hos REMA 1000, KIWI, Coop Extra, Oda og Meny.',
      },
      {
        question: 'Kan jeg skanne strekkoder med mobilen i butikken?',
        answer:
          'Ja! Klikk på «Skann med kamera» eller søk på EAN-strekkoden for å hente pakningsvekt fra Open Food Facts og regne ut kiloprisen på stedet.',
      },
    ],
    share: {
      label: 'Del kilopriskalkulatoren med venner og familie:',
      copyLink: 'Kopier lenke',
      copiedConfirm: 'Lenke kopiert!',
      shareText:
        'Sjekk reell kilopris, enhetspris og avslør krympflasjon i matbutikken med KiloRadar:',
    },
  },
  se: {
    canonicalUrl: `${SITE_BASE_URL}/sv/`,
    ogLocale: 'sv_SE',
    keywords:
      'Jämförpris, Kilopris kalkylator, Krympflation, kilopris, matpriser, billigaste matbutiken, ICA, Willys, Coop, Hemköp, City Gross',
    h1KeywordKicker: 'Kilopris kalkylator, Jämförpris och Krympflation i svenska matbutiker',
    faqHeading: 'Vanliga frågor: Kilopris kalkylator, jämförpris och krympflation',
    faqSubheading:
      'Så räknar du enkelt ut verkligt jämförpris (kr/kg och kr/l) och avslöjar krympflation i matbutiken.',
    faqs: [
      {
        question: 'Hur fungerar KiloRadar som kilopris kalkylator för jämförpris?',
        answer:
          'KiloRadar omvandlar automatiskt alla vikter och volymer (gram, hekto, kilo, milliliter, deciliter, liter och flerpack) till ett exakt jämförpris i kr/kg eller kr/l.',
      },
      {
        question: 'Vad är krympflation och hur räknar ni ut den dolda prisökningen?',
        answer:
          'Krympflation sker när förpackningen blir mindre (t.ex. kaffe från 450 g till 400 g) utan att priset sänks. Vi mäter ökningen i jämförpris med formeln ((nyttPris / nyMängd) / (gammaltPris / gammalMängd) - 1) × 100.',
      },
      {
        question: 'Vilken matbutik har billigast matkasse i Sverige?',
        answer:
          'Genom att jämföra verkligt kilopris och jämförpris på basvaror och kända märkesvaror visar KiloRadar kostnaden för 1 vecka, 1 månad och 1 år hos Willys, ICA, Coop, Hemköp och City Gross.',
      },
      {
        question: 'Kan jag skanna streckkoder med kameran i mobilen?',
        answer:
          'Ja! Tryck på «Skanna med kamera» eller skriv in varans EAN-kod för att hämta vikt från Open Food Facts och räkna ut kilopriset direkt.',
      },
    ],
    share: {
      label: 'Dela vår kilopris kalkylator & krympflationsradar:',
      copyLink: 'Kopiera länk',
      copiedConfirm: 'Länk kopierad!',
      shareText:
        'Räkna ut verkligt jämförpris per kilo och avslöja krympflation i matbutiken med KiloRadar:',
    },
  },
  dk: {
    canonicalUrl: `${SITE_BASE_URL}/da/`,
    ogLocale: 'da_DK',
    keywords:
      'Kilopris beregner, Enhedspris, Shrinkflation, Skrumpflation, kilopris, dagligvarepriser, billigste supermarked, Rema 1000, Netto, Lidl, Føtex, Bilka',
    h1KeywordKicker: 'Kilopris beregner, Enhedspris og Skrumpflation / Shrinkflation',
    faqHeading: 'Ofte stillede spørgsmål: Kilopris beregner, enhedspris og skrumpflation',
    faqSubheading:
      'Sådan beregner du den reelle kilopris og enhedspris (kr./kg og kr./l) og gennemskuer skrumpflation.',
    faqs: [
      {
        question: 'Hvordan fungerer KiloRadar som kilopris beregner og enhedsprisberegner?',
        answer:
          'KiloRadar omregner automatisk alle pakningsstørrelser (gram, kilo, milliliter, liter og multipack) til en standardiseret enhedspris i kr. pr. kilo (kr./kg) eller kr. pr. liter (kr./l).',
      },
      {
        question: 'Hvad er skrumpflation (shrinkflation), og hvordan beregnes det?',
        answer:
          'Skrumpflation opstår, når mængden i pakken reduceres (f.eks. fra 500 g til 400 g), mens prisen forbliver uændret eller stiger. Vi måler den reelle prisstigning pr. kilo med ((nyPris / nyMængde) / (gammelPris / gammelMængde) - 1) × 100.',
      },
      {
        question: 'Hvilket supermarked er billigst i Danmark?',
        answer:
          'Vi sammenligner en repræsentativ indkøbskurv på tværs af Rema 1000, Netto, Lidl, Bilka og Føtex for 1 uge, 1 måned og 1 år.',
      },
      {
        question: 'Kan jeg scanne stregkoder på varer med mobilen?',
        answer:
          'Ja! Brug «Scan med kamera» eller søgefeltet til at slå enhver EAN-stregkode op i Open Food Facts og tjekke kiloprisen med det samme.',
      },
    ],
    share: {
      label: 'Del vores kilopris beregner & skrumpflationsradar:',
      copyLink: 'Kopiér link',
      copiedConfirm: 'Link kopieret!',
      shareText:
        'Beregn reel kilopris og enhedspris og afslør skrumpflation i supermarkedet med KiloRadar:',
    },
  },
  pl: {
    canonicalUrl: `${SITE_BASE_URL}/pl/`,
    ogLocale: 'pl_PL',
    keywords:
      'Kalkulator ceny za kilogram, Cena jednostkowa, Shrinkflacja, Downsizing, cena za kg, najtańszy sklep, Biedronka, Lidl, Dino, Auchan, Carrefour',
    h1KeywordKicker: 'Kalkulator ceny za kilogram, Cena jednostkowa i Shrinkflacja / Downsizing',
    faqHeading: 'FAQ: Kalkulator ceny za kilogram, cena jednostkowa i downsizing',
    faqSubheading:
      'Dowiedz się, jak obliczyć prawdziwą cenę jednostkową (zł/kg, zł/l) i wykryć zmniejszone opakowania.',
    faqs: [
      {
        question: 'Jak działa kalkulator ceny za kilogram i ceny jednostkowej KiloRadar?',
        answer:
          'KiloRadar automatycznie przelicza każdą gramaturę i objętość (gramy, dekagramy, kilogramy, mililitry, litry i wielopaki) na cenę jednostkową w zł za kilogram (zł/kg) lub zł za litr (zł/l).',
      },
      {
        question: 'Czym jest shrinkflacja (downsizing) i jak ją obliczacie?',
        answer:
          'Downsizing to zmniejszenie wagi produktu (np. masła z 200 g do 170 g lub czekolady ze 100 g do 90 g) przy zachowaniu ceny. Obliczamy realny wzrost ceny za kg wzorem ((nowaCena / nowaWaga) / (staraCena / staraWaga) - 1) × 100.',
      },
      {
        question: 'Który sklep w Polsce oferuje najtańszy koszyk zakupowy?',
        answer:
          'Porównujemy koszt koszyka zakupowego na 1 tydzień, 1 miesiąc i 1 rok w sieciach Biedronka, Lidl, Dino, Auchan i Carrefour.',
      },
      {
        question: 'Czy mogę zeskanować kod kreskowy produktu aparatem w telefonie?',
        answer:
          'Tak! Kliknij «Skanuj aparatem» lub wpisz kod EAN, aby pobrać gramaturę z Open Food Facts i od razu obliczyć cenę za kilogram.',
      },
    ],
    share: {
      label: 'Udostępnij kalkulator ceny za kilogram i downsizingu:',
      copyLink: 'Kopiuj link',
      copiedConfirm: 'Skopiowano link!',
      shareText:
        'Oblicz realną cenę za kilogram i wykryj downsizing w sklepach z KiloRadar:',
    },
  },
  de: {
    canonicalUrl: `${SITE_BASE_URL}/de/`,
    ogLocale: 'de_DE',
    keywords:
      'Kilopreis Rechner, Grundpreis berechnen, Mogelpackung, Shrinkflation, Preis pro Kilo berechnen, Supermarkt Preisvergleich, Aldi, Lidl, Kaufland, REWE, Edeka',
    h1KeywordKicker: 'Kilopreis Rechner, Grundpreis berechnen & Mogelpackung / Shrinkflation',
    faqHeading: 'Häufige Fragen: Kilopreis Rechner, Grundpreis berechnen & Mogelpackungen',
    faqSubheading:
      'So berechnen Sie in Sekunden den echten Grundpreis (€/kg und €/l) und entlarven versteckte Shrinkflation im Supermarkt.',
    faqs: [
      {
        question: 'Wie funktioniert der Kilopreis Rechner zum Grundpreis berechnen?',
        answer:
          'KiloRadar rechnet jede Packungsgröße (Gramm, Kilogramm, Milliliter, Liter sowie Multipacks) automatisch in den standardisierten Grundpreis pro Kilogramm (€/kg) oder pro Liter (€/l) um.',
      },
      {
        question: 'Was ist eine Mogelpackung (Shrinkflation) und wie wird sie berechnet?',
        answer:
          'Bei einer Mogelpackung sinkt der Inhalt (z.B. von 500 g auf 400 g), während der Preis gleich bleibt oder steigt. Unsere Formel ((neuerPreis / neueMenge) / (alterPreis / alteMenge) - 1) × 100 zeigt den exakten prozentualen Aufpreis pro Kilo.',
      },
      {
        question: 'Welcher Supermarkt in Deutschland hat den günstigsten Warenkorb?',
        answer:
          'Anhand realer Grundpreise vergleicht KiloRadar den Wocheneinkauf für 1 Woche, 1 Monat und 1 Jahr bei Aldi, Lidl, Kaufland, REWE und Edeka.',
      },
      {
        question: 'Kann ich Barcodes direkt mit der Smartphone-Kamera scannen?',
        answer:
          'Ja! Über den Kamera-Scanner oder die EAN-Suche ruft KiloRadar die Füllmenge live bei Open Food Facts ab und berechnet sofort den Kilopreis.',
      },
    ],
    share: {
      label: 'Kilopreis Rechner & Mogelpackungs-Radar teilen:',
      copyLink: 'Link kopieren',
      copiedConfirm: 'Link kopiert!',
      shareText:
        'Mit dem KiloRadar Kilopreis Rechner sofort den echten Grundpreis berechnen und Mogelpackungen entlarven:',
    },
  },
  fr: {
    canonicalUrl: `${SITE_BASE_URL}/fr/`,
    ogLocale: 'fr_FR',
    keywords:
      'Calculateur prix au kilo, Prix unitaire, Réduflation, Shrinkflation, calculer prix au kg, comparateur supermarché, E.Leclerc, Lidl, Carrefour, Intermarché, Auchan',
    h1KeywordKicker: 'Calculateur prix au kilo, Prix unitaire & Réduflation / Shrinkflation',
    faqHeading: 'Questions fréquentes : Calculateur prix au kilo, prix unitaire et réduflation',
    faqSubheading:
      'Tout savoir pour calculer le vrai prix au kilo (€/kg et €/l) et repérer la réduflation dans les supermarchés français.',
    faqs: [
      {
        question: 'Comment fonctionne le calculateur de prix au kilo et prix unitaire ?',
        answer:
          'KiloRadar convertit automatiquement tous les grammages et volumes (g, kg, ml, cl, l et lots) en prix unitaire standardisé au kilo (€/kg) ou au litre (€/l).',
      },
      {
        question: 'Qu’est-ce que la réduflation (shrinkflation) et comment la détecter ?',
        answer:
          'La réduflation consiste à réduire le poids ou le volume d’un produit (par ex. de 250 g à 200 g) tout en maintenant ou augmentant son prix. Nous calculons la hausse réelle au kilo via ((nouveauPrix / nouvelleQuantité) / (ancienPrix / ancienneQuantité) - 1) × 100.',
      },
      {
        question: 'Quelle enseigne de supermarché est la moins chère en France ?',
        answer:
          'En comparant le prix au kilo réel d’un panier type, KiloRadar classe E.Leclerc, Lidl, Intermarché, Carrefour et Auchan sur 1 semaine, 1 mois et 1 an.',
      },
      {
        question: 'Puis-je scanner un code-barres avec mon téléphone en magasin ?',
        answer:
          'Oui, utilisez le bouton « Scanner avec la caméra » ou la barre de recherche EAN pour récupérer le grammage via Open Food Facts et calculer le prix au kilo instantanément.',
      },
    ],
    share: {
      label: 'Partager le calculateur de prix au kilo & radar anti-réduflation :',
      copyLink: 'Copier le lien',
      copiedConfirm: 'Lien copié !',
      shareText:
        'Calculez le vrai prix au kilo et démasquez la réduflation en supermarché avec KiloRadar :',
    },
  },
  es: {
    canonicalUrl: `${SITE_BASE_URL}/es/`,
    ogLocale: 'es_ES',
    keywords:
      'Calculadora precio por kilo, Precio unitario, Reduflación, Shrinkflation, calcular precio por kg, supermercado más barato, Mercadona, Lidl, Carrefour, Aldi, Dia',
    h1KeywordKicker: 'Calculadora precio por kilo, Precio unitario y Reduflación / Shrinkflation',
    faqHeading: 'Preguntas frecuentes: Calculadora precio por kilo, precio unitario y reduflación',
    faqSubheading:
      'Aprende a calcular el verdadero precio unitario (€/kg y €/l) y detectar envases reducidos en el supermercado.',
    faqs: [
      {
        question: '¿Cómo funciona la calculadora de precio por kilo y precio unitario?',
        answer:
          'KiloRadar convierte automáticamente cualquier peso o volumen (gramos, kilos, mililitros, litros y packs ahorro) en un precio unitario estandarizado en €/kg o €/l.',
      },
      {
        question: '¿Qué es la reduflación (shrinkflation) y cómo se calcula?',
        answer:
          'La reduflación ocurre cuando un fabricante reduce el contenido del envase (por ejemplo, de 250 g a 200 g) manteniendo o subiendo el precio. Calculamos la subida real por kilo con ((nuevoPrecio / nuevaCantidad) / (antiguoPrecio / antiguaCantidad) - 1) × 100.',
      },
      {
        question: '¿Qué supermercado tiene la cesta de la compra más barata en España?',
        answer:
          'Comparando el precio unitario real de los básicos y marcas habituales, KiloRadar muestra el coste para 1 semana, 1 mes y 1 año en Lidl, Aldi, Mercadona, Dia y Carrefour.',
      },
      {
        question: '¿Puedo escanear códigos de barras con la cámara del móvil?',
        answer:
          '¡Sí! Pulsa en «Escanear con cámara» o introduce cualquier código EAN para obtener el peso de Open Food Facts y calcular el precio por kilo al instante.',
      },
    ],
    share: {
      label: 'Compartir calculadora de precio por kilo y radar de reduflación:',
      copyLink: 'Copiar enlace',
      copiedConfirm: '¡Enlace copiado!',
      shareText:
        'Calcula el verdadero precio por kilo y descubre la reduflación en el súper con KiloRadar:',
    },
  },
};

export function buildJsonLdGraph(
  code: CountryRouteCode,
  seoTitle: string,
  seoDescription: string,
  currencyCode: string,
  htmlLang: string
) {
  const meta = SEO_METADATA_BY_LOCALE[code];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${meta.canonicalUrl}#webapp`,
        name: 'KiloRadar',
        headline: seoTitle,
        description: seoDescription,
        url: meta.canonicalUrl,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        inLanguage: htmlLang,
        isAccessibleForFree: true,
        browserRequirements: 'Requires JavaScript. Supports HTML5 camera BarcodeDetector.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: currencyCode,
        },
        author: {
          '@type': 'Organization',
          name: 'KM TECH LABS',
          url: SITE_BASE_URL,
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'support@kiloradar.com',
            contactType: 'customer support',
          },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${meta.canonicalUrl}#faq`,
        inLanguage: htmlLang,
        mainEntity: meta.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };
}
