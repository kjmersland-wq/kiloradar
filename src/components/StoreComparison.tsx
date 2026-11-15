import { useMemo, useState } from 'react';
import { ShoppingCart, Trophy } from 'lucide-react';
import type { CountryRouteCode } from '../locales';

/** Store comparison computed by the pipeline from measured prices (Open Prices, ODbL). */
export interface StoreComparisonData {
  status: 'ok' | 'insufficient';
  source: string;
  license: string;
  url: string;
  currency: string;
  asOf: string;
  since: string;
  observations: number;
  products: number;
  chains?: Array<{ store: string; index: number; pctVsCheapest: number; products: number }>;
}

interface Strings {
  kicker: string;
  heading: string;
  badge: string;
  basis: (products: number, since: string, asOf: string) => string;
  cheapest: string;
  level: string;
  spendLabel: string;
  savingsLead: (cheapest: string, expensive: string) => string;
  perWeek: string;
  perMonth: string;
  perYear: string;
  adjust: string;
  source: string;
  insufficientTitle: (country: string) => string;
  insufficientBody: string;
  contribute: string;
}

const EN: Strings = {
  kicker: 'Prices measured in stores',
  heading: 'Cheapest store, from measured prices',
  badge: 'Measured prices',
  basis: (n, a, b) => `Based on ${n} products with a measured price in at least two chains. Measurements from ${a} to ${b}.`,
  cheapest: 'Cheapest',
  level: 'more than the cheapest',
  spendLabel: 'I spend on groceries each week',
  savingsLead: (c, e) => `If you spend this at ${e}, you save by switching to ${c}:`,
  perWeek: 'per week',
  perMonth: 'per month',
  perYear: 'per year',
  adjust: 'You can change the amount.',
  source: 'Source: Open Prices (ODbL)',
  insufficientTitle: (c) => `We do not have enough measured prices in ${c} yet`,
  insufficientBody:
    'We only compare stores when we have measured prices for the same products in several chains. We do not have that here yet, and we do not guess.',
  contribute: 'You can help: add prices on Open Prices →',
};

const STRINGS: Record<CountryRouteCode, Strings> = {
  en: EN,
  us: EN,
  uk: EN,
  no: {
    kicker: 'Priser målt i butikk',
    heading: 'Billigste butikk, ifølge målte priser',
    badge: 'Målte priser',
    basis: (n, a, b) => `Basert på ${n} varer med målt pris i minst to kjeder. Målinger fra ${a} til ${b}.`,
    cheapest: 'Billigst',
    level: 'dyrere enn billigste',
    spendLabel: 'Jeg handler mat for hver uke',
    savingsLead: (c, e) => `Handler du for dette hos ${e}, sparer du ved å bytte til ${c}:`,
    perWeek: 'per uke',
    perMonth: 'per måned',
    perYear: 'per år',
    adjust: 'Du kan endre beløpet.',
    source: 'Kilde: Open Prices (ODbL)',
    insufficientTitle: (c) => `Vi har ikke nok målte priser i ${c} ennå`,
    insufficientBody:
      'Vi sammenligner bare butikker når vi har målte priser på de samme varene i flere kjeder. Det har vi ikke her ennå, og vi gjetter ikke.',
    contribute: 'Du kan hjelpe: legg inn priser på Open Prices →',
  },
  se: {
    kicker: 'Priser uppmätta i butik',
    heading: 'Billigaste butiken enligt uppmätta priser',
    badge: 'Uppmätta priser',
    basis: (n, a, b) => `Baserat på ${n} varor med uppmätt pris i minst två kedjor. Mätningar från ${a} till ${b}.`,
    cheapest: 'Billigast',
    level: 'dyrare än billigaste',
    spendLabel: 'Jag handlar mat för varje vecka',
    savingsLead: (c, e) => `Handlar du för det här hos ${e} sparar du genom att byta till ${c}:`,
    perWeek: 'per vecka',
    perMonth: 'per månad',
    perYear: 'per år',
    adjust: 'Du kan ändra beloppet.',
    source: 'Källa: Open Prices (ODbL)',
    insufficientTitle: (c) => `Vi har inte tillräckligt med uppmätta priser i ${c} ännu`,
    insufficientBody:
      'Vi jämför bara butiker när vi har uppmätta priser på samma varor i flera kedjor. Det har vi inte här ännu, och vi gissar inte.',
    contribute: 'Du kan hjälpa till: lägg in priser på Open Prices →',
  },
  dk: {
    kicker: 'Priser målt i butik',
    heading: 'Billigste butik ifølge målte priser',
    badge: 'Målte priser',
    basis: (n, a, b) => `Baseret på ${n} varer med målt pris i mindst to kæder. Målinger fra ${a} til ${b}.`,
    cheapest: 'Billigst',
    level: 'dyrere end den billigste',
    spendLabel: 'Jeg handler ind for hver uge',
    savingsLead: (c, e) => `Handler du for det her hos ${e}, sparer du ved at skifte til ${c}:`,
    perWeek: 'pr. uge',
    perMonth: 'pr. måned',
    perYear: 'pr. år',
    adjust: 'Du kan ændre beløbet.',
    source: 'Kilde: Open Prices (ODbL)',
    insufficientTitle: (c) => `Vi har ikke nok målte priser i ${c} endnu`,
    insufficientBody:
      'Vi sammenligner kun butikker, når vi har målte priser på de samme varer i flere kæder. Det har vi ikke her endnu, og vi gætter ikke.',
    contribute: 'Du kan hjælpe: læg priser ind på Open Prices →',
  },
  pl: {
    kicker: 'Ceny zmierzone w sklepach',
    heading: 'Najtańszy sklep według zmierzonych cen',
    badge: 'Zmierzone ceny',
    basis: (n, a, b) => `Na podstawie ${n} produktów ze zmierzoną ceną w co najmniej dwóch sieciach. Pomiary od ${a} do ${b}.`,
    cheapest: 'Najtaniej',
    level: 'drożej niż najtańszy',
    spendLabel: 'Na zakupy tygodniowo wydaję',
    savingsLead: (c, e) => `Jeśli robisz tak zakupy w ${e}, oszczędzisz, przechodząc do ${c}:`,
    perWeek: 'tygodniowo',
    perMonth: 'miesięcznie',
    perYear: 'rocznie',
    adjust: 'Możesz zmienić kwotę.',
    source: 'Źródło: Open Prices (ODbL)',
    insufficientTitle: (c) => `Nie mamy jeszcze dość zmierzonych cen: ${c}`,
    insufficientBody:
      'Porównujemy sklepy tylko wtedy, gdy mamy zmierzone ceny tych samych produktów w kilku sieciach. Tu jeszcze ich nie mamy i nie zgadujemy.',
    contribute: 'Możesz pomóc: dodaj ceny w Open Prices →',
  },
  de: {
    kicker: 'Im Laden gemessene Preise',
    heading: 'Günstigster Laden laut gemessenen Preisen',
    badge: 'Gemessene Preise',
    basis: (n, a, b) => `Basiert auf ${n} Produkten mit gemessenem Preis in mindestens zwei Ketten. Messungen von ${a} bis ${b}.`,
    cheapest: 'Am günstigsten',
    level: 'teurer als der günstigste',
    spendLabel: 'Ich gebe pro Woche für Lebensmittel aus',
    savingsLead: (c, e) => `Kaufst du so bei ${e} ein, sparst du mit einem Wechsel zu ${c}:`,
    perWeek: 'pro Woche',
    perMonth: 'pro Monat',
    perYear: 'pro Jahr',
    adjust: 'Du kannst den Betrag ändern.',
    source: 'Quelle: Open Prices (ODbL)',
    insufficientTitle: (c) => `Wir haben in ${c} noch nicht genug gemessene Preise`,
    insufficientBody:
      'Wir vergleichen Läden nur, wenn wir für dieselben Produkte gemessene Preise in mehreren Ketten haben. Das haben wir hier noch nicht, und wir raten nicht.',
    contribute: 'Du kannst helfen: Preise bei Open Prices eintragen →',
  },
  fr: {
    kicker: 'Prix relevés en magasin',
    heading: 'Le moins cher, d’après les prix relevés',
    badge: 'Prix relevés',
    basis: (n, a, b) => `Basé sur ${n} produits avec un prix relevé dans au moins deux enseignes. Relevés du ${a} au ${b}.`,
    cheapest: 'Le moins cher',
    level: 'de plus que le moins cher',
    spendLabel: 'Je dépense en courses chaque semaine',
    savingsLead: (c, e) => `Si vous faites ces courses chez ${e}, vous économisez en passant chez ${c} :`,
    perWeek: 'par semaine',
    perMonth: 'par mois',
    perYear: 'par an',
    adjust: 'Vous pouvez modifier le montant.',
    source: 'Source : Open Prices (ODbL)',
    insufficientTitle: (c) => `Nous n’avons pas encore assez de prix relevés (${c})`,
    insufficientBody:
      'Nous ne comparons les enseignes que lorsque nous avons des prix relevés pour les mêmes produits dans plusieurs enseignes. Ce n’est pas encore le cas ici, et nous ne devinons pas.',
    contribute: 'Vous pouvez aider : ajoutez des prix sur Open Prices →',
  },
  es: {
    kicker: 'Precios medidos en tienda',
    heading: 'La más barata, según los precios medidos',
    badge: 'Precios medidos',
    basis: (n, a, b) => `Basado en ${n} productos con precio medido en al menos dos cadenas. Mediciones del ${a} al ${b}.`,
    cheapest: 'La más barata',
    level: 'más que la más barata',
    spendLabel: 'Gasto en comida cada semana',
    savingsLead: (c, e) => `Si haces esta compra en ${e}, ahorras cambiando a ${c}:`,
    perWeek: 'por semana',
    perMonth: 'por mes',
    perYear: 'por año',
    adjust: 'Puedes cambiar el importe.',
    source: 'Fuente: Open Prices (ODbL)',
    insufficientTitle: (c) => `Todavía no tenemos suficientes precios medidos en ${c}`,
    insufficientBody:
      'Solo comparamos tiendas cuando tenemos precios medidos de los mismos productos en varias cadenas. Aquí aún no los tenemos, y no adivinamos.',
    contribute: 'Puedes ayudar: añade precios en Open Prices →',
  },
};

const LOCALE: Record<CountryRouteCode, string> = {
  en: 'en-US', us: 'en-US', uk: 'en-GB', no: 'nb-NO', se: 'sv-SE', dk: 'da-DK', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
};

/** Default weekly grocery spend shown in the input (the visitor can change it). */
const DEFAULT_SPEND: Record<string, number> = { NOK: 1000, SEK: 1000, DKK: 1000, PLN: 400, EUR: 150, GBP: 100, USD: 150 };

export default function StoreComparison({
  comparison,
  countryCode,
  countryName,
}: {
  comparison: StoreComparisonData | null;
  countryCode: CountryRouteCode;
  countryName: string;
}) {
  const ui = STRINGS[countryCode] ?? EN;
  const currency = comparison?.currency ?? 'EUR';
  const [spendInput, setSpendInput] = useState<string>('');
  const spend = spendInput === '' ? DEFAULT_SPEND[currency] ?? 150 : Math.max(0, parseFloat(spendInput.replace(',', '.')) || 0);
  const money = (v: number, digits = 0) =>
    new Intl.NumberFormat(LOCALE[countryCode], { style: 'currency', currency, maximumFractionDigits: digits }).format(v);

  const savings = useMemo(() => {
    const chains = comparison?.chains ?? [];
    if (chains.length < 2) return null;
    const cheapest = chains[0];
    const expensive = chains[chains.length - 1];
    const weekly = spend * (1 - cheapest.index / expensive.index);
    return { cheapest, expensive, weekly, monthly: weekly * 4.333, yearly: weekly * 52 };
  }, [comparison, spend]);

  return (
    <section
      id="ranking"
      data-testid="store-comparison"
      className="bg-hero -mx-4 sm:-mx-6 lg:-mx-8 scroll-mt-20 px-4 pb-20 pt-12 sm:px-6 md:pt-20 lg:px-8"
    >
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-savings">
            <ShoppingCart className="size-4" /> {ui.kicker}
          </p>
          <h2 className="mt-3 max-w-3xl text-4xl font-extrabold text-foreground sm:text-5xl">{ui.heading}</h2>
          {comparison?.status === 'ok' && (
            <span className="mt-4 inline-block rounded-full bg-savings/15 px-3 py-1 text-xs font-semibold text-savings">
              {ui.badge}
            </span>
          )}
        </div>

        {comparison?.status === 'ok' && comparison.chains && savings ? (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="card-kilo bg-winner animate-rise relative overflow-hidden p-8 shadow-glow sm:p-10 lg:col-span-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-savings/15 px-4 py-1.5 text-sm font-bold text-savings">
                  <Trophy className="size-4" /> #1 {ui.cheapest}
                </div>
                <p className="mt-6 font-display text-5xl font-extrabold text-foreground sm:text-7xl">
                  {savings.cheapest.store}
                </p>
                <div className="mt-10 border-t border-border pt-8">
                  <label className="block text-sm text-muted-foreground" htmlFor="weekly-spend">
                    {ui.spendLabel}
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="weekly-spend"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={spendInput === '' ? DEFAULT_SPEND[currency] ?? 150 : spendInput}
                      onChange={(e) => setSpendInput(e.target.value)}
                      className="w-36 rounded-2xl border border-input bg-secondary px-4 py-3 font-display text-2xl font-bold tabular text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-lg text-muted-foreground">{currency}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ui.adjust}</p>
                  <p className="mt-6 text-sm font-semibold text-savings">
                    {ui.savingsLead(savings.cheapest.store, savings.expensive.store)}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      [ui.perWeek, savings.weekly],
                      [ui.perMonth, savings.monthly],
                      [ui.perYear, savings.yearly],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-2xl bg-savings/10 p-3 sm:p-4">
                        <p className="whitespace-nowrap font-display text-base font-extrabold tabular text-savings min-[420px]:text-xl sm:text-3xl">
                          {money(Number(value))}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <ol className="grid content-start gap-4 lg:col-span-2">
                {comparison.chains.slice(1).map((c, i) => (
                  <li
                    key={c.store}
                    className="card-kilo animate-rise flex items-center gap-4 p-5 hover:-translate-y-0.5"
                    style={{ animationDelay: `${(i + 1) * 0.06}s` }}
                  >
                    <span className="w-8 font-display text-3xl font-extrabold tabular text-muted-foreground">{i + 2}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold text-foreground">{c.store}</p>
                        <p className="font-display text-xl font-bold tabular text-foreground">
                          +{c.pctVsCheapest.toLocaleString(LOCALE[countryCode], { maximumFractionDigits: 1 })} %
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${c.pctVsCheapest > 8 ? 'bg-shrink' : 'bg-warn'}`}
                          style={{ width: `${Math.min(100, (c.index / comparison.chains![comparison.chains!.length - 1].index) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {ui.level} · {c.products}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span data-testid="comparison-basis">{ui.basis(comparison.products, comparison.since, comparison.asOf)}</span>
              <a href={comparison.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                {ui.source}
              </a>
            </div>
          </>
        ) : (
          <div className="card-kilo max-w-3xl p-8 sm:p-10" data-testid="comparison-insufficient">
            <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">{ui.insufficientTitle(countryName)}</p>
            <p className="mt-4 text-muted-foreground">{ui.insufficientBody}</p>
            <a
              href="https://prices.openfoodfacts.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              {ui.contribute}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
