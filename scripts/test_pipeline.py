"""
Unit tests for KiloRadar Python Data Pipeline (`scripts/sync_products.py`)
Run with: pytest scripts/test_pipeline.py
"""

from __future__ import annotations

import json
import pytest

from sync_products import (
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
        assert results[region]["count"] > 0

    sql = generate_d1_sql(results)
    assert "INSERT OR REPLACE INTO products" in sql
    assert "INSERT INTO price_history" in sql
