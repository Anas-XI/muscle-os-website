"""Test tracker_renderer.py — HTML workout tracker generation."""

import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, PillarAssignment,
    ProgramContent, ProgramStructure, NutritionPlan,
    Exercise, Session, Phase,
)
from mos_bot.core.tracker_renderer import (
    generate_tracker_html, generate_tracker_file, TRACKERS_DIR,
)


def _make_test_pc(user_id="test_user", name="Test User") -> ProgramContent:
    return ProgramContent(
        client=ClientProfile(
            user_id=user_id, name=name, goal="hypertrophy",
            bodyweight_kg=75, height_cm=175, age=28, training_days=4, sex="male",
        ),
        triage=SafetyTriageResult(triage="green"),
        pillars=PillarAssignment(primary_pillars=["P2 - Training Maxing"]),
        program=ProgramStructure(
            split="Upper/Lower Split",
            phases=[
                Phase(
                    name="Phase 1: Accumulation",
                    duration="Weeks 1-4",
                    goal="Build base",
                    sessions=[
                        Session(day="Upper A", focus="Push/Pull", exercises=[
                            Exercise(name="Bench Press", sets=3, reps="10-12", rir="2", weight="", rest="90s"),
                            Exercise(name="DB Row", sets=3, reps="10-12", rir="2", weight="", rest="90s"),
                        ]),
                        Session(day="Lower A", focus="Legs", exercises=[
                            Exercise(name="Squat", sets=3, reps="10-12", rir="2", weight="", rest="120s"),
                        ]),
                    ],
                ),
            ],
            weekly_schedule="4x/week Upper/Lower",
            warm_up_protocol="5 min bike\nDynamic stretches",
            cool_down_protocol="5 min walk\nStatic stretching",
        ),
        nutrition=NutritionPlan(
            calories_target=2800, protein_g=180, carbs_g=320, fat_g=80,
            protein_per_kg=2.4, hydration_target_l=3.0,
        ),
    )


def test_generate_tracker_html_returns_string():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert isinstance(html, str)
    assert len(html) > 500


def test_generate_tracker_html_contains_client_name():
    pc = _make_test_pc(name="Jane")
    html = generate_tracker_html(pc)
    assert "Jane" in html


def test_generate_tracker_html_contains_program_json():
    pc = _make_test_pc(user_id="u1")
    html = generate_tracker_html(pc)
    assert "Upper/Lower Split" in html
    assert "Bench Press" in html
    assert "Squat" in html


def test_generate_tracker_html_has_ui_elements():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "Today's Workout" in html
    assert "Daily Check-in" in html
    assert "Full Program" in html
    assert "History" in html
    assert "save-workout" in html
    assert "save-checkin" in html
    assert "submit-logs" in html
    assert "export-logs" in html


def test_generate_tracker_html_deadlift_icon():
    pc = _make_test_pc()
    pc.program.phases[0].sessions[0].exercises.append(
        Exercise(name="Deadlift", sets=3, reps="5", rir="2")
    )
    html = generate_tracker_html(pc)
    assert "Deadlift" in html


def test_generate_tracker_file_saves_html():
    pc = _make_test_pc(user_id="tracker_test")
    path = generate_tracker_file(pc, "tracker_test")
    assert os.path.exists(path)
    assert "tracker_test" in path
    assert path.endswith(".html")
    content = open(path, encoding="utf-8").read()
    assert len(content) > 500
    assert "Check-in" in content
    os.remove(path)


def test_generate_tracker_html_contains_calorie_info():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "2800" in html  # calories
    assert "Upper/Lower" in html


def test_generate_tracker_html_multiple_phases():
    pc = _make_test_pc()
    pc.program.phases.append(
        Phase(name="Phase 2: Intensification", duration="Weeks 5+", goal="Increase load", sessions=[])
    )
    html = generate_tracker_html(pc)
    assert "Phase 2" in html


def test_generate_tracker_html_with_injuries():
    pc = _make_test_pc()
    pc.client.injuries = ["knee"]
    pc.client.mobility_limitations = ["limited ankle dorsiflexion"]
    html = generate_tracker_html(pc)
    assert html is not None
    assert len(html) > 500


def test_generate_tracker_html_sanitizes_special_chars():
    pc = _make_test_pc(name="O'Brien")
    html = generate_tracker_html(pc)
    assert "O'Brien" in html


def test_tracker_html_has_theme_toggle():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "theme-toggle" in html
    assert "toggleTheme" in html
    assert "mos_theme_" in html


def test_tracker_html_has_set_checkboxes():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "set-done" in html
    assert 'type="checkbox"' in html


def test_tracker_html_has_rest_timer():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "rest-timer" in html
    assert "startRestTimer" in html


def test_tracker_html_has_chart_canvases():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "weight-chart" in html
    assert "volume-chart" in html
    assert "renderWeightChart" in html
    assert "renderVolumeChart" in html


def test_tracker_html_has_stats_row():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "stats-row" in html
    assert "Avg Readiness" in html or "avgReadiness" in html


def test_tracker_html_has_clear_data():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "clear-data" in html
    assert "Clear Local" in html


def test_tracker_html_has_dynamic_exercise_icons():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "getIcon(name)" in html
    assert "return '🦵'" in html
    assert "return '🍑'" in html


def test_tracker_html_has_dimmed_set_inputs():
    pc = _make_test_pc()
    html = generate_tracker_html(pc)
    assert "dimmed" in html
    assert "set-done" in html
