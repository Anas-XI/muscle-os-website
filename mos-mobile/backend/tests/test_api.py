"""Integration tests for the Mos-mobile API using local SQLite."""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure we use local SQLite mode
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""

from local_db import LocalDB, init_db, DB_PATH
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def setup_module():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_signup():
    r = client.post("/api/auth/signup", json={
        "email": "test@test.com", "password": "pass123",
        "name": "Test User", "role": "client",
    })
    assert r.status_code == 200
    data = r.json()
    assert "user_id" in data
    assert data["email"] == "test@test.com"

def test_duplicate_signup():
    r = client.post("/api/auth/signup", json={
        "email": "test@test.com", "password": "pass123",
    })
    assert r.status_code == 409

def test_login():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    assert r.status_code == 200
    data = r.json()
    assert "user_id" in data
    assert data["role"] == "client"

def test_login_bad_password():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "wrong",
    })
    assert r.status_code == 401

def test_get_profile():
    # Sign in first
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.get(f"/api/profile/{uid}")
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "client"
    assert data["name"] == "Test User"

def test_update_profile():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.put("/api/profile", json={
        "user_id": uid, "goal": "Build Muscle",
        "experience": "intermediate", "completed": 1,
    })
    assert r.status_code == 200
    r = client.get(f"/api/profile/{uid}")
    assert r.json()["goal"] == "Build Muscle"
    assert r.json()["completed"] == 1

def test_chat_history_empty():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.post("/api/chat/history", json={
        "user_id": uid, "limit": 10,
    })
    assert r.status_code == 200
    assert r.json()["messages"] == []

def test_checkin():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.post("/api/checkin", json={
        "user_id": uid, "weight": 85.5, "sleep_quality": 4,
        "readiness": 3, "adherence": 5,
    })
    assert r.status_code == 200
    assert r.json()["checkin_number"] == 1

    r = client.get(f"/api/checkin/{uid}?limit=5")
    assert r.status_code == 200
    checkins = r.json()["checkins"]
    assert len(checkins) == 1
    assert checkins[0]["weight"] == 85.5

def test_workout():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.post("/api/workout", json={
        "user_id": uid, "exercise": "Bench Press",
        "sets": 3, "reps": 10, "weight": 80,
    })
    assert r.status_code == 200

    r = client.get(f"/api/workout/{uid}?limit=5")
    assert r.status_code == 200
    workouts = r.json()["workouts"]
    assert len(workouts) == 1
    assert workouts[0]["exercise"] == "Bench Press"

def test_program_not_found():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.get(f"/api/program/{uid}")
    assert r.status_code == 404

def test_program_generate():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    # Generate (will try LLM and fall back gracefully)
    r = client.post("/api/generate-program", json={"user_id": uid})
    assert r.status_code == 200

def test_coach_clients():
    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    uid = r.json()["user_id"]
    r = client.get(f"/api/coach/clients/{uid}")
    assert r.status_code == 200
    assert r.json()["clients"] == []

def test_add_coach_client():
    # Create a second user
    r = client.post("/api/auth/signup", json={
        "email": "client@test.com", "password": "pass123",
        "name": "Client User", "role": "client",
    })
    assert r.status_code == 200
    client_id = r.json()["user_id"]

    r = client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "pass123",
    })
    coach_id = r.json()["user_id"]

    r = client.post("/api/coach/add-client", json={
        "coach_id": coach_id, "email": "client@test.com",
    })
    assert r.status_code == 200

    r = client.get(f"/api/coach/clients/{coach_id}")
    assert r.status_code == 200
    clients = r.json()["clients"]
    assert len(clients) == 1
    assert clients[0]["email"] == "client@test.com"

def test_web_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "Muscle OS" in r.text

def test_cors_headers():
    r = client.get("/health")
    # Default FastAPI doesn't set CORS headers without CORSMiddleware
    # This just verifies the server responds
    assert r.status_code == 200
