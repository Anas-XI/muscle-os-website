 {n:'Volume Upper',ex:[{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Seated Row',s:3,p:'back',se:['biceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Shoulder Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]}
 ]};
 })();

 window.__splits=SPLITS;

 // ── Custom split builder constants ──
 const CUSTOM_SPLIT_KEY='__custom__';
 const DEFAULT_SLOT_SETS=3;
 const SLOT_DEFAULTS={chest:'Bench Press',back:'Lat Pulldown',shoulders:'Overhead Press',quads:'Barbell Squat',hamstrings:'Deadlift Variation',glutes:'Hip Thrust',biceps:'Bicep Curl',triceps:'Triceps Pushdown',calves:'Calf Raise',traps:'Kelso Shrugs',forearms:'Wrist Curl',abs:'Cable Crunch'};

 const CARDIO_TYPES = ['Walking','Jogging','Running','Cycling','Swimming','Rowing','Elliptical','Stairmaster','HIIT','Other'];
 const WEAK_POINTS = [
 {id:'lockout',l:'Lockout (bench/overhead)'},{id:'off_chest',l:'Off Chest (bench)'},
 {id:'off_floor',l:'Off Floor (deadlift)'},{id:'lockout_dl',l:'Lockout (deadlift)'},
 {id:'hole',l:'Bottom of Squat (the hole)'},{id:'midpoint',l:'Mid-Point Sticking'},
 {id:'legs',l:'Leg Strength / Mass'},{id:'back',l:'Back Strength / Thickness'}
 ];
 const K = {VT:'mos_vol_targets',SP:'mos_split_profile',PG:'mos_program',LG:'mos_logs',VI:'mos_vol_inputs',LH:'mos_load_history',DT:'mos_deload_tracker',PF:'mos_pain_flags',PL:'mos_pl_profile',FL:'mos_fatigue_log',CL:'mos_cardio_logs',MP:'mos_meso_plan',MA:'mos_meso_active',MH:'mos_meso_history',MM:'mos_measurements',CE:'mos_custom_exercises',CR:'mos_custom_replacements',SU:'mos_supersets',SS:'mos_sessions',PR:'mos_priority',SR:'mos_soreness_log',PC:'mos_pr_credit',VA:'mos_vol_alloc',FO:'mos_freq_override',CQ:'mos_coach_queue',EV:'mos_events',CS:'mos_custom_split',NL:'mos_nonlift_log',PFH:'mos_pain_flag_hist'};

 // ═══════════════════════════════════════
 // DECISION ENGINE — Profile Builder & Cache
 // ═══════════════════════════════════════
 var TA_TO_YEARS = { novice: 0.5, intermediate: 2, advanced: 5 };
 function buildEngineProfile() {
  var goal   = (document.getElementById('goal')       && document.getElementById('goal').value)       || 'hypertrophy';
  var ta     = (document.getElementById('ta')         && document.getElementById('ta').value)         || 'intermediate';
  var age    = parseInt((document.getElementById('userAge')    && document.getElementById('userAge').value)    || 25);
  var sex    = (document.getElementById('userSex')    && document.getElementById('userSex').value)    || 'male';
  var weight = parseFloat((document.getElementById('userWeight') && document.getElementById('userWeight').value) || ls('mos_eng_bw', 75));
  var height = parseFloat((document.getElementById('userHeight') && document.getElementById('userHeight').value) || ls('mos_eng_ht', 175));
  var days   = parseInt((document.getElementById('dow')        && document.getElementById('dow').value)        || 4);
  return { goal: goal, experience_years: TA_TO_YEARS[ta] || 2, age: age, sex: sex, bodyweight_kg: weight, height_cm: height, training_days: days };
 }
 var _engineRecs = null;
 function getEngineRecs() {
  if (_engineRecs) return _engineRecs;
  if (typeof DecisionEngine === 'undefined' || !DecisionEngine.isLoaded) return null;
  _engineRecs = DecisionEngine.applyBookRulesSync(buildEngineProfile());
  return _engineRecs;
 }
 function parseRestSec(str, fallback) {
  if (!str) return fallback;
  var match = str.match(/(\d+)-(\d+)/);
  if (match) return parseInt(match[2]);
  var single = str.match(/(\d+)/);
  return single ? parseInt(single[1]) : fallback;
 }
 // Invalidate cache on profile field change
 ['goal','ta','userAge','userSex','userWeight','userHeight','dow'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('change', function() { _engineRecs = null; });
 });

 // ═══════════════════════════════════════
 // LOCAL EVENT LOG + TRIAL (PMF telemetry)
 // Append-only, bounded, no PII. Syncs via the existing Worker payload.
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
