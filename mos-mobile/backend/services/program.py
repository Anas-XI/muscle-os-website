import json, re
from db_adapter import get_client_profile, deactivate_programs, insert_program


def _parse_mobile_profile(raw: dict) -> dict:
    """Map mobile backend profile fields to mos_bot ClientProfile-compatible fields."""
    mapped = {"user_id": raw.get("user_id", "")}

    goal_map = {
        "build muscle": "hypertrophy", "lose fat": "fat_loss",
        "get stronger": "strength", "recomposition": "recomp",
        "just getting started": "beginner", "not seeing results": "plateaued",
        "feeling run down": "fatigue", "coming back from a break": "returning",
    }
    goal_raw = (raw.get("goal") or "").lower().strip()
    mapped["goal"] = goal_map.get(goal_raw, goal_raw)
    mapped["situation"] = raw.get("situation", "")

    exp_raw = (raw.get("experience") or "").lower()
    if "less than 1" in exp_raw or "< 1" in exp_raw:
        mapped["experience_years"] = 0.5
    elif "1-3" in exp_raw:
        mapped["experience_years"] = 2.0
    elif "3+" in exp_raw or "3+" in exp_raw:
        mapped["experience_years"] = 5.0
    else:
        mapped["experience_years"] = 1.0

    mapped["bodyweight_kg"] = _safe_float(raw.get("weight"), 70.0)
    mapped["height_cm"] = _safe_float(raw.get("height"), 170.0)
    mapped["age"] = _safe_int(raw.get("age"), 25)
    mapped["training_days"] = _safe_int(raw.get("training_days"), 3)
    mapped["session_length_min"] = _safe_int(raw.get("session_length"), 60)
    mapped["current_split"] = raw.get("current_split", "")

    mapped["injuries"] = _parse_json_list(raw.get("injuries"))
    mapped["gut_health"] = raw.get("gut_health", "none")
    mapped["sleep_hours"] = _parse_sleep(raw.get("sleep"))
    mapped["stress_level"] = _parse_stress(raw.get("stress"))
    mapped["daily_steps"] = _safe_int(_parse_numeric(raw.get("steps")), 5000)
    mapped["caffeine_mg"] = _safe_int(_parse_numeric(raw.get("caffeine")), 0)
    mapped["supplements"] = _parse_json_list(raw.get("supplements"))
    mapped["medical"] = _parse_json_list(raw.get("medical_conditions"))
    mapped["daily_water_liters"] = _parse_hydration(raw.get("hydration"))
    mapped["alcohol_weekly"] = _safe_int(_parse_numeric(raw.get("alcohol_weekly")), 0)
    mapped["work_schedule"] = raw.get("work_schedule", "")

    mob_raw = raw.get("mobility", "")
    mapped["mobility_limitations"] = [mob_raw] if mob_raw and mob_raw.lower() != "none" else []

    mapped["last_bloodwork"] = raw.get("bloodwork", "")
    mapped["mental_health_concern"] = _parse_mental_health(raw.get("mental_health"))
    mapped["name"] = raw.get("name", "")
    mapped["sex"] = raw.get("sex", "male")
    mapped["ed_risk"] = _parse_ed_risk(raw.get("ed_screening"))
    mapped["supplement_regimen"] = ", ".join(_parse_json_list(raw.get("supplements")))
    mapped["known_deficiencies"] = _detect_deficiencies(raw)

    return mapped


def _safe_float(v, default=0.0) -> float:
    try: return float(v)
    except (TypeError, ValueError): return default


def _safe_int(v, default=0) -> int:
    try: return int(v)
    except (TypeError, ValueError): return default


def _parse_json_list(v):
    if isinstance(v, list): return v
    if isinstance(v, str):
        v = v.strip()
        if v.startswith("["):
            try: return json.loads(v)
            except json.JSONDecodeError: return [v]
        return [v] if v else []
    return []


def _parse_numeric(v):
    if v is None: return None
    v = str(v)
    m = re.search(r"(\d+\.?\d*)", v)
    return float(m.group(1)) if m else None


def _parse_sleep(v):
    if v is None: return 7.0
    v = str(v).strip().lower()
    m = re.search(r"(\d+\.?\d*)", v)
    if m:
        val = float(m.group(1))
        return max(3.0, min(12.0, val))
    try: return max(3.0, min(12.0, float(v)))
    except (TypeError, ValueError): return 7.0


def _parse_stress(v):
    if v is None: return 5
    v = str(v).strip().lower()
    m = re.search(r"(\d+)", v)
    if m: return max(1, min(10, int(m.group(1))))
    return 5


def _parse_hydration(v):
    if v is None: return 0
    v = str(v).strip().lower()
    m = re.search(r"(\d+\.?\d*)", v)
    if m:
        val = float(m.group(1))
        if val > 10: return val / 1000
        return val
    return 0


def _parse_mental_health(v):
    if not v: return ""
    v = str(v).strip().lower()
    if v in ("moderate", "significant", "severe"):
        return v
    if v in ("yes", "true", "1"):
        return "moderate"
    return "none"


def _parse_ed_risk(v):
    if not v: return False
    if isinstance(v, bool): return v
    v = str(v).lower()
    return v in ("true", "1", "flagged", "yes")


def _detect_deficiencies(raw: dict) -> list:
    defs = []
    text = json.dumps(raw).lower()
    keywords = ["deficiency", "deficient", "vitamin d", "iron", "b12", "folate", "zinc", "magnesium"]
    for kw in keywords:
        if kw in text and kw not in defs:
            defs.append(kw)
    return defs


def generate_program_for_user(user_id: str) -> dict:
    profile = get_client_profile(user_id)
    if not profile:
        return {"error": "Profile not found. Complete intake first."}

    mos_profile = _parse_mobile_profile(profile)

    try:
        from mos_bot.core.program_generator import generate_program as gp

        program_md = gp(mos_profile)
    except Exception as e:
        import traceback
        program_md = f"Error generating program:\n{traceback.format_exc()}"

    if program_md is None:
        return {"error": "Program generation blocked — profile requires professional screening before a program can be built."}

    deactivate_programs(user_id)
    pid = insert_program({
        "user_id": user_id,
        "title": f"Program {profile.get('goal', 'General')}",
        "content": program_md,
    })

    return {"program_id": pid, "content": program_md}
