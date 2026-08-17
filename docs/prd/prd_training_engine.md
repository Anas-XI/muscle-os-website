# PRD: MOS-HYPERKINETIX (Training Engine)

## 1. Product Overview
**Name:** MOS-HYPERKINETIX
**Role:** The core physical training and progression engine of Muscle OS.
**Objective:** Provide an auto-regulating, highly adaptable training interface that builds hypertrophic and strength programs tailored to the user's experience, available days, and real-time fatigue levels.

## 2. Target Audience
- **Novice to Advanced Lifters** looking for structured periodization without the complexity of spreadsheets.
- Users who need **auto-regulation** (fatigue and readiness monitoring) to prevent overtraining.

## 3. Core Features
- **Program Generation:** Procedural generation of mesocycles based on user split (PPL, Full Body, Upper/Lower, Bro Split, etc.), age, and goal.
- **e1RM Tracking & Progression:** Tracks estimated 1-Rep Max to calculate progressive overload and suggest working weights for subsequent sessions.
- **Auto-Regulation & Fatigue:** Pre-session readiness surveys (Pain flags, RPE overshoots) to dynamically adjust daily volume (e.g., dropping sets on "Red" fatigue days).
- **Session Logger:** Live workout timer, set-by-set logging, and RPE (Rate of Perceived Exertion) tracking.
- **Deload Management:** Tracks weeks since last deload and automatically suggests a deload week when systemic fatigue (ACWR) or RPE overshoots cross a threshold.

## 4. Data & State Model
- **Storage:** LocalStorage-based, fully offline-capable.
- **Key State Variables:**
  - `mos_program` (`K.PG`): Current generated mesocycle program and day splits.
  - `mos_logs` (`K.LG`): Historical workout logs by date and exercise ID.
  - `mos_pain_flags` (`K.PF`): Persistent fatigue states (Green, Yellow, Red) for various joints/muscles.
  - `mos_deload_tracker` (`K.DT`): Tracks consecutive sessions and high RPE instances to calculate deload triggers.

## 5. Omni Hub Synergy (Current Integrations)
- **State Broadcast:** Emits a `MOS_TRAINING_SYNC` event via `window.parent.postMessage` whenever a session is saved.
- **Data Shared:** Current Session Name, Aggregate Fatigue Level (Red/Yellow/Green), ACWR (Acute:Chronic Workload Ratio), and Deload Status.
- **Events:** Emits `SESSION_STARTED` and `SESSION_ENDED` when the live session timer is toggled.

## 6. Future Roadmap
- **Exercise Substitution AI:** Suggesting structurally similar exercises when a plateau is detected.
- **Velocity-Based Training (VBT) Proxy:** Using rep-speed inputs to gauge daily readiness.
- **Wearable Integration:** Pulling in sleep/HRV data to automatically set the pre-session fatigue state without a manual survey.
