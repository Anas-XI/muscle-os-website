"""Coach Pipeline: new advanced program generation pipeline.

Wires together:
1. Safety triage (existing)
2. Archetype matching (new)
3. Constraint resolution (new)
4. Multi-domain vault RAG (new)
5. Deterministic content generation (existing, enhanced)
6. LLM synthesis layer (new)
7. Section-based draft with citations (new)
"""

import json
import os
import logging
from datetime import datetime
from typing import Optional, List

from mos_bot.config import USERS_DIR, PROGRAMS_DIR, PDFS_DIR
from mos_bot.core.models import (
    ClientProfile, SafetyTriageResult, PillarAssignment,
    ProgramSection, ProgramDraft, ArchetypeMatch, ConstraintGraph,
    Citation, VaultSource, NutritionPlan, ProgramStructure,
)
from mos_bot.core.context_loader import (
    evaluate_ed_screening, run_safety_triage, assign_pillars,
    evaluate_rag_impact,
)
from mos_bot.core.citation_tracker import CitationTracker
from mos_bot.core.archetype_matcher import ArchetypeMatcher
from mos_bot.core.constraint_engine import (
    build_constraint_graph, constraints_to_modifiers,
)
from mos_bot.core.vault_orchestrator import VaultOrchestrator
from mos_bot.core.content_generator import (
    generate_program as build_deterministic_content,
    program_to_markdown,
    generate_pillars_section,
)
from mos_bot.core.book_engine import BookDecisionEngine, BookEngineResult
from mos_bot.core.analytics import track
from mos_bot.core.program_generator import generate_program_pipeline

logger = logging.getLogger(__name__)

DRAFTS_DIR = os.path.join(os.path.dirname(PROGRAMS_DIR), "drafts")
LLM_ENABLED = False  # Will be set if LLM is configured


def _check_llm() -> bool:
    from mos_bot.config import LLM_API_KEY, LLM_API_URL, LLM_MODEL
    return bool(LLM_API_KEY and LLM_API_URL)


def _llm_chat(messages: list, system: str = None) -> Optional[str]:
    from mos_bot.config import LLM_API_KEY, LLM_API_URL, LLM_MODEL
    if not LLM_API_KEY or not LLM_API_URL:
        return None
    import requests as req
    payload = {
        "model": LLM_MODEL or "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": system}] + messages if system else messages,
        "temperature": 0.4,
        "max_tokens": 2048,
        "stream": False,
    }
    try:
        url = f"{LLM_API_URL.rstrip('/')}/chat/completions"
        r = req.post(url, headers={"Authorization": f"Bearer {LLM_API_KEY}"}, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning(f"LLM call failed: {e}")
        return None


SECTIONS_CONFIG = [
    ("profile_summary", "Profile Summary", "assessment", 1),
    ("constraint_analysis", "Constraint Analysis & Conflict Resolution", "safety", 2),
    ("archetype_match", "Archetype Match", "adherence", 3),
    ("pillar_focus", "Pillar Focus & Modifications", "training", 4),
    ("program_overview", "Program Overview", "training", 5),
    ("training_phase1", "Training: Phase 1 — Accumulation & Stability", "training", 6),
    ("training_phase2", "Training: Phase 2 — Intensification & Progressive Overload", "training", 7),
    ("warmup_cooldown", "Warm-Up & Cool-Down Protocol", "training", 8),
    ("nutrition_plan", "Nutrition Plan", "nutrition", 9),
    ("sleep_protocol", "Sleep Protocol", "recovery", 10),
    ("supplements", "Supplement Recommendations", "nutrition", 11),
    ("rehab_prehab", "Rehab & Prehab", "safety", 12),
    ("measurement_kpis", "Measurement KPIs", "adherence", 13),
    ("adjustment_triggers", "Adjustment Triggers", "adherence", 14),
    ("exercise_alternatives", "Exercise Alternatives", "training", 15),
    ("week1_action", "Week 1 Action Plan", "adherence", 16),
    ("vault_decisions", "Vault-Informed Decisions", "training", 17),
    ("vault_sources", "Vault Sources", "training", 18),
]


def generate_coach_draft(user_id: str) -> dict:
    """Full new pipeline: generates a sectioned ProgramDraft for coach review."""
    global LLM_ENABLED
    LLM_ENABLED = _check_llm()

    # 1. Load profile
    profile_path = os.path.join(USERS_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {"error": f"Profile not found: {user_id}"}

    with open(profile_path, "r", encoding="utf-8") as f:
        raw_profile = json.load(f)

    profile = ClientProfile.from_dict(raw_profile)
    client_name = profile.name or user_id

    # 2. Safety triage
    ed_answers = {
        "ED1": raw_profile.get("ED1", "no"),
        "ED2": raw_profile.get("ED2", "no"),
        "ED3": raw_profile.get("ED3", "no"),
        "ED4": raw_profile.get("ED4", "no"),
    }
    ed_result = evaluate_ed_screening(ed_answers)
    triage = run_safety_triage(profile, ed_result)

    if triage.blocked:
        track("coach_pipeline_blocked", {"user_id": user_id, "reason": triage.block_reason})
        return {"error": triage.caution_note, "blocked": True}

    # 3. Archetype matching
    matcher = ArchetypeMatcher()
    archetype = matcher.match(profile)

    # 4. Constraint resolution
    constraint_graph = build_constraint_graph(profile, triage)
    modifiers = constraints_to_modifiers(constraint_graph, triage)

    # 5. Vault context (multi-domain RAG)
    orchestrator = VaultOrchestrator()
    domain_context = orchestrator.build_multi_domain_context(profile)
    all_sources = orchestrator.all_domain_sources(domain_context)
    all_citations = orchestrator.all_domain_citations(domain_context)

    # 6. Extract vault signals + assign pillars
    from mos_bot.core.context_loader import _extract_vault_signals
    vault_signals = _extract_vault_signals(all_sources, profile)

    # Override modifiers with constraint engine output
    triage.modifiers = list(set(triage.modifiers + modifiers))
    pillars = assign_pillars(profile, triage, vault_signals)

    # 7. Book Decision Engine
    book_engine = BookDecisionEngine()
    book_result = book_engine.apply(profile, pillars, triage)
    pillars.modifications.extend(book_result.extra_modifiers)

    # 8. Deterministic content generation
    pc = build_deterministic_content(profile, triage, pillars, all_sources, "", book_result, vault_signals)
    full_markdown = program_to_markdown(pc)

    # 9. Build sections
    sections = _build_sections(
        profile, triage, pillars, pc, archetype, constraint_graph,
        all_sources, all_citations, book_result, vault_signals,
    )

    # 10. LLM synthesis (optional — enriches sections if available)
    if LLM_ENABLED:
        sections = _enrich_with_llm(sections, profile, archetype, constraint_graph)

    # 11. Build draft
    draft_id = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    draft = ProgramDraft(
        draft_id=draft_id,
        user_id=user_id,
        client_name=client_name,
        sections=sections,
        archetype=archetype,
        constraint_graph=constraint_graph,
        vault_sources_full=all_sources,
        triage=triage,
        pillars=pillars,
        nutrition=pc.nutrition,
        program=pc.program,
    )

    # 12. Save draft
    os.makedirs(DRAFTS_DIR, exist_ok=True)
    draft_path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
    with open(draft_path, "w", encoding="utf-8") as f:
        json.dump(draft.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

    track("coach_draft_generated", {"user_id": user_id, "draft_id": draft_id})

    return {"draft": draft.model_dump(mode="json"), "draft_path": draft_path}


def _build_sections(profile, triage, pillars, pc, archetype, constraint_graph,
                    all_sources, all_citations, book_result, vault_signals) -> List[ProgramSection]:
    sections = []
    tracker = CitationTracker()

    for section_id, title, domain, order in SECTIONS_CONFIG:
        content, citations = _generate_section_content(
            section_id, profile, triage, pillars, pc,
            archetype, constraint_graph, all_sources, all_citations,
            book_result, vault_signals, tracker,
        )
        sections.append(ProgramSection(
            section_id=section_id,
            title=title,
            content=content,
            citations=citations,
            status="pending" if section_id not in ("profile_summary", "vault_sources") else "approved",
            original_content=content,
            order=order,
            domain=domain,
        ))

    return sections


def _generate_section_content(section_id, profile, triage, pillars, pc,
                               archetype, constraint_graph, all_sources,
                               all_citations, book_result, vault_signals,
                               tracker) -> tuple:
    from mos_bot.core.content_generator import _goal_label, _experience_label, _bmi, _calc_bmr, _calc_tdee, _split_label, _training_days_label

    if section_id == "profile_summary":
        bmi_val = _bmi(profile)
        content = f"""**Client:** {profile.name}
**Goal:** {_goal_label(profile.goal)}
**Stats:** {profile.sex.title()}, {profile.age} yrs, {profile.height_cm}cm, {profile.bodyweight_kg}kg (BMI ~{bmi_val})
**Experience:** {profile.experience_years} years ({_experience_label(profile.experience_years)})
**Training:** {_training_days_label(profile.training_days)}/week, {profile.session_length_min}min sessions
**Sleep:** {profile.sleep_hours}h | **Stress:** {profile.stress_level}/10 | **Steps:** {profile.daily_steps}
**Injuries:** {', '.join(profile.injuries) if profile.injuries else 'None'}
**Gut Health:** {profile.gut_health} | **Medical:** {', '.join(profile.medical) if profile.medical else 'None'}
**Work Schedule:** {profile.work_schedule if profile.work_schedule else 'Standard'}
**Alcohol:** {profile.alcohol_weekly}/week | **Supplements:** {', '.join(profile.supplements) if profile.supplements else 'None'}
**Triage:** {triage.triage.upper()} | **Last Bloodwork:** {profile.last_bloodwork if profile.last_bloodwork else 'Unknown'}"""
        return content, []

    if section_id == "constraint_analysis":
        lines = []
        for node in constraint_graph.nodes:
            icon = {"critical": "CRITICAL", "high": "HIGH", "medium": "MEDIUM", "low": "LOW"}.get(node.severity, "INFO")
            lines.append(f"- **{icon} [{node.category.upper()}]:** {node.description}")
            if node.resolution:
                lines.append(f"  → {node.resolution}")
        lines.append("")
        lines.append("**Resolution Priority:** Safety > Medical > Injury > Recovery > Nutrition > Training > Adherence > Psychological > Lifestyle")
        content = "\n".join(lines)
        citations = [Citation(vault_path=c.vault_path, vault_title=c.vault_title, decision_id=section_id)
                     for c in all_citations if c.decision_id == "safety"][:5]
        tracker.from_vault_sources(section_id, all_sources[:3])
        return content, citations

    if section_id == "archetype_match":
        if archetype:
            content = f"""**Matched Archetype:** {archetype.archetype_name}

**Match Score:** {archetype.match_score:.0%}

**Reasons for match:**
""" + "\n".join(f"- {r}" for r in archetype.match_reasons)

            if archetype.archetype_snippets:
                content += "\n\n**Archetype Guidance:**\n"
                for s in archetype.archetype_snippets:
                    content += f"\n> {s[:200]}"
        else:
            content = "No vault archetype matched — program built from scratch."
        return content, [Citation(vault_path=archetype.archetype_path, vault_title=archetype.archetype_name, decision_id=section_id)] if archetype else []

    if section_id == "pillar_focus":
        content = generate_pillars_section(pillars)
        return content, []

    if section_id == "program_overview":
        goal_label = _goal_label(profile.goal)
        split_name = pc.program.split if pc.program else _split_label(profile.current_split) if profile.current_split else "Full Body"
        content = f"""**Protocol Focus:** {goal_label}-focused programming with {_experience_label(profile.experience_years)}-appropriate volume landmarks.
**Training Split:** {split_name}
**Schedule:** {profile.training_days}x/week, {profile.session_length_min}min sessions
**Phasing:** Two-phase approach
  - Phase 1 (Weeks 1-4): Accumulation & Movement Quality
  - Phase 2 (Weeks 5+): Intensification & Progressive Overload"""
        if book_result and book_result.vault_insights:
            content += f"\n\n**Evidence Base:** Informed by {len(book_result.vault_insights)} decision rules from Muscle OS knowledge vault."
        return content, []

    if section_id in ("training_phase1", "training_phase2"):
        phase_num = 1 if section_id == "training_phase1" else 2
        if pc.program and pc.program.phases and len(pc.program.phases) >= phase_num:
            phase = pc.program.phases[phase_num - 1]
            lines = [f"**Duration:** {phase.duration}", f"**Goal:** {phase.goal}", ""]
            for session in phase.sessions:
                lines.append(f"### {session.day}: {session.focus}")
                lines.append("| Exercise | Sets | Reps | RIR | Notes |")
                lines.append("|---|---|---|---|---|")
                for ex in session.exercises:
                    lines.append(f"| {ex.name} | {ex.sets} | {ex.reps} | {ex.rir} | {ex.notes} |")
                lines.append("")
            if phase.progression_notes:
                lines.append(f"**Progression:** {phase.progression_notes}")
            content = "\n".join(lines)
        else:
            content = "Phase content will be generated upon profile availability."
        return content, []

    if section_id == "warmup_cooldown":
        if pc.program:
            content = f"### Warm-Up Protocol\n{pc.program.warm_up_protocol}\n\n### Cool-Down Protocol\n{pc.program.cool_down_protocol}"
        else:
            content = "Warm-up: 5min incline walk + dynamic stretching\nCool-down: 5min light cardio + static stretching"
        return content, []

    if section_id == "nutrition_plan":
        n = pc.nutrition
        bmr_val = _calc_bmr(profile)
        tdee_val = _calc_tdee(bmr_val, profile)
        content = f"""**BMR:** {bmr_val} kcal/day | **TDEE:** {tdee_val} kcal/day

| Target | Value |
|---|---|
| **Calories** | {n.calories_target} kcal |
| **Protein** | {n.protein_g}g ({n.protein_per_kg}g/kg) |
| **Carbs** | {n.carbs_g}g |
| **Fat** | {n.fat_g}g |
| **Hydration** | {n.hydration_target_l}L |

**Meal Timing:** {n.meal_timing_notes}"""
        if n.special_notes:
            content += f"\n\n**Special Notes:** {n.special_notes}"
        return content, []

    if section_id == "sleep_protocol":
        sleep_h = profile.sleep_hours
        content = ""
        if sleep_h < 6.5:
            content += "**Sleep is the current bottleneck.** Prioritize minimum 7h target before making other changes.\n\n"
        content += """- Target: 7.5-8h consistent bedtime ±30min
- Morning light exposure: 10min outdoor light within 30min of waking
- Screen curfew: No screens 60min pre-bed
- Room temp: 17-19°C
- Pre-bed: 30-40g casein + 200mg magnesium glycinate
- No alcohol within 3h of bedtime"""
        if profile.work_schedule in ("night", "rotating", "early"):
            content += "\n\n**Shift Worker:** Anchor sleep to same 4h window regardless of shift. Blackout curtains. Caffeine max 4h before shift end."
        return content, []

    if section_id == "supplements":
        content = """| Supplement | Dose | Timing | Evidence |
|---|---|---|---|---|
| **Protein Powder** | To meet daily target | Post-training + before bed | Strong |
| **Creatine Monohydrate** | 5g daily | Any time, consistent | Strong |
| **Vitamin D3 + K2** | 2000-4000 IU | With largest meal | Strong if deficient |
| **Omega-3 (EPA+DHA)** | 3g total | With meals | Strong |
| **Magnesium Glycinate** | 200mg | Pre-bed | Moderate for sleep |"""
        if profile.gut_health != "none":
            content += "\n\n**Gut Health:** Consider probiotic (10-20B CFU) + fiber progression (5g/week to 35-40g)."
        return content, []

    if section_id == "rehab_prehab":
        content = ""
        if profile.injuries:
            for inj in profile.injuries:
                il = inj.lower()
                if "rotator" in il or "shoulder" in il:
                    content += "**Shoulder:** Neutral grip pressing, face pulls, external rotation, YTWs. No behind-neck.\n\n"
                elif "knee" in il:
                    content += "**Knee:** Controlled tempo, no ballistic flexion. Monitor patellar tracking.\n\n"
                elif "back" in il:
                    content += "**Back:** Brace core, no spinal flexion under load. Bird-dog, dead bug.\n\n"
        else:
            content = """- **Shoulder Health:** Face pulls 3x15-20, 3x/week
- **Core Stability:** Plank variations 3x45s, 3x/week
- **Hip Mobility:** World's Greatest Stretch, 3x/side before training
- **Posture:** Thoracic extensions, 10 reps, 2x/day"""
        return content, []

    if section_id == "measurement_kpis":
        content = """| KPI | Frequency | Threshold | Action |
|---|---|---|---|---|
| **Weight Trend** | Daily (7-day avg) | >2% change/2wk | Adjust calories |
| **Top Set Performance** | Every session | Decline 3+ weeks | Deload or check sleep |
| **Waist** | Monthly | No change 6+ weeks | Reassess |
| **Training Volume** | Weekly | Below MEV 2 weeks | Add sets |
| **Readiness** | Pre-session | <6 consistently | Check recovery |"""
        if profile.goal in ("fat_loss", "cut"):
            content += "\n\n| **Adherence** | Weekly | <80% for 2 weeks | Simplify protocol |"
        return content, []

    if section_id == "adjustment_triggers":
        content = """| Symptom | Action |
|---|---|---|
| Strength declining 3+ weeks | Deload (50% volume, maintain load) |
| Weight not changing 4+ weeks | Adjust calories ±200 kcal, wait 2 weeks |
| Sleep <6.5h consistently | Prioritize sleep before training changes |
| Stress >7/10 for 2+ weeks | Reduce volume 30%, maintain protein |
| Joint pain during exercise | Stop, substitute alternative |
| Missed 2+ sessions in a row | MEC: 2x full-body, protein 1.6g/kg, 6.5h sleep |"""
        return content, []

    if section_id == "exercise_alternatives":
        content = """| Primary | Alternative A | Alternative B |
|---|---|---|
| Barbell Back Squat | Goblet Squat | Leg Press |
| Barbell Bench Press | Dumbbell Bench Press | Machine Chest Press |
| Conventional Deadlift | Trap Bar Deadlift | Dumbbell RDL |
| Pull-Up | Lat Pulldown | Seated Cable Row |
| Overhead Press (Barbell) | Dumbbell Shoulder Press | Machine Shoulder Press |
| Barbell Row | Chest Supported Row | Single-Arm DB Row |"""
        return content, []

    if section_id == "week1_action":
        content = f"""- [ ] Complete first training session using the program
- [ ] Track daily protein intake (target: 4-5 meals at ~30g protein each)
- [ ] Sleep target: {min(8, int(profile.sleep_hours + 0.5))}h, consistent bedtime
- [ ] Hydration: {pc.nutrition.hydration_target_l if pc.nutrition else 2.5}L water minimum
- [ ] 10min daily morning walk for light exposure"""
        return content, []

    if section_id == "vault_decisions":
        content = ""
        if book_result and book_result.vault_insights:
            vault_insights = list(dict.fromkeys(book_result.vault_insights))
            content += "The following evidence-based insights influenced this program:\n\n"
            for insight in vault_insights:
                content += f"- {insight}\n"
        if vault_signals and vault_signals.vault_top_snippets:
            content += "\n**Key vault references:**\n"
            for s in vault_signals.vault_top_snippets:
                content += f"- {s[:200]}\n"
        if not content:
            content = "No vault context was available during generation."
        return content, []

    if section_id == "vault_sources":
        if all_sources:
            grouped = {}
            for vs in all_sources:
                key = vs.pillar or "General"
                grouped.setdefault(key, []).append(vs)
            content = ""
            for pillar_name in sorted(grouped.keys()):
                content += f"**{pillar_name}**\n"
                for vs in grouped[pillar_name]:
                    path_display = vs.path.replace("\\", "/").replace(".md", "")
                    content += f"- [{vs.title}](vault://{path_display}) (relevance: {vs.score:.2f})\n"
                content += "\n"
        else:
            content = "*Vault context was not available during generation.*"
        return content, []

    return "", []


def _enrich_with_llm(sections: List[ProgramSection], profile: ClientProfile,
                     archetype: Optional[ArchetypeMatch],
                     constraint_graph: Optional[ConstraintGraph]) -> List[ProgramSection]:
    """Attempts LLM enrichment for narrative sections."""

    profile_summary = _build_llm_profile_summary(profile)
    constraint_summary = _build_llm_constraint_summary(constraint_graph)

    enrichable = {
        "constraint_analysis": f"Based on this client profile:\n{profile_summary}\n\nWith these constraints:\n{constraint_summary}\n\nWrite a 2-3 sentence narrative explaining the key constraints and how they interact. Focus on the most important 2-3 constraints.",
        "archetype_match": f"Based on this client:\n{profile_summary}\n\nTheir matched archetype is '{archetype.archetype_name if archetype else 'None'}'. Write 2-3 sentences explaining what this means for their coaching approach.",
        "pillar_focus": f"Based on this client:\n{profile_summary}\n\nWrite 2-3 sentences explaining which pillars are most important and why, given their specific profile.",
        "program_overview": f"Based on this client:\n{profile_summary}\n\nWrite 2-3 sentences explaining the overall program strategy for this specific client.",
        "rehab_prehab": f"Based on these client details:\nprofile: {profile_summary}\n\nWrite 2-3 sentences of targeted prehab/rehab advice.",
    }

    for section in sections:
        if section.section_id in enrichable:
            try:
                enriched = _llm_chat(
                    [{"role": "user", "content": enrichable[section.section_id]}],
                    system="You are Muscle OS Coach, an expert fitness coach. Provide concise, specific advice in 2-3 sentences. Do not use generic advice."
                )
                if enriched:
                    section.content = section.content + "\n\n**Coach Note:** " + enriched.strip()
                    if section.status == "pending":
                        pass  # Keep pending for coach review
            except Exception:
                pass  # Fall through to deterministic content

    return sections


def _build_llm_profile_summary(profile: ClientProfile) -> str:
    parts = [
        f"Name: {profile.name}",
        f"Goal: {profile.goal}",
        f"Situation: {profile.situation}",
        f"Age: {profile.age}, Sex: {profile.sex}",
        f"Weight: {profile.bodyweight_kg}kg, Height: {profile.height_cm}cm",
        f"Experience: {profile.experience_years} years",
        f"Training: {profile.training_days}x/week, {profile.session_length_min}min",
        f"Sleep: {profile.sleep_hours}h, Stress: {profile.stress_level}/10",
        f"Injuries: {profile.injuries}",
        f"Medical: {profile.medical}",
        f"Gut Health: {profile.gut_health}",
        f"Work Schedule: {profile.work_schedule}",
        f"Alcohol: {profile.alcohol_weekly}/week",
        f"Mental Health: {profile.mental_health_concern}",
    ]
    return "\n".join(parts)


def _build_llm_constraint_summary(graph: Optional[ConstraintGraph]) -> str:
    if not graph:
        return "No constraints identified."
    lines = []
    for node in graph.nodes:
        lines.append(f"[{node.severity.upper()}] {node.category}: {node.description}")
        if node.resolution:
            lines.append(f"  -> {node.resolution}")
    return "\n".join(lines)


def load_draft(draft_id: str) -> Optional[dict]:
    path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def update_section(draft_id: str, section_id: str, content: str = None, status: str = None, editor_notes: str = None) -> bool:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return False

    timestamp = datetime.now().isoformat()
    if "version_history" not in draft_data:
        draft_data["version_history"] = []

    for section in draft_data["sections"]:
        if section["section_id"] == section_id:
            if content is not None and content != section.get("content"):
                draft_data["version_history"].append({
                    "section_id": section_id,
                    "previous_content": section.get("content", ""),
                    "new_content": content,
                    "previous_status": section.get("status", "pending"),
                    "timestamp": timestamp,
                })
                section["content"] = content
            if status:
                section["previous_status"] = section.get("status", "pending")
                section["status"] = status
                section["status_changed_at"] = timestamp
            if editor_notes is not None:
                section["editor_notes"] = editor_notes
            break

    draft_data["updated_at"] = timestamp
    os.makedirs(DRAFTS_DIR, exist_ok=True)
    path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, indent=2, ensure_ascii=False)
    return True


def approve_section(draft_id: str, section_id: str) -> bool:
    return update_section(draft_id, section_id, status="approved")


def reject_section(draft_id: str, section_id: str, reason: str = "") -> bool:
    success = update_section(draft_id, section_id, status="rejected")
    if success and reason:
        data = load_draft(draft_id)
        for s in data["sections"]:
            if s["section_id"] == section_id:
                s["rejection_reason"] = reason
                break
        path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    return success


def add_note(draft_id: str, author: str, text: str) -> dict:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return {"error": "Draft not found"}
    if "notes" not in draft_data:
        draft_data["notes"] = []
    note = {
        "author": author,
        "text": text,
        "timestamp": datetime.now().isoformat(),
    }
    draft_data["notes"].append(note)
    draft_data["updated_at"] = note["timestamp"]
    path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, indent=2, ensure_ascii=False)
    return note


def get_safety_flags(draft_id: str) -> list:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return []
    flags = []
    for section in draft_data.get("sections", []):
        content = (section.get("content") or "").lower()
        section_flags = []
        safety_patterns = {
            "injury_risk": ["contraindication", "avoid", "caution", "modify", "alternative"],
            "medical_clearance": ["consult", "clearance", "medical", "physician"],
            "ed_concern": ["edscreening", "disordered", "restrictive", "compensatory"],
            "intensity_warning": ["rpe cap", "max effort", "limit", "deload required"],
        }
        for flag_type, patterns in safety_patterns.items():
            if any(p in content for p in patterns):
                section_flags.append(flag_type)
        if section_flags:
            flags.append({
                "section_id": section["section_id"],
                "section_title": section.get("title", ""),
                "flags": section_flags,
                "severity": "high" if any(f in ["injury_risk", "medical_clearance"] for f in section_flags) else "medium",
            })
    return flags


def get_draft_stats() -> dict:
    drafts = list_drafts()
    total = len(drafts)
    pending_review = sum(1 for d in drafts if d["approved_count"] < d["section_count"])
    fully_approved = sum(1 for d in drafts if d["approved_count"] == d["section_count"] and d["status"] != "exported")
    exported = sum(1 for d in drafts if d["status"] == "exported")
    all_sections = sum(d["section_count"] for d in drafts)
    all_approved = sum(d["approved_count"] for d in drafts)

    safety_flags = []
    for d in drafts:
        flags = get_safety_flags(d["draft_id"])
        if flags:
            safety_flags.append({"draft_id": d["draft_id"], "client_name": d["client_name"], "flags": flags})

    return {
        "total_drafts": total,
        "pending_review": pending_review,
        "fully_approved": fully_approved,
        "exported": exported,
        "total_sections": all_sections,
        "approved_sections": all_approved,
        "approval_rate": round(all_approved / all_sections * 100, 1) if all_sections else 0,
        "safety_flags_count": len(safety_flags),
        "safety_flags": safety_flags,
    }


def bulk_action(draft_id: str, action: str) -> bool:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return False
    if action == "approve_all":
        for section in draft_data["sections"]:
            if section.get("status") not in ("approved",):
                update_section(draft_id, section["section_id"], status="approved")
        return True
    elif action == "reject_all":
        for section in draft_data["sections"]:
            if section.get("status") != "rejected":
                update_section(draft_id, section["section_id"], status="rejected")
        return True
    elif action == "reset_all":
        for section in draft_data["sections"]:
            section["status"] = "pending"
            section.pop("status_changed_at", None)
            section.pop("rejection_reason", None)
        path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(draft_data, f, indent=2, ensure_ascii=False)
        return True
    return False


def get_version_history(draft_id: str, section_id: str = None) -> list:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return []
    history = draft_data.get("version_history", [])
    if section_id:
        history = [h for h in history if h["section_id"] == section_id]
    return history


def list_drafts() -> List[dict]:
    if not os.path.isdir(DRAFTS_DIR):
        return []
    drafts = []
    for fname in sorted(os.listdir(DRAFTS_DIR), reverse=True):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(DRAFTS_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            drafts.append({
                "draft_id": data.get("draft_id", fname.replace(".json", "")),
                "user_id": data.get("user_id", ""),
                "client_name": data.get("client_name", ""),
                "status": data.get("status", "draft"),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", ""),
                "section_count": len(data.get("sections", [])),
                "approved_count": sum(1 for s in data.get("sections", []) if s.get("status") == "approved"),
            })
        except Exception as e:
            logger.warning(f"Failed to read draft {fname}: {e}")
    return drafts


def export_approved_draft(draft_id: str) -> Optional[str]:
    draft_data = load_draft(draft_id)
    if not draft_data:
        return None

    draft = ProgramDraft(**draft_data)
    if not draft.all_approved():
        return None

    from mos_bot.core.pdf_renderer import generate_coach_pdf

    lines = []
    for section in sorted(draft.sections, key=lambda s: s.order):
        lines.append(f"## {section.order}. {section.title}")
        lines.append("")
        if section.content:
            lines.append(section.content)
        lines.append("")
        if section.citations:
            lines.append("*Informed by:*")
            for c in section.citations:
                lines.append(f"  - [{c.vault_title}](vault://{c.vault_path})")
            lines.append("")

    markdown = "\n".join(lines)
    user_id = draft.user_id
    client_name = draft.client_name or user_id

    safety_flags = get_safety_flags(draft_id)
    coach_name = draft_data.get("coach_name", "")
    goal = draft_data.get("goal", "")

    pdf_path = generate_coach_pdf(
        markdown, f"{user_id}_coach_approved", client_name,
        goal=goal, coach_name=coach_name, safety_flags=safety_flags,
    )

    if pdf_path:
        from mos_bot.core.pdf_renderer import _add_watermark as _add_wm
        _add_wm(pdf_path, "COACH APPROVED", color=(0.15, 0.77, 0.37))
        draft.status = "exported"
        draft.exported_at = datetime.now().isoformat()
        draft.export_path = pdf_path
        path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(draft.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

        track("coach_draft_exported", {
            "user_id": user_id,
            "draft_id": draft_id,
            "pdf_path": pdf_path,
        })

    return pdf_path