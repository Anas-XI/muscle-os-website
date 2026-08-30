import os
import json
import asyncio
import threading
import traceback
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from mos_bot.config import DATA_ROOT, LLM_API_KEY, LLM_API_URL, LLM_MODEL, TRACKERS_DIR
from mos_bot.core.intake_builder import load_profile, save_profile, build_profile
from mos_bot.core.program_generator import generate_program
from mos_bot.core.tracker_renderer import generate_tracker_html
from mos_bot.core.coach_intelligence import generate_coach_response, stream_coach_response, get_chat_history
from mos_bot.web.auth import require_api_key, sanitize_user_id, safe_resolve_path, get_api_key

app = FastAPI(title="Muscle OS Web")

# ── CORS: restrict to known origins ──
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "https://muscleos.coach,https://muscleos.me").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)


# ── Global exception handlers ──


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "invalid_request",
            "detail": exc.errors(),
        },
    )


# ── Routers ──

from mos_bot.web.routers.arbitrate import router as arbitrate_router
app.include_router(arbitrate_router)
from mos_bot.web.routers.supplemental import router as supplemental_router
app.include_router(supplemental_router)
from mos_bot.web.routers.coach import router as coach_router, load_coach_html
app.include_router(coach_router)
from mos_bot.web.routers.intelligence import router as intelligence_router
app.include_router(intelligence_router)

INDEX_HTML: str | None = None


def _load_html() -> str:
    global INDEX_HTML
    if INDEX_HTML is not None:
        return INDEX_HTML
    p = Path(__file__).parent / "index.html"
    if p.exists():
        INDEX_HTML = p.read_text(encoding="utf-8")
    else:
        INDEX_HTML = "<h1>Muscle OS</h1><p>Loading...</p>"
    return INDEX_HTML


def _llm_chat_sync(messages: list[dict], system: str | None = None) -> str | None:
    if not LLM_API_KEY or not LLM_API_URL:
        return None
    if system:
        messages = [{"role": "system", "content": system}] + messages
    payload = {
        "model": LLM_MODEL or "openai/gpt-oss-120b",
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 1024,
        "stream": False,
    }
    import requests as req
    try:
        url = f"{LLM_API_URL.rstrip('/')}/chat/completions"
        r = req.post(
            url,
            headers={"Authorization": f"Bearer {LLM_API_KEY}"},
            json=payload,
            timeout=60,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        import logging
        logging.getLogger("mos_web").error(f"[LLM ERROR] {type(exc).__name__}: {exc}")
        return None


async def _llm_chat(messages: list[dict], system: str | None = None) -> str | None:
    return await asyncio.to_thread(_llm_chat_sync, messages, system)


# ---------- Data models ----------

class ChatRequest(BaseModel):
    user_id: str = Field(..., max_length=64)
    message: str = Field(..., max_length=4000)

class ProfileCreateRequest(BaseModel):
    user_id: str = Field(..., max_length=64)
    name: str = Field(..., max_length=100)
    goal: str = "hypertrophy"
    situation: str = "beginner"
    bodyweight_kg: float = 75.0
    height_cm: float = 175.0
    age: int = 25
    sex: str = "male"
    training_days: int = 4
    session_length_min: int = 60
    experience_years: float = 2.0
    current_split: str = "PPL"
    injuries: list[str] = []
    gut_health: str = "none"
    sleep_hours: float = 7.5
    stress_level: int = 5
    daily_steps: int = 7500
    caffeine_mg: int = 100
    supplements: list[str] = []
    medical: list[str] = []


# ---------- Routes ----------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_configured": bool(LLM_API_KEY and LLM_API_URL),
        "llm_url": (LLM_API_URL or "")[:30] if LLM_API_URL else None,
        "llm_model": LLM_MODEL or None,
    }


@app.get("/")
async def index():
    return HTMLResponse(_load_html())


@app.get("/coach")
async def coach_page():
    return HTMLResponse(load_coach_html())


@app.get("/api/profile/{user_id}", dependencies=[Depends(require_api_key)])
async def get_profile(user_id: str):
    clean_user_id = sanitize_user_id(user_id)
    profile = load_profile(clean_user_id)
    if profile is None:
        raise HTTPException(404, "Profile not found")
    return profile


@app.get("/api/profiles", dependencies=[Depends(require_api_key)])
async def list_profiles():
    users_dir = Path(DATA_ROOT) / "users"
    if not users_dir.exists():
        return []
    profiles = []
    for f in sorted(users_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            profiles.append({
                "user_id": data.get("user_id", f.stem),
                "name": data.get("name", f.stem),
                "goal": data.get("goal", ""),
                "date": data.get("date", ""),
            })
        except Exception:
            import logging
            logging.getLogger("mos_web").warning(f"[WebUI] Failed to read profile {f.name}")
    return profiles


@app.post("/api/profile", dependencies=[Depends(require_api_key)])
async def create_profile(req: ProfileCreateRequest):
    clean_user_id = sanitize_user_id(req.user_id)
    raw = req.model_dump()
    raw["bodyweight_kg"] = str(raw["bodyweight_kg"])
    raw["height_cm"] = str(raw["height_cm"])
    raw["user_id"] = clean_user_id
    profile = build_profile(raw)
    save_profile(profile)
    return profile


@app.get("/api/programs/{user_id}", dependencies=[Depends(require_api_key)])
async def get_programs(user_id: str):
    clean_user_id = sanitize_user_id(user_id)
    progs_dir = Path(DATA_ROOT) / "programs"
    if not progs_dir.exists():
        return []
    programs = []
    for f in sorted(progs_dir.glob(f"{clean_user_id}*")):
        programs.append({
            "filename": f.name,
            "date": f.stat().st_mtime,
            "content": f.read_text(encoding="utf-8"),
        })
    return programs


@app.post("/api/generate", dependencies=[Depends(require_api_key)])
async def generate(req: ChatRequest):
    clean_user_id = sanitize_user_id(req.user_id)
    profile = load_profile(clean_user_id)
    if profile is None:
        raise HTTPException(400, "Create profile first")

    result = generate_program(profile)
    if result is None:
        raise HTTPException(500, "Program generation failed")
    return {"program": result}


@app.post("/api/chat", dependencies=[Depends(require_api_key)])
async def chat(req: ChatRequest):
    clean_user_id = sanitize_user_id(req.user_id)
    response = await generate_coach_response(clean_user_id, req.message)
    return {"response": response}


@app.post("/api/chat/stream", dependencies=[Depends(require_api_key)])
async def chat_stream(req: ChatRequest):
    clean_user_id = sanitize_user_id(req.user_id)
    async def event_generator():
        async for token in stream_coach_response(clean_user_id, req.message):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/chat/{user_id}/history", dependencies=[Depends(require_api_key)])
async def chat_history(user_id: str):
    clean_user_id = sanitize_user_id(user_id)
    history = get_chat_history(clean_user_id, limit=50)
    return {"user_id": clean_user_id, "messages": history}


# ---------- Tracker Endpoints ----------

TRACKER_LOGS_DIR = os.path.join(DATA_ROOT, "tracker_logs")


@app.get("/tracker/{user_id}")
async def get_tracker_html(user_id: str):
    """Serve the HTML workout tracker for a user."""
    clean_user_id = sanitize_user_id(user_id)
    tracker_file = safe_resolve_path(TRACKERS_DIR, f"{clean_user_id}_tracker.html")
    if os.path.exists(tracker_file):
        return HTMLResponse(Path(tracker_file).read_text(encoding="utf-8"))
    raise HTTPException(404, "Tracker not found — generate a program first")


@app.post("/api/tracker/log", dependencies=[Depends(require_api_key)])
async def submit_tracker_log(request: Request):
    """Receive a workout log / check-in submission from the client."""
    os.makedirs(TRACKER_LOGS_DIR, exist_ok=True)
    body = await request.json()
    raw_user_id = body.get("user_id")
    if not raw_user_id:
        raise HTTPException(400, "user_id is required")
    user_id = sanitize_user_id(str(raw_user_id))
    raw_date = str(body.get("exported_at", datetime.now().isoformat())[:10])
    date = sanitize_user_id(raw_date)
    filename = f"{user_id}_{date}.json"
    file_path = safe_resolve_path(TRACKER_LOGS_DIR, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(body, f, indent=2, default=str)
    return {"status": "ok", "file": filename, "workouts": len(body.get("workouts", [])), "checkins": len(body.get("checkins", []))}


@app.get("/api/tracker/{user_id}/logs", dependencies=[Depends(require_api_key)])
async def get_tracker_logs(user_id: str):
    """List all submitted tracker logs for a user."""
    if not os.path.isdir(TRACKER_LOGS_DIR):
        return []
    clean_user_id = sanitize_user_id(user_id)
    logs = []
    for f in sorted(os.listdir(TRACKER_LOGS_DIR)):
        if f.startswith(f"{clean_user_id}_") and f.endswith(".json"):
            file_path = safe_resolve_path(TRACKER_LOGS_DIR, f)
            logs.append({
                "filename": f,
                "date": os.path.getmtime(file_path),
                "size": os.path.getsize(file_path),
            })
    return logs


@app.get("/api/tracker/{user_id}/logs/{filename}", dependencies=[Depends(require_api_key)])
async def get_tracker_log_detail(user_id: str, filename: str):
    """Return the full content of a specific tracker log."""
    clean_user_id = sanitize_user_id(user_id)
    clean_filename = sanitize_user_id(filename)
    if not clean_filename.endswith(".json"):
        raise HTTPException(400, "Invalid filename")
    file_path = safe_resolve_path(TRACKER_LOGS_DIR, clean_filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Log not found")
    if not clean_filename.startswith(f"{clean_user_id}_"):
        raise HTTPException(403, "Unauthorized access to log")
    return JSONResponse(json.loads(Path(file_path).read_text(encoding="utf-8")))


# ---------- Server ----------

def run_web_server():
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


def start_in_thread():
    t = threading.Thread(target=run_web_server, daemon=True)
    t.start()
    return t
