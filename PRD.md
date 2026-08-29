> **Note:** See [MOS_PRODUCTS_MASTER_SPECIFICATION.md](./MOS_PRODUCTS_MASTER_SPECIFICATION.md) for the exhaustive product-by-product technical specification and post-optimization PRD.

# Muscle OS — Product Requirements Document (All Projects)

**Version:** 1.0 — snapshot of everything built so far
**Owner:** Coach Anas Mo'men
**Stage:** Pre-PMF / Late MVP (building done, validation starting — see `Muscle Operating System/00_META/Executive/Escalation Plan - PMF Sprint.md`)

---

## 1. Executive Summary

Muscle OS is an **AI-native, evidence-based fitness coaching system**. It combines deterministic decision engines, a curated evidence vault (277 documents / 1,563 RAG chunks / 606-node knowledge graph), and LLM coaching to take a client from intake to a personalized training program, weekly check-in, and always-available AI coach.

The product is delivered through **three + two channels** and supported by a **commercial web presence**:

1. **Telegram bot (primary channel)** — Python (python-telegram-bot v21)
2. **Web + Cloudflare Worker (commerce & content channel)** — static site + serverless backend for access codes, PDF sales, orders, payments, and analytics
3. **Mobile app (in development)** — React Native (Expo) + FastAPI + Supabase
4. **Desktop alpha app (in development)** — React 19 + Electron + Dexie (IndexedDB) + local LM Studio
5. **Flutter app `elitefit` (exploratory)** — full-local fitness tracker, in Arabic/English
6. **CLI (Python stubs)** — program generation + ED screening, not yet functional as a user-facing CLI

The **performance goal** across all channels: intake → program generation → check-in → AI coach, with the same safety-first pipeline (ED screening → safety triage → vault-informed pillar assignment → decision engine → content → PDF) to the same knowledge vault.

---

## 2. Portfolio Map

| # | Project | Where | Status | Stack | Why it exists |
|---|---------|-------|--------|-------|---------------|
| P1 | Telegram bot + backend | `mos_bot/` + root scripts | 🟢 Active (primary) | Python 3.12, python-telegram-bot 21, FastAPI, FAISS, sentence-transformers | Full coaching flow: intake → program PDF → check-ins → coach |
| P2 | **Muscle OS Core** (Coaching Engine) | `mos_bot/core/` + `Muscle Operating System/` | 🟢 In production (reused by bot, web, web backend v2, desktop alpha, mobile) | Python + Markdown vault + FAISS + graph | The shared "brain": safety, pillars, book engine, vault RAG |
| P3 | **Website & media commerce** | `website/` + worker + `books/`, `guides/`, `knowledge-hub/`, `samples/`, `quiz/`, `pdf/`, `admin/` | 🟢 Live (midnight deploys) | Static HTML/CSS/JS, GitHub Pages, Cloudflare Worker (KV + Durable Objects) | Marketing, monetization (access codes, PDF books), order/payment handling, analytics |
| P4 | **Web Tools** | `tools/` (mirrored in `website/tools/`) | 🟢 Live: two paid (Training App PRO, TDEE Adaptive Engine) + free calculators | Vanilla JS SPA, PWA, bilingual EN/AR | Productized interactive training & nutrition tools sold as subscriptions |
| P5 | **Books & Guides (digital products)** | `books/`, `guides/`, `website/books/`, `site guides/`, `knowledge-hub/`, `samples/`, bundles | 🟢 Shipped (6 full books + samples + 6 guide work-sheets) | HTML → PDF generator, in English + Arabic + French variants | Owned paid content / lead magnets sold via codes |
| P6 | **Mobile App** | `mos-mobile/` | 🟡 In development (screen flow done) | Expo (React Native) + Expo Router, FastAPI backend, Supabase (schema + optional), Zustand, JSON API | Client check-ins, AI coach chat, profile, program viewing on mobile |
| P7 | **Desktop Alpha App** | `muscle-os-alpha/` | 🟡 In development (standalone repo) | React 19 + Electron + Vite + Tailwind + Zustand + Dexie (IndexedDB) + local LM Studio | Validate "plateaued intermediate" hypothesis → one diagnosis → one recommendation → review loop; local nutrition tracker |
| P8 | **EliteFit tracker (Flutter)** | `elitefit-master/` | 🟡 Exploratory | Flutter 3.10, BLoC, Drift (SQLite), Firebase, health sync | A full-featured offline fitness tracking app in Arabic (workouts, diets, scale, health intelligence) |
| P9 | **Admin & Analytics** | `website/admin/`, `docs/apps-script-webhook.gs`, worker endpoints | 🟢 Live (internal) | Cloudflare Worker admin endpoints, Google Apps Script → Google Sheets | Code issuance/approval, funnel analytics, expiry reminders, WhatsApp notifications |

Repos:
- Main repo (`E:\MoS`): origin = `github.com/Anas-XI/muscle-os-bot` (main)
- Public site toolchain: `public` remote = `github.com/Anas-XI/muscle-os-website` (master branch only, GitHub Pages)

---

## 3. Shared Core: How the Intelligence Works

### 3.1 Pipeline (single source of truth, per program_generator.py)

```
safety triage (run_safety_triage)
  → vault RAG (_build_vault_context: FAISS semantic search + graph expansion)
    → vault signals (_extract_vault_signals: pillar scores, nutrition/training/recovery guidance)
      → pillar assignment (assign_pillars: vault-informed)
        → book engine (BookDecisionEngine: 35+ rules)
          → content generation (generate_program: vault-informed templates)
```

### 3.2 Knowledge base

- Location: `Muscle Operating System/` (Obsidian vault)
- Entry points: `Muscle OS Core Engine.md`, `Master Protocol.md`, `USER_GUIDE.md`, plus auto-generated `00_META/Vault Knowledge Graph.md`
- Storage: `mos_bot/core/vault_rag.py` — FAISS + sentence-transformers over 1,563 chunks; graph expansion via `vault_graph.py` (606 nodes / 5,448 edges, edge types wikilink 2.0, same_pillar 1.0, same_category 0.5); rule-based selection `vault_context.py`; graph analysis `vault_graph_analysis.py`
- Rebuild: auto on first access, cached to `data/vault_index/vault_graph.pkl`; force with `build_vault_graph(force_rebuild=True)`

### 3.3 Safety & screening

- ED screening: 4-question screen evaluated by `mos_cli.py` (SCOFF variant + custom).
- **Safe triage:** 9 dimensions (cardiac, ortho, ED, psychological, GI, sleep, medical, mobility, lifestyle).
- **Constraint engine:** multi-domain, severity-graded (Critical/High/Medium/Low) conflict detection and resolution (`constraint_engine.py`).
- **Crisis flow:** when triage finds high risk, the system halts program generation, delivers crisis resources, avoids owner via Telegram (`_notify_owner_crisis`).

### 3.4 Decision rules

- `book_engine.py`: BookDecisionEngine — 35+ decision rules across goals (hypertrophy/strength/loss/performance), based on Schoenfeld, Nippard, NSCA, ACE, ISSA, IPTA
- `archetype_matcher.py`: modern pipeline (coach pipeline) — matches to archetypes ("Overwhelmed Beginner", "Lifestyle-First Athlete", …), builds constraint graph, multi-domain vault RAG, LLM synthesis, and gives section-based review with citations.

### 3.5 LLM integration

- Two modes: **local** (LM Studio via `LM_STUDIO_URL`) or **cloud** (OpenAI-compatible `LLM_API_URL` + `LLM_API_KEY`), with `USE_MOCK_LLM` for tests
- Coach chat prompt defined in `coaching_mode.py` (`QUICK_DECISION_PROMPT` — decision rules)
- Streaming chat support used by mobile, desktop, and bot

### 3.6 Analytics & tracking (`core/analytics.py`)

JSONL event logging for every user-facing action. Funnel web analytics separate (see web).

---

# P1 — Telegram Bot (Primary Coaching Channel)

**Component:** `mos_bot/` + root scripts (`chatbot.py`, `coaching_mode.py`, `checkin_tracker.py`)
**Status:** 🟢 Active, primary

## Problem / Persona
An intermediate+ lifter who has plateaued and wants science-based training and coaching without paying a human coach. Product hypothesis tested around "intermediate lifter".

## Features
### Intake (state machine, `handlers/intake.py`)
- Exactly **8 screens / 28 questions**, states 0–36 in `states.py`
- Flow: goal → situation → experience → weight/height/age → training days/session length/current split → injuries/gut → sleep/stress/steps/caffeine/supplements → medical → ED screening (4) → **evaluation** → hydration/alcohol/work schedule/mobility/bloodwork/mental health → confirm → END
- Critical convention: **every handler returns the next state constant for the question just sent**; edits must keep `send_question() + return` in sync

### Program Generation
`/intake` completion triggers `program_generator.py` full pipeline → Markdown program → PDF via `pdf_renderer.py` (professional cover, tables, metadata, watermark, coach branding)
### Check-ins (`handlers/checkin.py`, root `checkin_tracker.py`)
- Compact weekly check-in (weight, sleep, readiness, adherence, soreness) with trend analysis & persistence
### AI Coach (`handlers/coach.py`, `chatbot.py`, `coaching_mode.py`)
- Chat with LLM that references last check-in + profile + vault RAG (5-min per-user vault-context cache on the serving side)
- Decision rules: one change at a time, safe > optimal, adherence > optimization, sleep is foundation, be specific, cite sources
### Admin (`handlers/admin.py`)
- Owner-only `/status` (server + users counts), `/users`
### JSON profile upload (`handlers/upload_profile.py`)
- Automates the profile from `intake-form.html` submission
### Web UI (FastAPI in-process)
- `mos_bot/web/` — FastAPI server (port 8080) with a single-page web UI (`index.html`, `coach.html`) served at `muscleos.xyz`

## Integrations
- Reuses the shared core (vault, safety, decision engine). `handlers/start.py` wire 3 ConversationHandlers.

## Inputs/Outputs
- **First inbox:** Telegram chat. Outputs: PDF program, check-in summaries, chat markdown.
- Data: `mos_bot/data/users/*.json` profiles, `programs/*.md`, `pdfs/*.pdf`, `checkins/*.json`, `analytics/*.jsonl`, `vault_index/` (FAISS, pkl graphs)

## Success Metrics
- Intake completion rate, program generation success, check-in cadence, coach chat retention.

---

# P2 — Core Coaching Engine (shared)

## Status: 🟢 Production (reused by P1, P3, P6)
See §Shared Core. The engine files:

| File | Role |
|---|---|
| `mos_bot/core/program_generator.py` | Full pipeline orchestrator (safety → vault → pillars → book → content → PDF) |
| `mos_bot/core/content_generator.py` | Deterministic program/nutrition/structure from templates + vault |
| `mos_bot/core/business/book_engine.py` | 35+ decision rules |
| `mos_bot/core/constraint_engine.py` | Multi-domain constraint resolution w/ conflict detection |
| `mos_bot/core/vault_*.py` | Vault selection + RAG + graph |
| `mos_bot/core/analytics.py`/`citation_tracker.py` | Tracking + evidence citations |
| `coaching_mode.py` | Coach prompt rules (shared with frontends) |
| `mos_bot/data/` | Runtime stores: users, programs, pdfs, checkins, analytics, vault_index |

---

# P3 — Website + Marketing + Commerce (web layer)

## Status: 🟢 Live

## 5.1 Goal
Drive clients to the WhatsApp funnel and product subscriptions: coach page that sells Training Apps (Paid), TDEE engine, books, and coaching packages; bilingual EN/Arabic; all paid content behind an access-code gate.

## 5.2 Site structure (`website/`)
```
website/
├── index.html             # Landing "Coaching by Coach Anas" page (hero, packages, funnel CTA)
├── order.html              # Order/payment entry for products
├── tools/                  # Tool pages (paid gated, free calculators) + index
├── books/                  # Full books (HTML), samples (sample_*.html) + index
├── guides/                 # Free quick-start guides + workbooks (PDF + HTML)
├── knowledge-hub/          # Free article/citations library
├── quiz/                   # "Which book should you read first?" quiz (funnel lead-gen)
├── samples/                # Sample book previews ("See the quality before you buy")
├── pdf/                    # PDF viewer (fit-to-width, lazy render, JWT/CSP)
├── admin/                  # Order approval dashboard + analytics
├── assets/                 # css, js (site.js, tracking.js, access-control.js), data (access-codes.json), img
├── worker/                 # Cloudflare Worker (see below)
└── .github/workflows/      # midnight-only deploy + tests
```

## 5.2 Landing page vs Tools
- Page "Stop Guessing. Start Progressing." with hero, tool cards, package pricing, WhatsApp CTA funnel tags (navigation_whatsapp, hero_cta_main, footer_wa, guide_cta, listing_cta), section order (see DOCUMENTATION.md §3).

## 5.3 Access-control gate (JS + Worker)
- `assets/js/access-control.js` (share `MosAccess.checkOrShow(productId)`)
  - Server path: `/api/verify-code` → JWT, then `/api/check-token` for revalidation
  - **Fallback path intentionally** for resilience: if Worker unreachable, local SHA-256 match against `assets/data/access-codes.json` grants **exactly 48h** of access (regardless of plan), forcing reconciliation + logging of fallback usage (flushed to Worker).
- Session persistence: access token stored per Google account when possible; restored on sign-in (`save access code per account` feature).

## 5.4 Products & pricing (money matrix)
Defined in `worker/src/index.js` `PRODUCT_CONFIG` + `PRODUCT_PRICES`:

| Product | Price | Duration | Code prefix |
|---|---|---|---|
| Training App (PRO) | 300 EGP/mo | 30d | `TR` |
| TDEE Adaptive Engine | 200 EGP/mo | 30d | `TD` |
| Training Apps Bundle (both) | 400 EGP/mo | 30d | `TB` |
| Training Book | 500 EGP | lifetime | `BK` |
| Nutrition Book | 500 EGP | lifetime | `BN` |
| Books Bundle | 800 EGP | lifetime | `BB` |
| All Access (master) | — | 30d | `MA` |

- Payment flows: **Paymob online** (EGP, HMAC-verified webhook auto-approve) **+ manual alternatives** (InstaPay/Vodafone Cash/other → admin approve). After approval, worker generates a random code (`generateOrderCode(prefix)`) and returns a pre-filled WhatsApp message to the customer.
- Coach notification (`/api/notify-coach`): WhatsApp via Meta Cloud API (onboarding / subscription / checkin events) to the coach number.

## 5.5 Cloudflare Worker — `worker/src/index.js` (60 KB)
**Name:** `muscleos-access-control` · wrangler.toml: KV `ACCESS_CODES` (prod + staging), KV `PENDING_ORDERS`, Durable Object `CODE_COUNTER` (SQLite).

Key endpoints (all under `/api/…`):
- Codes: `verify-code` (atomic via Durable Object + lazy KV migration), `check-token`, `issue-code` (admin, HMAC-guarded), `revoke-code`, `log-fallback-usage`
- Orders: `create-order`, `pending-orders`, `approve-order`, `reject-order`, `check-payment-status`
- Payments: `create-payment-link`, `paymob-callback` (HMAC SHA-512 verification)
- PDF: `pdf/:filename` freeguide passthrough or JWT-gated book
- Sync: `sync/…` passphrase-guarded local-data sync (for training app & alpha)
- Auth: Google sign-in `/api/auth/google` (JWKS verify) → session JWT; `check-session`, `refresh-session`
- Admin: `expiring-codes` (WhatsApp renewal reminders); rate limit all endpoints (per-IP 300s window)

Storage:
- KV keys: `code:<CODE>` → {products, plan, durationDays, expiresAt, maxUses, uses}; `code:<CODE>:binding` → email binding (idempotent, per-account); `pdf:<file>` → binary; `log:<ts>:<uuid>` → attempt log (30d TTL); `order:*` in PENDING_ORDERS (48h TTL); `sync:*` (+meta w/ SHA-256 passphrase)

## 5.6 Deployment
- **Site:** GitHub Pages via `website/` from `master` branch; workflow `sync-master` merges `main → master`, then `deploy-pages`. **Midnight-only (00:00 Morocco, cron 0 23 * * *) — no realtime deploys.** Workflow dispatch available.
- **Worker:** wrangler with `{env.staging, env.production}`; production route `api.muscleos.coach/*` (zone not yet attached). Worker currently at `https://muscleos-access-control.muscleos.workers.dev`.

---

## P4 — Web Tools (Product)

## Status: 🟢 Live — two paid + free tools

| Tool | File | Status / price | What it does |
|---|---|---|---|
| **Training App (PRO)** | `tools/training_tool.html` (big, ~2942 lines) | Paid, 300 EGP/mo | Volume calculator, split selector, program generator, session logger, RPE/RIR guide, progress charts, PR tracking, plate calculator, warm-up rows, supersets, rest timer, missed-lift make-up, data sync, bilingual EN/AR, add-to-homescreen (manifest.json, sw.js PWA) |
| **TDEE Adaptive Engine** | `tools/tdee_adaptive_engine.html` | Paid, 200 EGP/mo | Daily weight + calorie logs → auto-adjusted TDEE from rolling averages & trend; auto macro suggestions |
| **TDEE & Macro Calculator** | `tools/tdee_macro_calculator.html` | Free | Maintenance calories, deficit/surplus, protein/carbs/fat targets |
| **Volume & Set Calculator** | `tools/volume_set_calculator.html` | Free | Weekly sets per muscle group (from experience/goal/days) + per-session distribution |
| **RPE Load Calculator** | `tools/rpe_load_calculator.html` | Free | Convert sRPE ↔ load guidelines |
| **Split Selector Quiz** | `tools/split_selector_quiz.html` | Free | Choose a split |
| **Pillar intake + server** | `tools/pillar_intake.html` + `tools/pillar_server.py` | Dev/test | Component slice for pillar intake |

Conventions from `tools/FEATURE_PROMPTS.md` (feature backlog, source of truth): var-based functions, custom `_('key')` i18n (en + ar), `ls/ss` helpers, call arrays. Every feature: implement → `bracecheck2.js` + `check_parse.js` → Playwright test → copy to `website/tools`, commit `main`, merge, deploy (midnight).
Bundle-based PDFs of tools exist under `training bundle/`/`nutrition bundle/`.

Deployment mirror: canonical copies live in `E:\MoS\tools`, deployed copies in `website/tools/`.

---

## P5 — Books & Digital Content (Products)

## Status: 🟢 Shipped

### Book titles (full, HTML + PDF)
- Training Book, Nutrition Book, Hormonal Book, Recovery Book, Sleep Book, Strength Book, Master (all-in-one)
Builds: `books/build_master_book.py`, plus per-title PDF + HTML.

### Bundles & translations
- `training bundle/`: training book + split quiz + volume calc + RPE + deload decision tree + quick start + TDEE engine + training app
- `nutrition bundle/`: nutrition book + macro calc + consistency workbook + diet quick start + recomp cheat sheet + plateau decision tree + TDEE engine
- Full books ship as HTML+PDF pairs; the nutrition book also has Arabic (`_ar`) and French (`_fr`) variants

### Free lead-gen
- `guides/`: consistency workbook, deload decision tree, diet quick start, plateau decision tree, recomp cheat sheet, training quick start (PDF/HTML)
- `knowledge-hub/`: free citations/hub
- `quiz/` + `samples/`: quiz → sample funnel
- `docs/apps-script-webhook.gs` — Google Apps Script "Muscle OS Funnel Log" webhook that feeds a Google Sheet; tag-layered as TOP/MIDDLE/BOTTOM funnel, computed `funnel` events and a separate admin analytics dashboard.

Monetization: books are lifetime per code (`BK` etc). Samples are always free download.

---

## P6 — Mobile App `mos-mobile/`

## Status: 🟡 In development

## 6.1 High-level goal
Put the coach loop (check-in + coach chat + program + tracker) on mobile, using the same intelligence.

## 6.2 Pieces
- **`mobile/`** — Expo (React Native, Expo Router, expo 57) + Zustand. Screens:
  - Auth: login/ signup (role client|coach)
  - Onboarding: 8-screen glass-style intake matching the bot's intake (incl. safety/ED screening); on submit fires `updateProfile` + fire-and-forget `generateProgram` then lands in chat
  - Client tabs: **Chat** (AI, SSE streaming, markdown bubbles), **Tracker** (Log/History/Progress — volume, per-exercise weight trends), **Program** (renders markdown; "Generate New" button), **Profile** (weekly check-in modal)
  - Coach tabs: Client list, add client by email, client detail with 5 subtabs (profile/program/check-ins/workouts/chat — read-only)
- **`backend/`** — FastAPI (port 8000) reuses the bot's intelligence (`mos_bot`, `chatbot.py`, `coaching_mode.py`) via `sys.path`; DB abstraction `Supabase` or `LocalDB` (SQLite) — `db_adapter.py`, `local_db.py`. CRISIS flow: on safety-crisis, calls `_notify_owner_crisis` Telegram to owner, returns support resources. Endpoints: auth, profile, chat (+stream SSE), programs, checkins, workouts, coach, admin.
- **`supabase/`** — `schema.sql` (profiles, client_profiles, programs, messages, checkins, coach_clients, workout_logs) with RLS + `get_user_context()` helper.

## 6.3 Known gaps (from repo analysis)
- Direct Supabase client defined but unused — all data goes through REST API; session stored only in memory (no token persistence, app restart logs out)
- Program/check-in/tracker render raw markdown/plain strings (not structured lists)
- Coach role is read-only (cannot edit/cosign)
- Crisis-clear admin requires `ADMIN_API_KEY` env var; Supabase schema has no crisis column yet
- `generateProgram` is fire-and-forget from onboarding (no progress UI)

---

## P7 — Desktop Alpha App

## Status: 🟡 In development (standalone repo with dist committed)

## Purpose
Standalone desktop/browser chat app to validate the "**plateaued intermediate lifter**" hypothesis with an evidence-based flow: *triage → intake → one-bottleneck diagnosis → one recommendation → review loop*, all powered by a **local LM Studio** server (no cloud). Ships with a **local calorie/nutrition tracker** that pushes live nutrition data into the coach prompt.

## Stack
React 19, Vite 6, Tailwind 4, Zustand, React Markdown, **Dexie/IndexedDB** (offline-first), optionally Electron (devDeps), Vitest. Electron shell has no IPC — thin wrapper around the Vite build (`dist/`, `base: './'`).

## Functional areas
1. **Chat flow / session state machine** (`src/stores/chat-store.ts`) with phases: greeting protocol → entry selection (plateau / recovery / starting / returning) → triage (16-question safety quiz, output Yellow/Green/Red) → if Yellow: intake assessment (9 sections, archetype + constraint profile) → diagnosis (LLM with strict output format: `Most Likely Cause:`, `Confidence: Low/Med/High`, `Recommended Action:`, `Next Review:`, `Why:`, `Evidence:`) → Acceptance/Reject → review history → synced insights
   - Quick replies, sessions stored in Dexie, stale after 90 days → expired
2. **Evidence-driven prompt** (`src/config/diagnostics.ts`) — 16 curated evidence "vault" snippets injected with live nutrition snapshot, intake profile, triage status, etc. (One Bottleneck Rule)
3. **Nutrition tracker** (`src/services/`):
   - BMR by Mifflin-St Jeor, TDEE adjustments, goal-based calorie sets, macro goals per-kg, 85+ default foods, 16 micronutrients, meal logging by date, meal templates (seed/save), daily totals, weight log + EMA trend (70d), `getWeightTrend` signal
4. **Exercise library** (`exercise-catalog`) — composing routines, SFR rating, program generator for muscle selection
5. **Analytics events** stored locally, exported to help track the hypothesis.

## LM Studio config
`src/config/LM-studio.ts` — default `http://localhost:1234/v1`, model by detection, 2048 max tokens, temp 0.3 default, SSE streaming.

---

## P8 — EliteTracker (Flutter)

## Status: 🟡 Exploratory (Flutter). Not deployed.

- **App**: "FitTracker — comprehensive fitness tracking app" (Arabic/English; `intl` localizations)
- **Stack**: Flutter (3.10 sdk), Go Router, BLoC, Drift (SQLite, bundled DB asset), firebase (auth + messaging + firestore), google sign-in, mobile scanner (QR), PDF (dart), local notifications (`flutter_local_notifications`), health sync, per-feature cubits
- Screens/features:
  - Auth: onboarding, login, forgot password, phone/OTP verification
  - Home: calorie gauge, macro cards, quick actions
  - Workout splits: standard + custom programs (PDF export), active workout
  - Diet plans: standard + custom (PDF export), meals
  - Strength: strength tier system, custom tiers
  - Exercise analytics: history + analytics views
  - Health intelligence: condition mode, fridge meal, gut health, muscle overlap, plateau detector, recovery tracker
  - Scale: body-fat / weight log
  - Profile: achievements, badges, settings, reminders
  - Subscription screen (BLoC-driven)

---

## 7. Root-level tooling & automation

### Python / bot-level
- `recruit.py` — PMF recruitment helper: builds a personalized outreach message (targeting intermediate lifters who are plateaued, free beta) + tracks `00_PMF_Tracking.csv` / `00_Recruitment_Contacts.csv`. `cmd_message()` prints the message.
- `mos_cli.py` — CLI for program generation and ED screening: `from-json` (intake form JSON) → profile; `generate-program` / `preview`; `rag-query<query>` (vault query); `pillar-info`
- `test_e2e_pipeline.py` — end-to-end pipeline test bootstrap (liveness of intake→safety→RAG→pillars→book→content).
- `install_bot_service.ps1` — Windows service installer for the bot.
- Procfile: web entry = run the FastAPI web app.

### Analytics
- `docs/apps-script-webhook.gs` — Cloudflare → Google Sheets application funnel log (see §P3).
- `website/assets/js/tracking.js` — cookie-first client funnel tagging ("whatsapp").

### Codes
- `website/scripts/` (in site repo under scripts): `generate-codes.js` (bulk code gen: 1000 codes × 6 products, seed 6000 to KV), `coach-admin.js`, `rotate-fallback-codes.js`, `hash-code.js` — generate & rotate fallback codes for resilience. `codes/` root — local dev copies.

### Testing
- `tests/` (192 tests) in `mos_bot`/`tests/` — run `python -m pytest tests/`. Mobile backend tests separate (test_api.py, SQLite-fixture-driven).
- Website — Playwright functional tests for tools; `bracecheck2.js` + `check_parse.js` per tool feature.

---

## 8. Cross-Project Data Flow

```
Telegram client ──► mos_bot bot (intake / checkin / coach)
      │                │
      │                ▼
      │        mos_bot/core engine ──► Muscle Operating System/ (vault)  ▲
      │                ▲                       (knowledge graph + RAG)    │
      │                │                                                 │
Mobile app ──► FastAPI backend (mos-mobile) → reuses bot's core          │
      │                │                                               ┌──┘
      │                ▼                                               │
      │          data/ users·programs·pdfs·checkins·analytics          │
      ▼                                                                │
Website/tools (browser) ◄──access-control.js── Worker (codes/PDF/payments/admin) │
      │                                                                 │
      ▼                                                                 │
    paid product: codes stored in Cloudflare KV; PDFs served JWT-gated   ▼
                                                                      [shared rules: coaching_mode.py, master protocol]
```

- **Web:** product gating is handled entirely cloud-side (Worker). Tool data stays local (localStorage/IndexedDB) with optional passphrase-guarded sync via the Worker.
- **Desktop alpha:** keeps all data local (IndexedDB) — privacy- and offline-first, only LLM calls leave the machine.
- **Mobile:** uses a FastAPI backend that **reuses the Telegram bot's code** (same vault, same programs).
- **Desktop alpha:** uses the same coach-prompt content (diagnostics) but fully local.

## Integration points / ports
- Telegram bot handler entry, `webhook`, `web/app.py` (FastAPI)
- HTTP API (FastAPI): 8080 bot web, 8000 mobile backend
- OpenAI-compatible LLM endpoints + SSE streaming chat
- Cloudflare API for codes+orders; Meta WhatsApp Cloud for coach notify; Google OAuth for account session; Paymob for EGP payment

---

## 10. Deployment topology

| Thing | Where |
|---|---|
| GitHub repo `Anas-XI/muscle-os-bot` (main) | source of truth for all projects |
| GitHub Pages (`Anas-XI/muscle-os-website`, `public` remote) | `website/` (master branch) deployed via Pages |
| Cloudflare Worker `muscleos-access-control` | worker on workers.dev + prod env route `api.muscleos.coach/*` |
| KV namespaces | `ACCESS_CODES` (prod + staging), `PENDING_ORDERS` |
| Server hosting | bot + FastAPI web run from the repo (Procfile web process) |
| Local infra | LM Studio (local LLM), Expo (mobile dev), Electron |

---

## 11. Status summary & known gaps

| Channel | Status | Biggest gap |
|---|---|---|
| Bot (Telegram, P1) | 🟢 | 192 tests pass; needs real user validation (PMF sprint) |
| Core engine (P2) | 🟢 | Coach pipeline section review in beta; rule-regex complexity |
| Web & commerce (P3) | 🟢 | Midnight-only deploys; Paymob + manual approval flows; 48h fallback-code window |
| Tools (P4) | 🟢 | Feature backlog in `tools/FEATURE_PROMPTS.md` waiting to ship |
| Books/content (P5) | 🟢 | Funnel attribution (Google Sheets) needs adoption |
| Mobile (P6) | 🟡 | No real Supabase wiring, no token persistence, generation UX, safety export |
| Desktop alpha (P7) | 🟡 | Validation-gated — needs the recommendation/interview loop tested with real users |
| Flutter app (P8) | 🟡 | Built but not adopted; either tie into core or archive |
| PMF | ⏳ | Validation has not started; `recruit.py` + `PMF Sprint` plan ready but not run |

Next actions (from `Escalation Plan - PMF Sprint.md`): recruiting beta users (recruit.py target: 3-5 intermediate lifters), launching intake + PDF delivery, weekly check-ins, generative chat quality sampling, and analytics dashboard to measure fit.

---

## 12. Product dictionary (terms used)

- **Book Engine**: 35+ decision rules → evidence-based programming decisions
- **Vault**: the `Muscle Operating System/` Obsidian knowledge base
- **Pillars**: Master Protocol – 10 pillars (training, nutrition, recovery, sleep, stress, gut, hormones, etc.)
- **ED screening**: 4-question eating-disorder screening; evaluated by `mos_cli.py` (SCOFF-style)
- **Durable Object (DO)**: Cloudflare atomic counter guard for code verification (KV → DO)
- **EN/AR**: all user-facing sites and tools are bilingual English/Arabic
- **Funnel stages**: TOP (awareness: WhatsApp/hero/footer) / MIDDLE (quiz/tool results) / BOTTOM (purchases)