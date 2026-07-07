from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db_adapter import lookup_user_by_email, add_coach_client, is_coach_client, get_coach_clients as db_get_coach_clients, get_client_profile

router = APIRouter()

class AddClientRequest(BaseModel):
    coach_id: str
    email: str

@router.post("/coach/add-client")
async def add_client(req: AddClientRequest):
    target = lookup_user_by_email(req.email)
    if not target:
        raise HTTPException(404, detail=f"User with email '{req.email}' not found.")
    client_id = target["id"] if isinstance(target, dict) else target.id
    if is_coach_client(req.coach_id, client_id):
        raise HTTPException(409, detail="Client already added.")
    add_coach_client(req.coach_id, client_id)
    return {"success": True, "client_id": client_id}

@router.get("/coach/clients/{coach_id}")
async def list_clients(coach_id: str):
    clients = db_get_coach_clients(coach_id)
    enriched = []
    for c in clients:
        profile = get_client_profile(c["id"])
        enriched.append({
            "id": c["id"],
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "goal": profile.get("goal") if profile else None,
        })
    return {"clients": enriched}
