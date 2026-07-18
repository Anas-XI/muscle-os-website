"""Arbitration-layer tests — validates merge/gate + run_safety_triage → assign_pillars
against the /arbitrate contract.
"""

import os
import json
from mos_bot.config import SUPPLEMENTAL_DIR
from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import (
    evaluate_ed_screening, run_safety_triage, assign_pillars
)
from mos_bot.core.intake_builder import load_supplemental, save_supplemental
from mos_bot.web.routers.arbitrate import _check_required_fields, _merge_supplemental


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

COMPLETE_SUPPLEMENTAL = {
    "mental_health_concern": "none",
    "known_deficiencies": [],
    "deficiency_confirmed": True,
    "deficiency_status": "resolved",
    "injuries": [],
    "ED1": "",
    "ED2": "",
    "ED3": "",
    "ED4": "",
}


def _setup_supplemental(user_id: str, overrides: dict | None = None) -> dict:
    data = dict(COMPLETE_SUPPLEMENTAL)
    if overrides:
        data.update(overrides)
    save_supplemental(user_id, data)
    return data


def _cleanup_supplemental(user_id: str) -> None:
    path = os.path.join(SUPPLEMENTAL_DIR, f"{user_id}.json")
    if os.path.exists(path):
        os.remove(path)


def _arbitrate(profile: ClientProfile, ed_answers: dict,
               supplemental: dict | None = None) -> dict:
    """Simulates the /arbitrate route body including merge/gate."""
    if supplemental is not None:
        save_supplemental(profile.user_id, supplemental)
    else:
        _cleanup_supplemental(profile.user_id)

    loaded = load_supplemental(profile.user_id)
    missing = _check_required_fields(profile, loaded)
    if missing:
        return {
            "verdict": "block",
            "triage_tier": "red",
            "block_reason": "incomplete_profile",
            "ed_classification": "red",
            "modifiers": [],
            "caution_note": f"Missing: {', '.join(missing)}",
            "pillar_assignment": None,
        }

    suppl_ed = _merge_supplemental(profile, loaded or {})
    merged_ed = dict(suppl_ed)
    merged_ed.update(ed_answers or {})

    # Standalone ED-completeness check (mirrors handler logic)
    missing_ed = [k for k in ("ED1", "ED2", "ED3", "ED4") if k not in merged_ed]
    if missing_ed:
        return {
            "verdict": "block",
            "triage_tier": "red",
            "block_reason": "incomplete_profile",
            "ed_classification": "red",
            "modifiers": [],
            "caution_note": f"Missing ED answers: {', '.join(missing_ed)}",
            "pillar_assignment": None,
        }

    ed_result = evaluate_ed_screening(merged_ed)
    ed_classification, ed_items = ed_result
    triage = run_safety_triage(profile, ed_result)

    if triage.blocked:
        return {
            "verdict": "block",
            "triage_tier": triage.triage,
            "block_reason": triage.block_reason,
            "ed_classification": ed_classification,
            "modifiers": triage.modifiers,
            "caution_note": triage.caution_note,
            "pillar_assignment": None,
        }

    pillars = assign_pillars(profile, triage)
    return {
        "verdict": "proceed",
        "triage_tier": triage.triage,
        "block_reason": None,
        "ed_classification": ed_classification,
        "modifiers": triage.modifiers,
        "caution_note": triage.caution_note,
        "pillar_assignment": pillars,
    }


# ═══════════════════════════════════════════════════════════════
# Gate tests: incomplete profile blocking
# ═══════════════════════════════════════════════════════════════


def test_gate_no_supplemental_block():
    """No supplemental record at all → incomplete_profile block."""
    p = ClientProfile(user_id="gate_none", name="Test", age=30)
    result = _arbitrate(p, {}, supplemental=None)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "incomplete_profile"


def test_gate_partial_supplemental_block():
    """Supplemental missing mental_health_concern → incomplete_profile."""
    p = ClientProfile(user_id="gate_partial", name="Test", age=30)
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    del suppl["mental_health_concern"]
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "incomplete_profile"


def test_gate_medical_native_passes_without_supplemental():
    """Medical is elitefit-native — passes gate without supplemental record."""
    _cleanup_supplemental("gate_medical_native")
    p = ClientProfile(
        user_id="gate_medical_native", name="Test", age=30,
        medical=["asthma"],
        mental_health_concern="none",
    )
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    # No supplemental for medical alone, but full supplemental for other fields
    assert result["verdict"] != "block" or result["block_reason"] != "incomplete_profile"


# ═══════════════════════════════════════════════════════════════
# Block-path tests: one per block_reason value
# ═══════════════════════════════════════════════════════════════


def test_block_crisis():
    uid = "block_crisis"
    p = ClientProfile(
        user_id=uid, name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, age=30,
        mental_health_concern="significant",
        crisis_incident_id="inc_001",
    )
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "crisis"
    assert "Find a Helpline" in result["caution_note"]
    assert result["pillar_assignment"] is None


def test_block_ed_red():
    uid = "block_ed_red"
    p = ClientProfile(user_id=uid, name="Test", age=30)
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    result = _arbitrate(p, {"ED4": "yes"}, supplemental=suppl)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "ed_red"
    assert result["ed_classification"] == "red"
    assert result["pillar_assignment"] is None


def test_block_deficiency():
    uid = "block_deficiency"
    p = ClientProfile(
        user_id=uid, name="Test", age=30,
        known_deficiencies=["iron"],
    )
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "deficiency"
    assert result["pillar_assignment"] is None


def test_block_age_gate():
    uid = "block_age_gate"
    p = ClientProfile(user_id=uid, name="Test", age=15)
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "age_under_16"
    assert result["pillar_assignment"] is None


def test_block_bmi_low():
    uid = "block_bmi_low"
    p = ClientProfile(
        user_id=uid, name="Test", age=30,
        bodyweight_kg=50, height_cm=175,
    )
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "bmi_low"
    assert result["pillar_assignment"] is None


def test_block_mh_unrecognized():
    uid = "block_mh_unrecognized"
    p = ClientProfile(
        user_id=uid, name="Test", age=30,
        mental_health_concern="unknown_value",
    )
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "mental_health_unrecognized"
    assert result["pillar_assignment"] is None


# ═══════════════════════════════════════════════════════════════
# Proceed-path tests
# ═══════════════════════════════════════════════════════════════


def test_proceed_clean_profile():
    """Clean fat-loss profile → proceed with pillar assignment."""
    uid = "proceed_clean"
    p = ClientProfile(
        user_id=uid, name="Test", goal="fat_loss",
        bodyweight_kg=80, height_cm=175, age=30,
        sleep_hours=7, stress_level=5,
        mental_health_concern="none",
    )
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "proceed"
    assert result["triage_tier"] == "green"
    assert result["ed_classification"] == "green"
    assert result["block_reason"] is None
    pa = result["pillar_assignment"]
    assert pa is not None
    assert "P1 - Diet Maxing" in pa.primary_pillars


def test_proceed_green_no_modifiers():
    """Green-tier profile → empty modifiers."""
    uid = "proceed_green_mod"
    p = ClientProfile(
        user_id=uid, name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, age=30,
        sleep_hours=8, stress_level=3, gut_health="none",
        alcohol_weekly=0, work_schedule="",
        mental_health_concern="none",
    )
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "proceed"
    assert result["triage_tier"] == "green"
    assert result["modifiers"] == []


def test_proceed_yellow_with_modifiers():
    """ED1 alone (occasional binge) → yellow with gentle_entry + no_calorie_deficit."""
    uid = "proceed_yellow"
    p = ClientProfile(
        user_id=uid, name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, age=30,
    )
    result = _arbitrate(p, {"ED1": "yes"}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "proceed"
    assert result["triage_tier"] == "yellow"
    assert result["ed_classification"] == "yellow"
    assert "gentle_entry" in result["modifiers"]
    assert "no_calorie_deficit" in result["modifiers"]
    assert result["pillar_assignment"] is not None


def test_proceed_resolved_deficiency():
    """Confirmed+resolved deficiency → proceed (escape hatch works through arbitration)."""
    uid = "proceed_resolved_def"
    p = ClientProfile(
        user_id=uid, name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, age=30,
        known_deficiencies=["iron"],
        deficiency_confirmed=True,
        deficiency_status="resolved",
    )
    suppl = dict(COMPLETE_SUPPLEMENTAL)
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "proceed"
    assert result["triage_tier"] == "green"
    assert result["block_reason"] is None


def test_gate_missing_ed_answers_blocks():
    """Supplemental has core fields but no ED answers, and request has no
    ed_answers either → incomplete_profile block targeting missing ED keys.
    Verifies the standalone ED-completeness check catches what the main gate
    (REQUIRED_FOR_ARBITRATION) no longer covers."""
    p = ClientProfile(user_id="gate_ed_missing", name="Test", age=30)
    suppl = {
        "mental_health_concern": "none",
        "known_deficiencies": [],
        "injuries": [],
        # deliberately no ED1-ED4 keys
    }
    result = _arbitrate(p, {}, supplemental=suppl)
    assert result["verdict"] == "block"
    assert result["block_reason"] == "incomplete_profile"
    assert "ED1" in result["caution_note"] or "eating-disorder" in result["caution_note"].lower()


def test_block_deficiency_missing_conditional_fields():
    """Supplemental has known_deficiencies non-empty but missing
    deficiency_confirmed/deficiency_status keys → passes gate (no incomplete_profile)
    but blocks via run_safety_triage E3 path (Pydantic defaults: confirmed=False,
    status="" → neither confirmed+resolved → block)."""
    uid = "block_def_missing_conditional"
    p = ClientProfile(
        user_id=uid, name="Test", age=30,
        bodyweight_kg=80, height_cm=175,
    )
    suppl = {
        "mental_health_concern": "none",
        "known_deficiencies": ["iron"],  # non-empty
        "injuries": [],
        "medical": [],
        "ED1": "", "ED2": "", "ED3": "", "ED4": "",
        # deficiency_confirmed and deficiency_status INTENTIONALLY OMITTED
    }
    result = _arbitrate(p, {}, supplemental=suppl)
    # Gate passes — not incomplete_profile
    assert result["block_reason"] != "incomplete_profile"
    # But triage still blocks via E3 fail-safe
    assert result["verdict"] == "block"
    assert result["block_reason"] == "deficiency"


def test_proceed_moderate_mh_boundary():
    """Moderate mental health → proceed with mental_health_support modifier."""
    uid = "proceed_moderate_mh"
    p = ClientProfile(
        user_id=uid, name="Test", goal="hypertrophy",
        bodyweight_kg=80, height_cm=175, age=30,
        mental_health_concern="moderate",
    )
    result = _arbitrate(p, {}, supplemental=COMPLETE_SUPPLEMENTAL)
    assert result["verdict"] == "proceed"
    assert "mental_health_support" in result["modifiers"]
    assert result["caution_note"] == ""
