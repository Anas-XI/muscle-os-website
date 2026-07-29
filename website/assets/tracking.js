(function(){
  // ── Config ──────────────────────────────────────────
  var FUNNEL_WEBHOOK_URL = ''; // ← Anas pastes his Apps Script /exec URL here
  var EVENTS_KEY = '';         // ← Anas sets same string as EVENTS_KEY in the Apps Script

  // ── Constants ───────────────────────────────────────
  var KEY = 'mos_funnel_log';
  var MAX = 500;
  var SID_KEY = 'mos_session_id';

  // ── Session ID (persistent per visitor) ─────────────
  function getSessionId() {
    var sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  }

  // ── Helpers ─────────────────────────────────────────
  function now() { return new Date().toISOString(); }

  function getPage() { return window.location.pathname.replace(/\/+$/,'') || '/'; }

  // ── localStorage log (existing, unchanged) ──────────
  function log(entry) {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.push(entry);
      if (arr.length > MAX) arr = arr.slice(arr.length - MAX);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch(e) {}
  }

  // ── Webhook POST (additive, never blocks) ───────────
  function webhookSend(data) {
    if (!FUNNEL_WEBHOOK_URL) return;
    try {
      var body = JSON.stringify({
        page: data.page || '',
        event_type: data.action || '',
        tag: data.tag || '',
        referrer: data.referrer || document.referrer || '',
        session_id: getSessionId(),
        events_key: EVENTS_KEY
      });
      fetch(FUNNEL_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: body
      });
    } catch(e) { /* fire-and-forget, never throw */ }
  }

  // ── Deduplication guard ─────────────────────────────
  if (window.__mosTrackedThisLoad) return;
  window.__mosTrackedThisLoad = true;

  // ── Pageview event ──────────────────────────────────
  var pageviewEntry = { page: getPage(), action: 'pageview', referrer: document.referrer || '', timestamp: now() };
  log(pageviewEntry);
  webhookSend(pageviewEntry);

  // ── Click tracking for WhatsApp links ───────────────
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me/201040796017') === -1) return;

    var tag = a.getAttribute('data-wa-tag');
    var textParam = '';
    var idx = href.indexOf('?text=');
    if (idx > -1) {
      var after = href.substring(idx + 6);
      var amp = after.indexOf('&');
      textParam = amp > -1 ? after.substring(0, amp) : after;
    }

    var entry = {
      page: getPage(),
      action: 'whatsapp_click',
      tag: tag || textParam || 'generic',
      text: decodeURIComponent(textParam).substring(0, 200),
      timestamp: now()
    };
    log(entry);
    webhookSend(entry);
  });

  // ── Export function (for manual review) ─────────────
  window.mosExportFunnelLog = function() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || '[]');
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mos_funnel_' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch(e) { console.warn('Export failed', e); }
  };

  // ── Public event API for custom events (orders, approvals, etc.) ──
  window.mosTrackEvent = function(action, tag, extra) {
    var entry = { page: getPage(), action: action, tag: tag || '', timestamp: now() };
    if (extra) {
      for (var k in extra) { if (extra.hasOwnProperty(k)) entry[k] = extra[k]; }
    }
    log(entry);
    webhookSend({ page: getPage(), action: action, tag: tag || '' });
  };

  // Hidden export trigger: triple-tap the brand text
  var brandTimer = 0, brandClicks = 0;
  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el || !el.textContent || el.textContent.indexOf('ANAS') === -1) { brandClicks = 0; return; }
    brandClicks++;
    clearTimeout(brandTimer);
    brandTimer = setTimeout(function() { brandClicks = 0; }, 1200);
    if (brandClicks === 3) {
      brandClicks = 0;
      if (window.mosExportFunnelLog) window.mosExportFunnelLog();
    }
  });
})();
