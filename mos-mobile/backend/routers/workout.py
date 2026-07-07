from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db_adapter import get_workouts as db_get_workouts, add_workout as db_add_workout

router = APIRouter()

class WorkoutRequest(BaseModel):
    user_id: str
    exercise: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[float] = None
    rpe: Optional[float] = None
    notes: Optional[str] = None

@router.post("/workout")
async def log_workout(req: WorkoutRequest):
    db_add_workout(req.user_id, req.model_dump(exclude_none=True))
    return {"success": True}

@router.get("/workout/{user_id}")
async def get_workouts(user_id: str, limit: int = 50):
    return {"workouts": db_get_workouts(user_id, limit)}
