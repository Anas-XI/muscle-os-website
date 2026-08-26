"""Precision TDEE, Nutrient Timing & Macro Partitioning Engine.

Calculates:
- BMR (Mifflin-St Jeor and Katch-McArdle)
- Total Daily Energy Expenditure (TDEE = BMR * Activity Multiplier + EAT + TEF)
- Goal-based Caloric Prescriptions (Surplus, Deficit, Recomp)
- Macronutrient partitioning with lean-mass preservation protein floors (2.2 g/kg in cut)
- Training Day vs Rest Day Carb Cycling
"""

from dataclasses import dataclass
from typing import Optional, Dict


@dataclass
class TDEEResult:
    bmr_kcal: int
    tdee_kcal: int
    activity_multiplier: float
    formula_used: str
    target_calories_kcal: int
    daily_delta_kcal: int
    goal: str


@dataclass
class MacroSplitResult:
    calories_kcal: int
    protein_g: int
    fat_g: int
    carbs_g: int
    protein_calories: int
    fat_calories: int
    carbs_calories: int
    is_training_day: bool
    carb_cycling_mode: str


ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.20,       # Desk job, minimal walking (<5,000 steps)
    "lightly_active": 1.375, # 1-3 workouts/week or 6,000-8,000 steps
    "moderately_active": 1.55,# 4-5 workouts/week or 8,000-10,000 steps
    "very_active": 1.725,    # 6-7 hard workouts/week or 12,000+ steps
    "extremely_active": 1.90,# Heavy labor + 2x daily training
}


def calculate_tdee(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str = "male",
    activity_level: str = "moderately_active",
    goal: str = "hypertrophy",
    body_fat_pct: Optional[float] = None
) -> TDEEResult:
    """Calculate BMR and TDEE with goal-adjusted caloric targets."""
    act_mult = ACTIVITY_MULTIPLIERS.get(activity_level.lower(), 1.55)

    if body_fat_pct and 5.0 <= body_fat_pct <= 50.0:
        # Katch-McArdle Formula (Lean Mass Based)
        lean_mass_kg = weight_kg * (1.0 - (body_fat_pct / 100.0))
        bmr = 370 + (21.6 * lean_mass_kg)
        formula = "Katch-McArdle"
    else:
        # Mifflin-St Jeor Formula
        is_male = gender.lower() in ("male", "m", "man")
        s = 5 if is_male else -161
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) + s
        formula = "Mifflin-St Jeor"

    tdee = round(bmr * act_mult)
    g_clean = goal.lower().replace(" ", "_")

    if g_clean in ("fat_loss", "cut", "lose_fat"):
        delta = -500  # ~0.5 kg loss/wk
    elif g_clean in ("hypertrophy", "build_muscle", "bulk"):
        delta = 250   # Lean surplus
    elif g_clean in ("strength", "power"):
        delta = 150
    else:  # Recomp / Maintenance
        delta = 0

    target = max(1200, tdee + delta)

    return TDEEResult(
        bmr_kcal=round(bmr),
        tdee_kcal=tdee,
        activity_multiplier=act_mult,
        formula_used=formula,
        target_calories_kcal=target,
        daily_delta_kcal=delta,
        goal=goal,
    )


def calculate_macro_split(
    target_calories_kcal: int,
    weight_kg: float,
    goal: str = "hypertrophy",
    is_training_day: bool = True
) -> MacroSplitResult:
    """Calculate macronutrient distribution with training vs rest-day carb cycling."""
    g_clean = goal.lower()

    # 1. Protein Target
    if "fat_loss" in g_clean or "cut" in g_clean:
        protein_g = round(weight_kg * 2.2)  # Higher protein during deficit
    elif "bulk" in g_clean or "hypertrophy" in g_clean:
        protein_g = round(weight_kg * 1.8)
    else:
        protein_g = round(weight_kg * 2.0)

    # 2. Fat Target (Floor at 0.7 g/kg or ~20-25% calories)
    fat_g = max(round(weight_kg * 0.7), round((target_calories_kcal * 0.22) / 9.0))

    # 3. Carb Cycling Distribution
    cal_from_protein = protein_g * 4
    cal_from_fat = fat_g * 9
    remaining_cal = max(0, target_calories_kcal - (cal_from_protein + cal_from_fat))

    base_carbs_g = round(remaining_cal / 4.0)

    if is_training_day:
        carbs_g = round(base_carbs_g * 1.15)  # +15% carbs on training days
        cycling_mode = "Training Day (+15% Carbs for glycogen replenishment)"
    else:
        carbs_g = round(base_carbs_g * 0.85)  # -15% carbs on rest days
        cycling_mode = "Rest Day (-15% Carbs with higher fat/protein ratio)"

    total_cal = (protein_g * 4) + (fat_g * 9) + (carbs_g * 4)

    return MacroSplitResult(
        calories_kcal=total_cal,
        protein_g=protein_g,
        fat_g=fat_g,
        carbs_g=carbs_g,
        protein_calories=protein_g * 4,
        fat_calories=fat_g * 9,
        carbs_calories=carbs_g * 4,
        is_training_day=is_training_day,
        carb_cycling_mode=cycling_mode,
    )
