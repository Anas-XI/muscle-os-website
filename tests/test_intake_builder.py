"""Test intake_builder.py — profile JSON built correctly from raw answers."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_os"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Muscle Operating System", "00_META", "scripts"))

from mos_os.core.intake_builder import build_profile, parse_weight, parse_height


def test_parse_weight_kg():
    assert parse_weight("84 kg") == 84.0


def test_parse_weight_lb():
    result = parse_weight("185 lb")
    assert abs(result - 83.9) < 0.5


def test_parse_weight_numeric():
    assert parse_weight("84") == 84.0


def test_parse_height_cm():
    assert parse_height("175 cm") == 175.0


def test_parse_height_ft_in():
    result = parse_height("5'9")
    assert abs(result - 175.26) < 0.1


def test_build_profile_full():
    raw = {
        "user_id": "12345",
        "name": "Test",
        "goal": "Build muscle",
        "situation": "Just getting started",
        "bodyweight_kg": "80 kg",
        "height_cm": "5'10",
        "age": "25",
        "experience": "1-3 years",
        "training_days": "3-4 days",
        "session_length": "45-75 min",
        "current_split": "PPL",
        "injuries": ["knee pain"],
        "gut_health": "Mild",
        "sleep": "7-8h",
        "stress": "Moderate (4-6)",
        "steps": "10,000+",
        "caffeine": "1 coffee (~100mg)",
        "supplements": ["creatine"],
        "medical": [],
        "ed_risk": False,
        "triage_result": "green",
    }
    profile = build_profile(raw)
    assert profile["goal"] == "hypertrophy"
    assert profile["bodyweight_kg"] == 80.0
    assert abs(profile["height_cm"] - 177.8) < 0.5
    assert profile["age"] == 25
    assert profile["experience_years"] == 2
    assert profile["training_days"] == 4
    assert profile["session_length_min"] == 60
    assert profile["gut_health"] == "mild"
    assert profile["sleep_hours"] == 7.5
    assert profile["stress_level"] == 5
    assert profile["daily_steps"] == 12000
    assert profile["caffeine_mg"] == 100
    assert profile["injuries"] == ["knee pain"]
    assert profile["supplements"] == ["creatine"]


def test_build_profile_minimal():
    raw = {
        "user_id": "test",
        "name": "Test",
        "goal": "Lose fat",
        "bodyweight_kg": "200 lb",
        "height_cm": "180 cm",
        "age": "30",
    }
    profile = build_profile(raw)
    assert profile["goal"] == "fat_loss"
    assert abs(profile["bodyweight_kg"] - 90.7) < 0.5
    assert profile["height_cm"] == 180.0
    assert profile["age"] == 30


def test_build_profile_with_new_fields():
    raw = {
        "user_id": "12345",
        "name": "NewFields",
        "goal": "Build muscle",
        "situation": "Not seeing results",
        "bodyweight_kg": "80 kg",
        "height_cm": "175 cm",
        "age": "30",
        "experience": "3+ years",
        "training_days": "5+ days",
        "session_length": "75-100 min",
        "current_split": "PPL",
        "gut_health": "Significant",
        "bowel_frequency_weekly": 7,
        "fermented_foods": "several_week",
        "antibiotic_recent": True,
        "supplement_regimen": "Creatine 5g, Omega-3 2g",
        "vegan_unsupplemented": False,
        "sleep": "7-8h",
        "stress": "Low (1-3)",
        "daily_water_liters": 2.5,
        "urine_color": "dark_yellow",
        "muscle_cramps": True,
        "alcohol_weekly": "3_7",
        "alcohol_near_bed": True,
        "steps": "10,000+",
        "caffeine": "2-3 coffees (~200-300mg)",
        "work_schedule": "rotating",
        "reliable_hours_weekly": 4,
        "mobility_limitations": ["ankle/hip", "lower_back"],
        "joint_pain": "some_exercises",
        "supplements": ["creatine", "omega3"],
        "medical": ["asthma"],
        "last_bloodwork": "2yr_plus",
        "known_deficiencies": ["vitamin_d"],
        "family_history": ["heart_disease", "diabetes"],
        "mental_health_concern": "moderate",
        "mental_health_care": "yes_seeing",
        "ed_risk": False,
        "triage_result": "green",
    }
    profile = build_profile(raw)
    assert profile["goal"] == "hypertrophy"
    assert profile["situation"] == "plateaued"
    assert profile["gut_health"] == "significant"
    assert profile["bowel_frequency_weekly"] == 7
    assert profile["fermented_foods"] == "several_week"
    assert profile["antibiotic_recent"] is True
    assert profile["supplement_regimen"] == "Creatine 5g, Omega-3 2g"
    assert profile["vegan_unsupplemented"] is False
    assert profile["daily_water_liters"] == 2.5
    assert profile["urine_color"] == "dark_yellow"
    assert profile["muscle_cramps"] is True
    assert profile["alcohol_weekly"] == 5
    assert profile["alcohol_near_bed"] is True
    assert profile["work_schedule"] == "rotating"
    assert profile["reliable_hours_weekly"] == 4
    assert profile["mobility_limitations"] == ["ankle/hip", "lower_back"]
    assert profile["joint_pain"] == "some_exercises"
    assert profile["last_bloodwork"] == "2yr_plus"
    assert profile["known_deficiencies"] == ["vitamin_d"]
    assert profile["family_history"] == ["heart_disease", "diabetes"]
    assert profile["mental_health_concern"] == "moderate"
    assert profile["mental_health_care"] == "yes_seeing"
    assert profile["supplements"] == ["creatine", "omega3"]


def test_build_profile_new_fields_defaults():
    raw = {
        "user_id": "test",
        "name": "Defaults",
        "goal": "Lose fat",
        "bodyweight_kg": "80",
        "height_cm": "175",
        "age": "30",
    }
    profile = build_profile(raw)
    assert profile["daily_water_liters"] == 0
    assert profile["urine_color"] == ""
    assert profile["muscle_cramps"] is False
    assert profile["alcohol_weekly"] == 0
    assert profile["alcohol_near_bed"] is False
    assert profile["mobility_limitations"] == []
    assert profile["known_deficiencies"] == []
    assert profile["family_history"] == []
    assert profile["mental_health_concern"] == ""
    assert profile["mental_health_care"] == ""
    assert profile["bowel_frequency_weekly"] == 0
