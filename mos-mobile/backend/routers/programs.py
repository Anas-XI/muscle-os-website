from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.program import generate_program_for_user
from db_adapter import get_active_program

router = APIRouter()

class GenerateRequest(BaseModel):
    user_id: str

@router.post("/generate-program")
async def generate_endpoint(req: GenerateRequest):
    result = generate_program_for_user(req.user_id)
    return result

@router.get("/program/{user_id}")
async def get_program(user_id: str):
    prog = get_active_program(user_id)
    if not prog:
        raise HTTPException(404, "No active program found")
    return {"content": prog.get("content", ""), "title": prog.get("title", "Program")}
