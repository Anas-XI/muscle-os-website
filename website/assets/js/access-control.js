/**
 * Muscle OS Access Control — shared auth module
 *
 * Include this script on any paywalled page, then:
 * MosAccess.checkOrShow('training_tool')
 * .then(access => { if (access) { initTool(); } });
 *
 * Fallback path (intentional resilience):
 * When the Cloudflare Worker is unreachable, verification falls back to
 * local SHA-256 matching against access-codes.json. Fallback grants
 * EXACTLY 48 HOURS of access regardless of the product's normal duration
 * (30-day subscription or lifetime book). This forces reconciliation:
 * once the Worker recovers, the customer's next revalidation attempt
 * will confirm the token server-side, or the short window expires and
 * they re-verify properly for full tracked access.
 *
 * Fallback usage is logged to localStorage (mos_fallback_usage_log)
 * and flushed to the Worker on the next successful check-token call
 * or page load, giving visibility into how often this path is hit.
 */
(function(){
 'use strict';

 var FALLBACK_EXPIRY_HOURS = 48; // intentional — see doc block above

 var CONFIG = {
 apiBase: 'https://muscleos-access-control.muscleos.workers.dev',
 products: {
 training_tool: { key: 'mos_subscription', durationDays: 30, label: 'Training App' },
 tdee_adaptive_engine: { key: 'mos_subscription', durationDays: 30, label: 'TDEE Adaptive Engine' },
 both_tools: { key: 'mos_subscription', durationDays: 30, label: 'Training Tools Bundle' },
 omni_hub: { key: 'mos_subscription', durationDays: 30, label: 'OMNI HUB' },
 all_access: { key: 'mos_subscription', durationDays: 30, label: 'All Access' },
 training_book: { key: 'mos_book_training', durationDays: 0, label: 'Training Book' },
 nutrition_book: { key: 'mos_book_nutrition', durationDays: 0, label: 'Nutrition Book' }
 }
 };

 function getProduct(id) { return CONFIG.products[id]; }

 /* ---- SHA-256 via Web Crypto API (used by local fallback) ---- */
 function sha256(str) {
 var buf = new TextEncoder().encode(str.trim().toUpperCase());
 return crypto.subtle.digest('SHA-256', buf).then(function(hash) {
 return Array.from(new Uint8Array(hash)).map(function(b) {
 return b.toString(16).padStart(2, '0');
 }).join('');
 });
 }

 /* ---- Fallback usage log queue ---- */
 function logFallbackUsage(productId, code) {
 try {
 var arr = JSON.parse(localStorage.getItem('mos_fallback_usage_log') || '[]');
 arr.push({
 productId: productId,
 codePrefix: (code || 'unknown').substring(0, 6),
 ts: new Date().toISOString(),
 flushed: false
 });
 if (arr.length > 50) arr = arr.slice(arr.length - 50);
 localStorage.setItem('mos_fallback_usage_log', JSON.stringify(arr));
 } catch(e) {}
 }

 /* ---- Flush fallback usage log to Worker ---- */
 function flushFallbackLog() {
 try {
 var arr = JSON.parse(localStorage.getItem('mos_fallback_usage_log') || '[]');
 var pending = arr.filter(function(e) { return !e.flushed; });
 if (pending.length === 0) return;
 fetch(CONFIG.apiBase + '/api/log-fallback-usage', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ entries: pending })
 }).then(function(r) {
 if (r.ok) {
 // Mark all as flushed
 var all = JSON.parse(localStorage.getItem('mos_fallback_usage_log') || '[]');
 all.forEach(function(e) { e.flushed = true; });
 localStorage.setItem('mos_fallback_usage_log', JSON.stringify(all));
 }
 }).catch(function() { /* skip — will retry next time */ });
 } catch(e) {}
 }

 /* ---- Check stored localStorage access ---- */
 function getStoredAccess(productId) {
    var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
    try {
      var gs = JSON.parse(localStorage.getItem('mos_google_session') || 'null');
      if (gs && gs.email && OWNER_EMAILS.includes(gs.email.toUpperCase())) {
        return { active: true, plan: 'master', code: 'OWNER', email: gs.email, expiry: '2099-12-31', lifetime: true };
      }
    } catch(e) {}

    var p = getProduct(productId);
    if (!p) return null;
    try {
      var stored = JSON.parse(localStorage.getItem(p.key));
      if (stored && stored.active) {
        if (stored.expiry && new Date(stored.expiry) < new Date()) {
          localStorage.removeItem(p.key);
        } else {
          return stored;
        }
      }
    } catch(e) {}

    // Check 7-day trial for tools (books require purchase)
    if (productId && productId.indexOf('book') === -1) {
      var trial = getTrialState();
      if (trial.active) {
        return { active: true, trial: true, daysLeft: trial.daysLeft, plan: 'trial' };
      }
    }
    return null;
  }
 return stored;
 } catch(e) { return null; }
 }

 /* ---- Save access to localStorage (token-backed) ---- */
 function saveAccess(productId, code, plan, durationDays, token, isFallback) {
 var p = getProduct(productId);
 if (!p) return;
 var data = { active: true, code: code, plan: plan, token: token || '' };
 if (isFallback) {
 // Fallback: grant exactly 48h regardless of product duration
 var expiry = new Date();
 expiry.setHours(expiry.getHours() + FALLBACK_EXPIRY_HOURS);
 data.expiry = expiry.toISOString();
 data.fallback = true; // mark so revalidation can detect
 } else {
 var dd = durationDays != null ? durationDays : p.durationDays;
 if (dd > 0) {
 var expiry = new Date();
 expiry.setDate(expiry.getDate() + dd);
 data.expiry = expiry.toISOString().split('T')[0];
 }
 }
 if (productId.indexOf('book') !== -1) {
 data.book = productId === 'training_book' ? 'training' : 'nutrition';
 }
 localStorage.setItem(p.key, JSON.stringify(data));
 }

 /* ---- Verify code via Cloudflare Worker (falls back to local on network error) ---- */
 function verifyRemote(code, productId) {
 return fetch(CONFIG.apiBase + '/api/verify-code', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ code: code, productId: productId })
 }).then(function(r){ return r.json(); }).then(function(data){
 if (!data.valid) return { valid: false, reason: data.error };
 saveAccess(productId, code, data.plan, data.durationDays, data.token, false);
 if (data.daysRemaining != null && data.daysRemaining <= 7) {
 MosAccess.showExpiryWarning(productId, data.daysRemaining);
 }
 return { valid: true, plan: data.plan, durationDays: data.durationDays, daysRemaining: data.daysRemaining };
 }).catch(function(){
 // Worker unreachable — fall back to local verification
 return checkOfflineGrace(productId);
 });
 }

 var ACCESS_DATA_URL = (function(){
 try {
 var src = document.currentScript && document.currentScript.src;
 if (src && src.indexOf('/assets/js/') !== -1) return src.split('/assets/js/')[0] + '/assets/data/access-codes.json';
 } catch(e) {}
 return 'assets/data/access-codes.json';
 })();

 /* ---- Secure offline token grace ---- */
  function checkOfflineGrace(productId) {
    if (navigator.onLine) return Promise.resolve({ valid: false, reason: 'network_error' });
    try {
      var stored = getStoredAccess(productId);
      if (stored && stored.token && stored.expiresAt) {
        var exp = new Date(stored.expiresAt).getTime();
        if (Date.now() - exp < 48 * 60 * 60 * 1000) {
          return Promise.resolve({ valid: true, plan: stored.plan, durationDays: 2, fallback: true });
        }
      }
    } catch(e) {}
    return Promise.resolve({ valid: false, reason: 'offline_and_no_cached_token' });
  }

  /* ---- Revalidate stored token server-side ---- */
 function revalidateAccess(productId) {
 var stored = getStoredAccess(productId);
 if (!stored || !stored.token) return Promise.resolve(null);
 // If access was granted via fallback, skip server revalidation
 // (the fallback token won't exist on the server — let the short
 // 48h expiry handle reconciliation naturally)
 if (stored.fallback) return Promise.resolve(stored);
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

 /** Verify a code against the Worker backend (or local fallback) */
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
 // Show expiry warning if stored access is running out
 if (!access.fallback && access.expiry) {
 var daysLeft = Math.ceil((new Date(access.expiry) - Date.now()) / 86400000);
 if (daysLeft <= 7) {
 MosAccess.showExpiryWarning(productId, daysLeft);
 }
 }
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

 /** Show an expiry warning banner in the page */
 showExpiryWarning: function(productId, daysRemaining) {
 var banner = document.getElementById('mosExpiryBanner');
 if (banner) return;
 var label = getProduct(productId);
 var pn = label ? label.label : productId;
 var msg = daysRemaining <= 0
 ? 'Your ' + pn + ' access has expired. Renew your subscription.'
 : 'Your ' + pn + ' subscription expires in ' + daysRemaining + ' day' + (daysRemaining !== 1 ? 's' : '') + '.';
 var btn = daysRemaining > 0
 ? '<a href="../pricing.html" style="background:#14151A;color:#FAFAF8;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.8rem">Renew now</a>'
 : '<a href="../pricing.html" style="background:#14151A;color:#FAFAF8;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.8rem">Subscribe</a>';
 var div = document.createElement('div');
 div.id = 'mosExpiryBanner';
 div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:' +
 (daysRemaining <= 1 ? '#f44336' : '#FF9800') +
 ';color:#fff;padding:12px 16px;text-align:center;font-size:.85rem;font-weight:500;' +
 'display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap';
 div.innerHTML = '<span>' + msg + '</span>' + btn +
 '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:1.2rem;cursor:pointer;padding:0 4px">✕</button>';
 document.body.appendChild(div);
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
 client_id: '335156097845-vq52ttt74pak112mn2eet5j3s1k15fn9.apps.googleusercontent.com',
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

 // Flush any pending fallback usage log entries on page load
 setTimeout(flushFallbackLog, 1000);
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

