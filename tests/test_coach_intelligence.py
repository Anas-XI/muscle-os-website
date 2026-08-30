"""Unit tests for Muscle OS AI Coach Intelligence Engine and Gemini integration."""

import sys
import os
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

from mos_bot.web.app import app
from mos_bot.core.coach_intelligence import (
    build_coach_system_prompt,
    get_chat_history,
    save_chat_message,
    generate_coach_response,
    _call_gemini_api_sync,
)
from mos_bot.core.intake_builder import save_profile

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_data(tmp_path):
    """Setup clean temporary profile for testing."""
    profile = {
        "user_id": "gemini_tester_01",
        "name": "Alex Gemini",
        "goal": "Hypertrophy",
        "situation": "Intermediate",
        "experience_years": 3.5,
        "bodyweight_kg": "82.5",
        "height_cm": "180.0",
        "age": 28,
        "current_split": "PPL",
        "training_days": 5,
        "injuries": ["left shoulder impingement"],
        "medical": ["asthma"],
        "sleep_hours": 8.0,
        "stress_level": 4,
        "daily_steps": 10000,
    }
    save_profile(profile)


class TestCoachIntelligencePromptAssembly:
    """Test dynamic context assembly for the AI Coach."""

    def test_prompt_includes_persona_and_profile(self):
        prompt = build_coach_system_prompt("gemini_tester_01", "How do I bench press safely?")
        assert "Muscle OS Coach" in prompt
        assert "Alex Gemini" in prompt or "82.5" in prompt
        assert "Hypertrophy" in prompt

    def test_prompt_includes_safety_flags(self):
        prompt = build_coach_system_prompt("gemini_tester_01", "Shoulder exercises")
        assert "Safety & Clinical Flags" in prompt
        assert "left shoulder impingement" in prompt
        assert "asthma" in prompt


class TestChatHistoryPersistence:
    """Test conversation history saving and retrieval."""

    def test_save_and_retrieve_history(self):
        uid = "history_tester_01"
        save_chat_message(uid, "user", "What is MEV for chest?")
        save_chat_message(uid, "assistant", "MEV for chest is typically 8-10 direct sets per week.")

        history = get_chat_history(uid, limit=10)
        assert len(history) >= 2
        assert history[-2]["role"] == "user"
        assert "MEV for chest" in history[-2]["content"]
        assert history[-1]["role"] == "assistant"
        assert "8-10 direct sets" in history[-1]["content"]


class TestGeminiAPICall:
    """Test Gemini API request formatting and mock execution."""

    @patch("requests.post")
    def test_call_gemini_api_sync_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "For hypertrophy, train in the 6-12 rep range at RIR 1-3."}}]
        }
        mock_post.return_value = mock_response

        messages = [{"role": "user", "content": "Best rep range?"}]
        with patch.dict(os.environ, {"LLM_API_KEY": "fake-gemini-key", "LLM_API_URL": "https://test.api"}):
            resp = _call_gemini_api_sync(messages)
            assert "For hypertrophy" in resp
            assert mock_post.called

    @patch("mos_bot.core.coach_intelligence._call_gemini_api_sync")
    @pytest.mark.asyncio
    async def test_generate_coach_response(self, mock_gemini):
        mock_gemini.return_value = "Substitute Barbell Bench with Incline Dumbbell Press to protect your shoulder."
        resp = await generate_coach_response("gemini_tester_01", "My shoulder hurts on bench press.")
        assert "Incline Dumbbell Press" in resp

        history = get_chat_history("gemini_tester_01")
        assert len(history) >= 2
        assert history[-1]["content"] == resp


class TestWebChatEndpoints:
    """Test FastAPI chat endpoints."""

    @patch("mos_bot.core.coach_intelligence._call_gemini_api_sync")
    def test_api_chat_endpoint(self, mock_gemini):
        mock_gemini.return_value = "Keep sleep above 7.5 hours for optimal muscle protein synthesis."
        payload = {
            "user_id": "gemini_tester_01",
            "message": "How does sleep affect muscle growth?",
        }
        resp = client.post("/api/chat", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert "7.5 hours" in data["response"]

    def test_api_chat_history_endpoint(self):
        resp = client.get("/api/chat/gemini_tester_01/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "gemini_tester_01"
        assert isinstance(data["messages"], list)
