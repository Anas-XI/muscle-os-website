# Muscle OS — Project Context

## Overview
Muscle OS is an AI-native fitness coaching system. It has 3 delivery channels:
1. **Telegram bot** (Python) — primary channel, intake → program PDF → check-ins → coach
2. **Alpha app** (TypeScript/React/Electron) — standalone desktop chat app (separate repo)
3. **CLI** (Python stubs) — not yet functional

## Current Stage (per The Founder's Playbook)
**Pre-PMF / Late MVP** — building is done, validation has not started. See `Muscle Operating System/00_META/Executive/Escalation Plan - PMF Sprint.md`.

## Bot Architecture (mos_bot/)

```
mos_bot/
├── bot.py              # Entry point, wires 3 ConversationHandlers
├── config.py           # Env vars: BOT_TOKEN, LLM_API_KEY, LM_STUDIO_URL, VAULT_ROOT
├── states.py           # All Telegram state constants (range(37))
├── core/
│   ├── analytics.py    # JSONL event logging (user_started, intake_completed, etc.)
│   ├── intake_builder.py  # Profile building, weight/height parsing
│   ├── vault_context.py   # Intelligent doc selection from vault per profile
│   ├── program_generator.py  # LLM call to generate training program
│   └── pdf_renderer.py     # Markdown → PDF via fpdf2
├── handlers/
│   ├── start.py        # /start, /intake, /help, /cancel
│   ├── intake.py       # 28-question conversational intake (8 screens)
│   ├── upload_profile.py  # JSON form upload
│   ├── checkin.py      # Weekly check-in (weight, sleep, readiness, etc.)
│   ├── coach.py        # AI coach chat via LLM
│   └── admin.py        # /status, /users (owner-only)
├── web/
│   ├── app.py          # FastAPI server (port 8080)
│   └── index.html      # Single-page web UI
└── data/               # Runtime data (gitignored)
    ├── users/          # JSON profiles
    ├── programs/       # Generated markdown programs
    ├── pdfs/           # Generated PDF programs
    ├── checkins/       # Check-in records (JSON)
    └── analytics/      # Events (JSONL)
```

## Key State Machine Flow (intake.py)

The intake conversation has exactly **8 screens** covering 28 questions. States are defined sequentially in `states.py` (0-36). **Every handler must return the state constant for the question it just sent.**

```
start → GOAL
goal_handler → SITUATION
situation_handler → EXPERIENCE
experience_handler → WEIGHT
weight_handler → HEIGHT
height_handler → AGE
age_handler → TRAINING_DAYS
training_days_handler → SESSION_LENGTH
session_length_handler → CURRENT_SPLIT
current_split_handler → INJURIES
injuries_handler → GUT_HEALTH
injuries_text_handler → GUT_HEALTH
gut_health_handler → SLEEP
sleep_handler → STRESS
stress_handler → STEPS
steps_handler → CAFFEINE
caffeine_handler → SUPPLEMENTS
supplements_handler → MEDICAL
medical_handler (None) → ED_SCREENING_1
medical_handler (describe) → MEDICAL
medical_text_handler → ED_SCREENING_1
ed1_handler → ED_SCREENING_2
ed2_handler → ED_SCREENING_3
ed3_handler → ED_SCREENING_4
ed4_handler → evaluate → HYDRATION
water_handler → ALCOHOL_WEEKLY
alcohol_handler → WORK_SCHEDULE
work_schedule_handler → MOBILITY
mobility_handler → BLOODWORK
bloodwork_handler → MENTAL_HEALTH
mental_health_handler → CONFIRM_PROFILE
confirm_handler → END
```

**Critical:** If you edit any handler, update both the send_question call AND the return state to match.

## Conventions

- **Imports:** Relative within `mos_bot`, absolute for external modules
- **Config:** All secrets/settings from `config.py` via `os.getenv()` — never hardcoded
- **Analytics:** Every new user-facing action should call `track()` from `mos_bot.core.analytics`
- **Free-text inputs:** Always sanitize with `_sanitize_text()` from `intake.py`
- **LLM:** Two modes — local (LM Studio at LM_STUDIO_URL) or cloud (LLM_API_URL + LLM_API_KEY)
- **Tests:** Run with `python -m pytest tests/` — all 56 should pass

## External Dependencies (root level)

- `checkin_tracker.py` — check-in persistence + trend analysis
- `chatbot.py` — LLM chat completion (imported by coach handler)
- `coaching_mode.py` — system prompt for coach
- `mos_cli.py` — ED screening evaluation

## Vault Reference

The knowledge base is at `Muscle Operating System/`. Key entry points:
- `Muscle OS Core Engine.md` — decision-making cycle
- `Master Protocol.md` — 10 pillars at MED/Overkill tiers
- `USER_GUIDE.md` — how to run the CLI
- `00_META/Executive/Escalation Plan - PMF Sprint.md` — current execution plan
- `00_META/Book Outline.md` — completed pillars and research
