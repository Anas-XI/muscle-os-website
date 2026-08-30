# PRD: MOS OMNI HUB

## 1. Product Overview
**Name:** MOS OMNI HUB
**Role:** The unified dashboard and central nervous system of Muscle OS.
**Objective:** Break down the silos between training and nutrition by providing a unified interface that facilitates real-time data exchange (synergy) between the two disparate engines. 

## 2. Target Audience
- Premium tier users of Muscle OS.
- Users who want a holistic view of their daily fitness requirements (Training + Nutrition) in a single glance.

## 3. Core Features
- **Unified Dashboard:** A single pane of glass showing today's training session, fatigue levels, ACWR, and real-time calorie/macro targets.
- **Cross-Frame Message Bus:** Acts as the mediator between the isolated `iframe` environments of the Training and Nutrition tools using the `window.postMessage` API.
- **Context-Aware Toast Notifications:** Intercepts real-time events (e.g., `SESSION_STARTED`, `SESSION_ENDED`) from the training app to provide immediate, actionable fueling advice overlaid on the UI.
- **Synergy Insights Engine:** Generates contextual alerts based on the combined data (e.g., warning the user to eat at maintenance during a training deload).

## 4. Architecture & Data Flow
- **Pattern:** Master-Slave architecture.
- **Master:** Omni Hub (`muscle_os_app.html`).
- **Slaves:** Training Engine (`training_tool.html`), Nutrition Engine (`tdee_adaptive_engine.html`).
- **Data Flow:**
  1. Slave tools save to their respective `localStorage` silos.
  2. Slave tools immediately broadcast their updated state to the Master (`MOS_TRAINING_SYNC`, `MOS_NUTRITION_SYNC`).
  3. Master updates the Omni Dashboard UI and aggregates the state.
  4. Master broadcasts the aggregated state back down to all slaves (`OMNI_STATE_UPDATE`).
  5. Slave tools apply periodization logic based on the aggregated cross-domain state.

## 5. Current Synergy Mechanics
- **Fatigue → Macros:** High training fatigue automatically increases daily calorie targets (biased towards carbohydrates) in the nutrition engine.
- **Deload → Calories:** Entering a deload week in training automatically drops maintenance calories in the nutrition engine to optimize recovery without fat gain.
- **Session Boundaries → Fueling:** Starting/stopping a workout timer triggers pre- and post-workout meal suggestions in the Hub.

## 6. Future Roadmap
- **Bi-Directional Goal Syncing:** If a user sets their nutrition goal to "Aggressive Cut", the Omni Hub will instruct the Training engine to automatically reduce mesocycle volume to prevent overtraining.
- **Native Cloud Sync:** Moving away from purely `localStorage` to a centralized backend (Node.js/Supabase) for cross-device syncing.
- **Advanced Dashboard Widgets:** Adding weekly compliance charts combining both diet adherence and training volume completion.
