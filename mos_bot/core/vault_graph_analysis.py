"""Vault Graph Analysis: stats, orphan detection, Mermaid export, contradiction scanning."""

import os
import pickle
from pathlib import Path
from collections import Counter, defaultdict
from typing import List, Tuple, Set
from mos_bot.core.vault_graph import VaultGraph, VAULT_ROOT, INDEX_DIR


def load_graph() -> VaultGraph:
    gf = INDEX_DIR / "vault_graph.pkl"
    if not gf.exists():
        raise FileNotFoundError("Run build_vault_graph() first")
    with open(gf, "rb") as f:
        return pickle.load(f)


def graph_stats(g: VaultGraph) -> dict:
    """Compute comprehensive vault graph statistics."""
    type_counts = Counter()
    pillar_counts = Counter()
    degree_counts: List[int] = []
    orphan_docs: List[str] = []
    hub_docs: List[Tuple[str, int]] = []

    for nid, node in g.nodes.items():
        if node.node_type in ("document", "protocol", "tool", "exercise", "assessment", "research", "principle", "mechanism"):
            type_counts[node.node_type] += 1
            if node.pillar:
                pillar_counts[node.pillar] += 1
            degree = len(g._adjacency.get(nid, []))
            degree_counts.append(degree)
            if degree == 0:
                orphan_docs.append(f"{node.label} ({node.path})")

    # Top hubs by degree
    hubs = sorted(
        [(nid, len(g._adjacency.get(nid, []))) for nid, node in g.nodes.items()
         if node.node_type in ("document", "protocol", "tool")],
        key=lambda x: -x[1]
    )[:15]

    return {
        "total_nodes": len(g.nodes),
        "total_edges": len(g.edges),
        "type_breakdown": dict(type_counts.most_common()),
        "pillar_coverage": dict(pillar_counts.most_common()),
        "avg_degree": round(sum(degree_counts) / len(degree_counts), 1) if degree_counts else 0,
        "orphan_count": len(orphan_docs),
        "orphans": orphan_docs[:30],
        "top_hubs": [(g.nodes[nid].label, deg) for nid, deg in hubs],
    }


def find_orphans(g: VaultGraph) -> List[str]:
    """Find documents with zero incoming/outgoing edges."""
    orphans = []
    for nid, node in g.nodes.items():
        if node.node_type == "document" and not g._adjacency.get(nid):
            orphans.append(f"{node.label} ({node.path})")
    return sorted(orphans)


def find_pillar_gaps(g: VaultGraph) -> dict:
    """Identify pillars with few or no documents linked."""
    pillar_docs: dict = defaultdict(list)
    for nid, node in g.nodes.items():
        if node.node_type in ("document", "protocol", "tool", "exercise", "assessment") and node.pillar:
            pillar_docs[node.pillar].append(node.label)

    gaps = {}
    for i in range(1, 11):
        key = f"Pillar {i}"
        if key in pillar_docs:
            gaps[key] = {"count": len(pillar_docs[key]), "docs": pillar_docs[key][:10]}
        else:
            gaps[key] = {"count": 0, "docs": []}
    return gaps


def find_contradictions(g: VaultGraph) -> dict:
    """Detect potential contradictions using structural graph signals.

    Returns dict with:
    - opposite_unlinked: documents with opposite keywords in same dir without cross-link
    - cross_pillar_bridges: documents that connect normally separate pillars
    """
    result = {
        "opposite_unlinked": [],
        "cross_pillar_bridges": [],
    }

    # 1. Opposite-title pairs in same directory
    dir_docs: dict = defaultdict(list)
    for nid, node in g.nodes.items():
        if node.node_type == "document" and node.path:
            parent = os.path.dirname(node.path)
            dir_docs[parent].append((nid, node.label))

    opposite_kw_pairs = [
        ("bulk", "cut"), ("gain", "lose"), ("max", "min"),
        ("increase", "decrease"), ("heavy", "light"),
        ("aggressive", "conservative"),
    ]
    for parent, docs in dir_docs.items():
        for a_nid, a_label in docs:
            for b_nid, b_label in docs:
                if a_nid >= b_nid:
                    continue
                al, bl = a_label.lower(), b_label.lower()
                for a_kw, b_kw in opposite_kw_pairs:
                    if a_kw in al and b_kw in bl:
                        neighbors = {n for n, _, _ in g._adjacency.get(a_nid, [])}
                        if b_nid not in neighbors:
                            result["opposite_unlinked"].append({
                                "a": f"{a_label} ({a_nid})",
                                "b": f"{b_label} ({b_nid})",
                                "detail": f"'{a_kw}' vs '{b_kw}' in same directory without cross-link",
                            })

    # 2. Cross-pillar bridges
    cross_bridges = []
    for nid, node in g.nodes.items():
        if node.node_type != "document":
            continue
        connected_pillars = set()
        for neighbor, etype, _ in g._adjacency.get(nid, []):
            neighbor_node = g.nodes.get(neighbor)
            if neighbor_node and neighbor_node.pillar and neighbor_node.pillar != node.pillar:
                connected_pillars.add(neighbor_node.pillar)
        if len(connected_pillars) >= 2 and node.pillar:
            cross_bridges.append({
                "doc": f"{node.label} ({node.path})",
                "own_pillar": node.pillar,
                "bridges_to": list(connected_pillars),
            })

    result["cross_pillar_bridges"] = cross_bridges[:20]
    return result


def export_mermaid(g: VaultGraph, max_nodes: int = 40) -> str:
    """Export a Mermaid flowchart of the graph's most-connected documents + pillars."""
    lines = ["flowchart TB"]
    lines.append("")

    # Add pillar nodes
    for i in range(1, 11):
        pid = f"pillar_{i}"
        if pid in g.nodes:
            lines.append(f"    P{i}[Pillar {i}]")

    # Find top-N most connected documents
    doc_degrees = [
        (nid, len(g._adjacency.get(nid, [])))
        for nid, node in g.nodes.items()
        if node.node_type in ("document", "protocol", "tool", "exercise", "assessment")
    ]
    doc_degrees.sort(key=lambda x: -x[1])
    top_docs = set(nid for nid, _ in doc_degrees[:max_nodes])

    # Add doc nodes
    doc_labels = {}
    for nid in top_docs:
        node = g.nodes[nid]
        short_label = node.label[:35].replace(" ", "<br>")
        safe_id = nid.replace("/", "_").replace("\\", "_").replace(" ", "_").replace("-", "_")
        doc_labels[nid] = safe_id
        lines.append(f"    {safe_id}[{short_label}]")

    lines.append("")

    # Add edges between top docs and their pillars
    seen_edges = set()
    for nid in top_docs:
        node = g.nodes[nid]
        safe_id = doc_labels[nid]

        # Link to pillar
        if node.pillar:
            pnum = node.pillar.split()[-1]
            edge = (safe_id, f"P{pnum}")
            if edge not in seen_edges:
                seen_edges.add(edge)
                lines.append(f"    {safe_id} --> P{pnum}")

        # Link to top neighbors
        for neighbor, etype, _ in g._adjacency.get(nid, []):
            if neighbor in top_docs and neighbor in doc_labels:
                e1 = (safe_id, doc_labels[neighbor])
                e2 = (doc_labels[neighbor], safe_id)
                if e1 not in seen_edges and e2 not in seen_edges:
                    seen_edges.add(e1)
                    style = " -.->|w| " if etype == "wikilink" else " --> "
                    lines.append(f"    {safe_id}{style}{doc_labels[neighbor]}")

    return "\n".join(lines)


if __name__ == "__main__":
    g = load_graph()
    stats = graph_stats(g)

    report_path = os.path.join(VAULT_ROOT, "00_META", "Vault Knowledge Graph.md")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Vault Knowledge Graph Report\n\n")
        f.write(f"Total nodes: {stats['total_nodes']}  |  Total edges: {stats['total_edges']}  |  Average degree: {stats['avg_degree']}\n\n")

        f.write("## Node Type Breakdown\n\n")
        f.write("| Type | Count |\n|---|---|\n")
        for t, c in stats['type_breakdown'].items():
            f.write(f"| {t} | {c} |\n")

        f.write("\n## Pillar Coverage\n\n")
        f.write("| Pillar | Docs |\n|---|---|\n")
        for p, c in stats['pillar_coverage'].items():
            f.write(f"| {p} | {c} |\n")

        f.write("\n## Top Hubs (most connected docs)\n\n")
        f.write("| Document | Connections |\n|---|---|\n")
        for label, deg in stats['top_hubs']:
            f.write(f"| {label} | {deg} |\n")

        f.write(f"\n## Orphans: {stats['orphan_count']} docs with zero connections\n\n")
        for o in stats['orphans'][:30]:
            f.write(f"- {o}\n")

        f.write("\n## Mermaid Diagram\n\n")
        f.write("```mermaid\n")
        mm = export_mermaid(g)
        f.write(mm)
        f.write("\n```\n\n")
        f.write(f"*Generated from {stats['total_nodes']} nodes, {stats['total_edges']} edges*\n")

    # Append contradiction analysis
    try:
        contra = find_contradictions(g)
        with open(report_path, "a", encoding="utf-8") as f:
            f.write("\n## Contradiction Analysis\n\n")

            cb = contra["cross_pillar_bridges"]
            f.write(f"### Cross-Pillar Bridges ({len(cb)})\n\n")
            f.write("Documents that connect normally separate pillars.\n\n")
            f.write("| Document | Own Pillar | Bridges To |\n|---|---|---|\n")
            for b in cb:
                f.write(f"| {b['doc']} | {b['own_pillar']} | {'; '.join(b['bridges_to'])} |\n")
            f.write("\n")

            ol = contra["opposite_unlinked"]
            f.write(f"### Opposite Unlinked Pairs ({len(ol)})\n\n")
            f.write("Documents in the same directory with opposite keywords but no cross-link.\n\n")
            for pair in ol:
                f.write(f"- {pair['a']}  ↔  {pair['b']}\n")
                f.write(f"  *{pair['detail']}*\n\n")

    except Exception as e:
        print(f"Warning: contradiction analysis failed: {e}")

    print(f"Report saved to: {report_path}")
    print(f"\nQuick stats: {stats['total_nodes']} nodes, {stats['total_edges']} edges, {stats['orphan_count']} orphans")
    print(f"Top hub: {stats['top_hubs'][0][0]} ({stats['top_hubs'][0][1]} connections)")
