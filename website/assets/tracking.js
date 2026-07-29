(function(){
  var KEY = 'mos_funnel_log';
  var MAX = 500;

  function log(entry) {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.push(entry);
      if (arr.length > MAX) arr = arr.slice(arr.length - MAX);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch(e) {}
  }

  function now() { return new Date().toISOString(); }

  function getPage() { return window.location.pathname.replace(/\/+$/,'') || '/'; }

  // Pageview log
  log({ page: getPage(), action: 'pageview', referrer: document.referrer || '', timestamp: now() });

  // Click tracking for WhatsApp links
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

    log({
      page: getPage(),
      action: 'whatsapp_click',
      tag: tag || textParam || 'generic',
      text: decodeURIComponent(textParam).substring(0, 200),
      timestamp: now()
    });
  });

  // Export function
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
