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
  { hreflang: 'nb', href: `${SITE_BASE_URL}/no/` },
  { hreflang: 'sv', href: `${SITE_BASE_URL}/sv/` },
  { hreflang: 'da', href: `${SITE_BASE_URL}/da/` },
  { hreflang: 'pl', href: `${SITE_BASE_URL}/pl/` },
  { hreflang: 'de', href: `${SITE_BASE_URL}/de/` },
  { hreflang: 'fr', href: `${SITE_BASE_URL}/fr/` },
  { hreflang: 'es', href: `${SITE_BASE_URL}/es/` },
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
        question: 'How does KiloRadar work out the real price per kilo?',
        answer:
          'It turns every pack size (g, kg, ml, l, oz, lb, fl oz and multipacks) into one unit price, so you can compare two products fairly in seconds.',
      },
      {
        question: 'What is shrinkflation?',
        answer:
          'It is when a pack gets smaller (say from 250g to 200g) but the price stays the same or goes up. We work out the real increase with ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100.',
      },
      {
        question: 'How do you compare weekly grocery baskets?',
        answer:
          'We compare stores using prices that volunteers measured in shops (Open Prices), for products with a measured price in at least two chains. If we do not have enough measurements in your country, we say so instead of guessing.',
      },
      {
        question: 'Can I scan a barcode with my phone?',
        answer:
          'Yes. Tap “Scan with camera” or type in any EAN/UPC code. We fetch the pack size from Open Food Facts and work out the unit price on the spot.',
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
        question: 'Can I use ounces, pounds and fluid ounces?',
        answer:
          'Yes. Type in sizes like “16 oz”, “14.5 oz”, “1.5 lb”, “52 fl oz” or metric “500 g”, and we compare the unit prices and flag shrinkflation for you.',
      },
      {
        question: 'How do you work out the hidden cost of shrinkflation?',
        answer:
          'Say a 25.9 oz coffee canister shrinks to 22.6 oz, or a 52 fl oz orange juice bottle drops to 46 fl oz. Our formula ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100 shows how much the true unit cost went up.',
      },
      {
        question: 'Which US grocery store has the lowest weekly basket?',
        answer:
          'We compare stores using prices that volunteers measured in shops (Open Prices), for products with a measured price in at least two chains. If we do not have enough measurements in your country, we say so instead of guessing.',
      },
      {
        question: 'Can I scan UPC barcodes in the store?',
        answer:
          'Yes. Use the camera scanner or type in any UPC/EAN code. We fetch the product size from Open Food Facts and work out the real price per ounce, pound or kilo.',
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
        question: 'How does KiloRadar work out the real price per kilo (£/kg)?',
        answer:
          'We turn every pack size (grams, kilograms, millilitres, litres and multipacks) into one £/kg or £/l price, so you can compare any two items fairly.',
      },
      {
        question: 'How can I spot a smaller pack?',
        answer:
          'Say a sharing bar drops from 200g to 180g, or butter shrinks from 500g to 400g. We work out the exact unit-price jump with ((newPrice / newAmount) / (oldPrice / oldAmount) - 1) × 100.',
      },
      {
        question: 'Which UK supermarket is cheapest for a weekly shop?',
        answer:
          'We compare stores using prices that volunteers measured in shops (Open Prices), for products with a measured price in at least two chains. If we do not have enough measurements in your country, we say so instead of guessing.',
      },
      {
        question: 'Can I scan barcodes on my mobile?',
        answer:
          'Yes. Tap “Scan with camera” to scan any EAN barcode. We look it up in Open Food Facts and show the real £/kg straight away.',
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
        question: 'Hvordan regner KiloRadar ut kiloprisen?',
        answer:
          'KiloRadar gjør om alle pakningsstørrelser (gram, hektogram, kilo, milliliter, desiliter, liter og stykk/multipack) til én enhetspris i kr per kilo (kr/kg) eller kr per liter (kr/l).',
      },
      {
        question: 'Hva er krympflasjon?',
        answer:
          'Det er når innholdet i pakken blir mindre (for eksempel fra 250 g til 200 g), mens prisen i hylla er lik eller går opp. Vi regner ut økningen i kilopris med formelen ((nyPris / nyMengde) / (gammelPris / gammelMengde) - 1) × 100.',
      },
      {
        question: 'Hvilken matbutikk er billigst på ukeshandelen i Norge?',
        answer:
          'Vi sammenligner butikker med priser som frivillige har målt i butikk (Open Prices), for varer med målt pris i minst to kjeder. Har vi ikke nok målinger i landet ditt, sier vi det i stedet for å gjette.',
      },
      {
        question: 'Kan jeg skanne strekkoder med mobilen i butikken?',
        answer:
          'Ja. Trykk på «Skann med kamera», eller skriv inn EAN-strekkoden. Da henter vi pakningsvekten fra Open Food Facts og regner ut kiloprisen med en gang.',
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
        question: 'Hur räknar KiloRadar ut kilopriset?',
        answer:
          'KiloRadar gör om alla vikter och volymer (gram, hekto, kilo, milliliter, deciliter, liter och flerpack) till ett jämförpris i kr/kg eller kr/l.',
      },
      {
        question: 'Vad är krympflation?',
        answer:
          'Det är när förpackningen blir mindre (till exempel kaffe från 450 g till 400 g) utan att priset sänks. Vi räknar ut ökningen i jämförpris med formeln ((nyttPris / nyMängd) / (gammaltPris / gammalMängd) - 1) × 100.',
      },
      {
        question: 'Vilken matbutik har billigast matkasse i Sverige?',
        answer:
          'Vi jämför butiker med priser som frivilliga har mätt i butik (Open Prices), för varor med uppmätt pris i minst två kedjor. Har vi inte tillräckligt med mätningar i ditt land säger vi det i stället för att gissa.',
      },
      {
        question: 'Kan jag skanna streckkoder med mobilen?',
        answer:
          'Ja. Tryck på «Skanna med kamera» eller skriv in varans EAN-kod. Då hämtar vi vikten från Open Food Facts och räknar ut kilopriset direkt.',
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
        question: 'Hvordan regner KiloRadar kiloprisen ud?',
        answer:
          'KiloRadar omregner alle pakningsstørrelser (gram, kilo, milliliter, liter og multipack) til én enhedspris i kr. pr. kilo (kr./kg) eller kr. pr. liter (kr./l).',
      },
      {
        question: 'Hvad er skrumpflation?',
        answer:
          'Det er, når mængden i pakken bliver mindre (for eksempel fra 500 g til 400 g), mens prisen er uændret eller stiger. Vi regner stigningen pr. kilo ud med ((nyPris / nyMængde) / (gammelPris / gammelMængde) - 1) × 100.',
      },
      {
        question: 'Hvilket supermarked er billigst i Danmark?',
        answer:
          'Vi sammenligner butikker med priser, som frivillige har målt i butik (Open Prices), for varer med målt pris i mindst to kæder. Har vi ikke nok målinger i dit land, siger vi det i stedet for at gætte.',
      },
      {
        question: 'Kan jeg scanne stregkoder med mobilen?',
        answer:
          'Ja. Brug «Scan med kamera», eller skriv EAN-stregkoden i søgefeltet. Så slår vi varen op i Open Food Facts og viser kiloprisen med det samme.',
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
        question: 'Jak KiloRadar liczy cenę za kilogram?',
        answer:
          'KiloRadar przelicza każdą gramaturę i objętość (gramy, dekagramy, kilogramy, mililitry, litry i wielopaki) na cenę jednostkową w zł za kilogram (zł/kg) lub zł za litr (zł/l).',
      },
      {
        question: 'Czym jest shrinkflacja (downsizing)?',
        answer:
          'To sytuacja, gdy produkt jest mniejszy (np. masło z 200 g do 170 g albo czekolada ze 100 g do 90 g), a cena zostaje taka sama. Wzrost ceny za kg liczymy wzorem ((nowaCena / nowaWaga) / (staraCena / staraWaga) - 1) × 100.',
      },
      {
        question: 'Który sklep w Polsce ma najtańszy koszyk zakupowy?',
        answer:
          'Porównujemy sklepy na podstawie cen zmierzonych przez wolontariuszy w sklepach (Open Prices), dla produktów ze zmierzoną ceną w co najmniej dwóch sieciach. Jeśli w Twoim kraju jest za mało pomiarów, mówimy to wprost zamiast zgadywać.',
      },
      {
        question: 'Czy mogę zeskanować kod kreskowy telefonem?',
        answer:
          'Tak. Kliknij «Skanuj aparatem» albo wpisz kod EAN. Pobierzemy gramaturę z Open Food Facts i od razu policzymy cenę za kilogram.',
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
        question: 'Wie berechnet KiloRadar den Grundpreis?',
        answer:
          'KiloRadar rechnet jede Packungsgröße (Gramm, Kilogramm, Milliliter, Liter und Multipacks) in einen Grundpreis pro Kilogramm (€/kg) oder pro Liter (€/l) um.',
      },
      {
        question: 'Was ist eine Mogelpackung (Shrinkflation)?',
        answer:
          'Bei einer Mogelpackung sinkt der Inhalt (z. B. von 500 g auf 400 g), während der Preis gleich bleibt oder steigt. Mit ((neuerPreis / neueMenge) / (alterPreis / alteMenge) - 1) × 100 sehen wir den genauen Aufpreis pro Kilo.',
      },
      {
        question: 'Welcher Supermarkt in Deutschland hat den günstigsten Warenkorb?',
        answer:
          'Wir vergleichen Läden anhand von Preisen, die Freiwillige im Laden gemessen haben (Open Prices), für Produkte mit gemessenem Preis in mindestens zwei Ketten. Haben wir in deinem Land nicht genug Messungen, sagen wir das, statt zu raten.',
      },
      {
        question: 'Kann ich Barcodes mit der Handykamera scannen?',
        answer:
          'Ja. Nutze den Kamera-Scanner oder die EAN-Suche. Wir holen die Füllmenge live bei Open Food Facts und zeigen dir sofort den Kilopreis.',
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
        question: 'Comment KiloRadar calcule-t-il le prix au kilo ?',
        answer:
          'KiloRadar convertit tous les grammages et volumes (g, kg, ml, cl, l et lots) en un prix unitaire au kilo (€/kg) ou au litre (€/l).',
      },
      {
        question: 'Qu’est-ce que la réduflation (shrinkflation) ?',
        answer:
          'C’est quand le poids ou le volume d’un produit diminue (par exemple de 250 g à 200 g) alors que son prix reste le même ou augmente. Nous calculons la hausse réelle au kilo avec ((nouveauPrix / nouvelleQuantité) / (ancienPrix / ancienneQuantité) - 1) × 100.',
      },
      {
        question: 'Quelle enseigne est la moins chère en France ?',
        answer:
          'Nous comparons les enseignes avec des prix relevés en magasin par des bénévoles (Open Prices), pour les produits dont le prix est relevé dans au moins deux enseignes. Si nous n’avons pas assez de relevés dans votre pays, nous le disons au lieu de deviner.',
      },
      {
        question: 'Puis-je scanner un code-barres avec mon téléphone en magasin ?',
        answer:
          'Oui. Utilisez « Scanner avec la caméra » ou saisissez le code EAN. Nous récupérons le grammage via Open Food Facts et calculons le prix au kilo tout de suite.',
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
        question: '¿Cómo calcula KiloRadar el precio por kilo?',
        answer:
          'KiloRadar convierte cualquier peso o volumen (gramos, kilos, mililitros, litros y packs ahorro) en un precio unitario en €/kg o €/l.',
      },
      {
        question: '¿Qué es la reduflación (shrinkflation)?',
        answer:
          'Es cuando el envase trae menos contenido (por ejemplo, de 250 g a 200 g) y el precio se mantiene o sube. Calculamos la subida real por kilo con ((nuevoPrecio / nuevaCantidad) / (antiguoPrecio / antiguaCantidad) - 1) × 100.',
      },
      {
        question: '¿Qué supermercado tiene la cesta más barata en España?',
        answer:
          'Comparamos tiendas con precios que voluntarios han medido en tienda (Open Prices), para productos con precio medido en al menos dos cadenas. Si no tenemos suficientes mediciones en tu país, lo decimos en lugar de adivinar.',
      },
      {
        question: '¿Puedo escanear códigos de barras con el móvil?',
        answer:
          'Sí. Pulsa «Escanear con cámara» o escribe el código EAN. Buscamos el peso en Open Food Facts y calculamos el precio por kilo al instante.',
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
        '@type': 'Organization',
        '@id': `${SITE_BASE_URL}/#organization`,
        name: 'KiloRadar',
        url: `${SITE_BASE_URL}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_BASE_URL}/logo-512.png`,
          width: 512,
          height: 512,
        },
        parentOrganization: { '@type': 'Organization', name: 'KM TECH LABS' },
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@kiloradar.com',
          contactType: 'customer support',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        name: 'KiloRadar',
        url: `${SITE_BASE_URL}/`,
        inLanguage: htmlLang,
        publisher: { '@id': `${SITE_BASE_URL}/#organization` },
      },
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
        author: { '@id': `${SITE_BASE_URL}/#organization` },
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
