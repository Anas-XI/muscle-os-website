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
from typing import List, Tuple, Dict, Set, Optional
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
            self._node_by_path[node.path] = node.id

    def add_edge(self, edge: GraphEdge):
        self.edges.append(edge)
        self._adjacency[edge.source].append((edge.target, edge.edge_type, edge.weight))
        self._adjacency[edge.target].append((edge.source, edge.edge_type, edge.weight))

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes.get(node_id)

    def get_node_by_path(self, path: str) -> Optional[GraphNode]:
        nid = self._node_by_path.get(path)
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
            clean = sp.replace("\\", "/").replace(".md", "")
            nid = self._node_by_path.get(clean)
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

        for link in _extract_wikilinks(content):
            clean_link = link.replace(".md", "").replace("\\", "/")
            g.add_edge(GraphEdge(source=nid, target=f"doc:{clean_link}",
                                 edge_type="wikilink", weight=2.0))

    # Second pass: resolve wikilink edges to actual node IDs
    stem_to_nid: Dict[str, str] = {}
    for nid, node in g.nodes.items():
        stem_to_nid[node.label.lower()] = nid
        path_stem = Path(node.path).stem.lower() if node.path else ""
        if path_stem:
            stem_to_nid[path_stem] = nid

    for md_file in doc_paths:
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue
        nid = _make_node_id(md_file)

        for link in _extract_wikilinks(content):
            link_clean = link.replace(".md", "").replace("\\", "/")
            link_key = link_clean.lower()
            target_nid = stem_to_nid.get(link_key)

            if target_nid and target_nid != nid:
                g._adjacency[nid] = [(t, ty, w) for t, ty, w in g._adjacency[nid]
                                     if not (t == f"doc:{link}" and ty == "wikilink")]
                g._adjacency[target_nid] = [(t, ty, w) for t, ty, w in g._adjacency[target_nid]
                                            if not (t == nid and ty == "wikilink")]
                g.edges = [e for e in g.edges
                           if not (e.source == nid and e.target == f"doc:{link}" and e.edge_type == "wikilink")]
                g.add_edge(GraphEdge(source=nid, target=target_nid, edge_type="wikilink", weight=2.0))

    # Third pass: same-category edges for sibling docs
    category_groups: Dict[str, List[str]] = defaultdict(list)
    for nid, node in g.nodes.items():
        if node.node_type == "document":
            parent = os.path.dirname(node.path)
            category_groups[parent].append(nid)

    for cat, members in category_groups.items():
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                if members[i] != members[j]:
                    g.add_edge(GraphEdge(source=members[i], target=members[j],
                                         edge_type="same_category", weight=0.5))

    with open(graph_file, "wb") as f:
        pickle.dump(g, f)

    print(f"Built graph: {len(g.nodes)} nodes, {len(g.edges)} edges")
    return g


def expand_faiss_results(faiss_paths: List[str], max_expand: int = 6,
                         graph: VaultGraph = None) -> List[Tuple[str, float, str]]:
    """Expand FAISS semantic search results using graph relationships.

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
        max_hops=1,
        edge_types={"wikilink", "same_category", "same_pillar"},
        max_results=max_expand,
    )
