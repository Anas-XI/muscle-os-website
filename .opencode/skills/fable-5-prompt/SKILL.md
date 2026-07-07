---
name: fable-5-prompt
description: Reference for Anthropic Claude Fable 5 leaked system prompt — prompt engineering patterns, safety architecture, and tool orchestration
compatibility: opencode
metadata:
  audience: developer
  source: github.com/asgeirtj/system_prompts_leaks
  leak_date: 2026-06-09
---

## Source

Primary source (48K stars, updated regularly):
`github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.md`

Also at CL4R1T4S (44.5K stars):
`github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC/CLAUDE-FABLE-5.md`

Curated version with analysis:
`github.com/saynchowdhury/claude-fable-5-system-prompt`

## What it reveals

The leaked prompt is the most detailed look at how Anthropic structures a production system prompt. Key sections:

### Safety architecture
- Dual-use capability classifiers route sensitive requests to Opus 4.8 fallback
- Copyright hard limit: quoting >=15 words from a single source is flagged
- ED screening language patterns (directly relevant to `mos_cli.py`)
- Refusal patterns for self-harm, disordered eating, crisis content

### Tool orchestration
- 22+ tool schemas defined inline (Artifacts, web search, MCP, code execution)
- Persistent storage API (key-value across sessions)
- Application connectors (Cowork, Chrome, Excel, PowerPoint)

### Prompt engineering techniques
- Positive + negative examples paired for every rule
- Repeated rules 4+ times at critical points
- Checklists the model runs before every response
- Prose-first output (line 847: avoid bullet points/headers unless asked)

## How it applies to Muscle OS

- **ED screening**: Fable 5's handling of disordered eating language informs how `mos_cli.py` and the intake should phrase questions
- **Prompt structure**: The repetition + example + counterexample pattern improves `coaching_mode.py` and `program_generator.py` prompts
- **Tool schemas**: The inline tool definition format can be adapted for LLM function calling in the coach chat
- **Safety boundaries**: Directly applicable to health data handling in a fitness coaching context

## Note

This is a leaked document — authenticity not officially confirmed by Anthropic. Use for structural and pattern reference, not as verbatim copy material.
