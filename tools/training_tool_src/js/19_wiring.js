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
    document.getElementById('profileStatus').textContent='✓ '+_('profile_saved')+' '+name;
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

  // ── PDF ──
  document.getElementById('exportIcsBtn').addEventListener('click',exportIcs);
  document.getElementById('savePdfBtn').addEventListener('click',function(){
    var prog=ls(K.PG,null),vi=ls(K.VI,{}),vt=ls(K.VT,{}),sp=ls(K.SP,null);
    if(!prog||!sp){alert(_('alert_gen_program'));return;}
    var goal=vi.goal||'hypertrophy',ta=vi.ta||'intermediate',dd=vi.days||4,rec=vi.rec||'moderate';
    var dateF=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    // Volume targets table
    var vh='';MUSCLES.forEach(function(m){var t=vt[m.id];if(!t)return;vh+='<tr><td>'+t.name+'</td><td class="c">'+t.prio+'</td><td class="c">'+t.mev+'</td><td class="c">'+t.mav+'</td><td class="c">'+t.mrv+'</td><td class="c">'+t.rec+'</td></tr>';});
    // Program days
    var ph='';prog.days.forEach(function(day,di){ph+='<div class="db"><div class="dt">'+_('day_prefix')+' '+(di+1)+': '+day.n+'</div><table><thead><tr><th>Exercise</th><th class="c">'+_('sets')+'</th><th class="c">'+_('reps')+'</th><th class="c">'+_('rest')+'</th></tr></thead><tbody>';if(day.restDay){ph+='<tr><td colspan="4" style="text-align:center;color:rgba(250,250,248,.25)">'+_('rest_day')+' - '+_('rest_day_recover')+'</td></tr>';}else{day.ex.forEach(function(ex){var r=ex.rl<=6?_('gen_rest_2_3'):ex.rl<=10?_('gen_rest_90_120'):_('gen_rest_60_90');ph+='<tr><td>'+(EX_TR[ex.n]?exDisplay(ex.n):ex.n)+'</td><td class="c">'+ex.sets+'</td><td class="c">'+ex.rl+'\u2013'+ex.rh+'</td><td class="c">'+r+'</td></tr>';});}ph+='</tbody></table></div>';});
    // RPE/RIR/Volume educational section
    var edu='<div class="sec"><div class="st" style="color:#F4C93B">Understanding RPE, RIR &amp; Volume</div><div class="ec"><div class="ecard"><div class="ect">RPE Scale (Rate of Perceived Exertion)</div><table class="rpet"><thead><tr><th>RPE</th><th>Effort Level</th><th>RIR</th></tr></thead><tbody><tr><td class="c" style="font-weight:600">10</td><td>Max effort, cannot add another rep</td><td class="c">0</td></tr><tr><td class="c" style="font-weight:600;color:#F4C93B">9</td><td>Very hard, 1 rep left in the tank</td><td class="c" style="color:#F4C93B">1</td></tr><tr><td class="c" style="font-weight:600;color:#F4C93B">8</td><td>Challenging, 2 reps left</td><td class="c" style="color:#F4C93B">2</td></tr><tr><td class="c" style="font-weight:600">7</td><td>Moderately hard, 3 reps left</td><td class="c">3</td></tr><tr><td class="c" style="font-weight:600">6</td><td>Light, 4+ reps left (warm-up zone)</td><td class="c">4+</td></tr></tbody></table><div class="etip">RIR = 10 \u2212 RPE. Example: RPE 8 = 2 reps in reserve. Stay at RPE 7\u20139 for working sets. Training to failure every session increases fatigue without extra muscle gain.</div></div><div class="ecard"><div class="ect">Volume Guide — Weekly Sets Per Muscle</div><table><thead><tr><th>Zone</th><th>Meaning</th></tr></thead><tbody><tr><td style="font-weight:600;color:#4CAF50">MEV</td><td>Minimum Effective Volume \u2014 the least weekly sets to stimulate growth</td></tr><tr><td style="font-weight:600;color:#F4C93B">MAV</td><td>Maximum Adaptive Volume \u2014 the sweet spot for optimal muscle growth</td></tr><tr><td style="font-weight:600;color:#f44336">MRV</td><td>Maximum Recoverable Volume \u2014 the ceiling before overtraining</td></tr></tbody></table><div class="etip"><strong>Progressive Overload:</strong> Start at MEV or slightly above. Add 1\u20132 sets per week as you adapt. If progress stalls for 2+ weeks, deload or increase toward MAV. Stay below MRV to avoid excessive fatigue.<br><br><strong>Rest Periods:</strong> 2\u20133 min for compound lifts (squat, bench, deadlift, row). 90\u2013120s for most isolation work. 60\u201390s for accessories.</div></div></div></div>';
    // User guide
    var gh='<div class="sec"><div class="st" style="color:#F4C93B">How to Use Your Training Tool</div><div class="gs"><span class="gn">1</span><div><strong>Set Up Your Profile</strong> \u2014 Select training age, goal, days per week, and recovery factor. Mark muscles as Focus (full volume) or Maintain (~half volume).</div></div><div class="gs"><span class="gn">2</span><div><strong>Choose Your Split</strong> \u2014 Browse available splits matching your schedule, or take the built-in quiz for a personalised recommendation.</div></div><div class="gs"><span class="gn">3</span><div><strong>Generate &amp; Save Program</strong> \u2014 Review your program with sets, rep ranges, and rest periods. Optionally configure a mesocycle plan with progression phases and deload scheduling.</div></div><div class="gs"><span class="gn">4</span><div><strong>Train Each Day</strong> \u2014 Log weights, reps, and RPE for every set. The dashboard shows pre-session readiness, deload reminders, and fatigue tracking.</div></div><div class="gs"><span class="gn">5</span><div><strong>Track Progress</strong> \u2014 Review volume compliance, personal records, e1RM charts, ACWR (acute:chronic workload ratio), and deload history on the History page.</div></div><div class="gs"><span class="gn">6</span><div><strong>Export &amp; Share</strong> \u2014 Save your program as PDF, or export/import your data as JSON for backup across devices.</div></div></div>';
    var w=window.open('','_blank','width=900,height=700');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Training Program \u2014 '+prog.splitName+'</title><style>'+
      '@page{margin:15mm 12mm}@media print{body{background:#14151A!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
      '*{margin:0;padding:0;box-sizing:border-box}'+
      'body{background:#14151A;color:#FAFAF8;font-family:"Inter","Segoe UI",Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px 24px}'+
      'h1{font-family:"Oswald","Impact",sans-serif;font-size:1.8rem;text-transform:uppercase;letter-spacing:2px;color:#FAFAF8;margin-bottom:4px}'+
      '.sb{font-size:.7rem;color:rgba(250,250,248,.3);margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(250,250,248,.05)}'+
      '.st{font-family:"Oswald",sans-serif;font-size:.95rem;text-transform:uppercase;letter-spacing:1.5px;margin:16px 0 8px;padding-bottom:3px;border-bottom:1px solid rgba(244,201,59,.15)}'+
      '.rp{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 12px}'+
      '.rp>div{flex:1;min-width:70px;background:rgba(20,21,26,.4);border-radius:6px;padding:7px 8px;text-align:center;border:1px solid rgba(250,250,248,.03)}'+
      '.rp .v{font-size:1rem;font-weight:700;color:#F4C93B}.rp .l{font-size:.48rem;text-transform:uppercase;letter-spacing:.5px;color:rgba(250,250,248,.2);margin-top:1px}'+
      'table{width:100%;border-collapse:collapse;margin:4px 0 8px}'+
      'th{text-align:left;font-size:.52rem;text-transform:uppercase;letter-spacing:1px;color:rgba(250,250,248,.25);padding:5px 6px 3px;border-bottom:1px solid rgba(250,250,248,.06);font-weight:500}'+
      'td{padding:4px 6px;font-size:.65rem;border-bottom:1px solid rgba(250,250,248,.02);color:rgba(250,250,248,.7)}'+
      '.c{text-align:center}.db{margin:8px 0 12px;background:rgba(20,21,26,.4);border-radius:8px;padding:8px 10px;border:1px solid rgba(250,250,248,.03)}'+
      '.dt{font-family:"Oswald",sans-serif;font-size:.8rem;text-transform:uppercase;letter-spacing:1px;color:#F4C93B;margin-bottom:4px}'+
      '.sec{margin:16px 0;page-break-inside:avoid}.ec{display:flex;flex-direction:column;gap:8px}'+
      '.ecard{background:rgba(20,21,26,.35);border-radius:8px;padding:8px 10px;border:1px solid rgba(250,250,248,.03)}'+
      '.ect{font-size:.65rem;font-weight:600;color:#FAFAF8;margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px}'+
      '.etip{font-size:.6rem;color:rgba(250,250,248,.45);margin-top:6px;line-height:1.4}'+
      '.gs{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;background:rgba(20,21,26,.25);border-radius:6px;margin-bottom:4px;border:1px solid rgba(250,250,248,.02)}'+
      '.gn{width:22px;height:22px;border-radius:50%;background:#F4C93B;color:#14151A;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
      '.gs div{font-size:.62rem;color:rgba(250,250,248,.6);line-height:1.4}.gs div strong{color:#FAFAF8}'+
      '.ft{text-align:center;margin-top:24px;padding-top:10px;border-top:1px solid rgba(250,250,248,.04);font-size:.55rem;color:rgba(250,250,248,.2)}'+
      '.ft a{color:rgba(244,201,59,.35);text-decoration:none}'+
      '</style></head><body>'+
      '<h1>Your Training Program</h1>'+
      '<div class="sb">'+dateF+' \u2014 '+prog.splitName+' \u2014 '+ta+' \u2014 '+goal+' \u2014 '+dd+' days/wk</div>'+
      '<div class="rp"><div><div class="v">'+prog.days.length+'</div><div class="l">Training Days</div></div>'+
      '<div><div class="v">'+prog.totalSets+'</div><div class="l">Weekly Sets</div></div>'+
      '<div><div class="v">'+prog.totalEx+'</div><div class="l">Exercises</div></div>'+
      '<div><div class="v" style="text-transform:capitalize;font-size:.8rem">'+rec+'</div><div class="l">Recovery</div></div></div>'+
      edu+
      '<div class="st" style="color:#F4C93B">Your Volume Targets</div>'+
      '<table><thead><tr><th>Muscle</th><th class="c">Priority</th><th class="c">MEV</th><th class="c">MAV</th><th class="c">MRV</th><th class="c">Target</th></tr></thead><tbody>'+vh+'</tbody></table>'+
      '<div class="st" style="color:#F4C93B">Your Split &amp; Exercises</div>'+ph+
      gh+
      '<div class="ft">Generated by Muscle OS Training Tool \u2014 <a href="https://wa.me/201040796017">Coach Anas Mo\'men</a></div>'+
      '<footer class="mos-footer"><div class="mos-footer-inner"><div class="mos-fbrand">ANAS MO\'MEN <span>COACHING</span></div><div class="mos-fnav"><a href="../index.html">Home</a><a href="../tools/">Tools</a><a href="../guides/">Guides</a><a href="../books/">Books</a></div><div class="mos-fsocial"><a href="https://wa.me/201040796017">WhatsApp</a><a href="https://instagram.com/anas_moamen1">Instagram</a></div></div><div class="mos-fcopy">muscleos.coach \u2014 Coach Anas Mo\'men</div></footer>'+
      '</body></html>');
    w.document.close();w.focus();setTimeout(function(){w.print();},500);
  });

