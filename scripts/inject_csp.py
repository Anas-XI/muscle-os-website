import os, json, re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONFIG_PATH = os.path.join(ROOT_DIR, "website", "config", "app-config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

worker_origin = config.get("WORKER_ORIGIN", "https://muscleos-access-control.muscleos.workers.dev")

CSP_TAG = f'<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://accounts.google.com/gsi/client https://accounts.google.com https://www.gstatic.com; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com https://accounts.google.com/gsi/style https://www.gstatic.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data: https://*.googleusercontent.com https://accounts.google.com https://www.gstatic.com https://ssl.gstatic.com; frame-src \'self\' https://accounts.google.com/gsi/ https://accounts.google.com; connect-src \'self\' {worker_origin} https://accounts.google.com/gsi/ https://accounts.google.com; frame-ancestors \'self\'; base-uri \'self\'">'

print(f"=== Injecting Centralized CSP with Worker Origin: {worker_origin} ===")

count = 0
for root, dirs, files in os.walk(os.path.join(ROOT_DIR, "website")):
    for f in files:
        if f.endswith(".html"):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                content = fp.read()
            if 'http-equiv="Content-Security-Policy"' in content:
                new_content = re.sub(
                    r'<meta http-equiv="Content-Security-Policy"[^>]*>',
                    CSP_TAG,
                    content
                )
                if new_content != content:
                    with open(p, "w", encoding="utf-8") as fp:
                        fp.write(new_content)
                    count += 1
                    print(f"Injected CSP: {os.path.relpath(p, ROOT_DIR)}")

print(f"Total HTML files updated with centralized CSP: {count}")
