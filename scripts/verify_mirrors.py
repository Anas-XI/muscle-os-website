#!/usr/bin/env python3
"""
verify_mirrors.py — Validates byte-for-byte synchronization across all repository mirrors.
Fails with non-zero exit code if any mirror is out of sync with website/tools/ or website/assets/.
"""

import os
import filecmp
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_TOOLS = os.path.join(ROOT_DIR, "website", "tools")
SOURCE_ASSETS = os.path.join(ROOT_DIR, "website", "assets")

TOOL_TARGETS = [
    os.path.join(ROOT_DIR, "tools"),
    os.path.join(ROOT_DIR, "public", "main", "tools"),
    os.path.join(ROOT_DIR, "public", "main", "website", "tools")
]

ASSET_TARGETS = [
    os.path.join(ROOT_DIR, "assets"),
    os.path.join(ROOT_DIR, "public", "main", "assets"),
    os.path.join(ROOT_DIR, "public", "main", "website", "assets")
]

def compare_tree(src, dst):
    mismatches = []
    missing = []
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dst_root = os.path.join(dst, rel)
        for f in files:
            src_f = os.path.join(root, f)
            dst_f = os.path.join(dst_root, f)
            if not os.path.exists(dst_f):
                missing.append(os.path.relpath(dst_f, ROOT_DIR))
            elif not filecmp.cmp(src_f, dst_f, shallow=False):
                mismatches.append((os.path.relpath(src_f, ROOT_DIR), os.path.relpath(dst_f, ROOT_DIR)))
    return mismatches, missing

def verify_all():
    print("=== Verifying Muscle OS Mirror Parity ===")
    total_errors = 0

    for target in TOOL_TARGETS:
        if not os.path.exists(target):
            print(f"[MISSING DIR] {os.path.relpath(target, ROOT_DIR)}")
            total_errors += 1
            continue
        mismatches, missing = compare_tree(SOURCE_TOOLS, target)
        if missing:
            for m in missing:
                print(f"[MISSING FILE] {m}")
            total_errors += len(missing)
        if mismatches:
            for src_p, dst_p in mismatches:
                print(f"[DESYNC] {dst_p} differs from canonical {src_p}")
            total_errors += len(mismatches)
        if not missing and not mismatches:
            print(f"[OK] Tools mirror clean: {os.path.relpath(target, ROOT_DIR)}")

    for target in ASSET_TARGETS:
        if not os.path.exists(target):
            print(f"[MISSING DIR] {os.path.relpath(target, ROOT_DIR)}")
            total_errors += 1
            continue
        mismatches, missing = compare_tree(SOURCE_ASSETS, target)
        if missing:
            for m in missing:
                print(f"[MISSING FILE] {m}")
            total_errors += len(missing)
        if mismatches:
            for src_p, dst_p in mismatches:
                print(f"[DESYNC] {dst_p} differs from canonical {src_p}")
            total_errors += len(mismatches)
        if not missing and not mismatches:
            print(f"[OK] Assets mirror clean: {os.path.relpath(target, ROOT_DIR)}")

    # Verify bundles
    train_tool = os.path.join(SOURCE_TOOLS, "training_tool.html")
    tdee_tool = os.path.join(SOURCE_TOOLS, "tdee_adaptive_engine.html")

    bundle_checks = [
        (os.path.join(ROOT_DIR, "website", "training bundle", "training_tool.html"), train_tool),
        (os.path.join(ROOT_DIR, "training bundle", "training_tool.html"), train_tool),
        (os.path.join(ROOT_DIR, "website", "nutrition bundle", "tdee_adaptive_engine.html"), tdee_tool),
        (os.path.join(ROOT_DIR, "nutrition bundle", "tdee_adaptive_engine.html"), tdee_tool),
    ]

    for dst, src in bundle_checks:
        if os.path.exists(os.path.dirname(dst)):
            if not os.path.exists(dst):
                print(f"[MISSING BUNDLE FILE] {os.path.relpath(dst, ROOT_DIR)}")
                total_errors += 1
            elif not filecmp.cmp(src, dst, shallow=False):
                print(f"[DESYNC BUNDLE] {os.path.relpath(dst, ROOT_DIR)} differs from canonical {os.path.relpath(src, ROOT_DIR)}")
                total_errors += 1
            else:
                print(f"[OK] Bundle clean: {os.path.relpath(dst, ROOT_DIR)}")

    if total_errors > 0:
        print(f"\n[FAIL] Found {total_errors} desynchronized mirror file(s). Run 'python scripts/sync_mirrors.py' to resolve.")
        return False
    else:
        print("\n[PASS] All mirrors are 100% synchronized with canonical sources.")
        return True

if __name__ == "__main__":
    success = verify_all()
    sys.exit(0 if success else 1)
