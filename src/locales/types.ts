import type { ProductItem } from '../utils/shrinkAlgorithm';

export type CountryRouteCode =
  | 'en'
  | 'us'
  | 'uk'
  | 'no'
  | 'se'
  | 'dk'
  | 'pl'
  | 'de'
  | 'fr'
  | 'es';

export interface StoreChainConfig {
  store: string;
  baseWeeklyStaples: number; // Base weekly staples cost in the local currency
}

export interface HouseholdProfileTranslation {
  id: 'single' | 'couple' | 'family';
  label: string;
  multiplier: number;
}

export interface MethodologyPillar {
  title: string;
  intro: string;
  bullets: Array<{ bold: string; text: string }>;
}

export interface CountryLocaleConfig {
  code: CountryRouteCode;
  path:
    | '/'
    | '/us/'
    | '/uk/'
    | '/no/'
    | '/sv/'
    | '/da/'
    | '/pl/'
    | '/de/'
    | '/fr/'
    | '/es/'
    | '/no'
    | '/se'
    | '/dk'
    | '/pl';
  hreflang:
    | 'en'
    | 'en-US'
    | 'en-GB'
    | 'nb-NO'
    | 'sv-SE'
    | 'da-DK'
    | 'pl-PL'
    | 'de-DE'
    | 'fr-FR'
    | 'es-ES';
  htmlLang: string;
  flag: string;
  countryName: string;
  selectorLabel: string;
  currencyCode: 'EUR' | 'USD' | 'GBP' | 'NOK' | 'SEK' | 'DKK' | 'PLN';
  currencySymbol: string;
  currencyPrefix: boolean; // true for €12.50 / $12.50 / £12.50, false for 12,50 kr / zł
  numberLocale: string;
  seoTitle: string;
  seoDescription: string;
  // Smart language banner text (shown when user is on '/' and browser language matches this locale)
  smartBannerQuestion: string;
  smartBannerCta: string;
  // UI Strings
  ui: {
    allCategoriesLabel: string;
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
    lastScannedValue: string;
    per1Week: string;
    per1Month: string;
    per1Year: string;
    unitWeekShort: string;
    unitMonthShort: string;
    unitYearShort: string;
    scanWeekPricesBtn: string;
    scanningChainsBtn: string;
    cheapestBadge: string;
    referenceLabel: string;
    avgCustomerLabel: string;
    lowestTotalBasket: string;
    moreExpensivePer: string;
    basketConclusion: (
      cheapest: string,
      mostExpensive: string,
      wkDiff: string,
      moDiff: string,
      yrDiff: string
    ) => string;
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
  };
  householdProfiles: HouseholdProfileTranslation[];
  methodologyPillars: [MethodologyPillar, MethodologyPillar, MethodologyPillar];
  stores: StoreChainConfig[];
  categories: string[];
  products: ProductItem[];
}
