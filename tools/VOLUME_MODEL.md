# Volume Distribution Model — formalized spec (fixed-rows)

Status: **formalized** — replaces the aspirational "variable-size pool" description (see D8 in `E:\MoS\DECISIONS.md`).
Evidence harness: `C:\Users\anass\AppData\Local\Temp\opencode\smoke_volmodel.js` (playwright, `file:///E:/MoS/tools/training_tool.html`, upper_lower_4 flow).

## 1. Model statement

The volume engine operates on **fixed rows**, not a variable-size pool:

- A split's `day.ex` is a fixed list of muscle entries (`08_rpe_splits.js`). Each entry = one row in the selection screen.
- Each row selects exactly **one** exercise from that muscle's pool. There is **no add/remove control**; the per-muscle pool is bounded by the split's row count for that muscle.
- The spec's "variable-size pool per muscle with live set-recalculation as exercises are added/removed" is **not implemented** and is now formally out of scope (owner decision, D8 resolved 2026-08-07).

## 2. Selection default chain (identical in picker, generator, and estimator)

For every slot `ex`:

```
chosen(ex) = mos_ex_choices[ex.n]        (confirmed pick, stored at confirm)
           || pendingExChoices[ex.n]     (in-session pick)
           || prefTop(ex.n)              (highest-weighted preference)
           || ex.n                       (template name)
```

Shared by: picker chip rendering (`14_screen25_picker.js` `slotChipsHtml`), program generation (`15_screen3_generate.js:22`), and the estimate path (`12_layer3_est_router.js:33`). This is the invariant that keeps live review, generated program, and day estimates on the same exercises.

## 3. Allocation math

### 3.1 Selection read (`computeSelection`, `11_layer1_volprio.js:346`)
- Reads the DOM: for each `.ex-sel-row`, the `.ex-sel-chip.selected` value.
- Groups by `row.dataset.muscle`, **deduplicates** per muscle. Multi-row same-muscle days (e.g., upper_lower_4 has chest/back/shoulders/quads/glutes/traps in 2 days) merge into one per-muscle selection set → one allocation, no double-counting (verified: every muscle `allocTotal === target` in the probe).

### 3.2 Distribution (`distributeVolume(muscleTarget, selectedExercises)`, `11_layer1_volprio.js:307`)
- Weight per exercise: `compound → 1.35`, `isolation → 0.85` (from `EXERCISE_META[name].t`; unknown/custom names default to compound — `07_guides_meta.js:160`).
- With `prCredit` (PR-credit toggle): SBD-family exercises with a PR in the last 14 days get `×1.15`, plus indirect volume credit to secondary muscles (`SBD_FAMILY`, `11_layer1_volprio.js:289`).
- Raw share: `target × w_i / Σw`. Allocation: `max(1, floor(raw))`, then remainder distributed **one set at a time to the largest remaining fractions** until the target is met (or entries exhausted — see 3.4).
- `fragmentation` = exercises allocated `< 2` sets/week → surfaced as `vl_frag` ("Too many exercises for this target — {X} drop below 2 sets/week").

### 3.3 Slot share and program sets (`15_screen3_generate.js:24-30`, mirrored by `setsForSlotInDay` in `12_layer3_est_router.js:31`)
- If the reviewed allocation (`K.VA[muscle].alloc[chosen]`) exists, a slot's weekly sets:
  ```
  ns = clamp(1, MAX, round(alloc[chosen] × ex.s / Σ e.s over all same-muscle slots picking the same exercise))
  MAX = 5 (hypertrophy) / 6 (strength)
  ```
- Else: scaled default `clamp(1, MAX, round(ex.s × target/implied))`.
- **The cap is the contract**: weekly allocation is split across slots, and no slot renders more than MAX sets per session.

### 3.4 Known behavior (accepted trade-offs, verified)
- **Single-exercise absorption**: a muscle with one row absorbs the full target (e.g., `distributeVolume(16, [Bench Press]) → 16`). In real splits this is bounded by the cap: probe worst case was hamstrings (Leg Curls, 1 row × 2 days, target 10) → allocated 10, delivered 9 (4+5, rounding). No muscle under-delivered more than 10% in the probe.
- **Duplicate-name assumption**: `distributeVolume` assumes unique names; `computeSelection` guarantees this upstream. Do not feed duplicates (alloc corrupts).
- **Fragmentation warning is one-directional**: only "too many exercises" is warned; there is no mirror warning for "too few (single exercise absorbing the target)".
- **Ghost names**: `meta()` falls back to `{t:'compound', f:'moderate', jr:[], inc:2.5, rr:[6,12]}` for names not in `EXERCISE_META` (custom exercises, stale template names). All names in the expanded DB (`30_exercise_db.js` + legacy `05_injury_joints.js`) are typed correctly; verify any new pool entry has a meta entry.

## 4. Consistency guarantees (probe-verified, upper_lower_4, intermediate/hypertrophy/4d)

| Muscle | target | live alloc | delivered | |
|---|---|---|---|---|
| chest | 12 | 12 | 13 (108%) | rounding overshoot |
| back | 14 | 14 | 15 (107%) | rounding overshoot |
| traps | 8 | 8 | 8 (100%) | |
| shoulders | 11 | 11 | 12 (109%) | rounding overshoot |
| biceps | 9 | 9 | 9 (100%) | |
| triceps | 9 | 9 | 9 (100%) | |
| quads | 11 | 11 | 12 (109%) | rounding overshoot |
| hamstrings | 10 | 10 | 9 (90%) | cap/rounding |
| glutes | 10 | 10 | 10 (100%) | |
| calves | 8 | 8 | 8 (100%) | |

- Live alloc always equals target exactly (merge correctness).
- Delivered program within ±10% of target for every muscle; the delta is slot-share rounding (`round(alloc × ex.s/tot)`) and the MAX cap, never double-counting.
- Day estimates (`estDaySecFromSplit` via `pickerSlotNames`) read the same DOM selection as the volume engine — no drift between screens.

## 5. Explicitly out of scope (migrating to a true pool would require)

- `day.ex` mutation + persistence (schema change in `K.SP`/`K.PG`).
- Add/remove UI in the picker (currently fixed rows only).
- `generateProgram` capacity for >1 choice per slot.
- A "too few exercises" fragmentation warning.
- Per-session set caps stay as-is (5/6 by goal) regardless of model.

Owner decision (D8, 2026-08-07): **formalize fixed-rows** — no migration.
