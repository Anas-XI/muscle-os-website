 });
 });
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
 var densityBtn=document.getElementById('densityBtn');
 if(densityBtn){
 var setDensityLbl=function(){
 densityBtn.textContent=ls('mos_card_density','rich')==='compact'?_('density_off'):_('density_on');
 };
 setDensityLbl();
 densityBtn.addEventListener('click',function(){
 var v=ls('mos_card_density','rich')==='compact'?'rich':'compact';
 ss('mos_card_density',v);
 document.getElementById('exSelPanel').classList.toggle('ex-compact',v==='compact');
 setDensityLbl();
 });
 }
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

 // ═══════════════════════════════════════
 // SCREEN 3: PROGRAM GENERATE
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
 document.getElementById('progRecap').innerHTML='<div class="rb-title">'+_('generate')+'</div><strong>'+esc(split.name)+'</strong> · '+ts+' '+_('weekly_sets')+' · '+te+' '+_('exercises')+' · '+sessLen+' min';
 fillCycleBanner();

 var html='';
 progDays.forEach(function(day,di){
 if(day.restDay){html+='<div class="rest-card" style="margin:4px 0 10px"><div class="rc-title">'+_('rest_day')+'</div><div class="rc-tip">'+_('rest_day_recover')+'</div></div>';return;}
 html+='<div class="ex-card" style="border-left-color:rgba(244,201,59,.2)"><div class="ex-name" style="margin-bottom:4px">'+_('day')+' '+(di+1)+': '+day.n+'</div>';
 if(day.ssSuggested)html+='<div style="font-size:.5rem;color:#F4C93B;margin-bottom:4px"> '+_('sess_suggest_ss')+'</div>';
 day.ex.forEach(function(ex){
 var rest=ex.rl<=6?_('gen_rest_2_3'):ex.rl<=10?_('gen_rest_90_120'):_('gen_rest_60_90');
 html+='<div style="display:flex;gap:8px;padding:3px 0;font-size:.62rem;border-bottom:1px solid rgba(250,250,248,.02)"><span style="flex:2;color:#FAFAF8;font-weight:500">'+exLinkHtml(ex.n)+(ex.optional?' <span class="opt-badge">'+_('sess_optional')+'</span>':'')+'</span><span style="flex:1;text-align:center;color:rgba(250,250,248,.4)">'+ex.sets+'×'+ex.rl+'-'+ex.rh+'</span><span style="flex:1;text-align:center;color:rgba(250,250,248,.3);font-size:.55rem">'+rest+'</span></div>';
 });
 html+='</div>';
 });
 document.getElementById('progOutput').innerHTML=html;
 // Persist engine profile + body comp to localStorage
 (function(){
  var ep=buildEngineProfile();
  try{localStorage.setItem('mos_eng_bw',String(ep.bodyweight_kg));localStorage.setItem('mos_eng_ht',String(ep.height_cm));}catch(e){}
  var vi=ls(K.VI,{});vi.bodyweight_kg=ep.bodyweight_kg;vi.height_cm=ep.height_cm;vi.engine_profile=ep;ss(K.VI,vi);
  // Inject Coach Intelligence card
  var recs=getEngineRecs();
  var ciEl=document.getElementById('coachIntelCard');
  if(!ciEl){ciEl=document.createElement('div');ciEl.id='coachIntelCard';ciEl.className='card engine-recs-card';ciEl.style.marginBottom='12px';}
  if(recs&&recs.applied_rules.length){
   var chips=recs.applied_rules.map(function(r){return'<span class="engine-rule-chip" title="'+esc(r.rule_id||'')+'">'+esc(r.source||r.rule_id||'')+'</span>';}).join('');
   var notes=[].concat(recs.program_notes||[],recs.nutrition_notes||[]).slice(0,6).map(function(n){return'<div style="padding:2px 0;border-bottom:1px solid rgba(250,250,248,.04)">\u2022 '+n+'</div>';}).join('');
   ciEl.innerHTML='<div class="section-header" style="cursor:pointer;user-select:none" onclick="var b=document.getElementById(\'ciBody\');b.style.display=b.style.display===\'none\'?\'block\':\'none\'">✓ Coach Intelligence <span style="font-size:.45rem;color:rgba(250,250,248,.3);float:right">tap to expand ▼</span></div>'+
    '<div id="ciBody" style="display:none;margin-top:8px">'+
    '<div style="margin-bottom:6px">'+chips+'</div>'+
    '<div style="font-size:.55rem;background:rgba(13,14,18,.4);border-radius:6px;padding:8px 10px;line-height:1.8">'+
    '<strong style="color:#F4C93B">Rep Range:</strong> '+esc(recs.rep_range)+' &nbsp;|&nbsp; <strong style="color:#F4C93B">Rest Compounds:</strong> '+esc(recs.rest_compounds)+' &nbsp;|&nbsp; <strong style="color:#F4C93B">Rest Isolation:</strong> '+esc(recs.rest_isolation)+'<br>'+
    '<strong style="color:#F4C93B">Protein:</strong> '+recs.protein_per_kg+' g/kg/day</div>'+
    (notes?'<div style="font-size:.52rem;color:rgba(250,250,248,.55);margin-top:6px;line-height:1.7">'+notes+'</div>':'')+
    '</div>';
   var progCard=document.getElementById('step3')&&document.getElementById('step3').querySelector('.card');
   if(progCard&&!progCard.contains(ciEl))progCard.insertBefore(ciEl,progCard.querySelector('#progOutput'));
  }
  // Protein banner
  var bw=ep.bodyweight_kg||75;
  var dailyP=recs?Math.round(recs.protein_per_kg*bw):Math.round(1.6*bw);
  var pbEl=document.getElementById('proteinTargetBanner');
  if(!pbEl){pbEl=document.createElement('div');pbEl.id='proteinTargetBanner';pbEl.className='engine-protein-banner';}
  pbEl.innerHTML='🥩 <strong style="color:#81C784">Daily Protein Target:</strong> '+dailyP+'g '+(recs?'('+recs.protein_per_kg+' g/kg × '+bw+' kg)':'')+(recs&&recs.meal_timing?' — <em style="color:rgba(250,250,248,.4)">'+recs.meal_timing.split('.')[0]+'.</em>':'');
  var progCard2=document.getElementById('step3')&&document.getElementById('step3').querySelector('.card');
  if(progCard2&&!progCard2.contains(pbEl))progCard2.insertBefore(pbEl,progCard2.querySelector('#progOutput'));
  // Deload trigger check
  (function(){
   var dt=dlTracker(),sess=dt.sessions||0;
   var deloadInterval=28;
   var deloadNote=recs&&(recs.program_notes||[]).find(function(n){return n.toLowerCase().includes('deload');});
   if((sess>0&&sess%deloadInterval===0)||deloadNote){
    var dlEl=document.getElementById('engineDeloadBanner');
    if(!dlEl){dlEl=document.createElement('div');dlEl.id='engineDeloadBanner';dlEl.className='engine-deload-banner';dlEl.onclick=function(){this.style.display='none';};}
    dlEl.innerHTML='💤 <strong style="color:#F4C93B">Deload Week Recommended</strong> — '+(deloadNote||'You\'ve completed '+sess+' sessions. Take a deload: 50% volume, 70% intensity.')+' <span style="opacity:.4;float:right">✕</span>';
    var s4el=document.getElementById('step4');if(s4el&&!s4el.contains(dlEl))s4el.prepend(dlEl);
    dlEl.style.display='block';
    evLog('deload_prompt',{sessions:sess,source:'engine'});
   }
  })();
  // Safety gate alerts on profile fields
  (function(){
   var SAFETY_KW=['consult','medical','physician','non-weight','overtraining','de-train','cardiac'];
   if(!recs)return;
   var safetyNotes=[].concat(recs.program_notes||[],recs.nutrition_notes||[]).filter(function(n){return SAFETY_KW.some(function(kw){return n.toLowerCase().includes(kw);});});
   if(!safetyNotes.length)return;
   var saEl=document.getElementById('engineSafetyAlert');
   if(!saEl){saEl=document.createElement('div');saEl.id='engineSafetyAlert';saEl.className='engine-safety-alert';}
   saEl.innerHTML='⚠️ <strong style="color:#ef5350">Health Notice</strong><br>'+safetyNotes.map(function(n){return'• '+n;}).join('<br>');
   var s1el=document.getElementById('step1');if(s1el&&!s1el.contains(saEl))s1el.prepend(saEl);
  })();
 })();
 go(3);
 }

 document.getElementById('backToSplitBtn').addEventListener('click',function(){go(2);});
 document.getElementById('saveProgBtn').addEventListener('click',function(){go(35);renderMesoConfig();});

 // ═══════════════════════════════════════
 // A7: SHARE PROGRAM CARD
 // ═══════════════════════════════════════

 var shareToastTimer=null;
 function showToast(msg){
 var t=document.getElementById('shareToast');
 t.textContent=msg;t.classList.add('show');
 clearTimeout(shareToastTimer);
 shareToastTimer=setTimeout(function(){t.classList.remove('show');},2600);
 }
 function wrapText(ctx,txt,x,y,maxW,lh,maxLines){
 var words=String(txt).split(/\s+/),line='',ly=y,lines=0;
 for(var i=0;i<words.length;i++){
 var test=line?line+' '+words[i]:words[i];
 if(ctx.measureText(test).width>maxW&&line){
 ctx.fillText(line,x,ly);ly+=lh;lines++;line=words[i];
 if(lines>=maxLines)return ly;
 }else{line=test;}
 }
 if(line){ctx.fillText(line,x,ly);lines++;}
 return ly;
 }
 function shareProgram(){
 var prog=ls(K.PG,null);
 if(!prog||!prog.days)return;
 var sp=ls(K.SP,null);
 var split=sp&&SPLITS[sp.key]?SPLITS[sp.key]:null;
 var vi=ls(K.VI,{});
 var goal=vi.goal||'hypertrophy',ta=vi.ta||'intermediate';
 var top=[];
 prog.days.forEach(function(d){if(!d.ex)return;d.ex.forEach(function(e){if(top.indexOf(e.n)<0)top.push(e.n);});});
 top=top.slice(0,5);
 var splitName=split?split.name:(prog.splitName||'My Program');
 var W=1080,H=1350,c=document.getElementById('shareCanvas'),ctx=c.getContext('2d');
 c.width=W;c.height=H;
 ctx.fillStyle='#14151A';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#F4C93B';ctx.fillRect(0,0,W,16);
 ctx.fillStyle='#1E2027';ctx.fillRect(0,16,W,120);
 ctx.fillStyle='#F4C93B';ctx.font='800 46px Arial,Helvetica,sans-serif';ctx.fillText('MUSCLE OS',60,95);
 ctx.fillStyle='rgba(250,250,248,.55)';ctx.font='600 24px Arial,Helvetica,sans-serif';ctx.fillText('TRAINING PROGRAM',60,128);
 ctx.fillStyle='#FAFAF8';ctx.font='800 64px Arial,Helvetica,sans-serif';
 var y=wrapText(ctx,splitName,60,300,W-120,76,3);
 ctx.fillStyle='rgba(250,250,248,.4)';ctx.font='600 26px Arial,Helvetica,sans-serif';
 ctx.fillText(prog.days.length+' days/week · '+goal+' · '+ta,60,y+30);
 ctx.fillStyle='#F4C93B';ctx.font='700 30px Arial,Helvetica,sans-serif';ctx.fillText('TOP EXERCISES',60,y+120);
 ctx.fillStyle='#FAFAF8';ctx.font='600 40px Arial,Helvetica,sans-serif';
 top.forEach(function(ex,i){
 var ly=y+170+i*66;
 ctx.fillStyle='#F4C93B';ctx.font='800 30px Arial,Helvetica,sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),60,ly);
 ctx.fillStyle='#FAFAF8';ctx.font='600 38px Arial,Helvetica,sans-serif';ctx.fillText(ex,130,ly);
 });
 ctx.fillStyle='#F4C93B';ctx.fillRect(60,H-170,W-120,4);
 ctx.fillStyle='rgba(250,250,248,.7)';ctx.font='700 30px Arial,Helvetica,sans-serif';ctx.fillText('muscleos.coach',60,H-100);
 ctx.fillStyle='rgba(250,250,248,.35)';ctx.font='500 22px Arial,Helvetica,sans-serif';ctx.fillText('Coach Anas Mo\u2019men',60,H-62);
 var a=document.createElement('a');
 a.href=c.toDataURL('image/png');a.download='muscleos_program.png';
 document.body.appendChild(a);a.click();a.remove();
 var shareTxt=' My '+splitName+' program — '+prog.days.length+' days/week · '+goal+'\nTop lifts: '+top.join(', ')+'\nBuilt with Muscle OS → muscleos.coach';
 function done(){showToast(_('share_copied'));}
 function fallback(){
 var ta2=document.createElement('textarea');
 ta2.value=shareTxt;ta2.style.position='fixed';ta2.style.opacity='0';
 document.body.appendChild(ta2);ta2.select();
 try{document.execCommand('copy');}catch(e){}
 ta2.remove();done();
 }
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(shareTxt).then(done).catch(fallback);}
 else{fallback();}
 }
 document.getElementById('shareProgBtn').addEventListener('click',shareProgram);

 // ═══════════════════════════════════════
 // SCREEN 4: DASHBOARD
 // ═══════════════════════════════════════

 function renderWeekRow(){
 var row=document.getElementById('weekRow');if(!row)return;
 var logs=ls(K.LG,{});
 var labels=(window.__lang==='ar')?['أح','إث','ثل','أر','خم','جم','سب']:['Su','Mo','Tu','We','Th','Fr','Sa'];
 var chips='',now=new Date();
 for(var i=6;i>=0;i--){
 var d=new Date(now.getTime()-i*86400000);
 var ds=d.toISOString().split('T')[0];
 var done=dayHasSets(logs[ds]);
 chips+='<div class="week-chip'+(done?' done':'')+(i===0?' today':'')+'" title="'+ds+'">'+labels[d.getDay()]+'</div>';
 }
 var streak=weekStreak(logs);
 row.innerHTML='<span class="wr-lbl">'+_('week_row')+'</span><div class="week-chips">'+chips+'</div>'+(streak>0?'<span class="streak-chip"> '+streak+' '+_('streak')+'</span>':'');
 }
 function dayHasSets(dl){
 if(!dl)return false;
 for(var k in dl){var s=dl[k].sets;if(s&&s.length)for(var j=0;j<s.length;j++){if(s[j]&&(parseFloat(s[j].w)>0||parseInt(s[j].r)>0||parseFloat(s[j].rpe)>0))return true;}}
 return false;
 }
 function weekStreak(logs){
 var streak=0,now=new Date();
 for(var w=0;w<52;w++){
 var wkStart=new Date(now.getTime()-(w*7+6)*86400000);
 var count=0;
 for(var i=0;i<7;i++){
 var d=new Date(wkStart.getTime()+i*86400000);
 if(dayHasSets(logs[d.toISOString().split('T')[0]]))count++;
 }
 if(count>=3)streak++;else break;
 }
 return streak;
 }
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
 document.getElementById('missedText').innerHTML='<span style="font-size:.65rem"></span> '+_('missed_title').replace('{name}','<strong>'+missed.name+'</strong>').replace('{days}',missed.daysAgo);
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
 var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Muscle OS//Training App//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
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
 if(dt.sessions>0){db.style.display='flex';db.className='deload-bar'+(deload.yes?' deload-now':'');db.innerHTML=deload.yes?'<span class="db-warn"> '+_('deload_now')+': '+deload.reason+'</span><span style="font-size:.5rem;color:rgba(250,250,248,.3)">'+deload.fix+'</span>':'<span class="db-lbl">'+_('weeks_since_deload')+'</span><span class="db-val">'+dt.sessions+'</span><span class="db-warn">'+(deloadInterval(age)-dt.sessions)+' '+_('wk_until_deload')+'</span>';if(deload.yes)evLog('deload_prompt',{reason:deload.reason},'dp_'+new Date().toISOString().split('T')[0]);}
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
 // Combined cross-modality load + non-lifting dash (P1)
 renderCombinedLoadDash();
 renderNlDash();
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

 function renderNlDash(){
 var td=todayNonLift();
 document.getElementById('nlTodayBadge').textContent=td.length?td.length+' '+_('nl_today'):'';
 var hist=document.getElementById('nlHistory');
 var wn=weeklyNonLift();
 if(wn.sessions>0)hist.innerHTML='<strong>'+_('nl_this_week')+':</strong> '+wn.sessions+' '+_('cardio_sessions')+', '+wn.minutes+' min';
 else hist.textContent='';
 }

 function renderCombinedLoadDash(){
 var el=document.getElementById('combinedLoadDash');
 if(!el)return;
 var cl=combinedLoad();
 if(cl.week.combined<=0&&cl.today.combined<=0){el.style.display='none';return;}
 el.style.display='block';
 var ms=monotonyStrain();
 var monoColor=ms.mono>2?'#f44336':ms.mono>1.5?'#FF9800':'#4CAF50';
 document.getElementById('combinedLoadContent').innerHTML=
 '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
 '<span>'+_('cl_today')+': <strong style="color:#F4C93B">'+cl.today.combined+'</strong></span>'+
 '<span>'+_('cl_week')+': <strong style="color:#F4C93B">'+cl.week.combined+'</strong> <span style="font-size:.45rem;color:rgba(250,250,248,.15)">('+_('cl_lift')+' '+cl.week.lift.toFixed(0)+' kg · '+_('cl_nonlift')+' '+cl.week.nonlift.toFixed(0)+')</span></span>'+
 '<span style="margin-left:auto">'+_('mono_label')+': <strong style="color:'+monoColor+'">'+ms.mono.toFixed(2)+'</strong></span>'+
 '</div>';
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
 return '<div class="rest-timer" data-ex="'+ex.n+'" data-seconds="'+restSec+'"><span class="rt-label">'+_('rest_timer_label')+'</span><span class="rt-recommend">'+restLabel+'</span><span class="rt-display" id="rtd_'+ex.n.replace(/[^a-zA-Z0-9]/g,'_')+'">'+formatTime(restSec)+'</span><button class="rt-start" data-ex="'+ex.n+'">'+_('timer_start')+'</button><button class="rt-stop" data-ex="'+ex.n+'" style="display:none">'+_('timer_stop')+'</button><button class="rt-reset" data-ex="'+ex.n+'">'+_('timer_reset')+'</button><button class="rt-sound" data-ex="'+ex.n+'" title="'+(soundOn?_('timer_sound_on'):_('timer_sound_off'))+'">'+(soundOn?'':'')+'</button></div>';
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
 var metaHtml='<div class="ex-meta">'+(last?_('last_session')+': <strong>'+(last.w||last.weight)+' '+_('weight')+' '+(last.r||last.reps)+' @ '+_('rpe')+' '+last.rpe+'</strong> · ':'')+_('e1rm_abbr')+': <strong>'+(sugg.e1RM?sugg.e1RM+' '+_('weight'):'—')+'</strong></div>';
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
 suggestHtml='<div class="suggest-box"><div><span class="suggest-val" onclick="showPlateCalculator('+sugg.w+',event)" style="cursor:pointer" title="'+_('plate_title')+'">'+(sugg.w>0?sugg.w+' '+_('weight'):'—')+'</span></div><div class="suggest-detail"><strong>'+(sugg.w>0?sugg.w+' '+_('weight'):'—')+' '+sugg.r+' '+_('reps')+' @ '+_('rpe')+' '+sugg.rpe+'</strong>'+fatigueNote+mlNote+'<br>'+sugg.exp+(sugg.pct?' · '+(sugg.pct).toFixed(0)+_('pct_1rm'):'')+'</div></div>';
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
 
 // Add mobility exercises as a variety to all swap panels
 var mobPool=window.__pools.mobility||[];
 mobPool.forEach(function(s){if(s!==ex.n)swapChips+='<button class="swap-chip" style="color:#64B5F6;border-color:rgba(100,181,246,0.3);border-style:dashed" data-di="'+di+'" data-idx="'+ei+'" data-ex="'+ex.n+'" data-to="'+s+'"> '+(EX_TR[s]?exDisplay(s):s)+'</button>';});
 var swapHtml=swapChips?'<div class="swap-panel"><div class="swp-title">'+_('swap_title')+'</div><div class="swp-hint">'+_('swap_hint')+'</div>'+swapChips+'</div>':'';
 var painHtml='<div class="pain-group"><span class="pain-lbl">'+_('red')+'</span>'+
 '<button class="pain-btn'+(pfc==='green'?' active-green':'')+'" data-ex="'+ex.n+'" data-p="green">🟢</button>'+
 '<button class="pain-btn'+(pfc==='yellow'?' active-yellow':'')+'" data-ex="'+ex.n+'" data-p="yellow">🟡</button>'+
 '<button class="pain-btn'+(pfc==='red'?' active-red':'')+'" data-ex="'+ex.n+'" data-p="red">🔴</button></div>';
 // Engine-driven rest prescription (replaces hardcoded 240/150s)
 var _restRecs = getEngineRecs();
 var restSec = _restRecs
  ? (m.t==='compound' ? parseRestSec(_restRecs.rest_compounds, 180) : parseRestSec(_restRecs.rest_isolation, 90))
  : (m.t==='compound' ? 180 : 90);
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
