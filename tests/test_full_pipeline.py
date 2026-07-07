"""Full pipeline test — simulates exact form JSON output through the entire bot pipeline."""
import sys, os, json, tempfile, pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))
sys.path.insert(0, os.path.dirname(__file__))

from unittest.mock import patch, AsyncMock, MagicMock

from skip_helpers import skip_if_no_vault
from mos_bot.handlers.upload_profile import (
    map_form_json, _process_json_file,
    _download_json, handle_json_upload,
    upload_profile, MAX_JSON_BYTES,
)
from mos_bot.core.intake_builder import build_profile, save_profile, load_profile
from mos_bot.core.vault_context import get_vault_context
from mos_bot.core.program_generator import generate_program
from mos_bot.core.pdf_renderer import generate_program_pdf
from mos_bot.config import USERS_DIR


# ── Realistic form JSON output (matches what saveJSON() produces) ──

FULL_FORM_JSON = {
    "generatedAt": "2026-06-29T12:00:00.000Z",
    "form": "Muscle OS Client Intake v5.0",
    "name": "Jane Doe",
    "height": "168",
    "archetype": "Intermediate Plateaued",
    "scores": {
        "trainingHistory": 10,
        "nutrition": 16,
        "recovery": 14,
        "adherence": 3,
        "cardio": 3,
        "total": 46,
    },
    "flags": [
        "Adherence gap",
        "Sleep <6h flagged",
        "High stress flagged",
    ],
    "constraintProfile": {
        "timeConstraint": "none",
        "equipment": "commercial",
        "injury": "none",
        "injuryLocation": "none",
        "injuryDescription": "",
        "lifestyleConstraint": "moderate",
        "adherenceFlag": "gap",
        "multipleDietHistory": False,
        "workType": "sedentary",
        "travelFreq": "monthly_or_less",
        "edConcern": False,
    },
    "pillarPriorities": [
        "Recovery maxing — recovery is your binding constraint",
        "Simplify before optimizing — adherence is the foundation",
    ],
    "trainingSplit": "Upper/Lower",
    "mainLifts": "Squat 80kg, Bench 50kg, Deadlift 90kg",
    "targetWeight": "65",
    "cardioProfile": {"sessionsPerWeek": "3", "primaryType": "walking", "dailySteps": "unknown"},
    "sleepProfile": {"chronotype": "intermediate", "caffeineAmount": "200mg", "caffeineTiming": "morning_only"},
    "psychProfile": {"motivationSource": "results", "selfExperimentation": "neutral", "accountabilityPref": "self"},
    "nutritionDetail": {
        "fiberServings": "3_4",
        "supplements": ["creatine", "protein"],
        "digestiveHealth": "mild_bloating",
        "eatingWindow": "normal",
        "calorieEstimate": "dont_track",
    },
    "femaleHealth": {"trackCycle": "yes", "contraception": "none", "pregnancyStatus": "not_applicable"},
    "inbodyScan": {
        "hasScan": True,
        "fileName": "inbody_report.pdf",
        "fileBase64": "/9j/4AAQSkZJRg==",  # truncated — just a stub
        "scanDate": "2026-06-15",
        "device": "InBody 770",
        "metrics": {
            "weight_kg": 72.0,
            "smm_kg": 32.5,
            "bfm_kg": 18.0,
            "bf_pct": 25.0,
            "bmi": 25.5,
            "bmr_kcal": 1550,
            "visceral_fat": 9,
            "tbw_L": 38.0,
            "icw_L": 22.0,
            "ecw_L": 16.0,
            "ecw_tbw_ratio": 0.421,
            "seg_rArm_kg": 3.5,
            "seg_lArm_kg": 3.4,
            "seg_trunk_kg": 25.0,
            "seg_rLeg_kg": 9.0,
            "seg_lLeg_kg": 8.8,
        },
        "computed": {"lbm_kg": 54.0, "ffmi": 19.1},
        "flags": ["High ECW/TBW ratio — refer to medical before aggressive deficit"],
    },
    "answers": {
        "Q45": "Jane Doe",
        "Q7": "25_39",
        "Q8": "female",
        "Q49": "168",
        "Q46": "72",
        "Q6": "lose_moderate",
        "Q50": "65",
        "Q5": "over_25",
        "Q12": "no",
        "Q1": "4_8",
        "Q2": "3",
        "Q3": "all_6",
        "Q51": "upper_lower",
        "Q52": "Squat 80kg, Bench 50kg, Deadlift 90kg",
        "Q24": "3_4",
        "Q25": "walking",
        "Q26": "unknown",
        "Q53": "dont_track",
        "Q9": "1_6_2_0",
        "Q10": "2",
        "Q11": "no",
        "Q27": "2_3",
        "Q54": "normal",
        "Q55": ["creatine", "protein"],
        "Q29": "mild_bloating",
        "Q13": "5_6",
        "Q14": "6_7",
        "Q30": "intermediate",
        "Q56": "200mg",
        "Q31": "morning_only",
        "Q15": "8_10",
        "Q16": "3",
        "Q17": "3_4",
        "Q18": "45_60",
        "Q19": "commercial",
        "Q20": "no",
        "Q32": "",
        "Q57": "",
        "Q33": "sedentary",
        "Q21": "moderate",
        "Q34": "monthly_or_less",
        "Q22": "60_80",
        "Q23": "reschedule",
        "Q35": "results",
        "Q37": "self",
        "Q36": "neutral",
        "Q47": "",
        "Q48": "",
        "Q58": "rarely",
        "Q59": "never",
        "Q60": "rarely",
        "Q61": "no",
        "Q38": "yes_track",
        "Q39": "none",
        "Q40": "na",
    },
}


def test_full_form_to_profile():
    """Simulate the exact form JSON output → map → build_profile."""
    form = FULL_FORM_JSON
    raw = map_form_json(form, "pipeline_test_user_01")

    # Verify core fields
    assert raw["name"] == "Jane Doe"
    assert raw["goal"] == "Lose fat"
    assert raw["bodyweight_kg"] == "72"
    assert raw["height_cm"] == "168"
    assert raw["age"] == "30"
    assert raw["sex"] == "female"
    assert raw["experience"] == "3+ years"
    assert raw["training_days"] == "3-4 days"
    assert raw["session_length"] == "45-75 min"
    assert raw["current_split"] == "upper_lower"
    assert raw["gut_health"] == "Mild"
    assert raw["sleep"] == "6-7h"
    assert raw["stress"] == "High (7-10)"
    assert raw["steps"] == "I don't track"
    assert raw["caffeine"] == "2-3 coffees (~200-300mg)"
    assert raw["supplements"] == ["creatine", "protein"]
    assert raw["medical"] == []
    assert raw["ed_risk"] is False
    assert raw["triage_result"] == "green"

    # Verify InBody mapping
    ib = raw["inbody"]
    assert ib is not None
    assert ib["has_scan"] is True
    assert ib["scan_date"] == "2026-06-15"
    assert ib["device"] == "InBody 770"
    assert ib["weight_kg"] == 72.0
    assert ib["smm_kg"] == 32.5
    assert ib["bfm_kg"] == 18.0
    assert ib["bf_pct"] == 25.0
    assert ib["bmi"] == 25.5
    assert ib["visceral_fat"] == 9
    assert ib["ecw_tbw_ratio"] == 0.421
    assert ib["ffmi"] == 19.1
    assert "High ECW/TBW" in ib["flags"][0]

    # Build profile
    profile = build_profile(raw)
    assert profile["name"] == "Jane Doe"
    assert profile["goal"] == "fat_loss"
    assert profile["bodyweight_kg"] == 72.0
    assert profile["age"] == 30
    assert profile["sex"] == "female"
    assert profile["training_days"] == 4
    assert profile["session_length_min"] == 60
    assert profile["sleep_hours"] == 6.5
    assert profile["stress_level"] == 8
    assert profile["daily_steps"] == 0
    assert profile["caffeine_mg"] == 250
    assert profile["ed_risk"] is False
    assert profile["triage_result"] == "green"

    # InBody in profile
    pib = profile["inbody"]
    assert pib["has_scan"] is True
    assert pib["visceral_fat"] == 9
    assert pib["ecw_tbw_ratio"] == 0.421


def test_pipeline_save_and_load():
    """save_profile → load_profile round-trip."""
    form = FULL_FORM_JSON
    raw = map_form_json(form, "pipeline_test_user_02")
    profile = build_profile(raw)
    path = save_profile(profile)
    loaded = load_profile(profile["user_id"])
    assert loaded is not None
    assert loaded["name"] == "Jane Doe"
    assert loaded["goal"] == "fat_loss"
    assert loaded["inbody"]["has_scan"] is True
    assert loaded["inbody"]["smm_kg"] == 32.5
    os.unlink(path)


@skip_if_no_vault
def test_vault_context_generation():
    """Verify vault context builds without error."""
    form = FULL_FORM_JSON
    raw = map_form_json(form, "pipeline_test_user_03")
    profile = build_profile(raw)
    vault = get_vault_context(profile)
    assert vault is not None
    assert len(vault) > 1000
    assert isinstance(vault, str)


def test_pipeline_with_inbody_computed():
    """Verify lbm_kg and ffmi are derived from InBody data."""
    form = FULL_FORM_JSON
    raw = map_form_json(form, "pipeline_test_user_04")
    profile = build_profile(raw)
    ib = profile["inbody"]
    assert ib["lbm_kg"] == 54.0
    assert ib["ffmi"] == 19.1


def test_minimal_form_json():
    """Verify minimal valid form (no InBody, minimal answers)."""
    form = {
        "name": "Minimal",
        "answers": {
            "Q45": "Minimal",
            "Q46": "75",
            "Q49": "180",
            "Q7": "40_54",
            "Q8": "male",
            "Q6": "maintain",
            "Q1": "1_2",
            "Q2": "2",
            "Q18": "over_60",
            "Q51": "",
            "Q20": "no",
            "Q29": "good",
            "Q13": "7_8",
            "Q15": "3",
            "Q26": "unknown",
            "Q56": "none",
            "Q55": [],
            "Q47": "",
            "Q58": "never",
            "Q59": "never",
            "Q60": "never",
            "Q61": "no",
        },
    }
    raw = map_form_json(form, "pipeline_minimal")
    profile = build_profile(raw)

    assert profile["name"] == "Minimal"
    assert profile["bodyweight_kg"] == 75.0
    assert profile["age"] == 47
    assert profile["inbody"] is None  # no InBody scan
    assert profile["ed_risk"] is False
    assert profile["triage_result"] == "green"


def test_generate_program_pipeline_generates_deterministically():
    """Verify the deterministic pipeline generates content without an LLM."""
    profile = {"user_id": "e2e_test_user", "name": "Test"}
    result = generate_program(profile)
    assert result is not None
    assert "Coaching Program" in result
    assert "Session" in result or "Training" in result


def test_mocked_program_pdf():
    """Verify PDF generation works from mocked program output."""
    from mos_bot.config import PDFS_DIR
    mock_program = (
        "# Coaching Program for Test\n\n"
        "## Profile Summary\n- Name: Test\n\n"
        "## Training\n**Phase 1 (Weeks 1-4)**\n"
        "| Exercise | Sets | Reps | RIR |\n"
        "|----------|------|------|-----|\n"
        "| Squat | 3 | 8-10 | 2 |\n\n"
        "## Nutrition\n- Protein: 2.0g/kg\n\n"
        "## Sources\n- vault://training/foundations.md"
    )
    path = generate_program_pdf(mock_program, "pdf_test_user")
    assert path is not None
    assert os.path.exists(path)
    assert path.endswith(".pdf")
    os.unlink(path)


def test_inbody_filebase64_not_in_profile():
    """Verify the large fileBase64 is not stored in the profile."""
    form = FULL_FORM_JSON
    assert "fileBase64" in form.get("inbodyScan", {})  # form output has it
    raw = map_form_json(form, "pipeline_base64_test")
    ib = raw["inbody"]
    assert ib is not None
    assert ib.get("fileBase64") is None  # should be stripped


def test_form_json_with_all_edge_cases():
    """Test extreme / edge values in form answers."""
    form = FULL_FORM_JSON.copy()
    form["answers"] = form["answers"].copy()
    form["answers"]["Q55"] = []                     # empty supplements list
    form["answers"]["Q20"] = "moderate"             # injury present
    form["answers"]["Q32"] = "knee"                 # injury location
    form["answers"]["Q57"] = "ACL reconstruction"   # injury description
    form["answers"]["Q47"] = "Asthma, hypertension" # medical conditions
    form["answers"]["Q58"] = "very_often"           # ED risk high
    form["answers"]["Q59"] = "often"                # ED risk high
    form["answers"]["Q60"] = "often"                # ED risk high
    form["answers"]["Q61"] = "significant"          # ED distress
    form["name"] = ""

    raw = map_form_json(form, "edge_test_user")
    assert raw["injuries"] == ["ACL reconstruction"]
    assert "knee" in raw["injuries"][0] or "ACL" in raw["injuries"][0]
    assert raw["medical"] == ["Asthma, hypertension"]
    assert raw["ed_risk"] is True
    assert raw["triage_result"] == "red"
    assert raw["name"] == "Jane Doe"  # falls back to answers.Q45


def test_missing_json_keys():
    """Verify graceful handling of missing optional keys."""
    form = {"answers": {"Q45": "NoKeys", "Q46": "70"}}
    with patch("mos_bot.handlers.upload_profile._process_json_file"):
        raw = map_form_json(form, "missing_keys_test")
        profile = build_profile(raw)
        assert profile["name"] == "NoKeys"
        assert profile["bodyweight_kg"] == 70.0
        assert profile["inbody"] is None  # no inbodyScan key at all
