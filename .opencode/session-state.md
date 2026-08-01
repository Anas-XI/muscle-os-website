# Session State — Training Tool G-batch (F6–F9) — COMPLETE

## Status: F1–F5 + exercise pools + F6–F9 done, ALL DEPLOYED LIVE.
## Deployed: root master 3becfc2 (origin muscle-os-bot) · public main 64c3840 · public master bfe868f (GH Pages workflow trigger: push to master, artifact = website/ subdir, pages via actions/deploy-pages). Live verified with cache-buster: sessionTimerChip / notifToggle / exportIcsBtn / syncPwInput / BEGIN:VEVENT all present at https://anas-xi.github.io/muscle-os-website/tools/training_tool.html

## Completed

### F6 Session timer + pace (test 20/20, f7_session_test.js)
- `K.SS='mos_sessions'` appended to K (auto-included in export/import/reset via Object.values(K))
- `#sessionTimerChip` (idle/running class) between `#dashHeader` and `#weekRow`; display updates only while step===4
- JS: `SESSION_TIMER`, `fmtClock()` (00:00:00), `sessSetCount()` (non-warmup sets with w>0 today), `sessionTimerToggle()` bound on load
- Stop saves `{date, durationSec, sets}` (cap 200 records), clears interval
- History card `#histSessionsHeader`/`#histSessions`/`#histSessionsBars`: avg session (fmtClock), sets/hour, last-14 mini bar chart; filled in `renderHistory()`
- i18n: `session_timer`, `session_start`, `session_stop`, `session_len`, `sets_per_hour` (en+ar)

### F7 Cloud sync (worker 18/18 f7_sync_worker_test.mjs, tool 25/25 f7_sync_test.js)
- Worker `website/worker/src/index.js`: `handleSyncPush` (`POST /api/sync/:key`) + `handleSyncPull` (`GET /api/sync/:key?pw=`); SHA-256 passphrase via WebCrypto (`sha256Hex`), `timingSafeEqual`; KV `sync:<key>:data`/`sync:<key>:meta` TTL 7,776,000s (90d); 1MB cap → 413; rate limits 30 push/60 pull; keys sanitized `[a-zA-Z0-9_-]` lowercased, 4–64 chars; error strings `invalid_key`/`bad_passphrase`/`missing_data`/`data_too_large`/`corrupt_data`/`rate_limited`; legacy `/api/sync/save|load` kept
- Tool: `syncPayload()` full export assembly (K values + `mos_periodization`, `mos_week_count`, `mos_ex_choices`); `genSyncId()` UUID persisted; modal with Sync ID + ↻, `#syncPwInput`, `#syncLastRow`/`#syncLastTs`; push `POST SYNC_BASE+'/'+key {pw,data}`, pull `GET ?pw=`, 1MB guard, reload after pull; `SYNC_PW='mos_sync_pw'`, `SYNC_LAST='mos_sync_last'`
- **Fixed pre-existing bug**: sync functions never exposed — added `window.showSync/hideSync/doSyncUpload/doSyncDownload/genSyncId`; `showSync` auto-generates + persists UUID
- i18n: `sync_push`, `sync_pull`, `sync_done`, `sync_last`, `sync_pw`, `sync_pw_ph` (en+ar)

### F8 Training-day notifications (test 20/20, f8_notif_test.js)
- `.notif-row` + `#notifToggle` (icon+label) right after `#sessionTimerChip`; `.notif-toggle.on` styling; `updateNotifToggle()` called in renderDashboard + on load
- `todayIsTrainingDay()`: rotation logic — non-rest indices (`trainDays`), `dayLoggedDate()` newest, missed = expected next (wrap), lastDone.date===today → false; empty history → true
- `toggleNotif()`: localStorage `mos_notif_on`; `Notification.requestPermission()` flow; denied → `alert(_('notif_denied'))`; enable auto-calls `checkNotif()`
- `checkNotif()`: enabled+granted+training-day+hour≥`mos_notif_hour`(default 17) → `new Notification(_('notif_title'),{body:_('notif_body'),icon:'icons/icon-192.png'})`; `mos_notif_last` dedupe per day; `setInterval` 60s; `window.toggleNotif/updateNotifToggle/__notifCheck`
- i18n: `notif_on`, `notif_off`, `notif_title` ('Training Day'), `notif_body` ('Push is on deck'), `notif_denied` (en+ar)

### F9 ICS export (test 16/16, f9_ics_test.js)
- `#exportIcsBtn` next to `#savePdfBtn` (step 4 button group), bound to `exportIcs` (also `window.exportIcs`)
- `exportIcs()`: VCALENDAR 2.0, VEVENT per non-rest day — DTSTART today+i 17:00 `TZID=Africa/Cairo`, DTEND +1h, `RRULE:FREQ=WEEKLY`, SUMMARY 'Muscle OS: <day>', DESCRIPTION = exercises; CRLF; Blob `text/calendar;charset=utf-8`; filename `muscle_os_program.ics`
- i18n: `export_cal` (en+ar: 'تصدير التقويم')

## Pre-existing live bugs fixed (F3/G1 work — still relevant)
- `checkPR` best-reduce, `suggestLoad` last.weight, `weeklyVol` (s.weight||s.w) — see F-batch notes below
- `confirmExSelection` splitGrid restore bug; sync modal window-exposure bug (F7)

## Test totals (all local, file://)
- bracecheck2: braces balanced (1486/1486), check_parse OK
- F1 7/7 · F2 13/13 · F3 18/18 · F4 22/22 · F5 20/20 · F6 (pools) 26/26 · F6-timer 20/20 · F7-sync tool 25/25 · F7-worker unit 18/18 · F8 20/20 · F9 16/16
- Earlier suites (vids 15/15, swap 21/21, a8_rtl 22/22, a7_share 9/9, a5_theme 23/23, a1_pwa 17/17, loadtest 100/0) unaffected by F8/F9 (no SW/DOM regressions touched)

## Deploy playbook (verified 2026-08-01, reused for G-batch)
1. `Copy-Item tools/training_tool.html` → `training bundle/`, `website/tools/`, `website/training bundle/` (4 tracked copies)
2. Root: commit 4 tool copies + `website/worker/src/index.js` → `git pull --rebase --autostash origin master` → `git push origin master` (canonical muscle-os-bot)
3. Worktree: `git worktree add -B pub-main E:\MoS\public\main public/main`; copy 5 files; commit; `git push public HEAD:main`
4. Worktree: `git worktree add --detach E:\MoS\public\master public/master`; copy 5 files; commit; `git push public HEAD:master` — **master push triggers GH Pages** (workflow `.github/workflows/deploy-website.yml`: on push master, path `website`, upload-pages-artifact path `website`)
5. Verify: GET `https://anas-xi.github.io/muscle-os-website/tools/training_tool.html` with cache-buster query param (build ~1-3 min); check markers: sessionTimerChip/notifToggle/exportIcsBtn/syncPwInput/BEGIN:VEVENT
6. Cleanup: `git worktree remove --force` both + `git branch -D pub-main`
- **Never** force-push public branches (master has 4 extra files vs main: DOCUMENTATION.md, admin/orders.html, order-success.html, order.html); **never** `git checkout public/master -- .` (reverted files last deploy)
- **Note**: worker code pushed to repo (website/worker/src/index.js) is source-of-record; runtime deploy done via `npx wrangler deploy` from website/worker (OAuth login anasstem2025@gmail.com, account c1bbcbf4e9c2c6ebaf8d22ead0324cd8). **Deployed + verified live 2026-08-01**: Version ID bdf25d73-9850-4227-98b3-92c886931cd4 at https://muscleos-access-control.muscleos.workers.dev — push 200, pull returns data, wrong pw 401. **Gotcha**: KV is eventually consistent (~60s+, negative caches) — don't conclude writes failed from immediate reads; `wrangler kv key list --binding` defaults to LOCAL miniflare state, use `--remote`; verify against the real namespace ID 94aabfeb105f4d95969c8f3f91f36649.

## Test files
- `E:\MoS\.opencode\skills\pdf\f1_timer_test.js` … `f6_pool_test.js` (F1–F5+pools), `f7_session_test.js` (F6), `f7_sync_test.js` (F7 tool, route-mocked), `f7_sync_worker_test.mjs` (F7 worker unit, in-memory KV mock, imports file:///E:/MoS/website/worker/src/index.js), `f8_notif_test.js`, `f9_ics_test.js` (download via #startTrainingBtn → step 4; saveProgBtn needed to unhide recap buttons)
- Temp dir `C:\Users\anass\AppData\Local\Temp\opencode\`: bracecheck2.js, check_parse.js, vids_test.js, swap_test.js, a8_rtl_test.js, a7_share_test.js, a5_theme_test.js, a1_pwa_test.js, loadtest_training.js

---

# Session State � Google-bound one-time activation codes � COMPLETE

## Status: Google sign-in + one-time account-bound codes shipped to both tools + worker, DEPLOYED LIVE.
## Deployed: worker Version 78726225-2d4d-4821-971b-ba9379c1e43c at https://muscleos-access-control.muscleos.workers.dev (live-verified below); Pages deploys via playbook below.

## What changed

### Worker (website/worker/src/index.js)
- handleVerify now accepts optional `session` (Google session JWT from /api/auth/google, validated with jwtVerify, type must be 'session' and email present, else 401 invalid_session)
- One-account binding: first successful activation with a session writes KV `code:<CODE>:binding` = {email, expiresAt, plan, ts} (TTL 90d)
- Different-account reuse -> 403 code_used_by_other (logged, no use consumed)
- Same-account re-activation -> idempotent 200 grant from stored expiresAt, NO re-consumption (uses DO /inspect + lazy KV migration if DO record missing; revoked/wrong_product/expired still rejected)
- Sessionless (legacy) path unchanged: no binding written; maxUses=1 enforcement still 401 code_exhausted
- CodeCounter DO gained POST /inspect (returns {record|null}, no mutation)

### Tools (training_tool.html + tdee_adaptive_engine.html, all 4 deploy copies each)
- GIS script added in <head>; overlay reworked to two steps: step1 = Google sign-in button (#googleSignInBtn, client_id 22648364020234-gldbcsfl16cftjvd11o9iqpalesi1hsn.apps.googleusercontent.com), step2 = code row (+#authWelcome, #subSignOut)
- Session stored in localStorage `mos_google_session` (same key as access-control.js MosAccess); validated via /api/check-session on load; sign-out clears it
- verify-code request now includes session when present; new errors surfaced: code_used_by_other / code_exhausted / invalid_session / network
- Owner email ANASSTEM2025@GMAIL.COM -> instant 30-day grant on Google sign-in (no verify-code call)
- TDEE tool: closed the old hole where ANY >=6-char code granted access locally with no server check
- i18n keys added (en+ar): sub_auth_step1, sub_auth_welcome, sub_auth_switch, sub_verify, sub_checking, sub_err_invalid, sub_err_used_by_other, sub_err_exhausted, sub_err_network, sub_err_session, sub_google_failed

## Tests
- f8b_auth_worker_test.mjs (new, 24/24): binding write, idempotent same-account, 403 code_used_by_other, legacy no-binding, one-time maxUses=1 (A reactivates ok, B blocked by binding), sessionless exhaustion, invalid/tampered session, wrong claim type, expired binding -> code_expired, lazy-migration reactivation, revoked bound code. Mints session JWTs with node:crypto (no deps); mock DO mirrors CodeCounter checks
- f10_google_auth_test.js (new, 29/29, Playwright, GIS mock via addInitScript + route-mocked worker API): overlay/step1/step2 flow, sign-in -> session stored, valid code grants + carries session, stored-session resume, sign-out, bound/exhausted error messages, DEAD session -> step1 + cleared, owner instant grant (no verify-code call), legacy verify has no session field
- f10b_tdee_auth_test.js (new, 10/10): same flow on TDEE + 6-char garbage code rejected (hole closed)
- Regression green: F6 pools 26/26, F6 timer 20/20, F7 sync 25/25, F8 20/20, F9 16/16; bracecheck2 1486/1486 (training), 153/153 (TDEE); check_parse OK both

## Live verification (worker, 2026-08-01)
- Seeded one-time code via wrangler kv key put --path (JSON file, avoids CLI quoting issue)
- 1) sessionless use 1 -> 200 valid + JWT + 30d  2) use 2 -> 401 code_exhausted  3) garbage session -> 401 invalid_session  4) unknown code -> 401 invalid_code
- Test key deleted after verification
- NOTE: full Google-bound path (real /api/auth/google token) can only be verified in-browser with a real Google account

## Deploy playbook (this session)
1. Copy tools/training_tool.html + tools/tdee_adaptive_engine.html to their 3 deploy copies each (website/tools, training bundle, website/training bundle; website/nutrition bundle, nutrition bundle), verify byte-equal
2. Root repo: git add the 8 tool copies + website/worker/src/index.js + new test files (f8b_auth_worker_test.mjs, f10_google_auth_test.js, f10b_tdee_auth_test.js) + .opencode/session-state.md -> commit -> rebase onto origin/muscle-os-bot? NO: push origin master directly (branch name is master, remote muscle-os-bot tracks origin/master); then worktrees public/main + public/master: copy tools -> commit -> push HEAD:main / HEAD:master
3. Worker: npx wrangler deploy from website/worker (top-level env), verify version id, live-verify endpoints, delete test keys
4. Verify live Pages with cache-buster query (googleSignInBtn / authStep1 / authStep2 / subSignOut present)
---
# Session State — Superset antagonist pairing — COMPLETE

## Status: Superset mode now pairs OPPOSITE (antagonist) muscle groups. Deployed to origin + public main/master. Live-verified on Pages.

## What changed (tools/training_tool.html only, no worker changes)
- New pairing engine before renderDay: SS_ANTAGONIST (chest<->back, biceps<->triceps, quads<->hamstrings, glutes->hamstrings), SS_POOL_ORDER, poolOf(ex) (registry name -> custom f -> ex.p), shoulderKind(ex) (rear delt vs front/mid via /rear|face pull|reverse pec|bent-over|wide row/i), ssCanPair(a,b) (shoulder+shoulder only if opposite kinds), buildAntagonistPairs(exs) (greedy first-available partner by SS_POOL_ORDER; leftovers same-pool pair, else singles; returns [{e,i}] preserving ORIGINAL day.ex indexes)
- renderDay superset branch: buildAntagonistPairs(day.ex).forEach — pairs render via buildSupersetExCard(pair[0].e, pair[1].e, pair[0].i, pair[1].i, di, day), singles via buildNormalExCard(e, i, di, day). Index preservation critical: swapEx + data-eid depend on original indexes.
- Test hooks: window.__ssBuildPairs, window.__ssPoolOf
- Example (fullbody_3 Session A): (Barbell Squat, Leg Curl), (Bench Press, Barbell Row); Lateral Raise + Triceps Pushdown = singles (no partner)
- 3 sample splits have no antagonist partners for some exercises (e.g. Triceps Pushdown without biceps in same day) -> those render as normal cards — expected

## Tests
- f11_antagonist_superset_test.js (NEW, 18/18): unit engine checks (chest+back, legs+arms, shoulder rear/front, same-pool leftovers, cross-muscle singles, custom ex never pairs, poolOf); full bootstrap -> toggle superset -> 2 ss cards + 2 normal on fullbody day 1; every pair antagonist (chest+back present, quads+hamstrings present); singles = shoulders+triceps; A/B logging eids; toggle off restores 6 normal cards; no console errors
- f5_superset_test.js updated (21/21): expected pair count now from __ssBuildPairs on actual program; DOM eid check against rendered pair names; ex-name DOM text includes trailing ▶ (video link) — clean must strip it
- Regression: F1 7/7, F6 pools 26/26, F6 session timer 20/20, F7 20/20, F8 20/20, F9 16/16; bracecheck2 1501/1501; check_parse OK
- Test fixture gotchas: unit-test exercise names MUST exist in EXERCISE_POOLS (registry names: 'Incline Chest Press' NOT 'Incline Press'); ex-name text in DOM has trailing ▶

## Deployed
- root master 39a11c9 pushed origin muscle-os-bot (487c63c..39a11c9)
- public main 6ff1c20 (14df3e5..6ff1c20), public master 5d70d8d (20ecf0b..5d70d8d)
- **GOTCHA (cost one extra deploy cycle)**: the public repo mirrors the root repo — it has BOTH root-level copies (tools/, training bundle/) AND website/-prefixed copies. The Pages workflow (.github/workflows/deploy-website.yml) filters on `website/**` and uploads artifact path `website` — so ONLY the `website/` copies are deployed. First worktree commit updated only root-level copies -> no workflow run. Fixed with follow-up commits 6e1e631 (main) + 514c264 (master) syncing website/tools/ + website/training bundle/ -> run 30696939950 succeeded -> live-verified SS_ANTAGONIST + buildAntagonistPairs(day.ex) at https://anas-xi.github.io/muscle-os-website/tools/training_tool.html?v=ss5
- **Rule going forward**: in the PUBLIC repo worktrees always update 4 copies per tool (tools/, website/tools/, training bundle/, website/training bundle/) — same as root repo; the website/ copies are what actually ships to Pages.
- Worktrees: wt-main (checked out main) + wt-master (local alias pub-master for public/master, push 'HEAD:master') — both removed, pub-master alias deleted
---
# Session State — Dark-only theme — COMPLETE

## Status: Light theme removed from training tool; dark-only. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html only — TDEE tool has NO theme system, already dark-only)
- Removed html[data-theme="light"] CSS block (dark :root vars are now the only theme)
- Removed #themeBtn toggle button + .theme-wrap/.theme-toggle CSS + RTL rule; acc-picker (accent colors) stays as direct header child — accent system untouched
- JS: applyTheme removed; initTheme forces data-theme='dark' + persists mos_theme='dark' (ignores saved 'light' AND prefers-color-scheme); translateUI themeBtn title block removed
- i18n keys theme_dark/theme_light removed (en + ar); remaining references: only initTheme's setAttribute + localStorage write (intentional)
- Old users with mos_theme='light' saved get forced dark on load

## Tests
- f12_dark_only_theme_test.js (NEW, 11/11): no #themeBtn/.theme-wrap/.theme-toggle; data-theme=dark + mos_theme=dark even with saved 'light'; body bg #14151A / text #FAFAF8; acc-picker present with 4 swatches; accent switch works (green) + resets (yellow); no console errors
- Regression green: F5 21/21, F11 18/18, F8 20/20, F7 session timer 20/20, F10 google auth 29/29; bracecheck2 1497/1497; check_parse OK

## Deployed
- root master 168a02f pushed origin muscle-os-bot (e24c132..168a02f)
- public main b314230 (6e1e631..b314230), public master a70d831 (514c264..a70d831)
- Applied the 4-copies rule (tools/, website/tools/, training bundle/, website/training bundle/) in BOTH worktrees — workflow run 30697207095 succeeded
- Live-verified: no themeBtn, no data-theme="light" CSS, initTheme dark forced at https://anas-xi.github.io/muscle-os-website/tools/training_tool.html?v=dark1
- Worktrees removed, pub-master alias deleted

---
# Session State - P1 recovery-based light day - COMPLETE

## Status: Red-fatigue banner + Light Day/Proceed flow shipped. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- CSS .fat-light-banner/.flb-*/.fat-light-btn after .suggest-box; i18n fat_light_title/fat_light_desc/fat_light_btn/fat_planned_btn (en+ar)
- Session-local flags: var makeupDays={},missedSkip=false,lightDays={},lightProceed={}
- renderDay: when getTodayFatigue() fatigueScore <= -1 (RED) and neither flag set -> banner before warmup; buttons set lightDays[di]/lightProceed[di] then renderDay(i)
- Light Day: exCtx weights 80% rounded to m.inc (default 2.5), rows = max(1, ex.sets-1); Proceed: no change
- setLoggerHTML padEmpty now (makeupDays[di]||lightDays[di]) -> light-day rows logged as done
- Superset cards get light weights via exCtx but keep full set rows (light -1 set not applied to superset cards by design)

## Tests
- f13_light_day_test.js (NEW, 13/13): banner on RED, weights ~0.8 ratio, -1 set, Proceed keeps 100%/3-row default, per-day isolation, tab round-trip persistence, no console errors
- GOTCHA: bestE1RM() filters entries on stored e1RM field (x.e1RM>0) - seeded history must include e1RM or "No history" fallback shows
- GOTCHA: normal (non-makeup/light) padEmpty default is 3 rows, NOT ex.sets - tests must expect 3
- Regression green: F5 21/21, F11 18/18, F12 11/11, F6 26/26, F8 20/20

## Deployed
- root master 1ceb385 pushed origin muscle-os-bot (fabce43..1ceb385)
- public main 7a5129a (b314230..7a5129a), public master 9435f67 (a70d831..9435f67) - 4 copies rule in both worktrees
- workflow run 30698748211 succeeded
- Live-verified at https://anas-xi.github.io/muscle-os-website/tools/training_tool.html?v=p1 (lightDays decl, banner CSS, i18n en+ar, 80pct rounding, padEmpty)
- Worktrees removed, pub-master alias deleted

---
# Session State - P2 exercise preferences - COMPLETE

## Status: mos_pref preference learning shipped. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- New key mos_pref = {origName: {chosenName: count}}; helpers pendingExChoices + prefTop(exName)
- showExSelection: chosen = saved choice || pending || top pref || default; chips sort by pref count desc ONLY when prefs exist (hasPref guard keeps curated pool order for first-time users); top pref chip gets star span + .pref-top class
- Chip click: bumps mos_pref count + IN-PLACE DOM update (move chip to row front, select, re-mark star) - NO full re-render so show-all expansion and scroll position survive
- generateProgram default: exChoices[ex.n] || prefTop(ex.n) || ex.n
- swapEx: also bumps mos_pref[orig][newName]
- Export/import/reset/sync key lists now include mos_pref (4 places)
- i18n pref_fav (en 'Favorite' / ar 'المفضل')

## Tests
- f14_pref_test.js (NEW, 12/12): chip click bumps pref, chosen moves to front + star, program uses chosen, reopen shows saved first, no-explicit-choice defaults to top pref, swap bumps pref
- GOTCHA: initial version re-rendered the panel on chip click - broke F6 (expansion state lost, Leg Press click failed) and caused scroll jumps; switched to in-place DOM mutation. Also hadPref guard prevents alphabetical reorder of the curated pool when no prefs exist (F6 assumed Leg Press visible 4th chip)
- GOTCHA: backToSplitBtn2 second click in test failed because panel was already closed (button inside hidden panel) - wrong flow, not a code bug
- Regression green: F6 26/26, F5 21/21, F11 18/18, F12 11/11, F13 13/13, F8 20/20, F7 20/20; bracecheck2 1523/1523; check_parse OK

## Deployed
- root master 2eb4244 pushed origin muscle-os-bot (c25c05b..2eb4244)
- public main cb12682 (7a5129a..cb12682), public master 5f22410 (9435f67..5f22410) - 4 copies rule in both worktrees
- workflow run 30701759110 succeeded
- Live-verified at https://anas-xi.github.io/muscle-os-website/tools/training_tool.html?v=p2 (prefTop, pref-star, hasPref sort, swap bump, i18n en+ar)
- Worktrees removed, pub-master alias deleted

---
# Session State - P3 auto prehab insertion - COMPLETE

## Status: Pain-flagged joints get prehab exercises prepended in generated programs. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- New EXERCISE_META entries (prehab:true, low f, rr 10-20, inc 1): Band Pull-Apart (jr shoulder), Terminal Knee Extension (jr knee), Bird Dog (jr hip+spine), Dead Bug (jr spine); elbow maps to existing Wrist Curl
- PREHAB_MAP = shoulder→Band Pull-Apart, elbow→Wrist Curl, knee→Terminal Knee Extension, hip→Bird Dog, spine→Dead Bug
- generateProgram: after building progDays, getInjuredJoints(painFlags()) → for each yellow/red joint in PREHAB_MAP, prepend 1 prehab ex {n, sets:2, rl:12, rh:20, p:'prehab', se:[], orig:null, prehab:true, prehabJoint:j, targetRpe:4} to every non-rest day that uses that joint, unless day already has that joint's prehab; te/ts recompute after insertion
- Day.ex entries now carry orig (split slot name) — fixes swap-back orig lookup for exercises shifted by prepended prehab; exCtx + swapEx prefer ex.orig, fall back to old SPLITS lookup for legacy programs
- createMesocycle copies orig/prehab/prehabJoint through to meso exercises
- exCtx: prehab exs get fixed suggest {w:null, r:15, rpe:4, exp:prehab_reason} (no weight, "Start Training" box, RPE 4); card title gets .prehab-chip with ⚠ prehab_lbl + reason tooltip
- isExerciseSafeForInjures: prehab meta exs short-circuit ok:true (never blocked by flags)
- poolOf('prehab' p) → null → prehab cards never superset-paired, render alone first
- i18n prehab_lbl ('⚠ Prehab' / '⚠ تأهيل'), prehab_reason (en+ar)

## Bugs fixed
- getInjuredJoints: `if(pf[ex]==='yellow'&&!joints[j])` referenced undefined loop var j → ReferenceError whenever any yellow pain flag existed (latent bug, predates P3; now iterates jrs like the red branch)

## Tests
- f15_prehab_test.js (NEW, 17/17): baseline no-prehab, shoulder yellow → Band Pull-Apart prepended first with prehab:true/prehabJoint/sets 2/targetRpe 4, exactly one per shoulder-using day, no wrong prehab exs, chip + reason on rendered card, red flag → prehab still prepended + flagged card still rehab-blocked (⛔ danger), clearing flags removes prehab and restores original first ex
- GOTCHA: seeding Bench Press yellow flags BOTH shoulder AND elbow (Bench Press jr = shoulder+elbow) → Wrist Curl also prepended — correct per spec, use shoulder-only exercise (Lateral Raise) for clean assertions
- GOTCHA: regenerate from step3 uses #backToSplitBtn; from step4 uses #changeSplitBtn (test helper handles both)
- Regression green: F5 21/21, F6 26/26, F7 25/25, F8 20/20, F11 18/18, F12 11/11, F13 13/13, F14 12/12; bracecheck2 1537/1537; check_parse OK
