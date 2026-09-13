"""Headless helper: dump all mesh objects to a file (avoids stdout noise)."""
import bpy
import io
import sys

path = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else None
out_path = sys.argv[sys.argv.index("--") + 2] if "--" in sys.argv else None

buf = io.StringIO()
bpy.ops.wm.open_mainfile(filepath=path)

meshes = 0
total_tris = 0
lines = []
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    meshes += 1
    mesh = obj.data
    n_faces = len(mesh.polygons)
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    total_tris += tris
    parent = obj.parent.name if obj.parent else "-"
    lines.append(f"{obj.name}\t{parent}\t{n_faces}\t{tris}")

lines.sort(key=lambda l: l.lower())
out = [f"TOTAL_MESHES={meshes} TOTAL_TRIS={total_tris}"]
out.extend(lines)
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("WROTE_OK")