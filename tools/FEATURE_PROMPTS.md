# Training App — Feature Prompts

Source of truth for the feature backlog. One prompt per feature, grouped by flag.
All features target `E:\MoS\tools\training_tool.html` unless noted. Work through them in order.

**Conventions for every feature:**
- Follow existing code style (var-based functions, i18n via `_('key')`, ls/ss helpers, K keys)
- Add en + ar i18n keys (ar block after en block, keys in alphabetical-ish placement like neighbors)
- Every new user-facing action calls into the analytics-less pattern — no tracking needed here
- After implementation: run bracecheck2.js + check_parse.js, then a Playwright functional test (local + live after deploy)
- Deploy: copy to website/tools/training_tool.html (preserve website head if it differs), commit root master, deploy-master worktree merge, push public, verify live

---

## 🟦 FUNCTIONALITY

### F1. Rest timer — sound + auto-start
**Goal:** Timer starts itself when a set is completed; beeps when it ends.
- When a set row has weight+reps+rpe filled (first complete set), auto-start that exercise's rest timer.
- On reaching 0: WebAudio beep (3 short beeps, no asset needed, e.g. oscillator 880Hz), vibrate if `navigator.vibrate` exists.
- Manual start/stop/reset still work. Small speaker toggle chip per timer (persisted per-exercise in session only).
- `formatTime` already exists; reuse.
- i18n: `timer_sound_on`, `timer_sound_off`.
- Edge: timers run when tab hidden (setInterval throttling) — acceptable; skip tab visibility handling.
- Test: log full set → assert `.rt-display` starts counting down without clicking start; stub AudioContext via init script; no console errors.

### F2. Plate calculator
**Goal:** One tap shows exact plate loading for any weight.
- Trigger: click the suggested weight in `.suggest-box` and click a logged weight input.
- Popover/modal: bar 20kg, plates [25,20,15,10,5,2.5,1.25,0.5], greedy algorithm per side.
- Shows "Total: 100kg — per side: 25 + 25" and note if weight not achievable within ±0.25kg.
- i18n: `plate_title`, `plate_bar`, `plate_per_side`, `plate_unachievable`.
- Test: for 100kg expect per-side 25+25; for 60kg expect 20+... (compute expected in test).

### F3. Warm-up set logging
**Goal:** Log warm-ups separately; they count to volume, never to PR/e1RM.
- Each exercise card gets warm-up rows above working sets: pre-filled % of suggested work weight (40 / 60 / 80%), loggable w/r/rpe inputs.
- Stored as `{w,r,rpe,wu:true}` in existing K.LG entries.
- `checkPR`, `est1RM`, load history, overload trend must ignore `wu:true` sets.
- Volume summary counts them (marked "warm-up" in the set count).
- i18n: `warmup_lbl`, `warmup_row`, `warmup_incl`.
- Test: log warm-up 40kg + working 80kg → e1RM/PR uses only working; today's volume includes both; `wu:true` present in K.LG.

### F4. Missed-session make-up suggestion
**Goal:** Detect skipped training days, offer a condensed make-up.
- Derive from logs: for each program day index, track last-logged date (per day's eids). If a day was expected (rotation) and not logged, show dashboard banner: "Missed: Legs (2 days ago) — condensed option".
- "Do condensed" renders the day with 1 fewer set per exercise and a `makeup` chip in the header (session-local, not persisted to program).
- "Skip" dismisses the banner for the session.
- i18n: `missed_title`, `missed_condensed_btn`, `missed_skip`, `missed_chip`.
- Edge: day logged with partial sets (≥1) counts as done.
- Test: seed logs for other days, none for Legs → banner; click condensed → 1 set fewer per exercise; skip → gone.

### F5. Superset mode
**Goal:** Pair exercises to save time.
- Per-day toggle in dashboard ("Superset" chip). When on: exercises pair (0+1, 2+3…), render as one combined card with A/B columns and a single shared rest timer (90s).
- Rows log as A1 B1 A2 B2 — sets still stored under each exercise's own eid.
- Toggle persisted in `mos_supersets` = `{dayIdx: true}`. Off restores normal view.
- i18n: `superset_on`, `superset_off`, `superset_a`, `superset_b`.
- Test: toggle → 2 cards become 1 combined; log in both columns → two eids in K.LG; toggle off → original cards.

### F6. Session timer + pace
**Goal:** Track workout duration and pace.
- Dashboard top bar chip: `00:23:41 [Start/Stop]`; runs while on step 4.
- On Stop → record `{date, durationSec, sets}` into K.SS = `mos_sessions` (new key, add to export/import + reset lists).
- History shows avg duration + sets/hour trend (small chart or stat row).
- i18n: `session_timer`, `session_len`, `sets_per_hour`.
- Test: start, wait 2.5s, stop → record ≈2s in mos_sessions; history renders.

### F7. Cloud sync (Cloudflare worker)
**Goal:** Backup/restore training data across devices.
- Worker at `website/worker/` gains endpoints: `POST /api/sync/:key` (body = JSON data, guarded by passphrase hash) and `GET /api/sync/:key?pw=` .
- Tool: "Sync" button opens panel: Sync ID (generated UUID, editable) + optional passphrase; Push / Pull / Last-synced timestamp.
- Payload = all K.* keys + mos_ex_choices + mos_periodization + mos_week_count (reuse the existing export assembly at `exportLoadDataBtn`).
- Pull replaces localStorage after confirm; validate JSON + size < 1MB.
- i18n: `sync_title`, `sync_push`, `sync_pull`, `sync_done`, `sync_fail`, `sync_last`.
- Test: two contexts, same ID → push A, pull B, compare JSON equality; worker unit-check via fetch in node.

### F8. Training-day notifications
**Goal:** Remind on training days.
- Requires PWA (A1). If permission granted + `mos_notif_on`: schedule daily check; on days matching the program rotation index, show "Training Day — Push is on deck" (17:00 local, via Notification API from SW or page).
- Toggle in dashboard settings row: `mos_notif_on`.
- i18n: `notif_on`, `notif_off`, `notif_title`, `notif_body`.
- Test: mock Notification permission + capture constructor call; verify payload text.

### F9. ICS calendar export
**Goal:** One tap exports the weekly split to the phone calendar.
- Button next to PDF export: generates `.ics` (VEvent per program day, weekly RRULE, DTSTART today), Blob download.
- i18n: `export_cal`.
- Test: playwright download event; file contains `BEGIN:VCALENDAR` + `RRULE:FREQ=WEEKLY` + day names.

---

## 🟩 PERSONALIZATION

### P1. Recovery-based day suggestions
**Goal:** Coach adjusts the day when fatigue is high.
- In renderDay: if today's fatigue `fs.adjust <= -1` (red) show banner: "High fatigue — lighter option available" with [Light Day] and [Proceed as Planned].
- Light Day: session-local render with suggested weights ×0.8 and 1 fewer set per exercise (no persistence).
- Proceed: normal render.
- i18n: `fat_light_title`, `fat_light_desc`, `fat_light_btn`, `fat_planned_btn`.
- Test: seed red fatigue → banner; Light Day → suggest-box weights ≈80%; as-planned → original.

### P2. Learn exercise preferences
**Goal:** Favorite picks rise to the top.
- Every swap/chip choice updates `mos_pref` = `{origName: {chosenName: count}}`.
- showExSelection orders chips by count desc, top choice gets `★` + `.pref-top` class; if no explicit `mos_ex_choices` entry, generation defaults to top preference.
- i18n: `pref_fav`.
- Test: swap to X twice → regenerate program → X auto-selected; chips ordered X first.

### P3. Auto prehab insertion
**Goal:** Pain-flagged joints get prehab in generated programs.
- Map: shoulder→Band Pull-Apart, elbow→Wrist Curl (light), knee→Terminal Knee Extension, hip→Hip Flexor Stretch/Bird Dog, spine→Dead Bug.
- During generateProgram: for each yellow/red joint in pain flags (K.PF), prepend 1 prehab exercise (2 sets, RPE 4) to days whose exercises use that joint; card shows `⚠ prehab` chip.
- i18n: `prehab_lbl`, `prehab_reason`.
- Test: seed shoulder yellow → regenerate → shoulder-using days contain Band Pull-Apart first, chip present; red flags get rehab-blocked behavior unchanged.

### P4. Personalized weekly coach note
**Goal:** Rule-based weekly recap on History.
- "Coach's Note" card: adherence % (sessions logged ÷ expected), total sets, per-main-lift e1RM deltas (+/-kg), pain flags, deload countdown → 2–3 sentence note with 3 tone variants (good/ok/warn) + next-week tip.
- Derived from logs only — no new storage.
- i18n: `coach_note`, `cn_adh`, `cn_pr`, `cn_pain`, `cn_next`.
- Test: seed 2 weeks of logs (5/6 sessions, +5kg bench) → note contains "87%" or round-appropriate adherence + "Bench" + positive tone; empty data → "start logging" variant.

### P5. Body-trend feedback
**Goal:** Measurements inform a nudge.
- Dashboard: goal hypertrophy + weight trend ≤ −2% over ≥14 days (from K.MM) → yellow nudge "Weight trending down — consider +200 kcal/day". Strength goal + >1%/week up → note "verify surplus sizing".
- Click → dismisses for the day (`mos_nudge_dismiss` = date).
- i18n: `nudge_hypertrophy_down`, `nudge_strength_up`.
- Test: seed 3 declining measurements → nudge visible; dismiss → gone after re-render.

### P6. Time-based program variants
**Goal:** Session-length choice at generation.
- Step 2/3: "Session length: 45 / 60 / 90 min" chips (default 60). Persist `mos_sess_len`.
- 45: cap 4 exercises/day, mark supersets suggested; 60: current; 90: +1 optional exercise/day (labeled "optional", excluded from compliance).
- i18n: `sess_len`, `sess_45`, `sess_60`, `sess_90`, `sess_optional`.
- Test: 45 → all days ≤4 exercises; 90 → optional-labeled extras present and not counted in volume compliance.

### P7. Plateau detection → auto-meso suggestion
**Goal:** Detect stagnation, suggest action.
- For main lifts (mainLifts array): if last 3 logged sessions show <2.5% e1RM gain and RPE ≥8 → plateau card in dashboard/history: "Bench Press plateau detected".
- Buttons: [Swap Exercise] (opens that exercise's swap panel), [Intensification block] (jumps to meso config with phase preselected), [Deload] (marks deload).
- Derived from K.LH; no new storage.
- i18n: `plateau_title`, `plateau_body`, `plateau_swap`, `plateau_intense`, `plateau_deload`.
- Test: seed stagnant history → card with correct exercise name; swap button opens swap panel for it.

---

## 🟧 APPEAL

### A1. PWA — installable, offline
**Goal:** Feels like a real app.
- Add `manifest.json` (name "Muscle OS Training App", short_name, theme_color #0A0A0F, bg #0A0A0F, icons 192/512 PNG), `sw.js` (app-shell cache-first with versioned cache name, offline fallback), meta theme-color + apple-touch-icon, register SW on load.
- "Install" button appears when `beforeinstallprompt` fires; appinstalled → track.
- Deploy: copy manifest/sw.js into website/tools/ alongside; update link tags.
- i18n: `install_app`.
- Test: manifest link + SW registration present; with `beforeinstallprompt` stubbed → button appears; offline reload still renders (SW cache).

### A2. Streak calendar + completion
**Goal:** Visible progress rhythm.
- Dashboard "This Week" row: 7 chips (localized day letters), filled green when ≥1 set logged that day; week streak counter (consecutive weeks with ≥3 sessions) near it.
- First logged set of the day → quick CSS checkmark/confetti pulse on the chip.
- Derived from K.LG; no new storage.
- i18n: `week_row`, `streak`, `streak_weeks`.
- Test: log a set → today chip green + streak value correct; clear logs → empty.

### A3. Video thumbnails
**Goal:** See the movement before doing it.
- Keep YouTube search link; upgrade `.ex-vid-link` to a pill with ▶ icon; for top ~20 exercises add curated `V_VIDS = {exName: ytId}` map → render real thumbnail `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (lazy-loaded, `loading="lazy"`), click opens video page.
- i18n: `watch_video`.
- Test: curated exercises → img.naturalWidth > 0 (or loaded state), fallback pill for non-curated.

### A4. Coaching micro-copy pass
**Goal:** Sounds like a coach, not a spreadsheet.
- Soften key strings (keep keys stable, add new where needed): 'sets'→'working sets' in logger header, 'weight'→'load', empty-state texts get coaching lines ("Log your first set — the numbers start moving"), button labels more action-y ('Generate My Program', 'Let's Train').
- Provide a before/after mapping table in the commit message; both en/ar.
- Test: string spot-checks + load test (no regressions).

### A5. Light theme + accent picker
**Goal:** Looks good in the gym and the office.
- Introduce CSS variables (--bg, --card, --card2, --text, --text-dim, --accent, --accent2); progressively replace the dominant `rgba(250,250,248,*)` surfaces; keep brand yellow as accent default.
- Theme toggle (🌙/☀️) → `mos_theme` (light/dark, default = prefers-color-scheme); accent picker 4 swatches (yellow #F4C93B, green #4CAF50, cyan #2196F3, purple #9C27B0) → `mos_accent`.
- i18n: `theme_dark`, `theme_light`, `accent`.
- Test: toggle → body class + computed background changes; accent → suggest-box/PR badge color changes; RTL unaffected.

### A6. Animation polish
**Goal:** Feels alive but not annoying.
- CSS only: card entrance (translateY 6px + fade, 140ms, staggered 30ms), PR pulse on `.pr-badge`, progress bar sweep, tab active underline transition, buttons `:active{transform:scale(.97)}`.
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Test: visual smoke; with reduced-motion emulated, no transform animations active.

### A7. Share program card
**Goal:** Shareable program summary.
- "Share Program" button (step 3 recap): renders branded card to canvas (split name, days, goal, top 5 exercises, coach branding + URL) → PNG download + share text copied to clipboard.
- Uses existing recap data; no new storage.
- i18n: `share_program`, `share_copied`.
- Test: click → canvas has non-blank pixels (sample some) + clipboard contains program name.

### A8. Arabic RTL audit
**Goal:** Arabic feels native.
- Audit every panel/table/stepper/modal in RTL: flex/row-reverse rules (pattern exists: `html[dir="rtl"] .pain-group`), text-align, number alignment in set rows, timers, modal close buttons, stepper order.
- Add missing `html[dir="rtl"]` rules; verify no horizontal overflow.
- Test: run load test with ar locale + dir=rtl — all steps clickable, `document.documentElement.scrollWidth <= innerWidth + 1`.

---

## Execution order suggestion
Quick wins first: **F1 → F2 → P1 → A4 → A6 → A2** (small, high daily value) → then **F3 → F4 → P2 → P3 → P5 → P7 → P6 → P4** (medium) → **F5 → F6 → F9 → A3 → A8 → A7 → A5 → F8 → F7** (larger: supersets, sync, PWA) → **A1 last** (PWA benefits from stable feature set; F8 depends on it).
