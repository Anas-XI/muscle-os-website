"""Test /upload_profile command — JSON parsing, field mapping, profile build."""
import sys, os, json, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_os"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Muscle Operating System", "00_META", "scripts"))

from mos_os.handlers.upload_profile import map_form_json
from mos_os.core.intake_builder import build_profile


def make_form_json(overrides=None):
    base = {
        "name": "Test User",
        "height": "175",
        "archetype": "Intermediate Plateaued",
        "scores": {"total": 50},
        "answers": {
            "Q45": "Test User",
            "Q7": "25_39",
            "Q8": "male",
            "Q49": "175",
            "Q46": "80",
            "Q6": "gain_muscle",
            "Q1": "4_8",
            "Q2": "4_5",
            "Q51": "PPL",
            "Q18": "45_60",
            "Q20": "no",
            "Q29": "good",
            "Q13": "7_8",
            "Q15": "4_5",
            "Q26": "10k_plus",
            "Q56": "200mg",
            "Q55": ["creatine"],
            "Q47": "",
            "Q58": "never",
            "Q59": "never",
            "Q60": "rarely",
            "Q61": "no",
        },
    }
    if overrides:
        for k, v in overrides.items():
            if k.startswith("Q"):
                base["answers"][k] = v
            else:
                base[k] = v
    return base


def test_full_form_mapping():
    form = make_form_json()
    raw = map_form_json(form, "test_upload_001")
    profile = build_profile(raw)

    assert raw["name"] == "Test User"
    assert raw["goal"] == "Build muscle"
    assert raw["bodyweight_kg"] == "80"
    assert raw["height_cm"] == "175"
    assert raw["age"] == "30"
    assert raw["sex"] == "male"
    assert raw["experience"] == "3+ years"
    assert raw["training_days"] == "3-4 days"
    assert raw["session_length"] == "45-75 min"
    assert raw["current_split"] == "PPL"
    assert raw["injuries"] == []
    assert raw["gut_health"] == "none"
    assert raw["sleep"] == "7-8h"
    assert raw["stress"] == "Moderate (4-6)"
    assert raw["steps"] == "10,000+"
    assert raw["caffeine"] == "2-3 coffees (~200-300mg)"
    assert raw["supplements"] == ["creatine"]
    assert raw["medical"] == []
    assert raw["ed_risk"] is False
    assert raw["triage_result"] == "green"

    assert profile["goal"] == "hypertrophy"
    assert profile["bodyweight_kg"] == 80.0
    assert profile["age"] == 30


def test_ed_risk_detected():
    form = make_form_json({"Q58": "often"})
    raw = map_form_json(form, "test_ed_risk")
    assert raw["ed_risk"] is True
    assert raw["triage_result"] == "red"


def test_injuries_mapped():
    form = make_form_json({"Q20": "minor", "Q57": "knee pain"})
    raw = map_form_json(form, "test_injuries")
    assert "knee pain" in raw["injuries"][0]


def test_goal_lose_fat():
    form = make_form_json({"Q6": "lose_moderate"})
    raw = map_form_json(form, "test_goal")
    assert raw["goal"] == "Lose fat"


def test_goal_maintain():
    form = make_form_json({"Q6": "maintain"})
    raw = map_form_json(form, "test_goal")
    assert raw["goal"] == "Recomposition"


def test_age_mapping():
    form = make_form_json({"Q7": "55_plus"})
    raw = map_form_json(form, "test_age")
    assert raw["age"] == "60"


def test_caffeine_none():
    form = make_form_json({"Q56": "none"})
    raw = map_form_json(form, "test_caff")
    assert raw["caffeine"] == "None"
    profile = build_profile(raw)
    assert profile["caffeine_mg"] == 0  # mapped by build_profile


def test_sleep_under_5():
    form = make_form_json({"Q13": "under_5"})
    raw = map_form_json(form, "test_sleep")
    assert raw["sleep"] == "Under 6h"


def test_empty_form():
    form = make_form_json({
        "Q46": "", "Q49": "", "Q7": "", "Q6": "",
        "Q1": "", "Q2": "", "Q51": "",
    })
    raw = map_form_json(form, "test_empty")
    assert raw["goal"] == "Recomposition"
    assert raw["experience"] == "1-3 years"
    assert raw["training_days"] == "3-4 days"


def test_map_includes_user_id():
    form = make_form_json()
    raw = map_form_json(form, "user_42")
    assert raw["user_id"] == "user_42"


def test_inbody_scan_mapped():
    form = make_form_json()
    form["inbodyScan"] = {
        "hasScan": True,
        "scanDate": "2026-06-01",
        "device": "InBody 770",
        "metrics": {
            "weight_kg": 80.0,
            "smm_kg": 38.5,
            "bfm_kg": 12.0,
            "bf_pct": 15.0,
            "bmi": 24.5,
            "bmr_kcal": 1850,
            "visceral_fat": 8,
            "tbw_L": 45.0,
            "icw_L": 27.0,
            "ecw_L": 18.0,
            "ecw_tbw_ratio": 0.4,
            "seg_rArm_kg": 4.2,
            "seg_lArm_kg": 4.0,
            "seg_trunk_kg": 28.0,
            "seg_rLeg_kg": 10.5,
            "seg_lLeg_kg": 10.2,
        },
        "computed": {"lbm_kg": 68.0, "ffmi": 21.2},
        "flags": [],
    }
    raw = map_form_json(form, "test_inbody")
    ib = raw["inbody"]
    assert ib is not None
    assert ib["has_scan"] is True
    assert ib["scan_date"] == "2026-06-01"
    assert ib["device"] == "InBody 770"
    assert ib["smm_kg"] == 38.5
    assert ib["bf_pct"] == 15.0
    assert ib["visceral_fat"] == 8
    assert ib["ecw_tbw_ratio"] == 0.4
    assert ib["seg_lArm_kg"] == 4.0
    assert ib["lbm_kg"] == 68.0
    assert ib["ffmi"] == 21.2

    profile = build_profile(raw)
    assert profile["inbody"]["has_scan"] is True
    assert profile["inbody"]["smm_kg"] == 38.5


def test_inbody_scan_absent():
    form = make_form_json()
    raw = map_form_json(form, "test_no_inbody")
    assert raw["inbody"] is None


def test_new_fields_mapped():
    form = make_form_json({
        "Q62": "7",
        "Q63": "several_week",
        "Q64": "once",
        "Q65": "Creatine 5g daily",
        "Q66": "2.5",
        "Q67": "dark_yellow",
        "Q68": "sometimes",
        "Q69": "3_7",
        "Q70": "sometimes_3h",
        "Q71": "night",
        "Q72": "4",
        "Q73": ["ankle", "lower_back"],
        "Q74": "some_exercises",
        "Q75": "2yr_plus",
        "Q76": ["vitamin_d", "iron"],
        "Q77": ["heart_disease", "diabetes"],
        "Q78": "moderate",
        "Q79": "yes_seeing",
    })
    raw = map_form_json(form, "test_new_fields")
    assert raw["bowel_frequency_weekly"] == 7
    assert raw["fermented_foods"] == "several_week"
    assert raw["antibiotic_recent"] is True
    assert raw["supplement_regimen"] == "Creatine 5g daily"
    assert raw["daily_water_liters"] == 2.5
    assert raw["urine_color"] == "dark_yellow"
    assert raw["muscle_cramps"] is True
    assert raw["alcohol_weekly"] == "3_7"
    assert raw["alcohol_near_bed"] is True
    assert raw["work_schedule"] == "night"
    assert raw["reliable_hours_weekly"] == 4
    assert raw["mobility_limitations"] == ["ankle", "lower_back"]
    assert raw["joint_pain"] == "some_exercises"
    assert raw["last_bloodwork"] == "2yr_plus"
    assert raw["known_deficiencies"] == ["vitamin_d", "iron"]
    assert raw["family_history"] == ["heart_disease", "diabetes"]
    assert raw["mental_health_concern"] == "moderate"
    assert raw["mental_health_care"] == "yes_seeing"


def test_new_fields_defaults():
    form = make_form_json()
    raw = map_form_json(form, "test_defaults")
    assert raw["bowel_frequency_weekly"] == 0
    assert raw["fermented_foods"] == ""
    assert raw["antibiotic_recent"] is False
    assert raw["daily_water_liters"] == 0
    assert raw["urine_color"] == ""
    assert raw["muscle_cramps"] is False
    assert raw["alcohol_weekly"] == "0"
    assert raw["alcohol_near_bed"] is False
    assert raw["work_schedule"] == ""
    assert raw["reliable_hours_weekly"] == 0
    assert raw["mobility_limitations"] == []
    assert raw["joint_pain"] == ""
    assert raw["last_bloodwork"] == ""
    assert raw["known_deficiencies"] == []
    assert raw["family_history"] == []
    assert raw["mental_health_concern"] == ""
    assert raw["mental_health_care"] == ""


def test_new_fields_profile():
    form = make_form_json({
        "Q62": "10",
        "Q63": "daily",
        "Q66": "3",
        "Q67": "straw",
        "Q69": "0",
        "Q71": "day_fixed",
        "Q74": "no_pain",
        "Q75": "under_6mo",
        "Q78": "no",
    })
    raw = map_form_json(form, "test_profile_new")
    profile = build_profile(raw)
    assert profile["bowel_frequency_weekly"] == 10
    assert profile["fermented_foods"] == "daily"
    assert profile["daily_water_liters"] == 3
    assert profile["urine_color"] == "straw"
    assert profile["alcohol_weekly"] == 0
    assert profile["work_schedule"] == "day_fixed"
    assert profile["last_bloodwork"] == "under_6mo"
    assert profile["joint_pain"] == "no_pain"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
