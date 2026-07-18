import os
import sys
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "Muscle Operating System", "00_META", "scripts")
if os.path.isdir(SCRIPTS_DIR):
    sys.path.insert(0, SCRIPTS_DIR)

load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
try:
    OWNER_ID = int(os.getenv("OWNER_ID", "0"))
except (ValueError, TypeError):
    OWNER_ID = 0
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://127.0.0.1:1234")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "")   # e.g. https://api.openai.com/v1
LLM_MODEL = os.getenv("LLM_MODEL", "")       # e.g. gpt-4o-mini
VAULT_ROOT = os.getenv("VAULT_ROOT", os.path.join(os.path.dirname(SCRIPT_DIR), "Muscle Operating System"))

BOT_USERNAME = ""
DATA_ROOT = os.path.join(SCRIPT_DIR, "data")
USERS_DIR = os.path.join(DATA_ROOT, "users")
SUPPLEMENTAL_DIR = os.path.join(DATA_ROOT, "supplemental")
PROGRAMS_DIR = os.path.join(DATA_ROOT, "programs")
PDFS_DIR = os.path.join(DATA_ROOT, "pdfs")
