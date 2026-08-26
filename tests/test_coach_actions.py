"""Unit and integration tests for AI Coach Program & Diet Mutation Actions."""

import pytest
import os
import json
from pathlib import Path
from fastapi.testclient import TestClient

from mos_bot.core.coach_actions import (
    execute_coach_action,
    load_active_program_content,
    get_program_modifications,
)
from mos_bot.core.coach_intelligence import extract_and_execute_coach_actions
from mos_bot.core.intake_builder import save_profile
from mos_bot.web.app import app

client = TestClient(app)

TEST_USER = "coach_action_tester"


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path):
    from mos_bot.core.coach_actions import _get_programs_json_path
    json_path = _get_programs_json_path(TEST_USER)
    if json_path.exists():
        try: json_path.unlink()
        except Exception: pass

    profile = {
        "user_id": TEST_USER,
        "name": "Action Tester",
        "goal": "hypertrophy",
        "current_split": "PPL",
        "bodyweight_kg": 80.0,
        "height_cm": 180.0,
        "age": 26,
        "injuries": [],
    }
    save_profile(profile)
    yield
    if json_path.exists():
        try: json_path.unlink()
        except Exception: pass


class TestCoachActions:
    def test_swap_exercise_action(self):
        res = execute_coach_action(TEST_USER, "swap_exercise", {
            "old_exercise": "Barbell Bench Press",
            "new_exercise": "Neutral-Grip DB Floor Press",
            "reason": "Anterior shoulder discomfort",
            "sets": 4,
            "reps": "8-10",
            "rir": "2"
        })
        assert res["success"] is True
        assert res["swapped_count"] >= 1

        pc = load_active_program_content(TEST_USER)
        assert pc is not None
        exercises = [ex.name for phase in pc.program.phases for session in phase.sessions for ex in session.exercises]
        assert "Neutral-Grip DB Floor Press" in exercises

    def test_add_exercise_action(self):
        res = execute_coach_action(TEST_USER, "add_exercise", {
            "exercise_name": "Face Pulls with External Rotation",
            "session_day": "Day 1",
            "sets": 3,
            "reps": "15",
            "rir": "2",
            "notes": "Rotator cuff and rear delt activation"
        })
        assert res["success"] is True
        pc = load_active_program_content(TEST_USER)
        exercises = [ex.name for phase in pc.program.phases for session in phase.sessions for ex in session.exercises]
        assert "Face Pulls with External Rotation" in exercises

    def test_remove_exercise_action(self):
        res = execute_coach_action(TEST_USER, "remove_exercise", {
            "exercise_name": "Tricep Pushdown"
        })
        assert res["success"] is True
        assert res["removed_count"] >= 1
        pc = load_active_program_content(TEST_USER)
        exercises = [ex.name for phase in pc.program.phases for session in phase.sessions for ex in session.exercises]
        assert "Tricep Pushdown" not in exercises

    def test_modify_exercise_action(self):
        res = execute_coach_action(TEST_USER, "modify_exercise", {
            "exercise_name": "Barbell Bent-Over Row",
            "sets": 5,
            "reps": "5",
            "rir": "1",
            "notes": "Heavy strength progression"
        })
        assert res["success"] is True
        pc = load_active_program_content(TEST_USER)
        matched = [ex for phase in pc.program.phases for session in phase.sessions for ex in session.exercises if "Bent-Over Row" in ex.name]
        assert len(matched) >= 1
        assert matched[0].sets == 5
        assert matched[0].reps == "5"

    def test_update_nutrition_plan_action(self):
        res = execute_coach_action(TEST_USER, "update_nutrition_plan", {
            "calories_target": 2850,
            "protein_g": 190,
            "carbs_g": 350,
            "fat_g": 75,
            "hydration_target_l": 3.5,
            "meal_timing_notes": "4 meals evenly spaced with 40g protein each"
        })
        assert res["success"] is True
        pc = load_active_program_content(TEST_USER)
        assert pc.nutrition.calories_target == 2850
        assert pc.nutrition.protein_g == 190
        assert pc.nutrition.carbs_g == 350

    def test_log_injury_and_auto_override(self):
        res = execute_coach_action(TEST_USER, "log_injury_and_override", {
            "injury_name": "Shoulder Impingement"
        })
        assert res["success"] is True
        assert res["injury"] == "Shoulder Impingement"
        mods = get_program_modifications(TEST_USER)
        assert len(mods) >= 1


class TestCoachIntelligenceActionParsing:
    def test_extract_and_execute_action_from_llm_text(self):
        llm_response = (
            "I agree with your suggestion to swap the bench press to protect your shoulder.\n\n"
            "```coach_action\n"
            "{\n"
            '  "action": "swap_exercise",\n'
            '  "params": {\n'
            '    "old_exercise": "Incline DB Press",\n'
            '    "new_exercise": "Low Incline Cable Press",\n'
            '    "reason": "Scapular freedom for shoulder health"\n'
            "  }\n"
            "}\n"
            "```\n"
            "Keep up the great work!"
        )
        cleaned_text, actions = extract_and_execute_coach_actions(TEST_USER, llm_response)
        assert len(actions) == 1
        assert actions[0]["action"] == "swap_exercise"
        assert actions[0]["result"]["success"] is True
        assert "```coach_action" not in cleaned_text
        assert "Keep up the great work!" in cleaned_text


class TestCoachActionEndpoints:
    def test_api_execute_coach_action_endpoint(self):
        resp = client.post("/api/intelligence/coach/action", json={
            "user_id": TEST_USER,
            "action": "update_nutrition_plan",
            "params": {
                "calories_target": 2700,
                "protein_g": 175,
                "carbs_g": 320,
                "fat_g": 70
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["nutrition"]["calories_target"] == 2700

    def test_api_get_coach_modifications_endpoint(self):
        resp = client.get(f"/api/intelligence/coach/modifications/{TEST_USER}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == TEST_USER
        assert isinstance(data["modifications"], list)
