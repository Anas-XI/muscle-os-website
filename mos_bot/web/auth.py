"""Authentication, authorization, and input sanitization helpers for Muscle OS Web API."""

import os
import re
import secrets
from pathlib import Path
from fastapi import HTTPException, Header

USER_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{1,64}$")


def get_api_key() -> str:
    return os.environ.get("MOS_API_KEY", "")


def sanitize_user_id(user_id: str) -> str:
    """Validate and sanitize user_id against path traversal and special characters."""
    if not user_id or not USER_ID_REGEX.match(user_id) or ".." in user_id or "/" in user_id or "\\" in user_id:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    return Path(user_id).name


def safe_resolve_path(base_dir: str | Path, filename: str) -> Path:
    """Safely resolve a target filename within a base directory, preventing path traversal."""
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Path traversal attempt detected")
    return target


async def require_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Require valid API key for protected endpoints with constant-time comparison."""
    mos_api_key = get_api_key()
    mos_env = os.environ.get("MOS_ENV", "").lower()
    
    # If no key is set and in test/local dev without production env, allow
    if not mos_api_key:
        if mos_env == "test" or not mos_env:
            return
        raise HTTPException(status_code=500, detail="Server authentication misconfigured (MOS_API_KEY required)")
    
    if not x_api_key or not secrets.compare_digest(x_api_key, mos_api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
