# Session State — Exercise Library + region-grouped picker DEPLOYED NOW — COMPLETE

## Status: Exercise library modal (📚) + picker restructured into muscle headings with region-grouped chips + per-exercise how-to guides (setup/execution/cues/breathing) shipped to `tools/training_tool.html` (4 copies). Deployed immediately (not midnight) via workflow_dispatch.
## Deployed: root master 0e054dc (origin muscle-os-bot) · public main e2b8be0 · public master dac2636 (stale e54042b merged with main content, 14 conflicted files resolved in favor of main, master-only DOCUMENTATION.md/admin/order*.html preserved) · website run 30834571932 success · live-verified https://anas-xi.github.io/muscle-os-website/tools/training_tool.html (417,122 bytes; EXERCISE_GUIDE/libModal/ex-sel-muscle/lib-fchip present).

## What shipped (this session)
- `EXERCISE_REGIONS` map (muscle → region buckets) + `EXERCISE_GUIDE` curated how-to for all ~113 pool exercises.
- Picker restructure: muscle-group heading bars (first-seen order), chips bucketed by region (localized `rgn_*` labels), per-slot how-to toggle. Old "show all/fewer" expander removed.
- Library: header 📚 button (`#libBtn`) → `#libModal` → filters (All + 12 muscles) → grouped rows with equipment tags, video links, how-to expanders. `window.showLibrary/hideLibrary/renderLibrary`.
- i18n: 29 new en+ar keys (lib_title/lib_all/lib_empty/how_to/guide_*/rgn_*) — en=ar=510 keys, parity verified.
- Verification: node --check both script blocks; Playwright smoke (chrome channel via `E:/MoS/.opencode/skills/pdf/node_modules/playwright-core`) — picker (20 muscle headings/92 regions/353 chips/31 guide toggles), library (13 filter chips/111 rows/12 groups/13 video links), AR/RTL flip, zero console errors. Temp scripts in `C:\Users\anass\AppData\Local\Temp\opencode\` (verify_tt*.js, verify3.js, verify_guide.js, smoke_test.js).
- **Deploy fix:** public master was 32 commits behind main (e54042b) — every sync-master merge failed (14 conflicts: guides/*.html, tools/*.html, training bundle, website copies). Resolved by merging main into master in a temp worktree (`E:\MoS\public\master`, detached), `checkout --theirs` for the 14 conflicted files, kept master-only files, pushed `dac2636`. Midnight cron should now succeed.

## What shipped
- 6 books (`E:\MoS\books\muscle_os_*.html`) got Personalise callouts (`.personalise` CSS: dark #14151A card, 4px #F4C93B left border, `\25C8` mark, yellow strong) — mirrored into `website/books/`.
- 6 free sample books `books/sample_*.html` (A4 PDF-styled, first chapter each, P1–P6) — NEW, in root + `website/books/` + PDFs.
- Combined sample `muscle_os_sample.html` → `muscle_os_sample.pdf` (11 pages, 411KB) — link target of samples hub "Download Combined PDF".
- `website/quiz/index.html` rewritten → "Which Book Should You Read First?" (3-question branching, 6-book map w/ anchors `../samples/#diet|training|strength|recovery|sleep|hormones`, bundle WhatsApp CTA 1500 EGP).
- `website/samples/index.html` rewritten → "Free Samples" (6 cards w/ matching anchor ids + combined PDF + WhatsApp bundle link).
- `website/knowledge-hub/index.html` cards updated to match new quiz/samples.
- ALL 13 book/sample PDFs now TRACKED in git (was `*.pdf` ignore): added `!books/*.pdf` + `!website/books/*.pdf` negations to root `.gitignore`, `!books/*.pdf` to `website/.gitignore`. PDFs never tracked before → live site downloads would have 404'd.

## Verification results
- Anchor ids diet/training/strength/recovery/sleep/hormones exist in samples page — quiz deep links work.
- PDF conversions (paged.polyfill + html_to_pdf.js): nutrition 81p/1.5MB · training 98p/1.7MB · hormonal 83p/1.4MB · recovery 80p · sleep 83p · strength 80p · combined sample 11p. Blank pages at TOC/part dividers are intentional section breaks.
- PDFs regenerated 8/3 because the 7/30 ones predated the personalise pass (books HTML modified 8/3 00:57).
- `website/books/index.html` was accidentally clobbered by bulk copy (root version lacks OG tags) → restored from git + synced improved version back to root `books/index.html`.

## Funnel layout on live site (paths under /books/ and /samples/)
- `/samples/` → downloads `/books/sample_*.pdf` + `/books/muscle_os_sample.pdf`, "View Full Book" → `/books/muscle_os_*.html`
- `/quiz/` → recommends one of 6 books → same book HTMLs + `/samples/#anchor`
- OG meta (title/desc/image https://muscleos.is-a.dev/assets/img/coach.jpg, twitter cards) on every page — caught public repo up on earlier OG upgrades too (guides/tools/bundles).

## Gotchas (repeat)
- PS 5.1 `Get-Content` reads UTF-8 as ANSI → em-dash shows as `�?"`; file is fine (check with [System.IO.File]::ReadAllText UTF8).
- Robocopy temp-clone push: line-ending warnings are noise (autocrlf=true normalizes); empty-diff `M` entries (workflow.yml/LICENSE) are mode/EOL-only, harmless.
- Never bare-`git` from `E:\MoS\website` (stray .git) — always `git -C E:\MoS`.
- Sitemap.xml + access-codes.json also rode along in the public push (previously committed to root, public was behind).
- `codes/` dropbox + `tools/FEATURE_PROMPTS.md` remain untracked in root (intentional — sensitive).

---

# Session State — Midnight-only live deploys + codes validity rules — COMPLETE

## Status: Live site now deploys ONLY at midnight (00:00 Morocco = 23:00 UTC) via scheduled GitHub Actions on Anas-XI/muscle-os-website main. Realtime push-trigger removed. Codes: 30d-from-activation (subscription), lifetime (books), survive any update.
## Deployed: root master 3fbe5a0 (origin muscle-os-bot) · public main 93f02d1 (workflow 320801512 "Deploy Website to GitHub Pages (midnight only)" active) · master branch untouched until first midnight merge.

## New deployment rules (REPLACES old playbook steps 3-4)
- During the day: push site changes to public `main` ONLY (worktree flow: copy website/* files → commit → `git push public HEAD:main`). NEVER push master directly — deploy-website.yml no longer has a push trigger.
- 00:00 Morocco daily (cron `0 23 * * *`): scheduled run on main → job `sync-master` merges main→master (GITHUB_TOKEN push does NOT re-trigger any workflow) → job `deploy` uploads artifact path `website` + deploy-pages → live site updates.
- Emergency deploy any time: `gh workflow run "Deploy Website to GitHub Pages (midnight only)" --repo Anas-XI/muscle-os-website`.
- Schedules can be delayed up to ~15 min by GitHub — treat midnight as approximate.
- Worker (wrangler deploy) stays MANUAL by convention — worker code changes go live only at 12am too (user decision, no CI secrets).

## Codes validity rules (all verified live)
- Subscription products (TR/TD/TB/MA): 30 days from ACTIVATION — worker sets expiresAt = now+30d on first activation; same-account re-activation returns ORIGINAL expiry (no reset, line ~249 binding path); JWT exp = expiresAt. Verified: TR-X32BUNF9E2, TD-PUPFWZ2LSJ, MA-R9YZQAFVY9 → 30d.
- Books (BK/BN/BB): LIFETIME — durationDays 0 → expiresAt 2099-12-31 (line ~326-328). Verified: BK-028UJRZDSL, BN-V332OI8R4X, BB-0IVXFVS30D → dur=0.
- Codes survive updates: truth lives in worker KV (persists across deploys); client fallback = website/assets/data/access-codes.json (6005 merged hashes — bulk-generate & rotate scripts MERGE, never rewrite). New batches: seed KV immediately (wrangler kv bulk put --remote, codes valid at once via worker); fallback JSON ships with next midnight deploy.
- Never rewrite access-codes.json from scratch — always merge (bulk-generate-codes.js / rotate-fallback-codes.js do this).

---

# Session State — Bulk Access Codes: 1000 per product, seeded + live — COMPLETE

## Status: 6000 new codes (6 products) generated, seeded to worker KV, hashes merged into fallback json, deployed live. Previous 1000 TR codes confirmed still working.
## Deployed: root master 04e8439 (origin muscle-os-bot) · public main bb7da72 · public master e54042b · website run 30767830993 success · worker redeployed (Version de34f8fa-1b20-40f2-9f65-e4b5d3be6539) with lifetime-durationDays response fix · live access-codes.json 200 / 1,105,046 bytes.

## Products (1000 codes each, all in KV `code:<CODE>` → {products, plan, durationDays, uses:0}, no maxUses — binding protects; plan/prefix/duration per worker PRODUCT_CONFIG)
- TR training_tool 30d — EXISTING batch (2026-07-31, already seeded; re-verified live: TR-X32BUNF9E2 valid)
- TD tdee_adaptive_engine 30d · TB both_tools 30d · BK training_book LIFETIME · BN nutrition_book LIFETIME · BB both_books LIFETIME · MA all_access 30d master
- Charset matches existing batches: `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`, `PREFIX-XXXXXXXXXX` (10 chars)

## Deliverables (E:\MoS\codes\ — untracked, not in any repo)
- `<product>_codes_1000.csv` × 6 (format identical to existing training_tool CSV: Index,Code,Product,Plan,Duration (days),Status,Generated,Expires)
- `<product>_codes_sheet.html` × 6 (A4 landscape printable → print-to-PDF like training_tool_codes_1000.pdf)
- `all_products_codes_2026-08-03.txt` (WhatsApp copy-paste sections)
- `kv-seed-2026-08-03.json` (6000 entries, wrangler kv bulk put format) — SENSITIVE, keep out of git
- `fallback-hashes-2026-08-03.json` (6000 SHA-256 → merged into website/assets/data/access-codes.json; old 5 hashes preserved; file now 1.1MB)

## Scripts
- NEW `website/scripts/bulk-generate-codes.js` — `node scripts/bulk-generate-codes.js` (flags: --no-merge, --count N); regenerates CSVs/sheets/txt/kv-seed/hashes; merges hashes into access-codes.json preserving existing
- FIXED `website/scripts/rotate-fallback-codes.js` — now MERGES monthly codes into access-codes.json instead of rewriting (was wiping the 6000 bulk hashes)
- FIXED `website/worker/src/index.js` — `durationDays: doResult.durationDays || 30` → `!= null ? ... : 30` (two spots: plain verify ~line 360 + binding re-activation ~line 273). Bug: lifetime book codes reported dur=30 → client saved 30-day local expiry → books re-locked after 30d despite lifetime JWT. Deployed.

## Seeding gotchas (repeat of session-state KV note)
- `wrangler kv bulk put --namespace-id <id>` WITHOUT --remote warns "Resource location: local" and STOPPED at 3603/6000 — ALWAYS pass `--remote` (second run: Success 6000/6000, exit 0)
- `wrangler kv key list` paginates at 1000 keys/page — count per prefix, not `--prefix code:`
- PowerShell `1>` redirects write UTF-16 + BOM → node reads need 'utf16le' + strip \uFEFF; ConvertFrom-Json on mixed stderr/stdout gives bogus counts (use node)
- KV key list/get lag behind writes (BN showed 603 until propagation; key get resolves definitive truth: BN-V332OI8R4X found, BB/MA needed run 2)
- Never invented codes for tests — read from CSVs (TB-FIUN9YS9UJ, BB-0IVXFVS30D came from files)

## Live verification matrix (POST /api/verify-code, prod worker)
- BK-028UJRZDSL training_book → valid dur=0 exp=2099-12-31 (fix confirmed)
- BN-V332OI8R4X nutrition_book → valid dur=0 lifetime
- TR-X32BUNF9E2 training_tool (OLD batch) → valid dur=30
- TD-PUPFWZ2LSJ → valid 30d · MA-R9YZQAFVY9 → valid master 30d
- TB-FIUN9YS9UJ → valid for BOTH training_tool + tdee_adaptive_engine
- BB-0IVXFVS30D → valid for BOTH training_book + nutrition_book (dur=0)
- KV prefix counts after seeding: TR 1000 · TD 1000 · TB 1000 · BK 1000 · BN 1000 · BB 1000 · MA 1000 (BB/MA via re-run; first run partial)

## Notes
- STRAY GIT REPO: `E:\MoS\website\.git` exists (old snapshot repo tracking mos_bot/, website/ nested copies, mostly D). NEVER run bare `git` from E:\MoS\website — always `git -C E:\MoS`. Flagged to user; not deleted (destructive, unrelated).
- JWT_SECRET unchanged this session (old session's fresh key) — session tokens fine.
- No maxUses on bulk codes: one-account binding blocks sharing; revoke via /api/revoke-code if needed.

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

---
# Session State - P4 personalized weekly coach note - COMPLETE

## Status: Rule-based weekly recap card on History. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- New Coach's Note card as first card of step5 (History), filled by coachNote() in renderHistory; derived from existing storage only (K.LG, K.LH, K.SP/K.PG, K.PF, K.DT, K.VI) - no new storage keys
- coachNote(): 14-day rolling window (adhFrom d-13..d0); sessions = distinct dates with >=1 non-warmup logged set; expected = trainDays x 2 (split non-rest days x 2 weeks); pct = min(100, round(sess/expected*100)); tone good>=80 / ok>=50 / warn<50 with tone icon (💪/🙂/⚠️) + color
- Total sets: all non-warmup sets in window
- Main lifts (MAIN_LIFTS = Barbell Squat, Bench Press, Deadlift Variation) intersected with program exercises; delta = best e1RM current week (d-6..d0) minus best e1RM previous week (d-13..d-7) via bestE1RMIn(); skip lifts missing either window; formatted 'Bench Press +5 kg'
- Sentence 3: pain flags (red/yellow list, capped 3) > deload due (shouldDeload) > next-week tip (cn_next_good/ok/warn by tone)
- Empty (no sessions in window or no split) -> cn_empty 'Start logging' variant
- i18n: coach_note, cn_adh (placeholders {a}/{b}/{pct}), cn_sets ({n}), cn_pr ({ex}), cn_pain ({n}/{list}), cn_deload, cn_next, cn_next_good/ok/warn, cn_empty (en+ar)

## Tests
- f16_coach_note_test.js (NEW, 12/12): empty -> start-logging variant; seeded 5 sessions over 14 days + bench 120->125 e1RM + squat flat -> '5 of 6', '83%', 'Total: 5', 'Bench Press +5', 💪 tone, next-week tip; pain flag -> pain sentence replaces tip; i18n keys exist in both en+ar source blocks (each key counted >=2 occurrences)
- GOTCHA: I18N is IIFE-scoped var, not window-visible - i18n assertion parses the source file instead
- GOTCHA: mainLifts exists only inside exCtx; coachNote defines its own MAIN_LIFTS
- Regression green: F5 21/21, F6 26/26, F7 25/25, F8 20/20, F11 18/18, F12 11/11, F13 13/13, F14 12/12, F15 17/17; bracecheck2 1559/1559; check_parse OK

---
# Session State - P5 body-trend feedback nudge - COMPLETE

## Status: Measurements drive a dismissable dashboard nudge. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- New #nudgeBar (flex bar + #nudgeText + #nudgeDismissBtn) after #missedBanner on step4; .nudge-bar yellow (rgba orange border), .note variant blue; dismiss button styled
- bodyTrendNudge(): K.MM entries filtered to weight; first vs last weight; span (dates) must be >=14 days; hypertrophy goal + pct <= -2% -> yellow nudge_hypertrophy_down; strength goal + weekly pct > 1% -> note nudge_strength_up
- renderNudge(): skips when mos_nudge_dismiss === today (date-only, ss() JSON round-trip via ls); renders tone class + text; called from renderDashboard
- Dismiss click: ss('mos_nudge_dismiss', today) + hide bar (no re-render needed; stays gone through re-renders same day)
- BUG FIX: backToDashBtn handler only did go(4) without renderDashboard -> stale dashboard returning from History (nudge/fatigue/session state stale); now go(4)+renderDashboard()
- i18n: nudge_hypertrophy_down, nudge_strength_up (en+ar)

## Tests
- f17_nudge_test.js (NEW, 12/12): no measurements -> hidden; 3 declining weights over 14 days -> yellow nudge + text; dismiss -> hidden + mos_nudge_dismiss=today; re-render -> still gone; strength goal + 3.5kg gain over 14 days -> note variant + verify-surplus text; span <14 days -> no nudge; no console errors
- GOTCHA: backToDashBtn didn't re-render dashboard (only go(4)) - nudge test caught it; fixed in app (also benefits F16 flow)
- GOTCHA: ss() JSON-stringifies - mos_nudge_dismiss raw value is '"date"'; test must JSON.parse before comparing
- Regression green: F5 21/21, F6 26/26, F7 25/25, F8 20/20, F11 18/18, F12 11/11, F13 13/13, F14 12/12, F15 17/17, F16 12/12; bracecheck2 1569/1569; check_parse OK

---
# Session State - P6 time-based program variants - COMPLETE

## Status: Session-length chips (45/60/90) on step2 persist mos_sess_len and reshape generated programs. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- step2: "Session Length" section with #sessLenGrid — three .sess-len-chip buttons (45/60/90 min, default 60, persisted mos_sess_len); click handler binds selection, load-time sync restores stored value
- CSS: .sess-len-grid/.sess-len-chip/.sess-len-chip.selected (accent border) + .opt-badge (blue uppercase pill for optional exercises)
- generateProgram: reads mos_sess_len; sessLen===45 -> after prehab insertion cap day.ex at 4 (slice, prehab kept at front) + day.ssSuggested=true; sessLen>=90 -> push 1 optional exercise/day picked from first poolOf() pool member not already in day and safe for injuries (isExerciseSafeForInjuries), sets=max(2, first-ex sets-1), optional:true; prog.sessLen stored on program
- step3 render: day.ssSuggested -> "⚡ supersets suggested" note; ex.optional -> .opt-badge 'optional'; progRecap shows '· N min'
- renderDay: ssSuggested -> note under warmup; buildNormalExCard -> .opt-badge on optional exercises
- createMesocycle: propagates optional:ex.optional||false; renderMesoCalendar md-ex rows show .opt-badge for optional
- weeklyVol: excludes sets logged for exercises marked optional in current program (K.PG) -> not counted in volume compliance; exposed window.__weeklyVol for tests
- i18n: sess_len, sess_45, sess_60, sess_90, sess_optional, sess_suggest_ss (en+ar)

## Tests
- f18_sess_len_test.js (NEW, 20/20): chips present/default 60; baseline 60 counts; 45 -> all days <=4 + ssSuggested + note + sessLen stored; 90 -> exactly 1 optional/day + counts=baseline+1 + badge/label + sessLen stored; optional sets excluded from __weeklyVol while normal counted; persistence (mos_sess_len + chip selected on return); back to 60 -> baseline counts, no optional/ssSuggested; no console errors
- Regression green: F5 21/21, F6 26/26, F7 25/25, F8 20/20, F11 18/18, F12 11/11, F13 13/13, F14 12/12, F15 17/17, F16 12/12, F17 12/12; bracecheck2 1569/1569; check_parse OK

---
# Session State - P7 plateau detection -> auto-meso suggestion - COMPLETE

## Status: Dashboard plateau card for stalled main lifts with swap / intensification / deload actions. Deployed origin + public main/master, live-verified.

## What changed (tools/training_tool.html)
- MAIN_LIFTS = [Barbell Squat, Bench Press, Deadlift Variation, Squat, Deadlift] at IIFE scope (exCtx reuses it; was local there)
- detectPlateaus(): for each main lift present in program, group K.LH entries by date -> sessions (best e1RM + max RPE per date, ascending); if >=3 sessions and gain (last vs 3-back) <2.5% AND latest session RPE >=8 -> plateau {ex, di, idx, gain, rpe}
- renderPlateaus(): #plateauCard on step4 (after nudgeBar) — title plateau_title + per-plateau body (plateau_body with {gain}/{rpe} interpolated, ex name) + 3 .pc-btn actions; hidden when none; called from renderDashboard after renderNudge()
- Actions (delegated listener on #plateauCard): swap -> dayIdx=di, renderDay(di), click that ex's .sw-ex-btn (opens .swap-panel with chips) + scrollIntoView; intense -> #mesoType='strength' + #mesoWeeks='10' (intensification phase needs >=10wk) + go(35)+renderMesoConfig(); deload -> same as markDeloadBtn (dlTracker reset, alert_deload_marked) + renderDashboard
- Derived from K.LH only; no new storage keys
- CSS: .plateau-card/.pc-title/.pc-body/.pc-actions/.pc-btn(.swap blue/.intense green/.deload orange)
- i18n: plateau_title, plateau_body, plateau_swap, plateau_intense, plateau_deload (en+ar)

## Tests
- f19_plateau_test.js (NEW, 17/17): program has main lift; seeded stagnant K.LH (3 sessions 0% gain RPE 8-9) -> card visible + names lift + title; 3 action buttons; swap -> swap panel opens on the lift's day (chips present, right day tab); deload -> lastDeload=today + sessions=0; intense -> step35 + strength + 10 weeks; RPE 7 -> card hidden; no console errors
- Regression green: F5 21/21, F6 26/26, F7 25/25, F8 20/20, F11 18/18, F12 11/11, F13 13/13, F14 12/12, F15 17/17, F16 12/12, F17 12/12, F18 20/20; bracecheck2 1569/1569; check_parse OK
- P-batch COMPLETE (P1-P7 shipped)

---
# Session State - UI polish pass: buttons & interactive styling - COMPLETE

## Status: Unified button radii/shadows, hover lift, focus-visible rings, larger touch targets. Deployed origin + public main/master, live-verified (404/404 live).

## What changed (tools/training_tool.html — single override CSS block before </style>, no JS/i18n changes)
- New :root tokens: --radius-sm/md/lg/xl (6/8/10/12px), --shadow-sm (0 2px 8px), --shadow-md (0 6px 20px), --shadow-accent (0 3px 14px var(--accent-soft2) — follows accent picker)
- Global: `button{cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}`; `:focus-visible` accent outline 2px offset 2px on buttons/chips (removed button:disabled cursor override — app convention is .btn-primary:disabled{cursor:default})
- btn-primary: radius 12px, accent glow shadow, hover translateY(-1px)+shadow-md, disabled = no shadow; btn-secondary: radius 10px, padding 8px 16px, hover fill bg
- Radii unified: step 10, toggle-opt 8, sess-len-chip 10, pc-btn 8, mb-btn 8, ss-toggle 8, day-tab 8, fat-light-btn 8, weak-chip 8, st-toggle 8, option 10, ex-sel-chip/more 6, swap-chip 6, prio-btn 6, meso-train-btn 6, rm/sw-ex-btn 6, sub-verify-btn 8, consult-cta 10, cardio/notif-toggle 8, nudge-dismiss 6, welcome/split-card 12
- Bigger touch targets: btn-secondary 8x16, step 9x4, sess-len-chip 10x8, pc-btn 6x12, mb-btn 7x14, ss-toggle 6x12, day-tab 7x12, fat-light-btn 6x12, weak-chip 5x10, st-toggle 6x14, lang-opt 4x10, ex-sel-chip 3x7, cardio/notif-toggle 8x12, nudge-dismiss 4x8
- Stepper: 1px line border + shadow-sm; .card/.modal-card/select option harmonized to var(--card); active step/toggle-opt get shadow; reduced-motion guard disables hover transforms

## Tests
- f20_ui_test.js (NEW, 45/45): scratch-element computed-style map for 26 interactive classes (radii/padding), real btn-primary (accent glow, user-select, stepper border+shadow, card bg var, hover translateY matrix 0,-1, focus-visible solid accent ring, disabled = shadow none + opacity .3 with transition:none), accent switch -> green glow rgb(76,175,80), onboarding still navigates; no console errors
- Regression: all suites green (f1-f19); bracecheck2 1569/1569; check_parse OK
- LIVE: 404 passed / 0 failed across all 22 suites vs https://anas-xi.github.io/muscle-os-website/tools/training_tool.html?v=livetest
- Deploy: root 060e23f (feat, incl. f20 test) · public main 1c62fbc · public master 42275c4 · website run 30745376946 success · live `?v=ui` verified
- GOTCHA: root repo has a broken duplicate deploy-website.yml (fails at Setup Pages on every master push — pre-existing noise, ignore); the real deploy is muscle-os-website workflow, triggered by master push; query it with `gh run list --repo Anas-XI/muscle-os-website`
- GOTCHA: `.btn-primary:disabled{cursor:default}` (0,2,0) beats generic `button:disabled` — app convention; don't re-add
- GOTCHA: CSS transitions animate opacity/box-shadow on state change — tests measuring disabled styles must set transition:none first

---
# Session State - Subscription modal code-first flow - COMPLETE

## Status: Access-code box is now the primary entry to the subscription overlay (Google sign-in moved below as an alternative). Deployed origin + public main/master, live-verified.

## Why
User: "also fix the subscription to tools show the box where user can put his code and verify it" — the overlay was Google-first: the code box lived in `#authStep2` which was `display:none` until sign-in, so users with a code had to sign in with Google first.

## What changed (tools/training_tool.html + tools/tdee_adaptive_engine.html, all 4 deploy copies each)
- Overlay restructure: divider `data-i18n="sub_enter_code"` ("Enter your access code below to unlock") → `#authStep2` (code row + `#subError` + `#subSuccess`) ALWAYS visible → divider `data-i18n="sub_or_google"` ("or sign in with Google to link your account") → `#authStep1` (now contains `#authWelcomeRow` hidden + `#googleSignInBtn` + `#authStep1Error` + `#subSignOut` starting `display:none`)
- `showStep(n)` rewritten (both tools): steps are always visible; `n===2` additionally shows the signed-in row (authWelcomeRow block + subSignOut inline); `n===1` hides them. All existing callers (start/initGsi/grantAndReload/check-session/invalid_session/sign-out) work unchanged
- i18n added (en+ar): `sub_enter_code`, `sub_or_google` (replaces old `sub_auth_step1` key, which is removed from both maps)
- Auth flow untouched: verifyCode → POST API_BASE+/api/verify-code, TRBOUND/TRDONE/TRBAD errors, owner instant grant, grantAndReload 1500ms reload, Enter-key on #subCode

## Tests
- f10_google_auth_test.js updated (37/37): T1 now asserts code box visible immediately + Google also visible + signed-in row hidden; T4/T5/T8 added welcome-row/switch-link visibility checks; sign-out asserts both sections still visible. f10b unchanged (10/10)
- Full regression: all 22 suites green; bracecheck2 1608/1608 (training) + 153/153 (TDEE); check_parse OK both
- Live: 404 passed / 0 failed baseline re-established (pre-deploy local run)

## Deployed
- root master d7f64db (feat, incl. f10 test update) pushed origin muscle-os-bot
- public main 46659c5 (1c62fbc..46659c5), public master 1eaefc8 (42275c4..1eaefc8) — 4 copies rule in both worktrees
- website run 30746757013 success (master push; root repo's own broken workflow was deleted in 419c531 — no more noise on root pushes)
- Live-verified `?v=` on both pages: code-first divider, Google-alternative divider, i18n keys, new showStep logic all present
- Worktrees removed, pub-main branch deleted

---
# Session State - Code saved per Google account (auto-restore) - COMPLETE

## Status: Bound access codes are indexed per account on the worker; Google sign-in (or a valid stored session) auto-restores the subscription without re-entering the code. Worker + Pages deployed, live-verified.

## Why
After the code-first overlay, a returning user with a Google-bound code still had to re-enter the code on a fresh device/cleared storage. "Save code per account": sign in with Google → subscription restored automatically.

## Worker (website/worker/src/index.js — deployed Version 06bd9635-a41e-4a05-b8ad-6e7ef5255541)
- New per-account index `email:<LOWERED_EMAIL>:subs` → `[{code, plan, products, expiresAt, ts}]` (TTL 90d): `addAccountSub()` upserts by code on first binding AND on same-account re-activation; `getAccountSubs()` filters expired + sorts by expiry desc
- `/api/auth/google` and `/api/check-session` responses now include `subscriptions` (active account-bound subs, never raw user input — computed server-side from the session JWT email)
- `CodeCounter /verify` response now includes `products` (needed by the index; lazy-migration retry copies it too)
- Sessionless activations are NOT indexed (legacy maxUses=1 codes stay unbound)

## Tools (training_tool.html + tdee_adaptive_engine.html, all 4 deploy copies each)
- `pickAccountSub(subs)`: first sub with `products==='all'` (master) or array containing the tool's PRODUCT_ID (server sorts by expiry desc → longest-valid first)
- `finishGoogle()`: owner instant-grant first, then restore — `grantAndReload(..., quiet=true)` (quiet skips the coach WhatsApp re-notify); account with no bound code → `showStep(2)` + new `.sub-nolink` hint (`sub_no_link`, en+ar)
- `start()` (stored session): check-session now returns subscriptions → same auto-restore on load; invalid session / sign-out / verify error paths hide the hint
- `#subNoLink` element added under the code row in both overlays (tdee's was missed on first pass — caught by live marker check, fixed in follow-up commit)
- tdee: also removed leftover duplicate `subError`/`subSuccess` + stray `</div>` from the previous restructure (invalid nesting, invisible but unclean)

## Tests
- f8b_auth_worker_test.mjs 33/33 (+12 index write incl. sessionless-not-indexed, +13 check-session subs, +14 dedupe on re-activation, +15 expired filter, +16 master/'all')
- f10_google_auth_test.js 46/46 (+T11 sign-in auto-restore no verify-code call, +T12 no-link hint shown/hidden on sign-out, +T13 stored-session restore on load); f10b_tdee_auth_test.js 13/13 (+T5 restore)
- Full local regression 22/22 suites green; bracecheck2 1608/1608 + 158/158; check_parse OK

## Deployed
- worker: wrangler deploy → Version 06bd9635 (live smoke: endpoints respond, missing_session/missing_fields 400s intact)
- root master 1c456ea (feat) + 806b169 (fix subNoLink on tdee) pushed origin muscle-os-bot
- public main 2cb1b5d + cde8caa, public master eb2f0ec + 500c889 — 4 copies rule both worktrees
- website runs 30747505584 + 30747580697 success; live-verified `?v=`: subNoLink element + pickAccountSub + restore logic on both pages
- Worktrees removed, pub-main deleted

---
# Session State - Theme symmetry across books, demos, decision trees - COMPLETE

## Status: Single brand font (Inter) across every public page. Books/tools/guides all share palette #14151A/#F4C93B/#FAFAF8. Deployed to Pages (main + master), live-verified.

## Why
Books and tools already shared the gold/ink palette, but typography was split: Inter (books, training_tool, tdee_adaptive, pillar_intake) vs Georgia (both decision trees, 4 more guides, tdee_macro, rpe, volume_set, split_selector). User approved: two families (print light / app dark), Inter everywhere, full scope.

## What changed (20 files, root + website/ mirrors)
- Georgia -> 'Inter',sans-serif in: guides/deload_decision_tree, guides/plateau_decision_tree, guides/train_maxing_quick_start, guides/consistency_workbook, guides/diet_maxing_quick_start, guides/recomp_protocol_cheat_sheet, tools/tdee_macro_calculator, tools/rpe_load_calculator, tools/volume_set_calculator, tools/split_selector_quiz + the same 10 under website/
- Added Google Fonts Inter link (`Inter:wght@300;400;500;600;700`) to every converted page (none had loaded Inter before — without it the new stack would fall back to generic sans-serif)
- Bundles (training bundle/, nutrition bundle/) were ALREADY Inter (newer Oswald/JetBrains template) — no change needed; verified in place
- Bugfix: consistency_workbook.html line 399 had `<p>...</div>` (invalid — p closed with div) — fixed to </p>, divs now 218/218, ps 91/91
- Theme audit result: books (6 + 7 samples), tools (7), guides (6) all on shared palette + Inter; only leftover Georgia is codes/codes_sheet.html (internal admin, untracked, NOT deployed)

## Verify notes
- bracecheck2/check_parse only apply to scripted pages; guides are pure static HTML (no JS) — verified via CSS-brace count + div open/close balance + tag regex instead
- Deploy workflow publishes ONLY website/ (artifact path: "website") — live URLs are /tools/, /guides/, /training bundle/, /nutrition bundle/; nested /website/ paths 404 BY DESIGN (never existed live)

## Deployed
- root muscle-os-bot: 1571fe0 (guides+website/guides), ebe7032 (tools) pushed
- public main: 2f5c5b4; public master: 1ef3d73 (20 files each; FEATURE_PROMPTS.md kept out of both)
- website run 30751067933 success
- Live-verified ?v=: 14 URLs — all 200, Georgia=False, InterLink=True (6 guides + 4 tools root, 1 bundle each family, plus tdee_macro + consistency under website/ = served via root paths)
- Worktrees removed, pub-main deleted

# Session State — Auth: All Tools Google-Gated; Paid Tools Code-Verified — COMPLETE

## Status: auth live end-to-end. All 6 tools + shared JS + codes JSON live-verified 200 with ?v=3bbf421 (gsi script, googleGate overlay, access-control.js ref present in served HTML; requireGoogleAuth + document.currentScript self-locate present in served JS).
## Deployed: root master 3bbf421 (origin muscle-os-bot) · public main 30f2c53 · public master 9298bd7 · website run 30766214918 success · worker Version ID da8d2d1c-81f8-49c1-9c64-d9b70955da6e on default env, JWT_SECRET set on all 3 envs.

## Completed

### Scope (user decision): ALL tools require Google sign-in; purchase-code verification only for paid tools (training_tool, tdee_adaptive_engine).

### Root cause fixed: worker deployed WITHOUT Google config
- `POST /api/auth/google` returned 501 `google_auth_not_configured` → worker had no GOOGLE_CLIENT_ID.
- Fix: `website/worker/wrangler.toml` gained `[vars] GOOGLE_CLIENT_ID = "22648364020234-gldbcsfl16cftjvd11o9iqpalesi1hsn.apps.googleusercontent.com"` (public by design; must match the GIS client in pages). JWT_SECRET (96 hex, generated fresh) via `wrangler secret put` on default/staging/production.

### 4 free tools gated (rpe_load_calculator, volume_set_calculator, split_selector_quiz, tdee_macro_calculator)
- Head: `<script async defer src="https://accounts.google.com/gsi/client">` (same GIS client as paid tools).
- After `<body>`: `#googleGate` fixed overlay (.gate-card, .gate-error).
- Gate CSS appended before `</style>`.
- Before `</body>`: `<script src="../assets/js/access-control.js">` + IIFE `MosAccess.requireGoogleAuth(null, cb)` → cb(ok) hides overlay.
- Paid tools (training_tool, tdee_adaptive_engine) untouched — existing Google gate + verifyCode() + owner bypass OWNER_EMAIL intact.

### Shared module fix (`website/assets/js/access-control.js`)
- Local fallback path was `fetch('assets/data/access-codes.json')` which resolves under `/tools/` → 404. `ACCESS_DATA_URL` now self-locates via `document.currentScript.src` (dir of the JS → `/assets/data/access-codes.json`); absolute fallback only for `/pdf/viewer.html` (own inline JWT logic unchanged).

### Worker endpoint matrix (default env, verified live)
- `auth/google` garbage token → 401 invalid_google_token; `{}` → 400 missing_token
- `check-session` garbage → 401 invalid_session
- `verify-code` garbage code → 401 invalid_code; fake session → 401 invalid_session (session-aware)
- OPTIONS preflight → 200; index.html + all 6 tools + access-control.js + access-codes.json → 200 (curl -sI with ?v=3bbf421; earlier IWR 404s were stale cache — use curl.exe)

## User test checklist (handed off; cannot be done headless)
1. Open a free tool (e.g. /tools/rpe_load_calculator.html) → Google button → pick account → gate opens
2. Paid tool → sign in → enter purchase code → opens; reopen = still open
3. Owner email (ANASSTEM2025@GMAIL.COM) → instant open, no code
4. staging + production worker endpoints also configured (same secrets/vars)

## Gotchas
- JWT_SECRET is brand-new → any tokens minted before this deploy are invalid (check-session 401 expected).
- GH Pages artifact-based deploys: `/repos/.../pages` status:null is normal; verify via artifact download (`gh run download <run> -n github-pages`) or live curl.
- `gh api .../artifacts/<id>/zip` needs binary-safe download (curl.exe / gh run download) — PowerShell `>` corrupts binary zips.

# Session State — PDF Viewer Overhaul — COMPLETE

## Status: viewer.html rewritten + DEPLOYED LIVE.
## Deployed: root master 4f78556 (origin muscle-os-bot) · public main 9a5baa4 · public master 1c084a5 · website run 30752678278 success · live-verified https://anas-xi.github.io/muscle-os-website/pdf/viewer.html?v=4f78556 (200, 22039 bytes)

## Completed

### Root cause (5 issues in website/pdf/viewer.html)
1. CSP `default-src 'self'` blocked cdnjs pdf.js script+worker, the inline script itself, Google Fonts, and the worker API fetch — viewer could never load a PDF anywhere
2. No fit-to-width: fixed 1.2× canvas scale with `height:auto!important` CSS hack — blurry/mis-sized on phones, no resize handling
3. All pages rendered upfront (renderAllPages) — heavy for 100+ page books
4. Broken scroll math: `offsetTop` against a scroll container lacking a positioned ancestor → wrong page tracking / prev-next mis-scroll
5. Toolbar sticky `top:49px` hardcoded — misaligned under shorter mobile nav

### Fixes applied (all in one commit)
- CSP replaced: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; worker-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://muscleos-access-control.muscleos.workers.dev; img-src 'self' data: blob:; object-src 'none'` (connect-src verified against API_BASE at viewer.html line ~143; pdf.js 3.11.174 from cdnjs lines ~139-141)
- Fit-to-width engine: `computeFitScale()` = viewer.clientWidth / baseW (clamped 0.25–4), `DPR` capped at 2, canvas rendered at cssScale*DPR and CSS-stretched into fixed-width page box (crisp on HiDPI)
- Placeholder-first layout: `buildPlaceholders()` creates all `.page` divs with fixed width + aspect-ratio (scrollable immediately), then `renderPage(n)` fills them on demand
- Lazy rendering: IntersectionObserver (root=#viewerContainer, rootMargin 400px) + `renderNearby()` (1 viewport above → 2 below) — only visible pages render
- Zoom: A-/A+ scale 0.4–4 step 0.2; `applyZoom()` re-fits, clears canvases, re-renders nearby; `zoomGen` counter kills stale async renders (no old-scale overwrite race)
- Scroll tracking: page = placeholder whose center is nearest viewport mid (offsetTop now valid — #viewerContainer has `position:relative`); prev/next scrollTo offsetTop-20; resize → debounced applyZoom (250ms)
- Toolbar: sticky `top:49px` desktop; media query sets `.mos-nav{position:static}` + `.toolbar{top:0}` ≤600px (nav no longer sticky below 600px)
- `#viewerContainer` gained `position:relative` + `min-height:100dvh` on body; `.page` gains fixed aspect-ratio box (no more `height:auto!important`)

## Verify notes
- bracecheck2/check_parse pass (84/84 braces, parse OK); grep confirmed no renderAllPages / scale=1.2 / max-width:100% / height:auto!important remnants
- Local smoke: python http.server 8901 → GET /pdf/viewer.html 200 (22496 bytes)
- Live-verified: CSP meta present, computeFitScale present, IntersectionObserver present, legacy CSS hack gone
- Not tested in-browser (no headless browser available) — visual pass recommended: phone-width + desktop, prev/next, zoom, rotate resize

## Deployed
- root: 4f78556 pushed (only website/pdf/viewer.html staged; dirty tree untouched)
- public main: 9a5baa4; public master: 1c084a5
- website run 30752678278 success; live ?v=4f78556 checks passed
- Worktrees removed, pub-main deleted



