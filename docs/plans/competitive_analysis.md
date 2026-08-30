# MuscleOS — Competitive Domination Plan 🏆

> Based on a deep audit of 10 direct competitors: MyFitnessPal, Hevy, Fitbod, WHOOP, RP Hypertrophy, RP Diet Coach, Caliber, Boostcamp, Strong, and Cronometer.

---

## Executive Summary

MuscleOS already has a strong foundation: a deterministic decision engine, PDF delivery, custom worker auth, and solid security. The gap is product depth — competitors are winning on **speed of logging**, **adaptive intelligence**, **visual analytics**, and **seamless ecosystems**. This plan outlines exactly how to close each gap and exceed them.

---

## 🗺️ Roadmap Overview

| Phase | Timeline | Theme | Priority |
|-------|----------|-------|----------|
| **Phase 1** | Weeks 1–3 | Core UX Speed & Logging | 🔴 Critical |
| **Phase 2** | Weeks 4–7 | Analytics & Progress Visualization | 🟠 High |
| **Phase 3** | Weeks 8–12 | Adaptive AI & Decision Engine | 🟠 High |
| **Phase 4** | Weeks 13–18 | Nutrition Intelligence | 🟡 Medium |
| **Phase 5** | Weeks 19–24 | Social, Sharing & Marketplace | 🟡 Medium |
| **Phase 6** | Ongoing | Wearables & Recovery Ecosystem | 🟢 Long-term |

---

## Phase 1 — Core UX Speed & Logging
*Goal: Beat Strong & Hevy on gym-floor usability. Win the day-1 user.*

### 1.1 — Three-Tap Workout Logger ⚡
**Beats:** Strong, Hevy
The fastest way to log a set. Previous session's weight/reps pre-filled in ghost text. One tap checks the set → timer auto-starts. No modals, no friction.

**Implementation:**
- Build a `WorkoutLogger` component with local IndexedDB persistence
- Pre-fill last session values from workout history store
- Auto-start configurable rest timer on set confirmation
- Inline weight/rep increment buttons (+2.5kg / +1 rep) beside input fields

**Files to create:**
- `website/tools/workout-logger/index.html`
- `website/assets/js/workout-logger.js`
- `website/assets/js/workout-history-store.js` (IndexedDB wrapper)

---

### 1.2 — Offline-First Architecture 📴
**Beats:** Every competitor (reliability in basement gyms)
All logs, routines, and workout templates stored locally via IndexedDB/localStorage with background sync to the worker API.

**Implementation:**
- Extend `service-worker.js` with a background sync queue (Background Sync API)
- Cache all tool pages and assets for full offline operation
- Add a sync status indicator (✅ Synced / ⏳ Pending sync)

---

### 1.3 — Barbell Plate Calculator with Visual Stack 🏋️
**Beats:** Strong, Hevy, Boostcamp
Color-coded plate visualizer showing exact plate pairs per side for any target weight. Configurable for KG or LB, and custom available plate inventory.

**Implementation:**
- `website/tools/plate-calculator/index.html` — standalone tool page
- Plate color mapping: 25kg=red, 20kg=blue, 15kg=yellow, 10kg=green, 5kg=white, 2.5kg=black
- SVG barbell render updated in real-time as weight changes

---

### 1.4 — Contextual Set Tagging (Warmup / Drop / Failure / RIR) 🏷️
**Beats:** Hevy, RP Hypertrophy App, Strong
Each set gets a tag: **W** (Warm-up, excluded from volume), **D** (Drop set), **F** (Failure), or an **RIR** number (0–4). Tags feed directly into the decision engine.

**Implementation:**
- Add tag selector row beneath each set entry in the logger
- Warm-up sets excluded from weekly hard-set volume calculations
- RIR/RPE values stored and used for plateau detection algorithm

---

### 1.5 — High-Contrast Gym Mode Dark Theme 🌑
**Beats:** Hevy, Strong, Caliber
True OLED black (`#000000`) background with oversized touch targets (min 48px), high-contrast text (`#FFFFFF` primary, `#A0A0A0` secondary), and reduced motion mode.

**Implementation:**
- Add `data-theme="gym"` CSS class on `<html>` element
- Persist preference to `localStorage`
- Implement OS-level dark mode detection + manual override toggle

---

### 1.6 — Sub-60-Second Onboarding Flow 🚀
**Beats:** Every competitor (Hevy gets close at ~90s)
Goal → Equipment → Experience Level → First workout. Done in 4 taps. No accounts required upfront.

**Implementation:**
- `website/onboarding/index.html` — 4-step card swipe flow
- Choices stored in `localStorage` for the decision engine
- Progressive account creation: invite to sign in *after* first workout is logged

---

## Phase 2 — Analytics & Progress Visualization
*Goal: Out-analyze Caliber and Hevy. Make progress impossible to ignore.*

### 2.1 — Estimated 1RM Interactive Chart 📈
**Beats:** Hevy, Strong, Boostcamp
Charts calculated 1RM over time for any exercise using Epley/Brzycki formulas. Tap any point to see the exact set that produced it.

**Implementation:**
- `website/tools/progress/index.html`
- Chart.js or D3.js timeline with multi-exercise filter dropdown
- Formulas: `e1RM = weight × (1 + reps/30)` (Epley) with formula selector
- Store workout logs in IndexedDB, query by exercise

---

### 2.2 — Muscle Volume Heatmap (3D Body Model) 💪
**Beats:** Hevy, Fitbod, Caliber
Anatomical SVG body model where muscle regions glow based on weekly hard sets performed vs. MEV/MRV targets. Red = overreached, green = optimal, grey = undertrained.

**Implementation:**
- Detailed front/back SVG body map with labeled muscle regions
- Color scale: grey (0 sets) → green (MEV) → orange (MAV) → red (>MRV)
- MEV/MRV data sourced from the existing `decision_rules.json`
- Weekly rolling window calculation: last 7 days of tagged sets

---

### 2.3 — Relative Strength Score & Radar Chart ⚡
**Beats:** Caliber (their #1 loved feature)
Normalizes 1RM to bodyweight across 5 lifts (Squat, Bench, Deadlift, OHP, Row). Plots a symmetry radar showing lagging groups. Rates Beginner → Novice → Intermediate → Advanced → Elite using Symmetric Strength standards.

**Implementation:**
- Strength standard tables embedded as JSON
- Radar chart (Chart.js radar type) with 5 axes
- Strength score updates automatically when a new PR is detected
- Share card generator: exportable SVG/PNG score card

---

### 2.4 — Trend-Smoothed Bodyweight Curve ⚖️
**Beats:** MacroFactor, RP Diet Coach
7-day exponential moving average overlaid on daily weigh-ins. Shows true mass trend, not noise. Rate-of-change indicator shows weekly gain/loss velocity.

**Implementation:**
- Daily weigh-in logging widget (single number input, quick add)
- EMA calculation: `EMA = prev_EMA × 0.9 + today_weight × 0.1`
- Display: raw dots (light opacity) + EMA trend line (bold)
- Weekly velocity label: "−0.4 kg/week → On track for cut 🎯"

---

### 2.5 — Personal Record Detection & Trophy Feed 🏆
**Beats:** Hevy, Strong
Automatically detects when any set breaks a previous best (weight, reps, e1RM). Shows a celebration animation + adds to a PR timeline feed.

**Implementation:**
- Background comparison against IndexedDB personal bests table
- Confetti micro-animation + haptic pulse (if mobile)
- PR feed page with filter by exercise and date range

---

## Phase 3 — Adaptive AI & Decision Engine Expansion
*Goal: Beat RP Hypertrophy App on intelligence. Own the science-based niche.*

### 3.1 — Biofeedback Volume Autoregulation Engine 🧠
**Beats:** RP Hypertrophy App (their #1 differentiator)
Post-workout prompt: rate your Pump (1–5), Fatigue (1–5), and Next-Day Recovery (1–5). The engine dynamically adds or removes sets from next week's plan.

**Algorithm:**
```
If Pump < 3 AND Fatigue < 3: +1 set next week
If Fatigue > 4 OR Recovery < 2: -1 set next week
If Recovery < 2 AND Fatigue > 4: trigger deload warning
```

**Implementation:**
- Post-workout rating modal (shows after session ends)
- Biofeedback scores stored per session, per muscle group
- Volume adjustment logic runs in `decision-engine.js` and updates week's plan
- Visual: "Your chest volume was increased to 14 sets based on last week's pump score"

---

### 3.2 — Predictive Plateau Detection & Deload Alerts 🚦
**Beats:** Alpha Progression, JuggernautAI
Monitors lift progression. If e1RM stagnates for 3+ consecutive sessions on the same exercise, triggers: "Plateau Detected — Consider a deload or variation."

**Implementation:**
- Regression analysis on e1RM history (detect slope < 1% over 3 sessions)
- Alert card inserted into the training dashboard
- Decision engine routes to deload template or exercise substitution suggestions

---

### 3.3 — Automated Mesocycle Deload Scheduling 📅
**Beats:** RP Hypertrophy, Boostcamp
After every 4–6 week training block, the system schedules a deload week: 50% volume, 60–70% intensity. Notifies the user 3 days before.

**Implementation:**
- Mesocycle counter stored in user profile
- Deload week auto-generates a reduced version of current program
- Notification banner: "Week 5 complete. Deload week starts Monday 💤"

---

### 3.4 — Localized Muscle Recovery Decay Model 🔬
**Beats:** Fitbod (their core algorithm)
Calculates a % readiness for each muscle group based on volume performed, intensity (RIR), and time elapsed since last stimulus. Uses an exponential decay curve.

**Algorithm:**
```
fatigue_remaining = initial_fatigue × e^(-λ × hours_elapsed)
readiness = 100 - fatigue_remaining
λ = 0.035 (fast-twitch dominant) or 0.02 (slow-twitch dominant)
```

**Implementation:**
- Muscle readiness dashboard showing all 12 muscle groups with % bars
- Color coding: green (>80%), yellow (50–80%), red (<50% = don't train today)
- Updates dynamically when new workouts are logged

---

### 3.5 — Biometric AI Coach (RAG-Backed Chat) 🤖
**Beats:** WHOOP Coach, HevyGPT
A conversational coach that has context of *your* workout logs, recovery scores, plateau history, and nutrition data. Answers questions like "Why am I not progressing on bench press?" with real data.

**Implementation:**
- Chat interface in `website/tools/ai-coach/index.html`
- Worker endpoint `/api/ai-coach` passes user context (recent workouts, biofeedback, plateau flags) to an LLM (Google Gemini API)
- Streamed response with markdown rendering
- Context window: last 4 weeks of data

---

## Phase 4 — Nutrition Intelligence
*Goal: Combine Cronometer's accuracy with MacroFactor's adaptive engine. Own the serious athlete nutrition niche.*

### 4.1 — Dynamic Expenditure (TDEE) Engine 🔥
**Beats:** MacroFactor, RP Diet Coach — the #1 feature gap in the market
Uses weight trend velocity + calorie intake to *mathematically calculate* true metabolic rate. No wearables needed, no static Harris-Benedict formulas.

**Algorithm:**
```
weekly_weight_change_kg = (end_weight - start_weight)
caloric_surplus_deficit = weekly_weight_change_kg × 7700 (kcal per kg)
actual_TDEE = avg_daily_intake - (caloric_surplus_deficit / 7)
```

**Implementation:**
- Daily calorie intake logging (quick-add macro entry)
- 2-week rolling TDEE calculation displayed on nutrition dashboard
- Auto-adjusts calorie targets to maintain goal rate of gain/loss

---

### 4.2 — Training-Day vs. Rest-Day Macro Cycling 🔄
**Beats:** RP Diet Coach, Cronometer
Higher carbs on training days (pre/post-workout), lower carbs on rest days, consistent protein. Automatically sets different daily targets based on workout schedule.

**Implementation:**
- Calorie cycling toggle in nutrition settings
- Pulls from workout schedule to determine training vs. rest day
- Training day: +15–20% carbs, -5% fat | Rest day: baseline

---

### 4.3 — Micronutrient Audit Panel 🧪
**Beats:** Cronometer (simpler version)
Weekly micronutrient report highlighting deficiencies in Vitamin D, Magnesium, Zinc, Omega-3, Iron — the most common deficiencies in athletes.

**Implementation:**
- Data sourced from USDA FoodData Central API (free, no licensing issues)
- Visual adequacy bars for top 15 key micronutrients
- Smart suggestions: "You're low on Magnesium this week — try pumpkin seeds or supplement"

---

### 4.4 — Barcode Scanner & Photo Food Logger 📸
**Beats:** MyFitnessPal (free, no paywall)
Barcode scan via camera for instant food lookup. Photo recognition via AI vision API as a secondary option.

**Implementation:**
- `QuaggaJS` or native `BarcodeDetector` API for in-browser barcode scanning
- Food lookup against Open Food Facts API (free, 3M+ products, globally maintained)
- AI photo logging: send image to Gemini Vision API → returns estimated macros

---

## Phase 5 — Social, Sharing & Marketplace
*Goal: Build Hevy-style virality and Boostcamp-style coach ecosystem.*

### 5.1 — One-Tap Routine & Split Sharing 🔗
**Beats:** Hevy, Boostcamp
Encode any workout or multi-week program into a URL deep link. Anyone who taps the link gets the full routine imported instantly.

**Implementation:**
- Base64-encode routine JSON into URL query param
- `website/tools/import/?routine=<encoded>` parsing route
- QR code generation using `qrcode.js` library

---

### 5.2 — Coach Program Marketplace 🛒
**Beats:** Boostcamp (adds monetization for coaches)
A curated store where certified coaches can publish multi-week programs. MuscleOS takes a 15–20% cut; coaches keep the rest.

**Implementation:**
- `website/marketplace/index.html` — program cards with preview, author, rating, price
- Worker endpoints: `/api/marketplace/list`, `/api/marketplace/purchase`
- Purchase flow via existing Instapay/Vodafone Cash order system
- Access delivery via existing PDF/code system (extend `PDF_PRODUCT_MAP`)

---

### 5.3 — Workout Activity Feed & Kudos 👥
**Beats:** Hevy
Opt-in social feed where users can share completed workouts, PRs, and progress photos. Follow friends, give kudos, leave comments.

**Implementation:**
- Supabase `workout_posts` table (RLS: public posts visible to followers)
- `website/community/index.html` — chronological feed
- Follow/unfollow, like, comment system
- Privacy: feed is opt-in, default private

---

## Phase 6 — Wearables & Recovery Ecosystem
*Goal: Surround the user's health data. Own the recovery narrative.*

### 6.1 — HealthKit & Health Connect Integration 🍎
**Beats:** Every competitor (table stakes for serious fitness apps)
Write completed workouts, active calories, and body weight to Apple Health / Google Health Connect. Read HRV, sleep, and resting heart rate.

**Implementation:**
- For PWA/web: use `navigator.permissions` + Health Connect API (Android 14+)
- For iOS: Requires native wrapper (Capacitor.js recommended for PWA→native bridge)
- Writes: workout summaries, active calories burned
- Reads: HRV, sleep duration, resting HR for recovery score

---

### 6.2 — Composite Recovery Score 🫀
**Beats:** WHOOP (without requiring $30/mo hardware subscription)
Synthesizes HRV (from HealthKit), resting HR, and sleep quality into a 0–100% daily readiness score.

**Formula:**
```
recovery = (hrv_score × 0.5) + (rhr_score × 0.3) + (sleep_score × 0.2)
```

**Implementation:**
- Recovery dashboard widget (large circular score display)
- Daily recommendation: "75% Recovery — Train as planned ✅"
- Historical recovery trend chart (7-day, 30-day)

---

### 6.3 — Lifestyle Habit Journal & Correlation Analytics 📓
**Beats:** WHOOP Journal
Log daily habits: alcohol, caffeine, creatine, sauna, sleep time. After 30 days, show statistical correlations: "Alcohol = −18% next-day HRV on average."

**Implementation:**
- Daily journal entry widget (toggle chips: "Alcohol / Caffeine / Late meal / Sauna")
- Correlation engine: Pearson correlation between habit and next-day recovery score
- Insights feed: auto-generated weekly behavioral patterns report

---

## 🎯 Competitive Kill Sheet

| Feature | Kills | Why We Win |
|---------|-------|------------|
| Three-Tap Logger | Strong, Hevy | Fastest logging flow, offline-first |
| Biofeedback Autoregulation | RP Hypertrophy | Free, integrated, science-identical |
| Dynamic TDEE Engine | MacroFactor | No subscription required |
| Muscle Heatmap | Fitbod, Caliber | Tied to our MEV/MRV decision engine |
| Strength Score Radar | Caliber | Free, shareable, gamified |
| Plateau Detection | Alpha Progression | Proactive, not reactive |
| Barcode Scanner (free) | MyFitnessPal | No paywall, Open Food Facts DB |
| Recovery Score (no hardware) | WHOOP | Uses existing phone sensors |
| Coach Marketplace | Boostcamp | Revenue share, our order system |
| Routine Deep Links | Hevy | Viral acquisition loop |

---

## 🚫 What NOT to Build (Avoid These Traps)

- **Do NOT build** a massive food database from scratch → Use Open Food Facts API
- **Do NOT** gate core features behind subscriptions early → Caliber's 100% free model drives massive adoption
- **Do NOT** add a social feed without privacy-first defaults → Users hate opt-out social
- **Do NOT** add wearable *dependency* → Recovery score should work without them (use phone sleep data)
- **Do NOT** copy WHOOP's hardware model → Win on software intelligence instead

---

## Open Questions

> [!IMPORTANT]
> **Which Phase 1 feature do you want to start first?**
> - A) Workout Logger (fastest user-visible win)
> - B) Gym Mode Dark Theme (quick win, huge UX improvement)
> - C) Plate Calculator (high utility tool)
> - D) Onboarding Flow (conversion optimization)

> [!IMPORTANT]
> **Monetization model for Phase 5 (Coach Marketplace)?**
> - Revenue split (15% MuscleOS / 85% Coach)?
> - Flat listing fee?
> - Existing order system handles payment?

> [!NOTE]
> The Biometric AI Coach (Phase 3.5) requires a Google Gemini API key. Do you already have one configured in `wrangler.toml`?
