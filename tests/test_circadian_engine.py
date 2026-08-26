"""Unit tests for Circadian & Sleep Optimization Engine."""

import pytest
from mos_bot.core.circadian_engine import (
    calculate_circadian_schedule,
)


class TestCircadianEngine:
    def test_normal_circadian_schedule(self):
        res = calculate_circadian_schedule("07:00", "23:00", is_night_shift=False)
        assert res.caffeine_cutoff_time == "14:00"
        assert "07:00" in res.morning_light_window
        assert "21:00" in res.evening_light_cutoff
        assert len(res.sleep_stack_prescription) >= 3
        assert res.shift_work_guidance is None

    def test_night_shift_protocol(self):
        res = calculate_circadian_schedule("16:00", "08:00", is_night_shift=True)
        assert res.shift_work_guidance is not None
        assert "Night Shift" in res.shift_work_guidance
