"""Vault Knowledge Graph: builds a graph from vault documents for enriched retrieval.

Extracts entities (documents, concepts, pillars, protocols) and relationships
(wikilinks, hierarchy, same-pillar, co-occurrence) from the Muscle OS vault.

The graph is used to enhance FAISS semantic search by expanding from initial
results to find connected documents that pure semantic similarity might miss.
"""

import os
import re
import json
import pickle
from pathlib import Path
from typing import List, Tuple, Dict, Set, Optional, Any
from collections import defaultdict
from dataclasses import dataclass, field


VAULT_ROOT = Path(r"E:\MoS\Muscle Operating System")
INDEX_DIR = Path(r"E:\MoS\mos_bot\data\vault_index")
INDEX_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class GraphNode:
    id: str
    label: str
    node_type: str
    path: str = ""
    pillar: str = ""
    tags: List[str] = field(default_factory=list)
    chunk_count: int = 0


@dataclass
class GraphEdge:
    source: str
    target: str
    edge_type: str
    weight: float = 1.0


class VaultGraph:
    """Knowledge graph over the Muscle OS vault for enriched retrieval."""

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self._adjacency: Dict[str, List[Tuple[str, str, float]]] = defaultdict(list)
        self._node_by_path: Dict[str, str] = {}

    def add_node(self, node: GraphNode):
        self.nodes[node.id] = node
        if node.path:
            norm = node.path.replace("\\", "/")
            stem = norm.replace(".md", "")
            self._node_by_path[norm] = node.id
            self._node_by_path[stem] = node.id
            self._node_by_path[node.id] = node.id

    def add_edge(self, edge: GraphEdge):
        self.edges.append(edge)
        self._adjacency[edge.source].append((edge.target, edge.edge_type, edge.weight))
        self._adjacency[edge.target].append((edge.source, edge.edge_type, edge.weight))

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes.get(node_id)

    def get_node_by_path(self, path: str) -> Optional[GraphNode]:
        norm = path.replace("\\", "/")
        stem = norm.replace(".md", "")
        nid = self._node_by_path.get(norm) or self._node_by_path.get(stem) or self._node_by_path.get(path)
        return self.nodes.get(nid) if nid else None

    def get_neighbors(self, node_id: str, edge_types: Set[str] = None) -> List[Tuple[str, str, float]]:
        neighbors = self._adjacency.get(node_id, [])
        if edge_types:
            return [(n, t, w) for n, t, w in neighbors if t in edge_types]
        return neighbors

    def expand(self, seed_paths: List[str], max_hops: int = 1,
               edge_types: Set[str] = None,
               max_results: int = 8) -> List[Tuple[str, float, str]]:
        """Expand from seed document paths via graph traversal.

        Returns list of (path, score, reason) for connected documents.
        """
        seed_ids = set()
        for sp in seed_paths:
            norm = sp.replace("\\", "/")
            stem = norm.replace(".md", "")
            nid = self._node_by_path.get(norm) or self._node_by_path.get(stem) or self._node_by_path.get(sp)
            if nid:
                seed_ids.add(nid)

        if not seed_ids:
            return []

        visited: Set[str] = set()
        queue: List[Tuple[str, int, float, str]] = [(sid, 0, 1.0, "seed") for sid in seed_ids]
        results: List[Tuple[str, float, str]] = []
        seen_paths: Set[str] = set()

        for nid, hop, score, reason in queue:
            if nid in visited or hop > max_hops:
                continue
            visited.add(nid)

            node = self.get_node(nid)
            if node and node.path:
                if node.path not in seen_paths:
                    seen_paths.add(node.path)
                    if hop > 0:  # Don't return seeds, only their neighbors
                        results.append((node.path, round(score, 3), reason))

            for neighbor, etype, eweight in self.get_neighbors(nid, edge_types):
                decay = score * eweight * (0.8 ** hop)
                reason_str = f"{etype} from {node.label if node else nid}" if hop > 0 else etype
                if neighbor not in visited:
                    queue.append((neighbor, hop + 1, decay, reason_str))

        results.sort(key=lambda x: -x[1])
        return results[:max_results]

    def get_community_subgraph(self, seed_query: str, max_nodes: int = 8) -> List[Dict[str, Any]]:
        """Extract a structured community subgraph around a clinical concept (e.g. 'scoliosis', 'deload', 'rotator cuff')."""
        seed_q = seed_query.lower()
        words = [w for w in seed_q.split() if len(w) > 3]

        seed_nodes = []
        for nid, n in self.nodes.items():
            if seed_q in n.label.lower() or any(seed_q in t.lower() for t in (n.tags or [])):
                seed_nodes.append(nid)
            elif words and any(w in n.label.lower() for w in words):
                seed_nodes.append(nid)

        if not seed_nodes:
            return []

        subgraph = []
        seen_paths = set()

        for s in seed_nodes[:3]:
            n = self.nodes[s]
            if n.path and n.path not in seen_paths:
                seen_paths.add(n.path)
                subgraph.append({
                    "id": n.id,
                    "label": n.label,
                    "node_type": n.node_type,
                    "path": n.path,
                    "pillar": n.pillar,
                    "score": 1.0,
                    "reason": "seed_match",
                })

        seed_paths = [self.nodes[s].path for s in seed_nodes[:4] if self.nodes[s].path]
        expanded = self.expand(
            seed_paths=seed_paths,
            max_hops=2,
            edge_types={"wikilink", "same_pillar", "same_category"},
            max_results=max_nodes
        )

        for path, score, reason in expanded:
            if path not in seen_paths:
                seen_paths.add(path)
                node = self.get_node_by_path(path)
                if node:
                    subgraph.append({
                        "id": node.id,
                        "label": node.label,
                        "node_type": node.node_type,
                        "path": node.path,
                        "pillar": node.pillar,
                        "score": score,
                        "reason": reason,
                    })
                    if len(subgraph) >= max_nodes:
                        break

        return subgraph


def _clean_wikilink(link: str) -> str:
    """Clean a raw wikilink string by stripping aliases, escaped pipes, and heading anchors."""
    target = re.split(r'\\?\|', link)[0]
    target = target.split('#')[0]
    target = target.replace(".md", "").replace("\\", "/").strip()
    return target


def _extract_wikilinks(content: str) -> List[str]:
    return re.findall(r'\[\[([^\]]+)\]\]', content)


def _extract_pillar_from_path(path: Path) -> str:
    parts = path.parts
    for part in parts:
        m = re.search(r'Pillar\s*(\d+)', part)
        if m:
            return f"Pillar {m.group(1)}"
    return ""


def _make_node_id(path: Path) -> str:
    rel = path.relative_to(VAULT_ROOT)
    return str(rel).replace("\\", "/").replace(".md", "")


SKIP_DIRS = {'.git', '__pycache__', '.pytest_cache', 'node_modules', 'sessions',
             '05_JOURNAL', '05_DRAFTS', '06_EXPORTS'}
SKIP_FILES = {'README.md', 'index.md', 'Channel Registry.md'}

CATEGORY_KEYWORDS = {
    "protocol": "protocol", "rehab": "protocol", "posture": "protocol",
    "tool": "tool", "decision tree": "tool", "exercise": "exercise",
    "assessment": "assessment", "research": "research", "study": "research",
    "principle": "principle", "mechanism": "mechanism",
}


def build_vault_graph(force_rebuild: bool = False) -> VaultGraph:
    """Walk the vault and build a knowledge graph from all documents."""
    graph_file = INDEX_DIR / "vault_graph.pkl"

    if not force_rebuild and graph_file.exists():
        with open(graph_file, "rb") as f:
            return pickle.load(f)

    print("Building vault knowledge graph...")
    g = VaultGraph()

    # Add pillar nodes
    for i in range(1, 11):
        g.add_node(GraphNode(
            id=f"pillar_{i}", label=f"Pillar {i}",
            node_type="pillar",
        ))

    # First pass: create document nodes
    doc_paths: List[Path] = []
    for md_file in sorted(VAULT_ROOT.rglob("*.md")):
        parts = md_file.parts
        if any(skip in parts for skip in SKIP_DIRS):
            continue
        if md_file.name in SKIP_FILES or md_file.stat().st_size == 0:
            continue
        doc_paths.append(md_file)

    for md_file in doc_paths:
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        nid = _make_node_id(md_file)
        pillar = _extract_pillar_from_path(md_file)

        node_type = "document"
        rel_path = str(md_file.relative_to(VAULT_ROOT)).lower()
        for keyword, ntype in CATEGORY_KEYWORDS.items():
            if keyword in rel_path:
                node_type = ntype
                break

        g.add_node(GraphNode(
            id=nid, label=md_file.stem,
            node_type=node_type,
            path=str(md_file.relative_to(VAULT_ROOT)),
            pillar=pillar,
        ))

        if pillar:
            pnum = pillar.split()[-1]
            pid = f"pillar_{pnum}"
            if pid in g.nodes:
                g.add_edge(GraphEdge(source=nid, target=pid, edge_type="same_pillar", weight=1.0))

    # Second pass: resolve wikilink edges to actual node IDs with alias/pipe cleaning
    stem_to_nid: Dict[str, str] = {}
    relpath_to_nid: Dict[str, str] = {}
    for nid, node in g.nodes.items():
        stem_to_nid[node.label.lower()] = nid
        relpath_to_nid[nid.lower()] = nid
        if node.path:
            path_clean = node.path.replace("\\", "/").replace(".md", "").lower().strip()
            relpath_to_nid[path_clean] = nid
            stem_to_nid[Path(node.path).stem.lower()] = nid

    seen_wikilink_edges: Set[Tuple[str, str]] = set()

    for md_file in doc_paths:
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue
        nid = _make_node_id(md_file)

        for raw_link in _extract_wikilinks(content):
            cleaned = _clean_wikilink(raw_link)
            if not cleaned:
                continue

            link_key = cleaned.lower()
            stem_key = link_key.split("/")[-1]

            target_nid = (
                relpath_to_nid.get(link_key)
                or stem_to_nid.get(link_key)
                or stem_to_nid.get(stem_key)
            )

            if target_nid and target_nid != nid:
                edge_tuple = (nid, target_nid)
                if edge_tuple not in seen_wikilink_edges:
                    seen_wikilink_edges.add(edge_tuple)
                    g.add_edge(GraphEdge(source=nid, target=target_nid, edge_type="wikilink", weight=2.0))

    # Third pass: same-category edges for sibling docs
    seen_edges: Set[Tuple[str, str, str]] = set()

    def add_unique_edge(source: str, target: str, etype: str, weight: float = 1.0):
        if source == target or source not in g.nodes or target not in g.nodes:
            return
        edge_key = tuple(sorted([source, target])) + (etype,)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            g.add_edge(GraphEdge(source=source, target=target, edge_type=etype, weight=weight))

    category_groups: Dict[str, List[str]] = defaultdict(list)
    for nid, node in g.nodes.items():
        if node.path:
            parent = str(Path(node.path).parent).replace("\\", "/")
            category_groups[parent].append(nid)

    for cat, members in category_groups.items():
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                add_unique_edge(members[i], members[j], "same_category", weight=0.6)

    # Fourth pass: Multi-domain Ontological Cross-linking
    DOMAIN_TAXONOMY = {
        "hypertrophy": ["hypertrophy", "mechanical tension", "muscle growth", "volume landmarks", "progressive overload", "rep in reserve", "rpe"],
        "fat_loss": ["fat loss", "deficit", "tdee", "calorie", "metabolic", "cutting", "recomp"],
        "biomechanics": ["biomechanics", "joint", "shoulder", "spine", "lumbar", "knee", "patellofemoral", "impingement", "kinetic chain", "posture"],
        "nutrition": ["nutrition", "protein", "carbohydrate", "fat", "leucine", "diaas", "supplement", "creatine", "whey", "hydration"],
        "recovery": ["sleep", "circadian", "stress", "allostatic", "fatigue", "overtraining", "readiness", "hrv", "deload"],
        "female_physiology": ["female", "menstrual", "follicular", "luteal", "estrogen", "progesterone", "roar", "stacy sims"],
    }

    domain_nodes: Dict[str, List[str]] = defaultdict(list)
    for nid, node in g.nodes.items():
        if node.node_type == "pillar":
            continue
        search_text = (node.label + " " + node.path).lower()
        for domain, keywords in DOMAIN_TAXONOMY.items():
            if any(kw in search_text for kw in keywords):
                domain_nodes[domain].append(nid)

    for domain, nids in domain_nodes.items():
        for i in range(min(len(nids), 12)):
            for j in range(i + 1, min(len(nids), 12)):
                add_unique_edge(nids[i], nids[j], "domain_ontology", weight=0.8)

    # Fifth pass: Bridge connections for isolated clusters & Pillar 10
    if "pillar_10" in g.nodes:
        for nid in domain_nodes["female_physiology"]:
            add_unique_edge("pillar_10", nid, "same_pillar", weight=1.0)
        add_unique_edge("pillar_10", "pillar_1", "pillar_synergy", weight=0.7)
        add_unique_edge("pillar_10", "pillar_4", "pillar_synergy", weight=0.7)

    for nid, node in g.nodes.items():
        p_lower = node.path.lower()
        if "exercises/hamstrings" in p_lower:
            add_unique_edge(nid, "pillar_4", "exercise_pillar", weight=1.0)
            if "04_PROTOCOLS/Rehab/Hamstring Strain" in g.nodes:
                add_unique_edge(nid, "04_PROTOCOLS/Rehab/Hamstring Strain", "rehab_counterpart", weight=1.2)
            if "04_TOOLS/Default Exercise Pool" in g.nodes:
                add_unique_edge(nid, "04_TOOLS/Default Exercise Pool", "exercise_registry", weight=1.0)
        if "stacy sims" in p_lower or "roar" in p_lower:
            add_unique_edge(nid, "pillar_10", "external_foundation", weight=1.5)
        if "founder's playbook" in p_lower:
            add_unique_edge(nid, "pillar_1", "executive_strategy", weight=1.0)
            add_unique_edge(nid, "00_META/Executive/Stage Assessment - The Founder's Playbook", "executive_strategy", weight=1.5)
        if "exercise template" in p_lower:
            add_unique_edge(nid, "04_TOOLS/Default Exercise Pool", "template_standard", weight=1.0)

    with open(graph_file, "wb") as f:
        pickle.dump(g, f)

    print(f"Built graph: {len(g.nodes)} nodes, {len(g.edges)} edges")
    return g


def expand_faiss_results(faiss_paths: List[str], max_expand: int = 6,
                         max_hops: int = 2,
                         graph: VaultGraph = None) -> List[Tuple[str, float, str]]:
    """Expand FAISS semantic search results using graph relationships up to 2 hops.

    Given paths returned by FAISS, find additional connected documents
    via wikilinks and same-category relationships that pure semantic
    similarity might miss (e.g., a protocol doc linked from a training doc).

    Returns list of (path, score, reason).
    """
    if graph is None:
        graph_file = INDEX_DIR / "vault_graph.pkl"
        if not graph_file.exists():
            return []
        with open(graph_file, "rb") as f:
            graph = pickle.load(f)

    return graph.expand(
        seed_paths=faiss_paths,
        max_hops=max_hops,
        edge_types={"wikilink", "same_category", "same_pillar"},
        max_results=max_expand,
    )
