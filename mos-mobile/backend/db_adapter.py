"""Unified DB interface — delegates to Supabase or local SQLite."""

from supabase_client import USE_SUPABASE

if USE_SUPABASE:
    from supabase_client import get_supabase as _sup

    def get_user_messages(user_id, limit=50):
        r = _sup().table("messages").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        rows = r.data or []
        rows.reverse()
        return rows

    def get_user_context(user_id):
        r = _sup().rpc("get_user_context", {"p_user_id": user_id}).execute()
        if r.data:
            d = r.data
            return {"profile": d.get("profile") or {}, "programs": d.get("programs") or [], "recent_checkins": d.get("recent_checkins") or []}
        return {"profile": {}, "programs": [], "recent_checkins": []}

    def add_message(user_id, role, content):
        _sup().table("messages").insert({"user_id": user_id, "role": role, "content": content}).execute()

    def get_active_program(user_id):
        r = _sup().table("programs").select("*").eq("user_id", user_id).eq("active", True).single().execute()
        return r.data

    def deactivate_programs(user_id):
        _sup().table("programs").update({"active": False}).eq("user_id", user_id).execute()

    def insert_program(data):
        r = _sup().table("programs").insert(data).execute()
        return r.data[0]["id"] if r.data else None

    def get_client_profile(user_id):
        r = _sup().table("client_profiles").select("*").eq("user_id", user_id).single().execute()
        return r.data

    def upsert_client_profile(user_id, data):
        data["user_id"] = user_id
        _sup().table("client_profiles").upsert(data).execute()

    def lookup_user_by_email(email):
        r = _sup().auth.admin.list_users()
        users = r.user_list if hasattr(r, 'user_list') else (r.users if hasattr(r, 'users') else [])
        return next((u for u in users if u.email == email.strip()), None)

    def add_coach_client(coach_id, client_id):
        _sup().table("coach_clients").insert({"coach_id": coach_id, "client_id": client_id, "status": "active"}).execute()

    def get_checkins(user_id, limit=10):
        r = _sup().table("checkins").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return r.data or []

    def add_checkin(user_id, data):
        r = _sup().table("checkins").insert({"user_id": user_id, **data}).execute()
        return r.data[0].get("checkin_number") if r.data else None

    def get_workouts(user_id, limit=100):
        r = _sup().table("workout_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True).limit(limit).execute()
        return r.data or []

    def add_workout(user_id, data):
        _sup().table("workout_logs").insert({"user_id": user_id, **data}).execute()

    def get_user(user_id):
        r = _sup().from_("profiles").select("id, name, email, role").eq("id", user_id).single().execute()
        return r.data

    def is_coach_client(coach_id, client_id):
        r = _sup().table("coach_clients").select("*").eq("coach_id", coach_id).eq("client_id", client_id).execute()
        return bool(r.data)

    def get_coach_clients(coach_id):
        r = _sup().from_("coach_clients").select("client_id").eq("coach_id", coach_id).execute()
        ids = [row["client_id"] for row in (r.data or [])]
        if not ids:
            return []
        from supabase_client import get_supabase as _sup2
        r2 = _sup2().from_("profiles").select("id, name, email").in_("id", ids).execute()
        return r2.data or []

else:
    from local_db import LocalDB

    def get_user_messages(user_id, limit=50):
        return LocalDB.get_messages(user_id, limit)

    def get_user_context(user_id):
        return LocalDB.get_user_context(user_id)

    def add_message(user_id, role, content):
        LocalDB.add_message(user_id, role, content)

    def get_active_program(user_id):
        progs = LocalDB.get_programs(user_id, active_only=True)
        return progs[0] if progs else None

    def deactivate_programs(user_id):
        pass  # handled in add_program

    def insert_program(data):
        return LocalDB.add_program(data["user_id"], data.get("title", "Program"), data["content"])

    def get_client_profile(user_id):
        return LocalDB.get_client_profile(user_id)

    def upsert_client_profile(user_id, data):
        LocalDB.upsert_client_profile(user_id, data)

    def lookup_user_by_email(email):
        return LocalDB.get_user_by_email(email)

    def add_coach_client(coach_id, client_id):
        LocalDB.add_coach_client(coach_id, client_id)

    def get_checkins(user_id, limit=10):
        return LocalDB.get_checkins(user_id, limit)

    def add_checkin(user_id, data):
        return LocalDB.add_checkin(user_id, data)

    def get_workouts(user_id, limit=100):
        return LocalDB.get_workouts(user_id, limit)

    def add_workout(user_id, data):
        LocalDB.add_workout(user_id, data)

    def get_user(user_id):
        return LocalDB.get_user_by_id(user_id)

    def get_coach_clients(coach_id):
        return LocalDB.get_coach_clients(coach_id)

    def is_coach_client(coach_id, client_id):
        return bool(LocalDB.get_coach_clients(coach_id))
