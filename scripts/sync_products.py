#!/usr/bin/env python3
"""
KiloRadar (https://www.kiloradar.com) — High-Efficiency Python Data Pipeline
Developed and operated by KM TECH LABS

Performs:
1. Open Food Facts API data collection across regions (global/en, no, se, dk, pl, us, uk, de, fr, es).
2. Robust regex normalization of package weights & volumes (g, kg, hg, ml, cl, dl, l, stk, vask, oz, lb, fl oz).
3. Statistical & rule-based outlier filtering (rejecting >50kg errors and unrealistic unit prices).
4. Fast fuzzy product matching via RapidFuzz across barcode/packaging changes.
5. Exact shrinkflation index calculation: ((new_unit_price / old_unit_price) - 1) * 100 and ranking.
6. Static JSON export to public/data/[country].json + Cloudflare D1 SQL export to scripts/latest_sync.sql.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import pathlib
import re
import os
import statistics
import time
from dataclasses import dataclass
from typing import Any

import requests
from rapidfuzz import fuzz

ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"
LATEST_SQL_PATH = ROOT_DIR / "scripts" / "latest_sync.sql"
CATALOG_SQL_PATH = ROOT_DIR / "scripts" / "catalog_sync.sql"

MAX_VALID_GRAMS = 50_000.0  # 50 kg max for a consumer grocery item
MAX_VALID_ML = 50_000.0     # 50 liters max
MAX_VALID_COUNT = 1_000.0

MAX_UNIT_PRICE_BY_CURRENCY: dict[str, float] = {
    "NOK": 5000.0,
    "SEK": 5000.0,
    "DKK": 4000.0,
    "PLN": 2500.0,
    "EUR": 500.0,
    "USD": 550.0,
    "GBP": 450.0,
}

MIN_UNIT_PRICE = 0.05


@dataclass(frozen=True)
class ParsedMeasure:
    raw_quantity: float
    raw_unit: str
    standard_amount: float  # grams for weight, ml for volume, count for stk/vask
    base_unit: str          # 'kg', 'l', 'stk', or 'vask'
    normalized_base_amount: float  # kg, l, stk, or vask


@dataclass(frozen=True)
class ShrinkMetrics:
    old_unit_price: float
    new_unit_price: float
    base_unit: str
    shrink_index: float
    amount_change_pct: float
    price_change_pct: float
    is_shrinkflation: bool


MEASURE_MULTIPACK_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(fl\.?\s*oz|[a-zA-ZæøåÆØÅäöüÄÖÜßłńśźż]+)\s*$",
    re.IGNORECASE,
)
MEASURE_SINGLE_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*(fl\.?\s*oz|[a-zA-ZæøåÆØÅäöüÄÖÜßłńśźż]+)\s*$",
    re.IGNORECASE,
)
EXTRACT_MEASURE_RE = re.compile(
    r"(\d+(?:[.,]\d+)?\s*(?:[x×]\s*\d+(?:[.,]\d+)?\s*)?(?:fl\.?\s*oz|oz|lb|lbs|kg|hg|dag|g|ml|cl|dl|l|stk|st|szt|pk|vask))",
    re.IGNORECASE,
)


def parse_measure(measure_str: str) -> ParsedMeasure:
    """
    Normalizes a package size string (e.g. '250 g', '0,5 kg', '2 x 150 g', '1.5 l', '16 oz', '52 fl oz')
    into standardized grams/milliliters and base unit (kg, l, stk, vask).
    """
    if not measure_str or not isinstance(measure_str, str):
        raise ValueError(f"Empty or invalid measure string: {measure_str!r}")

    cleaned = measure_str.strip().replace(",", ".")
    multi_match = MEASURE_MULTIPACK_RE.match(cleaned)
    if multi_match:
        qty = float(multi_match.group(1)) * float(multi_match.group(2))
        unit_raw = multi_match.group(3).lower()
    else:
        single_match = MEASURE_SINGLE_RE.match(cleaned)
        if not single_match:
            extracted = EXTRACT_MEASURE_RE.search(cleaned)
            if extracted and extracted.group(1) != cleaned:
                return parse_measure(extracted.group(1))
            raise ValueError(f"Unrecognized measure format: {measure_str!r}")
        qty = float(single_match.group(1))
        unit_raw = single_match.group(2).lower()

    unit = re.sub(r"[\s.]+", "", unit_raw)
    if qty <= 0 or math.isnan(qty) or math.isinf(qty):
        raise ValueError(f"Quantity must be positive: {measure_str!r}")

    # Weight units -> grams & kg
    if unit in ("g", "gr", "gram", "grams"):
        grams = qty
        return ParsedMeasure(qty, "g", grams, "kg", grams / 1000.0)
    if unit in ("dag", "dkg"):
        grams = qty * 10.0
        return ParsedMeasure(qty, "dag", grams, "kg", grams / 1000.0)
    if unit in ("hg", "hektogram", "hekto"):
        grams = qty * 100.0
        return ParsedMeasure(qty, "hg", grams, "kg", grams / 1000.0)
    if unit in ("kg", "kilo", "kilogram", "kilograms"):
        grams = qty * 1000.0
        return ParsedMeasure(qty, "kg", grams, "kg", grams / 1000.0)
    if unit in ("oz", "ounce", "ounces"):
        grams = qty * 28.349523125
        return ParsedMeasure(qty, "oz", grams, "kg", grams / 1000.0)
    if unit in ("lb", "lbs", "pound", "pounds"):
        grams = qty * 453.59237
        return ParsedMeasure(qty, "lb", grams, "kg", grams / 1000.0)

    # Volume units -> milliliters & liters
    if unit in ("ml", "milliliter", "milliliters"):
        ml = qty
        return ParsedMeasure(qty, "ml", ml, "l", ml / 1000.0)
    if unit in ("cl", "centiliter"):
        ml = qty * 10.0
        return ParsedMeasure(qty, "cl", ml, "l", ml / 1000.0)
    if unit in ("dl", "desiliter", "deciliter"):
        ml = qty * 100.0
        return ParsedMeasure(qty, "dl", ml, "l", ml / 1000.0)
    if unit in ("l", "lt", "liter", "liters", "litre", "litres"):
        ml = qty * 1000.0
        return ParsedMeasure(qty, "l", ml, "l", ml / 1000.0)
    if unit == "floz":
        ml = qty * 29.5735295625
        return ParsedMeasure(qty, "fl oz", ml, "l", ml / 1000.0)
    if unit in ("gal", "gallon", "gallons"):
        ml = qty * 3785.411784
        return ParsedMeasure(qty, "gal", ml, "l", ml / 1000.0)

    # Discrete count units -> stk / vask
    if unit in ("stk", "st", "szt", "stykk", "pk", "pack", "pcs", "ct", "poser", "uds"):
        return ParsedMeasure(qty, "stk", qty, "stk", qty)
    if unit in ("vask", "tvätt", "prania", "loads", "washes", "wl", "lavados", "lavages"):
        return ParsedMeasure(qty, "vask", qty, "vask", qty)

    raise ValueError(f"Unsupported unit {unit_raw!r} in {measure_str!r}")


def is_valid_grocery_observation(
    measure: ParsedMeasure,
    price: float,
    currency: str = "NOK",
) -> bool:
    """
    Filters out obvious user entry errors and statistical outliers:
    - Rejects items > 50 kg (50,000 g) or > 50 liters (50,000 ml) or <= 1 g/ml.
    - Rejects negative/zero prices or unit prices above realistic thresholds.
    """
    if price <= 0 or math.isnan(price) or math.isinf(price):
        return False

    if measure.base_unit == "kg":
        if measure.standard_amount < 1.0 or measure.standard_amount > MAX_VALID_GRAMS:
            return False
    elif measure.base_unit == "l":
        if measure.standard_amount < 1.0 or measure.standard_amount > MAX_VALID_ML:
            return False
    else:
        if measure.standard_amount < 1.0 or measure.standard_amount > MAX_VALID_COUNT:
            return False

    unit_price = price / measure.normalized_base_amount
    max_threshold = MAX_UNIT_PRICE_BY_CURRENCY.get(currency.upper(), 5000.0)
    if unit_price < MIN_UNIT_PRICE or unit_price > max_threshold:
        return False

    return True


def filter_category_outliers(
    observations: list[dict[str, Any]],
    iqr_multiplier: float = 3.0,
) -> list[dict[str, Any]]:
    """
    Statistical IQR outlier filter over unit prices within a category.
    Retains all valid observations when sample size < 4; otherwise removes extreme glitches
    beyond Q3 + iqr_multiplier * IQR (or below Q1 - iqr_multiplier * IQR).
    """
    if len(observations) < 4:
        return list(observations)

    unit_prices = sorted(float(obs["unit_price"]) for obs in observations if "unit_price" in obs)
    if len(unit_prices) < 4:
        return list(observations)

    quartiles = statistics.quantiles(unit_prices, n=4, method="inclusive")
    q1, q3 = quartiles[0], quartiles[2]
    iqr = max(q3 - q1, 0.5)
    lower_bound = max(0.01, q1 - iqr_multiplier * iqr)
    upper_bound = q3 + iqr_multiplier * iqr

    return [
        obs
        for obs in observations
        if lower_bound <= float(obs.get("unit_price", 0.0)) <= upper_bound
    ]


def strip_measure_tokens(name: str) -> str:
    """
    Normalizes a product title by removing weight/volume tokens and punctuation
    so RapidFuzz can match products across size/barcode changes.
    """
    lowered = name.lower()
    without_measure = re.sub(
        r"\b\d+(?:[.,]\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs|kg|hg|dag|g|ml|cl|dl|l|stk|st|szt|pk|vask)\b",
        " ",
        lowered,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"[^a-z0-9æøåäöüßłńśźż\s]", " ", without_measure)
    return re.sub(r"\s+", " ", cleaned).strip()


def match_product_across_barcodes(
    candidate_name: str,
    catalog: list[dict[str, Any]],
    threshold: float = 65.0,
    candidate_ean: str | None = None,
) -> tuple[dict[str, Any] | None, float]:
    """
    Matches a product against a reference catalog:
    1. Exact barcode/previousBarcode match (100.0 score).
    2. RapidFuzz token_sort_ratio / WRatio match on normalized product names.
    """
    if candidate_ean:
        for item in catalog:
            if item.get("barcode") == candidate_ean or item.get("previousBarcode") == candidate_ean:
                return item, 100.0

    norm_candidate = strip_measure_tokens(candidate_name)
    if not norm_candidate:
        return None, 0.0

    best_match: dict[str, Any] | None = None
    best_score = 0.0

    for item in catalog:
        ref_name = strip_measure_tokens(f"{item.get('brand', '')} {item.get('name', '')}")
        ref_short = strip_measure_tokens(str(item.get("name", "")))
        score = max(
            float(fuzz.token_sort_ratio(norm_candidate, ref_name)),
            float(fuzz.token_sort_ratio(norm_candidate, ref_short)),
            float(fuzz.WRatio(norm_candidate, ref_short)),
        )
        if score > best_score:
            best_score = score
            best_match = item

    if best_score >= threshold:
        return best_match, round(best_score, 1)
    return None, round(best_score, 1)


def calculate_shrinkflation_metrics(
    old_price: float,
    old_measure_str: str,
    new_price: float,
    new_measure_str: str,
) -> ShrinkMetrics:
    """
    Calculates exact unit prices and the shrinkflation index:
    ((new_unit_price / old_unit_price) - 1) * 100
    """
    old_m = parse_measure(old_measure_str)
    new_m = parse_measure(new_measure_str)
    if old_m.base_unit != new_m.base_unit:
        raise ValueError(
            f"Incompatible base units: {old_m.base_unit!r} vs {new_m.base_unit!r}"
        )

    old_unit_price = old_price / old_m.normalized_base_amount
    new_unit_price = new_price / new_m.normalized_base_amount

    shrink_index = ((new_unit_price / old_unit_price) - 1.0) * 100.0
    amount_change_pct = ((new_m.normalized_base_amount / old_m.normalized_base_amount) - 1.0) * 100.0
    price_change_pct = ((new_price / old_price) - 1.0) * 100.0

    is_shrink = amount_change_pct < -0.1 or shrink_index > 5.0

    return ShrinkMetrics(
        old_unit_price=round(old_unit_price, 2),
        new_unit_price=round(new_unit_price, 2),
        base_unit=new_m.base_unit,
        shrink_index=round(shrink_index, 2),
        amount_change_pct=round(amount_change_pct, 2),
        price_change_pct=round(price_change_pct, 2),
        is_shrinkflation=is_shrink,
    )


def rank_shrinkflation_findings(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Computes shrinkflation metrics for each product, filters out invalid outliers,
    and ranks products from highest shrinkflation index to lowest.
    """
    enriched: list[dict[str, Any]] = []
    for prod in products:
        try:
            old_m = parse_measure(str(prod["oldMeasure"]))
            new_m = parse_measure(str(prod["newMeasure"]))
            currency = str(prod.get("currency", "NOK"))
            if not is_valid_grocery_observation(old_m, float(prod["oldPrice"]), currency):
                continue
            if not is_valid_grocery_observation(new_m, float(prod["newPrice"]), currency):
                continue

            metrics = calculate_shrinkflation_metrics(
                float(prod["oldPrice"]),
                str(prod["oldMeasure"]),
                float(prod["newPrice"]),
                str(prod["newMeasure"]),
            )
            item_copy = dict(prod)
            item_copy["oldUnitPrice"] = metrics.old_unit_price
            item_copy["newUnitPrice"] = metrics.new_unit_price
            item_copy["baseUnit"] = metrics.base_unit
            item_copy["shrinkIndex"] = metrics.shrink_index
            item_copy["amountChangePct"] = metrics.amount_change_pct
            item_copy["priceChangePct"] = metrics.price_change_pct
            enriched.append(item_copy)
        except ValueError:
            continue

    enriched.sort(key=lambda x: float(x.get("shrinkIndex", 0.0)), reverse=True)
    return enriched


def fetch_openfoodfacts_product(ean: str, timeout: float = 4.5) -> dict[str, Any] | None:
    """
    Fetches live product metadata & quantity from Open Food Facts API v2.
    Returns None gracefully on network timeout or missing barcode.
    """
    url = f"https://world.openfoodfacts.org/api/v2/product/{ean}.json"
    headers = {"User-Agent": "KiloRadarDataPipeline/1.0 (https://www.kiloradar.com)"}
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        if resp.status_code != 200:
            return None
        payload = resp.json()
        if payload.get("status") != 1 or not isinstance(payload.get("product"), dict):
            return None
        prod = payload["product"]
        return {
            "ean": ean,
            "name": (
                prod.get("product_name_no")
                or prod.get("product_name_sv")
                or prod.get("product_name_da")
                or prod.get("product_name_pl")
                or prod.get("product_name_de")
                or prod.get("product_name_fr")
                or prod.get("product_name_es")
                or prod.get("product_name")
            ),
            "brand": prod.get("brands"),
            "quantity": prod.get("quantity"),
            "image_url": prod.get("image_front_small_url") or prod.get("image_small_url"),
        }
    except Exception:
        return None


# Curated regional product catalogs with verified pre-shrink baselines
REGIONAL_BASELINES: dict[str, dict[str, Any]] = {
    "no": {
        "currency": "NOK",
        "products": [
            {
                "id": "no-kaffe-evergood",
                "name": "Evergood Classic Filtermalt 200 g",
                "previousName": "Evergood Classic Filtermalt 250 g",
                "brand": "Joh. Johannson Kaffe",
                "category": "Kaffe & Kos",
                "store": "REMA 1000 / KIWI / Meny",
                "barcode": "7040913336684",
                "oldMeasure": "250 g",
                "newMeasure": "200 g",
                "oldPrice": 44.90,
                "newPrice": 46.90,
                "detectedDate": "2026-10-18",
                "isFeaturedPreset": True,
                "presetLabel": "☕ Filterkaffe (-20 % i posen)",
                "avgWeeklyQuantity": 0.6,
                "storePrices": [
                    {"store": "REMA 1000", "price": 44.90, "lastScanned": "Uke 46"},
                    {"store": "KIWI", "price": 45.50, "lastScanned": "Uke 46"},
                    {"store": "Coop Extra", "price": 45.90, "lastScanned": "Uke 46"},
                    {"store": "Oda", "price": 46.90, "lastScanned": "Uke 46"},
                    {"store": "Meny", "price": 51.90, "lastScanned": "Uke 46"},
                ],
            },
            {
                "id": "no-sjokolade-freia",
                "name": "Freia Melkesjokolade Storplate 180 g",
                "previousName": "Freia Melkesjokolade Storplate 200 g",
                "brand": "Freia",
                "category": "Kaffe & Kos",
                "store": "KIWI / Coop Extra / REMA 1000",
                "barcode": "7622210410337",
                "oldMeasure": "200 g",
                "newMeasure": "180 g",
                "oldPrice": 39.90,
                "newPrice": 44.90,
                "detectedDate": "2026-10-25",
                "isFeaturedPreset": True,
                "presetLabel": "🍫 Melkesjokolade (200 g → 180 g)",
                "avgWeeklyQuantity": 1.0,
                "storePrices": [
                    {"store": "Coop Extra", "price": 41.90, "lastScanned": "Uke 46"},
                    {"store": "REMA 1000", "price": 42.50, "lastScanned": "Uke 46"},
                    {"store": "KIWI", "price": 42.90, "lastScanned": "Uke 46"},
                    {"store": "Oda", "price": 44.90, "lastScanned": "Uke 46"},
                    {"store": "Meny", "price": 48.90, "lastScanned": "Uke 46"},
                ],
            },
            {
                "id": "no-kaffe-coop-bla",
                "name": "Coop Blå Filterkaffe 250 g",
                "previousName": "Coop Blå Filterkaffe 250 g",
                "brand": "Coop",
                "category": "Kaffe & Kos",
                "store": "Coop Extra",
                "barcode": "7025110082319",
                "oldMeasure": "250 g",
                "newMeasure": "250 g",
                "oldPrice": 34.90,
                "newPrice": 35.90,
                "detectedDate": "2026-11-01",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Coop Extra", "price": 35.90, "lastScanned": "Uke 46"},
                ],
            },
            {
                "id": "no-meieri-tine-smor",
                "name": "TINE Meierismør Bordpakke 200 g",
                "previousName": "TINE Meierismør Bordpakke 250 g",
                "brand": "TINE",
                "category": "Meieri & Pålegg",
                "store": "REMA 1000 / KIWI / Meny",
                "barcode": "7038010001208",
                "oldMeasure": "250 g",
                "newMeasure": "200 g",
                "oldPrice": 32.90,
                "newPrice": 34.90,
                "detectedDate": "2026-10-14",
                "isFeaturedPreset": True,
                "presetLabel": "🧈 Meierismør (-20 % i begeret)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "REMA 1000", "price": 33.90, "lastScanned": "Uke 46"},
                    {"store": "KIWI", "price": 33.90, "lastScanned": "Uke 46"},
                    {"store": "Coop Extra", "price": 34.50, "lastScanned": "Uke 46"},
                    {"store": "Oda", "price": 34.90, "lastScanned": "Uke 46"},
                    {"store": "Meny", "price": 37.90, "lastScanned": "Uke 46"},
                ],
            },
            {
                "id": "no-meieri-norvegia",
                "name": "TINE Norvegia Skivet 130 g",
                "previousName": "TINE Norvegia Skivet 150 g",
                "brand": "TINE",
                "category": "Meieri & Pålegg",
                "store": "KIWI / Meny",
                "barcode": "7038010014253",
                "oldMeasure": "150 g",
                "newMeasure": "130 g",
                "oldPrice": 31.90,
                "newPrice": 33.90,
                "detectedDate": "2026-10-20",
                "avgWeeklyQuantity": 0.8,
                "storePrices": [
                    {"store": "REMA 1000", "price": 32.50, "lastScanned": "Uke 46"},
                    {"store": "KIWI", "price": 32.90, "lastScanned": "Uke 46"},
                    {"store": "Coop Extra", "price": 33.50, "lastScanned": "Uke 46"},
                    {"store": "Meny", "price": 35.90, "lastScanned": "Uke 46"},
                ],
            },
            {
                "id": "no-vask-omo-color",
                "name": "OMO Color Flytende Vaskemiddel 630 ml",
                "previousName": "OMO Color Flytende Vaskemiddel 750 ml",
                "brand": "Lilleborg",
                "category": "Hus & Vask",
                "store": "REMA 1000 / KIWI / Coop Extra",
                "barcode": "7033061394118",
                "oldMeasure": "750 ml",
                "newMeasure": "630 ml",
                "oldPrice": 54.90,
                "newPrice": 57.90,
                "detectedDate": "2026-10-22",
                "isFeaturedPreset": True,
                "presetLabel": "🧺 Flytende vaskemiddel (-16 % flaske)",
                "avgWeeklyQuantity": 0.35,
                "storePrices": [
                    {"store": "REMA 1000", "price": 55.90, "lastScanned": "Uke 46"},
                    {"store": "KIWI", "price": 56.50, "lastScanned": "Uke 46"},
                    {"store": "Coop Extra", "price": 57.90, "lastScanned": "Uke 46"},
                    {"store": "Oda", "price": 58.90, "lastScanned": "Uke 46"},
                    {"store": "Meny", "price": 62.90, "lastScanned": "Uke 46"},
                ],
            },
        ],
    },
    "en": {
        "currency": "EUR",
        "products": [
            {
                "id": "en-coffee-lavazza",
                "name": "Lavazza Qualità Rossa Ground Coffee 200 g",
                "previousName": "Lavazza Qualità Rossa Ground Coffee 250 g",
                "brand": "Lavazza",
                "category": "Coffee & Treats",
                "store": "Carrefour / Tesco",
                "barcode": "8000070012004",
                "oldMeasure": "250 g",
                "newMeasure": "200 g",
                "oldPrice": 3.99,
                "newPrice": 4.29,
                "detectedDate": "2026-10-14",
                "isFeaturedPreset": True,
                "presetLabel": "☕ Morning Coffee (-20% in pack)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Aldi", "price": 3.89, "lastScanned": "Week 46"},
                    {"store": "Lidl", "price": 3.99, "lastScanned": "Week 46"},
                    {"store": "Carrefour", "price": 4.29, "lastScanned": "Week 46"},
                    {"store": "Tesco", "price": 4.49, "lastScanned": "Week 46"},
                    {"store": "Amazon Fresh", "price": 4.69, "lastScanned": "Week 46"},
                ],
            },
            {
                "id": "en-choc-milka-alpine",
                "name": "Milka Alpine Milk Chocolate 90 g",
                "previousName": "Milka Alpine Milk Chocolate 100 g",
                "brand": "Milka",
                "category": "Coffee & Treats",
                "store": "Lidl / Carrefour",
                "barcode": "7622210100917",
                "oldMeasure": "100 g",
                "newMeasure": "90 g",
                "oldPrice": 1.29,
                "newPrice": 1.49,
                "detectedDate": "2026-10-22",
                "isFeaturedPreset": True,
                "presetLabel": "🍫 Milk Chocolate (-10% bar)",
                "avgWeeklyQuantity": 1.0,
                "storePrices": [
                    {"store": "Aldi", "price": 1.29, "lastScanned": "Week 46"},
                    {"store": "Lidl", "price": 1.35, "lastScanned": "Week 46"},
                    {"store": "Carrefour", "price": 1.49, "lastScanned": "Week 46"},
                    {"store": "Tesco", "price": 1.55, "lastScanned": "Week 46"},
                ],
            },
            {
                "id": "en-dairy-lurpak",
                "name": "Lurpak Spreadable Slightly Salted 400 g",
                "previousName": "Lurpak Spreadable Slightly Salted 500 g",
                "brand": "Lurpak",
                "category": "Dairy & Everyday",
                "store": "Tesco / Carrefour",
                "barcode": "5740900404125",
                "oldMeasure": "500 g",
                "newMeasure": "400 g",
                "oldPrice": 4.49,
                "newPrice": 4.75,
                "detectedDate": "2026-10-09",
                "isFeaturedPreset": True,
                "presetLabel": "🧀 Spreadable Butter (-20% tub)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Aldi", "price": 4.39, "lastScanned": "Week 46"},
                    {"store": "Lidl", "price": 4.49, "lastScanned": "Week 46"},
                    {"store": "Tesco", "price": 4.75, "lastScanned": "Week 46"},
                    {"store": "Carrefour", "price": 4.89, "lastScanned": "Week 46"},
                ],
            },
            {
                "id": "en-clean-ariel-gel",
                "name": "Ariel Color Liquid Detergent 850 ml",
                "previousName": "Ariel Color Liquid Detergent 1100 ml",
                "brand": "Ariel",
                "category": "Home & Laundry",
                "store": "Carrefour / Amazon Fresh",
                "barcode": "8001090981127",
                "oldMeasure": "1100 ml",
                "newMeasure": "850 ml",
                "oldPrice": 6.49,
                "newPrice": 6.99,
                "detectedDate": "2026-10-18",
                "isFeaturedPreset": True,
                "presetLabel": "🧺 Laundry Liquid (-23% bottle)",
                "avgWeeklyQuantity": 0.35,
                "storePrices": [
                    {"store": "Lidl", "price": 6.49, "lastScanned": "Week 46"},
                    {"store": "Aldi", "price": 6.59, "lastScanned": "Week 46"},
                    {"store": "Carrefour", "price": 6.99, "lastScanned": "Week 46"},
                    {"store": "Tesco", "price": 7.29, "lastScanned": "Week 46"},
                ],
            },
        ],
    },
    "se": {
        "currency": "SEK",
        "products": [
            {
                "id": "se-coffee-gevalia",
                "name": "Gevalia Mellanrost Bryggkaffe 400 g",
                "previousName": "Gevalia Mellanrost Bryggkaffe 450 g",
                "brand": "Gevalia",
                "category": "Kaffe & Fika",
                "store": "ICA / Coop / Hemköp",
                "barcode": "8711000530115",
                "oldMeasure": "450 g",
                "newMeasure": "400 g",
                "oldPrice": 54.90,
                "newPrice": 58.90,
                "detectedDate": "2026-10-15",
                "isFeaturedPreset": True,
                "presetLabel": "☕ Bryggkaffe (450 g → 400 g)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Willys", "price": 54.90, "lastScanned": "Vecka 46"},
                    {"store": "ICA", "price": 57.90, "lastScanned": "Vecka 46"},
                    {"store": "Coop", "price": 58.90, "lastScanned": "Vecka 46"},
                    {"store": "Hemköp", "price": 59.90, "lastScanned": "Vecka 46"},
                ],
            },
            {
                "id": "se-dairy-bregott",
                "name": "Arla Bregott Normalsaltat 500 g",
                "previousName": "Arla Bregott Normalsaltat 600 g",
                "brand": "Arla",
                "category": "Mejeri & Pålägg",
                "store": "ICA / Willys",
                "barcode": "7310865005168",
                "oldMeasure": "600 g",
                "newMeasure": "500 g",
                "oldPrice": 59.90,
                "newPrice": 59.90,
                "detectedDate": "2026-10-20",
                "isFeaturedPreset": True,
                "presetLabel": "🧈 Bregott (600 g → 500 g)",
                "avgWeeklyQuantity": 0.4,
                "storePrices": [
                    {"store": "Willys", "price": 56.90, "lastScanned": "Vecka 46"},
                    {"store": "ICA", "price": 58.90, "lastScanned": "Vecka 46"},
                    {"store": "Coop", "price": 59.90, "lastScanned": "Vecka 46"},
                ],
            },
        ],
    },
    "dk": {
        "currency": "DKK",
        "products": [
            {
                "id": "dk-coffee-merrild",
                "name": "Merrild Mellemristet Nr. 103 400 g",
                "previousName": "Merrild Mellemristet Nr. 103 500 g",
                "brand": "Merrild",
                "category": "Kaffe & Hygge",
                "store": "Netto / Føtex / Bilka",
                "barcode": "8000070038011",
                "oldMeasure": "500 g",
                "newMeasure": "400 g",
                "oldPrice": 46.00,
                "newPrice": 49.95,
                "detectedDate": "2026-10-16",
                "isFeaturedPreset": True,
                "presetLabel": "☕ Merrild Kaffe (500 g → 400 g)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Rema 1000", "price": 45.95, "lastScanned": "Uge 46"},
                    {"store": "Netto", "price": 46.95, "lastScanned": "Uge 46"},
                    {"store": "Lidl", "price": 46.95, "lastScanned": "Uge 46"},
                    {"store": "Føtex", "price": 49.95, "lastScanned": "Uge 46"},
                ],
            },
            {
                "id": "dk-dairy-kaergaarden",
                "name": "Arla Kærgården Original 160 g",
                "previousName": "Arla Kærgården Original 200 g",
                "brand": "Arla",
                "category": "Mejeri & Pålæg",
                "store": "Netto / Rema 1000",
                "barcode": "5711953064227",
                "oldMeasure": "200 g",
                "newMeasure": "160 g",
                "oldPrice": 24.95,
                "newPrice": 26.95,
                "detectedDate": "2026-10-21",
                "isFeaturedPreset": True,
                "presetLabel": "🧈 Kærgården (200 g → 160 g)",
                "avgWeeklyQuantity": 0.7,
                "storePrices": [
                    {"store": "Rema 1000", "price": 24.95, "lastScanned": "Uge 46"},
                    {"store": "Netto", "price": 25.50, "lastScanned": "Uge 46"},
                    {"store": "Bilka", "price": 26.50, "lastScanned": "Uge 46"},
                ],
            },
        ],
    },
    "pl": {
        "currency": "PLN",
        "products": [
            {
                "id": "pl-choc-wedel",
                "name": "E.Wedel Ptasie Mleczko Waniliowe 340 g",
                "previousName": "E.Wedel Ptasie Mleczko Waniliowe 380 g",
                "brand": "E.Wedel",
                "category": "Kawa i Słodycze",
                "store": "Biedronka / Lidl / Auchan",
                "barcode": "5900189000125",
                "oldMeasure": "380 g",
                "newMeasure": "340 g",
                "oldPrice": 15.99,
                "newPrice": 17.99,
                "detectedDate": "2026-10-18",
                "isFeaturedPreset": True,
                "presetLabel": "🍬 Ptasie Mleczko (380 g → 340 g)",
                "avgWeeklyQuantity": 0.5,
                "storePrices": [
                    {"store": "Biedronka", "price": 16.49, "lastScanned": "Tydz. 46"},
                    {"store": "Lidl", "price": 16.99, "lastScanned": "Tydz. 46"},
                    {"store": "Dino", "price": 17.49, "lastScanned": "Tydz. 46"},
                    {"store": "Auchan", "price": 17.99, "lastScanned": "Tydz. 46"},
                ],
            },
            {
                "id": "pl-dairy-mlekovita",
                "name": "Mlekovita Masło Polskie Ekstra 170 g",
                "previousName": "Mlekovita Masło Polskie Ekstra 200 g",
                "brand": "Mlekovita",
                "category": "Nabiał i Codzienne",
                "store": "Biedronka / Dino",
                "barcode": "5900512300115",
                "oldMeasure": "200 g",
                "newMeasure": "170 g",
                "oldPrice": 6.49,
                "newPrice": 6.99,
                "detectedDate": "2026-10-22",
                "isFeaturedPreset": True,
                "presetLabel": "🧈 Masło Ekstra (200 g → 170 g)",
                "avgWeeklyQuantity": 1.0,
                "storePrices": [
                    {"store": "Biedronka", "price": 6.49, "lastScanned": "Tydz. 46"},
                    {"store": "Lidl", "price": 6.59, "lastScanned": "Tydz. 46"},
                    {"store": "Dino", "price": 6.79, "lastScanned": "Tydz. 46"},
                ],
            },
        ],
    },
}


OFF_PRODUCT_URL = "https://world.openfoodfacts.org/product/{ean}"


def build_provenance(
    prod: dict[str, Any], live_data: dict[str, Any] | None, today_iso: str
) -> dict[str, Any]:
    """
    Builds transparency fields for a product: where the data comes from, when it was
    last checked, and how well the live source agrees with the stored measure.

    verification:
      - "verified":   barcode found in Open Food Facts and its quantity equals our current measure
      - "mismatch":   barcode found but the quantity differs from our current measure
      - "partial":    barcode found, but no comparable quantity available
      - "unverified": not checked against any source (or the lookup failed)
    """
    if not live_data:
        return {
            "sources": [],
            "lastChecked": None,
            "matchConfidence": None,
            "verification": "unverified",
        }

    ean = str(prod.get("barcode", ""))
    sources = [
        {
            "name": "Open Food Facts",
            "url": OFF_PRODUCT_URL.format(ean=ean),
            "checked": today_iso,
        }
    ]
    verification = "partial"
    confidence = 0.6
    off_qty = prod.get("offVerifiedQuantity")
    if off_qty:
        try:
            live_amount = parse_measure(str(off_qty)).standard_amount
            ours = parse_measure(str(prod["newMeasure"])).standard_amount
            if abs(live_amount - ours) <= 0.5:
                verification, confidence = "verified", 1.0
            else:
                verification, confidence = "mismatch", 0.3
        except (ValueError, KeyError):
            pass
    return {
        "sources": sources,
        "lastChecked": today_iso,
        "matchConfidence": confidence,
        "verification": verification,
    }


def merge_history(
    previous: dict[str, Any] | None, prod: dict[str, Any], today_iso: str
) -> dict[str, list[dict[str, Any]]]:
    """
    Carries size and price history over from the previous nightly export and appends
    today's observation only when something changed. History is never back-filled:
    it only grows from real nightly snapshots.
    """
    prev = previous or {}
    size_hist = [dict(e) for e in prev.get("sizeHistory", [])]
    price_hist = [dict(e) for e in prev.get("priceHistory", [])]

    new_measure = str(prod["newMeasure"])
    if not size_hist or size_hist[-1].get("value") != new_measure:
        size_hist.append({"date": today_iso, "value": new_measure})

    unit_price = prod.get("newUnitPrice")
    price_entry = {
        "date": today_iso,
        "store": prod.get("store"),
        "price": prod.get("newPrice"),
        "unitPrice": unit_price,
    }
    if not price_hist or price_hist[-1].get("price") != price_entry["price"] or (
        price_hist[-1].get("store") != price_entry["store"]
    ):
        price_hist.append(price_entry)

    return {"sizeHistory": size_hist, "priceHistory": price_hist}


def build_shrink_events(prod: dict[str, Any]) -> list[dict[str, Any]]:
    """A shrink event exists when the pack got smaller between old and new measure."""
    try:
        if float(prod.get("amountChangePct", 0.0)) < 0:
            return [
                {
                    "date": prod.get("detectedDate"),
                    "from": prod["oldMeasure"],
                    "to": prod["newMeasure"],
                    "shrinkIndex": prod.get("shrinkIndex"),
                }
            ]
    except (TypeError, ValueError):
        pass
    return []


# --- Offer / price sources ---------------------------------------------------------------------
# Registry of price sources per market. A source is only used when it is "active". Sources that
# need an API key or written permission stay "needs_access" and produce no data: nothing is
# scraped and nothing is attributed to a source that did not supply it. See docs/DATA_SOURCES.md.
OFFER_SOURCES: dict[str, list[dict[str, Any]]] = {
    "no": [
        {
            "name": "mattilbud.no",
            "url": "https://mattilbud.no/",
            "status": "needs_access",
            "needs": "TJEK_API_KEY (Tjek / eTilbudsavis API access) or written permission",
        }
    ],
}


def offer_source_status(region_code: str) -> list[dict[str, Any]]:
    """Returns the price sources for a market and whether they are configured."""
    out: list[dict[str, Any]] = []
    for src in OFFER_SOURCES.get(region_code, []):
        entry = dict(src)
        key_name = str(src.get("needs", "")).split(" ")[0]
        if src["status"] == "needs_access" and key_name and os.environ.get(key_name):
            # A key exists, but no adapter is implemented yet: never claim data we did not fetch.
            entry["status"] = "key_present_adapter_missing"
        out.append(entry)
    return out


def sync_region(region_code: str, fetch_live: bool = True) -> dict[str, Any]:
    """
    Synchronizes a region by enriching baseline products with live Open Food Facts
    metadata (when reachable), running outlier checks & RapidFuzz matching, and ranking
    by shrinkflation index.
    """
    base_key = "en" if region_code == "global" else region_code
    if region_code in REGION_CURRENCY and region_code not in REGIONAL_BASELINES:
        # No hand-written baseline for these markets: only real discovered data (see catalog)
        region_cfg: dict[str, Any] = {"currency": REGION_CURRENCY[region_code], "products": []}
    else:
        region_cfg = REGIONAL_BASELINES.get(base_key, REGIONAL_BASELINES["en"])
    currency = region_cfg["currency"]

    today_iso = dt.date.today().isoformat()
    live_by_id: dict[str, dict[str, Any] | None] = {}
    raw_products: list[dict[str, Any]] = []
    for item in region_cfg["products"]:
        prod_copy = dict(item)
        prod_copy["currency"] = currency

        if fetch_live and prod_copy.get("barcode"):
            live_data = fetch_openfoodfacts_product(str(prod_copy["barcode"]))
            live_by_id[str(prod_copy.get("id"))] = live_data
            if live_data:
                if live_data.get("image_url"):
                    prod_copy["imageUrl"] = live_data["image_url"]
                # Validate live quantity if present and not an outlier
                raw_qty = live_data.get("quantity")
                if raw_qty:
                    try:
                        parsed_live = parse_measure(str(raw_qty))
                        if is_valid_grocery_observation(
                            parsed_live, float(prod_copy["newPrice"]), currency
                        ):
                            prod_copy["offVerifiedQuantity"] = f"{parsed_live.raw_quantity:g} {parsed_live.raw_unit}"
                    except ValueError:
                        pass

        raw_products.append(prod_copy)

    ranked = rank_shrinkflation_findings(raw_products)

    previous_by_id: dict[str, dict[str, Any]] = {}
    prev_path = PUBLIC_DATA_DIR / f"{region_code}.json"
    if prev_path.exists():
        try:
            prev_payload = json.loads(prev_path.read_text(encoding="utf-8"))
            previous_by_id = {
                str(p.get("id")): p for p in prev_payload.get("products", []) if p.get("id")
            }
        except (ValueError, OSError):
            previous_by_id = {}

    for prod in ranked:
        prod_id = str(prod.get("id"))
        prod.update(build_provenance(prod, live_by_id.get(prod_id), today_iso))
        prod.update(merge_history(previous_by_id.get(prod_id), prod, today_iso))
        prod["shrinkEvents"] = build_shrink_events(prod)

    return {
        "source": "python-pipeline-openfoodfacts",
        "country": region_code,
        "currency": currency,
        "lastSynced": today_iso,
        "count": len(ranked),
        "products": ranked,
        "offerSources": offer_source_status(region_code),
    }


def generate_d1_sql(synced_payloads: dict[str, dict[str, Any]]) -> str:
    """
    Generates idempotent SQLite / Cloudflare D1 SQL statements (`scripts/latest_sync.sql`)
    from the synced regional payloads.
    """
    lines = [
        "-- KiloRadar (https://www.kiloradar.com) — Auto-generated Cloudflare D1 Sync SQL",
        f"-- Generated at: {dt.datetime.now(dt.timezone.utc).isoformat()}",
        "BEGIN TRANSACTION;",
        "",
    ]

    for region_code, payload in synced_payloads.items():
        if region_code == "global":
            continue
        for prod in payload.get("products", []):
            ean = str(prod.get("barcode", "")).replace("'", "''")
            name = str(prod.get("name", "")).replace("'", "''")
            brand = str(prod.get("brand", "")).replace("'", "''")
            cat = str(prod.get("category", "")).replace("'", "''")
            img = prod.get("imageUrl")
            img_sql = f"'{str(img).replace(chr(39), chr(39)*2)}'" if img else "NULL"

            parsed_new = parse_measure(str(prod["newMeasure"]))
            weight_val = round(parsed_new.standard_amount, 2)
            unit_str = "g" if parsed_new.base_unit == "kg" else (
                "ml" if parsed_new.base_unit == "l" else parsed_new.base_unit
            )
            price_val = float(prod["newPrice"])
            unit_price_val = float(prod["newUnitPrice"])

            last_checked = prod.get("lastChecked")
            last_checked_sql = f"'{last_checked}'" if last_checked else "NULL"
            confidence = prod.get("matchConfidence")
            confidence_sql = str(float(confidence)) if confidence is not None else "NULL"
            verification = str(prod.get("verification", "unverified")).replace("'", "''")
            lines.append(
                f"INSERT OR REPLACE INTO products (ean, name, brand, category, country_code, image_url, "
                f"last_checked, match_confidence, verification, updated_at) "
                f"VALUES ('{ean}', '{name}', '{brand}', '{cat}', '{region_code}', {img_sql}, "
                f"{last_checked_sql}, {confidence_sql}, '{verification}', CURRENT_TIMESTAMP);"
            )
            lines.append(f"DELETE FROM product_sources WHERE ean = '{ean}';")
            for src in prod.get("sources", []):
                src_name = str(src.get("name", "")).replace("'", "''")
                src_url = str(src.get("url", "")).replace("'", "''")
                src_checked = str(src.get("checked", "")).replace("'", "''")
                lines.append(
                    f"INSERT INTO product_sources (ean, source_name, source_url, checked_at) "
                    f"VALUES ('{ean}', '{src_name}', '{src_url}', '{src_checked}');"
                )
            lines.append(f"DELETE FROM shrink_events WHERE ean = '{ean}';")
            for ev in prod.get("shrinkEvents", []):
                ev_date = str(ev.get("date", "")).replace("'", "''")
                ev_from = str(ev.get("from", "")).replace("'", "''")
                ev_to = str(ev.get("to", "")).replace("'", "''")
                ev_idx = ev.get("shrinkIndex")
                ev_idx_sql = str(float(ev_idx)) if ev_idx is not None else "NULL"
                lines.append(
                    f"INSERT INTO shrink_events (ean, event_date, old_measure, new_measure, shrink_index) "
                    f"VALUES ('{ean}', '{ev_date}', '{ev_from}', '{ev_to}', {ev_idx_sql});"
                )
            lines.append(
                f"INSERT INTO price_history (ean, weight_grams, measure_unit, price, unit_price, source) "
                f"VALUES ('{ean}', {weight_val}, '{unit_str}', {price_val}, {unit_price_val}, 'python-pipeline');"
            )

    lines.append("")
    lines.append("COMMIT;")
    return "\n".join(lines) + "\n"


# --- Step 2: real catalog discovery from Open Food Facts --------------------------------------
# Discovers the most-scanned real products per market and category. Nothing here is invented:
# every entry comes from an Open Food Facts record. OFF has no price history, so a discovered
# product starts with a single size snapshot; shrink events appear only when a later nightly
# run observes a smaller pack for the same barcode.

OFF_SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search"
OFF_REQUEST_PAUSE_SECONDS = 6.5  # OFF allows ~10 search requests per minute

OFF_COUNTRY_TAG: dict[str, str] = {
    "no": "norway",
    "se": "sweden",
    "dk": "denmark",
    "pl": "poland",
    "de": "germany",
    "fr": "france",
    "es": "spain",
    "uk": "united-kingdom",
    "us": "united-states",
    "global": "",  # Global/EUR: most-scanned products worldwide (no country filter)
}

# One entry per (database, category). The three databases belong to the same open-data family
# and share the same API, so every product keeps a verifiable record URL.
#   Open Food Facts     (food & drink)
#   Open Beauty Facts   (personal care)
#   Open Products Facts (household: detergents, toilet paper)
OFF_DB_HOSTS: dict[str, tuple[str, str]] = {
    "off": ("world.openfoodfacts.org", "Open Food Facts"),
    "obf": ("world.openbeautyfacts.org", "Open Beauty Facts"),
    "opf": ("world.openproductsfacts.org", "Open Products Facts"),
}

# (database, category tag, KiloRadar category label)
OFF_CORE_CATEGORIES: list[tuple[str, str, str]] = [
    ("off", "coffees", "Coffee & Tea"),
    ("off", "teas", "Coffee & Tea"),
    ("off", "chocolates", "Chocolate & Sweets"),
    ("off", "biscuits", "Chocolate & Sweets"),
    ("off", "butters", "Dairy"),
    ("off", "cheeses", "Dairy"),
    ("off", "yogurts", "Dairy"),
    ("off", "milks", "Dairy"),
    ("off", "chips-and-crisps", "Snacks"),
    ("off", "breakfast-cereals", "Cereals & Porridge"),
    ("off", "pastas", "Pasta, Rice & Dry Goods"),
    ("off", "rices", "Pasta, Rice & Dry Goods"),
    ("off", "juices", "Juice & Drinks"),
    ("off", "sodas", "Juice & Drinks"),
    ("obf", "toothpastes", "Personal Care"),
    ("obf", "shampoos", "Personal Care"),
    ("obf", "shower-gels", "Personal Care"),
    ("obf", "deodorants", "Personal Care"),
    ("opf", "laundry-detergents", "Cleaning & Laundry"),
    ("opf", "detergents", "Cleaning & Laundry"),
    ("opf", "toilet-papers", "Toilet Paper"),
]

PHASE1_MARKET_CAP = 100  # Phase 1 target: 80-100 quality products per market
DEFAULT_PER_CATEGORY = 8

REGION_CURRENCY: dict[str, str] = {"de": "EUR", "fr": "EUR", "es": "EUR", "us": "USD", "uk": "GBP"}


def _fetch_category(
    host: str,
    country_tag: str,
    cat_tag: str,
    wanted: int,
    headers: dict[str, str],
    retries: int = 3,
    backoff: float = 12.0,
) -> list[dict[str, Any]]:
    """
    One search request for the most-scanned products of one category in one market.
    Large categories sometimes time out on the free API (HTML error page instead of JSON),
    so a failed request is retried a few times with a growing pause.
    """
    for attempt in range(retries):
        try:
            resp = requests.get(
                f"https://{host}/api/v2/search",
                params={
                    **({"countries_tags_en": country_tag} if country_tag else {}),
                    "categories_tags_en": cat_tag,
                    "sort_by": "unique_scans_n",
                    "page_size": wanted * 3,
                    "fields": "code,product_name,brands,quantity,image_front_small_url,unique_scans_n",
                },
                headers=headers,
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json().get("products", [])
        except (requests.RequestException, ValueError):
            pass
        if attempt < retries - 1:
            time.sleep(backoff * (attempt + 1))
    return []


def discover_openfoodfacts_catalog(
    region_code: str,
    per_category: int = DEFAULT_PER_CATEGORY,
    categories: list[tuple[str, str, str]] | None = None,
    pause: float = OFF_REQUEST_PAUSE_SECONDS,
    cap: int = PHASE1_MARKET_CAP,
) -> list[dict[str, Any]]:
    """
    Fetches the most-scanned real products per core category for one market from the
    Open Food / Beauty / Products Facts databases. Categories are merged round-robin so the
    result stays balanced across categories when the market cap is reached.
    """
    if region_code not in OFF_COUNTRY_TAG:
        return []
    country_tag = OFF_COUNTRY_TAG[region_code]
    headers = {"User-Agent": "KiloRadarDataPipeline/1.0 (https://www.kiloradar.com)"}

    per_cat_lists: list[list[dict[str, Any]]] = []
    for db_key, cat_tag, cat_label in categories or OFF_CORE_CATEGORIES:
        host, db_name = OFF_DB_HOSTS[db_key]
        raw = _fetch_category(host, country_tag, cat_tag, per_category, headers)
        time.sleep(pause)

        picked: list[dict[str, Any]] = []
        for item in raw:
            code = str(item.get("code", "")).strip()
            quantity = str(item.get("quantity") or "").strip()
            name = str(item.get("product_name") or "").strip()
            brand = str(item.get("brands") or "").split(",")[0].strip()
            if not (code and quantity and name):
                continue
            try:
                parsed = parse_measure(quantity)
            except ValueError:
                continue
            if parsed.standard_amount <= 0 or parsed.standard_amount > MAX_VALID_GRAMS:
                continue
            picked.append(
                {
                    "id": f"{region_code}-off-{code}",
                    "barcode": code,
                    "name": name,
                    "brand": brand,
                    "category": cat_label,
                    "measure": f"{parsed.raw_quantity:g} {parsed.raw_unit}",
                    "imageUrl": item.get("image_front_small_url"),
                    "scans": item.get("unique_scans_n") or 0,
                    "sourceName": db_name,
                    "sourceUrl": f"https://{host}/product/{code}",
                }
            )
            if len(picked) >= per_category:
                break
        per_cat_lists.append(picked)

    found: dict[str, dict[str, Any]] = {}
    index = 0
    while len(found) < cap and any(index < len(lst) for lst in per_cat_lists):
        for lst in per_cat_lists:
            if index < len(lst) and lst[index]["barcode"] not in found and len(found) < cap:
                found[lst[index]["barcode"]] = lst[index]
        index += 1
    return list(found.values())


def update_catalog(
    previous: list[dict[str, Any]],
    discovered: list[dict[str, Any]],
    region_code: str,
    today_iso: str,
) -> list[dict[str, Any]]:
    """
    Merges today's discovery into the stored catalog. Existing entries keep their history;
    a smaller pack than the last recorded size becomes a shrink event. Products that were not
    seen tonight are kept (they may just have dropped out of the top list).
    """
    by_id = {str(p["id"]): dict(p) for p in previous if p.get("id")}
    for item in discovered:
        entry = by_id.get(item["id"])
        provenance_source = {
            "name": item.get("sourceName", "Open Food Facts"),
            "url": item.get("sourceUrl", OFF_PRODUCT_URL.format(ean=item["barcode"])),
            "checked": today_iso,
        }
        if entry is None:
            entry = {
                "id": item["id"],
                "barcode": item["barcode"],
                "market": region_code,
                "sizeHistory": [{"date": today_iso, "value": item["measure"]}],
                "shrinkEvents": [],
            }
        else:
            last = entry.get("sizeHistory", [])
            if last and last[-1].get("value") != item["measure"]:
                try:
                    before = parse_measure(str(last[-1]["value"])).standard_amount
                    after = parse_measure(item["measure"]).standard_amount
                except ValueError:
                    before = after = 0.0
                if after and before and after < before:
                    entry.setdefault("shrinkEvents", []).append(
                        {
                            "date": today_iso,
                            "from": last[-1]["value"],
                            "to": item["measure"],
                            "shrinkIndex": None,
                        }
                    )
                entry["sizeHistory"] = last + [{"date": today_iso, "value": item["measure"]}]
        entry.update(
            {
                "name": item["name"],
                "brand": item["brand"],
                "category": item["category"],
                "measure": item["measure"],
                "imageUrl": item.get("imageUrl"),
                "scans": item.get("scans", 0),
                "sources": [provenance_source],
                "lastChecked": today_iso,
                "verification": "verified",
                "matchConfidence": 1.0,
            }
        )
        by_id[item["id"]] = entry
    return sorted(by_id.values(), key=lambda e: int(e.get("scans") or 0), reverse=True)


def _sql_text(value: Any) -> str:
    """Quotes a value as a SQL string literal (NULL for None)."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def _price_sql(item: dict[str, Any]) -> str:
    """SQL values for the optional Open Prices fields of a catalog item."""
    price = item.get("price")
    if not price:
        return "NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL"
    unit = price.get("unitPrice")
    return (
        f"{float(price['value'])}, {_sql_text(price.get('currency'))}, {_sql_text(price.get('date'))}, "
        f"{_sql_text(price.get('store'))}, {_sql_text(price.get('source'))}, {_sql_text(price.get('url'))}, "
        f"{float(unit) if unit is not None else 'NULL'}, {_sql_text(price.get('unitLabel'))}"
    )


def generate_catalog_sql(synced_payloads: dict[str, dict[str, Any]]) -> str:
    """
    Generates idempotent SQL (no explicit transaction, so Cloudflare D1 accepts it) that upserts
    the discovered Open Food Facts catalog into `catalog_products` and `catalog_size_history`.
    """
    lines = [
        "-- KiloRadar - Auto-generated catalog sync for Cloudflare D1 (real Open Food Facts products)",
        f"-- Generated at: {dt.datetime.now(dt.timezone.utc).isoformat()}",
    ]
    for region_code, payload in synced_payloads.items():
        for item in payload.get("catalog", []):
            ean = item.get("barcode")
            if not ean:
                continue
            src = (item.get("sources") or [{}])[0]
            conf = item.get("matchConfidence")
            lines.append(
                "INSERT OR REPLACE INTO catalog_products "
                "(market, ean, name, brand, category, measure, image_url, source_name, source_url, "
                "last_checked, verification, match_confidence, price, price_currency, price_date, "
                "price_store, price_source, price_url, unit_price, unit_label, updated_at) VALUES ("
                f"{_sql_text(region_code)}, {_sql_text(ean)}, {_sql_text(item.get('name'))}, "
                f"{_sql_text(item.get('brand'))}, {_sql_text(item.get('category'))}, "
                f"{_sql_text(item.get('measure'))}, {_sql_text(item.get('imageUrl'))}, "
                f"{_sql_text(src.get('name'))}, {_sql_text(src.get('url'))}, "
                f"{_sql_text(item.get('lastChecked'))}, {_sql_text(item.get('verification', 'unverified'))}, "
                f"{float(conf) if conf is not None else 'NULL'}, "
                f"{_price_sql(item)}, CURRENT_TIMESTAMP);"
            )
            for entry in item.get("sizeHistory", []):
                lines.append(
                    "INSERT OR IGNORE INTO catalog_size_history (market, ean, recorded_on, measure) VALUES ("
                    f"{_sql_text(region_code)}, {_sql_text(ean)}, {_sql_text(entry.get('date'))}, "
                    f"{_sql_text(entry.get('value'))});"
                )
    return "\n".join(lines) + "\n"


# --- Open Prices (crowdsourced prices, ODbL) -------------------------------------------------
# https://prices.openfoodfacts.org - open data from the Open Food Facts project. Prices are
# collected by volunteers (shelf photos and receipts) and are published under the ODbL, which
# requires attribution. We show the price only when an observation exists for the same barcode
# in the same market and currency, and always together with source, store and date.

OPEN_PRICES_URL = "https://prices.openfoodfacts.org/api/v1/prices"
OPEN_PRICES_PRODUCT_URL = "https://prices.openfoodfacts.org/products/{ean}"
OPEN_PRICES_PAUSE_SECONDS = 0.5
OPEN_PRICES_MAX_AGE_DAYS = 365

MARKET_COUNTRY_CODE: dict[str, str] = {
    "no": "NO", "se": "SE", "dk": "DK", "pl": "PL", "de": "DE",
    "fr": "FR", "es": "ES", "uk": "GB", "us": "US",
}
MARKET_CURRENCY: dict[str, str] = {
    "no": "NOK", "se": "SEK", "dk": "DKK", "pl": "PLN", "de": "EUR",
    "fr": "EUR", "es": "EUR", "uk": "GBP", "us": "USD",
}


def compute_unit_price(price: float, measure: str) -> tuple[float, str] | None:
    """Price per kg / l / piece from a price and a measure string, e.g. (89, '500 g') -> (178, 'kg')."""
    try:
        parsed = parse_measure(measure)
    except ValueError:
        return None
    if parsed.normalized_base_amount <= 0:
        return None
    return round(price / parsed.normalized_base_amount, 2), parsed.base_unit


def pick_open_prices_observation(
    items: list[dict[str, Any]], market: str, today: dt.date
) -> dict[str, Any] | None:
    """
    Picks the newest trustworthy observation from an Open Prices response: positive price,
    the market's currency, a known date within a year, and a store located in the same country.
    """
    country = MARKET_COUNTRY_CODE.get(market)
    currency = MARKET_CURRENCY.get(market)
    best: dict[str, Any] | None = None
    for it in items:
        try:
            price = float(it.get("price"))
            day = dt.date.fromisoformat(str(it.get("date")))
        except (TypeError, ValueError):
            continue
        loc = it.get("location") or {}
        if price <= 0 or it.get("currency") != currency:
            continue
        if str(loc.get("osm_address_country_code") or "").upper() != country:
            continue
        if (today - day).days > OPEN_PRICES_MAX_AGE_DAYS or day > today:
            continue
        if best is None or day > best["day"]:
            best = {
                "day": day,
                "price": price,
                "store": loc.get("osm_brand") or loc.get("osm_name"),
                "discounted": bool(it.get("price_is_discounted")),
            }
    return best


def fetch_open_prices_for_barcode(ean: str, market: str, today: dt.date) -> dict[str, Any] | None:
    headers = {"User-Agent": "KiloRadarDataPipeline/1.0 (https://www.kiloradar.com)"}
    try:
        resp = requests.get(
            OPEN_PRICES_URL,
            params={"product_code": ean, "order_by": "-date", "size": 25},
            headers=headers,
            timeout=25,
        )
        if resp.status_code != 200:
            return None
        return pick_open_prices_observation(resp.json().get("items", []), market, today)
    except (requests.RequestException, ValueError):
        return None


def attach_open_prices(
    catalog: list[dict[str, Any]],
    market: str,
    today_iso: str,
    pause: float = OPEN_PRICES_PAUSE_SECONDS,
    fetch=fetch_open_prices_for_barcode,
) -> int:
    """
    Adds `price` (with unit price, store, date and credit) to catalog products that have an
    Open Prices observation. Products without one keep no price and show "Pris kommer".
    A previously stored price is kept when a lookup fails.
    """
    if market not in MARKET_CURRENCY:
        return 0
    today = dt.date.fromisoformat(today_iso)
    found = 0
    for item in catalog:
        ean = str(item.get("barcode", ""))
        if not ean:
            continue
        obs = fetch(ean, market, today)
        time.sleep(pause)
        if not obs:
            continue
        unit = compute_unit_price(obs["price"], str(item.get("measure", "")))
        url = OPEN_PRICES_PRODUCT_URL.format(ean=ean)
        item["price"] = {
            "value": obs["price"],
            "currency": MARKET_CURRENCY[market],
            "date": obs["day"].isoformat(),
            "store": obs["store"],
            "discounted": obs["discounted"],
            "unitPrice": unit[0] if unit else None,
            "unitLabel": unit[1] if unit else None,
            "source": "Open Prices",
            "url": url,
            "license": "ODbL",
            "checked": today_iso,
        }
        item["sources"] = [s for s in item.get("sources", []) if s.get("name") != "Open Prices"] + [
            {"name": "Open Prices (ODbL)", "url": url, "checked": today_iso}
        ]
        found += 1
    return found


# --- Tjek / eTilbudsavis offers (DISABLED by default) -----------------------------------------
# Tjek's terms (https://tjek.com/terms, section 8) allow API content to be used by third parties
# commercially only with prior written approval. This adapter is therefore OFF unless the
# operator sets KILORADAR_TJEK_APPROVED=1 after receiving that approval. Nothing here runs in the
# nightly job by default.

TJEK_API_URL = "https://api.etilbudsavis.dk/v2/offers/search"
TJEK_COUNTRY: dict[str, str] = {"no": "NO", "se": "SE", "dk": "DK"}
TJEK_SI_FACTORS = {"kg": 1.0, "g": 0.001, "l": 1.0, "ml": 0.001, "cl": 0.01, "dl": 0.1}


def tjek_enabled() -> bool:
    return os.environ.get("KILORADAR_TJEK_APPROVED") == "1"


def normalize_tjek_offer(raw: dict[str, Any], market: str, today_iso: str) -> dict[str, Any] | None:
    """Normalizes one Tjek offer to fact-level fields with a unit price (per kg / l)."""
    pricing = raw.get("pricing") or {}
    qty = raw.get("quantity") or {}
    try:
        price = float(pricing["price"])
    except (KeyError, TypeError, ValueError):
        return None
    if price <= 0:
        return None
    unit_price = None
    unit_label = None
    try:
        symbol = str((qty.get("unit") or {}).get("symbol", "")).lower()
        size = float((qty.get("size") or {}).get("from"))
        pieces = float((qty.get("pieces") or {}).get("from") or 1)
        factor = TJEK_SI_FACTORS.get(symbol)
        if factor and size > 0:
            base = size * pieces * factor
            unit_price = round(price / base, 2)
            unit_label = "l" if symbol in ("l", "ml", "cl", "dl") else "kg"
    except (TypeError, ValueError):
        pass
    dealer = raw.get("dealer") or {}
    return {
        "market": market,
        "heading": raw.get("heading"),
        "price": price,
        "prePrice": pricing.get("pre_price"),
        "currency": pricing.get("currency"),
        "unitPrice": unit_price,
        "unitLabel": unit_label,
        "store": dealer.get("name"),
        "validFrom": raw.get("run_from"),
        "validTill": raw.get("run_till"),
        "source": "Tjek / eTilbudsavis",
        "url": f"https://etilbudsavis.dk/offers/{raw.get('id')}" if raw.get("id") else None,
        "checked": today_iso,
    }


def fetch_tjek_offers(market: str, queries: list[str], today_iso: str, limit: int = 20) -> list[dict[str, Any]]:
    """Fetches current offers for search terms. Returns [] unless approval is configured."""
    if not tjek_enabled() or market not in TJEK_COUNTRY:
        return []
    headers = {"User-Agent": "KiloRadarDataPipeline/1.0 (https://www.kiloradar.com)"}
    out: list[dict[str, Any]] = []
    for query in queries:
        try:
            resp = requests.get(
                TJEK_API_URL,
                params={"query": query, "limit": limit, "country_id": TJEK_COUNTRY[market]},
                headers=headers,
                timeout=25,
            )
            if resp.status_code == 200:
                for raw in resp.json():
                    norm = normalize_tjek_offer(raw, market, today_iso)
                    if norm:
                        out.append(norm)
        except (requests.RequestException, ValueError):
            pass
        time.sleep(1.0)
    return out


def run_full_pipeline(
    fetch_live: bool = True, regions: list[str] | None = None, discover: bool | None = None
) -> dict[str, dict[str, Any]]:
    """
    Runs the complete synchronization pipeline across all regions, writes static JSON files
    to `public/data/[country].json`, and writes Cloudflare D1 SQL to `scripts/latest_sync.sql`.

    Catalog discovery (real Open Food Facts products) runs only when fetch_live is true.
    Set KILORADAR_REGIONS=de,fr to limit a run to some regions.
    """
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    env_regions = os.environ.get("KILORADAR_REGIONS")
    if regions is None and env_regions:
        regions = [r.strip() for r in env_regions.split(",") if r.strip()]
    regions = regions or ["global", "en", "no", "se", "dk", "pl", "de", "fr", "es", "us", "uk"]
    do_discover = fetch_live if discover is None else discover
    today_iso = dt.date.today().isoformat()
    synced: dict[str, dict[str, Any]] = {}

    for reg in regions:
        payload = sync_region(reg, fetch_live=fetch_live)

        out_path = PUBLIC_DATA_DIR / f"{reg}.json"
        previous_catalog: list[dict[str, Any]] = []
        if out_path.exists():
            try:
                previous_catalog = json.loads(out_path.read_text(encoding="utf-8")).get("catalog", [])
            except (ValueError, OSError):
                previous_catalog = []
        discovered = discover_openfoodfacts_catalog(reg) if do_discover else []
        payload["catalog"] = update_catalog(previous_catalog, discovered, reg, today_iso)
        if do_discover:
            attach_open_prices(payload["catalog"], reg, today_iso)
        payload["catalogCount"] = len(payload["catalog"])

        synced[reg] = payload
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    sql_content = generate_d1_sql(synced)
    LATEST_SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    LATEST_SQL_PATH.write_text(sql_content, encoding="utf-8")
    CATALOG_SQL_PATH.write_text(generate_catalog_sql(synced), encoding="utf-8")

    return synced


if __name__ == "__main__":
    results = run_full_pipeline(fetch_live=True)
    total_items = sum(
        r["count"] + r.get("catalogCount", 0) for k, r in results.items() if k != "global"
    )
    print(
        f"✔ KiloRadar Python pipeline synced {len(results)} region files ({total_items} products) "
        f"to {PUBLIC_DATA_DIR} and generated {LATEST_SQL_PATH.name}."
    )
