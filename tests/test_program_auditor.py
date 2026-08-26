"""Tests for Scientific Program Auditor Engine."""

import pytest
from fastapi.testclient import TestClient

from mos_bot.core.program_auditor import audit_user_program, ProgramAuditReport
from mos_bot.core.intake_builder import save_profile
from mos_bot.core.coach_actions import _get_programs_json_path, execute_coach_action
from mos_bot.web.app import app

client = TestClient(app)
AUDIT_USER = "audit_unit_tester"


@pytest.fixture(autouse=True)
def setup_audit_user():
    json_path = _get_programs_json_path(AUDIT_USER)
    if json_path.exists():
        try: json_path.unlink()
        except Exception: pass

    profile = {
        "user_id": AUDIT_USER,
        "name": "Audit Athlete",
        "goal": "hypertrophy",
        "current_split": "PPL",
        "bodyweight_kg": 80.0,
        "height_cm": 180.0,
        "age": 28,
        "injuries": [],
        "inbody": {
            "weight_kg": 80.0,
            "smm_kg": 40.5,
            "pbf_pct": 14.2,
            "visceral_fat_level": 5
        }
    }
    save_profile(profile)
    yield
    if json_path.exists():
        try: json_path.unlink()
        except Exception: pass


class TestProgramAuditor:
    def test_audit_baseline_program(self):
        report = audit_user_program(AUDIT_USER)
        assert isinstance(report, ProgramAuditReport)
        assert report.user_id == AUDIT_USER
        assert report.scientific_validity_score >= 65
        assert len(report.muscle_volume_breakdown) >= 8

    def test_audit_injury_detection_penalty(self):
        # Add shoulder impingement to profile
        profile = {
            "user_id": AUDIT_USER,
            "name": "Audit Athlete",
            "goal": "hypertrophy",
            "injuries": ["Shoulder Impingement"],
            "bodyweight_kg": 80.0
        }
        save_profile(profile)

        report = audit_user_program(AUDIT_USER)
        critical_findings = [f for f in report.findings if f.severity == "critical" and "Shoulder" in f.title or "Contraindicated" in f.title]
        assert len(critical_findings) >= 1

    def test_audit_protein_insufficiency_flag(self):
        # Lower protein to 60g (0.75 g/kg)
        execute_coach_action(AUDIT_USER, "update_nutrition_plan", {
            "calories_target": 2000,
            "protein_g": 60,
            "carbs_g": 250,
            "fat_g": 60
        })

        report = audit_user_program(AUDIT_USER)
        protein_flags = [f for f in report.findings if "Protein" in f.title and f.severity == "critical"]
        assert len(protein_flags) >= 1

    def test_api_program_audit_endpoint(self):
        resp = client.post("/api/intelligence/program/audit", json={
            "user_id": AUDIT_USER
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == AUDIT_USER
        assert "scientific_validity_score" in data
        assert "muscle_volume_breakdown" in data
        assert isinstance(data["findings"], list)
