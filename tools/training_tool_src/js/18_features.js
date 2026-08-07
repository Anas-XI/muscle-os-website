  // ── Missed-session make-up detection ──
  function dayLoggedDate(dayName,logs){
    var best=null;
    Object.keys(logs).forEach(function(ds){
      var done=false;
      Object.keys(logs[ds]).forEach(function(eid){
        if(eid.startsWith(dayName+'__')&&logs[ds][eid].sets&&logs[ds][eid].sets.some(function(s){return s&&(s.w||s.weight)&&parseFloat(s.w||s.weight)>0}))done=true;
      });
      if(done&&(!best||ds>best))best=ds;
    });
    return best;
  }
  function findMissedDay(){
    var prog=ls(K.PG,null);if(!prog||!prog.days)return null;
    var logs=ls(K.LG,{}),today=new Date().toISOString().split('T')[0];
    var trainDays=[];
    prog.days.forEach(function(d,i){if(!d.restDay)trainDays.push(i);});
    if(!trainDays.length)return null;
    var lastDone={idx:-1,date:null};
    trainDays.forEach(function(di){
      var d=dayLoggedDate(prog.days[di].n,logs);
      if(d&&(!lastDone.date||d>lastDone.date))lastDone={idx:di,date:d};
    });
    if(!lastDone.date||lastDone.date===today)return null;
    var pos=trainDays.indexOf(lastDone.idx);
    var expIdx=trainDays[(pos+1)%trainDays.length];
    if(dayLoggedDate(prog.days[expIdx].n,logs)===today)return null;
    var daysAgo=Math.max(1,Math.round((Date.now()-new Date(lastDone.date).getTime())/864e5));
    return {di:expIdx,name:prog.days[expIdx].n,daysAgo:daysAgo};
  }
  function renderMissedBanner(){
    var b=document.getElementById('missedBanner');if(!b)return;
    var missed=findMissedDay();
    if(!missed||missedSkip||makeupDays[missed.di]){
      b.style.display='none';return;
    }
    document.getElementById('missedText').innerHTML='<span style="font-size:.65rem">⚠</span> '+_('missed_title').replace('{name}','<strong>'+missed.name+'</strong>').replace('{days}',missed.daysAgo);
    b.style.display='flex';
  }
  function updateMakeupChip(){
    var h=document.getElementById('dashHeader');if(!h)return;
    var base=_('today_train')+' \u2014 '+ls(K.PG,{splitName:''}).splitName;
    if(makeupDays[dayIdx])base+=' <span class="makeup-chip">'+_('missed_chip')+'</span>';
    h.innerHTML=base;
  }
  function updateSupersetToggle(){
    var b=document.getElementById('supersetToggle');if(!b)return;
    var on=!!ls(K.SU,{})[dayIdx];
    b.classList.toggle('on',on);
    var lbl=document.getElementById('supersetToggleLabel');
    if(lbl)lbl.textContent=on?_('superset_on'):_('superset_off');
  }

  // ── Session timer + pace (F6) ──
  var SESSION_TIMER={running:false,startTs:0,elapsed:0,tick:null};
  function fmtClock(sec){var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=Math.floor(sec%60);return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;}
  function sessSetCount(){
    var t=new Date().toISOString().split('T')[0],logs=ls(K.LG,{})[t]||{},n=0;
    Object.keys(logs).forEach(function(eid){logs[eid].sets.forEach(function(x){if(x&&!x.wu&&parseFloat(x.weight||x.w)>0)n++;});});
    return n;
  }
  function sessionTimerToggle(){
    var disp=document.getElementById('sessionTimerDisplay'),btn=document.getElementById('sessionTimerToggle'),chip=document.getElementById('sessionTimerChip');
    if(!SESSION_TIMER.running){
      SESSION_TIMER.running=true;SESSION_TIMER.startTs=Date.now();SESSION_TIMER.elapsed=0;
      disp.textContent='00:00:00';
      SESSION_TIMER.tick=setInterval(function(){if(step===4)disp.textContent=fmtClock(SESSION_TIMER.elapsed+Math.floor((Date.now()-SESSION_TIMER.startTs)/1000));},1000);
      btn.textContent=_('session_stop');chip.classList.add('running');
    }else{
      SESSION_TIMER.elapsed+=Math.floor((Date.now()-SESSION_TIMER.startTs)/1000);
      clearInterval(SESSION_TIMER.tick);SESSION_TIMER.tick=null;SESSION_TIMER.running=false;
      var rec={date:new Date().toISOString().split('T')[0],durationSec:SESSION_TIMER.elapsed,sets:sessSetCount()};
      var all=ls(K.SS,[]);all.push(rec);if(all.length>200)all=all.slice(-200);ss(K.SS,all);
      btn.textContent=_('session_start');chip.classList.remove('running');
    }
  }
  (function(){var stBtn=document.getElementById('sessionTimerToggle');if(stBtn)stBtn.addEventListener('click',sessionTimerToggle);})();

  // ── Training-day notifications (F8) ──
  function todayIsTrainingDay(){
    var prog=ls(K.PG,null);if(!prog||!prog.days)return false;
    var logs=ls(K.LG,{}),today=new Date().toISOString().split('T')[0];
    var trainDays=[];prog.days.forEach(function(d,i){if(!d.restDay)trainDays.push(i);});
    if(!trainDays.length)return false;
    var lastDone={idx:-1,date:null};
    trainDays.forEach(function(di){
      var d=dayLoggedDate(prog.days[di].n,logs);
      if(d&&(!lastDone.date||d>lastDone.date))lastDone={idx:di,date:d};
    });
    if(!lastDone.date)return true;
    if(lastDone.date===today)return false;
    var pos=trainDays.indexOf(lastDone.idx);
    var expIdx=trainDays[(pos+1)%trainDays.length];
    return dayLoggedDate(prog.days[expIdx].n,logs)!==today;
  }
  function updateNotifToggle(){
    var lbl=document.getElementById('notifToggleLabel'),btn=document.getElementById('notifToggle');
    var on=!!ls('mos_notif_on',false);
    if(lbl)lbl.textContent=on?_('notif_on'):_('notif_off');
    if(btn)btn.classList.toggle('on',on);
  }
  function toggleNotif(){
    var on=!!ls('mos_notif_on',false);
    if(on){ss('mos_notif_on',false);}
    else{
      if(!('Notification' in window)){alert(_('notif_denied'));return;}
      if(Notification.permission==='default'){
        Notification.requestPermission().then(function(p){
          if(p==='granted'){ss('mos_notif_on',true);updateNotifToggle();checkNotif();}
          else alert(_('notif_denied'));
        });
        return;
      }
      if(Notification.permission==='granted'){ss('mos_notif_on',true);}
      else{alert(_('notif_denied'));return;}
    }
    updateNotifToggle();
    checkNotif();
  }
  function checkNotif(){
    try{
      if(!ls('mos_notif_on',false))return;
      if(!('Notification' in window)||Notification.permission!=='granted')return;
      if(!todayIsTrainingDay())return;
      var h=new Date().getHours(),th=parseInt(ls('mos_notif_hour','17'),10);
      if(h<th)return;
      var today=new Date().toISOString().split('T')[0];
      if(ls('mos_notif_last','')===today)return;
      try{new Notification(_('notif_title'),{body:_('notif_body'),icon:'icons/icon-192.png'});}catch(e){}
      ss('mos_notif_last',today);
    }catch(e){}
  }
  window.__notifCheck=checkNotif;window.toggleNotif=toggleNotif;window.updateNotifToggle=updateNotifToggle;
  setInterval(checkNotif,60000);

  // ── ICS calendar export (F9) ──
  function icsFmt(d){
    var p=function(x){return ('0'+x).slice(-2);};
    return ''+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+'00';
  }
  function exportIcs(){
    var prog=ls(K.PG,null);if(!prog||!prog.days){alert(_('sync_fail'));return;}
    var today=new Date();today.setHours(17,0,0,0);
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Muscle OS//Training Tool//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    var uid=Date.now();
    prog.days.forEach(function(day,i){
      if(day.restDay)return;
      var start=new Date(today);start.setDate(today.getDate()+i);
      var end=new Date(start.getTime()+3600000);
      var summary='Muscle OS: '+day.n;
      var desc=day.ex.map(function(e){return e.n;}).join(', ');
      lines.push('BEGIN:VEVENT');
      lines.push('UID:'+uid+'-'+i+'@muscle-os');
      lines.push('DTSTAMP:'+icsFmt(new Date()));
      lines.push('DTSTART;TZID=Africa/Cairo:'+icsFmt(start));
      lines.push('DTEND;TZID=Africa/Cairo:'+icsFmt(end));
      lines.push('RRULE:FREQ=WEEKLY');
      lines.push('SUMMARY:'+summary);
      if(desc)lines.push('DESCRIPTION:'+desc);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='muscle_os_program.ics';
    document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);},100);
  }
  window.exportIcs=exportIcs;

  function renderDashboard(){
    var prog=ls(K.PG,null),sp=ls(K.SP,null),vi=ls(K.VI,{});
    if(!prog||!sp){go(1);return;}
    var goal=vi.goal||'hypertrophy',age=vi.ta||'intermediate';
    var split=SPLITS[sp.key];if(!split)return;

    updateMakeupChip();
    updateSupersetToggle();
    updateNotifToggle();
    renderNudge();
    renderPlateaus();
    document.getElementById('dashProfile').innerHTML='<div class="rb-title">'+_('generate')+'</div><strong>'+prog.splitName+'</strong> · '+age+' · '+goal+' · '+prog.totalSets+' sets/wk';
    document.getElementById('dashProfile').style.display='block';
    renderWeekRow();

    // Day tabs
    var tabs=document.getElementById('dayTabs'),logs=ls(K.LG,{});
    tabs.innerHTML='';
    prog.days.forEach(function(day,di){
      var b=document.createElement('button');b.className='day-tab'+(day.restDay?' rest':'')+(di===dayIdx?' active':'');
      b.textContent=_('day')+' '+(di+1)+': '+day.n;
      var hasLog=false;
      if(!day.restDay){
        var wa=new Date(Date.now()-7*864e5).toISOString().split('T')[0];
        Object.keys(logs).forEach(function(ds){if(ds<wa)return;Object.keys(logs[ds]).forEach(function(eid){if(eid.startsWith(day.n+'__')&&logs[ds][eid].sets&&logs[ds][eid].sets.some(function(s){return s&&(s.weight||s.w)&&parseFloat(s.weight||s.w)>0}))hasLog=true;});});
        if(hasLog)b.innerHTML+='<span class="logged-dot"></span>';
      }
      (function(i){b.addEventListener('click',function(){tabs.querySelectorAll('.day-tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');dayIdx=i;var ec=document.getElementById('exCards');ec.classList.remove('fresh');void ec.offsetWidth;ec.classList.add('fresh');setTimeout(function(){ec.classList.remove('fresh');},500);renderDay(i);updateMakeupChip();updateSupersetToggle();});})(di);
      tabs.appendChild(b);
    });

    // Deload bar
    var dt=dlTracker(),ov=dt.overshoots||0,deload=shouldDeload(dt,age,ov);
    var db=document.getElementById('deloadBar');
    if(dt.sessions>0){db.style.display='flex';db.className='deload-bar'+(deload.yes?' deload-now':'');db.innerHTML=deload.yes?'<span class="db-warn">⚠ '+_('deload_now')+': '+deload.reason+'</span><span style="font-size:.5rem;color:rgba(250,250,248,.3)">'+deload.fix+'</span>':'<span class="db-lbl">'+_('weeks_since_deload')+'</span><span class="db-val">'+dt.sessions+'</span><span class="db-warn">'+(deloadInterval(age)-dt.sessions)+' '+_('wk_until_deload')+'</span>';if(deload.yes)evLog('deload_prompt',{reason:deload.reason},'dp_'+new Date().toISOString().split('T')[0]);}
    else db.style.display='none';

    renderMissedBanner();
    renderSuggestTray();
    // Fatigue check
    renderFatigueCheck();
    // Cardio today
    renderCardioDash();
    // Mesocycle calendar
    var mp=ls(K.MP,null),ma=ls(K.MA,null);
    var calSection=document.getElementById('mesoCalSection');
    if(mp&&ma){
      calSection.style.display='block';
      renderMesoCalendar();
      var cw=ma.currentWeek||1,advBtn=document.getElementById('advanceWeekBtn');
      advBtn.style.display=cw<=mp.weeks?'block':'none';
      advBtn.textContent=cw>=mp.weeks?_('generate_meso'):_('complete_week')+' '+(ma.currentWeek||1);
    } else {
      calSection.style.display='none';
    }
    // ACWR in dashboard
    renderACWRDash();
    // Auto adjustments
    renderAutoAdjustments();
    // Periodization detail
    renderPerDetail();
    // Rehab panel
    renderRehabPanel();
    renderMeasBadge();
    renderDay(dayIdx);
  }

  function renderFatigueCheck(){
    var bar=document.getElementById('fatigueBar'),fCheck=getTodayFatigue();
    if(!bar)return;
    // Default fatigue check on fresh pages
    if(!fCheck){
      bar.style.display='block';bar.className='fatigue-bar';
      document.getElementById('fatigueScore').textContent='\u2014';
      document.getElementById('fatigueLabel').textContent=_('unchecked');
      document.getElementById('fatigueDetail').textContent=_('fatigue_rates');
      document.getElementById('fatigueAdjust').textContent='';
      renderFatigueForm(null);
      return;
    }
    var fs=fatigueScore(fCheck);
    bar.style.display='block';bar.className='fatigue-bar checked '+fs.color;
    document.getElementById('fatigueScore').textContent=fs.score.toFixed(1);
    document.getElementById('fatigueLabel').textContent=fs.label;
    document.getElementById('fatigueDetail').textContent=_('fatigue_sleep_lbl')+': '+fCheck.sleep+' · '+_('fatigue_stress_lbl')+': '+fCheck.stress+' · '+_('fatigue_doms_lbl')+': '+fCheck.doms+' · '+_('fatigue_nutrition_lbl')+': '+fCheck.nutrition+' · '+_('fatigue_cns_lbl')+': '+fCheck.cns;
    document.getElementById('fatigueAdjust').textContent=fs.adjust<0?(_('fatigue_rpe_adjusted')) : _('fatigue_ready');
    renderFatigueForm(fCheck);
  }

  function renderFatigueForm(f){
    var grid=document.getElementById('fatigueGrid');
    if(!grid)return;
    var fields=['sleep','stress','doms','nutrition','cns'];
    var labels={sleep:_('fatigue_sleep'),stress:_('fatigue_stress'),doms:_('fatigue_doms'),nutrition:_('fatigue_nutrition'),cns:_('fatigue_cns')};
    var hints={sleep:_('fatigue_hint_sleep'),stress:_('fatigue_hint_stress'),doms:_('fatigue_hint_doms'),nutrition:_('fatigue_hint_nutrition'),cns:_('fatigue_hint_cns')};
    var def=defaultFatigue();
    grid.innerHTML=fields.map(function(k){
      var v=f&&f[k]!==undefined?f[k]:def[k];
      return '<div class="fg-item"><label>'+labels[k]+' <span style="font-weight:400;color:rgba(250,250,248,.1)">'+hints[k]+'</span></label><input type="number" min="1" max="10" step="1" value="'+v+'" data-fk="'+k+'"></div>';
    }).join('');
  }

  function renderCardioDash(){
    var td=todayCardio();
    document.getElementById('cardioTodayBadge').textContent=td.length?td.length+' '+_('cardio_today'):'';
    var hist=document.getElementById('cardioHistory');
    var wc=weeklyCardio();
    if(wc.sessions>0)hist.innerHTML='<strong>'+_('cardio_this_week')+':</strong> '+wc.sessions+' '+_('cardio_sessions')+', '+wc.minutes+' min'+(wc.detail?Object.keys(wc.detail).map(function(t){return' · '+t+': '+wc.detail[t]+'min'}).join(''):'');
    else hist.textContent='';
  }

  function renderPerDetail(){
    var peri=ls('mos_periodization',null),pl=ls(K.PL,null),el=document.getElementById('perDetail');
    if(!peri||!pl){el.style.display='none';return;}
    el.style.display='block';
    var mainLifts=_('per_squat_label')+': '+(pl.squat||'—')+' kg · '+_('per_bench_label')+': '+(pl.bench||'—')+' kg · '+_('per_deadlift_label')+': '+(pl.deadlift||'—')+' kg';
    var weaks=pl.weaks&&pl.weaks.length?' · '+_('per_weak_points')+': '+pl.weaks.join(', '):'';
    el.innerHTML='<span class="per-label">'+_('per_periodization')+'</span> <strong>'+peri.name+'</strong><br><span style="color:rgba(250,250,248,.25)">'+peri.desc+'</span><br><span style="font-size:.5rem;color:rgba(250,250,248,.15)">'+mainLifts+weaks+'</span>';
  }

  function renderACWRDash(){
    var acwr=calculateACWR();
    var el=document.getElementById('acwrDash');
    if(!el)return;
    if(acwr.ratio>0){
      el.style.display='flex';
      el.className='acwr-bar';
      el.style.background=acwr.ratio>1.5?'rgba(244,67,54,.04)':acwr.ratio>1.3?'rgba(255,152,0,.04)':'rgba(250,250,248,.02)';
      el.style.borderColor=acwr.color;
      el.innerHTML='<span class="acwr-val" style="color:'+acwr.color+'">'+acwr.ratio.toFixed(2)+'</span>'+
        '<span class="acwr-risk" style="color:'+acwr.color+'">'+acwr.risk.split(' — ')[0]+'</span>'+
        '<span style="font-size:.45rem;color:rgba(250,250,248,.15);margin-left:auto">'+_('acwr_ratio')+'</span>';
    } else {el.style.display='none';}
  }

  // ── Rest Timer ──
  var restTimers={};
  function formatTime(s){var m=Math.floor(s/60);var sec=s%60;return m+':'+(sec<10?'0':'')+sec;}
  function playTimerBeep(){
    try{
      var act=new(window.AudioContext||window.webkitAudioContext)();
      var osc=act.createOscillator(),gain=act.createGain();
      osc.type='sine';osc.frequency.value=880;
      gain.gain.value=0.1;osc.connect(gain);gain.connect(act.destination);
      for(var i=0;i<3;i++){
        var t=act.currentTime+i*0.3;
        gain.gain.setValueAtTime(0,t);
        gain.gain.linearRampToValueAtTime(0.1,t+0.02);
        gain.gain.linearRampToValueAtTime(0,t+0.15);
      }
      osc.start();osc.stop(act.currentTime+0.9);
    }catch(e){}
    if(navigator.vibrate){navigator.vibrate([100,50,100,50,100]);}
  }
  function timerSoundEnabled(ex){
    try{return sessionStorage.getItem('mos_timer_sound_'+ex)!=='false';}catch(e){return true;}
  }
  function setTimerSoundEnabled(ex,on){
    try{sessionStorage.setItem('mos_timer_sound_'+ex,on?'true':'false');}catch(e){}
  }
  function startRestTimer(ex){evLog('rest_timer',{ex:ex});
    if(restTimers[ex]&&restTimers[ex].interval)return;
    var el=document.querySelector('.rest-timer[data-ex="'+ex+'"]');
    if(!el)return;
    var seconds=parseInt(el.dataset.seconds)||240;
    restTimers[ex]={remaining:seconds,interval:null,el:el};
    el.querySelector('.rt-start').style.display='none';
    el.querySelector('.rt-stop').style.display='';
    restTimers[ex].interval=setInterval(function(){
      restTimers[ex].remaining--;
      var rtd=document.getElementById('rtd_'+ex.replace(/[^a-zA-Z0-9]/g,'_'));
      if(rtd)rtd.textContent=formatTime(restTimers[ex].remaining);
      if(restTimers[ex].remaining<=0){
        clearInterval(restTimers[ex].interval);
        restTimers[ex].interval=null;
        el.querySelector('.rt-start').style.display='';
        el.querySelector('.rt-stop').style.display='none';
        if(rtd)rtd.textContent=_('time_up');
        if(timerSoundEnabled(ex))playTimerBeep();
      }
    },1000);
  }
  function stopRestTimer(ex){
    if(!restTimers[ex]||!restTimers[ex].interval)return;
    clearInterval(restTimers[ex].interval);
    restTimers[ex].interval=null;
    var el=document.querySelector('.rest-timer[data-ex="'+ex+'"]');
    if(el){el.querySelector('.rt-start').style.display='';el.querySelector('.rt-stop').style.display='none';}
  }
  function resetRestTimer(ex){
    stopRestTimer(ex);
    var el=document.querySelector('.rest-timer[data-ex="'+ex+'"]');
    if(!el)return;
    var seconds=parseInt(el.dataset.seconds)||240;
    if(restTimers[ex])restTimers[ex].remaining=seconds;
    var rtd=document.getElementById('rtd_'+ex.replace(/[^a-zA-Z0-9]/g,'_'));
    if(rtd)rtd.textContent=formatTime(seconds);
  }

  // ── Plate Calculator ──
  const PLATES = [25,20,15,10,5,2.5,1.25,0.5];
  const BAR_WEIGHT = 20;
  function calculatePlates(totalWeight){
    var perSide = (totalWeight - BAR_WEIGHT) / 2;
    if(perSide < 0) return {weight: totalWeight, plates: [], note: _('plate_unachievable')};
    var remaining = perSide;
    var plates = [];
    for(var i=0;i<PLATES.length;i++){
      var p = PLATES[i];
      var count = Math.floor(remaining / p + 1e-9);
      if(count > 0){
        for(var j=0;j<count;j++) plates.push(p);
        remaining -= count * p;
      }
    }
    var achieved = BAR_WEIGHT + plates.reduce(function(s,p){return s+p*2},0);
    var diff = Math.abs(achieved - totalWeight);
    var note = diff <= 0.25 ? '' : _('plate_unachievable');
    return {weight: totalWeight, plates: plates, perSideWeight: perSide, achieved: achieved, note: note};
  }
  function showPlateCalculator(weight, event){evLog('plate_calc',{w:weight});
    var result = calculatePlates(weight);
    var modal = document.getElementById('plateModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'plateModal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
      modal.onclick = function(e){ if(e.target===this) hidePlateCalculator(); };
      document.body.appendChild(modal);
    }
    var platesHtml = result.plates.length ? result.plates.join(' + ') : _('plate_unachievable');
    modal.innerHTML = '<div class="modal-card"><div class="modal-header"><span data-i18n="plate_title">'+_('plate_title')+'</span><span class="modal-close" onclick="hidePlateCalculator()">✕</span></div>'+
      '<div style="font-size:.65rem;color:var(--text-soft);margin-bottom:10px"><strong>'+_('plate_bar')+':</strong> '+BAR_WEIGHT+' kg</div>'+
      '<div style="font-size:.65rem;color:var(--text);margin-bottom:10px"><strong>'+_('plate_per_side')+':</strong> '+platesHtml+' kg</div>'+
      '<div style="font-size:.7rem;font-weight:600;color:var(--accent);margin-bottom:6px">Total: '+result.achieved+' kg</div>'+
      (result.note ? '<div style="font-size:.55rem;color:#f44336;margin-bottom:6px">'+result.note+'</div>' : '')+
      '<button class="btn-primary" onclick="hidePlateCalculator()" style="width:100%" data-i18n="close">Close</button></div>';
    modal.style.display = 'flex';
  }
  function hidePlateCalculator(){
    var modal = document.getElementById('plateModal');
    if(modal) modal.style.display = 'none';
  }
  window.calculatePlates=calculatePlates;
  window.showPlateCalculator=showPlateCalculator;
  window.hidePlateCalculator=hidePlateCalculator;

  // ── Exercise card builders (normal + superset) ──
  function restTimerHTML(ex,restSec,restLabel){
    var soundOn=timerSoundEnabled(ex.n);
    return '<div class="rest-timer" data-ex="'+ex.n+'" data-seconds="'+restSec+'"><span class="rt-label">'+_('rest_timer_label')+'</span><span class="rt-recommend">'+restLabel+'</span><span class="rt-display" id="rtd_'+ex.n.replace(/[^a-zA-Z0-9]/g,'_')+'">'+formatTime(restSec)+'</span><button class="rt-start" data-ex="'+ex.n+'">'+_('timer_start')+'</button><button class="rt-stop" data-ex="'+ex.n+'" style="display:none">'+_('timer_stop')+'</button><button class="rt-reset" data-ex="'+ex.n+'">'+_('timer_reset')+'</button><button class="rt-sound" data-ex="'+ex.n+'" title="'+(soundOn?_('timer_sound_on'):_('timer_sound_off'))+'">'+(soundOn?'🔊':'🔇')+'</button></div>';
  }
  function exCtx(ex,ei,di,day){
    var goal=(ls(K.VI,{})).goal||'hypertrophy',age=(ls(K.VI,{})).ta||'intermediate';
    var logs=ls(K.LG,{}),hist=loadHist(),pf=painFlags();
    var fCheck=getTodayFatigue(),fs=fCheck?fatigueScore(fCheck):null;
    var fatigueAdj=fs?fs.adjust:0;
    var peri=ls('mos_periodization',null),wkCount=ls('mos_week_count',1);
    var m=meta(ex.n),sugg=rehabSuggest(ex.n,goal,age,hist,pf,fatigueAdj);
    if(ex.prehab){
      sugg={w:null,r:m.rr?m.rr[1]:15,rpe:4,e1RM:null,exp:_('prehab_reason'),last:null,blocked:false};
    }
    if(lightDays[di]&&sugg&&sugg.w!==null&&sugg.w>0){
      var lInc=m.inc>0?m.inc:2.5;
      sugg.w=Math.max(lInc,Math.round(sugg.w*0.8/lInc)*lInc);
    }
    var safety=checkSafety(ex.n,sugg,di,logs,hist,pf,age);
    var pfc=pf[ex.n]||'green';
    var cc=pfc==='red'?'ex-card pain-red':pfc==='yellow'?'ex-card pain-yellow':'ex-card';
    var sid=('c_'+di+'_'+ex.n).replace(/[^a-zA-Z0-9]/g,'_');
    var pr=null;
    if(sugg&&sugg.w&&sugg.r)pr=checkPR(ex.n,sugg.w,sugg.r,hist);
    var prHtml=pr?pr.isPR?' <span class="pr-badge" style="color:#F4C93B;border-color:#F4C93B">'+_('pr_badge_pr')+'</span>':pr.note.includes('nearby')?' <span class="pr-badge" style="color:#FF9800;border-color:rgba(255,152,0,.3)">'+_('pr_badge_close')+'</span>':'':'';if(pr&&pr.isPR)evLog('pr_badge',{ex:ex.n});
    var isMain=MAIN_LIFTS.indexOf(ex.n)>=0;
    var perHtml='';
    if(peri&&isMain){mainLiftRPE(peri,wkCount||1,goal,day.n);perHtml=' <span class="per-badge">'+peri.name+'</span>';}
    var last=sugg.last;
    var metaHtml='<div class="ex-meta">'+(last?_('last_session')+': <strong>'+(last.w||last.weight)+' '+_('weight')+' × '+(last.r||last.reps)+' @ '+_('rpe')+' '+last.rpe+'</strong> · ':'')+_('e1rm_abbr')+': <strong>'+(sugg.e1RM?sugg.e1RM+' '+_('weight'):'—')+'</strong></div>';
    var prNoteHtml=pr?'<div style="font-size:.55rem;color:rgba(250,250,248,.3);margin-bottom:4px">'+pr.note+'</div>':'';
    var safetyHtml='';
    if(safety.warn.length>0){
      var bl=safety.sub;
      safetyHtml='<div class="safety-block">'+safety.warn.map(function(w){return'<strong>⛔</strong> '+w}).join('<br>')+(bl?'<div class="sub-option">Try: <strong>'+bl+'</strong></div>':'')+'</div>';
    }
    var fatigueNote='';
    if(fatigueAdj<0)fatigueNote=' <span style="color:'+(fatigueAdj<=-1?'#f44336':'#FF9800')+';font-size:.5rem;font-weight:600">Readiness fatigue: RPE −'+(Math.abs(fatigueAdj).toFixed(1))+'</span>';
    var mlNote='';
    if(peri&&isMain){mlNote='<br><span style="color:#2196F3;font-size:.5rem">'+mainLiftRPE(peri,wkCount||1,goal,day.n).desc+'</span>';}
    var suggestHtml='';
    if(!sugg.blocked&&sugg.w!==null){
      suggestHtml='<div class="suggest-box"><div><span class="suggest-val" onclick="showPlateCalculator('+sugg.w+',event)" style="cursor:pointer" title="'+_('plate_title')+'">'+(sugg.w>0?sugg.w+' '+_('weight'):'—')+'</span></div><div class="suggest-detail"><strong>'+(sugg.w>0?sugg.w+' '+_('weight'):'—')+' × '+sugg.r+' '+_('reps')+' @ '+_('rpe')+' '+sugg.rpe+'</strong>'+fatigueNote+mlNote+'<br>'+sugg.exp+(sugg.pct?' · '+(sugg.pct).toFixed(0)+_('pct_1rm'):'')+'</div></div>';
      suggestHtml+=renderWarmupHtml(ex.n,sugg,day.n);
    }else if(!sugg.blocked){suggestHtml='<div class="suggest-box"><div class="suggest-detail"><strong>'+_('start_training')+'</strong>'+fatigueNote+'<br>'+sugg.exp+'</div></div>';}
    var titleInnerHtml='<span class="ex-name">'+(ei+1)+'. '+exLinkHtml(ex.n)+'</span>'+prHtml+(ex.prehab?' <span class="prehab-chip" title="'+_('prehab_reason')+'">'+_('prehab_lbl')+'</span>':'')+perHtml+
      '<span class="safety-badge '+safety.sev+'">'+(safety.sev==='safe'?'\u2713 '+_('green'):safety.sev==='warn'?'\u26A0 '+_('yellow'):'\u2715 '+_('red'))+'</span>'+
      '<span class="rm-ex-btn" data-ex="'+ex.n+'">✕</span>';
    var msubs=(m&&m.subs)||[],ceList=ls(K.CE,[]),sp=ls(K.SP,null),spSplit=sp&&SPLITS[sp.key];
    var orig=ex.prehab?null:(ex.orig||(spSplit&&spSplit.days[di]&&spSplit.days[di].ex[ei]?spSplit.days[di].ex[ei].n:null));
    var swapChips='';
    if(orig&&orig!==ex.n)swapChips+='<button class="swap-chip original" data-di="'+di+'" data-idx="'+ei+'" data-ex="'+ex.n+'" data-to="'+orig+'">↩ '+_('swap_back')+' ('+(EX_TR[orig]?exDisplay(orig):orig)+')</button>';
    msubs.forEach(function(s){if(s!==ex.n)swapChips+='<button class="swap-chip" data-di="'+di+'" data-idx="'+ei+'" data-ex="'+ex.n+'" data-to="'+s+'">'+(EX_TR[s]?exDisplay(s):s)+'</button>';});
    ceList.forEach(function(c){if(c.name!==ex.n&&(c.f===ex.p||ex.se.indexOf(c.f)>=0))swapChips+='<button class="swap-chip" data-di="'+di+'" data-idx="'+ei+'" data-ex="'+ex.n+'" data-to="'+c.name+'">'+(EX_TR[c.name]?exDisplay(c.name):c.name)+'</button>';});
    var swapHtml=swapChips?'<div class="swap-panel"><div class="swp-title">'+_('swap_title')+'</div><div class="swp-hint">'+_('swap_hint')+'</div>'+swapChips+'</div>':'';
    var painHtml='<div class="pain-group"><span class="pain-lbl">'+_('red')+'</span>'+
      '<button class="pain-btn'+(pfc==='green'?' active-green':'')+'" data-ex="'+ex.n+'" data-p="green">🟢</button>'+
      '<button class="pain-btn'+(pfc==='yellow'?' active-yellow':'')+'" data-ex="'+ex.n+'" data-p="yellow">🟡</button>'+
      '<button class="pain-btn'+(pfc==='red'?' active-red':'')+'" data-ex="'+ex.n+'" data-p="red">🔴</button></div>';
    var restSec=m.t==='compound'?240:150;
    var restLabel=m.t==='compound'?_('timer_compound'):_('timer_isolation');
    return {cc:cc,sid:sid,titleInnerHtml:titleInnerHtml,metaHtml:metaHtml,prNoteHtml:prNoteHtml,safetyHtml:safetyHtml,suggestHtml:suggestHtml,painHtml:painHtml,swapHtml:swapHtml,restSec:restSec,restLabel:restLabel,sugg:sugg};
  }
  function setLoggerHTML(ex,di,dayName,today,logs,sugg,prefix){
    var eid=dayName+'__'+ex.n,dl=logs[today]&&logs[today][eid]?logs[today][eid]:null;
    var storedSets=(dl&&dl.sets&&dl.sets.length)?dl.sets:null;
    var wuPlan=[];if(sugg&&sugg.w&&sugg.w>0){var wuMeta=meta(ex.n);wuPlan=calcWarmup(sugg.w,wuMeta.t==='compound'?3:2,0.4,0.2,2,sugg.r||10);}
    var wuCount=wuPlan.length;
    var sets=[];
    wuPlan.forEach(function(wp){
      sets.push({w:wp.weight>0?String(wp.weight):'',r:wp.reps>0?String(wp.reps):'',rpe:'',wu:true});
    });
    if(storedSets){
      storedSets.forEach(function(s,si){
        if(!s)return;
        if(s.wu&&si<wuCount){
          sets[si].wu=true;
          if(s.w)sets[si].w=s.w;
          if(s.r)sets[si].r=s.r;
          if(s.rpe)sets[si].rpe=s.rpe;
        }else{
          sets[si]=s;
        }
      });
    }else{
      var padEmpty=(makeupDays[di]||lightDays[di])?Math.max(1,(ex.sets||3)-1):3;
      for(var i2=0;i2<padEmpty;i2++)sets.push({w:'',r:'',rpe:''});
    }
    var h='<div class="set-log-area"><div class="set-log-header"><span style="line-height:1.25;white-space:normal;font-size:.42rem;letter-spacing:.2px">'+_('sets_work')+'</span><span>'+_('load')+'</span><span>'+_('reps')+'</span><span>'+_('rpe')+'</span><span></span></div><div class="set-rows-'+('c_'+di+'_'+ex.n).replace(/[^a-zA-Z0-9]/g,'_')+'">';
    sets.forEach(function(set,si){
      var isWu=!!set.wu;
      var wVal = set.w||'';
      var wClick = wVal ? 'onclick="showPlateCalculator('+parseFloat(wVal)+',event)" style="cursor:pointer"' : '';
      var wuAttr=isWu?' data-wu="1"':'';
      var rowCls=isWu?' set-row wu-row':'set-row';
      var lbl=prefix+(isWu?' '+_('warmup_row')+' '+(si+1):(si+1));
      if(!isWu&&wuCount>0&&si===wuCount)h+='<div class="wu-divider">'+_('warmup_lbl')+'</div>';
      h+='<div class="'+rowCls+'" data-ex="'+ex.n+'" data-set="'+si+'"'+(isWu?' data-wu="1"':'')+'><span class="set-lbl">'+lbl+'</span>'+
      '<input type="number" step="0.5" placeholder="'+_('weight')+'" value="'+wVal+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="w"'+wuAttr+' '+wClick+'>'+
      '<input type="number" step="1" placeholder="'+_('reps')+'" value="'+(set.r||'')+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="r"'+wuAttr+'>'+
      '<input type="number" step="0.5" placeholder="'+_('rpe')+'" value="'+(set.rpe||'')+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="rpe"'+wuAttr+'>'+
      '<button class="del-set-btn" data-ex="'+ex.n+'" data-set="'+si+'">✕</button></div>';
    });
    h+='</div><button class="add-set-btn" data-ex="'+ex.n+'">+ '+_('set')+'</button></div>';
    return h;
  }
  function buildNormalExCard(ex,ei,di,day){
    var c=exCtx(ex,ei,di,day);
    var today=new Date().toISOString().split('T')[0];
    var html='<div class="'+c.cc+'" id="'+c.sid+'">'+
      '<div class="ex-title">'+c.titleInnerHtml+
      (ex.optional?'<span class="opt-badge">'+_('sess_optional')+'</span>':'')+
      '<button class="sw-ex-btn" data-ex="'+ex.n+'" title="'+_('swap_title')+'">⇄ '+_('swap_btn')+'</button></div>'+
      c.metaHtml+c.prNoteHtml+c.safetyHtml+c.suggestHtml+
      restTimerHTML(ex,c.restSec,c.restLabel)+
      c.painHtml+c.swapHtml+
      setLoggerHTML(ex,di,day.n,today,ls(K.LG,{}),c.sugg,'')+
      '</div>';
    return html;
  }
  function buildSupersetExCard(exA,exB,eiA,eiB,di,day){
    var cA=exCtx(exA,eiA,di,day),cB=exCtx(exB,eiB,di,day);
    var today=new Date().toISOString().split('T')[0],logs=ls(K.LG,{});
    var safetyRow=(cA.safetyHtml||cB.safetyHtml)?'<div class="ss-safety">'+cA.safetyHtml+cB.safetyHtml+'</div>':'';
    return '<div class="ex-card superset-card">'+
      '<div class="ss-title-row">'+
        '<div class="ss-title a"><span class="ss-badge">'+_('superset_a')+'</span>'+cA.titleInnerHtml+'</div>'+
        '<div class="ss-title b"><span class="ss-badge">'+_('superset_b')+'</span>'+cB.titleInnerHtml+'</div>'+
      '</div>'+
      '<div class="ss-meta-row"><div>'+cA.metaHtml+'</div><div>'+cB.metaHtml+'</div></div>'+
      safetyRow+
      '<div class="ss-suggest"><div class="ss-col">'+cA.suggestHtml+'</div><div class="ss-col">'+cB.suggestHtml+'</div></div>'+
      '<div class="rest-timer ss-rest" data-ex="'+exA.n+'" data-seconds="90">'+_('rest_timer_label')+' · <span class="rt-recommend">90s</span> — '+
      '<span class="rt-display" id="rtd_'+exA.n.replace(/[^a-zA-Z0-9]/g,'_')+'">'+formatTime(90)+'</span>'+
      '<button class="rt-start" data-ex="'+exA.n+'">'+_('timer_start')+'</button>'+
      '<button class="rt-stop" data-ex="'+exA.n+'" style="display:none">'+_('timer_stop')+'</button>'+
      '<button class="rt-reset" data-ex="'+exA.n+'">'+_('timer_reset')+'</button></div>'+
      '<div class="ss-cols">'+
        '<div class="ss-col a">'+setLoggerHTML(exA,di,day.n,today,logs,cA.sugg,'A')+'</div>'+
        '<div class="ss-col b">'+setLoggerHTML(exB,di,day.n,today,logs,cB.sugg,'B')+'</div>'+
      '</div>'+
      '</div>';
  }

  // ── Antagonist superset pairing (opposite muscle groups) ──
  var SS_ANTAGONIST={
    chest:'back',back:'chest',
    biceps:'triceps',triceps:'biceps',
    quads:'hamstrings',hamstrings:'quads',
    glutes:'hamstrings'
  };
  var SS_POOL_ORDER=['chest','back','shoulders','quads','hamstrings','glutes','biceps','triceps','calves','traps','forearms','abs'];
  function poolOf(ex){
    for(var i=0;i<SS_POOL_ORDER.length;i++){
      if(EXERCISE_POOLS[SS_POOL_ORDER[i]].indexOf(ex.n)>=0)return SS_POOL_ORDER[i];
    }
    var ce=ls(K.CE,[]);
    for(var j=0;j<ce.length;j++){if(ce[j].name===ex.n&&ce[j].f&&EXERCISE_POOLS[ce[j].f])return ce[j].f;}
    var p=ex.p||ex.f;
    if(p&&EXERCISE_POOLS[p])return p;
    return null;
  }
  function shoulderKind(ex){
    return /rear|face pull|reverse pec|bent-over|wide row/i.test(ex)?'rear':'frontmid';
  }
  function ssCanPair(a,b){
    var pa=poolOf(a),pb=poolOf(b);
    if(!pa||!pb)return false;
    if(pa==='shoulders'&&pb==='shoulders')return shoulderKind(a.n)!==shoulderKind(b.n);
    return SS_ANTAGONIST[pa]===pb;
  }
  function buildAntagonistPairs(exs){
    var used=[],i;
    for(i=0;i<exs.length;i++)used.push(false);
    var pairs=[];
    for(i=0;i<exs.length;i++){
      if(used[i])continue;
      var j2=-1;
      for(var j=i+1;j<exs.length;j++){
        if(!used[j]&&ssCanPair(exs[i],exs[j])){j2=j;break;}
      }
      if(j2>=0){pairs.push([{e:exs[i],i:i},{e:exs[j2],i:j2}]);used[i]=used[j2]=true;}
    }
    var rest=[];
    for(var k=0;k<exs.length;k++)if(!used[k])rest.push({e:exs[k],i:k});
    var r=0;
    while(r<rest.length){
      var a=rest[r++],b=rest[r++];
      if(b&&poolOf(a.e)&&poolOf(a.e)===poolOf(b.e))pairs.push([a,b]);
      else if(b){pairs.push([a]);pairs.push([b]);}
      else pairs.push([a]);
    }
    return pairs;
  }
  window.__ssBuildPairs=buildAntagonistPairs;
  window.__ssPoolOf=poolOf;

  function renderDay(di){
    var prog=ls(K.PG,null);if(!prog||!prog.days[di])return;
    var day=prog.days[di],goal=(ls(K.VI,{})).goal||'hypertrophy',age=(ls(K.VI,{})).ta||'intermediate';
    var logs=ls(K.LG,{}),hist=loadHist(),pf=painFlags(),today=new Date().toISOString().split('T')[0];
    var fCheck=getTodayFatigue(),fs=fCheck?fatigueScore(fCheck):null;
    var fatigueAdj=fs?fs.adjust:0;
    var peri=ls('mos_periodization',null),wkCount=ls('mos_week_count',1);
    var container=document.getElementById('exCards'),html='';

    if(day.restDay){
      container.innerHTML='<div class="rest-card"><div class="rc-title">'+_('rest_day')+'</div><div class="rc-tip">'+_('rest_day_recover')+'</div>'+
        '<div class="rc-tip">• '+_('rest_tip_1')+'</div>'+
        '<div class="rc-tip">• '+_('rest_tip_2')+'</div>'+
        '<div class="rc-tip">• '+_('rest_tip_3')+'</div>'+
        '<div class="rc-tip">• '+_('rest_tip_4')+'</div></div>';
      updateSummary(di);
      return;
    }

    // General warm-up for this day
    html+=renderGeneralWarmup(day.n);
    if(day.ssSuggested)html+='<div style="font-size:.5rem;color:#F4C93B;text-align:center;margin:2px 0 6px">⚡ '+_('sess_suggest_ss')+'</div>';

    if(fs&&fs.adjust<=-1&&!lightDays[di]&&!lightProceed[di]){evLog('fat_gate',{di:di,score:fs.score});
      html+='<div class="fat-light-banner"><span class="flb-title">'+_('fat_light_title')+'</span>'+
        '<span class="flb-desc">'+_('fat_light_desc')+'</span>'+
        '<div class="flb-btns"><button class="fat-light-btn" data-di="'+di+'" data-light="1">'+_('fat_light_btn')+'</button>'+
        '<button class="fat-light-btn" data-di="'+di+'" data-light="0">'+_('fat_planned_btn')+'</button></div></div>';
    }

    html+=renderSorenessCards(day,di);

    var ssOn=!!ls(K.SU,{})[di];
    if(ssOn){
      buildAntagonistPairs(day.ex).forEach(function(pair){
        if(pair.length===2)html+=buildSupersetExCard(pair[0].e,pair[1].e,pair[0].i,pair[1].i,di,day);
        else html+=buildNormalExCard(pair[0].e,pair[0].i,di,day);
      });
    }else{
      day.ex.forEach(function(ex,ei){html+=buildNormalExCard(ex,ei,di,day);});
    }

    container.innerHTML=html;

    // Wire inputs
    container.querySelectorAll('.set-row input').forEach(function(inp){inp.addEventListener('input',function(){saveSet(di,this.dataset.ex,parseInt(this.dataset.set),this.dataset.f,this.value,this.dataset.wu);});});
    container.querySelectorAll('.del-set-btn').forEach(function(b){b.addEventListener('click',function(){delSet(di,this.dataset.ex,parseInt(this.dataset.set));});});
    container.querySelectorAll('.add-set-btn').forEach(function(b){b.addEventListener('click',function(){addSet(di,this.dataset.ex);});});
    container.querySelectorAll('.rm-ex-btn').forEach(function(b){b.addEventListener('click',function(){if(confirm('Remove "'+this.dataset.ex+'" from '+_('today_train')+'?'))rmEx(di,this.dataset.ex);});});
    container.querySelectorAll('.sw-ex-btn').forEach(function(b){b.addEventListener('click',function(){var p=b.parentElement.parentElement.querySelector('.swap-panel');if(p)p.classList.toggle('open');});});
    container.querySelectorAll('.swap-chip').forEach(function(chip){chip.addEventListener('click',function(){swapEx(parseInt(chip.dataset.di),parseInt(chip.dataset.idx),chip.dataset.ex,chip.dataset.to);});});
    container.querySelectorAll('.pain-btn').forEach(function(b){b.addEventListener('click',function(){var pf=painFlags();pf[this.dataset.ex]=this.dataset.p;ss(K.PF,pf);renderDay(di);});});
    container.querySelectorAll('.fat-light-btn').forEach(function(b){b.addEventListener('click',function(){if(this.dataset.gm!==undefined)return;var i=parseInt(this.dataset.di);evLog(this.dataset.light==='1'?'fat_gate_light':'fat_gate_proceed',{di:i});if(this.dataset.light==='1')lightDays[i]=true;else lightProceed[i]=true;renderDay(i);});});
    container.querySelectorAll('.sr-chip').forEach(function(b){b.addEventListener('click',function(){saveSoreness(b.dataset.m,parseInt(b.dataset.v,10));renderDay(parseInt(b.dataset.di,10));});});
    container.querySelectorAll('.fat-light-btn[data-gm]').forEach(function(b){b.addEventListener('click',function(){var fo=ls(K.FO,{}),wk=weekStartISO();if(!fo[wk])fo[wk]={};fo[wk][b.dataset.gm]=parseInt(b.dataset.gfreq,10);ss(K.FO,fo);renderDay(parseInt(b.dataset.di,10));});});
    container.querySelectorAll('.rt-start').forEach(function(b){b.addEventListener('click',function(){startRestTimer(this.dataset.ex);});});
    container.querySelectorAll('.rt-stop').forEach(function(b){b.addEventListener('click',function(){stopRestTimer(this.dataset.ex);});});
    container.querySelectorAll('.rt-reset').forEach(function(b){b.addEventListener('click',function(){resetRestTimer(this.dataset.ex);});});
    container.querySelectorAll('.rt-sound').forEach(function(b){b.addEventListener('click',function(){var ex=this.dataset.ex;var on=!timerSoundEnabled(ex);setTimerSoundEnabled(ex,on);this.textContent=on?'🔊':'🔇';this.title=on?_('timer_sound_on'):_('timer_sound_off');});});

    // Sync rest timer button visibility with running timers (after renderDay re-renders)
    container.querySelectorAll('.rest-timer').forEach(function(rt){
      var ex=rt.dataset.ex;
      if(restTimers[ex]&&restTimers[ex].interval){
        rt.querySelector('.rt-start').style.display='none';
        rt.querySelector('.rt-stop').style.display='';
      }
    });

    // Add custom exercise button
    var ce=ls(K.CE,[]);
    if(ce.length){
      var addCeBtn=container.querySelector('.add-custom-ex-btn');
      if(!addCeBtn){
        var btnDiv=document.createElement('div');
        btnDiv.style.cssText='text-align:center;margin-top:6px';
        btnDiv.innerHTML='<span class="ce-link" onclick="addCustomExToDay('+di+')" data-i18n="ce_add_to_day">+ Custom Exercise</span>';
        container.appendChild(btnDiv);
      }
    }

    updateSummary(di);
  }

  function addCustomExToDay(di){
    var ce=ls(K.CE,[]);
    if(!ce.length)return;
    var names=ce.map(function(e){return e.name;});
    var promptMsg=_('ce_select')+':\n'+names.map(function(n,i){return (i+1)+'. '+n;}).join('\n');
    var choice=prompt(promptMsg);
    if(!choice)return;
    var idx=parseInt(choice)-1;
    if(isNaN(idx)||idx<0||idx>=ce.length){alert(_('ce_invalid'));return;}
    var selected=ce[idx].name;
    var prog=ls(K.PG,null);
    if(!prog||!prog.days[di])return;
    var day=prog.days[di];
    // Check duplicate
    for(var i=0;i<day.ex.length;i++){if(day.ex[i].n===selected){alert(_('ce_duplicate'));return;}}
    day.ex.push({n:selected,s:3,r:[10,10],rpe:7});
    ss(K.PG,prog);
    renderDay(di);
  }

  function saveSet(di,en,si,f,v,wu){
    var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;
    if(!logs[td])logs[td]={};if(!logs[td][eid])logs[td][eid]={sets:[]};
    var wuCnt=0;document.querySelectorAll('.set-row[data-ex="'+en+'"][data-wu="1"]').forEach(function(r){var rs=parseInt(r.dataset.set)||0;if(rs+1>wuCnt)wuCnt=rs+1;});
    if(si>=wuCnt){for(var wi=logs[td][eid].sets.length;wi<wuCnt;wi++)logs[td][eid].sets[wi]={w:'',r:'',rpe:'',wu:true};}
    if(!logs[td][eid].sets[si])logs[td][eid].sets[si]={w:'',r:'',rpe:''};
    var isWu=!!wu||!!logs[td][eid].sets[si].wu;
    if(isWu)logs[td][eid].sets[si].wu=true;
    var wasComplete=logs[td][eid].sets[si].w&&logs[td][eid].sets[si].r&&logs[td][eid].sets[si].rpe&&parseFloat(logs[td][eid].sets[si].w)>0&&parseInt(logs[td][eid].sets[si].r)>0&&parseFloat(logs[td][eid].sets[si].rpe)>0;
    logs[td][eid].sets[si][f]=v;ss(K.LG,logs);
    var nowComplete=logs[td][eid].sets[si].w&&logs[td][eid].sets[si].r&&logs[td][eid].sets[si].rpe&&parseFloat(logs[td][eid].sets[si].w)>0&&parseInt(logs[td][eid].sets[si].r)>0&&parseFloat(logs[td][eid].sets[si].rpe)>0;
    var firstCompleteForEx=!wasComplete&&nowComplete&&!isWu;if(isWu&&nowComplete)evLog('warmup_used',{ex:en},'wu_'+td+'_'+en);
    if(firstCompleteForEx){
      var otherComplete=false;
      (logs[td][eid].sets||[]).forEach(function(st,idx){if(idx!==si&&!st.wu&&st.w&&st.r&&st.rpe&&parseFloat(st.w)>0&&parseInt(st.r)>0&&parseFloat(st.rpe)>0)otherComplete=true;});
      if(!otherComplete)startRestTimer(en);
    }
    var valuedCnt=0;var tdSets=logs[td];
    for(var kk in tdSets){var setsArr=tdSets[kk].sets;for(var jj=0;jj<setsArr.length;jj++){var s2=setsArr[jj];if(s2&&(parseFloat(s2.w)>0||parseInt(s2.r)>0||parseFloat(s2.rpe)>0))valuedCnt++;}}
    if(valuedCnt===1&&parseFloat(v)>0){
      var chip=document.querySelector('#weekRow .week-chip.today');
      if(chip){chip.classList.add('done','pulse');setTimeout(function(){chip.classList.remove('pulse');},600);}
      renderWeekRow();
    }
    var s=logs[td][eid].sets[si];
    if(!isWu&&s.w&&s.r&&s.rpe&&parseFloat(s.w)>0&&parseInt(s.r)>0&&parseFloat(s.rpe)>0){var h=loadHist(),e=est1RM(parseFloat(s.w),parseInt(s.r),parseFloat(s.rpe));if(e){if(!h[en])h[en]=[];var dup=h[en].some(function(x){return x.date===td&&x.w===parseFloat(s.w)&&x.r===parseInt(s.r)});if(!dup){h[en].push({date:td,w:parseFloat(s.w),r:parseInt(s.r),rpe:parseFloat(s.rpe),e1RM:e,day:day?day.n:''});saveHist(h);trackTrainingSession(td);checkDeloadOvershoot();renderDay(di);}}}
    updateSummary(di);
  }

  function delSet(di,en,si){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(logs[td]&&logs[td][eid]){var row=document.querySelector('.set-row[data-ex="'+en+'"][data-set="'+si+'"]');var wasWu=!!(row&&row.dataset.wu);logs[td][eid].sets.splice(si,1);if(wasWu)logs[td][eid].sets.splice(si,0,{w:'',r:'',rpe:'',wu:true});if(!logs[td][eid].sets.length)delete logs[td][eid];if(!Object.keys(logs[td][eid]||{}).length)delete logs[td][eid];ss(K.LG,logs);}renderDay(di);}
  function addSet(di,en){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(!logs[td])logs[td]={};if(!logs[td][eid])logs[td][eid]={sets:[]};var wuCnt=0;document.querySelectorAll('.set-row[data-ex="'+en+'"][data-wu="1"]').forEach(function(r){var rs=parseInt(r.dataset.set)||0;if(rs+1>wuCnt)wuCnt=rs+1;});if(logs[td][eid].sets.length<wuCnt){for(var wi=logs[td][eid].sets.length;wi<wuCnt;wi++)logs[td][eid].sets[wi]={w:'',r:'',rpe:'',wu:true};}logs[td][eid].sets.push({w:'',r:'',rpe:''});ss(K.LG,logs);renderDay(di);}
  function rmEx(di,en){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(logs[td]&&logs[td][eid]){delete logs[td][eid];if(!Object.keys(logs[td]).length)delete logs[td];ss(K.LG,logs);}renderDay(di);}
  function swapEx(di,idx,oldName,newName){
    if(!oldName||!newName||oldName===newName)return;
    var prog=ls(K.PG,null);if(!prog||!prog.days[di])return;
    var day=prog.days[di],ex=day.ex[idx];if(!ex)return;
    var sp=ls(K.SP,null),orig=ex.prehab?null:(ex.orig||(sp&&SPLITS[sp.key]&&SPLITS[sp.key].days[di]&&SPLITS[sp.key].days[di].ex[idx]?SPLITS[sp.key].days[di].ex[idx].n:null));
    ex.n=newName;ss(K.PG,prog);
    var choices=ls('mos_ex_choices',{});
    if(orig){if(newName===orig)delete choices[orig];else choices[orig]=newName;}
    else if(choices[oldName]===newName)delete choices[oldName];
    ss('mos_ex_choices',choices);
    if(orig){var pref=ls('mos_pref',{});if(!pref[orig])pref[orig]={};pref[orig][newName]=(pref[orig][newName]||0)+1;ss('mos_pref',pref);}
    var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0];
    var oldEid=day.n+'__'+oldName,newEid=day.n+'__'+newName;
    if(logs[td]&&logs[td][oldEid]){logs[td][newEid]=logs[td][oldEid];delete logs[td][oldEid];if(!Object.keys(logs[td]).length)delete logs[td];ss(K.LG,logs);}
    renderDay(di);updateSummary(di);
  }

  function updateSummary(di){
    var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],dl=logs[td]||{};
    var sets=0,reps=0,exs=0,wuSets=0;
    Object.keys(dl).forEach(function(eid){var s=dl[eid].sets||[],v=s.filter(function(x){return x&&x.w&&parseFloat(x.w)>0});if(v.length)exs++;
      v.forEach(function(x){if(x.wu)wuSets++;else sets++;reps+=parseInt(x.r)||0;});});
    var setEl=document.getElementById('sumSets');
    setEl.textContent=sets+wuSets;
    document.getElementById('sumReps').textContent=reps;
    document.getElementById('sumExDone').textContent=exs;
    var wuMark=setEl.parentElement.querySelector('.wu-sum-mark');
    if(wuSets>0){
      if(!wuMark){wuMark=document.createElement('span');wuMark.className='wu-sum-mark';setEl.parentElement.insertBefore(wuMark,setEl);}
      wuMark.textContent=wuSets+' '+_('warmup_incl');
    }else if(wuMark){wuMark.remove();}
  }

  document.getElementById('changeSplitBtn').addEventListener('click',function(){go(2);});
  document.getElementById('goToHistBtn').addEventListener('click',function(){go(5);renderHistory();});

