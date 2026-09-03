"""Test program_generator.py — deterministic pipeline, no LLM dependency."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Muscle Operating System", "00_META", "scripts"))

from mos_bot.core.program_generator import generate_program


def test_generate_program_returns_markdown():
    profile = {"user_id": "test", "name": "Test", "goal": "hypertrophy", "bodyweight_kg": 80,
               "height_cm": 175, "age": 25, "training_days": 4, "current_split": "upper_lower"}

    result = generate_program(profile)

    assert result is not None
    assert "# Muscle OS Coaching Program: Test" in result
    assert "Nutrition" in result
    assert "Training" in result
    assert "Sleep Protocol" in result
    assert "Measurement KPIs" in result
    assert "Adjustment Triggers" in result
    assert "Week 1 Action Plan" in result
    assert "Safety > Adherence > Recovery > Nutrition > Training > Optimisation" in result


def test_generate_program_handles_fat_loss_goal():
    profile = {"user_id": "test", "name": "Dieter", "goal": "fat_loss", "bodyweight_kg": 90,
               "height_cm": 180, "age": 35, "training_days": 3, "experience_years": 1}

    result = generate_program(profile)

    assert result is not None
    assert "Fat Loss" in result
    assert "Caloric deficit" in result
    assert "P1 - Diet Maxing" in result


def test_generate_program_handles_injuries(monkeypatch):
    from tests.skip_helpers import vault_available
    if not vault_available:
        monkeypatch.setattr("mos_bot.core.program_generator.evaluate_rag_impact", lambda p, rf: ("proceed", ""))

    profile = {"user_id": "test", "name": "Injured", "goal": "strength", "bodyweight_kg": 75,
               "height_cm": 170, "age": 28, "training_days": 4, "injries": ["Lower back disc"]}

    # Use singular 'injury' as the field name
    profile["injuries"] = ["Lower back disc"]

    result = generate_program(profile)

    assert result is not None
    assert "Back" in result or "back" in result
    assert "Brace core" in result or "avoid spinal flexion" in result


def test_generate_program_handles_poor_sleep():
    profile = {"user_id": "test", "name": "Tired", "goal": "hypertrophy", "bodyweight_kg": 70,
               "height_cm": 165, "age": 30, "training_days": 3, "sleep_hours": 5.5}

    result = generate_program(profile)

    assert result is not None
    assert "Sleep is the current bottleneck" in result
