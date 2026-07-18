"""Context Loader: ED screening → Safety Triage → Pillar Assignment → Vault Context Retrieval"""

import logging
from typing import List, Tuple
from mos_bot.config import VAULT_ROOT
from mos_bot.core.models import ClientProfile, SafetyTriageResult, PillarAssignment, VaultSource, VaultInformedSignals
from mos_bot.core.vault_graph import expand_faiss_results
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

    # Red-tier: diagnosed ED, binge+purge, or frequent guilt (B4 per vault)
    if ed3: return "red", items
    if ed1 and ed2: return "red", items
    if ed4: return "red", items
    # Yellow-tier: occasional binge (B2) or past resolved purge (B3)
    if ed1: return "yellow", items
    if ed2: return "yellow", items
    return "green", items


CRISIS_RESOURCES = {
    "default": {
        "lines": [
            "Find a Helpline (global directory): https://findahelpline.com",
            "International Association for Suicide Prevention: https://iasp.info/resources/Crisis_Centres/",
        ]
    },
    "US": {
        "lines": [
            "988 Suicide & Crisis Lifeline: Call or text 988",
            "Crisis Text Line: Text HOME to 741741",
            "Find a Helpline (global directory): https://findahelpline.com",
        ]
    },
    "UK": {
        "lines": [
            "Samaritans: Call 116 123 (free, 24/7)",
            "Shout: Text SHOUT to 85258",
            "Find a Helpline (global directory): https://findahelpline.com",
        ]
    },
    "CA": {
        "lines": [
            "Talk Suicide Canada: Call 1-833-456-4566",
            "Crisis Text Line: Text CONNECT to 686868",
            "Find a Helpline (global directory): https://findahelpline.com",
        ]
    },
    "MENA": {
        "lines": [
            "Find a Helpline (global directory): https://findahelpline.com",
            "International Association for Suicide Prevention: https://iasp.info/resources/Crisis_Centres/",
        ]
    },
}


def format_crisis_resources(region: str = "default") -> str:
    """Return bulleted crisis resource lines for the given region."""
    entry = CRISIS_RESOURCES.get(region) or CRISIS_RESOURCES["default"]
    return "\n".join(f"\u2022 {line}" for line in entry["lines"])


def run_safety_triage(profile: ClientProfile, ed_result: Tuple[str, List[str]]) -> SafetyTriageResult:
    triage, ed_items = ed_result
    modifiers = []

    # ASSERT: Crisis block checked FIRST — must win over every other gate.
    # A person in crisis showing crisis resources is strictly more important
    # than showing ED-specific or BMI-specific messaging.
    # Per-incident check: a new incident is blocked even if a previous one was cleared.
    if profile.mental_health_concern == "significant" and profile.crisis_incident_id != profile.crisis_cleared_incident:
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="crisis",
            caution_note=(
                "BLOCKED: Significant mental health concern reported. Professional support "
                "is recommended before beginning a structured fitness program.\n\n"
                "**Immediate support options:**\n"
                + format_crisis_resources()
                + "\n\nYour profile is saved. A coach has been notified and will follow up."
            )
        )

    # Fail-safe: unrecognized mental_health_concern values default to red
    # (catches typo'd values, schema drift, hand-edited profiles — same
    # silent-green failure mode as the known_deficiencies and ED1/ED2 bugs)
    if profile.mental_health_concern not in ("", "none", "moderate", "significant"):
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="mental_health_unrecognized",
            caution_note=(
                "BLOCKED: Unrecognized mental health concern value. Defaulting to caution — "
                "professional clearance recommended before program generation."
            )
        )

    if triage == "red":
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="ed_red",
            caution_note="BLOCKED: Professional referral required before program generation."
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

    # Known deficiencies: current or unconfirmed → hard block.
    # Per Pre-Program Clearance Gate E3: any current untreated deficiency
    # requires bloodwork + medical management before program generation.
    # Confirmed+resolved deficiencies pass through (not a red flag).
    _deficiency_is_issue = bool(profile.known_deficiencies) and not (
        profile.deficiency_confirmed and profile.deficiency_status == "resolved"
    )
    if _deficiency_is_issue:
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="deficiency",
            caution_note="BLOCKED: Current nutrient deficiencies require clearance before program generation. Bloodwork recommended per Pre-Program Clearance Gate."
        )

    # D1 — Under 16: hard block (Safety Triage D1 Red)
    if isinstance(profile.age, (int, float)) and 0 < profile.age < 16:
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="age_under_16",
            caution_note="BLOCKED: Users under 16 require parental or guardian involvement. Professional pediatric clearance recommended before program generation."
        )

    # D2 — 75+ or 65+ with medical conditions: hard block (Safety Triage D2 Red)
    if isinstance(profile.age, (int, float)) and profile.age >= 75:
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="age_75_plus",
            caution_note="BLOCKED: Advanced age with potential health considerations. Professional medical clearance recommended before program generation."
        )
    if isinstance(profile.age, (int, float)) and profile.age >= 65 and profile.medical:
        return SafetyTriageResult(
            triage="red", ed_items=ed_items, blocked=True, block_reason="age_65_plus_with_conditions",
            caution_note="BLOCKED: Age-related health considerations. Professional medical clearance recommended before program generation."
        )

    # BMI < 18.5 safety check (Master Protocol.md:225 — RED: "Do not proceed")
    if isinstance(profile.height_cm, (int, float)) and profile.height_cm > 0 and isinstance(profile.bodyweight_kg, (int, float)) and profile.bodyweight_kg > 0:
        bmi = profile.bodyweight_kg / ((profile.height_cm / 100) ** 2)
        if bmi < 18.5:
            return SafetyTriageResult(
                triage="red", ed_items=ed_items, blocked=True, block_reason="bmi_low",
                caution_note="BLOCKED: BMI indicates underweight status. Professional nutritional assessment recommended before program generation."
            )

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


def _extract_vault_signals(vault_sources: list, profile: ClientProfile) -> VaultInformedSignals:
    """Extract structured signals from RAG vault output to inform program decisions."""
    pillar_scores = {}
    for vs in vault_sources:
        if vs.pillar:
            pillar_scores[vs.pillar] = max(pillar_scores.get(vs.pillar, 0), vs.score)

    sorted_pillars = sorted(pillar_scores.items(), key=lambda x: -x[1])
    vault_recommended = [p for p, s in sorted_pillars if s >= 0.6]

    nutr_keywords = ("Diet", "Nutrition", "P1")
    train_keywords = ("Training", "P2", "Strength", "P5")
    recovery_keywords = ("Recovery", "Sleep", "Fatigue", "P3", "P4", "P6")

    nutr_snippets = [vs.snippet for vs in vault_sources if vs.pillar and any(k in vs.pillar for k in nutr_keywords)]
    train_snippets = [vs.snippet for vs in vault_sources if vs.pillar and any(k in vs.pillar for k in train_keywords)]
    recover_snippets = [vs.snippet for vs in vault_sources if vs.pillar and any(k in vs.pillar for k in recovery_keywords)]
    injury_snippets = [vs.snippet for vs in vault_sources
                       if "injury" in (vs.title + vs.snippet).lower()
                       or profile.injuries and any(i.lower() in vs.snippet.lower() for i in profile.injuries)]

    top_sources = sorted(vault_sources, key=lambda x: -x.score)[:3]

    return VaultInformedSignals(
        vault_recommended_pillars=vault_recommended,
        vault_nutrition_guidance="\n\n".join(nutr_snippets[:2]),
        vault_training_guidance="\n\n".join(train_snippets[:2]),
        vault_recovery_guidance="\n\n".join(recover_snippets[:2]),
        vault_injury_guidance="\n\n".join(injury_snippets[:2]),
        vault_top_snippets=[f"[{vs.title}] {vs.snippet[:200]}" for vs in top_sources],
    )


def assign_pillars(profile: ClientProfile, triage: SafetyTriageResult, vault_signals: VaultInformedSignals = None) -> PillarAssignment:
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

    # Vault-informed pillar boosting: vault-recommended pillars that aren't
    # already assigned get added as secondary pillars
    if vault_signals and vault_signals.vault_recommended_pillars:
        for vp in vault_signals.vault_recommended_pillars:
            if vp not in primary and vp not in secondary:
                secondary.insert(0, vp)

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
        _mh_significant = profile.mental_health_concern == "significant" and profile.crisis_incident_id != profile.crisis_cleared_incident
        _mh_moderate = profile.mental_health_concern == "moderate"
        has_flags = bool(profile.medical) or bool(profile.injuries) or \
                    bool(profile.rapid_weight_loss) or \
                    _bmi_low or \
                    profile.last_bloodwork in ("2yr_plus", "never") or \
                    _mh_moderate or _mh_significant
    else:
        _bmi_low = False
        h = profile.get("height_cm", 0)
        w = profile.get("bodyweight_kg", 0)
        if h and w:
            _bmi_low = w / ((h / 100) ** 2) < 18.5
        _mh_significant = profile.get("mental_health_concern", "") == "significant" and profile.get("crisis_incident_id", "") != profile.get("crisis_cleared_incident", "")
        _mh_moderate = profile.get("mental_health_concern", "") == "moderate"
        has_flags = bool(profile.get("medical_conditions")) or bool(profile.get("injuries")) or \
                    bool(profile.get("rapid_weight_loss")) or \
                    _bmi_low or \
                    profile.get("last_bloodwork", "") in ("2yr_plus", "never") or \
                    _mh_moderate or _mh_significant

    if has_flags:
        return ("block", "Vault knowledge base is unavailable. Cannot safely generate program for profile with active flags.")
    return ("warn", "Vault context unavailable — exercise added caution.")


def _build_vault_context(profile: ClientProfile, triage: SafetyTriageResult) -> tuple:
    """Build RAG vault context from profile + triage signals.

    Returns (vault_context: str, vault_sources: list, rag_failed: bool).
    Pillar-agnostic — runs before pillar assignment so vault signals can inform pillars.
    """
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
    if triage and "gentle_entry" in triage.modifiers:
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

        # Graph expansion: find additional docs via wikilinks and category relationships
        faiss_paths = [vs.path for vs in vault_sources if vs.path]
        try:
            graph_expansions = expand_faiss_results(faiss_paths, max_expand=6)
            for exp_path, exp_score, exp_reason in graph_expansions:
                full_path = os.path.join(VAULT_ROOT, exp_path)
                # Only add if path exists and not already in vault_sources
                if os.path.exists(full_path) and exp_path not in faiss_paths:
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            snippet = f.read(800)
                    except Exception:
                        snippet = ""
                    vault_sources.append(VaultSource(
                        title=os.path.splitext(os.path.basename(exp_path))[0],
                        path=exp_path,
                        score=max(0.4, exp_score * 0.3),
                        snippet=snippet[:300],
                    ))
                    vault_context += f"\n\n--- {os.path.splitext(os.path.basename(exp_path))[0]} (via {exp_reason}) ---\n{snippet[:1000]}"
        except Exception as e:
            import traceback
            logger.warning(f"[GRAPH EXPANSION FAILED] {e}\n{traceback.format_exc()}")

        rag_failed = False
    except Exception as e:
        import traceback
        logger.error(f"[RAG RETRIEVAL FAILED] {e}\n{traceback.format_exc()}")
        vault_context = ""
        vault_sources = []
        rag_failed = True

    return vault_context, vault_sources, rag_failed


def load_context(profile: ClientProfile, ed_answers: dict = None) -> dict:
    """Full context loading pipeline. Thin composition wrapper over
    safety pipeline + RAG vault queries.

    Returns dict with triage, pillars, vault_context (str), vault_sources (list),
    vault_signals (VaultInformedSignals), and rag_failed (bool).
    """
    ed_result = evaluate_ed_screening(ed_answers or {})

    triage = run_safety_triage(profile, ed_result)
    if triage.blocked:
        return {"triage": triage, "pillars": None, "vault_context": "", "vault_sources": [], "vault_signals": None, "blocked": True, "block_reason": triage.block_reason}

    vault_context, vault_sources, rag_failed = _build_vault_context(profile, triage)
    vault_signals = _extract_vault_signals(vault_sources, profile)

    pillars = assign_pillars(profile, triage, vault_signals)

    return {
        "triage": triage,
        "pillars": pillars,
        "vault_context": vault_context,
        "vault_sources": vault_sources,
        "vault_signals": vault_signals,
        "rag_failed": rag_failed,
        "blocked": False,
    }
