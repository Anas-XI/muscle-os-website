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
    "4. Prioritize safety and recovery over arbitrary volume increases.\n\n"
    "Program & Diet Modification Powers:\n"
    "You have full authority to modify the athlete's active training program and diet plan! "
    "When the athlete requests or agrees to modify an exercise, workout split, calorie/macro target, or logs an injury, "
    "confirm the update and append a structured action block at the very end of your response:\n"
    "```coach_action\n"
    "{\n"
    '  "action": "swap_exercise" | "add_exercise" | "remove_exercise" | "modify_exercise" | "update_nutrition_plan" | "log_injury_and_override",\n'
    '  "params": { ... }\n'
    "}\n"
    "```\n"
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
    """Retrieve relevant scientific vault chunks and GraphRAG subgraphs based on query."""
    chunks_text = []
    try:
        from mos_bot.core.vault_rag import VaultIndexer, INDEX_DIR
        index_file = INDEX_DIR / "faiss_index.bin"
        chunks_file = INDEX_DIR / "chunks.pkl"
        if index_file.exists() and chunks_file.exists():
            indexer = VaultIndexer()
            indexer.load_index(INDEX_DIR)
            results = indexer.search(query, top_k=3)
            if results:
                for chunk, score in results:
                    pillar_label = f", Pillar: {chunk.pillar}" if chunk.pillar else ""
                    chunks_text.append(f"[{chunk.section_title}] (Score: {score:.2f}{pillar_label}):\n{chunk.content[:500]}")
    except Exception as e:
        logger.warning(f"Vault RAG search error: {e}")

    # GraphRAG v2 Subgraph Expansion
    try:
        from mos_bot.core.vault_graph import INDEX_DIR as GRAPH_INDEX_DIR
        import pickle
        graph_file = GRAPH_INDEX_DIR / "vault_graph.pkl"
        if graph_file.exists():
            with open(graph_file, "rb") as f:
                g = pickle.load(f)
            subgraph = g.get_community_subgraph(query, max_nodes=4)
            if subgraph:
                graph_lines = [f"- {n['label']} ({n.get('pillar', 'General')}): via {n['reason']}" for n in subgraph]
                chunks_text.append("### Connected Vault Concepts (GraphRAG v2):\n" + "\n".join(graph_lines))
    except Exception as e:
        logger.warning(f"GraphRAG subgraph error: {e}")

    if chunks_text:
        return "\n\n".join(chunks_text)

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
        name_val = profile.get("name", "Athlete")
        bw_val = profile.get("bodyweight_kg", 75)
        profile_lines = [
            f"- Name: {name_val}",
            f"- Goal: {profile.get('goal', 'Hypertrophy')}",
            f"- Experience: {profile.get('situation', 'Intermediate')} ({profile.get('experience_years', '2')} years)",
            f"- Bodyweight: {bw_val} kg | Height: {profile.get('height_cm', 175)} cm | Age: {profile.get('age', 25)}",
            f"- Training Split: {profile.get('current_split', 'PPL')} ({profile.get('training_days', 4)} days/wk, {profile.get('session_length_min', 60)} min/session)",
            f"- Daily Steps: {profile.get('daily_steps', 7500)} | Sleep: {profile.get('sleep_hours', 7.5)} hrs | Stress: {profile.get('stress_level', 5)}/10",
        ]
        sections.append("## User Profile\n" + "\n".join(profile_lines))

        # InBody Scan Data
        if profile.get("inbody"):
            ib = profile["inbody"]
            sections.append(
                f"## InBody Body Composition Scan\n"
                f"- Weight: {ib.get('weight_kg', 'N/A')} kg | Skeletal Muscle Mass (SMM): {ib.get('smm_kg', 'N/A')} kg\n"
                f"- Body Fat % (PBF): {ib.get('pbf_pct', 'N/A')}% | Visceral Fat Level: {ib.get('visceral_fat_level', 'N/A')}\n"
                f"- Extracellular Water Ratio (ECW): {ib.get('ecw_ratio', 'N/A')}"
            )

    # 2. Clinical Safety & Injury Gating
    safety_lines = []
    injuries = profile.get("injuries", []) if profile else []
    if supplemental and "injuries" in supplemental:
        injuries = list(set(injuries + supplemental.get("injuries", [])))
    if injuries:
        safety_lines.append(f"- Active Injuries: {', '.join(injuries)}")
        try:
            from mos_bot.core.biomechanics_engine import get_injury_override
            for inj in injuries:
                ov = get_injury_override(inj)
                if ov:
                    safety_lines.append(f"  * {inj}: Avoid {', '.join(ov.contraindicated_movements[:2])} | Preserved: {', '.join(ov.preserved_patterns[:3])}")
        except Exception:
            pass

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

    # Postural deviation cue if mentioned in query
    if any(w in query.lower() for w in ("posture", "upper crossed", "lower crossed", "pelvic tilt", "kyphosis")):
        try:
            from mos_bot.core.posture_engine import evaluate_posture
            p_plan = evaluate_posture(query)
            if p_plan:
                sections.append(
                    f"## Posture Clinical Protocol ({p_plan.syndrome_name})\n"
                    f"- Overactive Muscles: {', '.join(p_plan.short_overactive_muscles)}\n"
                    f"- Underactive Muscles: {', '.join(p_plan.long_underactive_muscles)}"
                )
        except Exception:
            pass

    # 3. Scientific Program Audit (Real-time Evaluation)
    try:
        from mos_bot.core.program_auditor import audit_user_program
        audit_rep = audit_user_program(clean_id)
        if audit_rep.scientific_validity_score > 0:
            sections.append(
                f"## Automated Scientific Program Audit (Score: {audit_rep.scientific_validity_score}/100 - {audit_rep.overall_status})\n"
                f"- Volume Findings: {'; '.join([f.detail for f in audit_rep.findings if f.category == 'Volume'][:3]) or 'Optimal volume landmarks'}\n"
                f"- Critical Alerts: {'; '.join([f.detail for f in audit_rep.findings if f.severity == 'critical']) or 'None'}\n"
                f"- Key Science Recommendations: {'; '.join(audit_rep.recommended_modifications[:2]) or 'Program aligns with gold standard'}"
            )
    except Exception as e:
        logger.warning(f"Program audit context failed: {e}")

    # 4. Active Program & Mesocycle Telemetry
    progs_dir = Path(PROGRAMS_DIR)
    if progs_dir.exists():
        recent_progs = sorted(progs_dir.glob(f"{clean_id}*"), reverse=True)
        if recent_progs:
            try:
                prog_content = recent_progs[0].read_text(encoding="utf-8")
                sections.append(f"## Current Active Program (Summary)\n{prog_content[:1500]}")
            except Exception:
                pass

    # 5. Recent Check-in Telemetry
    checkins_dir = Path(DATA_ROOT) / "checkins"
    checkin_file = checkins_dir / f"{clean_id}.json"
    if checkin_file.exists():
        try:
            with open(checkin_file, "r", encoding="utf-8") as f:
                c_data = json.load(f)
            if c_data:
                latest = c_data[-1]
                sections.append(
                    f"## Latest Check-in Telemetry\n"
                    f"- Weight: {latest.get('weight_kg', 'N/A')} kg | Readiness: {latest.get('readiness', 'N/A')}/10\n"
                    f"- Adherence: {latest.get('adherence_pct', 'N/A')}% | Sleep: {latest.get('sleep_hours', 'N/A')} hrs\n"
                    f"- Soreness: {latest.get('soreness', 'N/A')}/5"
                )
        except Exception:
            pass

    # 6. Semantic Vault RAG & Graph Citations
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


def extract_and_execute_coach_actions(user_id: str, text: str) -> tuple[str, list[dict]]:
    """Parse and execute any embedded coach actions, returning cleaned response text and execution results."""
    import re
    from mos_bot.core.coach_actions import execute_coach_action

    actions_executed = []
    patterns = [
        r"```(?:coach_action|json:coach_action)\s*(\{.*?\})\s*```",
        r"<coach_action>\s*(\{.*?\})\s*</coach_action>",
    ]

    cleaned_text = text
    for pat in patterns:
        for match in re.finditer(pat, text, re.DOTALL):
            raw_json = match.group(1)
            try:
                data = json.loads(raw_json)
                action_name = data.get("action")
                params = data.get("params", {})
                if action_name:
                    res = execute_coach_action(user_id, action_name, params)
                    actions_executed.append({
                        "action": action_name,
                        "params": params,
                        "result": res,
                    })
            except Exception as e:
                logger.warning(f"Failed to parse coach action JSON: {e}")
            cleaned_text = cleaned_text.replace(match.group(0), "").strip()

    return cleaned_text, actions_executed


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

    # Extract & execute coach actions if present
    cleaned_text, actions_executed = extract_and_execute_coach_actions(clean_id, response_text)
    if actions_executed:
        summaries = [f"- {a['result'].get('action', a['action'])}" for a in actions_executed if a['result'].get('success')]
        if summaries:
            cleaned_text += "\n\n**Program & Tracker Updated:**\n" + "\n".join(summaries)

    # Persist turns
    save_chat_message(clean_id, "user", message)
    save_chat_message(clean_id, "assistant", cleaned_text)

    return cleaned_text


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
