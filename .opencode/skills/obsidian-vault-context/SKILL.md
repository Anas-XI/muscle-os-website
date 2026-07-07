---
name: obsidian-vault-context
description: Select the right knowledge base document from the Muscle OS Obsidian vault for a given user profile or coaching context
compatibility: opencode
metadata:
  audience: developer
  vault_root: Muscle Operating System
---

## Vault structure

`Muscle Operating System/` is an Obsidian vault with the following key directories:

- `00_META/` — Executive docs (PMF sprint, architecture map, vision, backlog)
- `01_RESEARCH/` — Scientific research and references
- `02_MECHANISMS/` — Physiological mechanisms
- `02_PILLARS/` — Pillar-specific content (1-10)
- `03_ASSESSMENTS/` — Assessment tools and protocols
- `03_PRINCIPLES/` — Training principles
- `03_SECTIONS/` — Detailed pillar sections (per-pillar breakdown)
- `04_PROTOCOLS/` — Protocols and programs
- `04_TOOLS/` — Calculators, trackers, tools
- `05_SYSTEMS/` — System docs (safety triage, clearance, self-coaching)
- `07_PROFILES/` — User archetype profiles
- `08_VERSIONS/` — Operating mode versions
- `09_EVIDENCE/` — Evidence base

## Key entry points

- `Muscle OS Core Engine.md` — Central decision-making loop (ALL phases)
- `Master Protocol.md` — 10 pillars at MED/Overkill tiers
- `USER_GUIDE.md` — How to run the system
- `Muscle OS Start Here.md` — New user entry point
- `05_SYSTEMS/Muscle OS Safety Triage.md` — Safety screening before any protocol

## Context selection rules

Given a user profile (from `data/users/<id>.json`), select docs based on:

1. **Experience level**: Beginner -> `03_ASSESSMENTS/Beginner Technique Assessment.md`, novice -> `02_PILLARS/Pillar 2 - Training Maxing.md`
2. **Goal**: Hypertrophy -> relevant pillar sections under `03_SECTIONS/Pillar 2/`
3. **Health flags**: Gut health -> `03_SECTIONS/Pillar 1/Gut Health Pathway.md`, sleep -> `03_SECTIONS/Pillar 4/`
4. **ED screening result**: If yellow/red -> `05_SYSTEMS/Muscle OS Safety Triage.md`
5. **Operating version**: If set -> `08_VERSIONS/<version>/`

Always start with the Core Engine doc for any new coaching interaction. Use pillar sections for specific adjustments.
