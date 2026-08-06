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

  // ── Suggestion outcomes (read-time before/after vs LH e1RM) ──
  // Suggestions with timestamps: deload_prompt, plateau_note, fat_gate.
  function outcomeRows(){
    var evs = eventsAll(), hist = loadHist();
    if(!hist) return [];
    var sug = { deload_prompt: 1, plateau_note: 1, fat_gate: 1 };
    var seen = {}, rows = [];
    evs.forEach(function(x){
      if(!sug[x.e]) return;
      var D = new Date(x.t), ds = D.toISOString().split('T')[0];
      var dk = x.e + ds;
      if(seen[dk]) return; seen[dk] = true;
      var iso = function(o){ return o.toISOString().split('T')[0]; };
      var before = [], after = [];
      MAIN_LIFTS.forEach(function(ex){
        var b = bestE1RMIn(ex, hist, iso(new Date(D.getTime() - 6 * 864e5)), ds);
        var a = bestE1RMIn(ex, hist, iso(new Date(D.getTime() + 8 * 864e5)), iso(new Date(D.getTime() + 15 * 864e5)));
        if(b !== null && a !== null){ before.push(b); after.push(a); }
      });
      if(!before.length) return;
      var avg = function(a){ return a.reduce(function(s, v){ return s + v; }, 0) / a.length; };
      var delta = avg(after) - avg(before);
      var dir = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
      rows.push({ d: ds, dir: dir, delta: delta });
    });
    rows.sort(function(a, b){ return a.d < b.d ? 1 : -1; });
    return rows.slice(0, 6);
  }
  function renderOutcomeSection(){
    var host = document.getElementById('step5');
    if(!host) return;
    var el = document.getElementById('outcomeCard');
    if(!el){
      el = document.createElement('div');
      el.id = 'outcomeCard';
      el.className = 'card';
      el.style.display = 'none';
      el.innerHTML = '<div class="section-header"><span data-i18n="outcome_title"></span><span class="section-sub" data-i18n="outcome_sub"></span></div><div id="outcomeRows" style="font-size:.6rem;line-height:1.6;padding:4px 0"></div>';
      var anchor = document.getElementById('backToDashBtn');
      while(anchor && anchor.parentElement !== host) anchor = anchor.parentElement;
      host.insertBefore(el, anchor || host.firstChild);
    }
    var rows = outcomeRows();
    if(!rows.length){ el.style.display = 'none'; return; }
    el.style.display = 'block';
    var html = '';
    rows.forEach(function(r){
      var icon = r.dir === 'up' ? '▲' : r.dir === 'down' ? '▼' : '•';
      var color = r.dir === 'up' ? '#81C784' : r.dir === 'down' ? '#f44336' : 'rgba(250,250,248,.25)';
      var p = r.dir === 'up' ? _('outcome_up').replace('{d}', (Math.round(r.delta * 2) / 2).toFixed(1)).replace('{w}', _('weight'))
        : r.dir === 'down' ? _('outcome_down').replace('{d}', (Math.round(-r.delta * 2) / 2).toFixed(1)).replace('{w}', _('weight'))
        : _('outcome_flat');
      html += '<div style="padding:3px 0"><span style="color:' + color + '">' + icon + '</span> ' + _('outcome_line').replace('{t}', r.d.slice(5)).replace('{p}', p) + '</div>';
    });
    document.getElementById('outcomeRows').innerHTML = html;
    translateUI();
  }
  window.renderOutcomeSection = renderOutcomeSection;
