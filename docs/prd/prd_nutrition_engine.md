# PRD: MOS-METABOLIX (Nutrition Engine)

## 1. Product Overview
**Name:** MOS-METABOLIX (Adaptive TDEE & Nutrition Engine)
**Role:** The metabolic modeling and nutritional orchestration engine of Muscle OS.
**Objective:** Replace static macro calculators with a dynamic, self-correcting Total Daily Energy Expenditure (TDEE) engine that learns from user weight trends and adapts to external stressors (like training fatigue).

## 2. Target Audience
- Users trying to optimize body composition (cut, bulk, recomp).
- Athletes who want their diet to dynamically scale with their training volume and fatigue.

## 3. Core Features
- **Dynamic TDEE Engine:** Calculates baseline TDEE using advanced metabolic models (Mifflin-St Jeor / Katch-McArdle) augmented with NEAT (steps/occupation) and EAT (training volume).
- **Auto-Recalibration:** Automatically analyzes 2+ weeks of weight logs to determine true TDEE and suggests caloric adjustments to stay on track.
- **Goal-Oriented Macro Splitting:** Configures Protein, Fat, and Carbs based on body composition goals, diet patterns (Balanced, High-Protein, Keto-ish), and safety caps.
- **Biometric Adjustments:** Granular adjustments for sleep quality, chronic diet fatigue, and menstrual cycle phases.

## 4. Data & State Model
- **Storage:** LocalStorage-based (`mos_tdee_store`).
- **Key State Variables:**
  - `profile`: Demographics, goals, diet pattern, steps, and baseline activity.
  - `weights`: Historical daily weight logs.
  - `adjustments`: History of TDEE recalibration events.

## 5. Omni Hub Synergy (Current Integrations)
- **State Broadcast:** Emits a `MOS_NUTRITION_SYNC` event via `window.parent.postMessage` whenever the store is saved, sending current calorie targets and macros.
- **Dynamic Caloric Periodization:** Listens for `OMNI_STATE_UPDATE` from the Hub to apply real-time modifications:
  - **Deload Drop:** Reduces daily calorie targets by ~5% during a training deload to shed systemic fatigue without fat accumulation.
  - **Fatigue Fueling:** Increases daily calorie targets by 100-200 kcal (primarily from carbohydrates) on days when the training engine reports elevated or high fatigue (Yellow/Red).
- **UI Indicators:** Displays a dynamic banner in the Nutrition Dashboard when Omni Hub Synergy is actively modifying targets.

## 6. Future Roadmap
- **Micronutrient & Hydration Tracking:** Beyond just macros.
- **Continuous Glucose Monitor (CGM) Integration:** Spiking carbs around workouts based on real-time glucose data.
- **Automated Diet Breaks:** Suggesting diet breaks automatically when weight loss stalls for 3+ weeks.
