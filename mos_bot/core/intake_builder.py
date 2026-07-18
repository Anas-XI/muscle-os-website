import json
import os
from datetime import date
from mos_bot.config import USERS_DIR, SUPPLEMENTAL_DIR


def parse_weight(text: str) -> float:
    text = text.strip().lower().replace(",", "")
    if "kg" in text:
        num = text.replace("kg", "").strip()
        return float(num)
    elif "lb" in text:
        num = text.replace("lb", "").strip()
        return round(float(num) * 0.453592, 1)
    try:
        return float(text)
    except ValueError:
        raise ValueError("Could not parse weight")


def parse_height(text: str) -> float:
    text = text.strip().lower()
    import re
    m = re.match(r"(\d+)'(\d+)\"?\s*$", text)
    if m:
        ft, inc = int(m.group(1)), int(m.group(2))
        return round(ft * 30.48 + inc * 2.54, 1)
    m2 = re.match(r"(\d+)'?\s*$", text)
    if m2 and text.endswith("'"):
        return round(int(m2.group(1)) * 30.48, 1)
    if "cm" in text:
        return float(text.replace("cm", "").strip())
    try:
        return float(text)
    except ValueError:
        raise ValueError("Could not parse height")


GOAL_MAP = {
    "Lose fat": "fat_loss",
    "Build muscle": "hypertrophy",
    "Get stronger": "strength",
    "Recomposition": "recomp",
}

EXPERIENCE_YEARS_MAP = {
    "Less than 1 year": 0.5,
    "1-3 years": 2,
    "3+ years": 5,
}

TRAINING_DAYS_MAP = {"1-2 days": 2, "3-4 days": 4, "5+ days": 5}

SESSION_LENGTH_MAP = {
    "Under 45 min": 35,
    "45-75 min": 60,
    "75-100 min": 90,
    "100+ min": 110,
}

SITUATION_MAP = {
    "Just getting started": "beginner",
    "Not seeing results": "plateaued",
    "Feeling run down": "overtrained",
    "Coming back from a break": "returning",
}

INJURY_MAP = {"No injuries": False, "Yes, describe \u2192": True}

GUT_MAP = {"None": "none", "Mild": "mild", "Significant": "significant"}

SLEEP_MAP = {"Under 6h": 5, "6-7h": 6.5, "7-8h": 7.5, "8h+": 8.5}

STRESS_MAP = {"Low (1-3)": 2, "Moderate (4-6)": 5, "High (7-10)": 8}

STEPS_MAP = {
    "Under 5,000": 3000,
    "5,000-10,000": 7500,
    "10,000+": 12000,
    "I don't track": 0,
}

CAFFEINE_MAP = {
    "None": 0,
    "1 coffee (~100mg)": 100,
    "2-3 coffees (~200-300mg)": 250,
    "4+ coffees (400mg+)": 400,
}


WATER_MAP = {3: 1.5, 5: 2.5, 8: 3.5}
ALCOHOL_MAP = {"0": 0, "1_2": 2, "3_7": 5, "8_14": 10, "15_plus": 18}

def build_profile(raw: dict) -> dict:
    def list_field(key):
        v = raw.get(key)
        if isinstance(v, list):
            return v
        if not v:
            return []
        return [v]

    profile = {
        "user_id": raw.get("user_id", ""),
        "name": raw.get("name", ""),
        "date": date.today().isoformat(),
        "goal": GOAL_MAP.get(raw.get("goal", ""), raw.get("goal", "")),
        "situation": SITUATION_MAP.get(raw.get("situation", ""), raw.get("situation", "")),
        "bodyweight_kg": raw.get("bodyweight_kg", 0) if isinstance(raw.get("bodyweight_kg"), (int, float)) else (parse_weight(raw.get("bodyweight_kg")) if raw.get("bodyweight_kg") else 0),
        "height_cm": raw.get("height_cm", 0) if isinstance(raw.get("height_cm"), (int, float)) else (parse_height(raw.get("height_cm")) if raw.get("height_cm") else 0),
        "age": int(raw.get("age", 0)),
        "sex": raw.get("sex", "male"),
        "training_days": TRAINING_DAYS_MAP.get(raw.get("training_days", ""), 3),
        "session_length_min": SESSION_LENGTH_MAP.get(raw.get("session_length", ""), 60),
        "experience_years": EXPERIENCE_YEARS_MAP.get(raw.get("experience", ""), 0),
        "current_split": raw.get("current_split", ""),
        "injuries": raw.get("injuries", []),
        "gut_health": GUT_MAP.get(raw.get("gut_health", ""), raw.get("gut_health", "none")),
        "bowel_frequency_weekly": raw.get("bowel_frequency_weekly", 0),
        "fermented_foods": raw.get("fermented_foods", ""),
        "antibiotic_recent": raw.get("antibiotic_recent", False),
        "supplement_regimen": raw.get("supplement_regimen", ""),
        "vegan_unsupplemented": raw.get("vegan_unsupplemented", False),
        "sleep_hours": SLEEP_MAP.get(raw.get("sleep", ""), 7),
        "stress_level": STRESS_MAP.get(raw.get("stress", ""), 5),
        "daily_water_liters": raw.get("daily_water_liters", 0),
        "urine_color": raw.get("urine_color", ""),
        "muscle_cramps": raw.get("muscle_cramps", False),
        "alcohol_weekly": ALCOHOL_MAP.get(raw.get("alcohol_weekly", "0"), 0) if isinstance(raw.get("alcohol_weekly"), str) else raw.get("alcohol_weekly", 0),
        "alcohol_near_bed": raw.get("alcohol_near_bed", False),
        "daily_steps": STEPS_MAP.get(raw.get("steps", ""), 0),
        "caffeine_mg": CAFFEINE_MAP.get(raw.get("caffeine", ""), 0),
        "work_schedule": raw.get("work_schedule", ""),
        "reliable_hours_weekly": raw.get("reliable_hours_weekly", 0),
        "mobility_limitations": list_field("mobility_limitations"),
        "joint_pain": raw.get("joint_pain", ""),
        "supplements": raw.get("supplements", []),
        "medical": raw.get("medical", []),
        "last_bloodwork": raw.get("last_bloodwork", ""),
        "known_deficiencies": list_field("known_deficiencies"),
        "deficiency_status": raw.get("deficiency_status", "current"),
        "deficiency_confirmed": raw.get("deficiency_confirmed", False),
        "family_history": list_field("family_history"),
        "mental_health_concern": raw.get("mental_health_concern", ""),
        "mental_health_care": raw.get("mental_health_care", ""),
        "rapid_weight_loss": raw.get("rapid_weight_loss", False),
        "crisis_incident_id": raw.get("crisis_incident_id", ""),
        "crisis_cleared_incident": raw.get("crisis_cleared_incident", ""),
        "ed_risk": raw.get("ed_risk", False),
        "triage_result": raw.get("triage_result", "green"),
        "inbody": raw.get("inbody"),
    }
    return profile


def save_profile(profile: dict):
    os.makedirs(USERS_DIR, exist_ok=True)
    path = os.path.join(USERS_DIR, f"{profile['user_id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)
    return path


def load_profile(user_id: str) -> dict:
    path = os.path.join(USERS_DIR, f"{user_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_supplemental(user_id: str, data: dict) -> str:
    os.makedirs(SUPPLEMENTAL_DIR, exist_ok=True)
    path = os.path.join(SUPPLEMENTAL_DIR, f"{user_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return path


def load_supplemental(user_id: str) -> dict:
    path = os.path.join(SUPPLEMENTAL_DIR, f"{user_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
