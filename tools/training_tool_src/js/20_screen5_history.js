 container.querySelectorAll('.sr-chip').forEach(function(b){b.addEventListener('click',function(){saveSoreness(b.dataset.m,parseInt(b.dataset.v,10));renderDay(parseInt(b.dataset.di,10));});});
 container.querySelectorAll('.fat-light-btn[data-gm]').forEach(function(b){b.addEventListener('click',function(){var fo=ls(K.FO,{}),wk=weekStartISO();if(!fo[wk])fo[wk]={};fo[wk][b.dataset.gm]=parseInt(b.dataset.gfreq,10);ss(K.FO,fo);renderDay(parseInt(b.dataset.di,10));});});
 container.querySelectorAll('.rt-start').forEach(function(b){b.addEventListener('click',function(){startRestTimer(this.dataset.ex);});});
 container.querySelectorAll('.rt-stop').forEach(function(b){b.addEventListener('click',function(){stopRestTimer(this.dataset.ex);});});
 container.querySelectorAll('.rt-reset').forEach(function(b){b.addEventListener('click',function(){resetRestTimer(this.dataset.ex);});});
 container.querySelectorAll('.rt-sound').forEach(function(b){b.addEventListener('click',function(){var ex=this.dataset.ex;var on=!timerSoundEnabled(ex);setTimerSoundEnabled(ex,on);this.textContent=on?'':'';this.title=on?_('timer_sound_on'):_('timer_sound_off');});});

 // Sync rest timer button visibility with running timers (after renderDay re-renders)
 container.querySelectorAll('.rest-timer').forEach(function(rt){
 var ex=rt.dataset.ex;
 if(restTimers[ex]&&restTimers[ex].interval){
 rt.querySelector('.rt-start').style.display='none';
 rt.querySelector('.rt-stop').style.display='';
 }
 });

 // Add custom exercise button
 var ce=ls(K.CE,[]);
 if(ce.length){
 var addCeBtn=container.querySelector('.add-custom-ex-btn');
 if(!addCeBtn){
 var btnDiv=document.createElement('div');
 btnDiv.style.cssText='text-align:center;margin-top:6px';
 btnDiv.innerHTML='<span class="ce-link" onclick="addCustomExToDay('+di+')" data-i18n="ce_add_to_day">+ Custom Exercise</span>';
 container.appendChild(btnDiv);
 }
 }

 updateSummary(di);
 }

 function addCustomExToDay(di){
 var ce=ls(K.CE,[]);
 if(!ce.length)return;
 var names=ce.map(function(e){return e.name;});
 var promptMsg=_('ce_select')+':\n'+names.map(function(n,i){return (i+1)+'. '+n;}).join('\n');
 var choice=prompt(promptMsg);
 if(!choice)return;
 var idx=parseInt(choice)-1;
 if(isNaN(idx)||idx<0||idx>=ce.length){alert(_('ce_invalid'));return;}
 var selected=ce[idx].name;
 var prog=ls(K.PG,null);
 if(!prog||!prog.days[di])return;
 var day=prog.days[di];
 // Check duplicate
 for(var i=0;i<day.ex.length;i++){if(day.ex[i].n===selected){alert(_('ce_duplicate'));return;}}
 day.ex.push({n:selected,s:3,r:[10,10],rpe:7});
 ss(K.PG,prog);
 renderDay(di);
 }

 function saveSet(di,en,si,f,v,wu){
 var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;
 if(!logs[td])logs[td]={};if(!logs[td][eid])logs[td][eid]={sets:[]};
 var wuCnt=0;document.querySelectorAll('.set-row[data-ex="'+en+'"][data-wu="1"]').forEach(function(r){var rs=parseInt(r.dataset.set)||0;if(rs+1>wuCnt)wuCnt=rs+1;});
 if(si>=wuCnt){for(var wi=logs[td][eid].sets.length;wi<wuCnt;wi++)logs[td][eid].sets[wi]={w:'',r:'',rpe:'',wu:true};}
 if(!logs[td][eid].sets[si])logs[td][eid].sets[si]={w:'',r:'',rpe:''};
 var isWu=!!wu||!!logs[td][eid].sets[si].wu;
 if(isWu)logs[td][eid].sets[si].wu=true;
 var wasComplete=logs[td][eid].sets[si].w&&logs[td][eid].sets[si].r&&logs[td][eid].sets[si].rpe&&parseFloat(logs[td][eid].sets[si].w)>0&&parseInt(logs[td][eid].sets[si].r)>0&&parseFloat(logs[td][eid].sets[si].rpe)>0;
 logs[td][eid].sets[si][f]=v;ss(K.LG,logs);
 var nowComplete=logs[td][eid].sets[si].w&&logs[td][eid].sets[si].r&&logs[td][eid].sets[si].rpe&&parseFloat(logs[td][eid].sets[si].w)>0&&parseInt(logs[td][eid].sets[si].r)>0&&parseFloat(logs[td][eid].sets[si].rpe)>0;
 var firstCompleteForEx=!wasComplete&&nowComplete&&!isWu;if(isWu&&nowComplete)evLog('warmup_used',{ex:en},'wu_'+td+'_'+en);
 if(firstCompleteForEx){
 var otherComplete=false;
 (logs[td][eid].sets||[]).forEach(function(st,idx){if(idx!==si&&!st.wu&&st.w&&st.r&&st.rpe&&parseFloat(st.w)>0&&parseInt(st.r)>0&&parseFloat(st.rpe)>0)otherComplete=true;});
 if(!otherComplete)startRestTimer(en);
 }
 var valuedCnt=0;var tdSets=logs[td];
 for(var kk in tdSets){var setsArr=tdSets[kk].sets;for(var jj=0;jj<setsArr.length;jj++){var s2=setsArr[jj];if(s2&&(parseFloat(s2.w)>0||parseInt(s2.r)>0||parseFloat(s2.rpe)>0))valuedCnt++;}}
 if(valuedCnt===1&&parseFloat(v)>0){
 var chip=document.querySelector('#weekRow .week-chip.today');
 if(chip){chip.classList.add('done','pulse');setTimeout(function(){chip.classList.remove('pulse');},600);}
 renderWeekRow();
 }
 var s=logs[td][eid].sets[si];
 if(!isWu&&s.w&&s.r&&s.rpe&&parseFloat(s.w)>0&&parseInt(s.r)>0&&parseFloat(s.rpe)>0){var h=loadHist(),e=est1RM(parseFloat(s.w),parseInt(s.r),parseFloat(s.rpe));if(e){if(!h[en])h[en]=[];var dup=h[en].some(function(x){return x.date===td&&x.w===parseFloat(s.w)&&x.r===parseInt(s.r)});if(!dup){h[en].push({date:td,w:parseFloat(s.w),r:parseInt(s.r),rpe:parseFloat(s.rpe),e1RM:e,day:day?day.n:''});saveHist(h);trackTrainingSession(td);checkDeloadOvershoot();renderDay(di);}}}
 updateSummary(di);
 }

 function delSet(di,en,si){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(logs[td]&&logs[td][eid]){var row=document.querySelector('.set-row[data-ex="'+en+'"][data-set="'+si+'"]');var wasWu=!!(row&&row.dataset.wu);logs[td][eid].sets.splice(si,1);if(wasWu)logs[td][eid].sets.splice(si,0,{w:'',r:'',rpe:'',wu:true});if(!logs[td][eid].sets.length)delete logs[td][eid];if(!Object.keys(logs[td][eid]||{}).length)delete logs[td][eid];ss(K.LG,logs);}renderDay(di);}
 function addSet(di,en){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(!logs[td])logs[td]={};if(!logs[td][eid])logs[td][eid]={sets:[]};var wuCnt=0;document.querySelectorAll('.set-row[data-ex="'+en+'"][data-wu="1"]').forEach(function(r){var rs=parseInt(r.dataset.set)||0;if(rs+1>wuCnt)wuCnt=rs+1;});if(logs[td][eid].sets.length<wuCnt){for(var wi=logs[td][eid].sets.length;wi<wuCnt;wi++)logs[td][eid].sets[wi]={w:'',r:'',rpe:'',wu:true};}logs[td][eid].sets.push({w:'',r:'',rpe:''});ss(K.LG,logs);renderDay(di);}
 function rmEx(di,en){var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],prog=ls(K.PG,null),day=prog&&prog.days[di]?prog.days[di]:null,eid=day?day.n+'__'+en:en;if(logs[td]&&logs[td][eid]){delete logs[td][eid];if(!Object.keys(logs[td]).length)delete logs[td];ss(K.LG,logs);}renderDay(di);}
 function swapEx(di,idx,oldName,newName){
 if(!oldName||!newName||oldName===newName)return;
 var prog=ls(K.PG,null);if(!prog||!prog.days[di])return;
 var day=prog.days[di],ex=day.ex[idx];if(!ex)return;
 var sp=ls(K.SP,null),orig=ex.prehab?null:(ex.orig||(sp&&SPLITS[sp.key]&&SPLITS[sp.key].days[di]&&SPLITS[sp.key].days[di].ex[idx]?SPLITS[sp.key].days[di].ex[idx].n:null));
 ex.n=newName;ss(K.PG,prog);
 var choices=ls('mos_ex_choices',{});
 if(orig){if(newName===orig)delete choices[orig];else choices[orig]=newName;}
 else if(choices[oldName]===newName)delete choices[oldName];
 ss('mos_ex_choices',choices);
 if(orig){var pref=ls('mos_pref',{});if(!pref[orig])pref[orig]={};pref[orig][newName]=(pref[orig][newName]||0)+1;ss('mos_pref',pref);}
 var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0];
 var oldEid=day.n+'__'+oldName,newEid=day.n+'__'+newName;
 if(logs[td]&&logs[td][oldEid]){logs[td][newEid]=logs[td][oldEid];delete logs[td][oldEid];if(!Object.keys(logs[td]).length)delete logs[td];ss(K.LG,logs);}
 renderDay(di);updateSummary(di);
 }

 function updateSummary(di){
 var logs=ls(K.LG,{}),td=new Date().toISOString().split('T')[0],dl=logs[td]||{};
 var sets=0,reps=0,exs=0,wuSets=0;
 Object.keys(dl).forEach(function(eid){var s=dl[eid].sets||[],v=s.filter(function(x){return x&&x.w&&parseFloat(x.w)>0});if(v.length)exs++;
 v.forEach(function(x){if(x.wu)wuSets++;else sets++;reps+=parseInt(x.r)||0;});});
 var setEl=document.getElementById('sumSets');
 setEl.textContent=sets+wuSets;
 document.getElementById('sumReps').textContent=reps;
 document.getElementById('sumExDone').textContent=exs;
 var wuMark=setEl.parentElement.querySelector('.wu-sum-mark');
 if(wuSets>0){
 if(!wuMark){wuMark=document.createElement('span');wuMark.className='wu-sum-mark';setEl.parentElement.insertBefore(wuMark,setEl);}
 wuMark.textContent=wuSets+' '+_('warmup_incl');
 }else if(wuMark){wuMark.remove();}
 }

 document.getElementById('changeSplitBtn').addEventListener('click',function(){go(2);});
 document.getElementById('goToHistBtn').addEventListener('click',function(){go(5);renderHistory();});

 // Fatigue wiring
 document.getElementById('saveFatigueBtn').addEventListener('click',function(){
 var f={};
 document.querySelectorAll('#fatigueGrid input').forEach(function(inp){f[inp.dataset.fk]=parseInt(inp.value)||5;});
 saveTodayFatigue(f);
 renderDashboard();
 });
 document.getElementById('skipFatigueBtn').addEventListener('click',function(){
 document.getElementById('fatigueBar').style.display='none';
 });

 // Missed-session make-up wiring
 document.getElementById('missedCondensedBtn').addEventListener('click',function(){
 var missed=findMissedDay();if(!missed)return;
 makeupDays[missed.di]=true;
 document.getElementById('missedBanner').style.display='none';
 var tabs=document.getElementById('dayTabs');
 Array.prototype.forEach.call(tabs.querySelectorAll('.day-tab'),function(x){x.classList.remove('active');});
 var tb=tabs.children[missed.di];if(tb)tb.classList.add('active');
 dayIdx=missed.di;
 var ec=document.getElementById('exCards');ec.classList.remove('fresh');void ec.offsetWidth;ec.classList.add('fresh');setTimeout(function(){ec.classList.remove('fresh');},500);
 renderDay(dayIdx);
 updateMakeupChip();
 });
 document.getElementById('missedSkipBtn').addEventListener('click',function(){
 missedSkip=true;
 document.getElementById('missedBanner').style.display='none';
 });

 // Superset toggle wiring
 document.getElementById('supersetToggle').addEventListener('click',function(){
 var su=ls(K.SU,{});
 su[dayIdx]=!su[dayIdx];
 ss(K.SU,su);
 renderDay(dayIdx);
 updateSupersetToggle();
 });

 // Cardio wiring
 document.getElementById('cardioToggle').addEventListener('click',function(){
 document.getElementById('cardioForm').classList.toggle('show');
 });
 document.getElementById('saveCardioBtn').addEventListener('click',function(){
 var type=document.getElementById('cardioType').value,dur=parseInt(document.getElementById('cardioDur').value)||0,intensity=document.getElementById('cardioIntensity').value,notes=document.getElementById('cardioNotes').value;
 if(!dur||dur<1){alert(_('alert_enter_minutes'));return;}
 saveCardioSession({date:new Date().toISOString().split('T')[0],type:type,dur:dur,intensity:intensity,notes:notes});
 document.getElementById('cardioForm').classList.remove('show');
 document.getElementById('cardioDur').value='';document.getElementById('cardioNotes').value='';
 renderCardioDash();
 });

 // Non-lifting wiring (P1)
 document.getElementById('nlToggle').addEventListener('click',function(){
 document.getElementById('nlForm').classList.toggle('show');
 });
 document.getElementById('saveNlBtn').addEventListener('click',function(){
 var type=document.getElementById('nlType').value,dur=parseInt(document.getElementById('nlDur').value)||0,effort=document.getElementById('nlEffort').value,notes=document.getElementById('nlNotes').value;
 if(!dur||dur<1){alert(_('alert_enter_minutes'));return;}
 saveNonLiftSession({date:new Date().toISOString().split('T')[0],type:type,dur:dur,effort:effort,notes:notes});
 document.getElementById('nlForm').classList.remove('show');
 document.getElementById('nlDur').value='';document.getElementById('nlNotes').value='';
 renderNlDash();
 renderCombinedLoadDash();
 });

 // ── Measurement wiring ──
 document.getElementById('measToggle').addEventListener('click',function(){
 var f=document.getElementById('measForm'),isOpen=f.style.display==='block';
 f.style.display=isOpen?'none':'block';
 if(!isOpen){var lm=latestMeasurements();renderMeasForm(lm||undefined);}
 });
 document.getElementById('cancelMeasBtn').addEventListener('click',function(){document.getElementById('measForm').style.display='none';});
 document.getElementById('saveMeasBtn').addEventListener('click',function(){
 var m={};
 ['weight','bf','chest','waist','lArm','rArm','lThigh','rThigh','lCalf','rCalf'].forEach(function(f){
 m[f]=document.getElementById('meas'+f.charAt(0).toUpperCase()+f.slice(1)).value;
 });
 // Handle photo
 var photoInput=document.getElementById('measPhotoInput');
 if(photoInput.files&&photoInput.files[0]){
 var r=new FileReader();
 r.onload=function(e){
 m.photo=e.target.result;
 saveMeasurement(m);
 document.getElementById('measForm').style.display='none';
 photoInput.value='';
 renderMeasBadge();
 alert(_('alert_meas_saved'));
 };
 if(photoInput.files[0].size>100*1024){alert(_('alert_photo_large'));return;}
 r.readAsDataURL(photoInput.files[0]);
 } else {
 saveMeasurement(m);
 document.getElementById('measForm').style.display='none';
 renderMeasBadge();
 alert(_('alert_meas_saved'));
 }
 });

 // ── Mesocycle wiring ──
 document.getElementById('mesoBackBtn').addEventListener('click',function(){go(3);});
 document.getElementById('genMesoBtn').addEventListener('click',function(){saveMesoPlan();});
 document.getElementById('startTrainingBtn').addEventListener('click',function(){
 go(4);renderDashboard();
 });
 document.getElementById('saveProfileBtn').addEventListener('click',function(){
 var vi=ls(K.VI,{}),name=vi.name||'';
 if(!name){alert(_('name_required'));return;}
 ss('mos_profile_saved','yes');
 notifyCoach('onboarding',{name:vi.name,age:vi.age,goal:vi.goal,days:vi.days});
 document.getElementById('profileStatus').textContent=' '+_('profile_saved')+' '+name;
 setTimeout(function(){document.getElementById('profileStatus').textContent='';},3000);
 });
 // Week advance button (added dynamically in renderMesoCalendar)
 document.getElementById('advanceWeekBtn')&&document.getElementById('advanceWeekBtn').addEventListener('click',function(){
 if(!confirm(_('confirm_advance_week')))return;
 advanceWeek();
 renderMesoCalendar();
 renderDashboard();
 });
 // Re-generate meso when type/weeks change
 document.getElementById('mesoType').addEventListener('change',function(){
 var mp=ls(K.MP,null);
 if(mp)renderMesoPreview(mp);
 });
 document.getElementById('mesoWeeks').addEventListener('change',function(){
 var mp=ls(K.MP,null);
 if(mp)renderMesoPreview(mp);
 });

