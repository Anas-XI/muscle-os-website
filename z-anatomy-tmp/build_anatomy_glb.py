"""Build body_muscular_v1.glb from Z-Anatomy Startup.blend.

Usage:
  blender --background --factory-startup --python build_anatomy_glb.py -- <STARTUP.BLEND> <OUT_GLB> [REPORT_JSON]

Pipeline:
  1. Load blend, find all MESH objects named like Z-Anatomy TA2 muscles.
  2. Classify body objects (suffix .l/.r) vs origin(.ol/.or)/insertion(.el/.er)/group(.g)/line(.i/.j/.s/.t).
  3. For each of the 49 manifest muscle nodes, JOIN its Z-Anatomy source stems into one mesh
     (e.g. sternal + abdominal pectoralis -> pectoralis_major_sternal_L/R), rename snake_case_<SIDE>.
  4. Split Rectus abdominis into upper/lower by z-midpoint.
  5. Export remaining non-highlight muscle objects as body "context" (decimated darker tissue).
  6. Assign per-group crimson materials, shade smooth, decimate per node/context, export GLB (subset).
"""
import bpy
import bmesh
import json
import os
import re
import sys
import time
from mathutils import Matrix

start_wall = time.time()

def parse_args(defaults):
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1:]
    return defaults

# ---------------------------------------------------------------------------
# Mapping: normalized Z-Anatomy stem (lowercase, ' muscle' removed, non [a-z0-9] -> space)
# -> manifest node base name (without _L/_R).
# ---------------------------------------------------------------------------

NODE_STEMS = {
    "chest": {
        "pectoralis_major_sternal": ["sternocostal head of pectoralis major",
                                     "abdominal part of pectoralis major"],
        "pectoralis_major_clavicular": ["clavicular head of pectoralis major"],
        "pectoralis_minor": ["pectoralis minor"],
    },
    "back": {
        "latissimus_dorsi": ["latissimus dorsi"],
        "rhomboid_major": ["rhomboid major"],
        "rhomboid_minor": ["rhomboid minor"],
        "teres_major": ["teres major"],
        "erector_spinae": [
            "iliocostalis lumborum", "iliocostalis thoracis", "iliocostalis colli",
            "longissimus thoracis", "longissimus colli", "longissimus capitis",
            "spinalis thoracis", "spinalis colli", "spinalis capitis",
        ],
    },
    "shoulders": {
        "deltoid_anterior": ["clavicular part of deltoid"],
        "deltoid_lateral": ["acromial part of deltoid"],
        "deltoid_posterior": ["scapular spinal part of deltoid"],
        "supraspinatus": ["supraspinatus"],
        "infraspinatus": ["infraspinatus"],
    },
    "biceps": {
        "biceps_brachii_long_head": ["long head of biceps brachii"],
        "biceps_brachii_short_head": ["short head of biceps brachii"],
        "brachialis": ["brachialis"],
    },
    "triceps": {
        "triceps_brachii_lateral_head": ["lateral head of triceps brachii"],
        "triceps_brachii_long_head": ["long head of triceps brachii"],
        "triceps_brachii_medial_head": ["medial head of triceps brachii"],
    },
    "quads": {
        "rectus_femoris": ["rectus femoris"],
        "vastus_lateralis": ["vastus lateralis"],
        "vastus_medialis": ["vastus medialis"],
        "vastus_intermedius": ["vastus intermedius"],
        "adductor_magnus": ["adductor magnus"],
        "adductor_longus": ["adductor longus"],
    },
    "hamstrings": {
        "biceps_femoris_long_head": ["long head of biceps femoris"],
        "biceps_femoris_short_head": ["short head of biceps femoris"],
        "semitendinosus": ["semitendinosus"],
        "semimembranosus": ["semimembranosus"],
    },
    "glutes": {
        "gluteus_maximus": ["gluteus maximus"],
        "gluteus_medius": ["gluteus medius"],
        "gluteus_minimus": ["gluteus minimus"],
        "tensor_fasciae_latae": ["tensor fasciae latae"],
    },
    "calves": {
        "gastrocnemius_medial_head": ["medial head of gastrocnemius"],
        "gastrocnemius_lateral_head": ["lateral head of gastrocnemius"],
        "soleus": ["soleus"],
        "tibialis_anterior": ["tibialis anterior"],
    },
    "traps": {
        "trapezius_upper": ["descending part of trapezius"],
        "trapezius_middle": ["transverse part of trapezius"],
        "trapezius_lower": ["ascending part of trapezius"],
        "levator_scapulae": ["levator scapulae"],
    },
    "forearms": {
        "brachioradialis": ["brachioradialis"],
        "pronator_teres": ["superficial head of pronator teres",
                           "deep head of pronator teres"],
        "flexor_carpi_radialis": ["flexor carpi radialis"],
        "extensor_carpi_radialis": ["extensor carpi radialis longus",
                                    "extensor carpi radialis brevis"],
    },
    "abs": {
        "rectus_abdominis_upper": ["rectus abdominis"],  # split node
        "rectus_abdominis_lower": ["rectus abdominis"],  # split node
        "obliquus_externus": ["external abdominal oblique"],
        "transversus_abdominis": ["transversus abdominis"],
    },
}

SPLIT_NODES = {"rectus_abdominis_upper", "rectus_abdominis_lower"}
SPLIT_STEM = "rectus abdominis"

# group -> rgba-ish base color for distinct muscle tissue tint
GROUP_TINT = {
    "chest": (0.478, 0.18, 0.18),
    "back": (0.431, 0.18, 0.18),
    "shoulders": (0.478, 0.196, 0.196),
    "biceps": (0.494, 0.188, 0.188),
    "triceps": (0.455, 0.188, 0.188),
    "quads": (0.435, 0.192, 0.192),
    "hamstrings": (0.424, 0.18, 0.18),
    "glutes": (0.459, 0.192, 0.192),
    "calves": (0.443, 0.188, 0.188),
    "traps": (0.42, 0.18, 0.18),
    "forearms": (0.47, 0.184, 0.184),
    "abs": (0.455, 0.204, 0.204),
}
CONTEXT_TINT = (0.36, 0.15, 0.15)
HIGHLIGHT_RATIO = 0.063
CONTEXT_RATIO = 0.0285

NORMALIZE_RE = re.compile(r"[^a-z0-9]+")
MUSCLE_RE = re.compile(r"muscle", re.I)

def normalize_stem(name):
    s = re.sub(r"\.[lr]$", "", name)          # strip TA2 side suffix first
    s = re.sub(r"muscle", "", s, flags=re.I)
    s = s.lower()
    return NORMALIZE_RE.sub(" ", s).strip()

def classify(name, tris):
    if tris <= 0:
        return None
    if re.search(r"\.o[dlr]$", name):   # origin on bone
        return "origin"
    if re.search(r"\.e[dlr]$", name):   # tendon/fascia insertion on bone
        return "insertion"
    if name.endswith(".l") or name.endswith(".r"):
        return "body"
    return None  # groups / lines / surfaces

def side_of(name):
    if name.endswith(".l"):
        return "L"
    if name.endswith(".r"):
        return "R"
    return None

def tri_count(obj):
    return sum(p.loop_total for p in obj.data.polygons) if obj.data.polygons else 0

# ---------------------------------------------------------------------------

def main():
    args = parse_args([])
    if len(args) < 2:
        print("USAGE: -- <STARTUP.BLEND> <OUT_GLB> [REPORT_JSON]")
        sys.exit(2)
    blend_path = os.path.abspath(args[0])
    out_glb = os.path.abspath(args[1])
    report_path = os.path.abspath(args[2]) if len(args) > 2 else (
        os.path.join(os.path.dirname(out_glb), "anatomy_build_report.json"))
    out_dir = os.path.dirname(out_glb)
    os.makedirs(out_dir, exist_ok=True)

    journal_path = os.path.join(out_dir, "pipeline_journal.txt")
    def jlog(msg):
        with open(journal_path, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    jlog("== start ==")

    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    print(f"[anatomy] loaded blend in {time.time()-t0:.1f}s")
    jlog("blend loaded")

    # Z-Anatomy embeds registered handlers/timers in the blend. They fire on
    # every depsgraph update, spam the console, throw the load-time
    # ReferenceError, and corrupt active-object/selection state mid-build.
    # We only need static mesh geometry for export, so drop them.
    def _quiet_scene():
        removed = []
        for name in ("load_pre", "load_post", "depsgraph_update_pre",
                     "depsgraph_update_post", "object_add_post",
                     "object_remove_post", "object_select_post",
                     "frame_change_pre", "frame_change_post"):
            hlist = getattr(bpy.app.handlers, name, None)
            if hlist is None:
                continue
            removed.append(f"{name}={len(hlist)}")
            while hlist:
                hlist.pop(0)
        timers = getattr(bpy.app, "timers", None)
        if timers is not None and getattr(timers, "unregister", None) is not None:
            removed.append("timer_api=module")
        return "; ".join(removed)
    print(f"[anatomy] quieted scene: {_quiet_scene()}")
    jlog("handlers cleared")

    # Z-Anatomy's startup scene hides most muscle collections. Joins and
    # selection require visible + selectable bases, so reveal everything.
    def _show_all():
        for c in bpy.data.collections:
            c.hide_viewport = False
            c.hide_render = False
        for o in bpy.data.objects:
            o.hide_set(False)
            o.hide_render = False
    _show_all()
    print("[anatomy] revealed all collections/objects")
    jlog("all revealed")

    # build stem -> normalized key + node lookups
    stem_to_node = {}      # key -> (group, node)
    node_to_keys = {}      # node -> [keys]
    for group, nodes in NODE_STEMS.items():
        for node, stems in nodes.items():
            keys = [normalize_stem(s) for s in stems]
            node_to_keys[node] = keys
            for k in keys:
                stem_to_node[k] = (group, node)

    # gather mesh objects
    all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]

    # partition body objects
    highlight_by_key = {}   # key -> obj
    context_objs = []       # (obj, key, side)
    for obj in all_meshes:
        name = obj.name
        tris = tri_count(obj)
        kind = classify(name, tris)
        if kind != "body":
            continue
        key = normalize_stem(name)
        side = side_of(name)
        if key in stem_to_node and side:
            highlight_by_key.setdefault(key, []).append(obj)
        elif MUSCLE_RE.search(name):
            context_objs.append((obj, key, side))

    print(f"[anatomy] highlight sources: {sum(len(v) for v in highlight_by_key.values())} "
          f"objects across {len(highlight_by_key)} keys | context: {len(context_objs)}")
    jlog("partition done")

    finals = []            # final exported objects
    report_nodes = {}

    def unparent_and_free(obj):
        ensure_single_user(obj)
        obj.parent = None
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.select_set(False)

    def set_node_input(node, values, candidates):
        for c in candidates:
            inp = node.inputs.get(c)
            if inp is not None:
                inp.default_value = values
                return
        print(f"[anatomy] WARN no input for {node.name} among {candidates}")

    def make_material(name, tint):
        if name in bpy.data.materials:
            return bpy.data.materials[name]
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        set_node_input(bsdf, (tint[0], tint[1], tint[2], 1.0), ["Base Color"])
        set_node_input(bsdf, 0.68, ["Roughness"])
        set_node_input(bsdf, 0.35, ["Specular", "Specular IOR Level"])
        return mat

    group_materials = {g: make_material(f"anatomy_{g}", GROUP_TINT[g]) for g in GROUP_TINT}
    context_material = make_material("anatomy_context", CONTEXT_TINT)

    def assign_material(obj, mat):
        ensure_single_user(obj)
        obj.data.materials.clear()
        obj.data.materials.append(mat)

    def ensure_single_user(obj):
        if obj.data.users > 1:
            obj.data = obj.data.copy()

    def decimate(obj, ratio):
        if not obj or ratio >= 1.0:
            return tri_count(obj)
        ensure_single_user(obj)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new("dec", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="dec")
        obj.select_set(False)
        return tri_count(obj)

    def shade_smooth(obj):
        ensure_single_user(obj)
        try:
            obj.data.shade_smooth()
        except Exception:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.shade_smooth()
            obj.select_set(False)
        obj.data.update()

    def bake_world_transform(obj):
        # Bake the object's world matrix into its vertices so geometry is
        # world-space with an identity matrix (view-layer independent).
        ensure_single_user(obj)
        me = obj.data
        mat = obj.matrix_world
        if mat == Matrix.Identity(4):
            return
        me.transform(mat)
        obj.matrix_world = Matrix.Identity(4)
        me.update()

    def _live(o):
        # hard_join() removes absorbed source objects; cached references to
        # them raise ReferenceError on any attribute access. Guard safely.
        try:
            return bpy.data.objects.get(o.name) is o
        except ReferenceError:
            return False

    def hard_join(objects):
        # Operator-join keeps failing in this scene (objects unreachable by
        # view-layer selection), so merge geometry in world space directly.
        target = objects[0]
        ensure_single_user(target)
        target.data.transform(target.matrix_world)
        target.matrix_world = Matrix.Identity(4)
        bm = bmesh.new()
        bm.from_mesh(target.data)
        for o in objects[1:]:
            ensure_single_user(o)
            o.data.transform(o.matrix_world)
            o.data.update()
            bm.from_mesh(o.data)
        bm.normal_update()
        bm.to_mesh(target.data)
        bm.free()
        target.data.update()
        for o in objects[1:]:
            bpy.data.objects.remove(o, do_unlink=True)

    # --- process highlight nodes ----------------------------------------
    used_names = set()

    process_node_graph = []
    for group, nodes in NODE_STEMS.items():
        for node in nodes:
            keys = node_to_keys[node]
            process_node_graph.append((node, keys, group))

    for node, keys, group in process_node_graph:
        if node in SPLIT_NODES:
            continue  # handled by dedicated rectus split below
        for side in ("L", "R"):
            sources = []
            for k in keys:
                for o in highlight_by_key.get(k, []):
                    if not _live(o):
                        continue
                    if side_of(o.name) == side:
                        sources.append(o)
            if not sources:
                report_nodes.setdefault(node, {})[f"{side}_missing"] = True
                print(f"[anatomy] WARN no body sources for {node}_{side}")
                continue
            before = sum(tri_count(o) for o in sources)
            jlog(f"node {node}_{side} sources={len(sources)} tris={before}")
            src_names = [o.name for o in sources]
            # unparent + bake to world space, then merge geometry directly
            # (operator join is unreliable here: view-layer selection fails)
            for o in sources:
                bake_world_transform(o)
                o.parent = None
            hard_join(sources)
            joined = sources[0]
            joined.name = f"{node}_{side}"
            joined.name = joined.name  # force link rename
            joined.select_set(False)
            shade_smooth(joined)
            jlog(f"  joined {joined.name} tris={tri_count(joined)}")
            if node in SPLIT_NODES:
                # postpone decimate: split happens below
                finals.append((joined, group, "highlight_split"))
            else:
                after = decimate(joined, HIGHLIGHT_RATIO)
                jlog(f"  decimate tris={after}")
                assign_material(joined, group_materials[group])
                finals.append((joined, group, "highlight"))
                report_nodes.setdefault(node, {})[side] = {
                    "sources": src_names, "tris_before": before, "tris_after": after}
            used_names.add(f"{node}_{side}")

    # --- Rectus abdominis: join once per side, split into upper/lower ----
    def split_rectus_half(obj, zmid, keep_above):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(
            bm, geom=geom,
            plane_co=(0, 0, zmid), plane_no=(0, 0, 1),
            clear_inner=False, clear_outer=False)
        sign = 1.0 if keep_above else -1.0
        rem = [f for f in bm.faces
               if sign * sum(v.co.z for v in f.verts) / len(f.verts) <
                  sign * zmid - 0.0001]
        if rem:
            bmesh.ops.delete(bm, geom=rem, context="FACES")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return bm

    rectus_stem = normalize_stem(SPLIT_STEM)
    for side in ("L", "R"):
        sources = [o for o in highlight_by_key.get(rectus_stem, [])
                   if _live(o) and side_of(o.name) == side]
        if not sources:
            for node in SPLIT_NODES:
                report_nodes.setdefault(node, {})[f"{side}_missing"] = True
            print(f"[anatomy] WARN no body sources for rectus abdominis_{side}")
            continue
        src_names = [o.name for o in sources]
        for o in sources:
            bake_world_transform(o)
            o.parent = None
        hard_join(sources)
        joined = sources[0]
        joined.name = f"rectus_abdominis_{side}"
        joined.select_set(False)

        bm = bmesh.new()
        bm.from_mesh(joined.data)
        zs = [v.co.z for v in bm.verts]
        zmid = sum(zs) / len(zs)
        bm.free()

        for keep_above, node_base in ((True, "rectus_abdominis_upper"),
                                      (False, "rectus_abdominis_lower")):
            out_name = f"{node_base}_{side}"
            bm2 = split_rectus_half(joined, zmid, keep_above)
            me = bpy.data.meshes.new(out_name)
            bm2.to_mesh(me)
            bm2.free()
            new_obj = bpy.data.objects.new(out_name, me)
            bpy.context.collection.objects.link(new_obj)
            new_obj.matrix_world = joined.matrix_world
            tris_b = tri_count(new_obj)
            shade_smooth(new_obj)
            tris_a = decimate(new_obj, HIGHLIGHT_RATIO)
            jlog(f"  rectus {out_name} tris_b={tris_b} tris_a={tris_a}")
            assign_material(new_obj, group_materials["abs"])
            finals.append((new_obj, "abs", "highlight"))
            report_nodes.setdefault(node_base, {})[side] = {
                "sources": src_names, "tris_before": tris_b, "tris_after": tris_a}
            used_names.add(out_name)
        bpy.data.objects.remove(joined, do_unlink=True)
    print("[anatomy] rectus abdominis split done")
    jlog("rectus split done")

    # --- context muscle objects (everything else) ------------------------
    quick_context = int(os.environ.get("MOS_QUICK_CONTEXT", "0"))
    if quick_context:
        context_objs = sorted(context_objs, key=lambda t: tri_count(t[0]),
                              reverse=True)[:quick_context]
    context_finals = []
    for obj, key, side in context_objs:
        if side is None:
            # asymmetric/median muscle; keep original name, no side suffix
            new_name = NORMALIZE_RE.sub("_", key).strip("_")
        else:
            new_name = f"{NORMALIZE_RE.sub('_', key).strip('_')}_{side}"
        if new_name in used_names or new_name in [f[0].name for f in context_finals]:
            new_name = f"{new_name}_ctx"
        try:
            obj.name = new_name
        except RuntimeError:
            new_name = f"{new_name}_ctx"
            obj.name = new_name
        used_names.add(new_name)
        bake_world_transform(obj)
        shade_smooth(obj)
        after = decimate(obj, CONTEXT_RATIO)
        assign_material(obj, context_material)
        context_finals.append((obj, "context", "context"))
    print(f"[anatomy] context meshes final: {len(context_finals)}")

    # --- export subset as GLB --------------------------------------------
    all_final = finals + context_finals
    total_tris = sum(tri_count(o) for o, *_ in all_final)
    print(f"[anatomy] exporting {len(all_final)} meshes, {total_tris} triangles")
    jlog(f"export {len(all_final)} meshes {total_tris} tris")

    bpy.ops.object.select_all(action="DESELECT")
    exp_coll = bpy.data.collections.new("_mos_glb_export")
    bpy.context.scene.collection.children.link(exp_coll)
    for obj, *_ in all_final:
        obj.hide_set(False)
        for coll in list(obj.users_collection):
            coll.objects.unlink(obj)
        exp_coll.objects.link(obj)
        obj.select_set(True)
    nsel = sum(1 for o in bpy.context.selected_objects)
    jlog(f"export selection={nsel} target={len(all_final)}")
    print(f"[anatomy] export selection active: {len(all_final)} selected={nsel}")
    if nsel != len(all_final):
        raise RuntimeError(f"selection mismatch: {nsel} != {len(all_final)}")

    try:
        bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
    except Exception as e:
        print(f"[anatomy] addon enable note: {e}")

    t1 = time.time()
    kwargs = dict(
        filepath=out_glb,
        export_format="GLB",
        use_selection=True,
        use_mesh_edges=False,
        use_mesh_vertices=False,
        export_apply=False,
        export_tangents=False,
        export_yup=True,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_draco_mesh_compression_enable=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print(f"[anatomy] glb export done in {time.time()-t1:.1f}s")
    if not os.path.exists(out_glb) or os.path.getsize(out_glb) < 2048:
        raise RuntimeError(f"GLB export produced nothing ({out_glb})")

    # --- report ----------------------------------------------------------
    report = {
        "build": "body_muscular_v1",
        "source_blend": blend_path,
        "output_glb": out_glb,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "totals": {
            "meshes_exported": len(all_final),
            "triangles_total": total_tris,
            "highlight_meshes": sum(1 for f in finals),
            "context_meshes": len(context_finals),
            "elapsed_seconds": round(time.time() - start_wall, 1),
        },
        "settings": {
            "highlight_ratio": HIGHLIGHT_RATIO,
            "context_ratio": CONTEXT_RATIO,
        },
        "nodes": report_nodes,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"[anatomy] report -> {report_path}")
    print(f"[anatomy] DONE in {time.time()-start_wall:.1f}s total_tris={total_tris}")


if __name__ == "__main__":
    import traceback as _tb
    try:
        main()
    except Exception:
        _err = _tb.format_exc()
        print(_err)
        _out_dir = None
        for _a in reversed(sys.argv):
            if _a.lower().endswith((".glb", ".json")):
                _out_dir = os.path.dirname(os.path.abspath(_a))
                break
        if _out_dir is None:
            _out_dir = os.getcwd()
        _p = os.path.join(_out_dir, "pipeline_trace.txt")
        try:
            with open(_p, "w", encoding="utf-8") as _f:
                _f.write(_err)
        except Exception:
            pass
        raise