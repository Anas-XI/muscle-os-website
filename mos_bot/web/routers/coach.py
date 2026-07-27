"""Coach approval tool API endpoints with dashboard, safety, and compliance features."""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coach")

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
    result = generate_coach_draft(user_id)
    if "error" in result:
        if result.get("blocked"):
            raise HTTPException(403, result["error"])
        raise HTTPException(400, result["error"])
    track("coach_api_generate", {"user_id": user_id, "draft_id": result["draft"]["draft_id"]})
    return result["draft"]


@router.get("/drafts")
async def api_list_drafts():
    return list_drafts()


@router.get("/stats")
async def api_stats():
    return get_draft_stats()


@router.get("/draft/{draft_id}")
async def api_get_draft(draft_id: str):
    draft = load_draft(draft_id)
    if draft is None:
        raise HTTPException(404, "Draft not found")
    return draft


@router.put("/draft/{draft_id}/section/{section_id}")
async def api_update_section(draft_id: str, section_id: str, req: SectionUpdateRequest):
    success = update_section(draft_id, section_id,
                             content=req.content if req.content is not None else None,
                             status=req.status,
                             editor_notes=req.editor_notes)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/section/{section_id}/approve")
async def api_approve_section(draft_id: str, section_id: str):
    success = approve_section(draft_id, section_id)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/section/{section_id}/reject")
async def api_reject_section(draft_id: str, section_id: str, req: RejectWithReasonRequest = None):
    reason = req.reason if req else ""
    success = reject_section(draft_id, section_id, reason)
    if not success:
        raise HTTPException(404, "Draft or section not found")
    draft = load_draft(draft_id)
    return {"status": "ok", "draft": draft}


@router.post("/draft/{draft_id}/note")
async def api_add_note(draft_id: str, req: AddNoteRequest):
    note = add_note(draft_id, req.author, req.text)
    if "error" in note:
        raise HTTPException(404, note["error"])
    return {"status": "ok", "note": note}


@router.post("/draft/{draft_id}/notes")
async def api_update_coach_notes(draft_id: str, req: CoachNotesRequest):
    draft_data = load_draft(draft_id)
    if not draft_data:
        raise HTTPException(404, "Draft not found")
    draft_data["coach_notes"] = req.coach_notes
    draft_data["updated_at"] = datetime.now().isoformat()
    from mos_bot.core.coach_pipeline import DRAFTS_DIR
    path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, indent=2, ensure_ascii=False)
    return {"status": "ok"}


@router.get("/draft/{draft_id}/safety")
async def api_safety_flags(draft_id: str):
    flags = get_safety_flags(draft_id)
    return {"draft_id": draft_id, "flags": flags, "count": len(flags)}


@router.get("/draft/{draft_id}/history")
async def api_history(draft_id: str, section_id: str = None):
    return get_version_history(draft_id, section_id)


@router.post("/draft/{draft_id}/bulk")
async def api_bulk_action(draft_id: str, req: BulkActionRequest):
    success = bulk_action(draft_id, req.action)
    if not success:
        raise HTTPException(404, "Draft not found or invalid action")
    draft = load_draft(draft_id)
    return {"status": "ok", "action": req.action, "draft": draft}


@router.post("/draft/{draft_id}/export")
async def api_export_draft(draft_id: str):
    pdf_path = export_approved_draft(draft_id)
    if pdf_path is None:
        draft_data = load_draft(draft_id)
        if draft_data:
            approved = sum(1 for s in draft_data.get("sections", []) if s.get("status") == "approved")
            total = len(draft_data.get("sections", []))
            raise HTTPException(400, f"Cannot export: only {approved}/{total} sections approved. All must be approved.")
        raise HTTPException(404, "Draft not found")
    return {"pdf_path": pdf_path, "filename": os.path.basename(pdf_path)}


@router.get("/draft/{draft_id}/pdf")
async def api_download_pdf(draft_id: str):
    draft_data = load_draft(draft_id)
    if not draft_data:
        raise HTTPException(404, "Draft not found")
    pdf_path = draft_data.get("export_path", "")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF not exported yet. POST /api/coach/draft/{id}/export first.")
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"{draft_data.get('client_name', draft_id)}_program.pdf")