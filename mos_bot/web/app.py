import os
import json
import asyncio
import threading
import traceback
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel

from mos_bot.config import DATA_ROOT, LLM_API_KEY, LLM_API_URL, LLM_MODEL
from mos_bot.core.intake_builder import load_profile, save_profile, build_profile
from mos_bot.core.program_generator import generate_program

app = FastAPI(title="Muscle OS Web")


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


def _llm_chat(messages: list[dict], system: str | None = None) -> str | None:
    if not LLM_API_KEY or not LLM_API_URL:
        return None
    if system:
        messages = [{"role": "system", "content": system}] + messages
    payload = {
        "model": LLM_MODEL or "llama-3.3-70b-versatile",
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
            timeout=120,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        import traceback
        print(f"[LLM ERROR] {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        return None


# ---------- Data models ----------

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ProfileCreateRequest(BaseModel):
    user_id: str
    name: str
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


@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    profile = load_profile(user_id)
    if profile is None:
        raise HTTPException(404, "Profile not found")
    return profile


@app.get("/api/profiles")
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
            import traceback
            print(f"[WebUI] Failed to read profile {f.name}: {traceback.format_exc()}")
    return profiles


@app.post("/api/profile")
async def create_profile(req: ProfileCreateRequest):
    raw = req.model_dump()
    raw["bodyweight_kg"] = str(raw["bodyweight_kg"])
    raw["height_cm"] = str(raw["height_cm"])
    raw["user_id"] = req.user_id
    profile = build_profile(raw)
    save_profile(profile)
    return profile


@app.get("/api/programs/{user_id}")
async def get_programs(user_id: str):
    progs_dir = Path(DATA_ROOT) / "programs"
    if not progs_dir.exists():
        return []
    programs = []
    for f in sorted(progs_dir.glob(f"{user_id}*")):
        programs.append({
            "filename": f.name,
            "date": f.stat().st_mtime,
            "content": f.read_text(encoding="utf-8"),
        })
    return programs


@app.post("/api/generate")
async def generate(req: ChatRequest):
    profile = load_profile(req.user_id)
    if profile is None:
        raise HTTPException(400, "Create profile first")

    result = generate_program(profile)
    if result is None:
        raise HTTPException(500, "Program generation failed")
    return {"program": result}


COACH_SYSTEM = (
    "You are Muscle OS Coach, an expert fitness and nutrition coach. "
    "You have access to the user's profile data. Provide concise, actionable advice. "
    "Keep responses under 300 words. Be supportive and evidence-based."
)


@app.post("/api/chat")
async def chat(req: ChatRequest):
    profile = load_profile(req.user_id)
    context_parts = []
    if profile:
        context_parts.append(f"User Profile:\n{json.dumps(profile, indent=2)}")
    context_str = "\n\n".join(context_parts) if context_parts else ""
    system = COACH_SYSTEM
    if context_str:
        system += f"\n\nCurrent context:\n{context_str}"
    response = _llm_chat([{"role": "user", "content": req.message}], system=system)
    if response is None:
        raise HTTPException(503, "LLM unavailable")
    return {"response": response}


def run_web_server():
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


def start_in_thread():
    t = threading.Thread(target=run_web_server, daemon=True)
    t.start()
    return t
