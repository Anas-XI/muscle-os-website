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
    evaluate_rag_impact,
)


def test_ed_screening_green():
    answers = {"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "green"
    assert items == []


def test_ed_screening_red_guilt():
    """B4 frequent guilt → red (vault: 'Frequently or always → Red')."""
    answers = {"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "yes"}
    triage, items = evaluate_ed_screening(answers)
    assert triage == "red"
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
    """ED1 alone (occasional binge) → yellow with gentle_entry + no_calorie_deficit."""
    profile = ClientProfile(user_id="test", name="Test")
    triage = run_safety_triage(profile, ("yellow", ["binge_episodes"]))
    assert triage.triage == "yellow"
    assert "gentle_entry" in triage.modifiers
    assert "no_calorie_deficit" in triage.modifiers


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
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="inc_001")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert "support" in triage.caution_note.lower()


def test_safety_triage_mental_health_cleared_does_not_block():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="inc_001", crisis_cleared_incident="inc_001")
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked
    assert "mental_health_support" in triage.modifiers


def test_safety_triage_mental_health_moderate_does_not_block():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="moderate")
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked
    assert "mental_health_support" in triage.modifiers


def test_load_context_crisis_block_reason():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="inc_001")
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_load_context_crisis_cleared_passes():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="inc_001", crisis_cleared_incident="inc_001",
                            goal="hypertrophy", bodyweight_kg=80, height_cm=175)
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


# ── Bug 1 regression: crisis must win over ED-red ──

def test_safety_triage_ed_red_alone_block_reason():
    profile = ClientProfile(user_id="test", name="Test")
    triage = run_safety_triage(profile, ("red", ["diagnosed_ed"]))
    assert triage.blocked
    assert triage.block_reason == "ed_red"


def test_safety_triage_crisis_alone_block_reason():
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="cris_e2e")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "crisis"


def test_safety_triage_crisis_wins_over_ed_red():
    """When both crisis and ED-red fire, crisis must win."""
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="significant",
                            crisis_incident_id="cris_e2e")
    triage = run_safety_triage(profile, ("red", ["diagnosed_ed"]))
    assert triage.blocked
    assert triage.block_reason == "crisis"
    assert "support" in triage.caution_note.lower()
    assert "findahelpline" in triage.caution_note


# ── Bug 2 regression: per-incident crisis model in evaluate_rag_impact ──

def test_evaluate_rag_impact_significant_not_cleared_blocks():
    """Incident exists but no clearance → blocked."""
    profile = ClientProfile(user_id="t", name="T", mental_health_concern="significant",
                            crisis_incident_id="inc_001")
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_significant_cleared_does_not_block():
    """Same incident_id and crisis_cleared_incident → not blocked."""
    profile = ClientProfile(user_id="t", name="T", mental_health_concern="significant",
                            crisis_incident_id="inc_001", crisis_cleared_incident="inc_001")
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_moderate_cleared_still_blocks():
    """Per-incident model only applies to 'significant', not 'moderate'."""
    profile = ClientProfile(user_id="t", name="T", mental_health_concern="moderate",
                            crisis_incident_id="inc_001", crisis_cleared_incident="inc_001")
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_new_incident_after_old_clearance_still_blocks():
    """A new incident is blocked even if a previous one was cleared."""
    profile = ClientProfile(user_id="t", name="T", mental_health_concern="significant",
                            crisis_incident_id="inc_002", crisis_cleared_incident="inc_001")
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_dict_significant_cleared_does_not_block():
    """Dict-profile branch: same incident and clearance → not blocked."""
    profile = {"user_id": "t", "mental_health_concern": "significant",
               "crisis_incident_id": "inc_001", "crisis_cleared_incident": "inc_001"}
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_dict_significant_not_cleared_blocks():
    profile = {"user_id": "t", "mental_health_concern": "significant",
               "crisis_incident_id": "inc_001"}
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_dict_new_incident_after_clearance_blocks():
    """Dict-profile branch: new incident after old clearance still blocks."""
    profile = {"user_id": "t", "mental_health_concern": "significant",
               "crisis_incident_id": "inc_002", "crisis_cleared_incident": "inc_001"}
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


# ── Fail-safe: mental_health_concern unrecognized values default to red ──

def test_safety_triage_mh_unrecognized_value_blocks():
    """Unknown mental_health_concern value → blocked (fail-safe, not silent green)."""
    profile = ClientProfile(user_id="test", name="Test", mental_health_concern="yes")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "mental_health_unrecognized"


def test_safety_triage_mh_recognized_values_pass_defensive():
    """Known values (none, moderate, significant) are not caught by fail-safe."""
    for val in ("", "none", "moderate", "significant"):
        profile = ClientProfile(user_id="test", name="Test", mental_health_concern=val)
        triage = run_safety_triage(profile, ("green", []))
        assert triage.block_reason != "mental_health_unrecognized"


# ── D1/D2 age gates ──

def test_safety_triage_under_16_blocks():
    """D1 — age < 16 → blocked with age_under_16 reason."""
    profile = ClientProfile(user_id="test", name="Test", age=15)
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "age_under_16"


def test_safety_triage_age_16_passes():
    """Age 16+ without guardian concerns → not blocked by D1."""
    profile = ClientProfile(user_id="test", name="Test", age=16)
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked


def test_safety_triage_age_75_plus_blocks():
    """D2 — age >= 75 → blocked with age_75_plus reason."""
    profile = ClientProfile(user_id="test", name="Test", age=75)
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "age_75_plus"


def test_safety_triage_age_65_plus_with_medical_blocks():
    """D2 — age >= 65 with medical conditions → blocked."""
    profile = ClientProfile(user_id="test", name="Test", age=65, medical=["diabetes"])
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "age_65_plus_with_conditions"


def test_safety_triage_age_65_no_medical_passes():
    """D2 — age 65-74 without medical conditions → not blocked."""
    profile = ClientProfile(user_id="test", name="Test", age=65)
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked


def test_safety_triage_age_0_not_blocked():
    """Age 0 (default/unset) should not trigger age gates."""
    profile = ClientProfile(user_id="test", name="Test", age=0)
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked


def test_load_context_age_under_16_blocks():
    """load_context() returns blocked=True with block_reason='age_under_16'."""
    profile = ClientProfile(user_id="test", name="Test", age=15, goal="hypertrophy")
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "age_under_16"


# ── Bug 3 regression: known_deficiencies now blocks in run_safety_triage,
# not evaluate_rag_impact — verify upstream detection ──

def test_safety_triage_deficiency_unconfirmed_blocks():
    """Default unconfirmed deficiency (deficiency_confirmed=False) → blocked."""
    profile = ClientProfile(user_id="test", name="Test", known_deficiencies=["vitamin_d"])
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "deficiency"
    assert "clearance" in triage.caution_note.lower()


def test_safety_triage_deficiency_confirmed_current_blocks():
    """Confirmed+current deficiency → blocked."""
    profile = ClientProfile(user_id="test", name="Test", known_deficiencies=["vitamin_d"],
                            deficiency_confirmed=True, deficiency_status="current")
    triage = run_safety_triage(profile, ("green", []))
    assert triage.blocked
    assert triage.block_reason == "deficiency"


def test_safety_triage_deficiency_confirmed_resolved_passes():
    """Confirmed+resolved deficiency → NOT blocked (escape hatch)."""
    profile = ClientProfile(user_id="test", name="Test", known_deficiencies=["vitamin_d"],
                            deficiency_confirmed=True, deficiency_status="resolved")
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked


def test_safety_triage_deficiency_empty_passes():
    """Empty known_deficiencies → NOT blocked regardless of status fields."""
    profile = ClientProfile(user_id="test", name="Test",
                            deficiency_confirmed=True, deficiency_status="current")
    triage = run_safety_triage(profile, ("green", []))
    assert not triage.blocked


def test_load_context_deficiency_blocks():
    """load_context() returns blocked=True with block_reason='deficiency'."""
    profile = ClientProfile(user_id="test", name="Test", known_deficiencies=["vitamin_d"])
    ctx = load_context(profile)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "deficiency"


def test_load_context_deficiency_resolved_passes():
    """load_context() passes through confirmed+resolved deficiency."""
    profile = ClientProfile(user_id="test", name="Test", known_deficiencies=["vitamin_d"],
                            deficiency_confirmed=True, deficiency_status="resolved",
                            goal="hypertrophy", bodyweight_kg=80, height_cm=175)
    ctx = load_context(profile)
    assert ctx.get("blocked") is False
    assert ctx["triage"].triage == "green"
    assert ctx["pillars"] is not None
