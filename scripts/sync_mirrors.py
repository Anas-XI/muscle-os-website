import os, shutil, sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_TOOLS = os.path.join(ROOT_DIR, "website", "tools")
TARGETS = [
    os.path.join(ROOT_DIR, "tools"),
    os.path.join(ROOT_DIR, "public", "main", "tools"),
    os.path.join(ROOT_DIR, "public", "main", "website", "tools")
]

print("=== Synchronizing Muscle OS Tool Mirrors ===")
for target in TARGETS:
    os.makedirs(target, exist_ok=True)
    for root, dirs, files in os.walk(SOURCE_TOOLS):
        rel = os.path.relpath(root, SOURCE_TOOLS)
        dst_root = os.path.join(target, rel)
        os.makedirs(dst_root, exist_ok=True)
        for f in files:
            src_f = os.path.join(root, f)
            dst_f = os.path.join(dst_root, f)
            shutil.copy2(src_f, dst_f)
    print(f"Synced: {SOURCE_TOOLS} -> {target}")

# Sync bundles
train_tool = os.path.join(SOURCE_TOOLS, "training_tool.html")
tdee_tool = os.path.join(SOURCE_TOOLS, "tdee_adaptive_engine.html")

for b_path in [os.path.join(ROOT_DIR, "website", "training bundle"), os.path.join(ROOT_DIR, "training bundle")]:
    if os.path.exists(b_path):
        shutil.copy2(train_tool, os.path.join(b_path, "training_tool.html"))
        print(f"Synced: {b_path}/training_tool.html")

for b_path in [os.path.join(ROOT_DIR, "website", "nutrition bundle"), os.path.join(ROOT_DIR, "nutrition bundle")]:
    if os.path.exists(b_path):
        shutil.copy2(tdee_tool, os.path.join(b_path, "tdee_adaptive_engine.html"))
        print(f"Synced: {b_path}/tdee_adaptive_engine.html")

print("All mirrors synchronized successfully!")
