"""Unit tests for Female Physiology & Menstrual Cycle Periodization."""

import pytest
from mos_bot.core.female_physiology_engine import (
    get_cycle_phase_recommendations,
)


class TestFemalePhysiologyEngine:
    def test_ovulatory_peak_phase(self):
        res = get_cycle_phase_recommendations(cycle_day=10)
        assert "Ovulation" in res.phase_name
        assert res.volume_adjustment_pct == 15
        assert res.target_rir == "1-2"
        assert any("ACL Laxity" in cue for cue in res.injury_prevention_cues)

    def test_luteal_phase_protein_and_temp(self):
        res = get_cycle_phase_recommendations(cycle_day=22)
        assert "Luteal" in res.phase_name
        assert res.volume_adjustment_pct == -20
        assert any("+10-15g" in m for m in res.nutritional_modifications)
