from datetime import date as date_type
from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class VaultSource(BaseModel):
    title: str
    path: str
    score: float = 0.0
    pillar: Optional[str] = None
    snippet: str = ""


class ClientProfile(BaseModel):
    user_id: str
    name: str
    profile_date: date_type = Field(default_factory=date_type.today, alias="date")
    goal: str = ""
    situation: str = ""
    bodyweight_kg: float = 0
    height_cm: float = 0
    age: int = 0
    sex: str = "male"
    training_days: int = 3
    session_length_min: int = 60
    experience_years: float = 0
    current_split: str = ""
    injuries: List[str] = []
    gut_health: str = "none"
    bowel_frequency_weekly: int = 0
    fermented_foods: str = ""
    antibiotic_recent: bool = False
    supplement_regimen: str = ""
    vegan_unsupplemented: bool = False
    sleep_hours: float = 7
    stress_level: int = 5
    daily_water_liters: float = 0
    urine_color: str = ""
    muscle_cramps: bool = False
    alcohol_weekly: int = 0
    alcohol_near_bed: bool = False
    daily_steps: int = 0
    caffeine_mg: int = 0
    work_schedule: str = ""
    reliable_hours_weekly: int = 0
    mobility_limitations: List[str] = []
    joint_pain: str = ""
    supplements: List[str] = []
    medical: List[str] = []
    last_bloodwork: str = ""
    known_deficiencies: List[str] = []
    family_history: List[str] = []
    mental_health_concern: str = ""
    mental_health_care: str = ""
    ed_risk: bool = False
    triage_result: str = "green"
    inbody: Optional[dict] = None

    @classmethod
    def from_dict(cls, data: dict) -> "ClientProfile":
        allowed = set(cls.model_fields.keys()) | {"date"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        return cls(**filtered)


class SafetyTriageResult(BaseModel):
    triage: Literal["red", "yellow", "green"] = "green"
    ed_items: List[str] = []
    blocked: bool = False
    caution_note: str = ""
    modifiers: List[str] = Field(default_factory=list)


class PillarAssignment(BaseModel):
    primary_pillars: List[str] = Field(default_factory=list)
    secondary_pillars: List[str] = Field(default_factory=list)
    gentle_entry: bool = False
    modifications: List[str] = Field(default_factory=list)


class Exercise(BaseModel):
    name: str
    sets: int = 3
    reps: str = "10-12"
    rir: str = "2"
    notes: str = ""
    weight: str = ""
    rest: str = "90s"


class Session(BaseModel):
    day: str
    focus: str
    exercises: List[Exercise] = Field(default_factory=list)
    notes: str = ""


class Phase(BaseModel):
    name: str
    duration: str
    goal: str
    sessions: List[Session] = Field(default_factory=list)
    progression_notes: str = ""


class ProgramStructure(BaseModel):
    split: str
    phases: List[Phase] = Field(default_factory=list)
    weekly_schedule: str = ""
    warm_up_protocol: str = ""
    cool_down_protocol: str = ""


class NutritionPlan(BaseModel):
    calories_target: int = 0
    protein_g: int = 0
    carbs_g: int = 0
    fat_g: int = 0
    protein_per_kg: float = 0
    meal_timing_notes: str = ""
    hydration_target_l: float = 0
    special_notes: str = ""


class ProgramContent(BaseModel):
    client: ClientProfile
    triage: SafetyTriageResult = Field(default_factory=SafetyTriageResult)
    pillars: PillarAssignment = Field(default_factory=PillarAssignment)
    program: ProgramStructure = Field(default_factory=ProgramStructure)
    nutrition: NutritionPlan = Field(default_factory=NutritionPlan)
    sleep_notes: str = ""
    supplement_recommendations: str = ""
    rehab_prehab: str = ""
    vault_sources: List[VaultSource] = Field(default_factory=list)
    generated_at: str = ""
