# Marketing Funnel & Pricing Revamp Plan
**Date:** 2026-08-20 | **Owner:** Coach Anas Mo'men

---

## Goal

Rebuild the landing page (`index.html`) and checkout page (`order.html`) to:
1. Show **dual-currency pricing** (EGP for local, USD for global) with **auto-detection via browser timezone/IP**
2. Separate the value proposition into **3 dedicated sections** — Tools, Books, Coaching
3. Wire a **free-trial → quiz → personalized offer → order** conversion flow
4. Replace placeholder testimonials with real social proof
5. Tighten every CTA, headline, and FAQ to match the actual product

---

## New Pricing Table (Source of Truth)

| Product | EGP (Local) | USD (Global) | Type |
|---------|------------|-------------|------|
| Training App | 300 EGP / mo | $6 / mo | Subscription (30d) |
| TDEE Adaptive Engine | 300 EGP / mo | $5.99 / mo | Subscription (30d) |
| Omni Hub (Training + TDEE) | 600 EGP / mo | $11.99 / mo | Subscription (30d) |
| Training Book | 750 EGP | $15 | One-time lifetime |
| Nutrition Book | 750 EGP | $15 | One-time lifetime |
| Both Books Bundle | 1,200 EGP | $22 | One-time lifetime (save 300 EGP / $8) |
| ~~All Access~~ | ~~removed~~ | | Discontinued |

**Currency logic:**
- Auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Egypt/MENA timezone → EGP default
- Everything else → USD default
- User can manually toggle with a pill switch (🇪🇬 EGP / 🌍 USD) visible on pricing section and order page

---

## Funnel Architecture

```
[index.html]
  Hero → "Start Free Trial" (primary CTA)
       → "See Pricing" (secondary CTA)
  ↓
  About section (3 pillars: Training / Nutrition / AI Coach)
  ↓
  Pricing section (3 tabs: Tools | Books | Coaching)
    — each tab has local/global price toggle
    — "Start Free Trial" → tools/training_tool.html (7-day trial, existing D3 logic)
    — "Buy Now" → order.html?product=X
  ↓
  Quiz CTA banner — "Not sure what you need?" → quiz/split_selector_quiz.html
  ↓
  Real testimonials (3 cards — replace John Doe etc.)
  ↓
  FAQ (updated: pricing, trial, refund, global payment, delivery)
  ↓
  WhatsApp CTA footer strip

[order.html]
  — Currency toggle (auto-detect on load, pill to switch)
  — Products show correct local/global price based on toggle state
  — "Both Books Bundle" new option added
  — "All Access" card removed
  — Payment methods: Vodafone Cash (EGP only) | Paymob online (EGP) | International (USD, via Stripe or manual bank — placeholder)
```

---

## Pages In Scope

### 1. `index.html` — Full Landing Page Revamp

#### Section 1: Hero
- **Headline (EN):** `Your training. Your nutrition. One operating system.`
- **Subhead:** `Evidence-based AI coaching built on 277 research documents — not guesswork.`
- **Primary CTA:** `Start Free Trial →` (links to training_tool.html — 7-day trial via D3 logic)
- **Secondary CTA:** `View Pricing` (anchor scroll)
- Replace the neon purple/blue accent with the MOS brand gold (#F4C93B) to match order.html/training_tool.html
- Keep the fake terminal but update the copy to reflect real pipeline:
  ```
  > mos intake --goal=hypertrophy
  ✔ 28-question intake complete
  ✔ Vault RAG: 277 docs indexed
  > Generating program... done in 2.1s
  ```

#### Section 2: The 3 Pillars (About)
- **Pillar 1 — Training App:** auto-regulated volume, RPE logging, biofeedback, deload detection, share cards
- **Pillar 2 — TDEE Engine:** adaptive TDEE, moving average recalibration, macro cycling, carb timing
- **Pillar 3 — AI Coach (Omni Hub):** Groq-powered AI coach, cross-tool sync, unified dashboard

#### Section 3: Pricing (3 Tabs + Currency Toggle)
```
[Tools]  [Books]  [Coaching]        [🇪🇬 EGP | 🌍 USD]  ← pill toggle
```

**Tools tab:**
- Training App — 300 EGP / $6 mo — "Start Free Trial" + "Buy Now"
- TDEE Engine — 300 EGP / $5.99 mo — "Start Free Trial" + "Buy Now"
- Omni Hub ⭐ BEST VALUE — 600 EGP / $11.99 mo — "Start Free Trial" + "Buy Now"

**Books tab:**
- Training Book — 750 EGP / $15 one-time — "Buy Now"
- Nutrition Book — 750 EGP / $15 one-time — "Buy Now"
- Both Books Bundle 🔥 — 1,200 EGP / $22 one-time (save 300 EGP / $8) — "Buy Now"

**Coaching tab:**
- "Looking for 1-on-1 coaching?" → WhatsApp CTA + brief positioning copy

#### Section 4: Quiz CTA Banner
- "Not sure which tool is right for you?"
- Button: "Take the 2-min Quiz →" → links to `quiz/split_selector_quiz.html`

#### Section 5: Testimonials
- Replace John Doe/Sarah Smith/Mike J. with REAL client outcomes
- Structure: name (first only or initials) + goal + result ("Added 8kg to bench in 6 weeks", etc.)
- If no real testimonials ready yet: use placeholder structure with [REPLACE] markers in code

#### Section 6: FAQ — Updated Questions
1. What's the difference between the Training App and Omni Hub?
2. Is there a free trial?
3. Can I pay internationally?
4. How do I get my access code after purchase?
5. Do you offer refunds?
6. Is it an app I download?
7. What's the AI Coach powered by?

#### Section 7: Footer WhatsApp Strip
- Full-width yellow strip above footer: "Questions? Message Anas directly →" + WhatsApp button

---

### 2. `order.html` — Checkout Page Updates

#### Currency Toggle
- Auto-detect on DOMContentLoaded via timezone check
- Pill toggle visible at top of product grid: `🇪🇬 EGP | 🌍 USD`
- On toggle: all `.po-price` elements update to show correct currency/amount

#### Updated Product Grid
Remove `all_access` card. Add `both_books` as a new highlighted option. New layout:

```
[Training App]      [TDEE Engine]
[Omni Hub ⭐]       (full width)
[Training Book]     [Nutrition Book]
[Both Books 🔥]     (full width, saves 300 EGP / $8)
```

#### Prices in JS (single source of truth object)
```js
const PRICES = {
  training_tool:        { egp: '300 EGP / mo', usd: '$6 / mo' },
  tdee_adaptive_engine: { egp: '300 EGP / mo', usd: '$5.99 / mo' },
  omni_hub:             { egp: '600 EGP / mo', usd: '$11.99 / mo' },
  training_book:        { egp: '750 EGP',      usd: '$15' },
  nutrition_book:       { egp: '750 EGP',      usd: '$15' },
  both_books:           { egp: '1,200 EGP',    usd: '$22' },
};
```

#### Payment Methods (currency-aware)
- **EGP mode:** Vodafone Cash + Paymob online (existing)
- **USD mode:** show "International Transfer" option (manual bank/PayPal placeholder) + hide Vodafone Cash

#### Worker `PRODUCT_CONFIG` sync
Update `website/worker/src/index.js` to add `both_books` to `PRODUCT_CONFIG`:
```js
both_books: { prefix: 'BB', products: ['training_book', 'nutrition_book'], durationDays: 0, plan: 'single_product' },
```
(This may already exist — verify before adding.)

---

## Geo-Detection Logic (shared JS snippet)

```js
function detectCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const egyptZones = ['Africa/Cairo', 'Africa/Tripoli', 'Africa/Khartoum'];
    const menaZones = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Bahrain',
                       'Asia/Qatar', 'Asia/Amman', 'Asia/Beirut', 'Asia/Baghdad'];
    if (egyptZones.includes(tz)) return 'egp';
    if (menaZones.includes(tz)) return 'egp'; // show EGP for MENA too (same pricing)
    return 'usd';
  } catch(e) { return 'usd'; }
}
```

- Result stored in `window.__currency` (`'egp'` | `'usd'`)
- Manual toggle writes to `localStorage('mos_currency')` and overrides geo-detect on next load

---

## Implementation Order

| Step | File | Task |
|------|------|------|
| 1 | `order.html` | Add PRICES object + currency toggle pill + update product grid (remove all_access, add both_books) |
| 2 | `order.html` | Currency-aware payment method display (hide Vodafone Cash in USD mode) |
| 3 | `index.html` | Replace design tokens: neon purple → MOS gold (#F4C93B) |
| 4 | `index.html` | Rewrite Hero section (new headline, terminal copy, CTAs) |
| 5 | `index.html` | Rebuild Pricing section with 3 tabs (Tools/Books/Coaching) + currency toggle |
| 6 | `index.html` | Add Quiz CTA banner |
| 7 | `index.html` | Update Testimonials section (structure with [REPLACE] markers) |
| 8 | `index.html` | Update FAQ section (7 real questions) |
| 9 | `index.html` | Add WhatsApp strip above footer |
| 10 | `worker/src/index.js` | Verify `both_books` in PRODUCT_CONFIG + PRODUCT_PRICES |

---

## Open Questions

> **Q1 — Annual plan:** Should there be an annual option (e.g. 2 months free = 10x monthly EGP)?
> You selected "Add annual plan option" — do you want this in this sprint or deferred?

> **Q2 — Real testimonials:** Do you have 3 real client outcomes I can use? Or should I put [REPLACE] placeholders?

> **Q3 — International USD payment method:** Right now there's no Stripe integration. For USD orders, should the international option say "Contact via WhatsApp for international payment" or do you want a real Stripe link?

> **Q4 — Coaching tab pricing:** What does 1-on-1 coaching cost? Or is it "contact for pricing"?

> **Q5 — Both Books price in worker:** Worker `PRODUCT_PRICES` currently has `both_books: { amountCents: 80000 }` (800 EGP). This needs updating to 120000 (1200 EGP). Confirm?

---

## Verification Plan

- [ ] Currency toggle auto-detects correctly in Cairo timezone
- [ ] Currency toggle persists on page refresh via localStorage
- [ ] All prices render correctly in EGP and USD
- [ ] Clicking "Buy Now" on index.html navigates to `order.html?product=X` with correct product pre-selected
- [ ] Order page shows correct currency based on toggle state
- [ ] `both_books` product selectable on order page and submits correctly
- [ ] `all_access` no longer visible on order page
- [ ] Vodafone Cash hidden in USD mode
- [ ] Free trial CTA links to training tool (7-day trial flow active)
