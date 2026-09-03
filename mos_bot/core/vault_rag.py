"""
Vault RAG System for Muscle OS
Indexes the Muscle Operating System vault for semantic retrieval during program generation.
"""
import os
import re
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

import numpy as np
import math
from collections import defaultdict, Counter
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

try:
    import faiss
except ImportError:
    faiss = None

from mos_bot.config import VAULT_ROOT as _CONFIG_VAULT_ROOT, DATA_ROOT as _CONFIG_DATA_ROOT

VAULT_ROOT = Path(_CONFIG_VAULT_ROOT)
INDEX_DIR = Path(_CONFIG_DATA_ROOT) / "vault_index"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # Fast, 384-dim
CHUNK_SIZE = 500  # tokens approx
CHUNK_OVERLAP = 50


@dataclass
class VaultChunk:
    """A chunk of vault content with metadata"""
    id: str
    content: str
    source_path: str
    section_title: str
    pillar: Optional[str] = None
    tags: List[str] = None
    created_at: str = ""

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if not self.created_at:
            self.created_at = datetime.now().isoformat()


class VaultIndexer:
    """Indexes the Muscle OS vault for RAG retrieval"""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model = SentenceTransformer(model_name) if SentenceTransformer is not None else None
        self.chunks: List[VaultChunk] = []
        self.index: Any = None
        self.embeddings: Optional[np.ndarray] = None

    def should_index(self, path: Path) -> bool:
        """Filter files worth indexing"""
        skip_dirs = {'.git', '__pycache__', '.pytest_cache', 'node_modules', 'sessions', '05_JOURNAL', '05_DRAFTS', '06_EXPORTS'}
        skip_files = {'README.md', 'index.md', 'Channel Registry.md', 'Book Registry.md'}

        if any(part in skip_dirs for part in path.parts):
            return False
        if path.name in skip_files:
            return False
        if path.stat().st_size == 0:
            return False
        return True

    def extract_section_title(self, content: str, filepath: Path) -> str:
        """Extract the main section title from markdown"""
        lines = content.split('\n')
        for line in lines[:20]:
            if line.startswith('# '):
                return line[2:].strip()
            if line.startswith('## ') and not line.startswith('###'):
                return line[3:].strip()
        return filepath.stem

    def extract_pillar(self, path: Path, content: str = "") -> Optional[str]:
        """Determine which pillar this document belongs to via path, filename, or content."""
        path_str = str(path).lower()

        # Direct Pillar X in path or filename
        match = re.search(r'pillar\s*(\d+)', path_str)
        if match:
            return f"Pillar {match.group(1)}"

        # Folder / File keyword mappings
        filename = path.stem.lower()

        # Pillar 1 - Diet
        if any(k in path_str for k in ["food database", "nutrition", "diet", "calorie", "protein", "macronutrient", "bulking", "cutting", "fat loss", "refeed", "reverse diet"]):
            return "Pillar 1"

        # Pillar 2 - Training
        if any(k in path_str for k in ["exercises", "exercise index", "training", "hypertrophy", "split", "volume", "muscle ladder", "schoenfeld", "progressive overload"]):
            return "Pillar 2"

        # Pillar 3 - Sleep
        if any(k in path_str for k in ["sleep", "circadian", "melatonin", "shift work"]):
            return "Pillar 3"

        # Pillar 4 - Recovery & Rehab
        if any(k in path_str for k in ["rehab", "recovery", "mobility", "posture", "injury", "rotator cuff", "knee", "patellar", "sciatica", "scoliosis", "neck"]):
            return "Pillar 4"

        # Pillar 5 - Strength
        if any(k in path_str for k in ["strength", "1rm", "powerlifting", "rate of force"]):
            return "Pillar 5"

        # Pillar 6 - Fatigue & Deload
        if any(k in path_str for k in ["deload", "fatigue", "overreaching", "overtraining", "allostatic"]):
            return "Pillar 6"

        # Pillar 7 - Adherence
        if any(k in path_str for k in ["gentle entry", "adherence", "habit", "consistency", "psychology"]):
            return "Pillar 7"

        # Pillar 8 - Individualization & Profiles
        if any(k in path_str for k in ["07_profiles", "individualization", "biomechanics", "female physiology", "masters athlete", "profile"]):
            return "Pillar 8"

        # Pillar 9 - Measurement & Assessments
        if any(k in path_str for k in ["03_assessments", "measurement", "tracking", "calculator", "biofeedback", "bloodwork"]):
            return "Pillar 9"

        # Pillar 10 - Integration & Systems
        if any(k in path_str for k in ["05_systems", "06_synergy", "integration", "core engine", "master protocol", "periodization"]):
            return "Pillar 10"

        # Content-based fallback if content is available
        if content:
            cl = content[:1500].lower()
            if "diet" in cl or "protein" in cl or "calorie" in cl:
                return "Pillar 1"
            if "hypertrophy" in cl or "exercise" in cl or "reps" in cl:
                return "Pillar 2"
            if "sleep" in cl or "circadian" in cl:
                return "Pillar 3"
            if "rehab" in cl or "injury" in cl or "mobility" in cl:
                return "Pillar 4"
            if "strength" in cl or "1rm" in cl:
                return "Pillar 5"
            if "deload" in cl or "fatigue" in cl:
                return "Pillar 6"
            if "adherence" in cl or "habit" in cl:
                return "Pillar 7"

        return None

    def extract_tags(self, content: str, path: Path) -> List[str]:
        """Extract tags from content and path"""
        tags = []

        # Path-based tags
        for part in path.parts:
            if part.startswith('0') and '_' in part:
                tag = part.split('_', 1)[1].lower().replace(' ', '-')
                tags.append(tag)

        # Content-based tags
        content_lower = content.lower()
        tag_keywords = {
            'beginner': 'beginner',
            'novice': 'novice',
            'intermediate': 'intermediate',
            'advanced': 'advanced',
            'hypertrophy': 'hypertrophy',
            'strength': 'strength',
            'fat loss': 'fat-loss',
            'recomp': 'recomp',
            'nutrition': 'nutrition',
            'diet': 'nutrition',
            'sleep': 'sleep',
            'recovery': 'recovery',
            'fatigue': 'fatigue',
            'adherence': 'adherence',
            'individualization': 'individualization',
            'measurement': 'measurement',
            'protocol': 'protocol',
            'exercise': 'exercise',
            'injury': 'injury',
            'prehab': 'prehab',
            'rehab': 'rehab',
            'osgood': 'osgood-schlatter',
            'scoliosis': 'scoliosis',
            'neck': 'neck-mobility',
            'binge': 'binge-eating',
            'eating disorder': 'eating-disorder',
            'gentle entry': 'gentle-entry',
            'volume': 'volume',
            'periodization': 'periodization',
            'deload': 'deload',
            'rir': 'rir',
            'rpe': 'rpe',
            'progressive overload': 'progressive-overload',
        }
        for keyword, tag in tag_keywords.items():
            if keyword in content_lower:
                tags.append(tag)

        return list(set(tags))

    def chunk_text(self, text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
        """Split text into overlapping chunks by paragraphs"""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        chunks = []
        current_chunk = []
        current_size = 0

        for para in paragraphs:
            para_size = len(para.split())
            if current_size + para_size > chunk_size and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                # Keep overlap
                overlap_text = '\n\n'.join(current_chunk).split()[-overlap:]
                current_chunk = [' '.join(overlap_text)]
                current_size = len(overlap_text)
            current_chunk.append(para)
            current_size += para_size

        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

        return chunks

    def index_vault(self, force_rebuild: bool = False) -> int:
        """Walk vault and create chunks with embeddings"""
        index_file = INDEX_DIR / "faiss_index.bin"
        chunks_file = INDEX_DIR / "chunks.pkl"
        meta_file = INDEX_DIR / "meta.json"

        if not force_rebuild and index_file.exists() and chunks_file.exists():
            print("Loading existing index...")
            self.load_index()
            return len(self.chunks)

        print("Indexing vault...")
        self.chunks = []
        chunk_id = 0

        for md_file in VAULT_ROOT.rglob("*.md"):
            if not self.should_index(md_file):
                continue

            try:
                content = md_file.read_text(encoding='utf-8')
            except Exception as e:
                print(f"Error reading {md_file}: {e}")
                continue

            section_title = self.extract_section_title(content, md_file)
            pillar = self.extract_pillar(md_file, content)
            tags = self.extract_tags(content, md_file)
            rel_path = md_file.relative_to(VAULT_ROOT)

            # Chunk the content
            text_chunks = self.chunk_text(content)

            for i, chunk_text in enumerate(text_chunks):
                chunk = VaultChunk(
                    id=f"{rel_path}_{i}",
                    content=chunk_text,
                    source_path=str(rel_path),
                    section_title=section_title,
                    pillar=pillar,
                    tags=tags,
                )
                self.chunks.append(chunk)
                chunk_id += 1

        print(f"Created {len(self.chunks)} chunks from vault")

        # Create embeddings
        print("Generating embeddings...")
        texts = [c.content for c in self.chunks]
        self.embeddings = self.model.encode(texts, show_progress_bar=True, batch_size=32)
        self.embeddings = self.embeddings.astype('float32')

        # Build FAISS index
        print("Building FAISS index...")
        dim = self.embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)  # Inner product for cosine similarity
        faiss.normalize_L2(self.embeddings)
        self.index.add(self.embeddings)

        # Save
        self.save_index()
        return len(self.chunks)

    def save_index(self):
        """Persist index and chunks to disk"""
        faiss.write_index(self.index, str(INDEX_DIR / "faiss_index.bin"))
        with open(INDEX_DIR / "chunks.pkl", 'wb') as f:
            pickle.dump(self.chunks, f)
        with open(INDEX_DIR / "meta.json", 'w') as f:
            json.dump({
                'num_chunks': len(self.chunks),
                'embedding_model': EMBEDDING_MODEL,
                'dimension': self.embeddings.shape[1] if self.embeddings is not None else 0,
                'created_at': datetime.now().isoformat(),
            }, f, indent=2)

    def load_index(self, index_dir: Optional[Path] = None):
        """Load index and chunks from disk"""
        target_dir = index_dir or INDEX_DIR
        self.index = faiss.read_index(str(target_dir / "faiss_index.bin"))
        with open(target_dir / "chunks.pkl", 'rb') as f:
            self.chunks = pickle.load(f)

    def load(self, index_dir: Optional[Path] = None):
        """Alias for load_index for backward compatibility"""
        self.load_index(index_dir)

    def _init_bm25(self):
        """Build or verify in-memory BM25 lexical index over chunks."""
        if hasattr(self, "_bm25_built") and self._bm25_built:
            return

        import math
        self._doc_lengths = []
        self._tf = []  # List of Counter per doc
        self._df = defaultdict(int)  # Document frequencies per term
        self._num_docs = len(self.chunks)

        for chunk in self.chunks:
            tokens = re.findall(r'\b[a-zA-Z0-9_\-]+\b', chunk.content.lower())
            self._doc_lengths.append(len(tokens))
            term_counts = Counter(tokens)
            self._tf.append(term_counts)
            for t in term_counts:
                self._df[t] += 1

        self._avg_doc_len = (sum(self._doc_lengths) / self._num_docs) if self._num_docs > 0 else 1.0
        self._bm25_built = True

    def search_bm25(self, query: str, top_k: int = 20, filter_pillar: Optional[str] = None,
                    filter_tags: Optional[List[str]] = None) -> List[Tuple[VaultChunk, float]]:
        """Lexical BM25 search for exact term matching."""
        if not self.chunks:
            self.load_index()
        self._init_bm25()

        query_tokens = re.findall(r'\b[a-zA-Z0-9_\-]+\b', query.lower())
        if not query_tokens or self._num_docs == 0:
            return []

        k1 = 1.5
        b = 0.75
        scores = []

        for idx, chunk in enumerate(self.chunks):
            # Apply filters
            if filter_pillar and chunk.pillar and filter_pillar.lower() not in chunk.pillar.lower():
                continue
            if filter_tags and not any(tag in chunk.tags for tag in filter_tags):
                continue

            doc_len = self._doc_lengths[idx]
            tf_map = self._tf[idx]
            doc_score = 0.0

            for q in query_tokens:
                if q in tf_map:
                    freq = tf_map[q]
                    df = self._df.get(q, 0)
                    idf = max(0.1, math.log((self._num_docs - df + 0.5) / (df + 0.5) + 1.0))
                    numerator = freq * (k1 + 1)
                    denominator = freq + k1 * (1 - b + b * (doc_len / self._avg_doc_len))
                    doc_score += idf * (numerator / denominator)

            if doc_score > 0:
                scores.append((chunk, doc_score))

        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]

    def search_dense(self, query: str, top_k: int = 20,
                     filter_pillar: Optional[str] = None,
                     filter_tags: Optional[List[str]] = None) -> List[Tuple[VaultChunk, float]]:
        """Pure dense semantic search via FAISS embeddings."""
        if self.index is None:
            self.load_index()

        query_emb = self.model.encode([query]).astype('float32')
        faiss.normalize_L2(query_emb)

        search_k = min(top_k * 5, len(self.chunks))
        scores, indices = self.index.search(query_emb, search_k)

        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:
                continue
            chunk = self.chunks[idx]

            if filter_pillar and chunk.pillar and filter_pillar.lower() not in chunk.pillar.lower():
                continue
            if filter_tags and not any(tag in chunk.tags for tag in filter_tags):
                continue

            results.append((chunk, float(score)))
            if len(results) >= top_k:
                break

        return results

    def search(self, query: str, top_k: int = 10, k: Optional[int] = None,
               filter_pillar: Optional[str] = None,
               filter_tags: Optional[List[str]] = None) -> List[Tuple[VaultChunk, float]]:
        """Hybrid search combining Dense FAISS + Sparse BM25 via Reciprocal Rank Fusion (RRF)."""
        if k is not None:
            top_k = k

        dense_results = self.search_dense(query, top_k=top_k * 3, filter_pillar=filter_pillar, filter_tags=filter_tags)
        bm25_results = self.search_bm25(query, top_k=top_k * 3, filter_pillar=filter_pillar, filter_tags=filter_tags)

        # Reciprocal Rank Fusion (RRF) with constant 60
        rrf_scores = defaultdict(float)
        chunk_map = {}

        for rank, (chunk, score) in enumerate(dense_results):
            rrf_scores[chunk.id] += 1.0 / (60.0 + rank + 1)
            chunk_map[chunk.id] = chunk

        for rank, (chunk, score) in enumerate(bm25_results):
            rrf_scores[chunk.id] += 1.0 / (60.0 + rank + 1)
            chunk_map[chunk.id] = chunk

        fused = [(chunk_map[cid], rrf_score) for cid, rrf_score in rrf_scores.items()]
        fused.sort(key=lambda x: -x[1])
        return fused[:top_k]

    def get_relevant_context(self, query: str, max_chunks: int = 8,
                             pillars: Optional[List[str]] = None) -> str:
        """Get formatted context for LLM prompt"""
        all_results = []
        if pillars:
            for pillar in pillars:
                results = self.search(query, top_k=3, filter_pillar=pillar)
                all_results.extend(results)
        else:
            all_results = self.search(query, top_k=max_chunks)

        # Deduplicate by source_path
        seen = set()
        unique_results = []
        for chunk, score in all_results:
            if chunk.source_path not in seen:
                seen.add(chunk.source_path)
                unique_results.append((chunk, score))

        unique_results.sort(key=lambda x: -x[1])
        unique_results = unique_results[:max_chunks]

        if not unique_results:
            return "No relevant vault content found."

        context_parts = ["=== VAULT CONTEXT (HYBRID RAG) ==="]
        for chunk, score in unique_results:
            pillar_tag = f" [{chunk.pillar}]" if chunk.pillar else ""
            context_parts.append(f"\n--- {chunk.section_title}{pillar_tag} (from {chunk.source_path}) [RRF score: {score:.4f}] ---")
            context_parts.append(chunk.content[:1500])

        return '\n'.join(context_parts)


def build_vault_index(force: bool = False) -> VaultIndexer:
    """Convenience function to build/load the vault index"""
    indexer = VaultIndexer()
    indexer.index_vault(force_rebuild=force)
    return indexer


if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    idx = build_vault_index(force=force)
    print(f"Indexed {len(idx.chunks)} chunks")

    # Test search
    test_queries = [
        "beginner progression system",
        "osgood schlatter knee modification",
        "binge eating gentle entry protocol",
        "recomp nutrition carb cycling",
        "sleep hygiene protocol",
    ]
    for q in test_queries:
        print(f"\nQuery: {q}")
        results = idx.search(q, top_k=3)
        for chunk, score in results:
            print(f"  [{score:.3f}] {chunk.section_title} ({chunk.source_path})")