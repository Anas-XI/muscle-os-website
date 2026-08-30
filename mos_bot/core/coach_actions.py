"""AI Coach Action Dispatcher & Program/Diet Mutation Engine.

Empowers the AI Coach to dynamically modify, add, or remove exercises,
alter workout splits, adjust macronutrient and caloric targets, and apply
biomechanical injury overrides directly to the active program, workout tracker, and profile.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from mos_bot.config import USERS_DIR, PROGRAMS_DIR, TRACKERS_DIR, DATA_ROOT
from mos_bot.core.models import (
    ProgramContent, ProgramStructure, Phase, Session, Exercise, NutritionPlan, ClientProfile
)
from mos_bot.core.content_generator import program_to_markdown
from mos_bot.core.tracker_renderer import generate_tracker_file
from mos_bot.core.intake_builder import load_profile, save_profile
from mos_bot.core.biomechanics_engine import suggest_exercise_substitutions

logger = logging.getLogger("mos_coach_actions")


def _get_programs_json_path(user_id: str) -> Path:
    json_dir = Path(DATA_ROOT) / "programs_json"
    json_dir.mkdir(parents=True, exist_ok=True)
    return json_dir / f"{user_id}_program.json"


def _get_modifications_log_path(user_id: str) -> Path:
    log_dir = Path(DATA_ROOT) / "modifications"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / f"{user_id}_modifications.json"


def load_active_program_content(user_id: str) -> Optional[ProgramContent]:
    """Load existing ProgramContent model from stored JSON."""
    json_path = _get_programs_json_path(user_id)
    if json_path.exists():
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
            return ProgramContent.model_validate(data)
        except Exception as e:
            logger.warning(f"Failed to load ProgramContent from {json_path}: {e}")

    # Fallback: synthesize minimal ProgramContent from profile
    raw_p = load_profile(user_id)
    if raw_p:
        try:
            profile = ClientProfile.from_dict(raw_p)
            return ProgramContent(
                client=profile,
                program=ProgramStructure(split=profile.current_split or "PPL", phases=[
                    Phase(name="Accumulation Phase", duration="4 Weeks", goal=profile.goal or "Hypertrophy", sessions=[
                        Session(day="Day 1", focus="Push", exercises=[
                            Exercise(name="Barbell Bench Press", sets=3, reps="8-10", rir="2", notes="Primary compound push"),
                            Exercise(name="Incline DB Press", sets=3, reps="10-12", rir="2", notes="Upper chest focus"),
                            Exercise(name="Tricep Pushdown", sets=3, reps="12-15", rir="1", notes="Tricep isolation"),
                        ]),
                        Session(day="Day 2", focus="Pull", exercises=[
                            Exercise(name="Barbell Bent-Over Row", sets=3, reps="8-10", rir="2", notes="Primary compound pull"),
                            Exercise(name="Lat Pulldown", sets=3, reps="10-12", rir="2", notes="Lat focus"),
                            Exercise(name="Bicep Curl", sets=3, reps="12-15", rir="1", notes="Bicep isolation"),
                        ]),
                        Session(day="Day 3", focus="Legs", exercises=[
                            Exercise(name="Barbell Back Squat", sets=3, reps="6-8", rir="2", notes="Primary compound quad"),
                            Exercise(name="Romanian Deadlift", sets=3, reps="8-10", rir="2", notes="Hamstring hinge"),
                            Exercise(name="Standing Calf Raise", sets=4, reps="12-15", rir="1", notes="Calf focus"),
                        ]),
                    ])
                ]),
                nutrition=NutritionPlan(calories_target=2500, protein_g=160, carbs_g=300, fat_g=70, hydration_target_l=3.0)
            )
        except Exception as e:
            logger.error(f"Fallback synthesis failed: {e}")
    return None


def save_active_program_content(user_id: str, pc: ProgramContent, action_description: str = "") -> Dict[str, Any]:
    """Persist modified ProgramContent to JSON, Markdown, and Tracker HTML."""
    json_path = _get_programs_json_path(user_id)
    pc_dict = pc.model_dump(mode="json")
    pc_dict["last_modified"] = datetime.now().isoformat()
    json_path.write_text(json.dumps(pc_dict, indent=2, ensure_ascii=False), encoding="utf-8")

    # Render and save Markdown
    programs_dir = Path(PROGRAMS_DIR)
    programs_dir.mkdir(parents=True, exist_ok=True)
    md_path = programs_dir / f"{user_id}_program.md"
    markdown = program_to_markdown(pc)
    md_path.write_text(markdown, encoding="utf-8")

    # Render and save Tracker HTML
    tracker_path = generate_tracker_file(pc, user_id)

    # Append to modification audit log
    log_path = _get_modifications_log_path(user_id)
    history = []
    if log_path.exists():
        try:
            history = json.loads(log_path.read_text(encoding="utf-8"))
        except Exception:
            history = []
    
    history.append({
        "timestamp": datetime.now().isoformat(),
        "action": action_description,
        "summary": f"Program & Tracker updated for {user_id}"
    })
    log_path.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")

    return {
        "success": True,
        "json_path": str(json_path),
        "markdown_path": str(md_path),
        "tracker_path": str(tracker_path) if tracker_path else None,
        "action": action_description,
    }


def execute_coach_action(user_id: str, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Dispatch and execute AI Coach mutations on the active training/diet program."""
    clean_id = user_id.strip()
    pc = load_active_program_content(clean_id)
    if not pc:
        return {"success": False, "error": f"No active program found for user {clean_id}"}

    action = action_name.lower().strip()

    # ── 1. SWAP EXERCISE ──
    if action == "swap_exercise":
        old_ex = params.get("old_exercise", "").lower()
        new_ex = params.get("new_exercise", "").strip()
        reason = params.get("reason", "Coach requested substitution")
        new_sets = params.get("sets")
        new_reps = params.get("reps")
        new_rir = params.get("rir")
        target_day = params.get("session_day", "").lower()

        swapped = 0
        for phase in pc.program.phases:
            for session in phase.sessions:
                if target_day and target_day not in session.day.lower() and target_day not in session.focus.lower():
                    continue
                for ex in session.exercises:
                    if old_ex in ex.name.lower() or ex.name.lower() in old_ex:
                        ex.name = new_ex
                        if new_sets: ex.sets = int(new_sets)
                        if new_reps: ex.reps = str(new_reps)
                        if new_rir: ex.rir = str(new_rir)
                        ex.notes = f"{ex.notes} | Substituted: {reason}".strip(" |")
                        swapped += 1

        if swapped == 0:
            return {"success": False, "error": f"Exercise '{params.get('old_exercise')}' not found in active program."}

        res = save_active_program_content(clean_id, pc, f"Swapped '{params.get('old_exercise')}' with '{new_ex}' ({reason})")
        res["swapped_count"] = swapped
        res["new_exercise"] = new_ex
        return res

    # ── 2. ADD EXERCISE ──
    elif action == "add_exercise":
        ex_name = params.get("exercise_name", "").strip()
        day_target = params.get("session_day", "Day 1").lower()
        sets = int(params.get("sets", 3))
        reps = str(params.get("reps", "10-12"))
        rir = str(params.get("rir", "2"))
        notes = params.get("notes", "Added by AI Coach")

        added = False
        for phase in pc.program.phases:
            for session in phase.sessions:
                if day_target in session.day.lower() or day_target in session.focus.lower():
                    session.exercises.append(Exercise(
                        name=ex_name,
                        sets=sets,
                        reps=reps,
                        rir=rir,
                        notes=notes,
                    ))
                    added = True
                    break
            if added: break

        if not added and pc.program.phases and pc.program.phases[0].sessions:
            # Fallback to first session
            pc.program.phases[0].sessions[0].exercises.append(Exercise(
                name=ex_name,
                sets=sets,
                reps=reps,
                rir=rir,
                notes=notes,
            ))
            added = True

        res = save_active_program_content(clean_id, pc, f"Added exercise '{ex_name}' to {params.get('session_day', 'workout')}")
        res["added_exercise"] = ex_name
        return res

    # ── 3. REMOVE EXERCISE ──
    elif action == "remove_exercise":
        ex_target = params.get("exercise_name", "").lower().strip()
        day_target = params.get("session_day", "").lower()

        removed = 0
        for phase in pc.program.phases:
            for session in phase.sessions:
                if day_target and day_target not in session.day.lower() and day_target not in session.focus.lower():
                    continue
                initial_len = len(session.exercises)
                session.exercises = [e for e in session.exercises if ex_target not in e.name.lower() and e.name.lower() not in ex_target]
                removed += (initial_len - len(session.exercises))

        if removed == 0:
            return {"success": False, "error": f"Exercise '{params.get('exercise_name')}' not found to remove."}

        res = save_active_program_content(clean_id, pc, f"Removed exercise '{params.get('exercise_name')}'")
        res["removed_count"] = removed
        return res

    # ── 4. MODIFY EXERCISE (SETS/REPS/RIR) ──
    elif action == "modify_exercise":
        ex_target = params.get("exercise_name", "").lower().strip()
        modified = 0
        for phase in pc.program.phases:
            for session in phase.sessions:
                for ex in session.exercises:
                    if ex_target in ex.name.lower() or ex.name.lower() in ex_target:
                        if "sets" in params: ex.sets = int(params["sets"])
                        if "reps" in params: ex.reps = str(params["reps"])
                        if "rir" in params: ex.rir = str(params["rir"])
                        if "notes" in params: ex.notes = str(params["notes"])
                        modified += 1

        if modified == 0:
            return {"success": False, "error": f"Exercise '{params.get('exercise_name')}' not found to modify."}

        res = save_active_program_content(clean_id, pc, f"Modified parameters for '{params.get('exercise_name')}'")
        res["modified_count"] = modified
        return res

    # ── 5. UPDATE NUTRITION PLAN ──
    elif action == "update_nutrition_plan":
        cal = params.get("calories_target") or params.get("calories")
        p = params.get("protein_g") or params.get("protein")
        c = params.get("carbs_g") or params.get("carbs")
        f = params.get("fat_g") or params.get("fat")
        hyd = params.get("hydration_target_l")
        notes = params.get("meal_timing_notes") or params.get("notes")

        if cal: pc.nutrition.calories_target = int(cal)
        if p: pc.nutrition.protein_g = int(p)
        if c: pc.nutrition.carbs_g = int(c)
        if f: pc.nutrition.fat_g = int(f)
        if hyd: pc.nutrition.hydration_target_l = float(hyd)
        if notes: pc.nutrition.meal_timing_notes = str(notes)

        res = save_active_program_content(
            clean_id, pc,
            f"Updated nutrition targets: {pc.nutrition.calories_target} kcal | {pc.nutrition.protein_g}P / {pc.nutrition.carbs_g}C / {pc.nutrition.fat_g}F"
        )
        res["nutrition"] = pc.nutrition.model_dump()
        return res

    # ── 6. LOG INJURY AND AUTO-OVERRIDE ──
    elif action == "log_injury_and_override":
        injury = params.get("injury_name", "").strip()
        if not injury:
            return {"success": False, "error": "Injury name required."}

        # Update profile
        raw_p = load_profile(clean_id) or {"user_id": clean_id, "name": clean_id}
        injuries = raw_p.get("injuries", [])
        if injury not in injuries:
            injuries.append(injury)
            raw_p["injuries"] = injuries
            save_profile(raw_p)

        # Apply biomechanical substitutions across active program
        applied_subs = []
        for phase in pc.program.phases:
            for session in phase.sessions:
                for ex in session.exercises:
                    subs = suggest_exercise_substitutions(ex.name, [injury])
                    if subs:
                        old_name = ex.name
                        ex.name = subs[0].substitute_exercise
                        ex.notes = f"{ex.notes} | Replaced for {injury}: {subs[0].rationale}".strip(" |")
                        applied_subs.append(f"{old_name} -> {ex.name}")

        res = save_active_program_content(clean_id, pc, f"Logged injury '{injury}' and substituted {len(applied_subs)} exercises")
        res["injury"] = injury
        res["applied_substitutions"] = applied_subs
        return res

    else:
        return {"success": False, "error": f"Unknown action: {action_name}"}


def get_program_modifications(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve history of program and diet mutations made by the AI Coach."""
    log_path = _get_modifications_log_path(user_id)
    if log_path.exists():
        try:
            return json.loads(log_path.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []
