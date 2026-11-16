import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Flag, Loader2, Tag, Users, X } from 'lucide-react';
import type { CountryRouteCode } from '../locales';
import { acceptGtin, decodeBarcodeFromFile } from '../utils/barcode';
import { readPriceFromFile } from '../utils/priceOcr';
import { CHAINS, detectStore } from '../utils/storeNames';

/** A price entered by a visitor. Always shown as "user submitted" with store and date. */
export interface UserPrice {
  id: number;
  ean: string;
  price: number;
  currency: string;
  store: string;
  created_at: string;
  confirmations: number;
  reports: number;
}

interface Strings {
  add: string;
  title: string;
  intro: string;
  barcode: string;
  scan: string;
  price: string;
  store: string;
  storePlaceholder: string;
  submit: string;
  saved: string;
  savedNotInCatalog: string;
  invalid: string;
  unusual: string;
  rateLimited: string;
  error: string;
  badge: string;
  confirm: string;
  report: string;
  thanks: string;
  ownPrice: string;
  close: string;
}

const STR: Record<CountryRouteCode, Strings> = {
  no: {
    add: 'Legg inn pris', title: 'Legg inn en pris', intro: 'Sett inn det du så i butikken. Prisen vises med en gang for alle, merket som brukerinnsendt.',
    barcode: 'Strekkode', scan: 'Skann', price: 'Pris', store: 'Butikk', storePlaceholder: 'f.eks. Rema 1000, Kiwi, Coop Extra',
    submit: 'Lagre pris', saved: 'Takk! Prisen er lagret og vises nå på produktkortet.',
    savedNotInCatalog: 'Takk! Prisen er lagret. Den vises på produktkortet så snart varen er i katalogen.',
    invalid: 'Sjekk strekkode (8–14 siffer), pris og butikk.', unusual: 'Prisen ser uvanlig ut sammenlignet med målt pris. Sjekk at du har skrevet riktig.',
    rateLimited: 'Du har lagt inn mange priser nå. Prøv igjen om en stund.', error: 'Noe gikk galt. Prøv igjen.',
    badge: 'brukerinnsendt', confirm: 'Stemmer', report: 'Feil pris', thanks: 'Takk for tilbakemeldingen', ownPrice: 'Du kan ikke bekrefte din egen pris', close: 'Lukk',
  },
  se: {
    add: 'Lägg till pris', title: 'Lägg till ett pris', intro: 'Skriv in det du såg i butiken. Priset visas direkt för alla, märkt som användarinskickat.',
    barcode: 'Streckkod', scan: 'Skanna', price: 'Pris', store: 'Butik', storePlaceholder: 't.ex. ICA, Willys, Coop',
    submit: 'Spara pris', saved: 'Tack! Priset är sparat och visas nu på produktkortet.',
    savedNotInCatalog: 'Tack! Priset är sparat. Det visas på produktkortet så fort varan finns i katalogen.',
    invalid: 'Kontrollera streckkod (8–14 siffror), pris och butik.', unusual: 'Priset ser ovanligt ut jämfört med uppmätt pris. Kontrollera att du skrivit rätt.',
    rateLimited: 'Du har lagt in många priser nu. Försök igen om en stund.', error: 'Något gick fel. Försök igen.',
    badge: 'användarinskickat', confirm: 'Stämmer', report: 'Fel pris', thanks: 'Tack för återkopplingen', ownPrice: 'Du kan inte bekräfta ditt eget pris', close: 'Stäng',
  },
  dk: {
    add: 'Indsend pris', title: 'Indsend en pris', intro: 'Skriv det, du så i butikken. Prisen vises med det samme for alle, mærket som brugerindsendt.',
    barcode: 'Stregkode', scan: 'Scan', price: 'Pris', store: 'Butik', storePlaceholder: 'fx Netto, Rema 1000, Føtex',
    submit: 'Gem pris', saved: 'Tak! Prisen er gemt og vises nu på produktkortet.',
    savedNotInCatalog: 'Tak! Prisen er gemt. Den vises på produktkortet, så snart varen er i kataloget.',
    invalid: 'Tjek stregkode (8–14 cifre), pris og butik.', unusual: 'Prisen ser usædvanlig ud sammenlignet med målt pris. Tjek, at du har skrevet rigtigt.',
    rateLimited: 'Du har indsendt mange priser. Prøv igen om lidt.', error: 'Noget gik galt. Prøv igen.',
    badge: 'brugerindsendt', confirm: 'Passer', report: 'Forkert pris', thanks: 'Tak for din tilbagemelding', ownPrice: 'Du kan ikke bekræfte din egen pris', close: 'Luk',
  },
  pl: {
    add: 'Dodaj cenę', title: 'Dodaj cenę', intro: 'Wpisz to, co widziałeś w sklepie. Cena pojawi się od razu dla wszystkich, oznaczona jako dodana przez użytkownika.',
    barcode: 'Kod kreskowy', scan: 'Skanuj', price: 'Cena', store: 'Sklep', storePlaceholder: 'np. Biedronka, Lidl, Żabka',
    submit: 'Zapisz cenę', saved: 'Dziękujemy! Cena została zapisana i widać ją na karcie produktu.',
    savedNotInCatalog: 'Dziękujemy! Cena zapisana. Pojawi się na karcie, gdy produkt trafi do katalogu.',
    invalid: 'Sprawdź kod (8–14 cyfr), cenę i sklep.', unusual: 'Cena wygląda nietypowo w porównaniu ze zmierzoną. Sprawdź, czy wpisano poprawnie.',
    rateLimited: 'Dodano już wiele cen. Spróbuj ponownie za jakiś czas.', error: 'Coś poszło nie tak. Spróbuj ponownie.',
    badge: 'dodane przez użytkownika', confirm: 'Zgadza się', report: 'Błędna cena', thanks: 'Dziękujemy za opinię', ownPrice: 'Nie możesz potwierdzić własnej ceny', close: 'Zamknij',
  },
  de: {
    add: 'Preis melden', title: 'Preis melden', intro: 'Trag ein, was du im Laden gesehen hast. Der Preis erscheint sofort für alle, gekennzeichnet als von Nutzern gemeldet.',
    barcode: 'Barcode', scan: 'Scannen', price: 'Preis', store: 'Geschäft', storePlaceholder: 'z. B. REWE, Edeka, Lidl',
    submit: 'Preis speichern', saved: 'Danke! Der Preis ist gespeichert und erscheint jetzt auf der Produktkarte.',
    savedNotInCatalog: 'Danke! Der Preis ist gespeichert. Er erscheint auf der Karte, sobald das Produkt im Katalog ist.',
    invalid: 'Bitte Barcode (8–14 Ziffern), Preis und Geschäft prüfen.', unusual: 'Der Preis weicht stark vom gemessenen Preis ab. Bitte prüfen, ob er stimmt.',
    rateLimited: 'Du hast schon viele Preise gemeldet. Bitte später erneut versuchen.', error: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    badge: 'von Nutzern gemeldet', confirm: 'Stimmt', report: 'Falscher Preis', thanks: 'Danke für die Rückmeldung', ownPrice: 'Den eigenen Preis kannst du nicht bestätigen', close: 'Schließen',
  },
  fr: {
    add: 'Ajouter un prix', title: 'Ajouter un prix', intro: 'Saisissez ce que vous avez vu en magasin. Le prix s’affiche aussitôt pour tous, signalé comme proposé par un utilisateur.',
    barcode: 'Code-barres', scan: 'Scanner', price: 'Prix', store: 'Magasin', storePlaceholder: 'ex. Carrefour, Leclerc, Lidl',
    submit: 'Enregistrer le prix', saved: 'Merci ! Le prix est enregistré et s’affiche sur la fiche produit.',
    savedNotInCatalog: 'Merci ! Le prix est enregistré. Il s’affichera dès que le produit sera dans le catalogue.',
    invalid: 'Vérifiez le code-barres (8 à 14 chiffres), le prix et le magasin.', unusual: 'Ce prix est inhabituel par rapport au prix relevé. Vérifiez votre saisie.',
    rateLimited: 'Vous avez ajouté beaucoup de prix. Réessayez plus tard.', error: 'Une erreur est survenue. Réessayez.',
    badge: 'proposé par un utilisateur', confirm: 'Exact', report: 'Prix faux', thanks: 'Merci pour votre retour', ownPrice: 'Vous ne pouvez pas confirmer votre propre prix', close: 'Fermer',
  },
  es: {
    add: 'Añadir precio', title: 'Añadir un precio', intro: 'Escribe lo que viste en la tienda. El precio se muestra al instante para todos, marcado como enviado por un usuario.',
    barcode: 'Código de barras', scan: 'Escanear', price: 'Precio', store: 'Tienda', storePlaceholder: 'p. ej. Mercadona, Carrefour, Lidl',
    submit: 'Guardar precio', saved: '¡Gracias! El precio está guardado y ya aparece en la ficha del producto.',
    savedNotInCatalog: '¡Gracias! Precio guardado. Aparecerá en la ficha en cuanto el producto esté en el catálogo.',
    invalid: 'Revisa el código (8–14 dígitos), el precio y la tienda.', unusual: 'El precio es muy distinto del precio medido. Comprueba que esté bien escrito.',
    rateLimited: 'Has añadido muchos precios. Inténtalo más tarde.', error: 'Algo salió mal. Inténtalo de nuevo.',
    badge: 'enviado por un usuario', confirm: 'Correcto', report: 'Precio erróneo', thanks: 'Gracias por tu aviso', ownPrice: 'No puedes confirmar tu propio precio', close: 'Cerrar',
  },
  en: {
    add: 'Add a price', title: 'Add a price', intro: 'Enter what you saw in the shop. The price shows up for everyone straight away, labelled as user submitted.',
    barcode: 'Barcode', scan: 'Scan', price: 'Price', store: 'Store', storePlaceholder: 'e.g. Tesco, Aldi, Walmart',
    submit: 'Save price', saved: 'Thank you! The price is saved and now shows on the product card.',
    savedNotInCatalog: 'Thank you! The price is saved. It will show on the product card once the item is in the catalogue.',
    invalid: 'Check the barcode (8–14 digits), price and store.', unusual: 'This price looks unusual compared with the measured price. Please check it.',
    rateLimited: 'You have added many prices. Please try again later.', error: 'Something went wrong. Please try again.',
    badge: 'user submitted', confirm: 'Correct', report: 'Wrong price', thanks: 'Thanks for the feedback', ownPrice: 'You cannot confirm your own price', close: 'Close',
  },
  us: {} as Strings,
  uk: {} as Strings,
};
STR.us = STR.en;
STR.uk = STR.en;

const CURRENCY: Record<CountryRouteCode, string> = {
  en: 'EUR', no: 'NOK', se: 'SEK', dk: 'DKK', pl: 'PLN', de: 'EUR', fr: 'EUR', es: 'EUR', us: 'USD', uk: 'GBP',
};
const LOCALE: Record<CountryRouteCode, string> = {
  en: 'en-IE', no: 'nb-NO', se: 'sv-SE', dk: 'da-DK', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', us: 'en-US', uk: 'en-GB',
};

export const userPriceStrings = (code: CountryRouteCode): Strings => STR[code] ?? STR.en;

// --- The best way to contribute: a photo of the shelf-edge label ------------------------------
interface ShelfStrings {
  badge: string;
  text: string;
  both: string;
  how: string;
}
const SHELF: Record<string, ShelfStrings> = {
  no: { badge: 'Best måte å bidra på', text: 'Ta bilde av prislappen på hyllen (hyllekantetiketten). Den viser pris og strekkode, og hjelper alle på KiloRadar.', both: 'Gjelder både papirlapper og elektroniske etiketter.', how: 'Vi leser strekkoden fra bildet. Du skriver inn prisen.' },
  se: { badge: 'Bästa sättet att bidra', text: 'Ta ett foto av prislappen på hyllan (hyllkantsetiketten). Den visar pris och streckkod och hjälper alla på KiloRadar.', both: 'Gäller både pappersetiketter och elektroniska etiketter.', how: 'Vi läser streckkoden från bilden. Du skriver in priset.' },
  dk: { badge: 'Bedste måde at bidrage på', text: 'Tag et billede af prisskiltet på hylden (hyldekantsetiketten). Det viser pris og stregkode og hjælper alle på KiloRadar.', both: 'Gælder både papirskilte og elektroniske etiketter.', how: 'Vi læser stregkoden fra billedet. Du skriver prisen.' },
  pl: { badge: 'Najlepszy sposób, by pomóc', text: 'Zrób zdjęcie metki cenowej na półce (etykiety półkowej). Pokazuje cenę i kod kreskowy i pomaga wszystkim w KiloRadar.', both: 'Dotyczy zarówno etykiet papierowych, jak i elektronicznych.', how: 'Kod kreskowy odczytamy ze zdjęcia. Cenę wpisujesz Ty.' },
  de: { badge: 'Beste Art zu helfen', text: 'Fotografiere das Preisschild am Regal (Regaletikett). Es zeigt Preis und Barcode und hilft allen bei KiloRadar.', both: 'Gilt für Papieretiketten und elektronische Preisschilder.', how: 'Wir lesen den Barcode aus dem Foto. Den Preis tippst du ein.' },
  fr: { badge: 'La meilleure façon d’aider', text: 'Prenez en photo l’étiquette de prix en rayon (étiquette de gondole). Elle indique le prix et le code-barres, et aide tout le monde sur KiloRadar.', both: 'Valable pour les étiquettes papier comme pour les étiquettes électroniques.', how: 'Nous lisons le code-barres sur la photo. Vous saisissez le prix.' },
  es: { badge: 'La mejor forma de ayudar', text: 'Haz una foto de la etiqueta de precio del estante. Muestra el precio y el código de barras, y ayuda a todos en KiloRadar.', both: 'Sirve tanto para etiquetas de papel como para etiquetas electrónicas.', how: 'Leemos el código de barras de la foto. Tú escribes el precio.' },
  en: { badge: 'Best way to contribute', text: 'Take a photo of the price tag on the shelf (the shelf-edge label). It shows the price and barcode, and helps everyone on KiloRadar.', both: 'Works for both paper and electronic shelf labels.', how: 'We read the barcode from the photo. You type in the price.' },
};

/** Highlighted call to action: photograph the shelf-edge label. Shown where people can add a price. */
export function ShelfTagTip({ countryCode, compact = false }: { countryCode: CountryRouteCode; compact?: boolean }) {
  const s = SHELF[countryCode] ?? SHELF.en;
  return (
    <aside
      data-testid="shelf-tag-tip"
      className={`rounded-2xl border border-savings/40 bg-savings/10 ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}
    >
      <p className="inline-flex items-center gap-1.5 rounded-full bg-savings/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-savings">
        <Camera className="h-3.5 w-3.5" /> {s.badge}
      </p>
      <p className={`mt-2 font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>{s.text}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {s.both} {s.how}
      </p>
    </aside>
  );
}

/** [product found, not in catalogue (price is still saved), check digit does not match] */
const CHECK: Record<string, [string, string, string]> = {
  no: ['Varen', 'Ikke i katalogen ennå. Prisen lagres likevel.', 'Strekkoden stemmer ikke (sjekksiffer). Sjekk tallene.'],
  se: ['Varan', 'Finns inte i katalogen än. Priset sparas ändå.', 'Streckkoden stämmer inte (kontrollsiffra). Kontrollera siffrorna.'],
  dk: ['Varen', 'Ikke i kataloget endnu. Prisen gemmes alligevel.', 'Stregkoden passer ikke (kontrolciffer). Tjek tallene.'],
  pl: ['Produkt', 'Jeszcze nie ma go w katalogu. Cena i tak zostanie zapisana.', 'Kod nie jest poprawny (cyfra kontrolna). Sprawdź cyfry.'],
  de: ['Produkt', 'Noch nicht im Katalog. Der Preis wird trotzdem gespeichert.', 'Der Barcode stimmt nicht (Prüfziffer). Bitte Ziffern prüfen.'],
  fr: ['Produit', 'Pas encore dans le catalogue. Le prix est quand même enregistré.', 'Le code-barres n’est pas valide (clé de contrôle). Vérifiez les chiffres.'],
  es: ['Producto', 'Aún no está en el catálogo. El precio se guarda igualmente.', 'El código no es válido (dígito de control). Revisa los números.'],
  en: ['Product', 'Not in the catalogue yet. The price is still saved.', 'The barcode does not add up (check digit). Please check the digits.'],
};
const checkStrings = (code: CountryRouteCode) => CHECK[code] ?? CHECK.en;

// --- Top contributors (recognition only: no prizes, no money) ---------------------------------
interface BoardStrings {
  title: string;
  sub: string;
  empty: string;
  prices: string;
  nickname: string;
  nicknameHint: string;
  global: string;
}
const BOARD: Record<string, BoardStrings> = {
  no: { title: 'Topp bidragsytere denne måneden', sub: 'Takk til dere som deler priser. Ingen premier, bare en varm takk.', empty: 'Ingen på listen ennå. Legg inn en pris med kallenavn, så er du først!', prices: 'priser', nickname: 'Kallenavn (valgfritt)', nicknameHint: 'Vises på topplisten. La stå tomt for å være anonym.', global: 'Global' },
  se: { title: 'Månadens toppbidragsgivare', sub: 'Tack till er som delar priser. Inga priser, bara ett varmt tack.', empty: 'Ingen på listan än. Lägg in ett pris med smeknamn så är du först!', prices: 'priser', nickname: 'Smeknamn (valfritt)', nicknameHint: 'Visas på topplistan. Lämna tomt för att vara anonym.', global: 'Global' },
  dk: { title: 'Månedens topbidragydere', sub: 'Tak til jer, der deler priser. Ingen præmier, bare en varm tak.', empty: 'Ingen på listen endnu. Indsend en pris med kaldenavn, så er du først!', prices: 'priser', nickname: 'Kaldenavn (valgfrit)', nicknameHint: 'Vises på topplisten. Lad feltet stå tomt for at være anonym.', global: 'Global' },
  pl: { title: 'Najaktywniejsi w tym miesiącu', sub: 'Dziękujemy wszystkim, którzy dzielą się cenami. Bez nagród, po prostu podziękowanie.', empty: 'Nikogo jeszcze nie ma na liście. Dodaj cenę z pseudonimem i bądź pierwszy!', prices: 'cen', nickname: 'Pseudonim (opcjonalnie)', nicknameHint: 'Pokaże się na liście. Zostaw puste, aby pozostać anonimowym.', global: 'Global' },
  de: { title: 'Top-Beitragende in diesem Monat', sub: 'Danke an alle, die Preise teilen. Keine Preise, nur ein herzliches Dankeschön.', empty: 'Noch niemand auf der Liste. Melde einen Preis mit Spitznamen und sei der Erste!', prices: 'Preise', nickname: 'Spitzname (optional)', nicknameHint: 'Wird in der Topliste angezeigt. Leer lassen für anonym.', global: 'Global' },
  fr: { title: 'Meilleurs contributeurs du mois', sub: 'Merci à celles et ceux qui partagent des prix. Pas de prix à gagner, juste un grand merci.', empty: 'Personne dans la liste pour l’instant. Ajoutez un prix avec un pseudo et soyez le premier !', prices: 'prix', nickname: 'Pseudo (facultatif)', nicknameHint: 'Affiché dans le classement. Laissez vide pour rester anonyme.', global: 'Global' },
  es: { title: 'Mejores colaboradores del mes', sub: 'Gracias a quienes comparten precios. Sin premios, solo un agradecimiento.', empty: 'Aún no hay nadie en la lista. ¡Añade un precio con un apodo y sé el primero!', prices: 'precios', nickname: 'Apodo (opcional)', nicknameHint: 'Se muestra en la lista. Déjalo vacío para ser anónimo.', global: 'Global' },
  en: { title: 'Top contributors this month', sub: 'Thank you to everyone who shares prices. No prizes, just a warm thanks.', empty: 'Nobody on the list yet. Add a price with a nickname and be the first!', prices: 'prices', nickname: 'Nickname (optional)', nicknameHint: 'Shown on the top list. Leave empty to stay anonymous.', global: 'Global' },
};
const boardStrings = (code: CountryRouteCode): BoardStrings => BOARD[code] ?? BOARD.en;
const REGION: Record<string, string> = { no: 'NO', se: 'SE', dk: 'DK', pl: 'PL', de: 'DE', fr: 'FR', es: 'ES', us: 'US', uk: 'GB' };
const COUNTRY_LABEL: Record<string, string> = {
  no: 'Land', se: 'Land', dk: 'Land', pl: 'Kraj', de: 'Land', fr: 'Pays', es: 'País', en: 'Country',
};
const CONTRIBUTOR_COUNTRIES = ['NO', 'SE', 'DK', 'PL', 'DE', 'FR', 'ES', 'US', 'GB'];
const COUNTRY_KEY = 'kiloradar-country';
const readCountry = (fallback: string): string => {
  try {
    return localStorage.getItem(COUNTRY_KEY) || fallback;
  } catch {
    return fallback;
  }
};
const NICK_KEY = 'kiloradar-nickname';
const readNick = (): string => {
  try {
    return localStorage.getItem(NICK_KEY) || '';
  } catch {
    return '';
  }
};

interface Contributor {
  market: string;
  country?: string | null;
  prices: number;
  nickname: string;
}

/** Discreet "top contributors this month" list. Refreshes when `refreshKey` changes (after a submit). */
export function ContributorsBoard({ countryCode, refreshKey }: { countryCode: CountryRouteCode; refreshKey: number }) {
  const t = boardStrings(countryCode);
  const [rows, setRows] = useState<Contributor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/contributors', refreshKey > 0 ? { cache: 'no-store' } : undefined)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        if (d && Array.isArray(d.contributors)) setRows(d.contributors as Contributor[]);
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (!loaded) return null;
  const names = (() => {
    try {
      return new Intl.DisplayNames([LOCALE[countryCode]], { type: 'region' });
    } catch {
      return null;
    }
  })();
  const countryOf = (r: Contributor) => {
    const code = r.country || REGION[r.market];
    return code ? names?.of(code) ?? code : t.global;
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="contributors-board">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Users className="h-5 w-5 text-savings" /> {t.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card/50">
          {rows.map((r, i) => (
            <li key={`${r.nickname}-${r.market}`} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-6 shrink-0 font-display font-bold tabular text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{r.nickname}</span>
              <span className="shrink-0 text-muted-foreground">{countryOf(r)}</span>
              <span className="shrink-0 font-semibold tabular text-savings">
                {r.prices} {t.prices}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Loads user prices for a market and keeps them in sync after submit/vote. */
export function useUserPrices(market: string) {
  const [byEan, setByEan] = useState<Record<string, UserPrice>>({});

  useEffect(() => {
    let active = true;
    setByEan({});
    fetch(`/api/prices?market=${market}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d || !Array.isArray(d.prices)) return;
        const map: Record<string, UserPrice> = {};
        for (const p of d.prices as UserPrice[]) map[p.ean] = p;
        setByEan(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [market]);

  const upsert = useCallback((p: UserPrice) => setByEan((prev) => ({ ...prev, [p.ean]: p })), []);
  const patch = useCallback(
    (id: number, counts: { confirmations: number; reports: number }) =>
      setByEan((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) if (next[k].id === id) next[k] = { ...next[k], ...counts };
        return next;
      }),
    []
  );
  return { byEan, upsert, patch };
}

/** Texts for the "photo of the shelf label" flow in the form. */
interface LabelStrings {
  photoBtn: string;
  gallery: string;
  reading: string;
  readPrefix: string;
  readCheck: string;
  notRead: string;
  fillIn: string;
  noneRead: string;
  fromPhoto: string;
  altPrices: string;
  pickStore: string;
  confirmSave: string;
}
const LABEL: Record<string, LabelStrings> = {
  no: { photoBtn: 'Ta bilde av hyllekantetiketten', gallery: 'eller velg bilde fra galleriet', reading: 'Leser etiketten (strekkode, pris og butikk) …', readPrefix: 'Lest fra bildet', readCheck: 'Sjekk at alt stemmer, og rett det som er feil.', notRead: 'Kunne ikke leses', fillIn: 'Fyll inn selv.', noneRead: 'Vi klarte ikke å lese etiketten. Prøv igjen nærmere, rett foran og uten refleks, eller fyll inn selv.', fromPhoto: 'lest fra bildet', altPrices: 'Mulige priser', pickStore: 'Velg butikk', confirmSave: 'Bekreft og lagre pris' },
  se: { photoBtn: 'Ta foto av hyllkantsetiketten', gallery: 'eller välj bild från galleriet', reading: 'Läser etiketten (streckkod, pris och butik) …', readPrefix: 'Läst från bilden', readCheck: 'Kontrollera att allt stämmer och rätta det som är fel.', notRead: 'Kunde inte läsas', fillIn: 'Fyll i själv.', noneRead: 'Vi kunde inte läsa etiketten. Försök igen närmare, rakt framför och utan reflexer, eller fyll i själv.', fromPhoto: 'läst från bilden', altPrices: 'Möjliga priser', pickStore: 'Välj butik', confirmSave: 'Bekräfta och spara pris' },
  dk: { photoBtn: 'Tag billede af hyldekantsetiketten', gallery: 'eller vælg billede fra galleriet', reading: 'Læser etiketten (stregkode, pris og butik) …', readPrefix: 'Læst fra billedet', readCheck: 'Tjek at alt passer, og ret det, der er forkert.', notRead: 'Kunne ikke læses', fillIn: 'Udfyld selv.', noneRead: 'Vi kunne ikke læse etiketten. Prøv igen tættere på, lige foran og uden genskin, eller udfyld selv.', fromPhoto: 'læst fra billedet', altPrices: 'Mulige priser', pickStore: 'Vælg butik', confirmSave: 'Bekræft og gem pris' },
  pl: { photoBtn: 'Zrób zdjęcie etykiety półkowej', gallery: 'albo wybierz zdjęcie z galerii', reading: 'Odczytuję etykietę (kod, cenę i sklep) …', readPrefix: 'Odczytano ze zdjęcia', readCheck: 'Sprawdź, czy wszystko się zgadza, i popraw błędy.', notRead: 'Nie udało się odczytać', fillIn: 'Uzupełnij samodzielnie.', noneRead: 'Nie udało się odczytać etykiety. Spróbuj ponownie bliżej, prosto przed etykietą i bez odblasków, albo uzupełnij samodzielnie.', fromPhoto: 'ze zdjęcia', altPrices: 'Możliwe ceny', pickStore: 'Wybierz sklep', confirmSave: 'Potwierdź i zapisz cenę' },
  de: { photoBtn: 'Foto vom Regaletikett machen', gallery: 'oder Foto aus der Galerie wählen', reading: 'Etikett wird gelesen (Barcode, Preis und Geschäft) …', readPrefix: 'Aus dem Foto gelesen', readCheck: 'Bitte prüfen, ob alles stimmt, und Fehler korrigieren.', notRead: 'Nicht lesbar', fillIn: 'Bitte selbst eintragen.', noneRead: 'Das Etikett konnte nicht gelesen werden. Bitte näher, gerade und ohne Spiegelung erneut versuchen oder selbst eintragen.', fromPhoto: 'aus dem Foto', altPrices: 'Mögliche Preise', pickStore: 'Geschäft wählen', confirmSave: 'Bestätigen und Preis speichern' },
  fr: { photoBtn: 'Photographier l’étiquette de rayon', gallery: 'ou choisir une photo dans la galerie', reading: 'Lecture de l’étiquette (code-barres, prix et magasin) …', readPrefix: 'Lu sur la photo', readCheck: 'Vérifiez que tout est exact et corrigez ce qui ne l’est pas.', notRead: 'Illisible', fillIn: 'À saisir vous-même.', noneRead: 'L’étiquette n’a pas pu être lue. Réessayez de plus près, bien en face et sans reflets, ou saisissez vous-même.', fromPhoto: 'lu sur la photo', altPrices: 'Prix possibles', pickStore: 'Choisir le magasin', confirmSave: 'Confirmer et enregistrer le prix' },
  es: { photoBtn: 'Hacer foto de la etiqueta del estante', gallery: 'o elegir una foto de la galería', reading: 'Leyendo la etiqueta (código, precio y tienda) …', readPrefix: 'Leído de la foto', readCheck: 'Comprueba que todo es correcto y corrige lo que no.', notRead: 'No se pudo leer', fillIn: 'Rellénalo tú.', noneRead: 'No se pudo leer la etiqueta. Inténtalo más cerca, de frente y sin reflejos, o rellénalo tú.', fromPhoto: 'leído de la foto', altPrices: 'Precios posibles', pickStore: 'Elegir tienda', confirmSave: 'Confirmar y guardar precio' },
  en: { photoBtn: 'Take a photo of the shelf-edge label', gallery: 'or pick a photo from your gallery', reading: 'Reading the label (barcode, price and store) …', readPrefix: 'Read from the photo', readCheck: 'Check that everything is right and correct anything that is not.', notRead: 'Could not be read', fillIn: 'Please fill in yourself.', noneRead: 'We could not read the label. Try again closer, straight on and without glare, or fill it in yourself.', fromPhoto: 'read from photo', altPrices: 'Possible prices', pickStore: 'Pick a store', confirmSave: 'Confirm and save price' },
};
const labelStrings = (code: CountryRouteCode): LabelStrings => LABEL[code] ?? LABEL.en;
const formatPrice = (v: number): string => (Number.isInteger(v) ? `${v},00` : String(v.toFixed(2)).replace('.', ','));

export function PriceSubmitModal({
  open,
  onClose,
  countryCode,
  market,
  barcode,
  setBarcode,
  onScan,
  onSaved,
  productName,
  initialPhoto,
  onInitialPhotoUsed,
}: {
  initialPhoto?: File | null;
  onInitialPhotoUsed?: () => void;
  productName?: string | null;
  open: boolean;
  onClose: () => void;
  countryCode: CountryRouteCode;
  market: string;
  barcode: string;
  setBarcode: (v: string) => void;
  onScan: () => void;
  onSaved: (p: UserPrice) => void;
}) {
  const t = userPriceStrings(countryCode);
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [nickname, setNickname] = useState(readNick);
  const [country, setCountry] = useState(() => readCountry(REGION[market] ?? ''));
  const b = boardStrings(countryCode);
  const regionNames = (() => {
    try {
      return new Intl.DisplayNames([LOCALE[countryCode]], { type: 'region' });
    } catch {
      return null;
    }
  })();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // --- photo of the shelf-edge label: barcode (ZXing), price (OCR) and store name (OCR text) ---------
  const L = labelStrings(countryCode);
  const [reading, setReading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [fromPhoto, setFromPhoto] = useState({ barcode: false, price: false, store: false });
  const [altPrices, setAltPrices] = useState<Array<{ value: number; whole: boolean }>>([]);

  const processPhoto = useCallback(
    async (file: File) => {
      setReading(true);
      setMessage(null);
      setReadNote(null);
      setAltPrices([]);
      setPhotoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      const [bc, ocr] = await Promise.allSettled([decodeBarcodeFromFile(file), readPriceFromFile(file)]);
      const code = bc.status === 'fulfilled' ? bc.value : null;
      const read = ocr.status === 'fulfilled' ? ocr.value : null;
      const storeName = read ? detectStore(read.lines, market) : null;
      const priceValue = read?.best?.value ?? null;

      // Everything read is only a suggestion in the form below: nothing is saved before the user confirms.
      if (code) setBarcode(code);
      if (priceValue !== null) setPrice(formatPrice(priceValue));
      if (storeName) setStore(storeName);
      setAltPrices(
        read
          ? [read.best, ...read.alternatives]
              .filter((c): c is NonNullable<typeof c> => !!c && c.value !== priceValue)
              // a lone whole number (like the "24" of a "24,90" whose small "90" could not be read) is offered as a start only
              .map((c) => ({ value: c.value, whole: /^\d+$/.test(c.text) }))
              .filter((c) => !c.whole || c.value < 1000)
              .slice(0, 3)
          : []
      );
      setFromPhoto({ barcode: !!code, price: priceValue !== null, store: !!storeName });

      const t0 = userPriceStrings(countryCode);
      const got = [code && t0.barcode, priceValue !== null && t0.price, storeName && t0.store].filter(Boolean) as string[];
      const missing = [!code && t0.barcode, priceValue === null && t0.price, !storeName && t0.store].filter(Boolean) as string[];
      setReadNote(
        got.length === 0
          ? L.noneRead
          : missing.length === 0
            ? `${L.readPrefix}: ${got.join(', ')}. ${L.readCheck}`
            : `${L.readPrefix}: ${got.join(', ')}. ${L.notRead}: ${missing.join(', ')}. ${L.fillIn} ${L.readCheck}`
      );
      setReading(false);
    },
    [countryCode, market, setBarcode, L]
  );

  useEffect(() => {
    if (open && initialPhoto) {
      onInitialPhotoUsed?.();
      void processPhoto(initialPhoto);
    }
  }, [open, initialPhoto, onInitialPhotoUsed, processPhoto]);

  useEffect(() => {
    if (open) setMessage(null);
    if (!open && photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
      setReadNote(null);
      setFromPhoto({ barcode: false, price: false, store: false });
      setAltPrices([]);
    }
  }, [open, photoUrl]);

  if (!open) return null;

  const badge = (on: boolean) =>
    on ? (
      <span className="ml-2 rounded-full bg-savings/15 px-2 py-0.5 text-[10px] font-semibold text-savings">{L.fromPhoto}</span>
    ) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const code = acceptGtin(barcode);
    if (!code) {
      setMessage({ kind: 'err', text: checkStrings(countryCode)[2] });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market,
          barcode: code,
          price: price.trim(),
          store: store.trim(),
          nickname: nickname.trim(),
          country,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.price) {
        try {
          localStorage.setItem(NICK_KEY, nickname.trim());
          localStorage.setItem(COUNTRY_KEY, country);
        } catch {
          // storage unavailable: the nickname just is not remembered
        }
        onSaved(data.price as UserPrice);
        setMessage({ kind: 'ok', text: data.inCatalog ? t.saved : t.savedNotInCatalog });
        setPrice('');
        setReadNote(null);
        setAltPrices([]);
        setFromPhoto({ barcode: false, price: false, store: false });
        setPhotoUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
      } else if (res.status === 429) setMessage({ kind: 'err', text: t.rateLimited });
      else if (res.status === 422) setMessage({ kind: 'err', text: t.unusual });
      else if (res.status === 400) setMessage({ kind: 'err', text: t.invalid });
      else setMessage({ kind: 'err', text: t.error });
    } catch {
      setMessage({ kind: 'err', text: t.error });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        data-testid="price-form"
        className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Tag className="h-5 w-5 text-savings" /> {t.title}
          </h3>
          <button type="button" onClick={onClose} aria-label={t.close} className="cursor-pointer rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ShelfTagTip countryCode={countryCode} compact />

        <div className="space-y-2">
          <label
            className={`flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground ${
              reading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
            }`}
          >
            {reading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            <span>{reading ? L.reading : L.photoBtn}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              data-testid="price-photo-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void processPhoto(f);
              }}
            />
          </label>
          <label className="block cursor-pointer text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {L.gallery}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              data-testid="price-gallery-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void processPhoto(f);
              }}
            />
          </label>
        </div>

        {(photoUrl || readNote) && (
          <div className="flex gap-3 rounded-2xl border border-border bg-background/60 p-3" data-testid="photo-result">
            {photoUrl && <img src={photoUrl} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />}
            {readNote && (
              <p className="text-sm text-foreground" role="status" data-testid="read-note">
                {readNote}
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{t.intro}</p>

        <label className="block text-sm font-medium text-foreground">
          {t.barcode}
          {badge(fromPhoto.barcode)}
          <div className="mt-1 flex gap-2">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              autoComplete="off"
              required
              data-testid="price-barcode"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 tabular text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="button" onClick={onScan} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-savings/40 bg-background px-3 text-sm font-semibold text-savings hover:bg-secondary">
              <Camera className="h-4 w-4" /> {t.scan}
            </button>
          </div>
        </label>

        {barcode.length >= 8 &&
          (() => {
            const c = checkStrings(countryCode);
            const ok = acceptGtin(barcode);
            if (!ok && barcode.length >= 12) {
              return (
                <p className="-mt-2 text-xs text-shrink" role="status" data-testid="barcode-check">
                  {c[2]}
                </p>
              );
            }
            if (!ok) return null;
            return (
              <p className={`-mt-2 text-xs ${productName ? 'text-savings' : 'text-muted-foreground'}`} role="status" data-testid="barcode-check">
                {productName ? `✓ ${c[0]}: ${productName}` : c[1]}
              </p>
            );
          })()}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-foreground">
            {t.price} ({CURRENCY[countryCode]})
            {badge(fromPhoto.price)}
            <input
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setFromPhoto((f) => ({ ...f, price: false }));
              }}
              inputMode="decimal"
              required
              data-testid="price-value"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 tabular text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            {t.store}
            {badge(fromPhoto.store)}
            <input
              value={store}
              onChange={(e) => {
                setStore(e.target.value);
                setFromPhoto((f) => ({ ...f, store: false }));
              }}
              maxLength={40}
              required
              placeholder={t.storePlaceholder}
              data-testid="price-store"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        {altPrices.length > 0 && (
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="alt-prices">
            <span>{L.altPrices}:</span>
            {altPrices.map((a) => (
              <button
                key={`${a.value}-${a.whole}`}
                type="button"
                onClick={() => {
                  setPrice(a.whole ? `${a.value},` : formatPrice(a.value));
                  setFromPhoto((f) => ({ ...f, price: false }));
                  if (a.whole) document.querySelector<HTMLInputElement>('[data-testid="price-value"]')?.focus();
                }}
                className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 font-semibold tabular text-foreground hover:bg-secondary"
              >
                {a.whole ? `${a.value},…` : formatPrice(a.value)}
              </button>
            ))}
          </div>
        )}

        <div className="-mt-2 flex flex-wrap items-center gap-1.5" data-testid="store-chips">
          <span className="text-xs text-muted-foreground">{L.pickStore}:</span>
          {(CHAINS[market] ?? CHAINS.global).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setStore(c);
                setFromPhoto((f) => ({ ...f, store: false }));
              }}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                store === c ? 'border-savings bg-savings/15 text-savings' : 'border-border bg-card text-foreground hover:bg-secondary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-foreground">
            {b.nickname}
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              data-testid="price-nickname"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            {COUNTRY_LABEL[countryCode] ?? COUNTRY_LABEL.en}
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              data-testid="price-country"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">–</option>
              {CONTRIBUTOR_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {regionNames?.of(c) ?? c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{b.nicknameHint}</p>

        {message && (
          <p role="status" className={`rounded-lg p-3 text-sm ${message.kind === 'ok' ? 'bg-savings/15 text-savings' : 'bg-shrink/15 text-shrink'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {L.confirmSave}
        </button>
      </form>
    </div>
  );
}

const VOTED_KEY = 'kiloradar-voted-prices';
const readVoted = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) || '[]');
  } catch {
    return [];
  }
};

/** The block shown on a product card: price, "user submitted" label, store, date and confirm/report. */
export function UserPriceBlock({
  price,
  countryCode,
  onVoted,
}: {
  price: UserPrice;
  countryCode: CountryRouteCode;
  onVoted: (id: number, counts: { confirmations: number; reports: number }) => void;
}) {
  const t = userPriceStrings(countryCode);
  const [note, setNote] = useState<string | null>(null);
  const [voted, setVoted] = useState<boolean>(() => readVoted().includes(price.id));
  const money = new Intl.NumberFormat(LOCALE[countryCode], { style: 'currency', currency: price.currency }).format(price.price);

  const vote = async (kind: 'confirm' | 'report') => {
    try {
      const res = await fetch('/api/price/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: price.id, kind }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setNote(t.ownPrice);
        return;
      }
      if (res.ok) {
        onVoted(price.id, { confirmations: d.confirmations ?? price.confirmations, reports: d.reports ?? price.reports });
        setVoted(true);
        setNote(t.thanks);
        try {
          localStorage.setItem(VOTED_KEY, JSON.stringify([...readVoted(), price.id].slice(-200)));
        } catch {
          // storage unavailable: the server still allows one vote per person
        }
      } else setNote(t.error);
    } catch {
      setNote(t.error);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-savings/30 bg-savings/5 p-3" data-testid="user-price">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-extrabold tabular text-foreground">{money}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-savings/15 px-2.5 py-0.5 text-[11px] font-semibold text-savings">
          <Users className="h-3 w-3" /> {t.badge}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {price.store} · {price.created_at.slice(0, 10)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={voted}
          onClick={() => vote('confirm')}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5 text-savings" /> {t.confirm} · {price.confirmations}
        </button>
        <button
          type="button"
          disabled={voted}
          onClick={() => vote('report')}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-50"
        >
          <Flag className="h-3.5 w-3.5 text-shrink" /> {t.report} · {price.reports}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
