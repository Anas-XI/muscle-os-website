"""Muscle OS AI Coach Intelligence Engine.

Integrates:
- Google Gemini API (2.0 / 1.5 Flash & Pro) with streaming & non-streaming support
- Vault Semantic RAG & Knowledge Graph Context (1,563 research chunks)
- User Profile, Clinical Safety Gating & Injury Triage
- Active Program & Workout Tracker Telemetry
- Multi-turn Chat History Persistence
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional, Any

import requests

from mos_bot.config import (
    DATA_ROOT,
    LLM_API_KEY,
    LLM_API_URL,
    LLM_MODEL,
    PROGRAMS_DIR,
    CHAT_HISTORY_DIR,
)
from mos_bot.core.intake_builder import load_profile, load_supplemental
from mos_bot.web.auth import sanitize_user_id, safe_resolve_path

logger = logging.getLogger("mos_intelligence")

COACH_BASE_PERSONA = (
    "You are Muscle OS Coach, an elite AI fitness and nutrition coach built strictly on "
    "exercise science (Brad Schoenfeld, Jeff Nippard, Mike Israetel, NSCA, ACE, and ISSA research).\n\n"
    "Coaching Guidelines:\n"
    "1. Keep responses clear, actionable, evidence-based, and concise (under 300 words unless detail is requested).\n"
    "2. When suggesting exercise substitutions, match the primary muscle mechanical tension curve and factor in user injuries.\n"
    "3. Use RPE (Rate of Perceived Exertion) and RIR (Reps in Reserve) principles.\n"
    "4. Prioritize safety and recovery over arbitrary volume increases."
)


def _ensure_history_dir():
    os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)


def get_chat_history(user_id: str, limit: int = 20) -> List[Dict[str, str]]:
    """Retrieve persisted conversation history for a user."""
    _ensure_history_dir()
    clean_id = sanitize_user_id(user_id)
    history_file = safe_resolve_path(CHAT_HISTORY_DIR, f"{clean_id}.json")
    if not os.path.exists(history_file):
        return []
    try:
        data = json.loads(Path(history_file).read_text(encoding="utf-8"))
        messages = data.get("messages", [])
        return messages[-limit:]
    except Exception as e:
        logger.warning(f"Failed to read chat history for {clean_id}: {e}")
        return []


def save_chat_message(user_id: str, role: str, content: str):
    """Append a user or assistant message to persistent chat history."""
    _ensure_history_dir()
    clean_id = sanitize_user_id(user_id)
    history_file = safe_resolve_path(CHAT_HISTORY_DIR, f"{clean_id}.json")
    
    history_data = {"user_id": clean_id, "messages": [], "updated_at": datetime.now().isoformat()}
    if os.path.exists(history_file):
        try:
            history_data = json.loads(Path(history_file).read_text(encoding="utf-8"))
        except Exception:
            pass

    history_data["messages"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat(),
    })
    # Keep up to 100 recent turns
    if len(history_data["messages"]) > 100:
        history_data["messages"] = history_data["messages"][-100:]
    history_data["updated_at"] = datetime.now().isoformat()

    try:
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save chat message for {clean_id}: {e}")


def _get_vault_context(query: str, profile: Optional[Dict[str, Any]]) -> str:
    """Retrieve relevant scientific vault chunks based on query and user profile."""
    try:
        from mos_bot.core.vault_rag import VaultIndexer, INDEX_DIR
        index_file = INDEX_DIR / "faiss_index.bin"
        chunks_file = INDEX_DIR / "chunks.pkl"
        if index_file.exists() and chunks_file.exists():
            indexer = VaultIndexer()
            indexer.load(INDEX_DIR)
            results = indexer.search(query, k=3)
            if results:
                chunks_text = []
                for chunk, score in results:
                    chunks_text.append(f"[{chunk.section_title}] (Score: {score:.2f}):\n{chunk.content[:400]}")
                return "\n\n".join(chunks_text)
    except Exception as e:
        logger.debug(f"Vault RAG search skipped: {e}")

    # Fallback to rule-based vault context if available
    try:
        from mos_bot.core.vault_context import get_vault_context
        if profile:
            return get_vault_context(profile) or ""
    except Exception:
        pass
    return ""


def build_coach_system_prompt(user_id: str, query: str = "") -> str:
    """Assemble dynamic system prompt combining Profile, Safety, Active Program, and Vault RAG."""
    clean_id = sanitize_user_id(user_id)
    profile = load_profile(clean_id)
    supplemental = load_supplemental(clean_id)

    sections = [COACH_BASE_PERSONA]

    # 1. User Profile Section
    if profile:
        profile_lines = [
            f"- Goal: {profile.get('goal', 'Hypertrophy')}",
            f"- Experience: {profile.get('situation', 'Intermediate')} ({profile.get('experience_years', '2')} years)",
            f"- Bodyweight: {profile.get('bodyweight_kg', 75)} kg | Height: {profile.get('height_cm', 175)} cm | Age: {profile.get('age', 25)}",
            f"- Training Split: {profile.get('current_split', 'PPL')} ({profile.get('training_days', 4)} days/wk, {profile.get('session_length_min', 60)} min/session)",
            f"- Daily Steps: {profile.get('daily_steps', 7500)} | Sleep: {profile.get('sleep_hours', 7.5)} hrs | Stress: {profile.get('stress_level', 5)}/10",
        ]
        sections.append("## User Profile\n" + "\n".join(profile_lines))

    # 2. Clinical Safety & Injury Gating
    safety_lines = []
    injuries = profile.get("injuries", []) if profile else []
    if supplemental and "injuries" in supplemental:
        injuries = list(set(injuries + supplemental.get("injuries", [])))
    if injuries:
        safety_lines.append(f"- Active Injuries: {', '.join(injuries)}")

    medical = profile.get("medical", []) if profile else []
    if medical:
        safety_lines.append(f"- Medical Considerations: {', '.join(medical)}")

    if supplemental:
        if supplemental.get("mental_health_concern") in ("moderate", "significant"):
            safety_lines.append(f"- Mental Health Concern: {supplemental['mental_health_concern']}")
        if supplemental.get("known_deficiencies"):
            safety_lines.append(f"- Nutrient Deficiencies: {', '.join(supplemental['known_deficiencies'])}")

    if safety_lines:
        sections.append(
            "## Safety & Clinical Flags (Strict Priority)\n"
            + "\n".join(safety_lines)
            + "\n*Instruction:* Never prescribe exercises that aggravate listed injuries. Provide joint-friendly alternatives."
        )

    # 3. Active Program Telemetry
    progs_dir = Path(PROGRAMS_DIR)
    if progs_dir.exists():
        recent_progs = sorted(progs_dir.glob(f"{clean_id}*"), reverse=True)
        if recent_progs:
            try:
                prog_content = recent_progs[0].read_text(encoding="utf-8")
                sections.append(f"## Current Active Program (Summary)\n{prog_content[:1500]}")
            except Exception:
                pass

    # 4. Semantic Vault RAG Citations
    vault_ctx = _get_vault_context(query or (profile.get("goal", "hypertrophy") if profile else "hypertrophy"), profile)
    if vault_ctx:
        sections.append(f"## Evidence-Based Vault Citations\n{vault_ctx[:1500]}")

    return "\n\n".join(sections)


def _call_gemini_api_sync(messages: List[Dict[str, str]], model: str = "") -> Optional[str]:
    """Synchronous OpenAI-compatible call to Google Gemini."""
    if not LLM_API_KEY or not LLM_API_URL:
        return None

    use_model = model or LLM_MODEL or "gemini-2.0-flash"
    url = f"{LLM_API_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": use_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 1024,
        "stream": False,
    }

    try:
        r = requests.post(url, headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]
    except Exception as exc:
        logger.error(f"Gemini API request failed: {exc}")
        return None


async def generate_coach_response(user_id: str, message: str, model: str = "") -> str:
    """Generate a non-blocking AI coach response with full context assembly and history."""
    clean_id = sanitize_user_id(user_id)
    system_prompt = build_coach_system_prompt(clean_id, message)
    history = get_chat_history(clean_id, limit=10)

    # Assemble messages payload
    api_messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        api_messages.append({"role": turn["role"], "content": turn["content"]})
    api_messages.append({"role": "user", "content": message})

    # Execute async call
    response_text = await asyncio.to_thread(_call_gemini_api_sync, api_messages, model)
    if not response_text:
        response_text = (
            "I am currently having trouble connecting to the coaching intelligence engine. "
            "Please check your API key configuration or try again in a moment."
        )

    # Persist turns
    save_chat_message(clean_id, "user", message)
    save_chat_message(clean_id, "assistant", response_text)

    return response_text


async def stream_coach_response(user_id: str, message: str, model: str = "") -> AsyncGenerator[str, None]:
    """Stream real-time tokens from Gemini API for instant chat UX."""
    clean_id = sanitize_user_id(user_id)
    system_prompt = build_coach_system_prompt(clean_id, message)
    history = get_chat_history(clean_id, limit=10)

    api_messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        api_messages.append({"role": turn["role"], "content": turn["content"]})
    api_messages.append({"role": "user", "content": message})

    use_model = model or LLM_MODEL or "gemini-2.0-flash"
    url = f"{LLM_API_URL.rstrip('/')}/chat/completions" if LLM_API_URL else ""
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": use_model,
        "messages": api_messages,
        "temperature": 0.4,
        "max_tokens": 1024,
        "stream": True,
    }

    save_chat_message(clean_id, "user", message)
    full_response = []

    if not LLM_API_KEY or not url:
        fallback = "AI Coach intelligence backend is not currently configured with an API key."
        yield fallback
        save_chat_message(clean_id, "assistant", fallback)
        return

    import json as json_lib

    def _sync_stream():
        try:
            with requests.post(url, headers=headers, json=payload, stream=True, timeout=60) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if line:
                        decoded = line.decode("utf-8").strip()
                        if decoded.startswith("data: "):
                            chunk_str = decoded[6:]
                            if chunk_str == "[DONE]":
                                break
                            try:
                                chunk_json = json_lib.loads(chunk_str)
                                delta = chunk_json["choices"][0].get("delta", {})
                                token = delta.get("content", "")
                                if token:
                                    yield token
                            except Exception:
                                pass
        except Exception as exc:
            logger.error(f"Streaming error: {exc}")
            yield f"\n[Error: {exc}]"

    loop = asyncio.get_event_loop()
    stream_iter = _sync_stream()

    while True:
        token = await asyncio.to_thread(next, stream_iter, None)
        if token is None:
            break
        full_response.append(token)
        yield token

    assembled = "".join(full_response)
    if assembled:
        save_chat_message(clean_id, "assistant", assembled)
