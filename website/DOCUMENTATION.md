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
├── order.html                  SELF-SERVE ORDER PAGE (product selector, Pay Online / Manual Transfer)
├── order-success.html          PAYMENT SUCCESS PAGE (auto-polls, shows code when approved)
│
├── admin/
│   ├── orders.html             ADMIN APPROVAL PAGE (mobile-first, tap Approve/Reject, wa.me send)
│   └── analytics.html          ANALYTICS DASHBOARD (key-gated, funnel + order stats from Sheet)
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
├── website/worker/
│   ├── src/index.js            Cloudflare Worker (972 lines, 14 endpoints + DO)
│   ├── wrangler.toml           Worker config (staging + production)
│   ├── package.json
│   └── package-lock.json
│
├── scripts/
│   ├── coach-admin.js          Node CLI: generate/verify/list/revoke codes
│   ├── generate-codes.js       Node: batch generate + seed to KV
│   └── hash-code.js            SHA-256 hashing utility
│
└── (external) ../docs/apps-script-webhook.gs  Google Apps Script for funnel sheet logging
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
│   ├── Training App (300 EGP/mo) — feature list
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

### 4.1 Training App (`tools/training_tool.html` — 231 KB, 2942 lines)

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
| Training App | 300 EGP/mo | Subscription | 30 days |
| TDEE Adaptive Engine | 200 EGP/mo | Subscription | 30 days |
| Both Tools (bundle) | 400 EGP/mo | Subscription | 30 days |
| Training Book | 500 EGP | Purchase | Lifetime |
| Nutrition Book | 500 EGP | Purchase | Lifetime |
| Both Books | 800 EGP | Purchase | Lifetime |
| All Access (master) | — | Subscription | Variable |

### 5.2 Coaching Packages (offline, WhatsApp-initiated)

| Package | Price | 3-Month | Features |
|---------|-------|---------|----------|
| Standard | 600 EGP/mo | 1500 EGP | Weekly check-ins, real-time adjustments, basic nutrition, DM, 66.6% off tools |
| Premium | 1000 EGP/mo | 2500 EGP | Standard + custom nutrition/carb cycling, priority response, video calls, early Muscle OS access, all tools free |

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
| `TR-` | Training App | `TR-A2X7K9M3P5` |
| `TD-` | TDEE Engine | `TD-B4W6R8T1Y3` |
| `TB-` | Both Tools | `TB-C5V7N9M2K4` |
| `BK-` | Training Book | `BK-D8F2H5J7L9` |
| `BN-` | Nutrition Book | `BN-E1G3I6K8M0` |
| `BB-` | Both Books | `BB-F4H7J9L2N5` |
| `MA-` | All Access | `MA-G5K8M2P7T1` |

### 5.5 Static Access Codes (fallback — bounded to 48h)

`assets/data/access-codes.json` stores SHA-256 hashed codes. Used **only** when the Cloudflare Worker is unreachable, via local SHA-256 verification in `access-control.js`.

**Fallback grants exactly 48 hours of access** regardless of the product's normal duration (30-day subscription or lifetime book). This is intentional:
- Forces reconciliation: once the Worker recovers, the 48h window expires quickly, and the customer re-verifies with their code against the live Worker for real tracked access
- Fallback access is marked with `data.fallback = true`, which tells `revalidateAccess` to skip the server check (the token doesn't exist server-side) and rely on the 48h expiry

**Fallback usage is logged** to `localStorage('mos_fallback_usage_log')` and flushed to `POST /api/log-fallback-usage` on page load. This gives visibility into how often the fallback path is hit — if frequent, investigate Worker reliability.

**Rotate monthly** via `node scripts/rotate-fallback-codes.js`.

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
| Order submitted | `order_submitted` | `page`, `tag`, `order_id`, `product`, `extra` (via `mosTrackEvent`) |
| Order approved | `order_approved` | `page`, `tag`, `order_id`, `product`, `extra` (via `mosTrackEvent`) |
| Order rejected | `order_rejected` | `page`, `tag`, `order_id`, `extra` (via `mosTrackEvent`) |

Custom events are sent via `window.mosTrackEvent(action, tag, extra)`, exposed by `tracking.js`. The third `extra` argument is an optional object merged as top-level payload keys.

### 6.3 Session Tracking

- `mos_session_id` in `localStorage`
- 16-char random string generated on first visit
- Persists across pages/visits until manually cleared
- No PII: no names, phone numbers, IP addresses

### 6.4 Webhook Setup (One-Time Manual Step)

1. Create Google Sheet with headers: `timestamp | page | event_type | tag | referrer | session_id`
2. (Optional) Add a second sheet tab named `Pending Orders` with headers: `timestamp | order_id | customer_name | product | payment_method | payment_ref | whatsapp | email | status`
3. Extensions → Apps Script → paste `../docs/apps-script-webhook.gs`
4. Deploy as Web App (Execute as: Me, Access: Anyone)
5. Copy `/exec` URL and append `?key=YOUR_SECRET` — the full URL becomes `https://script.google.com/.../exec?key=YourEventsKey`
6. Set `EVENTS_KEY` in the Apps Script (under `// ─── Anas: pick a secret string ───`) to the **same value**. Paste the full URL (with `?key=...`) into `assets/tracking.js` as `FUNNEL_WEBHOOK_URL`. The query param check prevents unauthorized POSTs from anyone who discovers the URL. If `EVENTS_KEY` is left as the placeholder, validation is skipped.
7. (Optional) On the Pending Orders tab: Tools → Notification rules → "When a new row is added → Email" to get real-time alerts.

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
| `/api/log-fallback-usage` | POST | Log local fallback code use | Rate-limited (20/300s) |
| `/api/create-order` | POST | Submit self-serve order | Rate-limited (5/300s) |
| `/api/pending-orders` | POST | List pending orders | `X-Admin-Key` |
| `/api/approve-order` | POST | Approve order + auto-issue code | `X-Admin-Key` |
| `/api/reject-order` | POST | Reject order with reason | `X-Admin-Key` |
| `/api/create-payment-link` | POST | Create Paymob payment URL for an order | Rate-limited |
| `/api/paymob-callback` | POST | Paymob webhook — auto-approve on successful payment | HMAC-verified |
| `/api/check-order-status` | POST | Check order status + get code if approved | — |
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
| **KV: PENDING_ORDERS** | `order:<uuid>` | Order records (48h TTL) |
| **Durable Object: CODE_COUNTER** | (per-code) | Atomic usage counter (eliminates TOCTOU) |

### 8.3 Order Flow — Self-Serve + One-Tap Approval

#### Manual Transfer (Vodafone Cash / InstaPay)

```
CUSTOMER                            WORKER                           ADMIN
   │                                   │                               │
   ├── Sends payment to Anas via ──────┤                               │
   │   InstaPay / Vodafone Cash        │                               │
   │                                   │                               │
   ├── Submits order (order.html) ─────▶ POST /api/create-order        │
   │                                   ├── Validate fields             │
   │                                   ├── Store in PENDING_ORDERS KV  │
   │                                   │   (48h TTL)                   │
   │                                   ├── Return order ID             │
   │◀──────────────────────────────────┘                               │
   │                                                                   │
   │                                             Opens admin/orders.html
   │                                             Enters admin key (sessionStorage)
   │                                             Sees pending order card
   │                                             │
   │                                             ├── Taps Approve ──────▶
   │                                             │   POST /api/approve-order
   │                                             │   ├── Generates code
   │                                             │   ├── Writes to ACCESS_CODES KV
   │                                             │   ├── Initializes DO
   │                                             │   ├── Updates order status
   │                                             │   └── Returns code + wa.me link
   │                                             │
   │                                             ├── Taps "Send via WhatsApp"
   │                                             │   Opens wa.me with prefilled message
   │                                             │
   │                                             └── Or taps Reject, selects reason
   │                                                 POST /api/reject-order
   │
   ◀── Receives code on WhatsApp ──────────────────── (Anas taps Send)
```

#### Online Payment (Card via Paymob) — Auto-Approval

```
CUSTOMER                     WORKER                        PAYMOB
   │                            │                            │
   ├── Fills form on ───────────┤                            │
   │   order.html               │                            │
   │   (Pay Online selected)    │                            │
   │                            │                            │
   ├── POST /api/create-order ──▶                            │
   │                            ├── Validate, store order    │
   │                            ├── Return orderId           │
   │◀───────────────────────────┘                            │
   │                            │                            │
   ├── POST /api/create-payment-link                        │
   │   (with orderId) ─────────▶                            │
   │                            ├── paymobAuthToken() ──────▶│
   │                            │       POST /api/auth/tokens│
   │                            │◀─── token ────────────────│
   │                            │                            │
   │                            ├── paymobCreateOrder() ────▶│
   │                            │       POST /api/ecommerce/orders
   │                            │◀─── order_id ─────────────│
   │                            │                            │
   │                            ├── paymobPaymentKey() ─────▶│
   │                            │       POST /api/acceptance/│
   │                            │       payment_keys         │
   │                            │◀─── payment_token ────────│
   │                            │                            │
   │◀─── { paymentUrl } ────────┘                            │
   │                            │                            │
   ├── Redirects browser ───────┴──────────────▶ Paymob iframe
   │   to paymentUrl                                 │
   │                                                 ├── User pays
   │                                                 │
   │◀── Paymob redirects to ─────────────────────────┘
   │    order-success.html?orderId=...
   │    (reads orderId from localStorage)
   │
   │                            │                            │
   │                            ◀── Paymob webhook POST ──────
   │                            │    /api/paymob-callback
   │                            ├── verifyPaymobHmac()
   │                            ├── Look up order by
   │                            │   merchant_order_id
   │                            ├── approveOrderLogic()
   │                            │   ├── issueCodeForProduct()
   │                            │   ├── Write to ACCESS_CODES
   │                            │   ├── Initialize DO
   │                            │   └── Update order status
   │                            │         → 'approved'
   │                            ├── Return 200 OK ───────────▶
   │                            │
   ├── Polls POST /api/ ───────▶│
   │   check-order-status       ├── Returns status='approved'
   │   every 10s                │   + code
   │◀───────────────────────────┘
   │
   ├── Shows code on screen
   ├── Auto-copies to clipboard
   └── WhatsApp confirmation sent
```

**Important notes:**
- The success page (`order-success.html`) stores the `orderId` in `localStorage` before redirecting to Paymob, so it can be read after the redirect regardless of Paymob's static return URL
- The Paymob webhook URL is `https://muscleos-access-control.muscleos.workers.dev/api/paymob-callback` (must be configured in Paymob dashboard)
- The iframe return URL in Paymob dashboard should be set to `https://muscleos.is-a.dev/order-success.html`
- If the webhook fires before the user is redirected, the success page shows the code immediately
- For testing, add `?manual=1` to `order.html` URL to use the manual Vodafone Cash flow

### 8.4 Product Configuration (auto code generation)

When Anas approves an order, the Worker generates a code based on the product:

| Product | Prefix | Products Array | Duration | Plan |
|---------|--------|---------------|----------|------|
| `training_tool` | `TR-` | `['training_tool']` | 30 days | `single_product` |
| `tdee_adaptive_engine` | `TD-` | `['tdee_adaptive_engine']` | 30 days | `single_product` |
| `both_tools` | `TB-` | `['training_tool', 'tdee_adaptive_engine']` | 30 days | `single_product` |
| `training_book` | `BK-` | `['training_book']` | Lifetime | `single_product` |
| `nutrition_book` | `BN-` | `['nutrition_book']` | Lifetime | `single_product` |
| `both_books` | `BB-` | `['training_book', 'nutrition_book']` | Lifetime | `single_product` |
| `all_access` | `MA-` | `'all'` | 30 days | `master` |

### 8.5 Security

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

### 9.3 Order Approval Page (`admin/orders.html`)

Mobile-first admin page for one-tap order approval.

**Flow:**
1. Anas enters admin key (password-style input, stored in `sessionStorage`)
2. Page fetches `POST /api/pending-orders` every 30s
3. Each pending order shows as a card: product, customer name, payment ref, time waiting (>24h highlighted)
4. **Approve**: calls `/api/approve-order`, auto-generates a code, shows approval panel with:
   - Generated code (copyable)
   - "Send via WhatsApp" button → opens `wa.me/number?text=<prefilled message>` with code, product name, and access instructions in the customer's language
5. **Reject**: selects reason (`didnt_pay`, `suspicious`, `duplicate`, `other`) → confirms → calls `/api/reject-order`

### 9.4 Analytics Dashboard (`admin/analytics.html`)

Mobile-first dashboard for glanceable funnel and order stats.

**Flow:**
1. Anas enters the analytics key (same secret set in `ANALYTICS_KEY` constant in the Apps Script)
2. Page fetches aggregated JSON from the Apps Script `doGet` endpoint
3. Renders: this week at a glance (pageviews, WA clicks, orders with % change vs prior week), funnel stage breakdown (top/middle/bottom as stacked bars), top 5 pages, top 5 WhatsApp tags, order funnel (submitted → approved → rejected with approval rate)
4. Manual refresh button in the bottom bar

**Setup:** Set the `ANALYTICS_URL` constant in `admin/analytics.html` to your Apps Script `/exec?key=ANALYTICS_KEY` URL. Then set `ANALYTICS_KEY` in `../docs/apps-script-webhook.gs` to a secret string — use the same string when first opening the dashboard.

### 9.5 Weekly Email Digest (`sendWeeklySummaryEmail` in Apps Script)

Plain-text summary sent via `MailApp.sendEmail()` (runs under Anas's Google account, no extra API keys needed).

**Setup (manual):** In the Apps Script editor:
1. Triggers (clock icon in sidebar) → Add Trigger
2. Choose function: `sendWeeklySummaryEmail`
3. Choose deployment: Head
4. Event source: Time-driven → Week timer → Pick day and time (Monday morning recommended)

**Content:** Same data as the dashboard — funnel breakdown, top pages/tags, order approval rate, week-over-week deltas.

### 9.6 Rotate Fallback Codes (`scripts/rotate-fallback-codes.js`)

Generates 5 fresh static codes, hashes them, and rewrites `assets/data/access-codes.json`.

```bash
node scripts/rotate-fallback-codes.js
```

Run this **monthly**. The plaintext codes are printed to console — save them in your password manager or personal notes so you can share them with customers during a Worker outage.

### 9.7 Hash Utility (`scripts/hash-code.js`)

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

Secrets to set (`npx wrangler secret put`):
- `ADMIN_KEY` — shared secret for admin API
- `JWT_SECRET` — HS256 signing key
- `CORS_ORIGIN` — allowed origin (fallback to GitHub Pages + custom domain)
- `GOOGLE_CLIENT_ID` — for Google Sign-In
- `PAYMOB_API_KEY` — Paymob API key (from Paymob dashboard → Settings → Account Info → API Key)
- `PAYMOB_INTEGRATION_ID` — Paymob integration ID (integer, from Paymob dashboard → Integrations)
- `PAYMOB_IFRAME_ID` — Paymob iframe ID (string, from Paymob dashboard → Accept → Iframes)
- `PAYMOB_HMAC_SECRET` — Paymob HMAC secret (from Paymob dashboard → Settings → Account Info → HMAC Secret)
- `SITE_BASE_URL` — Site base URL (e.g. `https://muscleos.is-a.dev`); reserved for future WhatsApp Business API return URLs

**Paymob setup steps:**
1. Create account at https://accept.paymob.com
2. Activate card integration (Visa/Mastercard) in Integrations tab
3. Create an iframe in Accept → Iframes
4. Set the iframe's return URL to `https://muscleos.is-a.dev/order-success.html`
5. Configure the webhook endpoint to POST to `https://muscleos-access-control.muscleos.workers.dev/api/paymob-callback`
6. Set the Paymob secrets and SITE_BASE_URL via `npx wrangler secret put`
7. For production (custom domain), the webhook URL becomes `https://api.muscleos.coach/api/paymob-callback`

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
| `train_generated_cta` | Training app program | After program generation |
| `train_footer_cta_bottom` | Training app footer | During tool usage |
| `train_subscribe_bottom` | Training app (unlocked view) | When seeing features |

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

### 11.5 Training App Rehab Tags (JS-generated)

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
| website/worker/src/index.js | 36 KB | 972 | ★★★★★ |
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


---

## Activation Checklist (owner-only)

### 1. Google Analytics (GA4)

`index.html` head contains the gtag.js scaffold with placeholder ID `G-XXXXXXXXXX`.
To activate:
1. Go to https://analytics.google.com and create a GA4 property (e.g. "muscleos.coach").
2. Admin > Data Streams > Web > your stream, copy the Measurement ID (starts with `G-`).
3. Replace both `G-XXXXXXXXXX` occurrences in `website/index.html` (script src + config call).

### 2. Testimonials (social proof)

The reviews section (`id="reviews"`) is intentionally HIDDEN (`style="display:none"`) until real client testimonials exist.
To activate:
1. Collect real client reviews (WhatsApp follow-ups are fine) with written consent to publish.
2. Remove `style="display:none;"` from the `<section id="reviews">` tag.
3. Replace the 3 placeholder cards: quote, real name (or first name), goal + duration.

Do not ship fabricated testimonials � the section stays hidden until the quotes are real.
