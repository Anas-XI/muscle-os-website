from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db_adapter import get_checkins as db_get_checkins, add_checkin as db_add_checkin

router = APIRouter()

class CheckinRequest(BaseModel):
    user_id: str
    weight: Optional[float] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    readiness: Optional[int] = None
    adherence: Optional[int] = None
    soreness: Optional[int] = None
    notes: Optional[str] = None

@router.post("/checkin")
async def create_checkin(req: CheckinRequest):
    num = db_add_checkin(req.user_id, req.model_dump(exclude_none=True))
    return {"checkin_number": num, "success": True}

@router.get("/checkin/{user_id}")
async def get_checkins(user_id: str, limit: int = 10):
    return {"checkins": db_get_checkins(user_id, limit)}
