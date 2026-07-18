"""Tests for the coach-path arbitration gate.

Simulates what coach_start() does: load raw profile dict → ClientProfile.from_dict
→ extract ED answers → call arbitrate(). Verifies the gate works correctly at
session-start re-arbitration boundaries.
"""

from mos_bot.core.models import ClientProfile
from mos_bot.web.routers.arbitrate import arbitrate, ArbitrateResponse, ArbitrateRequest


def _coach_arbitrate(raw_profile: dict) -> ArbitrateResponse:
    """Simulates coach_start()'s arbitration call."""
    profile = ClientProfile.from_dict(raw_profile)
    ed_answers = {
        "ED1": raw_profile.get("ED1", "no"),
        "ED2": raw_profile.get("ED2", "no"),
        "ED3": raw_profile.get("ED3", "no"),
        "ED4": raw_profile.get("ED4", "no"),
    }
    return arbitrate(ArbitrateRequest(profile=profile, ed_answers=ed_answers))


def _complete_raw_profile(**overrides) -> dict:
    """A bot-intake-complete raw profile dict with all REQUIRED_FOR_ARBITRATION
    fields present (so from_dict → model_fields_set covers them all)."""
    base = {
        "user_id": "test_coach", "name": "Test", "goal": "hypertrophy",
        "bodyweight_kg": 80, "height_cm": 175, "age": 30,
        "injuries": [], "medical": [],
        "mental_health_concern": "none",
        "known_deficiencies": [],
        "ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no",
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════
# Crisis-tier block
# ═══════════════════════════════════════════════════════════════


def test_coach_crisis_blocks_and_pages():
    """Crisis-incident profile → block with crisis block_reason and resources
    in caution_note. Owner should be paged (tested by presence of hotline text)."""
    raw = _complete_raw_profile(mental_health_concern="significant", crisis_incident_id="inc_001")
    result = _coach_arbitrate(raw)
    assert result.verdict == "block"
    assert result.block_reason == "crisis"
    assert "Find a Helpline" in result.caution_note


# ═══════════════════════════════════════════════════════════════
# Silent block (non-crisis)
# ═══════════════════════════════════════════════════════════════


def test_coach_silent_block():
    """Profile with non-crisis block reason → block, caution_note present,
    but no crisis resources in it (no Find a Helpline)."""
    raw = _complete_raw_profile(age=15)
    result = _coach_arbitrate(raw)
    assert result.verdict == "block"
    assert result.block_reason == "age_under_16"
    assert "Find a Helpline" not in result.caution_note


# ═══════════════════════════════════════════════════════════════
# Proceed (clean profile)
# ═══════════════════════════════════════════════════════════════


def test_coach_proceed_clean():
    """Complete clean profile → proceed."""
    raw = _complete_raw_profile()
    result = _coach_arbitrate(raw)
    assert result.verdict == "proceed"
    assert result.block_reason is None


# ═══════════════════════════════════════════════════════════════
# ED-red block (gap being closed)
# ═══════════════════════════════════════════════════════════════


def test_coach_ed_red_blocks():
    """Profile with persisted ED-red answers → block via ed_red.
    This is the specific gap: ED answers are now persisted at intake
    and re-evaluated at coach session start."""
    raw = _complete_raw_profile(ED4="yes")
    result = _coach_arbitrate(raw)
    assert result.verdict == "block"
    assert result.block_reason == "ed_red"
    assert result.ed_classification == "red"


def test_coach_ed_yellow_proceeds():
    """Profile with ED-yellow (ED1 alone) → proceed with modifiers.
    ED-yellow doesn't block — it adds coaching modifiers instead."""
    raw = _complete_raw_profile(ED1="yes")
    result = _coach_arbitrate(raw)
    assert result.verdict == "proceed"
    assert "gentle_entry" in result.modifiers
    assert "no_calorie_deficit" in result.modifiers


def test_coach_ed_red_via_diagnosed():
    """ED3 (diagnosed) alone → red block."""
    raw = _complete_raw_profile(ED3="yes")
    result = _coach_arbitrate(raw)
    assert result.verdict == "block"
    assert result.block_reason == "ed_red"


def test_coach_no_ed_answers_default_green():
    """Pre-intake-upgrade profile without ED1-ED4 fields → defaults to no,
    which evaluates as green. Verifies backward compat for existing profiles."""
    raw = _complete_raw_profile()
    for k in ("ED1", "ED2", "ED3", "ED4"):
        del raw[k]
    result = _coach_arbitrate(raw)
    assert result.verdict == "proceed"
    assert result.ed_classification == "green"
