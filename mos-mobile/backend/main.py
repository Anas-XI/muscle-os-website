from fastapi import FastAPI
from routers import health, auth, chat, programs, coach, profile, checkin, workout
from web.app import router as web_router

app = FastAPI(title="Muscle OS API", version="0.1.0")

app.include_router(health.router)
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(programs.router, prefix="/api")
app.include_router(coach.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(checkin.router, prefix="/api")
app.include_router(workout.router, prefix="/api")
app.include_router(web_router)
