#!/usr/bin/env python3
"""Pillar Intake Server — serves the pillar-based intake form, runs full vault-integrated
program generation pipeline, and outputs PDF programs. Run locally, expose via ngrok/tunnel
for client access."""

import os
import sys
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, PillarAssignment,
    VaultInformedSignals, VaultSource,
)
from mos_bot.core.context_loader import (
    evaluate_ed_screening, run_safety_triage,
    _build_vault_context, _extract_vault_signals,
)
from mos_bot.core.book_engine import BookDecisionEngine
from mos_bot.core.content_generator import generate_program, program_to_markdown
from mos_bot.core.pdf_renderer import generate_program_pdf
from mos_bot.core.analytics import track
from mos_bot.config import USERS_DIR, PROGRAMS_DIR, PDFS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("pillar_server")

HERE = Path(__file__).parent
HTML_PATH = HERE / "pillar_intake.html"
OUTPUT_DIR = HERE / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

PILLAR_NAMES = [
    "P1 - Diet Maxing",
    "P2 - Training Maxing",
    "P3 - Sleep Maxing",
    "P4 - Recovery Maxing",
    "P5 - Strength Maxing",
    "P6 - Fatigue Management",
    "P7 - Adherence Engineering",
    "P8 - Individualization",
    "P9 - Measurement and Feedback Systems",
    "P10 - Integration",
]

app = FastAPI(title="Pillar Intake Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_profile(data: dict) -> ClientProfile:
    weight_raw = data.get("bodyweight", "70")
    height_raw = data.get("height", "175")
    try:
        from mos_bot.core.intake_builder import parse_weight, parse_height
        weight_kg = float(parse_weight(weight_raw))
    except Exception:
        weight_kg = float(weight_raw)
    try:
        from mos_bot.core.intake_builder import parse_height
        height_cm = float(parse_height(height_raw))
    except Exception:
        height_cm = float(height_raw)

    user_id = f"pillar_{uuid.uuid4().hex[:12]}"
    goal_map = {
        "fat_loss": "fat_loss", "muscle": "hypertrophy",
        "strength": "strength", "recomp": "recomp",
    }
    goal = goal_map.get(data.get("goal", ""), "hypertrophy")

    exp_map = {"beginner": 0.5, "intermediate": 2, "advanced": 5}
    exp_years = exp_map.get(data.get("experience", "intermediate"), 2)

    days_map = {"1-2": 2, "3-4": 4, "5+": 5}
    training_days = days_map.get(data.get("training_days", "3-4"), 4)

    session_map = {"under45": 30, "45-75": 60, "75-100": 90, "over100": 110}
    session_len = session_map.get(data.get("session_length", "45-75"), 60)

    return ClientProfile(
        user_id=user_id,
        name=data.get("name", "Client"),
        goal=goal,
        bodyweight_kg=weight_kg,
        height_cm=height_cm,
        age=int(data.get("age", 30)),
        sex=data.get("sex", "male"),
        experience_years=exp_years,
        training_days=training_days,
        session_length_min=session_len,
        injuries=data.get("injuries", "").split(",") if data.get("injuries") else [],
        current_split=data.get("current_split", ""),
        sleep_hours=float(data.get("sleep_hours", 7)),
        stress_level=int(data.get("stress_level", 5)),
        daily_steps=int(data.get("daily_steps", 0)),
    )


def _build_pillars_from_sliders(pillar_data: dict, vault_signals: VaultInformedSignals = None) -> PillarAssignment:
    gaps = {}
    for p_name in PILLAR_NAMES:
        entry = pillar_data.get(p_name, {})
        if isinstance(entry, dict):
            current = int(entry.get("current", 5))
            desired = int(entry.get("desired", 5))
        elif isinstance(entry, list) and len(entry) >= 2:
            current, desired = int(entry[0]), int(entry[1])
        else:
            current, desired = 5, 5
        gap = desired - current
        gaps[p_name] = {"current": current, "desired": desired, "gap": gap}

    sorted_pillars = sorted(gaps.items(), key=lambda x: -x[1]["gap"])

    primary = []
    secondary = []

    for p_name, info in sorted_pillars:
        if info["gap"] >= 4 and len(primary) < 4:
            primary.append(p_name)
        elif info["gap"] >= 2 and len(secondary) < 6:
            secondary.append(p_name)

    if not primary and sorted_pillars:
        primary = [p[0] for p in sorted_pillars[:2]]

    core = ["P7 - Adherence Engineering", "P8 - Individualization", "P10 - Integration"]
    for cp in core:
        if cp not in secondary and cp not in primary:
            secondary.append(cp)

    if vault_signals and vault_signals.vault_recommended_pillars:
        for vp in vault_signals.vault_recommended_pillars:
            if vp not in primary and vp not in secondary:
                secondary.insert(0, vp)

    gentle_entry = any("gentle" in p.lower() for p in primary)

    return PillarAssignment(
        primary_pillars=primary[:4],
        secondary_pillars=secondary[:6],
        gentle_entry=gentle_entry,
    )


def _run_pipeline(data: dict) -> dict:
    profile = _build_profile(data)

    ed_answers = {"ED1": "no", "ED2": "no", "ED3": "no", "ED4": "no"}
    ed_result = evaluate_ed_screening(ed_answers)
    triage = run_safety_triage(profile, ed_result)

    vault_context = ""
    vault_sources = []
    vault_signals = None
    rag_failed = False

    try:
        vault_context, vault_sources, rag_failed = _build_vault_context(profile, triage)
        vault_signals = _extract_vault_signals(vault_sources, profile)
    except Exception as e:
        logger.warning(f"Vault RAG failed (continuing without): {e}")
        rag_failed = True

    pillars = _build_pillars_from_sliders(data.get("pillars", {}), vault_signals)

    try:
        book_engine = BookDecisionEngine()
        book_result = book_engine.apply(profile, pillars, triage)
        pillars.modifications.extend(book_result.extra_modifiers)
    except Exception as e:
        logger.warning(f"Book engine failed (continuing without): {e}")
        from mos_bot.core.book_engine import BookEngineResult
        book_result = BookEngineResult()

    pc = generate_program(profile, triage, pillars, vault_sources, vault_context, book_result, vault_signals)

    markdown = program_to_markdown(pc)

    goal_label = profile.goal.replace("_", " ").title() if profile.goal else "Fitness"
    os.makedirs(PDFS_DIR, exist_ok=True)
    pdf_path = generate_program_pdf(markdown, profile.user_id, client_name=profile.name, goal=goal_label)

    md_path = os.path.join(PROGRAMS_DIR, f"{profile.user_id}_program.md")
    os.makedirs(os.path.dirname(md_path), exist_ok=True)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    profile_json = profile.model_dump(mode="json")
    profile_json["pillar_data"] = data.get("pillars", {})
    profile_json["generated_at"] = datetime.now().isoformat()
    profile_path = os.path.join(OUTPUT_DIR, f"{profile.user_id}_profile.json")
    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(profile_json, f, indent=2, ensure_ascii=False)

    track("pillar_program_generated", profile.user_id, {
        "goal": profile.goal,
        "primary_pillars": pillars.primary_pillars,
        "rag_ok": not rag_failed,
    })

    return {
        "user_id": profile.user_id,
        "client_name": profile.name,
        "pdf_path": pdf_path,
        "markdown_path": md_path,
        "profile_path": profile_path,
        "pillars": {
            "primary": pillars.primary_pillars,
            "secondary": pillars.secondary_pillars,
        },
        "generated_at": datetime.now().isoformat(),
    }


@app.get("/", response_class=HTMLResponse)
async def serve_form():
    if HTML_PATH.exists():
        return HTML_PATH.read_text(encoding="utf-8")
    return HTMLResponse("<h1>pillar_intake.html not found</h1>", status_code=404)


@app.post("/generate")
async def generate(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    if "pillars" not in data:
        return JSONResponse({"error": "Missing 'pillars' field"}, status_code=400)

    try:
        result = _run_pipeline(data)
        pdf_filename = os.path.basename(result["pdf_path"])
        return JSONResponse({
            "success": True,
            "client_name": result["client_name"],
            "pdf_filename": pdf_filename,
            "pdf_path": f"/download/{pdf_filename}",
            "pillars": result["pillars"],
            "user_id": result["user_id"],
        })
    except Exception as e:
        logger.exception("Pipeline failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/download/{filename}")
async def download_pdf(filename: str):
    pdf_dir = PDFS_DIR if os.path.isdir(PDFS_DIR) else OUTPUT_DIR
    filepath = os.path.join(pdf_dir, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="application/pdf", filename=filename)
    return JSONResponse({"error": "File not found"}, status_code=404)


@app.get("/health")
async def health():
    return {"status": "ok", "vault_available": _check_vault()}


def _check_vault() -> bool:
    try:
        from mos_bot.config import VAULT_ROOT
        return os.path.isdir(VAULT_ROOT)
    except Exception:
        return False


def main():
    port = int(os.environ.get("PORT", 8081))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"""
{'='*60}
  Pillar Intake Server
{'='*60}
  URL:      http://localhost:{port}
  Health:   http://localhost:{port}/health
  Vault:    {'READY' if _check_vault() else 'NOT FOUND'}
{'='*60}
  Send clients the URL above to fill the intake form.
  Generated PDFs will be saved to: {PDFS_DIR}
  Client profiles saved to: {OUTPUT_DIR}
{'='*60}
""")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
