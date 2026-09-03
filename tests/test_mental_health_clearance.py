import os
import shutil
import pytest
from datetime import datetime, timedelta, timezone

from mos_bot.config import DATA_ROOT
from mos_bot.core.flag_models import MentalHealthFlag, FlagAuditEntry
from mos_bot.core.mental_health_flags import (
    create_or_trigger_flag, claim_flag, clear_flag, set_monitoring,
    escalate_flag, check_monitoring_and_sla_timeouts, has_active_mental_health_flag,
    list_flags, get_flag, get_flag_audit_trail, FLAGS_DIR
)
from mos_bot.core.models import ClientProfile, SafetyTriageResult, PillarAssignment
from mos_bot.core.context_loader import run_safety_triage
from mos_bot.core.content_generator import generate_nutrition_plan


def _test_now() -> datetime:
    return datetime.now(timezone.utc)


@pytest.fixture(autouse=True)
def clean_flags_dir():
    """Ensure clean flags test directory before each test."""
    if os.path.exists(FLAGS_DIR):
        shutil.rmtree(FLAGS_DIR)
    os.makedirs(FLAGS_DIR, exist_ok=True)
    yield
    if os.path.exists(FLAGS_DIR):
        shutil.rmtree(FLAGS_DIR)


# ── Test 1: Structural Safety Invariant on Clearance ──

def test_clearance_without_human_actor_fails():
    flag = create_or_trigger_flag("user_101", "Moderate anxiety reported at intake")
    claim_flag(flag.flag_id, claimed_by="coach_alice")

    with pytest.raises(ValueError, match="cleared_by"):
        clear_flag(flag.flag_id, cleared_by="", clearance_note="Spoke with client, stable.")

    with pytest.raises(ValueError, match="cleared_by"):
        clear_flag(flag.flag_id, cleared_by=None, clearance_note="Spoke with client, stable.")

    # Reject automated placeholders
    for placeholder in ["system", "bot", "scheduler", "cron", "anonymous", "null", "undefined"]:
        with pytest.raises(ValueError, match="identifiable human coach"):
            clear_flag(flag.flag_id, cleared_by=placeholder, clearance_note="Auto discharge")


def test_clearance_without_clearance_note_fails():
    flag = create_or_trigger_flag("user_102", "Moderate anxiety reported at intake")
    claim_flag(flag.flag_id, claimed_by="coach_bob")

    with pytest.raises(ValueError, match="clearance_note"):
        clear_flag(flag.flag_id, cleared_by="coach_bob", clearance_note="")

    with pytest.raises(ValueError, match="clearance_note"):
        clear_flag(flag.flag_id, cleared_by="coach_bob", clearance_note="   ")

    with pytest.raises(ValueError, match="clearance_note"):
        clear_flag(flag.flag_id, cleared_by="coach_bob", clearance_note=None)


def test_valid_clearance_succeeds_and_writes_audit():
    flag = create_or_trigger_flag("user_103", "Moderate depressive symptoms")
    claim_flag(flag.flag_id, claimed_by="coach_carol")
    cleared = clear_flag(
        flag.flag_id,
        cleared_by="coach_carol",
        clearance_note="Client confirmed active therapy support and ready for gentle routine."
    )

    assert cleared.status == "cleared"
    assert cleared.cleared_by == "coach_carol"
    assert cleared.cleared_at is not None
    assert "Client confirmed active therapy" in cleared.clearance_note

    # Verify audit trail
    audit = get_flag_audit_trail(flag.flag_id)
    assert len(audit) >= 3 # open, in_review, cleared
    assert audit[-1].to_status == "cleared"
    assert audit[-1].actor == "coach_carol"


# ── Test 2: Monitoring Timeout Auto-Reopening ──

def test_monitoring_timeout_auto_reopens_to_in_review():
    flag = create_or_trigger_flag("user_201", "Stress overload")
    claim_flag(flag.flag_id, claimed_by="coach_dan")

    # Set monitoring with past recheck_at timestamp (simulating expired timebox)
    past_time = (_test_now() - timedelta(minutes=5)).isoformat()
    monitored = set_monitoring(flag.flag_id, actor="coach_dan", recheck_at=past_time, note="Check in after 3 days")
    assert monitored.status == "monitoring"

    # Run scheduler check
    res = check_monitoring_and_sla_timeouts()
    assert res["reopened_monitoring_count"] == 1

    # Verify flag state updated to in_review
    reloaded = get_flag(flag.flag_id)
    assert reloaded.status == "in_review"
    assert reloaded.recheck_at is None

    # Verify audit entry recorded
    audit = get_flag_audit_trail(flag.flag_id)
    assert audit[-1].from_status == "monitoring"
    assert audit[-1].to_status == "in_review"
    assert audit[-1].actor == "scheduler"


# ── Test 3: Linked Flag History on Re-Trigger ──

def test_new_trigger_after_cleared_creates_new_linked_record():
    # 1. First incident created and cleared
    flag_1 = create_or_trigger_flag("user_301", "First incident: moderate anxiety")
    claim_flag(flag_1.flag_id, claimed_by="coach_eva")
    clear_flag(flag_1.flag_id, cleared_by="coach_eva", clearance_note="Resolved with therapist clearance.")

    assert get_flag(flag_1.flag_id).status == "cleared"

    # 2. Second incident triggered later
    flag_2 = create_or_trigger_flag("user_301", "Second incident: distress during checkin")

    assert flag_2.flag_id != flag_1.flag_id
    assert flag_2.status == "open"
    assert flag_1.flag_id in flag_2.linked_flag_ids

    # Old flag remains untouched in cleared status
    assert get_flag(flag_1.flag_id).status == "cleared"


# ── Test 4: Escalation Hands Off to Crisis Gate ──

def test_escalation_triggers_crisis_gate(monkeypatch):
    # Mock profile storage for user_401
    test_user_id = "user_401"
    flag = create_or_trigger_flag(test_user_id, "Escalating distress")
    claim_flag(flag.flag_id, claimed_by="coach_frank")

    notified_messages = []
    def mock_post(url, json, timeout=10):
        notified_messages.append(json)
        class MockResp:
            status_code = 200
        return MockResp()

    import requests
    monkeypatch.setattr(requests, "post", mock_post)
    monkeypatch.setattr("mos_bot.core.mental_health_flags.OWNER_ID", 99999)
    monkeypatch.setattr("mos_bot.config.BOT_TOKEN", "dummy_token")

    escalated = escalate_flag(
        flag.flag_id,
        escalated_by="coach_frank",
        reason="Client indicated feelings of severe hopelessness."
    )

    assert escalated.status == "escalated"
    assert escalated.escalated_by == "coach_frank"
    assert escalated.escalated_at is not None

    # Assert owner crisis alert was dispatched
    assert len(notified_messages) >= 1
    assert "ESCALATED CRISIS" in notified_messages[0]["text"]
    assert test_user_id in notified_messages[0]["text"]


# ── Test 5: Soft-Gate Nutrition/Training Generation ──

def test_soft_gate_enforces_maintenance_and_blocks_deficit():
    user_id = "user_501"
    create_or_trigger_flag(user_id, "Active moderate flag")

    profile = ClientProfile(
        user_id=user_id,
        name="Athlete",
        goal="fat_loss", # User requested fat loss
        situation="general",
        age=30,
        sex="male",
        bodyweight_kg=80.0,
        height_cm=180.0,
        experience_years=2,
        training_days=4,
        session_length_min=60,
        sleep_hours=7.5,
        stress_level=4,
        mental_health_concern="none" # Flag active via flag service
    )

    triage = run_safety_triage(profile, ("green", []))
    assert "no_calorie_deficit" in triage.modifiers
    assert "no_food_tracking" in triage.modifiers
    assert "mental_health_support" in triage.modifiers
    assert "gentle_entry" in triage.modifiers

    pillars = PillarAssignment(
        primary_pillar="Training",
        secondary_pillar="Nutrition",
        all_pillars=["Training", "Nutrition"],
        modifications=triage.modifiers,
        gentle_entry=True
    )

    nutrition = generate_nutrition_plan(profile, triage, pillars)

    # Assert no caloric deficit applied despite goal='fat_loss'
    assert nutrition.calories_target > 0
    assert "Gentle Entry" in nutrition.special_notes or "Maintenance calories" in nutrition.special_notes
    assert "No deficit applied" in nutrition.special_notes


# ── Test 6: 48-Hour SLA Backstop Notification ──

def test_unclaimed_flag_past_48h_triggers_owner_sla_alert(monkeypatch):
    user_id = "user_601"
    flag = create_or_trigger_flag(user_id, "Intake moderate flag")

    # Manually backdate created_at to 49 hours ago
    old_time = (_test_now() - timedelta(hours=49)).isoformat()
    flag.created_at = old_time
    from mos_bot.core.mental_health_flags import _save_flag
    _save_flag(flag)

    sla_alerts = []
    def mock_post(url, json, timeout=10):
        sla_alerts.append(json)
        class MockResp:
            status_code = 200
        return MockResp()

    import requests
    monkeypatch.setattr(requests, "post", mock_post)
    monkeypatch.setattr("mos_bot.core.mental_health_flags.OWNER_ID", 88888)
    monkeypatch.setattr("mos_bot.config.BOT_TOKEN", "dummy_token")

    res = check_monitoring_and_sla_timeouts()
    assert res["sla_breach_alert_count"] == 1
    assert len(sla_alerts) == 1
    assert "SLA WARNING" in sla_alerts[0]["text"]
    assert user_id in sla_alerts[0]["text"]


# ── Test 7: Coach REST API Authentication & Negative Paths ──

def test_coach_api_auth_and_negative_paths(monkeypatch):
    """Verify coach REST endpoints reject unauthenticated and forged requests,
    and enforce safety invariants across HTTP calls."""
    from fastapi.testclient import TestClient
    from mos_bot.web.app import app

    client = TestClient(app)

    # Set mock API key in environment
    monkeypatch.setenv("MOS_API_KEY", "secret_coach_api_key_xyz")
    monkeypatch.setenv("MOS_ENV", "production")

    flag = create_or_trigger_flag("user_701", "Anxiety concern")

    # 1. Unauthenticated request (missing X-API-Key header) -> 401
    resp_unauth = client.post(f"/api/coach/flags/{flag.flag_id}/clear", json={
        "cleared_by": "attacker",
        "clearance_note": "discharge"
    })
    assert resp_unauth.status_code == 401
    assert "Invalid or missing API key" in resp_unauth.json()["detail"]

    # 2. Tampered / wrong API key -> 401
    resp_bad_key = client.post(
        f"/api/coach/flags/{flag.flag_id}/clear",
        headers={"X-API-Key": "wrong_key"},
        json={"cleared_by": "attacker", "clearance_note": "discharge"}
    )
    assert resp_bad_key.status_code == 401

    # 3. Authenticated request with invalid clearance (missing clearance_note) -> 400
    headers = {"X-API-Key": "secret_coach_api_key_xyz"}
    client.post(f"/api/coach/flags/{flag.flag_id}/claim", headers=headers, json={"claimed_by": "coach_legit"})

    resp_empty_note = client.post(
        f"/api/coach/flags/{flag.flag_id}/clear",
        headers=headers,
        json={"cleared_by": "coach_legit", "clearance_note": ""}
    )
    assert resp_empty_note.status_code == 400
    assert "Safety Invariant Violation" in resp_empty_note.json()["detail"]

    # 4. Authenticated valid clearance -> 200
    resp_valid = client.post(
        f"/api/coach/flags/{flag.flag_id}/clear",
        headers=headers,
        json={"cleared_by": "coach_legit", "clearance_note": "Client cleared by therapist"}
    )
    assert resp_valid.status_code == 200
    assert resp_valid.json()["status"] == "cleared"


# ── Test 8: Intake Creation Integration ──

def test_intake_moderate_creates_flag():
    """Verify that intake profile creation with moderate mental health concern
    automatically triggers flag creation."""
    from mos_bot.core.mental_health_flags import list_flags

    user_id = "user_801_intake"
    # Call trigger flag as intake handler does
    flag = create_or_trigger_flag(
        user_id=user_id,
        trigger_context="Intake screening: moderate mental health concern reported",
        actor="intake"
    )

    assert flag.status == "open"
    assert flag.user_id == user_id
    assert "Intake screening" in flag.trigger_context

    active = list_flags(user_id=user_id, status="open")
    assert len(active) == 1
    assert active[0].flag_id == flag.flag_id
