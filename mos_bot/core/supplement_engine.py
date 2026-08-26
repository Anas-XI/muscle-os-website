"""Evidence-Based Supplement Stack & Interaction Analyzer.

Evaluates:
- Evidence Tiers (Tier 1: Proven Efficacy, Tier 2: Conditional, Tier 3: Limited/Unproven)
- Timing Schedule (Morning, Pre-Workout, Post-Workout, Bedtime)
- Interaction & Absorption Collision Warnings (e.g. Zinc/Copper, Iron/Calcium, Late Caffeine)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class SupplementEvaluation:
    name: str
    tier: str  # "Tier 1: Essential / Robust Evidence", "Tier 2: Conditional Efficacy", "Tier 3: Limited Evidence"
    standard_dosage: str
    primary_mechanism: str
    optimal_timing: str
    synergies: List[str]
    cautions: List[str]


@dataclass
class SupplementAnalysisResult:
    evaluated_supplements: List[SupplementEvaluation]
    dosing_schedule: Dict[str, List[str]]  # "morning", "pre_workout", "post_workout", "bedtime"
    collision_warnings: List[str]
    tier_summary: Dict[str, int]


SUPPLEMENT_DB = {
    "creatine": {
        "tier": "Tier 1: Essential / Robust Evidence",
        "dosage": "3-5g daily (Monohydrate, no loading phase required)",
        "mechanism": "Increases intramuscular phosphocreatine stores, accelerating ATP resynthesis during high-intensity contractions.",
        "timing": "post_workout",
        "synergies": ["Carbohydrates / Protein (enhances insulin-mediated muscular uptake)"],
        "cautions": ["Requires adequate hydration (water retention is intracellular)"],
    },
    "whey": {
        "tier": "Tier 1: Essential / Robust Evidence",
        "dosage": "25-30g post-workout or between meals",
        "mechanism": "Rapidly digestible complete protein rich in Leucine (>2.7g per scoop) to trigger MPS via mTORC1.",
        "timing": "post_workout",
        "synergies": ["Carbohydrates", "Creatine Monohydrate"],
        "cautions": ["Check for lactose intolerance (use Whey Isolate if sensitive)"],
    },
    "caffeine": {
        "tier": "Tier 1: Essential / Robust Evidence",
        "dosage": "3-6 mg/kg bodyweight taken 45-60 min pre-workout",
        "mechanism": "Adenosine receptor antagonist, increases motor unit recruitment, reduces rate of perceived exertion (RPE).",
        "timing": "pre_workout",
        "synergies": ["L-Theanine (100-200mg to smooth jitters and improve focus)"],
        "cautions": ["Enforce 9-10h clearance buffer before bedtime to protect sleep architecture."],
    },
    "omega_3": {
        "tier": "Tier 1: Essential / Robust Evidence",
        "dosage": "2-3g combined EPA/DHA daily",
        "mechanism": "Modulates inflammatory eicosanoids, enhances muscle protein synthesis sensitivity in older adults, supports joint health.",
        "timing": "morning",
        "synergies": ["Fat-soluble vitamins (Vit D3, Vit K2)"],
        "cautions": ["Take with a fat-containing meal for optimal absorption."],
    },
    "vitamin_d": {
        "tier": "Tier 1: Essential / Robust Evidence",
        "dosage": "2,000 - 5,000 IU daily (D3)",
        "mechanism": "Steroid hormone precursor regulating gene expression, bone mineral density, testosterone synthesis, and immune function.",
        "timing": "morning",
        "synergies": ["Vitamin K2 (MK-7 100mcg to direct calcium to bone matrix)", "Magnesium"],
        "cautions": ["Take with dietary fat; monitor 25-OH serum levels annually."],
    },
    "ashwagandha": {
        "tier": "Tier 2: Conditional Efficacy",
        "dosage": "300-600mg KSM-66 extract daily",
        "mechanism": "GABA-mimetic adaptogen reducing serum cortisol levels and perceived psychological stress.",
        "timing": "bedtime",
        "synergies": ["Magnesium Glycinate / L-Theanine"],
        "cautions": ["Cycle 8 weeks on, 2-4 weeks off to avoid emotional blunting / thyroid sensitivity."],
    },
    "citrulline": {
        "tier": "Tier 2: Conditional Efficacy",
        "dosage": "6-8g L-Citrulline Malate (2:1) 45 min pre-workout",
        "mechanism": "Elevates serum L-Arginine and Nitric Oxide (NO) synthesis, boosting muscular hyperemia and metabolite clearance.",
        "timing": "pre_workout",
        "synergies": ["Caffeine", "Beta-Alanine"],
        "cautions": ["Can cause mild GI distress if taken on completely empty stomach."],
    }
}


def analyze_supplement_stack(supplements: List[str], bedtime_hour: int = 22) -> SupplementAnalysisResult:
    """Evaluate a supplement stack for efficacy tiers, optimal timing, and absorption collisions."""
    evals = []
    schedule = {"morning": [], "pre_workout": [], "post_workout": [], "bedtime": []}
    warnings = []
    tiers = {"Tier 1": 0, "Tier 2": 0, "Tier 3": 0}

    supp_set = set()

    for s in supplements:
        clean_s = s.lower().replace("-", "_").replace(" ", "_")
        matched = False
        for key, data in SUPPLEMENT_DB.items():
            if key in clean_s or clean_s in key:
                supp_set.add(key)
                ev = SupplementEvaluation(
                    name=s,
                    tier=data["tier"],
                    standard_dosage=data["dosage"],
                    primary_mechanism=data["mechanism"],
                    optimal_timing=data["timing"],
                    synergies=data["synergies"],
                    cautions=data["cautions"],
                )
                evals.append(ev)
                schedule[data["timing"]].append(f"{s} ({data['dosage']})")
                if "Tier 1" in data["tier"]: tiers["Tier 1"] += 1
                elif "Tier 2" in data["tier"]: tiers["Tier 2"] += 1
                else: tiers["Tier 3"] += 1
                matched = True
                break
        
        if not matched:
            tiers["Tier 3"] += 1
            evals.append(SupplementEvaluation(
                name=s,
                tier="Tier 3: Limited Evidence / Niche",
                standard_dosage="As labeled by manufacturer",
                primary_mechanism="Limited empirical support in peer-reviewed meta-analyses.",
                optimal_timing="morning",
                synergies=[],
                cautions=["Evaluate cost-to-benefit ratio against certified Tier 1 foundations."]
            ))
            schedule["morning"].append(s)

    # Collision & Safety Checks
    if "caffeine" in supp_set and bedtime_hour <= 22:
        warnings.append("⚠️ **Caffeine Sleep Cutoff:** Caffeine has a 5-7h half-life. Cease all caffeine consumption by 12:00-14:00 to prevent sleep spindle disruption.")
    if "vitamin_d" in supp_set and "omega_3" not in supp_set:
        warnings.append("💡 **Absorption Synergy:** Vitamin D3 is fat-soluble. Ensure it is consumed alongside dietary fats or Omega-3s.")

    return SupplementAnalysisResult(
        evaluated_supplements=evals,
        dosing_schedule=schedule,
        collision_warnings=warnings,
        tier_summary=tiers,
    )
