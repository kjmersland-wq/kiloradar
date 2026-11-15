"""Documented shrinkflation cases from public consumer-organisation sources.

Only facts the source page itself states are stored: product, brand, size before/after,
the date shown on the source and a link. Nothing is copied beyond these facts and nothing is guessed.
Run: python scripts/documented_events.py  ->  public/data/documented_events.json
"""
import json
from collections import Counter
from pathlib import Path

WHICH = "Which?"
VZHH = "Verbraucherzentrale Hamburg"
MP = "Mouse Print"
W1 = "https://www.which.co.uk/policy-and-insight/article/shrinkflation-or-skimpflation-which-reveals-the-supermarket-groceries-getting-downsized-and-downgraded-aBphA9E1Ifyt"
W2 = "https://www.which.co.uk/news/article/shrinkflation-on-the-rise-which-reveals-the-items-that-have-shrunk-in-size-but-not-in-price-az2376B4mj5T"
W3 = "https://www.which.co.uk/policy-and-insight/article/enough-to-give-you-heartburn-which-finds-wave-of-shrinkflation-striking-coffee-toothpasteand-even-gaviscon-aDdzJ1r1RIXA"
V = "https://www.vzhh.de/themen/mogelpackungen/mogelpackungen-weniger-drin-preis-gleich"
VL = "https://www.vzhh.de/mogelpackungsliste"
VS = "https://www.vzhh.de/themen/mogelpackungen/klage-gegen-mogelpackung-sanella-gewonnen"
M1 = "https://www.mouseprint.org/2026/06/01/here-we-shrink-again-spring-2026-part-1/"
M2 = "https://www.mouseprint.org/2025/09/29/here-we-shrink-again-fall-2025-part-2/"
M3 = "https://www.mouseprint.org/2025/05/26/here-we-shrink-again-spring-2025/"
M4 = "https://www.mouseprint.org/2025/10/13/tide-drops-ounces-but-number-of-loads-and-the-dosing-caps-remain-unchanged/"

# (market, product, brand, before, after, unit, source, url, date)
ROWS = [
    ("uk", "Listerine Fresh Burst mouthwash", "Listerine", 600, 500, "ml", WHICH, W1, "2024-01-20"),
    ("uk", "PG Tips Tasty Decaf Pyramid tea bags", "PG Tips", 180, 140, "bags", WHICH, W1, "2024-01-20"),
    ("uk", "Andrex Classic Clean Flushable Washlets", "Andrex", 40, 36, "pcs", WHICH, W1, "2024-01-20"),
    ("uk", "Bisto Best Chicken Gravy Granules", "Bisto", 250, 230, "g", WHICH, W1, "2024-01-20"),
    ("uk", "Cadbury Brunch Chocolate Chip Bars", "Cadbury", 6, 5, "pcs", WHICH, W1, "2024-01-20"),
    ("uk", "Coffee Mate Original Whitener", "Coffee Mate", 500, 450, "g", WHICH, W1, "2024-01-20"),
    ("uk", "Colgate Triple Action Toothpaste", "Colgate", 100, 75, "ml", WHICH, W1, "2024-01-20"),
    ("uk", "Kettle Chips Sea Salt and Crushed Black Peppercorns", "Kettle Chips", 150, 130, "g", WHICH, W1, "2024-01-20"),
    ("uk", "Lurpak Slightly Salted Butter", "Lurpak", 225, 180, "g", WHICH, W1, "2024-01-20"),
    ("uk", "McVitie's Digestives Dark Chocolate Biscuits", "McVitie's", 433, 400, "g", WHICH, W1, "2024-01-20"),
    ("uk", "Yeo Valley Organic Salted Spreadable", "Yeo Valley", 500, 400, "g", WHICH, W1, "2024-01-20"),
    ("uk", "Lurpak butter (salted, unsalted, lighter)", "Lurpak", 250, 200, "g", WHICH, W2, "2023-07-25"),
    ("uk", "Whiskas cat food pouches", "Whiskas", 100, 85, "g", WHICH, W2, "2023-07-25"),
    ("uk", "McVitie's Digestives", "McVitie's", 400, 360, "g", WHICH, W2, "2023-07-25"),
    ("uk", "Richmond meat-free sausages", "Richmond", 336, 304, "g", WHICH, W2, "2023-07-25"),
    ("uk", "Magnum ice creams (four pack)", "Magnum", 110, 100, "ml", WHICH, W2, "2023-07-25"),
    ("uk", "Quality Street chocolate tubs", "Nestle", 650, 600, "g", WHICH, W2, "2023-07-25"),
    ("uk", "Pringles tubes", "Pringles", 200, 185, "g", WHICH, W2, "2023-07-25"),
    ("uk", "Comfort Pure fabric conditioner", "Comfort", 85, 83, "washes", WHICH, W2, "2023-07-25"),
    ("uk", "Aquafresh Complete Care Original Toothpaste", "Aquafresh", 100, 75, "ml", WHICH, W3, "2025-10-28"),
    ("uk", "Gaviscon Heartburn and Indigestion Liquid", "Gaviscon", 600, 500, "ml", WHICH, W3, "2025-10-28"),
    ("uk", "Sainsbury's Scottish Oats", "Sainsbury's", 1000, 500, "g", WHICH, W3, "2025-10-28"),
    ("uk", "Nescafe Original Instant Coffee", "Nescafe", 200, 190, "g", WHICH, W3, "2025-10-28"),
    ("uk", "KitKat Two-Finger Milk Chocolate multipack", "Nestle", 21, 18, "pcs", WHICH, W3, "2025-10-28"),
    ("uk", "Quality Street chocolate tubs", "Nestle", 600, 550, "g", WHICH, W3, "2025-10-28"),
    ("uk", "Cadbury Freddo multipack", "Cadbury", 5, 4, "pcs", WHICH, W3, "2025-10-28"),
    ("uk", "Cadbury Fudge multipack", "Cadbury", 5, 4, "pcs", WHICH, W3, "2025-10-28"),
    ("uk", "Terry's Chocolate Orange ball toffee crunch", "Terry's", 152, 145, "g", WHICH, W3, "2025-10-28"),
    ("de", "Milky Way Multipack", "Mars", 193.5, 107.5, "g", VZHH, V + "#paragraph-12782", "2026-07-02"),
    ("de", "Crunchy Peanut ice bars", "Edeka", 250, 234, "g", VZHH, V + "#paragraph-12781", "2026-06-15"),
    ("de", "Ofen Chips Paprika", "funny-frisch", 125, 115, "g", VZHH, V + "#paragraph-12779", "2026-05-21"),
    ("de", "Edelkakao Klasse", "Ritter Sport", 100, 75, "g", VZHH, V + "#paragraph-12642", "2026-05-11"),
    ("de", "Milka chocolate bars", "Milka", 100, 90, "g", VZHH, V + "#paragraph-12072", "2025-09-02"),
    ("de", "Favorina Schoko-Weihnachtsmann", "Lidl", 200, 110, "g", VZHH, V + "#paragraph-12318", "2025-11-21"),
    ("de", "Schoko Hafer-Müsli XXL", "Peter Kölln", 1700, 1050, "g", VZHH, V + "#paragraph-12317", "2025-08-20"),
    ("de", "Orangensaft", "Valensina", 1000, 700, "ml", VZHH, V + "#paragraph-11376", "2025-02-04"),
    ("de", "Sanella Streichfett", "Upfield", 500, 400, "g", VZHH, VS, "2024-02-20"),
    ("de", "Beste Wahl Stachelbeeren leicht gezuckert", "Rewe", 380, 360, "g", VZHH, VL, "2026-10-01"),
    ("de", "Lorenz Erdnuss Locken Mexican Style", "Lorenz", 175, 150, "g", VZHH, VL, "2026-10-01"),
    ("de", "Carat Salat-Fix Kräuter italienischer Art", "Netto", 10, 8, "g", VZHH, VL, "2026-10-01"),
    ("de", "Ültje Studenten Futter Original", "Intersnack", 200, 150, "g", VZHH, VL, "2026-10-01"),
    ("de", "KitKat Minis", "Nestlé", 217, 167, "g", VZHH, VL, "2026-09-01"),
    ("de", "Smarties Minis", "Nestlé", 187, 144, "g", VZHH, VL, "2026-09-01"),
    ("de", "Lion Minis", "Nestlé", 234, 180, "g", VZHH, VL, "2026-09-01"),
    ("de", "Romy Kokos", "Hosta", 200, 150, "g", VZHH, VL, "2026-09-01"),
    ("de", "Gut & Günstig Italienische Limone (tea)", "Edeka", 62.5, 50, "g", VZHH, VL, "2026-08-01"),
    ("us", "Dark Chocolate Assortment, party size", "Hershey's", 29, 23.9, "oz", MP, M1, "2026-06-01"),
    ("us", "Toilet paper, mega roll", "Quilted Northern", 295, 255, "sheets", MP, M1, "2026-06-01"),
    ("us", "Bagels, six-pack", "Thomas'", 20, 18, "oz", MP, M1, "2026-06-01"),
    ("us", "Ground coffee", "Great Value", 11.3, 9.6, "oz", MP, M1, "2026-06-01"),
    ("us", "Original Tide liquid detergent", "Tide", 84, 80, "oz", MP, M4, "2025-10-13"),
    ("us", "Mega rolls paper towel", "Bounty", 180, 164, "sheets", MP, M2, "2025-09-29"),
    ("us", "Platinum Plus dishwashing pods", "Cascade", 52, 47, "pods", MP, M2, "2025-09-29"),
    ("us", "Chocolate cupcakes", "Little Debbie", 8, 6, "pcs", MP, M2, "2025-09-29"),
    ("us", "Simply Orange juice carafe", "Simply Orange", 52, 46, "oz", MP, M3, "2025-05-26"),
    ("us", "Potato chips", "Ruffles", 9, 8.5, "oz", MP, M3, "2025-05-26"),
    ("us", "Triple-roll paper towels", "Bounty", 135, 123, "sheets", MP, M3, "2025-05-26"),
]

events = []
for market, product, brand, b, a, unit, src, url, date in ROWS:
    assert 0 < a < b, product
    events.append({
        "market": market, "product": product, "brand": brand,
        "before": b, "after": a, "unit": unit,
        "reductionPct": round((b - a) / b * 100, 1),
        "sourceName": src, "sourceUrl": url, "documentedOn": date,
    })
events.sort(key=lambda e: e["documentedOn"], reverse=True)
out = {
    "note": "Facts only (product, sizes, date, link) taken from the cited public pages. Not copied text.",
    "events": events,
}
p = Path(__file__).resolve().parent.parent / "public" / "data" / "documented_events.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(events), dict(Counter(e["market"] for e in events)))
