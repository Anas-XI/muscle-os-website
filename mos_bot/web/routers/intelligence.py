"""FastAPI Router for Muscle OS Apex Intelligence & Clinical Engines."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from mos_bot.core.strength_engine import calculate_1rm, get_strength_standard, prescribe_working_load
from mos_bot.core.biomechanics_engine import get_injury_override, suggest_exercise_substitutions
from mos_bot.core.nutrition_calculator import calculate_tdee, calculate_macro_split
from mos_bot.core.supplement_engine import analyze_supplement_stack
from mos_bot.core.circadian_engine import calculate_circadian_schedule
from mos_bot.core.cardio_engine import generate_cardio_prescription
from mos_bot.core.posture_engine import evaluate_posture
from mos_bot.core.female_physiology_engine import get_cycle_phase_recommendations
from mos_bot.core.plant_protein_engine import optimize_plant_protein

router = APIRouter(prefix="/api/intelligence", tags=["Apex Intelligence"])


# ── Request / Response Models ──

class OneRMRequest(BaseModel):
    weight_kg: float = Field(..., description="Weight lifted in kg")
    reps: int = Field(..., ge=1, le=30, description="Reps completed")
    rir: int = Field(0, ge=0, le=10, description="Reps in reserve")
    formula: str = Field("epley", description="Formula: epley, brzycki, or wathan")
    bodyweight_kg: Optional[float] = Field(None, description="Client bodyweight for strength tiering")
    gender: Optional[str] = Field("male", description="male or female")
    lift: Optional[str] = Field("bench_press", description="bench_press, squat, or deadlift")


class BiomechanicsRequest(BaseModel):
    exercise_name: str
    active_injuries: List[str] = Field(default_factory=list)


class NutritionRequest(BaseModel):
    weight_kg: float
    height_cm: float
    age: int
    gender: str = "male"
    activity_level: str = "moderately_active"
    goal: str = "hypertrophy"
    body_fat_pct: Optional[float] = None
    is_training_day: bool = True


class SupplementRequest(BaseModel):
    supplements: List[str]
    bedtime_hour: int = 22


class CircadianRequest(BaseModel):
    wake_time: str = "07:00"
    sleep_time: str = "23:00"
    is_night_shift: bool = False


class CardioRequest(BaseModel):
    age: int
    experience: str = "intermediate"
    goal: str = "hypertrophy"
    resting_hr: int = 65


class PostureRequest(BaseModel):
    deviation: str = "upper_crossed"


class FemaleCycleRequest(BaseModel):
    cycle_day: int = 1
    cycle_length: int = 28


class PlantProteinRequest(BaseModel):
    base_protein_g: float
    diet_type: str = "vegan"


# ── Endpoints ──

@router.post("/1rm")
def api_calculate_1rm(req: OneRMRequest):
    res = calculate_1rm(req.weight_kg, req.reps, req.rir, req.formula)
    tier_info = None
    if req.bodyweight_kg:
        tier_info = get_strength_standard(req.lift or "bench_press", res.estimated_1rm_kg, req.bodyweight_kg, req.gender or "male")
    return {
        "estimated_1rm": res,
        "strength_standard": tier_info,
    }


@router.post("/substitute")
def api_biomechanics_substitute(req: BiomechanicsRequest):
    subs = suggest_exercise_substitutions(req.exercise_name, req.active_injuries)
    overrides = []
    for inj in req.active_injuries:
        ov = get_injury_override(inj)
        if ov:
            overrides.append(ov)
    return {
        "substitutions": subs,
        "kinetic_chain_overrides": overrides,
    }


@router.post("/macros")
def api_calculate_macros(req: NutritionRequest):
    tdee = calculate_tdee(
        weight_kg=req.weight_kg,
        height_cm=req.height_cm,
        age=req.age,
        gender=req.gender,
        activity_level=req.activity_level,
        goal=req.goal,
        body_fat_pct=req.body_fat_pct,
    )
    macros = calculate_macro_split(
        target_calories_kcal=tdee.target_calories_kcal,
        weight_kg=req.weight_kg,
        goal=req.goal,
        is_training_day=req.is_training_day,
    )
    return {
        "energy_expenditure": tdee,
        "macro_split": macros,
    }


@router.post("/supplements")
def api_analyze_supplements(req: SupplementRequest):
    res = analyze_supplement_stack(req.supplements, req.bedtime_hour)
    return res


@router.post("/circadian")
def api_circadian_schedule(req: CircadianRequest):
    res = calculate_circadian_schedule(req.wake_time, req.sleep_time, req.is_night_shift)
    return res


@router.post("/cardio")
def api_cardio_prescription(req: CardioRequest):
    res = generate_cardio_prescription(req.age, req.experience, req.goal, req.resting_hr)
    return res


@router.post("/posture")
def api_posture_plan(req: PostureRequest):
    res = evaluate_posture(req.deviation)
    if not res:
        raise HTTPException(status_code=404, detail="Postural deviation pattern not found")
    return res


@router.post("/female-cycle")
def api_female_cycle(req: FemaleCycleRequest):
    res = get_cycle_phase_recommendations(req.cycle_day, req.cycle_length)
    return res


@router.post("/plant-protein")
def api_plant_protein(req: PlantProteinRequest):
    res = optimize_plant_protein(req.base_protein_g, req.diet_type)
    return res


class CoachActionRequest(BaseModel):
    user_id: str
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)


@router.post("/coach/action")
def api_execute_coach_action(req: CoachActionRequest):
    from mos_bot.core.coach_actions import execute_coach_action
    res = execute_coach_action(req.user_id, req.action, req.params)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Action execution failed"))
    return res


@router.get("/coach/modifications/{user_id}")
def api_get_coach_modifications(user_id: str):
    from mos_bot.core.coach_actions import get_program_modifications
    return {
        "user_id": user_id,
        "modifications": get_program_modifications(user_id)
    }


class ProgramAuditRequest(BaseModel):
    user_id: str


@router.post("/program/audit")
def api_audit_program(req: ProgramAuditRequest):
    from mos_bot.core.program_auditor import audit_user_program
    rep = audit_user_program(req.user_id)
    return rep

