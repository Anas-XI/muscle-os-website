"""Security test suite for Muscle OS Web API and Core Components.

Verifies:
1. API Key Authentication enforcement and constant-time validation.
2. Path traversal rejection across user_id, filename, and router endpoints.
3. Safe filesystem boundary resolution.
4. IDOR / Coach router authentication protection.
"""

import sys
import os
import pytest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_bot"))

from mos_bot.web.app import app
from mos_bot.web.auth import sanitize_user_id, safe_resolve_path, require_api_key

client = TestClient(app)


class TestInputSanitization:
    """Test path traversal and special character sanitization."""

    def test_valid_user_ids(self):
        valid_ids = ["user123", "john_doe", "client-45", "test.user.1"]
        for uid in valid_ids:
            assert sanitize_user_id(uid) == uid

    def test_path_traversal_user_ids_rejected(self):
        invalid_ids = [
            "../../etc/passwd",
            "..\\windows\\system32",
            "user/subdir",
            "user\\subdir",
            "../secret",
            "",
            "user with spaces",
            "user$special#chars",
            "a" * 65,  # Exceeds max length
        ]
        for uid in invalid_ids:
            with pytest.raises(HTTPException) as exc_info:
                sanitize_user_id(uid)
            assert exc_info.value.status_code == 400

    def test_safe_resolve_path(self, tmp_path):
        base = tmp_path / "sandbox"
        base.mkdir()
        valid_file = base / "valid.json"
        valid_file.write_text("{}", encoding="utf-8")

        resolved = safe_resolve_path(base, "valid.json")
        assert resolved == valid_file.resolve()

        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_path(base, "../escaped.txt")
        assert exc_info.value.status_code == 400


class TestAPIKeyAuthentication:
    """Test API Key verification and authorization enforcement."""

    def test_auth_enforced_when_key_configured(self):
        with patch.dict(os.environ, {"MOS_API_KEY": "secret-test-key-12345", "MOS_ENV": "production"}):
            # Missing key -> 401
            resp = client.get("/api/profiles")
            assert resp.status_code == 401

            # Invalid key -> 401
            resp = client.get("/api/profiles", headers={"X-API-Key": "wrong-key"})
            assert resp.status_code == 401

            # Valid key -> 200
            resp = client.get("/api/profiles", headers={"X-API-Key": "secret-test-key-12345"})
            assert resp.status_code == 200

    def test_coach_router_protected_by_api_key(self):
        with patch.dict(os.environ, {"MOS_API_KEY": "coach-secret-key", "MOS_ENV": "production"}):
            # Coach drafts endpoint without key -> 401
            resp = client.get("/api/coach/drafts")
            assert resp.status_code == 401

            # Coach stats endpoint without key -> 401
            resp = client.get("/api/coach/stats")
            assert resp.status_code == 401

            # Coach draft detail without key -> 401
            resp = client.get("/api/coach/draft/sample_draft")
            assert resp.status_code == 401

            # With valid key -> succeeds
            resp = client.get("/api/coach/drafts", headers={"X-API-Key": "coach-secret-key"})
            assert resp.status_code == 200


class TestWebEndpointSecurity:
    """Test endpoint path traversal attack vectors."""

    def test_tracker_invalid_user_id_blocked(self):
        resp = client.get("/tracker/invalid%20user%20id")
        assert resp.status_code == 400

    def test_supplemental_invalid_user_id_blocked(self):
        resp = client.get("/supplemental/invalid%24user")
        assert resp.status_code == 400

    def test_tracker_log_path_traversal_in_body_blocked(self):
        resp = client.post("/api/tracker/log", json={"user_id": "../../etc/passwd"})
        assert resp.status_code == 400

    def test_api_profile_invalid_user_id_blocked(self):
        resp = client.get("/api/profile/invalid%20id")
        assert resp.status_code == 400
