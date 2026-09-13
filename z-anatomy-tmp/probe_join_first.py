import bpy, re, sys, os, time

blend = sys.argv[sys.argv.index("--") + 1]
logp = sys.argv[sys.argv.index("--") + 2]

def log(msg):
    with open(logp, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

NORMALIZE_RE = re.compile(r"[^a-z0-9]+")

def normalize_stem(name):
    s = re.sub(r"\.[lr]$", "", name)
    s = re.sub(r"muscle", "", s, flags=re.I)
    s = s.lower()
    return NORMALIZE_RE.sub(" ", s).strip()

def side_of(name):
    if name.endswith(".l"):
        return "L"
    if name.endswith(".r"):
        return "R"
    return None

def tri_count(obj):
    return sum(p.loop_total for p in obj.data.polygons) if obj.data.polygons else 0

bpy.ops.wm.open_mainfile(filepath=blend)
log("blend loaded")

keys = {normalize_stem(s) for s in
        ["sternocostal head of pectoralis major", "abdominal part of pectoralis major"]}

by_key = {}
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    n = o.name
    if not (n.endswith(".l") or n.endswith(".r")):
        continue
    if tri_count(o) <= 0:
        continue
    k = normalize_stem(n)
    if k in keys and side_of(n) == "L":
        by_key.setdefault(k, []).append(o)

sources = []
for k in keys:
    sources.extend(by_key.get(k, []))
log(f"sources: {[o.name for o in sources]}")

def ensure_single_user(obj):
    if obj.data.users > 1:
        obj.data = obj.data.copy()
        log(f"copied data for {obj.name} (was multi-user)")

try:
    for o in sources:
        log(f"step unparent {o.name} users={o.data.users}")
        ensure_single_user(o)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        log(f"step transform_apply {o.name}")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.parent = None
        o.select_set(False)
    log("step select for join")
    bpy.ops.object.select_all(action="DESELECT")
    for o in sources:
        o.select_set(True)
    bpy.context.view_layer.objects.active = sources[0]
    log(f"step join {[o.name for o in sources]}")
    bpy.ops.object.join()
    joined = sources[0]
    joined.name = "pectoralis_major_sternal_L"
    log("step shade_smooth")
    ensure_single_user(joined)
    bpy.ops.object.shade_smooth()
    log("step decimate")
    bpy.ops.object.select_all(action="DESELECT")
    joined.select_set(True)
    bpy.context.view_layer.objects.active = joined
    mod = joined.modifiers.new("dec", "DECIMATE")
    mod.ratio = 0.063
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")
    joined.select_set(False)
    log(f"DONE after={tri_count(joined)}")
except Exception as e:
    import traceback
    log("EXCEPTION: " + repr(e))
    log(traceback.format_exc())