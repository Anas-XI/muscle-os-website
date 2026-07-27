"""Constraint Resolution Engine.

Replaces the old modifier-stacking approach with a proper constraint graph.
Each constraint is a node with severity, category, conflicts, and resolution.
The engine resolves conflicts by priority: Safety > Medical > Injury > Recovery
> Nutrition > Training > Adherence > Psychological > Lifestyle.
"""

from typing import List, Tuple
from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, ConstraintNode, ConstraintGraph, Citation,
)

RESOLUTION_PRIORITY = [
    "safety", "medical", "injury", "recovery",
    "nutrition", "training", "adherence", "psychological", "lifestyle",
]


def _bmi(profile: ClientProfile) -> float:
    if profile.height_cm <= 0 or profile.bodyweight_kg <= 0:
        return 0
    h_m = profile.height_cm / 100
    return round(profile.bodyweight_kg / (h_m * h_m), 1)


def build_constraint_graph(profile: ClientProfile, triage: SafetyTriageResult) -> ConstraintGraph:
    nodes: List[ConstraintNode] = []
    node_id = 0

    def add(cat: str, sev: str, desc: str, src: str = "", conflicts: list = None):
        nonlocal node_id
        node_id += 1
        nodes.append(ConstraintNode(
            id=f"c{node_id}",
            category=cat,
            severity=sev,
            description=desc,
            source_field=src,
            conflicts_with=conflicts or [],
        ))

    # --- Safety constraints ---
    if triage.triage == "red":
        add("safety", "critical", f"ED screening red: {triage.block_reason}", "ed_screening")

    if triage.triage == "yellow":
        add("safety", "high", "ED screening yellow: proceed with modifications", "ed_screening")

    # --- Medical constraints ---
    for condition in profile.medical:
        cl = condition.lower()
        if "osgood" in cl or "schlatter" in cl:
            add("medical", "high", f"Osgood-Schlatter: avoid deep squat", "medical")
        if "osteomalacia" in cl or "vitamin d" in cl:
            add("medical", "high", f"Vitamin D insufficiency: supplementation + monitoring", "medical")
        if "scoliosis" in cl:
            add("medical", "high", "Scoliosis: unilateral work + core stabilization", "medical")
        if "anemia" in cl or "anaemia" in cl:
            add("medical", "high", "Anemia: iron monitoring required", "medical")
        if "thyroid" in cl:
            add("medical", "high", "Thyroid condition: monitoring required", "medical")

    if profile.known_deficiencies:
        add("medical", "high", f"Known deficiencies: {', '.join(profile.known_deficiencies)}", "known_deficiencies")

    # --- Injury constraints ---
    for injury in profile.injuries:
        il = injury.lower()
        if "rotator" in il or "shoulder" in il:
            add("injury", "high", f"Shoulder/rotator cuff: neutral grip, no behind-neck", "injuries",
                conflicts=["training_heavy_overhead"])
        if "knee" in il or "patellar" in il or "acl" in il:
            add("injury", "high", f"Knee: limited ROM, no ballistic flexion", "injuries",
                conflicts=["training_deep_squat", "training_plyometrics"])
        if "back" in il or "disc" in il or "sciatica" in il:
            add("injury", "high", f"Back/disc: bracing, no spinal flexion under load", "injuries",
                conflicts=["training_heavy_deadlift", "training_bent_over_row"])
        if "neck" in il:
            add("injury", "medium", "Neck: avoid heavy overhead, use supported variations", "injuries",
                conflicts=["training_overhead_press"])

    # --- Recovery constraints ---
    if isinstance(profile.sleep_hours, (int, float)) and profile.sleep_hours < 6.5:
        add("recovery", "high", f"Sleep <6.5h ({profile.sleep_hours}h): recovery bottleneck", "sleep_hours",
            conflicts=["nutrition_aggressive_deficit", "training_high_volume"])
    elif isinstance(profile.sleep_hours, (int, float)) and profile.sleep_hours < 7:
        add("recovery", "medium", f"Sleep {profile.sleep_hours}h: suboptimal for recovery", "sleep_hours")

    if isinstance(profile.stress_level, (int, float)) and profile.stress_level >= 7:
        add("recovery", "high", f"Stress {profile.stress_level}/10: reduce training volume 30%", "stress_level",
            conflicts=["nutrition_aggressive_deficit", "training_high_volume"])
    elif isinstance(profile.stress_level, (int, float)) and profile.stress_level >= 5:
        add("recovery", "medium", f"Stress {profile.stress_level}/10: monitor recovery", "stress_level")

    # --- Lifestyle constraints ---
    if profile.work_schedule in ("night", "rotating", "early"):
        add("lifestyle", "medium", f"Work schedule: {profile.work_schedule} — anchor sleep, circadian adaptation",
            "work_schedule",
            conflicts=["training_fixed_schedule"])

    if isinstance(profile.alcohol_weekly, (int, float)) and profile.alcohol_weekly >= 5:
        add("lifestyle", "medium", f"Alcohol {profile.alcohol_weekly}/week: reduce for recovery quality", "alcohol_weekly",
            conflicts=["recovery_sleep_quality"])

    if profile.mobility_limitations:
        add("lifestyle", "medium", f"Mobility limits: {', '.join(profile.mobility_limitations)}", "mobility_limitations",
            conflicts=["training_full_range"])

    # --- Nutrition constraints ---
    bmi_val = _bmi(profile)
    if bmi_val < 18.5:
        add("nutrition", "critical", f"BMI {bmi_val}: underweight — no deficit, refer to professional", "bmi")
    elif bmi_val > 30:
        add("nutrition", "medium", f"BMI {bmi_val}: prioritize non-weight-bearing start", "bmi",
            conflicts=["training_high_impact"])

    if profile.gut_health != "none":
        add("nutrition", "medium", f"Gut health: {profile.gut_health} — fiber progression, probiotic consideration",
            "gut_health",
            conflicts=["nutrition_high_fiber_rapid", "nutrition_aggressive_deficit"])

    if profile.rapid_weight_loss:
        add("nutrition", "high", "Rapid weight loss reported: investigate before protocol", "rapid_weight_loss")

    # --- Training constraints ---
    if profile.experience_years <= 1:
        add("training", "medium", "Beginner: linear progression, technique-first", "experience_years")
    elif profile.experience_years < 3:
        add("training", "low", "Intermediate: undulating periodization", "experience_years")
    else:
        add("training", "low", "Advanced: block periodization, higher complexity", "experience_years")

    if profile.session_length_min < 45:
        add("training", "medium", f"Short sessions ({profile.session_length_min}min): efficiency focus, supersets",
            "session_length_min")

    # --- Psychological constraints ---
    if profile.mental_health_concern in ("moderate", "significant"):
        add("psychological", "high", f"Mental health: {profile.mental_health_concern} — keep simple, minimize tracking",
            "mental_health_concern",
            conflicts=["adherence_complex_protocol", "training_high_volume"])

    # --- Adherence constraints ---
    if profile.situation in ("plateaued", "overtrained", "returning"):
        add("adherence", "medium", f"Situation: {profile.situation} — adjust expectations, rebuild consistency",
            "situation")

    # Resolve conflicts
    graph = ConstraintGraph(nodes=nodes)
    _resolve_conflicts(graph)
    return graph


def _resolve_conflicts(graph: ConstraintGraph):
    for node in graph.nodes:
        if not node.conflicts_with:
            continue
        node.severity, node.resolution = _resolve_one(node, graph)


def _resolve_one(node: ConstraintNode, graph: ConstraintGraph) -> Tuple[str, str]:
    sev = node.severity
    cat = node.category
    cat_rank = RESOLUTION_PRIORITY.index(cat) if cat in RESOLUTION_PRIORITY else 99

    # Critical always wins
    if sev == "critical":
        return sev, "Critical constraint: non-negotiable, all other adjustments secondary"

    # High severity resolution rules
    if sev == "high":
        if node.category == "recovery" and "training" in str(node.conflicts_with):
            return "high", "Recovery bottleneck: reduce training volume 30%, maintain protein and sleep targets"
        if node.category == "recovery" and "nutrition" in str(node.conflicts_with):
            return "high", "Recovery bottleneck: no aggressive deficit — use maintenance or small surplus first"
        if node.category == "injury":
            return "high", f"Injury modification active: {node.description}. Exercise selection adjusted."
        if node.category == "medical":
            return "high", f"Medical flag: {node.description}"

    # Medium severity with conflicts
    if sev == "medium":
        if node.category == "nutrition" and "training" in str(node.conflicts_with):
            return "medium", "Nutrition-training conflict: adjust meal timing around training window"
        if node.category == "lifestyle" and "recovery" in str(node.conflicts_with):
            return "medium", "Lifestyle-recovery conflict: prioritize sleep/wind-down routine"
        if node.category == "lifestyle" and "training" in str(node.conflicts_with):
            return "medium", "Lifestyle-training conflict: flexible scheduling, morning/evening options"

    return sev, f"Monitor: {node.description}. No active conflicts."


def constraints_to_modifiers(graph: ConstraintGraph, triage: SafetyTriageResult) -> List[str]:
    modifiers = []
    for node in graph.nodes:
        if node.severity == "critical":
            modifiers.append("medical_clearance_required")
        if node.category == "injury":
            il_desc = node.description.lower()
            if "shoulder" in il_desc or "rotator" in il_desc:
                modifiers.append("shoulder_care")
            if "knee" in il_desc:
                modifiers.append("knee_care")
            if "back" in il_desc or "disc" in il_desc:
                modifiers.append("back_care")
            if "neck" in il_desc:
                modifiers.append("neck_care")
            modifiers.append("injury_aware")
        if node.category == "recovery":
            if "sleep" in node.description.lower():
                modifiers.append("sleep_priority")
            if "stress" in node.description.lower():
                modifiers.append("stress_management")
        if node.category == "lifestyle":
            if "alcohol" in node.description.lower():
                modifiers.append("alcohol_reduction")
            if "schedule" in node.description.lower() or "shift" in node.description.lower():
                modifiers.append("shift_work")
        if node.category == "nutrition":
            if "gut" in node.description.lower():
                modifiers.append("gut_health_support")
            if "bmi" in node.description.lower() and "underweight" in node.description.lower():
                modifiers.append("no_calorie_deficit")
        if node.category == "psychological":
            modifiers.append("mental_health_support")
        if node.category == "training" and node.severity == "medium":
            if "beginner" in node.description.lower():
                modifiers.append("adherence_first")
    if triage.triage == "yellow":
        if "binge_episodes" in triage.ed_items:
            modifiers.append("gentle_entry")
            modifiers.append("no_calorie_deficit")
        if "compensatory_behavior" in triage.ed_items:
            modifiers.append("gentle_entry")
        if "guilt_after_eating" in triage.ed_items:
            modifiers.append("no_food_tracking")
            modifiers.append("gentle_entry")
    return list(set(modifiers))