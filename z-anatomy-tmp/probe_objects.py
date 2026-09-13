import bpy, re, sys, os

blend = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.open_mainfile(filepath=blend)

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
print(f"MESH objects: {len(meshes)}")

def tri_count(obj):
    return sum(p.loop_total for p in obj.data.polygons) if obj.data.polygons else 0

NORM = re.compile(r"[^a-z0-9]+")
def norm(name):
    s = re.sub(r"muscle", "", name, flags=re.I).lower()
    return NORM.sub(" ", s).strip()

def classify(name, tris):
    if tris <= 0:
        return None
    if re.search(r"\.o[dlr]$", name):
        return "origin"
    if re.search(r"\.e[dlr]$", name):
        return "insertion"
    if name.endswith(".l") or name.endswith(".r"):
        return "body"
    return None

bodies = [o for o in meshes if classify(o.name, tri_count(o)) == "body"]
no_tris = [o for o in meshes if tri_count(o) <= 0]
print(f"body-classified: {len(bodies)}  |  mesh objects with 0 tris: {len(no_tris)}")
print("sample bodies:")
for o in bodies[:20]:
    print("   ", repr(o.name), tri_count(o))
print("sample 0-tris:")
for o in no_tris[:10]:
    print("   ", repr(o.name))