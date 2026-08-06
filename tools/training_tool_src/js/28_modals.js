  var SUB_KEY = 'mos_subscription';
  var GS_KEY = 'mos_google_session';
  var OWNER_EMAIL = 'ANASSTEM2025@GMAIL.COM';
  var API_BASE = 'https://muscleos-access-control.muscleos.workers.dev';
  var GOOGLE_CLIENT_ID = '22648364020234-gldbcsfl16cftjvd11o9iqpalesi1hsn.apps.googleusercontent.com';
  var PRODUCT_ID = 'training_tool';
  var sub = null;
  try { sub = JSON.parse(localStorage.getItem(SUB_KEY)); } catch(e){}
  var active = !!(sub && sub.active && new Date(sub.expiry + 'T23:59:59') > new Date());

  function t(key, fb){ try { var v = _(key); return (v === key) ? (fb || v) : v; } catch(e){ return fb || key; } }
  function getGs(){ try { var g = JSON.parse(localStorage.getItem(GS_KEY)); return (g && g.session) ? g : null; } catch(e){ return null; } }
  function showStep(n){
    // Code box + Google sign-in are always visible; n===2 additionally shows the signed-in state (welcome + switch link)
    document.getElementById('authStep1').style.display = 'block';
    document.getElementById('authStep2').style.display = 'block';
    var linked = n === 2;
    document.getElementById('authWelcomeRow').style.display = linked ? 'block' : 'none';
    document.getElementById('subSignOut').style.display = linked ? 'inline' : 'none';
  }
  function showErr(id, msg){ var el = document.getElementById(id); el.style.display = 'block'; el.textContent = msg; }
  function showNoLink(show){
    var el = document.getElementById('subNoLink');
    if(el) el.style.display = show ? 'block' : 'none';
  }
  function pickAccountSub(subs){
    // Worker returns active account-bound subs sorted by expiry desc
    if(!Array.isArray(subs) || !subs.length) return null;
    for(var i = 0; i < subs.length; i++){
      var s = subs[i];
      if(!s) continue;
      if(s.products === 'all') return s;
      if(Array.isArray(s.products) && s.products.indexOf(PRODUCT_ID) !== -1) return s;
    }
    return null;
  }
  function setSub(plan, expiry, token, code, email){
    localStorage.setItem(SUB_KEY, JSON.stringify({ active: true, plan: plan, expiry: expiry, token: token || '', code: code, email: email || '' }));
  }
  function grantAndReload(plan, expiry, token, code, email, quiet){
    setSub(plan, expiry, token, code, email);
    showStep(2);
    document.getElementById('subError').style.display = 'none';
    document.getElementById('subSuccess').style.display = 'block';
    showNoLink(false);
    (function(){try{
      if(quiet) return;
      var vi = ls(K.VI, {});
      notifyCoach('subscription', { name: vi.name || 'User', code: code, plan: plan || 'pro_training', expiry: (expiry || '').slice(0, 10) });
    }catch(e){}})();
    setTimeout(function(){ location.reload(); }, 1500);
  }
  function verifyCode(code, email, btn){
    btn.disabled = true;
    btn.textContent = t('sub_checking', 'Checking...');
    var gs = getGs();
    fetch(API_BASE + '/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, productId: 'training_tool', session: gs ? gs.session : undefined })
    }).then(function(r){ return r.json(); }).then(function(data){
      if(data && data.valid){
        if(window.__evLog)window.__evLog('code_accepted',{plan:data.plan||'pro_training'});
        grantAndReload(data.plan || 'pro_training', (data.expiresAt || '').slice(0, 10), data.token || '', code, email);
      } else {
        if(window.__evLog)window.__evLog('code_rejected');
        var msg = t('sub_err_invalid', 'Invalid code. Please check and try again.');
        if(data && data.error === 'code_used_by_other') msg = t('sub_err_used_by_other', 'This code is already linked to another account.');
        if(data && data.error === 'code_exhausted') msg = t('sub_err_exhausted', 'This code has already been used.');
        if(data && data.error === 'invalid_session'){
          localStorage.removeItem(GS_KEY);
          showStep(1);
          showNoLink(false);
          msg = t('sub_err_session', 'Session expired. Please sign in again.');
          initGsi();
        }
        showErr('subError', msg);
        btn.disabled = false;
        btn.textContent = t('sub_verify', 'Verify');
      }
    }).catch(function(){
      showErr('subError', t('sub_err_network', 'Network error. Please try again.'));
      btn.disabled = false;
      btn.textContent = t('sub_verify', 'Verify');
    });
  }
  function finishGoogle(data){
    localStorage.setItem(GS_KEY, JSON.stringify({ session: data.session, email: data.email, name: data.name || '', ts: Date.now() }));
    if(data.email.toUpperCase() === OWNER_EMAIL){
      var expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);
      grantAndReload('pro_training', expiry.toISOString().split('T')[0], '', 'OWNER', data.email);
      return;
    }
    var linked = pickAccountSub(data.subscriptions);
    if(linked){
      grantAndReload(linked.plan || 'pro_training', (linked.expiresAt || '').slice(0, 10), '', linked.code, data.email, true);
      return;
    }
    document.getElementById('authWelcome').textContent = t('sub_auth_welcome', 'Signed in as {name}').replace('{name}', data.name || data.email);
    showStep(2);
    showNoLink(true);
  }
  function initGsi(){
    var host = document.getElementById('googleSignInBtn');
    if(!host || host.getAttribute('data-gsi')) return;
    host.setAttribute('data-gsi', '1');
    if(typeof google === 'undefined' || !google.accounts || !google.accounts.id){ setTimeout(initGsi, 300); return; }
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: function(resp){
        if(!resp || !resp.credential){ showErr('authStep1Error', t('sub_google_failed', 'Google sign-in failed. Please try again.')); return; }
        fetch(API_BASE + '/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resp.credential })
        }).then(function(r){ return r.json(); }).then(function(data){
          if(data && data.valid) finishGoogle(data);
          else showErr('authStep1Error', t('sub_google_failed', 'Google sign-in failed. Please try again.'));
        }).catch(function(){
          showErr('authStep1Error', t('sub_err_network', 'Network error. Please try again.'));
        });
      }
    });
    google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', width: 280 });
  }

  if(!active){
    var _trial = window.__trialState ? window.__trialState() : null;
    if(_trial && _trial.active){
      // Additive gate: an active trial keeps the tool unlocked; the pill shows days left.
      if(window.__evLog)window.__evLog('trial_gate_open', { days: _trial.daysLeft });
      if(window.__updateTrialPill)window.__updateTrialPill();
    } else {
      document.getElementById('subOverlay').style.display = 'flex';if(window.__evLog)window.__evLog('paywall_shown',{reason:'trial_expired'});
      if(window.__trialExpiredNote)window.__trialExpiredNote();
      var gs = getGs();
    var started = false;
    function start(){
      if(started) return;
      started = true;
      if(gs){
        fetch(API_BASE + '/api/check-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: gs.session })
        }).then(function(r){ return r.json(); }).then(function(data){
          if(data && data.valid){
            var linked = pickAccountSub(data.subscriptions);
            if(linked){
              grantAndReload(linked.plan || 'pro_training', (linked.expiresAt || '').slice(0, 10), '', linked.code, gs.email, true);
              return;
            }
            document.getElementById('authWelcome').textContent = t('sub_auth_welcome', 'Signed in as {name}').replace('{name}', gs.name || gs.email);
            showStep(2);
            showNoLink(true);
          } else {
            localStorage.removeItem(GS_KEY);
            showStep(1);
            showNoLink(false);
            initGsi();
          }
        }).catch(function(){
          document.getElementById('authWelcome').textContent = t('sub_auth_welcome', 'Signed in as {name}').replace('{name}', gs.name || gs.email);
          showStep(2);
        });
      } else {
        showStep(1);
        initGsi();
      }
    }
    start();

    document.getElementById('subVerify').addEventListener('click', function(){
      var btn = document.getElementById('subVerify');
      var code = document.getElementById('subCode').value.trim().toUpperCase();
      if(!code){ showErr('subError', t('sub_err_invalid', 'Invalid code. Please check and try again.')); if(window.__evLog)window.__evLog('code_attempt',{empty:true}); return; }
      var g = getGs();
      var email = g ? g.email : '';
      if(email.toUpperCase() === OWNER_EMAIL){
        var expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);
        grantAndReload('pro_training', expiry.toISOString().split('T')[0], '', 'OWNER', email);
        return;
      }
      verifyCode(code, email, btn);if(window.__evLog)window.__evLog('code_attempt');
    });
    document.getElementById('subCode').addEventListener('keydown', function(e){
      if(e.key === 'Enter') document.getElementById('subVerify').click();
    });
    document.getElementById('subSignOut').addEventListener('click', function(e){
      e.preventDefault();
      localStorage.removeItem(GS_KEY);
      showStep(1);
      showNoLink(false);
      initGsi();
    });
    }
  }
})();
