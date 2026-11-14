import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMeasure,
  normalizeUnitPrice,
  calculateShrinkflationIndex,
  analyzeProductShrinkflation,
  levenshteinDistance,
  calculateNameSimilarity,
  findFuzzyProductMatches,
  rankCategoryAlternatives,
  calculateAnnualSavings,
  rankStorePricesForProduct,
  calculateAverageCustomerBasketByStore,
} from './shrinkAlgorithm.ts';
import { MOCK_SHRINK_PRODUCTS } from './mockProducts.ts';

test('1. Enhetspris-normalisering (vekt, volum, stk)', () => {
  const gParsed = parseMeasure('250 g');
  assert.equal(gParsed.normalizedAmount, 0.25);
  assert.equal(gParsed.baseUnit, 'kg');

  const mlParsed = parseMeasure('650 ml');
  assert.equal(mlParsed.normalizedAmount, 0.65);
  assert.equal(mlParsed.baseUnit, 'l');

  const stkParsed = parseMeasure('24 stk');
  assert.equal(stkParsed.normalizedAmount, 24);
  assert.equal(stkParsed.baseUnit, 'stk');

  const normCoffee = normalizeUnitPrice(46.9, '200 g');
  assert.equal(normCoffee.unitPrice, 234.5);
  assert.equal(normCoffee.baseUnit, 'kg');
});

test('2. Krympflasjons-formel: ((nyPris / nyMengde) / (gammelPris / gammelMengde) - 1) * 100', () => {
  // Friele Frokostkaffe: 44.90 kr / 250g -> 46.90 kr / 200g
  // Gammel enhetspris: 179.60 kr/kg, Ny enhetspris: 234.50 kr/kg
  // ((234.5 / 179.6) - 1) * 100 = 30.5679... -> 30.57%
  const shrinkKaffe = calculateShrinkflationIndex(44.9, 0.25, 46.9, 0.2);
  assert.equal(shrinkKaffe, 30.57);

  // Freia Melkesjokolade: 39.90 kr / 200g -> 42.90 kr / 160g
  const shrinkSjokolade = calculateShrinkflationIndex(39.9, 0.2, 42.9, 0.16);
  assert.equal(shrinkSjokolade, 34.4);
});

test('3. Fuzzy-matching (Levenshtein-avstand og produktnavn-likhet)', () => {
  assert.equal(levenshteinDistance('kaffe', 'kaffe'), 0);
  assert.equal(levenshteinDistance('kaffe', 'kafe'), 1);

  // Samme produkt før og etter krymping (250 g -> 200 g) skal få 100% navnlikhet når måleenhet renses
  const sim = calculateNameSimilarity(
    'Friele Frokostkaffe Filter 250 g',
    'Friele Frokostkaffe Filter 200 g'
  );
  assert.equal(sim, 1);

  const fuzzyMatches = findFuzzyProductMatches('Friele Frokostkafe', MOCK_SHRINK_PRODUCTS);
  assert.ok(fuzzyMatches.length > 0);
  assert.equal(fuzzyMatches[0].product.id, 'kaffe-friele-frokost');
});

test('4. Alternativ-rangering og 12 produkter i 3 kategorier', () => {
  assert.equal(MOCK_SHRINK_PRODUCTS.length, 12);
  const categories = new Set(MOCK_SHRINK_PRODUCTS.map((p) => p.category));
  assert.equal(categories.size, 3);

  const friele = MOCK_SHRINK_PRODUCTS.find((p) => p.id === 'kaffe-friele-frokost')!;
  const alternatives = rankCategoryAlternatives(friele, MOCK_SHRINK_PRODUCTS);

  assert.equal(alternatives.length, 3);
  // Coop Blå Filterkaffe 250g til 35.90 kr (143.60 kr/kg) skal være rangert først (billigst)
  assert.equal(alternatives[0].product.id, 'kaffe-coop-blaa');
  assert.equal(alternatives[0].currentUnitPrice, 143.6);
  assert.equal(alternatives[0].isCheaper, true);
});

test('5. Sparekalkulator (årlig merutgift og besparelse ved bytte)', () => {
  const friele = MOCK_SHRINK_PRODUCTS.find((p) => p.id === 'kaffe-friele-frokost')!;
  const alternatives = rankCategoryAlternatives(friele, MOCK_SHRINK_PRODUCTS);
  const bestAlt = alternatives[0];

  // Bruker kjøper 4 pakker i måneden (48 pakker i året = 9.6 kg i året)
  const savings = calculateAnnualSavings(friele, 4, bestAlt);
  assert.equal(savings.yearlyPurchases, 48);
  assert.equal(savings.equivalentUnitsPerYear, 9.6);
  assert.ok(savings.hiddenYearlyShrinkCost > 500); // ca. 527,04 kr i skjult krympflasjon per år
  assert.ok(savings.yearlySavingsWithAlternative > 850); // ca. 872,64 kr spart ved å bytte til Coop Blå
});

test('6. Billigste matbutikk per vare og gjennomsnittskundens handlekurv (1 uke / 1 måned / 1 år)', () => {
  const friele = MOCK_SHRINK_PRODUCTS.find((p) => p.id === 'kaffe-friele-frokost')!;
  const storeQuotes = rankStorePricesForProduct(friele);
  assert.ok(storeQuotes.length >= 4);
  assert.equal(storeQuotes[0].rank, 1);
  assert.ok(storeQuotes[0].price <= storeQuotes[1].price);

  const basketRanking = calculateAverageCustomerBasketByStore(MOCK_SHRINK_PRODUCTS, 1.0);
  assert.equal(basketRanking.length, 5);
  assert.equal(basketRanking[0].rank, 1);
  assert.equal(basketRanking[0].diffWeeklyFromCheapest, 0);
  assert.ok(basketRanking[4].diffMonthlyFromCheapest > 500);
});

