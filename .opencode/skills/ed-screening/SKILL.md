---
name: ed-screening
description: Eating disorder screening and safety triage for the Muscle OS intake process
compatibility: opencode
metadata:
  audience: developer
  safety: critical
---

## ED screening flow

The intake asks 4 ED screening questions (ED1-ED4, states ED_SCREENING_1 through ED_SCREENING_4):
- ED1: Binge episodes ("Do you experience episodes of eating large amounts of food in a short period?")
- ED2: Compensatory behavior ("Do you engage in purging, excessive exercise, or fasting to compensate?")
- ED3: Diagnosed ED ("Have you been diagnosed with an eating disorder?")
- ED4: Guilt after eating ("Do you feel guilt or shame after eating?")

## Evaluation logic (in `mos_cli.py`)

```python
evaluate_ed_screening({"ED1": "yes"/"no", "ED2": "...", "ED3": "...", "ED4": "..."})
# Returns (triage, items)
```

Triage rules:
- **Red** (do not proceed): ED3=yes OR (ED1=yes AND ED2=yes)
- **Yellow** (proceed with caution): >=2 of (ED1, ED2, ED4) OR ED4=yes alone
- **Green** (safe to proceed): everything else

## What to do per triage

- **Red**: Block program generation. Display resource message with ED helplines. Log to analytics. Do NOT store in user profile as "diagnosed" — just flag as blocked.
- **Yellow**: Proceed but add caution note to program context. Monitor check-ins for distress signals.
- **Green**: Proceed normally.

## Safety rules

- Never dismiss a red flag
- Always log ED screening events via `analytics.track()`
- Helpline resources must be local to the user's country
- ED responses are sensitive — do not expose in logs or share with third parties
