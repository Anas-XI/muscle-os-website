"""Posture Assessment & Corrective Exercise Prescription Engine.

Maps postural dysfunctions (Upper Crossed Syndrome, Lower Crossed Syndrome / Anterior Pelvic Tilt, Thoracic Kyphosis)
to structured 4-phase corrective protocols (Inhibition -> Lengthening -> Activation -> Integration).
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class CorrectiveExercise:
    phase: str  # "Inhibition (SMR)", "Lengthening (Static Stretch)", "Activation (Isolated)", "Integration (Dynamic)"
    name: str
    target_muscle: str
    dosage: str
    coaching_cues: List[str]


@dataclass
class PostureCorrectionPlan:
    syndrome_name: str
    primary_fault: str
    short_overactive_muscles: List[str]
    long_underactive_muscles: List[str]
    corrective_routine: List[CorrectiveExercise]
    lifting_modifications: List[str]


POSTURE_REGISTRY = {
    "upper_crossed": {
        "name": "Upper Crossed Syndrome (UCS)",
        "fault": "Forward head posture, protracted/elevated scapulae, thoracic kyphosis",
        "overactive": ["Upper Trapezius", "Levator Scapulae", "Pectoralis Major/Minor", "Sternocleidomastoid"],
        "underactive": ["Deep Cervical Flexors", "Lower Trapezius", "Serratus Anterior", "Rhomboids"],
        "exercises": [
            CorrectiveExercise("Inhibition (SMR)", "Suboccipital & Upper Trap Lacrosse Ball Release", "Upper Traps / Suboccipitals", "60-90s per side", ["Breathe deeply, locate tender trigger points"]),
            CorrectiveExercise("Lengthening", "Doorway Pec Minor Stretch (Forearm at 135°)", "Pectoralis Minor", "30-45s hold x 2", ["Avoid rib flare, feel stretch across upper chest"]),
            CorrectiveExercise("Activation", "Chin Tucks with Deep Cervical Neck Isometric", "Deep Cervical Flexors", "2 sets x 10 reps (5s hold)", ["Draw chin straight back as if making a double chin"]),
            CorrectiveExercise("Activation", "Prone Y-Raises on Incline Bench", "Lower Trapezius", "3 sets x 12 reps (2s hold at peak)", ["Thumbs pointed to ceiling, initiate with lower scapula depression"]),
            CorrectiveExercise("Integration", "Face Pulls with External Rotation & Overhead Y", "Posterior Chain / Rotator Cuff", "3 sets x 15 reps", ["Pull rope to eye level, externally rotate knuckles backward"]),
        ],
        "modifications": [
            "Avoid flat barbell bench pressing with flared elbows; use neutral-grip DB press.",
            "Eliminate upright rows and behind-the-neck presses.",
            "Maintain 2:1 pulling to pushing volume ratio in weekly programming."
        ]
    },
    "lower_crossed": {
        "name": "Lower Crossed Syndrome / Anterior Pelvic Tilt (LCS/APT)",
        "fault": "Excessive lumbar lordosis, anteriorly tilted pelvis, protruding abdomen",
        "overactive": ["Iliopsoas (Hip Flexors)", "Rectus Femoris", "Lumbar Erector Spinae", "Tensor Fasciae Latae (TFL)"],
        "underactive": ["Gluteus Maximus", "Gluteus Medius", "Rectus Abdominis", "Transverse Abdominis", "Hamstrings"],
        "exercises": [
            CorrectiveExercise("Inhibition (SMR)", "Foam Roll Quadriceps & Hip Flexors", "Rectus Femoris / TFL", "60-90s per side", ["Slow roll, pause on tender spots"]),
            CorrectiveExercise("Lengthening", "Half-Kneeling Hip Flexor Stretch with Posterior Pelvic Tilt", "Psoas / Iliacus", "45s hold x 2 per side", ["Squeeze glute of back leg to tilt pelvis posteriorly before leaning forward"]),
            CorrectiveExercise("Activation", "Deadbugs with Core Press", "Transverse Abdominis / Deep Core", "3 sets x 8 reps per side", ["Keep lumbar spine glued to floor, exhale on leg reach"]),
            CorrectiveExercise("Activation", "Single-Leg Glute Bridge with Pause", "Gluteus Maximus", "3 sets x 12 reps (3s squeeze)", ["Drive through heel, ensure no lower back arching"]),
            CorrectiveExercise("Integration", "Goblet Box Squats with Hip Band", "Glutes / Core / Adductors", "3 sets x 10 reps", ["Drive knees out against band, maintain neutral spine throughout"]),
        ],
        "modifications": [
            "Replace heavy standing overhead press with seated or half-kneeling landmine press.",
            "Avoid deep hyper-extended back squat bottoms; squat to box parallel with neutral pelvis.",
            "Prioritize Romanian Deadlifts with strict hip hinge mechanics."
        ]
    }
}


def evaluate_posture(deviation: str) -> Optional[PostureCorrectionPlan]:
    """Retrieve full 4-phase corrective plan for a diagnosed postural deviation."""
    clean = deviation.lower().replace(" ", "_")
    key = "upper_crossed" if "upper" in clean or "forward_head" in clean or "kyphosis" in clean else "lower_crossed"
    data = POSTURE_REGISTRY[key]
    return PostureCorrectionPlan(
        syndrome_name=data["name"],
        primary_fault=data["fault"],
        short_overactive_muscles=data["overactive"],
        long_underactive_muscles=data["underactive"],
        corrective_routine=data["exercises"],
        lifting_modifications=data["modifications"],
    )
