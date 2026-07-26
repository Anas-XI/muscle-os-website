/**
 * Muscle OS Access Control — shared auth module
 *
 * Include this script on any paywalled page, then:
 *   MosAccess.checkOrShow('training_tool')
 *     .then(access => { if (access) { /* init tool */ } });
 */
(function(){
  'use strict';

  var CONFIG = {
    apiBase: 'https://muscleos-access-control.muscleos.workers.dev',
    products: {
      training_tool:         { key: 'mos_subscription', durationDays: 30, label: 'Training Tool' },
      tdee_adaptive_engine:  { key: 'mos_subscription', durationDays: 30, label: 'TDEE Adaptive Engine' },
      training_book:         { key: 'mos_book_training', durationDays: 0, label: 'Training Book' },
      nutrition_book:        { key: 'mos_book_nutrition', durationDays: 0, label: 'Nutrition Book' }
    }
  };

  function getProduct(id) { return CONFIG.products[id]; }

  function getGoogleClientId() {
    var meta = document.querySelector('meta[name="google-signin-client_id"]');
    return meta ? meta.getAttribute('content') : '';
  }

  /* ---- Check stored localStorage access ---- */
  function getStoredAccess(productId) {
    var p = getProduct(productId);
    if (!p) return null;
    try {
      var stored = JSON.parse(localStorage.getItem(p.key));
      if (!stored || !stored.active) return null;
      if (stored.expiry && new Date(stored.expiry) < new Date()) {
        localStorage.removeItem(p.key);
        return null;
      }
      return stored;
    } catch(e) { return null; }
  }

  /* ---- Save access to localStorage (token-backed) ---- */
  function saveAccess(productId, code, plan, durationDays, token) {
    var p = getProduct(productId);
    if (!p) return;
    var data = { active: true, code: code, plan: plan, token: token };
    var dd = durationDays != null ? durationDays : p.durationDays;
    if (dd > 0) {
      var expiry = new Date();
      expiry.setDate(expiry.getDate() + dd);
      data.expiry = expiry.toISOString().split('T')[0];
    }
    if (productId.indexOf('book') !== -1) {
      data.book = productId === 'training_book' ? 'training' : 'nutrition';
    }
    localStorage.setItem(p.key, JSON.stringify(data));
  }

  /* ---- Verify code via Cloudflare Worker ---- */
  function verifyRemote(code, productId) {
    return fetch(CONFIG.apiBase + '/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, productId: productId })
    }).then(function(r){ return r.json(); }).then(function(data){
      if (!data.valid) return { valid: false, reason: data.error };
      saveAccess(productId, code, data.plan, data.durationDays, data.token);
      return { valid: true, plan: data.plan, durationDays: data.durationDays };
    }).catch(function(){
      return { valid: false, reason: 'network_error' };
    });
  }

  /* ---- Revalidate stored token server-side ---- */
  function revalidateAccess(productId) {
    var stored = getStoredAccess(productId);
    if (!stored || !stored.token) return Promise.resolve(null);
    return fetch(CONFIG.apiBase + '/api/check-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: stored.token, productId: productId })
    }).then(function(r){ return r.json(); }).then(function(data){
      return data.valid ? stored : null;
    }).catch(function(){
      return stored;
    });
  }

  /* ---- Public API ---- */
  window.MosAccess = {

    /** Product configuration */
    config: CONFIG,

    /** Verify a code against the Worker backend */
    verifyCode: function(code, productId) {
      return verifyRemote(code, productId);
    },

    /** Get stored access from localStorage */
    getAccess: function(productId) {
      return getStoredAccess(productId);
    },

    /** Full check: first try Worker revalidation, then localStorage */
    checkAccess: function(productId) {
      return revalidateAccess(productId).then(function(access){
        return access || Promise.resolve(getStoredAccess(productId));
      });
    },

    /** Set ARIA attributes and manage focus for an overlay */
    _setupOverlayAria: function(overlay, productId, focusOnShow) {
      if (!overlay) return;
      if (overlay.getAttribute('role') !== 'dialog') {
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Access code required for ' + (getProduct(productId) ? getProduct(productId).label : productId));
      }
      var codeInput = document.getElementById('subCode') || document.getElementById('poCode');
      if (focusOnShow && codeInput) setTimeout(function(){ codeInput.focus(); }, 100);
      var errorEl = document.getElementById('subError') || document.getElementById('poError');
      if (errorEl && !errorEl.getAttribute('role')) { errorEl.setAttribute('role', 'alert'); }
      var successEl = document.getElementById('subSuccess') || document.getElementById('poSuccess');
      if (successEl && !successEl.getAttribute('aria-live')) { successEl.setAttribute('aria-live', 'polite'); }
    },

    /** Check access AND show/hide overlay. Returns access object or null. */
    checkOrShow: function(productId) {
      var overlay = document.getElementById('subOverlay') || document.getElementById('poOverlay');
      var successEl = document.getElementById('subSuccess') || document.getElementById('poSuccess');
      var errorEl = document.getElementById('subError') || document.getElementById('poError');

      return this.checkAccess(productId).then(function(access){
        if (access) {
          if (overlay) overlay.classList.remove('visible');
          return access;
        }
        if (overlay) {
          overlay.classList.add('visible');
          MosAccess._setupOverlayAria(overlay, productId, true);
        }
        return null;
      });
    },

    /** Bind overlay form events for code entry */
    initOverlay: function(productId) {
      var overlay = document.getElementById('subOverlay') || document.getElementById('poOverlay');
      if (!overlay) return;
      if (overlay.getAttribute('data-mos-init')) return;
      overlay.setAttribute('data-mos-init', '1');
      MosAccess._setupOverlayAria(overlay, productId, false);
      var form = document.getElementById('subForm') || document.getElementById('poForm');
      var codeInput = document.getElementById('subCode') || document.getElementById('poCode');
      var verifyBtn = document.getElementById('subVerify') || document.getElementById('poVerify');
      var errorEl = document.getElementById('subError') || document.getElementById('poError');
      var successEl = document.getElementById('subSuccess') || document.getElementById('poSuccess');

      function doVerify(){
        var code = codeInput ? codeInput.value.trim() : '';
        if (!code) { if (errorEl) errorEl.style.display = 'block'; return; }
        MosAccess.verifyCode(code, productId).then(function(result){
          if (result.valid) {
            if (errorEl) errorEl.style.display = 'none';
            if (successEl) successEl.style.display = 'block';
            setTimeout(function(){ location.reload(); }, 1500);
          } else {
            if (errorEl) errorEl.style.display = 'block';
          }
        });
      }

      if (form) form.addEventListener('submit', function(e){ e.preventDefault(); doVerify(); });
      if (verifyBtn) {
        verifyBtn.addEventListener('click', doVerify);
        verifyBtn.addEventListener('touchend', function(e){ e.preventDefault(); doVerify(); });
      }
    },

    /** Revoke access */
    revokeAccess: function(productId) {
      var p = getProduct(productId);
      if (p) localStorage.removeItem(p.key);
    },

    /* ── Google Auth ── */

    /** Get stored Google session */
    getGoogleSession: function() {
      try {
        var raw = localStorage.getItem('mos_google_session');
        if (!raw) return null;
        var s = JSON.parse(raw);
        return s && s.session ? s : null;
      } catch(e) { return null; }
    },

    /** Check session validity with Worker */
    checkGoogleSession: function() {
      var s = MosAccess.getGoogleSession();
      if (!s) return Promise.resolve(null);
      return fetch(CONFIG.apiBase + '/api/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: s.session })
      }).then(function(r){ return r.json(); }).then(function(data){
        if (data.valid) return s;
        localStorage.removeItem('mos_google_session');
        return null;
      }).catch(function(){
        return s;
      });
    },

    /** Initialize Google Sign-In button in a container element */
    initGoogleAuth: function(containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      if (container.getAttribute('data-google-init')) return;
      container.setAttribute('data-google-init', '1');

      if (typeof google === 'undefined' || !google.accounts) {
        container.innerHTML = '<p style="color:rgba(250,250,248,.3);font-size:.8rem">Loading Google Sign-In...</p>';
        return;
      }

      google.accounts.id.initialize({
        client_id: getGoogleClientId() || 'NOT_CONFIGURED',
        callback: function(response) {
          var idToken = response.credential;
          fetch(CONFIG.apiBase + '/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
          }).then(function(r){ return r.json(); }).then(function(data){
            if (data.valid) {
              localStorage.setItem('mos_google_session', JSON.stringify({
                session: data.session,
                email: data.email,
                name: data.name,
                ts: Date.now()
              }));
              location.reload();
            } else {
              container.innerHTML = '<p style="color:#f44336;font-size:.8rem">Google verification failed. Please try again.</p>';
            }
          }).catch(function(){
            container.innerHTML = '<p style="color:#f44336;font-size:.8rem">Network error. Please try again.</p>';
          });
        }
      });

      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: container.offsetWidth > 300 ? 300 : container.offsetWidth
      });
    },

    /** Gate the page: Google sign-in or content. CSS defaults: gate visible, content hidden. */
    requireGoogleAuth: function(productId, callback) {
      var gate = document.getElementById('googleGate');
      var landing = document.getElementById('contentLanding');
      var main = document.getElementById('contentMain');
      var overlay = document.getElementById('subOverlay') || document.getElementById('poOverlay');

      if (!gate) { if (callback) callback(true); return; }

      MosAccess.checkGoogleSession().then(function(session) {
        if (!session) {
          MosAccess.initGoogleAuth('googleSignIn');
          if (callback) callback(false);
          return;
        }

        // Session valid — hide gate, show appropriate content
        gate.classList.add('gate-hidden');

        if (!productId) {
          if (landing) landing.style.display = 'block';
          if (main) main.classList.add('main-visible');
          if (callback) callback(true);
          return;
        }

        // Has product ID — verify subscription
        MosAccess.checkAccess(productId).then(function(access) {
          if (access) {
            if (overlay) overlay.classList.remove('visible');
            if (landing) landing.style.display = 'block';
            if (main) main.classList.add('main-visible');
            if (callback) callback(true);
            return;
          }
          // Not subscribed — show landing + code entry overlay
          if (landing) landing.style.display = 'block';
          if (overlay) { overlay.classList.add('visible'); MosAccess.initOverlay(productId); }
          if (callback) callback(false);
        });
      });
    }
  };
})();

/* ── Global Google callback (for async GIS load) ── */
window.mosGoogleInit = function() {
  // Re-init any gate containers that were rendered before GIS loaded
  var containers = document.querySelectorAll('[id^="googleSignIn"]');
  containers.forEach(function(c) {
    if (c.getAttribute('data-google-init')) return;
    MosAccess.initGoogleAuth(c.id);
  });
};
