import os
from dotenv import load_dotenv
import sys

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
USE_MOCK_LLM = os.getenv("USE_MOCK_LLM", "").lower() in ("1", "true", "yes")

VAULT_ROOT = os.getenv("VAULT_ROOT", os.path.join(os.path.dirname(__file__), "..", "..", "Muscle Operating System"))

MOS_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if MOS_ROOT not in sys.path:
    sys.path.insert(0, MOS_ROOT)
