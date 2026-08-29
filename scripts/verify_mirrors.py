import os, filecmp, sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_TOOLS = os.path.join(ROOT_DIR, "website", "tools")
TARGETS = [
    os.path.join(ROOT_DIR, "tools"),
    os.path.join(ROOT_DIR, "public", "main", "tools"),
    os.path.join(ROOT_DIR, "public", "main", "website", "tools")
]

print("=== Verifying Mirror Integrity ===")
diffs = []
for target in TARGETS:
    if not os.path.exists(target):
        diffs.append(f"Missing target directory: {target}")
        continue
    for root, dirs, files in os.walk(SOURCE_TOOLS):
        rel = os.path.relpath(root, SOURCE_TOOLS)
        for f in files:
            src_f = os.path.join(root, f)
            dst_f = os.path.join(target, rel, f)
            if not os.path.exists(dst_f):
                diffs.append(f"Missing file in mirror {target}: {rel}/{f}")
            elif not filecmp.cmp(src_f, dst_f, shallow=False):
                diffs.append(f"Content divergence in {target}: {rel}/{f}")

if diffs:
    print(f"FAILED: Found {len(diffs)} mirror discrepancies:")
    for d in diffs:
        print(f"  - {d}")
    sys.exit(1)
else:
    print("PASSED: All mirrors are 100% byte-for-byte identical.")
    sys.exit(0)
