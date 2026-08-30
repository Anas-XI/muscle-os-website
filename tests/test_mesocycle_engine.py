"""Tests for Mesocycle Progression State Machine."""

import pytest
from mos_bot.core.mesocycle_engine import (
    MesocycleState,
    advance_mesocycle,
    get_mesocycle_phase,
)


class TestMesocycleEngine:
    """Test 6-week periodization and autoregulation."""

    def test_phase_mapping(self):
        assert get_mesocycle_phase(1) == "intro"
        assert get_mesocycle_phase(2) == "accumulation"
        assert get_mesocycle_phase(3) == "accumulation"
        assert get_mesocycle_phase(4) == "accumulation"
        assert get_mesocycle_phase(5) == "peak"
        assert get_mesocycle_phase(6) == "deload"

    def test_normal_progression_week_1_to_6(self):
        state = MesocycleState(user_id="user_123", current_week=1)
        
        # Week 1 -> Week 2
        res = advance_mesocycle(state, readiness_score=8)
        assert res.new_state.current_week == 2
        assert res.new_state.phase == "accumulation"
        assert res.volume_change_pct == 10
        assert res.target_rir == "1-2"

        # Week 4 -> Week 5 (Peak)
        res_peak = advance_mesocycle(MesocycleState(user_id="u", current_week=4), readiness_score=8)
        assert res_peak.new_state.current_week == 5
        assert res_peak.new_state.phase == "peak"
        assert res_peak.volume_change_pct == 35
        assert res_peak.target_rir == "0-1"

        # Week 5 -> Week 6 (Deload)
        res_deload = advance_mesocycle(MesocycleState(user_id="u", current_week=5), readiness_score=8)
        assert res_deload.new_state.current_week == 6
        assert res_deload.new_state.phase == "deload"
        assert res_deload.volume_change_pct == -45

        # Week 6 -> Mesocycle 2 Week 1 (Pivot)
        res_pivot = advance_mesocycle(MesocycleState(user_id="u", current_week=6, mesocycle_index=1))
        assert res_pivot.new_state.current_week == 1
        assert res_pivot.new_state.mesocycle_index == 2
        assert res_pivot.pivot_ready is True

    def test_autoregulated_early_deload_on_low_readiness(self):
        # User in Week 3 with severe fatigue (readiness = 3) -> early deload
        state = MesocycleState(user_id="u", current_week=3)
        res = advance_mesocycle(state, readiness_score=3)
        assert res.new_state.current_week == 1
        assert res.pivot_ready is True
