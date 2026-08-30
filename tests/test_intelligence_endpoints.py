"""FastAPI TestClient tests for all 9 Apex Intelligence Endpoints."""

import pytest
from fastapi.testclient import TestClient
from mos_bot.web.app import app

client = TestClient(app)


class TestIntelligenceEndpoints:
    def test_api_1rm_endpoint(self):
        resp = client.post("/api/intelligence/1rm", json={
            "weight_kg": 100.0,
            "reps": 5,
            "rir": 1,
            "bodyweight_kg": 80.0,
            "gender": "male",
            "lift": "bench_press"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "estimated_1rm" in data
        assert "strength_standard" in data
        assert data["estimated_1rm"]["estimated_1rm_kg"] > 110.0

    def test_api_substitute_endpoint(self):
        resp = client.post("/api/intelligence/substitute", json={
            "exercise_name": "Barbell Bench Press",
            "active_injuries": ["Shoulder Impingement"]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["substitutions"]) >= 1

    def test_api_macros_endpoint(self):
        resp = client.post("/api/intelligence/macros", json={
            "weight_kg": 80.0,
            "height_cm": 180.0,
            "age": 25,
            "gender": "male",
            "activity_level": "moderately_active",
            "goal": "hypertrophy"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["energy_expenditure"]["tdee_kcal"] > 2000
        assert data["macro_split"]["protein_g"] > 100

    def test_api_supplements_endpoint(self):
        resp = client.post("/api/intelligence/supplements", json={
            "supplements": ["Creatine", "Whey Protein", "Caffeine"],
            "bedtime_hour": 22
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier_summary"]["Tier 1"] >= 2

    def test_api_circadian_endpoint(self):
        resp = client.post("/api/intelligence/circadian", json={
            "wake_time": "06:30",
            "sleep_time": "22:30",
            "is_night_shift": False
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "caffeine_cutoff_time" in data

    def test_api_cardio_endpoint(self):
        resp = client.post("/api/intelligence/cardio", json={
            "age": 28,
            "goal": "fat_loss"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["weekly_zone2_minutes"] == 180

    def test_api_posture_endpoint(self):
        resp = client.post("/api/intelligence/posture", json={
            "deviation": "upper_crossed"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "Upper Crossed" in data["syndrome_name"]

    def test_api_female_cycle_endpoint(self):
        resp = client.post("/api/intelligence/female-cycle", json={
            "cycle_day": 10
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "Ovulation" in data["phase_name"]

    def test_api_plant_protein_endpoint(self):
        resp = client.post("/api/intelligence/plant-protein", json={
            "base_protein_g": 140.0,
            "diet_type": "vegan"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["plant_adjusted_target_g"] == 168.0
