#!/usr/bin/env python3
"""Muscle OS training tool build script.

The deliverable is the single-file tools/training_tool.html. Its source of
truth lives in training_tool_src/ as parts (head, css/*, body/*, js/*), and
this script assembles them back into the single file in EXACT byte order, so
the built artifact is byte-identical to what the parts define.

Usage:
    python build.py --extract      # slice current training_tool.html into parts
    python build.py                # assemble parts -> training_tool.html + 7 mirrors
    python build.py --check-js     # node --check on the concatenated JS
    python build.py --verify       # assert current file == assembled parts
    python build.py --ranges       # recompute PARTS line ranges from part files

To add a part: insert a (kind, path, start, end) entry in PARTS. 'file' parts
are 1-indexed inclusive line slices; 'text' parts are literal strings.
After adding a part (or any line-count-changing edit), run
`python build.py --ranges` to refresh the line ranges, then `--verify`.
"""

import hashlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # tools/
CANONICAL = os.path.join(ROOT, "training_tool.html")

MIRRORS = [
    os.path.join(ROOT, "..", "training bundle", "training_tool.html"),
    os.path.join(ROOT, "..", "website", "tools", "training_tool.html"),
    os.path.join(ROOT, "..", "website", "training bundle", "training_tool.html"),
    os.path.join(ROOT, "..", "public", "main", "tools", "training_tool.html"),
    os.path.join(ROOT, "..", "public", "main", "training bundle", "training_tool.html"),
    os.path.join(ROOT, "..", "public", "master", "tools", "training_tool.html"),
    os.path.join(ROOT, "..", "public", "master", "training bundle", "training_tool.html"),
]

# (kind, rel_path, start_line, end_line)  — 1-indexed inclusive line ranges
PARTS = [
    ("file", "head.html", 1, 13),
    ("file", "css/01_base.css", 14, 333),
    ("file", "css/02_powerlifting.css", 334, 342),
    ("file", "css/03_fatigue.css", 343, 372),
    ("file", "css/04_cardio.css", 373, 385),
    ("file", "css/05_periodization.css", 386, 390),
    ("file", "css/06_meso_cal.css", 391, 413),
    ("file", "css/07_meso_hist.css", 414, 420),
    ("file", "css/08_acwr.css", 421, 425),
    ("file", "css/09_warmup.css", 426, 441),
    ("file", "css/10_general_warmup.css", 442, 447),
    ("file", "css/11_rehab.css", 448, 471),
    ("file", "css/12_exselection.css", 472, 603),
    ("file", "css/13_library.css", 604, 624),
    ("file", "css/14_paywall.css", 625, 647),
    ("file", "css/15_animation.css", 648, 664),
    ("file", "css/16_streak.css", 665, 699),
    ("file", "css/17_polish.css", 700, 757),
    ("file", "css/18_style_close.css", 758, 758),
    ("file", "head_close.html", 759, 760),
    ("file", "body_open.html", 761, 829),
    ("file", "body/01_screen1_onboarding.html", 830, 909),
    ("file", "body/02_screen2_volume.html", 910, 992),
    ("file", "body/03_screen3_review.html", 993, 1011),
    ("file", "body/04_screen35_meso.html", 1012, 1205),
    ("file", "body/05_screen5_history.html", 1206, 1298),
    ("file", "js/01_open.js", 1299, 1300),
    ("file", "js/02_data.js", 1301, 1334),
    ("file", "js/03_i18n.js", 1335, 2121),
    ("file", "js/04_lang_toggle.js", 2122, 2188),
    ("file", "js/05_injury_joints.js", 2189, 2501),
    ("file", "js/06_pools_svg.js", 2502, 2541),
    ("file", "js/07_guides_meta.js", 2542, 2832),
    ("file", "js/08_rpe_splits.js", 2833, 2981),
    ("file", "js/08b_events.js", 2982, 3083),
    ("file", "js/09_pl_weakpoints_quiz.js", 3084, 3202),
    ("file", "js/10_engines.js", 3203, 3974),
    ("file", "js/11_layer1_volprio.js", 3975, 4465),
    ("file", "js/12_layer3_est_router.js", 4466, 4629),
    ("file", "js/13_screen2_split.js", 4630, 4716),
    ("file", "js/14_screen25_picker.js", 4717, 5020),
    ("file", "js/15_screen3_generate.js", 5021, 5116),
    ("file", "js/16_share_card.js", 5117, 5188),
    ("file", "js/17_screen4_dash.js", 5189, 5224),
    ("file", "js/18_features.js", 5225, 6012),
    ("file", "js/19_wiring.js", 6013, 6186),
    ("file", "js/20_screen5_history.js", 6187, 6387),
    ("file", "js/21_export_import.js", 6388, 6409),
    ("file", "js/22_init.js", 6410, 6446),
    ("file", "js/23_data_sync.js", 6447, 6611),
    ("file", "js/24_custom_exercises.js", 6612, 6640),
    ("file", "js/25_library.js", 6641, 6695),
    ("file", "js/26_close.js", 6696, 6696),
    ("file", "modals.html", 6697, 6745),
    ("file", "js/27_modals_open.js", 6746, 6747),
    ("file", "js/28_modals.js", 6748, 6945),
    ("file", "js/29_close.js", 6946, 6946),
    ("file", "body_close.html", 6947, 6948),
]


def read_lines(path):
    with open(path, "rb") as f:
        return f.read().splitlines(keepends=True)


def part_path(rel):
    return os.path.join(HERE, rel)


def extract():
    lines = read_lines(CANONICAL)
    for kind, rel, start, end in PARTS:
        if kind != "file":
            continue
        part = b"".join(lines[start - 1:end])
        dest = part_path(rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(part)
        print("extracted %s (%d lines)" % (rel, end - start + 1))
    rebuilt = assemble()
    print("round-trip: %s" % ("OK byte-identical" if rebuilt == b"".join(lines) else "MISMATCH!"))


def assemble():
    out = bytearray()
    for kind, rel, start, end in PARTS:
        if kind == "text":
            out += rel.encode("utf-8")
        else:
            with open(part_path(rel), "rb") as f:
                out += f.read()
    return bytes(out)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def write_canonical_and_mirrors(data):
    targets = [CANONICAL] + MIRRORS
    written = []
    for t in targets:
        norm = os.path.normpath(t)
        if not os.path.exists(os.path.dirname(norm)):
            print("skip (no dir): %s" % norm)
            continue
        with open(norm, "wb") as f:
            f.write(data)
        written.append(norm)
    print("built %d copies, sha256=%s" % (len(written), sha256(data)[:16]))
    for t in written:
        with open(t, "rb") as f:
            print("  %s  %s" % (sha256(f.read())[:16], t))


def check_js():
    parts = []
    for kind, rel, start, end in PARTS:
        if kind == "file" and rel.startswith("js/"):
            with open(part_path(rel), "rb") as f:
                parts.append(f.read())
    js = b"\n".join(parts).decode("utf-8", errors="replace")
    js = js.replace("<script>", "").replace("</script>", "")
    tmp = os.path.join(HERE, "_check.js")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    os.remove(tmp)
    if r.returncode == 0:
        print("node --check: OK")
        return True
    print(r.stderr)
    return False


def verify():
    with open(CANONICAL, "rb") as f:
        current = f.read()
    rebuilt = assemble()
    if current == rebuilt:
        print("verify: OK — training_tool.html matches parts (%d bytes)" % len(current))
        return True
    print("verify: MISMATCH — %d bytes current vs %d assembled" % (len(current), len(rebuilt)))
    return False


def update_ranges():
    """Recompute PARTS line ranges from the part files' current line counts.

    Ranges are prefix sums over file line counts, which is exactly how
    extract() slices the canonical back into parts. Rewrites the PARTS
    literal in this file in place.
    """
    out = []
    cur = 1
    for kind, rel, _s, _e in PARTS:
        if kind != "file":
            out.append((kind, rel, _s, _e))
            continue
        n = len(read_lines(part_path(rel)))
        out.append((kind, rel, cur, cur + n - 1))
        cur += n
    with open(__file__, "r", encoding="utf-8") as f:
        src = f.read()
    new_block = "PARTS = [\n" + "".join(
        '    ("%s", "%s", %d, %d),\n' % (k, r, s, e) for k, r, s, e in out
    ) + "]"
    import re
    src2 = re.sub(r"PARTS = \[.*?\n\]", new_block, src, count=1, flags=re.S)
    with open(__file__, "w", encoding="utf-8", newline="\n") as f:
        f.write(src2)
    print("ranges updated: %d parts" % len(out))


def main():
    if "--extract" in sys.argv:
        extract()
        return 0
    if "--check-js" in sys.argv:
        return 0 if check_js() else 1
    if "--verify" in sys.argv:
        return 0 if verify() else 1
    if "--ranges" in sys.argv:
        update_ranges()
        return 0
    data = assemble()
    write_canonical_and_mirrors(data)
    ok = check_js()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
