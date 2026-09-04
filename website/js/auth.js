(function() {
 var SUB_KEY = 'mos_subscription';
 var GS_KEY = 'mos_google_session';
 var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
  var OWNER_EMAIL = 'ANASSTEM2025@GMAIL.COM';
 var API_BASE = 'https://muscleos-access-control.muscleos.workers.dev';
 var GOOGLE_CLIENT_ID = '335156097845-vq52ttt74pak112mn2eet5j3s1k15fn9.apps.googleusercontent.com';

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
  <h2 id="mosAuthTitle">Sign In to Muscle OS</h2>
  <p id="mosAuthDesc">Sign in with Google to start your free trial, access your saved programs, or enter an access code.</p>
  
  <div id="mosAuthStep1">
  <div id="mosGoogleSignInBtn" style="display:flex;justify-content:center; min-height:44px;"></div>
  <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin:10px 0 14px; font-size:12px; color:rgba(250,250,248,0.7); cursor:pointer;">
    <input type="checkbox" id="mosStaySignedIn" checked style="accent-color:#F4C93B; width:14px; height:14px; cursor:pointer;">
    <label for="mosStaySignedIn" style="cursor:pointer; margin:0;">Stay signed in</label>
  </div>
  <div style="margin-top:10px; font-size:12px; color:rgba(250,250,248,0.7); text-align:left; display:flex; align-items:flex-start; gap:8px;">
    <input type="checkbox" id="mosAuthConsent" checked style="margin-top:2px; accent-color:#F4C93B; width:14px; height:14px; cursor:pointer;">
    <label for="mosAuthConsent" style="cursor:pointer; line-height:1.4;">I accept the <a href="terms.html" target="_blank" style="color:#F4C93B; text-decoration:underline;">Terms of Service</a> & <a href="privacy.html" target="_blank" style="color:#F4C93B; text-decoration:underline;">Privacy Policy</a>, including fitness health screening.</label>
  </div>
  <div class="mos-auth-error" id="mosAuthStep1Error">Sign-in failed. Please try again.</div>
  </div>

  <div id="mosAuthStep2" style="display:none">
  <div id="mosUserGreeting" style="font-size:13px; color:rgba(250,250,248,0.8); margin-bottom:16px; padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:8px;"></div>
  <div id="mosUserPrograms" style="margin-bottom:20px; text-align:left; display:none;"></div>
  
  <div class="mos-auth-divider">Enter Access Code</div>
  <div class="mos-auth-code-row">
  <input type="text" class="mos-auth-code-input" id="mosSubCode" placeholder="MOS-XXXX-XXXX" autocomplete="off">
  <button class="mos-auth-verify-btn" id="mosSubVerify">Unlock</button>
  </div>
  <div class="mos-auth-error" id="mosSubError">Invalid code.</div>
  <div class="mos-auth-success" id="mosSubSuccess">Access granted! Reloading...</div>
  <div style="margin-top:16px; font-size:13px; display:flex; justify-content:space-between; align-items:center;">
    <a href="order.html" target="_blank" style="color:#F4C93B; text-decoration:underline;">Need a code? Get access</a>
    <a href="#" id="mosSignOut" style="color:rgba(250,250,248,0.5); text-decoration: underline;">Sign Out</a>
  </div>
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
      if (Array.isArray(s.products) && s.products.indexOf('omni_hub') !== -1 && (productId === 'training_tool' || productId === 'tdee_adaptive_engine')) return true;
    }
    return false;
  }

  function checkAccess() {
    // Paywall deactivated for testing
    var mosOv = document.getElementById('mosAuthOverlay');
    if (mosOv) mosOv.style.display = 'none';
    var oldOv = document.getElementById('subOverlay');
    if (oldOv) oldOv.style.display = 'none';
    var gGate = document.getElementById('googleGate');
    if (gGate) gGate.classList.add('gate-hidden');
    var tBanner = document.getElementById('mosTrialBanner');
    if (tBanner) tBanner.style.display = 'none';
    return;
  }

    var isBook = window.location.pathname.includes('/books/');
    var TRIAL_DAYS = 7;
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var trialStart = localStorage.getItem('mos_trial_start');
    if (!trialStart || new Date(trialStart).getTime() < TRIAL_EPOCH) {
      trialStart = new Date().toISOString();
      if (!isBook) {
        localStorage.setItem('mos_trial_start', trialStart);
        localStorage.setItem('mos_tdee_trial_start', trialStart);
      }
    }
    if (!trialStart && !isBook) {
      trialStart = new Date().toISOString();
      localStorage.setItem('mos_trial_start', trialStart);
    }
    var trialDaysRemaining = trialStart ? (TRIAL_DAYS - Math.floor((Date.now() - new Date(trialStart).getTime()) / 86400000)) : 0;
    var isTrialActive = !isBook && trialDaysRemaining > 0;

    if (isTrialActive) {
      // 7-day trial is active: hide all overlays and let user use the tool freely!
      document.getElementById('mosAuthOverlay').style.display = 'none';
      var oldOv = document.getElementById('subOverlay');
      if (oldOv) oldOv.style.display = 'none';
      var gGate = document.getElementById('googleGate');
      if (gGate) gGate.classList.add('gate-hidden');
      return;
    }

    var productId = getProductId();
    var gs = getGs();
    function hideLegacy(){ var o = document.getElementById('subOverlay'); if (o) o.style.display = 'none'; }
    if (!gs) {
      var subOverlay = document.getElementById('subOverlay');
      if (subOverlay) return;
      hideLegacy();
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

        if (hasActiveSub) {
          document.getElementById('mosAuthOverlay').style.display = 'none';
          var gGate = document.getElementById('googleGate');
          if (gGate) gGate.classList.add('gate-hidden');
        } else {
          document.getElementById('mosAuthTitle').innerText = isProTool ? 'Enter Access Code' : 'Access Restricted';
          document.getElementById('mosAuthDesc').innerText = isProTool ? 'Your 7-day free trial has expired. Enter an access code or choose an unlocked program.' : 'You need a verified access code to unlock this content.';
          document.getElementById('mosAuthStep1').style.display = 'none';
          document.getElementById('mosAuthStep2').style.display = 'block';
          
          var greetingEl = document.getElementById('mosUserGreeting');
          if (greetingEl) {
            greetingEl.innerHTML = '👤 Signed in as <strong>' + (data.email || gs.email || 'Google User') + '</strong>';
          }
          
          var progsEl = document.getElementById('mosUserPrograms');
          if (progsEl && data.subscriptions && data.subscriptions.length > 0) {
            progsEl.style.display = 'block';
            var html = '<div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:rgba(250,250,248,0.6); margin-bottom:8px;">Your Active Programs & Tools</div>';
            data.subscriptions.forEach(function(sub){
              var label = Array.isArray(sub.products) ? sub.products.join(', ') : (sub.products || 'All Access');
              html += '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-bottom:6px;">' +
                '<div><div style="font-size:13px; font-weight:600; color:#FAFAF8; text-transform:capitalize;">' + label.replace(/_/g, ' ') + '</div>' +
                '<div style="font-size:11px; color:rgba(250,250,248,0.5);">Expires: ' + (sub.expiresAt ? sub.expiresAt.slice(0,10) : 'Lifetime') + '</div></div>' +
                '<button onclick="window.location.reload()" style="background:#F4C93B; color:#0A0A0F; border:none; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">Open</button>' +
                '</div>';
            });
            progsEl.innerHTML = html;
          }
          
          hideLegacy();
          document.getElementById('mosAuthOverlay').style.display = 'flex';
        }
      } else {
        localStorage.removeItem(GS_KEY);
        hideLegacy();
        document.getElementById('mosAuthOverlay').style.display = 'flex';
        initGsi();
      }
    }).catch(e => {
      if (gate && !gate.active) {
        hideLegacy();
        document.getElementById('mosAuthOverlay').style.display = 'flex';
        initGsi();
      }
    });
  }

  // Start the check
  checkAccess();
})();
