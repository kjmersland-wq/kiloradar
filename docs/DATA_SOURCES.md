# KiloRadar – datakilder per marked

Uavhengig, reklamefri og ærlig: vi viser bare data vi kan etterprøve. Hvert produkt får
**kilde, URL og «sist sjekket»**. Denne filen er den levende oversikten over hvilke kilder som
brukes, hvilke som er planlagt, og hva som må avklares før de kan brukes.

**Statuser**

| Status | Betyr |
|---|---|
| ✅ I bruk | Pipelinen henter data fra kilden hver natt. |
| 🔑 Trenger tilgang | Kilden har ikke åpne data. Vi trenger API-nøkkel eller skriftlig tillatelse. Ingenting er hentet. |
| 📄 Redaksjonell | Publiserte undersøkelser/lister. Vi kan *henvise* til dem og registrere enkeltfakta med lenke, men ikke kopiere innholdet. Ingenting er importert ennå. |
| 🔍 Må sjekkes | Vilkår, robots.txt og tekniske muligheter er ikke gjennomgått. Ingenting er hentet. |

## Felles kilder (alle 10 markeder)

| Kilde | Hva | Status |
|---|---|---|
| Open Food Facts (`world.openfoodfacts.org`) | Mat og drikke: strekkode, navn, merke, pakkestørrelse | ✅ I bruk |
| Open Beauty Facts (`world.openbeautyfacts.org`) | Personlig pleie (tannkrem, sjampo, dusjsåpe, deodorant) | ✅ I bruk |
| Open Products Facts (`world.openproductsfacts.org`) | Husholdning (vaskemiddel, toalettpapir) | ✅ I bruk |
| Open Prices (`prices.openfoodfacts.org`) | Crowdsourcede butikkpriser (ODbL, krever kreditering) | ✅ I bruk. Pris vises bare når det finnes en observasjon for samme strekkode, samme marked og samme valuta, ikke eldre enn 12 måneder. Vises med butikk og dato. |
| Brukerrapporter (`/api/report`) | Rapporter om krympede varer | ✅ Mottas. Teller først når flere uavhengige bekrefter. |

De tre åpne databasene gir pakkestørrelse, **ikke priser**. Priser kommer fra Open Prices der
de finnes. Alle andre katalogprodukter viser «Pris kommer». Størrelseshistorikk bygges fra nattlige øyeblikksbilder og fylles aldri bakover.

## Tilbudsaviser og butikker (priser)

Pris er det store gapet i dag. Disse kildene kan fylle det, men ingen av dem er koblet til ennå.

### Norge
| Kilde | Status | Merknad |
|---|---|---|
| mattilbud.no (Tjek) | 🔑 Trenger tillatelse | Adapter bygget, avslått. Se «Tjek / eTilbudsavis» under. |
| REMA 1000, KIWI, Coop, Meny, Spar, Oda | 🔍 Må sjekkes | Egne nettbutikker/aviser. Vilkår må leses først. |
| Forbrukerrådet | 📄 Redaksjonell | Undersøkelser og tester. |

### Sverige
| Kilde | Status |
|---|---|
| matpriser.se | 🔍 Må sjekkes |
| ICA, Coop, Willys | 🔍 Må sjekkes |
| Konsumentverket / Konkurrensverket (Matpriskollen) | 📄 Redaksjonell |

### Danmark
| Kilde | Status | Merknad |
|---|---|---|
| tilbudsavis.dk / eTilbudsavis | 🔑 Trenger tillatelse | Samme plattform (Tjek) som mattilbud.no. |
| Salling Group (Netto, Føtex, Bilka) | 🔍 Må sjekkes | |
| Forbrugerrådet Tænk | 📄 Redaksjonell | |

### Tyskland
| Kilde | Status | Merknad |
|---|---|---|
| Verbraucherzentrale Hamburg, «Mogelpackungen» | 📄 Redaksjonell | Dokumenterte tilfeller. Registreres som enkeltfakta med lenke. |
| REWE, Edeka, Lidl | 🔍 Må sjekkes | |

### Frankrike
| Kilde | Status | Merknad |
|---|---|---|
| Foodwatch | 📄 Redaksjonell | |
| DGCCRF (forbrukermyndighet) | 📄 Redaksjonell | Frankrike har pålagt butikker å merke krympede varer. Bør utnyttes. Bekreft gjeldende regel. |
| Carrefour, Leclerc | 🔍 Må sjekkes | |

### Spania
| Kilde | Status |
|---|---|
| Mercadona, Carrefour ES, Lidl | 🔍 Må sjekkes |
| OCU / FACUA (forbrukerorganisasjoner) | 📄 Redaksjonell |

### Polen
| Kilde | Status |
|---|---|
| UOKiK | 📄 Redaksjonell |
| Biedronka, Lidl PL, Auchan | 🔍 Må sjekkes |

### Storbritannia
| Kilde | Status |
|---|---|
| Which? | 📄 Redaksjonell |
| Trolley.co.uk | 🔍 Må sjekkes |
| Tesco, Sainsbury's, Asda | 🔍 Må sjekkes |
| ONS (offentlig prisstatistikk) | 📄 Redaksjonell |

### USA
| Kilde | Status |
|---|---|
| FullCarts.org | 🔑 Trenger tillatelse | Se «FullCarts.org» over. |
| Mouse Print | 📄 Redaksjonell |
| Consumer World | 📄 Redaksjonell |
| Walmart, Target, Kroger | 🔍 Må sjekkes |

### Global / EUR
Open Food Facts uten landfilter (mest skannede varer verden over) er i bruk. Ingen egne
tilleggskilder.

## Tjek / eTilbudsavis (mattilbud.no m.fl.)

mattilbud.no og tilbudsavis.dk er bygget på Tjek-plattformen. Sjekket 15. november 2026:

- Plattformens API (`api.etilbudsavis.dk/v2`) svarer uten nøkkel, og det finnes åpne MCP-prosjekter
  som bruker det (f.eks. `tilbudstrolden-mcp`). Tilbud for NO, SE, DK og FI kan søkes opp.
- **Vilkårene (tjek.com/terms, kap. 8) sier at API-innhold brukt av tredjeparter, og all kommersiell
  bruk av slikt innhold, krever Tjeks forhåndsgodkjente skriftlige tillatelse** (8.3), og at data
  ikke skal hentes systematisk av tredjeparter uten avtale (8.4).

Derfor er adapteren (`fetch_tjek_offers` i `scripts/sync_products.py`) bygget og testet, men
**avslått som standard**. Den gjør ingenting med mindre `KILORADAR_TJEK_APPROVED=1` er satt, og den
er ikke med i nattjobben. Adapteren normaliserer et tilbud til fakta (produkt, pris, før-pris,
butikk, gyldighet, enhetspris i kr/kg eller kr/l, URL, dato).

Slik slår vi den på: send Tjek en kort forespørsel om skriftlig tillatelse til å vise tilbudspriser
med kildehenvisning på KiloRadar (uavhengig, reklamefri). Når svaret foreligger, sett
`KILORADAR_TJEK_APPROVED=1` i nattjobben. Finland er ikke et KiloRadar-marked ennå.

## FullCarts.org (krympflasjon, primært USA)

- `robots.txt` stenger `/api` og `/admin`. Siden publiserer dokumenterte hendelser med
  kildehenvisninger, men oppgir **ingen åpen lisens eller nedlasting**, og ber om kontakt for
  datalisensiering (`fullcartsinfo@gmail.com`).
- Vi skraper derfor ikke siden. Vi ber om tillatelse (eller en eksport) først. Når den er på plass
  kobles hendelsene til katalogprodukter på merke og navn (RapidFuzz finnes allerede i pipelinen), og
  vises med lenke til FullCarts-hendelsen.

## Regler for å legge til en ny kilde

1. Les `robots.txt` og vilkår. Hvis automatisk henting ikke er tillatt, ber vi om tillatelse eller
   bruker et offisielt API.
2. Identifiser oss (`KiloRadarDataPipeline/1.0 (https://www.kiloradar.com)`), og hold lav
   forespørselsrate.
3. Lagre bare fakta: navn, merke, strekkode, størrelse, pris, butikk, dato og URL.
4. Hvert produkt får `sources` (navn + URL + dato) og `lastChecked`.
5. Ingenting vises som «verifisert» uten at en kilde bekrefter det.
6. Kvalitet foran kvantitet: ugyldige størrelser og urealistiske kilopriser filtreres bort.
