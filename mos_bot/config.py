import os
import sys
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "Muscle Operating System", "00_META", "scripts")
if os.path.isdir(SCRIPTS_DIR):
    sys.path.insert(0, SCRIPTS_DIR)
else:
    import warnings
    warnings.warn(f"SCRIPTS_DIR not found at {SCRIPTS_DIR}; external coaching scripts may be unavailable.")

load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
try:
    OWNER_ID = int(os.getenv("OWNER_ID", "0"))
except (ValueError, TypeError):
    OWNER_ID = 0
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://127.0.0.1:1234")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

LLM_API_KEY = os.getenv("LLM_API_KEY", "") or GEMINI_API_KEY
custom_llm_url = os.getenv("LLM_API_URL")
if custom_llm_url:
    LLM_API_URL = custom_llm_url
    LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
elif GEMINI_API_KEY:
    LLM_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
else:
    LLM_API_URL = ""
    LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")

VAULT_ROOT = os.getenv("VAULT_ROOT", os.path.join(os.path.dirname(SCRIPT_DIR), "Muscle Operating System"))

BOT_USERNAME = os.getenv("BOT_USERNAME", "")
DATA_ROOT = os.path.join(SCRIPT_DIR, "data")
USERS_DIR = os.path.join(DATA_ROOT, "users")
SUPPLEMENTAL_DIR = os.path.join(DATA_ROOT, "supplemental")
PROGRAMS_DIR = os.path.join(DATA_ROOT, "programs")
PDFS_DIR = os.path.join(DATA_ROOT, "pdfs")
TRACKERS_DIR = os.path.join(DATA_ROOT, "trackers")
CHAT_HISTORY_DIR = os.path.join(DATA_ROOT, "chat_history")
