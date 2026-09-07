/**
 * Muscle OS — Privacy & Cookie Consent Manager (mos-consent.js)
 * Compliant with GDPR, ePrivacy Directive, CCPA/CPRA, and Egyptian Law 151/2020.
 * Hard-gates marketing pixels (Meta Pixel) and analytics until affirmative user opt-in.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'mos_consent_state';
  var LEGACY_KEY = 'cookiesAccepted';

  // Ensure CSS is loaded
  function ensureCSS() {
    if (document.querySelector('link[href*="mos-consent.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    // Handle both root and subfolder paths
    var isSub = window.location.pathname.indexOf('/tools/') > -1 ||
                window.location.pathname.indexOf('/products/') > -1 ||
                window.location.pathname.indexOf('/samples/') > -1;
    link.href = isSub ? '../assets/css/mos-consent.css' : 'assets/css/mos-consent.css';
    document.head.appendChild(link);
  }

  // Load existing consent state
  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Fallback to legacy key if present
    var legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'true') {
      return { essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() };
    } else if (legacy === 'false') {
      return { essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() };
    }
    return null;
  }

  // Save consent state and fire events
  function saveConsent(state) {
    state.timestamp = new Date().toISOString();
    state.version = 1;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(LEGACY_KEY, (state.analytics || state.marketing) ? 'true' : 'false');
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('mos_consent_updated', { detail: state }));
  }

  // Check if specific category has consent
  function hasConsent(category) {
    var state = getConsent();
    if (!state) return false;
    if (category === 'essential') return true;
    return !!state[category];
  }

  // Intercept & Gate Meta Pixel (fbq) calls prior to consent
  var originalFbq = window.fbq;
  window.fbq = function () {
    if (!hasConsent('marketing')) {
      // Intentionally drop or block tracking calls without consent
      return;
    }
    if (typeof originalFbq === 'function') {
      originalFbq.apply(window, arguments);
    } else {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    }
  };

  // UI: Build Floating Banner
  function renderBanner() {
    if (document.getElementById('mos-consent-banner') || getConsent()) return;

    var banner = document.createElement('div');
    banner.id = 'mos-consent-banner';
    banner.className = 'mos-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie and Privacy Consent');

    banner.innerHTML = [
      '<div class="mos-consent-content">',
      '  <div class="mos-consent-title"><span>■</span> Privacy & Cookie Preferences</div>',
      '  <p class="mos-consent-desc">',
      '    We use essential local storage for biometric-free system operation. Optional analytics and marketing cookies require your explicit consent. No health or facial data is shared with third parties. Review our <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms.html" target="_blank" rel="noopener">Terms</a>.',
      '  </p>',
      '</div>',
      '<div class="mos-consent-actions">',
      '  <button type="button" class="mos-btn mos-btn-accept" id="mos-consent-accept-all">Accept All</button>',
      '  <button type="button" class="mos-btn mos-btn-essential" id="mos-consent-essential-only">Essential Only</button>',
      '  <button type="button" class="mos-btn mos-btn-pref" id="mos-consent-open-prefs">Customize</button>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);

    document.getElementById('mos-consent-accept-all').addEventListener('click', function () {
      saveConsent({ essential: true, analytics: true, marketing: true });
      closeBanner();
    });

    document.getElementById('mos-consent-essential-only').addEventListener('click', function () {
      saveConsent({ essential: true, analytics: false, marketing: false });
      closeBanner();
    });

    document.getElementById('mos-consent-open-prefs').addEventListener('click', function () {
      openPreferencesModal();
    });
  }

  function closeBanner() {
    var banner = document.getElementById('mos-consent-banner');
    if (banner && banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  }

  // UI: Build Preferences Modal
  function openPreferencesModal() {
    var existingModal = document.getElementById('mos-pref-modal-backdrop');
    if (existingModal) return;

    var state = getConsent() || { essential: true, analytics: false, marketing: false };

    var backdrop = document.createElement('div');
    backdrop.id = 'mos-pref-modal-backdrop';
    backdrop.className = 'mos-modal-backdrop';

    backdrop.innerHTML = [
      '<div class="mos-pref-modal" role="dialog" aria-modal="true" aria-labelledby="mos-modal-title">',
      '  <div class="mos-pref-header">',
      '    <h3 id="mos-modal-title">Cookie & Privacy Settings</h3>',
      '    <button type="button" class="mos-pref-close" id="mos-pref-close-btn" aria-label="Close">&times;</button>',
      '  </div>',
      '  <div class="mos-pref-group">',
      '    <div class="mos-pref-group-head">',
      '      <span class="mos-pref-group-title">Essential Operations</span>',
      '      <span class="mos-pref-badge">ALWAYS ACTIVE</span>',
      '    </div>',
      '    <p>Required for system calculators, local offline state, and security protocols. Cannot be disabled.</p>',
      '  </div>',
      '  <div class="mos-pref-group">',
      '    <div class="mos-pref-group-head">',
      '      <span class="mos-pref-group-title">Performance & Analytics</span>',
      '      <label class="mos-pref-switch">',
      '        <input type="checkbox" id="mos-pref-analytics" ' + (state.analytics ? 'checked' : '') + '>',
      '      </label>',
      '    </div>',
      '    <p>Allows aggregated, anonymized page performance telemetry to help us refine tool calculation speeds and crash diagnostics.</p>',
      '  </div>',
      '  <div class="mos-pref-group">',
      '    <div class="mos-pref-group-head">',
      '      <span class="mos-pref-group-title">Marketing & Attribution</span>',
      '      <label class="mos-pref-switch">',
      '        <input type="checkbox" id="mos-pref-marketing" ' + (state.marketing ? 'checked' : '') + '>',
      '      </label>',
      '    </div>',
      '    <p>Permits Meta Pixel attribution to measure acquisition without transmitting sensitive health metrics or biometric identifiers.</p>',
      '  </div>',
      '  <div class="mos-modal-footer">',
      '    <button type="button" class="mos-btn mos-btn-essential" id="mos-pref-save-essential">Reject Non-Essential</button>',
      '    <button type="button" class="mos-btn mos-btn-accept" id="mos-pref-save-selected">Save Preferences</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(backdrop);

    function closeModal() {
      if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }

    document.getElementById('mos-pref-close-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });

    document.getElementById('mos-pref-save-essential').addEventListener('click', function () {
      saveConsent({ essential: true, analytics: false, marketing: false });
      closeModal();
      closeBanner();
    });

    document.getElementById('mos-pref-save-selected').addEventListener('click', function () {
      var analytics = document.getElementById('mos-pref-analytics').checked;
      var marketing = document.getElementById('mos-pref-marketing').checked;
      saveConsent({ essential: true, analytics: analytics, marketing: marketing });
      closeModal();
      closeBanner();
    });
  }

  // Public APIs
  window.mosGetConsent = getConsent;
  window.mosHasConsent = hasConsent;
  window.openMosCookiePreferences = openPreferencesModal;

  // Initialize on DOM Ready
  function init() {
    ensureCSS();
    if (!getConsent()) {
      renderBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
