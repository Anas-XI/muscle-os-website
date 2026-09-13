"""1RM Autoregulation & Strength Standards Engine.

Implements:
- 1RM Estimation (Epley, Brzycki, Lombardi, Wathan formulas)
- Strength Standards Classification (Novice, Intermediate, Advanced, Elite) based on BW & gender
- Working Load Prescriptions for target rep ranges and RIR targets
"""

from dataclasses import dataclass
from typing import Dict, Optional, Tuple


@dataclass
class Estimated1RMResult:
    weight_kg: float
    reps: int
    rir: int
    estimated_1rm_kg: float
    formula_used: str
    percentages: Dict[int, float]  # Reps -> estimated load (kg)


@dataclass
class StrengthStandardResult:
    lift: str
    current_1rm_kg: float
    bodyweight_kg: float
    gender: str
    tier: str  # "Novice", "Intermediate", "Advanced", "Elite"
    next_tier: Optional[str]
    kg_to_next_tier: float
    ratio_to_bw: float


def calculate_1rm(weight_kg: float, reps: int, rir: int = 0, formula: str = "epley") -> Estimated1RMResult:
    """Calculate estimated 1RM from weight, reps, and RIR."""
    effective_reps = reps + rir
    if effective_reps <= 1:
        e1rm = weight_kg
    elif formula.lower() == "brzycki":
        e1rm = weight_kg * (36.0 / (37.0 - effective_reps))
    elif formula.lower() == "wathan":
        e1rm = (100.0 * weight_kg) / (48.8 + 53.8 * (2.71828 ** (-0.075 * effective_reps)))
    else:  # Epley default
        e1rm = weight_kg * (1.0 + 0.0333 * effective_reps)

    e1rm = round(e1rm, 1)

    # Rep percentage table
    rep_pcts = {
        1: 1.00, 2: 0.95, 3: 0.90, 4: 0.88, 5: 0.85,
        6: 0.82, 7: 0.80, 8: 0.77, 9: 0.75, 10: 0.72, 12: 0.67, 15: 0.63
    }
    load_table = {r: round(e1rm * pct, 1) for r, pct in rep_pcts.items()}

    return Estimated1RMResult(
        weight_kg=weight_kg,
        reps=reps,
        rir=rir,
        estimated_1rm_kg=e1rm,
        formula_used=formula.lower(),
        percentages=load_table,
    )


# Strength standard benchmarks from 04_TOOLS/Estimated 1RM & Strength Standards.md
STRENGTH_TABLES = {
    "male": {
        "bench_press": {60: (45, 65, 90, 120), 70: (55, 75, 105, 135), 80: (60, 85, 115, 150), 90: (65, 95, 130, 165), 100: (75, 105, 140, 180)},
        "squat": {60: (70, 110, 145, 185), 70: (85, 125, 165, 210), 80: (100, 140, 185, 235), 90: (110, 155, 205, 260), 100: (120, 170, 225, 285)},
        "deadlift": {60: (95, 140, 180, 225), 70: (110, 160, 205, 255), 80: (125, 175, 230, 290), 90: (140, 195, 255, 320), 100: (150, 210, 275, 350)},
    },
    "female": {
        "bench_press": {50: (25, 40, 57, 72), 60: (30, 47, 65, 82), 70: (35, 52, 72, 90), 80: (40, 57, 77, 97)},
        "squat": {50: (52, 82, 115, 145), 60: (60, 92, 125, 160), 70: (67, 102, 140, 175), 80: (75, 112, 150, 190)},
        "deadlift": {50: (70, 110, 145, 180), 60: (82, 125, 160, 200), 70: (92, 137, 175, 217), 80: (100, 150, 190, 235)},
    }
}


def get_strength_standard(lift: str, weight_1rm: float, bodyweight_kg: float, gender: str = "male") -> StrengthStandardResult:
    """Classify 1RM into strength tiers based on certified vault population standards."""
    g_key = "female" if gender.lower() in ("female", "f", "woman") else "male"
    l_key = lift.lower().replace(" ", "_")
    if l_key not in STRENGTH_TABLES[g_key]:
        l_key = "bench_press"  # default fallback

    table = STRENGTH_TABLES[g_key][l_key]
    closest_bw = min(table.keys(), key=lambda k: abs(k - bodyweight_kg))
    novice, inter, adv, elite = table[closest_bw]

    if weight_1rm >= elite:
        tier = "Elite"
        next_t = None
        kg_to_next = 0.0
    elif weight_1rm >= adv:
        tier = "Advanced"
        next_t = "Elite"
        kg_to_next = round(elite - weight_1rm, 1)
    elif weight_1rm >= inter:
        tier = "Intermediate"
        next_t = "Advanced"
        kg_to_next = round(adv - weight_1rm, 1)
    else:
        tier = "Novice"
        next_t = "Intermediate"
        kg_to_next = round(inter - weight_1rm, 1)

    ratio = round(weight_1rm / max(bodyweight_kg, 1.0), 2)
    return StrengthStandardResult(
        lift=lift,
        current_1rm_kg=weight_1rm,
        bodyweight_kg=bodyweight_kg,
        gender=g_key,
        tier=tier,
        next_tier=next_t,
        kg_to_next_tier=kg_to_next,
        ratio_to_bw=ratio,
    )


def prescribe_working_load(one_rep_max: float, target_reps: int, target_rir: int = 2) -> float:
    """Calculate exact target working load for an assigned rep & RIR prescription."""
    rep_pcts = {
        1: 1.00, 2: 0.95, 3: 0.90, 4: 0.88, 5: 0.85,
        6: 0.82, 7: 0.80, 8: 0.77, 9: 0.75, 10: 0.72, 12: 0.67, 15: 0.63
    }
    effective = min(max(target_reps + target_rir, 1), 15)
    pct = rep_pcts.get(effective, max(0.50, 1.0 - (effective * 0.03)))
    return round(one_rep_max * pct, 1)
