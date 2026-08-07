# Muscle OS — Training Tool Decisions (PMF gap sprint)

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


## Deferred (explicitly out of scope this sprint)

- Server-side trial enforcement; server-side key storage/recovery.
- Per-key conflict timestamps (needs Worker change).
- Any deploy of the branch artifact to the live site.
