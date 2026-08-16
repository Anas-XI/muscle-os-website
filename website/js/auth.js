(function() {
 var SUB_KEY = 'mos_subscription';
 var GS_KEY = 'mos_google_session';
 var OWNER_EMAIL = 'ANASSTEM2025@GMAIL.COM';
 var API_BASE = 'https://muscleos-access-control.muscleos.workers.dev';
 var GOOGLE_CLIENT_ID = '22648364020234-gldbcsfl16cftjvd11o9iqpalesi1hsn.apps.googleusercontent.com';

 // Inject Google GSI Library if not present
 if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
 var script = document.createElement('script');
 script.src = 'https://accounts.google.com/gsi/client';
 script.async = true;
 script.defer = true;
 document.head.appendChild(script);
 }

 // Inject styles for the auth modal
 var style = document.createElement('style');
 style.textContent = `
 .mos-auth-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10,10,15,0.85); backdrop-filter: blur(12px); z-index: 99999; display: none; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', sans-serif; }
 .mos-auth-modal { background: #1E2027; border: 1px solid rgba(250,250,248,0.1); border-radius: 20px; padding: 40px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
 .mos-auth-modal h2 { color: #FAFAF8; margin: 0 0 10px 0; font-size: 24px; font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 1px; }
 .mos-auth-modal p { color: rgba(250,250,248,0.65); margin: 0 0 30px 0; font-size: 15px; line-height: 1.5; }
 .mos-auth-code-row { display: flex; gap: 10px; margin-bottom: 20px; }
 .mos-auth-code-input { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(250,250,248,0.1); border-radius: 8px; padding: 12px 16px; color: #FAFAF8; font-family: 'JetBrains Mono', monospace; font-size: 16px; text-transform: uppercase; outline: none; transition: border-color 0.2s; }
 .mos-auth-code-input:focus { border-color: #FAFAF8; }
 .mos-auth-verify-btn { background: #FAFAF8; color: #0A0A0F; border: none; border-radius: 8px; padding: 0 24px; font-weight: 600; cursor: pointer; transition: transform 0.1s, opacity 0.2s; }
 .mos-auth-verify-btn:active { transform: scale(0.96); }
 .mos-auth-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
 .mos-auth-divider { display: flex; align-items: center; text-align: center; color: rgba(250,250,248,0.3); font-size: 12px; margin: 25px 0; text-transform: uppercase; letter-spacing: 1px; }
 .mos-auth-divider::before, .mos-auth-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(250,250,248,0.1); }
 .mos-auth-divider:not(:empty)::before { margin-right: 15px; }
 .mos-auth-divider:not(:empty)::after { margin-left: 15px; }
 .mos-auth-error { color: #ff4a4a; font-size: 13px; margin-top: 10px; display: none; }
 .mos-auth-success { color: #4aff8a; font-size: 13px; margin-top: 10px; display: none; }
 .mos-trial-banner { position: fixed; bottom: 20px; right: 20px; background: #1E2027; border: 1px solid rgba(250,250,248,0.2); padding: 12px 20px; border-radius: 12px; color: #FAFAF8; z-index: 99998; font-family: 'Inter', sans-serif; font-size: 14px; display: none; box-shadow: 0 10px 20px rgba(0,0,0,0.3); align-items: center; gap: 15px; }
 .mos-trial-banner button { background: none; border: none; color: rgba(250,250,248,0.5); cursor: pointer; font-size: 16px; padding: 0; display: flex; }
 .mos-trial-banner button:hover { color: #FAFAF8; }
 .mos-trial-banner span { font-weight: 600; color: #4aff8a; }
 `;
 document.head.appendChild(style);

 // Inject Modal HTML
 var overlay = document.createElement('div');
 overlay.className = 'mos-auth-overlay';
 overlay.id = 'mosAuthOverlay';
 overlay.innerHTML = `
 <div class="mos-auth-modal">
 <h2 id="mosAuthTitle">Sign In to Continue</h2>
 <p id="mosAuthDesc">Sign in with Google to start your 14-day free trial, or access your purchased tools.</p>
 
 <div id="mosAuthStep1">
 <div id="mosGoogleSignInBtn" style="display:flex;justify-content:center"></div>
 <div class="mos-auth-error" id="mosAuthStep1Error">Sign-in failed. Please try again.</div>
 </div>

 <div id="mosAuthStep2" style="display:none">
 <div class="mos-auth-divider">Or enter access code</div>
 <div class="mos-auth-code-row">
 <input type="text" class="mos-auth-code-input" id="mosSubCode" placeholder="MOS-XXXX-XXXX" autocomplete="off">
 <button class="mos-auth-verify-btn" id="mosSubVerify">Verify</button>
 </div>
 <div class="mos-auth-error" id="mosSubError">Invalid code.</div>
 <div class="mos-auth-success" id="mosSubSuccess">Access granted! Reloading...</div>
 <a href="#" id="mosSignOut" style="color:rgba(250,250,248,0.5); font-size: 13px; text-decoration: underline;">Sign Out</a>
 </div>
 </div>
 `;
 document.body.appendChild(overlay);

 // Inject Trial Banner
 var banner = document.createElement('div');
 banner.className = 'mos-trial-banner';
 banner.id = 'mosTrialBanner';
 banner.innerHTML = `
 <div>You have <span id="mosTrialDays">14</span> days left in your free trial.</div>
 <button onclick="document.getElementById('mosTrialBanner').style.display='none'">✕</button>
 `;
 document.body.appendChild(banner);

function getGs(){ try { var g = JSON.parse(localStorage.getItem(GS_KEY)); return (g && g.session) ? g : null; } catch(e){ return null; } }
  function showErr(id, msg){ var el = document.getElementById(id); el.style.display = 'block'; el.textContent = msg; }

  // Allow the page's own auth gate (tool IIFE) to declare the active product and local access state.
  function getGate(){
    try {
      if (window.__MOS_GATE__) return window.__MOS_GATE__() || null;
    } catch(e){}
    return null;
  }
  function getProductId(){
    try { if (window.__MOS_PRODUCT__) return window.__MOS_PRODUCT__; } catch(e){}
    return 'all_access';
  }

  function hasProductSub(subscriptions, productId){
    for (var i = 0; i < subscriptions.length; i++) {
      var s = subscriptions[i];
      if (!s) continue;
      if (s.products === 'all') return true;
      if (Array.isArray(s.products) && s.products.indexOf(productId) !== -1) return true;
    }
    return false;
  }

  function checkAccess() {
  var gate = getGate();
  if (gate && gate.active) {
  // Valid cached/verified subscription for this page's product — no gate needed.
  document.getElementById('mosAuthOverlay').style.display = 'none';
  var oldOv = document.getElementById('subOverlay');
  if (oldOv) oldOv.style.display = 'none';
  return;
  }
  var isHub = !!(gate && gate.hub);
  var productId = getProductId();
  var gs = getGs();
  if (!gs) {
  // No Google session: if the page has its own code-entry overlay (tool paywall),
  // leave it visible instead of stacking our modal on top; otherwise show ours.
  var subOverlay = document.getElementById('subOverlay');
  if (subOverlay) return;
  document.getElementById('mosAuthOverlay').style.display = 'flex';
  initGsi();
  return;
  }

  fetch(API_BASE + '/api/check-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session: gs.session })
  }).then(r => r.json()).then(data => {
  if (data && data.valid) {
  var isProTool = !window.location.pathname.includes('/books/');
  var hasActiveSub = data.subscriptions && hasProductSub(data.subscriptions, productId);

  if (isProTool && !isHub && data.trialDaysRemaining > 0) {
  // In trial and on a pro tool page (trial does not apply inside the OMNI HUB)
  document.getElementById('mosAuthOverlay').style.display = 'none';
  var bannerEl = document.getElementById('mosTrialBanner');
  document.getElementById('mosTrialDays').innerText = data.trialDaysRemaining;
  bannerEl.style.display = 'flex';
  } else if (hasActiveSub) {
  document.getElementById('mosAuthOverlay').style.display = 'none';
  } else {
  document.getElementById('mosAuthTitle').innerText = isProTool ? 'Trial Expired' : 'Access Restricted';
  document.getElementById('mosAuthDesc').innerText = isProTool ? 'Your 14-day free trial has expired. Please enter an access code to continue.' : 'You need a verified access code to view this content.';
  document.getElementById('mosAuthStep1').style.display = 'none';
  document.getElementById('mosAuthStep2').style.display = 'block';
  document.getElementById('mosAuthOverlay').style.display = 'flex';
  }
  } else {
  // Invalid session
  localStorage.removeItem(GS_KEY);
  document.getElementById('mosAuthOverlay').style.display = 'flex';
  initGsi();
  }
  }).catch(e => {
  if (gate && !gate.active) {
  document.getElementById('mosAuthOverlay').style.display = 'flex';
  initGsi();
  }
  });
  }

 function finishGoogle(data) {
 localStorage.setItem(GS_KEY, JSON.stringify({ session: data.session, email: data.email, name: data.name || '', ts: Date.now() }));
 window.location.reload();
 }

 function initGsi(){
 var host = document.getElementById('mosGoogleSignInBtn');
 if(!host || host.getAttribute('data-gsi')) return;
 host.setAttribute('data-gsi', '1');
 
 if(typeof google === 'undefined' || !google.accounts || !google.accounts.id){ 
 setTimeout(initGsi, 300); 
 return; 
 }
 
 google.accounts.id.initialize({
 client_id: GOOGLE_CLIENT_ID,
 callback: function(resp){
 if(!resp || !resp.credential){ showErr('mosAuthStep1Error', 'Google sign-in failed.'); return; }
 fetch(API_BASE + '/api/auth/google', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ token: resp.credential })
 }).then(r => r.json()).then(data => {
 if(data && data.valid) finishGoogle(data);
 else showErr('mosAuthStep1Error', 'Google sign-in failed.');
 }).catch(e => {
 showErr('mosAuthStep1Error', 'Network error. Please try again.');
 });
 }
 });
 google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', width: 280 });
 }

 document.getElementById('mosSubVerify').addEventListener('click', function(){
 var btn = this;
 var code = document.getElementById('mosSubCode').value.trim().toUpperCase();
 if(!code){ showErr('mosSubError', 'Invalid code.'); return; }
 
 btn.disabled = true;
 btn.textContent = 'Checking...';
 var gs = getGs();
 
fetch(API_BASE + '/api/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: code, productId: getProductId(), session: gs ? gs.session : undefined }) // Product-aware: page gate declares its product, fallback 'all_access'
  }).then(r => r.json()).then(data => {
  if(data && data.valid){
  document.getElementById('mosSubError').style.display = 'none';
  document.getElementById('mosSubSuccess').style.display = 'block';
  setTimeout(() => window.location.reload(), 1500);
  } else {
  var msg = 'Invalid code. Please check and try again.';
  if(data && data.error === 'code_used_by_other') msg = 'This code is already linked to another account.';
  if(data && data.error === 'code_expired') msg = 'This code has expired.';
  if(data && data.error === 'wrong_product') msg = 'This code does not grant access to this product.';
  showErr('mosSubError', msg);
  btn.disabled = false;
  btn.textContent = 'Verify';
  }
  }).catch(e => {
 showErr('mosSubError', 'Network error.');
 btn.disabled = false;
 btn.textContent = 'Verify';
 });
 });

 document.getElementById('mosSignOut').addEventListener('click', function(e) {
 e.preventDefault();
 localStorage.removeItem(GS_KEY);
 window.location.reload();
 });

// Hide the old per-tool overlay only when we're showing our own gate over it.
  var oldOverlay = document.getElementById('subOverlay');
  if (oldOverlay) {
    try {
      var gate = getGate();
      if (!gate || !gate.active) oldOverlay.style.display = 'none';
    } catch(e){ oldOverlay.style.display = 'none'; }
  }

 // Start the check
 checkAccess();
})();
