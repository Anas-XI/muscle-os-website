"""Coach approval tool API endpoints with dashboard, safety, and compliance features."""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from mos_bot.config import DATA_ROOT
from mos_bot.core.coach_pipeline import (
    generate_coach_draft, load_draft, update_section,
    approve_section, reject_section, list_drafts,
    export_approved_draft, get_draft_stats, get_safety_flags,
    bulk_action, get_version_history, add_note,
)
from mos_bot.core.analytics import track
from mos_bot.web.auth import require_api_key, sanitize_user_id, safe_resolve_path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coach", dependencies=[Depends(require_api_key)])

COACH_HTML: Optional[str] = None
COACH_HTML_PATH = Path(__file__).parent.parent / "coach.html"


def load_coach_html() -> str:
    global COACH_HTML
    if COACH_HTML is not None:
        return COACH_HTML
    if COACH_HTML_PATH.exists():
        COACH_HTML = COACH_HTML_PATH.read_text(encoding="utf-8")
    else:
        COACH_HTML = "<h1>Coach Tool</h1><p>Loading...</p>"
    return COACH_HTML


# ── Request/Response models ──

class SectionUpdateRequest(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None
    editor_notes: Optional[str] = None


class CoachNotesRequest(BaseModel):
    coach_notes: str


class AddNoteRequest(BaseModel):
    author: str
    text: str


class RejectWithReasonRequest(BaseModel):
    reason: str = ""


class BulkActionRequest(BaseModel):
    action: str


# ── Routes ──

@router.get("/page")
async def coach_page():
    return HTMLResponse(load_coach_html())


@router.post("/generate/{user_id}")
async def api_generate_draft(user_id: str):
    clean_user_id = sanitize_user_id(user_id)
    result = generate_coach_draft(clean_user_id)
    if "error" in result:
        if result.get("blocked"):
            raise HTTPException(403, result["error"])
        raise HTTPException(400, result["error"])
    track("coach_api_generate", {"user_id": clean_user_id, "draft_id": result["draft"]["draft_id"]})
    return result["draft"]


@router.get("/drafts")
async def api_list_drafts():
    return list_drafts()


@router.get("/stats")
async def api_stats():
    return get_draft_stats()


@router.get("/draft/{draft_id}")
async def api_get_draft(draft_id: str):
    clean_draft_id = sanitize_user_id(draft_id)
    draft = load_draft(clean_draft_id)
    if draft is None:
        raise HTTPException(404, "Draft not found")
    return draft


@router.put("/draft/{draft_id}/section/{section_id}")
async def api_update_section(draft_id: str, section_id: str, req: SectionUpdateRequest):
    clean_draft_id = sanitize_user_id(draft_id)
    clean_section_id = sanitize_user_id(section_id)
    success = update_section(clean_draft_id, clean_section_id,
                             content=req.content if req.content is not None else None,
                             status=req.status,
                             editor_notes=req.editor_notes)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(clean_draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/section/{section_id}/approve")
async def api_approve_section(draft_id: str, section_id: str):
    clean_draft_id = sanitize_user_id(draft_id)
    clean_section_id = sanitize_user_id(section_id)
    success = approve_section(clean_draft_id, clean_section_id)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(clean_draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/section/{section_id}/reject")
async def api_reject_section(draft_id: str, section_id: str, req: RejectWithReasonRequest = None):
    clean_draft_id = sanitize_user_id(draft_id)
    clean_section_id = sanitize_user_id(section_id)
    reason = req.reason if req else ""
    success = reject_section(clean_draft_id, clean_section_id, reason)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(clean_draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/note")
async def api_add_note(draft_id: str, req: AddNoteRequest):
    clean_draft_id = sanitize_user_id(draft_id)
    note = add_note(clean_draft_id, req.author, req.text)
    if "error" in note:
        raise HTTPException(404, note["error"])
    return {"status": "ok", "note": note}


@router.post("/draft/{draft_id}/notes")
async def api_update_coach_notes(draft_id: str, req: CoachNotesRequest):
    clean_draft_id = sanitize_user_id(draft_id)
    draft_data = load_draft(clean_draft_id)
    if not draft_data:
        raise HTTPException(404, "Draft not found")
    draft_data["coach_notes"] = req.coach_notes
    draft_data["updated_at"] = datetime.now().isoformat()
    from mos_bot.core.coach_pipeline import DRAFTS_DIR
    path = os.path.join(DRAFTS_DIR, f"{clean_draft_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, indent=2, ensure_ascii=False)
    return {"status": "ok"}


@router.get("/draft/{draft_id}/safety")
async def api_safety_flags(draft_id: str):
    clean_draft_id = sanitize_user_id(draft_id)
    flags = get_safety_flags(clean_draft_id)
    return {"draft_id": clean_draft_id, "flags": flags, "count": len(flags)}


@router.get("/draft/{draft_id}/history")
async def api_history(draft_id: str, section_id: str = None):
    clean_draft_id = sanitize_user_id(draft_id)
    clean_section_id = sanitize_user_id(section_id) if section_id else None
    return get_version_history(clean_draft_id, clean_section_id)


@router.post("/draft/{draft_id}/bulk")
async def api_bulk_action(draft_id: str, req: BulkActionRequest):
    clean_draft_id = sanitize_user_id(draft_id)
    success = bulk_action(clean_draft_id, req.action)
    if not success:
        raise HTTPException(404, "Draft not found or invalid action")
    draft = load_draft(clean_draft_id)
    return {"status": "ok", "action": req.action, "draft": draft}


@router.post("/draft/{draft_id}/export")
async def api_export_draft(draft_id: str):
    clean_draft_id = sanitize_user_id(draft_id)
    pdf_path = export_approved_draft(clean_draft_id)
    if pdf_path is None:
        draft_data = load_draft(clean_draft_id)
        if draft_data:
            approved = sum(1 for s in draft_data.get("sections", []) if s.get("status") == "approved")
            total = len(draft_data.get("sections", []))
            raise HTTPException(400, f"Cannot export: only {approved}/{total} sections approved. All must be approved.")
        raise HTTPException(404, "Draft not found")
    return {"pdf_path": pdf_path, "filename": os.path.basename(pdf_path)}


@router.get("/draft/{draft_id}/pdf")
async def api_download_pdf(draft_id: str):
    clean_draft_id = sanitize_user_id(draft_id)
    draft_data = load_draft(clean_draft_id)
    if not draft_data:
        raise HTTPException(404, "Draft not found")
    pdf_path = draft_data.get("export_path", "")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF not exported yet. POST /api/coach/draft/{id}/export first.")
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"{draft_data.get('client_name', clean_draft_id)}_program.pdf")


# ── Mental Health Concern Flag Routes ──

from mos_bot.core.mental_health_flags import (
    list_flags, get_flag, create_or_trigger_flag,
    claim_flag, clear_flag, set_monitoring, escalate_flag,
    get_flag_audit_trail, check_monitoring_and_sla_timeouts
)


class CreateFlagRequest(BaseModel):
    user_id: str
    trigger_context: str
    actor: str = "coach"


class ClaimFlagRequest(BaseModel):
    claimed_by: str
    note: str = ""


class ClearFlagRequest(BaseModel):
    cleared_by: str
    clearance_note: str


class MonitorFlagRequest(BaseModel):
    recheck_at: str
    actor: str
    note: str = ""


class EscalateFlagRequest(BaseModel):
    escalated_by: str
    reason: str


@router.get("/flags")
async def api_list_flags(user_id: Optional[str] = None, status: Optional[str] = None):
    clean_user = sanitize_user_id(user_id) if user_id else None
    flags = list_flags(user_id=clean_user, status=status)
    return {"flags": [f.model_dump() for f in flags], "total": len(flags)}


@router.post("/flags")
async def api_create_flag(req: CreateFlagRequest):
    clean_user = sanitize_user_id(req.user_id)
    flag = create_or_trigger_flag(clean_user, req.trigger_context, actor=req.actor)
    return flag.model_dump()


@router.get("/flags/{flag_id}")
async def api_get_flag(flag_id: str):
    clean_id = sanitize_user_id(flag_id)
    flag = get_flag(clean_id)
    if not flag:
        raise HTTPException(404, "Flag not found")
    audit = get_flag_audit_trail(clean_id)
    return {"flag": flag.model_dump(), "audit_trail": [a.model_dump() for a in audit]}


@router.post("/flags/{flag_id}/claim")
async def api_claim_flag(flag_id: str, req: ClaimFlagRequest):
    clean_id = sanitize_user_id(flag_id)
    try:
        flag = claim_flag(clean_id, claimed_by=req.claimed_by, note=req.note)
        return flag.model_dump()
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/flags/{flag_id}/clear")
async def api_clear_flag(flag_id: str, req: ClearFlagRequest):
    clean_id = sanitize_user_id(flag_id)
    try:
        flag = clear_flag(clean_id, cleared_by=req.cleared_by, clearance_note=req.clearance_note)
        return flag.model_dump()
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/flags/{flag_id}/monitor")
async def api_monitor_flag(flag_id: str, req: MonitorFlagRequest):
    clean_id = sanitize_user_id(flag_id)
    try:
        flag = set_monitoring(clean_id, actor=req.actor, recheck_at=req.recheck_at, note=req.note)
        return flag.model_dump()
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/flags/{flag_id}/escalate")
async def api_escalate_flag(flag_id: str, req: EscalateFlagRequest):
    clean_id = sanitize_user_id(flag_id)
    try:
        flag = escalate_flag(clean_id, escalated_by=req.escalated_by, reason=req.reason)
        return flag.model_dump()
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/flags/scheduler/check")
async def api_scheduler_check():
    results = check_monitoring_and_sla_timeouts()
    return results