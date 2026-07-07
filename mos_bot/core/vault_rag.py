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
from sentence_transformers import SentenceTransformer
import faiss

VAULT_ROOT = Path(r"E:\MoS\Muscle Operating System")
INDEX_DIR = Path(r"E:\MoS\mos_bot\data\vault_index")
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
        self.model = SentenceTransformer(model_name)
        self.chunks: List[VaultChunk] = []
        self.index: Optional[faiss.Index] = None
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

    def extract_pillar(self, path: Path) -> Optional[str]:
        """Determine which pillar this document belongs to"""
        parts = path.parts
        for part in parts:
            if part.startswith('Pillar') and 'Pillar' in part:
                match = re.search(r'Pillar\s*(\d+)', part)
                if match:
                    return f"Pillar {match.group(1)}"
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
            pillar = self.extract_pillar(md_file)
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

    def load_index(self):
        """Load index and chunks from disk"""
        self.index = faiss.read_index(str(INDEX_DIR / "faiss_index.bin"))
        with open(INDEX_DIR / "chunks.pkl", 'rb') as f:
            self.chunks = pickle.load(f)
        # Re-encode for verification (optional, skip for speed)
        # self.embeddings = self.model.encode([c.content for c in self.chunks])

    def search(self, query: str, top_k: int = 10, filter_pillar: Optional[str] = None,
               filter_tags: Optional[List[str]] = None) -> List[Tuple[VaultChunk, float]]:
        """Semantic search over vault chunks"""
        if self.index is None:
            self.load_index()

        query_emb = self.model.encode([query]).astype('float32')
        faiss.normalize_L2(query_emb)

        # Search more than needed for filtering
        search_k = min(top_k * 5, len(self.chunks))
        scores, indices = self.index.search(query_emb, search_k)

        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:
                continue
            chunk = self.chunks[idx]

            # Apply filters
            if filter_pillar and chunk.pillar != filter_pillar:
                continue
            if filter_tags and not any(tag in chunk.tags for tag in filter_tags):
                continue

            results.append((chunk, float(score)))
            if len(results) >= top_k:
                break

        return results

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

        unique_results.sort(key=lambda x: x[1], reverse=True)
        unique_results = unique_results[:max_chunks]

        if not unique_results:
            return "No relevant vault content found."

        context_parts = ["=== VAULT CONTEXT ==="]
        for chunk, score in unique_results:
            context_parts.append(f"\n--- {chunk.section_title} (from {chunk.source_path}) [score: {score:.3f}] ---")
            context_parts.append(chunk.content[:1500])  # Limit chunk size

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