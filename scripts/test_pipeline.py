"""
Unit tests for KiloRadar Python Data Pipeline (`scripts/sync_products.py`)
Run with: pytest scripts/test_pipeline.py
"""

from __future__ import annotations

import json
import pytest

from sync_products import (
    build_store_comparison,
    attach_open_prices,
    compute_unit_price,
    fetch_tjek_offers,
    normalize_tjek_offer,
    pick_open_prices_observation,
    offer_source_status,
    generate_catalog_sql,
    discover_openfoodfacts_catalog,
    update_catalog,
    build_provenance,
    build_shrink_events,
    merge_history,
    calculate_shrinkflation_metrics,
    filter_category_outliers,
    generate_d1_sql,
    is_valid_grocery_observation,
    match_product_across_barcodes,
    parse_measure,
    rank_shrinkflation_findings,
    run_full_pipeline,
)


def test_parse_measure_weights_volumes_and_multipacks():
    m_grams = parse_measure("250 g")
    assert m_grams.standard_amount == 250.0
    assert m_grams.base_unit == "kg"
    assert m_grams.normalized_base_amount == pytest.approx(0.25)

    m_kg = parse_measure("1,5 kg")
    assert m_kg.standard_amount == 1500.0
    assert m_kg.base_unit == "kg"
    assert m_kg.normalized_base_amount == pytest.approx(1.5)

    m_multipack = parse_measure("2 x 150 g")
    assert m_multipack.standard_amount == 300.0
    assert m_multipack.normalized_base_amount == pytest.approx(0.3)

    m_ml = parse_measure("750 ml")
    assert m_ml.standard_amount == 750.0
    assert m_ml.base_unit == "l"
    assert m_ml.normalized_base_amount == pytest.approx(0.75)

    m_oz = parse_measure("16 oz")
    assert m_oz.base_unit == "kg"
    assert m_oz.standard_amount == pytest.approx(453.59237, rel=1e-4)

    m_floz = parse_measure("52 fl oz")
    assert m_floz.base_unit == "l"
    assert m_floz.standard_amount == pytest.approx(1537.82, rel=1e-3)


def test_outlier_filtering_rejects_over_50kg_and_unrealistic_unit_prices():
    normal_coffee = parse_measure("250 g")
    assert is_valid_grocery_observation(normal_coffee, 46.90, "NOK") is True

    # Reject user-entry error > 50 kg (e.g. 75 kg entered by mistake)
    huge_weight = parse_measure("75 kg")
    assert is_valid_grocery_observation(huge_weight, 46.90, "NOK") is False

    # Reject extreme unit price outlier (e.g. 5000 NOK for a 10g pack -> 500,000 NOK/kg)
    tiny_pack = parse_measure("10 g")
    assert is_valid_grocery_observation(tiny_pack, 5000.0, "NOK") is False

    # Reject negative or zero price
    assert is_valid_grocery_observation(normal_coffee, 0.0, "NOK") is False
    assert is_valid_grocery_observation(normal_coffee, -25.0, "NOK") is False

    # Statistical category IQR filter removes extreme glitch
    cat_samples = [
        {"name": "Item 1", "unit_price": 150.0},
        {"name": "Item 2", "unit_price": 165.0},
        {"name": "Item 3", "unit_price": 175.0},
        {"name": "Item 4", "unit_price": 185.0},
        {"name": "Glitch Outlier", "unit_price": 9999.0},
    ]
    filtered = filter_category_outliers(cat_samples)
    assert len(filtered) == 4
    assert all(item["name"] != "Glitch Outlier" for item in filtered)


def test_rapidfuzz_matching_across_barcode_and_size_changes():
    catalog = [
        {
            "id": "no-kaffe-evergood",
            "name": "Evergood Classic Filtermalt 250 g",
            "brand": "Joh. Johannson Kaffe",
            "barcode": "7040913336684",
        },
        {
            "id": "no-sjokolade-freia",
            "name": "Freia Melkesjokolade Storplate 200 g",
            "brand": "Freia",
            "barcode": "7622210410337",
        },
    ]

    # Match product whose size changed from 200g to 180g and barcode changed
    match, score = match_product_across_barcodes(
        "Freia Melkesjokolade 180 g",
        catalog,
        threshold=65.0,
        candidate_ean="7622210999999",
    )
    assert match is not None
    assert match["id"] == "no-sjokolade-freia"
    assert score >= 75.0


def test_shrinkflation_index_formula_and_ranking():
    # Old: 250g for 44.90 NOK (179.60 NOK/kg)
    # New: 200g for 46.90 NOK (234.50 NOK/kg)
    # Formula: ((234.50 / 179.60) - 1) * 100 = +30.57%
    metrics = calculate_shrinkflation_metrics(44.90, "250 g", 46.90, "200 g")
    assert metrics.old_unit_price == pytest.approx(179.60, abs=0.01)
    assert metrics.new_unit_price == pytest.approx(234.50, abs=0.01)
    assert metrics.shrink_index == pytest.approx(30.57, abs=0.02)
    assert metrics.amount_change_pct == pytest.approx(-20.0, abs=0.01)
    assert metrics.is_shrinkflation is True

    ranked = rank_shrinkflation_findings(
        [
            {
                "id": "stable",
                "oldMeasure": "250 g",
                "newMeasure": "250 g",
                "oldPrice": 35.0,
                "newPrice": 35.0,
                "currency": "NOK",
            },
            {
                "id": "shrunk",
                "oldMeasure": "250 g",
                "newMeasure": "200 g",
                "oldPrice": 44.90,
                "newPrice": 46.90,
                "currency": "NOK",
            },
        ]
    )
    assert len(ranked) == 2
    assert ranked[0]["id"] == "shrunk"
    assert ranked[0]["shrinkIndex"] > ranked[1]["shrinkIndex"]


def test_full_pipeline_exports_static_json_and_d1_sql():
    results = run_full_pipeline(fetch_live=False)
    for region in ("global", "no", "se", "dk", "pl"):
        assert region in results
        # sample products are no longer published: only measured data
        assert results[region]["count"] == 0
        assert results[region]["products"] == []

    sql = generate_d1_sql(results)
    assert "INSERT OR REPLACE INTO products" not in sql


def test_provenance_marks_unchecked_products_as_unverified():
    prov = build_provenance({"barcode": "123", "newMeasure": "200 g"}, None, "2026-11-15")
    assert prov["verification"] == "unverified"
    assert prov["sources"] == []
    assert prov["lastChecked"] is None
    assert prov["matchConfidence"] is None


def test_provenance_verified_mismatch_and_partial():
    live = {"ean": "123", "quantity": "200 g"}
    verified = build_provenance(
        {"barcode": "123", "newMeasure": "200 g", "offVerifiedQuantity": "200 g"}, live, "2026-11-15"
    )
    assert verified["verification"] == "verified"
    assert verified["matchConfidence"] == 1.0
    assert verified["lastChecked"] == "2026-11-15"
    assert verified["sources"][0]["name"] == "Open Food Facts"
    assert verified["sources"][0]["url"].endswith("/123")

    mismatch = build_provenance(
        {"barcode": "123", "newMeasure": "200 g", "offVerifiedQuantity": "250 g"}, live, "2026-11-15"
    )
    assert mismatch["verification"] == "mismatch"

    partial = build_provenance({"barcode": "123", "newMeasure": "200 g"}, live, "2026-11-15")
    assert partial["verification"] == "partial"


def test_history_only_grows_on_real_change():
    prod = {"id": "x", "newMeasure": "200 g", "newPrice": 46.9, "newUnitPrice": 234.5, "store": "REMA 1000"}
    first = merge_history(None, prod, "2026-11-14")
    assert len(first["sizeHistory"]) == 1
    assert len(first["priceHistory"]) == 1

    # Same observation the next night: nothing appended
    second = merge_history(first, prod, "2026-11-15")
    assert len(second["sizeHistory"]) == 1
    assert len(second["priceHistory"]) == 1

    # Pack shrinks and price changes: both histories gain an entry
    changed = dict(prod, newMeasure="180 g", newPrice=47.9)
    third = merge_history(second, changed, "2026-11-16")
    assert [e["value"] for e in third["sizeHistory"]] == ["200 g", "180 g"]
    assert len(third["priceHistory"]) == 2


def test_shrink_events_only_for_smaller_packs():
    smaller = {"detectedDate": "2026-10-14", "oldMeasure": "250 g", "newMeasure": "200 g",
               "amountChangePct": -20.0, "shrinkIndex": 30.57}
    assert build_shrink_events(smaller)[0]["to"] == "200 g"
    same = dict(smaller, amountChangePct=0.0)
    assert build_shrink_events(same) == []


def test_pipeline_output_publishes_no_sample_products():
    results = run_full_pipeline(fetch_live=False)
    for region, payload in results.items():
        assert payload["products"] == []
        assert payload["count"] == 0



class _FakeResp:
    status_code = 200

    def __init__(self, products):
        self._products = products

    def json(self):
        return {"products": self._products}


def test_discovery_keeps_only_real_parsable_products(monkeypatch):
    import sync_products

    fake = [
        {"code": "111", "product_name": "Jacobs Kaffee 500 g", "brands": "Jacobs, Other", "quantity": "500 g"},
        {"code": "111", "product_name": "Duplicate", "brands": "Jacobs", "quantity": "500 g"},
        {"code": "222", "product_name": "No quantity", "brands": "X", "quantity": ""},
        {"code": "333", "product_name": "Garbage size", "brands": "X", "quantity": "lots"},
    ]
    monkeypatch.setattr(sync_products.requests, "get", lambda *a, **k: _FakeResp(fake))
    found = discover_openfoodfacts_catalog("de", per_category=5, categories=[("off", "coffees", "Coffee & Tea")], pause=0)
    assert [p["barcode"] for p in found] == ["111"]
    assert found[0]["brand"] == "Jacobs"
    assert found[0]["measure"] == "500 g"
    assert found[0]["id"] == "de-off-111"


def test_unknown_region_discovers_nothing():
    assert discover_openfoodfacts_catalog("xx", pause=0) == []


def test_catalog_records_shrink_only_when_pack_gets_smaller():
    item = {"id": "de-off-1", "barcode": "1", "name": "Kaffee", "brand": "B", "category": "Coffee & Tea",
            "measure": "500 g", "imageUrl": None, "scans": 10}
    day1 = update_catalog([], [item], "de", "2026-11-14")
    assert day1[0]["sizeHistory"] == [{"date": "2026-11-14", "value": "500 g"}]
    assert day1[0]["shrinkEvents"] == []
    assert day1[0]["verification"] == "verified"

    # Same size again: no new history, no event
    day2 = update_catalog(day1, [item], "de", "2026-11-15")
    assert len(day2[0]["sizeHistory"]) == 1

    # Smaller pack: history grows and a shrink event is recorded
    smaller = dict(item, measure="400 g")
    day3 = update_catalog(day2, [smaller], "de", "2026-11-16")
    assert [e["value"] for e in day3[0]["sizeHistory"]] == ["500 g", "400 g"]
    assert day3[0]["shrinkEvents"][0]["from"] == "500 g"

    # Bigger pack: history grows but it is not a shrink event
    bigger = dict(item, measure="600 g")
    day4 = update_catalog(day3, [bigger], "de", "2026-11-17")
    assert len(day4[0]["shrinkEvents"]) == 1


def test_offline_run_never_invents_products_for_new_markets():
    results = run_full_pipeline(fetch_live=False, regions=["de", "fr", "es", "us", "uk"])
    for region in ("de", "fr", "es", "us", "uk"):
        assert results[region]["count"] == 0
        assert results[region]["currency"] in ("EUR", "USD", "GBP")


def test_catalog_sql_is_idempotent_and_escapes_quotes():
    payloads = {
        "de": {
            "catalog": [
                {
                    "barcode": "42",
                    "name": "Mc'Cain Pommes",
                    "brand": "McCain",
                    "category": "Snacks",
                    "measure": "750 g",
                    "imageUrl": None,
                    "sources": [{"name": "Open Food Facts", "url": "https://world.openfoodfacts.org/product/42"}],
                    "lastChecked": "2026-11-15",
                    "verification": "verified",
                    "matchConfidence": 1.0,
                    "sizeHistory": [{"date": "2026-11-15", "value": "750 g"}],
                }
            ]
        },
        "global": {"catalog": [{"barcode": "9", "name": "Worldwide Item", "measure": "1 kg"}]},
    }
    sql = generate_catalog_sql(payloads)
    assert "INSERT OR REPLACE INTO catalog_products" in sql
    assert "INSERT OR IGNORE INTO catalog_size_history" in sql
    assert "Mc''Cain Pommes" in sql
    assert "'global', '9'" in sql
    assert "BEGIN" not in sql and "COMMIT" not in sql


def test_discovery_uses_the_right_database_and_cites_its_record(monkeypatch):
    import sync_products

    seen_hosts: list[str] = []

    def fake_get(url, **kwargs):
        seen_hosts.append(url.split("/")[2])
        return _FakeResp([{"code": "777", "product_name": "Tannkrem", "brands": "Colgate", "quantity": "75 ml"}])

    monkeypatch.setattr(sync_products.requests, "get", fake_get)
    found = discover_openfoodfacts_catalog(
        "no", per_category=3, categories=[("obf", "toothpastes", "Personal Care")], pause=0
    )
    assert seen_hosts == ["world.openbeautyfacts.org"]
    assert found[0]["sourceName"] == "Open Beauty Facts"
    assert found[0]["sourceUrl"] == "https://world.openbeautyfacts.org/product/777"


def test_discovery_is_balanced_and_capped(monkeypatch):
    import sync_products

    def fake_get(url, **kwargs):
        tag = kwargs["params"]["categories_tags_en"]
        return _FakeResp(
            [{"code": f"{tag}-{i}", "product_name": f"{tag} {i}", "brands": "B", "quantity": "100 g"} for i in range(5)]
        )

    monkeypatch.setattr(sync_products.requests, "get", fake_get)
    cats = [("off", "coffees", "Coffee & Tea"), ("off", "butters", "Dairy")]
    found = discover_openfoodfacts_catalog("no", per_category=5, categories=cats, pause=0, cap=4)
    assert len(found) == 4
    assert {p["category"] for p in found} == {"Coffee & Tea", "Dairy"}


def test_catalog_keeps_the_source_database_per_product():
    item = {"id": "de-off-9", "barcode": "9", "name": "Zahnpasta", "brand": "B", "category": "Personal Care",
            "measure": "75 ml", "imageUrl": None, "scans": 1,
            "sourceName": "Open Beauty Facts", "sourceUrl": "https://world.openbeautyfacts.org/product/9"}
    entry = update_catalog([], [item], "de", "2026-11-15")[0]
    assert entry["sources"][0]["name"] == "Open Beauty Facts"
    assert entry["sources"][0]["url"].endswith("/product/9")
    assert entry["sources"][0]["checked"] == "2026-11-15"


def test_failed_requests_are_retried(monkeypatch):
    import sync_products

    calls = {"n": 0}

    class _Bad:
        status_code = 503

        def json(self):
            raise ValueError("html error page")

    def flaky_get(url, **kwargs):
        calls["n"] += 1
        return _Bad() if calls["n"] < 3 else _FakeResp([{"code": "1"}])

    monkeypatch.setattr(sync_products.requests, "get", flaky_get)
    monkeypatch.setattr(sync_products.time, "sleep", lambda s: None)
    out = sync_products._fetch_category("h", "norway", "coffees", 5, {}, retries=3, backoff=0)
    assert calls["n"] == 3
    assert out == [{"code": "1"}]


def test_mattilbud_is_registered_but_never_pretends_to_supply_data(monkeypatch):
    monkeypatch.delenv("TJEK_API_KEY", raising=False)
    status = offer_source_status("no")
    assert status[0]["name"] == "mattilbud.no"
    assert status[0]["status"] == "needs_access"
    monkeypatch.setenv("TJEK_API_KEY", "x")
    assert offer_source_status("no")[0]["status"] == "key_present_adapter_missing"
    assert offer_source_status("de") == []


def _op_item(price, currency="NOK", date="2026-11-01", country="NO", brand="REMA 1000", discounted=False):
    return {"price": price, "currency": currency, "date": date, "price_is_discounted": discounted,
            "location": {"osm_address_country_code": country, "osm_brand": brand}}


def test_open_prices_picks_newest_valid_observation_for_the_market():
    import datetime as dt

    today = dt.date(2026, 11, 15)
    items = [
        _op_item(10.0, date="2026-09-01"),
        _op_item(12.5, date="2026-11-01"),                      # newest valid
        _op_item(99.0, currency="EUR", date="2026-11-10"),      # wrong currency
        _op_item(55.0, country="SE", date="2026-11-12"),        # store in another country
        _op_item(0.0, date="2026-11-13"),                       # invalid price
        _op_item(5.0, date="2024-01-01"),                       # too old
        {"price": 7.0, "currency": "NOK", "date": None, "location": {"osm_address_country_code": "NO"}},
    ]
    obs = pick_open_prices_observation(items, "no", today)
    assert obs["price"] == 12.5
    assert obs["day"].isoformat() == "2026-11-01"
    assert obs["store"] == "REMA 1000"
    assert pick_open_prices_observation([_op_item(1.0, currency="EUR", country="DE")], "no", today) is None


def test_unit_price_from_price_and_measure():
    assert compute_unit_price(89.0, "500 g") == (178.0, "kg")
    assert compute_unit_price(30.0, "1,5 l") == (20.0, "l")
    assert compute_unit_price(30.0, "lots") is None


def test_attach_open_prices_only_adds_price_when_an_observation_exists():
    import datetime as dt

    catalog = [
        {"barcode": "1", "measure": "500 g", "sources": [{"name": "Open Food Facts"}]},
        {"barcode": "2", "measure": "1 l", "sources": [{"name": "Open Food Facts"}]},
    ]

    def fake_fetch(ean, market, today):
        if ean == "1":
            return {"day": dt.date(2026, 11, 1), "price": 40.0, "store": "KIWI", "discounted": False}
        return None

    found = attach_open_prices(catalog, "no", "2026-11-15", pause=0, fetch=fake_fetch)
    assert found == 1
    assert catalog[0]["price"]["value"] == 40.0
    assert catalog[0]["price"]["unitPrice"] == 80.0
    assert catalog[0]["price"]["license"] == "ODbL"
    assert catalog[0]["price"]["store"] == "KIWI"
    assert {s["name"] for s in catalog[0]["sources"]} == {"Open Food Facts", "Open Prices (ODbL)"}
    assert "price" not in catalog[1]


def test_catalog_sql_includes_price_fields():
    item = {"barcode": "1", "name": "Kaffe", "measure": "500 g", "category": "Coffee & Tea",
            "sources": [{"name": "Open Food Facts", "url": "u"}], "verification": "verified",
            "price": {"value": 89.0, "currency": "NOK", "date": "2026-11-01", "store": "KIWI",
                      "source": "Open Prices", "url": "https://prices.openfoodfacts.org/products/1",
                      "unitPrice": 178.0, "unitLabel": "kg"}}
    sql = generate_catalog_sql({"no": {"catalog": [item]}})
    assert "89.0, 'NOK', '2026-11-01', 'KIWI', 'Open Prices'" in sql
    no_price = generate_catalog_sql({"no": {"catalog": [dict(item, price=None)]}})
    assert "NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL" in no_price


def test_tjek_is_disabled_unless_explicitly_approved(monkeypatch):
    monkeypatch.delenv("KILORADAR_TJEK_APPROVED", raising=False)
    assert fetch_tjek_offers("no", ["kaffe"], "2026-11-15") == []


def test_tjek_offer_is_normalized_to_unit_price():
    raw = {
        "id": "abc", "heading": "FRIELE 500 G KAFFE",
        "pricing": {"price": 89, "pre_price": 134.9, "currency": "NOK"},
        "quantity": {"unit": {"symbol": "g"}, "size": {"from": 500, "to": 500}, "pieces": {"from": 1}},
        "run_from": "2026-11-19T23:00:00+0000", "run_till": "2026-11-21T22:59:59+0000",
        "dealer": {"name": "Europris"},
    }
    offer = normalize_tjek_offer(raw, "no", "2026-11-15")
    assert offer["unitPrice"] == 178.0
    assert offer["unitLabel"] == "kg"
    assert offer["store"] == "Europris"
    assert offer["checked"] == "2026-11-15"
    assert normalize_tjek_offer({"pricing": {"price": 0}}, "no", "2026-11-15") is None


def _obs(code, chain, price, country="NO", currency="NOK", day="2026-11-01", discounted=False):
    return {"product_code": code, "price": price, "currency": currency, "date": day,
            "price_is_discounted": discounted,
            "location": {"osm_brand": chain, "osm_address_country_code": country}}


def test_store_comparison_ranks_chains_by_measured_price_level():
    obs = []
    for i in range(40):
        code = f"p{i}"
        base = 20 + i
        obs += [_obs(code, "A", base), _obs(code, "B", base * 1.10), _obs(code, "C", base * 1.20)]
    result = build_store_comparison(obs, "no", "2026-11-15")
    assert result["status"] == "ok"
    assert [c["store"] for c in result["chains"]] == ["A", "B", "C"]
    assert result["chains"][0]["index"] == 1.0
    assert result["chains"][0]["pctVsCheapest"] == 0.0
    assert result["chains"][2]["pctVsCheapest"] > result["chains"][1]["pctVsCheapest"] > 0
    assert result["products"] == 40
    assert result["source"] == "Open Prices" and result["license"] == "ODbL"


def test_store_comparison_is_insufficient_without_overlap():
    obs = [_obs(f"p{i}", "A", 10) for i in range(50)] + [_obs(f"q{i}", "B", 12) for i in range(50)]
    result = build_store_comparison(obs, "no", "2026-11-15")
    assert result["status"] == "insufficient"
    assert "chains" not in result


def test_store_comparison_ignores_discounts_wrong_country_and_outliers():
    obs = []
    for i in range(40):
        obs += [_obs(f"p{i}", "A", 10), _obs(f"p{i}", "B", 11), _obs(f"p{i}", "C", 12)]
    obs += [_obs("p0", "A", 1, discounted=True)]               # campaign price: ignored
    obs += [_obs("p1", "A", 5, country="SE")]                   # store in another country: ignored
    obs += [_obs("x", "A", 1), _obs("x", "B", 100)]            # implausible spread: product dropped
    result = build_store_comparison(obs, "no", "2026-11-15")
    assert result["status"] == "ok"
    assert result["products"] == 40
    a = [c for c in result["chains"] if c["store"] == "A"][0]
    assert a["index"] == 1.0


def test_store_comparison_leaves_out_convenience_and_fuel_chains():
    obs = []
    for i in range(40):
        obs += [_obs(f"p{i}", "A", 10), _obs(f"p{i}", "B", 11), _obs(f"p{i}", "C", 12),
                _obs(f"p{i}", "7-Eleven", 30)]
    result = build_store_comparison(obs, "no", "2026-11-15")
    assert result["status"] == "ok"
    assert "7-Eleven" not in [c["store"] for c in result["chains"]]
