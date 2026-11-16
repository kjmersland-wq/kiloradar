import { useMemo, useState } from 'react';
import { Package, Search, ShieldCheck, Tag, TrendingDown } from 'lucide-react';
import type { CountryRouteCode } from '../locales';
import { UserPriceBlock, userPriceStrings, type UserPrice } from './UserPrices';

/** One real product discovered by the nightly pipeline (Open Food Facts). Prices are not tracked yet. */
export interface CatalogItem {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  category: string;
  measure: string;
  imageUrl?: string | null;
  sources?: Array<{ name: string; url?: string; checked?: string }>;
  lastChecked?: string | null;
  verification?: 'verified' | 'partial' | 'mismatch' | 'unverified';
  sizeHistory?: Array<{ date: string; value: string }>;
  shrinkEvents?: Array<{ date?: string; from: string; to: string }>;
  /** Crowdsourced price from Open Prices (ODbL). Missing price = "Pris kommer". */
  price?: {
    value: number;
    currency: string;
    date?: string;
    store?: string;
    unitPrice?: number;
    unitLabel?: string;
    source?: string;
    url?: string;
  };
}

interface CatalogStrings {
  priceFrom: string;
  unitPer: string;
  nav: string;
  badge: string;
  title: string;
  subtitle: string;
  search: string;
  all: string;
  priceSoon: string;
  priceSoonHint: string;
  size: string;
  category: string;
  source: string;
  checked: string;
  shrunk: string;
  showMore: string;
  showing: (shown: number, total: number) => string;
  empty: string;
}

const EN: CatalogStrings = {
  priceFrom: 'Price from',
  unitPer: 'per',
  nav: 'Catalog',
  badge: 'Verified catalog',
  title: 'Real products we keep an eye on',
  subtitle:
    'Products from Open Food Facts, with pack size and source. We check the size every night and tell you if a pack gets smaller.',
  search: 'Search name, brand or barcode…',
  all: 'All',
  priceSoon: 'Price coming',
  priceSoonHint: 'We do not track prices for these products yet, only the pack size. Prices are coming.',
  size: 'Pack size',
  category: 'Category',
  source: 'Source',
  checked: 'Last checked',
  shrunk: 'Pack got smaller',
  showMore: 'Show more',
  showing: (shown, total) => `Showing ${shown} of ${total}`,
  empty: 'No products match your search.',
};

export const CATALOG_UI: Record<CountryRouteCode, CatalogStrings> = {
  en: EN,
  us: EN,
  uk: EN,
  no: {
    priceFrom: 'Pris fra',
    unitPer: 'per',
    nav: 'Katalog',
    badge: 'Verifisert katalog',
    title: 'Ekte varer vi følger med på',
    subtitle:
      'Varer fra Open Food Facts, med pakkestørrelse og kilde. Vi sjekker størrelsen hver natt og sier fra hvis en pakke blir mindre.',
    search: 'Søk på navn, merke eller strekkode…',
    all: 'Alle',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi følger ikke prisene på disse varene ennå, bare pakkestørrelsen. Priser kommer.',
    size: 'Pakkestørrelse',
    category: 'Kategori',
    source: 'Kilde',
    checked: 'Sist sjekket',
    shrunk: 'Pakken ble mindre',
    showMore: 'Vis flere',
    showing: (shown, total) => `Viser ${shown} av ${total}`,
    empty: 'Ingen varer passer søket ditt.',
  },
  se: {
    priceFrom: 'Pris från',
    unitPer: 'per',
    nav: 'Katalog',
    badge: 'Verifierad katalog',
    title: 'Riktiga varor vi håller koll på',
    subtitle:
      'Varor från Open Food Facts, med förpackningsstorlek och källa. Vi kollar storleken varje natt och säger till om en förpackning blir mindre.',
    search: 'Sök namn, märke eller streckkod…',
    all: 'Alla',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi följer inte priserna på de här varorna ännu, bara förpackningsstorleken. Priser kommer.',
    size: 'Förpackningsstorlek',
    category: 'Kategori',
    source: 'Källa',
    checked: 'Senast kontrollerad',
    shrunk: 'Förpackningen blev mindre',
    showMore: 'Visa fler',
    showing: (shown, total) => `Visar ${shown} av ${total}`,
    empty: 'Inga varor matchar din sökning.',
  },
  dk: {
    priceFrom: 'Pris fra',
    unitPer: 'pr.',
    nav: 'Katalog',
    badge: 'Verificeret katalog',
    title: 'Rigtige varer vi holder øje med',
    subtitle:
      'Varer fra Open Food Facts med pakkestørrelse og kilde. Vi tjekker størrelsen hver nat og siger til, hvis en pakke bliver mindre.',
    search: 'Søg navn, mærke eller stregkode…',
    all: 'Alle',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi følger ikke priserne på disse varer endnu, kun pakkestørrelsen. Priser kommer.',
    size: 'Pakkestørrelse',
    category: 'Kategori',
    source: 'Kilde',
    checked: 'Sidst tjekket',
    shrunk: 'Pakken blev mindre',
    showMore: 'Vis flere',
    showing: (shown, total) => `Viser ${shown} af ${total}`,
    empty: 'Ingen varer matcher din søgning.',
  },
  pl: {
    priceFrom: 'Cena z',
    unitPer: 'za',
    nav: 'Katalog',
    badge: 'Zweryfikowany katalog',
    title: 'Prawdziwe produkty, które obserwujemy',
    subtitle:
      'Produkty z Open Food Facts z rozmiarem opakowania i źródłem. Co noc sprawdzamy rozmiar i dajemy znać, gdy opakowanie się zmniejszy.',
    search: 'Szukaj nazwy, marki lub kodu kreskowego…',
    all: 'Wszystkie',
    priceSoon: 'Cena wkrótce',
    priceSoonHint: 'Nie śledzimy jeszcze cen tych produktów, tylko rozmiar opakowania. Ceny wkrótce.',
    size: 'Rozmiar opakowania',
    category: 'Kategoria',
    source: 'Źródło',
    checked: 'Ostatnio sprawdzono',
    shrunk: 'Opakowanie się zmniejszyło',
    showMore: 'Pokaż więcej',
    showing: (shown, total) => `Pokazano ${shown} z ${total}`,
    empty: 'Brak produktów pasujących do wyszukiwania.',
  },
  de: {
    priceFrom: 'Preis von',
    unitPer: 'pro',
    nav: 'Katalog',
    badge: 'Verifizierter Katalog',
    title: 'Echte Produkte, die wir im Blick haben',
    subtitle:
      'Produkte aus Open Food Facts mit Packungsgröße und Quelle. Wir prüfen die Größe jede Nacht und sagen Bescheid, wenn eine Packung kleiner wird.',
    search: 'Name, Marke oder Barcode suchen…',
    all: 'Alle',
    priceSoon: 'Preis folgt',
    priceSoonHint: 'Die Preise dieser Produkte erfassen wir noch nicht, nur die Packungsgröße. Preise folgen.',
    size: 'Packungsgröße',
    category: 'Kategorie',
    source: 'Quelle',
    checked: 'Zuletzt geprüft',
    shrunk: 'Packung wurde kleiner',
    showMore: 'Mehr anzeigen',
    showing: (shown, total) => `${shown} von ${total} angezeigt`,
    empty: 'Keine Produkte passen zu deiner Suche.',
  },
  fr: {
    priceFrom: 'Prix de',
    unitPer: 'par',
    nav: 'Catalogue',
    badge: 'Catalogue vérifié',
    title: 'De vrais produits que nous suivons',
    subtitle:
      'Des produits issus d’Open Food Facts, avec leur taille et leur source. Nous vérifions la taille chaque nuit et vous prévenons si un emballage rétrécit.',
    search: 'Rechercher un nom, une marque ou un code-barres…',
    all: 'Tous',
    priceSoon: 'Prix à venir',
    priceSoonHint: "Nous ne suivons pas encore les prix de ces produits, seulement la taille de l'emballage. Prix à venir.",
    size: "Taille de l'emballage",
    category: 'Catégorie',
    source: 'Source',
    checked: 'Dernière vérification',
    shrunk: "L'emballage a rétréci",
    showMore: 'Voir plus',
    showing: (shown, total) => `${shown} sur ${total} affichés`,
    empty: 'Aucun produit ne correspond à votre recherche.',
  },
  es: {
    priceFrom: 'Precio de',
    unitPer: 'por',
    nav: 'Catálogo',
    badge: 'Catálogo verificado',
    title: 'Productos reales que seguimos',
    subtitle:
      'Productos de Open Food Facts, con tamaño del envase y fuente. Comprobamos el tamaño cada noche y avisamos si un envase se reduce.',
    search: 'Buscar nombre, marca o código de barras…',
    all: 'Todos',
    priceSoon: 'Precio próximamente',
    priceSoonHint: 'Todavía no seguimos los precios de estos productos, solo el tamaño del envase. Precios próximamente.',
    size: 'Tamaño del envase',
    category: 'Categoría',
    source: 'Fuente',
    checked: 'Última comprobación',
    shrunk: 'El envase se redujo',
    showMore: 'Ver más',
    showing: (shown, total) => `Mostrando ${shown} de ${total}`,
    empty: 'Ningún producto coincide con tu búsqueda.',
  },
};

const CATEGORY_LABELS: Partial<Record<CountryRouteCode, Record<string, string>>> = {
  no: { 'Coffee & Tea': 'Kaffe og te', 'Chocolate & Sweets': 'Sjokolade og søtsaker', Dairy: 'Meieri', Snacks: 'Snacks', 'Cereals & Porridge': 'Frokostblanding og grøt', 'Pasta, Rice & Dry Goods': 'Pasta, ris og tørrvarer', 'Juice & Drinks': 'Juice og drikke', 'Personal Care': 'Personlig pleie', 'Cleaning & Laundry': 'Vask og rengjøring', 'Toilet Paper': 'Toalettpapir', 'Sauces & Spreads': 'Sauser og pålegg', 'Bakery': 'Brød og bakevarer', 'Frozen': 'Frysevarer', 'Store Brands': 'Egne merker' },
  se: { 'Coffee & Tea': 'Kaffe och te', 'Chocolate & Sweets': 'Choklad och godis', Dairy: 'Mejeri', Snacks: 'Snacks', 'Cereals & Porridge': 'Flingor och gröt', 'Pasta, Rice & Dry Goods': 'Pasta, ris och torrvaror', 'Juice & Drinks': 'Juice och dryck', 'Personal Care': 'Personlig vård', 'Cleaning & Laundry': 'Tvätt och städ', 'Toilet Paper': 'Toalettpapper', 'Sauces & Spreads': 'Såser och pålägg', 'Bakery': 'Bröd och bakverk', 'Frozen': 'Frysta varor', 'Store Brands': 'Egna märken' },
  dk: { 'Coffee & Tea': 'Kaffe og te', 'Chocolate & Sweets': 'Chokolade og slik', Dairy: 'Mejeri', Snacks: 'Snacks', 'Cereals & Porridge': 'Morgenmad og grød', 'Pasta, Rice & Dry Goods': 'Pasta, ris og tørvarer', 'Juice & Drinks': 'Juice og drikke', 'Personal Care': 'Personlig pleje', 'Cleaning & Laundry': 'Vask og rengøring', 'Toilet Paper': 'Toiletpapir', 'Sauces & Spreads': 'Saucer og pålæg', 'Bakery': 'Brød og bagværk', 'Frozen': 'Frostvarer', 'Store Brands': 'Egne mærker' },
  pl: { 'Coffee & Tea': 'Kawa i herbata', 'Chocolate & Sweets': 'Czekolada i słodycze', Dairy: 'Nabiał', Snacks: 'Przekąski', 'Cereals & Porridge': 'Płatki i owsianka', 'Pasta, Rice & Dry Goods': 'Makaron, ryż i produkty suche', 'Juice & Drinks': 'Soki i napoje', 'Personal Care': 'Pielęgnacja', 'Cleaning & Laundry': 'Pranie i czystość', 'Toilet Paper': 'Papier toaletowy', 'Sauces & Spreads': 'Sosy i smarowidła', 'Bakery': 'Pieczywo', 'Frozen': 'Mrożonki', 'Store Brands': 'Marki własne' },
  de: { 'Coffee & Tea': 'Kaffee & Tee', 'Chocolate & Sweets': 'Schokolade & Süßwaren', Dairy: 'Milchprodukte', Snacks: 'Snacks', 'Cereals & Porridge': 'Müsli & Haferbrei', 'Pasta, Rice & Dry Goods': 'Nudeln, Reis & Trockenware', 'Juice & Drinks': 'Saft & Getränke', 'Personal Care': 'Körperpflege', 'Cleaning & Laundry': 'Wasch- & Reinigungsmittel', 'Toilet Paper': 'Toilettenpapier', 'Sauces & Spreads': 'Soßen & Aufstriche', 'Bakery': 'Brot & Backwaren', 'Frozen': 'Tiefkühlkost', 'Store Brands': 'Eigenmarken' },
  fr: { 'Coffee & Tea': 'Café et thé', 'Chocolate & Sweets': 'Chocolat et confiseries', Dairy: 'Produits laitiers', Snacks: 'Snacks', 'Cereals & Porridge': 'Céréales et porridge', 'Pasta, Rice & Dry Goods': 'Pâtes, riz et produits secs', 'Juice & Drinks': 'Jus et boissons', 'Personal Care': 'Soins personnels', 'Cleaning & Laundry': 'Lessive et entretien', 'Toilet Paper': 'Papier toilette', 'Sauces & Spreads': 'Sauces et tartinables', 'Bakery': 'Pains et viennoiseries', 'Frozen': 'Surgelés', 'Store Brands': 'Marques de distributeur' },
  es: { 'Coffee & Tea': 'Café y té', 'Chocolate & Sweets': 'Chocolate y dulces', Dairy: 'Lácteos', Snacks: 'Snacks', 'Cereals & Porridge': 'Cereales y papillas', 'Pasta, Rice & Dry Goods': 'Pasta, arroz y secos', 'Juice & Drinks': 'Zumos y bebidas', 'Personal Care': 'Cuidado personal', 'Cleaning & Laundry': 'Detergentes y limpieza', 'Toilet Paper': 'Papel higiénico', 'Sauces & Spreads': 'Salsas y untables', 'Bakery': 'Pan y bollería', 'Frozen': 'Congelados', 'Store Brands': 'Marcas blancas' },
};

const LOCALE_BY_MARKET: Record<CountryRouteCode, string> = {
  en: 'en-US', us: 'en-US', uk: 'en-GB', no: 'nb-NO', se: 'sv-SE', dk: 'da-DK',
  pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
};

/** Open Food/Beauty/Products Facts data is ODbL: always mark it as such next to the source. */
const licensed = (name: string): string =>
  /^Open (Food|Beauty|Products) Facts$/.test(name) ? `${name} (ODbL)` : name;

const PAGE_SIZE = 12;

export default function CatalogSection({
  items,
  countryCode,
  userPrices = {},
  onAddPrice,
  onPriceVoted,
}: {
  items: CatalogItem[];
  countryCode: CountryRouteCode;
  userPrices?: Record<string, UserPrice>;
  onAddPrice?: (barcode: string) => void;
  onPriceVoted?: (id: number, counts: { confirmations: number; reports: number }) => void;
}) {
  const ui = CATALOG_UI[countryCode] ?? EN;
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat(LOCALE_BY_MARKET[countryCode], { style: 'currency', currency }).format(value);
  const catLabel = (c: string) => CATEGORY_LABELS[countryCode]?.[c] ?? c;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === 'ALL' || i.category === category) &&
        (!t ||
          i.name.toLowerCase().includes(t) ||
          (i.brand ?? '').toLowerCase().includes(t) ||
          i.barcode.includes(t))
    );
  }, [items, query, category]);

  if (items.length === 0) return null;
  const visible = filtered.slice(0, limit);

  return (
    <section
      id="catalog"
      data-testid="catalog-section"
      className="scroll-mt-20 py-6 space-y-6"
    >
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-savings">
          <ShieldCheck className="size-4" /> {ui.badge}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{ui.title}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{ui.subtitle}</p>
        {onAddPrice && (
          <button
            type="button"
            onClick={() => onAddPrice('')}
            data-testid="add-price-btn"
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <Tag className="size-4" /> {userPriceStrings(countryCode).add}
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-3xl border border-warn/30 bg-warn/10 p-5">
        <span className="rounded-full bg-warn/20 px-3 py-1 text-xs font-bold text-warn">{ui.priceSoon}</span>
        <p className="text-sm text-muted-foreground">
          {ui.priceSoonHint}
          {countryCode === 'no' && (
            <>
              {' '}
              <a
                href="https://mattilbud.no/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-savings underline underline-offset-2"
              >
                Se dagens tilbud på mattilbud.no →
              </a>
            </>
          )}
        </p>
      </div>

      <div className="card-kilo space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-input bg-secondary px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={ui.search}
            inputMode="search"
            className="w-full bg-transparent py-3 text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setLimit(PAGE_SIZE);
              }}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                category === c
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {c === 'ALL' ? ui.all : catLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => {
          const src = item.sources?.[0];
          const shrunk = (item.shrinkEvents?.length ?? 0) > 0;
          return (
            <article
              key={item.id}
              data-testid={`catalog-item-${item.id}`}
              className="card-kilo flex flex-col justify-between p-5 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="size-14 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="size-6 text-muted-foreground" />
                    )}
                  </span>
                  {item.price ? (
                    <span className="text-right">
                      <span className="block font-display text-2xl font-extrabold leading-none tabular text-foreground">
                        {money(item.price.value, item.price.currency)}
                      </span>
                      {item.price.unitPrice !== undefined && item.price.unitLabel && (
                        <span className="mt-1 block text-xs tabular text-muted-foreground">
                          {money(item.price.unitPrice, item.price.currency)} {ui.unitPer} {item.price.unitLabel}
                        </span>
                      )}
                    </span>
                  ) : userPrices[item.barcode] ? null : (
                    <span
                      title={ui.priceSoonHint}
                      className="rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn"
                    >
                      {ui.priceSoon}
                    </span>
                  )}
                </div>
                {item.brand && <p className="mt-4 text-xs text-muted-foreground">{item.brand}</p>}
                <h3 className="text-lg font-bold leading-snug text-foreground">{item.name}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{ui.size}</dt>
                  <dd className="text-right font-semibold tabular text-foreground">{item.measure}</dd>
                  <dt className="text-muted-foreground">{ui.category}</dt>
                  <dd className="truncate text-right text-foreground">{catLabel(item.category)}</dd>
                </dl>
                {shrunk && (
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-shrink/15 px-3 py-1 text-xs font-semibold text-shrink">
                    <TrendingDown className="size-3.5" /> {ui.shrunk}
                  </p>
                )}
                {userPrices[item.barcode] && onPriceVoted && (
                  <UserPriceBlock
                    price={userPrices[item.barcode]}
                    countryCode={countryCode}
                    onVoted={onPriceVoted}
                  />
                )}
                {onAddPrice && (
                  <button
                    type="button"
                    onClick={() => onAddPrice(item.barcode)}
                    data-testid={`add-price-${item.barcode}`}
                    className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <Tag className="size-3.5 text-savings" /> {userPriceStrings(countryCode).add}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
                {src &&
                  (src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {ui.source}: {licensed(src.name)}
                    </a>
                  ) : (
                    <span>
                      {ui.source}: {licensed(src.name)}
                    </span>
                  ))}
                {item.price && !item.price.url && item.price.source && item.price.source !== 'Open Prices' && (
                  <span>
                    {ui.source}: {item.price.source} · {ui.checked}: {item.price.date ?? item.lastChecked}
                  </span>
                )}
                {item.price?.url && (
                  <a
                    href={item.price.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {ui.priceFrom} Open Prices (ODbL)
                    {item.price.store ? ` · ${item.price.store}` : ''}
                    {item.price.date ? ` · ${item.price.date}` : ''}
                  </a>
                )}
                {item.lastChecked && (
                  <span className="tabular">
                    {ui.checked}: {item.lastChecked}
                  </span>
                )}
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {ui.empty}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{ui.showing(visible.length, filtered.length)}</p>
        {visible.length < filtered.length && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="cursor-pointer rounded-full border border-border bg-card px-6 py-2.5 font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            {ui.showMore}
          </button>
        )}
      </div>
    </section>
  );
}
