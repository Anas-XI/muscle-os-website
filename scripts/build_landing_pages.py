# -*- coding: utf-8 -*-
import os

OUTPUT_DIR = os.path.join("website", "products")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. SHARED CSS
SHARED_CSS = """/* ── Muscle OS Product Landing Pages Shared Stylesheet ── */
:root {
  --ink: #0f1015;
  --ink-2: rgba(22, 24, 30, 0.75);
  --ink-3: rgba(30, 33, 42, 0.85);
  --card-bg: rgba(20, 22, 28, 0.7);
  --card-border: rgba(255, 255, 255, 0.08);
  --card-hover-border: rgba(244, 201, 59, 0.35);
  --yellow: #F4C93B;
  --yellow-light: #ffd659;
  --yellow-dim: #C9A227;
  --yellow-glow: rgba(244, 201, 59, 0.25);
  --paper: #FAFAF8;
  --gray: #9ca3af;
  --gray-light: #d1d5db;
  --gray-dark: #4b5563;
  --line: rgba(244, 201, 59, 0.15);
  --line-subtle: rgba(255, 255, 255, 0.06);
  --green: #10b981;
  --green-glow: rgba(16, 185, 129, 0.25);
  --blue: #3b82f6;
  --purple: #c026d3;
  --gradient-bg: radial-gradient(circle at top right, #1f1b0a 0%, #0f1015 55%);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 80px; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--gradient-bg);
  background-color: var(--ink);
  color: #fff;
  line-height: 1.6;
  overflow-x: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.display { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
.mono { font-family: 'JetBrains Mono', monospace; }
img { max-width: 100%; display: block; }
a { color: inherit; text-decoration: none; }

.wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; width: 100%; }
.wrap-narrow { max-width: 860px; margin: 0 auto; padding: 0 24px; width: 100%; }

::selection { background: var(--yellow); color: var(--ink); }

/* HEADER & NAVIGATION */
header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(15, 16, 21, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
}
.nav-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand span {
  color: var(--yellow);
  text-shadow: 0 0 10px var(--yellow-glow);
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.nav-links a {
  color: #C7C9D0;
  transition: all 0.2s ease;
}
.nav-links a:hover {
  color: var(--yellow);
  text-shadow: 0 0 8px var(--yellow-glow);
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-cta {
  background: linear-gradient(135deg, var(--yellow), var(--yellow-light));
  color: var(--ink);
  font-weight: 700;
  font-size: 12.5px;
  padding: 9px 18px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px var(--yellow-glow);
}
.nav-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 201, 59, 0.4);
  background: #fff;
}
.nav-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--gray);
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.2s ease;
}
.nav-back-link:hover {
  color: var(--yellow);
}

/* BUTTONS */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  border: none;
  text-decoration: none;
}
.btn-primary {
  background: linear-gradient(135deg, var(--yellow), var(--yellow-light));
  color: var(--ink);
  box-shadow: 0 4px 18px var(--yellow-glow);
}
.btn-primary:hover {
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.35);
}
.btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
}
.btn-ghost:hover {
  border-color: var(--yellow);
  color: var(--yellow);
  background: rgba(244, 201, 59, 0.06);
  transform: translateY(-2px);
}
.btn-green {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: #064e3b;
  box-shadow: 0 4px 18px var(--green-glow);
}
.btn-green:hover {
  background: #fff;
  color: #064e3b;
  transform: translateY(-2px);
}
.btn-lg {
  padding: 16px 36px;
  font-size: 15px;
}
.btn-block {
  width: 100%;
}

/* BADGES & LABELS */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.badge-yellow {
  background: rgba(244, 201, 59, 0.12);
  color: var(--yellow);
  border: 1px solid rgba(244, 201, 59, 0.3);
}
.badge-green {
  background: rgba(16, 185, 129, 0.12);
  color: var(--green);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.badge-blue {
  background: rgba(59, 130, 246, 0.12);
  color: var(--blue);
  border: 1px solid rgba(59, 130, 246, 0.3);
}
.badge-purple {
  background: rgba(192, 38, 211, 0.12);
  color: var(--purple);
  border: 1px solid rgba(192, 38, 211, 0.3);
}
.eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--yellow);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border-left: 3px solid var(--yellow);
  padding-left: 10px;
  text-shadow: 0 0 8px var(--yellow-glow);
}
.eyebrow-center {
  border-left: none;
  padding-left: 0;
  text-align: center;
  display: block;
}

/* SECTIONS */
.section-pad {
  padding: 90px 0;
  position: relative;
}
.section-pad-sm {
  padding: 50px 0;
}
.section-header {
  margin-bottom: 48px;
}
.section-header.center {
  text-align: center;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
h1.hero-title {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  font-size: clamp(34px, 5.2vw, 64px);
  line-height: 1.02;
  letter-spacing: 0.5px;
  color: #fff;
  margin-bottom: 20px;
}
h1.hero-title .accent {
  background: linear-gradient(to right, var(--yellow), #ffdf70);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(244, 201, 59, 0.2);
}
h2.section-title {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.1;
  color: #fff;
  margin-bottom: 14px;
}
.section-subtitle {
  color: var(--gray);
  font-size: 16px;
  line-height: 1.7;
}

/* HERO SECTION */
.product-hero {
  padding-top: 130px;
  padding-bottom: 80px;
  position: relative;
  overflow: hidden;
}
.hero-glow-blob {
  position: absolute;
  top: 10%;
  right: 15%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(244, 201, 59, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 56px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.hero-text .hero-sub {
  font-size: 17px;
  color: #d1d5db;
  line-height: 1.7;
  margin-bottom: 28px;
}
.hero-ctas {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}
.trust-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid var(--line-subtle);
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--gray);
  font-weight: 500;
}
.trust-item svg {
  color: var(--yellow);
  flex-shrink: 0;
}

/* HERO VISUAL / MOCKUP CARD */
.hero-visual-card {
  background: var(--ink-2);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.hero-visual-card:hover {
  border-color: var(--card-hover-border);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 201, 59, 0.1);
}
.mockup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line-subtle);
}
.mockup-dots {
  display: flex;
  gap: 6px;
}
.mockup-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}
.mockup-dot:nth-child(1) { background: #ef4444; }
.mockup-dot:nth-child(2) { background: #f59e0b; }
.mockup-dot:nth-child(3) { background: #10b981; }

.mockup-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--gray);
  letter-spacing: 0.5px;
}

/* PROBLEM / SOLUTION (PAIN VS RELIEF) */
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 36px;
}
.comparison-card {
  padding: 36px 30px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
  position: relative;
}
.comparison-card.pain {
  background: rgba(239, 68, 68, 0.03);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.comparison-card.relief {
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.3);
}
.comparison-title {
  font-family: 'Oswald', sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.comparison-card.pain .comparison-title { color: #f87171; }
.comparison-card.relief .comparison-title { color: #34d399; }
.comparison-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comparison-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 14.5px;
  line-height: 1.6;
}
.comparison-item svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.comparison-card.pain .comparison-item { color: #d1d5db; }
.comparison-card.relief .comparison-item { color: #FAFAF8; font-weight: 500; }

/* FEATURE CARDS GRID */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 36px;
}
.feature-card {
  background: var(--ink-2);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 32px 26px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}
.feature-card:hover {
  transform: translateY(-5px);
  border-color: var(--card-hover-border);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(244, 201, 59, 0.08);
}
.feature-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(244, 201, 59, 0.1);
  border: 1px solid rgba(244, 201, 59, 0.25);
  color: var(--yellow);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.feature-card h3 {
  font-family: 'Oswald', sans-serif;
  font-size: 19px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}
.feature-card p {
  color: var(--gray);
  font-size: 14px;
  line-height: 1.65;
}
.feature-card .feature-highlight {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line-subtle);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--yellow);
}

/* HOW IT WORKS (3-STEP) */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 36px;
  position: relative;
}
.step-card {
  background: var(--ink-2);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}
.step-card:hover {
  border-color: rgba(244, 201, 59, 0.3);
  transform: translateY(-3px);
}
.step-number {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(244, 201, 59, 0.1);
  border: 1px solid var(--yellow);
  color: var(--yellow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 16px;
  margin: 0 auto 18px;
  box-shadow: 0 0 15px var(--yellow-glow);
}
.step-card h4 {
  font-family: 'Oswald', sans-serif;
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 10px;
}
.step-card p {
  color: var(--gray);
  font-size: 13.5px;
  line-height: 1.6;
}

/* WHAT'S INCLUDED / CHAPTERS / SPEC BREAKDOWN */
.breakdown-box {
  background: var(--ink-2);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 40px 36px;
  backdrop-filter: blur(10px);
}
.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 28px;
}
.breakdown-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--line-subtle);
  border-radius: 8px;
  transition: all 0.2s ease;
}
.breakdown-item:hover {
  background: rgba(244, 201, 59, 0.03);
  border-color: rgba(244, 201, 59, 0.2);
}
.breakdown-item svg {
  color: var(--green);
  flex-shrink: 0;
  margin-top: 2px;
}
.breakdown-item .item-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.breakdown-item .item-desc {
  font-size: 12px;
  color: var(--gray);
  margin-top: 2px;
}

/* PRICING SECTION */
.pricing-wrapper {
  max-width: 600px;
  margin: 0 auto;
}
.pricing-card {
  background: linear-gradient(145deg, rgba(32, 28, 12, 0.8), var(--ink-2));
  border: 1px solid rgba(244, 201, 59, 0.4);
  border-radius: 20px;
  padding: 44px 36px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(244, 201, 59, 0.15);
  position: relative;
  text-align: center;
  backdrop-filter: blur(12px);
}
.pricing-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, var(--yellow), #ffdf70);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 5px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 15px var(--yellow-glow);
}
.currency-switch-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.currency-switch {
  background: rgba(15, 16, 21, 0.8);
  padding: 4px;
  border-radius: 30px;
  display: inline-flex;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.curr-btn {
  border-radius: 25px;
  background: transparent;
  color: #fff;
  padding: 6px 18px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.curr-btn.active {
  background: var(--yellow);
  color: #000;
}
.price-display {
  margin: 20px 0 12px;
}
.price-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.price-period {
  font-size: 14px;
  color: var(--gray);
  margin-top: 6px;
}
.price-annual-note {
  font-size: 13px;
  color: var(--green);
  font-weight: 600;
  margin-bottom: 24px;
}
.pricing-features-list {
  list-style: none;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 28px 0;
  padding: 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.pricing-feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #e5e7eb;
}
.pricing-feature-item svg {
  color: var(--yellow);
  flex-shrink: 0;
}
.guarantee-note {
  font-size: 12px;
  color: var(--gray);
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* SOCIAL PROOF & COACH BIO BANNER */
.coach-proof-card {
  background: linear-gradient(180deg, var(--ink-2) 0%, rgba(20, 22, 28, 0.9) 100%);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 36px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 32px;
  align-items: center;
}
.coach-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--yellow);
  box-shadow: 0 0 20px var(--yellow-glow);
}
.coach-proof-details h3 {
  font-family: 'Oswald', sans-serif;
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 4px;
}
.coach-proof-details .coach-title {
  font-size: 12px;
  color: var(--yellow);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 12px;
  text-transform: uppercase;
}
.coach-proof-details p {
  color: #d1d5db;
  font-size: 14px;
  line-height: 1.6;
}
.proof-stats-row {
  display: flex;
  gap: 24px;
  margin-top: 16px;
}
.p-stat {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--gray);
}
.p-stat b {
  color: var(--yellow);
}

/* FAQ ACCORDION */
.faq-wrap {
  max-width: 760px;
  margin: 0 auto;
}
.faq-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  margin-bottom: 12px;
  background: var(--ink-2);
  overflow: hidden;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s ease;
}
.faq-item:hover {
  border-color: rgba(244, 201, 59, 0.3);
}
.faq-item summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
  font-size: 15px;
  color: #fff;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after {
  content: '+';
  font-family: 'JetBrains Mono', monospace;
  color: var(--yellow);
  font-size: 1.3rem;
  transition: transform 0.3s ease;
}
.faq-item[open] summary::after {
  transform: rotate(45deg);
}
.faq-answer {
  padding: 0 22px 20px;
  color: var(--gray);
  font-size: 14px;
  line-height: 1.7;
}

/* CROSS-SELL / ECOSYSTEM UPGRADE */
.cross-sell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 28px;
}
.cross-sell-card {
  background: var(--ink-2);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cross-sell-card:hover {
  border-color: rgba(244, 201, 59, 0.35);
  transform: translateY(-4px);
}
.cross-sell-title {
  font-family: 'Oswald', sans-serif;
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 6px;
}
.cross-sell-desc {
  font-size: 13px;
  color: var(--gray);
  line-height: 1.5;
  margin-bottom: 16px;
}
.cross-sell-price {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--yellow);
  font-weight: 700;
  margin-bottom: 14px;
}

/* FINAL CONVERSION HERO */
.final-cta-section {
  background: linear-gradient(180deg, var(--ink) 0%, #17150d 50%, var(--ink) 100%);
  border-top: 1px solid var(--line-subtle);
  border-bottom: 1px solid var(--line-subtle);
  text-align: center;
  padding: 90px 0;
}
.final-cta-inner {
  max-width: 680px;
  margin: 0 auto;
}

/* FOOTER */
footer {
  background: var(--ink);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 32px 0;
  margin-top: auto;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-links {
  display: flex;
  gap: 20px;
  font-size: 12.5px;
  color: var(--gray);
}
.footer-links a:hover { color: var(--yellow); }

/* MOBILE STICKY CTA BAR */
#mobileCtaBar {
  display: none;
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 950;
  background: rgba(15, 16, 21, 0.95);
  backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  gap: 12px;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
}
#mobileCtaBar a {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  border-radius: 6px;
  font-family: 'Oswald', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* RESPONSIVE STYLES */
@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .comparison-grid { grid-template-columns: 1fr; }
  .steps-grid { grid-template-columns: 1fr; }
  .coach-proof-card { grid-template-columns: 1fr; text-align: center; }
  .coach-avatar { margin: 0 auto; }
  .proof-stats-row { justify-content: center; }
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .section-pad { padding: 60px 0; }
  .product-hero { padding-top: 100px; padding-bottom: 50px; }
  #mobileCtaBar { display: flex; }
  body { padding-bottom: 75px; }
  .pricing-card { padding: 36px 20px; }
  .breakdown-box { padding: 28px 20px; }
}
"""

with open(os.path.join(OUTPUT_DIR, "shared-landing.css"), "w", encoding="utf-8") as f:
    f.write(SHARED_CSS)
print("Saved shared-landing.css")

def render_page(cfg):
    # Trust bar items
    trust_html = ""
    for icon_svg, text in cfg.get("trust_items", []):
        trust_html += f"""
        <div class="trust-item">
          {icon_svg}
          <span>{text}</span>
        </div>"""

    # Pain vs Relief items
    pain_html = ""
    for item in cfg.get("pain_items", []):
        pain_html += f"""
        <li class="comparison-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span>{item}</span>
        </li>"""

    relief_html = ""
    for item in cfg.get("relief_items", []):
        relief_html += f"""
        <li class="comparison-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{item}</span>
        </li>"""

    # Features Grid
    features_html = ""
    for icon_svg, title, desc, highlight in cfg.get("features", []):
        hl_html = f'<div class="feature-highlight">{highlight}</div>' if highlight else ""
        features_html += f"""
      <div class="feature-card">
        <div class="feature-icon-wrap">{icon_svg}</div>
        <h3>{title}</h3>
        <p>{desc}</p>
        {hl_html}
      </div>"""

    # Steps
    steps_html = ""
    for num_str, step_title, step_desc in cfg.get("steps", []):
        steps_html += f"""
      <div class="step-card">
        <div class="step-number">{num_str}</div>
        <h4>{step_title}</h4>
        <p>{step_desc}</p>
      </div>"""

    # Breakdown Items
    breakdown_html = ""
    for b_title, b_desc in cfg.get("breakdown_items", []):
        breakdown_html += f"""
        <div class="breakdown-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <div>
            <div class="item-title">{b_title}</div>
            <div class="item-desc">{b_desc}</div>
          </div>
        </div>"""

    # Pricing Features
    p_cfg = cfg.get("pricing", {})
    p_features_html = ""
    for pf in p_cfg.get("features", []):
        p_features_html += f"""
          <li class="pricing-feature-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{pf}</span>
          </li>"""

    # Pricing CTAs
    p_cta_primary = p_cfg.get("primary_cta", {})
    p_cta_sec = p_cfg.get("secondary_cta", {})
    sec_cta_html = f'<a href="{p_cta_sec.get("href")}" class="btn btn-ghost btn-block" style="margin-top:10px;">{p_cta_sec.get("text")}</a>' if p_cta_sec else ""

    annual_note_html = f'<div class="price-annual-note">{p_cfg.get("annual_note")}</div>' if p_cfg.get("annual_note") else ""

    # FAQs
    faq_html = ""
    for q, a in cfg.get("faqs", []):
        faq_html += f"""
      <details class="faq-item">
        <summary>{q}</summary>
        <div class="faq-answer">{a}</div>
      </details>"""

    # Cross sells
    cross_html = ""
    for cs_title, cs_desc, cs_price, cs_href, cs_btn in cfg.get("cross_sells", []):
        cross_html += f"""
      <div class="cross-sell-card">
        <div>
          <div class="cross-sell-title">{cs_title}</div>
          <div class="cross-sell-desc">{cs_desc}</div>
        </div>
        <div>
          <div class="cross-sell-price">{cs_price}</div>
          <a href="{cs_href}" class="btn btn-ghost btn-block" style="font-size:12px; padding:10px 16px;">{cs_btn} &rarr;</a>
        </div>
      </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.google-analytics.com; connect-src 'self' https://muscleos-access-control.muscleos.workers.dev; frame-ancestors 'self'; base-uri 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<title>{cfg.get("title")}</title>
<meta name="description" content="{cfg.get("meta_description")}">
<meta property="og:title" content="{cfg.get("title")}">
<meta property="og:description" content="{cfg.get("meta_description")}">
<meta property="og:image" content="https://muscleos.is-a.dev/assets/img/coach.jpg">
<meta property="og:type" content="product">
<meta property="og:url" content="https://muscleos.is-a.dev/products/{cfg.get("filename")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{cfg.get("title")}">
<meta name="twitter:description" content="{cfg.get("meta_description")}">
<meta name="twitter:image" content="https://muscleos.is-a.dev/assets/img/coach.jpg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="shared-landing.css">
</head>
<body>

<header>
  <div class="nav-inner">
    <a href="../index.html" class="brand">ANAS MO'MEN <span>COACHING</span></a>
    <nav class="nav-links">
      <a href="#overview">Overview</a>
      <a href="#comparison">Why Muscle OS</a>
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
    </nav>
    <div class="nav-actions">
      <a href="../index.html" class="nav-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>All Products</span>
      </a>
      <a class="nav-cta" href="{p_cta_primary.get("href", "#pricing")}">
        <span>{cfg.get("nav_cta_text", "Get Access")}</span>
      </a>
    </div>
  </div>
</header>

<!-- HERO SECTION -->
<section class="product-hero" id="overview">
  <div class="hero-glow-blob"></div>
  <div class="wrap hero-grid">
    <div class="hero-text">
      <div class="eyebrow">{cfg.get("eyebrow")}</div>
      <h1 class="hero-title">{cfg.get("hero_h1")}</h1>
      <p class="hero-sub">{cfg.get("hero_sub")}</p>
      
      <div class="hero-ctas">
        <a href="{cfg.get("primary_cta", {}).get("href", "#pricing")}" class="btn btn-primary btn-lg">
          {cfg.get("primary_cta", {}).get("text", "Get Started")}
        </a>
        <a href="{cfg.get("secondary_cta", {}).get("href", "#features")}" class="btn btn-ghost btn-lg">
          {cfg.get("secondary_cta", {}).get("text", "Explore Features")}
        </a>
      </div>

      <div class="trust-bar">
        {trust_html}
      </div>
    </div>

    <div class="hero-visual-card">
      <div class="mockup-header">
        <div class="mockup-dots">
          <span class="mockup-dot"></span>
          <span class="mockup-dot"></span>
          <span class="mockup-dot"></span>
        </div>
        <div class="mockup-title">{cfg.get("mockup_title", "MUSCLE OS // ACTIVE ENGINE")}</div>
        <span class="badge {cfg.get("badge_class", "badge-yellow")}">LIVE</span>
      </div>
      {cfg.get("mockup_html", "")}
    </div>
  </div>
</section>

<!-- PROBLEM VS SOLUTION -->
<section class="section-pad" id="comparison" style="background: rgba(15, 16, 21, 0.4); border-top: 1px solid var(--line-subtle); border-bottom: 1px solid var(--line-subtle);">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">The Methodology Shift</span>
      <h2 class="section-title">Built Against Guesswork. Engineered For Progress.</h2>
      <p class="section-subtitle">Most lifters plateau because they rely on static templates or subjective feelings. Here is how Muscle OS changes the equation.</p>
    </div>

    <div class="comparison-grid">
      <div class="comparison-card pain">
        <div class="comparison-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span>{cfg.get("pain_title", "Without Muscle OS")}</span>
        </div>
        <ul class="comparison-list">
          {pain_html}
        </ul>
      </div>

      <div class="comparison-card relief">
        <div class="comparison-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{cfg.get("relief_title", "With Muscle OS")}</span>
        </div>
        <ul class="comparison-list">
          {relief_html}
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- CORE FEATURES GRID -->
<section class="section-pad" id="features">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">Architectural Capabilities</span>
      <h2 class="section-title">{cfg.get("features_title", "Deep Feature Breakdown")}</h2>
      <p class="section-subtitle">{cfg.get("features_sub", "Every feature is backed by exercise physiology, neuromuscular research, and mechatronic feedback loop design.")}</p>
    </div>

    <div class="features-grid">
      {features_html}
    </div>
  </div>
</section>

<!-- WHAT IS INCLUDED / SYLLABUS / SPECIFICATION -->
<section class="section-pad" style="background: rgba(15, 16, 21, 0.6); border-top: 1px solid var(--line-subtle); border-bottom: 1px solid var(--line-subtle);">
  <div class="wrap">
    <div class="breakdown-box">
      <div class="section-header">
        <span class="eyebrow">{cfg.get("breakdown_eyebrow", "Complete Inventory")}</span>
        <h2 class="section-title">{cfg.get("breakdown_title", "What You Get Inside")}</h2>
        <p class="section-subtitle">{cfg.get("breakdown_sub", "Full breakdown of tools, modules, resources, and protocols included in your access.")}</p>
      </div>

      <div class="breakdown-grid">
        {breakdown_html}
      </div>
    </div>
  </div>
</section>

<!-- HOW IT WORKS (3-STEP) -->
<section class="section-pad">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">Frictionless Execution</span>
      <h2 class="section-title">How To Get Started In 3 Steps</h2>
      <p class="section-subtitle">No complicated installations or setup delays. Jump straight into the system.</p>
    </div>

    <div class="steps-grid">
      {steps_html}
    </div>
  </div>
</section>

<!-- COACH PROOF BANNER -->
<section class="section-pad-sm" style="background: var(--ink-2); border-top: 1px solid var(--line-subtle); border-bottom: 1px solid var(--line-subtle);">
  <div class="wrap">
    <div class="coach-proof-card">
      <img src="../assets/img/coach.jpg" alt="Coach Anas Mo'men" class="coach-avatar">
      <div class="coach-proof-details">
        <h3>Engineered by Coach Anas Mo'men</h3>
        <div class="coach-title">Competitive Powerlifter (700kg+ SBD) &bull; Mechatronics Engineering &bull; PT Certified</div>
        <p>I coach from the bar and the whiteboard. With a 700kg+ total at 82kg bodyweight and 100+ athletes coached since 2024, every algorithm in Muscle OS represents the exact physiological principles I use to force continuous adaptation without injury.</p>
        <div class="proof-stats-row">
          <div class="p-stat"><b>700kg+</b> SBD Total</div>
          <div class="p-stat"><b>100+</b> Clients Coached</div>
          <div class="p-stat"><b>200+</b> Research Papers</div>
          <div class="p-stat"><b>100%</b> Evidence-Based</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING SECTION -->
<section class="section-pad" id="pricing">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">Transparent Pricing</span>
      <h2 class="section-title">Upgrade Your Physique Engine</h2>
      <p class="section-subtitle">Select your currency and start progressing immediately.</p>
    </div>

    <div class="pricing-wrapper">
      <div class="pricing-card">
        <div class="pricing-badge">{p_cfg.get("badge", "BEST VALUE")}</div>
        
        <div class="currency-switch-wrap">
          <div class="currency-switch">
            <button id="currEGP" class="curr-btn active" onclick="setCurrency('egp')">🇪🇬 EGP</button>
            <button id="currUSD" class="curr-btn" onclick="setCurrency('usd')">🌍 USD</button>
          </div>
        </div>

        <h3 class="display" style="font-size:24px; color:var(--yellow);">{p_cfg.get("name", "Product Access")}</h3>
        <p style="font-size:13.5px; color:var(--gray);">{p_cfg.get("sub", "")}</p>

        <div class="price-display">
          <div class="price-amount">
            <span class="price-val egp">{p_cfg.get("egp_price")}</span>
            <span class="price-val usd" style="display:none;">{p_cfg.get("usd_price")}</span>
          </div>
          <div class="price-period">{p_cfg.get("period", "")}</div>
        </div>

        {annual_note_html}

        <ul class="pricing-features-list">
          {p_features_html}
        </ul>

        <a href="{p_cta_primary.get("href")}" class="btn btn-primary btn-block btn-lg">
          {p_cta_primary.get("text")}
        </a>
        {sec_cta_html}

        <div class="guarantee-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Instant code issuance &bull; 100% Secure Checkout &bull; Card / Vodafone Cash</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PRODUCT FAQ -->
<section class="section-pad" id="faq" style="background: rgba(15, 16, 21, 0.4); border-top: 1px solid var(--line-subtle);">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">Got Questions?</span>
      <h2 class="section-title">Frequently Asked Questions</h2>
      <p class="section-subtitle">Everything you need to know about access, compatibility, and methodology.</p>
    </div>

    <div class="faq-wrap">
      {faq_html}
    </div>
  </div>
</section>

<!-- ECOSYSTEM CROSS-SELL -->
<section class="section-pad" style="border-top: 1px solid var(--line-subtle); background: var(--ink-2);">
  <div class="wrap">
    <div class="section-header center">
      <span class="eyebrow eyebrow-center">Complete Your Stack</span>
      <h2 class="section-title">Complementary Muscle OS Tools</h2>
      <p class="section-subtitle">Supercharge your results by connecting training, nutrition, and foundational literature.</p>
    </div>

    <div class="cross-sell-grid">
      {cross_html}
    </div>
  </div>
</section>

<!-- FINAL CTA BANNER -->
<section class="final-cta-section">
  <div class="wrap final-cta-inner">
    <div class="eyebrow eyebrow-center">Ready To Level Up?</div>
    <h2 class="hero-title" style="font-size:clamp(32px, 4.5vw, 52px); margin-bottom:16px;">{cfg.get("final_cta_h2", "Stop Guessing. Start Progressing.")}</h2>
    <p class="section-subtitle" style="margin-bottom:32px;">{cfg.get("final_cta_sub", "Join hundreds of lifters using evidence-based programming and metabolic autoregulation.")}</p>
    
    <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
      <a href="{cfg.get("primary_cta", {}).get("href", "#pricing")}" class="btn btn-primary btn-lg">
        {cfg.get("final_cta_btn", "Get Instant Access Now")}
      </a>
      <a href="https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20have%20a%20question%20about%20{cfg.get('filename')}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-lg">
        Ask On WhatsApp
      </a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap footer-inner">
    <div class="brand">ANAS MO'MEN <span>COACHING</span></div>
    <div class="footer-links">
      <a href="../index.html">Home</a>
      <a href="../tools/">Tools Hub</a>
      <a href="../books/">Books Hub</a>
      <a href="../knowledge-hub/">Knowledge Hub</a>
      <a href="../privacy.html">Privacy</a>
      <a href="../terms.html">Terms</a>
    </div>
  </div>
</footer>

<!-- MOBILE STICKY CTA -->
<div id="mobileCtaBar">
  <a href="{p_cta_primary.get("href", "#pricing")}" class="btn-primary" style="display:flex; align-items:center; justify-content:center; border-radius:6px;">
    {cfg.get("mobile_cta_primary", "Get Access")}
  </a>
  <a href="https://wa.me/201040796017" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="display:flex; align-items:center; justify-content:center; border-radius:6px;">
    WhatsApp
  </a>
</div>

<script>
  function detectCurrency() {{
    let saved = localStorage.getItem('mos_currency');
    if (saved) return saved;
    try {{
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const mena = ['Africa/Cairo', 'Africa/Tripoli', 'Africa/Khartoum', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Qatar', 'Asia/Amman', 'Asia/Beirut', 'Asia/Baghdad'];
      if (mena.includes(tz)) return 'egp';
    }} catch(e) {{}}
    return 'usd';
  }}

  function setCurrency(curr) {{
    localStorage.setItem('mos_currency', curr);
    const egpBtn = document.getElementById('currEGP');
    const usdBtn = document.getElementById('currUSD');
    if (egpBtn && usdBtn) {{
      if (curr === 'egp') {{
        egpBtn.classList.add('active');
        usdBtn.classList.remove('active');
      }} else {{
        usdBtn.classList.add('active');
        egpBtn.classList.remove('active');
      }}
    }}
    document.querySelectorAll('.price-val.egp').forEach(el => el.style.display = (curr === 'egp') ? 'inline' : 'none');
    document.querySelectorAll('.price-val.usd').forEach(el => el.style.display = (curr === 'usd') ? 'inline' : 'none');
  }}

  document.addEventListener('DOMContentLoaded', () => {{
    setCurrency(detectCurrency());
  }});
</script>

</body>
</html>"""
    return html

# ==============================================================================
# PRODUCT 1: TRAINING APP PRO (MOS-HYPERKINETIX)
# ==============================================================================
TRAINING_APP_CFG = {
    "filename": "training-app.html",
    "title": "MOS-HYPERKINETIX — Autoregulated Volume & Training App | Muscle OS",
    "meta_description": "Hypertrophy and strength training app with dynamic MEV/MAV/MRV volume landmarks, mesocycle generator, RPE/RIR guide, plate calculator, and ACWR fatigue monitoring.",
    "eyebrow": "MOS-HYPERKINETIX · TRAINING APP PRO",
    "badge_class": "badge-yellow",
    "hero_h1": "Stop Guessing Volume. <span class=\"accent\">Engineered Hypertrophy.</span>",
    "hero_sub": "A high-performance progressive overload operating system. Automatically calculates your exact weekly set landmarks (MEV/MAV/MRV), autoregulates workouts based on daily readiness, and tracks 1RM trends across your entire mesocycle.",
    "nav_cta_text": "Start Free Trial",
    "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/training_tool.html" },
    "secondary_cta": { "text": "View Pricing", "href": "#pricing" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "300 EGP/mo · 7-Day Free Trial"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>', "100% Offline PWA"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>', "English / Arabic Dual Interface")
    ],
    "mockup_title": "HYPERKINETIX // ACTIVE MESOCYCLE",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">EXERCISE: <b style="color:#fff;">Barbell Bench Press</b></span>
          <span style="color:var(--yellow); font-weight:700;">WEEK 3 · ACCUMULATION</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; justify-content:space-between; color:var(--gray);">
            <span>TARGET: 100 kg &times; 6 @ RPE 8.5</span>
            <span style="color:#10b981;">EST 1RM: 118.5 kg</span>
          </div>
          <div style="margin-top:6px; color:#A0A3AB; font-size:11px;">
            PLATE SETUP: <span style="color:var(--yellow);">[20kg] [15kg] [2.5kg]</span> per side
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">CHEST VOLUME</div>
            <div style="color:#fff; font-weight:700; font-size:14px; margin-top:2px;">14 / 16 sets <span style="color:#10b981; font-size:11px;">(MAV)</span></div>
          </div>
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">FATIGUE ACWR</div>
            <div style="color:#fff; font-weight:700; font-size:14px; margin-top:2px;">1.12 <span style="color:#10b981; font-size:11px;">(OPTIMAL)</span></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(244,201,59,0.08); border:1px solid rgba(244,201,59,0.2); padding:8px 12px; border-radius:6px;">
          <span style="color:var(--yellow); font-weight:600;">REST TIMER: 02:45</span>
          <span style="color:#fff; font-size:11px;">CHIME ACTIVE 🔔</span>
        </div>
      </div>
    """,
    "pain_title": "Without HYPERKINETIX",
    "pain_items": [
        "Guessing how many sets to perform each week, causing junk volume or undertraining",
        "Hitting plateaus because you push the same weight with zero autoregulated fatigue monitoring",
        "Wasting time doing mental math for barbell plates and warm-up sets between heavy sets",
        "Losing workout history across scattered phone notes, notebooks, or clunky spreadsheets",
        "Pushing through joint strain without injury screening or stimulus-to-fatigue (SFR) substitution"
    ],
    "relief_title": "With HYPERKINETIX",
    "relief_items": [
        "Algorithmic MEV/MAV/MRV landmark distribution tuned to your training age and target focus",
        "Real-time RPE/RIR biofeedback calibration that auto-adjusts working loads based on daily readiness",
        "Instant barbell plate loading visualizer and automated 4-stage warm-up set calculator",
        "Persistent offline storage in your browser with automated 1RM trend curves and PR highlights",
        "Intelligent exercise replacement database prioritizing high-SFR and joint-friendly variations"
    ],
    "features_title": "Engineered For Serious Lifters & Coaches",
    "features_sub": "Built on Mike Israetel, Brad Schoenfeld, and Eric Helms research, integrated with control-systems feedback logic.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v18M18 3v18M3 8h18M3 16h18"></path></svg>', "MEV / MAV / MRV Landmarks", "Automatically calculates your Minimum Effective Volume, Maximum Adaptive Volume, and Maximum Recoverable Volume per muscle group.", "Dynamic set landmarks"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>', "Split & Mesocycle Builder", "PPL, Upper-Lower, Full Body, Arnold, or Custom split generator with injury-safe exercise replacements.", "Custom 4-8 week blocks"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>', "ACWR Fatigue & Deload Engine", "Monitors Acute:Chronic Workload Ratio to warn you before overreaching turns into central nervous system burnout.", "Fatigue autoregulation"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', "In-Session Logger & Timer", "Plate loading calculator, superset sequencing, audio rest chime, and RPE/RIR conversion in one tap.", "Zero-friction gym HUD"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>', "Estimated 1RM & PR Tracker", "Wathan, Brzycki, and Epley formula synthesis for precise 1RM tracking and historical progression charts.", "Automated PR detection"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>', "100% Offline PWA & Bilingual", "Works without internet inside basement gyms. Add to your home screen on iOS and Android with zero latency.", "English + Arabic support")
    ],
    "breakdown_title": "Included In MOS-HYPERKINETIX",
    "breakdown_sub": "Everything you need to program, log, autoregulate, and export your training.",
    "breakdown_items": [
        ("Full Mesocycle Generator", "4 to 8-week periodized blocks with linear and undulating progression."),
        ("Dynamic Volume Landmarks Matrix", "MEV/MAV/MRV weekly set recommendations per muscle group."),
        ("Pain & Rehab Substitute Engine", "Injury-flagged movement filters with high-SFR joint-friendly swaps."),
        ("Barbell Plate Math Calculator", "Instant visual breakdown of 20kg, 15kg, 10kg, 5kg, 2.5kg, and 1.25kg plates."),
        ("Autoregulated Rest Chime", "Custom countdown rest intervals with optional background audio cues."),
        ("Estimated 1RM Progression Matrix", "Multi-formula 1RM tracking with visual strength trajectory graphs."),
        ("Printable PDF Program Export", "Clean high-contrast printable PDF generator for physical binder logging."),
        ("Dual English & Arabic Interface", "One-tap toggle for complete bilingual terminology and RTL alignment.")
    ],
    "steps": [
        ("01", "Start Free Trial or Order", "Launch the app instantly in your browser. Start your 7-day trial or purchase an access code for permanent access."),
        ("02", "Configure Split & Landmarks", "Select your training days, experience level, and priority muscle groups to generate your customized mesocycle."),
        ("03", "Log & Autoregulate", "Take your phone to the gym, track weights and RPE, and let the engine adjust your volume and loads in real time.")
    ],
    "pricing": {
        "badge": "FLAGSHIP TRAINING PRO",
        "name": "MOS-HYPERKINETIX ACCESS",
        "sub": "Full unconstrained access to the training operating system.",
        "egp_price": "300 EGP",
        "usd_price": "$6.00",
        "period": "per month · cancel anytime",
        "annual_note": "Annual Option: 3,000 EGP / $60 (Save 600 EGP · 2 Months Free)",
        "features": [
            "Full Mesocycle Generator & Split Builder",
            "Dynamic MEV/MAV/MRV Volume Landmarks",
            "Live In-Session Workout Logger & Plate Math",
            "ACWR Fatigue Tracking & Deload Alerts",
            "PR History & Estimated 1RM Progression",
            "100% Offline PWA Support (iOS & Android)",
            "English & Arabic Bilingual Interface",
            "7-Day Risk-Free Trial Included"
        ],
        "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/training_tool.html" },
        "secondary_cta": { "text": "Buy Monthly Access Code (300 EGP)", "href": "../order.html?product=training_tool" }
    },
    "faqs": [
        ("How does the 7-day free trial work?", "You can launch the training tool immediately and test every single feature without entering credit card details. If you love the system, you can purchase an access code anytime from the order page to keep your account active."),
        ("Will the app work when I lose reception in the gym?", "Yes! MOS-HYPERKINETIX is built as an offline-first Progressive Web App (PWA). All your workout logs, mesocycles, and biometrics are stored locally on your device in secure browser storage."),
        ("How do I install it on my phone?", "Open the tool page in Safari on iOS and tap 'Share > Add to Home Screen', or on Chrome on Android tap 'Install App'. It will launch fullscreen just like a native app."),
        ("Can I customize exercises and rep ranges?", "Yes. You can swap any exercise with options from the exercise library, edit target sets, adjust RPE thresholds, and customize rep schemes for hypertrophy or powerlifting."),
        ("What happens to my data if I close the browser?", "Your workout logs, PRs, and current mesocycle state are automatically saved in real time to localStorage. Everything will be exactly as you left it when you return.")
    ],
    "cross_sells": [
        ("MOS-METABOLIX", "Pair your training with our adaptive TDEE and nutritional partition engine.", "300 EGP / mo", "tdee-engine.html", "Explore METABOLIX"),
        ("OMNI HUB", "Get both the Training App and TDEE Engine under one unified command interface.", "600 EGP / mo", "omni-hub.html", "Explore Omni Hub"),
        ("Training & Programming Book", "Master the 27-chapter definitive science behind hyperkinetic programming.", "750 EGP (Lifetime)", "training-book.html", "Read Book Syllabus")
    ],
    "final_cta_h2": "Turn Guesswork Into Measurable Muscle.",
    "final_cta_sub": "Start your 7-day free trial today. No card required.",
    "final_cta_btn": "Launch Training Tool Now",
    "mobile_cta_primary": "Start Free Trial"
}
# ==============================================================================
# PRODUCT 2: TDEE ADAPTIVE ENGINE PRO (MOS-METABOLIX)
# ==============================================================================
TDEE_ENGINE_CFG = {
    "filename": "tdee-engine.html",
    "title": "MOS-METABOLIX — Adaptive TDEE & Nutrition Engine | Muscle OS",
    "meta_description": "Adaptive energy expenditure matrix with exponential moving averages, 5000+ food database, 3.0g leucine MPS threshold meter, and reverse dieting wizard.",
    "eyebrow": "MOS-METABOLIX · METABOLIC INTELLIGENCE ENGINE",
    "badge_class": "badge-green",
    "hero_h1": "Your Metabolism Isn't Static. <span class=\"accent\">Stop Using Static Calculators.</span>",
    "hero_sub": "Traditional calorie calculators fail because your body adapts as you diet. MOS-METABOLIX uses recursive exponential smoothing algorithms over daily weight and calorie logs to calculate your true, dynamic metabolic rate in real time.",
    "nav_cta_text": "Start Free Trial",
    "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/tdee_adaptive_engine.html" },
    "secondary_cta": { "text": "View Pricing", "href": "#pricing" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "300 EGP/mo · 7-Day Free Trial"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>', "5,000+ Food Database"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>', "3.0g Leucine MPS Threshold")
    ],
    "mockup_title": "METABOLIX // ADAPTIVE CALIBRATION",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">STATUS: <b style="color:#10b981;">CALIBRATED (DAY 14)</b></span>
          <span style="color:var(--yellow); font-weight:700;">GOAL: FAT LOSS</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">TRUE ADAPTIVE TDEE</div>
            <div style="color:#fff; font-weight:700; font-size:15px; margin-top:2px;">2,840 kcal <span style="color:#10b981; font-size:10px;">&plusmn;25</span></div>
          </div>
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">CURRENT INTAKE</div>
            <div style="color:var(--yellow); font-weight:700; font-size:15px; margin-top:2px;">2,340 kcal <span style="color:#ef4444; font-size:10px;">(-500)</span></div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; justify-content:space-between; color:#d1d5db; font-size:11px;">
            <span>LEUCINE MPS TRIGGER</span>
            <span style="color:#10b981; font-weight:700;">3.2g / 3.0g THRESHOLD &check;</span>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin-top:6px; overflow:hidden;">
            <div style="width:100%; height:100%; background:linear-gradient(90deg, #10b981, #34d399);"></div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--gray);">
          <span>WEIGHT TREND: <b style="color:#fff;">-0.45 kg/wk</b></span>
          <span>REVERSE DIET WIZARD: <b style="color:var(--yellow);">READY</b></span>
        </div>
      </div>
    """,
    "pain_title": "Without METABOLIX",
    "pain_items": [
        "Hitting frustrating weight-loss plateaus as metabolic adaptation slows your burn",
        "Following generic calorie formulas that ignore your individual NEAT and metabolic efficiency",
        "Eating arbitrary protein amounts without knowing if you trigger the 3.0g leucine threshold",
        "Experiencing massive rapid fat regain post-diet due to lack of structured reverse dieting",
        "Developing micronutrient deficiencies and hormonal drops during prolonged deficits"
    ],
    "relief_title": "With METABOLIX",
    "relief_items": [
        "Dynamic exponential moving-average formula that recalibrates your exact daily expenditure",
        "Mathematical certainty on whether weight changes are water fluctuations vs true adipose loss",
        "Meal-by-meal leucine trigger meter ensuring maximal muscle protein synthesis on every meal",
        "Reverse dieting controller that systematically ramps maintenance calories back up after a cut",
        "8-micronutrient density radar tracking zinc, magnesium, iron, D3, potassium, and electrolytes"
    ],
    "features_title": "Metabolic Science Translated Into Code",
    "features_sub": "Engineered around Hall et al. metabolic math, Morton et al. protein kinetics, and Campbell et al. diet break protocols.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>', "Adaptive EMA TDEE Recalibration", "Calculates true energy expenditure using rolling exponential moving averages to eliminate scale water noise.", "Adaptive metabolic tracking"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "5,000+ Verified Food Database", "Search verified items with instant Raw vs Cooked weight conversion sliders for pinpoint precision.", "Raw/cooked conversion"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', "3.0g Leucine MPS Threshold", "Monitors per-meal amino acid kinetics to confirm you hit the biological trigger for muscle protein synthesis.", "Anabolic efficiency"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>', "8-Micro Biomarker Grid", "Tracks zinc, magnesium, iron, calcium, vitamin D, potassium, sodium, and fiber to maintain hormonal health.", "Micronutrient density"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>', "Reverse Dieting Controller", "Step-by-step metabolic restoration wizard that gradually elevates calories post-cut without fat rebound.", "Post-cut metabolic rebuild"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', "Interactive Trend Charts & CSV", "Visualize caloric intake vs scale weight trajectory with one-tap CSV export for deep data analysis.", "Full data ownership")
    ],
    "breakdown_title": "Included In MOS-METABOLIX",
    "breakdown_sub": "The complete nutritional telemetry platform for body recomposition and fat loss.",
    "breakdown_items": [
        ("Exponential Smoothing TDEE Algorithm", "Dynamic metabolic burn calculation updated with every weigh-in."),
        ("5,000+ Item Nutritional Database", "Accurate macro and micro profile lookup with raw/cooked toggles."),
        ("3.0g Leucine Anabolic Threshold Meter", "Real-time meal-by-meal muscle protein synthesis tracker."),
        ("8-Micronutrient Biomarker Matrix", "Essential mineral and vitamin tracker preventing nutritional deficiencies."),
        ("Reverse Dieting Protocol Wizard", "Calculated caloric increments to restore BMR without fat regain."),
        ("Refeed & Diet Break Planner", "Glycogen replenishment scheduler to prevent leptin and thyroid drops."),
        ("One-Tap CSV Data Export", "Download all your historical logs, trends, and averages anytime."),
        ("Offline Local Storage & Arabic Mode", "Zero-latency logging that works without cell service in the supermarket.")
    ],
    "steps": [
        ("01", "Input Initial Biometrics", "Enter your height, starting weight, sex, and target physique goal to establish your baseline targets."),
        ("02", "Log Daily Weigh-Ins & Meals", "Log your weight and meals each morning. The database handles raw vs cooked conversions effortlessly."),
        ("03", "Auto-Calibrate & Progress", "Within 7-14 days, the engine reveals your true expenditure and auto-adjusts your targets for continuous results.")
    ],
    "pricing": {
        "badge": "METABOLIC FLAGSHIP",
        "name": "MOS-METABOLIX ACCESS",
        "sub": "Full unconstrained access to the adaptive metabolic engine.",
        "egp_price": "300 EGP",
        "usd_price": "$5.99",
        "period": "per month · cancel anytime",
        "annual_note": "Annual Option: 3,000 EGP / $60 (Save 600 EGP · 2 Months Free)",
        "features": [
            "Adaptive Exponential Smoothing TDEE Engine",
            "5,000+ Food Database with Raw/Cooked Toggles",
            "3.0g Leucine MPS Amino Acid Tracker",
            "8-Micronutrient Biomarker Grid",
            "Reverse Dieting Restoration Wizard",
            "Weight Trend Filtering & Canvas Charts",
            "100% Offline PWA (iOS & Android)",
            "7-Day Free Trial Included"
        ],
        "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/tdee_adaptive_engine.html" },
        "secondary_cta": { "text": "Buy Monthly Access Code (300 EGP)", "href": "../order.html?product=tdee_adaptive_engine" }
    },
    "faqs": [
        ("How is this different from standard calorie apps?", "Standard apps use static formulas from the 1990s (like Harris-Benedict) that assume your metabolism never changes. METABOLIX calculates your actual energy expenditure by mathematically analyzing the relationship between what you eat and how your weight changes."),
        ("How long does it take to calibrate to my body?", "You get baseline calculations instantly. Within 7 to 14 days of daily logging, the exponential smoothing algorithm eliminates fluid fluctuations and locks onto your exact metabolic rate."),
        ("Can I use it for building muscle (surplus)?", "Yes! You can set targets for a lean bulking surplus (e.g. +250 kcal/day), aggressive cutting, recomposition, or structured reverse dieting."),
        ("Does it support Arabic foods and measurements?", "Yes. The database and interface support metric units (grams, kg) and include common staples with English/Arabic bilingual search."),
        ("Is my data private?", "100%. All meal logs, biometrics, and personal data are stored locally in your browser storage. Nothing is monetized or shared.")
    ],
    "cross_sells": [
        ("MOS-HYPERKINETIX", "Pair your nutrition engine with our autoregulated hypertrophy training tool.", "300 EGP / mo", "training-app.html", "Explore HYPERKINETIX"),
        ("OMNI HUB", "Get both the TDEE Engine and Training App together under one master code.", "600 EGP / mo", "omni-hub.html", "Explore Omni Hub"),
        ("Diet & Nutrition Book", "Read the complete 33-chapter master reference guide on nutrient kinetics.", "750 EGP (Lifetime)", "nutrition-book.html", "Read Book Syllabus")
    ],
    "final_cta_h2": "Outsmart Metabolic Adaptation.",
    "final_cta_sub": "Start tracking your true expenditure with a 7-day free trial.",
    "final_cta_btn": "Launch TDEE Engine Now",
    "mobile_cta_primary": "Start Free Trial"
}
# ==============================================================================
# PRODUCT 3: OMNI HUB (COMBINED PLATFORM)
# ==============================================================================
OMNI_HUB_CFG = {
    "filename": "omni-hub.html",
    "title": "OMNI HUB — Unified Training & Nutrition Platform | Muscle OS",
    "meta_description": "The complete Muscle OS command center. Unified tabbed interface combining MOS-HYPERKINETIX and MOS-METABOLIX with shared state, syncing training volume and metabolism.",
    "eyebrow": "OMNI HUB · THE COMPLETE TRAINING OS",
    "badge_class": "badge-yellow",
    "hero_h1": "Training & Nutrition. <span class=\"accent\">Unified in One Command Center.</span>",
    "hero_sub": "Stop juggling fragmented fitness apps. OMNI HUB merges MOS-HYPERKINETIX (Autoregulated Training) and MOS-METABOLIX (Adaptive Nutrition) into a single, zero-latency command interface with one master access code.",
    "nav_cta_text": "Start Free Trial",
    "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/muscle_os_app.html" },
    "secondary_cta": { "text": "View Pricing", "href": "#pricing" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "600 EGP/mo · Both Flagships Included"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>', "One Master Access Code"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>', "Shared State & Offline Sync")
    ],
    "mockup_title": "OMNI HUB // DUAL COMMAND DECK",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <span style="background:var(--yellow); color:#000; font-weight:700; padding:3px 8px; border-radius:4px;">1. HYPERKINETIX</span>
          <span style="background:rgba(255,255,255,0.06); color:#fff; padding:3px 8px; border-radius:4px;">2. METABOLIX</span>
          <span style="margin-left:auto; color:#10b981; font-size:11px;">SYNCED &check;</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">TODAY'S WORKOUT</div>
            <div style="color:#fff; font-weight:700; font-size:13px; margin-top:2px;">Push Hypertrophy</div>
            <div style="color:var(--yellow); font-size:11px;">18 Sets @ RIR 1-2</div>
          </div>
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">CALORIC TARGET</div>
            <div style="color:#fff; font-weight:700; font-size:13px; margin-top:2px;">2,850 kcal</div>
            <div style="color:#10b981; font-size:11px;">P: 210g · C: 350g · F: 65g</div>
          </div>
        </div>
        <div style="background:rgba(244,201,59,0.04); border:1px solid rgba(244,201,59,0.15); padding:10px; border-radius:6px; font-size:11px; color:#d1d5db;">
          <b style="color:var(--yellow);">UNIFIED PROGRESSION:</b> Weekly volume load perfectly matched to energetic surplus for optimal muscle protein synthesis and zero fat spillover.
        </div>
      </div>
    """,
    "pain_title": "Without OMNI HUB",
    "pain_items": [
        "Juggling different apps with separate logins, inconsistent data, and disconnected metrics",
        "Eating the same caloric intake on rest days as heavy 20-set leg training sessions",
        "Subscribing to multiple disconnected fitness platforms that do not communicate",
        "Losing focus during gym sessions while switching between calorie logs and workout sets",
        "Failing to synchronize refeed days with high-volume mesocycle overreaching peaks"
    ],
    "relief_title": "With OMNI HUB",
    "relief_items": [
        "One unified tabbed shell switching instantly between workout execution and metabolic fueling",
        "Single master access code unlocking both flagship applications on all your devices",
        "Synchronized periodization: align carbohydrate refeeds with your heaviest mesocycle sessions",
        "Shared state, themes, language, and biometrics stored locally with zero cloud latency",
        "Priority access to upcoming AI coach integrations and knowledge vault synthesis modules"
    ],
    "features_title": "The Complete Physique Architecture",
    "features_sub": "Experience total harmony between mechanical overload and biochemical fueling.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>', "Dual-Engine Synchronized Shell", "Instant zero-lag tab switching between training logging and nutritional tracking in one browser tab.", "Zero-latency switching"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>', "Single Master Access Code", "One unified code unlocks both HYPERKINETIX and METABOLIX across desktop, tablets, and phones.", "Unified billing"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>', "Integrated Fueling & Volume", "Align your macro intake dynamically to match session volume and mesocycle accumulation stages.", "Synchronized physiology"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>', "Shared State & PWA", "Install the hub as a single unified mobile or desktop app with shared theme and language settings.", "Full offline storage"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>', "VIP Feature Access", "Omni Hub members receive early beta access to AI Coach Chat and the Muscle OS Knowledge Graph.", "Priority ecosystem pass"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', "Bilingual Command Deck", "Seamless one-tap switching between English and Arabic without reloading or losing active inputs.", "English + Arabic")
    ],
    "breakdown_title": "Everything in Omni Hub",
    "breakdown_sub": "The complete Muscle OS software ecosystem under one subscription.",
    "breakdown_items": [
        ("Full MOS-HYPERKINETIX PRO Access", "Mesocycle builder, volume landmarks, rest timer, plate calculator, 1RM tracker."),
        ("Full MOS-METABOLIX PRO Access", "Adaptive TDEE, 5000+ food database, leucine meter, reverse diet wizard."),
        ("One Unified Master Code (OH-)", "Unlocks the Hub AND both standalone tools individually on all devices."),
        ("Synchronized Local Storage Engine", "Shared state across tabs with zero data collisions or reload delays."),
        ("PWA Single-Icon Installation", "Install both tools together under a single home screen icon."),
        ("Refeed & High-Volume Harmonizer", "Coordinate carbohydrate distribution to your hardest mesocycle workouts."),
        ("Priority Support & Early Feature Beta", "Direct access to upcoming AI decision engine updates."),
        ("Complete Bilingual Localization", "Full EN/AR toggle supported across all internal interfaces.")
    ],
    "steps": [
        ("01", "Launch The Hub", "Open OMNI HUB in your browser. Start your 7-day free trial or enter your master access code."),
        ("02", "Set Up Volume & Macros", "Configure your mesocycle split on the Training tab and dial in your baseline nutrition targets on the Metabolism tab."),
        ("03", "Execute in Unison", "Switch seamlessly between workout tracking and meal logging with zero friction and guaranteed data persistence.")
    ],
    "pricing": {
        "badge": "MOST POPULAR · COMPLETE OS",
        "name": "OMNI HUB ALL-ACCESS",
        "sub": "Both flagship applications unified in one command deck.",
        "egp_price": "600 EGP",
        "usd_price": "$11.99",
        "period": "per month · cancel anytime",
        "annual_note": "Annual Option: 6,000 EGP / $120 (Save 1,200 EGP · 2 Months Free)",
        "features": [
            "Full MOS-HYPERKINETIX Training PRO Access",
            "Full MOS-METABOLIX TDEE Engine PRO Access",
            "Single Master Access Code for All Devices",
            "Synchronized State & Offline PWA",
            "Integrated Volume & Fueling Harmonizer",
            "Dual English & Arabic Interface",
            "Early Access to AI Coach Updates",
            "7-Day Free Trial Included"
        ],
        "primary_cta": { "text": "Start 7-Day Free Trial", "href": "../tools/muscle_os_app.html" },
        "secondary_cta": { "text": "Buy Monthly Omni Hub (600 EGP)", "href": "../order.html?product=omni_hub" }
    },
    "faqs": [
        ("Do I need to buy the Training App and TDEE Engine separately?", "No! OMNI HUB includes complete access to both tools under one master access code. It's the most convenient and cost-effective way to use Muscle OS."),
        ("Can I open the tools separately outside the hub?", "Yes! Your Omni Hub (OH-) access code also unlocks the standalone Training Tool and TDEE Adaptive Engine pages directly."),
        ("Does Omni Hub work offline?", "Yes. The entire hub and its child applications run client-side in your browser and store data in localStorage, so you never lose data even without internet."),
        ("How do I install Omni Hub on my mobile phone?", "Open the Omni Hub URL in Safari or Chrome, tap Share/Menu, and select 'Add to Home Screen'. You will have a single app icon on your home screen."),
        ("What if I already started my trial on one tool?", "Your logs and progress are preserved. When you open Omni Hub, it accesses the same local storage so your data remains intact.")
    ],
    "cross_sells": [
        ("Both Books Collection", "Get the complete 60-chapter Training and Nutrition reference manual library.", "1,200 EGP (Save 300 EGP)", "training-book.html", "Explore Books"),
        ("1-on-1 Elite Coaching", "Work directly with Coach Anas Mo'men for bespoke programming and check-ins.", "Custom", "../index.html#packages", "View Coaching Packages")
    ],
    "final_cta_h2": "Unify Your Training & Metabolism.",
    "final_cta_sub": "Experience the complete Muscle OS ecosystem with a 7-day free trial.",
    "final_cta_btn": "Launch Omni Hub Now",
    "mobile_cta_primary": "Start Free Trial"
}
# ==============================================================================
# PRODUCT 4: TRAINING BOOK (TRAINING & PROGRAMMING REFERENCE MANUAL)
# ==============================================================================
TRAINING_BOOK_CFG = {
    "filename": "training-book.html",
    "title": "Muscle OS Training & Programming Book — 27 Chapters | Coach Anas",
    "meta_description": "The definitive evidence-based hypertrophy & strength training reference manual. 27 chapters, 200+ scientific citations, volume landmarks, and periodization.",
    "eyebrow": "REFERENCE MANUAL · 27 CHAPTERS · 200+ CITATIONS",
    "badge_class": "badge-blue",
    "hero_h1": "The Definitive Engineering Guide to <span class=\"accent\">Hypertrophy & Strength.</span>",
    "hero_sub": "A rigorous 27-chapter scientific manual synthesizing neuromuscular physiology, biomechanical moment arms, SFR exercise tiering, autoregulated periodization, and fatigue kinetics into actionable programming protocols.",
    "nav_cta_text": "Buy Book (750 EGP)",
    "primary_cta": { "text": "Buy Lifetime Access (750 EGP)", "href": "../order.html?product=training_book" },
    "secondary_cta": { "text": "Read Free Sample Chapter", "href": "../books/sample_training.html" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "27 Full In-Depth Chapters"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>', "HTML Reader + Downloadable PDF"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>', "200+ Peer-Reviewed References")
    ],
    "mockup_title": "MANUAL // SYLLABUS ARCHITECTURE",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">SECTION 3: <b style="color:#fff;">Volume Landmarks & SFR</b></span>
          <span style="color:var(--yellow); font-weight:700;">CH. 09 / 27</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05); font-size:11px; color:#A0A3AB;">
          <b style="color:var(--yellow);">CORE PRINCIPLE:</b> "Hypertrophic adaptation is driven by high-threshold motor unit recruitment at low velocity (Mechanical Tension). Volume (sets &times; reps) provides the stimulus dosage; fatigue defines the ceiling."
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">CITATIONS INDEX</div>
            <div style="color:#fff; font-weight:700; font-size:13px; margin-top:2px;">Schoenfeld, Israetel, Helms</div>
          </div>
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">FORMAT AVAILABILITY</div>
            <div style="color:#10b981; font-weight:700; font-size:13px; margin-top:2px;">Web + Print PDF &check;</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--gray);">
          <span>INCLUDES: <b style="color:#fff;">Deload Flowchart & Matrix</b></span>
          <span style="color:var(--yellow);">LIFETIME ACCESS</span>
        </div>
      </div>
    """,
    "pain_title": "Without This Manual",
    "pain_items": [
        "Falling victim to conflicting gym myths and unverified social media fitness advice",
        "Copying pro bodybuilder steroid routines that destroy natural lifters with unrecoverable volume",
        "Failing to understand how resistance curves, limb lengths, and joint angles dictate hypertrophy",
        "Wasting months in plateaued training blocks because of improper phase potentiation and deloading",
        "Training through tendonitis without knowing high-SFR exercise substitutions"
    ],
    "relief_title": "With This Manual",
    "relief_items": [
        "Complete mastery of neuromuscular recruitment, mechanical tension, and myofibrillar growth",
        "Exact MEV, MAV, and MRV volume tier algorithms customized for beginner, intermediate, and advanced",
        "Mathematical framework for matching exercise resistance profiles to your individual limb biomechanics",
        "Step-by-step blueprints for linear, undulating, block, and conjugate periodization structures",
        "Diagnostic deload decision trees and joint-preservation movement replacement matrices"
    ],
    "features_title": "Comprehensive 27-Chapter Master Syllabus",
    "features_sub": "Organized into 6 core sections covering foundational physiology up to elite competitive peaking.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', "Part 1: Mechanisms of Hypertrophy", "Deconstruct mechanical tension, muscle damage, metabolic stress, and Henneman's size principle.", "Foundational physiology"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24"></path></svg>', "Part 2: Applied Biomechanics", "Moment arms, line of pull, resistance profiles vs strength curves, and SFR rating for 80+ exercises.", "Biomechanic optimization"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>', "Part 3: Volume & Intensity Dosages", "How to establish individual MEV/MAV/MRV landmarks and dial in RIR vs RPE for maximal growth.", "Dosage protocols"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>', "Part 4: Periodization & Mesocycles", "Step-by-step construction of accumulation, intensification, realization, and peaking blocks.", "Program design blueprints"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>', "Part 5: Fatigue & Autoregulation", "Systemic vs local fatigue kinetics, HRV indicators, and proactive deload scheduling.", "Recovery mastery"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>', "Part 6: Plateau Breaking Systems", "Deterministic troubleshooting matrices for stagnant compounds, weak points, and lagging muscle groups.", "Stagnation solver")
    ],
    "breakdown_title": "Included With Your Purchase",
    "breakdown_sub": "Instant lifetime access to the complete reference manual and digital toolkit.",
    "breakdown_items": [
        ("Complete 27-Chapter Book (HTML)", "High-performance interactive web reader with instant chapter search."),
        ("Printable PDF Edition (180+ Pages)", "High-resolution PDF formatted for tablet reading and binder printing."),
        ("200+ Scientific Research Citations", "Direct academic references to Schoenfeld, Zourdos, Helms, and Israetel."),
        ("Deload Decision Tree & Flowcharts", "Visual flowcharts for determining when and how to execute deloads."),
        ("Exercise SFR Tier List Reference", "Stimulus-to-fatigue ratios categorized across 80+ compound and isolation lifts."),
        ("Volume Landmark Quick-Reference", "Summary cheat sheets for weekly set prescriptions per muscle group."),
        ("Free Future Edition Updates", "All future revisions and expansions included at no additional cost."),
        ("Instant Code Issuance", "Permanent unlock code delivered immediately upon order verification.")
    ],
    "steps": [
        ("01", "Order Your Access Code", "Purchase directly online with Card or via Vodafone Cash on our secure checkout page."),
        ("02", "Unlock Web Reader & PDF", "Enter your code to instantly unlock the interactive web book viewer and download the printable PDF."),
        ("03", "Apply To Your Training", "Use the frameworks, volume formulas, and periodization blueprints to engineer your own workouts.")
    ],
    "pricing": {
        "badge": "LIFETIME REFERENCE MANUAL",
        "name": "TRAINING & PROGRAMMING BOOK",
        "sub": "27 Chapters · 200+ Citations · Lifetime Web & PDF Access",
        "egp_price": "750 EGP",
        "usd_price": "$15.00",
        "period": "one-time payment · lifetime access",
        "annual_note": "Includes Free Interactive Web Reader + Downloadable PDF Edition",
        "features": [
            "Full 27 In-Depth Chapters (180+ Pages)",
            "Over 200 Peer-Reviewed Citations",
            "Interactive Online Web Book Reader",
            "High-Resolution Downloadable PDF",
            "MEV/MAV/MRV Volume Reference Tables",
            "Deload Decision Trees & SFR Tier List",
            "Free Lifetime Revisions & Updates",
            "Instant Digital Delivery"
        ],
        "primary_cta": { "text": "Buy Book Access (750 EGP)", "href": "../order.html?product=training_book" },
        "secondary_cta": { "text": "Read Sample Chapter First", "href": "../books/sample_training.html" }
    },
    "faqs": [
        ("How do I read the book after purchasing?", "Once your order is approved, you receive an alphanumeric access code. You can enter it on the book page to instantly unlock the high-speed interactive web reader and download the complete PDF edition."),
        ("Can I print the PDF or read it on an iPad/Kindle?", "Yes! The PDF is formatted specifically with clean margins, high-contrast typography, and bookmark navigation for tablets, e-readers, and physical printing."),
        ("Is this book suitable for intermediate and advanced lifters?", "Yes. While it establishes core biomechanics, the core value lies in advanced mesocycle construction, volume landmark calibration, phase potentiation, and fatigue management."),
        ("Does it include pre-made workout programs?", "Yes! It contains sample periodized templates for PPL, Upper/Lower, and Full Body splits, along with the principles to build your own custom routines."),
        ("Can I read a preview before purchasing?", "Yes! Click 'Read Free Sample Chapter' above to read Chapter 1 and see the depth, layout, and scientific rigor firsthand.")
    ],
    "cross_sells": [
        ("Diet & Nutrition Book", "Complete the set with our 33-chapter master manual on metabolic fueling.", "750 EGP (Lifetime)", "nutrition-book.html", "Read Nutrition Book"),
        ("Both Books Collection", "Get both the Training and Nutrition books together and save 300 EGP.", "1,200 EGP (Save 300 EGP)", "../order.html?product=both_books", "Get Both Books"),
        ("MOS-HYPERKINETIX App", "Put the book's periodization and volume landmarks on autopilot.", "300 EGP / mo", "training-app.html", "Explore App")
    ],
    "final_cta_h2": "Master The Science of Hypertrophy.",
    "final_cta_sub": "Get lifetime access to the 27-chapter training reference manual today.",
    "final_cta_btn": "Buy Training Book (750 EGP)",
    "mobile_cta_primary": "Buy Book (750 EGP)"
}
# ==============================================================================
# PRODUCT 5: NUTRITION BOOK (DIET & NUTRITION REFERENCE MANUAL)
# ==============================================================================
NUTRITION_BOOK_CFG = {
    "filename": "nutrition-book.html",
    "title": "Muscle OS Diet & Nutrition Book — 33 Chapters | Coach Anas",
    "meta_description": "The definitive evidence-based physique nutrition & metabolic reference manual. 33 chapters, 200+ scientific citations, leucine thresholds, and reverse dieting.",
    "eyebrow": "REFERENCE MANUAL · 33 CHAPTERS · 200+ CITATIONS",
    "badge_class": "badge-green",
    "hero_h1": "The Science of Fueling, Partitioning & <span class=\"accent\">Recomposition.</span>",
    "hero_sub": "A 33-chapter master reference guide detailing energy balance mathematics, macronutrient kinetics, leucine anabolic thresholds, micronutrient density, diet break protocols, and post-cut reverse dieting.",
    "nav_cta_text": "Buy Book (750 EGP)",
    "primary_cta": { "text": "Buy Lifetime Access (750 EGP)", "href": "../order.html?product=nutrition_book" },
    "secondary_cta": { "text": "Read Free Sample Chapter", "href": "../books/sample_diet.html" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "33 Full In-Depth Chapters"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>', "HTML Reader + Downloadable PDF"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>', "200+ Peer-Reviewed References")
    ],
    "mockup_title": "MANUAL // NUTRITIONAL SYLLABUS",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">SECTION 4: <b style="color:#fff;">Nutrient Timing & MPS</b></span>
          <span style="color:var(--yellow); font-weight:700;">CH. 14 / 33</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05); font-size:11px; color:#A0A3AB;">
          <b style="color:var(--yellow);">CORE PRINCIPLE:</b> "Muscle protein synthesis (MPS) operates as an all-or-none biological trigger requiring ~2.7g - 3.5g of free Leucine per bolus. Total daily protein establishes the floor; distribution maximizes the ceiling."
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">RESEARCH CORPUS</div>
            <div style="color:#fff; font-weight:700; font-size:13px; margin-top:2px;">Morton, Phillips, Campbell</div>
          </div>
          <div style="background:rgba(20,21,26,0.6); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <div style="color:var(--gray); font-size:10px;">PROTOCOLS INCLUDED</div>
            <div style="color:#10b981; font-weight:700; font-size:13px; margin-top:2px;">Cutting, Bulking, Recomp</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--gray);">
          <span>SUPPLEMENT TIER LIST: <b style="color:#fff;">EVIDENCE-BASED</b></span>
          <span style="color:var(--yellow);">LIFETIME ACCESS</span>
        </div>
      </div>
    """,
    "pain_title": "Without This Manual",
    "pain_items": [
        "Hopping between extreme fad diets that destroy your resting metabolic rate (BMR)",
        "Falling for over-hyped supplement marketing with zero clinical evidence behind the ingredients",
        "Experiencing uncontrollable hunger and brain fog during cutting phases due to poor micronutrient density",
        "Regaining all lost body fat within weeks of ending a diet because of absent reverse dieting",
        "Failing to optimize pre- and post-workout nutrition for maximum glycogen replenishment and strength"
    ],
    "relief_title": "With This Manual",
    "relief_items": [
        "Step-by-step mathematical formulas to calculate and adjust calories as your weight changes",
        "Evidence-backed protein, carbohydrate, and essential fat targets tuned for natural lifters",
        "Clear leucine threshold protocols to trigger maximal muscle protein synthesis on every meal",
        "Comprehensive reverse dieting and diet break protocols that permanently keep fat off",
        "Tiered ranking of supplements separating clinically proven ergogenics from pure waste"
    ],
    "features_title": "Comprehensive 33-Chapter Master Syllabus",
    "features_sub": "From foundational thermodynamic energy balance to hormone optimization during deep deficits.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>', "Part 1: Dynamic Energy Balance", "Energy intake vs expenditure models, adaptive thermogenesis, NEAT regulation, and metabolic adaptation math.", "Thermodynamics"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>', "Part 2: Macronutrient Kinetics", "Optimal protein intake per kg of lean mass, carbohydrate fueling for glycolytic training, and essential fatty acids.", "Macro partitioning"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', "Part 3: Nutrient Timing & Anabolic Windows", "The 3.0g leucine threshold, meal frequency distribution, peri-workout nutrition, and intra-workout carbs.", "Anabolic optimization"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>', "Part 4: Micronutrients & Hydration", "Essential electrolyte balance, zinc, magnesium, vitamin D3, iron, and optimal hydration indices for athletes.", "Micronutrient health"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>', "Part 5: Body Recomp & Reverse Dieting", "How to execute lean bulks, aggressive cuts with refeeds, MATADOR diet breaks, and post-cut metabolic rebuilds.", "Diet phase protocols"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>', "Part 6: Evidence-Based Supplements", "Tiered classification: Tier A (Creatine, Caffeine, Whey, Electrolytes), Tier B (Beta-Alanine, Citrulline), and Tier F.", "Supplement guide")
    ],
    "breakdown_title": "Included With Your Purchase",
    "breakdown_sub": "Lifetime access to the complete digital nutrition reference manual and toolset.",
    "breakdown_items": [
        ("Complete 33-Chapter Book (HTML)", "Interactive searchable web reader with fast navigation and bookmarks."),
        ("Printable PDF Edition (200+ Pages)", "High-resolution PDF formatted for tablets, iPads, and binder printing."),
        ("200+ Scientific Research Citations", "Direct citations to Morton, Phillips, Helms, Campbell, and Hall."),
        ("Reverse Dieting Protocol Worksheet", "Calculated step-by-step caloric ramp sheet to restore post-diet BMR."),
        ("Evidence-Based Supplement Tier List", "Honest clinical breakdown of what works and what is marketing hype."),
        ("Recomposition Cheat Sheet", "Summary protocols for simultaneous fat loss and hypertrophy."),
        ("Free Future Updates", "All future revisions and nutritional research additions included for life."),
        ("Instant Code Delivery", "Permanent access code issued immediately upon checkout confirmation.")
    ],
    "steps": [
        ("01", "Order Your Access Code", "Choose your payment method (Card or Vodafone Cash) and submit your order on our secure portal."),
        ("02", "Unlock Web Reader & PDF", "Enter your code to immediately access the online book viewer and download the full PDF edition."),
        ("03", "Calculate & Optimize", "Apply the protein distribution formulas, refeed schedules, and reverse diet wizard to your routine.")
    ],
    "pricing": {
        "badge": "LIFETIME REFERENCE MANUAL",
        "name": "DIET & NUTRITION BOOK",
        "sub": "33 Chapters · 200+ Citations · Lifetime Web & PDF Access",
        "egp_price": "750 EGP",
        "usd_price": "$15.00",
        "period": "one-time payment · lifetime access",
        "annual_note": "Includes Free Interactive Web Reader + Downloadable PDF Edition",
        "features": [
            "Full 33 In-Depth Chapters (200+ Pages)",
            "Over 200 Peer-Reviewed Citations",
            "Interactive Online Web Book Reader",
            "High-Resolution Downloadable PDF",
            "3.0g Leucine MPS Timing Frameworks",
            "Reverse Dieting & Refeed Blueprints",
            "Evidence-Based Supplement Tier List",
            "Instant Digital Delivery"
        ],
        "primary_cta": { "text": "Buy Book Access (750 EGP)", "href": "../order.html?product=nutrition_book" },
        "secondary_cta": { "text": "Read Sample Chapter First", "href": "../books/sample_diet.html" }
    },
    "faqs": [
        ("How do I access the book after ordering?", "You will receive an access code that unlocks the online interactive book viewer on our website and provides a one-click PDF download link."),
        ("Does this include pre-made meal plans?", "It teaches you the exact nutritional engineering to design customized meal plans tailored to your specific caloric needs, body weight, food preferences, and daily schedule."),
        ("Can I read this book on mobile or offline?", "Yes! The online web reader works smoothly in all mobile browsers, and the downloadable PDF can be saved directly to Apple Books, Kindle, or PDF readers for offline reading."),
        ("Does it cover vegan / vegetarian dieting?", "Yes. Chapter 8 specifically covers plant-based protein quality, amino acid profiling, and supplementation strategies to overcome the lower leucine content of vegan proteins."),
        ("Can I preview the book before buying?", "Yes! Click 'Read Free Sample Chapter' above to read the introduction and sample chapters freely.")
    ],
    "cross_sells": [
        ("Training & Programming Book", "Master the mechanical training side with our 27-chapter programming manual.", "750 EGP (Lifetime)", "training-book.html", "Read Training Book"),
        ("Both Books Collection", "Get both the Training and Nutrition books together and save 300 EGP.", "1,200 EGP (Save 300 EGP)", "../order.html?product=both_books", "Get Both Books"),
        ("MOS-METABOLIX Engine", "Put the book's adaptive expenditure formulas on automatic tracking.", "300 EGP / mo", "tdee-engine.html", "Explore Engine")
    ],
    "final_cta_h2": "Fuel Your Transformation With Science.",
    "final_cta_sub": "Get lifetime access to the 33-chapter nutrition reference manual today.",
    "final_cta_btn": "Buy Nutrition Book (750 EGP)",
    "mobile_cta_primary": "Buy Book (750 EGP)"
}
# ==============================================================================
# PRODUCT 6: TRAINING BUNDLE (BOOK + 3 TOOLS + 50% APP VOUCHER)
# ==============================================================================
TRAINING_BUNDLE_CFG = {
    "filename": "training-bundle.html",
    "title": "Muscle OS Training Bundle — Book + 3 Calculators + 50% App Off | Coach Anas",
    "meta_description": "The complete training package: 27-chapter Training Book, Volume Calculator, RPE Load Calculator, Split Quiz, plus 50% OFF the MOS-HYPERKINETIX Training App.",
    "eyebrow": "COMPLETE TRAINING ECOSYSTEM · 750 EGP",
    "badge_class": "badge-yellow",
    "hero_h1": "The Complete Hypertrophy Stack. <span class=\"accent\">Theory Meets Execution.</span>",
    "hero_sub": "Everything you need to master training architecture: the 27-chapter Reference Book, 3 interactive web calculators (Volume, RPE, Split Quiz), and 50% OFF your first month of the flagship MOS-HYPERKINETIX Training App.",
    "nav_cta_text": "Get Bundle (750 EGP)",
    "primary_cta": { "text": "Get Training Bundle (750 EGP)", "href": "../order.html?product=training_book" },
    "secondary_cta": { "text": "Claim on WhatsApp", "href": "https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20want%20to%20claim%20the%20Training%20Bundle%20offer" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "Full Training Reference Book"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>', "3 Interactive Calculators Included"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "50% Off Training App First Month")
    ],
    "mockup_title": "BUNDLE // COMPLETE STACK",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">PACKAGE: <b style="color:var(--yellow);">TRAINING BUNDLE</b></span>
          <span style="color:#10b981; font-weight:700;">750 EGP TOTAL</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>1. Training & Programming Book</span>
          <span style="color:#10b981;">LIFETIME ACCESS</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>2. Volume & Set Calculator</span>
          <span style="color:#10b981;">FREE TOOL &check;</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>3. RPE & Load Calculator</span>
          <span style="color:#10b981;">FREE TOOL &check;</span>
        </div>
        <div style="background:rgba(244,201,59,0.08); border:1px solid rgba(244,201,59,0.25); padding:10px; border-radius:6px; font-size:11px; color:#fff;">
          <b style="color:var(--yellow);">VOUCHER INCLUDED:</b> 50% OFF MOS-HYPERKINETIX Training App PRO for your first month (150 EGP instead of 300 EGP).
        </div>
      </div>
    """,
    "pain_title": "Without The Bundle",
    "pain_items": [
        "Buying theory without having the practical calculators to compute your volume in seconds",
        "Wasting time searching for reliable RPE conversion charts and split selection tools",
        "Paying full price separately for the book, tools, and software platform",
        "Trying to implement volume landmarks without a structured progression framework",
        "Lacking quick-reference guides when planning your workouts at the gym"
    ],
    "relief_title": "With The Bundle",
    "relief_items": [
        "Complete 27-chapter reference manual covering every mechanism, periodization model, and deload tree",
        "3 dedicated interactive web calculators that instantly compute weekly sets, RPE loads, and split choices",
        "Exclusive 50% discount voucher for the MOS-HYPERKINETIX Training App PRO",
        "Printable PDF quick-reference worksheets, cheat sheets, and deload flowcharts",
        "Unbeatable value: 750 EGP one-time payment for lifetime access to the entire training suite"
    ],
    "features_title": "Everything Included in the Training Bundle",
    "features_sub": "The perfect combination of scientific literature and interactive utility tools.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "Training & Programming Book", "The full 27-chapter reference guide (180+ pages) with 200+ scientific citations. HTML reader + PDF.", "Full master manual"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', "Volume & Set Calculator", "Interactive tool to find your exact weekly sets per muscle group based on experience and goal.", "Interactive calculator"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', "RPE & Load Calculator", "Quickly convert target RPE/RIR to actual working weights with built-in load history reference.", "Working load calculator"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>', "Split Selector Quiz", "8-question diagnostic to identify your optimal split based on schedule, frequency, and weak points.", "Diagnostic quiz"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', "50% Off HYPERKINETIX App", "Get half price on your first month of the flagship Training App PRO (150 EGP instead of 300 EGP).", "Exclusive bundle perk"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>', "Deload Flowcharts & Guides", "Downloadable quick-start worksheets and deload decision trees formatted for print.", "Bonus resources")
    ],
    "breakdown_title": "Bundle Content Checklist",
    "breakdown_sub": "All components included in your single 750 EGP purchase.",
    "breakdown_items": [
        ("Training Book — Full HTML Online Reader", "Complete 27 chapters with instant search and bookmarking."),
        ("Training Book — Downloadable PDF (180+ Pages)", "High-resolution PDF formatted for tablets and printing."),
        ("Volume & Set Calculator Web App", "Custom set recommendations based on MEV/MAV/MRV landmarks."),
        ("RPE / Working Load Calculator Web App", "Accurate conversion between RPE, RIR, and barbell load."),
        ("Split Selector 8-Question Quiz", "Personalized split matcher for 3, 4, 5, or 6 days per week."),
        ("50% Voucher for MOS-HYPERKINETIX PRO", "Save 150 EGP on your first month of the pro training tool."),
        ("Deload Decision Tree Flowchart (PDF)", "Step-by-step diagnostic tree for fatigue management."),
        ("Train-Maxing 5-Step Quick Start Guide", "Rapid execution blueprint to set up your next mesocycle.")
    ],
    "steps": [
        ("01", "Order the Training Bundle", "Select the Training Bundle on our checkout page or message Coach Anas on WhatsApp."),
        ("02", "Instant Access Code Delivery", "Receive your unique access code unlocking the book and digital calculators immediately."),
        ("03", "Claim Your 50% App Discount", "Use your voucher code to activate your discounted month on the MOS-HYPERKINETIX Training App.")
    ],
    "pricing": {
        "badge": "COMPLETE ECOSYSTEM VALUE",
        "name": "TRAINING BUNDLE",
        "sub": "Book + 3 Calculators + 50% Training App Discount",
        "egp_price": "750 EGP",
        "usd_price": "$15.00",
        "period": "one-time payment · lifetime access",
        "annual_note": "Includes Lifetime Book Access + Free Tools + 50% App Voucher",
        "features": [
            "Full 27-Chapter Training Reference Book",
            "Downloadable High-Res PDF (180+ Pages)",
            "Interactive Volume & Set Calculator",
            "Interactive RPE & Load Calculator",
            "Interactive Split Selector Quiz",
            "50% OFF MOS-HYPERKINETIX App Month 1",
            "Deload Decision Tree & Flowcharts",
            "Instant Digital Delivery"
        ],
        "primary_cta": { "text": "Get Training Bundle (750 EGP)", "href": "../order.html?product=training_book" },
        "secondary_cta": { "text": "Claim Offer on WhatsApp", "href": "https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20want%20to%20claim%20the%20Training%20Bundle%20offer" }
    },
    "faqs": [
        ("What exactly do I get when I purchase the Training Bundle?", "You get lifetime access to the complete 27-chapter Training Book (online reader + PDF), full access to the Volume Calculator, RPE Calculator, and Split Selector Quiz, plus a voucher for 50% off your first month of the MOS-HYPERKINETIX Training App PRO."),
        ("How do I claim my 50% app discount?", "Your order confirmation includes a discount code. You can apply it directly when subscribing to the Training App or send a quick message to Coach Anas on WhatsApp to have it applied."),
        ("Is the book access lifetime?", "Yes! The Training Book, PDF download, and free calculator tools are yours for life with zero recurring charges."),
        ("Can I pay via Vodafone Cash?", "Yes! We support Vodafone Cash, InstaPay, and standard credit/debit cards on the order page.")
    ],
    "cross_sells": [
        ("Nutrition Bundle", "Get the matching Nutrition Book + TDEE Calculator + 50% METABOLIX discount.", "750 EGP", "nutrition-bundle.html", "Explore Nutrition Bundle"),
        ("Both Books Collection", "Get both master reference manuals together for just 1,200 EGP.", "1,200 EGP", "../order.html?product=both_books", "Get Both Books"),
        ("MOS-HYPERKINETIX App", "Test drive the full training app with a 7-day free trial right now.", "300 EGP / mo", "training-app.html", "Try Training App")
    ],
    "final_cta_h2": "The Ultimate Hypertrophy Toolkit.",
    "final_cta_sub": "Get the book, the tools, and the app discount for only 750 EGP.",
    "final_cta_btn": "Get Training Bundle Now",
    "mobile_cta_primary": "Get Bundle (750 EGP)"
}


# ==============================================================================
# PRODUCT 7: NUTRITION BUNDLE (BOOK + TDEE CALC + 50% ENGINE VOUCHER)
# ==============================================================================
NUTRITION_BUNDLE_CFG = {
    "filename": "nutrition-bundle.html",
    "title": "Muscle OS Nutrition Bundle — Book + TDEE Calculator + 50% Engine Off | Coach Anas",
    "meta_description": "The complete nutrition package: 33-chapter Diet Book, TDEE & Macro Calculator, Recomp Cheat Sheet, plus 50% OFF the MOS-METABOLIX Adaptive Engine.",
    "eyebrow": "COMPLETE NUTRITION ECOSYSTEM · 750 EGP",
    "badge_class": "badge-green",
    "hero_h1": "The Complete Metabolic Stack. <span class=\"accent\">Fueling Engineered for Results.</span>",
    "hero_sub": "Everything you need to master nutritional physiology: the 33-chapter Reference Book, the interactive TDEE & Macro Calculator, body recomposition cheat sheets, and 50% OFF your first month of the MOS-METABOLIX TDEE Adaptive Engine.",
    "nav_cta_text": "Get Bundle (750 EGP)",
    "primary_cta": { "text": "Get Nutrition Bundle (750 EGP)", "href": "../order.html?product=nutrition_book" },
    "secondary_cta": { "text": "Claim on WhatsApp", "href": "https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20want%20to%20claim%20the%20Nutrition%20Bundle%20offer" },
    "trust_items": [
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "Full Nutrition Reference Book"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "TDEE & Macro Calculator Included"),
        ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', "50% Off TDEE Engine First Month")
    ],
    "mockup_title": "BUNDLE // METABOLIC STACK",
    "mockup_html": """
      <div style="font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.7;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#d1d5db;">PACKAGE: <b style="color:var(--yellow);">NUTRITION BUNDLE</b></span>
          <span style="color:#10b981; font-weight:700;">750 EGP TOTAL</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>1. Diet & Nutrition Book (33 Ch.)</span>
          <span style="color:#10b981;">LIFETIME ACCESS</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>2. TDEE & Macro Calculator</span>
          <span style="color:#10b981;">FREE TOOL &check;</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span>3. Recomposition Cheat Sheet</span>
          <span style="color:#10b981;">PRINTABLE &check;</span>
        </div>
        <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); padding:10px; border-radius:6px; font-size:11px; color:#fff;">
          <b style="color:#10b981;">VOUCHER INCLUDED:</b> 50% OFF MOS-METABOLIX TDEE Adaptive Engine PRO for your first month (150 EGP instead of 300 EGP).
        </div>
      </div>
    """,
    "pain_title": "Without The Bundle",
    "pain_items": [
        "Trying to set calories without understanding dynamic adaptive thermogenesis",
        "Following generic one-size-fits-all macronutrient splits that hinder performance",
        "Lacking a practical calculator to quickly adjust macros for cutting vs bulking",
        "Paying full price for the book and metabolic software separately",
        "Missing structured guidance on reversing out of a diet without immediate fat regain"
    ],
    "relief_title": "With The Bundle",
    "relief_items": [
        "Complete 33-chapter reference manual on energy balance, leucine kinetics, and micros",
        "Interactive TDEE & Macro Calculator computing your target calories and macros in seconds",
        "Exclusive 50% discount voucher for the MOS-METABOLIX TDEE Adaptive Engine PRO",
        "Body Recomposition Cheat Sheet and Diet Quick-Start guide formatted for print",
        "Complete nutritional clarity: 750 EGP one-time payment for lifetime access"
    ],
    "features_title": "Everything Included in the Nutrition Bundle",
    "features_sub": "The definitive combination of nutritional science and interactive calculation tools.",
    "features": [
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', "Diet & Nutrition Book", "The full 33-chapter reference guide (200+ pages) with 200+ scientific citations. HTML reader + PDF.", "Full master manual"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "TDEE & Macro Calculator", "Interactive energy balance calculator with goal-specific surplus and deficit macro splits.", "Interactive calculator"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', "50% Off METABOLIX Engine", "Get half price on your first month of the flagship TDEE Adaptive Engine (150 EGP instead of 300 EGP).", "Exclusive bundle perk"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>', "Recomposition Cheat Sheet", "1-page summary protocol for simultaneous fat loss and hypertrophy.", "Printable cheat sheet"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>', "Diet Quick-Start Guide", "5-step practical setup guide to start your diet phase within 24 hours.", "Rapid action guide"),
        ('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>', "Supplement Tier List", "Clinical breakdown of what supplements actually deliver results vs marketing waste.", "Evidence-based ranking")
    ],
    "breakdown_title": "Bundle Content Checklist",
    "breakdown_sub": "All components included in your single 750 EGP purchase.",
    "breakdown_items": [
        ("Diet Book — Full HTML Online Reader", "Complete 33 chapters with instant search and bookmarking."),
        ("Diet Book — Downloadable PDF (200+ Pages)", "High-resolution PDF formatted for tablets and printing."),
        ("TDEE & Macro Calculator Web App", "Maintenance calories, deficit/surplus, and macro target generator."),
        ("50% Voucher for MOS-METABOLIX PRO", "Save 150 EGP on your first month of the pro adaptive engine."),
        ("Recomposition Protocol Cheat Sheet (PDF)", "Step-by-step recomp guide with refeed schedules."),
        ("Diet-Maxing 5-Step Quick Start Guide", "Rapid nutrition setup blueprint for immediate execution."),
        ("Reverse Dieting Protocol Worksheet", "Caloric increment tables to restore post-diet metabolic rate."),
        ("Free Future Updates & Citations", "Lifetime access to all future nutritional revisions.")
    ],
    "steps": [
        ("01", "Order the Nutrition Bundle", "Purchase securely online with Card or Vodafone Cash on our checkout portal."),
        ("02", "Instant Access Code Delivery", "Receive your unique access code unlocking the book and calculator immediately."),
        ("03", "Claim Your 50% Engine Discount", "Use your voucher to activate your half-price month on the MOS-METABOLIX Engine.")
    ],
    "pricing": {
        "badge": "COMPLETE NUTRITION VALUE",
        "name": "NUTRITION BUNDLE",
        "sub": "Book + TDEE Calculator + 50% TDEE Engine Discount",
        "egp_price": "750 EGP",
        "usd_price": "$15.00",
        "period": "one-time payment · lifetime access",
        "annual_note": "Includes Lifetime Book Access + Free Tool + 50% Engine Voucher",
        "features": [
            "Full 33-Chapter Diet Reference Book",
            "Downloadable High-Res PDF (200+ Pages)",
            "Interactive TDEE & Macro Calculator",
            "50% OFF MOS-METABOLIX Engine Month 1",
            "Recomposition Protocol Cheat Sheet",
            "Reverse Dieting Protocol Worksheet",
            "Supplement Tier List Reference",
            "Instant Digital Delivery"
        ],
        "primary_cta": { "text": "Get Nutrition Bundle (750 EGP)", "href": "../order.html?product=nutrition_book" },
        "secondary_cta": { "text": "Claim Offer on WhatsApp", "href": "https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20want%20to%20claim%20the%20Nutrition%20Bundle%20offer" }
    },
    "faqs": [
        ("What is included in the Nutrition Bundle?", "You get lifetime access to the complete 33-chapter Diet & Nutrition Book (online reader + PDF), the TDEE & Macro Calculator, the Recomposition Protocol Cheat Sheet, and a 50% discount voucher for your first month of the MOS-METABOLIX TDEE Adaptive Engine."),
        ("How do I use the 50% discount on the TDEE Engine?", "Your order confirmation provides your discount voucher. You can enter it on the order page or send a quick message to Coach Anas on WhatsApp to activate your discounted month."),
        ("Is the book access permanent?", "Yes! You receive lifetime access to the online reader and the downloadable PDF with zero ongoing subscription fees."),
        ("What payment options are accepted?", "You can pay with credit/debit card online or send payment via Vodafone Cash / InstaPay.")
    ],
    "cross_sells": [
        ("Training Bundle", "Get the matching Training Book + 3 Calculators + 50% HYPERKINETIX discount.", "750 EGP", "training-bundle.html", "Explore Training Bundle"),
        ("Both Books Collection", "Get both master reference manuals together for just 1,200 EGP.", "1,200 EGP", "../order.html?product=both_books", "Get Both Books"),
        ("MOS-METABOLIX Engine", "Put the adaptive metabolic tracking algorithms into daily practice.", "300 EGP / mo", "tdee-engine.html", "Try TDEE Engine")
    ],
    "final_cta_h2": "The Complete Nutrition Toolkit.",
    "final_cta_sub": "Get the book, calculator, and adaptive engine discount for only 750 EGP.",
    "final_cta_btn": "Get Nutrition Bundle Now",
    "mobile_cta_primary": "Get Bundle (750 EGP)"
}


# ==============================================================================
# BUILD ALL 7 PAGES
# ==============================================================================
ALL_PRODUCTS = [
    TRAINING_APP_CFG,
    TDEE_ENGINE_CFG,
    OMNI_HUB_CFG,
    TRAINING_BOOK_CFG,
    NUTRITION_BOOK_CFG,
    TRAINING_BUNDLE_CFG,
    NUTRITION_BUNDLE_CFG
]

for prod in ALL_PRODUCTS:
    out_path = os.path.join(OUTPUT_DIR, prod["filename"])
    html_content = render_page(prod)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated: {out_path}")

print("All 7 product landing pages generated successfully!")
