import re, sys, io, json

dump_path = sys.argv[1]
out_path = sys.argv[2]

lines = open(dump_path, encoding="utf-8").read().splitlines()
header = lines[0]
rows = []
for ln in lines[1:]:
    parts = ln.split("\t")
    name = parts[0]
    parent = parts[1] if len(parts) > 1 else "-"
    faces = int(parts[2]) if len(parts) > 2 else 0
    tris = int(parts[3]) if len(parts) > 3 else 0
    rows.append((name, parent, faces, tris))

# Suffix classification
def classify(name, parent, tris):
    stem = name
    if tris == 0:
        return ("empty", stem)
    if name.endswith(".g"):
        return ("group", stem)
    if name.endswith(".s"):
        return ("surface", stem)
    if name.endswith(".t"):
        return ("line", stem)
    if name.endswith(".i"):
        return ("line", stem)
    if name.endswith(".j"):
        return ("joint", stem)
    if re.search(r"\.o[dlr]$", name):
        return ("origin", re.sub(r"\.o[dlr]$", "", name))
    if re.search(r"\.e[dlr]$", name):
        return ("insertion", re.sub(r"\.e[dlr]$", "", name))
    if name.endswith(".l") or name.endswith(".r"):
        return ("body", re.sub(r"\.[lr]$", "", name))
    return ("other", stem)

counts = {}
by_kind = {}
total_by_kind = {}
for name, parent, faces, tris in rows:
    kind, stem = classify(name, parent, tris)
    counts[kind] = counts.get(kind, 0) + 1
    total_by_kind[kind] = total_by_kind.get(kind, 0) + tris
    by_kind.setdefault(kind, []).append((name, stem, parent, tris))

summary = {}
for k in sorted(counts):
    summary[k] = {"count": counts[k], "tris": total_by_kind[k]}

muscle_keyword = re.compile(r"muscle|fascia|M\.\s|ligament|aponeurosis|tendon", re.I)

# body objects that are plausibly muscle (name mentions muscle or is a known muscle region)
body_muscle = [r for r in by_kind.get("body", []) if muscle_keyword.search(r[1])]
all_body = by_kind.get("body", [])
other_bodies = [r for r in all_body if not muscle_keyword.search(r[1])]

print(json.dumps({
    "summary": summary,
    "body_objects_total": len(all_body),
    "body_muscle_count": len(body_muscle),
    "body_muscle_tris": sum(r[3] for r in body_muscle),
    "other_body_no_muscle_keyword": len(other_bodies),
}, indent=2))

with open(out_path, "w", encoding="utf-8") as f:
    f.write("== SUMMARY ==\n")
    f.write(json.dumps(summary, indent=2) + "\n")
    f.write("\n== MUSCLE BODY OBJECTS (name\tstem\tparent\ttris) ==\n")
    for name, stem, parent, tris in sorted(body_muscle, key=lambda r: -r[3]):
        f.write(f"{name}\t{stem}\t{parent}\t{tris}\n")
    f.write("\n== OTHER BODY OBJECTS WITHOUT MUSCLE KEYWORD ==\n")
    for name, stem, parent, tris in sorted(other_bodies, key=lambda r: -r[3]):
        f.write(f"{name}\t{stem}\t{parent}\t{tris}\n")

print("WROTE", out_path)