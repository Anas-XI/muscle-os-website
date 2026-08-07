  // ═══════════════════════════════════════
  //  SCREEN 5: HISTORY & STATS
  // ═══════════════════════════════════════

  var MAIN_LIFTS=['Barbell Squat','Bench Press','Deadlift Variation'];
  function bestE1RMIn(ex,h,from,to){var e=h[ex];if(!e||!e.length)return null;var r=e.filter(function(x){return x.date>=from&&x.date<=to&&x.e1RM>0});if(!r.length)return null;return r.reduce(function(m,x){return x.e1RM>m?x.e1RM:m},0);}
  function coachNote(){
    var logs=ls(K.LG,{}),hist=loadHist(),pf=painFlags(),sp=ls(K.SP,null);
    var vi=ls(K.VI,{}),age=vi.ta||'intermediate';
    var today=new Date();today.setHours(0,0,0,0);
    var dISO=function(offset){var d=new Date(today);d.setDate(today.getDate()-offset);return d.toISOString().split('T')[0];};
    var adhFrom=dISO(13),adhTo=dISO(0),curFrom=dISO(6),curTo=dISO(0),prevFrom=dISO(13),prevTo=dISO(7);
    var sessDates={},totalSets=0;
    Object.keys(logs).forEach(function(d){
      if(d<adhFrom||d>adhTo)return;
      Object.keys(logs[d]).forEach(function(eid){
        (logs[d][eid].sets||[]).forEach(function(x){if(x&&x.w&&parseFloat(x.w)>0&&!x.wu){sessDates[d]=true;totalSets++;}});
      });
    });
    var sess=Object.keys(sessDates).length;
    var trainDays=0;
    if(sp&&SPLITS[sp.key])SPLITS[sp.key].days.forEach(function(day){if(!day.restDay)trainDays++;});
    if(sess===0||!trainDays)return '<span style="color:rgba(250,250,248,.15)">'+_('cn_empty')+'</span>';
    var expected=trainDays*2,pct=Math.min(100,Math.round(sess/expected*100));
    var tone=pct>=80?'good':pct>=50?'ok':'warn';
    var toneIcon=tone==='good'?'💪':tone==='ok'?'🙂':'⚠️';
    var toneColor=tone==='good'?'#81C784':tone==='ok'?'#F4C93B':'#f44336';
    var prog=ls(K.PG,null),progLifts={};
    if(prog)prog.days.forEach(function(day){(day.ex||[]).forEach(function(ex){if(MAIN_LIFTS.indexOf(ex.n)>=0)progLifts[ex.n]=true;});});
    var lifts=[];
    Object.keys(progLifts).forEach(function(ex){
      var cur=bestE1RMIn(ex,hist,curFrom,curTo),prev=bestE1RMIn(ex,hist,prevFrom,prevTo);
      if(cur===null||prev===null)return;
      var delta=Math.round((cur-prev)*2)/2;
      lifts.push(ex+' '+(delta>0?'+':'')+delta+' '+_('weight'));
    });
    var s1=_('cn_adh').replace('{a}',sess).replace('{b}',expected).replace('{pct}',pct)+' '+_('cn_sets').replace('{n}',totalSets);
    var s2=lifts.length?_('cn_pr').replace('{ex}',lifts.join(' · ')):'';
    var flagged=Object.keys(pf||{}).filter(function(k){return pf[k]==='red'||pf[k]==='yellow';});
    var s3='';
    if(flagged.length){
      s3=_('cn_pain').replace('{n}',flagged.length).replace('{list}',flagged.slice(0,3).join(', ')+(flagged.length>3?'…':''));
    }else{
      var dt=dlTracker(),dc=shouldDeload(dt,age,dt.overshoots||0);
      if(dc.yes)s3=_('cn_deload');
      else s3=_('cn_next')+': '+_('cn_next_'+tone);
    }
    var parts=[s1,s2,s3].filter(function(x){return x;});
    return '<span style="color:'+toneColor+';font-weight:700">'+toneIcon+'</span> '+parts.join('<br>');
  }
  function renderHistory(){
    var logs=ls(K.LG,{}),hist=loadHist(),vt=ls(K.VT,{}),goal=(ls(K.VI,{})).goal||'hypertrophy',age=(ls(K.VI,{})).ta||'intermediate';
    var today=new Date(),ws=new Date(today);ws.setDate(today.getDate()-today.getDay());
    document.getElementById('histWeekLabel').textContent='— '+_('hist_week_of')+' '+ws.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    document.getElementById('coachNote').innerHTML=coachNote();

    renderCompliance();
    renderMeasHistory();
    renderMeasBadge();
    // Volume bars
    var vols=weeklyVol(logs),table=VOLUME_TABLES[age][goal],html='';
    MUSCLES.forEach(function(m){
      var v=table[VMAP[m.id]]||[4,8,12],t=vt[m.id]||{mev:v[0],mav:v[1],mrv:v[2]};
      var mx=Math.max(t.mrv,vols[m.id]||0,1),logged=vols[m.id]||0,over=logged>t.mrv;
      html+='<div class="vol-row"><span class="vol-label">'+m.name+'</span><div class="vol-bar-wrap"><div class="vol-bar-mev" style="width:'+(t.mev/mx*100)+'%"></div><div class="vol-bar-mav" style="left:'+(t.mev/mx*100)+'%;width:'+((t.mav-t.mev)/mx*100)+'%"></div><div class="vol-bar-mrv" style="left:'+(t.mrv/mx*100)+'%"></div><div class="vol-bar-logged'+(over?' over':'')+'" style="width:'+(logged/mx*100)+'%"></div></div><div class="vol-num">'+(over?'<span style="color:#f44336;font-weight:600">'+logged+'</span>':'<span class="logged-num">'+logged+'</span>')+'<br><span style="font-size:.42rem;color:rgba(250,250,248,.1)">'+t.mev+'-'+t.mav+'</span></div></div>';
    });
    document.getElementById('histVolBars').innerHTML=html;

    // Session pace (F6)
    var sess=ls(K.SS,[]);
    var shEl=document.getElementById('histSessions'),sbEl=document.getElementById('histSessionsBars');
    if(sess.length){
      var totD=sess.reduce(function(a,x){return a+(x.durationSec||0)},0),totS=sess.reduce(function(a,x){return a+(x.sets||0)},0);
      var avgS=totD/Math.max(sess.length,1),sph=totD/3600>0?(totS/(totD/3600)):0;
      document.getElementById('histSessionsHeader').innerHTML=_('session_timer')+' <span class="section-sub">'+_('session_len')+'</span>';
      shEl.innerHTML='<strong>'+sess.length+'</strong> '+_('history')+' · '+_('session_len')+' <strong>'+fmtClock(Math.round(avgS))+'</strong> · <strong>'+sph.toFixed(1)+'</strong> '+_('sets_per_hour');
      var last14=sess.slice(-14),mx=Math.max.apply(null,last14.map(function(x){return x.durationSec}).concat([1]));
      sbEl.innerHTML=last14.map(function(x){var h=Math.max(3,Math.round(x.durationSec/mx*46));return '<div title="'+x.date+' — '+fmtClock(x.durationSec)+'" style="width:12px;height:'+h+'px;background:rgba(244,201,59,.45);border-radius:2px"></div>'}).join('');
    } else {
      document.getElementById('histSessionsHeader').innerHTML=_('session_timer');
      shEl.innerHTML='<span style="color:rgba(250,250,248,.15)">'+_('hist_log_more')+'</span>';
      sbEl.innerHTML='';
    }

    // Exercise select for chart
    var sel=document.getElementById('histExSelect');sel.innerHTML='<option value="">'+_('hist_select_ex')+'</option>';
    var allEx=[];Object.keys(hist).forEach(function(k){if(hist[k].length>1)allEx.push(k);});
    allEx.sort().forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;sel.appendChild(o);});
    if(allEx.length){sel.value=allEx[0];renderChart(allEx[0]);}
    else{document.getElementById('histChart').innerHTML='<p style="font-size:.6rem;color:rgba(250,250,248,.15);padding:20px;text-align:center">'+_('hist_log_more')+'</p>';}
    sel.addEventListener('change',function(){if(this.value)renderChart(this.value);});

    // PRs
    var prs=[];
    Object.keys(hist).forEach(function(k){
      if(!hist[k].length)return;
      var best=hist[k].reduce(function(m,x){var e=x.e1RM||est1RM(x.w,x.r,x.rpe);return e>(m.e1||0)?{w:x.w,r:x.r,rpe:x.rpe,e1:e}:m;},{w:0,r:0,rpe:0,e1:0});
      if(best.e1>0)prs.push({ex:k,best:best});
    });
    prs.sort(function(a,b){return b.best.e1-a.best.e1});
    var phtml='';
    if(prs.length){phtml='<table class="pr-table"><thead><tr><th>Exercise</th><th>Best Set</th><th>e1RM</th><th>Date</th></tr></thead><tbody>';prs.slice(0,20).forEach(function(p){var d=hist[p.ex].reduce(function(m,x){var e=x.e1RM||est1RM(x.w,x.r,x.rpe);return e>(m.e1||0)?{d:x.date,e:e}:m;},{d:'',e:0});phtml+='<tr><td><strong>'+p.ex+'</strong></td><td>'+p.best.w+' kg × '+p.best.r+' @ '+p.best.rpe+'</td><td>'+Math.round(p.best.e1)+' kg</td><td style="font-size:.5rem">'+(d.d||'')+'</td></tr>';});phtml+='</tbody></table>';}
    else phtml='<p style="font-size:.6rem;color:rgba(250,250,248,.15);padding:10px;text-align:center">'+_('hist_log_pr')+'</p>';
    document.getElementById('prTable').innerHTML=phtml;

    // Rehab / Injury log
    var pf=painFlags();
    var hasInjuries=pf&&Object.keys(pf).filter(function(k){return pf[k]==='red'||pf[k]==='yellow'}).length;
    if(hasInjuries){
      document.getElementById('rehabHistCard').style.display='block';
      var rh='<div style="font-size:.6rem;color:rgba(250,250,248,.35);line-height:1.5">';
      Object.keys(pf).forEach(function(ex){
        if(pf[ex]==='red'||pf[ex]==='yellow'){
          var protocol=rehabForExercise(ex,pf);
          rh+='<div style="padding:4px 0;border-bottom:1px solid rgba(250,250,248,.02)"><strong>'+(pf[ex]==='red'?'🔴':'🟡')+' '+ex+'</strong> → ';
          rh+=protocol?protocol.name+' <span style="font-size:.5rem;color:rgba(250,250,248,.2)">('+protocol.icon+')</span>':'—';
          rh+=' · <a href="https://wa.me/201040796017?text='+encodeURIComponent('Hi Coach Anas, I need help with my '+ex+' injury ('+(protocol?protocol.name:ex)+'). Please advise.')+'" target="_blank" style="color:#F4C93B;font-size:.5rem">'+_('hist_book_consult')+'</a></div>';
        }
      });
      rh+='</div>';
      document.getElementById('rehabHistContent').innerHTML=rh;
      // Consultation button
      document.getElementById('rehabConsultHist').style.display='block';
      document.getElementById('rehabConsultHist').innerHTML='<a class="consult-cta" href="https://wa.me/201040796017?text='+encodeURIComponent('Hi Coach Anas, I need a free consultation about my injuries. Please advise.')+'" target="_blank">📅 '+_('hist_book_injury')+'</a>';
    } else {
      document.getElementById('rehabHistCard').style.display='none';
    }

    // Mesocycle history
    renderMesoHistory();
    // ACWR
    var acwr=calculateACWR();
    if(acwr.ratio>0){
      document.getElementById('acwrHist').innerHTML='<div class="section-header">'+_('acwr_ratio')+' <span class="section-sub">'+_('acwr_history_title')+'</span></div>'+
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><span class="acwr-val" style="color:'+acwr.color+';font-size:1rem">'+acwr.ratio.toFixed(2)+'</span>'+
        '<span style="font-size:.55rem;color:'+acwr.color+';font-weight:600">'+acwr.risk+'</span></div>'+
        '<div style="font-size:.5rem;color:rgba(250,250,248,.15)">'+_('acwr_acute')+': '+acwr.acute.toFixed(0)+' kg · '+_('acwr_chronic')+': '+acwr.chronic.toFixed(0)+' kg/week</div>';
    }

    // Deload history
    var dt=dlTracker();
    var dhtml='<div style="font-size:.6rem;color:rgba(250,250,248,.35);line-height:1.5">';
    if(dt.lastDeload)dhtml+=_('hist_last_deload')+': <strong>'+dt.lastDeload+'</strong><br>';
    dhtml+=_('hist_sessions_tracked')+': <strong>'+(dt.sessions||0)+'</strong><br>';
    dhtml+=_('hist_deload_interval')+': <strong>'+deloadInterval(age)+' '+_('meso_weeks')+'</strong> ('+age+')<br>';
    dhtml+=_('hist_rpe_overshoots')+': <strong>'+(dt.overshoots||0)+'</strong></div>';
    document.getElementById('deloadHistory').innerHTML=dhtml;

    // Cardio history
    var cl=getCardioLogs();
    if(cl.length){
      document.getElementById('cardioHistCard').style.display='block';
      var wc=weeklyCardio();
      var ch='<div style="font-size:.6rem;color:rgba(250,250,248,.35);line-height:1.5">';
      ch+=_('hist_this_week')+': <strong>'+wc.sessions+'</strong> '+_('cardio_sessions')+' · <strong>'+wc.minutes+'</strong> min';
      if(wc.detail)Object.keys(wc.detail).sort(function(a,b){return wc.detail[b]-wc.detail[a]}).forEach(function(t){ch+='<br> <span style="font-size:.52rem;color:rgba(250,250,248,.2)">'+t+': '+wc.detail[t]+' min</span>';});
      ch+='<br><br><div style="font-size:.5rem;color:rgba(250,250,248,.15)">'+_('hist_total_logged')+': '+cl.length+'</div></div>';
      document.getElementById('cardioHistContent').innerHTML=ch;
    } else {document.getElementById('cardioHistCard').style.display='none';}

    // Multi-month trend (P3): volume, combined load, monotony/strain, priority rotation
    renderTrendHistory();

    // Fatigue trend
    var fl=ls(K.FL,{});
    var dates=Object.keys(fl).sort().slice(-7);
    if(dates.length){
      document.getElementById('fatigueHistCard').style.display='block';
      var ft='<div style="display:flex;gap:4px;align-items:flex-end;height:50px;padding:4px 0">';
      dates.forEach(function(d){
        var fs=fatigueScore(fl[d]);var h=Math.min(fs.score*8,50);
        var c=fs.color==='green'?'#4CAF50':fs.color==='yellow'?'#FF9800':'#f44336';
        ft+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div title="'+d+': '+fs.score.toFixed(1)+' — '+fs.label+'" style="width:100%;height:'+Math.max(h,4)+'px;background:'+c+';border-radius:3px 3px 0 0;opacity:.7"></div><span style="font-size:.4rem;color:rgba(250,250,248,.15);margin-top:2px">'+d.slice(5)+'</span></div>';
      });
      ft+='</div>';
      var avg=dates.reduce(function(s,d){return s+fatigueScore(fl[d]).score},0)/dates.length;
      ft+='<div style="font-size:.55rem;color:rgba(250,250,248,.2);margin-top:4px">'+_('hist_7day_fatigue')+': <strong>'+(avg.toFixed(1))+'</strong> — '+(avg>=7.5?_('hist_fatigue_green'):avg>=5?_('hist_fatigue_yellow'):_('hist_fatigue_red'))+'</div>';
      document.getElementById('fatigueTrend').innerHTML=ft;
    } else {document.getElementById('fatigueHistCard').style.display='none';}

    renderOutcomeSection();
  }

  function renderChart(ex){
    var hist=loadHist(),entries=hist[ex];if(!entries||entries.length<2){document.getElementById('histChart').innerHTML='<p style="font-size:.6rem;color:rgba(250,250,248,.15);padding:20px;text-align:center">'+_('chart_need_sessions')+'</p>';return;}
    var sorted=entries.slice().sort(function(a,b){return a.date<b.date?-1:1}).slice(-8);
    var maxE=sorted.reduce(function(m,x){return Math.max(m,x.e1RM)},0);
    var html='<div class="hc-row">';
    sorted.forEach(function(e){
      var h=e.e1RM/maxE*100;
      html+='<div class="hc-bar" style="height:'+Math.max(h,5)+'%"><span class="hc-tooltip">'+e.date+'<br>'+e.w+' kg × '+e.r+' @ '+e.rpe+'<br>e1RM: '+e.e1RM+'</span></div>';
    });
    html+='</div><div style="display:flex;justify-content:space-between;font-size:.4rem;color:rgba(250,250,248,.12);margin-top:2px">';
    sorted.forEach(function(e){html+='<span>'+e.date.slice(5)+'</span>';});
    html+='</div><div style="margin-top:6px;font-size:.55rem;color:rgba(250,250,248,.2)">e1RM: <strong style="color:#F4C93B">'+sorted[0].e1RM+'</strong> → <strong style="color:#F4C93B">'+sorted[sorted.length-1].e1RM+'</strong> kg ('+(((sorted[sorted.length-1].e1RM-sorted[0].e1RM)/sorted[0].e1RM*100)||0).toFixed(1)+'%)</div>';
    document.getElementById('histChart').innerHTML=html;
  }

  function renderTrendHistory(){
    var range=parseInt(document.getElementById('trendRange').value)||180;
    var logs=ls(K.LG,{}),byDay=dailyCombinedLoads(range);
    var dates=Object.keys(byDay).sort();
    var card=document.getElementById('trendHistCard');
    if(!dates.length){if(card)card.style.display='none';return;}
    var weeks=[];
    for(var i=0;i<dates.length;i+=7){
      var chunk=dates.slice(i,i+7),sets=0,cl=0,vals=[];
      chunk.forEach(function(d){
        var l=logs[d]||{};
        Object.keys(l).forEach(function(eid){(l[eid].sets||[]).forEach(function(x){if(x&&x.w&&parseFloat(x.w)>0&&!x.wu)sets++;});});
        cl+=byDay[d].combined;vals.push(byDay[d].combined);
      });
      var sum=vals.reduce(function(a,x){return a+x},0),mean=sum/Math.max(vals.length,1);
      var sd=Math.sqrt(vals.reduce(function(a,x){return a+(x-mean)*(x-mean)},0)/Math.max(vals.length,1))||0;
      var mono=sd>0?mean/sd:0;
      weeks.push({label:chunk[0].slice(5)+'–'+chunk[chunk.length-1].slice(5),sets:sets,combined:cl,mono:mono,strain:mono>0?cl*mono:0});
    }
    var hasData=weeks.some(function(w){return w.sets>0||w.combined>0});
    if(!hasData){card.style.display='none';return;}
    card.style.display='block';
    var mxSets=Math.max.apply(null,weeks.map(function(w){return w.sets}).concat([1]));
    var mxCl=Math.max.apply(null,weeks.map(function(w){return w.combined}).concat([1]));
    var html='';
    html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:6px 0 2px">'+_('trend_volume')+' <span style="font-size:.42rem;color:rgba(250,250,248,.1)">— '+_('weekly_sets')+'</span></div>';
    html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.round(w.sets/mxSets*40));return '<div title="'+w.label+': '+w.sets+' sets" style="flex:1;height:'+h+'px;background:rgba(244,201,59,.45);border-radius:2px"></div>';}).join('')+'</div>';
    html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:8px 0 2px">'+_('trend_combined')+'</div>';
    html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.round(w.combined/mxCl*40));return '<div title="'+w.label+': '+w.combined+' u" style="flex:1;height:'+h+'px;background:rgba(33,150,243,.45);border-radius:2px"></div>';}).join('')+'</div>';
    html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:8px 0 2px">'+_('mono_label')+' <span style="font-size:.42rem;color:rgba(250,250,248,.1)">— '+_('mono_thresh')+'</span></div>';
    html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.min(40,Math.round(w.mono*16)));var c=w.mono>2?'#f44336':w.mono>1.5?'#FF9800':'#4CAF50';return '<div title="'+w.label+': mono '+w.mono.toFixed(2)+' · strain '+w.strain.toFixed(0)+'" style="flex:1;height:'+h+'px;background:'+c+';border-radius:2px;opacity:.75"></div>';}).join('')+'</div>';
    var pr=ls(K.PR,null);
    if(pr&&pr.muscles&&pr.muscles.length){
      var names=pr.muscles.map(function(m){for(var i2=0;i2<MUSCLES.length;i2++){if(MUSCLES[i2].id===m)return MUSCLES[i2].name;}return m;}).join(', ');
      html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin-top:8px">'+_('trend_priority')+': <strong style="color:#F4C93B">'+names+'</strong> <span style="font-size:.45rem;color:rgba(250,250,248,.15)">— '+_('trend_updated')+': '+(pr.updated||'—')+'</span></div>';
    }
    var overMono=weeks.filter(function(w){return w.mono>2}).length;
    var totSets=weeks.reduce(function(a,w){return a+w.sets},0);
    html+='<div style="font-size:.5rem;color:rgba(250,250,248,.15);margin-top:6px">'+_('trend_summary').replace('{s}',totSets).replace('{w}',weeks.length).replace('{m}',overMono)+'</div>';
    document.getElementById('trendContent').innerHTML=html;
  }
  document.getElementById('trendRange').addEventListener('change',renderTrendHistory);

  document.getElementById('backToDashBtn').addEventListener('click',function(){go(4);renderDashboard();});
  document.getElementById('markDeloadBtn').addEventListener('click',function(){evLog('deload_marked',{src:'history'});
    if(!confirm(_('confirm_mark_deload')))return;
    var dt=dlTracker();dt.lastDeload=new Date().toISOString().split('T')[0];dt.sessions=0;dt.overshoots=0;ss(K.DT,dt);
    alert(_('alert_deload_marked'));
    renderHistory();
  });

