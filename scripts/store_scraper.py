"""Careful, optional weekly price collector for grocery retailer websites.

NOT part of the nightly job. Run by hand:
    python scripts/store_scraper.py --preflight     # robots.txt + reachability check only
    python scripts/store_scraper.py --run           # collect prices for the product URLs in scripts/store_seed_urls.json

Rules built in:
- robots.txt is always read first and obeyed (disallowed paths and Crawl-delay). No robots.txt access = skip.
- At most one visit per site per week (state in scripts/store_scraper_state.json); pauses between requests.
- Clear User-Agent with a contact address taken from KILORADAR_CONTACT (default: the website URL).
- Only publicly visible facts are kept: product name, price, currency, size, store, date.
- Blocks (403/429/captcha pages) or changed page structure -> the site/page is skipped and logged. No workarounds.
- Nothing is deployed or written to the catalog automatically: results go to public/data/scraped_prices.json
  and a log to scripts/store_scraper_log.json for review first.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.robotparser
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / "scripts" / "store_scraper_state.json"
LOG_PATH = ROOT / "scripts" / "store_scraper_log.json"
SEED_PATH = ROOT / "scripts" / "store_seed_urls.json"
OUT_PATH = ROOT / "public" / "data" / "scraped_prices.json"

CONTACT = os.environ.get("KILORADAR_CONTACT", "https://www.kiloradar.com")
USER_AGENT = f"KiloRadar/1.0 (+{CONTACT})"
MIN_DAYS_BETWEEN_VISITS = 7
PAUSE_SECONDS = 8.0  # between requests to the same site (raised to Crawl-delay if larger)
TIMEOUT = 20

# market -> list of (store label shown on cards, base URL)
SITES: dict[str, list[tuple[str, str]]] = {
    "no": [("rema.no", "https://www.rema.no"), ("kiwi.no", "https://www.kiwi.no"), ("coop.no", "https://www.coop.no"),
           ("meny.no", "https://www.meny.no"), ("oda.com", "https://oda.com")],
    "se": [("ica.se", "https://www.ica.se"), ("coop.se", "https://www.coop.se"), ("willys.se", "https://www.willys.se")],
    "de": [("rewe.de", "https://www.rewe.de"), ("edeka.de", "https://www.edeka.de")],
    "uk": [("tesco.com", "https://www.tesco.com"), ("sainsburys.co.uk", "https://www.sainsburys.co.uk")],
    "us": [("walmart.com", "https://www.walmart.com"), ("target.com", "https://www.target.com")],
}
CURRENCY = {"no": "NOK", "se": "SEK", "de": "EUR", "uk": "GBP", "us": "USD"}

BLOCK_MARKERS = ("captcha", "access denied", "are you a robot", "unusual traffic", "px-captcha", "cf-chl")


def _load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _save(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def read_robots(base_url: str, session: requests.Session) -> tuple[urllib.robotparser.RobotFileParser | None, str]:
    """Returns (parser, status). parser is None when robots.txt could not be read: then the site is skipped."""
    rp = urllib.robotparser.RobotFileParser()
    try:
        r = session.get(base_url + "/robots.txt", timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        return None, f"unreachable: {type(exc).__name__}"
    if r.status_code in (401, 403, 429):
        return None, f"blocked (HTTP {r.status_code}) when reading robots.txt"
    if r.status_code >= 500:
        return None, f"server error (HTTP {r.status_code})"
    if r.status_code == 404:
        rp.parse([])  # no robots.txt: nothing is disallowed
        return rp, "no robots.txt (allowed by default)"
    if r.status_code != 200 or "html" in r.headers.get("content-type", "").lower() and "<html" in r.text[:500].lower():
        return None, f"robots.txt not readable (HTTP {r.status_code}, looks like an HTML/bot page)"
    rp.parse(r.text.splitlines())
    return rp, "ok"


def preflight(session: requests.Session, pause: float = 2.0) -> list[dict[str, Any]]:
    """Only reads robots.txt of every site (one request per site)."""
    rows = []
    for market, sites in SITES.items():
        for label, base in sites:
            rp, status = read_robots(base, session)
            row: dict[str, Any] = {"market": market, "store": label, "robots": status, "allowsRoot": None,
                                   "allowsGenericAgent": None, "crawlDelay": None}
            if rp is not None:
                row["allowsRoot"] = rp.can_fetch(USER_AGENT, base + "/")
                row["allowsGenericAgent"] = rp.can_fetch("*", base + "/")
                row["crawlDelay"] = rp.crawl_delay(USER_AGENT)
            rows.append(row)
            time.sleep(pause)
    return rows


def _price_from_jsonld(html: str) -> dict[str, Any] | None:
    """Reads schema.org Product data that the page publishes for everyone (JSON-LD)."""
    for block in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, flags=re.S | re.I):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        nodes = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for node in nodes:
            if not isinstance(node, dict) or "Product" not in str(node.get("@type", "")):
                continue
            offers = node.get("offers")
            if isinstance(offers, list):
                offers = offers[0] if offers else None
            if not isinstance(offers, dict):
                continue
            try:
                price = float(str(offers.get("price")).replace(",", "."))
            except (TypeError, ValueError):
                continue
            if price <= 0:
                continue
            return {
                "name": str(node.get("name", "")).strip(),
                "gtin": str(node.get("gtin13") or node.get("gtin") or node.get("gtin14") or "").strip() or None,
                "price": price,
                "currency": offers.get("priceCurrency"),
            }
    return None


def run(session: requests.Session, today: dt.date, force: bool = False) -> dict[str, Any]:
    seeds: dict[str, list[str]] = _load(SEED_PATH, {})  # {"rema.no": ["https://www.rema.no/produkt/..."]}
    state: dict[str, str] = _load(STATE_PATH, {})
    results: list[dict[str, Any]] = []
    log: list[dict[str, str]] = []

    for market, sites in SITES.items():
        for label, base in sites:
            urls = seeds.get(label, [])
            last = state.get(label)
            if not urls:
                log.append({"store": label, "result": "skipped", "reason": "no product URLs listed in store_seed_urls.json"})
                continue
            if last and not force and (today - dt.date.fromisoformat(last)).days < MIN_DAYS_BETWEEN_VISITS:
                log.append({"store": label, "result": "skipped", "reason": f"visited {last}, weekly limit"})
                continue
            rp, status = read_robots(base, session)
            if rp is None:
                log.append({"store": label, "result": "skipped", "reason": status})
                continue
            delay = max(PAUSE_SECONDS, float(rp.crawl_delay(USER_AGENT) or 0))
            got = 0
            for url in urls:
                if urlparse(url).netloc.split(":")[0] not in urlparse(base).netloc:
                    log.append({"store": label, "result": "skipped", "reason": f"URL outside {label}: {url}"})
                    continue
                if not rp.can_fetch(USER_AGENT, url):
                    log.append({"store": label, "result": "skipped", "reason": f"robots.txt disallows {urlparse(url).path}"})
                    continue
                try:
                    r = session.get(url, timeout=TIMEOUT)
                except requests.RequestException as exc:
                    log.append({"store": label, "result": "skipped", "reason": f"{type(exc).__name__}"})
                    time.sleep(delay)
                    continue
                if r.status_code in (401, 403, 429) or any(m in r.text[:5000].lower() for m in BLOCK_MARKERS):
                    log.append({"store": label, "result": "blocked", "reason": f"HTTP {r.status_code}; stopped for this site"})
                    break  # never try to get around a block
                if r.status_code != 200:
                    log.append({"store": label, "result": "skipped", "reason": f"HTTP {r.status_code}"})
                else:
                    info = _price_from_jsonld(r.text)
                    if not info:
                        log.append({"store": label, "result": "skipped", "reason": "page structure changed (no price data found)"})
                    else:
                        size = re.search(r"(\d+[.,]?\d*\s?(?:kg|g|ml|cl|l|oz|lb|fl oz))\b", info["name"], flags=re.I)
                        results.append({
                            "market": market,
                            "name": info["name"],
                            "barcode": info["gtin"],
                            "measure": size.group(1) if size else None,
                            "price": {
                                "value": info["price"],
                                "currency": info["currency"] or CURRENCY[market],
                                "date": today.isoformat(),
                                "store": label,
                                "source": label,
                                "checked": today.isoformat(),
                            },
                        })
                        got += 1
                time.sleep(delay)
            state[label] = today.isoformat()
            log.append({"store": label, "result": "ok" if got else "no data", "reason": f"{got} prices"})

    _save(STATE_PATH, state)
    _save(OUT_PATH, {"generated": today.isoformat(), "items": results})
    _save(LOG_PATH, {"date": today.isoformat(), "entries": log})
    return {"prices": len(results), "log": log}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preflight", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore the weekly limit (manual testing only)")
    args = ap.parse_args()
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en,nb;q=0.8"})
    if args.preflight:
        for row in preflight(s):
            print(json.dumps(row, ensure_ascii=False))
        return 0
    if args.run:
        print(json.dumps(run(s, dt.date.today(), args.force), ensure_ascii=False, indent=1))
        return 0
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
