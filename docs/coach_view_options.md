# Coach View Options — Design Doc (design only, NOT implemented)

**Status:** Proposal for owner decision. Do not implement until Anas picks an option.
**Scope:** How the coach (Anas) can see what a user is doing inside the Training App, given the current **no-accounts architecture**.
**Stage:** Pre-PMF. Validation has not started; every option here should be re-evaluated after the first real users.

---

## 1. Current architecture constraints (why this is hard)

- **No accounts.** There is no login, no email, no user ID. The only identity is the **sync key** (`mos_sync_key`, a UUID generated client-side) + optional passphrase (`mos_sync_pw`). The sync key is a **bearer credential**: anyone with it can read/write that user's payload at the Worker (`GET/POST /api/sync/:key`).
- **Worker = dumb store.** `muscleos-access-control.muscleos.workers.dev` stores the newest payload blob per key (`newest-wins`). It has no user table, no auth, no analytics.
- **Only server hook today:** `notify-coach` (`/api/notify-coach`) — fired by the `CQ` coach queue (`__suggestRouter`) when a coached user's session produces queued suggestions. That's a one-way ping; there is no pull-back.
- **Events live on-device.** `mos_events` (JSONL, max 500, 90-day retention) syncs with the payload, so it *can* reach the Worker — but the Worker does not expose it beyond the raw GET.
- **Analytics already exists elsewhere:** website funnel events go to a Google Apps Script webhook → Google Sheet (`docs/apps-script-webhook.gs`). The Training App events do **not** go there yet (offline-first; no background API spam by design).

## 2. Data a coach could look at (all available today via sync payload)

| Area | Keys (K-map) |
|---|---|
| Profile & goals | `PG`, `TR` (targets), pain flags `PF` |
| Program | `PR` (program), `VO` (volume alloc), `SM` (split), `PM` (priority muscles) |
| Training log | `LH` (load history), `SR` (soreness), `ACWR` |
| Compliance | `DT` (deload tracker), `ST` (streaks) |
| Coach state | `CN` (coach note), `CQ` (suggestion queue), `EV` (event log) |

The payload is a single JSON blob; the coach's read path is identical to the user's own Pull.

## 3. Options

### Option A — Coach inbox (minimal, recommended for PMF)
- Keep `notify-coach` as-is; extend nothing client-side.
- Add a tiny Apps Script sheet ("Coach Inbox") that `notify-coach` writes to (same pattern as `apps-script-webhook.gs`), listing: user sync ID (coach-visible only), suggestion, timestamp, `coach_view` flag = false.
- Coach reads the sheet weekly; if a user needs a live look, coach asks the user to **share their sync ID + passphrase** and uses Option B ad-hoc.
- **Cost:** one webhook handler (~30 lines). **No product surface change.**

### Option B — Read-only coach view (ad-hoc, per-user)
- Coach opens a **static HTML dashboard** (`docs/` mock or `admin/` page) that takes a user's sync ID + passphrase (shared by the user via WhatsApp) and does `GET /api/sync/:key?pw=...` → renders the payload read-only: program, last sessions, ACWR, soreness, compliance, coach note, suggestion queue.
- Read-only is guaranteed because the page has no write path (no POST button). The Worker API already separates GET/POST.
- **Cost:** one static page + read of the existing GET response. **No Worker change.**
- **Tradeoffs (must be accepted by owner):**
  - Credentials travel in chat. Revocation = user changes sync ID (loses cloud history) or removes passphrase — clunky but available.
  - Passphrase is **optional** today (placeholder says "optional") — coach view should refuse empty-passphrase keys, or we make the passphrase required at creation. **Owner decision.**
  - Raw payload includes `EV` event log → coach can see product-usage events (funnel), not just training data. Consider stripping `EV` from coach renders.

### Option C — Coach workspace (proper, deferred)
- Client generates a **read-only access token** (separate from sync key, scoped read) stored alongside the payload; Worker checks scope; dashboard lists multiple users (tokens, not keys); suggestion queue (CQ) surfaces as a coach inbox with accept/decline.
- Requires Worker auth + token lifecycle + UI work across two surfaces.
- **Deferred** — overkill until validation shows multi-device/multi-user need (PRD: "revisit if multi-device usage grows").

## 4. Owner decision (explicitly NOT decided here)

| # | Question | Default if no answer |
|---|---|---|
| 1 | Option A (sheet inbox) now? | Yes — it only adds a webhook handler |
| 2 | Option B static coach view now? | Build the mock only after A ships and coach actually needs live data |
| 3 | Passphrase required for sync? | Keep optional; Option B refuses empty passphrases |
| 4 | Strip `EV` from coach renders? | Yes, strip (funnel events are product-intel, not coaching data) |
| 5 | Option C timeline? | Not before first validation cohort finishes |

## 5. Explicit non-goals (this doc does not authorize)
- No new user accounts or login system.
- No change to the sync Worker's trust model (key = bearer).
- No background telemetry from the Training App to the funnel sheet.
- No auto-ingest of user payloads into any coach-facing store.

## 6. Privacy notes
- Sync IDs are bearer credentials: never log full keys server-side; coach surfaces must show truncated IDs (`bff7723c-…`) except inside a session.
- Coach view requires **explicit user share** every time (user pastes the ID themselves).
- Recommend stating "the coach can see your program and training log if you share your sync ID" in the sync modal copy when the coach-view ships.
