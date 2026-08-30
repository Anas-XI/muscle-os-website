"""Content Generator: Build structured program content from vault context + templates"""

from datetime import datetime
from typing import List, Optional
from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, PillarAssignment,
    ProgramContent, ProgramStructure, NutritionPlan,
    Exercise, Session, Phase, VaultSource, VaultInformedSignals,
)
from mos_bot.core.book_engine import BookEngineResult


def _goal_label(goal: str) -> str:
    labels = {
        "fat_loss": "Fat Loss", "cut": "Fat Loss",
        "hypertrophy": "Muscle Building", "strength": "Strength",
        "recomp": "Body Recomposition",
    }
    return labels.get(goal, goal.replace("_", " ").title())


def _bmi(profile: ClientProfile) -> float:
    if profile.height_cm <= 0 or profile.bodyweight_kg <= 0:
        return 0
    h_m = profile.height_cm / 100
    return round(profile.bodyweight_kg / (h_m * h_m), 1)


def _calc_bmr(profile: ClientProfile) -> int:
    if profile.sex == "female":
        bmr = 10 * profile.bodyweight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161
    else:
        bmr = 10 * profile.bodyweight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5
    return round(bmr)


def _calc_tdee(bmr: int, profile: ClientProfile) -> int:
    activity_map = {2: 1.2, 3: 1.375, 4: 1.45, 5: 1.55, 6: 1.65}
    factor = activity_map.get(profile.training_days, 1.375)
    return round(bmr * factor)


def _split_label(split: str) -> str:
    labels = {
        "full_body": "Full Body", "upper_lower": "Upper/Lower Split",
        "push_pull_legs": "Push/Pull/Legs", "bro_split": "Body Part Split",
    }
    return labels.get(split, split.replace("_", " ").title())


def _training_days_label(days: int) -> str:
    if days <= 2: return "2 days"
    if days <= 4: return f"{days} days"
    return f"{days} days"


def _determine_split(profile: ClientProfile) -> str:
    if profile.current_split and profile.current_split != "none":
        return _split_label(profile.current_split)
    if profile.training_days <= 3:
        return "Full Body"
    if profile.training_days <= 4:
        return "Upper/Lower Split"
    return "Push/Pull/Legs"


def _experience_label(years: float) -> str:
    if years < 1: return "Beginner"
    if years < 3: return "Intermediate"
    return "Advanced"


def generate_pillars_section(pillars: PillarAssignment) -> str:
    lines = ["## Pillar Focus & Modifications"]
    if pillars.gentle_entry:
        lines.append("")
        lines.append("> **Gentle Entry Protocol active:** No calorie deficit. No food tracking. Add never subtract.")
    lines.append("")
    lines.append("### Primary Pillars")
    for p in pillars.primary_pillars:
        lines.append(f"- **{p}**")
    lines.append("")
    lines.append("### Secondary Pillars")
    for p in pillars.secondary_pillars:
        lines.append(f"- {p}")
    if pillars.modifications:
        lines.append("")
        lines.append("### Active Modifications")
        mod_notes = {
            "avoid_deep_squat": "Avoid deep squat depth — use box squat or goblet squat to parallel",
            "vitamin_d_supplementation": "Ensure vitamin D + calcium monitored via bloodwork",
            "unilateral_work": "Prioritize unilateral work to manage asymmetries",
            "core_stabilization": "Include dedicated core stabilization work",
            "shoulder_care": "Use neutral grip pressing, avoid behind-neck movements",
            "knee_care": "Monitor knee tracking, avoid ballistic knee flexion",
            "back_care": "Use bracing technique, avoid spinal flexion under load",
            "neck_care": "Avoid heavy overhead work, use supported variations",
            "sleep_priority": "Prioritize minimum 7h sleep target before adjusting training",
            "stress_management": "Reduce training volume 30%, maintain protein and sleep",
            "alcohol_reduction": "Reduce alcohol intake to support recovery and sleep quality",
            "shift_work": "Apply shift work circadian protocol: anchor sleep to fixed window",
            "gut_health_support": "Apply fiber progression protocol, consider probiotic",
            "mental_health_support": "Keep protocol simple, minimize tracking burden",
            "injury_aware": "All exercises vetted against injury-training compatibility matrix",
            "no_calorie_deficit": "No calorie deficit — maintain or slight surplus",
            "no_food_tracking": "No food tracking — use portion-based guidelines instead",
        }
        for m in pillars.modifications:
            note = mod_notes.get(m, m.replace("_", " ").title())
            lines.append(f"- {note}")
    return "\n".join(lines)


def generate_nutrition_plan(profile: ClientProfile, triage: SafetyTriageResult, pillars: PillarAssignment, book_result: Optional[BookEngineResult] = None, vault_signals: Optional[VaultInformedSignals] = None) -> NutritionPlan:
    bmr = _calc_bmr(profile)
    tdee = _calc_tdee(bmr, profile)

    # Book-informed protein target
    book_protein = book_result.protein_per_kg if book_result else 1.6
    protein_per_kg = max(book_protein, 2.0 if profile.experience_years >= 2 else 1.6)
    protein_g = round(profile.bodyweight_kg * protein_per_kg)

    # Book-informed meal timing
    meal_timing = book_result.meal_timing if book_result and book_result.meal_timing else (
        "Distribute protein across 3-4 meals at leucine threshold (30-40g per meal). Carbs prioritized around training window."
    )

    if pillars.gentle_entry or "no_calorie_deficit" in pillars.modifications:
        calories = tdee
        fat_g = round((tdee * 0.25) / 9)
        carbs_g = round((tdee - protein_g * 4 - fat_g * 9) / 4)
        special = "Maintenance calories (Gentle Entry). No deficit applied."
    else:
        goal = profile.goal.lower()
        if goal in ("fat_loss", "cut"):
            bk = book_result if book_result else None
            deficit = min((bk.deficit_kcal if bk else 500), round(tdee * 0.2))
            calories = tdee - deficit
        elif goal in ("hypertrophy", "build muscle", "strength"):
            bk = book_result if book_result else None
            surplus = round(tdee * 0.1) if not bk else round(tdee * 0.1)  # surplus_kcal used for note
            calories = tdee + surplus
        else:
            calories = tdee
        fat_g = round((calories * 0.25) / 9)
        carbs_g = round((calories - protein_g * 4 - fat_g * 9) / 4)
        special = ""

    # Collect nutrition notes from vault + books + special notes from gentle entry / modifiers
    nutrition_lines = []
    if special:
        nutrition_lines.append(special)
    if vault_signals and vault_signals.vault_nutrition_guidance:
        for snippet in vault_signals.vault_nutrition_guidance.split("\n\n"):
            if snippet.strip() and snippet.strip() not in nutrition_lines:
                nutrition_lines.append(f"Vault reference: {snippet.strip()[:300]}")
    if book_result:
        for n in book_result.nutrition_notes:
            if n not in nutrition_lines:
                nutrition_lines.append(n)

    return NutritionPlan(
        calories_target=calories,
        protein_g=protein_g,
        carbs_g=max(carbs_g, 0),
        fat_g=max(fat_g, 0),
        protein_per_kg=protein_per_kg,
        meal_timing_notes=meal_timing,
        hydration_target_l=max(2.5, round(profile.bodyweight_kg * 0.035, 1)),
        special_notes="; ".join(nutrition_lines) if nutrition_lines else "",
    )


def generate_program_structure(profile: ClientProfile, triage: SafetyTriageResult, pillars: PillarAssignment, book_result: Optional[BookEngineResult] = None, vault_signals: Optional[VaultInformedSignals] = None) -> ProgramStructure:
    split_name = _determine_split(profile)
    is_gentle = pillars.gentle_entry

    phase1_duration = "Weeks 1-4"
    phase2_duration = "Weeks 5+"

    phase1_goal = "Accumulation & Movement Quality"
    phase2_goal = "Intensification & Progressive Overload"

    need_shoulder_care = "shoulder_care" in pillars.modifications
    need_knee_care = "knee_care" in pillars.modifications
    need_back_care = "back_care" in pillars.modifications

    sessions = []
    if split_name == "Full Body":
        for i in range(1, profile.training_days + 1):
            ex_list = [
                Exercise(name="Goblet Squat", sets=3, reps="10-12", rir="2", notes="Focus on depth control, brace core"),
                Exercise(name="Dumbbell Bench Press (Neutral Grip)", sets=3, reps="10-12", rir="2", notes="Control at bottom, avoid bounce"),
                Exercise(name="Seated Cable Row (Neutral Grip)", sets=3, reps="12-15", rir="1-2", notes="Squeeze at peak contraction"),
                Exercise(name="Dumbbell Overhead Press (Seated)", sets=3, reps="10-12", rir="2", notes="Keep core braced throughout"),
                Exercise(name="Dumbbell RDL", sets=3, reps="12-15", rir="2", notes="Soft knees, feel hamstring stretch"),
                Exercise(name="Plank", sets=3, reps="45s", rir="", notes="Side plank 30s/side if comfortable"),
            ]
            if need_knee_care:
                ex_list[0] = Exercise(name="Leg Press", sets=3, reps="12-15", rir="2", notes="Limited ROM, no knee lockout")
            if need_shoulder_care:
                ex_list[3] = Exercise(name="Machine Shoulder Press (Neutral Grip)", sets=3, reps="10-12", rir="2", notes="Supported path, no behind-neck")
            sessions.append(Session(day=f"Day {i}", focus="Full Body", exercises=ex_list))
    elif split_name == "Upper/Lower Split":
        days = profile.training_days
        up_a = Session(day="Upper A", focus="Push/Pull Balance", exercises=[
            Exercise(name="Dumbbell Bench Press (Neutral Grip)", sets=3, reps="10-12", rir="2", notes="Control tempo 2-0-2"),
            Exercise(name="Lat Pulldown (Neutral Grip)", sets=3, reps="10-12", rir="1-2", notes="Full stretch at top"),
            Exercise(name="Seated Cable Row", sets=3, reps="12-15", rir="1-2", notes="Squeeze shoulder blades together"),
            Exercise(name="DB Lateral Raise (Thumb Up)", sets=3, reps="15-20", rir="1", notes="Light weight, strict form"),
            Exercise(name="Face Pull (Low Pulley)", sets=3, reps="15-20", rir="1", notes="External rotation focus"),
        ])
        up_b = Session(day="Upper B", focus="Volume Focus", exercises=[
            Exercise(name="Machine Chest Press (Neutral Grip)", sets=3, reps="12-15", rir="2", notes="Controlled 3s negative"),
            Exercise(name="Dumbbell Row (Single Arm)", sets=3, reps="10-12/arm", rir="2", notes="Supported, full ROM"),
            Exercise(name="Incline DB Press", sets=3, reps="12-15", rir="1-2", notes="Upper chest focus"),
            Exercise(name="Cable Lateral Raise", sets=3, reps="15-20", rir="1", notes="Constant tension"),
            Exercise(name="Triceps Pushdown + DB Curl SS", sets=2, reps="12-15", rir="1-2", notes="Superset for density"),
        ])
        lo_a = Session(day="Lower A", focus="Compound/Glutes", exercises=[
            Exercise(name="Goblet Squat", sets=3, reps="10-12", rir="2", notes="Depth control"),
            Exercise(name="Dumbbell RDL", sets=3, reps="12-15", rir="2", notes="Soft knees, feel stretch"),
            Exercise(name="Leg Press", sets=3, reps="15-20", rir="1", notes="High volume pump"),
            Exercise(name="Walking Lunge", sets=3, reps="10/leg", rir="2", notes="Control each rep"),
            Exercise(name="Calf Raise (Standing)", sets=3, reps="15-20", rir="1", notes="Slow, full ROM"),
        ])
        lo_b = Session(day="Lower B", focus="Unilateral Focus", exercises=[
            Exercise(name="Bulgarian Split Squat", sets=3, reps="10-12/leg", rir="2", notes="Stability focus"),
            Exercise(name="Glute Bridge (Weighted)", sets=3, reps="12-15", rir="1-2", notes="Squeeze at top"),
            Exercise(name="Hamstring Curl (Machine)", sets=3, reps="12-15", rir="1-2", notes="Controlled negative"),
            Exercise(name="Hip Flexor Stretch Hold", sets=2, reps="45s/side", rir="", notes="Post-workout mobility"),
        ])

        if need_shoulder_care:
            for s in [up_a, up_b]:
                for e in s.exercises:
                    if "shoulder" in e.name.lower() or "press" in e.name.lower() or "lateral" in e.name.lower():
                        e.notes += " [Shoulder-safe]"
        if need_knee_care:
            for s in [lo_a, lo_b]:
                for e in s.exercises:
                    if "squat" in e.name.lower() or "lunge" in e.name.lower():
                        e.notes += " Limited ROM, no knee pain"

        sessions = [up_a, lo_a]
        if days >= 4:
            sessions.extend([up_b, lo_b])

    phase1 = Phase(name="Phase 1: Accumulation & Stability", duration=phase1_duration, goal=phase1_goal, sessions=sessions)
    phase2 = Phase(name="Phase 2: Intensification & Progressive Overload", duration=phase2_duration, goal=phase2_goal, progression_notes="When RIR drops below 2 on all sets of a movement, increase weight 5-7.5% or add 1 set. Re-test MAV landmarks after 8 weeks.")

    # Vault-informed + book-informed warm-up
    base_warm_up = "5 min incline walk or bike (RPE 3-4)\nDynamic warm-up: leg swings, cat-cow, thoracic rotations, band pull-aparts\nMovement-specific warm-up: 2x10 reps at 50% working weight"
    vault_extra = ""
    if vault_signals and vault_signals.vault_injury_guidance:
        vault_extra = vault_signals.vault_injury_guidance[:300]
    if book_result and book_result.warm_up:
        warm_up = base_warm_up + "\n" + book_result.warm_up
    else:
        warm_up = base_warm_up
    if vault_extra:
        warm_up += "\n\n" + vault_extra
    cool_down = "5 min light cardio (RPE 2-3)\nStatic stretching for worked muscle groups: 30s holds\nOptional: foam rolling for tight areas"

    return ProgramStructure(
        split=split_name,
        phases=[phase1, phase2],
        weekly_schedule=f"Based on {profile.training_days}x/week schedule. Sessions alternated with rest days for recovery.",
        warm_up_protocol=warm_up,
        cool_down_protocol=cool_down,
    )


def generate_program(profile: ClientProfile, triage: SafetyTriageResult, pillars: PillarAssignment,
                     vault_sources: List[VaultSource] = None,
                     vault_context: str = "",
                     book_result: Optional[BookEngineResult] = None,
                     vault_signals: Optional[VaultInformedSignals] = None) -> ProgramContent:
    nutrition = generate_nutrition_plan(profile, triage, pillars, book_result, vault_signals)
    program = generate_program_structure(profile, triage, pillars, book_result, vault_signals)

    vault_insights = list(book_result.vault_insights) if book_result else []

    return ProgramContent(
        client=profile,
        triage=triage,
        pillars=pillars,
        program=program,
        nutrition=nutrition,
        vault_sources=vault_sources or [],
        vault_insights=vault_insights,
        vault_context_raw=vault_context,
    )


def program_to_markdown(pc: ProgramContent) -> str:
    lines = []
    p = pc.program
    c = pc.client
    t = pc.triage
    pil = pc.pillars
    n = pc.nutrition
    bmi_val = _bmi(c)
    bmr_val = _calc_bmr(c)
    tdee_val = _calc_tdee(bmr_val, c)

    # --- Cover / Title ---
    lines.append(f"# Muscle OS Coaching Program: {c.name}")
    lines.append("")
    lines.append(f"*Generated on {datetime.now().strftime('%B %d, %Y')}*")
    lines.append("")

    # --- 1. Profile Summary ---
    lines.append("## 1. Profile Summary")
    lines.append("")
    lines.append("| Detail | Value | Notes |")
    lines.append("|---|---|---|")
    lines.append(f"| **Name** | {c.name} | |")
    lines.append(f"| **Goal** | {_goal_label(c.goal)} | Primary training focus |")
    lines.append(f"| **Stats** | {c.sex.title()}, {c.age} Yrs, {c.height_cm}cm, {c.bodyweight_kg}kg | BMI ~{bmi_val} |")
    lines.append(f"| **Experience** | {c.experience_years} years | {_experience_label(c.experience_years)} level |")
    lines.append(f"| **Training Schedule** | {_training_days_label(c.training_days)}/Week, {c.session_length_min} Min Sessions | {p.split} |")
    if c.injuries:
        lines.append(f"| **Injuries** | {'; '.join(c.injuries)} | Requires movement modification |")
    lines.append(f"| **Recovery Metrics** | Sleep: {c.sleep_hours}h, Stress: {c.stress_level}/10, Steps: {c.daily_steps} | Baseline recovery capacity |")
    if c.supplements:
        lines.append(f"| **Supplements** | {', '.join(c.supplements)} | Current regimen |")
    lines.append(f"| **Triage Status** | {t.triage.upper()} | {'Proceeding with modifications' if t.triage == 'yellow' else 'Proceeding normally'} |")
    lines.append("")

    # --- 2. Constraint Analysis ---
    lines.append("## 2. Constraint Analysis & Conflict Resolution")
    lines.append("")
    constraints = []
    if c.injuries:
        constraints.append(f"**Injury Constraint ({'; '.join(c.injuries)}):** Exercise selection must avoid aggravating factors. All movements vetted against injury-training compatibility matrix.")
    if c.goal:
        constraints.append(f"**Goal Constraint ({_goal_label(c.goal)}):** {'Caloric deficit with muscle preservation' if c.goal in ('fat_loss','cut') else 'Caloric surplus with controlled gain' if c.goal in ('hypertrophy','build muscle') else 'Performance-focused programming'}.")
    if c.training_days and c.session_length_min:
        constraints.append(f"**Time Constraint:** {c.training_days}x/week, {c.session_length_min}min max per session. Requires efficient, compound-focused workouts.")
    if c.medical:
        constraints.append(f"**Medical Constraint ({'; '.join(c.medical)}):** Requires protocol modifications as noted.")
    for i, con in enumerate(constraints, 1):
        lines.append(f"{i}. {con}")
    lines.append("")
    lines.append("**Resolution:** The program below balances all constraints. Where conflicts arise, **Safety > Adherence > Recovery > Nutrition > Training > Optimisation.**")
    lines.append("")

    # --- 3. Pillar Focus ---
    lines.append(generate_pillars_section(pil))
    lines.append("")

    # --- 4. Program Overview ---
    lines.append("## 4. Program Overview")
    lines.append("")
    lines.append(f"*   **Protocol Focus:** {_goal_label(c.goal)}-focused programming with {_experience_label(c.experience_years)}-appropriate volume landmarks.")
    lines.append(f"*   **Training Split:** {p.split}")
    if len(p.phases) >= 2:
        lines.append(f"*   **Phasing:** Two-phase approach: **{p.phases[0].goal}** followed by **{p.phases[1].goal}** once movement quality is confirmed.")
    elif len(p.phases) == 1:
        lines.append(f"*   **Phasing:** Focused phase: **{p.phases[0].goal}**.")
    # Vault-informed program notes
    if pc.vault_insights:
        lines.append(f"*   **Evidence Base:** This program is informed by {len(pc.vault_insights)} decision rules from the Muscle OS knowledge vault.")
    if pc.vault_context_raw:
        lines.append("*   **Vault Integration:** Program decisions incorporate relevant vault knowledge alongside book evidence.")
    lines.append("")

    # --- 5. Training Program ---
    for phase in p.phases:
        lines.append(f"## 5. Training: {phase.name}")
        lines.append("")
        lines.append(f"*Duration: {phase.duration}*")
        lines.append("")
        lines.append(f"*Goal: {phase.goal}*")
        lines.append("")

        for s in phase.sessions:
            lines.append(f"### {s.day}: {s.focus}")
            lines.append("")
            lines.append("| Exercise | Sets | Reps | RIR | Notes |")
            lines.append("|---|---|---|---|---|")
            for e in s.exercises:
                notes_clean = e.notes.replace("|", "/")
                lines.append(f"| {e.name} | {e.sets} | {e.reps} | {e.rir} | {notes_clean} |")
            if s.notes:
                lines.append("")
                lines.append(f"*{s.notes}*")
            lines.append("")

        if phase.progression_notes:
            lines.append("**Progression Strategy:**")
            lines.append("")
            lines.append(phase.progression_notes)
            lines.append("")

    # --- Warm-up & Cool-down ---
    lines.append("### Warm-Up Protocol")
    lines.append("")
    for step in p.warm_up_protocol.split("\n"):
        lines.append(f"- {step}")
    lines.append("")
    lines.append("### Cool-Down Protocol")
    lines.append("")
    for step in p.cool_down_protocol.split("\n"):
        lines.append(f"- {step}")
    lines.append("")

    # --- 6. Nutrition Plan ---
    lines.append("## 6. Nutrition Plan")
    lines.append("")
    lines.append(f"**BMR Estimate (Mifflin-St Jeor):** {bmr_val} kcal/day")
    lines.append(f"**TDEE Estimate:** {tdee_val} kcal/day (activity factor based on {c.training_days}x/week training)")
    lines.append("")
    lines.append("| Target | Value | Notes |")
    lines.append("|---|---|---|")
    lines.append(f"| **Calories** | {n.calories_target} kcal | {'Gentle Entry: maintenance' if n.calories_target == tdee_val else 'Moderate adjustment from TDEE'} |")
    lines.append(f"| **Protein** | {n.protein_g}g ({n.protein_per_kg}g/kg) | Distribute across 3-4 meals at leucine threshold |")
    lines.append(f"| **Carbohydrates** | {n.carbs_g}g | Prioritize around training window |")
    lines.append(f"| **Fat** | {n.fat_g}g | Remaining calories after protein and carbs |")
    lines.append(f"| **Hydration** | {n.hydration_target_l}L | Minimum target |")
    lines.append("")
    if n.meal_timing_notes:
        lines.append(f"**Meal Timing:** {n.meal_timing_notes}")
        lines.append("")
    if n.special_notes:
        lines.append(f"**Special Notes:** {n.special_notes}")
        lines.append("")

    # --- 7. Sleep ---
    lines.append("## 7. Sleep Protocol")
    lines.append("")
    sleep_h = c.sleep_hours
    if sleep_h < 6.5:
        lines.append("**Sleep is the current bottleneck.** Prioritize minimum 7h target before making other changes.")
        lines.append("")
    lines.append("- Target: 7.5-8h consistent bedtime ±30min")
    lines.append("- Morning light exposure: 10min outdoor light within 30min of waking")
    lines.append("- Screen curfew: No screens 60min pre-bed")
    lines.append("- Room temp: 17-19°C (cool sleeping environment)")
    lines.append("- Pre-bed routine: 30-40g casein + 200mg magnesium glycinate")
    lines.append("- No alcohol within 3h of bedtime")
    lines.append("")
    if c.work_schedule in ("night", "rotating", "early"):
        lines.append("**Shift Worker Modifications:** Anchor sleep to the same 4h window regardless of shift. Use blackout curtains. Consider 200mg caffeine max 4h before shift end.")
        lines.append("")

    # --- 8. Supplements ---
    lines.append("## 8. Supplement Recommendations")
    lines.append("")
    lines.append("| Supplement | Dose | Timing | Evidence Level |")
    lines.append("|---|---|---|---|")
    lines.append("| **Protein Powder** | To meet daily target | Post-training + before bed | Strong |")
    lines.append("| **Creatine Monohydrate** | 5g daily | Any time, consistent | Strong |")
    lines.append("| **Vitamin D3 + K2** | 2000-4000 IU | With largest meal | Strong if deficient |")
    lines.append("| **Omega-3 (EPA+DHA)** | 3g EPA+DHA total | With meals | Strong |")
    lines.append("| **Magnesium Glycinate** | 200mg | Pre-bed | Moderate for sleep |")
    lines.append("")
    if c.gut_health != "none":
        lines.append("**Gut Health Note:** Consider probiotic (10-20B CFU multi-strain) and fiber progression protocol (increase 5g/week to 35-40g total).")
        lines.append("")

    # --- 9. Rehab / Prehab ---
    has_injuries = bool(c.injuries)
    lines.append("## 9. Rehab & Prehab")
    lines.append("")
    if has_injuries:
        lines.append(f"Injury modifications active for: {', '.join(c.injuries)}")
        lines.append("")
        for inj in c.injuries:
            il = inj.lower()
            if "rotator" in il or "shoulder" in il or "cuff" in il:
                lines.append("**Shoulder:**")
                lines.append("- Prioritize neutral grip pressing (dumbbells, machine)")
                lines.append("- Include face pulls and external rotation work")
                lines.append("- Avoid behind-neck movements and upright rows")
                lines.append("- Warm up shoulders with band pull-aparts and YTWs")
            elif "knee" in il or "patellar" in il or "acl" in il or "meniscus" in il:
                lines.append("**Knee:**")
                lines.append("- Avoid ballistic knee flexion and deep squats")
                lines.append("- Use controlled tempo (3s negative) on leg work")
                lines.append("- Monitor patellar tracking; stop if pain")
            elif "back" in il or "disc" in il or "sciatica" in il or "spine" in il:
                lines.append("**Back:**")
                lines.append("- Brace core before every lift")
                lines.append("- Avoid spinal flexion under load (use trap bar or sumo deadlift)")
                lines.append("- Include bird-dog and dead bug for core stability")
    else:
        lines.append("- **Shoulder Health:** Face pulls 3x15-20, 3x/week")
        lines.append("- **Core Stability:** Plank variations 3x45s, 3x/week")
        lines.append("- **Hip Mobility:** World's Greatest Stretch, 3x/side before training")
        lines.append("- **Posture:** Thoracic extensions, 10 reps, 2x/day")
    lines.append("")

    # --- 10. Measurement KPIs ---
    lines.append("## 10. Measurement KPIs")
    lines.append("")
    lines.append("| KPI | Frequency | Decision Threshold | Action |")
    lines.append("|---|---|---|---|")
    lines.append("| **Weight Trend** | Daily (7-day rolling avg) | >2% change in 2 weeks | Adjust calories |")
    lines.append("| **Top Set Performance** | Every session | Decline 3+ weeks | Deload or check sleep |")
    lines.append("| **Waist Circumference** | Monthly | No change for 6+ weeks | Reassess approach |")
    lines.append("| **Training Volume** | Weekly | Below MEV for 2 weeks | Add sets |")
    lines.append("| **Readiness** | Pre-session (1-10) | Consistently <6 | Check recovery variables |")
    if c.goal in ("fat_loss", "cut"):
        lines.append("| **Adherence** | Weekly | <80% for 2 weeks | Simplify protocol |")
    lines.append("")

    # --- 11. Adjustment Triggers ---
    lines.append("## 11. Adjustment Triggers")
    lines.append("")
    lines.append("| If you see... | Do this... |")
    lines.append("|---|---|")
    lines.append("| Strength declining 3+ weeks | Take deload week (50% volume, maintain load) |")
    lines.append("| Weight not changing for 4+ weeks | Adjust calories by ±200 kcal, wait 2 weeks |")
    lines.append("| Sleep consistently <6.5h | Prioritize sleep before any training adjustment |")
    lines.append("| Stress >7/10 for 2+ weeks | Reduce training volume 30%, maintain protein |")
    lines.append("| Joint pain during exercise | Stop, substitute with listed alternative |")
    lines.append("| Missed 2+ sessions in a row | Apply Minimum Effective Compliance (2x full-body, protein 1.6g/kg, 6.5h sleep) |")
    lines.append("")

    # --- 12. Exercise Alternatives ---
    lines.append("## 12. Exercise Alternatives")
    lines.append("")
    lines.append("| Primary Exercise | Alternative A | Alternative B |")
    lines.append("|---|---|---|")
    lines.append("| Barbell Back Squat | Goblet Squat | Leg Press |")
    lines.append("| Barbell Bench Press | Dumbbell Bench Press | Machine Chest Press |")
    lines.append("| Conventional Deadlift | Trap Bar Deadlift | Dumbbell RDL |")
    lines.append("| Pull-Up | Lat Pulldown | Seated Cable Row |")
    lines.append("| Overhead Press (Barbell) | Dumbbell Shoulder Press | Machine Shoulder Press |")
    lines.append("| Barbell Row | Chest Supported Row | Single-Arm DB Row |")
    lines.append("")

    # --- 13. Week 1 Action Plan ---
    lines.append("## 13. Week 1 Action Plan")
    lines.append("")
    lines.append("- [ ] Complete first training session using the program above")
    lines.append("- [ ] Track daily protein intake (target: 4-5 meals at ~30g protein each)")
    lines.append(f"- [ ] Sleep target: {min(8, int(c.sleep_hours + 0.5))}h, consistent bedtime")
    lines.append(f"- [ ] Hydration: {n.hydration_target_l}L water minimum per day")
    lines.append("- [ ] 10min daily morning walk for light exposure")
    lines.append("")

    # --- 14. Vault-Informed Decisions ---
    if pc.vault_insights:
        lines.append("## 14. Vault-Informed Decisions")
        lines.append("")
        lines.append("The following evidence-based insights from the Muscle OS knowledge vault influenced this program:")
        lines.append("")
        for insight in pc.vault_insights:
            lines.append(f"- {insight}")
        lines.append("")

    # --- 15. Vault Sources ---
    if pc.vault_sources:
        lines.append("## 15. Vault Sources")
        lines.append("")
        grouped = {}
        for vs in pc.vault_sources:
            key = vs.pillar or "General"
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(vs)
        for pillar_name in sorted(grouped.keys()):
            sources = grouped[pillar_name]
            lines.append(f"**{pillar_name}**")
            for vs in sources:
                path_display = vs.path.replace("\\", "/").replace(".md", "")
                lines.append(f"- [{vs.title}](vault://{path_display}) (relevance: {vs.score:.2f})")
            lines.append("")
    else:
        lines.append("## 15. Vault Sources")
        lines.append("")
        lines.append("*Vault context was not available during generation.*")
        lines.append("")

    # --- Safety Caveat ---
    lines.append("---")
    lines.append("")
    lines.append("*This program is generated by Muscle OS AI and should not replace professional medical advice. Stop any exercise that causes pain. Consult a healthcare provider before starting any new fitness or nutrition program.*")
    lines.append("")

    return "\n".join(lines)
