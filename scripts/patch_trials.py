import os
import re
import shutil

print("=== PATCHING 7-DAY FREE TRIAL SYSTEM ACROSS ENTIRE CODEBASE ===")

# 1. Patch website/assets/js/access-control.js
ac_path = "website/assets/js/access-control.js"
ac_content = open(ac_path, "r", encoding="utf-8").read()

# Add getTrialState and update getStoredAccess
if "function getTrialState()" not in ac_content:
    trial_fn = '''  /* ---- Trial State Check ---- */
  function getTrialState() {
    var TRIAL_DAYS = 7;
    var start = localStorage.getItem('mos_trial_start');
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem('mos_trial_start', start);
    }
    var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
    return { start: start, daysLeft: Math.max(0, daysLeft), active: daysLeft > 0 };
  }
'''
    ac_content = ac_content.replace("  function getProduct(id) { return CONFIG.products[id]; }", "  function getProduct(id) { return CONFIG.products[id]; }\n\n" + trial_fn)

    old_get_stored = '''  /* ---- Check stored localStorage access ---- */
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
  }'''

    new_get_stored = '''  /* ---- Check stored localStorage access ---- */
  function getStoredAccess(productId) {
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

    // Check 7-day trial for tools (books require explicit purchase)
    if (productId && productId.indexOf('book') === -1) {
      var trial = getTrialState();
      if (trial.active) {
        return { active: true, trial: true, daysLeft: trial.daysLeft, plan: 'trial' };
      }
    }
    return null;
  }'''
    if old_get_stored in ac_content:
        ac_content = ac_content.replace(old_get_stored, new_get_stored)
    open(ac_path, "w", encoding="utf-8").write(ac_content)
    print("[OK] Patched access-control.js")

# 2. Patch website/js/auth.js
auth_path = "website/js/auth.js"
auth_content = open(auth_path, "r", encoding="utf-8").read()

# Replace checkAccess in auth.js
old_check_access_regex = r"function checkAccess\(\)\s*\{[\s\S]*?checkAccess\(\);"

new_check_access = '''function checkAccess() {
    var gate = getGate();
    if (gate && gate.active) {
      document.getElementById('mosAuthOverlay').style.display = 'none';
      var oldOv = document.getElementById('subOverlay');
      if (oldOv) oldOv.style.display = 'none';
      var gGate = document.getElementById('googleGate');
      if (gGate) gGate.classList.add('gate-hidden');
      return;
    }

    var isBook = window.location.pathname.includes('/books/');
    var TRIAL_DAYS = 7;
    var trialStart = localStorage.getItem('mos_trial_start');
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
  checkAccess();'''

auth_content = re.sub(old_check_access_regex, new_check_access, auth_content)
open(auth_path, "w", encoding="utf-8").write(auth_content)
print("[OK] Patched auth.js")

# 3. Patch calculators subOk logic
calc_files = [
    "website/tools/rpe_load_calculator.html",
    "website/tools/volume_set_calculator.html",
    "website/tools/split_selector_quiz.html",
    "website/tools/tdee_macro_calculator.html",
    "website/training bundle/rpe_load_calculator.html",
    "website/training bundle/volume_set_calculator.html",
    "website/training bundle/split_selector_quiz.html",
    "website/training bundle/tdee_macro_calculator.html",
    "website/nutrition bundle/tdee_macro_calculator.html"
]

subok_old = "function subOk(s){ return !!(s && s.active && (!s.expiry || new Date(s.expiry + 'T23:59:59') > new Date())); }"
subok_new = """function subOk(s){
    if (s && s.active && (!s.expiry || new Date(s.expiry + 'T23:59:59') > new Date())) return true;
    var start = localStorage.getItem('mos_trial_start');
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem('mos_trial_start', start);
    }
    var daysLeft = 7 - Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
    return daysLeft > 0;
  }"""

for cf in calc_files:
    if os.path.exists(cf):
        c_text = open(cf, "r", encoding="utf-8").read()
        if subok_old in c_text:
            c_text = c_text.replace(subok_old, subok_new)
            open(cf, "w", encoding="utf-8").write(c_text)
            print(f"[OK] Patched {cf}")

# 4. Sync training_tool.html and tdee_adaptive_engine.html across bundles
shutil.copy2("website/tools/training_tool.html", "website/training bundle/training_tool.html")
shutil.copy2("website/tools/tdee_adaptive_engine.html", "website/nutrition bundle/tdee_adaptive_engine.html")
shutil.copy2("website/tools/tdee_adaptive_engine.html", "website/training bundle/tdee_adaptive_engine.html")
print("[OK] Synced training_tool.html and tdee_adaptive_engine.html to bundles")

print("=== ALL TRIAL PATCHES APPLIED SUCCESSFULLY ===")
