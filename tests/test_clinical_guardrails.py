"""Adversarial & Clinical Safety Guardrail Tests."""

import pytest
from mos_bot.core.models import ClientProfile, SafetyTriageResult
from mos_bot.core.context_loader import (
    run_safety_triage,
    evaluate_ed_screening,
)


class TestClinicalGuardrails:
    """Stress-test clinical red flags and safety triage boundaries."""

    def test_pediatric_under_16_triggers_hard_block(self):
        profile = ClientProfile(
            name="Alex Youth",
            user_id="user_youth",
            age=14,
            goal="hypertrophy",
            situation="beginner",
            equipment="bodyweight",
            training_days=3,
            session_length_min=30,
        )
        ed_result = evaluate_ed_screening({"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no"})
        triage = run_safety_triage(profile, ed_result)
        assert triage.triage == "red"
        assert triage.blocked is True
        assert triage.block_reason == "age_under_16"
        assert "pediatric clearance" in triage.caution_note.lower()

    def test_severe_diagnosed_ed_triggers_red_block(self):
        ed_result = evaluate_ed_screening({"ED1": "yes", "ED2": "yes", "ED3": "yes", "ED4": "yes"})
        profile = ClientProfile(
            name="Jordan ED",
            user_id="user_ed",
            age=22,
            goal="fat_loss",
            situation="beginner",
            equipment="full_gym",
            training_days=4,
            session_length_min=45,
        )
        triage = run_safety_triage(profile, ed_result)
        assert triage.triage == "red"
        assert triage.blocked is True
        assert triage.block_reason == "ed_red"

    def test_underweight_bmi_triggers_hard_block(self):
        # 42kg at 170cm -> BMI = 14.5 (< 18.5)
        profile = ClientProfile(
            name="Sam Underweight",
            user_id="user_underweight",
            age=25,
            height_cm=170,
            bodyweight_kg=42,
            goal="hypertrophy",
            situation="beginner",
        )
        ed_result = evaluate_ed_screening({"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no"})
        triage = run_safety_triage(profile, ed_result)
        assert triage.triage == "red"
        assert triage.blocked is True
        assert triage.block_reason == "bmi_low"

    def test_mental_health_crisis_triggers_immediate_crisis_block(self):
        profile = ClientProfile(
            name="Crisis User",
            user_id="user_crisis",
            age=30,
            mental_health_concern="significant",
            crisis_incident_id="incident_001",
            crisis_cleared_incident="",
        )
        ed_result = ("green", [])
        triage = run_safety_triage(profile, ed_result)
        assert triage.triage == "red"
        assert triage.blocked is True
        assert triage.block_reason == "crisis"
        assert "988" in triage.caution_note or "Helpline" in triage.caution_note
