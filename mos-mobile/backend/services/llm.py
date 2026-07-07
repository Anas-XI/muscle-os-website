import logging
from config import MOS_ROOT
from db_adapter import get_user_messages, get_user_context, add_message
from chatbot import chat_completion as _chat_completion, chat_completion_stream as _chat_completion_stream

logger = logging.getLogger(__name__)

EXISTING_COACHING = f"{MOS_ROOT}/coaching_mode.py"

def build_system_prompt(user_id: str) -> str:
    ctx = get_user_context(user_id)
    profile = ctx["profile"]
    programs = ctx["programs"]
    checkins = ctx["recent_checkins"]

    with open(EXISTING_COACHING, encoding="utf-8") as f:
        parts = [f.read()]

    if profile.get("goal"):
        profile_lines = [f"Goal: {profile['goal']}"]
        all_fields = {
            "experience": None,
            "training_days": None,
            "session_length": None,
            "current_split": None,
            "weight": None,
            "height": None,
            "age": None,
            "sleep": None,
            "stress": None,
            "steps": None,
            "caffeine": None,
            "injuries": None,
            "gut_health": None,
            "hydration": None,
            "alcohol_weekly": None,
            "work_schedule": None,
            "mobility": None,
            "supplements": None,
            "medical_conditions": True,
            "bloodwork": True,
            "mental_health": True,
        }
        for k, is_safety in all_fields.items():
            v = profile.get(k)
            if v:
                label = k.replace("_", " ").title()
                if is_safety:
                    profile_lines.append(f"[SAFETY] {label}: {v}")
                else:
                    profile_lines.append(f"{label}: {v}")
        parts.append("## User Profile\n" + "\n".join(profile_lines))
        parts.append(
            "## Safety Rules\n"
            "Fields marked [SAFETY] are clinically significant and must override generic recommendations. "
            "If medical_conditions, bloodwork, or mental_health flags indicate a condition, deficiency, or risk, "
            "your advice must reference and address those specific flags first. "
            "Generic RDA ranges or standard protocols are insufficient when a known condition exists.\n\n"
            "ESCALATION REQUIREMENT — If bloodwork is flagged as 'never' or '2yr_plus' and a deficiency or "
            "medical condition is present in medical_conditions, you MUST recommend getting bloodwork done "
            "before providing specific dosing or treatment protocols. In this case, advise testing first, "
            "then dosing based on results. Do not skip this step."
        )

    rag_failed = False
    try:
        from mos_bot.core.vault_context import get_vault_context
        vault = get_vault_context(profile)
        if vault:
            parts.append(f"\n## Vault Knowledge\n{vault}")
    except Exception:
        import traceback
        logger.error(f"[LLM] vault_context failed: {traceback.format_exc()}")
        rag_failed = True

    if rag_failed:
        from mos_bot.core.context_loader import evaluate_rag_impact
        action, msg = evaluate_rag_impact(profile, rag_failed)
        if action == "block":
            raise ValueError(msg)
        elif action == "warn":
            parts.append(f"\n## NOTE\n{msg}")

    if programs:
        active = programs[0]
        c = active.get("content", "")
        parts.append(f"\n## Current Program\n{c[:2000]}")

    if checkins:
        parts.append(f"\n## Recent Check-Ins\n{str(checkins)[:1000]}")

    return "\n\n".join(parts)

async def chat(user_id: str, message: str, model: str = "") -> str:
    try:
        system_prompt = build_system_prompt(user_id)
    except ValueError as e:
        return str(e)

    history = get_user_messages(user_id)
    sanitized = [{"role": m["role"], "content": m["content"]} for m in history if "role" in m and "content" in m]
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(sanitized)
    messages.append({"role": "user", "content": message})

    response = await _chat_completion(messages, model=model, temperature=0.4, max_tokens=2048)
    if response is None:
        response = "I'm having trouble connecting to my AI backend. This may be a temporary network issue or a daily rate limit. Please try again in a few minutes."

    add_message(user_id, "user", message)
    add_message(user_id, "assistant", response)
    return response


async def chat_stream(user_id: str, message: str, model: str = ""):
    import asyncio, threading

    try:
        system_prompt = build_system_prompt(user_id)
    except ValueError as e:
        yield str(e)
        return
    history = get_user_messages(user_id)
    sanitized = [{"role": m["role"], "content": m["content"]} for m in history if "role" in m and "content" in m]
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(sanitized)
    messages.append({"role": "user", "content": message})

    add_message(user_id, "user", message)
    full = ""
    loop = asyncio.get_event_loop()

    sentinel = object()
    q = asyncio.Queue()

    def _produce():
        try:
            for token in _chat_completion_stream(messages, model=model, temperature=0.4, max_tokens=2048):
                if token is not None:
                    loop.call_soon_threadsafe(q.put_nowait, token)
                else:
                    logger.warning(f"[STREAM DROPPED NULL TOKEN] user={user_id} — mid-stream LLM failure")
        finally:
            loop.call_soon_threadsafe(q.put_nowait, sentinel)

    threading.Thread(target=_produce, daemon=True).start()

    while True:
        token = await q.get()
        if token is sentinel:
            break
        full += token
        yield token

    add_message(user_id, "assistant", full)
