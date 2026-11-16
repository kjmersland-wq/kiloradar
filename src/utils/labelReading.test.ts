import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptGtin, isValidGtin, normalizeGtin } from './barcode.ts';
import { detectStore } from './storeNames.ts';

test('GTIN check digits are validated', () => {
  assert.equal(isValidGtin('8076809513753'), true);
  assert.equal(isValidGtin('8076809513754'), false); // wrong check digit
  assert.equal(isValidGtin('12345'), false);
  assert.equal(isValidGtin('036000291452'), true); // UPC-A
});

test('UPC-A and GTIN-14 become EAN-13', () => {
  assert.equal(normalizeGtin('036000291452'), '0036000291452');
  assert.equal(normalizeGtin('08076809513753'), '8076809513753');
  assert.equal(acceptGtin('036000291452'), '0036000291452');
  assert.equal(acceptGtin('036000291453'), null);
});

test('a chain name printed on the label is recognised', () => {
  assert.equal(detectStore(['Frokostblanding 750 g', 'REMA 1000'], 'no'), 'Rema 1000');
  assert.equal(detectStore(['Tesco Clubcard Price'], 'uk'), 'Tesco');
  assert.equal(detectStore(['Preis bei Müller', 'Edeka Nord'], 'de'), 'Edeka');
  assert.equal(detectStore(['Carrefour Bio'], 'fr'), 'Carrefour');
});

test('one misread letter in a longer name is tolerated, short names are not guessed', () => {
  assert.equal(detectStore(['Morrlsons'], 'uk'), 'Morrisons');
  assert.equal(detectStore(['Dla'], 'es'), null);
});

test('nothing is invented when no store name is on the label', () => {
  assert.equal(detectStore(['Havregryn 750 g', 'Kilopris 41,20 kr/kg'], 'no'), null);
  assert.equal(detectStore([], 'no'), null);
});
