---
name: architecture-review
description: Review and validate architectural decisions across Muscle OS 3 delivery channels
compatibility: opencode
metadata:
  audience: developer
---

## System overview

Muscle OS has 3 delivery channels sharing a common knowledge base at `Muscle Operating System/`:

1. **Telegram bot** (Python, python-telegram-bot 22.8, FastAPI 0.115.12) — primary channel
2. **Alpha app** (TypeScript, React 19, Vite 6, Tailwind v4, Zustand 5, Electron) — desktop
3. **Mobile app** (TypeScript, Expo SDK 57, React Native 0.86, Supabase) — separate repo at `mos-mobile/`

## What to check

- Consistency: do all 3 channels use the same LLM interface (`chatbot.py`)?
- Data flow: does the knowledge base (`Muscle Operating System/`) serve all channels through `vault_context.py`?
- State management: bot uses telegram ConversationHandler states, alpha uses Zustand, mobile uses Zustand — are they modeling the same domain?
- API layers: bot web `mos_bot/web/app.py`, mobile backend `mos-mobile/backend/` — are they converging or diverging?
- Deployment: Procfile for bot, Docker for mobile backend, Electron for alpha — are the infra patterns compatible?

## Decision-making rules

- Follow the PMF Sprint: do not build new channels until PMF is confirmed
- Keep the LLM core (`chatbot.py`, `coaching_mode.py`) channel-agnostic
- Vault knowledge base (`Muscle Operating System/`) is the source of truth for all coaching logic
