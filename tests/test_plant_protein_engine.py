"""Unit tests for Plant-Based DIAAS & Protein Optimizer Engine."""

import pytest
from mos_bot.core.plant_protein_engine import (
    optimize_plant_protein,
)


class TestPlantProteinEngine:
    def test_plant_protein_scaling_and_leucine(self):
        res = optimize_plant_protein(150.0, diet_type="vegan")
        assert res.plant_adjusted_target_g == 180.0  # +20% scaling
        assert res.per_meal_leucine_target_g == 2.8
        assert any("Rice Protein + Pea Protein" in p["pairing"] for p in res.complementary_pairings)
        assert any("Vitamin B12" in s for s in res.supplementation_priorities)
        assert any("Creatine" in s for s in res.supplementation_priorities)
