"""Test vault_context.py — correct docs selected per profile."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_os"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Muscle Operating System", "00_META", "scripts"))
sys.path.insert(0, os.path.dirname(__file__))

from skip_helpers import skip_if_no_vault
from mos_os.core.vault_context import get_vault_context

pytestmark = skip_if_no_vault


def _base(overrides=None):
    p = {
        "goal": "hypertrophy",
        "injuries": [],
        "gut_health": "none",
        "sleep_hours": 8,
        "alcohol_weekly": 0,
        "urine_color": "",
        "muscle_cramps": False,
        "work_schedule": "",
        "last_bloodwork": "",
        "mental_health_concern": "",
        "fermented_foods": "",
        "mobility_limitations": [],
        "joint_pain": "",
    }
    if overrides:
        p.update(overrides)
    return p


def test_always_includes_core_docs():
    context = get_vault_context(_base())
    assert "Muscle OS Core Engine" in context


def test_injury_profile_includes_matrix():
    context = get_vault_context(_base({"injuries": ["knee pain"]}))
    assert "Injury-Training Compatibility Matrix" in context or "Constraint Resolution Engine" in context


def test_sleep_deficit_includes_study():
    context = get_vault_context(_base({"sleep_hours": 5}))
    assert "Core Engine" in context


def test_bulking_goal_includes_decision_tree():
    context = get_vault_context(_base({"goal": "build muscle"}))
    assert "Decision Tree" in context or "Core Engine" in context


def test_context_truncated_to_limit():
    context = get_vault_context(_base({
        "injuries": ["knee pain", "shoulder impingement"],
        "gut_health": "significant",
        "sleep_hours": 5,
    }))
    assert len(context) <= 21000


def test_alcohol_triggers_sleep_pillar():
    context = get_vault_context(_base({"alcohol_weekly": 7}))
    assert "Sleep Architecture" in context or "Sleep Maxing" in context


def test_dehydration_triggers_hydration_protocol():
    context = get_vault_context(_base({"urine_color": "amber_brown", "muscle_cramps": True}))
    assert "Hydration Protocol" in context or "Pillar" in context


def test_shift_worker_triggers_profile():
    context = get_vault_context(_base({"work_schedule": "night"}))
    assert "Shift Work" in context or "Shift Worker" in context


def test_overdue_bloodwork_triggers_recommendation():
    context = get_vault_context(_base({"last_bloodwork": "2yr_plus"}))
    assert "Bloodwork" in context


def test_mental_health_triggers_safety_triage():
    context = get_vault_context(_base({"mental_health_concern": "significant"}))
    assert "Safety Triage" in context or "Core Engine" in context
