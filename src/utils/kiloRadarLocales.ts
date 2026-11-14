export type RegionLocale = 'NO' | 'EN';

export interface KiloRadarDictionary {
  code: RegionLocale;
  label: string;
  currency: 'NOK' | 'EUR';
  currencySymbol: 'kr' | '€';
  exchangeRateFromNok: number; // 1 for NOK, ~0.086 for EUR
  badgeAlgorithmic: string;
  tagline: string;
  cheapestChainNow: string;
  avgShrinkIndex: string;
  worstShrink: string;
  heroBadge: string;
  heroTitlePart1: string;
  heroTitleHighlight: string;
  heroDescription: string;
  searchPlaceholder: string;
  resetBtn: string;
  filterByCategory: string;
  showingCount: (shown: number, total: number) => string;
  formulaLabel: string;
  simulatorTitle: string;
  simulatorSubtitle: string;
  addToRadarBtn: string;
  liveOffTitle: string;
  liveOffPlaceholder: string;
  liveOffBtn: string;
  presetsLabel: string;
  productNameLabel: string;
  categoryLabel: string;
  oldAmountLabel: string;
  newAmountLabel: string;
  oldPriceLabel: string;
  newPriceLabel: string;
  realUnitPriceChange: string;
  fuzzyMatchDb: string;
  nameSimilarity: string;
  noCloseMatch: string;
  bestAltInCategory: string;
  savePerYear: string;
  alreadyLowestUnit: string;
  basketBadge: string;
  basketTitlePrefix: string;
  basketPeriodWeek: string;
  basketPeriodMonth: string;
  basketPeriodYear: string;
  basketSubtitle: string;
  lastScannedLabel: string;
  per1Week: string;
  per1Month: string;
  per1Year: string;
  scanWeekPricesBtn: string;
  scanningChainsBtn: string;
  cheapestBadge: string;
  referenceLabel: string;
  avgCustomerLabel: string;
  lowestTotalBasket: string;
  moreExpensivePer: string;
  methodologyJumpLink: string;
  trackedGroceriesTitle: string;
  trackedGroceriesSubtitle: string;
  shrinkflationBadge: string;
  stablePackageBadge: string;
  previouslyLabel: string;
  oldPackageLabel: string;
  newPackageLabel: string;
  shrinkIndexLabel: string;
  amountChangeLabel: string;
  shelfPriceLabel: string;
  expandDetailsBtn: string;
  collapseDetailsBtn: string;
  cheapestStoreLabel: string;
  savingsCalcTitle: string;
  purchasesPerMonth: string;
  annualHiddenCost: string;
  savingsBySwitching: string;
  switchToLabel: string;
  bestBuyInCategory: string;
  lowestPricePer: string;
  recommendedSwitch: string;
  unitPriceDiffLabel: string;
  rankedNumberOne: string;
  methodologyBadge: string;
  methodologyTitle: string;
  methodologyIntro: string;
  footerBrandLine: string;
  footerCopyright: string;
  footerContactSupport: string;
  footerPrivacyTerms: string;
}

export const KILORADAR_LOCALES: Record<RegionLocale, KiloRadarDictionary> = {
  NO: {
    code: 'NO',
    label: '🇳🇴 Norge (NO / NOK)',
    currency: 'NOK',
    currencySymbol: 'kr',
    exchangeRateFromNok: 1,
    badgeAlgorithmic: '100% Algoritmisk',
    tagline: 'True Unit Price & Shrinkflation Tracker — Avslører reell kilopris og billigste matbutikk',
    cheapestChainNow: 'Billigste kjede nå',
    avgShrinkIndex: 'Snitt Krympindeks',
    worstShrink: 'Verste krymp',
    heroBadge: 'Sanntids Enhetspris & Levenshtein-søk',
    heroTitlePart1: 'Mindre i pakken.',
    heroTitleHighlight: 'Dyrere per kilo.',
    heroDescription:
      'KiloRadar normaliserer vekt og volum til ekte kilopris og literpris, og bruker Levenshtein fuzzy-matching for å koble varer som har endret pakningsnavn eller strekkode.',
    searchPlaceholder:
      'Søk etter vare, merke eller strekkode (f.eks. Friele, Melkesjokolade, Omo, Norvegia)...',
    resetBtn: 'Nullstill',
    filterByCategory: 'Filtrer etter kategori',
    showingCount: (shown, total) => `Viser ${shown} av ${total} produkter`,
    formulaLabel: 'Formel:',
    simulatorTitle: '«Skann / Test produkt»-simulator',
    simulatorSubtitle:
      'Velg et forhåndsinnlastet eksempel, søk i gratis strekkode-API, eller test egne tall',
    addToRadarBtn: 'Legg til i radaren',
    liveOffTitle: 'Gratis Live Vareoppslag (Open Food Facts – 0 kr / ingen API-nøkkel)',
    liveOffPlaceholder: 'Skriv strekkode (EAN) eller varenavn (f.eks. Norvegia, Grandiosa, Kvikk Lunsj)...',
    liveOffBtn: 'Hent ekte vare',
    presetsLabel: 'Hurtigvalg – Dagligvareeksempler:',
    productNameLabel: 'Produktnavn (matcher mot database med Levenshtein)',
    categoryLabel: 'Kategori',
    oldAmountLabel: 'Gammel mengde (g, kg, ml, l, stk)',
    newAmountLabel: 'Ny mengde (g, kg, ml, l, stk)',
    oldPriceLabel: 'Før-pris',
    newPriceLabel: 'Ny pris',
    realUnitPriceChange: 'Reell Enhetsprisendring',
    fuzzyMatchDb: 'Fuzzy-match i database',
    nameSimilarity: 'Navnelikhet',
    noCloseMatch: 'Ingen nære navnetreff',
    bestAltInCategory: 'Beste alternativ i kategori',
    savePerYear: 'Spar',
    alreadyLowestUnit: 'Allerede laveste enhetspris!',
    basketBadge: 'Ukentlig Prisskanner • Gjennomsnittskundens Handlekurv (SIFO-vektet)',
    basketTitlePrefix: 'Billigste matbutikk for en gjennomsnittskunde per',
    basketPeriodWeek: '1 uke',
    basketPeriodMonth: '1 måned',
    basketPeriodYear: '1 år',
    basketSubtitle:
      'Beregnet ut fra ukentlig skanning av åpne kundeaviser (Mattilbud / eTilbudsavis), Oda og pristester for en komplett standardhandlekurv.',
    lastScannedLabel: 'Sist skannet:',
    per1Week: 'Per 1 uke',
    per1Month: 'Per 1 måned',
    per1Year: 'Per 1 år',
    scanWeekPricesBtn: 'Skann ukens priser',
    scanningChainsBtn: 'Skanner kjeder...',
    cheapestBadge: 'BILLIGST',
    referenceLabel: 'Referanse',
    avgCustomerLabel: 'Gjennomsnittskunde',
    lowestTotalBasket: 'Laveste totalpris på handlekurven',
    moreExpensivePer: 'dyrere',
    methodologyJumpLink: 'Se datagrunnlag, metode og kilder ↓',
    trackedGroceriesTitle: 'Overvåkede dagligvarer',
    trackedGroceriesSubtitle:
      'Kompakte produktkort — klikk «Vis sparekalkulator og butikkpriser» på et kort for full analyse',
    shrinkflationBadge: 'Krympflasjon',
    stablePackageBadge: 'Stabil pakning',
    previouslyLabel: 'Tidligere:',
    oldPackageLabel: 'Gammel pakning',
    newPackageLabel: 'Ny pakning',
    shrinkIndexLabel: 'Krympflasjons-indeks (reell enhetsprisøkning)',
    amountChangeLabel: 'Mengdeendring:',
    shelfPriceLabel: 'Hyllepris:',
    expandDetailsBtn: 'Vis sparekalkulator og butikkpriser',
    collapseDetailsBtn: 'Skjul sparekalkulator og butikkpriser',
    cheapestStoreLabel: 'Billigste butikk',
    savingsCalcTitle: 'Sparekalkulator (kjøp per måned)',
    purchasesPerMonth: 'kjøp/mnd',
    annualHiddenCost: 'Årlig skjult merutgift',
    savingsBySwitching: 'Besparelse ved bytte',
    switchToLabel: 'Bytt til:',
    bestBuyInCategory: 'Beste kjøp i kategori!',
    lowestPricePer: 'Laveste pris per',
    recommendedSwitch: 'Anbefalt bytte:',
    unitPriceDiffLabel: 'enhetspris',
    rankedNumberOne: '★ Rangert som #1 laveste enhetspris i',
    methodologyBadge: 'Metodeverk, Datagrunnlag & Kildefortegnelse',
    methodologyTitle: 'Slik innhentes, normaliseres og kvalitetssikres prisdataene',
    methodologyIntro:
      'KiloRadar benytter en 100 % deterministisk og regelbasert beregningsmodell uten kunstig intelligens. Alle sammenligninger bygger på reviderbare formler for enhetsprisnormalisering og åpne datakilder.',
    footerBrandLine: 'KiloRadar (kiloradar.com) — Developed and operated by KM TECH LABS',
    footerCopyright: '© 2026 KM TECH LABS · All rights reserved.',
    footerContactSupport: 'Kontakt & Support',
    footerPrivacyTerms: 'Metodikk & Vilkår',
  },
  EN: {
    code: 'EN',
    label: '🌍 International (EN / EUR)',
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRateFromNok: 0.086,
    badgeAlgorithmic: '100% Algorithmic',
    tagline: 'True Unit Price & Shrinkflation Tracker — Exposing hidden package downsizing & real unit cost',
    cheapestChainNow: 'Cheapest grocer now',
    avgShrinkIndex: 'Avg. Shrink Index',
    worstShrink: 'Worst shrink',
    heroBadge: 'Real-Time Unit Price & Levenshtein Search',
    heroTitlePart1: 'Less in the box.',
    heroTitleHighlight: 'More per kilo.',
    heroDescription:
      'KiloRadar normalizes weight and volume into true price per kg or liter, using Levenshtein fuzzy-matching to link products across renamed packages and updated barcodes.',
    searchPlaceholder:
      'Search product, brand, or EAN barcode (e.g. Friele, Chocolate, Omo, Norvegia)...',
    resetBtn: 'Reset',
    filterByCategory: 'Filter by category',
    showingCount: (shown, total) => `Showing ${shown} of ${total} products`,
    formulaLabel: 'Formula:',
    simulatorTitle: 'Scan / Test Product Simulator',
    simulatorSubtitle:
      'Select a preloaded grocery preset, query the free barcode API, or test custom values',
    addToRadarBtn: 'Add to radar',
    liveOffTitle: 'Free Live Product Lookup (Open Food Facts – €0 / no API key)',
    liveOffPlaceholder: 'Enter EAN barcode or product name (e.g. Norvegia, Grandiosa, Kvikk Lunsj)...',
    liveOffBtn: 'Fetch live item',
    presetsLabel: 'Quick presets – Grocery shrinkflation examples:',
    productNameLabel: 'Product name (Levenshtein database matching)',
    categoryLabel: 'Category',
    oldAmountLabel: 'Old size (g, kg, ml, l, stk)',
    newAmountLabel: 'New size (g, kg, ml, l, stk)',
    oldPriceLabel: 'Old price',
    newPriceLabel: 'New price',
    realUnitPriceChange: 'True Unit Price Change',
    fuzzyMatchDb: 'Database Fuzzy Match',
    nameSimilarity: 'Name similarity',
    noCloseMatch: 'No close name match',
    bestAltInCategory: 'Best alternative in category',
    savePerYear: 'Save',
    alreadyLowestUnit: 'Already lowest unit price!',
    basketBadge: 'Weekly Price Scanner • Average Household Basket (SIFO-weighted)',
    basketTitlePrefix: 'Cheapest supermarket for an average shopper per',
    basketPeriodWeek: '1 week',
    basketPeriodMonth: '1 month',
    basketPeriodYear: '1 year',
    basketSubtitle:
      'Calculated from weekly scans of public grocery flyers, online grocers, and independent price audits for a standard household basket.',
    lastScannedLabel: 'Last scanned:',
    per1Week: 'Per 1 week',
    per1Month: 'Per 1 month',
    per1Year: 'Per 1 year',
    scanWeekPricesBtn: 'Scan weekly prices',
    scanningChainsBtn: 'Scanning chains...',
    cheapestBadge: 'CHEAPEST',
    referenceLabel: 'Baseline',
    avgCustomerLabel: 'Avg. shopper',
    lowestTotalBasket: 'Lowest total basket cost',
    moreExpensivePer: 'more expensive',
    methodologyJumpLink: 'View data sources & methodology ↓',
    trackedGroceriesTitle: 'Tracked groceries',
    trackedGroceriesSubtitle:
      'Compact product cards — click "Show savings calculator & store prices" on any card to expand',
    shrinkflationBadge: 'Shrinkflation',
    stablePackageBadge: 'Stable size',
    previouslyLabel: 'Previously:',
    oldPackageLabel: 'Old package',
    newPackageLabel: 'New package',
    shrinkIndexLabel: 'Shrinkflation Index (true unit price increase)',
    amountChangeLabel: 'Size change:',
    shelfPriceLabel: 'Shelf price:',
    expandDetailsBtn: 'Vis sparekalkulator og butikkpriser',
    collapseDetailsBtn: 'Hide savings calculator & store prices',
    cheapestStoreLabel: 'Cheapest store',
    savingsCalcTitle: 'Savings calculator (purchases / month)',
    purchasesPerMonth: 'buys/mo',
    annualHiddenCost: 'Annual hidden shrink cost',
    savingsBySwitching: 'Annual switch savings',
    switchToLabel: 'Switch to:',
    bestBuyInCategory: 'Best buy in category!',
    lowestPricePer: 'Lowest price per',
    recommendedSwitch: 'Recommended switch:',
    unitPriceDiffLabel: 'unit price',
    rankedNumberOne: '★ Ranked #1 lowest unit price in',
    methodologyBadge: 'Methodology, Data Sources & Transparency',
    methodologyTitle: 'How unit prices and shrinkflation metrics are collected and verified',
    methodologyIntro:
      'KiloRadar operates on a 100% deterministic, rule-based engine without AI calls. Every comparison is backed by auditable unit-price normalization formulas and open data sources.',
    footerBrandLine: 'KiloRadar (kiloradar.com) — Developed and operated by KM TECH LABS',
    footerCopyright: '© 2026 KM TECH LABS · All rights reserved.',
    footerContactSupport: 'Contact & Support',
    footerPrivacyTerms: 'Methodology & Terms',
  },
};
