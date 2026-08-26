"""Unit tests for Posture Assessment & Correctives Engine."""

import pytest
from mos_bot.core.posture_engine import (
    evaluate_posture,
)


class TestPostureEngine:
    def test_upper_crossed_syndrome_plan(self):
        plan = evaluate_posture("Upper Crossed Syndrome")
        assert plan is not None
        assert "Upper Crossed" in plan.syndrome_name
        assert "Pectoralis Major/Minor" in plan.short_overactive_muscles
        assert "Lower Trapezius" in plan.long_underactive_muscles
        assert len(plan.corrective_routine) == 5
        assert any("Face Pulls" in ex.name for ex in plan.corrective_routine)

    def test_lower_crossed_syndrome_plan(self):
        plan = evaluate_posture("Anterior Pelvic Tilt")
        assert plan is not None
        assert "Lower Crossed" in plan.syndrome_name
        assert "Iliopsoas (Hip Flexors)" in plan.short_overactive_muscles
        assert any("Deadbugs" in ex.name for ex in plan.corrective_routine)
