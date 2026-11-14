/**
 * KrympRadar Core Algorithmic Engine
 * 100 % regelbasert og algoritmisk (ingen AI-kall)
 */

export type BaseUnit = 'kg' | 'l' | 'stk' | 'vask';

export interface ParsedMeasure {
  rawQuantity: number;
  rawUnit: string;
  normalizedAmount: number;
  baseUnit: BaseUnit;
}

export interface NormalizedUnitPrice {
  unitPrice: number; // kr per kg, l, stk, eller vask
  baseUnit: BaseUnit;
  normalizedAmount: number;
  formatted: string; // f.eks. "189,50 kr/kg"
}

export interface StorePriceQuote {
  store: string;
  price: number;
  isMemberOffer?: boolean;
  lastScanned: string;
}

export interface ProductItem {
  id: string;
  name: string;
  previousName?: string;
  brand: string;
  category: string;
  store: string;
  barcode: string;
  previousBarcode?: string;
  oldMeasure: string; // f.eks. "250 g"
  newMeasure: string; // f.eks. "200 g"
  oldPrice: number;
  newPrice: number;
  detectedDate: string;
  notes?: string;
  isFeaturedPreset?: boolean;
  presetLabel?: string;
  storePrices?: StorePriceQuote[];
  avgWeeklyQuantity?: number; // Hvor mange enheter en gjennomsnittskunde handler per uke
  imageUrl?: string; // Valgfritt produktbilde (ellers brukes rent SVG kategori-ikon som fallback)
}

export interface RankedAlternative {
  product: ProductItem;
  currentUnitPrice: number;
  baseUnit: BaseUnit;
  unitPriceDifference: number; // negativ betyr billigere per enhet enn referanseproduktet
  percentageDifference: number;
  isCheaper: boolean;
}

export interface SavingsCalculation {
  monthlyPurchases: number;
  yearlyPurchases: number;
  hiddenYearlyShrinkCost: number; // Hvor mye mer man betaler i året pga. krympflasjon for samme mengde vare
  yearlySavingsWithAlternative: number; // Hvor mye man sparer i året ved å bytte til et rimeligere alternativ for samme totalmengde
  equivalentUnitsPerYear: number; // Total mengde i kg/l/stk per år
}

/**
 * 1. Enhetspris-normalisering:
 * Parser som konverterer vekt og volum (g, kg, hg, ml, cl, dl, l, stk, vask)
 * til standard mengde (kg, l, stk, vask) og beregner standard enhetspris (kr per kg, liter eller stk).
 */
export function parseMeasure(measureStr: string): ParsedMeasure {
  const cleaned = measureStr.trim().toLowerCase().replace(',', '.');
  // Støtter også multipack som "2 x 150 g" eller bare "200 g" / "200g"
  const multiMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-zæøå]+)$/i);
  let quantity: number;
  let unit: string;

  if (multiMatch) {
    quantity = parseFloat(multiMatch[1]) * parseFloat(multiMatch[2]);
    unit = multiMatch[3];
  } else {
    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([a-zæøå]+)$/i);
    if (!match) {
      throw new Error(`Ugyldig måleenhet-format: "${measureStr}"`);
    }
    quantity = parseFloat(match[1]);
    unit = match[2];
  }

  if (isNaN(quantity) || quantity <= 0) {
    throw new Error(`Mengde må være et positivt tall i "${measureStr}"`);
  }

  switch (unit) {
    case 'g':
    case 'gram':
      return {
        rawQuantity: quantity,
        rawUnit: 'g',
        normalizedAmount: quantity / 1000,
        baseUnit: 'kg',
      };
    case 'hg':
    case 'hektogram':
      return {
        rawQuantity: quantity,
        rawUnit: 'hg',
        normalizedAmount: quantity / 10,
        baseUnit: 'kg',
      };
    case 'kg':
    case 'kilo':
    case 'kilogram':
      return {
        rawQuantity: quantity,
        rawUnit: 'kg',
        normalizedAmount: quantity,
        baseUnit: 'kg',
      };
    case 'ml':
    case 'milliliter':
      return {
        rawQuantity: quantity,
        rawUnit: 'ml',
        normalizedAmount: quantity / 1000,
        baseUnit: 'l',
      };
    case 'cl':
    case 'centiliter':
      return {
        rawQuantity: quantity,
        rawUnit: 'cl',
        normalizedAmount: quantity / 100,
        baseUnit: 'l',
      };
    case 'dl':
    case 'desiliter':
      return {
        rawQuantity: quantity,
        rawUnit: 'dl',
        normalizedAmount: quantity / 10,
        baseUnit: 'l',
      };
    case 'l':
    case 'liter':
      return {
        rawQuantity: quantity,
        rawUnit: 'l',
        normalizedAmount: quantity,
        baseUnit: 'l',
      };
    case 'stk':
    case 'stykk':
    case 'pk':
    case 'poser':
      return {
        rawQuantity: quantity,
        rawUnit: 'stk',
        normalizedAmount: quantity,
        baseUnit: 'stk',
      };
    case 'vask':
      return {
        rawQuantity: quantity,
        rawUnit: 'vask',
        normalizedAmount: quantity,
        baseUnit: 'vask',
      };
    default:
      throw new Error(`Ukjent enhet: "${unit}"`);
  }
}

export function normalizeUnitPrice(price: number, measure: string | number, explicitUnit?: string): NormalizedUnitPrice {
  if (price < 0) {
    throw new Error('Pris kan ikke være negativ');
  }
  const measureString = typeof measure === 'number' ? `${measure} ${explicitUnit || 'stk'}` : measure;
  const parsed = parseMeasure(measureString);
  const unitPrice = Math.round((price / parsed.normalizedAmount) * 100) / 100;

  return {
    unitPrice,
    baseUnit: parsed.baseUnit,
    normalizedAmount: parsed.normalizedAmount,
    formatted: `${unitPrice.toFixed(2).replace('.', ',')} kr/${parsed.baseUnit}`,
  };
}

/**
 * 2. Krympflasjons-formel:
 * Beregn reell enhetsprisøkning ved å sammenligne:
 * ((nyPris / nyMengde) / (gammelPris / gammelMengde) - 1) * 100
 */
export function calculateShrinkflationIndex(
  oldPrice: number,
  oldAmount: number,
  newPrice: number,
  newAmount: number
): number {
  if (oldPrice <= 0 || oldAmount <= 0 || newAmount <= 0) {
    throw new Error('Priser og mengder må være større enn 0');
  }

  const oldUnitPrice = oldPrice / oldAmount;
  const newUnitPrice = newPrice / newAmount;
  const rawPercentage = (newUnitPrice / oldUnitPrice - 1) * 100;

  return Math.round(rawPercentage * 100) / 100;
}

/**
 * Hjelpefunksjon som tar inn et ProductItem og regner ut nøkkeltall for krympflasjon.
 */
export function analyzeProductShrinkflation(product: ProductItem) {
  const oldNorm = normalizeUnitPrice(product.oldPrice, product.oldMeasure);
  const newNorm = normalizeUnitPrice(product.newPrice, product.newMeasure);

  const shrinkIndex = calculateShrinkflationIndex(
    product.oldPrice,
    oldNorm.normalizedAmount,
    product.newPrice,
    newNorm.normalizedAmount
  );

  const sizeReductionPercent =
    Math.round(((newNorm.normalizedAmount - oldNorm.normalizedAmount) / oldNorm.normalizedAmount) * 1000) / 10;

  const nominalPriceChangePercent =
    Math.round(((product.newPrice - product.oldPrice) / product.oldPrice) * 1000) / 10;

  let severity: 'critical' | 'high' | 'moderate' | 'fair' = 'fair';
  if (shrinkIndex >= 25) severity = 'critical';
  else if (shrinkIndex >= 12) severity = 'high';
  else if (shrinkIndex > 2) severity = 'moderate';

  return {
    oldUnitPrice: oldNorm.unitPrice,
    newUnitPrice: newNorm.unitPrice,
    baseUnit: newNorm.baseUnit,
    oldNormalizedAmount: oldNorm.normalizedAmount,
    newNormalizedAmount: newNorm.normalizedAmount,
    shrinkIndex,
    sizeReductionPercent,
    nominalPriceChangePercent,
    severity,
  };
}

/**
 * 3. Fuzzy-matching (Levenshtein-avstand):
 * Beregner redigeringsavstand og normalisert likhetsscore (0 til 1, eller 0 til 100%)
 * mellom produktnavn for å koble sammen varer som har endret navn eller strekkode ved krymping.
 */
export function levenshteinDistance(strA: string, strB: string): number {
  const a = strA.trim().toLowerCase();
  const b = strB.trim().toLowerCase();

  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // sletting
        matrix[i][j - 1] + 1,      // innsetting
        matrix[i - 1][j - 1] + cost // erstatning
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Normaliserer produktnavn ved å fjerne mål/enheter (f.eks. "250g", "200 g") før sammenligning,
 * og returnerer en likhetsscore mellom 0 og 1.
 */
export function calculateNameSimilarity(nameA: string, nameB: string): number {
  const stripMeasure = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|hg|ml|cl|dl|l|stk|vask|pk)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanA = stripMeasure(nameA);
  const cleanB = stripMeasure(nameB);

  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen === 0) return 1;

  const dist = levenshteinDistance(cleanA, cleanB);
  return Math.round(((maxLen - dist) / maxLen) * 1000) / 1000;
}

/**
 * Søker og kobler et produktnavn mot en liste av produkter ved hjelp av fuzzy-matching.
 */
export function findFuzzyProductMatches(
  query: string,
  products: ProductItem[],
  threshold = 0.45
): Array<{ product: ProductItem; similarity: number }> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return products.map((product) => ({ product, similarity: 1 }));
  }

  const results = products
    .map((product) => {
      const directSim = calculateNameSimilarity(q, product.name);
      const prevNameSim = product.previousName
        ? calculateNameSimilarity(q, product.previousName)
        : 0;
      const brandSim = calculateNameSimilarity(q, `${product.brand} ${product.name}`);

      const substringBoost =
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.previousName && product.previousName.toLowerCase().includes(q)) ||
        product.barcode.includes(q)
          ? Math.max(0.85, directSim)
          : 0;

      const bestScore = Math.max(directSim, prevNameSim, brandSim, substringBoost);

      return {
        product,
        similarity: bestScore,
      };
    })
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * 4. Alternativ-rangering:
 * Sorterer lignende varer i samme kategori (og kompatibel basismåleenhet)
 * etter laveste standardiserte enhetspris og regner ut differansen.
 */
export function rankCategoryAlternatives(
  targetProduct: ProductItem,
  allProducts: ProductItem[]
): RankedAlternative[] {
  const targetNorm = normalizeUnitPrice(targetProduct.newPrice, targetProduct.newMeasure);

  return allProducts
    .filter(
      (candidate) =>
        candidate.id !== targetProduct.id &&
        candidate.category === targetProduct.category &&
        normalizeUnitPrice(candidate.newPrice, candidate.newMeasure).baseUnit === targetNorm.baseUnit
    )
    .map((candidate) => {
      const candNorm = normalizeUnitPrice(candidate.newPrice, candidate.newMeasure);
      const unitPriceDifference =
        Math.round((candNorm.unitPrice - targetNorm.unitPrice) * 100) / 100;
      const percentageDifference =
        Math.round(((candNorm.unitPrice - targetNorm.unitPrice) / targetNorm.unitPrice) * 1000) / 10;

      return {
        product: candidate,
        currentUnitPrice: candNorm.unitPrice,
        baseUnit: candNorm.baseUnit,
        unitPriceDifference,
        percentageDifference,
        isCheaper: candNorm.unitPrice < targetNorm.unitPrice,
      };
    })
    .sort((a, b) => a.currentUnitPrice - b.currentUnitPrice);
}

/**
 * 5. Interaktiv sparekalkulator:
 * Beregner årlig merutgift pga. krympflasjon og årlig besparelse ved å bytte til et bedre alternativ
 * basert på hvor mange ganger brukeren kjøper varen per måned.
 */
export function calculateAnnualSavings(
  product: ProductItem,
  monthlyPurchases: number,
  bestAlternative?: RankedAlternative
): SavingsCalculation {
  const safeMonthly = Math.max(0, monthlyPurchases);
  const yearlyPurchases = safeMonthly * 12;

  const oldNorm = normalizeUnitPrice(product.oldPrice, product.oldMeasure);
  const newNorm = normalizeUnitPrice(product.newPrice, product.newMeasure);

  // Total mengde (i kg/l/stk) brukeren kjøper i løpet av et år med den nye pakningsstørrelsen
  const equivalentUnitsPerYear =
    Math.round(yearlyPurchases * newNorm.normalizedAmount * 100) / 100;

  // Hvor mye mer brukeren betaler per år for denne mengden sammenlignet med gammel enhetspris
  const unitPriceIncrease = newNorm.unitPrice - oldNorm.unitPrice;
  const hiddenYearlyShrinkCost =
    Math.round(equivalentUnitsPerYear * unitPriceIncrease * 100) / 100;

  // Hvor mye brukeren sparer i året på samme totalmengde ved å velge beste alternativ
  let yearlySavingsWithAlternative = 0;
  if (bestAlternative && bestAlternative.isCheaper) {
    const savedPerUnit = newNorm.unitPrice - bestAlternative.currentUnitPrice;
    yearlySavingsWithAlternative =
      Math.round(equivalentUnitsPerYear * savedPerUnit * 100) / 100;
  }

  return {
    monthlyPurchases: safeMonthly,
    yearlyPurchases,
    hiddenYearlyShrinkCost,
    yearlySavingsWithAlternative,
    equivalentUnitsPerYear,
  };
}

/**
 * 6. Butikkpris-rangering:
 * Sorterer butikkpriser for et produkt fra billigste til dyreste matbutikk,
 * inkludert utregnet standardisert enhetspris per butikk.
 */
export function rankStorePricesForProduct(product: ProductItem) {
  if (!product.storePrices || product.storePrices.length === 0) {
    return [];
  }
  const sorted = [...product.storePrices].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0].price;
  const mostExpensive = sorted[sorted.length - 1].price;

  return sorted.map((quote, idx) => {
    const norm = normalizeUnitPrice(quote.price, product.newMeasure);
    return {
      ...quote,
      rank: idx + 1,
      unitPrice: norm.unitPrice,
      baseUnit: norm.baseUnit,
      diffFromCheapest: Math.round((quote.price - cheapest) * 100) / 100,
      savedVsMostExpensive: Math.round((mostExpensive - quote.price) * 100) / 100,
    };
  });
}

export interface StoreBasketSummary {
  store: StorePriceQuote['store'];
  rank: number;
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  diffWeeklyFromCheapest: number;
  diffMonthlyFromCheapest: number;
  diffYearlyFromCheapest: number;
  percentageMoreExpensive: number;
}

/**
 * 7. Gjennomsnittskundens Handlekurv-indeks per uke / måned / år:
 * Beregner nøyaktig hva gjennomsnittskunden (med SIFO-justert husholdningsmultiplikator)
 * betaler for en standard handlekurv i hver matbutikk per uke, måned (4,33 uker) og år (52 uker).
 */
export function calculateAverageCustomerBasketByStore(
  products: ProductItem[],
  householdMultiplier = 1, // 1 = enslig/par-snitt, 1.8 = barnefamilie, osv.
  customStores?: Array<{ store: string; baseWeeklyStaples: number }>
): StoreBasketSummary[] {
  const defaultStores: Array<{ store: string; baseWeeklyStaples: number }> = [
    { store: 'REMA 1000', baseWeeklyStaples: 1120 },
    { store: 'KIWI', baseWeeklyStaples: 1125 },
    { store: 'Coop Extra', baseWeeklyStaples: 1140 },
    { store: 'Oda', baseWeeklyStaples: 1195 },
    { store: 'Meny', baseWeeklyStaples: 1290 },
  ];

  const activeStores = customStores && customStores.length > 0 ? customStores : defaultStores;

  const summaries = activeStores.map(({ store: storeName, baseWeeklyStaples }) => {
    let trackedItemsWeekly = 0;

    for (const product of products) {
      const weeklyQty = product.avgWeeklyQuantity ?? 0.5;
      const storeQuote = product.storePrices?.find((s) => s.store === storeName);
      const effectivePrice = storeQuote ? storeQuote.price : product.newPrice;
      trackedItemsWeekly += effectivePrice * weeklyQty;
    }

    const rawWeekly = (baseWeeklyStaples + trackedItemsWeekly) * householdMultiplier;
    const weeklyCost = Math.round(rawWeekly * 100) / 100;
    const monthlyCost = Math.round(weeklyCost * 4.333 * 100) / 100;
    const yearlyCost = Math.round(weeklyCost * 52 * 100) / 100;

    return {
      store: storeName,
      rank: 0,
      weeklyCost,
      monthlyCost,
      yearlyCost,
      diffWeeklyFromCheapest: 0,
      diffMonthlyFromCheapest: 0,
      diffYearlyFromCheapest: 0,
      percentageMoreExpensive: 0,
    };
  });

  summaries.sort((a, b) => a.weeklyCost - b.weeklyCost);
  const cheapest = summaries[0];

  return summaries.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    diffWeeklyFromCheapest: Math.round((item.weeklyCost - cheapest.weeklyCost) * 100) / 100,
    diffMonthlyFromCheapest: Math.round((item.monthlyCost - cheapest.monthlyCost) * 100) / 100,
    diffYearlyFromCheapest: Math.round((item.yearlyCost - cheapest.yearlyCost) * 100) / 100,
    percentageMoreExpensive:
      Math.round(((item.weeklyCost - cheapest.weeklyCost) / cheapest.weeklyCost) * 1000) / 10,
  }));
}


