<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C63FF,100:3B82F6&height=150&section=header&text=Muscle%20OS&fontSize=50&fontAlignY=30&animation=fadeIn" />
</div>

<h1 align="center">🧠 Muscle OS — AI-Native Fitness Coaching</h1>

<p align="center">
  <strong>Evidence-based, AI-powered coaching system with safety-first design</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12-blue?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram_Bot-API-26A5E4?style=flat-square&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/FAISS-vector_search-FF6F00?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/tests-192_passing-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/knowledge_graph-606_nodes_·_5,448_edges-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/vault_chunks-1,563-8B5CF6?style=flat-square" />
</p>

---

## Overview

Muscle OS is an **AI-native fitness coaching system** built on evidence-based exercise science. It combines deterministic rule engines, semantic search over a curated knowledge vault, and LLM-powered coaching to deliver personalized training and nutrition programs.

### Delivery Channels

| Channel | Status | Stack |
|---------|--------|-------|
| **Telegram Bot** | 🟢 Active (primary) | Python, python-telegram-bot v21, FastAPI |
| **Web UI** | 🟢 Active | FastAPI + vanilla JS, hosted at `muscleos.xyz` |
| **Mobile App** | 🟡 In development | React Native (Expo) + Supabase |
| **Desktop App** | 🟡 In development | React 19 + Electron |

---

## 🏗️ Architecture

```
User Input → Intake (28 questions) → ED Screening → Safety Triage
  → Pillar Assignment → Book Decision Engine (35+ rules)
    → Content Generation → PDF → Check-ins → AI Coach
```

### Core Pipeline

```
safety triage → vault RAG (FAISS + graph expansion)
  → vault signals → pillar assignment
    → book engine → content generation → PDF
```

<details>
<summary><strong>📦 Project Structure</strong></summary>

```
mos_bot/
├── bot.py                 # Entry point, 3 ConversationHandlers
├── config.py              # Environment variables
├── core/                  # Core intelligence
│   ├── analytics.py                   # JSONL event logging
│   ├── archetype_matcher.py          # Vault-based client archetype matching
│   ├── book_engine.py                # 35+ decision rules
│   ├── citation_tracker.py           # Vault citation tracking
│   ├── coach_pipeline.py             # Advanced program generation pipeline
│   ├── constraint_engine.py          # Multi-domain constraint resolution
│   ├── content_generator.py          # Template + vault content generation
│   ├── context_loader.py             # ED screening → safety → pillars
│   ├── intake_builder.py             # Profile building
│   ├── pdf_renderer.py               # Professional PDF with coach branding
│   ├── program_generator.py          # Full program generation pipeline
│   ├── vault_context.py              # Rule-based doc selection
│   ├── vault_graph.py                # Knowledge graph (606 nodes)
│   ├── vault_graph_analysis.py       # Graph stats & analysis
│   ├── vault_orchestrator.py         # Multi-domain vault RAG
│   └── vault_rag.py                  # FAISS + sentence-transformers
├── handlers/             # Telegram conversation handlers
│   ├── start.py
│   ├── intake.py          # 28-question intake (8 screens)
│   ├── checkin.py         # Weekly check-ins
│   ├── coach.py           # AI coach chat
│   ├── admin.py           # Admin commands
│   └── upload_profile.py  # JSON form upload
└── web/                  # Web interfaces
    ├── app.py              # FastAPI server (port 8080)
    ├── coach.html          # Coach review interface
    └── routers/
        ├── coach.py        # Coach API endpoints
        └── ...             # Additional routers
```
</details>

---

## 🧠 Intelligent Systems

### Knowledge Vault
- **Document corpus:** 277 documents spanning exercise science, nutrition, recovery
- **FAISS index:** Semantic search over 1,563 chunked documents via `sentence-transformers`
- **Knowledge graph:** 606 nodes, 5,448 edges — wikilink, same-pillar, and same-category connections
- **Graph-enhanced RAG:** FAISS results expanded via graph traversal for richer context

### Coach Pipeline (New)
Advanced program generation workflow:

1. **Archetype Matching** — Match client profile to vault archetypes (e.g., "Overwhelmed Beginner", "Lifestyle-First Athlete")
2. **Constraint Resolution** — Build a multi-domain constraint graph (safety, medical, injury, lifestyle) with conflict detection and priority-based resolution
3. **Multi-Domain Vault RAG** — Query training, nutrition, recovery, and adherence domains in parallel
4. **LLM Synthesis** — Synthesize deterministic + RAG content into natural language sections
5. **Section-Based Review** — Each program section independently approve/reject/edit with citations

### Safety System
- **ED screening** — 4-question eating disorder screening with automatic evaluation
- **Safety triage** — 9-dimension assessment (cardiac, ortho, ED, psychological, etc.)
- **Constraint graph** — Critical/high/medium/low severity with conflict resolution

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Telegram Bot Token
- FAISS-compatible environment

### Install

```bash
git clone https://github.com/Anas-XI/muscle-os-bot.git
cd muscle-os-bot
pip install -r requirements.txt
```

### Configure

```bash
# Required
export BOT_TOKEN="your_telegram_bot_token"
export LLM_API_KEY="your_llm_key"       # or use LM Studio locally

# Optional (local LLM)
export LM_STUDIO_URL="http://localhost:1234/v1"
```

### Run

```bash
python -m mos_bot.bot
```

### Web UI

```bash
uvicorn mos_bot.web.app:app --host 0.0.0.0 --port 8080
# → http://localhost:8080
```

### Tests

```bash
python -m pytest tests/ -v    # 192 tests
```

---

## 🛡️ Safety First

Muscle OS implements a multi-layer safety system:

1. **ED Screening** — SCOFF-based + custom questions, evaluated via `mos_cli.py`
2. **Safety Triage** — 9-dimension risk assessment before any program generation
3. **Constraint Engine** — Resolves conflicting constraints with priority ordering
4. **Medical Disclaimer** — Every program includes professional medical advice disclaimer

---

## 📊 Status

| Metric | Value |
|--------|-------|
| Tests | ✅ 192 passing |
| Pipeline | ✅ End-to-end: intake → safety → RAG → pillars → Book Engine → content → PDF |
| Web UI | ✅ FastAPI server with profile viewer, coach interface |
| Coach Pipeline | ✅ Archetype matching, constraint graph, multi-domain RAG, section-based review |
| Vault RAG | ✅ FAISS + semantic search + graph expansion |
| Knowledge Graph | ✅ 606 nodes, 5,448 edges, auto-analysis |
| PDF Generation | ✅ Professional cover page, tables, metadata, watermark |
| LLM Integration | ✅ Local (LM Studio) + Cloud API |

---

## 📚 Documentation

- [Book Outline](Muscle%20Operating%20System/00_META/Book%20Outline.md) — Pillars and research
- [PMF Sprint Plan](Muscle%20Operating%20System/00_META/Executive/Escalation%20Plan%20-%20PMF%20Sprint.md)
- [Vault Knowledge Graph](Muscle%20Operating%20System/00_META/Vault%20Knowledge%20Graph.md)
- [Core Engine](Muscle%20Operating%20System/Muscle%20OS%20Core%20Engine.md)
- [Master Protocol](Muscle%20Operating%20System/Master%20Protocol.md)

---

<p align="center">
  <sub>Built with evidence from Schoenfeld, Nippard, NSCA, ACE, ISSA, and IPTA</sub>
  <br/>
  <a href="https://muscleos.xyz">muscleos.xyz</a> &nbsp;·&nbsp;
  <a href="https://github.com/Anas-XI/muscle-os-bot">GitHub</a>
</p>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C63FF,100:3B82F6&height=100&section=footer" />
</div>