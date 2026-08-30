// Muscle OS — Universal Toast Service
(function(window) {
  'use strict';

  function mosToast(msg, type) {
    type = type || 'info';
    var icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '⚡'));
    var tc = document.getElementById('mos-toast-container');
    if (!tc) {
      tc = document.createElement('div');
      tc.id = 'mos-toast-container';
      tc.className = 'mos-toast-container';
      tc.setAttribute('role', 'alert');
      tc.setAttribute('aria-live', 'polite');
      document.body.appendChild(tc);
    }
    var t = document.createElement('div');
    t.className = 'mos-toast ' + type;
    t.innerHTML = '<span class="mos-toast-icon">' + icon + '</span><span class="mos-toast-msg">' + (msg || '') + '</span>';
    tc.appendChild(t);
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      setTimeout(function() { t.remove(); }, 300);
    }, 4000);
  }

  window.mosToast = mosToast;
  window.alert = function(msg) { window.mosToast(msg, 'info'); };
})(window);
