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
    if (p.durationDays > 0) {
      var expiry = new Date();
      expiry.setDate(expiry.getDate() + (durationDays || p.durationDays));
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
        if (overlay) overlay.classList.add('visible');
        return null;
      });
    },

    /** Bind overlay form events for code entry */
    initOverlay: function(productId) {
      var overlay = document.getElementById('subOverlay') || document.getElementById('poOverlay');
      if (!overlay) return;
      if (overlay.getAttribute('data-mos-init')) return;
      overlay.setAttribute('data-mos-init', '1');
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
    }
  };
})();
