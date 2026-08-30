# Muscle OS — Training App Decisions (PMF gap sprint)

Branch: `feat/pmf-gaps`. Every entry records what was decided, why, and the accepted tradeoff.

## D1 — Local-first telemetry (no background network)
Events (`EV` / `mos_events`) are written to localStorage by `js/08b_events.js`: append-only JSONL, bounded at `EVENTS_MAX=500` events, 90-day retention, no PII, dedupe keys per event type. They ride the existing sync payload and JSON export/import for free (`K.EV` in the K-map).
- **Why:** the tool is offline-first by design (PRD: no background API spam); telemetry must not change that.
- **Tradeoff:** events are per-device and only reach the coach via explicit user sync/export; no server-side analytics until a sync pull happens.

## D2 — IIFE scope bridging via `window.__*`
The built page has two script blocks: block 1 (parts 01–26) and block 2 (parts 27–29, the modals). `js/08b_events.js` lives in block 1; `js/28_modals.js` (block 2) cannot see block-1 names, so it calls `window.__evLog(...)` under `if(window.__evLog)` guards. All new shared helpers are explicitly window-exposed (`__evLog`, `__trialState`, `__updateTrialPill`, `__trialExpiredNote`, `renderOutcomeSection`, `showConflictNotice`).
- **Tradeoff:** window-exposed names are a public surface; `__` prefix reduces collision risk. Nothing else was changed about the part/IIFE structure.

## D3 — Additive 7-day trial gate (no code entry required)
`trialState()` reads `mos_trial_start` (seeded on first load). While `daysLeft > 0`, the paywall modal is skipped entirely (tool fully unlocked) and a `trialPill` ("Trial: N days left") shows in the header. On expiry the existing paywall modal opens unchanged (code entry/GSI untouched) plus an expiry note. Trial state is pure DOM injection — zero HTML part changes.
- **Why:** the review asked for trial clarity without touching the paywall/verification flow.
- **Tradeoff:** client-side only — clearing localStorage resets the trial. Accepted pre-PMF; server-enforced trials are out of scope.

## D4 — Sync conflict notice (newest-wins preserved)
On download, keys present locally **and** in the remote payload with differing values are treated as conflicts (approximation: a prior `mos_sync_last` exists, so both sides changed after the last sync — the Worker stores no per-key timestamps). A dismissible banner (survives the post-sync reload via sessionStorage) lists up to 5 keys + count + last-sync timestamp; resolution stays the existing newest-wins overwrite; `sync_conflict` event logged.
- **Tradeoff:** cannot attribute which side changed; a key only in the remote payload (fresh device) is not a conflict — correct by design.

## D5 — Sync-key recovery code (local-only)
The recovery code **is** the sync key (UUID; legacy `sync-…` IDs accepted too). First key creation alerts it once (`sync_rec_new`) and logs `sync_key_created`; the sync modal has a JS-injected row: "Show code" re-displays it, "Restore" validates format and writes it back. The passphrase is user-chosen and never generated, so restore = paste code + re-enter passphrase.
- **Why:** no server-side store of keys exists or will exist; the code must restore what the user can prove they had.
- **Tradeoff:** cannot recover after same-browser data loss (the code was lost with the data) — the notice says so ("we cannot recover it for you"). New-device provisioning = paste the saved code.

## D6 — Suggestion outcomes = main-lift e1RM trend
The history screen's "Suggestion Outcomes" card compares best e1RM over the 3 main lifts in the 6 days before vs 8–15 days after each timestamped suggestion (`deload_prompt`, `plateau_note`, `fat_gate`; deduped per event+day). Direction: `±0.5 kg` deadband → improved/declined/no change; card hidden when no suggestion has outcome data; re-renders on language toggle.
- **Why:** deterministic, read-time, no new storage; LH already keeps 180 days.
- **Tradeoff:** v1 is aggregate (best-of-lifts), not per-exercise; SR/ACWR dimensions are future work.

## D7 — Coach view: design doc only (owner decision pending)
`docs/coach_view_options.md` lays out Option A (coach inbox via the existing `notify-coach` webhook → sheet), Option B (read-only ad-hoc dashboard using the existing sync GET with user-shared credentials), Option C (full workspace — deferred) and 5 explicit owner decisions (passphrase required?, EV stripping, timelines). **Not implemented** — pre-PMF, the owner must pick.

## D8 — Discrepancy: volume-distribution spec vs fixed-row selection model — **RESOLVED: formalize fixed-rows (2026-08-07)**
The volume-distribution spec (layer 2) describes a **variable-size exercise pool per muscle** with live set-recalculation as exercises are added/removed. The shipped implementation instead uses **fixed rows** — the split layer builds `day.ex` as a fixed list of muscle entries (`15_screen3_generate.js:22` picks one exercise per entry via `mos_ex_choices`), and the selection screen has no add/remove control; the per-muscle "pool" is bounded by the split's row count for that muscle.
- **Verified functional status (this pass):** live set-recalculation **is** working against fixed rows. `renderLiveVol` → `computeSelection()` reads the DOM's selected chips per row (`11_layer1_volprio.js:346`) and `distributeVolume(target, sel[muscle])` (`:307`) re-splits the muscle's weekly set target across the chosen set (compound 1.35 / isolation 0.85 weighting, remainder + fragmentation handling) on every chip click; the day estimate re-reads the same DOM state (`12_layer3_est_router.js:42` `pickerSlotNames`). The gap is pool **capacity** (no way to grow the per-muscle list beyond the split's rows), **not** recalculation correctness.
- **Resolution evidence (probe `smoke_volmodel.js`, upper_lower_4 flow):** every muscle's live alloc equals its target exactly (no double-counting on multi-row muscles); delivered program within ±10% of target for all muscles (90–109%); cap binds only on scarce-slot muscles (worst: hamstrings 10→9). **No observed volume-math weirdness — the pool spec was aspirational; fixed-rows is the real, working model.**
- **Decision:** formalize fixed-rows; **no migration**. Corrected spec: `E:\MoS\tools\VOLUME_MODEL.md` (model statement, equations, selection chain, verified consistency table, explicit out-of-scope list for any future pool migration).

## D9 — Hybrid-athlete workload: tendon protocols gated behind clinical review (2026-08-07)
Part 6 of the hybrid-athlete workload ships tendon-rehab protocol content for 4 groups (patellar, Achilles, elbow flexor/extensor, rotator cuff) as `TENDON_PROTOCOLS` in `js/05_injury_joints.js`, each with **`pendingClinicalReview: true`**. The user-facing rehab panel renders a review-pending card (header + severity + non-diagnosis disclaimer) instead of the protocol text; the full content exists only in source. The task referenced a "crisis-copy blocker" as the mechanism to mirror — **no such blocker exists in this repo** (grep-verified: zero hits for crisis/clinical/review in DECISIONS.md/PRD), so this entry plus the data-level flag is the blocker, created fresh. Closest existing analog: `meta_inferred_tip`/`metadataSource:"inferred"` (`js/30_exercise_db.js:177`).
- **Why:** the protocol text is general loading principles (isometrics → heavier slow-tempo progression, own words), but tendon rehab crosses the clinical line; it must not reach users until a named clinical reviewer clears each group. Owner decision: no reviewer identified yet — **stays blocked indefinitely**; the flag is NOT to be cleared without one.
- **Tradeoff:** four joints (knee/ankle/elbow/shoulder) show the review-pending card instead of a full protocol until review; users with active pain on those joints get the stop/inflammation message + consult CTA but not graded loading guidance. Accepted per owner decision (2026-08-07).

## D10 — Mobile engine port: machine-extracted data + faithful TS port (2026-08-07)
The Alpha mobile app (`mos-mobile`) ports the training app's validated engines to framework-agnostic TypeScript. Data was **machine-extracted**, not hand-transcribed: `scripts/extract-training-data.mjs` runs the main IIFE in a Node `vm` sandbox and serializes the named supersets (58 names, 536 KB, `as const`) to `src/training-logic/data/training-data.generated.ts`. Engines (`rpe`, `load-engine`, `exercise-meta`, `volume`, `strain`) are line-level ports of `10_engines.js`/`11_layer1_volprio.js`/`09_pl_weakpoints_quiz.js` with three accepted deviations: (1) storage/clock injected as pure function inputs; (2) i18n keys returned instead of resolved strings; (3) `now` injectable for determinism.
- **Verified:** 94 Vitest tests green + `tsc --noEmit` clean; contract parity tests replicate the tool's own smoke-suite unit expectations (`smoke_voleng`/`smoke_volmodel`), including the PR-credit indirect-volume case (BP → triceps 2.7 / shoulders 1.5) and the 12-exercise fragmentation case. One real port bug was caught and fixed (double-prog branch missing `rep=tRR[0]`).
- **Tradeoffs:** `as const` readonly tuples require casts at module boundaries; source quirks (e.g. `eid.split('__')[1]` = exercise name, `equipTag('Triceps Pushdown')` = '') are preserved faithfully, not "fixed".


## D11 — EliteFit full port: sequenced absorption into MOS RN (2026-08-07)
EliteFit (Flutter/Dart, Firebase Auth, Drift SQLite, Firestore backup) is fully retired. Every usable feature ports into MOS RN (Expo/Zustand/Supabase). No Firebase↔Supabase bridge — each domain migrates its data model directly into Supabase as it ships.
- **Audit findings (unchanged):** 14 Flutter domains audited. 5 skip entirely (MOS RN already owns `exercises`, `strength`, `workout_splits`, `splash`, `guides`). 4 salvage/merge (`auth`, `profile`, `home`, `health_intelligence`). 5 genuinely new build (`meals`, `diet_plans`, `scale`, `favorites`, HealthKit/Google Fit sync). Website tools: 4 of 6 already ported; TDEE Adaptive Engine is the key unported tool. Training app backlog (22 features): triaged into 4 priority tiers.
- **Phase order:** (1) Auth + Supabase schema for new domains, (2) Nutrition/meals + body metrics + TDEE Adaptive Engine + dashboard, (3) Health intelligence suite + training UX backlog, (4) HealthKit/Google Fit + i18n + polish.
- **Auth migration:** hard cutover with Firebase Admin SDK export → Supabase Admin API import + password reset tokens. No dual-auth. Guest users lose local-only data (accepted pre-PMF).
- **Default assumptions (owner confirmation pending — override any of these):**
  - Foods database (`jouleit_db.json`): assumed owner-curated, safe to seed into Supabase.
  - Existing EliteFit Firestore users: assumed small count pre-PMF; "re-enter data" approach, no full migration pipeline.
  - HealthKit/Google Fit: Phase 4; manual input interim for recovery scoring.
  - Condition mode clinical reviewer: still blocked per D9 — ported condition mode inherits the same gate.
  - TDEE Adaptive Engine: Phase 2 alongside nutrition logging.
  - Worker non-sync functions (paywall codes, coach webhooks): deferred migration to FastAPI backend.
  - Arabic/RTL: post-launch pass; English-only for initial port.
- **Recovery model conflict:** EliteFit's `RecoveryDebtCubit` uses time-elapsed sleep-debt scoring (`100 - sleepDebt×3 - lowQuality×8 - highStress×5 + restDays×5`). This is **not ported as-is** — recovery scoring in MOS is effort-based (RPE × sets → stimulus magnitude via `strain.ts`). Sleep/stress become modifiers, not primary signals.
- **Safety/working-principles:** all ported features subject to soft-gate pattern, coach-visibility routing, safety-critical field confirmation, clinical content review (D9), and data metadata honesty. No exceptions.
- **Tradeoff:** full port is expensive (~14 domain-weeks estimated across all phases). Accepted because MOS is the superset product and maintaining two apps on two backends is more expensive long-term. Sequencing by AI-pipeline value ensures highest-impact features land first.

## Deferred (explicitly out of scope this sprint)

- Server-side trial enforcement; server-side key storage/recovery.
- Per-key conflict timestamps (needs Worker change).
- Any deploy of the branch artifact to the live site.
