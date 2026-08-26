"""Unit tests for Cardio & Concurrent Training Engine."""

import pytest
from mos_bot.core.cardio_engine import (
    generate_cardio_prescription,
)


class TestCardioEngine:
    def test_cardio_prescription_hypertrophy(self):
        # 30yo, resting HR 60
        # HRmax = 208 - (0.7 * 30) = 187
        # HRR = 187 - 60 = 127
        # Z2 = 60 + 0.60*127 to 60 + 0.70*127 = 136 to 149 bpm
        res = generate_cardio_prescription(age=30, experience="intermediate", goal="hypertrophy", resting_hr=60)
        assert res.estimated_hrmax == 187
        assert 135 <= res.zone2_hr_range[0] <= 138
        assert 147 <= res.zone2_hr_range[1] <= 150
        assert res.weekly_zone2_minutes == 120
        assert any("6-Hour Separation" in r for r in res.concurrent_training_rules)
