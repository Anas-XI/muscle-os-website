---
name: muscle-os-engine
description: Understand and apply the Muscle OS Core Engine decision-making cycle for coaching and program generation
compatibility: opencode
metadata:
  audience: developer
  core_doc: Muscle Operating System/Muscle OS Core Engine.md
---

## The operating cycle

The Core Engine never changes — only the user position in the loop does:

```
ASSESSMENT -> GOAL -> CONSTRAINTS -> PROTOCOL -> EXECUTION -> MEASUREMENT -> FEEDBACK -> ADJUSTMENT -> REPEAT
```

Each phase feeds the next. Skipping a phase produces a decision without data.

## Phase 0 — Pre-Program Clearance (mandatory)

Before any protocol: run Safety Triage (`05_SYSTEMS/Muscle OS Safety Triage.md`). If any Red flag, route through `05_SYSTEMS/Pre-Program Clearance Gate.md`. No protocol until clearance.

## Phase 1 — Assessment (6 domains)

1. Body composition (7-day weight trend, waist, photos, BF%)
2. Nutritional status (micronutrient screening by diet phase)
3. Training age (beginner/novice/intermediate/advanced)
4. Recovery (allostatic load budget)
5. Lifestyle (sleep, stress, steps, work schedule)
6. Psychological readiness

## Phase 2-9 (delegated)

- Phase 2: Goal setting -> SMART goals + timeline
- Phase 3: Constraint identification -> time, recovery, nutrition, injury
- Phase 4: Protocol generation -> program_generator.py
- Phase 5-6: Execution + Measurement -> check-in system
- Phase 7-8: Feedback + Adjustment -> coach.py
- Phase 9: Repeat

## Key references

- `Master Protocol.md` for pillar tiers and intervention priority
- `Pillar 9 - Measurement and Feedback Systems.md` for rate equations
- `05_SYSTEMS/Ambiguity Detection Engine.md` when confidence is low
- `05_SYSTEMS/Failure Recovery System.md` after setbacks
