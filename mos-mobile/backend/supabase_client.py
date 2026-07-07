import os
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Will fall back to local_db when Supabase isn't configured
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

if USE_SUPABASE:
    from supabase import create_client, Client
    _supabase: Client | None = None

    def get_supabase() -> Client:
        global _supabase
        if _supabase is None:
            _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return _supabase
else:
    from local_db import LocalDB

    def get_supabase():
        return LocalDB()
