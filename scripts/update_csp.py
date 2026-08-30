#!/usr/bin/env python3
"""
update_csp.py — Centralized Content-Security-Policy generator & validator for Muscle OS.

Reads config from website/config/app-config.json and updates/validates
the CSP <meta> tag across all HTML entry points.
"""

import os
import re
import json
import sys
import argparse

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONFIG_PATH = os.path.join(ROOT_DIR, "website", "config", "app-config.json")

def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def build_csp_string(worker_origin):
    return (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client https://accounts.google.com https://www.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style https://www.gstatic.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https://*.googleusercontent.com https://accounts.google.com https://www.gstatic.com https://ssl.gstatic.com; "
        "frame-src 'self' https://accounts.google.com/gsi/ https://accounts.google.com; "
        f"connect-src 'self' {worker_origin} https://accounts.google.com/gsi/ https://accounts.google.com; "
        "frame-ancestors 'self'; "
        "base-uri 'self'"
    )

CSP_META_REGEX = re.compile(
    r'<meta\s+http-equiv=["\']Content-Security-Policy["\']\s+content=["\']([^"\']*)["\']\s*/?>',
    re.IGNORECASE
)

def find_html_files():
    html_files = []
    scan_dirs = [
        os.path.join(ROOT_DIR, "website")
    ]
    for scan_dir in scan_dirs:
        for root, _, files in os.walk(scan_dir):
            if "node_modules" in root or ".git" in root:
                continue
            for f in files:
                if f.endswith(".html"):
                    html_files.append(os.path.join(root, f))
    return html_files

def update_or_check_csp(check_only=False):
    config = load_config()
    worker_origin = config.get("WORKER_ORIGIN", "https://muscleos-access-control.muscleos.workers.dev")
    target_csp = build_csp_string(worker_origin)
    target_tag = f'<meta http-equiv="Content-Security-Policy" content="{target_csp}">'

    files = find_html_files()
    updated_count = 0
    mismatch_count = 0

    for path in files:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        match = CSP_META_REGEX.search(content)
        if match:
            current_tag = match.group(0)
            if current_tag != target_tag:
                mismatch_count += 1
                if not check_only:
                    new_content = content[:match.start()] + target_tag + content[match.end():]
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    updated_count += 1
                    print(f"[UPDATED] {os.path.relpath(path, ROOT_DIR)}")
    if check_only:
        if mismatch_count > 0:
            print(f"\n[FAIL] CSP check failed: {mismatch_count} files have outdated CSP meta tags.")
            return False
        else:
            print(f"\n[PASS] All {len(files)} HTML files match centralized CSP configuration ({worker_origin}).")
            return True
    else:
        print(f"\n[OK] Successfully updated CSP across {updated_count} files (Checked total {len(files)}).")
        return True

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update or check CSP tags across HTML files.")
    parser.add_argument("--check", action="store_true", help="Check without modifying files")
    args = parser.parse_args()

    success = update_or_check_csp(check_only=args.check)
    sys.exit(0 if success else 1)
