/**
 * SyncManager — MuscleOS Cross-Channel Sync
 * Offline-first: localStorage is always the source of truth.
 * Supabase sync runs silently in the background.
 * 
 * Inject this script BEFORE closing </body> on all tool pages.
 */
(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function lsGet(key, def) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
  }

  function getWorkerBase() {
    // In production the worker is at /api/*
    // In local dev it's at http://127.0.0.1:8787/api/*
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8787/api';
    return '/api';
  }

  function getToken() {
    // Reuse the existing Google-issued session token stored by the auth flow
    try { return localStorage.getItem('mos_session'); } catch (e) { return null; }
  }

  function authHeaders() {
    var t = getToken();
    if (!t) return null;
    return { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' };
  }

  // ── Core fetch wrapper ────────────────────────────────────────────────────

  async function syncFetch(path, method, body) {
    var h = authHeaders();
    if (!h) return null; // not logged in, skip silently
    try {
      var opts = { method: method || 'GET', headers: h };
      if (body) opts.body = JSON.stringify(body);
      var res = await fetch(getWorkerBase() + path, opts);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null; // network error — fail silently, offline-first
    }
  }

  // ── Push functions ────────────────────────────────────────────────────────

  async function pushSession(date) {
    var logs = lsGet('mos_logs', {});
    var log = logs[date];
    if (!log) return;
    var loadHist = lsGet('mos_load_history', {});
    await syncFetch('/sessions/save', 'POST', { date: date, log: log, load_history: loadHist });
  }

  async function pushProfile() {
    var intake = lsGet('mos_vault_intake', null);
    if (!intake) return;
    await syncFetch('/profile/save', 'POST', { intake: intake });
  }

  async function pushDeload() {
    var state = lsGet('mos_dl_tracker', null);
    if (!state) return;
    await syncFetch('/deload/save', 'POST', { state: state });
  }

  async function pushBodyweight(date, weightKg) {
    await syncFetch('/bodyweight/save', 'POST', { date: date, weight_kg: weightKg });
  }

  // ── Pull functions ────────────────────────────────────────────────────────

  async function pullSessions() {
    var data = await syncFetch('/sessions/load?days=60', 'GET');
    if (!data || !data.sessions) return;
    var localLogs = lsGet('mos_logs', {});
    var localHist = lsGet('mos_load_history', {});
    var dirty = false;
    data.sessions.forEach(function (s) {
      // Only fill in missing local days — never overwrite existing local data
      if (!localLogs[s.session_date] && s.log && Object.keys(s.log).length > 0) {
        localLogs[s.session_date] = s.log;
        dirty = true;
      }
      if (s.load_history) {
        Object.keys(s.load_history).forEach(function (ex) {
          if (!localHist[ex] || localHist[ex].length === 0) {
            localHist[ex] = s.load_history[ex];
            dirty = true;
          }
        });
      }
    });
    if (dirty) {
      lsSet('mos_logs', localLogs);
      lsSet('mos_load_history', localHist);
      console.info('[SyncManager] Restored ' + data.sessions.length + ' remote sessions into localStorage.');
    }
  }

  async function pullProfile() {
    var local = lsGet('mos_vault_intake', null);
    if (local && Object.keys(local).length > 0) return; // local profile wins
    var data = await syncFetch('/profile/load', 'GET');
    if (data && data.intake && Object.keys(data.intake).length > 0) {
      lsSet('mos_vault_intake', data.intake);
      console.info('[SyncManager] Restored profile from remote.');
    }
  }

  async function pullDeload() {
    var local = lsGet('mos_dl_tracker', null);
    if (local && Object.keys(local).length > 0) return; // local wins
    var data = await syncFetch('/deload/load', 'GET');
    if (data && data.state && Object.keys(data.state).length > 0) {
      lsSet('mos_dl_tracker', data.state);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.SyncManager = {
    pushSession: pushSession,
    pushProfile: pushProfile,
    pushDeload: pushDeload,
    pushBodyweight: pushBodyweight,
    pullSessions: pullSessions,
    pullProfile: pullProfile,
    pullDeload: pullDeload,

    // Called once on page load — runs all pulls silently
    init: async function () {
      if (!getToken()) return; // not logged in
      await Promise.all([pullSessions(), pullProfile(), pullDeload()]);
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.SyncManager.init(); });
  } else {
    window.SyncManager.init();
  }

})();
