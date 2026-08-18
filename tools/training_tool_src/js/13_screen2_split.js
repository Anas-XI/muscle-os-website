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
 var sets=Object.keys(r.alloc).map(function(n){return n+''+r.alloc[n];}).join(' · ');
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
 html+='<div class="vr-est-row'+(mins2>win2?' vr-est-over':'')+'">'+_('day')+' '+(di2+1)+': '+day2.n+' — '+_('est_label').replace('{M}',mins2)+(mins2>win2?' ':'')+'</div>';
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
 document.getElementById('prioContBtn').disabled=false;
 document.getElementById('prioNeed').style.display='none';
 }
 document.getElementById('prioBackBtn').addEventListener('click',function(){document.getElementById('prioPanel').classList.remove('show');});
 document.getElementById('prioContBtn').addEventListener('click',function(){
 var pr=getPriority();
 evLog('onboard_done',{muscles:pr.muscles.length});
 var targets=ls(K.VT,{}),changed=false;
 pr.muscles.forEach(function(pm){
 var t=targets[pm.m];
 if(t&&t.rec<t.mrv){t.rec=Math.min(t.mrv,t.rec+1);targets[pm.m]=t;changed=true;}
 });
 if(changed)ss(K.VT,targets);
 document.getElementById('prioPanel').classList.remove('show');
 proceedToSplit();
 });

 window.__pmEngine={getPriority:getPriority,savePriority:savePriority,effortStyleOf:effortStyleOf,lastSessionSets:lastSessionSets,estimateRecoveryCost:estimateRecoveryCost,seededFreq:seededFreq,blendRecovery:blendRecovery,softGateActive:softGateActive,scheduledPriorityMuscles:scheduledPriorityMuscles,renderSorenessCards:renderSorenessCards,cycleLengthOf:cycleLengthOf,muscleFrequencyInSplit:muscleFrequencyInSplit,freq7Of:freq7Of,prioritySatisfaction:prioritySatisfaction,recommendSplit:recommendSplit,renderSplitConflict:renderSplitConflict,SBD_FAMILY:SBD_FAMILY,prHistoryOf:prHistoryOf,hasPrInLastDays:hasPrInLastDays,distributeVolume:distributeVolume,computeSelection:computeSelection,computeAllocation:computeAllocation,renderLiveVol:renderLiveVol,showVolReview:showVolReview,renderVolReview:renderVolReview,renderPrioPanel:renderPrioPanel,weekStartISO:weekStartISO,ls:ls,ss:ss,K:K,MUSCLES:MUSCLES,MUSCLE_NAME:MUSCLE_NAME,SPLITS:SPLITS,determineSplit:determineSplit};

 // ═══════════════════════════════════════
 // SESSION TIME ESTIMATOR (layer 3 · 2a)
 // Live per-day estimate at exercise selection, compared vs mos_sess_len.
 // Model: Σ (sets (exec + rest)) + fixed overhead. Rest mirrors the
 // app's rest-timer defaults (compound 240s / isolation 150s).
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
 c.textContent=(r.over?' ':'')+r.chip;
 c.classList.toggle('est-over',r.over);
 if(w){w.style.display=r.warn?'block':'none';w.textContent=r.warn;}
 }
 function renderDayEstimates(){
 var split=SPLITS[splitKey];
 if(!split)return;
 split.days.forEach(function(day,di){if(!day.restDay)renderDayEstimate(di);});
 }

 // ═══════════════════════════════════════
 // COACH ROUTING HOOK (layer 3 · 3c)
 // Generic suggestion router: coached users (K.VI.coached) route through
 // a coach review queue (K.CQ) + notifyCoach ping; self-serve surfaces
 // suggestions directly (status 'direct') for the feature to render.
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
