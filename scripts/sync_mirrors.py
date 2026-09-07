#!/usr/bin/env python3
"""
sync_mirrors.py — Synchronizes canonical website sources to all mirror directories.
Canonical source of truth: website/tools/ and website/assets/
"""

import os
import shutil
import sys
import filecmp

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

def sync_dir(src, dst):
    os.makedirs(dst, exist_ok=True)
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dst_root = os.path.join(dst, rel)
        os.makedirs(dst_root, exist_ok=True)
        for f in files:
            src_f = os.path.join(root, f)
            dst_f = os.path.join(dst_root, f)
            if not os.path.exists(dst_f) or not filecmp.cmp(src_f, dst_f, shallow=False):
                shutil.copy2(src_f, dst_f)

def run_sync():
    print("=== Synchronizing Muscle OS Tool & Asset Mirrors ===")
    for target in TOOL_TARGETS:
        sync_dir(SOURCE_TOOLS, target)
        print(f"Synced tools: {os.path.relpath(SOURCE_TOOLS, ROOT_DIR)} -> {os.path.relpath(target, ROOT_DIR)}")

    for target in ASSET_TARGETS:
        sync_dir(SOURCE_ASSETS, target)
        print(f"Synced assets: {os.path.relpath(SOURCE_ASSETS, ROOT_DIR)} -> {os.path.relpath(target, ROOT_DIR)}")

    # Sync tools into bundles
    bundle_dirs = [
        os.path.join(ROOT_DIR, "website", "training bundle"),
        os.path.join(ROOT_DIR, "training bundle"),
        os.path.join(ROOT_DIR, "public", "main", "training bundle"),
        os.path.join(ROOT_DIR, "website", "nutrition bundle"),
        os.path.join(ROOT_DIR, "nutrition bundle"),
        os.path.join(ROOT_DIR, "public", "main", "nutrition bundle"),
    ]

    bundle_tools = [
        "training_tool.html",
        "tdee_adaptive_engine.html",
        "rpe_load_calculator.html",
        "split_selector_quiz.html",
        "tdee_macro_calculator.html",
        "volume_set_calculator.html"
    ]

    for b_dir in bundle_dirs:
        if os.path.exists(b_dir):
            for t_file in bundle_tools:
                src_path = os.path.join(SOURCE_TOOLS, t_file)
                dst_path = os.path.join(b_dir, t_file)
                if os.path.exists(dst_path) or t_file in ["training_tool.html", "tdee_adaptive_engine.html"]:
                    if os.path.exists(src_path):
                        shutil.copy2(src_path, dst_path)
                        print(f"Synced bundle tool: {os.path.relpath(dst_path, ROOT_DIR)}")

    print("\nAll mirrors synchronized successfully!")

if __name__ == "__main__":
    run_sync()
