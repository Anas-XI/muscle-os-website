#!/usr/bin/env node
/**
 * Builds shared CSS token stylesheets from e:\MoS\design-tokens.json
 * Outputs:
 *   - website/assets/css/tokens.css
 *   - website/tools/css/tokens.css
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKENS_PATH = path.join(ROOT, 'design-tokens.json');
const OUTPUTS = [
  path.join(ROOT, 'website', 'assets', 'css', 'tokens.css'),
  path.join(ROOT, 'website', 'tools', 'css', 'tokens.css'),
];

const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));

const css = `/* Auto-generated from design-tokens.json — do not edit manually */
:root {
  /* Canonical Muscle OS Obsidian + Chrome Silver Tokens */
  --mos-bg: ${tokens.color.bg};
  --mos-surface: ${tokens.color.surface};
  --mos-surface-subtle: ${tokens.color.surfaceSubtle};
  --mos-card: ${tokens.color.card};
  --mos-card-elevated: ${tokens.color.cardElevated};

  --mos-accent: ${tokens.color.accent.primary};
  --mos-accent-strong: ${tokens.color.accent.strong};
  --mos-accent-secondary: ${tokens.color.accent.secondary};
  --mos-accent-dim: ${tokens.color.accent.dim};
  --mos-accent-glow: ${tokens.color.accent.glow};

  --mos-emerald: ${tokens.color.semantic.emerald};
  --mos-emerald-dim: ${tokens.color.semantic.emeraldDim};
  --mos-cyan: ${tokens.color.semantic.cyan};
  --mos-cyan-dim: ${tokens.color.semantic.cyanDim};
  --mos-amber: ${tokens.color.semantic.amber};
  --mos-amber-dim: ${tokens.color.semantic.amberDim};
  --mos-danger: ${tokens.color.semantic.danger};
  --mos-danger-dim: ${tokens.color.semantic.dangerDim};
  --mos-rose: ${tokens.color.semantic.rose};

  --mos-text: ${tokens.color.text.primary};
  --mos-text-secondary: ${tokens.color.text.secondary};
  --mos-text-muted: ${tokens.color.text.muted};
  --mos-text-dim: ${tokens.color.text.dim};
  --mos-text-inverse: ${tokens.color.text.inverse};

  --mos-border: ${tokens.color.border.default};
  --mos-border-subtle: ${tokens.color.border.subtle};
  --mos-border-active: ${tokens.color.border.active};

  --mos-radius-sm: ${tokens.radius.sm};
  --mos-radius-md: ${tokens.radius.md};
  --mos-radius-card: ${tokens.radius.card};
  --mos-radius-lg: ${tokens.radius.lg};
  --mos-radius-pill: ${tokens.radius.pill};

  --mos-font-display: ${tokens.typography.display};
  --mos-font-body: ${tokens.typography.body};
  --mos-font-mono: ${tokens.typography.mono};
  --mos-body-size: ${tokens.typography.bodySize};

  /* Semantic Aliases */
  --ink: var(--mos-bg);
  --bg: var(--mos-bg);
  --surface: var(--mos-surface);
  --surface-2: var(--mos-card-elevated);
  --card: var(--mos-card);
  --card-bg: rgba(22, 24, 31, 0.88);
  --accent: var(--mos-accent);
  --silver: var(--mos-accent);
  --silver-glow: var(--mos-accent-glow);
  --paper: var(--mos-text);
  --text: var(--mos-text);
  --text-sub: var(--mos-text-secondary);
  --text-muted: var(--mos-text-muted);
  --gray: var(--mos-text-secondary);
  --gray-light: #CBD5E1;
  --line: var(--mos-border-subtle);
  --border: var(--mos-border);
  --border-hover: rgba(226, 232, 240, 0.42);
  --green: var(--mos-emerald);
  --red: var(--mos-danger);
  --amber: var(--mos-amber);
  --cyan: var(--mos-cyan);
}

/* Global keyboard accessibility & reduced-motion baseline */
:focus-visible {
  outline: 2px solid var(--mos-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

for (const outPath of OUTPUTS) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, css, 'utf8');
  console.log('Generated:', path.relative(ROOT, outPath));
}
