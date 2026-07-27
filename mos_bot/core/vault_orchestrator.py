"""Multi-Domain Vault Orchestrator.

Replaces the single FAISS pass with 5 domain-specific queries.
Each domain has its own query formulation strategy and vault targets.
Returns structured context per domain with citations.
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
from mos_bot.config import VAULT_ROOT
from mos_bot.core.models import ClientProfile, VaultSource, Citation

logger = logging.getLogger(__name__)

# Domain definitions with query strategy and targets
DOMAINS = {
    "training": {
        "pillar_boost": ["Pillar 2", "Pillar 5"],
        "path_keywords": ["Training", "Exercise", "Progressive", "Periodization", "Volume", "Split"],
    },
    "nutrition": {
        "pillar_boost": ["Pillar 1"],
        "path_keywords": ["Diet", "Nutrition", "Meal", "Macro", "Food", "Supplement"],
    },
    "recovery": {
        "pillar_boost": ["Pillar 3", "Pillar 4", "Pillar 6"],
        "path_keywords": ["Sleep", "Recovery", "Fatigue", "Stress", "Deload"],
    },
    "safety": {
        "pillar_boost": [],
        "path_keywords": ["Safety", "Medical", "Injury", "Rehab", "Triage", "Clearance"],
    },
    "adherence": {
        "pillar_boost": ["Pillar 7"],
        "path_keywords": ["Adherence", "Habit", "Behavior", "Motivation", "Consistency"],
    },
}


class VaultOrchestrator:
    """Multi-domain vault context builder. Runs domain-specific RAG queries."""

    def __init__(self):
        self._indexer = None
        self._lazy_init()

    def _lazy_init(self):
        try:
            from mos_bot.core.vault_rag import VaultIndexer
            self._indexer = VaultIndexer()
            self._indexer.index_vault()
        except Exception as e:
            logger.warning(f"Vault indexer init failed: {e}")

    def query_domain(self, domain: str, queries: List[str], top_k: int = 4) -> Tuple[str, List[VaultSource], List[Citation]]:
        if not self._indexer:
            return "", [], []
        if domain not in DOMAINS:
            return "", [], []

        config = DOMAINS[domain]
        all_context = []
        vault_sources = []
        citations = []

        seen_paths = set()
        for q in queries:
            if not q:
                continue
            try:
                results = self._indexer.search(q, top_k=top_k)
                for chunk, score in results:
                    if chunk.source_path not in seen_paths:
                        seen_paths.add(chunk.source_path)
                        vs = VaultSource(
                            title=chunk.section_title,
                            path=chunk.source_path,
                            score=round(score, 3),
                            pillar=chunk.pillar or "",
                            snippet=chunk.content[:300],
                        )
                        vault_sources.append(vs)
                        citations.append(Citation(
                            vault_path=chunk.source_path,
                            vault_title=chunk.section_title,
                            snippet=chunk.content[:200],
                            relevance_score=round(score, 3),
                            decision_id=domain,
                        ))
                        all_context.append(f"[{chunk.section_title}] ({chunk.source_path}) [score: {score:.3f}]\n{chunk.content[:500]}")
            except Exception as e:
                logger.warning(f"Domain query '{q}' failed: {e}")

        return "\n\n".join(all_context), vault_sources, citations

    def build_multi_domain_context(self, profile: ClientProfile) -> Dict[str, Tuple[str, List[VaultSource], List[Citation]]]:
        results = {}
        for domain in DOMAINS:
            queries = self._domain_queries(domain, profile)
            ctx, sources, citations = self.query_domain(domain, queries)
            results[domain] = (ctx, sources, citations)
        return results

    def _domain_queries(self, domain: str, profile: ClientProfile) -> List[str]:
        queries = []

        if domain == "training":
            queries.append(f"{profile.goal} training program {profile.experience_years} years experience")
            if profile.injuries:
                for inj in profile.injuries:
                    queries.append(f"training with {inj}")
            queries.append(f"split for {profile.training_days} days training")
            if profile.current_split:
                queries.append(profile.current_split)
            if profile.session_length_min < 45:
                queries.append("efficient short workouts supersets")

        elif domain == "nutrition":
            queries.append(f"{profile.goal} nutrition diet plan")
            if profile.gut_health != "none":
                queries.append(f"gut health {profile.gut_health} diet")
            queries.append(f"protein {profile.bodyweight_kg}kg")
            if profile.supplements:
                queries.append(f"{' '.join(profile.supplements)} supplementation")
            if profile.known_deficiencies:
                queries.append(f"{' '.join(profile.known_deficiencies)} deficiency diet")

        elif domain == "recovery":
            queries.append("sleep optimization recovery")
            if isinstance(profile.sleep_hours, (int, float)) and profile.sleep_hours < 7:
                queries.append(f"improve sleep quality {profile.sleep_hours}h")
            if isinstance(profile.stress_level, (int, float)) and profile.stress_level >= 5:
                queries.append("stress management recovery")
            if profile.work_schedule in ("night", "rotating", "early"):
                queries.append(f"{profile.work_schedule} shift work recovery")
            if isinstance(profile.alcohol_weekly, (int, float)) and profile.alcohol_weekly >= 3:
                queries.append("alcohol recovery impact")

        elif domain == "safety":
            if profile.medical:
                for m in profile.medical:
                    queries.append(f"medical condition {m} exercise")
            if profile.injuries:
                for inj in profile.injuries:
                    queries.append(f"rehab exercise for {inj}")
            if profile.mobility_limitations:
                queries.append(f"{' '.join(profile.mobility_limitations)} mobility exercise")
            if profile.rapid_weight_loss:
                queries.append("rapid weight loss safety")
            if profile.last_bloodwork in ("2yr_plus", "never"):
                queries.append("bloodwork health screening")

        elif domain == "adherence":
            queries.append(f"adherence consistency habit building")
            if profile.situation:
                queries.append(f"{profile.situation} training motivation")
            if profile.work_schedule == "student":
                queries.append("student schedule fitness routine")
            if profile.mental_health_concern in ("moderate", "significant"):
                queries.append("mental health exercise adherence")
            if profile.experience_years <= 1:
                queries.append("beginner habit formation")

        return [q for q in queries if q]

    def all_domain_sources(self, domain_results: Dict) -> List[VaultSource]:
        sources = []
        seen = set()
        for domain, (ctx, domain_sources, citations) in domain_results.items():
            for vs in domain_sources:
                if vs.path not in seen:
                    seen.add(vs.path)
                    sources.append(vs)
        return sources

    def all_domain_citations(self, domain_results: Dict) -> List[Citation]:
        all_c = []
        for domain, (ctx, sources, citations) in domain_results.items():
            all_c.extend(citations)
        return all_c