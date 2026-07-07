---
name: release-decision-gate
description: Decision gates for releasing changes across Muscle OS delivery channels based on PMF sprint stage
compatibility: opencode
metadata:
  audience: developer
  framework: The Founders Playbook
---

## Current stage

Pre-PMF / Late MVP per `Escalation Plan - PMF Sprint.md`. Building is done, validation has not started.

## Decision rules

### Channel priority
1. **Telegram bot** (mos_bot/) — ONLY channel to ship to. This is the PMF channel.
2. **Alpha app** (muscle-os-alpha/) — Frozen until PMF confirmed (per deferred items)
3. **Mobile app** (mos-mobile/) — Frozen until PMF confirmed

### What to ship now
- Bug fixes in bot state machine, check-in persistence, LLM integration
- Security fixes (input validation, .env protection, data gitignoring)
- Analytics events to measure PMF signals
- CLAUDE.md and AI context improvements

### What NOT to ship (deferred)
- New features beyond the existing intake -> program -> check-in -> coach flow
- Alpha app features or revival work
- Mobile app development
- New program variants or vault content
- Monetization
- N-of-1 experiment engine

### Release checklist
1. Run `python -m pytest tests/ -v` — all 56 must pass
2. Verify no secrets committed (`git diff --cached --check`)
3. Verify `.env` not tracked (`git check-ignore .env`)
4. Run the bot in test mode once
5. Check analytics JSONL file writes correctly
