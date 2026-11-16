'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ScanBarcode,
  CheckCircle2,
  Globe,
  Loader2,
  BookOpen,
  Database,
  FileCheck2,
  Scale as ScaleIcon,
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
import CatalogSection, { type CatalogItem } from './CatalogSection';
import DocumentedCases from './DocumentedCases';
import StoreComparison,{ type StoreComparisonData } from './StoreComparison';
import {
  ProductItem,
  analyzeProductShrinkflation,
  findFuzzyProductMatches,
  rankCategoryAlternatives,
  calculateAnnualSavings,
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

const HERO_COPY: Record<CountryRouteCode, { title: [string, string]; sub: string; save: string }> = {
  en: { title: ['Same price.', 'Less inside.'], sub: 'Notice your packs getting smaller? See the real price per kilo, and where your shop costs least.', save: 'You can save up to' },
  us: { title: ['Same price.', 'Less inside.'], sub: 'Notice your packs getting smaller? See the real price per pound, and where your groceries cost least.', save: 'You can save up to' },
  uk: { title: ['Same price.', 'Less inside.'], sub: 'Notice your packs getting smaller? See the real price per kilo, and where your shop costs least.', save: 'You can save up to' },
  no: { title: ['Samme pris.', 'Mindre i pakken.'], sub: 'Merker du at pakkene blir mindre? Her ser du hva kiloprisen faktisk er, og hvor handlekurven blir billigst.', save: 'Du kan spare opptil' },
  se: { title: ['Samma pris.', 'Mindre i paketet.'], sub: 'Märker du att förpackningarna blir mindre? Här ser du vad kilopriset egentligen är, och var matkassen blir billigast.', save: 'Du kan spara upp till' },
  dk: { title: ['Samme pris.', 'Mindre i pakken.'], sub: 'Kan du mærke, at pakkerne bliver mindre? Her ser du, hvad kiloprisen egentlig er, og hvor indkøbskurven er billigst.', save: 'Du kan spare op til' },
  pl: { title: ['Ta sama cena.', 'Mniej w opakowaniu.'], sub: 'Masz wrażenie, że opakowania robią się mniejsze? Zobacz, ile naprawdę kosztuje kilogram i gdzie zakupy wyjdą najtaniej.', save: 'Możesz zaoszczędzić nawet' },
  de: { title: ['Gleicher Preis.', 'Weniger drin.'], sub: 'Kommt dir die Packung kleiner vor? Hier siehst du den echten Kilopreis und wo dein Einkauf am günstigsten ist.', save: 'Du sparst bis zu' },
  fr: { title: ['Même prix.', 'Moins dans le paquet.'], sub: 'Vous avez l’impression que les paquets rétrécissent ? Voyez le vrai prix au kilo et où vos courses coûtent le moins.', save: 'Vous pouvez économiser jusqu’à' },
  es: { title: ['Mismo precio.', 'Menos dentro.'], sub: '¿Te da la sensación de que los paquetes son cada vez más pequeños? Mira el precio real por kilo y dónde te sale más barata la compra.', save: 'Puedes ahorrar hasta' },
};


const COMING_SOON_LABEL: Record<CountryRouteCode, string> = {
  en: 'coming soon', us: 'coming soon', uk: 'coming soon',
  no: 'kommer snart', se: 'kommer snart', dk: 'kommer snart',
  pl: 'wkrótce', de: 'demnächst', fr: 'bientôt', es: 'próximamente',
};
const COMING_SOON_MARKETS: Array<{ region: string; flag: string }> = [
  { region: 'IT', flag: '🇮🇹' },
  { region: 'NL', flag: '🇳🇱' },
  { region: 'BE', flag: '🇧🇪' },
  { region: 'AT', flag: '🇦🇹' },
  { region: 'CH', flag: '🇨🇭' },
];
const HTML_LANG_BY_MARKET: Record<CountryRouteCode, string> = {
  en: 'en', us: 'en-US', uk: 'en-GB', no: 'nb', se: 'sv', dk: 'da', pl: 'pl', de: 'de', fr: 'fr', es: 'es',
};
const regionName = (region: string, locale: string): string => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(region) ?? region;
  } catch {
    return region;
  }
};



const HERO_STATS: Record<CountryRouteCode, [string, string, string]> = {
  en: ['real products we keep an eye on', 'with a measured price', 'Last checked'],
  us: ['real products we keep an eye on', 'with a measured price', 'Last checked'],
  uk: ['real products we keep an eye on', 'with a measured price', 'Last checked'],
  no: ['ekte varer vi følger med på', 'med målt pris', 'Sist sjekket'],
  se: ['riktiga varor vi håller koll på', 'med uppmätt pris', 'Senast kontrollerad'],
  dk: ['rigtige varer vi holder øje med', 'med målt pris', 'Sidst tjekket'],
  pl: ['prawdziwych produktów, które obserwujemy', 'ze zmierzoną ceną', 'Ostatnio sprawdzono'],
  de: ['echte Produkte im Blick', 'mit gemessenem Preis', 'Zuletzt geprüft'],
  fr: ['vrais produits que nous suivons', 'avec un prix relevé', 'Dernière vérification'],
  es: ['productos reales que seguimos', 'con precio medido', 'Última comprobación'],
};

/** [hero button, take-a-photo button, nothing-found message] */
const SCAN_UI: Record<CountryRouteCode, [string, string, string]> = {
  en: ['Scan a barcode', 'Take a photo of the barcode', 'No barcode found in the photo. Try again, closer and in good light.'],
  us: ['Scan a barcode', 'Take a photo of the barcode', 'No barcode found in the photo. Try again, closer and in good light.'],
  uk: ['Scan a barcode', 'Take a photo of the barcode', 'No barcode found in the photo. Try again, closer and in good light.'],
  no: ['Skann strekkode', 'Ta bilde av strekkoden', 'Fant ingen strekkode i bildet. Prøv igjen, nærmere og med godt lys.'],
  se: ['Skanna streckkod', 'Ta ett foto av streckkoden', 'Hittade ingen streckkod i bilden. Försök igen, närmare och med bra ljus.'],
  dk: ['Scan stregkode', 'Tag et billede af stregkoden', 'Fandt ingen stregkode på billedet. Prøv igen, tættere på og med godt lys.'],
  pl: ['Skanuj kod kreskowy', 'Zrób zdjęcie kodu kreskowego', 'Nie znaleziono kodu na zdjęciu. Spróbuj ponownie, bliżej i przy dobrym świetle.'],
  de: ['Barcode scannen', 'Foto vom Barcode machen', 'Kein Barcode im Foto gefunden. Bitte näher und bei gutem Licht erneut versuchen.'],
  fr: ['Scanner un code-barres', 'Prendre le code-barres en photo', 'Aucun code-barres trouvé sur la photo. Réessayez, de plus près et avec une bonne lumière.'],
  es: ['Escanear código de barras', 'Hacer foto del código de barras', 'No se encontró ningún código en la foto. Inténtalo de nuevo, más cerca y con buena luz.'],
};

const NAV_LABELS:Record<CountryRouteCode, [string, string, string, string]> = {
  en: ['Prices', 'Calculator', 'Products', 'Catalog'],
  us: ['Prices', 'Calculator', 'Products', 'Catalog'],
  uk: ['Prices', 'Calculator', 'Products', 'Catalog'],
  no: ['Priser', 'Kalkulator', 'Varer', 'Katalog'],
  se: ['Priser', 'Kalkylator', 'Varor', 'Katalog'],
  dk: ['Priser', 'Beregner', 'Varer', 'Katalog'],
  pl: ['Ceny', 'Kalkulator', 'Produkty', 'Katalog'],
  de: ['Preise', 'Rechner', 'Produkte', 'Katalog'],
  fr: ['Prix', 'Calculateur', 'Produits', 'Catalogue'],
  es: ['Precios', 'Calculadora', 'Productos', 'Catálogo'],
};

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

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [storeComparison, setStoreComparison] = useState<StoreComparisonData | null>(null);
  const [lastSyncedDate, setLastSyncedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Real data only: catalog from Cloudflare D1 (falls back to /data/[country].json) and the store
  // comparison computed by the Python pipeline from measured prices (Open Prices).
  useEffect(() => {
    let active = true;
    const staticRegion = countryCode === 'en' ? 'global' : countryCode;
    setCatalogItems([]);
    setStoreComparison(null);
    let catalogFromD1 = false;

    fetch(`/data/${staticRegion}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.lastSynced) setLastSyncedDate(data.lastSynced);
        if (data.storeComparison) setStoreComparison(data.storeComparison as StoreComparisonData);
        // Static JSON is the fallback: the D1-backed API below wins when it has data
        if (!catalogFromD1 && Array.isArray(data.catalog)) setCatalogItems(data.catalog as CatalogItem[]);
      })
      .catch(() => {
        // The page still renders; sections without data show an honest empty state
      });

    fetch(`/api/catalog?market=${staticRegion}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || data.source !== 'cloudflare-d1') return;
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          catalogFromD1 = true;
          setCatalogItems(data.catalog as CatalogItem[]);
        }
      })
      .catch(() => {
        // Falls back to the static /data/[country].json catalog
      });

    return () => {
      active = false;
    };
  }, [countryCode]);

  const products: ProductItem[] = [];

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

  // Basket scanner state

  // Simulator / Custom Test state
  const [simName, setSimName] = useState('');
  const [simCategory, setSimCategory] = useState<string>(localeConfig.categories[0] || '');
  const [simOldMeasure, setSimOldMeasure] = useState('');
  const [simNewMeasure, setSimNewMeasure] = useState('');
  const [simOldPrice, setSimOldPrice] = useState('');
  const [simNewPrice, setSimNewPrice] = useState('');
  const [simImageUrl, setSimImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLiveResults([]);
    setLiveStatusMsg(null);
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
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanPhotoError, setScanPhotoError] = useState(false);

  // "Report Shrunk Item" Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportEan, setReportEan] = useState('');
  const [reportName, setReportName] = useState('');
  const [reportOldWeight, setReportOldWeight] = useState('250 g');
  const [reportNewWeight, setReportNewWeight] = useState('200 g');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Per-card slider state (monthly purchases per product ID)

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
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // already stopped
      }
      zxingControlsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleOpenCameraScanner = async () => {
    setCameraModalOpen(true);
    setCameraManualEan('');
    setScanPhotoError(false);

    const hasBarcodeDetector =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMediaDevices) {
      setCameraSupported(false);
      return;
    }

    // Browsers without BarcodeDetector (iPhone Safari, Firefox): decode the live video with ZXing
    if (!hasBarcodeDetector) {
      setCameraSupported(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 60)); // let the <video> mount
        if (!videoRef.current) return;
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingControlsRef.current = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (!result) return;
            const code = result.getText();
            stopCameraStream();
            setCameraModalOpen(false);
            setLiveBarcodeOrQuery(code);
            executeOpenFoodFactsLookup(code);
          }
        );
      } catch {
        setCameraSupported(false);
      }
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

  // "Take a photo of the barcode": works everywhere (opens the phone camera app)
  const handleBarcodePhoto = async (file: File | undefined) => {
    if (!file) return;
    setScanPhotoError(false);
    try {
      let code: string | null = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        // @ts-expect-error BarcodeDetector is experimental in TypeScript DOM types
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const bitmap = await createImageBitmap(file);
        const found = await detector.detect(bitmap);
        if (found && found[0]?.rawValue) code = String(found[0].rawValue);
      }
      if (!code) {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const url = URL.createObjectURL(file);
        try {
          const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
          code = result.getText();
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (code) {
        handleCloseCameraScanner();
        setLiveBarcodeOrQuery(code);
        executeOpenFoodFactsLookup(code);
      } else {
        setScanPhotoError(true);
      }
    } catch {
      setScanPhotoError(true);
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
    if (!simOldMeasure.trim() || !simNewMeasure.trim() || !simOldPrice.trim() || !simNewPrice.trim()) {
      return { valid: false as const, error: '', empty: true as const };
    }
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
        oldPrice: parseFloat(simOldPrice.replace(',', '.')),
        newPrice: parseFloat(simNewPrice.replace(',', '.')),
        detectedDate: '2026-11-14',
        imageUrl: simImageUrl,
      };
      if (!(tempProduct.oldPrice > 0) || !(tempProduct.newPrice > 0)) {
        throw new Error('Price must be a number above 0');
      }
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
        empty: false as const,
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-savings/30 selection:text-savings flex flex-col justify-between">
      <div>
        {/* Smart Non-Intrusive Language Suggestion Banner on '/' */}
        {countryCode === 'en' && suggestedLocale && !bannerDismissed && (
          <div className="relative z-40 bg-card border-b border-savings/40 px-4 py-2.5 text-xs">
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
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-savings animate-pulse" />
              <Clock className="w-3.5 h-3.5 text-savings shrink-0" />
              <span className="hidden sm:inline">{rtUi.nightlySyncStatus(lastSyncedDate)}</span>
              <span className="tabular truncate sm:hidden">{lastSyncedDate}</span>
            </div>
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              data-testid="open-report-modal-btn"
              className="shrink-0 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-shrink/15 hover:bg-shrink/25 border border-shrink/35 text-shrink font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
            <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
              <a href="#ranking" className="transition-colors hover:text-foreground">{NAV_LABELS[countryCode][0]}</a>
              <a href="#calculator" className="transition-colors hover:text-foreground">{NAV_LABELS[countryCode][1]}</a>
              {catalogItems.length > 0 && (
                <a href="#catalog" className="transition-colors hover:text-foreground">{NAV_LABELS[countryCode][3]}</a>
              )}
            </nav>
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
                <optgroup label={COMING_SOON_LABEL[countryCode]}>
                  {COMING_SOON_MARKETS.map((m) => (
                    <option
                      key={m.region}
                      value={`coming-soon-${m.region}`}
                      disabled
                      className="bg-background text-muted-foreground"
                    >
                      {m.flag} {regionName(m.region, HTML_LANG_BY_MARKET[countryCode])} ({COMING_SOON_LABEL[countryCode]})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-24 space-y-20">
          {/* STORE COMPARISON: measured prices only (Open Prices) */}
          <StoreComparison comparison={storeComparison} countryCode={countryCode} countryName={localeConfig.countryName} />

          {/* HERO: one message, one big number */}
          <section id="top" className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pb-12">
            <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
              <div className="animate-rise">
                <h1 className="text-5xl font-extrabold leading-[1.02] text-foreground sm:text-7xl">
                  {HERO_COPY[countryCode].title[0]}
                  <br />
                  <span className="text-shrink">{HERO_COPY[countryCode].title[1]}</span>
                </h1>
                <p className="mt-6 max-w-md text-lg text-muted-foreground sm:text-xl">{HERO_COPY[countryCode].sub}</p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleOpenCameraScanner}
                    data-testid="hero-scan-btn"
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold sm:w-auto text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
                  >
                    <Camera className="h-5 w-5" />
                    {SCAN_UI[countryCode][0]}
                  </button>
                  <a href="#calculator" className="w-full rounded-full border border-border bg-card px-8 py-4 text-center text-lg font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto">
                    {dict.simulatorTitle}
                  </a>
                  <a href={catalogItems.length > 0 ? '#catalog' : '#calculator'} className="w-full rounded-full border border-border bg-card px-8 py-4 text-center text-lg font-semibold sm:w-auto text-foreground transition-colors hover:bg-secondary">
                    {NAV_LABELS[countryCode][3]}
                  </a>
                </div>
              </div>
              <div className="card-kilo animate-rise p-7 sm:p-10" style={{ animationDelay: '.1s' }} data-testid="hero-stats">
                <p className="font-display text-8xl font-extrabold leading-none tabular text-savings sm:text-9xl">
                  {catalogItems.length}
                </p>
                <p className="mt-4 text-xl text-foreground">{HERO_STATS[countryCode][0]}</p>
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-8">
                  <div className="rounded-3xl bg-secondary p-5">
                    <p className="font-display text-3xl font-bold tabular text-foreground">
                      {catalogItems.filter((c) => c.price).length}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{HERO_STATS[countryCode][1]}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary p-5">
                    <p className="font-display text-3xl font-bold tabular text-foreground">{lastSyncedDate}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{HERO_STATS[countryCode][2]}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CALCULATOR / SIMULATOR */}
          <section id="calculator" className="scroll-mt-20 -mx-4 sm:-mx-6 lg:-mx-8 border-y border-border bg-card/40 px-4 py-20 sm:px-6 lg:px-8">
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
                      className="px-4 py-2.5 rounded-lg bg-savings text-primary-foreground text-sm font-bold flex items-center gap-2 transition cursor-pointer hover:opacity-90"
                    >
                      <Camera className="w-4 h-4" />
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
                <div className="rounded-xl bg-background/90 border border-border p-4">
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

                </div>
              ) : simulatorResult.empty ? null : (
                <div className="rounded-xl bg-shrink/10 border border-shrink/40 p-3 text-xs text-shrink">
                  {simulatorResult.error}
                </div>
              )}
            </div>
          </section>

          {/* VERIFIED CATALOG (real Open Food Facts products, prices coming) */}
          <CatalogSection items={catalogItems} countryCode={countryCode} />
          <DocumentedCases countryCode={countryCode} />

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

      {/* Floating scan button on phones: the camera is one tap away from anywhere on the page */}
      {!cameraModalOpen && !reportModalOpen && (
        <button
          type="button"
          onClick={handleOpenCameraScanner}
          aria-label={SCAN_UI[countryCode][0]}
          data-testid="fab-scan-btn"
          className="fixed right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-savings text-primary-foreground shadow-glow transition-transform active:scale-95 md:hidden"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <Camera className="h-6 w-6" />
        </button>
      )}

      {/* CAMERA BARCODE SCANNER MODAL */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
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

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-savings/40 bg-background px-4 py-3 text-sm font-semibold text-savings transition hover:bg-secondary">
              <Camera className="h-4 w-4" />
              <span>{SCAN_UI[countryCode][1]}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                data-testid="scan-photo-input"
                onChange={(e) => {
                  handleBarcodePhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            {scanPhotoError && (
              <p className="text-xs text-shrink" role="alert">
                {SCAN_UI[countryCode][2]}
              </p>
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
              <div className="p-4 rounded-xl bg-savings/15 border border-savings/50 text-xs text-savings font-semibold flex items-center gap-2">
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

        <p
          data-testid="odbl-credit"
          className="mx-auto mt-6 max-w-7xl border-t border-border pt-6 text-center text-xs leading-relaxed text-muted-foreground"
        >
          Produkt- og prisdata fra{' '}
          <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Open Food Facts
          </a>{' '}
          og{' '}
          <a href="https://prices.openfoodfacts.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Open Prices
          </a>
          , lisensiert under Open Database License (ODbL).
          <br />
          <a
            href="https://opendatacommons.org/licenses/odbl/1.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-savings underline underline-offset-2"
          >
            https://opendatacommons.org/licenses/odbl/1.0/
          </a>
          <br />
          Øvrige data kommer fra offentlig tilgjengelige kilder.
        </p>
      </footer>
    </div>
  );
}
