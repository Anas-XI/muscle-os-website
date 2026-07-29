# Muscle OS Website — Complete System Documentation

> **Architecture**: Vanilla HTML/CSS/JS static site + Cloudflare Worker backend
> **Hosting**: GitHub Pages (site) + Cloudflare Workers (API) + Cloudflare KV (data)
> **Stack**: No frameworks, no build step, no npm — plain `.html` files with inline JS/CSS

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Site Map](#2-site-map)
3. [Landing Page Pipeline (index.html)](#3-landing-page-pipeline)
4. [Tool Pipeline](#4-tool-pipeline)
5. [Auth & Monetization Pipeline](#5-auth--monetization-pipeline)
6. [Analytics Pipeline](#6-analytics-pipeline)
7. [Bilingual (EN/AR) System](#7-bilingual-enar-system)
8. [Cloudflare Worker Backend](#8-cloudflare-worker-backend)
9. [Admin Tooling](#9-admin-tooling)
10. [Deployment Pipeline](#10-deployment-pipeline)
11. [WhatsApp Funnel Strategy](#11-whatsapp-funnel-strategy)
12. [Security & CSP](#12-security--csp)
13. [Media Assets](#13-media-assets)
14. [Offline & Print Strategy](#14-offline--print-strategy)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  BROWSER  (github.io / custom domain)                              │
│                                                                     │
│  index.html  ─── tracking.js ──────▶ Google Sheet Webhook           │
│       │                (localStorage + POST)                        │
│       │                                                             │
│       ├── tools/   ←── access-control.js ──▶ Cloudflare Worker API  │
│       ├── guides/       │                       │                    │
│       ├── books/    ────┤               ┌───────┴────────┐          │
│       ├── pdf/          │               │  /api/verify-code│         │
│       └── knowledge-hub/│               │  /api/check-token│         │
│                          │               │  /api/pdf/...   │         │
│                          │               │  /api/auth/google│        │
│                          │               │  /api/issue-code│        │
│                          │               └───────┬────────┘         │
│                          │                       │                   │
│                   Cloudflare KV ◄─── Durable Object (atomic counter) │
└────────────────────────────────────────────────────────────────────┘
```

**Two halves:**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla HTML/CSS/JS | 20+ static pages, bilingual, no build step |
| **Backend** | Cloudflare Worker + KV + DO | Code verification, PDF proxy, Google Auth, rate limiting |

---

## 2. Site Map

```
/
├── index.html                  LANDING PAGE (bilingual, sales funnel, 10 sections)
│
├── tools/
│   ├── index.html              Tools listing (6 cards)
│   ├── training_tool.html      FULL APP: program builder, session logger, periodization
│   ├── tdee_adaptive_engine.html  Multi-tab TDEE tracker + dashboard + trend chart
│   ├── tdee_macro_calculator.html  Free TDEE + macro calculator
│   ├── rpe_load_calculator.html   RPE calculator + load history + session logger
│   ├── volume_set_calculator.html  Weekly sets per muscle group calculator
│   └── split_selector_quiz.html    8-question quiz → recommended split
│
├── guides/
│   ├── index.html              Guides listing
│   ├── train_maxing_quick_start.html   5-step training setup (A4 print)
│   ├── diet_maxing_quick_start.html    5-step nutrition setup (A4 print)
│   ├── deload_decision_tree.html       Visual deload flowchart (A4 landscape)
│   ├── plateau_decision_tree.html      Visual plateau flowchart (A4 landscape)
│   ├── recomp_protocol_cheat_sheet.html  1-page recomp reference (A4 portrait)
│   └── consistency_workbook.html      6-week fillable behavioral workbook
│
├── books/
│   ├── index.html              Book listing (purchase)
│   ├── muscle_os_training_book.html   27 chapters, 200+ refs (A4 print)
│   └── muscle_os_nutrition_book.html  33 chapters, 200+ refs (A4 print)
│
├── knowledge-hub/
│   └── index.html              Central hub → all books + guides + PDF viewer
│
├── pdf/
│   └── viewer.html             PDF.js viewer + product library + IndexedDB cache
│
├── assets/
│   ├── tracking.js             Anonymous funnel logging (localStorage + webhook)
│   ├── js/
│   │   ├── site.js             Scroll reveal, nav behavior, mobile menu
│   │   └── access-control.js   Auth module (MosAccess API)
│   ├── css/
│   │   ├── landing.css         Google Auth gate + tool/book upsell sections
│   │   ├── overlay.css         Subscription/purchase overlay modal
│   │   └── pdf.css             PDF banner
│   ├── data/
│   │   └── access-codes.json   SHA-256 hashed static codes (fallback)
│   ├── img/
│   │   ├── coach.jpg           Coach portrait
│   │   └── tool-hero.jpg       Hero background
│   └── favicon.svg
│
├── worker/
│   ├── src/index.js            Cloudflare Worker (548 lines, 8 endpoints + DO)
│   ├── wrangler.toml           Worker config (staging + production)
│   ├── package.json
│   └── package-lock.json
│
├── scripts/
│   ├── coach-admin.js          Node CLI: generate/verify/list/revoke codes
│   ├── generate-codes.js       Node: batch generate + seed to KV
│   └── hash-code.js            SHA-256 hashing utility
│
└── docs/
    └── apps-script-webhook.gs  Google Apps Script for funnel sheet logging
```

---

## 3. Landing Page Pipeline (index.html)

### 3.1 Sections & Flow

```
NAV (sticky, hide-on-scroll)
│
├── HERO
│   ├── Headline + sub (i18n)
│   ├── Stats bar: 700kg+ / 82kg / 100+ clients / Since 2024
│   └── CTAs: WhatsApp (hero_cta_main) | View Packages (anchor)
│
├── ABOUT
│   ├── Coach photo + bio
│   └── Fact cards: SBD / Clients / Engineering / PT Cert
│
├── SERVICES (6-card grid)
│   ├── Hypertrophy Programming
│   ├── Powerlifting Coaching
│   ├── Biomechanics Assessment
│   ├── Nutrition & Carb Cycling
│   ├── Progress Tracking & Data
│   └── Client Management
│
├── MUSCLE OS (platform pitch)
│   ├── AI-powered features
│   ├── Code snippet visual
│   └── Cross-sell: bundle discount offers
│
├── TOOL OVERVIEW (2 PRO tools)
│   ├── Training Tool (300 EGP/mo) — feature list
│   ├── TDEE Adaptive Engine (200 EGP/mo) — feature list
│   ├── Gate: Sign In / WhatsApp subscribe (tools_gate)
│   └── Feedback section (feedback tag)
│
├── TOOLS & BUNDLES
│   ├── PRO tool cards (subscription)
│   ├── Training Bundle 500 EGP
│   └── Nutrition Bundle 500 EGP
│
├── KNOWLEDGE HUB
│   ├── Reference Books card
│   ├── Free Guides & Worksheets card
│   └── PDF Library link
│
├── HOW IT WORKS (3-step)
│   1. Message on WhatsApp → 2. Get your code → 3. Instant access
│
├── SOCIAL PROOF (HIDDEN — placeholder for real testimonials)
│
├── PACKAGES
│   ├── Standard 600 EGP/mo (featured "Most Popular")
│   │   └── 3-month: 1500 EGP (save 300)
│   └── Premium 1000 EGP/mo ("Best Value")
│       └── 3-month: 2500 EGP (save 500)
│
├── CONTACT
│   ├── WhatsApp (contact_wa)
│   ├── Email
│   └── Instagram
│
└── FOOTER
    ├── Brand / Phone / Instagram / WhatsApp (footer_wa)
    └── Mobile bottom bar: WhatsApp (mbb_book) + Explore Tools
```

### 3.2 WhatsApp Funnel Tags (index.html)

| Tag | Location | Pre-filled Text |
|-----|----------|-----------------|
| `nav_whatsapp` | Desktop nav CTA | — |
| `nav_whatsapp_mobile` | Mobile menu CTA | — |
| `hero_cta_main` | Hero primary CTA | — |
| `cross_sell_offer` | MOS bundle cross-sell | "Hi Anas, I want to claim a bundle cross-sell offer" |
| `tools_gate` | Tool overview gate | "Hi Anas, I want to subscribe to a tool" |
| `feedback` | Feedback section | "Hi Anas, I have feedback about the tools" |
| `pkg_standard` | Standard package CTA | "Hi Anas, I'm interested in the Standard package." |
| `pkg_premium` | Premium package CTA | "Hi Anas, I'm interested in the Premium package." |
| `contact_wa` | Contact section | — |
| `footer_wa` | Footer link | — |
| `mbb_book` | Mobile bottom bar | — |

---

## 4. Tool Pipeline

### 4.1 Training Tool (`tools/training_tool.html` — 231 KB, 2942 lines)

**The most complex page on the site.** A full training application.

```
SETUP (Screen 1)
├── Goal: Hypertrophy / Strength / Recomp / Maintenance
├── Experience: Beginner / Intermediate / Advanced
├── Age / Days per week / Session length
└── Warmup: Yes / No

VOLUME (Screen 2)
├── Recovery capacity assessment
├── Priority muscle groups
├── Per-muscle weekly set recommendations (MEV/MAV/MRV)
└── Volume sliders for fine-tuning

SPLIT SELECTOR (Screen 2.5)
├── PPL / Upper-Lower / Full Body / Push-Pull-Legs / Arnold / Custom
└── Exercise selection panel per muscle group

PROGRAM (Screen 3)
├── Full weekly program generated:
│   ├── Per-day exercise list with sets/reps/RPE
│   ├── Rehab-safe substitutions (if injuries flagged)
│   ├── Pain tracking (green/yellow/red per exercise)
│   └── Estimated 1RM display
├── Progressive overload suggestions
└── Coach review CTA (train_generated_cta)

SESSION LOG (Screen 4 — Dashboard)
├── Per-day workout log with weight/reps/RPE
├── Estimated 1RM tracking + PR detection
├── Volume over time chart
├── Bodyweight trend
└── Mesocycle auto-planner with ACWR fatigue monitoring

HISTORY (Screen 5)
├── Completed mesocycles
├── Mesocycle calendar
└── Fitness rating trends

PAYWALL: MosAccess.checkOrShow('training_tool') — requires code
PERSISTENCE: All localStorage (mos_vi, mos_vt, mos_prog, mos_hist, etc.)
PRINT: Export to PDF with hidden stepper/buttons
```

### 4.2 TDEE Adaptive Engine (`tools/tdee_adaptive_engine.html` — 58 KB)

```
TABS:
├── Setup: Sex / Age / Height / Weight / Activity / Goal
├── Dashboard: Maintenance TDEE, surplus/deficit, macro bars (P/F/C %)
├── Daily Log: Date, weight, calories, steps, notes
├── Trend Graph: Canvas chart of weight + TDEE over time
└── Export: CSV download

PAYWALL: MosAccess.checkOrShow('tdee_adaptive_engine')
TAGS: tdee_subscribe_top, tdee_subscribe_bottom, footer_wa
```

### 4.3 Free Tools (no paywall)

| Tool | Path | What It Does |
|------|------|-------------|
| **TDEE & Macro Calculator** | `tdee_macro_calculator.html` | Mifflin-St Jeor TDEE + macro split (P/F/C g + %) |
| **Volume & Set Calculator** | `volume_set_calculator.html` | Per-muscle weekly set recs by experience/goal |
| **RPE Load Calculator** | `rpe_load_calculator.html` | 1RM estimation + working weights + load history |
| **Split Selector Quiz** | `split_selector_quiz.html` | 8-question quiz → recommended split + explanation |

---

## 5. Auth & Monetization Pipeline

### 5.1 Products

| Product | Price | Type | Duration |
|---------|-------|------|----------|
| Training Tool | 300 EGP/mo | Subscription | 30 days |
| TDEE Adaptive Engine | 200 EGP/mo | Subscription | 30 days |
| Both Tools (bundle) | 400 EGP/mo | Subscription | 30 days |
| Training Book | 500 EGP | Purchase | Lifetime |
| Nutrition Book | 500 EGP | Purchase | Lifetime |
| Both Books | 800 EGP | Purchase | Lifetime |
| All Access (master) | — | Subscription | Variable |

### 5.2 Coaching Packages (offline, WhatsApp-initiated)

| Package | Price | 3-Month | Features |
|---------|-------|---------|----------|
| Standard | 600 EGP/mo | 1500 EGP | Weekly check-ins, real-time adjustments, basic nutrition, DM, 50% off tools |
| Premium | 1000 EGP/mo | 2500 EGP | Standard + custom nutrition/carb cycling, priority response, video calls, early Muscle OS access |

### 5.3 Auth Flow

```
┌──────────┐     ┌──────────────────┐     ┌────────────────┐
│  Browser │────▶│  access-control  │────▶│ Worker API     │
│  (user)  │     │  .js             │     │ /api/verify-   │
│          │     │  (MosAccess)     │     │ code           │
└──────────┘     └──────────────────┘     └───────┬────────┘
                                                  │
                                                  ▼
                                          ┌────────────────┐
                                          │ Durable Object  │
                                          │ CODE_COUNTER    │
                                          │ (atomic counter)│
                                          └────────────────┘
                                                  │
                                                  ▼
                                          ┌────────────────┐
                                          │ Cloudflare KV   │
                                          │ ACCESS_CODES    │
                                          └────────────────┘
```

**Step by step:**

1. User enters code in overlay modal
2. `MosAccess.verifyCode(code, productId)` POSTs to `/api/verify-code`
3. Worker checks rate limit (10/300s per IP)
4. Durable Object performs **atomic** counter increment (eliminates TOCTOU race)
5. On success: Worker issues HS256 JWT with expiry
6. `saveAccess()` writes token + expiry to `localStorage`
7. Subsequent loads: `checkAccess()` revalidates token via `/api/check-token`
8. Fallback to `localStorage` cache if Worker unreachable

### 5.4 Code Types (prefix system)

| Prefix | Product | Example |
|--------|---------|---------|
| `TR-` | Training Tool | `TR-A2X7K9M3P5` |
| `TD-` | TDEE Engine | `TD-B4W6R8T1Y3` |
| `TB-` | Both Tools | `TB-C5V7N9M2K4` |
| `BK-` | Training Book | `BK-D8F2H5J7L9` |
| `BN-` | Nutrition Book | `BN-E1G3I6K8M0` |
| `BB-` | Both Books | `BB-F4H7J9L2N5` |
| `MA-` | All Access | `MA-G5K8M2P7T1` |

### 5.5 Static Access Codes (fallback)

`assets/data/access-codes.json` stores SHA-256 hashed codes. Used only if Worker KV is unreachable. 5 pre-hashed codes for:
- Master (all products, 30 days)
- Training Tool (30 days)
- TDEE Engine (30 days)
- Training Book (lifetime)
- Nutrition Book (lifetime)

---

## 6. Analytics Pipeline

### 6.1 Two-Layer Architecture

```
EVENT
  │
  ├──▶ localStorage (mos_funnel_log)
  │     └── Max 500 events, exportable via triple-tap "ANAS"
  │
  └──▶ Google Sheet Webhook (when URL is set)
        └── POST via fetch(no-cors) → Apps Script → Sheet row
```

### 6.2 Events Tracked

| Event | `action` | Fields Sent |
|-------|----------|-------------|
| Page load | `pageview` | `page`, `event_type`, `referrer`, `session_id` |
| WhatsApp click | `whatsapp_click` | `page`, `event_type`, `tag`, `referrer`, `session_id` |

### 6.3 Session Tracking

- `mos_session_id` in `localStorage`
- 16-char random string generated on first visit
- Persists across pages/visits until manually cleared
- No PII: no names, phone numbers, IP addresses

### 6.4 Webhook Setup (One-Time Manual Step)

1. Create Google Sheet with headers: `timestamp | page | event_type | tag | referrer | session_id`
2. Extensions → Apps Script → paste `docs/apps-script-webhook.gs`
3. Deploy as Web App (Execute as: Me, Access: Anyone)
4. Copy `/exec` URL → paste into `assets/tracking.js` line 3

### 6.5 Export (Manual Review)

- **Triple-tap** the "ANAS" text in any footer → downloads full log as JSON
- Or call `mosExportFunnelLog()` from console

---

## 7. Bilingual (EN/AR) System

### 7.1 How It Works

```javascript
const TR = {
  nav_brand:      { en: 'ANAS MO\'MEN <span>COACHING</span>', ar: 'أنس مؤمن <span>تدريب</span>' },
  hero_title:     { en: 'Stop Guessing.<br>Start <span class="accent">Progressing.</span>',
                    ar: 'توقف عن التخمين.<br>ابدأ <span class="accent">التقدم.</span>' },
  // ... 165+ keys across all sections
};
```

- `setLang(lang)` reads from `TR`, writes to all `[data-i18n]` / `[data-i18n-alt]` elements
- Language persisted in `localStorage('mos_lang')`
- On load: `<html lang="..." dir="ltr|rtl">`
- AR direction: `dir="rtl"` flips font to Tajawal, reverses borders, menus slide left

### 7.2 Tools with Bilingual Support

| Tool | EN | AR |
|------|----|----|
| index.html | ✓ Full | ✓ Full |
| training_tool.html | ✓ Full UI | ✓ All labels + output |
| tdee_adaptive_engine.html | ✓ Full UI | ✓ All labels |
| rpe_load_calculator.html | ✓ All labels | ✓ Via i18n dict |

---

## 8. Cloudflare Worker Backend

### 8.1 Endpoints

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/verify-code` | POST | Verify access code, issue JWT | Rate-limited (10/300s) |
| `/api/check-token` | POST | Revalidate stored JWT | — |
| `/api/issue-code` | POST | Admin: create new code | `X-Admin-Key` |
| `/api/revoke-code` | POST | Admin: revoke code | `X-Admin-Key` |
| `/api/auth/google` | POST | Google Sign-In token exchange | Google JWKS |
| `/api/check-session` | POST | Validate Google session JWT | — |
| `/api/refresh-session` | POST | Refresh 7-day session JWT | — |
| `/api/pdf/<filename>` | GET | Serve PDF (free or JWT-gated) | JWT for paid books |

### 8.2 Storage

| Store | Keys | Purpose |
|-------|------|---------|
| **KV: ACCESS_CODES** | `code:<UPPERCASED>` | Code records (products, plan, duration, maxUses) |
| | `pdf:<filename>` | PDF binary data (base64) |
| | `log:<ts>:<uuid>` | Attempt logs (30d TTL) |
| | `ratelimit:<IP>` | Rate limit counters (300s TTL) |
| **Durable Object: CODE_COUNTER** | (per-code) | Atomic usage counter (eliminates TOCTOU) |

### 8.3 Security

- JWT: HS256 with `JWT_SECRET`, issuer `muscleos-access-control`, audience `muscleos-website`
- Admin: `X-Admin-Key` header, constant-time comparison via `timingSafeEqual()`
- Google Auth: JWKS verification against Google's OAuth2 certs
- Rate limiting: In-memory sliding window per IP (configurable max/300s)
- PDF serving: Authorization header (Bearer JWT), never URL tokens
- CSP headers on all responses, X-Frame-Options DENY, HSTS

---

## 9. Admin Tooling

### 9.1 Code Generator (`scripts/generate-codes.js`)

```bash
node scripts/generate-codes.js                    # Generate all 8 code types
node scripts/generate-codes.js --seed             # Generate + push to KV
node scripts/generate-codes.js --seed --admin KEY  # With custom admin key
```

Generates 8 codes (one per product type), optionally seeds them to the Worker via `/api/issue-code`.

### 9.2 Coach Admin CLI (`scripts/coach-admin.js`)

```bash
node scripts/coach-admin.js generate training_tool 1     # 1 tool code
node scripts/coach-admin.js generate training_book       # 1 book code
node scripts/coach-admin.js generate all 3               # 3 all-access codes
node scripts/coach-admin.js verify BK-XZWY5YU78H4Q       # Check code
node scripts/coach-admin.js list                         # List all codes
node scripts/coach-admin.js revoke BK-XZWY5YU78H4Q       # Revoke code
```

### 9.3 Hash Utility (`scripts/hash-code.js`)

```bash
node scripts/hash-code.js <plaintext>  # → SHA-256 hash for access-codes.json
```

---

## 10. Deployment Pipeline

### 10.1 GitHub Pages (Site)

```
.github/workflows/deploy.yml
────────────────────────────
Trigger: Push to "main" branch
Job: deploy
Steps:
  1. actions/checkout@v4
  2. actions/configure-pages@v5
  3. Upload entire repo as Pages artifact
  4. Deploy to GitHub Pages

URLs: https://anas-xi.github.io/muscle-os-bot/
      https://muscleos.is-a.dev/ (custom domain)
```

### 10.2 Cloudflare Worker (API)

```bash
# Staging
cd worker
npx wrangler deploy --env staging

# Production
npx wrangler deploy --env production
```

Environment config in `wrangler.toml`:
- **Staging**: `muscleos-access-control.<sub>.workers.dev`
- **Production**: `api.muscleos.coach` (custom domain on muscleos.coach zone)

Secrets to set:
- `ADMIN_KEY` — shared secret for admin API
- `JWT_SECRET` — HS256 signing key
- `CORS_ORIGIN` — allowed origin (fallback to GitHub Pages + custom domain)
- `GOOGLE_CLIENT_ID` — for Google Sign-In

---

## 11. WhatsApp Funnel Strategy

Every WhatsApp link on the site carries a `data-wa-tag` for tracking. Tags are organized by funnel stage:

### 11.1 Top of Funnel (Awareness)

| Tag | Location | Context |
|-----|----------|---------|
| `nav_whatsapp` | Navigation bar | Always visible |
| `hero_cta_main` | Hero section | First impression |
| `footer_wa` | Footer | Bottom of page |
| `guide_cta` | Inside guide content | After consuming educational content |
| `listing_cta` | Listing pages (tools/guides/books) | Discovery pages |

### 11.2 Middle of Funnel (Consideration)

| Tag | Location | Context |
|-----|----------|---------|
| `split_quiz_result_cta` | Split quiz results | After personalized recommendation |
| `rpe_result_cta` | RPE calculator results | After calculation |
| `train_generated_cta` | Training tool program | After program generation |
| `train_footer_cta_bottom` | Training tool footer | During tool usage |
| `train_subscribe_bottom` | Training tool (unlocked view) | When seeing features |

### 11.3 Bottom of Funnel (Conversion)

| Tag | Location | Context |
|-----|----------|---------|
| `pkg_standard` | Packages section | Coaching purchase intent |
| `pkg_premium` | Packages section | Coaching purchase intent |
| `contact_wa` | Contact section | Direct inquiry |
| `cross_sell_offer` | Bundle deals | Upgrade/cross-sell |
| `tools_gate` | Tool paywall | Subscription intent |
| `book_buy_cta` | Book pages | Book purchase intent |

### 11.4 Post-Purchase / Support

| Tag | Location | Context |
|-----|----------|---------|
| `feedback` | Feedback section | Existing user feedback |
| `mbb_book` | Mobile bottom bar | Always accessible |

### 11.5 Training Tool Rehab Tags (JS-generated)

| Tag | When | Meaning |
|-----|------|---------|
| `train_rehab_blocked` | Exercise blocked by injury | Rehab consultation needed |
| `train_pain_red` | Red pain flagged | Stop exercise, consult |
| `train_pain_yellow` | Yellow pain flagged | Modify exercise |
| `train_consult_cta` | Consult button | Book free consultation |
| `train_inline_consult` | Embedded in warning | Injury guidance |
| `train_rehab_hist` | In rehab history | Injury follow-up |
| `train_rehab_consult` | Rehab consultation CTA | Book injury consultation |
| `train_footer_cta` | Printed program footer | Post-program CTA |

---

## 12. Security & CSP

### 12.1 Content Security Policy (index.html)

```html
default-src 'self';
style-src 'unsafe-inline' 'self'
  https://fonts.googleapis.com
  https://fonts.gstatic.com;
script-src 'unsafe-inline' 'self'
  https://apis.google.com;
font-src 'self'
  https://fonts.gstatic.com;
connect-src 'self'
  https://muscleos-access-control.muscleos.workers.dev
  https://anas-xi.github.io;
frame-src https://accounts.google.com;
img-src 'self' data:;
```

### 12.2 Worker Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer-when-downgrade
CSP: (as above, applied by Worker)
Vary: Origin
Access-Control-Allow-Origin: (dynamically set)
```

### 12.3 Other Security Measures

- **ngrok policy**: Google OAuth gate (`ngrok-policy.yml`) — only authenticated Google users can access tunneled dev instances
- **GitHub Pages deploy**: No server-side execution, pure static files
- **No PII in analytics**: `session_id` is random string, no IP/name/phone
- **Admin key**: Constant-time comparison prevents timing attacks
- **Durable Object**: Atomic counter prevents TOCTOU race on code usage

---

## 13. Media Assets

| File | Size | Used On |
|------|------|---------|
| `assets/img/coach.jpg` | 92 KB | index.html About section |
| `assets/img/tool-hero.jpg` | 121 KB | index.html Hero section |
| `assets/hero.svg` | 1 KB | index.html Hero background |
| `assets/favicon.svg` | 0.4 KB | All pages |

---

## 14. Offline & Print Strategy

### 14.1 Print CSS

- All tool pages: `@media print` hides nav, buttons, stepper, overlays
- Books: A4 sizing with `@page { size: A4; margin: ... }`, `page-break-after`, orphans/widows
- Guides: Print-optimized with fixed font sizes, hidden interactive elements
- Decision trees: Landscape A4 layout for flowchart readability

### 14.2 PDF Viewing

- `pdf/viewer.html` loads PDF.js in-browser for continuous scroll reading
- PDFs fetched via Worker proxy: free guides direct, paid books JWT-gated
- IndexedDB caching for offline access (`openDB()`, `getCached()`, `setCache()`)
- Keyboard navigation (arrows, PgUp/Dn, +/- zoom)

### 14.3 Offline Data

- All user tool data in `localStorage` (training logs, TDEE logs, RPE history, quiz answers)
- PDF viewer caches in IndexedDB
- No service worker — site requires internet for page loads

---

## Appendices

### A. File Size Summary

| File | Size | Lines | Complexity |
|------|------|-------|------------|
| training_tool.html | 232 KB | 2942 | ★★★★★ |
| muscle_os_training_book.html | 170 KB | 1658 | ★★★★ |
| muscle_os_nutrition_book.html | 129 KB | 1522 | ★★★★ |
| index.html | 102 KB | 1300 | ★★★★ |
| rpe_load_calculator.html | 88 KB | 1454 | ★★★★ |
| tdee_macro_calculator.html | 62 KB | 903 | ★★★ |
| tdee_adaptive_engine.html | 58 KB | 1028 | ★★★ |
| consistency_workbook.html | 57 KB | 998 | ★★★ |
| worker/src/index.js | 22 KB | 548 | ★★★★★ |
| pdf/viewer.html | 18 KB | 337 | ★★★ |
| volume_set_calculator.html | 26 KB | 393 | ★★ |
| split_selector_quiz.html | 24 KB | 364 | ★★ |
| All other files | <30 KB | <400 | ★ |

### B. Total site: ~1.2 MB across 28 files (HTML + JS + CSS + assets)

### C. Dependencies (zero runtime dependencies)

| Dependency | Purpose | Type |
|-----------|---------|------|
| pdf.js (CDN) | PDF rendering in viewer | External script |
| Google Identity Services (GIS) | Google Sign-In | External script |
| Google Fonts (Inter, Oswald, JetBrains Mono, Tajawal) | Typography | External styles |
| jose (npm) | JWT signing/verification in Worker | Node dependency |
| wrangler (npm) | Worker deployment | Dev dependency |

