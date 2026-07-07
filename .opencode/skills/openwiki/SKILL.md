---
name: openwiki
description: Generate and maintain agent-optimized codebase documentation using the OpenWiki CLI
compatibility: opencode
metadata:
  audience: developer
  source: langchain-ai/openwiki
---

## What it is

OpenWiki (langchain-ai/openwiki) is a CLI that writes and maintains documentation for your codebase, built specifically for AI agents to consume. It generates structured wiki docs and updates your CLAUDE.md/AGENTS.md with references.

## Install

```bash
npm install -g openwiki
```

## Usage

```bash
# Initialize + generate docs (first run)
openwiki --init

# Update existing docs as code changes
openwiki --update

# Interactive session
openwiki "Generate documentation for the mos_bot module"
```

## How it helps Muscle OS

- Generates agent documentation for `mos_bot/`, `mos-mobile/backend/`, and `muscle-os-alpha/`
- Keeps docs in sync as the codebase evolves (runs via scheduled GitHub Action)
- Writes references to CLAUDE.md so agents can discover wiki pages automatically
- Supports Q&A over the generated docs

## GitHub Action for auto-updates

Copy from `openwiki-update.yml` into `.github/workflows/openwiki-update.yml` to auto-update docs daily.

## Output

Generated docs live in `openwiki/` at the project root. The CLI auto-appends a reference to `CLAUDE.md` / `AGENTS.md` so agents can find and use the wiki.

## Caveats

- Requires an API key (supports OpenRouter, Fireworks, Anthropic, OpenAI)
- First run is interactive (--init)
- Designed for codebase docs, not user-facing documentation
