/**
 * Store (chain) names per market: used for quick-pick buttons in the price form and to recognise a
 * chain name that happens to be printed on a shelf label. Recognition is a convenience only: the user
 * always sees and can change the store before anything is saved.
 */

export const CHAINS: Record<string, string[]> = {
  no: ['Rema 1000', 'Kiwi', 'Coop Extra', 'Coop Prix', 'Coop Mega', 'Coop Obs', 'Meny', 'Spar', 'Joker', 'Bunnpris', 'Oda'],
  se: ['ICA Maxi', 'ICA Kvantum', 'ICA Supermarket', 'ICA Nära', 'Coop', 'Willys', 'Hemköp', 'City Gross', 'Lidl'],
  dk: ['Netto', 'Føtex', 'Bilka', 'Rema 1000', 'Lidl', 'Irma', 'SuperBrugsen', 'Kvickly', 'Meny', 'Fakta'],
  pl: ['Biedronka', 'Lidl', 'Żabka', 'Kaufland', 'Auchan', 'Carrefour', 'Dino', 'Netto'],
  de: ['REWE', 'Edeka', 'Lidl', 'Aldi', 'Kaufland', 'Penny', 'Netto', 'dm', 'Rossmann'],
  fr: ['Carrefour', 'E.Leclerc', 'Auchan', 'Intermarché', 'Lidl', 'Monoprix', 'Casino', 'Franprix', 'Super U'],
  es: ['Mercadona', 'Carrefour', 'Dia', 'Lidl', 'Alcampo', 'Eroski', 'Consum'],
  uk: ['Tesco', "Sainsbury's", 'Asda', 'Morrisons', 'Aldi', 'Lidl', 'Waitrose', 'Co-op', 'Marks & Spencer'],
  us: ['Walmart', 'Target', 'Kroger', 'Costco', 'Safeway', 'Aldi', 'Publix', 'Whole Foods', "Trader Joe's"],
  global: ['Lidl', 'Aldi', 'Carrefour', 'Tesco', 'Auchan'],
};

const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/**
 * Looks for a known chain name in the text read from a label. The market's own chains are tried first,
 * then all others. Short names (under 5 letters) must match exactly; longer ones may have one misread letter.
 * Returns the chain as it should be displayed, or null when nothing convincing is found.
 */
export function detectStore(lines: string[], market: string): string | null {
  const text = fold(lines.join(' '));
  if (!text) return null;
  const words = text.split(' ');
  const ordered = [...(CHAINS[market] ?? []), ...Object.values(CHAINS).flat()];
  const seen = new Set<string>();

  for (const chain of ordered) {
    if (seen.has(chain)) continue;
    seen.add(chain);
    const needle = fold(chain);
    if (needle.length < 3) continue;
    // exact phrase on word boundaries
    if (new RegExp(`(^| )${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(text)) return chain;
    // one misread letter in a single-word name of 5+ letters
    if (needle.length >= 5 && !needle.includes(' ')) {
      if (words.some((w) => Math.abs(w.length - needle.length) <= 1 && levenshtein(w, needle) <= 1)) return chain;
    }
  }
  return null;
}
