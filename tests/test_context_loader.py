"""Test context_loader.py — ED screening, safety triage, pillar assignment."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import (
    evaluate_ed_screening,
    run_safety_triage,
    assign_pillars,
    load_context,
)


def test_ed_screening_green():
    answers = {"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "green"
    assert items == []


def test_ed_screening_yellow_guilt():
    answers = {"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "yes"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "yellow"
    assert "guilt_after_eating" in items


def test_ed_screening_red_diagnosed():
    answers = {"ED1": "no", "ED2": "no", "ED3": "yes", "ED4": "no"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "red"
    assert "diagnosed_ed" in items


def test_ed_screening_red_binge_and_compensate():
    answers = {"ED1": "yes", "ED2": "yes", "ED3": "no", "ED4": "no"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "red"
    assert "binge_episodes" in items
    assert "compensatory_behavior" in items


def test_safety_triage_green():
    profile = ClientProfile(user_id="test", name="Test")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.triage == "green"
    assert not triage.blocked


def test_safety_triage_red_blocks():
    profile = ClientProfile(user_id="test", name="Test")
    triage = run_safety_triage(profile, ("red", ["diagnosed_ed"]))
    assert triage.triage == "red"
    assert triage.blocked


def test_safety_triage_yellow_adds_modifiers():
    profile = ClientProfile(user_id="test", name="Test")
    triage = run_safety_triage(profile, ("yellow", ["binge_episodes", "guilt_after_eating"]))
    assert triage.triage == "yellow"
    assert "gentle_entry" in triage.modifiers
    assert "no_calorie_deficit" in triage.modifiers
    assert "no_food_tracking" in triage.modifiers


def test_safety_triage_medical_conditions():
    profile = ClientProfile(
        user_id="test", name="Test",
        medical=["Osgood-Schlatter", "Vitamin D deficiency"],
    )
    triage = run_safety_triage(profile, ("green", []))
    assert "avoid_deep_squat" in triage.modifiers
    assert "vitamin_d_supplementation" in triage.modifiers


def test_assign_pillars_fat_loss():
    profile = ClientProfile(user_id="test", name="Test", goal="fat_loss")
    triage = run_safety_triage(profile, ("green", []))
    pillars = assign_pillars(profile, triage)
    assert "P1 - Diet Maxing" in pillars.primary_pillars
    assert not pillars.gentle_entry


def test_assign_pillars_hypertrophy():
    profile = ClientProfile(user_id="test", name="Test", goal="hypertrophy")
    triage = run_safety_triage(profile, ("green", []))
    pillars = assign_pillars(profile, triage)
    assert "P2 - Training Maxing" in pillars.primary_pillars


def test_assign_pillars_injury_adds_recovery():
    profile = ClientProfile(user_id="test", name="Test", goal="strength", injuries=["Rotator cuff"])
    triage = run_safety_triage(profile, ("green", []))
    pillars = assign_pillars(profile, triage)
    pillar_names = pillars.primary_pillars + pillars.secondary_pillars
    assert any("Recovery" in p for p in pillar_names)


def test_assign_pillars_poor_sleep():
    profile = ClientProfile(user_id="test", name="Test", goal="hypertrophy", sleep_hours=5.5)
    triage = run_safety_triage(profile, ("green", []))
    pillars = assign_pillars(profile, triage)
    assert any("Sleep" in p for p in pillars.primary_pillars)


def test_safety_triage_mental_health_significant_blocks():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert "support" in triage.caution_note.lower()


def test_safety_triage_mental_health_cleared_does_not_block():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_cleared=True)
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked
    assert "mental_health_support" in triage.modifiers


def test_safety_triage_mental_health_moderate_does_not_block():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="moderate")
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked
    assert "mental_health_support" in triage.modifiers


def test_load_context_crisis_block_reason():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant")
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_load_context_crisis_cleared_passes():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_cleared=True, goal="hypertrophy", bodyweight_kg=80, height_cm=175)
    ctx = load_context(profile)
    assert ctx.get("blocked") is False
    assert "mental_health_support" in ctx["triage"].modifiers


def test_load_context_bmi_low_block_reason():
    profile = ClientProfile(user_id="test", name="Test", bodyweight_kg=50, height_cm=170)
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "bmi_low"


def test_assign_pillars_high_stress():
    profile = ClientProfile(user_id="test", name="Test", goal="fat_loss", stress_level=8)
    triage = run_safety_triage(profile, ("green", []))
    pillars = assign_pillars(profile, triage)
    pillar_names = pillars.primary_pillars + pillars.secondary_pillars
    assert any("Fatigue" in p for p in pillar_names)


def test_load_context_blocked_on_red():
    profile = ClientProfile(user_id="test", name="Test")
    ctx = load_context(profile, {"ED1": "yes", "ED2": "yes", "ED3": "no", "ED4": "no"})
    assert ctx.get("blocked") is True
    assert ctx["triage"].triage == "red"


def test_load_context_bmi_under_18_5_blocks():
    profile = ClientProfile(user_id="test", name="Test", bodyweight_kg=50, height_cm=170)
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert "underweight" in ctx["triage"].caution_note.lower()


def test_load_context_bmi_exactly_18_5_passes():
    # Vault says "< 18.5" (strict), so exactly 18.5 must NOT block
    # 18.5 * (1.7^2) = 53.465; use slightly above to confirm strict <
    profile = ClientProfile(user_id="test", name="Test", bodyweight_kg=53.5, height_cm=170)
    ctx = load_context(profile)
    assert ctx.get("blocked") is False


def test_load_context_returns_pillars():
    profile = ClientProfile(user_id="test", name="Test", goal="fat_loss", bodyweight_kg=80,
                            height_cm=175, age=30, training_days=4)
    ctx = load_context(profile)
    assert ctx.get("blocked") is False
    assert ctx["triage"].triage == "green"
    assert ctx["pillars"] is not None
    assert ctx["pillars"].primary_pillars
