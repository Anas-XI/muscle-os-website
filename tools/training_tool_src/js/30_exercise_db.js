 // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

 window.copyBackupToClipboard = function(){
 var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
 var data={};allKeys.forEach(function(k){var v=localStorage.getItem(k);if(v)try{data[k]=JSON.parse(v);}catch(e){data[k]=v;}});
 var str = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
 navigator.clipboard.writeText(str).then(function() {
 alert(' Backup code copied to clipboard! You can paste this on any device.');
 }).catch(function() {
 prompt('Copy this backup code:', str);
 });
 };

 window.pasteBackupFromClipboard = function(){
 var str = prompt('Paste your MuscleOS backup code here:');
 if(!str) return;
 try {
 var json = decodeURIComponent(escape(atob(str.trim())));
 var data = JSON.parse(json);
 if(typeof data !== 'object') throw new Error('Invalid format');
 Object.keys(data).forEach(function(k) {
 var val = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
 localStorage.setItem(k, val);
 });
 alert(' Backup restored successfully! Reloading...');
 location.reload();
 } catch(e) {
 alert(' Invalid backup code: ' + e.message);
 }
 };

 document.getElementById('exportBtn').addEventListener('click',function(){
 var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
 var data={};allKeys.forEach(function(k){var v=localStorage.getItem(k);if(v)data[k]=JSON.parse(v);});
 var b=new Blob([JSON.stringify({exported:new Date().toISOString(),ver:4,data:data},null,2)],{type:'application/json'});
 var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='muscle_os_data_'+new Date().toISOString().split('T')[0]+'.json';a.click();
 });
 document.getElementById('importBtn').addEventListener('click',function(){document.getElementById('importFile').click()});
 document.getElementById('importFile').addEventListener('change',function(){
 if(!this.files||!this.files[0])return;
 var r=new FileReader();r.onload=function(e){try{var p=JSON.parse(e.target.result),d=p.data||p;if(!d||typeof d!=='object')throw Error('Invalid');var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);var ok=false;allKeys.forEach(function(k){if(d[k]!==undefined){localStorage.setItem(k,JSON.stringify(d[k]));ok=true;}}); if(!ok)throw Error('No recognized data');alert(_('alert_imported'));location.reload();}catch(err){alert('Import failed: '+err.message);}};r.readAsText(this.files[0]);this.value='';
 });
 document.getElementById('resetBtn').addEventListener('click',function(){
 if(!confirm(_('confirm_reset_all')))return;
 var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
 allKeys.forEach(function(k){localStorage.removeItem(k)});
 go(1);renderPriorities();
 });

 // MOS Interactive Training Tour Engine
 var MOS_TRAIN_TOUR = [
 {
 title: ' Step 1: Athlete Onboarding & Volume Calibration',
 desc: 'Welcome to MOS-HYPERKINETIX! Select your Training Age, Primary Goal (Hypertrophy / Strength), Days/Week, and Recovery Factor. The engine calculates your exact muscle volume landmarks (MEV, MAV, MRV).'
 },
 {
 title: ' Step 2: Intelligent Split Selector & Muscle Priorities',
 desc: 'Choose your optimal weekly split (Push/Pull/Legs, Upper/Lower, Arnold Split, Full Body) or build a custom schedule. Adjust muscle priority sliders to assign extra set allocations to lagging bodyparts!'
 },
 {
 title: ' Step 3: Autoregulated Mesocycle Generator',
 desc: 'Generate a periodized 4-to-12 week mesocycle. The system plans progressive overload set ramp-ups week over week, leading to a calculated Deload Week for systemic CNS recovery.'
 },
 {
 title: ' Step 4: Active Workout Logger & Pre-Session Readiness',
 desc: 'Check in before every session with the Pre-Session Readiness slider (Sleep, Stress, Soreness). If fatigue is high, load targets automatically scale down to prevent injury. Log sets with built-in rest timer chimes & plate calculators!'
 },
 {
 title: ' Step 5: History, Volume Charts & Backup Engine',
 desc: 'Review weekly volume landmark charts, PR tracking tables, and mesocycle history. Use Copy Backup Code to instant-sync your workout logs across devices!'
 }
 ];

 window.startTrainingTour = function(){
 showTrainingTourStep(0);
 };

 window.showTrainingTourStep = function(stepIdx){
 var modal = document.getElementById('mosTrainTourModal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'mosTrainTourModal';
 modal.className = 'modal-overlay';
 document.body.appendChild(modal);
 }
 var step = MOS_TRAIN_TOUR[stepIdx];
 modal.innerHTML = `
 <div class="card animate-in" style="max-width:440px;width:90%;border:1.5px solid #F4C93B;box-shadow:0 0 32px rgba(244,201,59,.35);background:#1A1B26">
 <div style="font-family:'Oswald',sans-serif;font-size:1.15rem;color:#F4C93B;margin-bottom:8px">${step.title}</div>
 <div style="font-size:.78rem;line-height:1.6;color:rgba(250,250,248,.85);margin-bottom:16px">${step.desc}</div>
 <div style="display:flex;justify-content:space-between;align-items:center">
 <span style="font-size:.65rem;color:rgba(250,250,248,.4)">Step ${stepIdx + 1} of ${MOS_TRAIN_TOUR.length}</span>
 <div style="display:flex;gap:6px">
 ${stepIdx > 0 ? `<button class="btn-secondary" onclick="showTrainingTourStep(${stepIdx - 1})" style="padding:5px 10px;font-size:.65rem">◄ Back</button>` : ''}
 ${stepIdx < MOS_TRAIN_TOUR.length - 1 ? `<button class="btn-primary" onclick="showTrainingTourStep(${stepIdx + 1})" style="margin:0;padding:5px 12px;font-size:.65rem">Next ➔</button>` : `<button class="btn-primary" onclick="closeTrainingTourModal()" style="margin:0;padding:5px 12px;font-size:.65rem">Finish Tour </button>`}
 <button class="btn-secondary" onclick="closeTrainingTourModal()" style="padding:5px 8px;font-size:.65rem">Skip</button>
 </div>
 </div>
 </div>
 `;
 modal.style.display = 'flex';
 };

 window.startNewProgram = function(){
  setAppMode('intake');
  go(1);
};
window.closeTrainingTourModal = function(){
 var modal = document.getElementById('mosTrainTourModal');
 if(modal) modal.style.display = 'none';
 };


 // ═══════════════════════════════════════
 // INIT
 // ═══════════════════════════════════════

 (function init(){
 var prog=ls(K.PG,null),sp=ls(K.SP,null),vt=ls(K.VT,null);
 var vi=ls(K.VI,{});
 // Pre-fill name/age if profile exists
 if(vi.name){var nEl=document.getElementById('userName');if(nEl)nEl.value=vi.name;}
 if(vi.age){var aEl=document.getElementById('userAge');if(aEl)aEl.value=vi.age;}
 if(vi.ta){var tEl=document.getElementById('ta');if(tEl)tEl.value=vi.ta;}
 if(vi.goal){var gEl=document.getElementById('goal');if(gEl)gEl.value=vi.goal;}
 if(vi.days){var dEl=document.getElementById('dow');if(dEl)dEl.value=vi.days;}
 if(vi.rec){var rEl=document.getElementById('recFactor');if(rEl)rEl.value=vi.rec;}
 // Enhanced Welcome Back Card for existing profile / program
 go(0);
    var hubEmpty = document.getElementById('hubEmptyState');
    var hubActive = document.getElementById('hubActiveState');
    var stepper = document.getElementById('stepper');
    
    if(prog || sp || vi.name){
      setAppMode('program');
      if(hubEmpty) hubEmpty.style.display = 'none';
      if(hubActive) hubActive.style.display = 'block';
      if(stepper) stepper.style.display = 'flex';
 var welcomeCard = document.getElementById('welcomeTrainingCard');
 if(welcomeCard){
 var name = vi.name || 'Athlete';
 var greetingTitle = document.getElementById('twTitleText');
 var hour = new Date().getHours();
 let greeting = ' WELCOME BACK';
 if(hour >= 5 && hour < 12) greeting = '☀ GOOD MORNING';
 else if(hour >= 12 && hour < 17) greeting = ' GOOD AFTERNOON';
 else if(hour >= 17 && hour < 22) greeting = ' GOOD EVENING';
 else greeting = ' NIGHT SHIFT ACTIVE';

 if(greetingTitle) greetingTitle.innerHTML = `${greeting}, <span id="twUserName">${name.toUpperCase()}</span>!`;

 var badgeEl = document.getElementById('twBadge');
 var nowStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
 if(badgeEl) badgeEl.innerHTML = `<span class="pulse-dot"></span> HYPERKINETIC MATRIX ACTIVE // LIVE SYNC [${nowStr}]`;

 var grid = document.getElementById('twGrid');
 if(grid){
 var splitName = prog ? prog.splitName : (sp ? sp.name : 'Custom Split');
 var totalSets = prog ? prog.totalSets + ' weekly sets' : (sp ? sp.sets + ' weekly sets' : 'Calibrated');
 var goalStr = (vi.goal || 'hypertrophy').toUpperCase() + (vi.ta ? ' (' + vi.ta + ')' : '');
 var mesoWeek = ls('mos_week_count', 1);

 grid.innerHTML = `
 <div class="tw-item">
 <div class="tw-lbl">Active Split &amp; Schedule</div>
 <div class="tw-val">${splitName}</div>
 <div class="tw-subval">${vi.days || 4} Days / Week</div>
 </div>
 <div class="tw-item">
 <div class="tw-lbl">Target Volume Allocation</div>
 <div class="tw-val" style="color:#F4C93B">${totalSets}</div>
 <div class="tw-subval">Autoregulated MEV-MRV</div>
 </div>
 <div class="tw-item">
 <div class="tw-lbl">Primary Focus &amp; Level</div>
 <div class="tw-val">${goalStr}</div>
 <div class="tw-subval">Age: ${vi.age || 25} yrs</div>
 </div>
 <div class="tw-item">
 <div class="tw-lbl">Mesocycle Overload Status</div>
 <div class="tw-val" style="color:#4CAF50">Week ${mesoWeek} Periodized</div>
 <div class="tw-subval">CNS Readiness: 98% Optimal</div>
 </div>
 `;
 }

 var resumeBtn = document.getElementById('twResumeBtn');
 if(resumeBtn){
 resumeBtn.addEventListener('click', function(){
 go(4);
 renderDashboard();
 });
 }

 var editBtn = document.getElementById('twEditBtn');
 if(editBtn){
 editBtn.addEventListener('click', function(){
 setAppMode('intake');
 go(1);
 });
 }
 }
 } else {
 setAppMode('intake');
 go(1);
 }
 console.log('Unified Training App loaded');
 translateUI();
 initTheme();
 initInstall();
 initSync();
 updateNotifToggle();
 checkNotif();
 })();

 // â”€â”€ Data Sync â”€â”€
 var SYNC_KEY='mos_sync_key';
 var SYNC_PW='mos_sync_pw';
 var SYNC_LAST='mos_sync_last';
 var SYNC_BASE='https://muscleos-access-control.muscleos.workers.dev/api/sync';
 var API_BASE='https://muscleos-access-control.muscleos.workers.dev/api';
 function notifyCoach(type, data){
 try{
 var _na={};
 try{var _ng=JSON.parse(localStorage.getItem('mos_google_session')||'null');if(_ng&&_ng.session)_na.session=_ng.session;}catch(e){}
 try{var _ns=JSON.parse(localStorage.getItem('mos_subscription')||'null');if(_ns&&_ns.token)_na.token=_ns.token;}catch(e){}
 fetch(API_BASE+'/notify-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type,data:data,session:_na.session,token:_na.token})})
 .catch(function(){});
 }catch(e){}
 }
 function syncPayload(){
 var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
 var data={};allKeys.forEach(function(k){var v=localStorage.getItem(k);if(v)data[k]=JSON.parse(v);});
 return data;
 }
 function genSyncId(){
 var id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'sync-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 var inp=document.getElementById('syncKeyInput');
 if(inp)inp.value=id;
 ss(SYNC_KEY,id);
 }
 function recoveryCode(){
 var v=ls(SYNC_KEY,'');
 if(!v){var inp=document.getElementById('syncKeyInput');v=inp?inp.value.trim():'';}
 return v;
 }
 function ensureRecRow(modal){
 if(!modal||document.getElementById('syncRecRow'))return;
 var row=document.createElement('div');
 row.id='syncRecRow';
 row.style.cssText='margin-top:10px;border-top:1px solid rgba(250,250,248,.06);padding-top:8px';
 row.innerHTML='<p style="font-size:.5rem;color:rgba(250,250,248,.25);margin:0 0 6px" data-i18n="sync_rec_warn"></p>'+
 '<div style="display:flex;gap:6px">'+
 '<button id="syncRecShow" style="flex:1;background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.2);color:#2196F3;border-radius:6px;padding:6px 10px;font-size:.55rem;cursor:pointer" data-i18n="sync_rec_show"></button>'+
 '<button id="syncRecRestore" style="flex:1;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.2);color:#FFB74D;border-radius:6px;padding:6px 10px;font-size:.55rem;cursor:pointer" data-i18n="sync_rec_restore"></button>'+
 '</div>';
 modal.querySelector('.modal-card').appendChild(row);
 row.querySelector('#syncRecShow').addEventListener('click',function(){
 var c=recoveryCode();
 if(c)alert(_('sync_rec_new').replace('{code}',c));
 else alert(_('sync_rec_bad'));
 });
 row.querySelector('#syncRecRestore').addEventListener('click',function(){
 var c=(prompt(_('sync_rec_enter'))||'').trim();
 if(!c)return;
 var re=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|sync-[A-Za-z0-9]+)$/i;
 if(!re.test(c)){alert(_('sync_rec_bad'));return;}
 ss(SYNC_KEY,c);var inp=document.getElementById('syncKeyInput');if(inp)inp.value=c;
 if(window.__evLog)window.__evLog('sync_restore');
 alert(_('sync_rec_ok'));
 });
 translateUI();
 }
 function showSync(){
 var modal=document.getElementById('syncModal');
 var inp=document.getElementById('syncKeyInput');
 var freshKey=false;
 if(inp&&!inp.value.trim()){
 var saved=ls(SYNC_KEY,'');
 if(!saved){
 saved=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'sync-'+Date.now().toString(36);
 ss(SYNC_KEY,saved);
 freshKey=true;
 }
 inp.value=saved;
 }
 var pw=document.getElementById('syncPwInput');
 if(pw&&!pw.value)pw.value=ls(SYNC_PW,'');
 var lastRow=document.getElementById('syncLastRow'),lt=ls(SYNC_LAST,'');
 if(lastRow&&lt){lastRow.style.display='block';document.getElementById('syncLastTs').textContent=new Date(lt).toLocaleString();}
 ensureRecRow(modal);
 if(modal)modal.style.display='block';
 if(freshKey){
 if(window.__evLog)window.__evLog('sync_key_created');
 alert(_('sync_rec_new').replace('{code}',recoveryCode()));
 }
 }
 function hideSync(){
 var modal=document.getElementById('syncModal');
 if(modal)modal.style.display='none';
 }
 function doSyncUpload(){
 var key=document.getElementById('syncKeyInput').value.trim();
 var pw=document.getElementById('syncPwInput').value.trim();
 if(!key||key.length<4){alert(_('sync_fail'));return;}
 if(!confirm(_('sync_confirm_upload')))return;
 ss(SYNC_KEY,key);ss(SYNC_PW,pw);evLog('sync_push');
 fetch(SYNC_BASE+'/'+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json','X-Sync-Passphrase':pw},body:JSON.stringify({data:syncPayload()})})
