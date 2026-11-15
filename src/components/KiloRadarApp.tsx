'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ScanBarcode,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ArrowRight,
  ShieldAlert,
  PackageMinus,
  Calculator,
  Filter,
  Globe,
  Loader2,
  ShoppingCart,
  Trophy,
  RefreshCw,
  Store,
  BookOpen,
  Database,
  FileCheck2,
  Scale as ScaleIcon,
  ChevronDown,
  ChevronUp,
  Mail,
  X,
  Camera,
  Flag,
  Clock,
  Send,
  Share2,
  Link2,
  Check,
  HelpCircle,
} from 'lucide-react';
import {
  ProductItem,
  analyzeProductShrinkflation,
  findFuzzyProductMatches,
  rankCategoryAlternatives,
  calculateAnnualSavings,
  calculateNameSimilarity,
  rankStorePricesForProduct,
  calculateAverageCustomerBasketByStore,
  parseMeasure,
  normalizeUnitPrice,
} from '../utils/shrinkAlgorithm';
import {
  ALL_COUNTRY_LOCALES,
  COUNTRY_ROUTE_LIST,
  CountryLocaleConfig,
  CountryRouteCode,
  detectSuggestedLocaleFromBrowser,
} from '../locales';
import {
  SEO_METADATA_BY_LOCALE,
  HREFLANG_LINKS,
  SITE_BASE_URL,
  buildJsonLdGraph,
} from '../utils/seoData';

interface LiveOffProduct {
  code: string;
  product_name: string;
  brands: string;
  quantity: string;
  parsedMeasureStr: string;
  image_small_url?: string;
}

interface RealtimeUiStrings {
  scanWithCameraBtn: string;
  stopCameraBtn: string;
  cameraFallbackNotice: string;
  cameraModalTitle: string;
  cameraManualPlaceholder: string;
  nightlySyncStatus: (date: string) => string;
  reportShrunkBtn: string;
  reportModalTitle: string;
  reportModalSubtitle: string;
  reportEanLabel: string;
  reportNameLabel: string;
  reportOldWeightLabel: string;
  reportNewWeightLabel: string;
  reportSubmitBtn: string;
  reportEmailFallbackBtn: string;
  reportSuccessMsg: string;
  liveSearchResultsTitle: string;
  liveInteractivePriceLabel: string;
  liveCompareOldWeightLabel: string;
  loadIntoSimulatorBtn: string;
}

const REALTIME_UI_BY_LOCALE: Record<CountryRouteCode, RealtimeUiStrings> = {
  no: {
    scanWithCameraBtn: 'Skann med kamera',
    stopCameraBtn: 'Lukk kamera',
    cameraFallbackNotice:
      'Nettleseren din støtter ikke direkte kameraskanning (BarcodeDetector) – skriv eller lim inn strekkoden rett under:',
    cameraModalTitle: 'Hold strekkoden foran kameraet på mobilen eller PC-en',
    cameraManualPlaceholder: 'Eller skriv inn strekkode (f.eks. 7040913336684)...',
    nightlySyncStatus: (date) =>
      `Pris- og mengdedata overvåkes automatisk hver natt (03:00) · Sist synkronisert: ${date}`,
    reportShrunkBtn: 'Rapporter krympet vare',
    reportModalTitle: 'Har du oppdaget en vare som har krympet?',
    reportModalSubtitle:
      'Tips oss på 10 sekunder – bidraget ditt hjelper tusenvis av andre familier med å se den reelle kiloprisen.',
    reportEanLabel: 'Strekkode (EAN – valgfritt)',
    reportNameLabel: 'Hvilken vare gjelder det?',
    reportOldWeightLabel: 'Størrelse før (f.eks. 250 g)',
    reportNewWeightLabel: 'Ny størrelse nå (f.eks. 200 g)',
    reportSubmitBtn: 'Send inn tips',
    reportEmailFallbackBtn: 'Send som ferdig utfylt e-post',
    reportSuccessMsg: 'Tusen takk! Varen er lagt til i radaren og sendt til verifisering.',
    liveSearchResultsTitle: 'Direktetreff fra Open Food Facts (med interaktiv kilopriskalkulator):',
    liveInteractivePriceLabel: 'Sett butikkpris:',
    liveCompareOldWeightLabel: 'Før-vekt:',
    loadIntoSimulatorBtn: 'Bruk i kalkulator',
  },
  en: {
    scanWithCameraBtn: 'Scan with camera',
    stopCameraBtn: 'Close camera',
    cameraFallbackNotice:
      'Your browser does not support native camera barcode scanning (BarcodeDetector) — enter the EAN code below:',
    cameraModalTitle: 'Point your camera at the product barcode',
    cameraManualPlaceholder: 'Or type barcode (e.g. 7040913336684)...',
    nightlySyncStatus: (date) =>
      `Price & package weights monitored automatically every night (03:00 UTC) · Last synced: ${date}`,
    reportShrunkBtn: 'Report shrunk item',
    reportModalTitle: 'Spotted a package that quietly got smaller?',
    reportModalSubtitle:
      'Share it in 10 seconds — your tip helps fellow shoppers see the true price per kilo.',
    reportEanLabel: 'Barcode (EAN – optional)',
    reportNameLabel: 'Product name & brand',
    reportOldWeightLabel: 'Previous size (e.g. 250 g)',
    reportNewWeightLabel: 'New size today (e.g. 200 g)',
    reportSubmitBtn: 'Submit report',
    reportEmailFallbackBtn: 'Send as pre-filled email',
    reportSuccessMsg: 'Thank you! The item has been added to your radar and queued for review.',
    liveSearchResultsTitle: 'Live Open Food Facts matches (with interactive unit-price calculator):',
    liveInteractivePriceLabel: 'Store price:',
    liveCompareOldWeightLabel: 'Old weight:',
    loadIntoSimulatorBtn: 'Load in simulator',
  },
  us: {
    scanWithCameraBtn: 'Scan with camera',
    stopCameraBtn: 'Close camera',
    cameraFallbackNotice:
      'Your browser does not support native camera barcode scanning (BarcodeDetector) — enter the UPC/EAN code below:',
    cameraModalTitle: 'Point your camera at the product UPC / barcode',
    cameraManualPlaceholder: 'Or type UPC/EAN barcode (e.g. 0028400516464)...',
    nightlySyncStatus: (date) =>
      `US package weights (oz, lb, fl oz) & prices monitored nightly (03:00 UTC) · Last synced: ${date}`,
    reportShrunkBtn: 'Report shrunk item',
    reportModalTitle: 'Spotted a package that quietly lost ounces?',
    reportModalSubtitle:
      'Share it in 10 seconds — your tip helps fellow US shoppers see the true unit price per ounce or pound.',
    reportEanLabel: 'UPC / Barcode (optional)',
    reportNameLabel: 'Product name & brand',
    reportOldWeightLabel: 'Previous size (e.g. 16 oz, 52 fl oz)',
    reportNewWeightLabel: 'New size today (e.g. 14.5 oz, 46 fl oz)',
    reportSubmitBtn: 'Submit report',
    reportEmailFallbackBtn: 'Send as pre-filled email',
    reportSuccessMsg: 'Thank you! The item has been added to your radar and queued for review.',
    liveSearchResultsTitle: 'Live Open Food Facts matches (with interactive unit-price calculator):',
    liveInteractivePriceLabel: 'Store price ($):',
    liveCompareOldWeightLabel: 'Old weight:',
    loadIntoSimulatorBtn: 'Load in simulator',
  },
  uk: {
    scanWithCameraBtn: 'Scan with camera',
    stopCameraBtn: 'Close camera',
    cameraFallbackNotice:
      'Your browser does not support native camera barcode scanning (BarcodeDetector) — enter the EAN code below:',
    cameraModalTitle: 'Point your camera at the product barcode',
    cameraManualPlaceholder: 'Or type barcode (e.g. 7622210956163)...',
    nightlySyncStatus: (date) =>
      `UK pack weights & supermarket prices monitored automatically every night (03:00 UTC) · Last synced: ${date}`,
    reportShrunkBtn: 'Report shrunk item',
    reportModalTitle: 'Spotted a pack that quietly got smaller?',
    reportModalSubtitle:
      'Share it in 10 seconds — your tip helps British shoppers see the true price per kilo (£/kg).',
    reportEanLabel: 'Barcode (EAN – optional)',
    reportNameLabel: 'Product name & brand',
    reportOldWeightLabel: 'Previous size (e.g. 200 g)',
    reportNewWeightLabel: 'New size today (e.g. 180 g)',
    reportSubmitBtn: 'Submit report',
    reportEmailFallbackBtn: 'Send as pre-filled email',
    reportSuccessMsg: 'Thank you! The item has been added to your radar and queued for review.',
    liveSearchResultsTitle: 'Live Open Food Facts matches (with interactive £/kg calculator):',
    liveInteractivePriceLabel: 'Shelf price (£):',
    liveCompareOldWeightLabel: 'Old weight:',
    loadIntoSimulatorBtn: 'Load in simulator',
  },
  se: {
    scanWithCameraBtn: 'Skanna med kamera',
    stopCameraBtn: 'Stäng kamera',
    cameraFallbackNotice:
      'Din webbläsare saknar stöd för direkt kameraskanning (BarcodeDetector) – skriv in streckkoden nedan:',
    cameraModalTitle: 'Håll förpackningens streckkod framför kameran',
    cameraManualPlaceholder: 'Eller skriv in streckkod (t.ex. 7040913336684)...',
    nightlySyncStatus: (date) =>
      `Pris- och mängddata övervakas automatiskt varje natt (03:00) · Senast synkroniserad: ${date}`,
    reportShrunkBtn: 'Rapportera krympt vara',
    reportModalTitle: 'Har du hittat en förpackning som har krympt?',
    reportModalSubtitle:
      'Tipsa oss på 10 sekunder – ditt bidrag hjälper andra familjer att se det verkliga kilopriset.',
    reportEanLabel: 'Streckkod (EAN – valfritt)',
    reportNameLabel: 'Vilken vara gäller det?',
    reportOldWeightLabel: 'Tidigare storlek (t.ex. 450 g)',
    reportNewWeightLabel: 'Ny storlek idag (t.ex. 400 g)',
    reportSubmitBtn: 'Skicka in tips',
    reportEmailFallbackBtn: 'Skicka som förifyllt mejl',
    reportSuccessMsg: 'Stort tack! Varan har lagts till i radarn och skickats för kontroll.',
    liveSearchResultsTitle: 'Direktträffar från Open Food Facts (med interaktiv kilopriskalkylator):',
    liveInteractivePriceLabel: 'Butikspris:',
    liveCompareOldWeightLabel: 'Förr-vikt:',
    loadIntoSimulatorBtn: 'Använd i kalkylator',
  },
  dk: {
    scanWithCameraBtn: 'Scan med kamera',
    stopCameraBtn: 'Luk kamera',
    cameraFallbackNotice:
      'Din browser understøtter ikke direkte kamerascanning (BarcodeDetector) – indtast stregkoden herunder:',
    cameraModalTitle: 'Hold varens stregkode foran kameraet',
    cameraManualPlaceholder: 'Eller skriv stregkode (f.eks. 7040913336684)...',
    nightlySyncStatus: (date) =>
      `Pris- og mængdedata overvåges automatisk hver nat (03:00) · Sidst synkroniseret: ${date}`,
    reportShrunkBtn: 'Rapportér krympet vare',
    reportModalTitle: 'Har du opdaget en vare, der er skrumpet?',
    reportModalSubtitle:
      'Tip os på 10 sekunder – dit bidrag hjælper andre familier med at gennemskue den reelle kilopris.',
    reportEanLabel: 'Stregkode (EAN – valgfrit)',
    reportNameLabel: 'Hvilken vare drejer det sig om?',
    reportOldWeightLabel: 'Størrelse før (f.eks. 500 g)',
    reportNewWeightLabel: 'Ny størrelse nu (f.eks. 400 g)',
    reportSubmitBtn: 'Indsend tip',
    reportEmailFallbackBtn: 'Send som forudfyldt e-mail',
    reportSuccessMsg: 'Tusind tak! Varen er føjet til radaren og sendt til tjek.',
    liveSearchResultsTitle: 'Live-træf fra Open Food Facts (med interaktiv kiloprisberegner):',
    liveInteractivePriceLabel: 'Butikspris:',
    liveCompareOldWeightLabel: 'Før-vægt:',
    loadIntoSimulatorBtn: 'Brug i beregner',
  },
  pl: {
    scanWithCameraBtn: 'Skanuj aparatem',
    stopCameraBtn: 'Zamknij aparat',
    cameraFallbackNotice:
      'Twoja przeglądarka nie obsługuje bezpośredniego skanowania aparatem (BarcodeDetector) – wpisz kod EAN poniżej:',
    cameraModalTitle: 'Skieruj aparat na kod kreskowy produktu',
    cameraManualPlaceholder: 'Lub wpisz kod EAN (np. 7040913336684)...',
    nightlySyncStatus: (date) =>
      `Dane o cenach i gramaturze są aktualizowane automatycznie co noc (03:00) · Ostatnia synchronizacja: ${date}`,
    reportShrunkBtn: 'Zgłoś mniejsze opakowanie',
    reportModalTitle: 'Zauważyłeś produkt, którego opakowanie się zmniejszyło?',
    reportModalSubtitle:
      'Daj nam znać w 10 sekund – Twoje zgłoszenie pomoże innym rodzinom poznać prawdziwą cenę za kilogram.',
    reportEanLabel: 'Kod kreskowy (EAN – opcjonalnie)',
    reportNameLabel: 'Jakiego produktu to dotyczy?',
    reportOldWeightLabel: 'Dawna waga (np. 200 g)',
    reportNewWeightLabel: 'Nowa waga dzisiaj (np. 170 g)',
    reportSubmitBtn: 'Wyślij zgłoszenie',
    reportEmailFallbackBtn: 'Wyślij jako gotowy e-mail',
    reportSuccessMsg: 'Dziękujemy! Produkt został dodany do radaru i przekazany do weryfikacji.',
    liveSearchResultsTitle: 'Wyniki na żywo z Open Food Facts (z kalkulatorem ceny za kg):',
    liveInteractivePriceLabel: 'Cena w sklepie:',
    liveCompareOldWeightLabel: 'Dawna waga:',
    loadIntoSimulatorBtn: 'Użyj w kalkulatorze',
  },
  de: {
    scanWithCameraBtn: 'Mit Kamera scannen',
    stopCameraBtn: 'Kamera schließen',
    cameraFallbackNotice:
      'Ihr Browser unterstützt keinen direkten Kamera-Scan (BarcodeDetector) – geben Sie den EAN-Code unten ein:',
    cameraModalTitle: 'Halten Sie den Barcode vor die Kamera',
    cameraManualPlaceholder: 'Oder EAN-Code eingeben (z.B. 7622210100917)...',
    nightlySyncStatus: (date) =>
      `Grundpreise & Füllmengen werden jede Nacht automatisch geprüft (03:00 Uhr) · Stand: ${date}`,
    reportShrunkBtn: 'Mogelpackung melden',
    reportModalTitle: 'Haben Sie eine geschrumpfte Packung entdeckt?',
    reportModalSubtitle:
      'In 10 Sekunden melden – Ihr Hinweis hilft anderen Haushalten, den echten Kilopreis sofort zu erkennen.',
    reportEanLabel: 'Barcode (EAN – optional)',
    reportNameLabel: 'Produktname & Marke',
    reportOldWeightLabel: 'Frühere Menge (z.B. 500 g)',
    reportNewWeightLabel: 'Neue Menge heute (z.B. 400 g)',
    reportSubmitBtn: 'Hinweis absenden',
    reportEmailFallbackBtn: 'Als E-Mail senden',
    reportSuccessMsg: 'Vielen Dank! Das Produkt wurde zum Radar hinzugefügt.',
    liveSearchResultsTitle: 'Live-Treffer aus Open Food Facts (mit interaktivem Kilopreis Rechner):',
    liveInteractivePriceLabel: 'Marktpreis (€):',
    liveCompareOldWeightLabel: 'Vorher:',
    loadIntoSimulatorBtn: 'Im Rechner öffnen',
  },
  fr: {
    scanWithCameraBtn: 'Scanner avec la caméra',
    stopCameraBtn: 'Fermer la caméra',
    cameraFallbackNotice:
      'Votre navigateur ne prend pas en charge le scan caméra direct (BarcodeDetector) — saisissez le code EAN ci-dessous :',
    cameraModalTitle: 'Placez le code-barres devant la caméra',
    cameraManualPlaceholder: 'Ou saisissez le code EAN (ex. 3228021170029)...',
    nightlySyncStatus: (date) =>
      `Prix au kilo & grammages vérifiés automatiquement chaque nuit (03h00) · Synchro : ${date}`,
    reportShrunkBtn: 'Signaler une réduflation',
    reportModalTitle: 'Vous avez repéré un emballage qui a rétréci ?',
    reportModalSubtitle:
      'Partagez-le en 10 secondes — votre signalement aide des milliers de consommateurs à voir le vrai prix au kilo.',
    reportEanLabel: 'Code-barres (EAN – facultatif)',
    reportNameLabel: 'Nom du produit & marque',
    reportOldWeightLabel: 'Ancien poids (ex. 250 g)',
    reportNewWeightLabel: 'Nouveau poids (ex. 200 g)',
    reportSubmitBtn: 'Envoyer le signalement',
    reportEmailFallbackBtn: 'Envoyer par e-mail pré-rempli',
    reportSuccessMsg: 'Merci ! Le produit a été ajouté au radar et transmis pour vérification.',
    liveSearchResultsTitle: 'Résultats en direct Open Food Facts (avec calculateur prix au kilo) :',
    liveInteractivePriceLabel: 'Prix magasin (€) :',
    liveCompareOldWeightLabel: 'Ancien poids :',
    loadIntoSimulatorBtn: 'Charger dans le calculateur',
  },
  es: {
    scanWithCameraBtn: 'Escanear con cámara',
    stopCameraBtn: 'Cerrar cámara',
    cameraFallbackNotice:
      'Tu navegador no admite el escaneo directo por cámara (BarcodeDetector) — introduce el código EAN abajo:',
    cameraModalTitle: 'Apunta la cámara al código de barras del producto',
    cameraManualPlaceholder: 'O escribe el código EAN (ej. 8410100012001)...',
    nightlySyncStatus: (date) =>
      `Precios por kilo y pesos actualizados automáticamente cada noche (03:00) · Sincronizado: ${date}`,
    reportShrunkBtn: 'Reportar reduflación',
    reportModalTitle: '¿Has visto un envase que ahora trae menos cantidad?',
    reportModalSubtitle:
      'Avísanos en 10 segundos — tu aportación ayuda a miles de familias a ver el verdadero precio por kilo.',
    reportEanLabel: 'Código de barras (EAN – opcional)',
    reportNameLabel: 'Producto y marca',
    reportOldWeightLabel: 'Cantidad anterior (ej. 250 g)',
    reportNewWeightLabel: 'Cantidad actual (ej. 200 g)',
    reportSubmitBtn: 'Enviar aviso',
    reportEmailFallbackBtn: 'Enviar como correo pre-rellenado',
    reportSuccessMsg: '¡Muchas gracias! El producto se ha añadido al radar.',
    liveSearchResultsTitle: 'Resultados en vivo de Open Food Facts (con calculadora de precio por kg):',
    liveInteractivePriceLabel: 'Precio tienda (€):',
    liveCompareOldWeightLabel: 'Peso anterior:',
    loadIntoSimulatorBtn: 'Usar en la calculadora',
  },
};

function extractValidMeasureString(rawQuantity?: string): string {
  if (!rawQuantity) return '200 g';
  const cleaned = rawQuantity.replace(',', '.');
  const match = cleaned.match(
    /(\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs|g|kg|hg|ml|cl|dl|l|stk))/i
  );
  if (match) {
    try {
      parseMeasure(match[1]);
      return match[1];
    } catch {
      return '200 g';
    }
  }
  return '200 g';
}

/**
 * 1. Custom Geometric KiloRadar SVG Logo
 */
function KiloRadarLogo({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KiloRadar Logo"
    >
      <rect width="64" height="64" rx="16" fill="#070B12" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" stroke="#1E293B" strokeWidth="2" />
      <circle
        cx="32"
        cy="34"
        r="22"
        stroke="#10B981"
        strokeOpacity="0.25"
        strokeWidth="1.75"
        strokeDasharray="4 3"
      />
      <circle cx="32" cy="34" r="15" stroke="#10B981" strokeOpacity="0.45" strokeWidth="1.75" />
      <path
        d="M26 20C26 16.6863 28.6863 14 32 14C35.3137 14 38 16.6863 38 20V23H26V20Z"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M21 23H43L47 47C47.3 48.8 45.9 50.5 44 50.5H20C18.1 50.5 16.7 48.8 17 47L21 23Z"
        fill="#0F172A"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line x1="32" y1="36" x2="46" y2="22" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="36" r="3" fill="#10B981" />
      <circle cx="46" cy="22" r="4" fill="#EF4444" />
      <circle cx="46" cy="22" r="7" stroke="#EF4444" strokeOpacity="0.45" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * 2. Hero Vector Illustration (SVG):
 * Visually compares an older, larger package (emerald/neutral) vs a newer, shrunk package (alert red)
 * with explicit unit price increase.
 */
function ShrinkflationComparisonHeroSvg({
  locale,
  formatPrice,
}: {
  locale: CountryLocaleConfig;
  formatPrice: (val: number, decimals?: number) => string;
}) {
  const sampleProduct = locale.products[0];
  const analysis = analyzeProductShrinkflation(sampleProduct);

  return (
    <div className="rounded-xl bg-background/90 border border-border/90 p-3.5 overflow-hidden">
      <svg
        viewBox="0 0 420 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Visual comparison of old package vs shrunk package"
      >
        <line x1="12" y1="108" x2="408" y2="108" stroke="#1E293B" strokeWidth="1.5" />
        <line
          x1="12"
          y1="28"
          x2="408"
          y2="28"
          stroke="#1E293B"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* LEFT: OLD PACKAGE */}
        <g>
          <rect
            x="28"
            y="24"
            width="86"
            height="84"
            rx="8"
            fill="#064E3B"
            fillOpacity="0.35"
            stroke="#10B981"
            strokeWidth="2"
          />
          <rect x="38" y="34" width="66" height="14" rx="4" fill="#10B981" fillOpacity="0.2" />
          <text
            x="71"
            y="44"
            textAnchor="middle"
            fill="#6EE7B7"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            {locale.ui.oldPackageLabel.toUpperCase()}
          </text>
          <text
            x="71"
            y="68"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="15"
            fontWeight="800"
            fontFamily="sans-serif"
          >
            {sampleProduct.oldMeasure}
          </text>
          <text
            x="71"
            y="84"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            {formatPrice(sampleProduct.oldPrice)}
          </text>
          <rect x="34" y="91" width="74" height="13" rx="3" fill="#022C22" />
          <text
            x="71"
            y="100"
            textAnchor="middle"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            {formatPrice(analysis.oldUnitPrice)}/{analysis.baseUnit}
          </text>
        </g>

        {/* CENTER: ARROW & SHRINKFLATION DELTA BADGE */}
        <g>
          <path
            d="M132 66H188"
            stroke="#EF4444"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
          <path
            d="M183 61L190 66L183 71"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="130"
            y="38"
            width="62"
            height="20"
            rx="6"
            fill="#450A0A"
            stroke="#EF4444"
            strokeWidth="1.2"
          />
          <text
            x="161"
            y="51"
            textAnchor="middle"
            fill="#FCA5A5"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="monospace"
          >
            {analysis.sizeReductionPercent}%
          </text>
        </g>

        {/* RIGHT: NEW SHRUNK PACKAGE */}
        <g>
          <rect
            x="208"
            y="24"
            width="86"
            height="18"
            rx="4"
            fill="#EF4444"
            fillOpacity="0.08"
            stroke="#EF4444"
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          <rect
            x="208"
            y="40"
            width="86"
            height="68"
            rx="8"
            fill="#450A0A"
            fillOpacity="0.55"
            stroke="#EF4444"
            strokeWidth="2"
          />
          <text
            x="251"
            y="54"
            textAnchor="middle"
            fill="#FCA5A5"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            {locale.ui.newPackageLabel.toUpperCase()}
          </text>
          <text
            x="251"
            y="71"
            textAnchor="middle"
            fill="#F87171"
            fontSize="15"
            fontWeight="800"
            fontFamily="sans-serif"
          >
            {sampleProduct.newMeasure}
          </text>
          <text
            x="251"
            y="85"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {formatPrice(sampleProduct.newPrice)}
          </text>
          <rect x="214" y="91" width="74" height="13" rx="3" fill="#7F1D1D" />
          <text
            x="251"
            y="100"
            textAnchor="middle"
            fill="#FECACA"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            {formatPrice(analysis.newUnitPrice)}/{analysis.baseUnit}
          </text>
        </g>

        {/* FAR RIGHT: REAL UNIT PRICE SPIKE CALLOUT */}
        <g>
          <rect
            x="310"
            y="32"
            width="96"
            height="76"
            rx="10"
            fill="#0F172A"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <text
            x="358"
            y="50"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="8"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {locale.ui.shrinkflationBadge.toUpperCase()}
          </text>
          <text
            x="358"
            y="74"
            textAnchor="middle"
            fill="#F43F5E"
            fontSize="18"
            fontWeight="900"
            fontFamily="monospace"
          >
            +{analysis.shrinkIndex.toFixed(1)}%
          </text>
          <text
            x="358"
            y="92"
            textAnchor="middle"
            fill="#10B981"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            REAL/{analysis.baseUnit.toUpperCase()}
          </text>
        </g>

        <text x="71" y="123" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="sans-serif">
          100% vol
        </text>
        <text x="251" y="123" textAnchor="middle" fill="#F87171" fontSize="9" fontFamily="sans-serif">
          {100 + analysis.sizeReductionPercent}% vol
        </text>
      </svg>
    </div>
  );
}

/**
 * 3. Clean SVG Category Icons & Product Image Fallback Component
 */
function CategorySvgIcon({
  category,
  className = 'w-6 h-6',
}: {
  category: string;
  className?: string;
}) {
  const lower = category.toLowerCase();
  const isCoffeeOrSnack =
    lower.includes('kaffe') ||
    lower.includes('coffee') ||
    lower.includes('kawa') ||
    lower.includes('choko') ||
    lower.includes('fika');
  const isDairy =
    lower.includes('meieri') ||
    lower.includes('mejeri') ||
    lower.includes('dairy') ||
    lower.includes('nabiał');

  if (isCoffeeOrSnack) {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M7 12H21V20C21 23.866 17.866 27 14 27C10.134 27 7 23.866 7 20V12Z"
          fill="#10B981"
          fillOpacity="0.15"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M21 14H23.5C25.433 14 27 15.567 27 17.5C27 19.433 25.433 21 23.5 21H21"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M11 6C11 7.5 12.5 7.5 12.5 9M16 6C16 7.5 17.5 7.5 17.5 9"
          stroke="#34D399"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (isDairy) {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M5 17L24 7C26.2 9.5 27 12.8 27 17H5Z"
          fill="#10B981"
          fillOpacity="0.15"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect
          x="5"
          y="17"
          width="22"
          height="9"
          rx="1.5"
          fill="#0F172A"
          stroke="#10B981"
          strokeWidth="2"
        />
        <circle cx="11" cy="21.5" r="1.5" fill="#34D399" />
        <circle cx="17" cy="20.5" r="1" fill="#34D399" />
        <circle cx="21" cy="22.5" r="1.5" fill="#34D399" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 5H18V9H12V5Z"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 13C9 10.7909 10.7909 9 13 9H17C19.7614 9 22 11.2386 22 14V25C22 26.1046 21.1046 27 20 27H11C9.89543 27 9 26.1046 9 25V13Z"
        fill="#10B981"
        fillOpacity="0.15"
        stroke="#10B981"
        strokeWidth="2"
      />
      <circle cx="24.5" cy="8.5" r="2" stroke="#34D399" strokeWidth="1.5" />
      <circle cx="15.5" cy="18.5" r="2.5" stroke="#34D399" strokeWidth="1.75" />
    </svg>
  );
}

function ProductAvatar({ product }: { product: ProductItem }) {
  const [imgError, setImgError] = useState(false);

  if (product.imageUrl && !imgError) {
    return (
      <div className="w-11 h-11 rounded-xl bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
    );
  }

  return (
    <div
      className="w-11 h-11 rounded-xl bg-background/90 border border-border shrink-0 flex items-center justify-center shadow-inner"
      title={product.category}
    >
      <CategorySvgIcon category={product.category} className="w-6 h-6" />
    </div>
  );
}

/**
 * Responsive Social Share Row (Copy Link with visual confirmation, X/Twitter, Facebook, WhatsApp, Reddit, LinkedIn)
 */
function ShareButtonsBar({
  shareUrl,
  shareTitle,
  shareText,
  copyLabel,
  copiedLabel,
  barLabel,
}: {
  shareUrl: string;
  shareTitle: string;
  shareText: string;
  copyLabel: string;
  copiedLabel: string;
  barLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareText} ${shareUrl}`);
  const encodedTitleOnly = encodeURIComponent(shareTitle);
  const encodedTweet = encodeURIComponent(shareText);

  return (
    <div
      data-testid="social-share-bar"
      className="card-kilo px-4 py-3.5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Share2 className="w-4 h-4 text-savings shrink-0" />
        <span>{barLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          data-testid="share-copy-link-btn"
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
            copied
              ? 'bg-savings text-primary-foreground border-savings shadow-lg shadow-savings/20'
              : 'bg-background hover:bg-secondary text-savings border-savings/40'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>

        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTweet}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
          className="px-3 py-1.5 rounded-xl bg-background hover:bg-secondary border border-border hover:border-border text-xs font-semibold text-foreground hover:text-foreground transition"
        >
          𝕏 / Twitter
        </a>

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="px-3 py-1.5 rounded-xl bg-background hover:bg-secondary border border-border hover:border-border text-xs font-semibold text-foreground hover:text-foreground transition"
        >
          Facebook
        </a>

        <a
          href={`https://api.whatsapp.com/send?text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className="px-3 py-1.5 rounded-xl bg-background hover:bg-secondary border border-border hover:border-border text-xs font-semibold text-savings hover:text-savings transition"
        >
          WhatsApp
        </a>

        <a
          href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitleOnly}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Reddit"
          className="px-3 py-1.5 rounded-xl bg-background hover:bg-secondary border border-border hover:border-border text-xs font-semibold text-warn hover:text-warn transition"
        >
          Reddit
        </a>

        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="px-3 py-1.5 rounded-xl bg-background hover:bg-secondary border border-border hover:border-border text-xs font-semibold text-warn hover:text-warn transition"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
}

export interface KiloRadarAppProps {
  initialCountryCode?: CountryRouteCode;
  onNavigateCountry?: (code: CountryRouteCode, targetPath: string) => void;
}

export default function KiloRadarApp({
  initialCountryCode = 'en',
  onNavigateCountry,
}: KiloRadarAppProps) {
  const [countryCode, setCountryCode] = useState<CountryRouteCode>(initialCountryCode);

  useEffect(() => {
    setCountryCode(initialCountryCode);
  }, [initialCountryCode]);

  const localeConfig = ALL_COUNTRY_LOCALES[countryCode] || ALL_COUNTRY_LOCALES.en;
  const dict = localeConfig.ui;
  const rtUi = REALTIME_UI_BY_LOCALE[countryCode] || REALTIME_UI_BY_LOCALE.en;
  const seoMeta = SEO_METADATA_BY_LOCALE[countryCode] || SEO_METADATA_BY_LOCALE.en;

  // Products state initialized & updated per country (with automatic /api/products?lang=[country] sync)
  const [productsByCountry, setProductsByCountry] = useState<Record<CountryRouteCode, ProductItem[]>>(
    () => ({
      en: ALL_COUNTRY_LOCALES.en.products,
      us: ALL_COUNTRY_LOCALES.us.products,
      uk: ALL_COUNTRY_LOCALES.uk.products,
      no: ALL_COUNTRY_LOCALES.no.products,
      se: ALL_COUNTRY_LOCALES.se.products,
      dk: ALL_COUNTRY_LOCALES.dk.products,
      pl: ALL_COUNTRY_LOCALES.pl.products,
      de: ALL_COUNTRY_LOCALES.de.products,
      fr: ALL_COUNTRY_LOCALES.fr.products,
      es: ALL_COUNTRY_LOCALES.es.products,
    })
  );

  const [lastSyncedDate, setLastSyncedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Fetch updated products from static CDN JSON `/data/[country].json` (Python pipeline)
  // with fallback to `/api/products` and `src/locales/` configs
  useEffect(() => {
    let active = true;
    const staticRegion = countryCode === 'en' ? 'global' : countryCode;

    const mergeSyncedProducts = (
      baseProducts: ProductItem[],
      incomingProducts: ProductItem[]
    ): ProductItem[] => {
      const byId = new Map<string, ProductItem>();
      for (const item of baseProducts) {
        byId.set(item.id, item);
      }
      for (const incoming of incomingProducts) {
        if (!incoming || !incoming.id) continue;
        const existing = byId.get(incoming.id);
        byId.set(incoming.id, existing ? { ...existing, ...incoming } : incoming);
      }
      return Array.from(byId.values());
    };

    fetch(`/data/${staticRegion}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.lastSynced) setLastSyncedDate(data.lastSynced);
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProductsByCountry((prev) => ({
            ...prev,
            [countryCode]: mergeSyncedProducts(
              ALL_COUNTRY_LOCALES[countryCode]?.products || prev[countryCode] || [],
              data.products
            ),
          }));
        }
      })
      .catch(() => {
        // Fallback to Cloudflare Functions D1 endpoint or src/locales/ config
      });

    fetch(`/api/products?lang=${countryCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.lastSynced) setLastSyncedDate(data.lastSynced);
        if (Array.isArray(data.products) && data.products.length > 0 && data.source === 'cloudflare-d1') {
          setProductsByCountry((prev) => ({
            ...prev,
            [countryCode]: mergeSyncedProducts(
              prev[countryCode] || ALL_COUNTRY_LOCALES[countryCode]?.products || [],
              data.products
            ),
          }));
        }
      })
      .catch(() => {
        // Automatic fallback to local src/locales/ config
      });

    return () => {
      active = false;
    };
  }, [countryCode]);

  const products = productsByCountry[countryCode] || localeConfig.products;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activePresetId, setActivePresetId] = useState<string>(
    localeConfig.products[0]?.id || ''
  );

  // Smart Language Suggestion Banner on '/'
  const [suggestedLocale, setSuggestedLocale] = useState<CountryLocaleConfig | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (countryCode === 'en' && typeof navigator !== 'undefined') {
      const detected = detectSuggestedLocaleFromBrowser(navigator.language);
      setSuggestedLocale(detected);
    } else {
      setSuggestedLocale(null);
    }
  }, [countryCode]);

  // Dynamic SEO <head> management: title, meta description, keywords, canonical, hreflang, Open Graph, Twitter Cards & JSON-LD
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = localeConfig.htmlLang;
    document.title = localeConfig.seoTitle;

    const upsertMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    upsertMeta('name', 'description', localeConfig.seoDescription);
    upsertMeta('name', 'keywords', seoMeta.keywords);

    // Self-referencing canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', seoMeta.canonicalUrl);

    // Complete hreflang links for all 10 routes + x-default
    HREFLANG_LINKS.forEach(({ hreflang, href }) => {
      let link = document.querySelector(
        `link[rel="alternate"][hreflang="${hreflang}"]`
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    });

    // Open Graph & Twitter Card tags (1200x630 PNG localized per market)
    const ogImageUrl = `${SITE_BASE_URL}/og/og-${countryCode}.png`;
    upsertMeta('property', 'og:title', localeConfig.seoTitle);
    upsertMeta('property', 'og:description', localeConfig.seoDescription);
    upsertMeta('property', 'og:url', seoMeta.canonicalUrl);
    upsertMeta('property', 'og:locale', seoMeta.ogLocale);
    upsertMeta('property', 'og:image', ogImageUrl);
    upsertMeta('property', 'og:image:secure_url', ogImageUrl);
    upsertMeta('property', 'og:image:type', 'image/png');
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', localeConfig.seoTitle);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', localeConfig.seoTitle);
    upsertMeta('name', 'twitter:description', localeConfig.seoDescription);
    upsertMeta('name', 'twitter:url', seoMeta.canonicalUrl);
    upsertMeta('name', 'twitter:image', ogImageUrl);
    upsertMeta('name', 'twitter:image:alt', localeConfig.seoTitle);

    // Schema.org Structured Data (WebApplication + FAQPage JSON-LD)
    const jsonLdData = buildJsonLdGraph(
      countryCode,
      localeConfig.seoTitle,
      localeConfig.seoDescription,
      localeConfig.currencyCode,
      localeConfig.htmlLang
    );
    let scriptEl = document.getElementById('kiloradar-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'kiloradar-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLdData);
  }, [countryCode, localeConfig, seoMeta]);

  // Collapsible details per product card (compact view by default)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Basket scanner state
  const [basketPeriod, setBasketPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [householdProfileId, setHouseholdProfileId] = useState<'single' | 'couple' | 'family'>(
    'couple'
  );
  const [isScanningStores, setIsScanningStores] = useState(false);
  const [customScanTimestamp, setCustomScanTimestamp] = useState<string | null>(null);

  // Simulator / Custom Test state
  const [simName, setSimName] = useState(localeConfig.products[0]?.name || 'Coffee');
  const [simCategory, setSimCategory] = useState<string>(localeConfig.categories[0] || '');
  const [simOldMeasure, setSimOldMeasure] = useState(
    localeConfig.products[0]?.oldMeasure || '250 g'
  );
  const [simNewMeasure, setSimNewMeasure] = useState(
    localeConfig.products[0]?.newMeasure || '200 g'
  );
  const [simOldPrice, setSimOldPrice] = useState(
    (localeConfig.products[0]?.oldPrice || 4.0).toFixed(2)
  );
  const [simNewPrice, setSimNewPrice] = useState(
    (localeConfig.products[0]?.newPrice || 4.5).toFixed(2)
  );
  const [simImageUrl, setSimImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const first = localeConfig.products[0];
    setSelectedCategory('ALL');
    setSearchQuery('');
    setCustomScanTimestamp(null);
    setLiveResults([]);
    setLiveStatusMsg(null);
    if (first) {
      setActivePresetId(first.id);
      setSimName(first.name.replace(/\s+\d+(?:[.,]\d+)?\s*(g|kg|ml|l|stk|oz|lb|fl\s*oz)$/i, ''));
      setSimCategory(first.category);
      setSimOldMeasure(first.oldMeasure);
      setSimNewMeasure(first.newMeasure);
      setSimOldPrice(first.oldPrice.toFixed(2));
      setSimNewPrice(first.newPrice.toFixed(2));
      setSimImageUrl(first.imageUrl);
    }
  }, [countryCode, localeConfig]);

  // Live Open Food Facts lookup & interactive calculator state
  const [liveBarcodeOrQuery, setLiveBarcodeOrQuery] = useState('');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResults, setLiveResults] = useState<LiveOffProduct[]>([]);
  const [liveStatusMsg, setLiveStatusMsg] = useState<string | null>(null);
  const [liveCustomPrices, setLiveCustomPrices] = useState<Record<string, string>>({});
  const [liveCustomOldWeights, setLiveCustomOldWeights] = useState<Record<string, string>>({});

  // Camera BarcodeDetector Scanner Modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean>(true);
  const [cameraManualEan, setCameraManualEan] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // "Report Shrunk Item" Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportEan, setReportEan] = useState('');
  const [reportName, setReportName] = useState('');
  const [reportOldWeight, setReportOldWeight] = useState('250 g');
  const [reportNewWeight, setReportNewWeight] = useState('200 g');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Per-card slider state (monthly purchases per product ID)
  const [monthlySliders, setMonthlySliders] = useState<Record<string, number>>({});

  const formatMoney = (amount: number, decimals = 2): string => {
    const formatted = amount.toLocaleString(localeConfig.numberLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return localeConfig.currencyPrefix
      ? `${localeConfig.currencySymbol}${formatted}`
      : `${formatted} ${localeConfig.currencySymbol}`;
  };

  const handleCountrySwitch = (nextCode: CountryRouteCode) => {
    const targetConfig = ALL_COUNTRY_LOCALES[nextCode];
    setCountryCode(nextCode);
    if (onNavigateCountry) {
      onNavigateCountry(nextCode, targetConfig.path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetConfig.path);
    }
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const featuredPresets = useMemo(
    () => products.filter((p) => p.isFeaturedPreset),
    [products]
  );

  const handleSelectPreset = (preset: ProductItem) => {
    setActivePresetId(preset.id);
    setSimName(preset.name.replace(/\s+\d+(?:[.,]\d+)?\s*(g|kg|ml|l|stk|oz|lb|fl\s*oz)$/i, ''));
    setSimCategory(preset.category);
    setSimOldMeasure(preset.oldMeasure);
    setSimNewMeasure(preset.newMeasure);
    setSimOldPrice(preset.oldPrice.toFixed(2));
    setSimNewPrice(preset.newPrice.toFixed(2));
    setSimImageUrl(preset.imageUrl);
  };

  const handleTriggerWeeklyStoreScan = () => {
    setIsScanningStores(true);
    setTimeout(() => {
      setIsScanningStores(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString(localeConfig.numberLocale, {
        hour: '2-digit',
        minute: '2-digit',
      });
      const chainList = localeConfig.stores.map((s) => s.store).join(', ');
      setCustomScanTimestamp(`${localeConfig.ui.lastScannedValue} (${timeStr} • ${chainList})`);
    }, 550);
  };

  // Core Open Food Facts Query (used by both top search bar, barcode input, and camera scanner)
  const executeOpenFoodFactsLookup = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;

    setLiveLoading(true);
    setLiveStatusMsg(null);
    setLiveResults([]);

    const countryTagMap: Record<CountryRouteCode, string> = {
      en: 'world',
      us: 'united-states',
      uk: 'united-kingdom',
      no: 'norway',
      se: 'sweden',
      dk: 'denmark',
      pl: 'poland',
      de: 'germany',
      fr: 'france',
      es: 'spain',
    };

    try {
      if (/^\d{8,14}$/.test(q)) {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${q}.json`);
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          const parsedMeasureStr = extractValidMeasureString(data.product.quantity);
          const item: LiveOffProduct = {
            code: data.code || q,
            product_name:
              data.product.product_name_no ||
              data.product.product_name_sv ||
              data.product.product_name_da ||
              data.product.product_name_pl ||
              data.product.product_name ||
              'Product',
            brands: data.product.brands || 'Brand',
            quantity: data.product.quantity || parsedMeasureStr,
            parsedMeasureStr,
            image_small_url:
              data.product.image_front_small_url || data.product.image_small_url,
          };
          setLiveResults([item]);
          applyLiveProductToSimulator(item);
          setLiveStatusMsg(rtUi.liveSearchResultsTitle);
        } else {
          setLiveStatusMsg('No barcode match found in Open Food Facts.');
        }
      } else {
        const countryFilter =
          countryCode === 'en' ? '' : `&countries=${countryTagMap[countryCode]}`;
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          q
        )}&search_simple=1&action=process${countryFilter}&json=1&page_size=8`;
        const res = await fetch(url);
        const data = await res.json();
        const found: LiveOffProduct[] = (data.products || [])
          .filter((p: Record<string, unknown>) => p.product_name)
          .slice(0, 6)
          .map((p: Record<string, string>) => {
            const parsedMeasureStr = extractValidMeasureString(p.quantity);
            return {
              code: p.code || '7030000000000',
              product_name:
                p.product_name_no ||
                p.product_name_sv ||
                p.product_name_da ||
                p.product_name_pl ||
                p.product_name ||
                'Grocery Item',
              brands: p.brands || '',
              quantity: p.quantity || parsedMeasureStr,
              parsedMeasureStr,
              image_small_url: p.image_front_small_url || p.image_small_url,
            };
          });

        setLiveResults(found);
        if (found.length > 0) {
          applyLiveProductToSimulator(found[0]);
          setLiveStatusMsg(rtUi.liveSearchResultsTitle);
        } else {
          setLiveStatusMsg('No matching items found in Open Food Facts.');
        }
      }
    } catch {
      setLiveStatusMsg('Open Food Facts is temporarily unreachable.');
    } finally {
      setLiveLoading(false);
    }
  };

  const handleLiveOffLookup = () => {
    executeOpenFoodFactsLookup(liveBarcodeOrQuery);
  };

  const applyLiveProductToSimulator = (item: LiveOffProduct) => {
    const cleanName = `${item.brands ? item.brands + ' ' : ''}${item.product_name}`.trim();
    setSimName(cleanName);
    setSimImageUrl(item.image_small_url);
    const detectedNew = item.parsedMeasureStr || '200 g';
    setSimNewMeasure(detectedNew);
    const numMatch = detectedNew.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      const unit = numMatch[2];
      const suggestedOld = Math.round(val * 1.15);
      setSimOldMeasure(`${suggestedOld} ${unit}`);
    }
  };

  // Start / Stop Native Browser Camera BarcodeDetector
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleOpenCameraScanner = async () => {
    setCameraModalOpen(true);
    setCameraManualEan('');

    const hasBarcodeDetector =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasBarcodeDetector || !hasMediaDevices) {
      setCameraSupported(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      setCameraSupported(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // @ts-expect-error BarcodeDetector is experimental in TypeScript DOM types
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
      });

      const scanInterval = setInterval(async () => {
        if (!videoRef.current || !mediaStreamRef.current) {
          clearInterval(scanInterval);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const detectedCode = String(barcodes[0].rawValue);
            clearInterval(scanInterval);
            stopCameraStream();
            setCameraModalOpen(false);
            setLiveBarcodeOrQuery(detectedCode);
            executeOpenFoodFactsLookup(detectedCode);
          }
        } catch {
          // Ignore single frame detection errors
        }
      }, 450);
    } catch {
      setCameraSupported(false);
    }
  };

  const handleCloseCameraScanner = () => {
    stopCameraStream();
    setCameraModalOpen(false);
  };

  // Submit Community Shrinkflation Report (/api/report + local radar insertion)
  const handleSubmitShrinkReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportOldWeight.trim() || !reportNewWeight.trim()) return;

    setReportSubmitting(true);
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ean: reportEan.trim() || 'USER-REPORT',
          productName: reportName.trim() || 'Reported Item',
          countryCode,
          oldWeight: reportOldWeight.trim(),
          newWeight: reportNewWeight.trim(),
        }),
      });

      // Also add directly to the user's active radar list so they see their contribution immediately
      const defaultPrice = localeConfig.products[0]?.newPrice || 39.9;
      const newReportedProduct: ProductItem = {
        id: `reported-${Date.now()}`,
        name: `${reportName.trim() || 'Rapportert vare'} (${reportNewWeight.trim()})`,
        previousName: `${reportName.trim() || 'Rapportert vare'} (${reportOldWeight.trim()})`,
        brand: 'Brukerbidrag',
        category: localeConfig.categories[0],
        store: localeConfig.stores[0]?.store || 'Butikk',
        barcode: reportEan.trim() || '7000000000000',
        oldMeasure: reportOldWeight.trim(),
        newMeasure: reportNewWeight.trim(),
        oldPrice: defaultPrice,
        newPrice: defaultPrice,
        detectedDate: new Date().toISOString().slice(0, 10),
      };

      setProductsByCountry((prev) => ({
        ...prev,
        [countryCode]: [newReportedProduct, ...(prev[countryCode] || [])],
      }));

      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModalOpen(false);
        setReportEan('');
        setReportName('');
      }, 1600);
    } finally {
      setReportSubmitting(false);
    }
  };

  // Live simulator analysis
  const simulatorResult = useMemo(() => {
    try {
      const tempProduct: ProductItem = {
        id: 'simulator-live',
        name: simName || 'Test',
        brand: 'KiloRadar',
        category: simCategory,
        store: localeConfig.stores[0]?.store || 'Store',
        barcode: liveBarcodeOrQuery.trim() || '7000000000000',
        oldMeasure: simOldMeasure,
        newMeasure: simNewMeasure,
        oldPrice: parseFloat(simOldPrice.replace(',', '.')) || 1,
        newPrice: parseFloat(simNewPrice.replace(',', '.')) || 1,
        detectedDate: '2026-11-14',
        imageUrl: simImageUrl,
      };
      const analysis = analyzeProductShrinkflation(tempProduct);
      const fuzzyMatches = findFuzzyProductMatches(simName, products, 0.4);
      const alternatives = rankCategoryAlternatives(tempProduct, products);
      const bestAlt = alternatives[0];
      const savings = calculateAnnualSavings(tempProduct, 4, bestAlt);

      return {
        valid: true as const,
        tempProduct,
        analysis,
        topFuzzyMatch: fuzzyMatches[0] || null,
        bestAlt,
        savings,
      };
    } catch (err) {
      return {
        valid: false as const,
        error: err instanceof Error ? err.message : 'Invalid format',
      };
    }
  }, [
    simName,
    simCategory,
    simOldMeasure,
    simNewMeasure,
    simOldPrice,
    simNewPrice,
    simImageUrl,
    liveBarcodeOrQuery,
    products,
    localeConfig.stores,
  ]);

  const handleAddSimulatedToList = () => {
    if (!simulatorResult.valid) return;
    const newId = `custom-${Date.now()}`;
    const newProd: ProductItem = {
      ...simulatorResult.tempProduct,
      id: newId,
      name: `${simName} (${simNewMeasure})`,
      previousName: `${simName} (${simOldMeasure})`,
      imageUrl: simImageUrl,
    };
    setProductsByCountry((prev) => ({
      ...prev,
      [countryCode]: [newProd, ...(prev[countryCode] || [])],
    }));
    setMonthlySliders((prev) => ({ ...prev, [newId]: 4 }));
  };

  // Filtered products using instant search + Levenshtein fuzzy-matching
  const filteredProducts = useMemo(() => {
    const categoryFiltered =
      selectedCategory === 'ALL'
        ? products
        : products.filter((p) => p.category === selectedCategory);

    if (!searchQuery.trim()) {
      return categoryFiltered.map((product) => ({ product, similarity: 1 }));
    }

    return findFuzzyProductMatches(searchQuery, categoryFiltered, 0.38);
  }, [products, selectedCategory, searchQuery]);

  // Household & Store Basket Ranking
  const activeHousehold = useMemo(
    () =>
      localeConfig.householdProfiles.find((h) => h.id === householdProfileId) ||
      localeConfig.householdProfiles[1],
    [localeConfig.householdProfiles, householdProfileId]
  );

  const storeBasketRanking = useMemo(
    () =>
      calculateAverageCustomerBasketByStore(
        products,
        activeHousehold.multiplier,
        localeConfig.stores
      ),
    [products, activeHousehold, localeConfig.stores]
  );

  const globalStats = useMemo(() => {
    const analyses = products.map((p) => analyzeProductShrinkflation(p));
    const shrunkProducts = analyses.filter((a) => a.shrinkIndex > 5);
    const avgShrink =
      shrunkProducts.reduce((acc, cur) => acc + cur.shrinkIndex, 0) /
      Math.max(1, shrunkProducts.length);
    const maxShrink = Math.max(...analyses.map((a) => a.shrinkIndex));

    return {
      totalTracked: products.length,
      shrunkCount: shrunkProducts.length,
      avgShrink: Math.round(avgShrink * 10) / 10,
      maxShrink: Math.round(maxShrink * 10) / 10,
    };
  }, [products]);

  const cheapestStore = storeBasketRanking[0];
  const mostExpensiveStore = storeBasketRanking[storeBasketRanking.length - 1];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-savings/30 selection:text-savings flex flex-col justify-between">
      <div>
        {/* Smart Non-Intrusive Language Suggestion Banner on '/' */}
        {countryCode === 'en' && suggestedLocale && !bannerDismissed && (
          <div className="relative z-40 bg-savings/90 border-b border-savings/40 px-4 py-2.5 text-xs">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-savings">
                <span className="text-base">{suggestedLocale.flag}</span>
                <span>{suggestedLocale.smartBannerQuestion}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCountrySwitch(suggestedLocale.code)}
                  className="px-3 py-1 rounded-lg bg-savings hover:bg-savings text-primary-foreground font-bold transition cursor-pointer"
                >
                  {suggestedLocale.smartBannerCta} →
                </button>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Dismiss language suggestion"
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nightly Automatic Sync & Community Report Bar */}
        <div className="relative z-30 bg-background/90 border-b border-border/80 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-savings animate-pulse" />
              <Clock className="w-3.5 h-3.5 text-savings shrink-0" />
              <span>{rtUi.nightlySyncStatus(lastSyncedDate)}</span>
            </div>
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              data-testid="open-report-modal-btn"
              className="px-2.5 py-1 rounded-lg bg-shrink/15 hover:bg-shrink/25 border border-shrink/35 text-shrink font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Flag className="w-3 h-3 text-shrink" />
              <span>{rtUi.reportShrunkBtn}</span>
            </button>
          </div>
        </div>

        {/* Subtle Ambient Radar Glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] bg-savings/10 rounded-full blur-[130px]" />
          <div className="absolute top-60 right-1/4 w-[460px] h-[460px] bg-shrink/10 rounded-full blur-[130px]" />
        </div>

        {/* Top Navigation & Brand Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <a href="#top" className="flex items-center gap-2.5 font-display text-lg font-bold text-foreground">
              <KiloRadarLogo className="h-9 w-9" />
              <span>
                Kilo<span className="text-savings">Radar</span>
              </span>
              <span className="hidden rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-block">
                kiloradar.com{localeConfig.path === '/' ? '' : localeConfig.path}
              </span>
            </a>
            {/* Country Route & Currency Switcher */}
            <div className="flex min-w-0 max-w-[58%] items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 sm:max-w-none">
              <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-savings" />
              <select
                id="kiloradar-country-selector"
                aria-label="Select country route, language, and currency"
                value={countryCode}
                onChange={(e) => handleCountrySwitch(e.target.value as CountryRouteCode)}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-full bg-transparent px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {COUNTRY_ROUTE_LIST.map((loc) => (
                  <option key={loc.code} value={loc.code} className="bg-background text-foreground">
                    {loc.selectorLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-8">
          {/* HERO */}
          <section id="top" className="bg-hero -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-shrink" />
                {dict.heroBadge}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-6xl">
                <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-savings">
                  {seoMeta.h1KeywordKicker}
                </span>
                {dict.heroTitlePart1}{' '}
                <span className="text-shrink">{dict.heroTitleHighlight}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">{dict.heroDescription}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#ranking" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
                  {dict.cheapestChainNow}
                </a>
                <a href="#calculator" className="rounded-full border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary">
                  {dict.simulatorTitle}
                </a>
              </div>
            </div>
            <div className="card-kilo animate-rise p-4 sm:p-6" style={{ animationDelay: '.1s' }}>
                {/* Lightweight Vector Hero Illustration comparing Old vs Shrunk Package */}
                <ShrinkflationComparisonHeroSvg
                  locale={localeConfig}
                  formatPrice={formatMoney}
                />
            </div>
          </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="card-kilo animate-rise p-5">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Trophy className="size-4 text-savings" />{dict.cheapestChainNow}</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-savings tabular">{cheapestStore?.store}</p>
              </div>
              <div className="card-kilo animate-rise p-5" style={{ animationDelay: '.06s' }}>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><ShieldAlert className="size-4 text-shrink" />{dict.avgShrinkIndex}</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-shrink tabular">+{globalStats.avgShrink}%</p>
              </div>
              <div className="card-kilo animate-rise p-5" style={{ animationDelay: '.12s' }}>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><AlertTriangle className="size-4 text-warn" />{dict.worstShrink}</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-warn tabular">+{globalStats.maxShrink}%</p>
              </div>
            </div>
          </section>

          {/* SECTION: CHEAPEST SUPERMARKET – AVERAGE CUSTOMER BASKET */}
          <section id="ranking" className="scroll-mt-20 space-y-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savings/15 border border-savings/30 text-savings text-xs font-bold">
                  <ShoppingCart className="w-3.5 h-3.5 text-savings" />
                  {dict.basketBadge}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                  {dict.basketTitlePrefix}{' '}
                  <span className="text-savings">
                    {basketPeriod === 'week'
                      ? dict.basketPeriodWeek
                      : basketPeriod === 'month'
                      ? dict.basketPeriodMonth
                      : dict.basketPeriodYear}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {dict.basketSubtitle} {dict.lastScannedLabel}{' '}
                  <strong className="text-muted-foreground">
                    {customScanTimestamp || dict.lastScannedValue}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={householdProfileId}
                  onChange={(e) =>
                    setHouseholdProfileId(e.target.value as 'single' | 'couple' | 'family')
                  }
                  aria-label="Select household size"
                  className="px-4 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-foreground focus:outline-none focus:border-savings"
                >
                  {localeConfig.householdProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-full bg-card p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setBasketPeriod('week')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      basketPeriod === 'week'
                        ? 'bg-savings text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {dict.per1Week}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasketPeriod('month')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      basketPeriod === 'month'
                        ? 'bg-savings text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {dict.per1Month}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasketPeriod('year')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      basketPeriod === 'year'
                        ? 'bg-savings text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {dict.per1Year}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerWeeklyStoreScan}
                  disabled={isScanningStores}
                  className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary border border-border text-xs font-semibold text-savings flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningStores ? 'animate-spin' : ''}`} />
                  <span>{isScanningStores ? dict.scanningChainsBtn : dict.scanWeekPricesBtn}</span>
                </button>
              </div>
            </div>

            {/* Store ranking: winner card + ranked list */}
            {(() => {
              const periodOf = (item: (typeof storeBasketRanking)[number]) =>
                basketPeriod === 'week'
                  ? item.weeklyCost
                  : basketPeriod === 'month'
                  ? item.monthlyCost
                  : item.yearlyCost;
              const periodLabel =
                basketPeriod === 'week'
                  ? dict.unitWeekShort
                  : basketPeriod === 'month'
                  ? dict.unitMonthShort
                  : dict.unitYearShort;
              const winner = storeBasketRanking[0];
              const rest = storeBasketRanking.slice(1);
              if (!winner) return null;
              const maxCost = Math.max(...storeBasketRanking.map(periodOf));
              return (
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="card-kilo bg-winner animate-rise relative overflow-hidden p-6 shadow-glow sm:p-8 lg:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-savings">
                      <Trophy className="size-4" /> #1 {dict.cheapestBadge}
                    </div>
                    <p className="mt-4 font-display text-4xl font-extrabold text-foreground">{winner.store}</p>
                    <p className="mt-6 text-sm text-muted-foreground">{dict.avgCustomerLabel}</p>
                    <p className="font-display text-5xl font-extrabold tabular text-foreground sm:text-6xl">
                      {formatMoney(periodOf(winner), 0)}
                      <span className="ml-1 text-base font-normal text-muted-foreground">{periodLabel}</span>
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-savings/15 px-3 py-1 text-sm font-semibold text-savings">
                      <CheckCircle2 className="size-4" /> {dict.lowestTotalBasket}
                    </p>
                  </div>
                  <ol className="grid gap-3 lg:col-span-3">
                    {rest.map((item, i) => {
                      const cost = periodOf(item);
                      const diff =
                        basketPeriod === 'week'
                          ? item.diffWeeklyFromCheapest
                          : basketPeriod === 'month'
                          ? item.diffMonthlyFromCheapest
                          : item.diffYearlyFromCheapest;
                      return (
                        <li
                          key={item.store}
                          className="card-kilo animate-rise flex items-center gap-4 p-4 hover:-translate-y-0.5"
                          style={{ animationDelay: `${(i + 1) * 0.06}s` }}
                        >
                          <span className="w-10 font-display text-3xl font-extrabold tabular text-muted-foreground">
                            {item.rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="flex items-center gap-1.5 truncate font-semibold text-foreground">
                                <Store className="size-4 shrink-0 text-savings" />
                                {item.store}
                              </p>
                              <p className="font-display text-xl font-bold tabular text-foreground">
                                {formatMoney(cost, 0)}
                                <span className="text-xs font-normal text-muted-foreground">{periodLabel}</span>
                              </p>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={`h-full rounded-full ${
                                    item.percentageMoreExpensive > 8 ? 'bg-shrink' : 'bg-warn'
                                  }`}
                                  style={{ width: `${Math.min(100, (cost / maxCost) * 100)}%` }}
                                />
                              </div>
                              <span className="w-14 text-right text-xs font-semibold tabular text-muted-foreground">
                                +{item.percentageMoreExpensive}%
                              </span>
                              <span className="hidden w-28 text-right text-xs tabular text-shrink sm:block">
                                +{formatMoney(diff, 0)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })()}

            {cheapestStore && mostExpensiveStore && (
              <div className="rounded-xl bg-background/90 border border-border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-muted-foreground">
                  💡{' '}
                  {dict.basketConclusion(
                    cheapestStore.store,
                    mostExpensiveStore.store,
                    formatMoney(mostExpensiveStore.diffWeeklyFromCheapest, 0),
                    formatMoney(mostExpensiveStore.diffMonthlyFromCheapest, 0),
                    formatMoney(mostExpensiveStore.diffYearlyFromCheapest, 0)
                  )}
                </div>
                <a
                  href="#metode-og-kilder"
                  className="text-[11px] text-savings hover:text-savings underline underline-offset-4 font-semibold shrink-0 flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {dict.methodologyJumpLink}
                </a>
              </div>
            )}
          </section>

          {/* CALCULATOR / SIMULATOR */}
          <section id="calculator" className="scroll-mt-20 -mx-4 sm:-mx-6 lg:-mx-8 border-y border-border bg-card/40 px-4 py-14 sm:px-6 lg:px-8">
            <div className="card-kilo p-6 sm:p-8 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-savings/15 border border-savings/30 text-savings">
                      <ScanBarcode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{dict.simulatorTitle}</h2>
                      <p className="text-xs text-muted-foreground">{dict.simulatorSubtitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSimulatedToList}
                    className="px-3.5 py-2 rounded-xl bg-savings/15 hover:bg-savings/25 border border-savings/40 text-savings text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{dict.addToRadarBtn}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Gratis Open Food Facts Live Oppslag + "Skann med kamera"-knapp */}
                <div className="mb-4 p-3.5 rounded-xl bg-background/90 border border-savings/30 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-savings flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      {dict.liveOffTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenCameraScanner}
                      data-testid="scan-camera-btn"
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-secondary border border-savings/40 text-savings text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-savings" />
                      <span>{rtUi.scanWithCameraBtn}</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      id="live-off-search-input"
                      type="text"
                      value={liveBarcodeOrQuery}
                      onChange={(e) => setLiveBarcodeOrQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLiveOffLookup()}
                      placeholder={dict.liveOffPlaceholder}
                      className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-savings"
                    />
                    <button
                      id="live-off-search-btn"
                      type="button"
                      onClick={handleLiveOffLookup}
                      disabled={liveLoading}
                      className="px-3.5 py-2 rounded-lg bg-savings hover:bg-savings disabled:opacity-50 text-primary-foreground font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {liveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{dict.liveOffBtn}</span>
                    </button>
                  </div>

                  {liveStatusMsg && (
                    <p className="text-[11px] text-savings font-medium">{liveStatusMsg}</p>
                  )}

                  {/* Interactive Live Search Results with Product Image + Automatic Unit Price & Shrink Calculator */}
                  {liveResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {liveResults.map((item) => {
                        const defaultStorePrice =
                          liveCustomPrices[item.code] ?? simNewPrice;
                        const defaultOldMeasure =
                          liveCustomOldWeights[item.code] ?? simOldMeasure;

                        let liveUnitText = '';
                        let liveShrinkPct: number | null = null;

                        try {
                          const priceNum = parseFloat(defaultStorePrice.replace(',', '.')) || 1;
                          const normNew = normalizeUnitPrice(priceNum, item.parsedMeasureStr);
                          liveUnitText = `${formatMoney(normNew.unitPrice)}/${normNew.baseUnit}`;
                          const normOld = normalizeUnitPrice(priceNum, defaultOldMeasure);
                          liveShrinkPct =
                            Math.round(
                              ((normNew.unitPrice / normOld.unitPrice - 1) * 100) * 10
                            ) / 10;
                        } catch {
                          liveUnitText = item.parsedMeasureStr;
                        }

                        return (
                          <div
                            key={item.code}
                            data-testid={`live-result-${item.code}`}
                            className="p-2.5 rounded-xl bg-card/95 border border-border flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5">
                              {item.image_small_url ? (
                                <img
                                  src={item.image_small_url}
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded-lg object-contain bg-background border border-border p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                                  <CategorySvgIcon category={simCategory} className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-foreground truncate">
                                  {item.product_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {item.brands} • <strong>{item.parsedMeasureStr}</strong> • EAN:{' '}
                                  {item.code}
                                </div>
                              </div>
                            </div>

                            {/* Interactive Price & Old Weight Inputs per Result */}
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <div>
                                <span className="text-muted-foreground block mb-0.5">
                                  {rtUi.liveInteractivePriceLabel}
                                </span>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={defaultStorePrice}
                                  onChange={(e) =>
                                    setLiveCustomPrices((prev) => ({
                                      ...prev,
                                      [item.code]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded bg-background border border-border text-foreground font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">
                                  {rtUi.liveCompareOldWeightLabel}
                                </span>
                                <input
                                  type="text"
                                  value={defaultOldMeasure}
                                  onChange={(e) =>
                                    setLiveCustomOldWeights((prev) => ({
                                      ...prev,
                                      [item.code]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded bg-background border border-border text-foreground font-mono text-[11px]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-border/80 text-[11px]">
                              <div>
                                <span className="font-mono font-bold text-savings">
                                  {liveUnitText}
                                </span>
                                {liveShrinkPct !== null && liveShrinkPct > 0 && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-shrink/20 text-shrink font-mono text-[10px] font-bold">
                                    +{liveShrinkPct}%
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => applyLiveProductToSimulator(item)}
                                className="px-2 py-0.5 rounded bg-savings/20 hover:bg-savings/30 text-savings text-[10px] font-semibold transition cursor-pointer"
                              >
                                {rtUi.loadIntoSimulatorBtn}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Preloaded Country Presets */}
                <div className="mb-5">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {dict.presetsLabel}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {featuredPresets.map((preset) => {
                      const isSelected = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`px-3 py-2 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-shrink/15 border-shrink/60 text-foreground shadow-md shadow-shrink/50'
                              : 'bg-background/70 border-border text-muted-foreground hover:border-border'
                          }`}
                        >
                          <div className="truncate">{preset.presetLabel || preset.name}</div>
                          <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                            {preset.oldMeasure} → {preset.newMeasure}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulator Input Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {dict.productNameLabel}
                    </label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-savings"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {dict.categoryLabel}
                    </label>
                    <select
                      value={simCategory}
                      onChange={(e) => setSimCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-savings"
                    >
                      {localeConfig.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {dict.oldAmountLabel}
                    </label>
                    <input
                      type="text"
                      value={simOldMeasure}
                      onChange={(e) => setSimOldMeasure(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-savings"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {dict.newAmountLabel}
                    </label>
                    <input
                      type="text"
                      value={simNewMeasure}
                      onChange={(e) => setSimNewMeasure(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-shrink/40 text-sm text-shrink focus:outline-none focus:border-shrink"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        {dict.oldPriceLabel} ({localeConfig.currencyCode})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={simOldPrice}
                        onChange={(e) => setSimOldPrice(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-savings"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        {dict.newPriceLabel} ({localeConfig.currencyCode})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={simNewPrice}
                        onChange={(e) => setSimNewPrice(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-background border border-shrink/40 text-sm text-shrink focus:outline-none focus:border-shrink"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulator Live Diagnostic Output */}
              {simulatorResult.valid ? (
                <div className="rounded-xl bg-background/90 border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    {simImageUrl && (
                      <img
                        src={simImageUrl}
                        alt={simName}
                        className="w-12 h-12 rounded-lg object-contain bg-card border border-border p-1 shrink-0"
                      />
                    )}
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {dict.realUnitPriceChange}
                      </div>
                      <div
                        className={`text-2xl font-black mt-0.5 ${
                          simulatorResult.analysis.shrinkIndex > 10
                            ? 'text-shrink'
                            : 'text-savings'
                        }`}
                      >
                        {simulatorResult.analysis.shrinkIndex > 0 ? '+' : ''}
                        {simulatorResult.analysis.shrinkIndex.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatMoney(simulatorResult.analysis.oldUnitPrice)} →{' '}
                        <span className="text-foreground font-semibold">
                          {formatMoney(simulatorResult.analysis.newUnitPrice)}/
                          {simulatorResult.analysis.baseUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {dict.fuzzyMatchDb}
                    </div>
                    {simulatorResult.topFuzzyMatch ? (
                      <>
                        <div className="text-sm font-bold text-foreground truncate mt-0.5">
                          {simulatorResult.topFuzzyMatch.product.name}
                        </div>
                        <div className="text-xs text-savings mt-0.5">
                          {dict.nameSimilarity}:{' '}
                          {Math.round(simulatorResult.topFuzzyMatch.similarity * 100)}% (Levenshtein)
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">{dict.noCloseMatch}</div>
                    )}
                  </div>

                  <div className="border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {dict.bestAltInCategory}
                    </div>
                    {simulatorResult.bestAlt ? (
                      <>
                        <div className="text-sm font-bold text-savings truncate mt-0.5">
                          {simulatorResult.bestAlt.product.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatMoney(simulatorResult.bestAlt.currentUnitPrice)}/
                          {simulatorResult.bestAlt.baseUnit} ({dict.savePerYear}{' '}
                          <span className="text-savings font-bold">
                            {formatMoney(simulatorResult.savings.yearlySavingsWithAlternative)}
                          </span>
                          )
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-savings mt-1">{dict.alreadyLowestUnit}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-shrink/30 border border-shrink/40 p-3 text-xs text-shrink">
                  {simulatorResult.error}
                </div>
              )}
            </div>
          </section>

          {/* COMPACT PRODUCT CARDS GRID WITH CATEGORY SVG ICONS */}
          <section id="products" className="space-y-4 scroll-mt-20">
            <div className="card-kilo p-5 sm:p-6 space-y-4">
                {/* Search Input (Also triggers live Open Food Facts search on Enter) */}
                <div className="relative">
                  <Search className="w-5 h-5 text-savings absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="krymp-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        setLiveBarcodeOrQuery(searchQuery.trim());
                        executeOpenFoodFactsLookup(searchQuery.trim());
                      }
                    }}
                    placeholder={dict.searchPlaceholder}
                    className="w-full pl-12 pr-24 py-3 rounded-xl bg-secondary border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-savings focus:ring-2 focus:ring-savings/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary text-xs text-muted-foreground transition"
                    >
                      {dict.resetBtn}
                    </button>
                  )}
                </div>

                {/* Category Filter Pills with SVG Category Icons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Filter className="w-3.5 h-3.5 text-savings" />
                      {dict.filterByCategory}
                    </span>
                    <span>{dict.showingCount(filteredProducts.length, products.length)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === 'ALL'
                          ? 'bg-savings text-primary-foreground shadow-lg shadow-savings/25'
                          : 'bg-background/80 text-muted-foreground border border-border hover:border-border hover:text-foreground'
                      }`}
                    >
                      {dict.allCategoriesLabel}
                    </button>
                    {localeConfig.categories.map((category) => {
                      const active = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? 'bg-savings text-primary-foreground shadow-lg shadow-savings/25'
                              : 'bg-background/80 text-muted-foreground border border-border hover:border-border hover:text-foreground'
                          }`}
                        >
                          <CategorySvgIcon category={category} className="w-4 h-4" />
                          <span>{category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{dict.formulaLabel}</span>
                <code className="px-2.5 py-1 rounded-md bg-secondary border border-border text-savings font-mono text-[11px]">
                  ((newPrice/newQty) / (oldPrice/oldQty) - 1) × 100
                </code>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-savings" />
                  {dict.trackedGroceriesTitle} ({filteredProducts.length})
                </h2>
                <p className="text-xs text-muted-foreground">{dict.trackedGroceriesSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map(({ product, similarity }) => {
                const analysis = analyzeProductShrinkflation(product);
                const alternatives = rankCategoryAlternatives(product, products);
                const bestAlt = alternatives[0];
                const monthlyCount = monthlySliders[product.id] ?? 4;
                const savings = calculateAnnualSavings(product, monthlyCount, bestAlt);
                const rankedStores = rankStorePricesForProduct(product);
                const cheapestForProduct = rankedStores[0];
                const isExpanded = !!expandedCards[product.id];

                const isShrunk = analysis.shrinkIndex > 5;
                const progressWidth = Math.min(100, Math.max(8, (analysis.shrinkIndex / 40) * 100));
                const nameMatchSim = product.previousName
                  ? Math.round(calculateNameSimilarity(product.name, product.previousName) * 100)
                  : 100;

                return (
                  <article
                    key={product.id}
                    data-testid={`product-card-${product.id}`}
                    className={`rounded-2xl bg-card/90 border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xl ${
                      isShrunk
                        ? 'border-shrink/35 hover:border-shrink/60'
                        : 'border-savings/35 hover:border-savings/60'
                    }`}
                  >
                    <div>
                      <div
                        className={`px-4 py-2.5 flex items-center justify-between border-b ${
                          isShrunk
                            ? 'bg-shrink/35 border-shrink/25'
                            : 'bg-savings/30 border-savings/25'
                        }`}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1.5">
                          <CategorySvgIcon category={product.category} className="w-3.5 h-3.5" />
                          <span>
                            {product.category} • {product.store}
                          </span>
                        </span>

                        {isShrunk ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-shrink/20 text-shrink border border-shrink/40 shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 text-shrink" />
                            {dict.shrinkflationBadge} +{analysis.shrinkIndex.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-savings/20 text-savings border border-savings/40 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-savings" />
                            {dict.stablePackageBadge} (+{analysis.shrinkIndex.toFixed(1)}%)
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3.5">
                        <div className="flex items-start gap-3">
                          <ProductAvatar product={product} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base font-bold text-foreground leading-snug">
                                {product.name}
                              </h3>
                              {searchQuery.trim() && (
                                <span className="shrink-0 px-2 py-0.5 rounded bg-secondary text-[10px] font-mono text-savings">
                                  {Math.round(similarity * 100)}%
                                </span>
                              )}
                            </div>
                            {product.previousName && product.previousName !== product.name && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <PackageMinus className="w-3 h-3 text-shrink shrink-0" />
                                <span className="truncate">
                                  {dict.previouslyLabel}{' '}
                                  <span className="line-through">{product.previousName}</span>{' '}
                                  <span className="text-muted-foreground">({nameMatchSim}%)</span>
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-background/90 border border-border/90">
                          <div className="space-y-0.5">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {dict.oldPackageLabel}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-bold text-foreground">
                                {product.oldMeasure}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatMoney(product.oldPrice)}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {formatMoney(analysis.oldUnitPrice)}/{analysis.baseUnit}
                            </div>
                          </div>

                          <div className="space-y-0.5 border-l border-border pl-2.5">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {dict.newPackageLabel}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`text-sm font-extrabold ${
                                  analysis.sizeReductionPercent < 0
                                    ? 'text-shrink'
                                    : 'text-savings'
                                }`}
                              >
                                {product.newMeasure}
                              </span>
                              <span className="text-xs text-foreground font-semibold">
                                {formatMoney(product.newPrice)}
                              </span>
                            </div>
                            <div
                              className={`text-[11px] font-mono font-bold ${
                                isShrunk ? 'text-shrink' : 'text-savings'
                              }`}
                            >
                              {formatMoney(analysis.newUnitPrice)}/{analysis.baseUnit}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground">
                              {dict.shrinkIndexLabel}
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                isShrunk ? 'text-shrink' : 'text-savings'
                              }`}
                            >
                              +{analysis.shrinkIndex.toFixed(2)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-background border border-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                analysis.shrinkIndex >= 25
                                  ? 'bg-gradient-to-r from-warn to-shrink'
                                  : analysis.shrinkIndex > 5
                                  ? 'bg-warn'
                                  : 'bg-savings'
                              }`}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {dict.amountChangeLabel}{' '}
                              <strong
                                className={
                                  analysis.sizeReductionPercent < 0
                                    ? 'text-shrink'
                                    : 'text-savings'
                                }
                              >
                                {analysis.sizeReductionPercent}%
                              </strong>
                            </span>
                            <span>
                              {dict.shelfPriceLabel}{' '}
                              <strong>+{analysis.nominalPriceChangePercent}%</strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCardExpanded(product.id)}
                          className="w-full py-2 px-3 rounded-xl bg-background hover:bg-secondary/90 border border-border hover:border-savings/40 text-xs font-semibold text-savings flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-left">
                            <Calculator className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isExpanded ? dict.collapseDetailsBtn : dict.expandDetailsBtn}
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-3 pt-1">
                            {rankedStores.length > 0 && cheapestForProduct && (
                              <div className="p-3 rounded-xl bg-background/90 border border-border space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Store className="w-3.5 h-3.5 text-savings" />
                                    {dict.cheapestStoreLabel} ({cheapestForProduct.lastScanned}):
                                  </span>
                                  <span className="font-bold text-savings">
                                    {cheapestForProduct.store} (
                                    {formatMoney(cheapestForProduct.price)})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {rankedStores.slice(0, 5).map((sq) => (
                                    <span
                                      key={sq.store}
                                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        sq.rank === 1
                                          ? 'bg-savings/15 border-savings/40 text-savings font-bold'
                                          : 'bg-card border-border text-muted-foreground'
                                      }`}
                                    >
                                      {sq.store}: {formatMoney(sq.price)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="p-3.5 rounded-xl bg-background/95 border border-border space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor={`slider-${product.id}`}
                                  className="text-xs font-bold text-foreground flex items-center gap-1.5"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-savings" />
                                  {dict.savingsCalcTitle}
                                </label>
                                <span className="px-2 py-0.5 rounded-md bg-savings/15 border border-savings/30 text-savings text-xs font-extrabold">
                                  {monthlyCount} {dict.purchasesPerMonth} ({savings.yearlyPurchases}
                                  {dict.unitYearShort})
                                </span>
                              </div>

                              <input
                                id={`slider-${product.id}`}
                                type="range"
                                min={1}
                                max={20}
                                step={1}
                                value={monthlyCount}
                                onChange={(e) =>
                                  setMonthlySliders((prev) => ({
                                    ...prev,
                                    [product.id]: parseInt(e.target.value, 10),
                                  }))
                                }
                                aria-label={`Monthly purchases for ${product.name}`}
                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-savings"
                              />

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="p-2.5 rounded-lg bg-shrink/30 border border-shrink/30">
                                  <div className="text-[10px] uppercase tracking-wider text-shrink">
                                    {dict.annualHiddenCost}
                                  </div>
                                  <div className="text-sm font-extrabold text-shrink mt-0.5">
                                    +{formatMoney(savings.hiddenYearlyShrinkCost)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {savings.equivalentUnitsPerYear} {analysis.baseUnit}
                                    {dict.unitYearShort}
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-lg bg-savings/30 border border-savings/30">
                                  <div className="text-[10px] uppercase tracking-wider text-savings">
                                    {dict.savingsBySwitching}
                                  </div>
                                  {bestAlt && bestAlt.isCheaper ? (
                                    <>
                                      <div className="text-sm font-extrabold text-savings mt-0.5">
                                        {dict.savePerYear}{' '}
                                        {formatMoney(savings.yearlySavingsWithAlternative)}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {dict.switchToLabel} {bestAlt.product.brand} (
                                        {formatMoney(bestAlt.currentUnitPrice)}/{bestAlt.baseUnit})
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-extrabold text-savings mt-0.5">
                                        {dict.bestBuyInCategory}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {dict.lowestPricePer} {analysis.baseUnit}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-background/80 border-t border-border/80 flex items-center justify-between text-xs">
                      {bestAlt && bestAlt.isCheaper ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-muted-foreground truncate">
                            {dict.recommendedSwitch}{' '}
                            <strong className="text-savings">{bestAlt.product.name}</strong>
                          </span>
                          <span className="shrink-0 font-mono text-savings font-bold">
                            {bestAlt.percentageDifference}% {dict.unitPriceDiffLabel}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-savings font-semibold">
                          <span>
                            {dict.rankedNumberOne} {product.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* SOCIAL SHARE ROW (Copy Link with visual confirmation, X/Twitter, Facebook, WhatsApp, Reddit, LinkedIn) */}
          <ShareButtonsBar
            shareUrl={seoMeta.canonicalUrl}
            shareTitle={localeConfig.seoTitle}
            shareText={seoMeta.share.shareText}
            copyLabel={seoMeta.share.copyLink}
            copiedLabel={seoMeta.share.copiedConfirm}
            barLabel={seoMeta.share.label}
          />

          {/* SEMANTIC FAQ SECTION (Matches Schema.org FAQPage JSON-LD) */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="rounded-2xl bg-card/85 border border-border/90 p-6 sm:p-8 shadow-card space-y-5"
          >
            <div className="space-y-1.5 border-b border-border pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savings/15 border border-savings/30 text-savings text-xs font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-savings" />
                <span>FAQ • {localeConfig.countryName}</span>
              </div>
              <h2 id="faq-heading" className="text-xl sm:text-2xl font-extrabold text-foreground">
                {seoMeta.faqHeading}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                {seoMeta.faqSubheading}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seoMeta.faqs.map((faq) => (
                <article
                  key={faq.question}
                  className="p-4 rounded-xl bg-background/85 border border-border/90 space-y-2"
                >
                  <h3 className="text-sm font-bold text-foreground flex items-start gap-2">
                    <span className="text-savings font-extrabold shrink-0">Q.</span>
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>

          {/* METHODOLOGY, SOURCES & TRANSPARENCY SECTION */}
          <section
            id="metode-og-kilder"
            className="rounded-2xl bg-card/85 border border-border/90 p-6 sm:p-8 shadow-card space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-savings text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-savings" />
                  {dict.methodologyBadge}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                  {dict.methodologyTitle}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                  {dict.methodologyIntro}
                </p>
              </div>
              <div className="shrink-0 px-4 py-2.5 rounded-xl bg-background border border-border text-xs text-muted-foreground space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  KiloRadar ({localeConfig.currencyCode})
                </div>
                <div className="font-bold text-savings">
                  {rtUi.nightlySyncStatus(lastSyncedDate).split('·')[1] || lastSyncedDate}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Standard: ISO/IEC ({localeConfig.currencySymbol}/kg,{' '}
                  {localeConfig.currencySymbol}/l)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {localeConfig.methodologyPillars.map((pillar, idx) => {
                const IconComp = idx === 0 ? Database : idx === 1 ? ScaleIcon : FileCheck2;
                return (
                  <div
                    key={pillar.title}
                    className="p-5 rounded-xl bg-background/80 border border-border/90 space-y-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-savings/15 border border-savings/30 flex items-center justify-center text-savings">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{pillar.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pillar.intro}</p>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {pillar.bullets.map((b) => (
                        <li key={b.bold} className="flex items-start gap-2">
                          <span className="text-savings font-bold">•</span>
                          <span>
                            <strong className="text-foreground">{b.bold}</strong> {b.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* CAMERA BARCODE SCANNER MODAL */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-savings" />
                <span>{rtUi.cameraModalTitle}</span>
              </h3>
              <button
                type="button"
                onClick={handleCloseCameraScanner}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cameraSupported ? (
              <div className="relative rounded-xl overflow-hidden bg-background border border-savings/40 aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-shrink shadow-[0_0_8px_#EF4444]" />
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-muted-foreground">
                {rtUi.cameraFallbackNotice}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={cameraManualEan}
                onChange={(e) => setCameraManualEan(e.target.value)}
                placeholder={rtUi.cameraManualPlaceholder}
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  if (cameraManualEan.trim()) {
                    const code = cameraManualEan.trim();
                    handleCloseCameraScanner();
                    setLiveBarcodeOrQuery(code);
                    executeOpenFoodFactsLookup(code);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-savings hover:bg-savings text-primary-foreground font-bold text-xs cursor-pointer"
              >
                {dict.liveOffBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITY "REPORT SHRUNK ITEM" MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Flag className="w-4 h-4 text-shrink" />
                  <span>{rtUi.reportModalTitle}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{rtUi.reportModalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-savings/50 border border-savings/50 text-xs text-savings font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-savings shrink-0" />
                <span>{rtUi.reportSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitShrinkReport} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {rtUi.reportEanLabel}
                  </label>
                  <input
                    type="text"
                    value={reportEan}
                    onChange={(e) => setReportEan(e.target.value)}
                    placeholder="7040913336684"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {rtUi.reportNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="F.eks. Freia Melkesjokolade"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {rtUi.reportOldWeightLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={reportOldWeight}
                      onChange={(e) => setReportOldWeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {rtUi.reportNewWeightLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={reportNewWeight}
                      onChange={(e) => setReportNewWeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-shrink/40 text-xs text-shrink"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-savings hover:bg-savings text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{rtUi.reportSubmitBtn}</span>
                  </button>
                  <a
                    href={`mailto:kjmersland@gmail.com?subject=${encodeURIComponent(
                      `KiloRadar Shrink Report (${countryCode.toUpperCase()})`
                    )}&body=${encodeURIComponent(
                      `EAN: ${reportEan}\nProduct: ${reportName}\nOld weight: ${reportOldWeight}\nNew weight: ${reportNewWeight}`
                    )}`}
                    className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-savings" />
                    <span>{rtUi.reportEmailFallbackBtn}</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PUBLISHER FOOTER: KM TECH LABS */}
      <footer className="relative z-10 border-t border-border/90 bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KiloRadarLogo className="w-8 h-8" />
            <div className="text-xs sm:text-sm text-muted-foreground font-semibold">
              Kilo<span className="text-savings">Radar</span>{' '}
              <span className="text-muted-foreground font-mono text-xs">(kiloradar.com)</span> — Developed
              and operated by{' '}
              <span className="text-foreground font-extrabold tracking-wide">KM TECH LABS</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{dict.footerCopyright}</span>
            <span className="text-muted-foreground">•</span>
            <a
              href="mailto:kjmersland@gmail.com?subject=KiloRadar%20Support"
              className="text-savings hover:text-savings flex items-center gap-1 transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{dict.footerContactSupport} (support@kiloradar.com)</span>
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="#metode-og-kilder"
              className="text-muted-foreground hover:text-foreground transition"
            >
              {dict.footerPrivacyTerms}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
