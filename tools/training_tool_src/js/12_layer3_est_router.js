  // ═══════════════════════════════════════
  //  SESSION TIME ESTIMATOR (layer 3 · 2a)
  //  Live per-day estimate at exercise selection, compared vs mos_sess_len.
  //  Model: Σ (sets × (exec + rest)) + fixed overhead. Rest mirrors the
  //  app's rest-timer defaults (compound 240s / isolation 150s).
  // ═══════════════════════════════════════
  var EST_OVERHEAD_SEC=480; // fixed overhead per session: setup + transitions + warmup
  var EST_EXEC={compound:40,isolation:30}; // seconds of actual work per set
  var EST_REST={compound:240,isolation:150}; // rest seconds per set (mirrors rest-timer defaults)
  // Locked conventions for later passes (documented here, not yet consumed):
  var DELOAD_CONSECUTIVE_SESSIONS=3; // 1b: effort bucket high AND soreness>=7 on 3+ consecutive scheduled sessions
  var LAG_RATIO=0.5; // 1c: muscle 4-week progression < 50% of user's median => lagging
  var MESO_WINDOW={minWeeks:4,maxWeeks:8}; // 1c: rolling mesocycle window for progression comparison
  function execTimeOf(name){var m=meta(name);return m&&m.t==='compound'?EST_EXEC.compound:EST_EXEC.isolation;}
  function restTimeOf(name){var m=meta(name);return m&&m.t==='compound'?EST_REST.compound:EST_REST.isolation;}
  function estExerciseSec(name,sets){return sets*(execTimeOf(name)+restTimeOf(name));}
  function sessWindowMins(){return parseInt(ls('mos_sess_len',60),10)||60;}
  function impliedVolumes(split){
    var imp={};
    split.days.forEach(function(day){if(day.restDay)return;day.ex.forEach(function(ex){imp[ex.p]=(imp[ex.p]||0)+ex.s;});});
    return imp;
  }
  function estSetsScaled(ex,split){
    var targets=ls(K.VT,{}),imp=impliedVolumes(split),t=targets[ex.p]&&targets[ex.p].rec;
    var goal=ls(K.VI,{}).goal||'hypertrophy',MAX=goal==='strength'?6:5;
    if(!t||!imp[ex.p])return ex.s||3;
    var scale=Math.min(t/imp[ex.p],MAX/(ex.s||3));
    return Math.max(1,Math.round((ex.s||3)*scale));
  }
  // Exact mirror of generateProgram's per-day set math (VA share or scaled default)
  function setsForSlotInDay(ex,day,split,exChoices,volAlloc){
    var goal=ls(K.VI,{}).goal||'hypertrophy',MAX=goal==='strength'?6:5;
    var chosenName=exChoices[ex.n]||prefTop(ex.n)||ex.n;
    var va=volAlloc[ex.p]&&volAlloc[ex.p].alloc||null;
    if(va&&va[chosenName]!==undefined){
      var tot=0;
      split.days.forEach(function(d){if(d.restDay)return;d.ex.forEach(function(e){if(e.p===ex.p&&(exChoices[e.n]||prefTop(e.n)||e.n)===chosenName)tot+=e.s;});});
      return Math.max(1,Math.min(MAX,Math.round(va[chosenName]*(ex.s/(tot||1)))));
    }
    return estSetsScaled(ex,split);
  }
  function pickerSlotNames(day,di){
    var rows=document.querySelectorAll('#exSelContent .ex-sel-row[data-day="'+di+'"]'),out=[];
    day.ex.forEach(function(ex,i){
      var chosen=ex.n;
      if(rows[i]){
        var sel=rows[i].querySelector('.ex-sel-chip.selected');
        if(sel&&sel.dataset.exval)chosen=sel.dataset.exval;
      }
      out.push(chosen);
    });
    return out;
  }
  function estDaySecFromSplit(day,di,split){
    if(day.restDay)return null;
    var names=pickerSlotNames(day,di),total=EST_OVERHEAD_SEC;
    day.ex.forEach(function(ex,i){total+=estExerciseSec(names[i]||ex.n,estSetsScaled(ex,split));});
    return total;
  }
  function estDaySecFromAlloc(day,split,exChoices,volAlloc){
    if(day.restDay)return null;
    var total=EST_OVERHEAD_SEC;
    day.ex.forEach(function(ex){total+=estExerciseSec(ex.n,setsForSlotInDay(ex,day,split,exChoices,volAlloc));});
    return total;
  }
  function estTrimPick(day,di,split){
    // most time-consuming slot in the day (drop/sets-reduction suggestion)
    var names=pickerSlotNames(day,di),best=null,bestSec=-1;
    day.ex.forEach(function(ex,i){
      var s=estExerciseSec(names[i]||ex.n,estSetsScaled(ex,split));
      if(s>bestSec){bestSec=s;best=names[i]||ex.n;}
    });
    return best?{name:best,mins:Math.max(1,Math.round(bestSec/60))}:null;
  }
  function estChipWarn(day,di,split){
    var sec=estDaySecFromSplit(day,di,split);
    if(sec===null)return {chip:'',warn:'',over:false};
    var mins=Math.round(sec/60),win=sessWindowMins(),over=mins>win;
    var warn='';
    if(over){
      var t=estTrimPick(day,di,split);
      warn=_('est_over').replace('{M}',win)+(t?' — '+_('est_trim').replace('{X}',t.name).replace('{M}',t.mins):'');
    }
    return {chip:_('est_label').replace('{M}',mins),warn:warn,over:over};
  }
  function renderDayEstimate(di){
    var split=SPLITS[splitKey];
    if(!split||!split.days[di]||split.days[di].restDay)return;
    var c=document.getElementById('estChip_'+di),w=document.getElementById('estWarn_'+di);
    if(!c)return;
    var r=estChipWarn(split.days[di],di,split);
    c.textContent=r.chip;
    c.classList.toggle('est-over',r.over);
    if(w){w.style.display=r.warn?'block':'none';w.textContent=r.warn;}
  }
  function renderDayEstimates(){
    var split=SPLITS[splitKey];
    if(!split)return;
    split.days.forEach(function(day,di){if(!day.restDay)renderDayEstimate(di);});
  }

  // ═══════════════════════════════════════
  //  COACH ROUTING HOOK (layer 3 · 3c)
  //  Generic suggestion router: coached users (K.VI.coached) route through
  //  a coach review queue (K.CQ) + notifyCoach ping; self-serve surfaces
  //  suggestions directly (status 'direct') for the feature to render.
  // ═══════════════════════════════════════
  var SuggestionRouter={
    types:{},
    register:function(type,def){this.types[type]=def||{};return this;},
    coached:function(){var vi=ls(K.VI,{});return !!vi.coached;},
    setCoached:function(v){var vi=ls(K.VI,{});vi.coached=!!v;ss(K.VI,vi);return this;},
    route:function(type,payload){
      var def=this.types[type]||{};
      var sug={id:type+'_'+Date.now()+'_'+Math.floor(Math.random()*1e4),type:type,
        title:typeof def.title==='function'?def.title(payload):type,
        body:typeof def.body==='function'?def.body(payload):'',
        created:new Date().toISOString(),data:payload||{}};
      if(this.coached()){
        sug.status='pending_coach';
        var q=ls(K.CQ,[]);q.push(sug);ss(K.CQ,q);
        try{notifyCoach('suggestion',{type:type,title:sug.title,body:sug.body});}catch(e){}
      }else{
        sug.status='direct';
      }
      return sug;
    },
    apply:function(sug){
      var def=this.types[sug.type];
      if(def&&def.apply&&sug.status!=='pending_coach'){try{sug.applied=def.apply(sug.data);}catch(e){sug.applied=false;}}
      return sug;
    },
    resolve:function(id,approve){
      var q=ls(K.CQ,[]),sug=null,rest=[];
      q.forEach(function(s){if(s.id===id)sug=s;else rest.push(s);});
      if(!sug)return null;
      sug.status=approve?'approved':'rejected';
      sug.resolved=new Date().toISOString();
      ss(K.CQ,rest.concat([sug]));
      if(approve)this.apply(sug);
      return sug;
    },
    dismiss:function(id){ss(K.CQ,ls(K.CQ,[]).filter(function(s){return s.id!==id;}));},
    pending:function(){return ls(K.CQ,[]);}
  };
  function renderSuggestTray(){
    var t=document.getElementById('suggestTray');
    if(!t)return;
    var q=SuggestionRouter.pending();
    if(!q.length){t.style.display='none';t.innerHTML='';return;}
    t.style.display='block';
    var items=q.slice(-6).reverse().map(function(s){
      var st=s.status==='pending_coach'?'<span class="cq-status cq-pending">'+_('cq_awaiting')+'</span>':s.status==='approved'?'<span class="cq-status cq-ok">'+_('cq_approved')+'</span>':'<span class="cq-status cq-no">'+_('cq_rejected')+'</span>';
      var dm=s.status==='pending_coach'?'<button class="cq-dismiss" data-id="'+s.id+'">'+_('cq_dismiss')+'</button>':'';
      return '<div class="cq-item"><div class="cq-head"><span class="cq-title">'+s.title+'</span>'+st+'</div><div class="cq-body">'+s.body+'</div>'+dm+'</div>';
    }).join('');
    t.innerHTML='<div class="cq-title-bar">'+_('cq_title')+'</div>'+items;
    t.querySelectorAll('.cq-dismiss').forEach(function(b){
      b.addEventListener('click',function(){SuggestionRouter.dismiss(this.dataset.id);renderSuggestTray();});
    });
  }
  window.__suggestRouter=SuggestionRouter;
  window.__estEngine={execTimeOf:execTimeOf,restTimeOf:restTimeOf,estExerciseSec:estExerciseSec,sessWindowMins:sessWindowMins,estSetsScaled:estSetsScaled,setsForSlotInDay:setsForSlotInDay,estDaySecFromSplit:estDaySecFromSplit,estDaySecFromAlloc:estDaySecFromAlloc,estTrimPick:estTrimPick,estChipWarn:estChipWarn,renderDayEstimate:renderDayEstimate,renderDayEstimates:renderDayEstimates,renderSuggestTray:renderSuggestTray,DELOAD_CONSECUTIVE_SESSIONS:DELOAD_CONSECUTIVE_SESSIONS,LAG_RATIO:LAG_RATIO,MESO_WINDOW:MESO_WINDOW,EST_OVERHEAD_SEC:EST_OVERHEAD_SEC,EST_EXEC:EST_EXEC,EST_REST:EST_REST,K:K,ls:ls,ss:ss};

