"""Unit tests for Evidence Supplement Stack Analyzer."""

import pytest
from mos_bot.core.supplement_engine import (
    analyze_supplement_stack,
)


class TestSupplementEngine:
    def test_analyze_proven_stack(self):
        stack = ["Creatine Monohydrate", "Whey Protein", "Vitamin D3", "Omega-3 Fish Oil"]
        res = analyze_supplement_stack(stack, bedtime_hour=22)
        assert res.tier_summary["Tier 1"] == 4
        assert len(res.dosing_schedule["morning"]) >= 2
        assert len(res.dosing_schedule["post_workout"]) >= 2

    def test_caffeine_cutoff_warning(self):
        stack = ["Caffeine Anhydrous", "Creatine"]
        res = analyze_supplement_stack(stack, bedtime_hour=22)
        assert any("Caffeine Sleep Cutoff" in w for w in res.collision_warnings)
