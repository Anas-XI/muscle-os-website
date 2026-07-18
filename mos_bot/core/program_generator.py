"""Program generation pipeline: profile → safety triage → RAG → content → PDF"""

import json
import os
from datetime import datetime
from mos_bot.config import USERS_DIR, PROGRAMS_DIR, PDFS_DIR
from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import (
    evaluate_ed_screening, run_safety_triage, assign_pillars,
    _build_vault_context, _extract_vault_signals, evaluate_rag_impact,
)
from mos_bot.core.content_generator import generate_program as build_program_content, program_to_markdown
from mos_bot.core.book_engine import BookDecisionEngine
from mos_bot.core.pdf_renderer import generate_program_pdf
from mos_bot.core.analytics import track


def generate_program_pipeline(user_id: str, ed_answers: dict = None) -> dict:
    """Full deterministic pipeline: load profile → safety → RAG → content → PDF.
    Safety uses the same functions as /arbitrate (evaluate_ed_screening,
    run_safety_triage, assign_pillars). RAG vault queries are a separate step.
    """
    # 1. Load profile
    profile_path = os.path.join(USERS_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {"error": f"Profile not found for user_id: {user_id}"}

    with open(profile_path, "r", encoding="utf-8") as f:
        raw_profile = json.load(f)

    profile = ClientProfile.from_dict(raw_profile)
    client_name = profile.name or user_id

    # 2. Safety triage (same pipeline as /arbitrate)
    ed_result = evaluate_ed_screening(ed_answers or {})
    triage = run_safety_triage(profile, ed_result)

    if triage.blocked:
        block_reason = triage.block_reason or "screening_red"
        track("program_blocked", {"user_id": user_id, "reason": block_reason})
        return {"error": triage.caution_note, "blocked": True, "block_reason": block_reason}

    # 3. Vault RAG (runs before pillar assignment so vault signals inform pillars)
    vault_context, vault_sources, rag_failed = _build_vault_context(profile, triage)

    rag_action, rag_msg = evaluate_rag_impact(profile, rag_failed)
    if rag_action == "block":
        track("program_blocked", {"user_id": user_id, "reason": "rag_failure_flagged"})
        return {"error": rag_msg, "blocked": True}

    # 4. Vault signals extraction + vault-informed pillar assignment
    vault_signals = _extract_vault_signals(vault_sources, profile)
    pillars = assign_pillars(profile, triage, vault_signals)

    # 5. Book Decision Engine — vault-informed enrichment of pillars and program
    book_engine = BookDecisionEngine()
    book_result = book_engine.apply(profile, pillars, triage)
    pillars.modifications.extend(book_result.extra_modifiers)

    # 6. Content generation (deterministic from templates + vault + book rules)
    pc = build_program_content(profile, triage, pillars, vault_sources, vault_context, book_result, vault_signals)
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
    Uses same safety pipeline as generate_program_pipeline.
    """
    p = ClientProfile.from_dict(profile)
    ed_result = evaluate_ed_screening({})
    triage = run_safety_triage(p, ed_result)
    if triage.blocked:
        return None

    vault_context, vault_sources, rag_failed = _build_vault_context(p, triage)
    rag_action, rag_msg = evaluate_rag_impact(p, rag_failed)
    if rag_action == "block":
        return None

    vault_signals = _extract_vault_signals(vault_sources, p)
    pillars = assign_pillars(p, triage, vault_signals)

    book_engine = BookDecisionEngine()
    book_result = book_engine.apply(p, pillars, triage)
    pillars.modifications.extend(book_result.extra_modifiers)

    pc = build_program_content(p, triage, pillars, vault_sources, vault_context, book_result, vault_signals)
    return program_to_markdown(pc)
