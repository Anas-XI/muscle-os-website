  // ═══════════════════════════════════════
  //  EXERCISE SELECTION (Screen 2.5)
  // ═══════════════════════════════════════

  var pendingExChoices={};
  function prefTop(exName){
    var prefs=ls('mos_pref',{})[exName];
    if(!prefs)return null;
    var top=null,topC=0;
    Object.keys(prefs).forEach(function(n){if(prefs[n]>topC){topC=prefs[n];top=n;}});
    return topC>0?top:null;
  }

  // ── Smart exercise ranking (recommended-first, filters hidden by default) ──
  // Pure scoring: higher score = more recommended. Weights are tuning knobs.
  // ctx: {experience:'beginner'|'intermediate'|'advanced'|null,
  //       userEq:[equipment ids]|null (null = no equipment filter),
  //       injuries:{joint:'red'|'yellow'}, favorites:{name:count},
  //       chosenPatterns:[pattern ids]}
  var RANK_WEIGHTS={favorite:3.0,diff:2.0,joint:4.0,pattern:1.5};
  var LEVEL_RANK={beginner:0,intermediate:1,advanced:2};
  function rankExercises(list,ctx){
    ctx=ctx||{};
    var userEq=ctx.userEq;
    var out=[];
    list.forEach(function(name){
      var score=100;
      var eq=equipmentOf(name);
      var eqOk=!userEq||userEq.length===0||eq.length===0||eq.some(function(e){return userEq.indexOf(e)>=0;});
      var fav=(ctx.favorites&&ctx.favorites[name])||0;
      score+=RANK_WEIGHTS.favorite*Math.min(fav,5)/5;
      if(ctx.experience){
        var dlv=difficultyOf(name);
        var delta=Math.abs((LEVEL_RANK[ctx.experience]||1)-(LEVEL_RANK[dlv]||1));
        score+=RANK_WEIGHTS.diff*(delta===0?1:(delta===1?-0.3:-1.5));
      }
      var js=jointStressOf(name);
      (js.joints||[]).forEach(function(j){
        var sev=ctx.injuries&&ctx.injuries[j];
        if(sev==='yellow')score-=RANK_WEIGHTS.joint*0.6;
        else if(sev==='red')score-=RANK_WEIGHTS.joint*1.5;
      });
      var p=movementPatternOf(name);
      if(ctx.chosenPatterns&&ctx.chosenPatterns.indexOf(p)>=0&&p!=='other')score-=RANK_WEIGHTS.pattern;
      out.push({name:name,score:score,equipOk:eqOk,pattern:p});
    });
    out=out.filter(function(r){return r.equipOk;});
    out.sort(function(a,b){if(b.score!==a.score)return b.score-a.score;return a.name<b.name?-1:a.name>b.name?1:0;});
    return out;
  }
  window.rankExercises=rankExercises;
  window.__exEngine={difficultyOf:difficultyOf,equipmentOf:equipmentOf,movementPatternOf:movementPatternOf,secondaryOf:secondaryOf,meta:meta,prefTop:prefTop,ls:ls,ss:ss,K:K,showExSelection:showExSelection,getSplitKey:function(){return splitKey;},getExFilters:function(){return exFilters;},refreshExSelection:refreshExSelection};
  var exFilters={diff:[],type:[],pattern:[]};
  function exFilterMatches(name){
    if(exFilters.diff.length&&exFilters.diff.indexOf(difficultyOf(name))<0)return false;
    if(exFilters.type.length&&exFilters.type.indexOf(meta(name).t)<0)return false;
    if(exFilters.pattern.length&&exFilters.pattern.indexOf(movementPatternOf(name))<0)return false;
    return true;
  }
  function exFiltersActive(){
    if(exFilters.diff.length||exFilters.type.length||exFilters.pattern.length)return true;
    var eq=ls(K.VI,{}).eq;
    return !!(eq&&eq.length);
  }
  function buildRankCtx(day,slot){
    var vi=ls(K.VI,{});
    var exp={novice:'beginner',intermediate:'intermediate',advanced:'advanced'}[vi.ta]||null;
    var saved=ls('mos_ex_choices',{});
    var chosenPatterns=[];
    (day.ex||[]).forEach(function(sl){
      if(slot&&sl.n===slot.n)return;
      var sel=saved[sl.n]||pendingExChoices[sl.n]||prefTop(sl.n)||sl.n;
      chosenPatterns.push(movementPatternOf(sel));
    });
    return{experience:exp,userEq:vi.eq||null,injuries:getInjuredJoints(painFlags()),chosenPatterns:chosenPatterns};
  }
  var MUSCLE_NAME={};MUSCLES.forEach(function(m){MUSCLE_NAME[m.id]=m.name;});

  function rowBadgesHtml(en){
    var m=meta(en);
    var parts=[];
    parts.push('<span class="badge-pill bp-diff">'+_('diff_'+difficultyOf(en))+'</span>');
    parts.push('<span class="badge-pill bp-type">'+_(m.t==='compound'?'mp_compound':'mp_isolation')+'</span>');
    parts.push('<span class="badge-pill bp-pattern">'+_('mp_'+movementPatternOf(en))+'</span>');
    var js=jointStressOf(en);
    if(js.level==='high'||js.level==='moderate')parts.push('<span class="badge-pill bp-joint">'+(js.level==='high'?_('js_high'):_('js_moderate'))+'</span>');
    var sec=secondaryOf(en);
    if(sec&&sec.length)parts.push('<span class="badge-pill bp-also">'+_('also_works')+' '+MUSCLE_NAME[sec[0][0]]+'</span>');
    return '<span class="esr-badges">'+parts.join('')+'</span>';
  }
  function slotChipsHtml(en,muscle,day){
    var pf=painFlags();
    var pool=EXERCISE_POOLS[muscle]||[];
    var list=pool.filter(exFilterMatches);
    var saved=ls('mos_ex_choices',{});
    var top=prefTop(en);
    var chosen=saved[en]||pendingExChoices[en]||top||en;
    // When a filter is active, the default/chosen exercise must match it too —
    // otherwise the hard filter is meaningless. With no filters, keep the
    // current selection visible even if it is not in the pool (custom ex).
    var filterActive=exFiltersActive();
    if(!filterActive){
      if(list.indexOf(en)<0)list.unshift(en);
      if(list.indexOf(chosen)<0)list.unshift(chosen);
    }
    var ranked=rankExercises(list,buildRankCtx(day,{n:en}));
    if(!ranked.length){
      return '<div class="ex-regions"><div class="ex-region"><span class="ex-region-lbl" style="color:var(--text-dim)">'+_('ex_no_match')+'</span></div></div>';
    }
    var chosenRanked=ranked.filter(function(r){return r.name===chosen;});
    var rest=ranked.filter(function(r){return r.name!==chosen;});
    ranked=chosenRanked.concat(rest);
    var recIdx={};ranked.forEach(function(r,i){recIdx[r.name]=i;});
    var buckets={},regOrder=[];
    ranked.forEach(function(r){
      var rk=regionOf(muscle,r.name);
      if(!buckets[rk]){buckets[rk]=[];regOrder.push(rk);}
      buckets[rk].push(r.name);
    });
    var html='<div class="ex-regions">';
    regOrder.forEach(function(rk){
      html+='<div class="ex-region"><span class="ex-region-lbl">'+_(rk)+'</span>';
      buckets[rk].forEach(function(name){
        var s=isExerciseSafeForInjuries(name,pf);
        var isTop=name===top&&top;
        var ri=recIdx[name];
        var chipCls='ex-sel-chip'+(chosen===name?' selected':'')+((!s.ok||(pf&&pf[name]==='red'))?' rehab-ex-blocked':'')+(s.reason&&s.reason.indexOf('🟡')>=0?' rehab-ex-safe':'')+(isTop?' pref-top':'')+(ri>=0&&ri<3?' chip-rec':'');
        var eq=equipTag(name);
        html+='<button class="'+chipCls+'" data-ename="'+en+'" data-exval="'+name+'" title="'+name+'">'
          +(isTop?'<span class="pref-star">★ </span>':'')
          +(ri===0?'<span class="rec-badge">✦ '+_('rec_badge')+'</span>':(ri===1||ri===2?'<span class="rec-badge">✦</span>':''))
          +name+(eq?'<span class="equip-tag">'+eq+'</span>':'')+'</button>';
      });
      html+='</div>';
    });
    html+='</div>';
    return html;
  }
  function bindChipClick(chip){
    chip.addEventListener('click',function(){
      var en=this.dataset.ename,val=this.dataset.exval;
      var pref=ls('mos_pref',{});
      if(!pref[en])pref[en]={};
      pref[en][val]=(pref[en][val]||0)+1;
      ss('mos_pref',pref);
      pendingExChoices[en]=val;
      var row=this.closest('.ex-sel-row');
      var day=SPLITS[splitKey]&&SPLITS[splitKey].days[parseInt(row.dataset.day,10)]||null;
      var regions=row.querySelector('.ex-regions');
      if(regions)regions.outerHTML=slotChipsHtml(en,row.dataset.muscle,day);
      row.querySelectorAll('.ex-sel-chip').forEach(bindChipClick);
      var g=row.querySelector('.ex-guide');
      if(g&&g.style.display!=='none')g.innerHTML=guideHtml(val);
      renderLiveVol(row.dataset.muscle);
      renderDayEstimate(parseInt(row.dataset.day,10));
    });
  }

  function showExSelection(k){
    var split=SPLITS[k];if(!split)return;
    var pf=painFlags();
    document.getElementById('splitGrid').style.display='none';
    document.getElementById('splitBtnGroup').style.display='none';
    var panel=document.getElementById('exSelPanel');
    panel.classList.add('show');
    var html='';
    // Rehab warning banner
    var rehabInfo=rehabSummary(pf);
    if(rehabInfo)html+='<div class="rehab-card rehab-'+(rehabInfo.hasRed?'red':'yellow')+'" style="margin-bottom:8px;font-size:.6rem">'+
      '<div class="rc-header">⚠ '+_('rehab_inj_safe')+'</div>'+
      '<div style="color:rgba(250,250,248,.5);line-height:1.2">'+rehabInfo.areas.map(function(a){return a.icon+' '+a.name+' ('+a.severity+')'}).join(', ')+
      '. '+_('rehab_ex_green')+' <span class="rel-safe">green</span> '+_('rehab_ex_risk')+
      ' <a href="https://wa.me/201040796017" target="_blank" style="color:#F4C93B">'+_('rehab_book_short')+'</a></div></div>';
    split.days.forEach(function(day,di){
      if(day.restDay){html+='<div class="ex-sel-day" style="opacity:.45"><div class="esd-title">'+_('day_prefix')+' '+(di+1)+': '+day.n+' — '+_('rest_day')+'</div></div>';return;}
      html+='<div class="ex-sel-day"><div class="esd-title">'+_('day_prefix')+' '+(di+1)+': '+day.n+'</div><div class="esd-est"><span id="estChip_'+di+'" class="est-chip"></span></div><div id="estWarn_'+di+'" class="est-warn" style="display:none"></div>';
      // Group slots by muscle group (preserve first-seen order)
      var musGroups=[],musIdx={};
      day.ex.forEach(function(ex){
        if(musIdx[ex.p]===undefined){musIdx[ex.p]=musGroups.length;musGroups.push({p:ex.p,slots:[]});}
        musGroups[musIdx[ex.p]].slots.push(ex);
      });
      musGroups.forEach(function(g){
        html+='<div class="ex-sel-muscle"><span class="esm-name">'+(MUSCLE_NAME[g.p]||g.p)+(g.slots.length>1?'<span class="esm-count">· '+g.slots.length+'</span>':'')+'</span>'+muscleHighlightHtml(g.p)+'</div>';
        g.slots.forEach(function(ex){
          var pf0=pf;
          var safety=isExerciseSafeForInjuries(ex.n,pf0);
          var exClass=pf0&&pf0[ex.n]==='red'?'rehab-ex-blocked':(!safety.ok?'rehab-ex-blocked':(safety.reason&&safety.reason.indexOf('🟡')>=0?'rehab-ex-safe':''));
          html+='<div class="ex-sel-row '+exClass+'" data-muscle="'+ex.p+'" data-day="'+di+'">'+
            '<span class="esr-lbl">'+exLinkHtml(ex.n)+'</span>'+
            rowBadgesHtml(ex.n)+
            '<button class="ex-guide-toggle" type="button" data-slot="'+ex.n+'" title="'+_('how_to')+'">'+_('how_to')+' ▾</button>'+
            slotChipsHtml(ex.n,ex.p,day);
          if(!safety.ok)html+='<span style="font-size:.45rem;color:#f44336;margin-left:4px">⛔ '+safety.reason+'</span>';
          else if(safety.reason)html+='<span style="font-size:.45rem;color:#FF9800;margin-left:4px">'+safety.reason+'</span>';
          html+='<div class="ex-guide" data-slot="'+ex.n+'"></div>';
          html+='</div>';
        });
        html+='<div class="vol-live" data-muscle="'+g.p+'"></div>';
      });
      html+='</div>';
    });
    document.getElementById('exSelContent').innerHTML=html;
    syncExFilterChips();
    document.querySelectorAll('#exSelContent .vol-live').forEach(function(el){renderLiveVol(el.dataset.muscle);});
    renderDayEstimates();

    // Wire chip clicks (re-rank in place via shared binder)
    document.querySelectorAll('#exSelContent .ex-sel-chip').forEach(bindChipClick);
    // Wire how-to toggles (expand / collapse per slot)
    document.querySelectorAll('#exSelContent .ex-guide-toggle').forEach(function(btn){
      btn.addEventListener('click',function(){
        var row=this.closest('.ex-sel-row');
        var g=row.querySelector('.ex-guide');
        if(!g)return;
        var open=g.style.display==='block';
        if(!open){
          var sel=row.querySelector('.ex-sel-chip.selected');
          var name=sel?sel.dataset.exval:this.dataset.slot;
          g.innerHTML=guideHtml(name);
        }
        g.style.display=open?'none':'block';
        this.textContent=(open?'':'▴ ')+_('how_to')+(open?' ▾':'');
      });
    });
  }

  function confirmExSelection(){
    var choices={};
    document.querySelectorAll('#exSelContent .ex-sel-row').forEach(function(row){
      var selected=row.querySelector('.ex-sel-chip.selected');
      var chip=row.querySelector('.ex-sel-chip');
      if(!chip)return;
      var en=chip.dataset.ename;
      if(selected)choices[en]=selected.dataset.exval;
    });
    ss('mos_ex_choices',choices);
    pendingExChoices={};
    document.getElementById('exSelPanel').classList.remove('show');
    showVolReview();
  }

  document.getElementById('confirmExBtn').addEventListener('click',confirmExSelection);

  document.getElementById('lockInBtn').addEventListener('click',function(){
    document.getElementById('volReviewPanel').classList.remove('show');
    document.getElementById('splitBtnGroup').style.display='flex';
    document.getElementById('splitGrid').style.display='grid';
    generateProgram(splitKey);
  });

  document.getElementById('backToExBtn2').addEventListener('click',function(){
    document.getElementById('volReviewPanel').classList.remove('show');
    var panel=document.getElementById('exSelPanel');
    panel.classList.add('show');
    refreshExSelection();
  });

  // Exercise filter bar (hidden by default; equipment profile persists in volume inputs)
  function refreshExSelection(){if(splitKey)showExSelection(splitKey);}
  function syncExFilterChips(){
    var vi=ls(K.VI,{});
    var eq=vi.eq||null;
    document.querySelectorAll('#exFilterBar .f-chip[data-f="eq"]').forEach(function(c){
      var v=c.dataset.v;
      c.classList.toggle('on',v==='all'?!eq:!!(eq&&eq.indexOf(v)>=0));
    });
    document.querySelectorAll('#exFilterBar .f-chip:not([data-f="eq"])').forEach(function(c){
      var f=c.dataset.f,v=c.dataset.v,arr=exFilters[f]||[];
      c.classList.toggle('on',v==='all'?arr.length===0:arr.indexOf(v)>=0);
    });
  }
  document.getElementById('adjustExBtn').addEventListener('click',function(){
    var bar=document.getElementById('exFilterBar');
    var open=bar.style.display!=='none';
    bar.style.display=open?'none':'block';
    this.textContent=_('adjust')+(open?' ▾':' ▴');
  });
  document.querySelectorAll('#exFilterBar .f-chip').forEach(function(chip){
    chip.addEventListener('click',function(){
      var f=this.dataset.f,v=this.dataset.v;
      if(f==='eq'){
        var vi=ls(K.VI,{});
        if(v==='all'){vi.eq=null;}
        else{
          var eq=vi.eq&&vi.eq.length?vi.eq.slice():[];
          if(eq.indexOf(v)>=0)eq.splice(eq.indexOf(v),1);
          else eq.push(v);
          vi.eq=eq.length?eq:null;
        }
        ss(K.VI,vi);
      }else{
        var arr=exFilters[f]=exFilters[f]||[];
        if(v==='all')exFilters[f]=[];
        else{
          if(arr.indexOf(v)>=0)arr.splice(arr.indexOf(v),1);
          else arr.push(v);
        }
      }
      syncExFilterChips();
      refreshExSelection();
    });
  });

