"""Cardiovascular Conditioning & Concurrent Training Optimization Engine.

Implements:
- Zone 2 Aerobic Base Prescription (60-70% HRmax / 150-180 min/wk)
- High-Intensity Interval Training (HIIT) protocols
- Interference Effect Mitigation (AMPK vs mTOR signaling pathway separation)
- Modality-specific joint sparing recommendations (Incline Walking, Cycling, Rowing)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class CardioPrescriptionResult:
    estimated_hrmax: int
    zone2_hr_range: Tuple[int, int]
    zone5_hiit_hr_range: Tuple[int, int]
    weekly_zone2_minutes: int
    weekly_hiit_sessions: int
    preferred_modalities: List[str]
    concurrent_training_rules: List[str]


def generate_cardio_prescription(
    age: int,
    experience: str = "intermediate",
    goal: str = "hypertrophy",
    resting_hr: int = 65
) -> CardioPrescriptionResult:
    """Generate cardiovascular conditioning plan with concurrent training safeguards."""
    # Tanaka Formula: 208 - (0.7 * age)
    hrmax = round(208.0 - (0.7 * age))
    
    # Karvonen Formula for Zone 2 (60-70% HRR)
    hrr = hrmax - resting_hr
    z2_low = round(resting_hr + (hrr * 0.60))
    z2_high = round(resting_hr + (hrr * 0.70))

    # Zone 5 HIIT (85-95% HRR)
    z5_low = round(resting_hr + (hrr * 0.85))
    z5_high = round(resting_hr + (hrr * 0.95))

    g_clean = goal.lower()
    if "fat_loss" in g_clean or "cut" in g_clean:
        z2_mins = 180
        hiit_sessions = 1
    elif "strength" in g_clean or "bulk" in g_clean or "hypertrophy" in g_clean:
        z2_mins = 120
        hiit_sessions = 0
    else:
        z2_mins = 150
        hiit_sessions = 1

    modalities = [
        "Incline Treadmill Walking (10-12% incline, 4.5-5.5 km/h) - Zero eccentric damage",
        "Stationary Ergometer / Upright Bike - Minimal patellofemoral/lumbar shear",
        "Concept2 Rowing Ergometer - Full kinetic chain recruitment without impact",
    ]

    rules = [
        "⏱️ **6-Hour Separation Rule:** Separate heavy leg resistance training and cardio by at least 6 hours to prevent AMPK inhibition of mTORC1 muscle protein synthesis.",
        "🚴 **Modality Selection:** Choose low-impact modalities (cycling/incline walking) over outdoor road running to eliminate eccentric muscle damage and preserve squat recovery.",
        "📈 **Autoregulation:** If leg soreness > 72h or readiness < 5, replace all cardio with light walking (<100 bpm).",
    ]

    return CardioPrescriptionResult(
        estimated_hrmax=hrmax,
        zone2_hr_range=(z2_low, z2_high),
        zone5_hiit_hr_range=(z5_low, z5_high),
        weekly_zone2_minutes=z2_mins,
        weekly_hiit_sessions=hiit_sessions,
        preferred_modalities=modalities,
        concurrent_training_rules=rules,
    )
