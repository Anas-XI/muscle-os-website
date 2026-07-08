"""Context Loader: ED screening → Safety Triage → Pillar Assignment → Vault Context Retrieval"""

import logging
from typing import List, Tuple
from mos_bot.core.models import ClientProfile, SafetyTriageResult, PillarAssignment, VaultSource
logger = logging.getLogger(__name__)


def evaluate_ed_screening(answers: dict) -> Tuple[str, List[str]]:
    ed1 = str(answers.get("ED1", "no")).lower() == "yes"
    ed2 = str(answers.get("ED2", "no")).lower() == "yes"
    ed3 = str(answers.get("ED3", "no")).lower() == "yes"
    ed4 = str(answers.get("ED4", "no")).lower() == "yes"

    items = []
    if ed1: items.append("binge_episodes")
    if ed2: items.append("compensatory_behavior")
    if ed3: items.append("diagnosed_ed")
    if ed4: items.append("guilt_after_eating")

    if ed3: return "red", items
    if ed1 and ed2: return "red", items
    if sum([ed1, ed2, ed4]) >= 2: return "yellow", items
    if ed4: return "yellow", items
    return "green", items


CRISIS_RESOURCES = {
    "default": (
        "\u2022 Find a Helpline (global): https://findahelpline.com\n"
        "\u2022 Crisis Text Line: Text HOME to 741741\n"
        "\u2022 International Association for Suicide Prevention: "
        "https://iasp.info/resources/Crisis_Centres/\n"
    ),
    "US": (
        "\u2022 988 Suicide & Crisis Lifeline: Call or text 988\n"
        "\u2022 Crisis Text Line: Text HOME to 741741\n"
        "\u2022 SAMHSA Helpline: 1-800-662-4357\n"
    ),
    "UK": (
        "\u2022 Samaritans: Call 116 123\n"
        "\u2022 Mind Infoline: 0300 123 3393\n"
    ),
    "MENA": (
        "\u2022 Find a Helpline (MENA): https://findahelpline.com/regions/middle-east\n"
        "\u2022 Beirut: Embrace Lifeline 1564\n"
        "\u2022 UAE: Dubai Psychological Services 800-4636\n"
    ),
}


def run_safety_triage(profile: ClientProfile, ed_result: Tuple[str, List[str]]) -> SafetyTriageResult:
    triage, ed_items = ed_result
    modifiers = []

    if triage == "red":
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True,
            caution_note="BLOCKED: Professional referral required before program generation."
        )

    # Mental health crisis block (soft-reversible via crisis_cleared flag)
    if profile.mental_health_concern == "significant" and not profile.crisis_cleared:
        return SafetyTriageResult(
            triage="red", blocked=True,
            caution_note=(
                "BLOCKED: Significant mental health concern reported. "
                "Professional support recommended before beginning a fitness program.\n\n"
                "**Immediate support options:**\n"
                + CRISIS_RESOURCES.get("default")
                + "\nYour profile is saved. When you're ready, a coach can help you proceed."
            )
        )

    if triage == "green":
        caution = ""

    if triage == "yellow":
        caution = "CAUTION: Proceed with modifications. Monitor check-ins for distress signals."
        if "binge_episodes" in ed_items:
            modifiers.append("gentle_entry")
            modifiers.append("no_calorie_deficit")
        if "compensatory_behavior" in ed_items:
            modifiers.append("gentle_entry")
        if "guilt_after_eating" in ed_items:
            modifiers.append("no_food_tracking")
            modifiers.append("gentle_entry")

    if profile.medical:
        for condition in profile.medical:
            cl = condition.lower()
            if "osgood" in cl or "schlatter" in cl:
                modifiers.append("avoid_deep_squat")
            if "osteomalacia" in cl or "vitamin d" in cl:
                modifiers.append("vitamin_d_supplementation")
            if "scoliosis" in cl:
                modifiers.append("unilateral_work")
                modifiers.append("core_stabilization")
            if "anemia" in cl or "anaemia" in cl:
                modifiers.append("iron_monitoring")
            if "thyroid" in cl:
                modifiers.append("thyroid_monitoring")

    if profile.injuries:
        modifiers.append("injury_aware")
        for inj in profile.injuries:
            il = inj.lower()
            if "rotator" in il or "shoulder" in il:
                modifiers.append("shoulder_care")
            if "knee" in il or "patellar" in il or "acl" in il:
                modifiers.append("knee_care")
            if "back" in il or "disc" in il or "sciatica" in il:
                modifiers.append("back_care")
            if "neck" in il:
                modifiers.append("neck_care")

    if profile.gut_health != "none":
        modifiers.append("gut_health_support")

    if isinstance(profile.sleep_hours, (int, float)) and profile.sleep_hours < 6.5:
        modifiers.append("sleep_priority")

    if isinstance(profile.stress_level, (int, float)) and profile.stress_level >= 7:
        modifiers.append("stress_management")

    if isinstance(profile.alcohol_weekly, (int, float)) and profile.alcohol_weekly >= 5:
        modifiers.append("alcohol_reduction")

    if profile.work_schedule in ("night", "rotating", "early"):
        modifiers.append("shift_work")

    if profile.mental_health_concern in ("moderate", "significant"):
        modifiers.append("mental_health_support")

    modifiers = list(set(modifiers))

    return SafetyTriageResult(
        triage=triage, ed_items=ed_items,
        caution_note=caution, modifiers=modifiers
    )


def assign_pillars(profile: ClientProfile, triage: SafetyTriageResult) -> PillarAssignment:
    primary = []
    secondary = []
    modifications = list(triage.modifiers)
    gentle_entry = "gentle_entry" in modifications

    # Pillar assignment based on profile
    goal = profile.goal.lower()

    if goal in ("fat_loss", "cut"):
        primary.append("P1 - Diet Maxing")
        secondary.extend(["P9 - Measurement and Feedback Systems", "P6 - Fatigue Management"])
    elif goal in ("hypertrophy", "build muscle"):
        primary.append("P2 - Training Maxing")
        secondary.extend(["P1 - Diet Maxing", "P4 - Recovery Maxing"])
    elif goal in ("strength", "get stronger"):
        primary.append("P5 - Strength Maxing")
        secondary.extend(["P2 - Training Maxing", "P6 - Fatigue Management"])
    elif goal in ("recomp", "recomposition"):
        primary.extend(["P1 - Diet Maxing", "P2 - Training Maxing"])
        secondary.append("P9 - Measurement and Feedback Systems")
    else:
        primary.append("P2 - Training Maxing")
        secondary.append("P7 - Adherence Engineering")

    # Context-driven pillar adjustments (priority order)
    if profile.injuries:
        secondary.insert(0, "P4 - Recovery Maxing")
    if isinstance(profile.sleep_hours, (int, float)) and profile.sleep_hours < 6.5:
        if "P3 - Sleep Maxing" not in primary:
            primary.append("P3 - Sleep Maxing")
    if isinstance(profile.stress_level, (int, float)) and profile.stress_level >= 7:
        if "P6 - Fatigue Management" not in secondary:
            secondary.append("P6 - Fatigue Management")

    # Always include core pillars
    core_pillars = ["P7 - Adherence Engineering", "P8 - Individualization", "P10 - Integration"]
    for cp in core_pillars:
        if cp not in secondary and cp not in primary:
            secondary.append(cp)

    return PillarAssignment(
        primary_pillars=primary[:4],
        secondary_pillars=secondary[:6],
        gentle_entry=gentle_entry,
        modifications=modifications,
    )


def _extract_sources(indexer, rag_queries: List[str], max_per_query: int = 3) -> List[VaultSource]:
    """Deduplicated vault sources from RAG queries."""
    seen_paths = set()
    sources = []
    for q in rag_queries:
        results = indexer.search(q, top_k=max_per_query)
        for chunk, score in results:
            if chunk.source_path not in seen_paths:
                seen_paths.add(chunk.source_path)
                sources.append(VaultSource(
                    title=chunk.section_title,
                    path=chunk.source_path,
                    score=round(score, 3),
                    pillar=chunk.pillar or "",
                    snippet=chunk.content[:300],
                ))
    return sources[:12]


def evaluate_rag_impact(profile, rag_failed: bool) -> tuple:
    """Determine action when RAG vault retrieval fails.

    Accepts both ClientProfile objects and dict profiles.
    Returns (action: str, message: str) where action is one of:
    - "proceed": no issues, continue normally
    - "warn": vault unavailable but profile clean — inject advisory note
    - "block": vault unavailable AND profile has safety flags — stop generation
    """
    if not rag_failed:
        return ("proceed", "")

    if hasattr(profile, 'medical'):
        _bmi_low = False
        if profile.height_cm > 0 and profile.bodyweight_kg > 0:
            _bmi_low = profile.bodyweight_kg / ((profile.height_cm / 100) ** 2) < 18.5
        has_flags = bool(profile.medical) or bool(profile.injuries) or \
                    bool(profile.known_deficiencies) or \
                    bool(profile.rapid_weight_loss) or \
                    _bmi_low or \
                    profile.last_bloodwork in ("2yr_plus", "never") or \
                    profile.mental_health_concern in ("moderate", "significant")
    else:
        _bmi_low = False
        h = profile.get("height_cm", 0)
        w = profile.get("bodyweight_kg", 0)
        if h and w:
            _bmi_low = w / ((h / 100) ** 2) < 18.5
        has_flags = bool(profile.get("medical_conditions")) or bool(profile.get("injuries")) or \
                    bool(profile.get("known_deficiencies")) or \
                    bool(profile.get("rapid_weight_loss")) or \
                    _bmi_low or \
                    profile.get("last_bloodwork", "") in ("2yr_plus", "never") or \
                    profile.get("mental_health_concern", "") in ("moderate", "significant")

    if has_flags:
        return ("block", "Vault knowledge base is unavailable. Cannot safely generate program for profile with active medical, injury, or deficiency flags.")
    return ("warn", "Vault context unavailable — exercise added caution.")


def load_context(profile: ClientProfile, ed_answers: dict = None) -> dict:
    """Full context loading pipeline.
    Returns dict with triage, pillars, vault_context (str), and vault_sources (list).
    """
    ed_result = evaluate_ed_screening(ed_answers or {})

    triage = run_safety_triage(profile, ed_result)
    if triage.blocked:
        block_reason = "crisis" if profile.mental_health_concern == "significant" else "ed_red"
        return {"triage": triage, "pillars": None, "vault_context": "", "vault_sources": [], "blocked": True, "block_reason": block_reason}

    # BMI < 18.5 safety check (Master Protocol.md:225 — RED: "Do not proceed")
    if profile.height_cm > 0 and profile.bodyweight_kg > 0:
        bmi = profile.bodyweight_kg / ((profile.height_cm / 100) ** 2)
        if bmi < 18.5:
            from mos_bot.core.models import SafetyTriageResult
            triage = SafetyTriageResult(
                triage="red", blocked=True,
                caution_note="BLOCKED: BMI indicates underweight status. Professional nutritional assessment recommended before program generation."
            )
            return {"triage": triage, "pillars": None, "vault_context": "", "vault_sources": [], "blocked": True, "block_reason": "bmi_low"}

    pillars = assign_pillars(profile, triage)

    # Build RAG queries from profile signals
    rag_queries = [profile.goal]
    if profile.injuries:
        rag_queries.extend(profile.injuries)
    if profile.medical:
        rag_queries.extend(profile.medical)
    if profile.gut_health != "none":
        rag_queries.append(f"gut health {profile.gut_health}")
    if profile.sleep_hours < 7:
        rag_queries.append("sleep optimization")
    if "gentle_entry" in pillars.modifications:
        rag_queries.append("gentle entry protocol binge eating")

    # Retrieve vault context via RAG
    vault_context = ""
    vault_sources = []
    try:
        from mos_bot.core.vault_rag import VaultIndexer
        indexer = VaultIndexer()
        indexer.index_vault()

        all_context_parts = []
        for q in rag_queries:
            ctx = indexer.get_relevant_context(q, max_chunks=4)
            if ctx and "No relevant vault content" not in ctx:
                all_context_parts.append(ctx)

        vault_context = "\n\n".join(all_context_parts)

        # Also extract structured sources
        vault_sources = _extract_sources(indexer, rag_queries)
        rag_failed = False
    except Exception as e:
        import traceback
        logger.error(f"[RAG RETRIEVAL FAILED] {e}\n{traceback.format_exc()}")
        vault_context = ""
        vault_sources = []
        rag_failed = True

    return {
        "triage": triage,
        "pillars": pillars,
        "vault_context": vault_context,
        "vault_sources": vault_sources,
        "rag_failed": rag_failed,
        "blocked": False,
    }
