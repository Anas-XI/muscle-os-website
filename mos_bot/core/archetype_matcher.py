import os
import logging
from typing import Optional, List, Tuple
from mos_bot.config import VAULT_ROOT
from mos_bot.core.models import ClientProfile, ArchetypeMatch

logger = logging.getLogger(__name__)

ARCHETYPE_DIR = os.path.join(VAULT_ROOT, "07_PROFILES")


class ArchetypeMatcher:
    """Matches a client profile to the closest vault archetype."""

    def __init__(self):
        self._archetypes: List[dict] = []
        self._load_archetypes()

    def _load_archetypes(self):
        if not os.path.isdir(ARCHETYPE_DIR):
            logger.warning(f"Archetype directory not found: {ARCHETYPE_DIR}")
            return
        for fname in os.listdir(ARCHETYPE_DIR):
            if not fname.endswith(".md"):
                continue
            path = os.path.join(ARCHETYPE_DIR, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                name = fname.replace(".md", "").replace(" Profile", "")
                lines = content.split("\n")[:30]
                keywords = " ".join(lines).lower()
                self._archetypes.append({
                    "name": name,
                    "path": os.path.relpath(path, VAULT_ROOT),
                    "content": content,
                    "keywords": keywords,
                })
            except Exception as e:
                logger.warning(f"Failed to read archetype {fname}: {e}")

    def match(self, profile: ClientProfile) -> Optional[ArchetypeMatch]:
        if not self._archetypes:
            return None

        profile_text = self._profile_to_text(profile)
        scored = []
        for arch in self._archetypes:
            score = 0.0
            reasons = []
            keywords = arch["keywords"]

            experience_keywords = {
                0.5: ["beginner", "novice", "less than 1 year", "just starting"],
                2.0: ["intermediate", "1-3 years", "plateaued", "not seeing results"],
                5.0: ["advanced", "3+ years", "experienced"],
            }
            for exp, words in experience_keywords.items():
                if abs(profile.experience_years - exp) < 0.5:
                    for w in words:
                        if w in keywords:
                            score += 15
                            reasons.append(f"Experience ({exp}yrs) matches {w} pattern")
                            break

            goal_keywords = {
                "fat_loss": ["fat loss", "cut", "weight loss", "diet"],
                "hypertrophy": ["hypertrophy", "muscle", "size", "build"],
                "strength": ["strength", "strong", "power"],
                "recomp": ["recomp", "recomposition", "body fat"],
            }
            goal_words = goal_keywords.get(profile.goal.lower(), [])
            for w in goal_words:
                if w in keywords:
                    score += 10
                    reasons.append(f"Goal '{profile.goal}' matches {w}")
                    break

            if profile.situation:
                sit = profile.situation.lower()
                if sit in keywords:
                    score += 12
                    reasons.append(f"Situation '{profile.situation}' matches")

            if profile.work_schedule:
                ws = profile.work_schedule.lower()
                ws_keywords = {"night": "night", "rotating": "rotating", "shift": "shift"}
                for k, v in ws_keywords.items():
                    if k in ws and v in keywords:
                        score += 20
                        reasons.append(f"Work schedule '{ws}' matches {v}")
                        break

            if profile.stress_level >= 7:
                if "stress" in keywords or "high stress" in keywords or "professional" in keywords:
                    score += 10
                    reasons.append("High stress profile matches")

            if profile.sleep_hours < 6.5:
                if "sleep" in keywords or "recovery" in keywords:
                    score += 5
                    reasons.append("Sleep constraint matches")

            if profile.experience_years <= 1:
                if "beginner" in keywords or "novice" in keywords:
                    score += 15
                    reasons.append("Beginner experience matches")

            if profile.alcohol_weekly >= 5:
                if "alcohol" in keywords:
                    score += 5

            if profile.injuries:
                if "injury" in keywords or "rehab" in keywords:
                    score += 8
                    reasons.append("Injury-aware profile matches")

            if profile.gut_health != "none":
                if "gut" in keywords or "digestion" in keywords or "nutrition" in keywords:
                    score += 5

            scored.append((score, arch, reasons))

        scored.sort(key=lambda x: -x[0])
        top_score, top_arch, reasons = scored[0]

        snippets = []
        if top_score > 0:
            content_lines = top_arch["content"].split("\n")
            for i, line in enumerate(content_lines):
                if line.startswith("## ") or line.startswith("### "):
                    snippet_end = "\n".join(content_lines[i:i+6])
                    snippets.append(snippet_end[:300])

        return ArchetypeMatch(
            archetype_name=top_arch["name"],
            archetype_path=top_arch["path"],
            match_score=round(top_score / 100, 2),
            match_reasons=reasons[:5],
            archetype_snippets=snippets[:3],
        )

    def _profile_to_text(self, profile: ClientProfile) -> str:
        parts = [
            f"goal: {profile.goal}",
            f"situation: {profile.situation}",
            f"experience: {profile.experience_years} years",
            f"training days: {profile.training_days}",
            f"age: {profile.age}",
            f"sleep: {profile.sleep_hours}h",
            f"stress: {profile.stress_level}/10",
            f"work schedule: {profile.work_schedule}",
            f"injuries: {profile.injuries}",
        ]
        return " ".join(parts)