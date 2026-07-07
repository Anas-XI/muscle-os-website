import os, json
from mos_bot.config import VAULT_ROOT

MAX_CHARS = 14000
RELEVANCE_LIMITS = {3: 2000, 2: 1800, 1: 1200, 0: 800}


def _read(*parts) -> str:
    full = os.path.join(VAULT_ROOT, *parts)
    if os.path.exists(full):
        with open(full, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    return ""


def _truncate(content: str, max_chars: int) -> str:
    if len(content) <= max_chars:
        return content
    return content[:max_chars] + "\n\n[... truncated ...]"


def _parse_json_list(val):
    if isinstance(val, list):
        return val
    if isinstance(val, str) and val.strip().startswith("["):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, ValueError):
            return [val]
    return [val] if val else []


DEFICIENCY_KEYWORDS = ["deficiency", "deficient", "vitamin d", "iron", "b12", "folate", "zinc", "magnesium", "calcium"]


def get_vault_context(profile: dict) -> str:
    candidates = []

    seen_labels = set()
    def add(path_parts, priority, relevance=0):
        content = _read(*path_parts) if isinstance(path_parts, tuple) else _read(path_parts)
        if content:
            label = path_parts[-1] if isinstance(path_parts, tuple) else path_parts.split("/")[-1]
            if label in seen_labels:
                return
            seen_labels.add(label)
            candidates.append((relevance, priority, label, content))

    add("Muscle OS Core Engine.md", 0, 0)

    goal = profile.get("goal", "")
    if goal in ("hypertrophy", "bulk") or "build muscle" in goal.lower():
        add(("04_TOOLS", "Decision Trees", "Bulking Decision Tree.md"), 1, 1)
    elif goal in ("fat_loss", "cut") or "lose fat" in goal.lower():
        for fn in ["Cutting Decision Tree.md", "Fat Loss Plateau Decision Tree.md"]:
            p = ("04_TOOLS", "Decision Trees", fn)
            if os.path.exists(os.path.join(VAULT_ROOT, *p)):
                add(p, 1, 1)
                break
    elif goal in ("strength",) or "stronger" in goal.lower():
        for fn in ["Strength Decision Tree.md", "Strength Plateau Decision Tree.md"]:
            p = ("04_TOOLS", "Decision Trees", fn)
            if os.path.exists(os.path.join(VAULT_ROOT, *p)):
                add(p, 1, 1)
                break

    injuries_raw = profile.get("injuries", [])
    injuries = _parse_json_list(injuries_raw)
    has_injuries = bool([i for i in injuries if i])
    if has_injuries:
        add(("04_TOOLS", "Injury-Training Compatibility Matrix.md"), 1, 2)
        rehab = os.path.join(VAULT_ROOT, "04_PROTOCOLS", "Rehab")
        if os.path.isdir(rehab):
            for fname in os.listdir(rehab):
                if not fname.endswith(".md"):
                    continue
                for inj in injuries:
                    words = str(inj).lower().split()
                    if any(kw in fname.lower().replace("-", " ").replace("_", " ") for kw in words):
                        add(("04_PROTOCOLS", "Rehab", fname), 1, 2)
                        break

    sleep = profile.get("sleep_hours", 8)
    if isinstance(sleep, (int, float)) and sleep < 7:
        studies = os.path.join(VAULT_ROOT, "01_RESEARCH", "Studies")
        if os.path.isdir(studies):
            for fname in sorted(os.listdir(studies)):
                if "sleep" in fname.lower() and fname.endswith(".md"):
                    add(("01_RESEARCH", "Studies", fname), 2, 1)
                    break

    alc = profile.get("alcohol_weekly", 0)
    if isinstance(alc, (int, float)) and alc >= 5:
        add(("02_PILLARS", "Pillar 3 - Sleep Maxing.md"), 1, 1)

    urine = profile.get("urine_color", "")
    cramps = profile.get("muscle_cramps", False)
    if urine in ("dark_yellow", "amber_brown") or cramps:
        add(("04_PROTOCOLS", "Hydration Protocol.md"), 2, 1)

    work = profile.get("work_schedule", "")
    if work in ("night", "rotating", "early"):
        add(("04_PROTOCOLS", "Shift Work & Circadian Rhythm Protocol.md"), 2, 1)
        add(("07_PROFILES", "Shift Worker Profile.md"), 2, 1)

    bloodwork = profile.get("last_bloodwork", "")
    bloodwork_val = profile.get("bloodwork", bloodwork)
    if bloodwork_val in ("2yr_plus", "never"):
        add(("05_SYSTEMS", "Bloodwork Recommendation Engine.md"), 2, 2)

    medical_str = profile.get("medical_conditions", "")
    medical_conditions = _parse_json_list(medical_str)
    has_deficiency = False
    if medical_conditions:
        for cond in medical_conditions:
            cond_lower = str(cond).lower()
            for kw in DEFICIENCY_KEYWORDS:
                if kw in cond_lower:
                    has_deficiency = True
                    break

    if has_deficiency:
        add(("05_SYSTEMS", "Bloodwork Recommendation Engine.md"), 1, 3)
        add(("03_SECTIONS", "Pillar 1", "Vitamin D & Calcium Pathway.md"), 1, 3)
        add(("01_RESEARCH", "Supplements", "Vitamins and Minerals Protocol.md"), 1, 3)
        add(("04_TOOLS", "Experiments", "Micronutrient Repletion Experiment.md"), 1, 3)

    mh = profile.get("mental_health_concern", "")
    if mh in ("moderate", "significant"):
        add(("05_SYSTEMS", "Muscle OS Safety Triage.md"), 2, 2)

    gut = profile.get("gut_health", "none")
    fermented = profile.get("fermented_foods", "")
    if gut != "none" or fermented in ("rarely_never",):
        add(("04_PROTOCOLS", "Fiber Progression Protocol.md"), 2, 1)

    mobility_raw = profile.get("mobility_limitations", [])
    mobility = _parse_json_list(mobility_raw)
    joint_pain = profile.get("joint_pain", "")
    if mobility or joint_pain not in ("", "no_pain"):
        add(("03_ASSESSMENTS", "Posture Assessment System.md"), 2, 1)

    add(("02_PILLARS", "Pillar 1 - Diet Maxing.md"), 3, 0)
    add(("02_PILLARS", "Pillar 2 - Training Maxing.md"), 3, 0)
    add(("02_PILLARS", "Pillar 3 - Sleep Maxing.md"), 3, 0)

    for p in [
        ("05_SYSTEMS", "Constraint Resolution Engine.md"),
        ("05_SYSTEMS", "Muscle OS Feedback Loop System.md"),
        ("04_TOOLS", "Exercises", "Exercise Index.md"),
    ]:
        add(p, 4, 0)

    candidates.sort(key=lambda x: (-x[0], x[1]))

    budget = MAX_CHARS
    chunks = []
    for relevance, _, _, content in candidates:
        if budget <= 0:
            break
        per_doc = min(RELEVANCE_LIMITS.get(relevance, 1200), budget)
        truncated = _truncate(content, per_doc)
        chunks.append(truncated)
        budget -= len(truncated)

    return "\n\n---\n\n".join(chunks)
