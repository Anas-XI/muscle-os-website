"""Book Decision Engine: loads decision rules from all vault books and applies
them to profile → pillars → program generation for vault-informed decisions."""

from dataclasses import dataclass, field
from typing import List, Optional, Callable
from mos_bot.core.models import ClientProfile, PillarAssignment, SafetyTriageResult


@dataclass
class BookRule:
    rule_id: str
    source: str
    description: str
    trigger: Callable[[ClientProfile], bool]
    pillar_modifications: Optional[Callable[[ClientProfile, PillarAssignment], PillarAssignment]] = None
    modifier_additions: Optional[List[str]] = None
    rep_range_override: Optional[str] = None
    rest_period_override: Optional[str] = None
    protein_g_per_kg_override: Optional[float] = None
    surplus_cal_adjustment: Optional[int] = None
    deficit_cal_adjustment: Optional[int] = None
    meal_timing_note: Optional[str] = None
    warm_up_addition: Optional[str] = None
    program_note: Optional[str] = None
    nutrition_note: Optional[str] = None
    pillar_priority_override: Optional[str] = None  # "elevate" / "deelevate" pillar ref


@dataclass
class BookEngineResult:
    applied_rules: List[BookRule] = field(default_factory=list)
    extra_modifiers: List[str] = field(default_factory=list)
    rep_range: str = "6-12"
    rest_compounds: str = "90-120s"
    rest_isolation: str = "60-90s"
    protein_per_kg: float = 1.6
    surplus_kcal: int = 350
    deficit_kcal: int = 500
    meal_timing: str = "Distribute protein across 3-4 meals at leucine threshold (30-40g per meal). Carbs prioritized around training window."
    warm_up: str = ""
    program_notes: List[str] = field(default_factory=list)
    nutrition_notes: List[str] = field(default_factory=list)
    vault_insights: List[str] = field(default_factory=list)


class BookDecisionEngine:
    """Loads all book-derived decision rules and applies them to a profile."""

    def __init__(self):
        self._rules: List[BookRule] = []
        self._build_rules()

    def _add(self, rule: BookRule):
        self._rules.append(rule)

    def _build_rules(self):
        """Build all decision rules from every vault book."""

        # ── Schoenfeld - Science and Development of Muscle Hypertrophy ──
        self._add(BookRule(
            rule_id="SH-TR-05", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Use 5-30 RM range (sweet spot 6-15) for hypertrophy. Adjust rep targets accordingly.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle", "recomp"),
            rep_range_override="6-15",
            rest_period_override="3min compounds, 2min isolation",
            modifier_additions=["evidence_based_rep_range"],
            program_note="Per Schoenfeld: effective hypertrophy rep range is 5-30 RM, practical sweet spot 6-15 RM.",
        ))
        self._add(BookRule(
            rule_id="SH-TR-06", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Rest at least 2 min between sets for same muscle group, 3 min for multi-joint compounds.",
            trigger=lambda p: True,
            rest_period_override="3min compounds, 2min isolation",
            program_note="Per Schoenfeld: longer rest (2-3 min) maintains mechanical tension across sets.",
        ))
        self._add(BookRule(
            rule_id="SH-TR-08", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Prioritize exercises that train muscles at long lengths (stretch-mediated hypertrophy).",
            trigger=lambda p: True,
            modifier_additions=["long_length_emphasis"],
            program_note="Per Schoenfeld: prioritize exercises that train target muscles at long lengths under load.",
        ))
        self._add(BookRule(
            rule_id="SH-TR-04", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Train each muscle group at least 2x/week for hypertrophy.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle", "strength"),
            program_note="Per Schoenfeld: each muscle group trained 2x/week for optimal hypertrophy stimulus.",
        ))
        self._add(BookRule(
            rule_id="SH-NU-01", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Consume 1.6-2.2 g/kg/day protein across 4+ meals with ~0.4g/kg per meal for mTOR activation.",
            trigger=lambda p: True,
            protein_g_per_kg_override=2.0,
            meal_timing_note="Per Schoenfeld: 1.6-2.2 g/kg/day protein across 4+ meals, ~0.4 g/kg per meal (2-3g leucine) for mTORC1 activation.",
            nutrition_note="Protein target is evidence-based: 1.6-2.2 g/kg/day (Schoenfeld). Older adults (65+): 1.6-2.4 g/kg/day.",
        ))
        self._add(BookRule(
            rule_id="SH-NU-03", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Modest caloric surplus (200-400 kcal/day) for maximal hypertrophy. Deficit impairs but doesn't prevent growth.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle", "recomp"),
            surplus_cal_adjustment=300,
            nutrition_note="Per Schoenfeld: modest 200-400 kcal surplus is permissive for maximal hypertrophy.",
        ))
        self._add(BookRule(
            rule_id="SH-PL-02", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Deload every 6-8 weeks preventatively (not reactively). Reduce volume 40-60% at same intensity.",
            trigger=lambda p: True,
            program_note="Per Schoenfeld: deload every 6-8 weeks preventatively — reduce volume 40-60% at same intensity.",
        ))
        self._add(BookRule(
            rule_id="SH-IN-01", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Older adults (65+): increase protein to 0.4-0.6 g/kg per meal. Prioritize lower-impact exercises.",
            trigger=lambda p: isinstance(p.age, (int, float)) and p.age >= 65,
            modifier_additions=["masters_athlete_protein", "longer_recovery"],
            program_note="Per Schoenfeld: older adults (65+) need 0.4-0.6 g/kg per meal to overcome anabolic resistance.",
        ))
        self._add(BookRule(
            rule_id="SH-FA-01", source="Schoenfeld - Science and Development of Muscle Hypertrophy",
            description="Monitor overreaching via: performance decline 2+ sessions, mood disturbance, sleep disruption, elevated HR, illness frequency.",
            trigger=lambda p: True,
            program_note="Per Schoenfeld: monitor overreaching — performance decline, mood disturbance, sleep disruption, elevated HR, illness frequency.",
        ))

        # ── Jeff Nippard - The Muscle Ladder ──
        self._add(BookRule(
            rule_id="ML-TR-04", source="Jeff Nippard - The Muscle Ladder",
            description="Stop 1-3 RIR on most hypertrophy sets. Reserve failure only for last set of last exercise per muscle group.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle", "recomp"),
            rep_range_override="6-15",
            program_note="Per Nippard: 1-3 RIR on most sets. Failure reserved for last set of last exercise per muscle group.",
        ))
        self._add(BookRule(
            rule_id="ML-TR-07", source="Jeff Nippard - The Muscle Ladder",
            description="For hypertrophy, 6-15 reps is the practical sweet spot. Below 6 is too heavy for metabolic stimulus.",
            trigger=lambda p: True,
            program_note="Per Nippard: 6-15 reps is the hypertrophy sweet spot — below 6 lacks metabolic stimulus.",
        ))
        self._add(BookRule(
            rule_id="ML-SC-01", source="Jeff Nippard - The Muscle Ladder",
            description="If trainee adds weight/reps weekly, treat as beginner regardless of training age.",
            trigger=lambda p: p.experience_years > 2 and p.training_days <= 3,
            modifier_additions=["treat_as_beginner"],
            program_note="Per Nippard: weekly progress = beginner programming, regardless of training age.",
        ))
        self._add(BookRule(
            rule_id="ML-PL-03", source="Jeff Nippard - The Muscle Ladder",
            description="Deload every 6-8 weeks preventatively, never wait for exhaustion.",
            trigger=lambda p: True,
            program_note="Per Nippard: deload every 6-8 weeks preventatively — never wait for exhaustion symptoms.",
        ))

        # ── NSCA Essentials of Strength Training and Conditioning ──
        self._add(BookRule(
            rule_id="NSCA-PD-01", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Load assignment by goal: Strength ≥85% 1RM 2-6 reps. Hypertrophy 67-85% 1RM 6-12 reps. Power 70-85% 1RM 1-5 reps.",
            trigger=lambda p: True,
            program_note="Per NSCA: load assignment by goal — strength ≥85% 1RM (2-6 reps), hypertrophy 67-85% 1RM (6-12 reps).",
        ))
        self._add(BookRule(
            rule_id="NSCA-PD-03", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Never increase weekly sets by more than 20-30% from previous mesocycle.",
            trigger=lambda p: True,
            modifier_additions=["volume_progression_cap"],
            program_note="Per NSCA: cap volume increase at 20-30% per mesocycle to prevent injury and systemic fatigue.",
        ))
        self._add(BookRule(
            rule_id="NSCA-FM-01", source="NSCA - Essentials of Strength Training and Conditioning",
            description="3-tier fatigue: <2 weeks = acute fatigue (normal). 2-4 weeks = functional overreaching. >4 weeks = nonfunctional overreaching.",
            trigger=lambda p: True,
            program_note="Per NSCA: 3-tier fatigue — <2w acute (normal), 2-4w functional overreaching (expected supercompensation), >4w nonfunctional (medical).",
        ))
        self._add(BookRule(
            rule_id="NSCA-FM-03", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Overtraining red flags: 3+ criteria for >4 weeks — performance decline, chronic fatigue, sleep disruption, mood disturbance, appetite loss, frequent illness.",
            trigger=lambda p: True,
            program_note="Per NSCA: 3+ criteria for >4 weeks — performance decline, fatigue, sleep/mood disruption, appetite loss, frequent illness → medical escalation.",
        ))
        self._add(BookRule(
            rule_id="NSCA-EX-03", source="NSCA - Essentials of Strength Training and Conditioning",
            description="4-phase warm-up: 5 min cardio, 5 min dynamic stretching, 5 min movement prep, ramping sets.",
            trigger=lambda p: True,
            warm_up_addition="NSCA 4-phase warm-up: 5 min cardio → 5 min dynamic → 5 min movement prep → ramping sets (50%→70%→90%).",
            program_note="Per NSCA: standardized 4-phase warm-up protocol (15-20 min total).",
        ))
        self._add(BookRule(
            rule_id="NSCA-EX-05", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Detraining recovery: 1-2w off → 90% load. 2-4w off → 80%. 4-8w off → 70%. 8+w off → 50-60%.",
            trigger=lambda p: True,
            program_note="Per NSCA: detraining recovery guidelines — 1-2w off at 90%, 2-4w at 80%, 4-8w at 70%, 8+w at 50-60%.",
        ))
        self._add(BookRule(
            rule_id="NSCA-AS-02", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Masters athletes (50+): 48-72h recovery between sessions vs 24-48h. Deload every 4-6 weeks.",
            trigger=lambda p: isinstance(p.age, (int, float)) and p.age >= 50,
            modifier_additions=["extended_recovery", "frequent_deload"],
            program_note="Per NSCA: masters athletes (50+) need 48-72h inter-session recovery and deload every 4-6 weeks.",
        ))
        self._add(BookRule(
            rule_id="NSCA-AS-03", source="NSCA - Essentials of Strength Training and Conditioning",
            description="Female athletes: 2-8x higher ACL risk. Include landing mechanics, hamstring strengthening, plyometric progression.",
            trigger=lambda p: p.sex.lower() == "female" and p.goal.lower() in ("hypertrophy", "strength", "fat_loss"),
            modifier_additions=["acl_prevention"],
            program_note="Per NSCA: female ACL risk 2-8x higher — include landing mechanics, hamstring strength, plyometric progression.",
        ))

        # ── ACE Personal Trainer Manual ──
        self._add(BookRule(
            rule_id="ACE-BC-02", source="ACE - Personal Trainer Manual",
            description="First 2 weeks: prioritize adherence over all other variables. Achievable > optimal.",
            trigger=lambda p: True,
            modifier_additions=["adherence_first"],
            program_note="Per ACE: first 2 weeks prioritize adherence over optimal — achievable > perfect.",
        ))
        self._add(BookRule(
            rule_id="ACE-SP-03", source="ACE - Personal Trainer Manual",
            description="BMI >30: prioritize non-weight-bearing exercise (cycling, swimming, seated resistance) for first 4-6 weeks.",
            trigger=lambda p: p.height_cm > 0 and p.bodyweight_kg > 0 and (
                p.bodyweight_kg / ((p.height_cm / 100) ** 2) > 30
            ),
            modifier_additions=["non_weight_bearing_start"],
            program_note="Per ACE: BMI >30 — start with non-weight-bearing exercise for 4-6 weeks to reduce joint stress.",
        ))
        self._add(BookRule(
            rule_id="ACE-IFT-01", source="ACE - Personal Trainer Manual",
            description="Before progressing from Phase 1 to Phase 2: verify pain-free ROM, neutral spine during fundamental movements, single-leg balance >15s.",
            trigger=lambda p: True,
            program_note="Per ACE IFT model: verify pain-free ROM, neutral spine, and 15s single-leg balance before progressing intensity.",
        ))

        # ── ISSA Certified Personal Trainer ──
        self._add(BookRule(
            rule_id="ISSA-NC-01", source="ISSA - Certified Personal Trainer",
            description="Start with standard hand portions. After 2 weeks, adjust by 1 unit (remove or add handful + thumb) based on progress.",
            trigger=lambda p: True,
            nutrition_note="Per ISSA: hand portion method — start standard, adjust by 1 unit after 2 weeks based on weight trend.",
        ))

        # ── IPTA Certified Personal Trainer ──
        self._add(BookRule(
            rule_id="IPTA-PD-02", source="IPTA - Certified Personal Trainer",
            description="Assign rep ranges by goal: Power 1-5, Strength 1-6, Hypertrophy 6-12, Endurance 12-20+ reps.",
            trigger=lambda p: True,
            rep_range_override="6-12",
            program_note="Per IPTA: rep range by goal — power (1-5), strength (1-6), hypertrophy (6-12), endurance (12-20+).",
        ))
        self._add(BookRule(
            rule_id="IPTA-PD-03", source="IPTA - Certified Personal Trainer",
            description="Rest by goal: Strength/Power 3-5 min, Hypertrophy 30-90s, Endurance 30-60s.",
            trigger=lambda p: True,
            rest_period_override="3min compounds, 60-90s isolation",
            program_note="Per IPTA: rest by goal — strength 3-5 min, hypertrophy 30-90s, endurance 30-60s.",
        ))
        self._add(BookRule(
            rule_id="IPTA-PD-07", source="IPTA - Certified Personal Trainer",
            description="Standard warm-up: 5-10 min cardio + dynamic stretching + movement-specific warm-up sets.",
            trigger=lambda p: True,
            warm_up_addition="IPTA warm-up standard: 5-10 min general cardio → dynamic stretching → movement-specific warm-up at 40-60% working weight.",
            program_note="Per IPTA: 3-phase warm-up — general cardio, dynamic mobility, movement-specific preparation.",
        ))
        self._add(BookRule(
            rule_id="IPTA-SP-03", source="IPTA - Certified Personal Trainer",
            description="Older adults (65+): lower-impact exercise, 48-72h recovery, include balance training 2-3x/week, start at 40-50% 1RM.",
            trigger=lambda p: isinstance(p.age, (int, float)) and p.age >= 65,
            modifier_additions=["older_adult_programming", "balance_training"],
            program_note="Per IPTA: older adults (65+) need lower-impact exercise, 48-72h recovery, balance training 2-3x/week.",
        ))
        self._add(BookRule(
            rule_id="IPTA-CE-02", source="IPTA - Certified Personal Trainer",
            description="Movement screen gate: pain-free ROM, bodyweight squat to parallel with neutral spine, single-leg balance >15s, hinge without lumbar flexion.",
            trigger=lambda p: True,
            program_note="Per IPTA: 4-criteria movement screen gate before loaded exercise — ROM, squat, balance, hinge.",
        ))
        self._add(BookRule(
            rule_id="IPTA-PE-01", source="IPTA - Certified Personal Trainer",
            description="Periodization model by status: Beginner → linear, Intermediate → undulating, Advanced → block.",
            trigger=lambda p: True,
            program_note="Per IPTA: periodization by training status — beginner (linear), intermediate (undulating), advanced (block).",
        ))

        # ── IPTA Certified Nutrition Specialist ──
        self._add(BookRule(
            rule_id="CNS-EB-01", source="IPTA - Certified Nutrition Specialist",
            description="Sustainable deficit: 300-500 kcal/day. Never exceed 750 kcal or 12 consecutive weeks without medical supervision.",
            trigger=lambda p: p.goal.lower() in ("fat_loss", "cut"),
            deficit_cal_adjustment=500,
            nutrition_note="Per IPTA CNS: sustainable deficit 300-500 kcal/day. Exceeding 750 kcal or 12 weeks requires medical supervision.",
        ))
        self._add(BookRule(
            rule_id="CNS-EB-02", source="IPTA - Certified Nutrition Specialist",
            description="Hypertrophy surplus: 200-400 kcal/day primarily from carbohydrates for training performance.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle", "strength", "recomp"),
            surplus_cal_adjustment=300,
            nutrition_note="Per IPTA CNS: hypertrophy surplus 200-400 kcal/day, primarily from carbohydrates for training performance.",
        ))
        self._add(BookRule(
            rule_id="CNS-MA-01", source="IPTA - Certified Nutrition Specialist",
            description="Distribute protein across 3-5 meals at 0.4 g/kg per meal minimum for optimal MPS stimulation.",
            trigger=lambda p: True,
            protein_g_per_kg_override=1.8,
            meal_timing_note="Per IPTA CNS: distribute protein across 3-5 meals at ≥0.4 g/kg per meal (minimum 20-30g) for optimal MPS. Post-exercise: consume 0.4 g/kg within 2 hours.",
        ))
        self._add(BookRule(
            rule_id="CNS-MA-04", source="IPTA - Certified Nutrition Specialist",
            description="Never prescribe fat below 0.5 g/kg/day. For hormonal concerns, increase to 0.8-1.0 g/kg.",
            trigger=lambda p: True,
            nutrition_note="Per IPTA CNS: minimum 0.5 g/kg fat for hormone function. Increase to 0.8-1.0 g/kg for hormonal concerns or amenorrhea.",
        ))
        self._add(BookRule(
            rule_id="CNS-SU-01", source="IPTA - Certified Nutrition Specialist",
            description="Supplement tier protocol: Tier 1 — creatine 5g, vitamin D 2000-4000 IU, omega-3 2-3g. Tier 2 — magnesium glycinate, B12, probiotics.",
            trigger=lambda p: True,
            nutrition_note="Per IPTA CNS: supplement tier — Tier 1 (strong evidence): creatine 5g/day, vitamin D 2000-4000 IU, omega-3 2-3g. Tier 2 (moderate): magnesium, B12, probiotics.",
        ))

        # ── IPTA Bodybuilding Screen ──
        self._add(BookRule(
            rule_id="BB-HP-03", source="IPTA - Bodybuilding Screen",
            description="Bodybuilding volume: start at MEV 8-12 sets/muscle/week, progress to MAV 15-20. Bodybuilders tolerate higher volume.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle"),
            program_note="Per IPTA Bodybuilding: MEV 8-12 → MAV 15-20 sets/muscle/week for hypertrophy. Bodybuilders tolerate higher volume than general clients.",
        ))
        self._add(BookRule(
            rule_id="BB-NU-01", source="IPTA - Bodybuilding Screen",
            description="Off-season surplus 200-400 kcal. Protein 1.6-2.2 g/kg. Carbs 4-6 g/kg. Limit fat gain to 0.5-1%/month.",
            trigger=lambda p: p.goal.lower() in ("hypertrophy", "build muscle"),
            surplus_cal_adjustment=300,
            protein_g_per_kg_override=2.0,
            nutrition_note="Per IPTA Bodybuilding: off-season surplus 200-400 kcal, protein 1.6-2.2 g/kg, carbs 4-6 g/kg.",
        ))
        self._add(BookRule(
            rule_id="BB-RI-01", source="IPTA - Bodybuilding Screen",
            description="Recovery priority: Sleep > Protein > Active recovery > Passive recovery. Reduce volume before frequency if compromised.",
            trigger=lambda p: True,
            program_note="Per IPTA Bodybuilding: recovery priority — sleep > protein > active > passive. Reduce volume first when recovery is compromised.",
        ))

    def apply(self, profile: ClientProfile, pillars: PillarAssignment,
              triage: SafetyTriageResult) -> BookEngineResult:
        """Apply all matching rules to this profile and return enriched decisions."""
        result = BookEngineResult()

        for rule in self._rules:
            if not rule.trigger(profile):
                continue

            result.applied_rules.append(rule)

            # Modifiers
            if rule.modifier_additions:
                result.extra_modifiers.extend(rule.modifier_additions)

            # Rep range
            if rule.rep_range_override:
                result.rep_range = rule.rep_range_override

            # Rest periods
            if rule.rest_period_override:
                parts = rule.rest_period_override.split(",")
                if len(parts) >= 1:
                    result.rest_compounds = parts[0].strip()
                if len(parts) >= 2:
                    result.rest_isolation = parts[1].strip()

            # Protein
            if rule.protein_g_per_kg_override:
                result.protein_per_kg = max(result.protein_per_kg, rule.protein_g_per_kg_override)

            # Surplus / deficit
            if rule.surplus_cal_adjustment:
                result.surplus_kcal = rule.surplus_cal_adjustment
            if rule.deficit_cal_adjustment:
                result.deficit_kcal = rule.deficit_cal_adjustment

            # Meal timing
            if rule.meal_timing_note:
                result.meal_timing = rule.meal_timing_note

            # Warm-up
            if rule.warm_up_addition:
                result.warm_up = rule.warm_up_addition

            # Notes
            if rule.program_note:
                result.program_notes.append(rule.program_note)
                result.vault_insights.append(f"[{rule.source}] {rule.program_note}")
            if rule.nutrition_note:
                result.nutrition_notes.append(rule.nutrition_note)

        # Deduplicate modifiers
        result.extra_modifiers = list(set(result.extra_modifiers))

        return result
