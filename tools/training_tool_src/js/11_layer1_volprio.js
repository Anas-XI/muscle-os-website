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

 // ── Combined cross-modality load (P1) ──
 // Lifting load = tonnage (kg·reps, same source ACWR reads). Non-lifting load =
 // duration effort factor (Low 3 / Moderate 5 / High 8). Combined units =
 // tonnage/100 + non-lifting units, so both modalities land on a comparable scale.
 function dailyCombinedLoads(days){
 var hist=loadHist(),nl=getNonLiftLogs();
 var byDay={};
 // UTC-calendar keys: storage (cardio/pain/log entries) is dated via
 // toISOString().split('T')[0], so day keys must match UTC, not local midnight.
 var dISO=function(offset){var d=new Date();d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().split('T')[0];};
 for(var i=days-1;i>=0;i--)byDay[dISO(i)]={lift:0,nonlift:0,combined:0};
 Object.keys(hist).forEach(function(ex){(hist[ex]||[]).forEach(function(e){
 if(byDay[e.date]!==undefined)byDay[e.date].lift+=e.w*e.r;
 })});
 nl.forEach(function(x){
 if(byDay[x.date]!==undefined){
 var u=(x.dur||0)*(NONLIFT_EFFORT[x.effort]||5);
 byDay[x.date].nonlift+=u;
 }
 });
 Object.keys(byDay).forEach(function(d){byDay[d].combined=Math.round(byDay[d].lift/100+byDay[d].nonlift);});
 return byDay;
 }
 function combinedLoad(){
 var byDay=dailyCombinedLoads(28),td=new Date().toISOString().split('T')[0];
 var w=0,wl=0,wn=0,m=0,ml=0,mn=0;
 Object.keys(byDay).forEach(function(d){
 if(d>=byDayStart(7)){w+=byDay[d].combined;wl+=byDay[d].lift;wn+=byDay[d].nonlift;}
 m+=byDay[d].combined;ml+=byDay[d].lift;mn+=byDay[d].nonlift;
 });
 return{today:byDay[td]||{lift:0,nonlift:0,combined:0},week:{combined:w,lift:wl,nonlift:wn},month:{combined:m,lift:ml,nonlift:mn}};
 }
 function byDayStart(days){var d=new Date();d.setUTCDate(d.getUTCDate()-days);return d.toISOString().split('T')[0];}

 // ── Foster monotony & strain (P2, read-time over trailing 7 days) ──
 // Monotony = daily-mean / daily-SD of combined load. Strain = 7-day total monotony.
 // Rest/missed days count as 0. Threshold: monotony > 2.0 → soft gate (suggest
 // variation/recovery, never modify the program).
 function monotonyStrain(){
 var byDay=dailyCombinedLoads(7);
 var vals=Object.keys(byDay).sort().map(function(d){return byDay[d].combined;});
 var n=vals.length,sum=vals.reduce(function(a,x){return a+x},0);
 var mean=sum/n;
 var sd=Math.sqrt(vals.reduce(function(a,x){return a+(x-mean)*(x-mean)},0)/n)||0;
 var mono=sd>0?mean/sd:0;
 var strain=mono>0?sum*mono:0;
 return{mono:Math.round(mono*100)/100,strain:Math.round(strain*100)/100,mean:Math.round(mean*100)/100,sd:Math.round(sd*100)/100,total:sum,daily:vals};
 }
 window.__monotonyStrain=monotonyStrain;window.__combinedLoad=combinedLoad;window.__dailyCombinedLoads=dailyCombinedLoads;

 // ── Joint-stress-flag frequency (P5, from K.PFH) ──
 // Counts pain-flag events per joint over the window; feeds prehab suggestions.
 function jointStressFlags(days){
 var hist=ls(K.PFH,[]),cut=byDayStart(days);
 var counts={};
 hist.forEach(function(f){
 if(!f||!f.date||f.date<cut)return;
 jointsForExercise(f.ex||'').forEach(function(j){
 if(!j)return;
 if(!counts[j])counts[j]={count:0,ex:{}};
 counts[j].count++;
 counts[j].ex[f.ex]=true;
 });
 });
 return Object.keys(counts).map(function(j){return{joint:j,count:counts[j].count,exercises:Object.keys(counts[j].ex)};}).sort(function(a,b){return b.count-a.count;});
 }
 window.__jointStressFlags=jointStressFlags;

 // ── Volume Tracking ──
 function findMuscle(ex){var prog=ls(K.PG,null);if(prog)for(var di in prog.days)for(var ei in prog.days[di].ex){if(prog.days[di].ex[ei].n===ex)return prog.days[di].ex[ei].p;}for(var k in SPLITS)for(var d in SPLITS[k].days)for(var e in SPLITS[k].days[d].ex){var x=SPLITS[k].days[d].ex[e];if(x.n===ex)return x.p;}return null;}
 function weeklyVol(logs){var v={};MUSCLES.forEach(function(m){v[m.id]=0});var wa=new Date(Date.now()-7*864e5).toISOString().split('T')[0],td=new Date().toISOString().split('T')[0];var prog=ls(K.PG,null);Object.keys(logs).forEach(function(ds){if(ds<wa||ds>td)return;Object.keys(logs[ds]).forEach(function(eid){var s=logs[ds][eid].sets||[],en=eid.split('__')[1]||eid,pm=findMuscle(en);if(!pm||v[pm]===undefined)return;if(prog&&prog.days.some(function(d){return d.ex.some(function(e){return e.optional&&e.n===en});}))return;v[pm]+=s.filter(function(x){return x&&(x.weight||x.w)&&parseFloat(x.weight||x.w)>0}).length;});});return v;}
 window.__weeklyVol=weeklyVol;

 // ═══════════════════════════════════════
 // UI STATE
 // ═══════════════════════════════════════

 var step=1,dayIdx=0,splitKey='upper_lower_4',quizMode=false,quizQ=0,quizA={};
 var makeupDays={},missedSkip=false,lightDays={},lightProceed={},monoDismissed={};
 function setAppMode(mode) {
 if(mode === 'program') {
 document.querySelectorAll('.program-step').forEach(function(s){s.style.display=''});
 document.querySelectorAll('.intake-step').forEach(function(s){s.style.display='none'});
 } else {
 document.querySelectorAll('.program-step').forEach(function(s){s.style.display='none'});
 document.querySelectorAll('.intake-step').forEach(function(s){s.style.display=''});
 }
 }
 function go(n){step=n;evLog('screen_'+n);document.querySelectorAll('.step-content').forEach(function(s){s.classList.remove('active')});var el=document.getElementById('step'+n);if(el)el.classList.add('active');document.querySelectorAll('.step').forEach(function(s){var sn=parseInt(s.dataset.step);s.classList.remove('active','done');if(sn===n)s.classList.add('active');else if(sn<n)s.classList.add('done');});window.scrollTo(0,0);}
 document.querySelectorAll('.step').forEach(function(s){s.addEventListener('click',function(){var n=parseInt(this.dataset.step);if(n<=step && this.style.display !== 'none')go(n);})});

 // ═══════════════════════════════════════
 // SCREEN 1: ONBOARDING
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

 // Priority/focus selection is for intermediate+ lifters (1+ years).
 // Novices get a balanced program without forced priority choices.
 function applyPrioVisibility(){
 var ta=document.getElementById('ta').value;
 var sec=document.getElementById('musclePrioSection');
 if(sec)sec.style.display=ta==='novice'?'none':'block';
 }
 applyPrioVisibility();
 document.getElementById('ta').addEventListener('change',applyPrioVisibility);

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

 function proceedToSplit(){
 splitKey='';
 var vi=ls(K.VI,{}),targets2=ls(K.VT,{}),total=0;
 MUSCLES.forEach(function(m){var x=targets2[m.id];if(x)total+=x.rec;});
 go(2);
 renderVolumeSplit(targets2,total,vi.ta||'intermediate',vi.goal||'hypertrophy',parseInt(vi.days||4,10));
 }

 // ── Sex & Menstrual Cycle Engine ──
 var CYCLE_PHASES={menstrual:{vol:0.85,rpe:-1,days:'1\u20135'},follicular:{vol:1.0,rpe:0,days:'6\u201313'},ovulation:{vol:1.0,rpe:0,days:'~14'},luteal:{vol:0.9,rpe:-0.5,days:'15\u201328'}};
 function cyclePhaseOf(vi){
 if(!vi||vi.sex!=='female')return null;
 if(vi.cyclePhase&&vi.cyclePhase!=='auto'&&vi.cyclePhase!=='')return vi.cyclePhase==='skip'?null:vi.cyclePhase;
 if(!vi.cycleLast)return null;
 var last=new Date((vi.cycleLast||'').replace(/-/g,'/'));
 if(isNaN(last))return null;
 var len=parseInt(vi.cycleLen||28,10)||28;
 var now=new Date();now.setHours(0,0,0,0);last.setHours(0,0,0,0);
 var day=Math.floor((now-last)/864e5)+1;
 if(day<1)day=1;if(day>len)day=((day-1)%len)+1;
 var ovu=Math.max(11,len-14);
 if(day<=5)return 'menstrual';
 if(day<ovu)return 'follicular';
 if(day<=ovu+2)return 'ovulation';
 return 'luteal';
 }
 function cycleMods(vi){
 var ph=cyclePhaseOf(vi);
 if(!ph)return{vol:1,rpe:0,phase:null,note:null};
 var m=CYCLE_PHASES[ph];
 return{vol:m.vol,rpe:m.rpe,phase:ph,note:'cyc_note_'+ph};
 }
 function cycleDayOf(vi){
 if(!vi||vi.sex!=='female'||!vi.cycleLast)return null;
 var last=new Date((vi.cycleLast||'').replace(/-/g,'/'));
 if(isNaN(last))return null;
 var len=parseInt(vi.cycleLen||28,10)||28;
 var now=new Date();now.setHours(0,0,0,0);last.setHours(0,0,0,0);
 var day=Math.floor((now-last)/864e5)+1;
 if(day<1)return 1;if(day>len)return ((day-1)%len)+1;
 return day;
 }
 function cycleModText(m){
 var t=''+_('cyc_vol_note')+' \u00d7'+m.vol;
 if(m.rpe)t+=' \u00b7 RPE '+(m.rpe>0?'+':'')+m.rpe;
 return t;
 }
 function updateCycleUI(){
 var sexEl=document.getElementById('userSex');
 var isF=sexEl&&sexEl.value==='female';
 var lenGrp=document.getElementById('cycleLenGroup'),sec=document.getElementById('cycleSection'),info=document.getElementById('cyclePhaseInfo');
 if(lenGrp)lenGrp.style.display=isF?'':'none';
 if(sec)sec.style.display=isF?'':'none';
 if(!isF||!info)return;
 var vi={sex:'female',cycleLen:document.getElementById('cycleLen').value,cycleLast:document.getElementById('cycleLastDate').value,cyclePhase:document.getElementById('cyclePhaseSel').value};
 var ph=cyclePhaseOf(vi),day=cycleDayOf(vi),m=cycleMods(vi);
 if(vi.cyclePhase==='skip'||!m.phase){info.innerHTML='';return;}
 var lbl=(m.phase==='menstrual'?_('cyc_menstrual'):m.phase==='follicular'?_('cyc_follicular'):m.phase==='ovulation'?_('cyc_ovulation'):_('cyc_luteal'));
 var txt='';
 if(vi.cyclePhase==='auto'&&ph&&day)txt='<span style="color:#F4C93B">'+_('cyc_detected')+'</span> '+lbl+' ('+CYCLE_PHASES[ph].days+') \u00b7 '+_('cyc_day')+' '+day+'/'+vi.cycleLen;
 else if(vi.cyclePhase!=='auto')txt=_('cyc_manual')+' '+lbl+' ('+CYCLE_PHASES[vi.cyclePhase].days+')';
 if(txt)info.innerHTML=txt+' \u00b7 '+cycleModText(m);
 }
 function fillCycleBanner(){
 var bn=document.getElementById('cycleBanner');
 if(!bn)return;
 var vi=ls(K.VI,{}),cm=cycleMods(vi),day=cycleDayOf(vi);
 if(!cm.phase){bn.style.display='none';return;}
 var lbl=(cm.phase==='menstrual'?_('cyc_menstrual'):cm.phase==='follicular'?_('cyc_follicular'):cm.phase==='ovulation'?_('cyc_ovulation'):_('cyc_luteal'));
 bn.innerHTML='<div style="background:rgba(244,201,59,.05);border:1px solid rgba(244,201,59,.15);border-radius:8px;padding:8px 10px;margin-top:8px;font-size:.6rem;line-height:1.5">'+
 '<div style="font-weight:600;color:#F4C93B;margin-bottom:2px">'+_('cyc_banner_head')+'</div>'+
 '<div>'+_('cyc_phase')+': <strong>'+lbl+'</strong>'+(day?' \u00b7 '+_('cyc_day')+' '+day+(vi.cycleLen?'/'+vi.cycleLen:''):'')+' \u00b7 '+cycleModText(cm)+'</div>'+
 '<div style="color:rgba(250,250,248,.55);margin-top:2px">'+_(cm.note)+'</div></div>';
 bn.style.display='block';
 }
 function initCycleUI(){
 var sexEl=document.getElementById('userSex');
 if(!sexEl)return;
 sexEl.addEventListener('change',updateCycleUI);
 var c1=document.getElementById('cycleLastDate'),c2=document.getElementById('cycleLen'),c3=document.getElementById('cyclePhaseSel');
 if(c1)c1.addEventListener('change',updateCycleUI);
 if(c2)c2.addEventListener('change',updateCycleUI);
 if(c3)c3.addEventListener('change',updateCycleUI);
 var vi=ls(K.VI,{});
 if(vi.sex)sexEl.value=vi.sex;
 if(vi.cycleLen&&c2)c2.value=vi.cycleLen;
 if(vi.cycleLast&&c1)c1.value=vi.cycleLast;
 if(vi.cyclePhase&&c3)c3.value=vi.cyclePhase;
 updateCycleUI();
 }
 initCycleUI();
 document.getElementById('onboardNext').addEventListener('click',function(){
 var err=document.getElementById('onboardErr');
 var ta=document.getElementById('ta').value;
 var fc=MUSCLES.filter(function(m){return getPrio(m.id)==='focus'}).length;
 err.style.display='none';
 var g=document.getElementById('goal').value,dd=parseInt(document.getElementById('dow').value),rf=document.getElementById('recFactor').value;
 var name=document.getElementById('userName').value.trim();
 var age=document.getElementById('userAge').value||'';
 var rfMap={low:0.85,moderate:1.0,high:1.1};
 var rec=rfMap[rf]||1;
 var sex=document.getElementById('userSex').value;
 var cycRec={sex:sex,cycleLen:document.getElementById('cycleLen').value,cycleLast:document.getElementById('cycleLastDate').value,cyclePhase:document.getElementById('cyclePhaseSel').value};
 var cm=cycleMods(cycRec);
 rec=rec*(cm.vol||1);
 var table=VOLUME_TABLES[ta][g],targets={},total=0;
 MUSCLES.forEach(function(m){
 var v=table[VMAP[m.id]]||[4,8,12],prio=getPrio(m.id),mult=prio==='focus'?1:0.55;
 var mev=Math.round(v[0]*mult*rec),mav=Math.round(v[1]*mult*rec),mrv=Math.round(v[2]*mult*rec);
 targets[m.id]={mev:mev,mav:mav,mrv:mrv,rec:Math.round((mev+mav)/2),prio:prio,name:m.name};
 total+=Math.round((mev+mav)/2);
 });
 ss(K.VI,{name:name,age:age,ta:ta,goal:g,days:dd,rec:rf,sex:sex,cycleLen:cycRec.cycleLen,cycleLast:cycRec.cycleLast,cyclePhase:cycRec.cyclePhase,prios:MUSCLES.map(function(m){return{id:m.id,p:getPrio(m.id)}})});
 ss(K.VT,targets);
 // Powerlifting profile
 if(g==='strength'){
 var pl=getPLProfile();savePLProfile(pl);
 var peri=determinePeriodization(pl,ta);
 if(peri)ss('mos_periodization',peri);
 } else {localStorage.removeItem(K.PL);localStorage.removeItem('mos_periodization');}
 if(ta==='novice'){proceedToSplit();return;}
 document.getElementById('prioPanel').classList.add('show');
 renderPrioPanel();
 });

 // ═══════════════════════════════════════
 // PRIORITY MUSCLES + EFFORT RECOVERY + VOLUME DISTRIBUTION
 // (sits between onboarding and split selection, and between
 // exercise selection and program generation)
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
