#!/usr/bin/env python3
"""
sync_mirrors.py — Synchronizes canonical website sources to all mirror directories.
Canonical source of truth: website/ (tools, assets, books, guides, products, pages)
"""

import os
import shutil
import sys
import filecmp

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SOURCE_WEBSITE = os.path.join(ROOT_DIR, "website")
SOURCE_TOOLS = os.path.join(ROOT_DIR, "website", "tools")
SOURCE_ASSETS = os.path.join(ROOT_DIR, "website", "assets")
SOURCE_BOOKS = os.path.join(ROOT_DIR, "website", "books")
SOURCE_GUIDES = os.path.join(ROOT_DIR, "website", "guides")
SOURCE_PRODUCTS = os.path.join(ROOT_DIR, "website", "products")

MIRROR_ROOTS = [
    os.path.join(ROOT_DIR, "public", "main"),
    os.path.join(ROOT_DIR, "public", "master")
]

def sync_dir(src, dst):
    if not os.path.exists(src): return
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
    print("=== Synchronizing Muscle OS Mirrors across Ecosystem ===")
    
    # 1. Root-level mirrors
    sync_dir(SOURCE_TOOLS, os.path.join(ROOT_DIR, "tools"))
    sync_dir(SOURCE_ASSETS, os.path.join(ROOT_DIR, "assets"))
    sync_dir(SOURCE_BOOKS, os.path.join(ROOT_DIR, "books"))
    sync_dir(SOURCE_GUIDES, os.path.join(ROOT_DIR, "guides"))
    sync_dir(os.path.join(SOURCE_WEBSITE, "knowledge-hub"), os.path.join(ROOT_DIR, "knowledge-hub"))
    sync_dir(os.path.join(SOURCE_WEBSITE, "admin"), os.path.join(ROOT_DIR, "admin"))
    sync_dir(os.path.join(SOURCE_WEBSITE, "pdf"), os.path.join(ROOT_DIR, "pdf"))
    
    # Sync standalone single files if present
    for fname, folder in [("order-success.html", ""), ("muscle_os_master_book.html", "books"), ("pillar_intake.html", "tools")]:
        root_file = os.path.join(ROOT_DIR, folder, fname) if folder else os.path.join(ROOT_DIR, fname)
        web_file = os.path.join(SOURCE_WEBSITE, folder, fname) if folder else os.path.join(SOURCE_WEBSITE, fname)
        if os.path.exists(root_file) and not os.path.exists(web_file):
            os.makedirs(os.path.dirname(web_file), exist_ok=True)
            shutil.copy2(root_file, web_file)
        elif os.path.exists(web_file) and not os.path.exists(root_file):
            os.makedirs(os.path.dirname(root_file), exist_ok=True)
            shutil.copy2(web_file, root_file)
            
    print("Synced root tools, assets, books, guides, admin, pdf, knowledge-hub.")

    # 2. Public deployment mirrors (public/main and public/master)
    for m_root in MIRROR_ROOTS:
        if not os.path.exists(m_root): continue
        # Sync tools & assets
        sync_dir(SOURCE_TOOLS, os.path.join(m_root, "tools"))
        sync_dir(SOURCE_TOOLS, os.path.join(m_root, "website", "tools"))
        sync_dir(SOURCE_ASSETS, os.path.join(m_root, "assets"))
        sync_dir(SOURCE_ASSETS, os.path.join(m_root, "website", "assets"))
        # Sync books & guides
        sync_dir(os.path.join(ROOT_DIR, "books"), os.path.join(m_root, "books"))
        sync_dir(os.path.join(ROOT_DIR, "books"), os.path.join(m_root, "website", "books"))
        sync_dir(SOURCE_BOOKS, os.path.join(m_root, "books"))
        sync_dir(SOURCE_BOOKS, os.path.join(m_root, "website", "books"))
        sync_dir(SOURCE_GUIDES, os.path.join(m_root, "guides"))
        sync_dir(SOURCE_GUIDES, os.path.join(m_root, "website", "guides"))
        # Sync products
        sync_dir(SOURCE_PRODUCTS, os.path.join(m_root, "products"))
        sync_dir(SOURCE_PRODUCTS, os.path.join(m_root, "website", "products"))
        # Sync pages & directories
        sync_dir(os.path.join(SOURCE_WEBSITE, "quiz"), os.path.join(m_root, "quiz"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "samples"), os.path.join(m_root, "samples"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "knowledge-hub"), os.path.join(m_root, "knowledge-hub"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "admin"), os.path.join(m_root, "admin"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "pdf"), os.path.join(m_root, "pdf"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "quiz"), os.path.join(m_root, "website", "quiz"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "samples"), os.path.join(m_root, "website", "samples"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "knowledge-hub"), os.path.join(m_root, "website", "knowledge-hub"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "admin"), os.path.join(m_root, "website", "admin"))
        sync_dir(os.path.join(SOURCE_WEBSITE, "pdf"), os.path.join(m_root, "website", "pdf"))
        
        # Sync single files
        for fname, folder in [("order-success.html", ""), ("pillar_intake.html", "tools")]:
            src_f = os.path.join(ROOT_DIR, folder, fname) if folder else os.path.join(ROOT_DIR, fname)
            if os.path.exists(src_f):
                dst_f = os.path.join(m_root, folder, fname) if folder else os.path.join(m_root, fname)
                os.makedirs(os.path.dirname(dst_f), exist_ok=True)
                shutil.copy2(src_f, dst_f)
                dst_web_f = os.path.join(m_root, "website", folder, fname) if folder else os.path.join(m_root, "website", fname)
                os.makedirs(os.path.dirname(dst_web_f), exist_ok=True)
                shutil.copy2(src_f, dst_web_f)
        
        # Sync top-level HTML pages
        for f in os.listdir(SOURCE_WEBSITE):
            if f.endswith(".html") or f.endswith(".json") or f.endswith(".xml") or f.endswith(".svg"):
                src_f = os.path.join(SOURCE_WEBSITE, f)
                dst_f = os.path.join(m_root, f)
                dst_web_f = os.path.join(m_root, "website", f)
                shutil.copy2(src_f, dst_f)
                os.makedirs(os.path.join(m_root, "website"), exist_ok=True)
                shutil.copy2(src_f, dst_web_f)
                
        print(f"Synced full web deployment mirror: {os.path.relpath(m_root, ROOT_DIR)}")

    # 3. Sync bundles
    sync_dir(os.path.join(ROOT_DIR, "website", "training bundle"), os.path.join(ROOT_DIR, "training bundle"))
    sync_dir(os.path.join(ROOT_DIR, "website", "nutrition bundle"), os.path.join(ROOT_DIR, "nutrition bundle"))
    for m_root in MIRROR_ROOTS:
        if os.path.exists(m_root):
            sync_dir(os.path.join(ROOT_DIR, "website", "training bundle"), os.path.join(m_root, "training bundle"))
            sync_dir(os.path.join(ROOT_DIR, "website", "training bundle"), os.path.join(m_root, "website", "training bundle"))
            sync_dir(os.path.join(ROOT_DIR, "website", "nutrition bundle"), os.path.join(m_root, "nutrition bundle"))
            sync_dir(os.path.join(ROOT_DIR, "website", "nutrition bundle"), os.path.join(m_root, "website", "nutrition bundle"))

    print("\nAll mirrors synchronized successfully!")

if __name__ == "__main__":
    run_sync()
