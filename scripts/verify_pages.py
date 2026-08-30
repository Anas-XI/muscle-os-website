import os
import re

products_dir = os.path.join("website", "products")
pages = [
    "training-app.html",
    "tdee-engine.html",
    "omni-hub.html",
    "training-book.html",
    "nutrition-book.html",
    "training-bundle.html",
    "nutrition-bundle.html"
]

print("=== VERIFYING PRODUCT LANDING PAGES ===")
all_ok = True

for p in pages:
    path = os.path.join(products_dir, p)
    if not os.path.exists(path):
        print(f"[FAIL] Missing file: {p}")
        all_ok = False
    else:
        size = os.path.getsize(path)
        print(f"[PASS] {p} ({size:,} bytes)")

css_path = os.path.join(products_dir, "shared-landing.css")
if os.path.exists(css_path):
    print(f"[PASS] shared-landing.css ({os.path.getsize(css_path):,} bytes)")
else:
    print("[FAIL] Missing shared-landing.css")
    all_ok = False

for p in pages:
    path = os.path.join(products_dir, p)
    content = open(path, "r", encoding="utf-8").read()
    
    if 'href="shared-landing.css"' not in content:
        print(f"[FAIL] {p} missing shared-landing.css link")
        all_ok = False
        
    if "detectCurrency()" not in content or "setCurrency" not in content:
        print(f"[FAIL] {p} missing currency switcher logic")
        all_ok = False
        
    if 'id="mobileCtaBar"' not in content:
        print(f"[FAIL] {p} missing mobile sticky bar")
        all_ok = False
        
    if '<details class="faq-item">' not in content:
        print(f"[FAIL] {p} missing FAQ accordion")
        all_ok = False

    if "coach-avatar" not in content:
        print(f"[FAIL] {p} missing coach proof card")
        all_ok = False

print("\n=== VERIFICATION SUMMARY ===")
if all_ok:
    print("ALL 7 LANDING PAGES + SHARED CSS PASSED ALL CHECKS!")
else:
    print("Some checks failed.")
