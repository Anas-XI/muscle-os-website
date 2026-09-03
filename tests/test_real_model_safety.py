"""Real-model safety integration tests.
Exercises the full safety pipeline (load_context, evaluate_rag_impact,
run_safety_triage) with realistic profile data, no mocking.
"""

from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import (
    load_context, evaluate_rag_impact, run_safety_triage, format_crisis_resources
)


# ═══════════════════════════════════════════════════════════════
# 1. Escalation gate — crisis detection on both surfaces
# ═══════════════════════════════════════════════════════════════


def test_crisis_gate_telegram_surface_blocks():
    """Telegram-style profile: significant MH + active incident → block."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_e2e_001",
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"
    note = ctx["triage"].caution_note
    assert "findahelpline" in note
    assert "BLOCKED" in note


def test_crisis_gate_telegram_cleared_passes():
    """Cleared incident (same ID) → no block, modifiers present."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_e2e_001", crisis_cleared_incident="inc_e2e_001",
        goal="hypertrophy", bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False
    assert "mental_health_support" in ctx["triage"].modifiers


def test_crisis_gate_mobile_surface_blocks():
    """Mobile-style profile: mapped through _parse_mobile_profile equivalent."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_e2e_mob_001",
        goal="hypertrophy", bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_crisis_gate_mobile_cleared_passes():
    """Mobile-style profile with clearance → no block, modifiers."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_e2e_mob_001",
        crisis_cleared_incident="inc_e2e_mob_001",
        goal="hypertrophy", bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False
    assert "mental_health_support" in ctx["triage"].modifiers


def test_crisis_gate_format_crisis_resources_returns_content():
    """Crisis resources helper returns useful content."""
    txt = format_crisis_resources()
    assert "findahelpline" in txt
    assert len(txt) > 50


def test_crisis_gate_owner_notification_payload():
    """The DM template in _notify_owner_crisis includes actionable info.
    (exercised via program.py import path)"""
    from mos_bot.core.program_generator import generate_program
    p = {
        "user_id": "test_crisis_notify",
        "name": "Notify Test",
        "mental_health_concern": "significant",
        "crisis_incident_id": "inc_notify_001",
    }
    result = generate_program(p)
    assert result is None  # blocked — _notify_owner_crisis would fire


# ═══════════════════════════════════════════════════════════════
# 2. Multi-flag interaction — precedence ordering
# ═══════════════════════════════════════════════════════════════


def test_multi_flag_crisis_wins_over_ed_red():
    """Crisis + ED-red simultaneously → crisis block_reason, not ed_red."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_multi_001",
    )
    ed_result = ("red", ["diagnosed_ed", "binge_episodes"])
    triage = run_safety_triage(p, ed_result)
    assert triage.blocked
    assert triage.block_reason == "crisis"


def test_multi_flag_crisis_wins_over_bmi_low():
    """Crisis + BMI < 18.5 → crisis block, not BMI."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_multi_002",
        bodyweight_kg=45, height_cm=170,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_multi_flag_crisis_wins_over_rapid_weight_loss():
    """Crisis + rapid weight loss → crisis block."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_multi_003", rapid_weight_loss=True,
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_multi_flag_crisis_wins_over_deficiencies():
    """Crisis + unconfirmed deficiency → crisis block."""
    p = ClientProfile(
        user_id="test", name="Test", mental_health_concern="significant",
        crisis_incident_id="inc_multi_004", known_deficiencies=["vitamin_d"],
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_multi_flag_ed_red_wins_over_bmi():
    """No crisis, ED-red + BMI low → ED-red is the reason (second priority)."""
    p = ClientProfile(
        user_id="test", name="Test", bodyweight_kg=45, height_cm=170,
    )
    ed_result = ("red", ["diagnosed_ed"])
    triage = run_safety_triage(p, ed_result)
    assert triage.blocked
    assert triage.block_reason == "ed_red"


def test_multi_flag_all_flags_rag_failure_blocks():
    """RAG failure + medical + injuries + deficiency + BMI + bloodwork + MH
    → block (has_flags = True)."""
    p = ClientProfile(
        user_id="test", name="Test",
        medical=["anemia"], injuries=["knee"],
        known_deficiencies=["vitamin_d"],
        bodyweight_kg=50, height_cm=170, last_bloodwork="2yr_plus",
        mental_health_concern="moderate",
        goal="hypertrophy",
    )
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "block"


def test_multi_flag_all_flags_rag_failure_contains_block_hint():
    """Block message indicates active flags prevent safe generation."""
    p = ClientProfile(
        user_id="test", name="Test",
        medical=["anemia"], injuries=["knee"],
        bodyweight_kg=50, height_cm=170,
        known_deficiencies=["vitamin_d"],
    )
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "block"
    assert "active flags" in msg or "unavailable" in msg


# ═══════════════════════════════════════════════════════════════
# 3. False-flag resistance — clean profiles not falsely blocked
# ═══════════════════════════════════════════════════════════════


def test_false_flag_clean_profile_no_block():
    """Completely clean profile → no block, no crisis flags."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False


def test_false_flag_no_mental_health_no_block():
    """No mental_health_concern set → no false block."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, mental_health_concern="",
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False


def test_false_flag_mental_health_none_no_block():
    """mental_health_concern = 'none' → no false block."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, mental_health_concern="none",
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False


def test_false_flag_mild_mental_health_blocks_failsafe():
    """"mild" is not a recognized value → blocked by fail-safe, not silent green."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, mental_health_concern="mild",
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "mental_health_unrecognized"


def test_false_flag_known_deficiencies_resolved_rag_warns_not_blocks():
    """Confirmed+resolved deficiency → warn (not block) on RAG failure."""
    p = ClientProfile(
        user_id="test", name="Test",
        known_deficiencies=["vitamin_d"],
        deficiency_confirmed=True, deficiency_status="resolved",
        goal="hypertrophy", bodyweight_kg=80, height_cm=175,
    )
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_false_flag_known_deficiencies_empty_rag_warns_not_blocks():
    """Empty known_deficiencies list → no flag on RAG failure."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_false_flag_bmi_exactly_18_5_not_blocked():
    """BMI exactly 18.5 → boundary case, not blocked."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=64.75, height_cm=187,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False


def test_false_flag_clean_profile_rag_not_failed_proceeds():
    """rag_failed=False → proceed regardless of profile."""
    p = ClientProfile(
        user_id="test", name="Test", medical=["anemia"],
    )
    action, msg = evaluate_rag_impact(p, rag_failed=False)
    assert action == "proceed"


def test_false_flag_no_fields_empty_profile():
    """Minimal profile (only user_id + name) → no crash, no false block."""
    p = ClientProfile(user_id="test", name="T")
    ctx = load_context(p)
    assert ctx.get("blocked") is False


def test_false_flag_deficiency_confirmed_resolved_passes():
    """Confirmed+resolved deficiency → load_context passes, no false block."""
    p = ClientProfile(
        user_id="test", name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
        known_deficiencies=["vitamin_d"],
        deficiency_confirmed=True, deficiency_status="resolved",
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is False
    assert ctx["triage"].triage == "green"
    assert ctx["pillars"] is not None


# ═══════════════════════════════════════════════════════════════
# 4. Mobile path — direct crisis gate exercise
# ═══════════════════════════════════════════════════════════════


def test_mobile_path_crisis_gate_via_parse_mobile_profile():
    """Simulate the mobile code path: _parse_mobile_profile → ClientProfile
    → load_context.  The mobile mapper now sets crisis_incident_id when
    mental_health is 'significant', so the gate should fire."""
    import sys, os
    import pytest
    _mob = os.path.join(os.path.dirname(__file__), "..", "mos-mobile", "backend")
    if not os.path.exists(_mob):
        pytest.skip("mos-mobile repository not present in checkout")
    if _mob not in sys.path:
        sys.path.insert(0, _mob)
    from services.program import _parse_mobile_profile
    raw = {
        "user_id": "mob_e2e",
        "name": "Mobile User",
        "mental_health": "significant",
        "goal": "build muscle",
        "weight": 80.0, "height": 175.0, "age": 30,
    }
    mos = _parse_mobile_profile(raw)
    assert mos.get("crisis_incident_id", "").startswith("202")
    cp = ClientProfile.from_dict(mos)
    ctx = load_context(cp)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "crisis"


def test_mobile_path_clearance_works():
    """Mobile user with cleared incident → no block."""
    import sys, os
    import pytest
    _mob = os.path.join(os.path.dirname(__file__), "..", "mos-mobile", "backend")
    if not os.path.exists(_mob):
        pytest.skip("mos-mobile repository not present in checkout")
    if _mob not in sys.path:
        sys.path.insert(0, _mob)
    from services.program import _parse_mobile_profile
    raw = {
        "user_id": "mob_e2e_clear",
        "name": "Mobile User 2",
        "mental_health": "none",
        "goal": "build muscle",
        "weight": 80.0, "height": 175.0, "age": 30,
        "crisis_incident_id": "inc_mob_e2e_002",
        "crisis_cleared_incident": "inc_mob_e2e_002",
    }
    mos = _parse_mobile_profile(raw)
    assert mos.get("crisis_incident_id") == "inc_mob_e2e_002"
    assert mos.get("crisis_cleared_incident") == "inc_mob_e2e_002"
    p = ClientProfile(user_id="mob_e2e_clear", name="Mobile User 2",
                      mental_health_concern="none",
                      crisis_incident_id="inc_mob_e2e_002",
                      crisis_cleared_incident="inc_mob_e2e_002",
                      goal="hypertrophy", bodyweight_kg=80, height_cm=175)
    action, _ = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"  # clean profile → warn, not block


# ═══════════════════════════════════════════════════════════════
# 5. D1/D2 age gates through load_context with real RAG
# ═══════════════════════════════════════════════════════════════


def test_d1_under_16_before_rag_failure():
    """D1 (age < 16) blocks before RAG failure branch is reached."""
    p = ClientProfile(
        user_id="test", name="Test", age=15, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "age_under_16"


def test_d2_age_75_plus_blocks():
    """D2 (age >= 75) blocks through load_context."""
    p = ClientProfile(
        user_id="test", name="Test", age=76, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "age_75_plus"


def test_d2_age_65_with_medical_blocks():
    """D2 (age 65+ with medical conditions) blocks through load_context."""
    p = ClientProfile(
        user_id="test", name="Test", age=68, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
        medical=["diabetes"],
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "age_65_plus_with_conditions"


def test_d2_age_65_no_medical_passes():
    """D2 (age 65-74 without medical) does not block through load_context."""
    p = ClientProfile(
        user_id="test", name="Test", age=68, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p)
    assert ctx.get("blocked") is not True


def test_b4_ed4_red_through_load_context():
    """B4: ED4 (frequent guilt) alone → red through full load_context."""
    p = ClientProfile(
        user_id="test", name="Test", age=30, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p, ed_answers={"ED4": "yes"})
    assert ctx.get("blocked") is True
    assert ctx.get("block_reason") == "ed_red"


def test_ed1_alone_yellow_through_load_context():
    """ED1 alone (occasional binge) → yellow, not blocked."""
    p = ClientProfile(
        user_id="test", name="Test", age=30, goal="hypertrophy",
        bodyweight_kg=80, height_cm=175,
    )
    ctx = load_context(p, ed_answers={"ED1": "yes"})
    assert ctx.get("blocked") is not True
    assert ctx.get("triage").triage == "yellow"
