"""Unit tests for 1RM Autoregulation & Strength Standards Engine."""

import pytest
from mos_bot.core.strength_engine import (
    calculate_1rm,
    get_strength_standard,
    prescribe_working_load,
)


class TestStrengthEngine:
    def test_calculate_1rm_epley(self):
        # 100kg x 5 reps @ RIR 0 -> 100 * (1 + 0.0333 * 5) = 116.65 -> 116.7kg
        res = calculate_1rm(100.0, 5, rir=0, formula="epley")
        assert 116.0 <= res.estimated_1rm_kg <= 117.0
        assert res.percentages[1] == res.estimated_1rm_kg
        assert res.percentages[5] == round(res.estimated_1rm_kg * 0.85, 1)

    def test_calculate_1rm_with_rir(self):
        # 100kg x 5 reps @ RIR 2 (effective 7 reps)
        res = calculate_1rm(100.0, 5, rir=2, formula="epley")
        assert res.estimated_1rm_kg > 120.0

    def test_calculate_1rm_brzycki_and_wathan(self):
        res_b = calculate_1rm(100.0, 5, rir=0, formula="brzycki")
        assert 112.0 <= res_b.estimated_1rm_kg <= 113.0
        res_w = calculate_1rm(100.0, 5, rir=0, formula="wathan")
        assert 114.0 <= res_w.estimated_1rm_kg <= 118.0

    def test_strength_standards_male_bench(self):
        # 80kg male benching 120kg 1RM -> Advanced tier (threshold 115kg)
        std = get_strength_standard("bench_press", 120.0, 80.0, "male")
        assert std.tier == "Advanced"
        assert std.next_tier == "Elite"
        assert std.kg_to_next_tier == 30.0
        assert std.ratio_to_bw == 1.5

    def test_strength_standards_female_squat(self):
        # 60kg female squatting 95kg 1RM -> Intermediate tier (threshold 92kg)
        std = get_strength_standard("squat", 95.0, 60.0, "female")
        assert std.tier == "Intermediate"
        assert std.next_tier == "Advanced"

    def test_prescribe_working_load(self):
        # 100kg 1RM for 5 reps @ RIR 2 (effective 7 reps -> 80% = 80kg)
        load = prescribe_working_load(100.0, target_reps=5, target_rir=2)
        assert load == 80.0
