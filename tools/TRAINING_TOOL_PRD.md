# Muscle OS Training Tool — Product Requirements Document

**Version:** 1.0 (snapshot of shipped build `70ab0cf2`)
**Owner:** Coach Anas Mo'men
**Product:** P4 — Web Tools (single-file, bilingual EN/AR, offline-capable PWA)
**Stage:** Pre-PMF / Late MVP — building done, validation starting (see `Muscle Operating System/00_META/Executive/Escalation Plan - PMF Sprint.md`)
**Deploy status:** Code shipped on `master` (root + public worktrees); live GitHub Pages deploy deferred by owner (recurring Pages deployment-queue incident). Live mirrors must not be refreshed from tainted SHAs.

---

## 1. Executive Summary

The Training Tool is a **deterministic, evidence-based hypertrophy/strength program builder** that runs entirely in the browser. From a 10-question onboarding it produces a full program: priority muscles → split → per-day exercise selection → volume allocation → week structure → deload/mastery protocol, then coaches day-to-day via a set logger (RPE/RIR, warm-ups, PRs, rest timers, plate calculator) and weekly intelligence (load history, ACWR, fatigue, soreness, compliance, coach notes).

It is the **productized, interactive channel** of Muscle OS: the same decision philosophy as the bot's book engine, packaged as a paid subscription product (access codes via the Cloudflare Worker), with free lead-gen calculators around it.

**One-line pitch:** *Answer 10 questions, get a volume-balanced program, log by RPE, and let the tool tell you when to push, hold, or deload.*

---

## 2. Users & Segments

| Segment | Characteristics | How the tool serves them |
|---|---|---|
| Beginner (0–1 yr) | No program, no split knowledge | Split recommendation, built-in education cards, conservative volume |
| Intermediate (1–3 yr) | Plateaued, program hoppers | Periodization (meso planner), load history, PR tracking, deload logic, plateau detection → coach note |
| Weak-point fixers | Lagging chest/back/legs | Priority scoring redirects volume and accessory selection |
| Injury-flagged | Pain flags, rehab needs | Red-flag exercise blocking with substitution suggestions, prehab/rehab blocks, modified movement pool |
| Time-constrained | 30–45 min sessions | Session-time estimator, effort-based recovery (7-min rule), short-session mode |
| Bilingual | EN + AR (RTL) | Full i18n (325 keys, balanced en/ar), RTL mirror layout, Arabic UI |
| Equipment-limited | Home gyms, single stations | Exercise filtering by equipment, custom exercises + replacements |

**Non-targets:** advanced powerlifters with their own programs; medical cases (the tool is not medical advice; it has no ED screening — that lives in the Telegram bot's intake); people seeking nutrition plans (TDEE engine / bot).

---

## 3. Goals & Non-Goals

### Goals (this release)
- G1. Generate a **volume-balanced, priority-aware program** in under 2 minutes from 10 answers.
- G2. **Coach daily logging** that is fast (< 20 s per exercise): RPE → effort-based rest → warm-ups → PR detection → plates.
- G3. **Catch overreaching before injury**: ACWR, fatigue gating, deload tracker, soreness/pain flags, session-time pressure.
- G4. **Retention mechanics**: streaks, PR credits, coach notes, training reminders, sync across devices.
- G5. Monetize via **subscription / access codes** through the existing Cloudflare Worker infrastructure.

### Non-Goals (this release)
- No LLM/chat — the tool is deterministic by design; the LLM coach lives in the Telegram bot and the desktop alpha (the tool's `CQ` coach queue is the future hand-off hook).
- No user accounts — identity = sync key + PIN; the worker is a sync/access relay, not a database.
- No nutrition planning (that's the TDEE engine / bot).
- No wearable/HRV integration (yet).

---

## 4. Core User Flow

```
/start → (paywall: access code or subscription)
  → Onboarding (10 questions: goal, experience, weak points, equipment,
     days/week, session length, injuries/pain, soreness, gut/digestion, preference)
    → Priority scoring → split recommendation (with justification cards)
      → Exercise selection: pool filtered by equipment + priority + injury,
         ranked by strength-gain evidence, fatigue-balanced across days
        → Volume review (per-muscle sets vs targets, day balance)
          → Program review → generate → week structure
            → Meso planner (weeks, progression scheme, deload mastery)
              → Train: day dashboard → set logger → warm-ups → rest timer
                → PR check / credit → plate calculator → session time
                 → History: charts (e1RM, volume), compliance, ACWR,
                    soreness, measurements, PR log, coach note
                  → Weekly: load history → fatigue → next-week adjustment
                     (increase / hold / deload / plateau note)
```

---

## 5. Functional Requirements

### 5.1 Onboarding & Intake (FR-1)
- FR-1.1 Ten questions, one screen each, typed answers with validation, progress bar, back navigation.
- FR-1.2 Goal ∈ {hypertrophy, strength, recomp}; experience ∈ {beginner, intermediate, advanced}.
- FR-1.3 Weak points (multi-select) re-rank the accessory pool.
- FR-1.4 Equipment list → filters the entire exercise pool in real time.
- FR-1.5 Pain flags (body map) feed `PF` and block/replace exercises at selection time.
- FR-1.6 Gut/digestion and sleep inputs affect volume tolerance (conservative caps), not just display.

### 5.2 Split & Program Builder (FR-2)
- FR-2.1 Recommended split from {PPL 6, PPL 3, UL 4, FB 3} by days × experience; user can override via frequency picker (`FO`).
- FR-2.2 Split diagram screen: colored day boxes, drag-toggle active days, click a day to edit its exercises.
- FR-2.3 Volume engine: per-muscle target sets by experience tier; volumes allocated across days by priority weight; live review shows each muscle's sets vs target with under/over markers (`VA`, `VT`).
- FR-2.4 Soreness conflict resolution: a muscle trained ≤ 48 h ago is de-prioritized for the next day's slot (`SR`, `VI`).
- FR-2.5 Deterministic exercise ranking: evidence score = strength-gain literature weight × priority match × fatigue cost; top N per day; user can swap, add custom exercises (`CE`), set replacements (`CR`).
- FR-2.6 Program review screen: weekly layout, per-day session-time estimate (≤ selected session length), totals; regenerate or accept.
- FR-2.7 Store program as `PG`; missed sessions trigger the "get back on track" banner (`renderMissedBanner`, F4).

### 5.3 Meso Planner & Periodization (FR-3)
- FR-3.1 4–12 week plan (`MP`, `MA`, `MH`); progression schemes (double progression → RIR progression → intensity wave); deload week with mastery requirement.
- FR-3.2 Deload week: volume halved, intensity capped; completion required before the next block auto-tunes (`DT`).
- FR-3.3 Plateau detection: load history + PR-credit stalls → automatic coach note + next-week adjustment recommendation (P7).
- FR-3.4 Session-time estimator: per-day projected time from sets × effort rule (7-min rule: RPE 7+ → 4+ min rests capped at 7) → warns if a day exceeds budget and offers to trim (`__estEngine`).

### 5.4 Training Day / Logger (FR-4)
- FR-4.1 Day dashboard: exercise cards, warm-up sets, top working sets, notes; empty days get coaching copy (A4 `dash_empty`).
- FR-4.2 Logger flow per exercise: RPE/RIR picker → effort-based rest timer → warm-up ladder → working sets (auto volume accumulation) → grid columns: Working Sets | Load (kg) | Reps | RPE (A4).
- FR-4.3 PR detection: new e1RM → PR banner + PR credit (`PC`); weekly PR log (`PR`).
- FR-4.4 Plate calculator (kg, 1.25 increments), superset pairing (`SU`, F5), custom timer, tap-to-pause.
- FR-4.5 Nutrition log on training days (optional, `LG`), hydration reminder toggle.
- FR-4.6 Session close: duration capture, compliance vs plan, store to `SS`; day locks on close; missed-day banner on next visit (F4).

### 5.5 Recovery Intelligence (FR-5)
- FR-5.1 Load history engine: weekly tonnage per muscle, e1RM trend (`LH`, `PL`).
- FR-5.2 ACWR (acute:chronic workload ratio) computed weekly; risk bands surfaced in plain language (green/amber/red).
- FR-5.3 Fatigue log (`FL`): readiness check before each session; if trending low → soft-gate suggests a downshift (fewer sets), never forces.
- FR-5.4 Soreness log (`SR`) + pain flags (`PF`) → red-flag blocking at selection time with substitution suggestions (`sel_try`), rehab-ex blocked states (`.rehab-ex-blocked`).
- FR-5.5 Deload tracker (`DT`): overdue deload detection → coach message; weekly "hold vs push" recommendation from load history + ACWR + soreness (Layer 2, effort-based recovery).

### 5.6 History, Stats & Measurements (FR-6)
- FR-6.1 Charts: e1RM trend per lift, weekly volume per muscle, PR history, compliance %, ACWR timeline.
- FR-6.2 Measurements (`MM`): weight/waist/calf with trend line.
- FR-6.3 Coach note (P4 `coach_note`): auto-generated weekly note (PRs, stalls, next focus) + editable.
- FR-6.4 Nudges (P5 `mos_nudge`): streak/reset nudges with one-time dismiss.
- FR-6.5 Stats are local-only; no social.

### 5.7 Data, Sync & Export (FR-7)
- FR-7.1 All state in localStorage via the K-map (§7). Import/export JSON.
- FR-7.2 Cloud sync via Worker (`SYNC_BASE`): sync key + PIN, last-sync timestamps, newest-wins conflicts (`mos_sync_key`, `mos_sync_pw`, `mos_sync_last`). Sync is an explicit user action; no background API spam.
- FR-7.3 Custom exercises (`CE`) and replacements (`CR`) sync like any other state.
- FR-7.4 Sessions backup (`SS`) keeps last 12 weeks; export produces a full JSON snapshot.

## 6. Engines & Decision Rules (deterministic, no LLM)

| Engine | Inputs | Outputs | Evidence base |
|---|---|---|---|
| Priority scoring | Goal, weak points, experience, days | Muscle priority weights | Priority redirects volume to lagging muscles |
| Volume allocation (`VA`, `VT`) | Experience tier, days, priority, soreness | Per-muscle weekly sets, per-day distribution | Tier-based set targets, ±20% tolerance bands |
| Exercise ranking (`rankExercises`) | Equipment, priority, pain flags, fatigue cost | Ranked exercise pool per day | Strength-gain literature weights |
| Split recommender | Days × experience × preference | PPL 6 / PPL 3 / UL 4 / FB 3 + justification cards | Frequency ≥ 2x per muscle standard |
| e1RM estimator | Load, reps, RPE/RIR | e1RM + PR credit | Epley formula, RPE-adjusted |
| Effort-based rest (7-min rule) | Set RPE | Rest time (RPE 7+ → 4 min, capped 7) | Layer 1 session-time model |
| ACWR | 4-week chronic, 1-week acute tonnage | Risk band (green/amber/red) + plain-language line | Acute:chronic workload ratio |
| Fatigue gate (`FL`) | Readiness trend | Downshift suggestion (soft-gate) | Autoregulation (Nippard/Schoenfeld tiering) |
| Deload tracker (`DT`) | Weeks since deload, volume trend | Deload recommendation | Recovery/periodization protocols |
| Plateau detector (P7) | Load history, PR credits | Coach note + next-week adjustment | Stall detection on e1RM trend |
| Session-time estimator (`__estEngine`) | Day sets × effort rule | Minutes per day, over-budget warning | Layer 1 + A-series |
| Coach routing hook (`__suggestRouter`, `CQ`) | Session close, fatigue flags | Queued suggestions for the LLM coach | Future hand-off to bot/alpha |

---

## 7. Data Model (localStorage K-map)

```
VT  mos_vol_targets        SP  mos_split_profile      PG  mos_program
LG  mos_logs               VI  mos_vol_inputs         LH  mos_load_history
DT  mos_deload_tracker     PF  mos_pain_flags         PL  mos_pl_profile
FL  mos_fatigue_log        CL  mos_cardio_logs        MP  mos_meso_plan
MA  mos_meso_active        MH  mos_meso_history       MM  mos_measurements
CE  mos_custom_exercises   CR  mos_custom_replacements SU mos_supersets
SS  mos_sessions           PR  mos_priority           SR  mos_soreness_log
PC  mos_pr_credit          VA  mos_vol_alloc          FO  mos_freq_override
CQ  mos_coach_queue
```

Plus: `mos_ex_choices`, `mos_periodization`, `mos_week_count`, `mos_sync_key/pw/last`, `mos_subscription`, `mos_lang`, `mos_theme`, `mos_accent`, `mos_sess_len`, `mos_pref`, `mos_notif_on`, `mos_nudge_dismiss`.

Naming convention: `mos_` prefix for all keys (avoids collisions with other tools on the same origin). All writes funnel through one accessor (`x()`); test hooks `window.__x`, `window.__exEngine`, `window.__pmEngine`, `window.__estEngine`, `window.__suggestRouter` exist for smoke tests.

---

## 8. i18n & Localization

- Full EN/AR dictionaries, 325 keys per language, **en == ar by line-pattern count** (parity is a CI-style smoke assertion — `smoke_time_coach.js`).
- RTL mirror layout via `dir="rtl"` (A8); all screens render in both languages via `toggleLang`.
- Numeric units: kg everywhere (plate calculator in kg/1.25 increments); no US-unit path in this tool.
- New keys are verified in both dictionaries before commit; values are coaching-tone (A4 micro-copy pass completed).

---

## 9. Architecture & Build

- **Single file artifact:** `tools/training_tool.html` (~500 KB) — 8 byte-identical copies across root, `website/tools/`, `training bundle/`, `public/main/*`, `public/master/*`.
- **Source of truth:** `tools/training_tool_src/` parts (`js/`, `body/`, `css/`) assembled by `tools/training_tool_src/build.py` with a PARTS manifest; `--verify` compares parts ↔ artifact byte-for-byte.
- **Build marker:** line 4 of `head.html` (part) holds the version marker (currently v3.1 text); bump → v3.2 on next deploy.
- **Checks:** `node --check` on extracted JS; smoke suites run against the built artifact in a headless browser (`smoke_time_coach.js`, `smoke_voleng.js`, `smoke_exsel.js`, `smoke_microcopy.js`).
- **PWA:** `manifest.json` + `sw.js` (cache-first) in `tools/` and site mirrors.
- **No build framework, no bundler, no dependencies** — vanilla JS, CSS, HTML.

---

## 10. Safety & Guardrails

- Red-flag exercise blocking (pain zones) with automatic substitution suggestions; blocked chips are visually disabled (`.rehab-ex-blocked`).
- Prehab/rehab blocks and an injury-aware exercise pool from `PF`.
- ACWR risk bands and fatigue soft-gates (downshift, never force).
- Deload enforcement before next block auto-tunes.
- Session-time pressure: warns when a day exceeds the user's stated budget (prevents the "I'll skip it" failure mode).
- Medical disclaimer and "not a substitute for professional advice" copy in onboarding and footer.

---

## 11. Monetization & Access

- **Paywall on load:** subscription modal (`sub-modal`): "This tool requires an active subscription. Subscribe now or enter your access code."
- Access codes verified against the Cloudflare Worker (`API_BASE` = `https://muscleos-access-control.muscleos.workers.dev/api`); grant stores `mos_subscription` and reloads.
- Sync relay endpoint: `SYNC_BASE` = `/api/sync` on the same worker (key + PIN relay only, no user data stored server-side by design).
- Free alternatives on the same `tools/` shelf (volume set calculator, RPE/load calculator, split quiz) act as lead-gen for the paid tool.

---

## 12. Analytics & PMF Measurement

- No in-tool analytics by design (privacy-friendly, offline-first).
- PMF signals are collected via the Worker/admin pipeline instead: activation (code redemption → first program), retention (sync pings, sessions in `SS`), support requests.
- North-star candidate: **weekly sessions logged per active subscriber**; guardrail: injuries reported (via `PF`/`SR` flags) per 100 sessions.

---

## 13. Roadmap Status

| Item | Status |
|---|---|
| All FEATURE_PROMPTS.md items (F1–F9, P1–P7, A1–A8) | ✅ shipped |
| A4 coaching micro-copy pass | ✅ shipped (`70ab0cf2`) |
| Layer 1 (volume management) | ✅ shipped |
| Layer 2 (effort-based recovery, 7-min rule) | ✅ shipped |
| Layer 3 (session-time estimator + coach routing hook) | ✅ shipped, deploy deferred |
| Live GitHub Pages deploy (v3.1 → v3.2 marker) | ⏸ deferred (Pages incident) |
| Coach hand-off via `CQ` (worker `notify-coach` bridge) | 🔜 next after deploy |
| Wearable/HRV, nutrition integration | 📋 backlog |

---

## 14. Risks & Open Questions

- **Deploy trust:** two earlier deploys shipped tainted SHAs (2024 build artifacts / corrupted JSON) → strict verify-then-deploy ritual (node --check → `--verify` → SHA parity across all 8 copies) before any live refresh.
- **Pages queue incident** (deployment stuck in queue) — root cause not fully confirmed; workaround was waiting it out. Do not deploy without explicit owner go.
- **Paywall friction** vs. lead-gen: free trial length / code distribution strategy not yet validated with real users (PMF sprint).
- **Sync trust:** newest-wins conflicts may drop concurrent edits from two devices — acceptable at this stage, revisit if multi-device usage grows.

