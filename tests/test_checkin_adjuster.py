"""Unit tests for Muscle OS Check-in Adjustment Engine (ADJUSTMENTS.md)."""

import pytest
from mos_bot.core.checkin_adjuster import (
    CheckinTelemetry,
    evaluate_weekly_adjustments,
    CheckinAdjustmentResult,
)


class TestCheckinAdjusterRules:
    """Test individual diagnostic rules from ADJUSTMENTS.md."""

    def test_fat_loss_plateau_triggers_calorie_and_step_adjustments(self):
        # 3 weeks at same weight in deficit
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="fat_loss",
            historical_weights=[80.0, 80.0, 80.0],
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "adjust_nutrition"
        assert res.calorie_adjustment_kcal == -150
        assert res.step_adjustment_daily == 2000
        assert "ADJ-NU-PLATEAU" in res.rules_applied
        assert "Weight Plateau in Deficit" in res.actions[0]

    def test_fat_loss_too_fast_triggers_calorie_increase(self):
        # 80kg client losing 1.5kg in 1 week (>1% BW)
        t = CheckinTelemetry(
            weight_kg=78.5,
            goal="fat_loss",
            historical_weights=[80.0, 78.5],
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "adjust_nutrition"
        assert res.calorie_adjustment_kcal == 150
        assert "ADJ-NU-TOO-FAST" in res.rules_applied

    def test_hypertrophy_stagnation_triggers_calorie_increase(self):
        # 3 weeks at same weight in bulk
        t = CheckinTelemetry(
            weight_kg=75.0,
            goal="hypertrophy",
            historical_weights=[75.0, 75.0, 75.0],
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "adjust_nutrition"
        assert res.calorie_adjustment_kcal == 150
        assert "ADJ-NU-SURPLUS-STABLE" in res.rules_applied

    def test_hypertrophy_excess_fat_gain_triggers_surplus_reduction(self):
        # 75kg client gaining 1.0kg in 1 week (>0.5% BW)
        t = CheckinTelemetry(
            weight_kg=76.0,
            goal="hypertrophy",
            historical_weights=[75.0, 76.0],
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "adjust_nutrition"
        assert res.calorie_adjustment_kcal == -150
        assert "ADJ-NU-SURPLUS-TOO-FAST" in res.rules_applied

    def test_excessive_doms_triggers_volume_reduction(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            soreness_duration_hours=74,
        )
        res = evaluate_weekly_adjustments(t)
        assert res.volume_adjustment_pct == -20
        assert "ADJ-TR-EXCESSIVE-DOMS" in res.rules_applied

    def test_low_readiness_triggers_deload_recommendation(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            readiness=4,
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "deload_recommended"
        assert res.deload_flag is True
        assert res.volume_adjustment_pct == -40
        assert "ADJ-RC-LOW-READINESS" in res.rules_applied

    def test_sleep_deficit_triggers_recovery_priority(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            sleep_hours=5.5,
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "recovery_priority"
        assert "ADJ-SL-DEFICIT" in res.rules_applied

    def test_low_adherence_triggers_mvh_simplification(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            adherence_pct=60,
        )
        res = evaluate_weekly_adjustments(t)
        assert "ADJ-AD-SIMPLIFY" in res.rules_applied

    def test_joint_pain_triggers_movement_modification(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            joint_pain=True,
        )
        res = evaluate_weekly_adjustments(t)
        assert "ADJ-TR-JOINT-PAIN" in res.rules_applied

    def test_all_metrics_good_returns_on_track(self):
        t = CheckinTelemetry(
            weight_kg=80.0,
            goal="hypertrophy",
            historical_weights=[79.8, 80.0],
            readiness=8,
            sleep_hours=8.0,
            adherence_pct=100,
            soreness_duration_hours=24,
            joint_pain=False,
        )
        res = evaluate_weekly_adjustments(t)
        assert res.status == "on_track"
        assert len(res.actions) == 0
        assert "All metrics are on track" in res.format_summary()
