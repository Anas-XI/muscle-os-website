# Muscle OS — Project Context

## Overview
Muscle OS is an AI-native fitness coaching system. It delivers through:
1. **Web App & Interactive Tools** (Responsive HTML/JS: TDEE Adaptive Engine, Training App, Workout Tracker, Coach Chat)
2. **Mobile App** (React Native / Expo in `mos-mobile/`)
3. **Desktop App** (TypeScript/React/Electron)

## Backend & Core Architecture (FastAPI + mos_bot/core/)
The backend runs via **FastAPI** (`mos_bot/web/app.py` via `uvicorn`) powered by the deterministic core decision engine in `mos_bot/core/`.

```
mos_bot/
├── bot.py                 # Entry point, wires 3 ConversationHandlers
├── config.py              # Env vars: BOT_TOKEN, LLM_API_KEY, LM_STUDIO_URL, VAULT_ROOT
├── states.py              # All Telegram state constants (range(37))
├── core/
│   ├── analytics.py       # JSONL event logging
│   ├── context_loader.py  # ED screening → safety triage → pillar assignment → vault RAG
│   ├── content_generator.py  # Deterministic program, nutrition, structure from templates + vault
│   ├── program_generator.py  # Pipeline: safety → vault RAG → vault_signals → pillars → book → content → PDF
│   ├── book_engine.py     # BookDecisionEngine: 35+ decision rules from Schoenfeld, Nippard, NSCA, ACE, ISSA, IPTA
│   ├── vault_rag.py       # FAISS + sentence-transformers semantic search over 1563 vault chunks
│   ├── vault_graph.py     # Knowledge graph (606 nodes, 5448 edges) for graph-enhanced RAG expansion
│   ├── vault_graph_analysis.py  # Stats, orphans, contradictions, Mermaid export
│   ├── vault_context.py   # Rule-based doc selection (legacy, complementary to RAG)
│   ├── intake_builder.py  # Profile building, weight/height parsing
│   └── pdf_renderer.py    # Markdown → PDF via fpdf2
├── handlers/
│   ├── start.py           # /start, /intake, /help, /cancel
│   ├── intake.py          # 28-question conversational intake (8 screens)
│   ├── upload_profile.py  # JSON form upload
│   ├── checkin.py         # Weekly check-in (weight, sleep, readiness, etc.)
│   ├── coach.py           # AI coach chat via LLM
│   └── admin.py           # /status, /users (owner-only)
├── web/
│   ├── app.py             # FastAPI server (port 8080)
│   └── index.html         # Single-page web UI
└── data/                  # Runtime data (gitignored)
    ├── users/             # JSON profiles
    ├── programs/          # Generated markdown programs
    ├── pdfs/              # Generated PDF programs
    ├── checkins/          # Check-in records (JSON)
    ├── analytics/         # Events (JSONL)
    └── vault_index/       # FAISS index + graph cache (pkl)
```

## Pipeline Order (program_generator.py)

```
safety triage (run_safety_triage)
  → vault RAG (_build_vault_context: FAISS semantic search + graph expansion)
    → vault signals (_extract_vault_signals: pillar scores, nutrition/training/recovery guidance)
      → pillar assignment (assign_pillars: vault-informed)
        → book engine (BookDecisionEngine: 35+ rules)
          → content generation (generate_program: vault-informed templates)
```

Vault RAG runs **before** pillar assignment so vault signals can influence which pillars are selected. Graph expansion after FAISS finds connected docs via wikilinks, same-pillar, and same-category edges.

## Key State Machine Flow (intake.py)

The intake conversation has exactly **8 screens** covering 28 questions. States are defined sequentially in `states.py` (0-36). **Every handler must return the state constant for the question it just sent.**

```
start → GOAL → SITUATION → EXPERIENCE → WEIGHT → HEIGHT → AGE → TRAINING_DAYS
→ SESSION_LENGTH → CURRENT_SPLIT → INJURIES → GUT_HEALTH → SLEEP → STRESS
→ STEPS → CAFFEINE → SUPPLEMENTS → MEDICAL → ED_SCREENING_1 → ED_SCREENING_2
→ ED_SCREENING_3 → ED_SCREENING_4 → evaluate → HYDRATION → ALCOHOL_WEEKLY
→ WORK_SCHEDULE → MOBILITY → BLOODWORK → MENTAL_HEALTH → CONFIRM_PROFILE → END
```

**Critical:** If you edit any handler, update both the send_question call AND the return state to match.

## Vault Knowledge Graph

The vault has a knowledge graph at `mos_bot/core/vault_graph.py` with 606 nodes and 5448 edges.

**Node types**: document (277), tool (160), protocol (65), research (61), principle (12), assessment (11), mechanism (7), exercise (3), pillar (10)

**Edge types**: wikilink (2.0 weight), same_pillar (1.0), same_category (0.5)

**Graph expansion**: After FAISS semantic search returns top documents, `expand_faiss_results()` follows wikilinks and category edges to find structurally connected documents that pure semantic similarity might miss. Results are appended to vault_context with reduced scores.

**Rebuild**: Graph auto-builds on first access and caches to `data/vault_index/vault_graph.pkl`. Force rebuild with `build_vault_graph(force_rebuild=True)`.

**Analysis**: Run `python -m mos_bot.core.vault_graph_analysis` to regenerate the graph report at `00_META/Vault Knowledge Graph.md`.

## Conventions

- **Imports:** Relative within `mos_bot`, absolute for external modules
- **Config:** All secrets/settings from `config.py` via `os.getenv()` — never hardcoded
- **Analytics:** Every new user-facing action should call `track()` from `mos_bot.core.analytics`
- **Free-text inputs:** Always sanitize with `_sanitize_text()` from `intake.py`
- **LLM:** Two modes — local (LM Studio at LM_STUDIO_URL) or cloud (LLM_API_URL + LLM_API_KEY)
- **Tests:** Run with `python -m pytest tests/` — all 192 should pass

## External Dependencies (root level)

- `checkin_tracker.py` — check-in persistence + trend analysis
- `chatbot.py` — LLM chat completion (imported by coach handler)
- `coaching_mode.py` — system prompt for coach
- `mos_cli.py` — ED screening evaluation

## Vault Reference

The knowledge base is at `Muscle Operating System/`. Key entry points:
- `Muscle OS Core Engine.md` — decision-making cycle
- `Master Protocol.md` — 10 pillars at MED/Overkill tiers
- `USER_GUIDE.md` — how to run the CLI
- `00_META/Executive/Escalation Plan - PMF Sprint.md` — current execution plan
- `00_META/Book Outline.md` — completed pillars and research
- `00_META/Vault Knowledge Graph.md` — auto-generated graph report
