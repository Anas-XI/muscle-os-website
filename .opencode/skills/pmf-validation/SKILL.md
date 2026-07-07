---
name: pmf-validation
description: Measure product-market fit for the Muscle OS fitness coaching system using the PMF Sprint framework
compatibility: opencode
metadata:
  audience: founder
  framework: The Founders Playbook
---

## What this is

This skill implements the PMF Sprint from the Escalation Plan in `Muscle Operating System/00_META/Executive/Escalation Plan - PMF Sprint.md`. Every action should answer: *Does this get us closer to knowing if a real user will come back Day 7?*

## PMF metrics to track

Track in `00_PMF_Tracking.csv` with columns: `user_id, signup_date, goal, archetype, source, intake_complete, checkins_count, coach_count, last_active, d7_retained, d30_retained, sean_ellis, notes`

- Day 7 retention target: >= 30%
- Day 30 retention target: >= 20%
- Sean Ellis test target: >= 40% very disappointed
- Activation: completed intake + 1 check-in

## Decision gates

- Day 5: All Phase 1 items complete? -> Phase 2 or fix first
- Day 30: Day 7 retention >= 30%? -> Phase 3 or diagnose
- Day 60: Sean Ellis >= 40%? -> Launch or pivot

## User archetypes (from `07_PROFILES/`)

Prioritize: Intermediate Plateaued Lifter (most aligned with vault focus). Secondary: Busy Professional.

## What not to build (deferred until PMF)

Alpha/Electron app, mobile app, monetization, 5 program variants, vault content expansion, N-of-1 experiment engine.
