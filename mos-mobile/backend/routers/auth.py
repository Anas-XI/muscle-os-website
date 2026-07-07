import hashlib, uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase_client import USE_SUPABASE

router = APIRouter()

if USE_SUPABASE:
    from supabase_client import get_supabase as _sup

    class SignupRequest(BaseModel):
        email: str; password: str; name: str = ""; role: str = "client"

    class LoginRequest(BaseModel):
        email: str; password: str

    @router.post("/auth/signup")
    async def signup(req: SignupRequest):
        r = _sup().auth.sign_up({"email": req.email, "password": req.password})
        if r.user:
            _sup().table("profiles").insert({"id": r.user.id, "name": req.name, "role": req.role}).execute()
            return {"user_id": r.user.id, "email": req.email}
        raise HTTPException(400, "Signup failed")

    @router.post("/auth/login")
    async def login(req: LoginRequest):
        r = _sup().auth.sign_in_with_password({"email": req.email, "password": req.password})
        if r.user:
            return {"user_id": r.user.id, "email": req.email}
        raise HTTPException(401, "Invalid credentials")
else:
    from local_db import LocalDB

    class SignupRequest(BaseModel):
        email: str; password: str; name: str = ""; role: str = "client"

    class LoginRequest(BaseModel):
        email: str; password: str

    def _hash(password: str) -> str:
        return hashlib.sha256((password + "mos_salt_2026").encode()).hexdigest()

    @router.post("/auth/signup")
    async def signup(req: SignupRequest):
        existing = LocalDB.get_user_by_email(req.email)
        if existing:
            raise HTTPException(409, "Email already registered")
        uid = str(uuid.uuid4())
        LocalDB.create_user(uid, req.email, _hash(req.password), req.name, req.role)
        return {"user_id": uid, "email": req.email}

    @router.post("/auth/login")
    async def login(req: LoginRequest):
        user = LocalDB.get_user_by_email(req.email)
        if not user or user["password_hash"] != _hash(req.password):
            raise HTTPException(401, "Invalid credentials")
        return {"user_id": user["id"], "email": user["email"], "name": user.get("name",""), "role": user.get("role","client")}

    @router.get("/auth/me")
    async def get_me(user_id: str):
        user = LocalDB.get_user_by_id(user_id)
        if not user:
            raise HTTPException(404, "User not found")
        return {"user_id": user["id"], "email": user["email"], "name": user.get("name",""), "role": user.get("role","client")}
