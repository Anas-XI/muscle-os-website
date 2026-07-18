"""Test content_generator.py — deterministic program generation."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, PillarAssignment,
    ProgramContent, VaultSource,
)
from mos_bot.core.content_generator import (
    program_to_markdown,
    generate_program,
    generate_nutrition_plan,
    generate_program_structure,
    _bmi, _calc_bmr, _goal_label,
)


def test_goal_label():
    assert _goal_label("fat_loss") == "Fat Loss"
    assert _goal_label("hypertrophy") == "Muscle Building"
    assert _goal_label("strength") == "Strength"
    assert _goal_label("recomp") == "Body Recomposition"


def test_bmi_calculation():
    profile = ClientProfile(user_id="t", name="T", bodyweight_kg=80, height_cm=180)
    assert _bmi(profile) == 24.7


def test_bmr_calculation_male():
    profile = ClientProfile(user_id="t", name="T", bodyweight_kg=80, height_cm=175, age=30, sex="male")
    bmr = _calc_bmr(profile)
    assert bmr == 1749


def test_bmr_calculation_female():
    profile = ClientProfile(user_id="t", name="T", bodyweight_kg=65, height_cm=165, age=28, sex="female")
    bmr = _calc_bmr(profile)
    assert bmr == 1380


def test_generate_nutrition_fat_loss():
    profile = ClientProfile(user_id="t", name="T", goal="fat_loss", bodyweight_kg=80,
                            height_cm=175, age=30, training_days=4, sex="male")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    n = generate_nutrition_plan(profile, triage, pillars)
    assert n.calories_target > 0
    assert n.protein_g > 0
    assert not n.special_notes


def test_generate_nutrition_gentle_entry():
    profile = ClientProfile(user_id="t", name="T", goal="fat_loss", bodyweight_kg=80,
                            height_cm=175, age=30, training_days=4, sex="male")
    triage = SafetyTriageResult(triage="yellow")
    pillars = PillarAssignment(gentle_entry=True, modifications=["gentle_entry", "no_calorie_deficit"])
    n = generate_nutrition_plan(profile, triage, pillars)
    assert "Maintenance" in n.special_notes


def test_generate_program_structure_full_body():
    profile = ClientProfile(user_id="t", name="T", goal="hypertrophy", bodyweight_kg=70,
                            height_cm=170, age=25, training_days=3, sex="male")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    p = generate_program_structure(profile, triage, pillars)
    assert p.split == "Full Body"
    assert len(p.phases) == 2


def test_generate_program_structure_upper_lower():
    profile = ClientProfile(user_id="t", name="T", goal="hypertrophy", bodyweight_kg=70,
                            height_cm=170, age=25, training_days=4, sex="male",
                            current_split="upper_lower")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    p = generate_program_structure(profile, triage, pillars)
    assert "Upper" in p.split or "Upper/Lower" in p.split


def test_program_to_markdown_all_sections():
    profile = ClientProfile(user_id="test", name="Test User", goal="hypertrophy",
                            bodyweight_kg=75, height_cm=175, age=28, training_days=4,
                            sex="male")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment(primary_pillars=["P2 - Training Maxing"])
    from mos_bot.core.book_engine import BookEngineResult

    pc = generate_program(profile, triage, pillars, book_result=BookEngineResult(
        vault_insights=["[Schoenfeld] Prioritize compound movements for hypertrophy."],
    ))
    md = program_to_markdown(pc)

    assert "# Muscle OS Coaching Program: Test User" in md
    assert "## 1. Profile Summary" in md
    assert "## 2. Constraint Analysis" in md
    assert "## 4. Program Overview" in md
    assert "## 6. Nutrition Plan" in md
    assert "## 7. Sleep Protocol" in md
    assert "## 8. Supplement Recommendations" in md
    assert "## 10. Measurement KPIs" in md
    assert "## 11. Adjustment Triggers" in md
    assert "## 13. Week 1 Action Plan" in md
    assert "## 14. Vault-Informed Decisions" in md
    assert "## 15. Vault Sources" in md


def test_program_to_markdown_includes_vault_sources():
    profile = ClientProfile(user_id="test", name="Test", goal="fat_loss",
                            bodyweight_kg=70, height_cm=165, age=30, training_days=4,
                            sex="female")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    vs = [
        VaultSource(title="Pillar 1 - Diet Maxing", path="02_PILLARS/Pillar 1.md", score=0.85),
        VaultSource(title="Cutting Decision Tree", path="04_TOOLS/Cutting.md", score=0.72),
    ]
    pc = generate_program(profile, triage, pillars, vault_sources=vs)
    md = program_to_markdown(pc)
    assert "Pillar 1 - Diet Maxing" in md
    assert "Cutting Decision Tree" in md
    assert "0.85" in md


def test_program_safety_hierarchy_mentioned():
    profile = ClientProfile(user_id="test", name="Test", goal="hypertrophy",
                            bodyweight_kg=70, height_cm=170, age=25, training_days=3,
                            sex="male")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    pc = generate_program(profile, triage, pillars)
    md = program_to_markdown(pc)
    assert "Safety > Adherence" in md


def test_program_includes_warmup_cooldown():
    profile = ClientProfile(user_id="test", name="Test", goal="strength",
                            bodyweight_kg=80, height_cm=175, age=30, training_days=3,
                            sex="male")
    triage = SafetyTriageResult(triage="green")
    pillars = PillarAssignment()
    pc = generate_program(profile, triage, pillars)
    md = program_to_markdown(pc)
    assert "Warm-Up Protocol" in md
    assert "Cool-Down Protocol" in md
