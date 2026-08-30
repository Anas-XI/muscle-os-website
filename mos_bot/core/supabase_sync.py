"""
SupabaseSync — Telegram Bot cross-channel sync module
Writes intake and check-in data to Supabase when user has a linked account.
Fail-silently: the bot works perfectly without Supabase being reachable.
"""
import os
import asyncio
import logging
from datetime import date as date_type

import httpx

log = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


def _headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }


async def _get(path: str, params: dict = None) -> list | None:
    if not _is_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/{path}",
                params=params,
                headers=_headers(),
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        log.debug("SupabaseSync GET %s failed: %s", path, e)
        return None


async def _upsert(table: str, payload: dict) -> bool:
    if not _is_configured():
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/{table}",
                json=payload,
                headers=_headers(),
            )
            r.raise_for_status()
            return True
    except Exception as e:
        log.debug("SupabaseSync UPSERT %s failed: %s", table, e)
        return False


# ── Identity bridge ────────────────────────────────────────────────────────


async def get_supabase_user_id(telegram_id: int) -> str | None:
    """Look up the Supabase user_id linked to a Telegram ID."""
    rows = await _get(
        "telegram_links",
        {"telegram_id": f"eq.{telegram_id}", "select": "user_id"},
    )
    if rows:
        return rows[0].get("user_id")
    return None


async def link_telegram(telegram_id: int, user_id: str) -> bool:
    """Store a telegram_id → supabase user_id mapping (called via /link web flow)."""
    return await _upsert(
        "telegram_links",
        {"telegram_id": telegram_id, "user_id": user_id},
    )


# ── Data push functions ────────────────────────────────────────────────────


async def push_profile(telegram_id: int, profile: dict) -> bool:
    """Push the full ClientProfile dict to Supabase user_profiles (if linked)."""
    user_id = await get_supabase_user_id(telegram_id)
    if not user_id:
        return False
    return await _upsert(
        "user_profiles",
        {
            "id": user_id,
            "intake": profile,
            "goal": profile.get("goal", ""),
            "experience": str(profile.get("experience_years", "")),
            "bodyweight_kg": profile.get("bodyweight_kg"),
        },
    )


async def push_measurement(
    telegram_id: int,
    weight_kg: float,
    date: str | None = None,
    body_fat: float | None = None,
) -> bool:
    """Push a bodyweight check-in to mos_measurements."""
    user_id = await get_supabase_user_id(telegram_id)
    if not user_id:
        return False
    payload = {
        "user_id": user_id,
        "date": date or str(date_type.today()),
        "weight": weight_kg,
    }
    if body_fat is not None:
        payload["body_fat"] = body_fat
    return await _upsert("mos_measurements", payload)


async def push_gut_health(
    telegram_id: int,
    date: str,
    comfort_level: int,
    bloating: bool = False,
    notes: str = "",
) -> bool:
    """Push a gut-health log to mos_gut_health."""
    user_id = await get_supabase_user_id(telegram_id)
    if not user_id:
        return False
    return await _upsert(
        "mos_gut_health",
        {
            "user_id": user_id,
            "date": date,
            "comfort_level": max(1, min(5, comfort_level)),
            "bloating": bloating,
            "notes": notes,
        },
    )


# ── Convenience fire-and-forget wrapper ───────────────────────────────────


def fire_push_profile(telegram_id: int, profile: dict) -> None:
    """Non-blocking push — call this after saving a profile to disk."""
    asyncio.ensure_future(push_profile(telegram_id, profile))


def fire_push_measurement(telegram_id: int, weight_kg: float, date: str = None) -> None:
    """Non-blocking measurement push — call this after a check-in save."""
    asyncio.ensure_future(push_measurement(telegram_id, weight_kg, date))
