import { useMemo, useState } from 'react';
import { Package, Search, ShieldCheck, TrendingDown } from 'lucide-react';
import type { CountryRouteCode } from '../locales';

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
}

interface CatalogStrings {
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
  badge: 'Verified catalog',
  title: 'Real products we track',
  subtitle:
    'Real products from Open Food Facts, with pack size and source. We watch the size every night and flag it if a pack gets smaller.',
  search: 'Search name, brand or barcode…',
  all: 'All',
  priceSoon: 'Price coming',
  priceSoonHint: 'Prices are not tracked for this product yet.',
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
    badge: 'Verifisert katalog',
    title: 'Ekte produkter vi følger',
    subtitle:
      'Ekte varer fra Open Food Facts, med pakkestørrelse og kilde. Vi sjekker størrelsen hver natt og varsler hvis en pakke blir mindre.',
    search: 'Søk på navn, merke eller strekkode…',
    all: 'Alle',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi følger ikke prisen på denne varen ennå.',
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
    badge: 'Verifierad katalog',
    title: 'Riktiga produkter vi följer',
    subtitle:
      'Riktiga varor från Open Food Facts, med förpackningsstorlek och källa. Vi kontrollerar storleken varje natt och varnar om en förpackning blir mindre.',
    search: 'Sök namn, märke eller streckkod…',
    all: 'Alla',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi följer inte priset på den här varan ännu.',
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
    badge: 'Verificeret katalog',
    title: 'Rigtige produkter vi følger',
    subtitle:
      'Rigtige varer fra Open Food Facts med pakkestørrelse og kilde. Vi tjekker størrelsen hver nat og advarer, hvis en pakke bliver mindre.',
    search: 'Søg navn, mærke eller stregkode…',
    all: 'Alle',
    priceSoon: 'Pris kommer',
    priceSoonHint: 'Vi følger ikke prisen på denne vare endnu.',
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
    badge: 'Zweryfikowany katalog',
    title: 'Prawdziwe produkty, które śledzimy',
    subtitle:
      'Prawdziwe produkty z Open Food Facts z rozmiarem opakowania i źródłem. Co noc sprawdzamy rozmiar i ostrzegamy, gdy opakowanie się zmniejszy.',
    search: 'Szukaj nazwy, marki lub kodu kreskowego…',
    all: 'Wszystkie',
    priceSoon: 'Cena wkrótce',
    priceSoonHint: 'Nie śledzimy jeszcze ceny tego produktu.',
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
    badge: 'Verifizierter Katalog',
    title: 'Echte Produkte, die wir beobachten',
    subtitle:
      'Echte Produkte aus Open Food Facts mit Packungsgröße und Quelle. Wir prüfen die Größe jede Nacht und melden, wenn eine Packung kleiner wird.',
    search: 'Name, Marke oder Barcode suchen…',
    all: 'Alle',
    priceSoon: 'Preis folgt',
    priceSoonHint: 'Den Preis dieses Produkts erfassen wir noch nicht.',
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
    badge: 'Catalogue vérifié',
    title: 'Des produits réels que nous suivons',
    subtitle:
      "Des produits réels issus d'Open Food Facts, avec leur taille et leur source. Nous vérifions la taille chaque nuit et signalons toute réduction.",
    search: 'Rechercher un nom, une marque ou un code-barres…',
    all: 'Tous',
    priceSoon: 'Prix à venir',
    priceSoonHint: "Nous ne suivons pas encore le prix de ce produit.",
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
    badge: 'Catálogo verificado',
    title: 'Productos reales que seguimos',
    subtitle:
      'Productos reales de Open Food Facts, con tamaño del envase y fuente. Comprobamos el tamaño cada noche y avisamos si un envase se reduce.',
    search: 'Buscar nombre, marca o código de barras…',
    all: 'Todos',
    priceSoon: 'Precio próximamente',
    priceSoonHint: 'Todavía no seguimos el precio de este producto.',
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
  no: { 'Coffee & Tea': 'Kaffe og te', 'Chocolate & Sweets': 'Sjokolade og søtsaker', Dairy: 'Meieri', Snacks: 'Snacks', 'Cereals & Porridge': 'Frokostblanding og grøt', 'Pasta, Rice & Dry Goods': 'Pasta, ris og tørrvarer', 'Juice & Drinks': 'Juice og drikke' },
  se: { 'Coffee & Tea': 'Kaffe och te', 'Chocolate & Sweets': 'Choklad och godis', Dairy: 'Mejeri', Snacks: 'Snacks', 'Cereals & Porridge': 'Flingor och gröt', 'Pasta, Rice & Dry Goods': 'Pasta, ris och torrvaror', 'Juice & Drinks': 'Juice och dryck' },
  dk: { 'Coffee & Tea': 'Kaffe og te', 'Chocolate & Sweets': 'Chokolade og slik', Dairy: 'Mejeri', Snacks: 'Snacks', 'Cereals & Porridge': 'Morgenmad og grød', 'Pasta, Rice & Dry Goods': 'Pasta, ris og tørvarer', 'Juice & Drinks': 'Juice og drikke' },
  pl: { 'Coffee & Tea': 'Kawa i herbata', 'Chocolate & Sweets': 'Czekolada i słodycze', Dairy: 'Nabiał', Snacks: 'Przekąski', 'Cereals & Porridge': 'Płatki i owsianka', 'Pasta, Rice & Dry Goods': 'Makaron, ryż i produkty suche', 'Juice & Drinks': 'Soki i napoje' },
  de: { 'Coffee & Tea': 'Kaffee & Tee', 'Chocolate & Sweets': 'Schokolade & Süßwaren', Dairy: 'Milchprodukte', Snacks: 'Snacks', 'Cereals & Porridge': 'Müsli & Haferbrei', 'Pasta, Rice & Dry Goods': 'Nudeln, Reis & Trockenware', 'Juice & Drinks': 'Saft & Getränke' },
  fr: { 'Coffee & Tea': 'Café et thé', 'Chocolate & Sweets': 'Chocolat et confiseries', Dairy: 'Produits laitiers', Snacks: 'Snacks', 'Cereals & Porridge': 'Céréales et porridge', 'Pasta, Rice & Dry Goods': 'Pâtes, riz et produits secs', 'Juice & Drinks': 'Jus et boissons' },
  es: { 'Coffee & Tea': 'Café y té', 'Chocolate & Sweets': 'Chocolate y dulces', Dairy: 'Lácteos', Snacks: 'Snacks', 'Cereals & Porridge': 'Cereales y papillas', 'Pasta, Rice & Dry Goods': 'Pasta, arroz y secos', 'Juice & Drinks': 'Zumos y bebidas' },
};

const PAGE_SIZE = 12;

export default function CatalogSection({
  items,
  countryCode,
}: {
  items: CatalogItem[];
  countryCode: CountryRouteCode;
}) {
  const ui = CATALOG_UI[countryCode] ?? EN;
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
                  <span
                    title={ui.priceSoonHint}
                    className="rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn"
                  >
                    {ui.priceSoon}
                  </span>
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
                      {ui.source}: {src.name}
                    </a>
                  ) : (
                    <span>
                      {ui.source}: {src.name}
                    </span>
                  ))}
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
