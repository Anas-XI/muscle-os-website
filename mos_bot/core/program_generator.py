"""Program generation pipeline: profile → context → content → PDF"""

import json
import os
from datetime import datetime
from mos_bot.config import USERS_DIR, PROGRAMS_DIR, PDFS_DIR
from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import load_context
from mos_bot.core.content_generator import generate_program as build_program_content, program_to_markdown
from mos_bot.core.pdf_renderer import generate_program_pdf
from mos_bot.core.analytics import track


def generate_program_pipeline(user_id: str, ed_answers: dict = None) -> dict:
    """Full deterministic pipeline: load profile → context → content → PDF.
    Returns dict with program_content, markdown, pdf_path, and metadata.
    """
    # 1. Load profile
    profile_path = os.path.join(USERS_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {"error": f"Profile not found for user_id: {user_id}"}

    with open(profile_path, "r", encoding="utf-8") as f:
        raw_profile = json.load(f)

    profile = ClientProfile.from_dict(raw_profile)
    client_name = profile.name or user_id

    # 2. Context loading (ED screening → triage → pillars → RAG)
    context = load_context(profile, ed_answers)

    if context.get("blocked"):
        track("program_blocked", {"user_id": user_id, "reason": "screening_red"})
        return {"error": context["triage"].caution_note, "blocked": True}

    # Wire rag_failed: hard-block on flagged profiles, soft-warn otherwise
    from mos_bot.core.context_loader import evaluate_rag_impact
    rag_action, rag_msg = evaluate_rag_impact(profile, context.get("rag_failed", False))
    if rag_action == "block":
        track("program_blocked", {"user_id": user_id, "reason": "rag_failure_flagged"})
        return {"error": rag_msg, "blocked": True}

    # 3. Content generation (deterministic from templates + vault)
    pc = build_program_content(profile, context["triage"], context["pillars"], context.get("vault_sources", []))
    markdown = program_to_markdown(pc)

    # 4. Save markdown
    os.makedirs(PROGRAMS_DIR, exist_ok=True)
    md_path = os.path.join(PROGRAMS_DIR, f"{user_id}_program.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    # 5. Render PDF
    goal_label = profile.goal.replace("_", " ").title() if profile.goal else "Fitness"
    pdf_path = generate_program_pdf(markdown, user_id, client_name, goal=goal_label)

    track("program_generated", {"user_id": user_id, "has_pdf": bool(pdf_path)})

    return {
        "program_content": pc,
        "markdown": markdown,
        "markdown_path": md_path,
        "pdf_path": pdf_path,
        "user_id": user_id,
        "client_name": client_name,
        "generated_at": datetime.now().isoformat(),
    }


# Legacy wrapper — kept for compatibility with existing imports
def generate_program(profile: dict) -> str:
    """Legacy wrapper. Generates deterministically from profile dict.
    NOTE: vault_context param removed — load_context() handles vault internally.
    """
    p = ClientProfile.from_dict(profile)
    context = load_context(p)
    if context.get("blocked"):
        return None
    rag_action, rag_msg = evaluate_rag_impact(p, context.get("rag_failed", False))
    if rag_action == "block":
        return None
    pc = build_program_content(p, context["triage"], context["pillars"], context.get("vault_sources", []))
    return program_to_markdown(pc)
