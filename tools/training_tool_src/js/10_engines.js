  // ═══════════════════════════════════════
  //  STORAGE
  function ls(k,d){try{var r=localStorage.getItem(k);return r?JSON.parse(r):d}catch(e){return d}}
  function ss(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function loadHist(){return ls(K.LH,{})}
  function saveHist(h){var c=new Date(Date.now()-180*864e5).toISOString().split('T')[0];Object.keys(h).forEach(function(e){h[e]=(h[e]||[]).filter(function(x){return x.date>=c});if(!h[e].length)delete h[e]});ss(K.LH,h)}
  function dlTracker(){return ls(K.DT,{lastDeload:null,sessions:0,overshoots:0})}
  function painFlags(){return ls(K.PF,{})}

  function checkDeloadOvershoot(){
    var dt=dlTracker(),logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],dl=logs[td];
    if(!dl){return;}
    var hasHighRpe=false;
    Object.keys(dl).forEach(function(eid){
      (dl[eid].sets||[]).forEach(function(s){
        if(s&&s.rpe&&parseFloat(s.rpe)>=9&&parseFloat(s.w)>0)hasHighRpe=true;
      });
    });
    var prevOvershoots=dt.overshoots||0;
    if(hasHighRpe){dt.overshoots=prevOvershoots+1;}
    else if(prevOvershoots>0){dt.overshoots=Math.max(0,prevOvershoots-1);}
    if(prevOvershoots!==dt.overshoots)ss(K.DT,dt);
  }

  function trackTrainingSession(td){
    var dt=dlTracker(),last=dt.lastSessionDate||null;
    if(last!==td){
      dt.sessions=(dt.sessions||0)+1;
      dt.lastSessionDate=td;
      ss(K.DT,dt);
    }
  }

  // ── Engine ──
  function bestE1RM(ex,h){var e=h[ex];if(!e||!e.length)return null;var c=new Date(Date.now()-60*864e5).toISOString().split('T')[0];var r=e.filter(function(x){return x.date>=c&&x.e1RM>0});if(!r.length)return null;return r.reduce(function(m,x){return x.e1RM>m?x.e1RM:m},0)}
  function lastSess(ex,h){var e=h[ex];if(!e||!e.length)return null;return e.slice().sort(function(a,b){return a.date<b.date?1:-1})[0]}

  function suggestLoad(ex,goal,age,hist,fatigueAdj){
    var m=meta(ex),best=bestE1RM(ex,hist),last=lastSess(ex,hist);
    var rpeMap={low:8,moderate:8,high:7.5};if(goal==='strength')rpeMap={low:8,moderate:8,high:8.5};
    var tRpe=rpeMap[m.f]||8;
    // Apply fatigue adjustment (safety first)
    if(fatigueAdj&&fatigueAdj<0){tRpe=Math.max(5,tRpe+fatigueAdj);}
    var tRR=goal==='strength'?[3,6]:goal==='hypertrophy'?(m.rr||[6,12]):[5,10];
    var mid=Math.round((tRR[0]+tRR[1])/2);
    if(!best)return{w:null,r:tRR[1],rpe:7,e1RM:null,exp:_('suggest_no_history'),last:null};
    var pct=rpePct(mid,tRpe);if(!pct)return{w:null,r:mid,rpe:tRpe,e1RM:best,exp:_('suggest_rpe_out'),last:null};
    var raw=best*(pct/100),inc=m.inc>0?m.inc:2.5,adj=Math.round(raw/inc)*inc,rep=mid,rpe=tRpe,exp="";
    var trend='hold';
    if(last){
      var lr=last.rpe||tRpe,lw=(last.w||last.weight)||0;
      if(lr<tRpe-0.5&&adj>lw){adj=Math.max(adj,Math.round((lw+inc)/inc)*inc);exp=_('suggest_rpe_below');trend='up';}
      else if(lr>tRpe+0.5){adj=Math.min(adj,Math.round(lw/inc)*inc);adj=Math.max(adj,Math.round((lw-inc)/inc)*inc);exp=_('suggest_rpe_above');trend='down';}
      else if(lr>=tRpe-0.5&&lr<=tRpe+0.5&&last.r>=tRR[1]-1){adj=Math.round((lw+inc)/inc)*inc;rep=tRR[0];exp=_('suggest_double_prog');trend='up';}
      else exp=_('suggest_continue_prog');
      if(adj>lw)trend='up';else if(adj<lw)trend='down';
    } else {exp=_('suggest_first_session');trend='start';}
    return{w:adj,r:rep,rpe:tRpe,e1RM:best,exp:exp,last:last,pct:pct,trend:trend};
  }

  function checkPR(ex,w,r,hist){
    var e=hist[ex];if(!e||!e.length)return null;
    var best=e.reduce(function(m,x){var e1=x.e1RM||est1RM(x.weight||x.w,x.reps||x.r,x.rpe);return e1>(m.e1||0)?{w:x.weight||x.w,r:x.reps||x.r,rpe:x.rpe,e1:e1}:m},{w:0,r:0,rpe:0,e1:0});
    var cur=est1RM(w,r,8);if(!cur)return best.e1>0?{best:best,isPR:false,note:_('pr_badge_pr')+': '+best.w+' kg × '+best.r+' @ '+best.rpe}:null;
    if(cur>=best.e1)return{best:best,isPR:true,note:_('pr_badge_pr')+': '+w+' kg × '+r+' (e1RM '+Math.round(cur)+')'};
    var pct=cur/best.e1;if(pct>=0.95)return{best:best,isPR:false,note:_('pr_badge_close')+': '+best.w+' kg × '+best.r+' @ '+best.rpe+' (+'+Math.round((1-pct)*100)+'%)'};
    return{best:best,isPR:false,note:_('pr_badge_pr')+': '+best.w+' kg × '+best.r+' @ '+best.rpe};
  }

  function checkSafety(ex,sugg,dayIdx,logs,hist,pf,age){
    var m=meta(ex),warn=[],blocked=false,sub=null,sev='safe',pain=pf[ex]||'green';
    // Rehab-aware safety
    var rehabCheck=isExerciseSafeForInjuries(ex,pf);
    if(!rehabCheck.ok){blocked=true;sub=m.subs&&m.subs[0];sev='danger';warn.push("⛔ "+rehabCheck.reason+(sub?' '+_('sel_try')+': '+sub:'')+' · <a href="https://wa.me/201040796017" target="_blank" style="color:#F4C93B">'+_('hist_book_consult')+'</a>');}
    else if(pain==='red'){blocked=true;sub=m.subs&&m.subs[0];sev='danger';warn.push("🔴 "+_('safety_pain_reported')+(sub?' '+_('sel_try')+': '+sub:'')+' · <a href="https://wa.me/201040796017" target="_blank" style="color:#F4C93B">'+_('hist_book_injury')+'</a>');}
    else if(pain==='yellow'){sev='warn';warn.push("🟡 "+_('safety_inflammation'));}
    else if(rehabCheck.reason&&rehabCheck.reason.indexOf('🟡')>=0){sev='warn';warn.push(rehabCheck.reason);}
    if(!blocked&&sugg&&sugg.w){
      var last=lastSess(ex,hist);
      if(last&&last.w>0){var jump=(sugg.w-last.w)/last.w;if(jump>0.10){var cap=Math.round(last.w*1.10/m.inc)*m.inc;sugg.w=cap;warn.push("📈 "+_('safety_jump_capped')+' '+cap+" kg.");}}
      if(m.t==='isolation'&&last&&last.w>0){var j2=(sugg.w-last.w)/last.w;if(j2>0.05&&last.date){var tw=new Date(Date.now()-14*864e5).toISOString().split('T')[0];if(last.date>=tw){var c2=Math.round(last.w*1.05/m.inc)*m.inc;sugg.w=c2;warn.push("🔗 "+_('safety_tendon_capped')+' '+c2+" kg.");}}}}
    if(sugg&&sugg.rpe>9){sugg.rpe=9;warn.push("🎯 "+_('safety_rpe_capped'));}
    return{safe:!blocked,blocked:warn.length>0,sev:sev,warn:warn,sub:sub};
  }

  function deloadInterval(age){return{novice:6,intermediate:5,advanced:4}[age]||5}
  function shouldDeload(t,age,overshoots){var iv=deloadInterval(age);if(t.sessions>=iv)return{yes:true,reason:_('dl_scheduled')+': '+t.sessions+' wk since last (max '+iv+').',fix:_('dl_reduce_sets')};if(overshoots>=2)return{yes:true,reason:_('dl_rpe_overshoot')+': '+overshoots+' '+_('comp_sessions')+'.',fix:_('dl_week')};return{yes:false,reason:null,fix:null};}

  // ── Warm-up Calculator ──
  const WARMUP_DEFAULTS = {sets:3,startPct:0.4,increment:0.2,repDrop:2};
  function calcWarmup(workKg, sets, startPct, increment, repDrop, workReps){
    if(!workKg||workKg<=0)return[];
    sets=sets||WARMUP_DEFAULTS.sets;
    startPct=startPct||WARMUP_DEFAULTS.startPct;
    increment=increment||WARMUP_DEFAULTS.increment;
    repDrop=repDrop||WARMUP_DEFAULTS.repDrop;
    var warmups=[];
    for(var i=0;i<sets;i++){
      var pct=startPct+i*increment;
      if(pct>=1)break;
      var w=Math.round(workKg*pct/2.5)*2.5;
      var r=Math.max(2,Math.round((workReps||10)-repDrop*i));
      warmups.push({weight:Math.max(0,w),reps:r,set:i+1,pct:Math.round(pct*100),label:i===0?'Bar/Light':'Ramp '+(i+1)});
    }
    return warmups;
  }
  function renderWarmupHtml(exName, sugg, dayName){
    if(!sugg||!sugg.w||sugg.w<=0)return'';
    var m=meta(exName);
    var isCompound=m.t==='compound';
    var warmupSets=isCompound?4:2;
    var startPct=isCompound?0.3:0.45;
    var inc=isCompound?0.18:0.22;
    var warmups=calcWarmup(sugg.w,warmupSets,startPct,inc,2,sugg.r||10);
    if(!warmups.length)return'';
    var html='<div class="warmup-box"><div class="wu-header" onclick="this.parentNode.classList.toggle(\'wu-open\')">'+
      '<span class="wu-icon">🔥</span><span class="wu-label">'+_('warmup')+'</span>'+
      '<span class="wu-count">'+warmupSets+' '+_('ramp_sets')+'</span>'+
      '<span class="wu-arrow">▼</span></div><div class="wu-body">'+
      '<div class="wu-row wu-head"><span>'+_('set')+'</span><span>'+_('weight')+'</span><span>'+_('reps')+'</span><span>'+_('warmup_pct')+'</span></div>';
    warmups.forEach(function(w){
      html+='<div class="wu-row"><span>'+(w.label.indexOf('Ramp')>=0?_('warmup_ramp')+' '+(w.set):w.label)+'</span><span class="wu-weight">'+(w.weight>0?w.weight+' '+_('weight'):'Bar')+'</span><span>'+w.reps+'</span><span>'+w.pct+'%</span></div>';
    });
    html+='<div class="wu-row wu-work"><span>'+_('warmup_work')+'</span><span class="wu-weight" style="color:#F4C93B">'+sugg.w+' '+_('weight')+'</span><span>'+sugg.r+'</span><span>100%</span></div>';
    html+='<p class="wu-tip">'+warmupTip(exName,dayName)+'</p></div></div>';
    return html;
  }
  function warmupTip(exName,dayName){
    var tips={
      'Barbell Squat':_('warmup_tip_squat'),
      'Bench Press':_('warmup_tip_bench'),
      'Deadlift Variation':_('warmup_tip_deadlift'),
      'Overhead Press':_('warmup_tip_ohp'),
      'Barbell Row':_('warmup_tip_row')
    };
    for(var k in tips){if(exName.indexOf(k)>=0)return tips[k];}
    if(dayName&&dayName.toLowerCase().indexOf('leg')>=0)return _('warmup_tip_legs');
    if(dayName&&dayName.toLowerCase().indexOf('upper')>=0)return _('warmup_tip_upper');
    return _('warmup_tip_general');
  }
  function renderGeneralWarmup(dayName){
    var gen=[],dn=(dayName||'').toLowerCase();
    if(dn.indexOf('leg')>=0||dn.indexOf('lower')>=0||dn.indexOf('quad')>=0||dn.indexOf('glute')>=0)gen.push(_('gen_warmup_legs'), _('gen_warmup_legs2'), _('gen_warmup_legs3'), _('gen_warmup_legs4'), _('gen_warmup_legs5'));
    else if(dn.indexOf('upper')>=0||dn.indexOf('chest')>=0||dn.indexOf('back')>=0||dn.indexOf('shoulder')>=0||dn.indexOf('arm')>=0||dn.indexOf('push')>=0||dn.indexOf('pull')>=0)gen.push(_('gen_warmup_upper1'), _('gen_warmup_upper2'), _('gen_warmup_upper3'), _('gen_warmup_upper4'), _('gen_warmup_upper5'));
    else gen.push(_('gen_warmup_default1'), _('gen_warmup_upper2'), _('gen_warmup_legs3'), _('gen_warmup_default2'), _('gen_warmup_upper5'));
    var html='<div class="gen-warmup"><div class="gw-header">'+_('warmup')+'</div><div class="gw-list">'+gen.map(function(g){return'<span>'+g+'</span>'}).join('')+'</div></div>';
    return html;
  }

  // ── Compliance Dashboard ──
  function calcStreak(){
    var logs=ls(K.LG,{});var dates=Object.keys(logs).filter(function(d){
      return Object.keys(logs[d]).some(function(eid){return logs[d][eid].sets&&logs[d][eid].sets.some(function(s){return s&&s.w&&parseFloat(s.w)>0});});
    }).sort().reverse();if(!dates.length)return{current:0,longest:0,dates:[]};
    var streak=0,longest=0;
    dates.forEach(function(d,idx){
      if(idx===0){streak=1;longest=1;return;}
      var prev=new Date(dates[idx-1]),cur=new Date(d);
      var diff=Math.round((prev-cur)/864e5);
      if(diff===1){streak++;}else{streak=1;}
      if(streak>longest)longest=streak;
    });
    var today=new Date().toISOString().split('T')[0];
    var lastDate=new Date(dates[0]);
    var daysSince=new Date(today)-lastDate;
    var active=daysSince<864e5*2;
    return{current:active?streak:0,longest:longest,dates:dates};
  }
  function calcAdherence(daysBack){
    daysBack=daysBack||28;var prog=ls(K.PG,null),logs=ls(K.LG,{}),plannedDays=prog?prog.days.length:4;
    var start=new Date();start.setDate(start.getDate()-daysBack);var today=new Date();
    var totalPlanned=0,totalLogged=0;var weeks={};
    for(var d=new Date(start);d<=today;d.setDate(d.getDate()+1)){
      var ds=d.toISOString().split('T')[0],dow=d.getDay(),wkKey=d.getFullYear()+'-W'+Math.ceil((d.getDate()-d.getDay()+1)/7);
      if(!weeks[wkKey])weeks[wkKey]={planned:0,logged:0};
      // Count this as a planned training day (simplified: 5 of 7 days)
      if(dow>=1&&dow<=5)weeks[wkKey].planned++;
      if(logs[ds]&&Object.keys(logs[ds]).some(function(eid){return logs[ds][eid].sets&&logs[ds][eid].sets.some(function(s){return s&&s.w&&parseFloat(s.w)>0});}))weeks[wkKey].logged++;
    }
    var weeksArr=Object.keys(weeks).sort();var overall=weeksArr.reduce(function(s,w){return{planned:s.planned+weeks[w].planned,logged:s.logged+weeks[w].logged}},{planned:0,logged:0});
    var pct=overall.planned>0?Math.round(overall.logged/overall.planned*100):0;
    return{overall:pct,weeks:weeksArr.map(function(w){return{week:w,planned:weeks[w].planned,logged:weeks[w].logged,pct:weeks[w].planned>0?Math.round(weeks[w].logged/weeks[w].planned*100):0}}),totalPlanned:overall.planned,totalLogged:overall.logged};
  }
  function calcCompliance(){
    var streak=calcStreak(),adherence=calcAdherence(28);
    // Compliance score = 50% adherence + 30% streak factor + 20% consistency
    var streakScore=Math.min(streak.current/14*100,100); // max 14 days = 100%
    var consistencyScore=adherence.weeks.length>0?Math.min(adherence.weeks.reduce(function(s,w){return s+(w.pct>=50?1:0)},0)/adherence.weeks.length*100,100):0;
    var score=Math.round(adherence.overall*0.5+streakScore*0.3+consistencyScore*0.2);
    var grade=score>=80?'A':score>=65?'B':score>=50?'C':score>=35?'D':'F';
    var color=score>=80?'#4CAF50':score>=65?'#2196F3':score>=50?'#F4C93B':score>=35?'#FF9800':'#f44336';
    var label=score>=80?'Excellent':score>=65?'Good':score>=50?'Fair':score>=35?'Needs Work':'At Risk';
    return{score:score,grade:grade,color:color,label:label,streak:streak.current,longestStreak:streak.longest,adherence:adherence};
  }
  function renderCompliance(){
    var comp=calcCompliance();
    document.getElementById('compWidgetCard').style.display='block';
    document.getElementById('compScore').textContent=comp.score+'%';
    document.getElementById('compGrade').textContent=comp.grade;
    document.getElementById('compGrade').style.color=comp.color;
    document.getElementById('compLabel').textContent=comp.label;
    document.getElementById('compLabel').style.color=comp.color;
    document.getElementById('compStreak').textContent=comp.streak+' '+(comp.streak!==1?_('comp_days'):_('comp_day'));
    document.getElementById('compBestStreak').textContent=comp.longestStreak+' '+_('comp_days');
    document.getElementById('compAdherence').textContent=comp.adherence.overall+'% ('+comp.adherence.totalLogged+'/'+comp.adherence.totalPlanned+' '+_('comp_sessions')+')';
    // Weekly mini chart
    var wh='<div style="display:flex;gap:3px;align-items:flex-end;height:30px;padding:2px 0;margin-top:4px">';
    comp.adherence.weeks.slice(-6).forEach(function(w){
      var h=Math.min(w.pct*0.3,30);
      wh+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div title="'+w.week+': '+w.pct+'%" style="width:100%;height:'+Math.max(h,3)+'px;background:'+comp.color+';border-radius:2px;opacity:.6"></div><span style="font-size:.35rem;color:rgba(250,250,248,.1);margin-top:1px">'+w.week.slice(-2)+'</span></div>';
    });
    wh+='</div>';
    document.getElementById('compChart').innerHTML=wh;
  }

  // ── Auto Program Adjustment ──
  var MAIN_LIFTS=['Barbell Squat','Bench Press','Deadlift Variation','Squat','Deadlift'];
  // P7: plateau detection -> auto-meso suggestion
  function detectPlateaus(){
    var hist=loadHist(),prog=ls(K.PG,null);
    if(!prog||!prog.days)return[];
    var present=[],res=[];
    prog.days.forEach(function(d){
      if(d.restDay)return;
      d.ex.forEach(function(e){if(MAIN_LIFTS.indexOf(e.n)>=0&&present.indexOf(e.n)<0)present.push(e.n);});
    });
    present.forEach(function(ex){
      var entries=(hist[ex]||[]).slice().sort(function(a,b){return a.date<b.date?-1:1;});
      var sessions=[];
      entries.forEach(function(en){
        var last=sessions.length?sessions[sessions.length-1]:null;
        if(last&&last.date===en.date){if((en.e1RM||0)>last.e1rm)last.e1rm=en.e1RM;if((en.rpe||0)>last.rpe)last.rpe=en.rpe;}
        else sessions.push({date:en.date,e1rm:en.e1RM||0,rpe:en.rpe||0});
      });
      if(sessions.length<3)return;
      var last3=sessions.slice(-3);
      var start=last3[0].e1rm,cur=last3[2].e1rm;
      var gain=start>0?(cur-start)/start*100:100;
      if(gain<2.5&&last3[2].rpe>=8){
        var di=-1,idx=-1;
        prog.days.forEach(function(d,i){if(di>=0||d.restDay)return;d.ex.forEach(function(e,j){if(di<0&&e.n===ex){di=i;idx=j;}});});
        res.push({ex:ex,di:di,idx:idx,gain:gain,cur:cur,rpe:last3[2].rpe});
      }
    });
    return res;
  }
  function renderPlateaus(){
    var card=document.getElementById('plateauCard');
    var pl=detectPlateaus();if(pl.length)evLog('plateau_note',{exs:pl.map(function(p){return p.ex;})},'pl_'+new Date().toISOString().split('T')[0]);
    if(!pl.length){card.style.display='none';return;}
    var html='<div class="pc-title">⚠ '+_('plateau_title')+'</div>';
    pl.forEach(function(p){
      html+='<div class="pc-body" style="margin-top:'+(html.indexOf('pc-body')>=0?'6px':'0')+'"><strong style="color:#FAFAF8">'+exLinkHtml(p.ex)+'</strong> — '+_('plateau_body').replace('{gain}',p.gain.toFixed(1)).replace('{rpe}',p.rpe)+'</div>'+
        '<div class="pc-actions">'+
        '<button class="pc-btn swap" data-action="swap" data-ex="'+p.ex+'">'+_('plateau_swap')+'</button>'+
        '<button class="pc-btn intense" data-action="intense" data-ex="'+p.ex+'">'+_('plateau_intense')+'</button>'+
        '<button class="pc-btn deload" data-action="deload" data-ex="'+p.ex+'">'+_('plateau_deload')+'</button></div>';
    });
    card.innerHTML=html;
    card.style.display='block';
  }
  document.getElementById('plateauCard').addEventListener('click',function(ev){
    var b=ev.target.closest('.pc-btn');if(!b)return;
    var ex=b.dataset.ex;evLog('plateau_'+b.dataset.action,{ex:ex});
    if(b.dataset.action==='swap'){
      var p=null;detectPlateaus().forEach(function(x){if(x.ex===ex)p=x;});
      if(!p||p.di<0)return;
      dayIdx=p.di;renderDay(p.di);updateMakeupChip();updateSupersetToggle();
      var sid=('c_'+p.di+'_'+ex).replace(/[^a-zA-Z0-9]/g,'_');
      var card=document.getElementById(sid);
      if(card){var sw=card.querySelector('.sw-ex-btn');if(sw)sw.click();setTimeout(function(){card.scrollIntoView({behavior:'smooth',block:'center'});},50);}
    }else if(b.dataset.action==='intense'){
      document.getElementById('mesoType').value='strength';
      document.getElementById('mesoWeeks').value='10';
      go(35);renderMesoConfig();
    }else if(b.dataset.action==='deload'){
      var dt=dlTracker();dt.lastDeload=new Date().toISOString().split('T')[0];dt.sessions=0;dt.overshoots=0;ss(K.DT,dt);evLog('deload_marked',{src:'plateau'});
      alert(_('alert_deload_marked'));
      renderDashboard();
    }
  });

  function genAutoAdjustments(){
    var logs=ls(K.LG,{}),hist=loadHist(),adj=[];
    var today=new Date(),cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-7);
    var recents=Object.keys(logs).filter(function(d){return d>=cutoff.toISOString().split('T')[0];}).sort();
    if(!recents.length)return adj;
    recents.forEach(function(ds){
      Object.keys(logs[ds]).forEach(function(eid){
        var sesh=logs[ds][eid];if(!sesh||!sesh.sets)return;
        var en=sesh.n||(eid.indexOf('__')>=0?eid.split('__')[1]:eid),h=hist[en];if(!h||h.length<2)return;
        var last=h[h.length-1],prev=h.length>1?h[h.length-2]:null;
        if(!last||!last.e1rm)return;
        // 1. e1RM trend
        if(prev&&prev.e1rm){
          var diff=last.e1rm-prev.e1rm,pct=diff/prev.e1rm*100;
          if(pct<-3)adj.push({type:'e1rm_drop',ex:en,msg:last.e1rm+' kg ('+pct.toFixed(1)+'%) vs prev '+prev.e1rm+' kg. Suggest deload or reduce load ~5%.',severity:'warn'});
          else if(pct>5&&last.rpe<=7)adj.push({type:'e1rm_jump',ex:en,msg:'+'+(pct).toFixed(0)+'% e1RM at RPE '+(last.rpe||'?')+'. Consider upweighting next session.',severity:'info'});
        }
        // 2. RPE drift — if RPE was high but e1RM didn't jump
        if(prev&&prev.rpe&&last.rpe&&last.e1rm<prev.e1rm*1.02&&last.rpe-prev.rpe>=1.5){
          adj.push({type:'rpe_drift',ex:en,msg:'RPE '+last.rpe+' vs prev '+prev.rpe+' with no e1RM gain. Fatigue accumulating. Reduce load 2.5 kg.',severity:'warn'});
        }
      });
    });
    // 3. General fatigue trend
    var fl=ls(K.FL,{});var fDays=Object.keys(fl).sort().slice(-5);
    if(fDays.length>=3){
      var fScores=fDays.map(function(d){return fatigueScore(fl[d]).score}).filter(function(v){return v>0});
      if(fScores.length>=3){
        var avg=fScores.reduce(function(s,v){return s+v},0)/fScores.length;
        if(avg<=4){adj.push({type:'high_fatigue',ex:'General',msg:'Avg readiness '+avg.toFixed(1)+'/10. RPE auto-capped. Consider active recovery day.',severity:'warn'});}
      }
    }
    return adj;
  }
  function renderAutoAdjustments(){
    var adj=genAutoAdjustments(),card=document.getElementById('autoAdjustCard'),content=document.getElementById('autoAdjustContent');
    if(!adj.length){card.style.display='none';return;}
    card.style.display='block';
    var warns=adj.filter(function(a){return a.severity==='warn'}),infos=adj.filter(function(a){return a.severity==='info'});
    var html='';
    if(warns.length)html+='<div style="margin-bottom:2px"><span style="color:#f44336;font-weight:600;text-transform:uppercase;font-size:.42rem;letter-spacing:.5px">⚠ '+warns.length+' '+(warns.length>1?_('auto_adj_needed_pl'):_('auto_adj_needed'))+'</span></div>';
    if(infos.length)html+='<div style="margin-bottom:2px"><span style="color:#4CAF50;font-weight:600;text-transform:uppercase;font-size:.42rem;letter-spacing:.5px">✓ '+infos.length+' '+(infos.length>1?_('auto_adj_opportunities'):_('auto_adj_opportunity'))+'</span></div>';
    html+='<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px">';
    adj.slice(0,5).forEach(function(a){
      var c=a.severity==='warn'?'#f44336':'#F4C93B';
      html+='<div style="display:flex;gap:4px;align-items:flex-start;padding:2px 0;border-bottom:1px solid rgba(250,250,248,.02)"><span style="color:'+c+';font-weight:600;white-space:nowrap;font-size:.45rem">'+a.ex+'</span><span style="color:rgba(250,250,248,.2);font-size:.45rem;line-height:1.2">'+a.msg+'</span></div>';
    });
    html+='</div>';
    content.innerHTML=html;
  }

  // ── Body Measurements ──
  function getMeasurements(){return ls(K.MM,[]);}
  function saveMeasurement(m){
    var ms=getMeasurements();
    ms.push({date:new Date().toISOString().split('T')[0],weight:parseFloat(m.weight)||null,bf:parseFloat(m.bf)||null,chest:parseFloat(m.chest)||null,waist:parseFloat(m.waist)||null,lArm:parseFloat(m.lArm)||null,rArm:parseFloat(m.rArm)||null,lThigh:parseFloat(m.lThigh)||null,rThigh:parseFloat(m.rThigh)||null,lCalf:parseFloat(m.lCalf)||null,rCalf:parseFloat(m.rCalf)||null,photo:m.photo||null});
    if(ms.length>100)ms=ms.slice(-100);
    ss(K.MM,ms);
  }
  function latestMeasurements(){var ms=getMeasurements();return ms.length?ms[ms.length-1]:null;}
  var NUDGE_DISMISS='mos_nudge_dismiss';
  function bodyTrendNudge(){
    var vi=ls(K.VI,{}),goal=vi.goal||'hypertrophy';
    var ms=getMeasurements().filter(function(m){return m.weight;});
    if(ms.length<2)return null;
    var first=ms[0],last=ms[ms.length-1];
    var days=(new Date(last.date)-new Date(first.date))/864e5;
    if(days<14)return null;
    var pct=(last.weight-first.weight)/first.weight*100;
    if(goal==='hypertrophy'&&pct<=-2)return{tone:'yellow',msg:_('nudge_hypertrophy_down')};
    if(goal==='strength'){
      var weeks=days/7,weekly=pct/weeks;
      if(weekly>1)return{tone:'note',msg:_('nudge_strength_up')};
    }
    return null;
  }
  function renderNudge(){
    var el=document.getElementById('nudgeBar');
    var today=new Date().toISOString().split('T')[0];
    if(ls(NUDGE_DISMISS,null)===today){el.style.display='none';return;}
    var n=bodyTrendNudge();
    if(!n){el.style.display='none';return;}
    document.getElementById('nudgeText').textContent=n.msg;
    el.classList.toggle('note',n.tone==='note');
    el.style.display='flex';
  }
  document.getElementById('nudgeDismissBtn').addEventListener('click',function(){
    ss(NUDGE_DISMISS,new Date().toISOString().split('T')[0]);
    document.getElementById('nudgeBar').style.display='none';
  });
  function calculateWeightChange(){
    var ms=getMeasurements();if(ms.length<2)return null;
    var first=ms[0],last=ms[ms.length-1];
    if(!first.weight||!last.weight)return null;
    var diff=last.weight-first.weight,weeks=(new Date(last.date)-new Date(first.date))/6048e5;
    return{diff:diff,weekly:weeks>0?diff/weeks:0,start:first.weight,current:last.weight,startDate:first.date,endDate:last.date};
  }
  function renderMeasForm(existing){
    if(!existing)existing={};
    ['weight','bf','chest','waist','lArm','rArm','lThigh','rThigh','lCalf','rCalf'].forEach(function(f){
      var el=document.getElementById('meas'+f.charAt(0).toUpperCase()+f.slice(1));
      if(el&&existing[f]!==undefined)el.value=existing[f];
    });
  }
  function renderMeasBadge(){
    var lm=latestMeasurements();
    document.getElementById('measBadge').textContent=lm?_('meas_last')+': '+lm.date:_('meas_no_data');
  }
  function renderMeasHistory(){
    var ms=getMeasurements(),card=document.getElementById('measHistCard'),content=document.getElementById('measHistContent');
    if(!ms.length){card.style.display='none';return;}
    card.style.display='block';
    var html='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px">';
    var last=ms[ms.length-1],first=ms[0];
    var labels={weight:_('meas_weight').split(' (')[0],bf:'Body Fat',chest:_('meas_chest').split(' (')[0]};
    var fields=[
      {id:'weight',label:labels.weight,val:last.weight,u:'kg',diff:last.weight&&first.weight?' '+((last.weight-first.weight)>0?'+':'')+(last.weight-first.weight).toFixed(1):''},
      {id:'bf',label:labels.bf,val:last.bf,u:'%',diff:last.bf&&first.bf?' '+((last.bf-first.bf)>0?'+':'')+(last.bf-first.bf).toFixed(1):''},
      {id:'chest',label:labels.chest,val:last.chest,u:'cm',diff:last.chest&&first.chest?' '+((last.chest-first.chest)>0?'+':'')+(last.chest-first.chest).toFixed(1):''}
    ];
    fields.forEach(function(f){
      html+='<div style="text-align:center;background:rgba(250,250,248,.01);border-radius:6px;padding:4px"><div style="font-size:.65rem;font-weight:600;font-family:JetBrains Mono,monospace">'+(f.val||'—')+'<span style="font-size:.4rem;color:rgba(250,250,248,.1)"> '+f.u+'</span></div><div style="font-size:.4rem;text-transform:uppercase;letter-spacing:.5px;color:rgba(250,250,248,.1)">'+f.label+'</div>';
      if(f.diff)html+='<div style="font-size:.4rem;color:'+(f.diff.startsWith('+')?'#4CAF50':f.diff.startsWith('-')?'#f44336':'rgba(250,250,248,.15)')+'">'+f.diff+'</div>';
      html+='</div>';
    });
    html+='</div>';
    // Weight chart (mini sparkline)
    var weightData=ms.filter(function(m){return m.weight}).slice(-10);
    if(weightData.length>1){
      var maxW=weightData.reduce(function(m,x){return Math.max(m,x.weight)},0);
      var minW=weightData.reduce(function(m,x){return Math.min(m,x.weight)},0);
      var range=Math.max(maxW-minW,1);
      html+='<div style="font-size:.4rem;text-transform:uppercase;letter-spacing:.5px;color:rgba(250,250,248,.1);margin-bottom:2px">'+_('meas_weight_trend')+'</div>';
      html+='<div style="display:flex;align-items:flex-end;gap:3px;height:35px;padding:2px 0">';
      weightData.forEach(function(m){
        var h=(m.weight-minW)/range*30;
        html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div style="width:100%;height:'+Math.max(h,3)+'px;background:#F4C93B;border-radius:2px;opacity:.6" title="'+m.date+': '+m.weight+' kg"></div><span style="font-size:.35rem;color:rgba(250,250,248,.08);margin-top:1px">'+m.date.slice(5)+'</span></div>';
      });
      html+='</div>';
    }
    // Photo gallery
    var photos=ms.filter(function(m){return m.photo});
    if(photos.length){
      html+='<div style="font-size:.4rem;text-transform:uppercase;letter-spacing:.5px;color:rgba(250,250,248,.1);margin:4px 0 2px">'+_('meas_progress_photos')+'</div>';
      html+='<div style="display:flex;gap:4px;overflow-x:auto;padding:2px 0">';
      photos.slice(-5).reverse().forEach(function(m){
        html+='<div style="flex-shrink:0;width:55px;height:65px;border-radius:4px;overflow:hidden;background:rgba(250,250,248,.02);cursor:pointer" onclick="window.open(\''+m.photo+'\')"><img src="'+m.photo+'" style="width:100%;height:100%;object-fit:cover"><div style="font-size:.3rem;text-align:center;color:rgba(250,250,248,.1);margin-top:1px">'+m.date.slice(5)+'</div></div>';
      });
      html+='</div>';
    }
    content.innerHTML=html;
  }

  // ── Rehab Engine ──
  function renderRehabPanel(){
    var pf=painFlags(),panel=document.getElementById('rehabPanel'),content=document.getElementById('rehabContent'),status=document.getElementById('rehabStatus');
    if(!pf||!Object.keys(pf).filter(function(k){return pf[k]==='red'||pf[k]==='yellow'}).length){panel.style.display='none';return;}
    panel.style.display='block';
    var hasRed=false;var areaList=[];var prots={};
    Object.keys(pf).forEach(function(ex){
      var v=pf[ex];if(v==='red')hasRed=true;
      var p=rehabForExercise(ex,pf);
      if(p&&!prots[p.name]){prots[p.name]=p;areaList.push({ex:ex,severity:v,protocol:p});}
    });
    if(!areaList.length){panel.style.display='none';return;}
    status.textContent=(hasRed?'🔴 '+_('rehab_injury'):'🟡 '+_('rehab_inflammation'))+' · '+areaList.length+(areaList.length>1?' areas':' area');
    var html='';
    areaList.forEach(function(a){
      html+='<div class="rehab-card rehab-'+(a.severity==='red'?'red':'yellow')+'">'+
        '<div class="rc-header"><span>'+a.protocol.icon+' '+a.protocol.name+'</span><span class="rc-severity '+(a.severity==='red'?'danger':'warn')+'">'+a.severity.toUpperCase()+'</span></div>'+
        '<div class="rehab-phase"><div class="rp-label">⚠ '+_('rehab_acute')+'</div><div class="rp-text">'+
        (a.severity==='red'?a.protocol.acute:'🟡 '+_('rehab_inflammation')+'. '+a.protocol.acute)+'</div></div>';
      // Show recovery phase only for yellow
      if(a.severity!=='red')html+='<div class="rehab-phase"><div class="rp-label">✅ '+_('rehab_recovery')+'</div><div class="rp-text">'+a.protocol.recovery+'</div></div>'+
        '<div class="rehab-ex-list"><span style="font-size:.48rem;color:rgba(250,250,248,.15);margin-right:4px">'+_('rehab_safe')+'</span>'+
        a.protocol.safe.slice(0,5).map(function(e){return'<span class="rel-safe">'+e+'</span>'}).join('')+'</div>'+
        '<div class="rehab-ex-list"><span style="font-size:.48rem;color:rgba(250,250,248,.15);margin-right:4px">'+_('rehab_avoid')+'</span>'+
        a.protocol.avoid.slice(0,5).map(function(e){return'<span class="rel-avoid">'+e+'</span>'}).join('')+'</div>';
      else html+='<div style="font-size:.6rem;color:#f44336;padding:4px 0;font-weight:600">⛔ '+_('rehab_stop_all')+'</div>';
      html+='</div>';
    });
    // Consultation CTA
    html+='<a class="consult-cta" href="https://wa.me/201040796017?text='+encodeURIComponent('Hi Coach Anas, I need a free consultation for my injury ('+areaList.map(function(a){return a.protocol.name+' ('+a.severity+')'}).join(', ')+'). Please advise.')+'" target="_blank">📅 '+_('rehab_book_consult')+'</a>';
    content.innerHTML=html;
  }
  // Check if an exercise is safe given current injuries
  function isExerciseSafeForInjuries(ex,pf){
    if(!pf)return{ok:true,reason:null};
    var pm=EXERCISE_META[ex];
    if(pm&&pm.prehab)return{ok:true,reason:null};
    if(pf[ex]==='red')return{ok:false,reason:'This exercise is flagged RED (pain). Stop using it.'};
    var jrs=jointsForExercise(ex);
    if(!jrs.length)return{ok:true,reason:null};
    for(var i=0;i<jrs.length;i++){
      var j=jrs[i];
      if(INJURY_PROTOCOLS[j]){
        // Check if any exercise using this joint is flagged
        for(var k in pf){
          if(pf[k]==='red'){
            var otherJrs=jointsForExercise(k);
            if(otherJrs.indexOf(j)>=0)return{ok:false,reason:j+' injury detected. Avoid: '+ex+' uses '+j+'.',protocol:INJURY_PROTOCOLS[j],joint:j};
          }
        }
      }
    }
    // Yellow flag - warn
    for(var k in pf){if(pf[k]==='yellow'){var otherJrs=jointsForExercise(k);for(var i2=0;i2<jrs.length;i2++){if(otherJrs.indexOf(jrs[i2])>=0)return{ok:true,reason:'🟡 Caution: '+jrs[i2]+' may be inflamed.',protocol:INJURY_PROTOCOLS[jrs[i2]]||null,joint:jrs[i2]};}}}
    return{ok:true,reason:null};
  }
  // Rehab-aware exercise suggestion
  function rehabSuggest(ex,goal,age,hist,pf,fatigueAdj){
    var safety=isExerciseSafeForInjuries(ex,pf);
    if(!safety.ok)return{w:null,r:null,rpe:null,e1RM:null,exp:'⛔ INJURY: '+safety.reason,blocked:true,safety:safety};
    var base=suggestLoad(ex,goal,age,hist,fatigueAdj);
    // If inflammation, cap RPE further
    if(safety.reason&&safety.reason.indexOf('🟡')>=0&&base.w>0){
      base.rpe=Math.min(base.rpe,7);
      base.exp='🟡 '+safety.reason+' RPE capped at 7 for safety.';
    }
    return base;
  }

  // ── Mesocycle Auto-Planner Engine ──
  function createMesocycle(type, weeks){
    var prog=ls(K.PG,null),vi=ls(K.VI,{}),pl=getPLProfile(),goal=vi.goal||'hypertrophy',age=vi.ta||'intermediate';
    if(!prog)return null;
    var maxWeeks=Math.min(Math.max(weeks||8,4),12);
    var id='meso_'+Date.now();
    var mesoDays=[];
    // Build week-by-week progression
    for(var w=1;w<=maxWeeks;w++){
      var isDeload=(w===maxWeeks); // Last week = deload
      var phase='accumulation';
      if(type==='strength'&&maxWeeks>=10){
        if(w<=4)phase='accumulation';
        else if(w<=8)phase='intensification';
        else if(w<=9)phase='peak';
        else phase='deload';
      } else if(isDeload){phase='deload';}
      // Volume ramp: sets increase from ~85% to 105% of program defaults
      var volFactor=isDeload?0.5:(0.85+(w/(maxWeeks-1||1))*0.2);
      // RPE ramp: 6 → 9 across weeks
      var rpeBase=isDeload?6:(6+Math.floor((w-1)/((maxWeeks-1||1)/3)));
      var weekDays=prog.days.map(function(day){
        if(day.restDay)return{n:day.n,restDay:true,ex:[]};
        return {n:day.n,ex:day.ex.map(function(ex){
          var sets=isDeload?Math.max(1,Math.round(ex.sets*0.5)):Math.max(1,Math.round(ex.sets*volFactor));
          var targetRpe=isDeload?6:Math.min(rpeBase+Math.round(Math.random()*0.5),9.5);
          return {n:ex.n,sets:sets,rl:ex.rl,rh:ex.rh,p:ex.p,se:ex.se,targetRpe:targetRpe,orig:ex.orig||null,prehab:ex.prehab||false,prehabJoint:ex.prehabJoint||null,optional:ex.optional||false};
        })};
      });
      mesoDays.push({week:w,phase:phase,days:weekDays,completed:false,logs:{}});
    }
    var meso={id:id,type:type||'hypertrophy',weeks:maxWeeks,goal:goal,age:age,
      startDate:new Date().toISOString().split('T')[0],endDate:null,
      days:mesoDays,completed:false,summary:null};
    ss(K.MP,meso);
    ss(K.MA,{mesoId:id,currentWeek:1,currentPhase:mesoDays[0].phase});
    return meso;
  }

  function renderMesoConfig(){
    var prog=ls(K.PG,null);if(!prog)return;
    document.getElementById('mesoCfgProgram').innerHTML='<strong>'+prog.splitName+'</strong> · '+prog.totalSets+' '+_('weekly_sets')+' · '+prog.days.length+' '+_('sessions');
    // Preselect from existing
    var ma=ls(K.MA,null),mp=ls(K.MP,null);
    if(mp){
      document.getElementById('mesoType').value=mp.type||'hypertrophy';
      document.getElementById('mesoWeeks').value=mp.weeks||8;
    }
    renderMesoPreview(mp);
  }

  function renderMesoPreview(mp){
    var el=document.getElementById('mesoPreview');
    if(!mp){el.innerHTML='<p style="font-size:.55rem;color:rgba(250,250,248,.12);padding:8px;text-align:center">'+_('meso_configure_first')+'</p>';return;}
    var html='<div style="font-size:.55rem;color:rgba(250,250,248,.3);margin-bottom:6px">'+_('meso_vol_rpe_progression')+' — <strong>'+mp.weeks+' '+_('meso_weeks')+'</strong> · '+mp.type+'</div>';
    html+='<div style="display:flex;gap:3px;align-items:flex-end;height:36px;padding:2px 0">';
    mp.days.forEach(function(w,i){
      var totalSets=w.days.reduce(function(s,d){return s+d.ex.reduce(function(a,e){return a+e.sets},0)},0);
      var h=Math.min(totalSets*2,36);
      var c=w.phase==='deload'?'#FF9800':w.phase==='peak'?'#f44336':w.phase==='intensification'?'#2196F3':'#4CAF50';
      html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div title="Week '+(i+1)+': '+totalSets+' '+_('sets')+' · '+_(w.phase==='deload'?'meso_phase_deload':w.phase==='peak'?'meso_phase_peak':w.phase==='intensification'?'meso_phase_intensification':'meso_phase_accumulation')+'" style="width:100%;height:'+Math.max(h,4)+'px;background:'+c+';border-radius:2px;opacity:'+(w.phase==='deload'?'.6':'.8')+';position:relative">'+
        '<span style="position:absolute;bottom:-13px;font-size:.4rem;color:rgba(250,250,248,.15);left:50%;transform:translateX(-50%)">'+(i+1)+'</span></div></div>';
    });
    html+='</div><div style="display:flex;gap:8px;margin-top:8px;font-size:.45rem;color:rgba(250,250,248,.15);flex-wrap:wrap">'+
      '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#4CAF50;vertical-align:middle;margin-right:2px"></span> '+_('meso_phase_accumulation')+'</span>'+
      '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#2196F3;vertical-align:middle;margin-right:2px"></span> '+_('meso_phase_intensification')+'</span>'+
      '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f44336;vertical-align:middle;margin-right:2px"></span> '+_('meso_phase_peak')+'</span>'+
      '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#FF9800;vertical-align:middle;margin-right:2px"></span> '+_('meso_phase_deload')+'</span></div>';
    el.innerHTML=html;
  }

  function saveMesoPlan(){
    var type=document.getElementById('mesoType').value,weeks=parseInt(document.getElementById('mesoWeeks').value)||8;
    var meso=createMesocycle(type,weeks);
    if(!meso){alert(_('alert_gen_meso'));return;}
    renderMesoPreview(meso);
    go(35);
  }

  function renderMesoCalendar(){
    var mp=ls(K.MP,null),ma=ls(K.MA,null);
    if(!mp||!ma){document.getElementById('mesoCalContent').innerHTML='<p style="font-size:.55rem;color:rgba(250,250,248,.15);padding:10px;text-align:center">'+_('no_data')+'</p>';return;}
    var cw=ma.currentWeek||1,html='<div class="meso-cal-header">'+
      '<span style="color:#F4C93B;font-family:Oswald,sans-serif;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px">'+_('generate_meso')+': '+mp.type+'</span>'+
      '<span style="font-size:.55rem;color:rgba(250,250,248,.2)">'+_('day')+' '+cw+' of '+mp.weeks+' · '+mp.days[cw-1].phase+'</span></div>';
    html+='<div class="meso-week-grid">';
    mp.days.forEach(function(w,i){
      var wkNum=i+1,active=wkNum===cw,done=wkNum<cw;
      var totalSets=w.days.reduce(function(s,d){return s+d.ex.reduce(function(a,e){return a+e.sets},0)},0);
      var phaseColors={accumulation:'#4CAF50',intensification:'#2196F3',peak:'#f44336',deload:'#FF9800'};
      html+='<div class="meso-week-card'+(active?' active':'')+(done?' done':'')+'" data-wk="'+wkNum+'">'+
        '<div class="mw-top"><span class="mw-num">W'+wkNum+'</span><span class="mw-phase" style="color:'+(phaseColors[w.phase]||'rgba(250,250,248,.2)')+'">'+w.phase+'</span></div>'+
        '<div class="mw-sets">'+totalSets+' '+_('sets')+'</div>'+
        '<div class="mw-bar"><div class="mw-bar-fill" style="width:'+Math.min(totalSets/3,100)+'%;background:'+(phaseColors[w.phase]||'rgba(250,250,248,.2)')+'"></div></div>'+
        (active?'<button class="meso-train-btn" id="mesoTrainNowBtn">'+_('start_training')+' →</button>':'')+
        (wkNum<cw?'<span class="mw-done-check">✓</span>':'')+
        '</div>';
    });
    html+='</div>';
    // Week detail
    var cwData=mp.days[cw-1];
    if(cwData){
      html+='<div class="meso-week-detail"><div class="section-header">'+_('day')+' '+cw+' Detail — '+cwData.phase+'</div>';
      cwData.days.forEach(function(d,di){
        if(d.restDay){html+='<div class="meso-day-card" style="border-color:rgba(250,250,248,.08);background:rgba(250,250,248,.02)"><div class="md-title" style="color:rgba(250,250,248,.35)">'+_('day')+' '+(di+1)+': '+d.n+' — '+_('rest_day')+'</div></div>';return;}
        html+='<div class="meso-day-card"><div class="md-title">'+_('day')+' '+(di+1)+': '+d.n+'</div>';
        d.ex.forEach(function(e){
          html+='<div class="md-ex"><span class="md-ex-n">'+e.n+(e.optional?' <span class="opt-badge">'+_('sess_optional')+'</span>':'')+'</span><span class="md-ex-s">'+e.sets+' '+_('sets')+'</span><span class="md-ex-rpe">@ '+_('rpe')+' '+e.targetRpe+'</span></div>';
      });
      html+='</div>';
      // Custom exercises (user-defined, available in this day)
      var ce=ls(K.CE,[]);
      var dayMuscles=d.ex.map(function(ex){return ex.n;});
      ce.forEach(function(c){
        // Don't add duplicates
        if(dayMuscles.indexOf(c.name)>=0)return;
        var saved=ls('mos_ex_choices',{});
        var chosen=saved[c.name]||c.name;
        html+='<div class="ex-sel-row">'+
          '<span class="esr-lbl"><span style="color:rgba(250,250,248,.15);font-size:.45rem">✦ </span>'+c.name+' <span style="font-size:.42rem;color:rgba(250,250,248,.1)">('+c.t+')</span></span>'+
          '<button class="ex-sel-chip'+(chosen===c.name?' selected':'')+'" data-ename="'+c.name+'" data-exval="'+c.name+'">'+c.name+'</button></div>';
      });
      });
      html+='</div>';
    }
    document.getElementById('mesoCalContent').innerHTML=html;
    var btn=document.getElementById('mesoTrainNowBtn');
    if(btn)btn.addEventListener('click',function(){go(4);renderDashboard();});
    // Week click handler
    document.querySelectorAll('#mesoCalContent .meso-week-card:not(.done)').forEach(function(card){
      card.addEventListener('click',function(){
        var wk=parseInt(this.dataset.wk);
        if(wk>((ma&&ma.currentWeek)||1)){alert(_('complete_week')+' '+((ma&&ma.currentWeek)||1)+' '+_('start_fresh'));return;}
        if(wk===((ma&&ma.currentWeek)||1)){go(4);renderDashboard();}
      });
    });
  }

  function advanceWeek(){
    var mp=ls(K.MP,null),ma=ls(K.MA,null);
    if(!mp||!ma)return;
    var cw=ma.currentWeek||1;
    if(cw>=mp.weeks){
      // Mesocycle complete
      mp.completed=true;
      mp.endDate=new Date().toISOString().split('T')[0];
      mp.summary=summarizeMeso(mp);
      ss(K.MP,mp);
      // Save to history
      var mh=ls(K.MH,[]);
      mh.push({id:mp.id,type:mp.type,weeks:mp.weeks,start:mp.startDate,end:mp.endDate,summary:mp.summary});
      ss(K.MH,mh);
      ss(K.MA,null);
      alert(_('meso_complete_alert'));
      renderMesoCalendar();
      return;
    }
    // Auto-advance loads based on logged performance
    autoProgressMeso(mp,ma);
    // Move to next week
    ma.currentWeek=cw+1;
    ma.currentPhase=mp.days[cw].phase;
    ss(K.MA,ma);
    // Mark previous week completed
    mp.days[cw-1].completed=true;
    ss(K.MP,mp);
    renderMesoCalendar();
  }

  function autoProgressMeso(mp,ma){
    var cw=(ma.currentWeek||1)-1; // The week that just completed
    if(cw<0||cw>=mp.days.length)return;
    var logs=ls(K.LG,{}),hist=loadHist();
    var prevWeek=mp.days[cw];
    var nextWeek=mp.days[cw+1];
    if(!nextWeek)return;
    // For each exercise, check if performance matched RPE targets
    nextWeek.days.forEach(function(day,di){
      day.ex.forEach(function(ex,ei){
        var prevEx=prevWeek.days[di]&&prevWeek.days[di].ex[ei];
        if(!prevEx)return;
        // Check logged performance for this exercise
        var last=lastSess(ex.n,hist);
        var best=bestE1RM(ex.n,hist);
        if(last&&best&&best>0){
          // If e1RM is going up, keep RPE or increase slightly
          if(last.e1RM>best*0.97){
            ex.targetRpe=Math.min(prevEx.targetRpe+0.5,9.5);
          } else {
            // Stall — same RPE
            ex.targetRpe=Math.min(prevEx.targetRpe,9.5);
          }
        }
      });
    });
  }

  function summarizeMeso(mp){
    if(!mp)return null;
    var hist=loadHist(),start=new Date(mp.startDate).getTime();
    var e1RMChanges={};
    // Find exercises logged in both first and last 2 weeks
    var exNames={};
    mp.days.forEach(function(w){w.days.forEach(function(d){d.ex.forEach(function(e){exNames[e.n]=true;});});});
    Object.keys(exNames).forEach(function(ex){
      var entries=(hist[ex]||[]).filter(function(x){return new Date(x.date).getTime()>=start-864e5*3});
      if(entries.length<2)return;
      var first=entries.slice().sort(function(a,b){return a.date<b.date?-1:1})[0];
      var last=entries.slice().sort(function(a,b){return a.date<b.date?1:-1})[0];
      if(first&&last&&first.e1RM&&last.e1RM&&first.e1RM>0){
        e1RMChanges[ex]={start:first.e1RM,end:last.e1RM,change:last.e1RM-first.e1RM,pct:((last.e1RM-first.e1RM)/first.e1RM*100)};
      }
    });
    var totalVol=0;
    Object.keys(hist).forEach(function(ex){(hist[ex]||[]).forEach(function(e){
      if(new Date(e.date).getTime()>=start-864e5*3)totalVol+=e.w*e.r;
    })});
    return{exercises:e1RMChanges,totalVolumeLoad:totalVol,avgStrengthChange:Object.keys(e1RMChanges).length?Object.keys(e1RMChanges).reduce(function(s,k){return s+e1RMChanges[k].pct},0)/Object.keys(e1RMChanges).length:0};
  }

  function renderMesoHistory(){
    var mh=ls(K.MH,[]);
    if(!mh.length){
      document.getElementById('mesoHistContent').innerHTML='<p style="font-size:.55rem;color:rgba(250,250,248,.15);padding:8px;text-align:center">'+_('meso_no_completed')+'</p>';
      document.getElementById('mesoHistCard').style.display='none';
      return;
    }
    document.getElementById('mesoHistCard').style.display='block';
    var html='';
    mh.slice().reverse().forEach(function(m,mi){
      var sum=m.summary||{};
      var gain=sum.avgStrengthChange||0;
      html+='<div class="meso-hist-item">'+
        '<div class="mh-header"><span class="mh-type">'+m.type+'</span><span class="mh-dates">'+m.start+' → '+(m.end||'active')+'</span></div>'+
        '<div class="mh-detail">'+m.weeks+' weeks · Strength: <strong style="color:'+(gain>=0?'#4CAF50':'#f44336')+'">'+(gain>=0?'+':'')+gain.toFixed(1)+'%</strong> avg e1RM</div>';
      // Show top gainers
      var exs=sum.exercises||{};
      var top=Object.keys(exs).sort(function(a,b){return exs[b].pct-exs[a].pct}).slice(0,3);
      if(top.length)html+='<div class="mh-exs">'+top.map(function(k){return k+': '+(exs[k].change>=0?'+':'')+exs[k].change.toFixed(1)+' kg'}).join(' · ')+'</div>';
      html+='</div>';
    });
    document.getElementById('mesoHistContent').innerHTML=html;
  }

  // ── ACWR (Acute:Chronic Workload Ratio) ──
  function calculateACWR(){
    var hist=loadHist(),today=new Date();
    var acuteStart=new Date(today);acuteStart.setDate(today.getDate()-7);
    var chronicStart=new Date(today);chronicStart.setDate(today.getDate()-28);
    var acute=0,chronic=0;
    Object.keys(hist).forEach(function(ex){(hist[ex]||[]).forEach(function(e){
      var d=new Date(e.date);
      var load=e.w*e.r;
      if(d>=acuteStart)acute+=load;
      if(d>=chronicStart)chronic+=load;
    })});
    var avgChronic=chronic/4||1;
    var ratio=Math.round((acute/avgChronic)*100)/100;
    var risk=ratio>1.5?_('acwr_high'):ratio>1.3?_('acwr_moderate'):ratio>1?_('acwr_elevated'):ratio<0.8?_('acwr_low'):_('acwr_normal');
    var color=ratio>1.5?'#f44336':ratio>1.3?'#FF9800':ratio>1?'#F4C93B':'#4CAF50';
    return{ratio:ratio,risk:risk,color:color,acute:acute,chronic:avgChronic};
  }

  // ── Volume Tracking ──
  function findMuscle(ex){var prog=ls(K.PG,null);if(prog)for(var di in prog.days)for(var ei in prog.days[di].ex){if(prog.days[di].ex[ei].n===ex)return prog.days[di].ex[ei].p;}for(var k in SPLITS)for(var d in SPLITS[k].days)for(var e in SPLITS[k].days[d].ex){var x=SPLITS[k].days[d].ex[e];if(x.n===ex)return x.p;}return null;}
  function weeklyVol(logs){var v={};MUSCLES.forEach(function(m){v[m.id]=0});var wa=new Date(Date.now()-7*864e5).toISOString().split('T')[0],td=new Date().toISOString().split('T')[0];var prog=ls(K.PG,null);Object.keys(logs).forEach(function(ds){if(ds<wa||ds>td)return;Object.keys(logs[ds]).forEach(function(eid){var s=logs[ds][eid].sets||[],en=eid.split('__')[1]||eid,pm=findMuscle(en);if(!pm||v[pm]===undefined)return;if(prog&&prog.days.some(function(d){return d.ex.some(function(e){return e.optional&&e.n===en});}))return;v[pm]+=s.filter(function(x){return x&&(x.weight||x.w)&&parseFloat(x.weight||x.w)>0}).length;});});return v;}
  window.__weeklyVol=weeklyVol;

