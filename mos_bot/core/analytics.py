import json
import os
from datetime import datetime, timezone
from mos_bot.config import DATA_ROOT

_ANALYTICS_DIR = os.path.join(DATA_ROOT, "analytics")
_EVENTS_FILE = os.path.join(_ANALYTICS_DIR, "events.jsonl")


def _ensure_dir():
    os.makedirs(_ANALYTICS_DIR, exist_ok=True)


def track(event: str, user_id: str, properties: dict = None):
    _ensure_dir()
    record = {
        "event": event,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "properties": properties or {},
    }
    try:
        with open(_EVENTS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        pass


def get_metrics() -> dict:
    _ensure_dir()
    if not os.path.exists(_EVENTS_FILE):
        return {"users_total": 0, "intakes_completed": 0, "checkins_completed": 0, "coach_questions": 0}

    users = set()
    intakes = 0
    checkins = 0
    coach = 0

    with open(_EVENTS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            uid = ev.get("user_id", "?")
            users.add(uid)
            evt = ev.get("event", "")
            if evt == "intake_completed":
                intakes += 1
            elif evt == "checkin_completed":
                checkins += 1
            elif evt == "coach_question":
                coach += 1

    return {
        "users_total": len(users),
        "intakes_completed": intakes,
        "checkins_completed": checkins,
        "coach_questions": coach,
    }
