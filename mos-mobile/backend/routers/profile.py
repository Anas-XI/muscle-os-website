from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from db_adapter import get_client_profile, upsert_client_profile, get_user

router = APIRouter()

class ProfileUpdate(BaseModel):
    user_id: str
    goal: Optional[str] = None; situation: Optional[str] = None
    experience: Optional[str] = None; weight: Optional[float] = None
    height: Optional[float] = None; age: Optional[int] = None
    training_days: Optional[int] = None; session_length: Optional[int] = None
    current_split: Optional[str] = None; injuries: Optional[str] = None
    gut_health: Optional[str] = None; sleep: Optional[str] = None
    stress: Optional[str] = None; steps: Optional[str] = None
    caffeine: Optional[str] = None; supplements: Optional[str] = None
    medical_conditions: Optional[str] = None; hydration: Optional[str] = None
    alcohol_weekly: Optional[str] = None; work_schedule: Optional[str] = None
    mobility: Optional[str] = None; bloodwork: Optional[str] = None
    mental_health: Optional[str] = None; completed: Optional[int] = None

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    profile = get_client_profile(user_id)
    result = profile or {}
    result["role"] = user.get("role", "client")
    result["name"] = user.get("name", "")
    return result

@router.put("/profile")
async def update_profile(req: ProfileUpdate):
    upsert_client_profile(req.user_id, req.model_dump(exclude_none=True, exclude={"user_id"}))
    return {"success": True}
