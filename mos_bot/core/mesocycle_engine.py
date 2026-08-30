"""Automated Mesocycle State Machine & Periodization Engine.

Manages the 6-week mesocycle lifecycle:
- Week 1: Intro (MEV volume, RIR 3-4, establish baseline)
- Weeks 2-4: Accumulation (Titrate to MAV, RIR 1-2)
- Week 5: Overreach/Peak (MRV volume, RIR 0-1)
- Week 6: Deload (40-50% volume reduction, RIR 3-4)
- Phase Pivot Gate: Resensitization, Hypertrophy, or Strength transition
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class MesocycleState:
    user_id: str
    current_week: int = 1         # 1 to 6
    phase: str = "intro"          # intro, accumulation, peak, deload
    goal: str = "hypertrophy"
    mesocycle_index: int = 1      # Total completed mesocycles
    volume_multiplier: float = 1.0
    target_rir: str = "3-4"
    deload_scheduled: bool = False
    notes: List[str] = field(default_factory=list)


@dataclass
class MesocycleProgressResult:
    new_state: MesocycleState
    phase_name: str
    weekly_instruction: str
    volume_change_pct: int
    target_rir: str
    pivot_ready: bool = False
    suggested_next_focus: Optional[str] = None


def get_mesocycle_phase(week: int) -> str:
    """Map week number (1-6) to canonical mesocycle phase."""
    if week == 1:
        return "intro"
    elif week in (2, 3, 4):
        return "accumulation"
    elif week == 5:
        return "peak"
    else:
        return "deload"


def advance_mesocycle(state: MesocycleState, readiness_score: int = 7,
                      soreness_hours: int = 24, force_deload: bool = False) -> MesocycleProgressResult:
    """Advance the mesocycle week and calculate volume/RIR modifications."""
    current_week = state.current_week

    # Autoregulated early deload if readiness < 5 or soreness > 72h for 2+ weeks
    if force_deload or readiness_score < 5 or soreness_hours >= 72:
        if current_week not in (1, 6):  # Don't deload in week 1
            current_week = 6  # Jump straight to deload

    if current_week >= 6:
        # Mesocycle completed -> Pivot or restart
        new_week = 1
        new_index = state.mesocycle_index + 1
        pivot_ready = True
        suggested_next = "resensitization_or_strength" if new_index % 3 == 0 else "hypertrophy_accumulation"
    else:
        new_week = current_week + 1
        new_index = state.mesocycle_index
        pivot_ready = False
        suggested_next = None

    phase = get_mesocycle_phase(new_week)

    if phase == "intro":
        vol_pct = -20  # MEV baseline
        target_rir = "3-4"
        instruction = "Week 1 (Intro): Establish technique baseline at Minimum Effective Volume (MEV). Stop 3-4 reps shy of failure."
        vol_mult = 0.8
    elif phase == "accumulation":
        week_offset = new_week - 2  # 0, 1, 2
        vol_pct = (week_offset + 1) * 10  # +10%, +20%, +30%
        target_rir = "1-2"
        instruction = f"Week {new_week} (Accumulation): Progressive overload toward Maximum Adaptive Volume (MAV). Push sets to 1-2 RIR."
        vol_mult = 1.0 + (week_offset * 0.1)
    elif phase == "peak":
        vol_pct = 35  # MRV peak
        target_rir = "0-1"
        instruction = "Week 5 (Overreach Peak): Maximum volume at Maximum Recoverable Volume (MRV). Push final sets to 0-1 RIR."
        vol_mult = 1.35
    else:  # deload
        vol_pct = -45  # Deload 40-50% cut
        target_rir = "3-4"
        instruction = "Week 6 (Proactive Deload): Cut set volume by 40-50% at same working weights. Dispel systemic fatigue."
        vol_mult = 0.55

    new_state = MesocycleState(
        user_id=state.user_id,
        current_week=new_week,
        phase=phase,
        goal=state.goal,
        mesocycle_index=new_index,
        volume_multiplier=vol_mult,
        target_rir=target_rir,
        deload_scheduled=(phase == "deload"),
    )

    return MesocycleProgressResult(
        new_state=new_state,
        phase_name=phase.upper(),
        weekly_instruction=instruction,
        volume_change_pct=vol_pct,
        target_rir=target_rir,
        pivot_ready=pivot_ready,
        suggested_next_focus=suggested_next,
    )
