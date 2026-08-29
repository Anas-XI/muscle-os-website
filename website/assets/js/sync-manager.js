/**
 * SyncManager — MuscleOS Cross-Channel Sync
 * Offline-first: localStorage is always the source of truth.
 * Automatic retry queue drains when network connectivity returns.
 */
(function () {
  'use strict';

  var QUEUE_KEY = 'mos_sync_queue';

  function lsGet(key, def) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
  }

  function getWorkerBase() {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8787/api';
    return '/api';
  }

  function getToken() {
    try { return localStorage.getItem('mos_session'); } catch (e) { return null; }
  }

  function authHeaders() {
    var t = getToken();
    if (!t) return null;
    return { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' };
  }

  // Queue an offline request for automatic retry
  function enqueueSync(item) {
    var queue = lsGet(QUEUE_KEY, []);
    queue.push({
      item: item,
      timestamp: Date.now()
    });
    lsSet(QUEUE_KEY, queue);
  }

  async function flushSyncQueue() {
    if (!navigator.onLine || !getToken()) return;
    var queue = lsGet(QUEUE_KEY, []);
    if (!queue.length) return;

    var remaining = [];
    for (var i = 0; i < queue.length; i++) {
      var entry = queue[i];
      var success = await syncFetch(entry.item.path, entry.item.method, entry.item.body, false);
      if (!success) {
        remaining.push(entry);
      }
    }
    lsSet(QUEUE_KEY, remaining);
    if (remaining.length < queue.length) {
      console.info('[SyncManager] Flushed ' + (queue.length - remaining.length) + ' queued sync items to cloud.');
    }
  }

  async function syncFetch(path, method, body, shouldQueue) {
    if (shouldQueue === undefined) shouldQueue = true;
    var h = authHeaders();
    if (!h) return null;
    try {
      var opts = { method: method || 'GET', headers: h };
      if (body) opts.body = JSON.stringify(body);
      var res = await fetch(getWorkerBase() + path, opts);
      if (!res.ok) {
        if (shouldQueue && method === 'POST') enqueueSync({ path: path, method: method, body: body });
        return null;
      }
      return await res.json();
    } catch (e) {
      if (shouldQueue && method === 'POST') enqueueSync({ path: path, method: method, body: body });
      return null;
    }
  }

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

  async function pullSessions() {
    var data = await syncFetch('/sessions/load?days=60', 'GET', null, false);
    if (!data || !data.sessions) return;
    var localLogs = lsGet('mos_logs', {});
    var localHist = lsGet('mos_load_history', {});
    var dirty = false;
    data.sessions.forEach(function (s) {
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
    if (local && Object.keys(local).length > 0) return;
    var data = await syncFetch('/profile/load', 'GET', null, false);
    if (data && data.intake && Object.keys(data.intake).length > 0) {
      lsSet('mos_vault_intake', data.intake);
      console.info('[SyncManager] Restored profile from remote.');
    }
  }

  async function pullDeload() {
    var local = lsGet('mos_dl_tracker', null);
    if (local && Object.keys(local).length > 0) return;
    var data = await syncFetch('/deload/load', 'GET', null, false);
    if (data && data.state && Object.keys(data.state).length > 0) {
      lsSet('mos_dl_tracker', data.state);
    }
  }

  window.SyncManager = {
    pushSession: pushSession,
    pushProfile: pushProfile,
    pushDeload: pushDeload,
    pushBodyweight: pushBodyweight,
    pullSessions: pullSessions,
    pullProfile: pullProfile,
    pullDeload: pullDeload,
    flushSyncQueue: flushSyncQueue,

    init: async function () {
      if (!getToken()) return;
      await flushSyncQueue();
      await Promise.all([pullSessions(), pullProfile(), pullDeload()]);
    }
  };

  window.addEventListener('online', function() {
    console.info('[SyncManager] Network online event detected — flushing sync queue...');
    flushSyncQueue();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.SyncManager.init(); });
  } else {
    window.SyncManager.init();
  }
})();
