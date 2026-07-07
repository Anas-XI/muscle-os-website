---
name: testing-strategy
description: Unified testing strategy across all Muscle OS delivery channels
compatibility: opencode
metadata:
  audience: developer
---

## Current test landscape

| Channel | Framework | Location | Count |
|---------|-----------|----------|-------|
| Bot | pytest 9.1 + pytest-asyncio | `tests/` | 56 tests |
| Alpha | Vitest 4.1 | `src/**/*.test.ts` | 94 tests |
| Mobile backend | pytest | `backend/tests/` | partial |
| Mobile client | (none) | — | 0 |

## Bot testing (pytest)

Run: `python -m pytest tests/ -v`
Key patterns:
- Use `pytest-asyncio` for async handler tests
- Mock `telegram.Bot` and `telegram.Update` for handler unit tests
- Mock LLM calls in `program_generator.py` and `chatbot.py` tests
- Test each intake handler's state transition (return state must match next question)
- Test ED screening logic via `mos_cli.py.evaluate_ed_screening()`

## Alpha testing (Vitest)

Run: `cd muscle-os-alpha && npx vitest run`
Uses `node` environment (not jsdom). Write tests in `src/**/*.test.ts`.

## What to prioritize

- Bot tests: intake state machine, check-in flow, ED screening
- Integration test: full intake -> program -> check-in cycle (`test_e2e_pipeline.py`)
- Data integrity: user profiles saved/loaded correctly, check-in persistence
- LLM edge cases: timeout, malformed response, fallback behavior
