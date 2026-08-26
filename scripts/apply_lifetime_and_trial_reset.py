import os
import re
import shutil

print("=== APPLYING TRIAL REACTIVATION & OWNER LIFETIME ACCESS ===")

TRIAL_EPOCH_STR = "2026-08-27T00:00:00.000Z"
OWNER_EMAILS_JS = "['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM']"

# 1. Update website/worker/src/index.js
worker_path = "website/worker/src/index.js"
worker_content = open(worker_path, "r", encoding="utf-8").read()

owner_subs_code = """const OWNER_EMAILS = ['anasstem2025@gmail.com', '1022066.anas@stemegypt.edu.eg', 'anassmomen@gmail.com'];

async function getAccountSubs(env, email) {
  if (!email) return [];
  const normalized = email.toLowerCase().trim();
  if (OWNER_EMAILS.includes(normalized)) {
    return [
      {
        code: 'OWNER-LIFETIME-ACCESS',
        plan: 'master',
        products: 'all',
        expiresAt: '2099-12-31T23:59:59.999Z'
      }
    ];
  }"""

worker_content = re.sub(
    r"async function getAccountSubs\(env, email\)\s*\{[\s\S]*?if \(!email\) return \[\];",
    owner_subs_code,
    worker_content
)
open(worker_path, "w", encoding="utf-8").write(worker_content)
print("[OK] Patched worker getAccountSubs for owner lifetime access")

# 2. Update website/assets/js/access-control.js
ac_path = "website/assets/js/access-control.js"
ac_content = open(ac_path, "r", encoding="utf-8").read()

# Update getTrialState in access-control.js with epoch reset
ac_trial_old = r"function getTrialState\(\)\s*\{[\s\S]*?return \{ start: start, daysLeft: Math\.max\(0, daysLeft\), active: daysLeft > 0 \};\s*\}"
ac_trial_new = """function getTrialState() {
    var TRIAL_DAYS = 7;
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var start = localStorage.getItem('mos_trial_start');
    if (!start || new Date(start).getTime() < TRIAL_EPOCH) {
      start = new Date().toISOString();
      localStorage.setItem('mos_trial_start', start);
      localStorage.setItem('mos_tdee_trial_start', start);
    }
    var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
    return { start: start, daysLeft: Math.max(0, daysLeft), active: daysLeft > 0 };
  }"""

ac_content = re.sub(ac_trial_old, ac_trial_new, ac_content)

# Update getStoredAccess in access-control.js to recognize owner email from Google session
ac_stored_old = r"function getStoredAccess\(productId\)\s*\{[\s\S]*?return null;\s*\}"
ac_stored_new = """function getStoredAccess(productId) {
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
  }"""

ac_content = re.sub(ac_stored_old, ac_stored_new, ac_content)
open(ac_path, "w", encoding="utf-8").write(ac_content)
print("[OK] Patched access-control.js with trial epoch & owner lifetime check")

# 3. Update website/js/auth.js
auth_path = "website/js/auth.js"
auth_content = open(auth_path, "r", encoding="utf-8").read()

# Ensure OWNER_EMAILS is defined at top of auth.js
auth_content = re.sub(
    r"var OWNER_EMAIL = 'ANASSTEM2025@GMAIL\.COM';",
    "var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];\n  var OWNER_EMAIL = 'ANASSTEM2025@GMAIL.COM';",
    auth_content
)

# Update finishGoogle in auth.js to grant master lifetime access to owner
finish_google_old = r"function finishGoogle\(data\)\s*\{[\s\S]*?window\.location\.reload\(\);\s*\}"
finish_google_new = """function finishGoogle(data) {
    storeAuthData(GS_KEY, JSON.stringify({ session: data.session, email: data.email, name: data.name || '', ts: Date.now() }));
    var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
    if (data.email && OWNER_EMAILS.includes(data.email.toUpperCase())) {
      var ownerSub = { active: true, plan: 'master', prodId: 'all_access', code: 'OWNER', expiry: '2099-12-31', email: data.email, lifetime: true };
      localStorage.setItem('mos_subscription', JSON.stringify(ownerSub));
      localStorage.setItem('mos_book_training', JSON.stringify({ active: true, code: 'OWNER', book: 'training', expiry: '2099-12-31' }));
      localStorage.setItem('mos_book_nutrition', JSON.stringify({ active: true, code: 'OWNER', book: 'nutrition', expiry: '2099-12-31' }));
    }
    window.location.reload();
  }"""
auth_content = re.sub(finish_google_old, finish_google_new, auth_content)

# Update checkAccess trial epoch in auth.js
auth_trial_epoch_old = r"var TRIAL_DAYS = 7;\s*var trialStart = localStorage\.getItem\('mos_trial_start'\);"
auth_trial_epoch_new = """var TRIAL_DAYS = 7;
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var trialStart = localStorage.getItem('mos_trial_start');
    if (!trialStart || new Date(trialStart).getTime() < TRIAL_EPOCH) {
      trialStart = new Date().toISOString();
      if (!isBook) {
        localStorage.setItem('mos_trial_start', trialStart);
        localStorage.setItem('mos_tdee_trial_start', trialStart);
      }
    }"""
auth_content = re.sub(auth_trial_epoch_old, auth_trial_epoch_new, auth_content)

open(auth_path, "w", encoding="utf-8").write(auth_content)
print("[OK] Patched auth.js with owner lifetime grant & trial epoch")

# 4. Update website/tools/training_tool.html
tt_path = "website/tools/training_tool.html"
tt_content = open(tt_path, "r", encoding="utf-8").read()

# Update trialState with epoch
tt_trial_old = r"function trialState\(\)\s*\{[\s\S]*?return \{ start: start, daysLeft: daysLeft, active: daysLeft > 0 \};\s*\}"
tt_trial_new = """function trialState(){
  var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
  var start = localStorage.getItem('mos_trial_start');
  if(!start || new Date(start).getTime() < TRIAL_EPOCH){
    start = new Date().toISOString();
    localStorage.setItem('mos_trial_start', start);
    evLog('trial_start');
  }
  var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 864e5);
  return { start: start, daysLeft: Math.max(0, daysLeft), active: daysLeft > 0 };
 }"""
tt_content = re.sub(tt_trial_old, tt_trial_new, tt_content)

# Update owner email handling in training_tool.html for lifetime 2099
tt_content = tt_content.replace("var expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);", "var expiry = new Date('2099-12-31');")
tt_content = tt_content.replace("data.email.toUpperCase() === OWNER_EMAIL", "['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(data.email.toUpperCase())")
tt_content = tt_content.replace("email.toUpperCase() === OWNER_EMAIL", "['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(email.toUpperCase())")
open(tt_path, "w", encoding="utf-8").write(tt_content)
print("[OK] Patched training_tool.html with lifetime owner access & trial epoch")

# 5. Update website/tools/tdee_adaptive_engine.html
tdee_path = "website/tools/tdee_adaptive_engine.html"
tdee_content = open(tdee_path, "r", encoding="utf-8").read()

tdee_trial_old = r"function getTrialState\(\)\s*\{[\s\S]*?return \{ start: start, daysLeft: Math\.max\(0, daysLeft\), active: daysLeft > 0 \};\s*\}"
tdee_trial_new = """function getTrialState(){
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var start = localStorage.getItem('mos_tdee_trial_start') || localStorage.getItem('mos_trial_start');
    if(!start || new Date(start).getTime() < TRIAL_EPOCH){
      start = new Date().toISOString();
      localStorage.setItem('mos_tdee_trial_start', start);
      localStorage.setItem('mos_trial_start', start);
    }
    var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 864e5);
    return { start: start, daysLeft: Math.max(0, daysLeft), active: daysLeft > 0 };
  }"""
tdee_content = re.sub(tdee_trial_old, tdee_trial_new, tdee_content)

tdee_content = tdee_content.replace("var expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);", "var expiry = new Date('2099-12-31');")
tdee_content = tdee_content.replace("data.email.toUpperCase() === OWNER_EMAIL", "['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(data.email.toUpperCase())")
tdee_content = tdee_content.replace("email.toUpperCase() === OWNER_EMAIL", "['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(email.toUpperCase())")
open(tdee_path, "w", encoding="utf-8").write(tdee_content)
print("[OK] Patched tdee_adaptive_engine.html with lifetime owner access & trial epoch")

# 6. Update website/tools/muscle_os_app.html
hub_path = "website/tools/muscle_os_app.html"
hub_content = open(hub_path, "r", encoding="utf-8").read()

hub_refresh_old = r"function refreshStatus\(\)\s*\{[\s\S]*?chip\.className = 'status-chip locked';\s*\}\s*\}"
hub_refresh_new = """function refreshStatus(){
      var chip = document.getElementById('statusChip');
      var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
      var gs = null;
      try { gs = JSON.parse(localStorage.getItem('mos_google_session') || 'null'); } catch(e){}
      var isOwner = gs && gs.email && OWNER_EMAILS.includes(gs.email.toUpperCase());

      var sub = null;
      try { sub = JSON.parse(localStorage.getItem('mos_subscription') || 'null'); } catch(e){}
      var subProd = sub ? (sub.prodId || deriveProd(sub.code, sub.plan)) : null;
      var prodOk = !!sub && (sub.plan === 'master' || sub.code === 'OWNER' || subProd === HUB_PRODUCT || subProd === 'all_access');
      var activeSub = isOwner || !!(sub && sub.active && prodOk && sub.expiry && new Date(sub.expiry + 'T23:59:59') > new Date());
      
      var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
      var trialStart = localStorage.getItem('mos_trial_start');
      if ((!trialStart || new Date(trialStart).getTime() < TRIAL_EPOCH) && !activeSub) {
        trialStart = new Date().toISOString();
        localStorage.setItem('mos_trial_start', trialStart);
        localStorage.setItem('mos_tdee_trial_start', trialStart);
      }
      var trialActive = !!(trialStart && (Date.now() - new Date(trialStart).getTime()) < TRIAL_MS);
      if (activeSub) {
        chip.textContent = isOwner ? 'VIP OWNER' : t('hub_ok');
        chip.className = 'status-chip ok';
      } else if (trialActive) {
        var left = Math.max(1, Math.ceil((new Date(trialStart).getTime() + TRIAL_MS - Date.now()) / 864e5));
        chip.textContent = t('hub_trial') + ' · ' + left + 'd';
        chip.className = 'status-chip trial';
      } else {
        chip.textContent = t('hub_locked');
        chip.className = 'status-chip locked';
      }
    }"""
hub_content = re.sub(hub_refresh_old, hub_refresh_new, hub_content)
open(hub_path, "w", encoding="utf-8").write(hub_content)
print("[OK] Patched muscle_os_app.html with VIP Owner status & trial epoch")

# 7. Update calculators subOk with epoch
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

calc_subok_old = r"function subOk\(s\)\s*\{[\s\S]*?return daysLeft > 0;\s*\}"
calc_subok_new = """function subOk(s){
    var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
    try {
      var gs = JSON.parse(localStorage.getItem('mos_google_session') || 'null');
      if (gs && gs.email && OWNER_EMAILS.includes(gs.email.toUpperCase())) return true;
    } catch(e){}
    if (s && s.active && (!s.expiry || new Date(s.expiry + 'T23:59:59') > new Date())) return true;
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var start = localStorage.getItem('mos_trial_start');
    if (!start || new Date(start).getTime() < TRIAL_EPOCH) {
      start = new Date().toISOString();
      localStorage.setItem('mos_trial_start', start);
      localStorage.setItem('mos_tdee_trial_start', start);
    }
    var daysLeft = 7 - Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
    return daysLeft > 0;
  }"""

for cf in calc_files:
    if os.path.exists(cf):
        c_text = open(cf, "r", encoding="utf-8").read()
        c_text = re.sub(calc_subok_old, calc_subok_new, c_text)
        open(cf, "w", encoding="utf-8").write(c_text)
        print(f"[OK] Patched {cf} with subOk epoch & owner check")

# 8. Sync canonical tools to bundles
shutil.copy2("website/tools/training_tool.html", "website/training bundle/training_tool.html")
shutil.copy2("website/tools/tdee_adaptive_engine.html", "website/nutrition bundle/tdee_adaptive_engine.html")
shutil.copy2("website/tools/tdee_adaptive_engine.html", "website/training bundle/tdee_adaptive_engine.html")
print("[OK] Synced training_tool.html and tdee_adaptive_engine.html to bundles")

print("=== ALL TRIAL REACTIVATIONS & LIFETIME ACCESS APPLIED ===")
