  // ═══════════════════════════════════════
  //  UI STATE
  // ═══════════════════════════════════════

  var step=1,dayIdx=0,splitKey='upper_lower_4',quizMode=false,quizQ=0,quizA={};
  var makeupDays={},missedSkip=false,lightDays={},lightProceed={};
  function go(n){step=n;document.querySelectorAll('.step-content').forEach(function(s){s.classList.remove('active')});var el=document.getElementById('step'+n);if(el)el.classList.add('active');document.querySelectorAll('.step').forEach(function(s){var sn=parseInt(s.dataset.step);s.classList.remove('active','done');if(sn===n)s.classList.add('active');else if(sn<n)s.classList.add('done');});window.scrollTo(0,0);}
  document.querySelectorAll('.step').forEach(function(s){s.addEventListener('click',function(){var n=parseInt(this.dataset.step);if(n<=step)go(n);})});

  // ═══════════════════════════════════════
  //  SCREEN 1: ONBOARDING
  // ═══════════════════════════════════════

  function renderPriorities(){
    var g=document.getElementById('priorityGrid');g.innerHTML='';
    MUSCLES.forEach(function(m){
      var d=document.createElement('div');d.className='priority-item';
      d.innerHTML='<span class="name">'+m.name+'</span><button class="prio-btn focus active" data-m="'+m.id+'" data-v="focus">'+_('focus')+'</button><button class="prio-btn maint" data-m="'+m.id+'" data-v="maintenance">'+_('maint')+'</button>';
      d.querySelectorAll('.prio-btn').forEach(function(b){b.addEventListener('click',function(){this.parentElement.querySelectorAll('.prio-btn').forEach(function(x){x.classList.remove('active')});this.classList.add('active')})});
      g.appendChild(d);
    });
  }
  renderPriorities();

  function getPrio(id){var b=document.querySelector('.prio-btn.active[data-m="'+id+'"]');return b?b.dataset.v:'focus';}

  // Split toggle
  document.querySelectorAll('#splitToggle .toggle-opt').forEach(function(t){
    t.addEventListener('click',function(){
      document.querySelectorAll('#splitToggle .toggle-opt').forEach(function(x){x.classList.remove('active')});
      this.classList.add('active');quizMode=this.dataset.mode==='quiz';
      document.getElementById('quizContainer').classList.toggle('show',quizMode);
      if(quizMode)renderQuiz();
    });
  });

  // Quiz
  function renderQuiz(){
    if(quizQ>=QUIZ.length){doneQuiz();return;}
    var q=QUIZ[quizQ];
    document.getElementById('quizProgress').innerHTML=QUIZ.map(function(_,i){return'<div class="prog-step'+(i<quizQ?' done':i===quizQ?' active':'')+'"></div>'}).join('');
    document.getElementById('quizArea').innerHTML=
      '<div class="q-num">'+_('set')+' '+(quizQ+1)+' '+_('quiz_of')+' '+QUIZ.length+'</div><div class="q-text">'+q.q+'</div>'+
      '<div class="options">'+q.o.map(function(o){return'<div class="option'+(quizA[q.k]===o.v?' selected':'')+'" data-v="'+o.v+'"><span class="check"></span><span>'+o.l+'</span></div>'}).join('')+'</div>'+
      '<button class="btn-primary" id="quizNextBtn"'+(quizA[q.k]?'':' disabled')+'>'+(quizQ<QUIZ.length-1?_('calc_continue'):_('save_start'))+'</button>';
    document.querySelectorAll('#quizArea .option').forEach(function(el){
      el.addEventListener('click',function(){
        document.querySelectorAll('#quizArea .option').forEach(function(x){x.classList.remove('selected')});
        this.classList.add('selected');quizA[q.k]=this.dataset.v;
        document.getElementById('quizNextBtn').disabled=false;
      });
    });
    document.getElementById('quizNextBtn').addEventListener('click',function(){if(this.disabled)return;quizQ++;renderQuiz();});
  }

  function doneQuiz(){
    var rec=determineSplit(quizA);
    document.getElementById('quizProgress').innerHTML=QUIZ.map(function(){return'<div class="prog-step done"></div>'}).join('');
    document.getElementById('quizArea').innerHTML=
      '<div style="padding:8px 0;font-size:.7rem;color:#FAFAF8;font-weight:600;margin-bottom:6px">'+_('rec_split_recommended')+': <span style="color:#F4C93B">'+rec.name+'</span></div>'+
      '<p style="font-size:.6rem;color:rgba(250,250,248,.35);margin-bottom:10px">'+rec.note+'</p>'+
      '<div class="recap-box" style="margin-bottom:6px"><div class="rb-title">'+_('quiz_summary')+'</div><strong>'+rec.key+'</strong> · '+
      quizA.days+' days · '+quizA.goal+' · '+quizA.exp+'</div>'+
      '<button class="btn-primary" id="quizReBtn">'+_('retake_quiz')+'</button>';
    document.getElementById('quizReBtn').addEventListener('click',function(){quizQ=0;quizA={};renderQuiz();});
    // Auto-fill days dropdown only (split itself is chosen on Screen 2)
    var parsedDays=parseInt(quizA.days||4);
    var select=document.getElementById('dow');select.value=String(parsedDays);
  }

  document.getElementById('onboardNext').addEventListener('click',function(){
    var err=document.getElementById('onboardErr');
    var fc=MUSCLES.filter(function(m){return getPrio(m.id)==='focus'}).length;
    if(fc===0){err.style.display='block';return;}err.style.display='none';
    var ta=document.getElementById('ta').value,g=document.getElementById('goal').value,dd=parseInt(document.getElementById('dow').value),rf=document.getElementById('recFactor').value;
    var name=document.getElementById('userName').value.trim();
    var age=document.getElementById('userAge').value||'';
    var rfMap={low:0.85,moderate:1.0,high:1.1};
    var rec=rfMap[rf]||1;
    var table=VOLUME_TABLES[ta][g],targets={},total=0;
    MUSCLES.forEach(function(m){
      var v=table[VMAP[m.id]]||[4,8,12],prio=getPrio(m.id),mult=prio==='focus'?1:0.55;
      var mev=Math.round(v[0]*mult*rec),mav=Math.round(v[1]*mult*rec),mrv=Math.round(v[2]*mult*rec);
      targets[m.id]={mev:mev,mav:mav,mrv:mrv,rec:Math.round((mev+mav)/2),prio:prio,name:m.name};
      total+=Math.round((mev+mav)/2);
    });
    ss(K.VI,{name:name,age:age,ta:ta,goal:g,days:dd,rec:rf,prios:MUSCLES.map(function(m){return{id:m.id,p:getPrio(m.id)}})});
    ss(K.VT,targets);
    // Powerlifting profile
    if(g==='strength'){
      var pl=getPLProfile();savePLProfile(pl);
      var peri=determinePeriodization(pl,ta);
      if(peri)ss('mos_periodization',peri);
    } else {localStorage.removeItem(K.PL);localStorage.removeItem('mos_periodization');}
    document.getElementById('prioPanel').classList.add('show');
    renderPrioPanel();
  });

  // ═══════════════════════════════════════
  //  PRIORITY MUSCLES + EFFORT RECOVERY + VOLUME DISTRIBUTION
  //  (sits between onboarding and split selection, and between
  //   exercise selection and program generation)
  // ═══════════════════════════════════════

  function getPriority(){var p=ls(K.PR,{muscles:[],updated:null});if(!p.muscles)p.muscles=[];return p;}
  function savePriority(muscles){ss(K.PR,{muscles:muscles,updated:new Date().toISOString().split('T')[0]});}

  // ── Effort signal: logged per-set RPE (load history), defaults fallback ──
  function effortStyleOf(muscleId){
    var h=loadHist(),cut=new Date(Date.now()-21*864e5).toISOString().split('T')[0],rpes=[];
    Object.keys(h).forEach(function(ex){
      if(primaryOf(ex)!==muscleId)return;
      h[ex].forEach(function(e){if(e.date>=cut&&e.rpe>0)rpes.push(e.rpe);});
    });
    if(rpes.length){
      var avg=rpes.reduce(function(a,b){return a+b;},0)/rpes.length;
      return{avgRpe:Math.round(avg*10)/10,style:avg>=8.5?'high':avg>=7.5?'med':'low',source:'log',defaultRpe:Math.round(avg*10)/10,defaultSets:8};
    }
    var vi=ls(K.VI,{}),rec=vi.rec||'moderate';
    var style=rec==='low'?'high':rec==='high'?'low':'med';
    var dRpe={high:8.5,med:8,low:7};
    return{avgRpe:null,style:style,source:'default',defaultRpe:dRpe[style],defaultSets:rec==='low'?8:10};
  }
  function lastSessionSets(muscleId){
    var logs=ls(K.LG,{}),best=null,bestCnt=0;
    Object.keys(logs).forEach(function(d){
      var cnt=0;
      Object.keys(logs[d]).forEach(function(eid){
        var en=eid.split('__')[1]||eid;
        if(primaryOf(en)!==muscleId)return;
        (logs[d][eid].sets||[]).forEach(function(s){
          if(s&&!s.wu&&parseFloat(s.rpe)>0)cnt++;
        });
      });
      if(cnt&&(!best||d>best)){best=d;bestCnt=cnt;}
    });
    return bestCnt||null;
  }
  function estimateRecoveryCost(muscleId){
    var style=effortStyleOf(muscleId);
    var rpe=style.avgRpe||style.defaultRpe;
    var sets=lastSessionSets(muscleId)||style.defaultSets;
    var cost=Math.round(rpe*sets*10)/10;
    var bucket=cost>=40?'high':cost>=24?'med':'low';
    var floors={low:24,med:48,high:72};
    return{bucket:bucket,cost:cost,floorH:floors[bucket],source:style.source,rpe:rpe,sets:sets};
  }
  function seededFreq(muscleId){
    var hasSessions=lastSessionSets(muscleId)!==null;
    if(!hasSessions){
      var vi=ls(K.VI,{});
      return{freq:vi.rec==='low'?3:4,why:'default'};
    }
    var est=estimateRecoveryCost(muscleId);
    return{freq:est.bucket==='low'?4:3,why:'effort'};
  }

  // ── Soreness check-in (ground-truth override on the modeled prior) ──
  function sorenessLog(){return ls(K.SR,{});}
  function saveSoreness(m,val){var s=sorenessLog(),td=new Date().toISOString().split('T')[0];if(!s[td])s[td]={};s[td][m]=val;ss(K.SR,s);}
  function blendRecovery(muscleId,sore){
    var est=estimateRecoveryCost(muscleId),bucket=est.bucket;
    if(sore>=7){bucket=bucket==='high'?'high':'med';}
    else if(sore<=2){bucket=bucket==='low'?'low':bucket==='med'?'low':'med';}
    var floors={low:24,med:48,high:72};
    return{bucket:bucket,floorH:floors[bucket],est:est,sore:sore};
  }
  function weekStartISO(){
    var now=new Date(),day=(now.getDay()+6)%7,start=new Date(now);
    start.setDate(now.getDate()-day);
    return start.toISOString().split('T')[0];
  }
  function softGateActive(m){
    var log=sorenessLog(),est=estimateRecoveryCost(m);
    if(est.bucket!=='high')return false;
    var td=new Date().toISOString().split('T')[0],cut=new Date(Date.now()-7*864e5).toISOString().split('T')[0];
    return Object.keys(log).some(function(d){return d>=cut&&d<td&&log[d][m]>=7;});
  }
  function scheduledPriorityMuscles(day){
    var pr=getPriority();
    if(!pr.muscles.length)return[];
    return pr.muscles.filter(function(pm){
      return day.ex.some(function(ex){return ex.p===pm.m||(ex.se||[]).indexOf(pm.m)>=0;});
    });
  }
  function renderSorenessCards(day,di){
    var pr=getPriority();
    if(!pr.muscles.length)return'';
    var sched=scheduledPriorityMuscles(day);
    if(!sched.length)return'';
    var td=new Date().toISOString().split('T')[0],log=sorenessLog()[td]||{},html='';
    sched.forEach(function(pm){
      var m=pm.m,name=MUSCLE_NAME[m]||m;
      var est=estimateRecoveryCost(m);
      var ans=log[m];
      if(ans!==undefined){
        var blend=blendRecovery(m,ans);
        html+='<div class="sr-done">'+_('sr_done').replace('{M}',name).replace('{V}',ans).replace('{B}',_('bucket_'+blend.bucket))+'</div>';
      }else{
        html+='<div class="sr-card"><div class="sr-title">'+_('sr_title')+': '+name+'</div>'+
          '<div class="sr-sub">'+_('sr_sub').replace('{H}',est.floorH).replace('{B}',_('bucket_'+est.bucket))+'</div>'+
          '<div class="sr-chips">';
        for(var i=1;i<=10;i++)html+='<button class="sr-chip" data-m="'+m+'" data-v="'+i+'" data-di="'+di+'">'+i+'</button>';
        html+='</div><div class="sr-scale"><span>'+_('sr_chip_ready')+'</span><span>'+_('sr_chip_sore')+'</span></div></div>';
      }
    });
    var fo=ls(K.FO,{}),wk=weekStartISO();
    sched.forEach(function(pm){
      var m=pm.m,name=MUSCLE_NAME[m]||m;
      var dropped=fo[wk]&&fo[wk][m]!==undefined&&fo[wk][m]!==pm.freq;
      if(softGateActive(m)&&(!fo[wk]||fo[wk][m]===undefined)){
        html+='<div class="fat-light-banner"><span class="flb-title">'+_('sr_gate_title').replace('{M}',name)+'</span>'+
          '<span class="flb-desc">'+_('sr_gate_body').replace('{M}',name)+'</span>'+
          '<div class="flb-btns"><button class="fat-light-btn" data-gm="'+m+'" data-gfreq="'+pm.freq+'" data-di="'+di+'">'+_('sr_gate_keep').replace('{F}',pm.freq)+'</button>'+
          '<button class="fat-light-btn" data-gm="'+m+'" data-gfreq="2" data-di="'+di+'">'+_('sr_gate_drop')+'</button></div></div>';
      }else if(dropped){
        html+='<div class="sr-done">'+_('sr_gate_dropped').replace('{M}',name).replace('{F}',pm.freq)+'</div>';
      }
    });
    return html;
  }

  // ── Split recommendation (priority-aware) + structural conflict ──
  function muscleFrequencyInSplit(split,m){
    if(!split||!split.days)return 0;
    var n=0;
    split.days.forEach(function(day){
      if(day.restDay)return;
      if(day.ex.some(function(ex){return ex.p===m||(ex.se||[]).indexOf(m)>=0;}))n++;
    });
    return n;
  }
  function prioritySatisfaction(split,pr){
    var out={score:0,list:[]};
    (pr.muscles||[]).forEach(function(pm){
      var f=muscleFrequencyInSplit(split,pm.m),ok=f>=pm.freq;
      out.list.push({m:pm.m,f:f,need:pm.freq,ok:ok});
      if(ok)out.score++;
    });
    return out;
  }
  function recommendSplit(){
    var vi=ls(K.VI,{}),d=parseInt(vi.days||4,10),g=vi.goal||'hypertrophy';
    var a={days:d,goal:g,recovery:vi.rec||'moderate',exp:vi.ta||'intermediate',sched:'somewhat'};
    var base=determineSplit(a);
    var pr=getPriority();
    if(!pr.muscles.length)return{key:base.key,name:base.name,why:base.note||'',satisfies:null,base:true};
    var best=null,bestScore=-1;
    Object.keys(SPLITS).forEach(function(k){
      var s=SPLITS[k];
      if(s.d!==d)return;
      if(g!=='strength'&&s.g==='strength')return;
      var sat=prioritySatisfaction(s,pr);
      if(sat.score>bestScore){bestScore=sat.score;best={key:k,name:s.name,sat:sat};}
    });
    var prioDesc=pr.muscles.map(function(pm){return(MUSCLE_NAME[pm.m]||pm.m)+' '+pm.freq+'x';}).join(', ');
    if(best&&bestScore===pr.muscles.length&&best.key!==base.key){
      return{key:best.key,name:best.name,why:_('split_rec_priority')+': '+prioDesc,satisfies:best.sat,base:false};
    }
    return{key:base.key,name:base.name,why:base.note+' · '+_('split_rec_priority')+': '+prioDesc,satisfies:best?best.sat:null,base:true};
  }
  function renderSplitConflict(k){
    var box=document.getElementById('splitConflict');
    var pr=getPriority();
    if(!pr.muscles.length){box.style.display='none';box.innerHTML='';return;}
    var split=SPLITS[k],sat=prioritySatisfaction(split,pr);
    var bad=sat.list.filter(function(x){return !x.ok;});
    if(!bad.length){
      box.style.display='block';box.className='conflict-box ok';
      box.innerHTML='✓ '+sat.list.map(function(x){return(MUSCLE_NAME[x.m]||x.m)+' '+x.f+'x/w ('+_('split_conflict_ok')+' '+x.need+'x)';}).join(' · ');
      return;
    }
    box.style.display='block';box.className='conflict-box warn';
    box.innerHTML='<span class="cb-title">⚠ '+_('split_conflict_head')+'</span>'+
      bad.map(function(x){return(MUSCLE_NAME[x.m]||x.m)+': '+_('split_conflict_body').replace('{F}',x.f).replace('{N}',x.need);}).join('<br>')+
      '<br><span class="cb-fix">'+_('split_conflict_fix')+'</span>';
  }

  // ── Volume distribution engine ──
  var SBD_FAMILY={
    'Bench Press':[['triceps',45],['shoulders',25]],
    'Barbell Squat':[['glutes',30],['hamstrings',20]],
    'Front Squat':[['glutes',25],['abs',20]],
    'Deadlift Variation':[['glutes',40],['back',25],['traps',15]],
    'Trap Bar Deadlift':[['glutes',35],['back',20]],
    'Sumo Deadlift':[['glutes',35],['back',20]]
  };
  function prHistoryOf(exName){
    var h=(loadHist()[exName]||[]).slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
    var prs=[],max=0;
    h.forEach(function(e){if(e.e1RM>max){max=e.e1RM;prs.push(e.date);}});
    return prs;
  }
  function hasPrInLastDays(exName,days){
    var cut=new Date(Date.now()-days*864e5).toISOString().split('T')[0];
    return prHistoryOf(exName).some(function(d){return d>=cut;});
  }
  function distributeVolume(muscleTarget,selectedExercises,opts){
    opts=opts||{};
    var list=selectedExercises.slice();
    if(!list.length)return{alloc:{},total:0,fragmentation:[],indirect:{},directOnly:!opts.prCredit};
    var weights=list.map(function(name){
      var t=meta(name).t,w=t==='compound'?1.35:0.85;
      if(opts.prCredit&&SBD_FAMILY[name]&&hasPrInLastDays(name,14))w*=1.15;
      return w;
    });
    var sw=weights.reduce(function(a,b){return a+b;},0);
    var raw=list.map(function(name,i){return muscleTarget*weights[i]/sw;});
    var alloc={};
    raw.forEach(function(v,i){alloc[list[i]]=v<1?1:Math.floor(v);});
    var total=0;Object.keys(alloc).forEach(function(n){total+=alloc[n];});
    var diff=muscleTarget-total;
    if(diff>0){
      var rem=list.map(function(name,i){return{name:name,r:raw[i]-alloc[name]};}).sort(function(a,b){return b.r-a.r;});
      for(var k=0;k<diff&&k<rem.length;k++)alloc[rem[k].name]++;
    }else if(diff<0){
      var order=list.slice().sort(function(a,b){return alloc[b]-alloc[a];});
      for(var k2=0;k2<-diff&&k2<order.length;k2++){if(alloc[order[k2]]>1)alloc[order[k2]]--;}
    }
    total=0;Object.keys(alloc).forEach(function(n){total+=alloc[n];});
    var fragmentation=list.filter(function(n){return alloc[n]<2;});
    var indirect={};
    if(opts.prCredit){
      list.forEach(function(name){
        if(!SBD_FAMILY[name]||!hasPrInLastDays(name,14))return;
        SBD_FAMILY[name].forEach(function(sec){
          var sm=sec[0],pp=sec[1];
          if(!indirect[sm])indirect[sm]={sets:0,from:[]};
          var cr=Math.round(alloc[name]*pp/100*10)/10;
          indirect[sm].sets+=cr;
          indirect[sm].from.push({ex:name,sets:cr});
        });
      });
    }
    return{alloc:alloc,total:total,fragmentation:fragmentation,indirect:indirect,directOnly:!opts.prCredit};
  }
  function computeSelection(){
    var sel={};
    document.querySelectorAll('#exSelContent .ex-sel-row').forEach(function(row){
      var chip=row.querySelector('.ex-sel-chip.selected');
      if(!chip)return;
      var m=row.dataset.muscle;
      if(!sel[m])sel[m]=[];
      if(sel[m].indexOf(chip.dataset.exval)<0)sel[m].push(chip.dataset.exval);
    });
    return sel;
  }
  function computeAllocation(prCredit){
    var targets=ls(K.VT,{}),sel=computeSelection(),out={};
    Object.keys(sel).forEach(function(m){
      var t=targets[m]&&targets[m].rec||8;
      out[m]=distributeVolume(t,sel[m],{prCredit:prCredit});
    });
    return out;
  }
  function renderLiveVol(muscle){
    var targets=ls(K.VT,{}),t=targets[muscle]||{rec:8};
    var sel=(computeSelection()[muscle]||[]);
    var res=distributeVolume(t.rec,sel,{prCredit:!!ls(K.PC,false)});
    var panels=document.querySelectorAll('#exSelContent .vol-live[data-muscle="'+muscle+'"]');
    if(!panels.length)return;
    var html='';
    if(!sel.length){
      html='<div class="vol-live-empty">'+_('vl_none')+'</div>';
    }else{
      var maxV=Math.max(t.rec,res.total,1);
      var pct=Math.min(100,Math.round(res.total/maxV*100));
      var cls=res.total<t.rec*0.8?'under':res.total<=t.rec*1.15?'on':'over';
      var bar='<div class="vl-bar"><div class="vl-fill '+cls+'" style="width:'+pct+'%"></div><div class="vl-mark" style="left:'+Math.round(t.rec/maxV*100)+'%"></div></div>';
      var frag=res.fragmentation.length?'<span class="vl-frag">'+_('vl_frag').replace('{X}',res.fragmentation.join(', '))+'</span>':'';
      var sets=Object.keys(res.alloc).map(function(n){return '<span class="vl-set">'+n+' <b>'+res.alloc[n]+'</b></span>';}).join('');
      html='<div class="vol-live-head"><span>'+_('vl_weekly')+': <b>'+res.total+'/'+t.rec+'</b> '+_('weekly_sets')+'</span></div>'+bar+'<div class="vl-sets">'+sets+'</div>'+frag;
      if(res.directOnly)html+='<span class="vl-note">'+_('vl_direct_only')+'</span>';
    }
    panels.forEach(function(p){p.innerHTML=html;});
  }
  function showVolReview(){
    document.getElementById('exSelPanel').classList.remove('show');
    document.getElementById('volReviewPanel').classList.add('show');
    renderVolReview();
  }
  function renderVolReview(){
    var prCredit=!!ls(K.PC,false);
    var targets=ls(K.VT,{}),alloc=computeAllocation(prCredit);
    ss(K.VA,alloc);
    var html='';
    html+='<div class="vr-opt-row"><button class="btn-secondary" id="prCreditBtn" style="font-size:.5rem;padding:3px 10px">'+(prCredit?_('vr_pr_on'):_('vr_pr_off'))+'</button></div>';
    html+='<p style="font-size:.5rem;color:rgba(250,250,248,.3);line-height:1.3;margin:4px 0 8px">'+_('vr_sub')+'</p>';
    if(prCredit)html+='<p style="font-size:.5rem;color:#2196F3;line-height:1.3;margin:2px 0 8px">'+_('vr_pr_desc')+'</p>';
    if(!Object.keys(alloc).length){
      html+='<div class="vr-empty">'+_('vl_none')+'</div>';
    }else{
      Object.keys(alloc).forEach(function(m){
        var r=alloc[m],t=targets[m]&&targets[m].rec||8;
        var maxV=Math.max(t,r.total,1),pct=Math.round(r.total/maxV*100),tPct=Math.round(t/maxV*100);
        var cls=r.total<t.rec*0.8?'under':r.total<=t.rec*1.15?'on':'over';
        var lbl=r.total<t.rec*0.8?_('vr_under'):r.total<=t.rec*1.15?_('vr_on'):_('vr_over');
        html+='<div class="vr-row"><span class="vr-label">'+(MUSCLE_NAME[m]||m)+'</span><div class="vr-bar"><div class="vr-fill '+cls+'" style="width:'+pct+'%"></div><div class="vr-mark" style="left:'+tPct+'%"></div></div><span class="vr-num">'+r.total+'/'+t+' <span class="vr-zone">'+lbl+'</span></span></div>';
        var sets=Object.keys(r.alloc).map(function(n){return n+'×'+r.alloc[n];}).join(' · ');
        html+='<div class="vr-exs">'+sets+'</div>';
        if(r.fragmentation.length)html+='<div class="vr-frag">'+_('vl_frag').replace('{X}',r.fragmentation.join(', '))+'</div>';
        if(!r.directOnly&&Object.keys(r.indirect).length)html+='<div class="vr-ind">'+_('vr_indirect')+': '+Object.keys(r.indirect).map(function(sm){
          return(MUSCLE_NAME[sm]||sm)+' +'+Math.round(r.indirect[sm].sets*10)/10;
        }).join(' · ')+'</div>';
      });
      if(prCredit)html+='<p style="font-size:.45rem;color:rgba(250,250,248,.25);margin-top:6px">'+_('vl_direct_only')+' '+_('vr_indirect_note')+'</p>';
    }
    // Day-level time estimate (layer 3 · 2a) — mirrors generateProgram's final set math
    var estSplit=SPLITS[splitKey]||(ls(K.SP,null)&&SPLITS[ls(K.SP,null).key]);
    if(estSplit){
      var exChoices2=ls('mos_ex_choices',{}),win2=sessWindowMins();
      html+='<div class="vr-est"><span class="vr-est-title">'+_('est_review_head')+'</span>';
      estSplit.days.forEach(function(day2,di2){
        if(day2.restDay)return;
        var sec2=estDaySecFromAlloc(day2,estSplit,exChoices2,alloc),mins2=Math.round(sec2/60);
        html+='<div class="vr-est-row'+(mins2>win2?' vr-est-over':'')+'">'+_('day')+' '+(di2+1)+': '+day2.n+' — '+_('est_label').replace('{M}',mins2)+(mins2>win2?' ⚠':'')+'</div>';
      });
      html+='</div>';
    }
    document.getElementById('volReviewContent').innerHTML=html;
    var b=document.getElementById('prCreditBtn');
    if(b)b.addEventListener('click',function(){ss(K.PC,!ls(K.PC,false));renderVolReview();});
  }

  // ── Priority panel (screen 1.5) ──
  function renderPrioPanel(){
    var pr=getPriority(),sel={};
    pr.muscles.forEach(function(x){sel[x.m]=x.freq;});
    var grid=document.getElementById('prioGrid');
    var html='';
    MUSCLES.forEach(function(m){
      var is=sel[m.id]!==undefined,disabled=!is&&Object.keys(sel).length>=2;
      var seed=seededFreq(m.id);
      html+='<div class="prio-card'+(is?' selected':'')+(disabled?' disabled':'')+'" data-m="'+m.id+'">'+
        '<span class="prio-name">'+m.name+(is?'<span class="prio-tag">'+_('prio_picked')+'</span>':'')+'</span>'+
        '<div class="prio-freq" '+(is?'':'style="display:none"')+'>'+
          '<button class="freq-btn'+(sel[m.id]===3?' on':'')+'" data-freq="3">'+_('freq_3x')+'</button>'+
          '<button class="freq-btn'+(sel[m.id]===4?' on':'')+'" data-freq="4">'+_('freq_4x')+'</button>'+
        '</div>'+
        '<div class="prio-seed" '+(is?'':'style="display:none"')+'>'+(is?(seed.why==='effort'?_('prio_seed_effort'):_('prio_seed_default')):'')+'</div>'+
        '</div>';
    });
    grid.innerHTML=html;
    grid.querySelectorAll('.prio-card').forEach(function(card){
      var m=card.dataset.m;
      if(!card.classList.contains('disabled')){
        card.addEventListener('click',function(){
          var pr2=getPriority(),sel2={};
          pr2.muscles.forEach(function(x){sel2[x.m]=x.freq;});
          if(sel2[m]!==undefined){delete sel2[m];}
          else if(Object.keys(sel2).length>=2){return;}
          else{sel2[m]=seededFreq(m).freq;}
          var arr=Object.keys(sel2).map(function(k){return{m:k,freq:sel2[k]};});
          savePriority(arr);renderPrioPanel();
        });
      }
      card.querySelectorAll('.freq-btn').forEach(function(b){
        b.addEventListener('click',function(ev){
          ev.stopPropagation();
          var pr3=getPriority();
          pr3.muscles.forEach(function(x){if(x.m===m)x.freq=parseInt(b.dataset.freq,10);});
          savePriority(pr3.muscles);renderPrioPanel();
        });
      });
    });
    var cap=document.getElementById('prioCap');
    cap.style.display=Object.keys(sel).length>=2?'block':'none';
    cap.textContent=_('prio_cap');
    document.getElementById('prioContBtn').disabled=Object.keys(sel).length===0;
    document.getElementById('prioNeed').style.display='none';
  }
  document.getElementById('prioBackBtn').addEventListener('click',function(){document.getElementById('prioPanel').classList.remove('show');});
  document.getElementById('prioContBtn').addEventListener('click',function(){
    var pr=getPriority();
    if(!pr.muscles.length){document.getElementById('prioNeed').style.display='block';return;}
    var targets=ls(K.VT,{}),changed=false;
    pr.muscles.forEach(function(pm){
      var t=targets[pm.m];
      if(t&&t.rec<t.mrv){t.rec=Math.min(t.mrv,t.rec+1);targets[pm.m]=t;changed=true;}
    });
    if(changed)ss(K.VT,targets);
    document.getElementById('prioPanel').classList.remove('show');
    splitKey='';
    var vi=ls(K.VI,{}),targets2=ls(K.VT,{}),total=0;
    MUSCLES.forEach(function(m){var x=targets2[m.id];if(x)total+=x.rec;});
    go(2);
    renderVolumeSplit(targets2,total,vi.ta||'intermediate',vi.goal||'hypertrophy',parseInt(vi.days||4,10));
  });

  window.__pmEngine={getPriority:getPriority,savePriority:savePriority,effortStyleOf:effortStyleOf,lastSessionSets:lastSessionSets,estimateRecoveryCost:estimateRecoveryCost,seededFreq:seededFreq,blendRecovery:blendRecovery,softGateActive:softGateActive,scheduledPriorityMuscles:scheduledPriorityMuscles,renderSorenessCards:renderSorenessCards,muscleFrequencyInSplit:muscleFrequencyInSplit,prioritySatisfaction:prioritySatisfaction,recommendSplit:recommendSplit,renderSplitConflict:renderSplitConflict,SBD_FAMILY:SBD_FAMILY,prHistoryOf:prHistoryOf,hasPrInLastDays:hasPrInLastDays,distributeVolume:distributeVolume,computeSelection:computeSelection,computeAllocation:computeAllocation,renderLiveVol:renderLiveVol,showVolReview:showVolReview,renderVolReview:renderVolReview,renderPrioPanel:renderPrioPanel,weekStartISO:weekStartISO,ls:ls,ss:ss,K:K,MUSCLES:MUSCLES,MUSCLE_NAME:MUSCLE_NAME,SPLITS:SPLITS,determineSplit:determineSplit};

