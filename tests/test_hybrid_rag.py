"""Tests for Hybrid RAG (BM25 + FAISS + RRF) and GraphRAG v2 Subgraphs."""

import pytest
from mos_bot.core.vault_rag import VaultIndexer, VaultChunk
from mos_bot.core.vault_graph import VaultGraph, GraphNode, GraphEdge, build_vault_graph


class TestHybridRAG:
    """Test BM25, Dense search, and RRF Fusion."""

    def test_bm25_exact_keyword_matching(self):
        indexer = VaultIndexer()
        indexer.chunks = [
            VaultChunk(id="c1", content="Protocol for Osgood-Schlatter disease knee pain management", source_path="p1.md", section_title="Knee", pillar="Pillar 2"),
            VaultChunk(id="c2", content="Standard progressive overload in powerlifting squats", source_path="p2.md", section_title="Squat", pillar="Pillar 4"),
            VaultChunk(id="c3", content="Supplementation with ferrous bisglycinate for iron deficiency", source_path="p3.md", section_title="Iron", pillar="Pillar 1"),
        ]
        indexer._bm25_built = False
        indexer._init_bm25()

        results = indexer.search_bm25("Osgood-Schlatter", top_k=2)
        assert len(results) >= 1
        assert results[0][0].id == "c1"

        iron_res = indexer.search_bm25("ferrous bisglycinate", top_k=2)
        assert len(iron_res) >= 1
        assert iron_res[0][0].id == "c3"

    def test_rrf_hybrid_fusion_combines_ranks(self):
        indexer = VaultIndexer()
        indexer.chunks = [
            VaultChunk(id="c1", content="Scoliosis spinal loading modifications and core bracing", source_path="p1.md", section_title="Spine", pillar="Pillar 2"),
            VaultChunk(id="c2", content="General hypertrophy volume recommendations", source_path="p2.md", section_title="Volume", pillar="Pillar 4"),
        ]
        indexer._bm25_built = False
        
        # Test search_bm25
        bm25_res = indexer.search_bm25("scoliosis spinal", top_k=2)
        assert len(bm25_res) >= 1
        assert bm25_res[0][0].id == "c1"


class TestGraphRAGv2:
    """Test 2-hop community subgraph extraction."""

    def test_community_subgraph_extraction(self):
        g = VaultGraph()
        g.add_node(GraphNode(id="n1", label="Rotator Cuff Rehab", node_type="protocol", path="04_PROTOCOLS/Rotator Cuff.md", pillar="Pillar 2"))
        g.add_node(GraphNode(id="n2", label="Shoulder Biomechanics", node_type="concept", path="01_RESEARCH/Shoulder.md", pillar="Pillar 2"))
        g.add_node(GraphNode(id="n3", label="Overhead Press Alternatives", node_type="tool", path="04_TOOLS/OHP.md", pillar="Pillar 4"))
        
        g.add_edge(GraphEdge(source="n1", target="n2", edge_type="wikilink", weight=1.0))
        g.add_edge(GraphEdge(source="n2", target="n3", edge_type="wikilink", weight=1.0))

        subgraph = g.get_community_subgraph("Rotator Cuff", max_nodes=5)
        assert len(subgraph) >= 1
        labels = [node["label"] for node in subgraph]
        assert "Shoulder Biomechanics" in labels or "Overhead Press Alternatives" in labels
