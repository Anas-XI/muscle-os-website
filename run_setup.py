import os
import subprocess
import json, urllib.request

url = "https://kddxpxbstnvmgwdgponc.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZHhweGJzdG52bWd3ZGdwb25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzEzMzQ2MywiZXhwIjoyMTAyNzA5NDYzfQ.RqSf16b3Bo6bPL7lccCqkFK_P4BLKGtFwj5O2qNdoAg"

print("Applying migrations via Supabase REST API...")
headers_base = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
}

migrations_dir = os.path.join(os.path.dirname(__file__), "supabase", "migrations")
migration_files = sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))

for mf in migration_files:
    path = os.path.join(migrations_dir, mf)
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    data = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/exec_sql",
        data=data,
        headers=headers_base,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"OK: {mf}")
    except urllib.error.HTTPError as e:
        print(f"WARN (expected if tables exist) {mf}: {e.code} {e.reason}")
        if e.code == 404:
            print("exec_sql endpoint not found. Trying query execution fallback...")
            req2 = urllib.request.Request(f"{url}/rest/v1/", data=data, headers=headers_base, method="POST")
            try:
                urllib.request.urlopen(req2)
            except Exception as e2:
                print("Fallback failed:", e2)
    except Exception as e:
        print(f"ERR {mf}: {e}")

print("Updating .env file...")
env_path = os.path.join(os.path.dirname(__file__), ".env")
with open(env_path, "r", encoding="utf-8") as f:
    env_text = f.read()

def set_env_var(text, key, value):
    import re
    pattern = rf"^{key}=.*$"
    replacement = f"{key}={value}"
    if re.search(pattern, text, flags=re.MULTILINE):
        return re.sub(pattern, replacement, text, flags=re.MULTILINE)
    return text + f"\n{replacement}\n"

env_text = set_env_var(env_text, "SUPABASE_URL", url)
env_text = set_env_var(env_text, "SUPABASE_SERVICE_KEY", service_key)

with open(env_path, "w", encoding="utf-8") as f:
    f.write(env_text)
print(".env updated")
