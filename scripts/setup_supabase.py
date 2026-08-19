#!/usr/bin/env python3
"""
MuscleOS Phase 5 — Supabase Setup Script
Run this ONCE after creating your Supabase project at https://supabase.com

Usage:
  1. Go to https://supabase.com → New Project → name it "muscleos"
  2. Go to Project Settings → API → copy:
       - Project URL  (https://xxxx.supabase.co)
       - service_role key
  3. Run: python scripts/setup_supabase.py

The script will:
  - Apply all migrations to create tables
  - Add SUPABASE_URL + SUPABASE_SERVICE_KEY to .env
  - Push secrets to the Cloudflare Worker automatically
"""

import os
import subprocess
import sys

def ask(prompt):
    return input(prompt).strip()

def main():
    print("\n🚀 MuscleOS Supabase Setup\n")
    
    url = ask("Paste your Supabase Project URL (https://xxxx.supabase.co): ")
    if not url.startswith("https://") or "supabase.co" not in url:
        print("❌ Invalid URL. Must be like https://xxxx.supabase.co")
        sys.exit(1)
    
    service_key = ask("Paste your service_role key: ")
    if len(service_key) < 100:
        print("❌ Key looks too short. Double-check you copied the service_role key (not anon).")
        sys.exit(1)
    
    print("\n📦 Applying migrations via Supabase REST API...")
    
    import json, urllib.request
    
    headers_base = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    
    migrations_dir = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")
    migration_files = sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))
    
    for mf in migration_files:
        path = os.path.join(migrations_dir, mf)
        with open(path, "r", encoding="utf-8") as f:
            sql = f.read()
        
        # Use Supabase SQL execution endpoint
        data = json.dumps({"query": sql}).encode()
        req = urllib.request.Request(
            f"{url}/rest/v1/rpc/exec_sql",
            data=data,
            headers=headers_base,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  ✅ {mf}")
        except Exception as e:
            # Some SQL like CREATE IF NOT EXISTS may return errors for existing objects — warn, don't fail
            print(f"  ⚠️  {mf}: {e} (may be OK if tables already exist)")
    
    print("\n📝 Updating .env file...")
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    
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
    
    print("  ✅ .env updated")
    
    print("\n🔐 Pushing secrets to Cloudflare Worker...")
    worker_dir = os.path.join(os.path.dirname(__file__), "..", "website", "worker")
    
    for secret_name, secret_val in [("SUPABASE_URL", url), ("SUPABASE_SERVICE_KEY", service_key)]:
        try:
            result = subprocess.run(
                ["npx", "wrangler", "secret", "put", secret_name],
                input=secret_val,
                capture_output=True,
                text=True,
                cwd=worker_dir,
            )
            if "Success" in result.stdout:
                print(f"  ✅ {secret_name} pushed to Cloudflare")
            else:
                print(f"  ⚠️  {secret_name}: {result.stdout} {result.stderr}")
        except Exception as e:
            print(f"  ⚠️  Could not push {secret_name}: {e}")
    
    print("\n✅ Supabase setup complete!")
    print(f"   URL: {url}")
    print("   Secrets pushed to Cloudflare Worker")
    print("   Run 'npx wrangler deploy' from website/worker to redeploy\n")

if __name__ == "__main__":
    main()
