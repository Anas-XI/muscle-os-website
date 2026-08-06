  // ═══════════════════════════════════════
  //  LOCAL EVENT LOG + TRIAL (PMF telemetry)
  //  Append-only, bounded, no PII. Syncs via the existing Worker payload.
  // ═══════════════════════════════════════

  function eventsAll(){ return ls(K.EV, null) || []; }
  function evLog(e, d, dedupe){
    var arr = eventsAll(), now = Date.now();
    if(dedupe){ arr = arr.filter(function(x){ return !(x.e === e && x.k === dedupe); }); }
    arr.push({ t: now, e: e, k: dedupe || null, d: d || {} });
    var cut = now - 90 * 864e5;
    arr = arr.filter(function(x){ return x.t >= cut; });
    if(arr.length > EVENTS_MAX) arr = arr.slice(arr.length - EVENTS_MAX);
    ss(K.EV, arr);
  }
  function evLast(e, k){
    var arr = eventsAll();
    for(var i = arr.length - 1; i >= 0; i--){ if(arr[i].e === e && (k === undefined || arr[i].k === k)) return arr[i]; }
    return null;
  }
  window.__eventsAll = eventsAll; window.__evLog = evLog; window.__evLast = evLast;

  // Trial state — single source of truth. TRIAL_DAYS constant lives in 02_data.js.
  function trialState(){
    var start = localStorage.getItem('mos_trial_start');
    if(!start){ start = new Date().toISOString(); localStorage.setItem('mos_trial_start', start); evLog('trial_start'); }
    var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 864e5);
    return { start: start, daysLeft: daysLeft, active: daysLeft > 0 };
  }
  window.__trialState = trialState;

  // Unobtrusive "X days left" pill — injected into the header, zero HTML part changes.
  function updateTrialPill(){
    var pill = document.getElementById('trialPill');
    var st = trialState(), sub = null;
    try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}
    var active = !!(sub && sub.active);
    if(active || !st.active){
      if(pill) pill.style.display = 'none';
      if(!active && !st.active) evLog('trial_expired', {}, 'once');
      return;
    }
    if(!pill){
      pill = document.createElement('span');
      pill.id = 'trialPill';
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:.5rem;color:#F4C93B;border:1px solid rgba(244,201,59,.25);background:rgba(244,201,59,.06);border-radius:20px;padding:2px 8px;margin-left:6px;white-space:nowrap;cursor:default';
      pill.innerHTML = '<span data-i18n="trial_pill_pre"></span><b id="trialDays" style="font-weight:700"></b><span data-i18n="trial_pill_post"></span>';
      var top = document.querySelector('.header-top');
      if(top) top.appendChild(pill);
    }
    pill.style.display = 'inline-flex';
    var days = document.getElementById('trialDays');
    if(days) days.textContent = st.daysLeft;
    evLog('trial_days_left', { days: st.daysLeft }, 'tl_' + new Date().toISOString().split('T')[0]);
    translateUI();
  }
  window.__updateTrialPill = updateTrialPill;

  // Trial-expired note inside the paywall modal, injected next to the code row.
  function trialExpiredNote(){
    var el = document.getElementById('trialExpiredNote');
    var st = trialState(), sub = null;
    try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}
    if((sub && sub.active) || st.active){
      if(el) el.style.display = 'none';
      return;
    }
    if(!el){
      el = document.createElement('div');
      el.id = 'trialExpiredNote';
      el.className = 'sub-error';
      var modal = document.querySelector('.sub-modal');
      var anchor = modal ? (modal.querySelector('#authStep2') || modal.lastElementChild) : null;
      if(anchor) modal.insertBefore(el, anchor);
    }
    el.textContent = _('trial_expired_note');
    el.style.display = 'block';
    evLog('trial_expired', {}, 'once');
  }
  window.__trialExpiredNote = trialExpiredNote;

  // Onboarding / paywall abandon tracking — page lifecycle hooks only.
  function funnelSnapshot(){
    var fields = ['userName','userAge','ta','goal'].filter(function(id){
      var el = document.getElementById(id);
      return el && el.value && el.value !== '0';
    }).length;
    return { step: typeof step !== 'undefined' ? step : 0, quizQ: typeof quizQ !== 'undefined' ? quizQ : -1, fields: fields, hasProgram: !!ls(K.PG, null) };
  }
  function onLeave(){
    var s = funnelSnapshot();
    var sub = null; try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}
    var active = !!(sub && sub.active);
    var ov = document.getElementById('subOverlay');
    var paywallOpen = ov && ov.style.display === 'flex' && !active;
    if(paywallOpen) evLog('paywall_abandon');
    if(s.step === 1 && !s.hasProgram) evLog('onboard_abandon', { q: s.quizQ, fields: s.fields });
    var st = trialState();
    if(!active && !st.active) evLog('trial_expired', {}, 'once');
  }
  window.addEventListener('pagehide', onLeave);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') onLeave(); });
