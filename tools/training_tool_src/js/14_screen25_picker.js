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

 // ═══════════════════════════════════════
 // SCREEN 2: VOLUME + SPLIT
 // ═══════════════════════════════════════

 function renderVolumeSplit(targets,total,ta,g,dd){
 document.getElementById('dowDisplay').textContent=dd+' '+_('vol_days_wk');
 document.getElementById('volSummary').innerHTML='<div class="rb-title">'+_('vol_targets')+'</div><strong>'+total+' '+_('weekly_sets')+'</strong> · '+ta+' · '+g+' · '+dd+' '+_('vol_days_wk');
 var html='';
 MUSCLES.forEach(function(m){
 var t=targets[m.id]||{mev:4,mav:8,mrv:12,rec:6};var mx=Math.max(t.mrv,1);
 html+='<div class="vol-row"><span class="vol-label">'+m.name+'</span><div class="vol-bar-wrap"><div class="vol-bar-mev" style="width:'+(t.mev/mx*100)+'%"></div><div class="vol-bar-mav" style="left:'+(t.mev/mx*100)+'%;width:'+((t.mav-t.mev)/mx*100)+'%"></div><div class="vol-bar-mrv" style="left:'+(t.mrv/mx*100)+'%"></div></div><div class="vol-num"><span class="vol-rec">'+t.rec+'</span><span style="font-size:.45rem;color:rgba(250,250,248,.12)">'+t.mev+'-'+t.mav+'</span><div class="vol-adjust"><button class="vol-minus" data-muscle="'+m.id+'">–</button><button class="vol-plus" data-muscle="'+m.id+'">+</button></div></div></div>';
 });
 document.getElementById('volBars').innerHTML=html;

 // Split grid — recommended split highlighted (badge + why), never pre-selected
 var grid=document.getElementById('splitGrid');grid.innerHTML='';var first=null;
 var rec=recommendSplit();
 document.getElementById('splitWhy').innerHTML=rec.why?'<div class="rec-why"><span class="rec-badge">✦ '+_('split_rec_badge')+'</span> '+rec.why+'</div>':'';
 Object.keys(SPLITS).forEach(function(k){
 var s=SPLITS[k];if(s.d!==dd)return;
 if(g!=='strength'&&s.g==='strength')return;
 var card=document.createElement('div');card.className='split-card'+(rec.key===k?' rec-card':'');card.dataset.key=k;
 var plTag=s.g==='strength'?' <span style="background:rgba(33,150,243,.1);color:#2196F3;font-size:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:1px 4px;border-radius:3px;margin-left:4px">PL</span>':'';
 var sRest=(s.days||[]).filter(function(x){return x.restDay;}).length;
 var sTrain=(s.days||[]).filter(function(x){return !x.restDay;}).length;
 card.innerHTML='<div class="s-name">'+s.name+plTag+(rec.key===k?'<span class="rec-badge">✦ '+_('split_rec_badge')+'</span>':'')+(sRest?'<span class="rest-badge">'+sRest+' '+_('rest_day')+'</span>':'')+'</div><div class="s-detail">'+sTrain+' '+_('sessions')+'</div>';
 card.addEventListener('click',function(){
 grid.querySelectorAll('.split-card').forEach(function(c){c.classList.remove('selected')});
 this.classList.add('selected');splitKey=k;
 renderSplitConflict(k);
 });
 grid.appendChild(card);if(!first)first=k;
 });
 // Custom split builder card — always available as a third option
 var bcard=document.createElement('div');
 bcard.className='split-card build-card';bcard.dataset.key='__builder__';
 bcard.innerHTML='<div class="s-name" style="color:var(--accent)">✚ '+_('cs_build')+'</div><div class="s-detail">'+_('cs_build_sub')+'</div>';
 bcard.addEventListener('click',function(){openCustomBuilder();});
 grid.appendChild(bcard);
 if(!first)return;
 if(splitKey){
 grid.querySelectorAll('.split-card').forEach(function(c){
 if(c.dataset.key===splitKey){c.classList.add('selected');renderSplitConflict(splitKey);}
 });
 }
 }

 document.getElementById('volBars').addEventListener('click',function(e){
 var btn=e.target.closest('.vol-adjust button');if(!btn)return;
 var id=btn.dataset.muscle,dir=btn.classList.contains('vol-plus')?1:-1,
 targets=ls(K.VT,{}),vi=ls(K.VI,{}),ta=vi.ta||'intermediate',g=vi.goal||'hypertrophy',
 t=targets[id];
 if(!t)return;
 t.rec=Math.max(0,Math.min(t.mrv,t.rec+dir));
 targets[id]=t;ss(K.VT,targets);
 var total=0;MUSCLES.forEach(function(m){var x=targets[m.id];if(x)total+=x.rec;});
 renderVolumeSplit(targets,total,ta,g,vi.days||4);
 });

 document.getElementById('backToSetupBtn').addEventListener('click',function(){go(1);});

 document.getElementById('genProgBtn').addEventListener('click',function(){
 var sel=document.querySelector('.split-card.selected');
 if(!sel){document.getElementById('splitErr').style.display='block';return;}
 document.getElementById('splitErr').style.display='none';
 var k=sel.dataset.key;splitKey=k;
 showExSelection(k);
 });

 document.getElementById('backToSplitBtn2').addEventListener('click',function(){
 document.getElementById('exSelPanel').classList.remove('show');
 document.getElementById('splitBtnGroup').style.display='flex';
 document.getElementById('splitGrid').style.display='grid';
 });

 // P6: session length chips
 document.getElementById('sessLenGrid').addEventListener('click',function(ev){
 var btn=ev.target.closest('.sess-len-chip');
 if(!btn)return;
 var len=parseInt(btn.dataset.len,10);
 ss('mos_sess_len',len);
 document.querySelectorAll('#sessLenGrid .sess-len-chip').forEach(function(c){c.classList.remove('selected');});
 btn.classList.add('selected');
 });
 (function(){
 var stored=parseInt(ls('mos_sess_len',60),10)||60;
 document.querySelectorAll('#sessLenGrid .sess-len-chip').forEach(function(c){
 c.classList.toggle('selected',parseInt(c.dataset.len,10)===stored);
 });
 })();
 (function(){
 if(location.search.indexOf('coached=1')>=0)SuggestionRouter.setCoached(true);
 })();

 // ═══════════════════════════════════════
 // CUSTOM SPLIT BUILDER (Screen 2)
 // ═══════════════════════════════════════
 function csEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
 function newCustomSplit(){
 return{id:CUSTOM_SPLIT_KEY,name:_('cs_default_name'),d:3,days:[
 {n:_('day_prefix')+' 1',restDay:false,muscleGroups:['chest','shoulders','triceps']},
 {n:_('day_prefix')+' 2',restDay:false,muscleGroups:['back','biceps']},
 {n:_('day_prefix')+' 3',restDay:false,muscleGroups:['quads','hamstrings','glutes','calves']}
 ]};
 }
 var customSplit=ls(K.CS,null);
 if(!customSplit||!customSplit.days||!customSplit.days.length)customSplit=newCustomSplit();
 customSplit.id=CUSTOM_SPLIT_KEY;
 window.__getCustomSplit=function(){return customSplit;};

 function materializeCustomSplit(cs){
 return{name:cs.name||_('cs_default_name'),d:cs.days.length,days:cs.days.map(function(day,di){
 if(day.restDay)return{n:day.n||_('rest_day'),restDay:true};
 var ex=(day.muscleGroups||[]).map(function(mg){
 return{n:SLOT_DEFAULTS[mg]||((EXERCISE_POOLS[mg]||[])[0]||mg),s:DEFAULT_SLOT_SETS,p:mg,se:[]};
 });
 return{n:day.n||(_('day_prefix')+' '+(di+1)),ex:ex};
 })};
 }
 function registerCustomSplit(cs){SPLITS[CUSTOM_SPLIT_KEY]=materializeCustomSplit(cs);return SPLITS[CUSTOM_SPLIT_KEY];}
 (function(){if(customSplit&&customSplit.days.length)registerCustomSplit(customSplit);})();

 function openCustomBuilder(){
 document.getElementById('splitGrid').style.display='none';
 document.getElementById('splitBtnGroup').style.display='none';
 var panel=document.getElementById('customSplitPanel');
 var nameEl=document.getElementById('csName');
 nameEl.value=customSplit.name;
 nameEl.setAttribute('placeholder',_('cs_name_ph'));
 panel.classList.add('show');
 renderCustomBuilder();
 }
 function customSplitWarnings(){
 var out={coverage:[],empty:[],conflict:[],over:[],many:null},trained={};
 customSplit.days.forEach(function(day,di){
 if(day.restDay)return;
 var mg=day.muscleGroups||[];
 if(!mg.length){out.empty.push(di+1);return;}
 mg.forEach(function(m){
 trained[m]=(trained[m]||0)+1;
 var f7=trained[m]/customSplit.days.length*7;
 if(f7>5)out.over.push({m:m,f:Math.round(f7*10)/10});
 });
 });
 MUSCLES.forEach(function(m){if(!trained[m.id])out.coverage.push(m.id);});
 var pr=getPriority();
 if(pr.muscles&&pr.muscles.length){
 var sat=prioritySatisfaction(materializeCustomSplit(customSplit),pr);
 sat.list.forEach(function(x){if(!x.ok)out.conflict.push(x);});
 }
 if(customSplit.days.length>10)out.many=customSplit.days.length;
 return out;
 }
 function renderCustomBuilder(){
 var wrap=document.getElementById('csDays'),html='';
 customSplit.days.forEach(function(day,di){
 var mg=day.muscleGroups||[];
 html+='<div class="cs-day'+(day.restDay?' cs-rest':'')+'">';
 html+='<div class="cs-day-head"><span class="cs-day-num">'+(day.restDay?_('rest_day'):_('day_prefix')+' '+(di+1))+'</span>';
 html+='<input class="cs-day-lbl" type="text" maxlength="24" value="'+csEsc(day.n||'')+'" data-di="'+di+'">';
 html+='<span class="cs-ops">';
 html+='<button class="cs-op" data-di="'+di+'" data-op="rest" title="'+_('cs_rest_toggle')+'">'+(day.restDay?'🏋':'')+'</button>';
 html+='<button class="cs-op" data-di="'+di+'" data-op="dup" title="'+_('cs_dup')+'">⧉</button>';
 html+='<button class="cs-op" data-di="'+di+'" data-op="up" title="'+_('cs_up')+'"'+(di===0?' disabled':'')+'>↑</button>';
 html+='<button class="cs-op" data-di="'+di+'" data-op="down" title="'+_('cs_down')+'"'+(di===customSplit.days.length-1?' disabled':'')+'>↓</button>';
 html+='<button class="cs-op cs-del" data-di="'+di+'" data-op="del" title="'+_('cs_delete')+'">✕</button>';
 html+='</span></div><div class="cs-muscle-grid">';
 MUSCLES.forEach(function(m){
 var on=mg.indexOf(m.id)>=0;
 html+='<button class="cs-chip'+(on?' on':'')+(day.restDay?' disabled':'')+'" data-di="'+di+'" data-m="'+m.id+'">'+m.name+'</button>';
 });
 html+='</div></div>';
 });
 wrap.innerHTML=html;
 bindCustomBuilderOps(wrap);
 renderCustomWarnings();
 }
 function bindCustomBuilderOps(wrap){
 wrap.querySelectorAll('.cs-op').forEach(function(b){
 b.addEventListener('click',function(){
 var op=this.dataset.op,di=parseInt(this.dataset.di,10);
 if(op==='dup')customSplit.days.splice(di+1,0,JSON.parse(JSON.stringify(customSplit.days[di])));
 else if(op==='up'&&di>0){var t=customSplit.days[di];customSplit.days[di]=customSplit.days[di-1];customSplit.days[di-1]=t;}
 else if(op==='down'&&di<customSplit.days.length-1){var t2=customSplit.days[di];customSplit.days[di]=customSplit.days[di+1];customSplit.days[di+1]=t2;}
 else if(op==='del')customSplit.days.splice(di,1);
 else if(op==='rest'){
 var d=customSplit.days[di];d.restDay=!d.restDay;
 if(!d.muscleGroups)d.muscleGroups=[];
 if(d.restDay)d.muscleGroups=[];
 }
 renderCustomBuilder();
 });
 });
 wrap.querySelectorAll('.cs-chip').forEach(function(ch){
 ch.addEventListener('click',function(){
 if(this.classList.contains('disabled'))return;
 var di=parseInt(this.dataset.di,10),m=this.dataset.m,day=customSplit.days[di];
 var mg=day.muscleGroups=day.muscleGroups||[],i=mg.indexOf(m);
 if(i>=0)mg.splice(i,1);else mg.push(m);
 renderCustomBuilder();
 });
 });
 wrap.querySelectorAll('.cs-day-lbl').forEach(function(inp){
 inp.addEventListener('input',function(){customSplit.days[parseInt(this.dataset.di,10)].n=this.value;});
 });
 }
 function renderCustomWarnings(){
 var w=customSplitWarnings(),box=document.getElementById('csWarn'),parts=[];
 if(w.empty.length)parts.push('<div class="cs-warn"> '+_('cs_warn_empty_days').replace('{N}',w.empty.join(', '))+'</div>');
 if(w.coverage.length)parts.push('<div class="cs-warn"> '+_('cs_warn_coverage').replace('{M}',w.coverage.map(function(m){return MUSCLE_NAME[m]||m;}).join(', '))+'</div>');
 w.conflict.forEach(function(x){parts.push('<div class="cs-warn"> '+(MUSCLE_NAME[x.m]||x.m)+': '+_('split_conflict_body').replace('{F}',x.f7).replace('{N}',x.need)+'</div>');});
 w.over.forEach(function(x){parts.push('<div class="cs-warn"> '+_('cs_warn_over').replace('{M}',MUSCLE_NAME[x.m]||x.m).replace('{F}',x.f)+'</div>');});
 if(w.many)parts.push('<div class="cs-warn cs-warn-hard"> '+_('cs_warn_many').replace('{N}',w.many)+'</div>');
 box.innerHTML=parts.join('');box.style.display=parts.length?'block':'none';
 }
 function finalizeCustomSplit(){
 var w=customSplitWarnings();
 if(w.empty.length){
 if(!confirm(_('cs_confirm_empty').replace('{N}',w.empty.join(', '))))return;
 w.empty.forEach(function(di){customSplit.days[di-1].restDay=true;customSplit.days[di-1].muscleGroups=[];});
 }
 var n=customSplit.days.length;
 if(n>10&&!confirm(_('cs_confirm_many').replace('{N}',n)))return;
 if(n>14&&!confirm(_('cs_confirm_many2').replace('{N}',n)))return;
 var name=(document.getElementById('csName').value||'').trim();
 if(name)customSplit.name=name;
 customSplit.d=customSplit.days.length;
 ss(K.CS,customSplit);
 registerCustomSplit(customSplit);
 splitKey=CUSTOM_SPLIT_KEY;
 document.getElementById('customSplitPanel').classList.remove('show');
 document.getElementById('splitBtnGroup').style.display='flex';
 document.getElementById('splitGrid').style.display='grid';
 var vi=ls(K.VI,{}),targets=ls(K.VT,{}),total=0;
 MUSCLES.forEach(function(m){var x=targets[m.id];if(x)total+=x.rec;});
 renderVolumeSplit(targets,total,vi.ta||'intermediate',vi.goal||'hypertrophy',customSplit.d);
 }
 document.getElementById('csAddDay').addEventListener('click',function(){
 var n=customSplit.days.length;
 customSplit.days.push({n:_('day_prefix')+' '+(n+1),restDay:false,muscleGroups:['chest','shoulders','triceps']});
 renderCustomBuilder();
 });
 document.getElementById('csAddRest').addEventListener('click',function(){
 customSplit.days.push({n:_('rest_day'),restDay:true,muscleGroups:[]});
 renderCustomBuilder();
 });
 document.getElementById('csUseBtn').addEventListener('click',finalizeCustomSplit);
 document.getElementById('csCancelBtn').addEventListener('click',function(){
 customSplit=ls(K.CS,null);
 if(!customSplit||!customSplit.days||!customSplit.days.length)customSplit=newCustomSplit();
 document.getElementById('customSplitPanel').classList.remove('show');
 document.getElementById('splitBtnGroup').style.display='flex';
 document.getElementById('splitGrid').style.display='grid';
 });

 // ═══════════════════════════════════════
 // EXERCISE SELECTION (Screen 2.5)
 // ═══════════════════════════════════════

 var pendingExChoices={};
 function prefTop(exName){
 var prefs=ls('mos_pref',{})[exName];
 if(!prefs)return null;
 var top=null,topC=0;
 Object.keys(prefs).forEach(function(n){if(prefs[n]>topC){topC=prefs[n];top=n;}});
 return topC>0?top:null;
 }

 // ── Per-muscle-group search fast-path helpers ──
 function normalizeSearch(s){
 return(s||'').toLowerCase()
 .replace(/[\u064B-\u0652\u0640]/g,'')
 .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي');
 }
 function searchQuality(dn,q){
 dn=normalizeSearch(dn);q=normalizeSearch(q);
 if(dn.indexOf(q)===0)return 3;
 if(dn.indexOf(q)>=0)return 2;
 var i=0,k=0;while(i<dn.length&&k<q.length){if(dn[i]===q[k])k++;i++;}
 return k===q.length?1:0;
 }
 function rankScoreOf(n,ctx){try{var r=rankExercises([n],ctx);return r.length?r[0].score:0;}catch(e){return 0;}}
 function lastPerfHtml(en,hist){
 var e=hist&&hist[en];
 if(!e||!e.length)return '';
 var last=e.slice().sort(function(a,b){return a.date<b.date?1:-1;})[0];
 if(!last||!last.date)return '';
 var d=Math.max(0,Math.round((Date.now()-new Date(last.date+'T00:00:00').getTime())/864e5));
 var when=d===0?_('lp_today'):d===1?_('lp_yesterday'):_('lp_days').replace('{N}',d);
 var parts=[_('lp_last')+' '+when];
 if(last.w>0)parts.push(last.w+'kg');
 if(last.r>0)parts.push(''+last.r);
 return '<span class="ex-last">'+parts.join(' · ')+'</span>';
 }

 // ── Smart exercise ranking (recommended-first, filters hidden by default) ──
 // Pure scoring: higher score = more recommended. Weights are tuning knobs.
 // ctx: {experience:'beginner'|'intermediate'|'advanced'|null,
 // userEq:[equipment ids]|null (null = no equipment filter),
 // injuries:{joint:'red'|'yellow'}, favorites:{name:count},
 // chosenPatterns:[pattern ids]}
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
 var dlv=null,delta=1;
 if(ctx.experience){
 dlv=difficultyOf(name);
 delta=Math.abs((LEVEL_RANK[ctx.experience]||1)-(LEVEL_RANK[dlv]||1));
 score+=RANK_WEIGHTS.diff*(delta===0?1:(delta===1?-0.3:-1.5));
 }
 var js=jointStressOf(name);
 var jointFlagged=false;
 (js.joints||[]).forEach(function(j){
 var sev=ctx.injuries&&ctx.injuries[j];
 if(sev==='yellow')score-=RANK_WEIGHTS.joint*0.6;
 else if(sev==='red')score-=RANK_WEIGHTS.joint*1.5;
 if(sev==='yellow'||sev==='red')jointFlagged=true;
 });
 var p=movementPatternOf(name);
 if(ctx.chosenPatterns&&ctx.chosenPatterns.indexOf(p)>=0&&p!=='other')score-=RANK_WEIGHTS.pattern;
 var why='balanced';
 if(fav>0)why='fav';
 else if(ctx.experience&&dlv&&delta===0)why='level';
 else if(ctx.injuries&&Object.keys(ctx.injuries).length&&!jointFlagged)why='jointsafe';
 else if(userEq&&userEq.length&&eqOk&&eq.length)why='eq';
 out.push({name:name,score:score,equipOk:eqOk,pattern:p,why:why});
 });
 out=out.filter(function(r){return r.equipOk;});
 out.sort(function(a,b){if(b.score!==a.score)return b.score-a.score;return a.name<b.name?-1:a.name>b.name?1:0;});
 return out;
 }
 window.rankExercises=rankExercises;
 window.__searchHooks={normalizeSearch:normalizeSearch,searchQuality:searchQuality,rankScoreOf:rankScoreOf};
 window.__muscleName=function(id){return MUSCLE_NAME[id]||id;};
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
 if(m.metadataSource==='inferred')parts.push('<span class="badge-pill bp-inferred" title="'+_('meta_inferred_tip')+'">'+_('meta_inferred')+'</span>');
 return '<span class="esr-badges">'+parts.join('')+'</span>';
 }
 function slotChipsHtml(en,muscle,day){
 var pf=painFlags();
 var pool=EXERCISE_POOLS[muscle]||[];
