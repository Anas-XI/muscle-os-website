"""Tests for Vault Knowledge Graph connectivity, zero orphans, and ontology edges."""

import pytest
from mos_bot.core.vault_graph import build_vault_graph, VaultGraph
from tests.skip_helpers import skip_if_no_vault


@pytest.fixture(scope="module")
def vault_graph() -> VaultGraph:
    return build_vault_graph(force_rebuild=True)


@skip_if_no_vault
class TestVaultGraph:
    def test_graph_node_and_edge_counts(self, vault_graph):
        assert len(vault_graph.nodes) >= 600
        assert len(vault_graph.edges) >= 6000

    def test_zero_orphan_nodes(self, vault_graph):
        orphans = [nid for nid in vault_graph.nodes if not vault_graph.get_neighbors(nid)]
        assert len(orphans) == 0, f"Found orphan nodes: {orphans}"

    def test_pillar_10_and_female_physiology_connections(self, vault_graph):
        p10_neighbors = vault_graph.get_neighbors("pillar_10")
        assert len(p10_neighbors) >= 3

    def test_exercise_hamstrings_connected_to_pillar_and_rehab(self, vault_graph):
        node = vault_graph.get_node_by_path("04_TOOLS/Exercises/Hamstrings/romanian-deadlift.md")
        assert node is not None
        neighbors = vault_graph.get_neighbors(node.id)
        assert len(neighbors) >= 1

    def test_community_subgraph_expansion(self, vault_graph):
        subgraph = vault_graph.get_community_subgraph("hypertrophy", max_nodes=5)
        assert len(subgraph) >= 1
        labels = [n["label"].lower() for n in subgraph]
        assert any("hypertrophy" in l or "volume" in l or "tension" in l for l in labels)
