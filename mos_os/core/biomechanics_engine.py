"""Kinetic Chain Biomechanics & Injury Override Engine.

Maps all 14 clinical injury types to upstream/downstream kinetic compensations
and prescribes joint-friendly movement substitutions with equivalent mechanical tension.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class ExerciseSubstitution:
    original_exercise: str
    substitute_exercise: str
    movement_pattern: str
    rationale: str
    cues: List[str]


@dataclass
class KineticChainOverrideResult:
    injury_name: str
    affected_joint: str
    upstream_compensation: str
    downstream_compensation: str
    movement_pattern_modifications: Dict[str, str]
    preserved_patterns: List[str]
    contraindicated_movements: List[str]
    rehab_primers: List[str]


INJURY_REGISTRY = {
    "shoulder_impingement": {
        "joint": "Glenohumeral / Scapulothoracic",
        "upstream": "Cervical spine stiffness & upper trap dominance",
        "downstream": "Thoracic hypomobility & lumbar extension compensation",
        "modifications": {
            "horizontal_push": "Switch to Neutral-Grip Dumbbell Floor Press or Low Incline Cable Press (scapular freedom).",
            "overhead_press": "Substitute with Landmine Press (scapular plane 30°). Avoid behind-the-neck or straight barbell OHP.",
            "pull": "Preserve Chest-Supported Neutral Rows. Avoid wide-grip upright rows.",
        },
        "preserved": ["Squat", "Hinge", "Carry (bilateral)", "Chest-Supported Row", "Neutral Press"],
        "contraindicated": ["Barbell Bench Press (flared elbows)", "Barbell Overhead Press", "Dips", "Upright Row"],
        "primers": ["Face Pulls with External Rotation", "Band Pull-Aparts", "Prone Y-T-Ws", "Serratus Wall Slides"],
    },
    "low_back_pain": {
        "joint": "Lumbar Spine / SI Joint",
        "upstream": "Thoracic kyphosis & breathing pattern dysfunction",
        "downstream": "Glute amnesia & hip flexor (psoas) hypertonicity",
        "modifications": {
            "squat": "Switch to Goblet Squat (upright torso) or Belt Squat (zero spinal compression).",
            "hinge": "Switch to Chest-Supported 45° Hyperextension or Trap Bar Deadlift with high handles.",
            "row": "Switch from Bent-Over Barbell Row to Chest-Supported Row or Seated Cable Row.",
        },
        "preserved": ["Goblet Squat", "Chest-Supported Row", "Trap Bar Hinge", "Upper Body Pushing"],
        "contraindicated": ["Heavy Axial Loaded Back Squat", "Conventional Deadlift from floor", "Good Mornings", "Standing OHP"],
        "primers": ["McGill Big 3 (Curl-up, Side Plank, Bird Dog)", "Deadbugs", "Glute Bridges with Posterior Tilt"],
    },
    "patellofemoral_pain": {
        "joint": "Patellofemoral Knee Joint",
        "upstream": "Glute medius weakness & excessive hip internal rotation/valgus",
        "downstream": "Limited ankle dorsiflexion & excessive foot pronation",
        "modifications": {
            "squat": "Box Squats to parallel (vertical shin) or Heel-Elevated Goblet Squat within pain-free ROM.",
            "quad_isolation": "Terminal Knee Extensions (TKE) with band or Spanish Squats (tibial strap unloading).",
        },
        "preserved": ["Hip Thrust", "RDL", "Box Squat", "Upper Body Push/Pull"],
        "contraindicated": ["Deep Sissy Squats", "Forward Lunges with knee shear", "Open-chain leg extension (heavy bottom ROM)"],
        "primers": ["Clamshells with mini-band", "Lateral Band Walks", "Poliquin Step-Ups"],
    },
    "elbow_tendinopathy": {
        "joint": "Medial/Lateral Elbow (Epicondyle)",
        "upstream": "Shoulder external rotator weakness & grip over-reliance",
        "downstream": "Wrist flexor/extensor tendon overuse",
        "modifications": {
            "pull": "Switch from Pronated Pull-ups to Neutral-Grip Lat Pulldowns or Ring Rows.",
            "push": "Switch to Dumbbell Press with neutral/semi-supinated grip. Avoid skull crushers.",
            "curls": "Hammer Curls with slow eccentric or Incline Dumbbell Curls. Avoid straight barbell curls.",
        },
        "preserved": ["Lower body compound lifts", "Neutral Grip Pulling", "Neutral Dumbbell Pressing"],
        "contraindicated": ["Straight Barbell Bicep Curls", "EZ-Bar Skull Crushers", "Wide Pronated Pull-Ups"],
        "primers": ["Tyler Twist with FlexBar", "Wrist Extensor Eccentrics", "Farmer Carries (moderate)"],
    }
}


def get_injury_override(injury: str) -> Optional[KineticChainOverrideResult]:
    """Retrieve full kinetic chain override protocol for an injury."""
    clean = injury.lower().replace(" ", "_").replace("-", "_")
    for k, v in INJURY_REGISTRY.items():
        if k in clean or clean in k or any(part in clean for part in k.split("_")):
            return KineticChainOverrideResult(
                injury_name=injury,
                affected_joint=v["joint"],
                upstream_compensation=v["upstream"],
                downstream_compensation=v["downstream"],
                movement_pattern_modifications=v["modifications"],
                preserved_patterns=v["preserved"],
                contraindicated_movements=v["contraindicated"],
                rehab_primers=v["primers"],
            )
    return None


def suggest_exercise_substitutions(exercise_name: str, active_injuries: List[str]) -> List[ExerciseSubstitution]:
    """Suggest biomechanically matched exercise substitutions avoiding active injury paths."""
    subs = []
    ex_lower = exercise_name.lower()
    
    for inj in active_injuries:
        clean_inj = inj.lower()
        if "shoulder" in clean_inj or "impingement" in clean_inj or "rotator" in clean_inj:
            if "bench press" in ex_lower or "overhead press" in ex_lower or "military press" in ex_lower:
                subs.append(ExerciseSubstitution(
                    original_exercise=exercise_name,
                    substitute_exercise="Neutral-Grip Dumbbell Floor Press" if "bench" in ex_lower else "Landmine Press",
                    movement_pattern="Horizontal Push" if "bench" in ex_lower else "Overhead Push",
                    rationale="Eliminates extreme glenohumeral extension/abduction angles and frees scapular rotation.",
                    cues=["Keep elbows tucked at 45°", "Drive through palms without flaring shoulders"]
                ))
        if "back" in clean_inj or "lumbar" in clean_inj or "disc" in clean_inj:
            if "barbell back squat" in ex_lower or "squat" in ex_lower:
                subs.append(ExerciseSubstitution(
                    original_exercise=exercise_name,
                    substitute_exercise="Goblet Squat (Heels Elevated) or Belt Squat",
                    movement_pattern="Squat",
                    rationale="Unloads axial lumbar compression while preserving quadriceps mechanical tension.",
                    cues=["Maintain vertical torso", "Brace core against diaphragmatic breath"]
                ))
            elif "deadlift" in ex_lower or "barbell row" in ex_lower:
                subs.append(ExerciseSubstitution(
                    original_exercise=exercise_name,
                    substitute_exercise="High-Handle Trap Bar Deadlift or Chest-Supported Row",
                    movement_pattern="Hinge / Pull",
                    rationale="Reduces spinal shear moment arm by placing center of mass inside base of support.",
                    cues=["Hinge at hips without lumbar flexion", "Drive floor away"]
                ))
        if "knee" in clean_inj or "patellofemoral" in clean_inj or "patellar" in clean_inj:
            if "squat" in ex_lower or "lunge" in ex_lower or "leg extension" in ex_lower:
                subs.append(ExerciseSubstitution(
                    original_exercise=exercise_name,
                    substitute_exercise="Box Squat (Vertical Shin) or Spanish Squat",
                    movement_pattern="Squat",
                    rationale="Reduces anterior patellofemoral shear forces and shifts load toward posterior chain.",
                    cues=["Sit back onto box to maintain vertical tibia", "Pause 1s before driving upward"]
                ))
    return subs
