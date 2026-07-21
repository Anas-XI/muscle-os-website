"""Test tracker web endpoints — POST /api/tracker/log, GET tracker endpoints."""

import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from mos_bot.web.app import app
from mos_bot.config import DATA_ROOT
from mos_bot.core.tracker_renderer import TRACKERS_DIR, generate_tracker_file
from mos_bot.core.models import ClientProfile, ProgramContent
from tests.test_tracker_renderer import _make_test_pc

client = TestClient(app)

TRACKER_LOGS_DIR = os.path.join(DATA_ROOT, "tracker_logs")


def setup_module():
    os.makedirs(TRACKER_LOGS_DIR, exist_ok=True)
    os.makedirs(TRACKERS_DIR, exist_ok=True)


def teardown_module():
    for f in os.listdir(TRACKER_LOGS_DIR):
        os.remove(os.path.join(TRACKER_LOGS_DIR, f))
    for f in os.listdir(TRACKERS_DIR):
        if f.endswith(".html"):
            os.remove(os.path.join(TRACKERS_DIR, f))


def test_get_tracker_html_not_found():
    resp = client.get("/tracker/no_such_user")
    assert resp.status_code == 404


def test_get_tracker_html_found():
    pc = _make_test_pc(user_id="web_tracker_test")
    generate_tracker_file(pc, "web_tracker_test")
    resp = client.get("/tracker/web_tracker_test")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/html; charset=utf-8"
    assert "Today's Workout" in resp.text


def test_submit_tracker_log():
    payload = {
        "user_id": "log_test_user",
        "name": "Test User",
        "exported_at": "2026-07-18T12:00:00",
        "workouts": [
            {
                "date": "2026-07-18",
                "session": "Upper A",
                "phase": "Phase 1",
                "sets": [
                    {"exercise": "Bench Press", "set": 1, "kg": 80, "reps": 10, "rpe": 8},
                ],
            }
        ],
        "checkins": [
            {"date": "2026-07-18", "weight_kg": 84.5, "sleep_hours": 7.5, "readiness": 7},
        ],
    }
    resp = client.post("/api/tracker/log", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["workouts"] == 1
    assert data["checkins"] == 1


def test_submit_tracker_log_missing_user_id():
    resp = client.post("/api/tracker/log", json={"workouts": []})
    assert resp.status_code == 400


def test_get_tracker_logs():
    payload = {
        "user_id": "list_logs_user",
        "name": "List Test",
        "exported_at": "2026-07-18T12:00:00",
        "workouts": [],
        "checkins": [],
    }
    client.post("/api/tracker/log", json=payload)
    resp = client.get("/api/tracker/list_logs_user/logs")
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1
    assert logs[0]["filename"].startswith("list_logs_user_")


def test_get_tracker_log_detail():
    payload = {
        "user_id": "detail_log_user",
        "name": "Detail Test",
        "exported_at": "2026-07-18T12:00:00",
        "workouts": [{"test": "data"}],
        "checkins": [],
    }
    post_resp = client.post("/api/tracker/log", json=payload)
    filename = post_resp.json()["file"]
    resp = client.get(f"/api/tracker/detail_log_user/logs/{filename}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == "detail_log_user"
    assert data["workouts"][0]["test"] == "data"


def test_get_tracker_log_detail_not_found():
    resp = client.get("/api/tracker/any_user/logs/nonexistent.json")
    assert resp.status_code == 404
