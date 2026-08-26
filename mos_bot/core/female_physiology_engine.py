"""Female Physiology, Hormonal Dynamics & Menstrual Cycle Periodization Engine.

Periodizes training volume, carbohydrate utilization, hydration, and injury risk
across the 3 primary phases of the natural menstrual cycle:
- Phase 1: Early/Mid Follicular (Low Hormone, High Glycogen Utilization, High Volume Tolerance)
- Phase 2: Late Follicular / Ovulatory (Estrogen Peak, Max Strength PR Window, ACL Laxity Caution)
- Phase 3: Luteal Phase (High Progesterone, +0.5°C Core Temp, Higher Protein Breakdown, Autoregulated Deload)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class CyclePhaseRecommendation:
    cycle_day: int
    phase_name: str
    hormonal_profile: str
    training_focus: str
    target_rir: str
    volume_adjustment_pct: int
    nutritional_modifications: List[str]
    injury_prevention_cues: List[str]


def get_cycle_phase_recommendations(cycle_day: int, cycle_length: int = 28) -> CyclePhaseRecommendation:
    """Generate phase-specific training, macro, and recovery prescriptions based on cycle day."""
    day = min(max(cycle_day, 1), cycle_length)

    if day <= 5:
        # Early Follicular (Menstruation)
        phase = "Early Follicular (Menstruation)"
        hormones = "Estrogen and Progesterone at lowest baseline."
        focus = "Gradual volume ramp. Autoregulate based on uterine cramping/fatigue."
        rir = "2-3"
        vol_pct = -10
        nutrition = [
            "Maintain baseline hydration and iron intake (heme/chelated iron) to offset blood loss.",
            "Baseline carbohydrate utilization.",
        ]
        injury = ["Standard dynamic warm-up."]

    elif 6 <= day <= 14:
        # Late Follicular / Ovulatory
        phase = "Late Follicular / Ovulation Window"
        hormones = "Estrogen surges to monthly peak; testosterone elevation."
        focus = "PEAK PERFORMANCE WINDOW: High volume tolerance, optimal recovery, and maximal strength PR attempts."
        rir = "1-2"
        vol_pct = 15
        nutrition = [
            "High carbohydrate utilization efficiency; optimal glycogen loading window.",
            "Higher pre-workout carbohydrate fueling for intense volume sessions.",
        ]
        injury = [
            "⚠️ **ACL Laxity Gate:** High estrogen increases joint ligamentous laxity. Emphasize quad/hamstring co-contraction on heavy squats and avoid sloppy knee valgus."
        ]

    else:
        # Luteal Phase (Days 15-28)
        phase = "Luteal Phase (Post-Ovulation & PMS Window)"
        hormones = "Progesterone rises to peak; core body temperature elevated by ~0.5°C."
        focus = "AUTOREGULATED MAINTENANCE / DELOAD: Higher perceived exertion, reduced carbohydrate utilization efficiency."
        rir = "2-3"
        vol_pct = -20
        nutrition = [
            "🔥 **Elevated Metabolism & Protein Breakdown:** Increase daily protein intake by +10-15g/day to prevent luteal catabolism.",
            "💧 **Hydration & Electrolytes:** Higher progesterone increases sodium loss. Add 500-1000mg sodium and extra fluids to offset dehydration.",
            "🍫 **Carb Cravings:** Shift calories slightly toward healthy fats and complex carbs with fiber.",
        ]
        injury = [
            "Heat dissipation is impaired due to higher core temperature; ensure cold fluid intake during workouts."
        ]

    return CyclePhaseRecommendation(
        cycle_day=day,
        phase_name=phase,
        hormonal_profile=hormones,
        training_focus=focus,
        target_rir=rir,
        volume_adjustment_pct=vol_pct,
        nutritional_modifications=nutrition,
        injury_prevention_cues=injury,
    )
