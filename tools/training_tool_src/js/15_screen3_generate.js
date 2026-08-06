  // ═══════════════════════════════════════
  //  SCREEN 3: PROGRAM GENERATE
  // ═══════════════════════════════════════

  function generateProgram(k){
    var spPrev=ls(K.SP,null);
    if(spPrev&&spPrev.key!==k&&ls(K.PG,null)&&!confirm(_('regen_confirm')))return;
    var split=SPLITS[k],targets=ls(K.VT,{}),vi=ls(K.VI,{}),goal=vi.goal||'hypertrophy',MAX=goal==='strength'?6:5;
    // Apply exercise choices
    var exChoices=ls('mos_ex_choices',{});
    // Init week counter for powerlifting periodization
    if(!ls('mos_week_count',null))ss('mos_week_count',1);
    // Implied volume from split defaults
    var implied={};MUSCLES.forEach(function(m){implied[m.id]=0});
    split.days.forEach(function(day){if(day.restDay)return;day.ex.forEach(function(ex){if(implied[ex.p]!==undefined)implied[ex.p]+=ex.s;ex.se.forEach(function(sec){if(implied[sec]!==undefined)implied[sec]+=ex.s*0.5;});});});
    var scales={};MUSCLES.forEach(function(m){var t=targets[m.id]?targets[m.id].rec:implied[m.id];scales[m.id]=t/(implied[m.id]||1);});

    var progDays=split.days.map(function(day){
      if(day.restDay)return{n:day.n,restDay:true,ex:[]};
      var volAlloc=ls(K.VA,{});
      var exs=day.ex.map(function(ex){
        var chosenName=exChoices[ex.n]||prefTop(ex.n)||ex.n;
        var ws=scales[ex.p]||1,ts=1;ex.se.forEach(function(sec){ws+=(scales[sec]||1)*0.5;ts+=0.5;});
        var scale=ws/ts,ns=Math.max(1,Math.min(MAX,Math.round(ex.s*scale)));
        var va=volAlloc[ex.p]&&volAlloc[ex.p].alloc||null;
        if(va&&va[chosenName]!==undefined){
          var tot=0;
          split.days.forEach(function(d){if(d.restDay)return;d.ex.forEach(function(e){if(e.p===ex.p&&(exChoices[e.n]||prefTop(e.n)||e.n)===chosenName)tot+=e.s;});});
          ns=Math.max(1,Math.min(MAX,Math.round(va[chosenName]*(ex.s/(tot||1)))));
        }
        var rl=goal==='strength'?4:goal==='hypertrophy'?8:6,rh=goal==='strength'?6:goal==='hypertrophy'?12:10;
        return{n:chosenName,sets:ns,rl:rl,rh:rh,p:ex.p,se:ex.se||[],orig:ex.n};
      });
      return{n:day.n,ex:exs};
    });
    // P3: auto prehab insertion for pain-flagged joints
    var PREHAB_MAP={shoulder:'Band Pull-Apart',elbow:'Wrist Curl',knee:'Terminal Knee Extension',hip:'Bird Dog',spine:'Dead Bug'};
    var injJoints=getInjuredJoints(painFlags());
    Object.keys(PREHAB_MAP).forEach(function(j){
      if(injJoints[j]!=='yellow'&&injJoints[j]!=='red')return;
      progDays.forEach(function(day){
        if(day.restDay)return;
        var uses=false;day.ex.forEach(function(ex){if(jointsForExercise(ex.n).indexOf(j)>=0)uses=true;});
        if(!uses)return;
        var has=day.ex.some(function(e){return e.prehab&&e.prehabJoint===j;});
        if(has)return;
        day.ex.unshift({n:PREHAB_MAP[j],sets:2,rl:12,rh:20,p:'prehab',se:[],orig:null,prehab:true,prehabJoint:j,targetRpe:4});
      });
    });
    // P6: time-based program variants
    var sessLen=parseInt(ls('mos_sess_len',60),10)||60;
    if(sessLen===45){
      progDays.forEach(function(day){
        if(day.restDay)return;
        if(day.ex.length>4)day.ex=day.ex.slice(0,4);
        day.ssSuggested=true;
      });
    }else if(sessLen>=90){
      progDays.forEach(function(day){
        if(day.restDay)return;
        var names={};day.ex.forEach(function(e){names[e.n]=1;});
        for(var i=0;i<day.ex.length;i++){
          var pool=poolOf(day.ex[i]);if(!pool)continue;
          var cand=EXERCISE_POOLS[pool].filter(function(n){return !names[n]&&isExerciseSafeForInjuries(n,painFlags());})[0];
          if(!cand)continue;
          day.ex.push({n:cand,sets:Math.max(2,day.ex[i].sets-1),rl:day.ex[i].rl,rh:day.ex[i].rh,p:day.ex[i].p,se:day.ex[i].se||[],orig:null,optional:true});
          break;
        }
      });
    }
    var te=progDays.reduce(function(s,d){return s+d.ex.length},0),ts=progDays.reduce(function(s,d){return s+d.ex.reduce(function(a,e){return a+e.sets},0)},0);
    var prog={date:new Date().toISOString().split('T')[0],splitName:split.name,days:progDays,totalSets:ts,totalEx:te,sessLen:sessLen};
    ss(K.SP,{key:k,name:split.name,d:split.d});
    ss(K.PG,prog);

    document.getElementById('progSets').textContent=ts;
    document.getElementById('progExs').textContent=te;
    document.getElementById('progDays').textContent=progDays.length;
    document.getElementById('progRecap').innerHTML='<div class="rb-title">'+_('generate')+'</div><strong>'+split.name+'</strong> · '+ts+' '+_('weekly_sets')+' · '+te+' '+_('exercises')+' · '+sessLen+' min';

    var html='';
    progDays.forEach(function(day,di){
      if(day.restDay){html+='<div class="rest-card" style="margin:4px 0 10px"><div class="rc-title">'+_('rest_day')+'</div><div class="rc-tip">'+_('rest_day_recover')+'</div></div>';return;}
      html+='<div class="ex-card" style="border-left-color:rgba(244,201,59,.2)"><div class="ex-name" style="margin-bottom:4px">'+_('day')+' '+(di+1)+': '+day.n+'</div>';
      if(day.ssSuggested)html+='<div style="font-size:.5rem;color:#F4C93B;margin-bottom:4px">⚡ '+_('sess_suggest_ss')+'</div>';
      day.ex.forEach(function(ex){
        var rest=ex.rl<=6?_('gen_rest_2_3'):ex.rl<=10?_('gen_rest_90_120'):_('gen_rest_60_90');
        html+='<div style="display:flex;gap:8px;padding:3px 0;font-size:.62rem;border-bottom:1px solid rgba(250,250,248,.02)"><span style="flex:2;color:#FAFAF8;font-weight:500">'+exLinkHtml(ex.n)+(ex.optional?' <span class="opt-badge">'+_('sess_optional')+'</span>':'')+'</span><span style="flex:1;text-align:center;color:rgba(250,250,248,.4)">'+ex.sets+'×'+ex.rl+'-'+ex.rh+'</span><span style="flex:1;text-align:center;color:rgba(250,250,248,.3);font-size:.55rem">'+rest+'</span></div>';
      });
      html+='</div>';
    });
    document.getElementById('progOutput').innerHTML=html;
    go(3);
  }

  document.getElementById('backToSplitBtn').addEventListener('click',function(){go(2);});
  document.getElementById('saveProgBtn').addEventListener('click',function(){go(35);renderMesoConfig();});

