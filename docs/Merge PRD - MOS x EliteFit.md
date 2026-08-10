# Merge PRD — Muscle OS Mobile x EliteFit

**Status:** Draft v1.0
**Date:** 2026-08-07
**Owner:** Founder (Anas)
**Decision needed by:** Before Phase 1 build starts

---

## 1. Executive Summary

EliteFit (`E:\MoS\elitefit-master`) is a full-featured Flutter fitness tracker (workout logging, nutrition, body scale, gamification, health intelligence) with an Arabic-first bilingual UI. Muscle OS Mobile (`E:\MoS\mos-mobile\mobile`) is an Expo/React Native AI-native coaching app (program generation, knowledge hub, tools, coach dashboard) with a local-first data layer and a distinctive gold-on-dark visual identity.

**Goal:** Rebuild EliteFit's features inside the MOS Mobile app — one product, one theme (MOS), one local-first data layer, bilingual AR/EN. EliteFit's Flutter code is NOT ported; its features and data are re-implemented as native Expo screens following the MOS design system.

**Decisions locked with the founder:**
| Question | Decision |
|---|---|
| Scope | Phased — core tracking first, hardware integrations deferred |
| Language | Bilingual AR/EN (Arabic-first, like EliteFit) |
| Auth & backend | Keep MOS local-first (no Firebase) |
| Native integrations | Defer all (health sync, barcode, camera photos, push notifications) |
| Monetization | Freemium core + existing WhatsApp book sales (500 EGP) gate premium |

---

## 2. The Two Apps Today

### 2.1 Muscle OS Mobile (target platform)
- **Stack:** Expo SDK 57, React Native, TypeScript, expo-router v57 (typed routes), expo-sqlite KV store (`src/storage/local-store.ts`), vitest (101 tests on training-logic), react-native-webview, react-native-pdf.
- **Auth:** Local-first email+password (FNV-1a hashed, NOT cryptographic — stand-in until real auth). Roles: `client` / `coach`. No backend required; optional FastAPI backend at `http://localhost:8000`.
- **Theme:** MOS palette — bg `#14151A`, card `#1E2027`, text `#FAFAF8`, accent gold `#F4C93B`, green `#4CAF50`, red `#F44336`, orange `#FF9800`, blue `#2196F3` (centralized in `src/components/ui.tsx` → `COLORS`).
- **Client features:** Train (program generator), Progress (ACWR, monotony, 7d tonnage, weekly volume vs MAV), Knowledge Hub (4 book PDFs + 6 guides), Tools (TDEE, volume, RPE, split quiz, warm-up + embedded web training app), Library (generated program), Tracker (manual lift logger + per-exercise history), Chat (AI coach), Check-in, Profile.
- **Coach features:** Clients list, client detail (chat / guides / tools), Knowledge, Tools, Profile.
- **Training logic (existing, tested):** `src/training-logic/` — tdee, rpe, volume (MEV/MAV/MRV), strain, load-engine, exercise-meta.

### 2.2 EliteFit (source of features)
- **Stack:** Flutter 3.x + Dart, BLoC, Drift (SQLite), Firebase (Auth, Firestore sync, Messaging), go_router, fl_chart, mobile_scanner, health (HealthKit/Google Fit), pdf/printing. **Bilingual EN/AR** (`l10n` arb files).
- **Feature inventory (16):**
  1. Auth (email+Google, forgot password, verification, onboarding, guest mode)
  2. Home dashboard (calorie gauge, macro cards, quick actions, water)
  3. Workout logging (4 tabs: workouts / exercises / history / analytics; active-workout mode; PR detection)
  4. Exercise library (689 seeded exercises — `assets/database/exercises_and_foods.json`)
  5. Workout splits & programs (standard + custom, detail view, PDF export)
  6. Diet plans (standard + custom tabs, detail view, PDF export)
  7. Meals & nutrition logging (2395 seeded foods — same JSON; meal types breakfast/lunch/dinner/snack)
  8. Body scale (weight, body fat, chest/waist/hips/arms/thighs + trend charts)
  9. Health Intelligence hub (7 tools: condition mode, fridge meal, gut health, muscle overlap, plateau detector, recovery tracker)
  10. Strength tier system (novice → elite via 1RM/bodyweight ratios)
  11. Gamification (XP, levels, streaks, achievements + badge system, confetti)
  12. Favorites
  13. Guides
  14. Subscription paywall (tier: free/premium)
  15. Settings + reminder dialogs (local notifications)
  16. Cloud sync + health sync + Firebase messaging (services layer)
- **Data model:** 18 Drift tables — Users, Foods, Meals, MealItems, Exercises, Workouts, WorkoutSets, StrengthRecords, Achievements, UserAchievements, WaterLogs, XpEvents, BodyMeasurements, ProgressSnapshots, MuscleActivityLogs, RecoveryLogs, HealthConditions, FridgeItems, GutHealthLogs.

---

## 3. Merge Strategy

**Rebuild-in-MOS** (per founder decision). Rationale:
- Porting Flutter → React Native is a full rewrite anyway; rebuilding natively in Expo keeps ONE codebase, one theme, one navigation, one data layer.
- MOS already ships the coach + client + program-generation pipeline; EliteFit features become client-side tabs/screens.
- EliteFit's **seeded content is portable as-is**: `exercises_and_foods.json` (689 exercises, 2395 foods, Arabic names included) becomes a bundled asset loaded into the local DB.

**Not done:** dual-app maintenance, embedding EliteFit as a Flutter module, or keeping EliteFit alive as a separate product.

### 3.1 Target IA (unified client app)
```
(client)/(tabs)/
├── train        # existing — program generation
├── tracker      # P1: full workout logging (replaces manual logger)
├── nutrition    # P1: meals + food DB + water   [NEW TAB]
├── progress     # existing + P1: scale & measurements charts
├── knowledge    # existing
├── tools        # existing + P2: health intelligence hub entry
├── library      # existing + P2: splits & diet plans
├── profile      # existing + P1: gamification (XP/level/streak/achievements)
└── chat         # existing
```
Tab bar grows from 6 to 7 tabs (Train, Tracker, Nutrition, Progress, Knowledge, Tools, Profile) — Library/chat remain hidden-route screens. Final tab count and ordering to be confirmed in Phase 1 design.

---

## 4. Feature-by-Feature Mapping

| # | EliteFit feature | Decision | Target in MOS | Phase |
|---|---|---|---|---|
| 1 | Auth (email/Google) | **Merge** — keep MOS local-first auth; Google sign-in optional later | Existing auth screens + bilingual strings | 1 |
| 2 | Home dashboard (calorie gauge, macros, quick actions) | **Rebuild** | New `train` dashboard section (daily calorie ring, macro bars, water) | 1 |
| 3 | Workout logging (workouts/sets/history/analytics) | **Rebuild** | `tracker` tab — replace manual logger with full logger (active workout mode, PR flags, per-exercise history, charts) | 1 |
| 4 | Exercise library (689) | **Port data** | Bundled `exercises_and_foods.json` → exercise browser + search, favorites | 1 |
| 5 | Workout splits & programs + PDF | **Rebuild** | `library` — split library + program detail + PDF export (reuse existing pdf-viewer) | 2 |
| 6 | Diet plans + PDF | **Rebuild** | `library` — diet plan library (reuse book PDFs where aligned) | 2 |
| 7 | Meals & nutrition logging (2395 foods) | **Rebuild** | `nutrition` tab — meal log, food search (Arabic-first), favorites; barcode deferred | 1 |
| 8 | Body scale + measurements | **Rebuild** | `progress` — measurements entry + trend charts (reuse existing ACWR/tonnage analytics) | 1 |
| 9 | Health Intelligence hub (7 tools) | **Rebuild** | `tools` — Health Intelligence section (condition mode, fridge meal, gut health, muscle overlap, plateau detector, recovery tracker) | 2 |
| 10 | Strength tier system | **Rebuild** | `tracker` — tier badge (novice→elite) computed from existing `load-engine`/`rpe` logic | 1 |
| 11 | Gamification (XP/levels/streaks/achievements) | **Rebuild** | `profile` — XP/level/streak + achievement badges | 1 |
| 12 | Favorites | **Rebuild** | favorites section inside exercise/food browsers | 1 |
| 13 | Guides | **Merge** — MOS already has 6 guides + reader | Keep existing; port EliteFit guide content if richer | 1 |
| 14 | Subscription paywall | **Replace** — freemium + WhatsApp books | Premium feature flags + existing WhatsApp purchase CTA | 1 |
| 15 | Settings & reminders | **Defer** (needs notifications) | Settings screen (language, units) only | 1 |
| 16 | Cloud sync / health sync / push | **Defer** — placeholders only | Data layer designed to allow sync later | 3 |
| — | Barcode scanning, progress photos, health sync, Bluetooth | **Defer** | No code; placeholders in design docs | 3 |

---

## 5. Data Model Mapping (EliteFit → MOS)

MOS currently stores everything as JSON blobs in a KV store (`getJSON`/`setJSON` on expo-sqlite). EliteFit features need relational-ish data. **Recommended:** add a small repository layer using expo-sqlite directly (`src/data/`), keeping the KV store for profile/session/settings.

| EliteFit table | MOS equivalent (new unless noted) | Notes |
|---|---|---|
| Users | existing `mos_users` KV profile + new `users` table for tracker fields | xp, level, streak, subscriptionTier, goals |
| Exercises | `exercises` table, seeded from bundled JSON | 689 rows; fields: muscleGroup, equipment, nameAr/nameEn, instructions, isFavorite |
| Foods | `foods` table, seeded from bundled JSON | 2395 rows; macros per 100g, barcode (null for now) |
| Meals / MealItems | `meals` / `meal_items` | type: breakfast/lunch/dinner/snack; date |
| Workouts / WorkoutSets | `workouts` / `workout_sets` | duration, totalVolume, isCompleted, isPR |
| StrengthRecords | `strength_records` | 1RM + tier (novice/beginner/intermediate/advanced/elite) — reuse `src/training-logic` |
| Achievements / UserAchievements | `achievements` / `user_achievements` | seeded definitions + progress/unlocked state |
| WaterLogs | `water_logs` | glasses per day |
| XpEvents | `xp_events` | amount + reason (audit of XP) |
| BodyMeasurements | `body_measurements` | weight, bodyFat, chest, waist, hips, arms, thighs |
| ProgressSnapshots | `progress_snapshots` | weekly: avgVolume, avgCalories (plateau detector input) |
| MuscleActivityLogs | `muscle_activity_logs` | muscleGroup + trainedAt (overlap detector input) |
| RecoveryLogs | `recovery_logs` | sleep, stress, restDay |
| HealthConditions | `health_conditions` | conditionType + severity (condition-mode tool) |
| FridgeItems | `fridge_items` | foodId, quantity, unit, expiresAt |
| GutHealthLogs | `gut_health_logs` | comfort, bloating, preWorkoutMealId |

**Content port:** `elitefit-master/assets/database/exercises_and_foods.json` (1.7 MB, 689 exercises + 2395 foods, contains Arabic strings) → copied to `mos-mobile/mobile/assets/data/` and loaded once into SQLite on first launch (with a `seeded_version` marker).

---

## 6. Architecture Decisions

1. **Theme:** single source `COLORS` in `src/components/ui.tsx` (already the MOS palette — the recent theme unification covers all screens). New screens MUST use COLORS — no hardcoded hexes (lint rule to add in Phase 1).
2. **i18n:** new `src/i18n/` — `strings.ar.ts` / `strings.en.ts` + `useT()` hook + `I18nProvider`. Default: Arabic (EliteFit audience), switchable in Settings. All new screens string-first; existing English screens get strings gradually (Phase 1: new screens only; Phase 2: full pass).
3. **Storage:** expo-sqlite directly via `src/data/` repositories (mirroring EliteFit's Drift layer). KV store remains for session/profile. All repositories synchronous-first (SQLite is sync via `expo-sqlite` sync API) with typed models in `src/data/types.ts`.
4. **Seed data:** `assets/data/exercises_and_foods.json` bundled; one-time import guarded by version marker.
5. **Analytics:** every new user-facing action calls `track()` — extend `src/analytics` (currently backend-based; fall back to local JSONL) to cover tracker/nutrition events.
6. **Navigation:** new screens registered in `(client)/(tabs)/_layout.tsx` + typed routes; tab count 7.
7. **Testing:** vitest for all pure logic (tier calc, macro math, XP rules, plateau detection, overlap detection) — target 50+ new tests; existing 101 stay green.
8. **Coach side:** unchanged in Phase 1 except theme; coach optionally views client tracker data in Phase 3.

---

## 7. Phased Roadmap

### Phase 1 — Core Tracking (goal: usable daily tracker)
Deliverables:
- [ ] i18n foundation (AR default) + Settings (language)
- [ ] Data layer: SQLite repositories + seed import of exercises & foods JSON
- [ ] `tracker` tab v2: active workout mode, exercise picker (689), sets/reps/weight, PR detection, history, strength tier badge (reuse load-engine)
- [ ] `nutrition` tab: meal log (breakfast/lunch/dinner/snack), food search (2395), water logging, daily macro summary (calorie ring on train dashboard)
- [ ] `progress`: body measurements entry + trend charts (weight/body fat)
- [ ] Gamification: XP/level/streak + achievements (seeded defs) in profile
- [ ] Freemium flags + WhatsApp CTA for premium areas
- Acceptance: log a workout end-to-end, log meals for a day, see streak/XP update; all vitest green; app passes device smoke (existing flows unchanged)

### Phase 2 — Intelligence & Plans
- [ ] Health Intelligence hub: plateau detector (from progress_snapshots + existing strain logic), muscle overlap (muscle_activity_logs), recovery tracker, gut health, fridge meal, condition mode
- [ ] Split library + program detail + PDF export (reuse pdf-viewer)
- [ ] Diet plan library + PDF export
- [ ] Full bilingual pass on all existing screens
- Acceptance: all 7 health tools usable; splits/diet plans export PDF; zero hardcoded strings

### Phase 3 — Deferred (placeholders only)
- [ ] Health sync (Google Fit/HealthKit), barcode scanning, progress photos, push reminders, cloud sync
- [ ] Coach reads client tracker data

---

## 8. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Two large seed JSONs (1.7 MB) in bundle | Fine for app size (~+2 MB); import once at first launch |
| Arabic-first RTL layout in RN | Expo handles RTL natively (`I18nManager`); verify tab bar + BackHeader flip; test on device with AR locale |
| FNV-1a "auth" is not real security | Known stand-in (documented in api.ts); unchanged by this merge |
| Tab bar growing to 7 items | Confirm final IA in Phase 1 design; Library may stay a hidden route behind Profile |
| EliteFit data (user logs) migration | Out of scope — EliteFit is not in production; seeded content only |
| Streak/XP rules must match EliteFit behavior | Port rules from `achievement_badge_system.dart` + `strength_tier_system.dart` as pure TS modules with tests |

**Open questions for founder:**
1. Final tab order/names (AR + EN) — propose: Train, Tracker, Nutrition, Progress, Knowledge, Tools, Profile.
2. Should the coach role see client tracker/nutrition data in Phase 1 (read-only), or Phase 3?
3. Premium gating: which Phase-1 features are premium (suggested: exercise analytics charts + health intelligence + PDF exports; free: logging, scale, gamification)?
4. Keep EliteFit repo in the workspace or archive it after Phase 1 data port?

---

## 9. Appendix A — MOS Theme Spec (single source)

```
bg #14151A | card #1E2027 | card2 #181A1F | border #26262B
text #FAFAF8 | sub #A5A5A2 | dim #8F8F8D
accent #F4C93B (gold, primary CTA) | blue #2196F3 | green #4CAF50 | orange #FF9800 | red #F44336
```
All new screens import `COLORS` from `src/components/ui.tsx`; hardcoded hexes are a review-blocker.

## Appendix B — EliteFit Files of Interest (for porting logic)
- `lib/core/strength_tier_system.dart` — tier thresholds (→ `src/training-logic/strength-tier.ts`)
- `lib/features/profile/screens/achievement_badge_system.dart` — achievement/XP rules (→ `src/gamification/`)
- `lib/features/health_intelligence/` — 7 tool cubits/models (→ `src/health-intel/`)
- `lib/features/exercises/screens/views/analytics_tab_view.dart`, `history_tab_view.dart` — chart patterns
- `lib/features/home/screens/home_screen.dart` — calorie gauge/macro card layouts
- `lib/l10n/app_ar.arb` — Arabic string catalog (→ `src/i18n/strings.ar.ts`)
- `assets/database/exercises_and_foods.json` — seed content (→ `assets/data/`)
