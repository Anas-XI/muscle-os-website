/**
 * Muscle OS Access Control — shared auth module
 * Phase A: client-side manifest (hashed codes)
 * Phase B: Cloudflare Worker + JWT (server-validated)
 *
 * Include this script on any paywalled page, then:
 *   MosAccess.checkOrShow('training_tool')
 *     .then(access => { if (access) { /* init tool */ } });
 */
(function(){
  'use strict';

  var CONFIG = {
    manifestUrl: 'assets/data/access-codes.json',
    apiBase: 'https://muscleos-access-control.muscleos.workers.dev',  // Phase B Worker
    whitelistEmail: 'ANASSTEM2025@GMAIL.COM',
    products: {
      training_tool:         { key: 'mos_subscription', durationDays: 30, label: 'Training Tool' },
      tdee_adaptive_engine:  { key: 'mos_subscription', durationDays: 30, label: 'TDEE Adaptive Engine' },
      training_book:         { key: 'mos_book_training', durationDays: 0, label: 'Training Book' },
      nutrition_book:        { key: 'mos_book_nutrition', durationDays: 0, label: 'Nutrition Book' }
    }
  };

  function getProduct(id) { return CONFIG.products[id]; }

  /* ---- SHA-256 (works in HTTPS) ---- */
  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
      .then(function(buf){
        return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      });
  }

  /* ---- Fetch manifest with session cache ---- */
  var manifestPromise = null;
  function getManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(CONFIG.manifestUrl + '?v=' + Date.now())
        .then(function(r){ return r.json(); })
        .then(function(d){
          try { sessionStorage.setItem('mos_manifest', JSON.stringify(d)); } catch(e){}
          return d;
        })
        .catch(function(){
          // Try session cache on network failure
          var cached = sessionStorage.getItem('mos_manifest');
          return cached ? JSON.parse(cached) : { hashes: {}, whitelist: [] };
        });
    }
    return manifestPromise;
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

  /* ---- Save access to localStorage ---- */
  function saveAccess(productId, code, plan, durationDays) {
    var p = getProduct(productId);
    if (!p) return;
    var data = { active: true, code: code, plan: plan };
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

  /* ---- Phase A: Verify code against local manifest ---- */
  function verifyLocal(code, productId) {
    var normalized = code.trim().toUpperCase();

    // Whitelist email
    if (normalized === CONFIG.whitelistEmail) {
      return Promise.resolve({ valid: true, plan: 'master', durationDays: 30 });
    }

    return sha256(normalized).then(function(hash){
      return getManifest().then(function(manifest){
        var record = manifest.hashes[hash];
        if (!record) return { valid: false, reason: 'invalid_code' };
        if (record.products !== 'all' && record.products.indexOf(productId) === -1) {
          return { valid: false, reason: 'wrong_product' };
        }
        if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) {
          return { valid: false, reason: 'code_expired' };
        }
        return { valid: true, plan: record.plan, durationDays: record.durationDays };
      });
    });
  }

  /* ---- Phase B: Verify code via Cloudflare Worker ---- */
  function verifyRemote(code, productId) {
    return fetch(CONFIG.apiBase + '/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, productId: productId })
    }).then(function(r){ return r.json(); }).then(function(data){
      if (!data.valid) return { valid: false, reason: data.error };
      // Save token-backed access
      var p = getProduct(productId);
      var stored = { active: true, plan: data.plan, code: code, token: data.token };
      if (productId.indexOf('book') !== -1) {
        stored.book = productId === 'training_book' ? 'training' : 'nutrition';
      } else {
        stored.expiry = data.expiresAt;
      }
      localStorage.setItem(p.key, JSON.stringify(stored));
      return { valid: true, plan: data.plan, durationDays: data.durationDays };
    }).catch(function(){
      return { valid: false, reason: 'network_error' };
    });
  }

  /* ---- Revalidate stored token server-side ---- */
  function revalidateAccess(productId) {
    if (!CONFIG.apiBase) return Promise.resolve(null);
    var stored = getStoredAccess(productId);
    if (!stored || !stored.token) return Promise.resolve(null);
    return fetch(CONFIG.apiBase + '/api/check-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: stored.token, productId: productId })
    }).then(function(r){ return r.json(); }).then(function(data){
      return data.valid ? stored : null;
    }).catch(function(){
      return stored; // fall back to localStorage if Worker unreachable
    });
  }

  /* ---- Public API ---- */
  window.MosAccess = {

    /** Product configuration */
    config: CONFIG,

    /** Verify a code against backend (Worker if available, else manifest) */
    verifyCode: function(code, productId) {
      return CONFIG.apiBase ? verifyRemote(code, productId) : verifyLocal(code, productId);
    },

    /** Get stored access from localStorage */
    getAccess: function(productId) {
      return getStoredAccess(productId);
    },

    /** Full check: first try Worker revalidation, then localStorage, then null */
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
            MosAccess.grantAccess(productId, code, result.plan, result.durationDays);
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

    /** Grant access (for Phase A local verification) */
    grantAccess: function(productId, code, plan, durationDays) {
      saveAccess(productId, code, plan, durationDays);
    },

    /** Revoke access */
    revokeAccess: function(productId) {
      var p = getProduct(productId);
      if (p) localStorage.removeItem(p.key);
    }
  };
})();
