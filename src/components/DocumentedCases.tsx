import { useEffect, useState } from 'react';
import { ExternalLink, FileSearch } from 'lucide-react';
import type { CountryRouteCode } from '../locales';

interface DocumentedEvent {
  market: string;
  product: string;
  brand?: string;
  before: number;
  after: number;
  unit: string;
  reductionPct: number;
  sourceName: string;
  sourceUrl: string;
  documentedOn: string;
}

const STR: Record<string, { heading: string; sub: string; source: string; showMore: string; showLess: string }> = {
  en: { heading: 'Documented shrinkflation', sub: 'Cases published by consumer organisations. Each one links to its source.', source: 'Source', showMore: 'Show all', showLess: 'Show fewer' },
  no: { heading: 'Dokumentert krympflasjon', sub: 'Tilfeller publisert av forbrukerorganisasjoner. Hvert tilfelle lenker til kilden.', source: 'Kilde', showMore: 'Vis alle', showLess: 'Vis færre' },
  se: { heading: 'Dokumenterad krympflation', sub: 'Fall publicerade av konsumentorganisationer. Varje fall länkar till källan.', source: 'Källa', showMore: 'Visa alla', showLess: 'Visa färre' },
  dk: { heading: 'Dokumenteret krympeflation', sub: 'Tilfælde offentliggjort af forbrugerorganisationer. Hvert tilfælde linker til kilden.', source: 'Kilde', showMore: 'Vis alle', showLess: 'Vis færre' },
  pl: { heading: 'Udokumentowany shrinkflation', sub: 'Przypadki opublikowane przez organizacje konsumenckie. Każdy ma link do źródła.', source: 'Źródło', showMore: 'Pokaż wszystkie', showLess: 'Pokaż mniej' },
  de: { heading: 'Dokumentierte Mogelpackungen', sub: 'Von Verbraucherorganisationen veröffentlichte Fälle. Jeder Fall verlinkt auf die Quelle.', source: 'Quelle', showMore: 'Alle anzeigen', showLess: 'Weniger anzeigen' },
  fr: { heading: 'Shrinkflation documentée', sub: 'Cas publiés par des organisations de consommateurs. Chacun renvoie à sa source.', source: 'Source', showMore: 'Tout afficher', showLess: 'Afficher moins' },
  es: { heading: 'Reduflación documentada', sub: 'Casos publicados por organizaciones de consumidores. Cada uno enlaza a su fuente.', source: 'Fuente', showMore: 'Ver todos', showLess: 'Ver menos' },
};

const INITIAL = 9;

export default function DocumentedCases({ countryCode }: { countryCode: CountryRouteCode }) {
  const [events, setEvents] = useState<DocumentedEvent[]>([]);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/data/documented_events.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && Array.isArray(d.events)) setEvents(d.events as DocumentedEvent[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const market = countryCode === 'en' ? null : countryCode;
  const shown = market ? events.filter((e) => e.market === market) : events;
  if (shown.length === 0) return null;
  const t = STR[countryCode] ?? STR.en;
  const list = all ? shown : shown.slice(0, INITIAL);

  return (
    <section id="documented" className="mx-auto max-w-6xl px-4 py-16 sm:px-6" data-testid="documented-cases">
      <div className="flex items-center gap-3">
        <FileSearch className="h-6 w-6 text-savings" aria-hidden="true" />
        <h2 className="font-display text-3xl font-bold text-foreground">{t.heading}</h2>
      </div>
      <p className="mt-2 text-muted-foreground">{t.sub}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e, i) => (
          <li key={`${e.sourceUrl}-${e.product}-${i}`} className="card-kilo p-5">
            <p className="font-semibold text-foreground">{e.product}</p>
            {e.brand && <p className="text-sm text-muted-foreground">{e.brand}</p>}
            <p className="mt-3 font-display text-2xl font-bold tabular text-foreground">
              {e.before} → {e.after} {e.unit}
              <span className="ml-2 text-base font-semibold text-savings">−{e.reductionPct}%</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {t.source}:{' '}
              <a
                href={e.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                {e.sourceName} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>{' '}
              · {e.documentedOn}
            </p>
          </li>
        ))}
      </ul>
      {shown.length > INITIAL && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-6 rounded-full border border-border bg-card px-6 py-3 font-semibold text-foreground hover:bg-secondary"
        >
          {all ? t.showLess : `${t.showMore} (${shown.length})`}
        </button>
      )}
    </section>
  );
}
