"""Circadian Biology, Shift Work & Sleep Optimization Engine.

Implements:
- Photobiology timing (Lux exposure windows for SCN synchronization)
- Caffeine clearance and half-life calculations
- Shift work phase-shift protocols (Night Shift, Rotating Shift, Jet Lag)
- Bedtime thermal and biochemical wind-down schedules
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class CircadianScheduleResult:
    target_wake_time: str
    target_sleep_time: str
    morning_light_window: str
    caffeine_cutoff_time: str
    evening_light_cutoff: str
    core_temp_drop_protocol: str
    shift_work_guidance: Optional[str]
    sleep_stack_prescription: List[str]


def calculate_circadian_schedule(
    wake_time_str: str = "07:00",
    sleep_time_str: str = "23:00",
    is_night_shift: bool = False
) -> CircadianScheduleResult:
    """Calculate photobiology, caffeine cutoff, and circadian alignment windows."""
    try:
        wake_h, wake_m = map(int, wake_time_str.split(":"))
    except Exception:
        wake_h, wake_m = 7, 0

    try:
        sleep_h, sleep_m = map(int, sleep_time_str.split(":"))
    except Exception:
        sleep_h, sleep_m = 23, 0

    # Caffeine cutoff is 9 hours before target sleep time
    caff_cutoff_h = (sleep_h - 9) % 24
    caff_cutoff_str = f"{caff_cutoff_h:02d}:00"

    # Morning light within 30-60 min of waking
    light_start = f"{wake_h:02d}:{wake_m:02d}"
    light_end = f"{(wake_h + 1) % 24:02d}:{wake_m:02d}"
    morning_light = f"{light_start} - {light_end} (10,000+ Lux outdoor light or SAD lamp for 15-30 min)"

    # Evening light cutoff is 2 hours before sleep
    eve_light_h = (sleep_h - 2) % 24
    eve_light_str = f"{eve_light_h:02d}:00 (Dim overhead lights, activate red/amber filters, <10 Lux)"

    # Sleep stack prescription from Pillar 3
    stack = [
        "Magnesium L-Threonate or Bisglycinate (300-400mg) - 60 min before bed",
        "L-Theanine (200mg) - Promotes alpha brainwave relaxation",
        "Glycine (3g) - Lowers core body temperature via peripheral vasodilation",
        "Apigenin (50mg) - Mild chloride-channel activation without next-day grogginess",
    ]

    temp_protocol = (
        "Take a hot shower or sauna 60-90 min before bed (triggers rapid peripheral vasodilation "
        "and drops core body temperature by 0.5-1.0°C, accelerating slow-wave sleep onset). "
        "Keep bedroom ambient temperature at 18-20°C (65-68°F)."
    )

    if is_night_shift:
        shift_guidance = (
            "Night Shift Protocol: "
            "1. Wear dark sunglasses on drive home to block morning light. "
            "2. Sleep in 100% pitch-black room with blackout curtains and earplugs. "
            "3. Consume main post-shift meal 2 hours before daytime sleep."
        )
    else:
        shift_guidance = None

    return CircadianScheduleResult(
        target_wake_time=wake_time_str,
        target_sleep_time=sleep_time_str,
        morning_light_window=morning_light,
        caffeine_cutoff_time=caff_cutoff_str,
        evening_light_cutoff=eve_light_str,
        core_temp_drop_protocol=temp_protocol,
        shift_work_guidance=shift_guidance,
        sleep_stack_prescription=stack,
    )
