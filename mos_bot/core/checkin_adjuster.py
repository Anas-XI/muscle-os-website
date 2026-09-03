"""Deterministic Check-in Adjustment Engine mapped strictly to ADJUSTMENTS.md.

Evaluates weekly check-in telemetry (weight change, readiness, sleep, soreness, adherence)
and generates rule-based nutrition, training, and recovery adjustments.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class CheckinTelemetry:
    weight_kg: float
    goal: str = "hypertrophy"
    waist_cm: Optional[float] = None
    sleep_hours: float = 7.5
    readiness: int = 7          # 1-10 scale
    soreness_duration_hours: int = 24  # DOMS duration
    adherence_pct: int = 100    # 0-100%
    joint_pain: bool = False
    current_calories: Optional[int] = None
    historical_weights: List[float] = field(default_factory=list)


@dataclass
class CheckinAdjustmentResult:
    status: str  # "on_track", "adjust_nutrition", "adjust_training", "recovery_priority", "deload_recommended"
    actions: List[str] = field(default_factory=list)
    calorie_adjustment_kcal: int = 0
    step_adjustment_daily: int = 0
    volume_adjustment_pct: int = 0
    deload_flag: bool = False
    rules_applied: List[str] = field(default_factory=list)

    def format_summary(self) -> str:
        if not self.actions:
            return "✅ **Check-in Analysis:** All metrics are on track. Continue with current training and nutrition plan."
        
        lines = ["📋 **Weekly Adjustments (per Muscle OS Decision Engine):**"]
        for i, act in enumerate(self.actions, 1):
            lines.append(f"  {i}. {act}")
        return "\n".join(lines)


def evaluate_weekly_adjustments(current: CheckinTelemetry) -> CheckinAdjustmentResult:
    """Evaluate current check-in against ADJUSTMENTS.md diagnostic matrices."""
    result = CheckinAdjustmentResult(status="on_track")
    goal = current.goal.lower().replace(" ", "_")

    weights = list(current.historical_weights)
    if not weights or weights[-1] != current.weight_kg:
        weights.append(current.weight_kg)

    # 1. Nutrition & Weight Dynamics (ADJUSTMENTS.md lines 19-30)
    if len(weights) >= 2:
        weight_delta = weights[-1] - weights[0]
        weeks = max(len(weights) - 1, 1)
        weekly_rate = weight_delta / weeks

        # Goal: Fat Loss / Deficit
        if goal in ("fat_loss", "cut", "lose_fat"):
            # Plateau in deficit: weight stable (< 0.1 kg loss/wk) for 2+ weeks
            if weekly_rate > -0.1 and weeks >= 2:
                result.actions.append(
                    "**Weight Plateau in Deficit:** Weight has been stable for 2+ weeks. "
                    "Action: Reduce 100–200 kcal/day OR increase daily steps by 2,000 steps/day (ADJUSTMENTS.md:23)."
                )
                result.calorie_adjustment_kcal -= 150
                result.step_adjustment_daily += 2000
                result.rules_applied.append("ADJ-NU-PLATEAU")
                result.status = "adjust_nutrition"
            
            # Too fast in deficit: > 1% bodyweight loss / week
            elif weekly_rate < -(current.weight_kg * 0.01):
                result.actions.append(
                    f"**Aggressive Deficit:** Weight loss is >1% bodyweight/week ({abs(weekly_rate):.2f} kg/wk). "
                    "Action: Increase calories by 100–200 kcal/day to protect lean muscle mass and recovery (ADJUSTMENTS.md:24)."
                )
                result.calorie_adjustment_kcal += 150
                result.rules_applied.append("ADJ-NU-TOO-FAST")
                result.status = "adjust_nutrition"

        # Goal: Hypertrophy / Bulk / Surplus
        elif goal in ("hypertrophy", "build_muscle", "bulk", "strength"):
            # Losing weight in surplus
            if weekly_rate < 0.0 and weeks >= 2:
                result.actions.append(
                    f"**Unintended Weight Loss in Surplus:** Losing weight ({weekly_rate:.2f} kg/wk). "
                    "Action: Increase calories by 200–300 kcal/day to establish a true anabolic surplus (ADJUSTMENTS.md:25)."
                )
                result.calorie_adjustment_kcal += 250
                result.rules_applied.append("ADJ-NU-SURPLUS-LOSING")
                result.status = "adjust_nutrition"

            # Plateau in surplus: weight stable (0 to < 0.1 kg/wk) for 2+ weeks
            elif 0.0 <= weekly_rate < 0.1 and weeks >= 2:
                result.actions.append(
                    "**Surplus Stagnation:** Weight is stable. "
                    "Action: Increase calories by 100–200 kcal/day to sustain muscle growth (ADJUSTMENTS.md:25)."
                )
                result.calorie_adjustment_kcal += 150
                result.rules_applied.append("ADJ-NU-SURPLUS-STABLE")
                result.status = "adjust_nutrition"

            # Too fast in surplus: > 0.5% bodyweight gain / week
            elif weekly_rate > (current.weight_kg * 0.005):
                result.actions.append(
                    f"**Excess Fat Gain:** Weight gain exceeds 0.5% BW/week ({weekly_rate:.2f} kg/wk). "
                    "Action: Reduce surplus by 100–200 kcal/day (ADJUSTMENTS.md:26)."
                )
                result.calorie_adjustment_kcal -= 150
                result.rules_applied.append("ADJ-NU-SURPLUS-TOO-FAST")
                result.status = "adjust_nutrition"

    # 2. Recovery, Fatigue & Deload Signals (ADJUSTMENTS.md lines 7-18, 41-50)
    # Excessive DOMS (>72h)
    if current.soreness_duration_hours >= 72:
        result.actions.append(
            "**Excessive DOMS (>72h):** Training volume exceeds current recovery capacity. "
            "Action: Reduce volume by 2–4 sets per muscle group on affected lifts (ADJUSTMENTS.md:14)."
        )
        result.volume_adjustment_pct -= 20
        result.rules_applied.append("ADJ-TR-EXCESSIVE-DOMS")
        if result.status == "on_track":
            result.status = "adjust_training"

    # Low readiness (<5/10)
    if current.readiness < 5:
        result.actions.append(
            "**Low Systemic Readiness (<5/10):** Accumulated systemic fatigue detected. "
            "Action: Schedule a deload or take a light session (40–50% set volume reduction at same intensity) (ADJUSTMENTS.md:45)."
        )
        result.deload_flag = True
        result.volume_adjustment_pct = -40
        result.rules_applied.append("ADJ-RC-LOW-READINESS")
        result.status = "deload_recommended"

    # 3. Sleep Deficit (ADJUSTMENTS.md lines 31-40)
    if current.sleep_hours < 6.0:
        result.actions.append(
            "**Sleep Deficit (<6h average):** Recovery capacity severely compromised. "
            "Action: Prioritize sleep restoration above all else. Avoid training to failure until sleep normalizes (ADJUSTMENTS.md:37)."
        )
        result.rules_applied.append("ADJ-SL-DEFICIT")
        if result.status != "deload_recommended":
            result.status = "recovery_priority"

    # 4. Adherence & Behavioral Friction (ADJUSTMENTS.md lines 51-61)
    if current.adherence_pct < 80:
        result.actions.append(
            f"**Adherence Friction ({current.adherence_pct}% compliance):** Routine complexity is causing missed workouts. "
            "Action: Simplify program to Minimum Viable Habit (MVH) — 1 primary set per exercise (ADJUSTMENTS.md:55)."
        )
        result.rules_applied.append("ADJ-AD-SIMPLIFY")

    # 5. Joint Pain / Biomechanics (ADJUSTMENTS.md line 15)
    if current.joint_pain:
        result.actions.append(
            "**Joint Discomfort (Non-injury):** Check movement execution. "
            "Action: Reduce active range of motion or swap to joint-friendly machine/cable variation (ADJUSTMENTS.md:15)."
        )
        result.rules_applied.append("ADJ-TR-JOINT-PAIN")

    return result
