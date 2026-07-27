from typing import List
from mos_bot.core.models import Citation, VaultSource


class CitationTracker:
    """Tracks vault citations for every program decision.
    Every decision in the program is traceable to specific vault documents.
    """

    def __init__(self):
        self._decisions: dict[str, List[Citation]] = {}

    def record(self, decision_id: str, citation: Citation):
        self._decisions.setdefault(decision_id, []).append(citation)

    def record_many(self, decision_id: str, citations: List[Citation]):
        for c in citations:
            self.record(decision_id, c)

    def get(self, decision_id: str) -> List[Citation]:
        return self._decisions.get(decision_id, [])

    def get_all(self) -> dict[str, List[Citation]]:
        return dict(self._decisions)

    def all_citations(self) -> List[Citation]:
        result = []
        for citations in self._decisions.values():
            result.extend(citations)
        return result

    def from_vault_sources(self, decision_id: str, sources: List[VaultSource], max_count: int = 3):
        for vs in sources[:max_count]:
            self.record(decision_id, Citation(
                vault_path=vs.path,
                vault_title=vs.title,
                snippet=vs.snippet[:200],
                relevance_score=vs.score,
                decision_id=decision_id,
            ))

    def to_markdown(self) -> str:
        lines = []
        for decision_id, citations in self._decisions.items():
            lines.append(f"### {decision_id.replace('_', ' ').title()}")
            for c in citations:
                lines.append(f"- [{c.vault_title}](vault://{c.vault_path}) (score: {c.relevance_score:.2f})")
                if c.snippet:
                    lines.append(f"  > {c.snippet[:150]}")
            lines.append("")
        return "\n".join(lines)

    def section_citations(self, section_id: str) -> List[Citation]:
        prefix = section_id.replace("_", " ")
        results = []
        for decision_id, citations in self._decisions.items():
            if decision_id.startswith(prefix) or prefix in decision_id:
                results.extend(citations)
        return results