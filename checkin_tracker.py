import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone


@dataclass
class CheckInRecord:
    timestamp: str = ""
    weight_kg: float = 0.0
    waist_cm: float = 0.0
    readiness: int = 5
    adherence_pct: int = 100
    soreness: int = 3
    sleep_hours: float = 7.0
    top_set_reps: list = field(default_factory=list)


class CheckInStore:
    def __init__(self, path: str):
        self.path = path
        self._records: dict[str, list[CheckInRecord]] = {}
        os.makedirs(path, exist_ok=True)

    def _file_path(self, user_id: str) -> str:
        return os.path.join(self.path, f"{user_id}.json")

    def _load_from_disk(self, user_id: str) -> list[CheckInRecord]:
        fp = self._file_path(user_id)
        if not os.path.exists(fp):
            return []
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [CheckInRecord(**r) for r in data]

    def _save_to_disk(self, user_id: str):
        fp = self._file_path(user_id)
        records = self._records.get(user_id, [])
        with open(fp, "w", encoding="utf-8") as f:
            json.dump([asdict(r) for r in records], f, indent=2, ensure_ascii=False)

    def add(self, user_id: str, record: CheckInRecord):
        self._records.setdefault(user_id, []).append(record)
        self._save_to_disk(user_id)

    def load_all(self, user_id: str) -> list[CheckInRecord]:
        if user_id not in self._records:
            self._records[user_id] = self._load_from_disk(user_id)
        return self._records.get(user_id, [])


def _safe_float(v, default=0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _safe_int(v, default=0) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def analyse_trends(records: list[CheckInRecord]) -> list[dict]:
    if len(records) < 2:
        return []

    trends = []

    weights = [r.weight_kg for r in records if r.weight_kg]
    if len(weights) >= 2:
        weight_change = weights[-1] - weights[0]
        weekly_rate = weight_change / max(len(weights) - 1, 1)
        trends.append({
            "metric": "weight",
            "current": weights[-1],
            "start": weights[0],
            "change": round(weight_change, 1),
            "weekly_rate": round(weekly_rate, 2),
            "direction": "down" if weight_change < -0.5 else ("up" if weight_change > 0.5 else "stable"),
        })

    adherence = [r.adherence_pct for r in records if r.adherence_pct]
    if adherence:
        avg_adh = sum(adherence) / len(adherence)
        trends.append({
            "metric": "adherence",
            "average": round(avg_adh, 0),
            "latest": adherence[-1],
            "direction": "good" if avg_adh >= 80 else ("moderate" if avg_adh >= 50 else "low"),
        })

    readiness = [r.readiness for r in records if r.readiness]
    if readiness:
        avg_readiness = sum(readiness) / len(readiness)
        trends.append({
            "metric": "readiness",
            "average": round(avg_readiness, 1),
            "latest": readiness[-1],
            "direction": "good" if avg_readiness >= 7 else ("moderate" if avg_readiness >= 5 else "low"),
        })

    sleep_hours = [r.sleep_hours for r in records if r.sleep_hours]
    if sleep_hours:
        avg_sleep = sum(sleep_hours) / len(sleep_hours)
        trends.append({
            "metric": "sleep",
            "average": round(avg_sleep, 1),
            "latest": sleep_hours[-1],
            "direction": "good" if avg_sleep >= 7 else "low",
        })

    return trends


def suggest_adjustments(trends: list[dict], goal: str, current_calories: int = 2500) -> list[str]:
    adjustments = []

    for t in trends:
        if t["metric"] == "weight" and goal in ("lose_fat", "fat_loss", "cut"):
            if t["weekly_rate"] > -0.1:
                adjustments.append(
                    f"Weight loss is slower than target. Consider reducing calories by 200-300 "
                    f"or increasing NEAT (steps) by 2,000/day."
                )
            elif t["weekly_rate"] < -1.0:
                adjustments.append(
                    f"Weight loss is aggressive (>1 kg/wk). Consider increasing calories by 200 "
                    f"to preserve lean mass and recovery."
                )
        elif t["metric"] == "weight" and goal in ("build_muscle", "hypertrophy", "bulk"):
            if t["weekly_rate"] < 0.1:
                adjustments.append(
                    f"Weight is stable. Increase calories by 200-300/day to drive muscle gain."
                )
            elif t["weekly_rate"] > 1.0:
                adjustments.append(
                    f"Weight gain is aggressive (>1 kg/wk). Reduce surplus to minimize fat gain."
                )

        if t["metric"] == "adherence":
            if t["direction"] == "low":
                adjustments.append(
                    f"Adherence is low ({t['average']:.0f}%). Drop to Minimum Effective Dose: "
                    f"2x/week full body, protein 1.6g/kg, sleep minimum."
                )
            elif t["direction"] == "moderate":
                adjustments.append(
                    f"Adherence is moderate ({t['average']:.0f}%). Focus on 1-2 key habits before "
                    f"adding more complexity."
                )

        if t["metric"] == "sleep":
            if t["direction"] == "low":
                adjustments.append(
                    f"Sleep is low (avg {t['average']:.1f}h). Prioritize 8h minimum for 14 nights "
                    f"before adjusting training variables."
                )

        if t["metric"] == "readiness":
            if t["direction"] == "low":
                adjustments.append(
                    f"Readiness is low (avg {t['average']:.1f}/10). Consider a deload week (50% volume) "
                    f"or reduce training frequency."
                )

    return adjustments


def format_trends(trends: list[dict]) -> str:
    if not trends:
        return "Need at least 2 check-ins to show trends."

    lines = ["📊 **Trends**"]
    for t in trends:
        if t["metric"] == "weight":
            emoji = "\u2197\ufe0f" if t["direction"] == "up" else ("\u2198\ufe0f" if t["direction"] == "down" else "\u2192")
            lines.append(
                f"  {emoji} Weight: {t['current']} kg (changed {t['change']} kg "
                f"over {trends[0]['start']} \u2192 {trends[0]['current']}, "
                f"{t['weekly_rate']}/wk)"
            )
        elif t["metric"] == "adherence":
            lines.append(f"  \u2705 Adherence: avg {t['average']:.0f}%")
        elif t["metric"] == "readiness":
            lines.append(f"  \u26a1 Readiness: avg {t['average']:.1f}/10")
        elif t["metric"] == "sleep":
            lines.append(f"  \u1f634 Sleep: avg {t['average']:.1f}h")
    return "\n".join(lines)


def format_adjustments(adj: list[str]) -> str:
    if not adj:
        return "Everything looks on track \u2014 keep going!"
    lines = []
    for i, a in enumerate(adj, 1):
        lines.append(f"  {i}. {a}")
    return "\n".join(lines)
