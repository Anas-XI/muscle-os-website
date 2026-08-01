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
- **Note**: worker code pushed to repo (website/worker/src/index.js) is source-of-record; actual Cloudflare worker runtime deploy is separate (`npx wrangler deploy` from website/worker with wrangler.toml + auth)

## Test files
- `E:\MoS\.opencode\skills\pdf\f1_timer_test.js` … `f6_pool_test.js` (F1–F5+pools), `f7_session_test.js` (F6), `f7_sync_test.js` (F7 tool, route-mocked), `f7_sync_worker_test.mjs` (F7 worker unit, in-memory KV mock, imports file:///E:/MoS/website/worker/src/index.js), `f8_notif_test.js`, `f9_ics_test.js` (download via #startTrainingBtn → step 4; saveProgBtn needed to unhide recap buttons)
- Temp dir `C:\Users\anass\AppData\Local\Temp\opencode\`: bracecheck2.js, check_parse.js, vids_test.js, swap_test.js, a8_rtl_test.js, a7_share_test.js, a5_theme_test.js, a1_pwa_test.js, loadtest_training.js
