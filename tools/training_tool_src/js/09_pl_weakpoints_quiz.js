  // ── Weak Points Grid ──
  function renderWeakPoints(){
    var g=document.getElementById('weakGrid');if(!g)return;g.innerHTML='';
    WEAK_POINTS.forEach(function(w){
      var b=document.createElement('button');b.className='weak-chip';b.textContent=w.l;b.dataset.id=w.id;
      b.addEventListener('click',function(){this.classList.toggle('active');});
      g.appendChild(b);
    });
  }
  renderWeakPoints();

  // ── Goal toggle: show/hide powerlifting extras ──
  document.getElementById('goal').addEventListener('change',function(){
    var ex=document.getElementById('strengthExtras');
    if(!ex)return;
    ex.classList.toggle('show',this.value==='strength');
  });

  // ── Comp goal toggle: show/hide meet date ──
  document.getElementById('plComp').addEventListener('change',function(){
    document.getElementById('plMeetDate').style.display=this.value==='meet'?'block':'none';
  });

  // ── Powerlifting Profile ──
  function getPLProfile(){
    var g=document.getElementById('goal');
    if(g&&g.value!=='strength')return null;
    var weaks=[];(document.querySelectorAll('#weakGrid .weak-chip.active')||[]).forEach(function(c){weaks.push(c.dataset.id);});
    return{
      squat:parseFloat(document.getElementById('plSquat').value)||0,
      bench:parseFloat(document.getElementById('plBench').value)||0,
      deadlift:parseFloat(document.getElementById('plDeadlift').value)||0,
      bw:parseFloat(document.getElementById('plBW').value)||0,
      years:document.getElementById('plYears').value||'intermediate',
      weaks:weaks,
      comp:document.getElementById('plComp').value||'none',
      meetDate:document.getElementById('plMeetDate').value||null
    };
  }
  function savePLProfile(p){ss(K.PL,p);}

  // ── Periodization Engine ──
  function determinePeriodization(plProfile,age){
    if(!plProfile)return null;
    var yrs=plProfile.years||'intermediate',total=plProfile.squat+plProfile.bench+plProfile.deadlift;
    if(!total||total<30)return null;
    if(yrs==='novice')return{name:'Linear Progression',key:'linear',desc:_('split_add_weight'),cycle:1,note:_('split_add_weight')};
    if(total<500||yrs==='intermediate')return{name:'5/3/1 (Wave Periodization)',key:'531',desc:_('split_wave_periodization'),cycle:3,note:_('split_wave_periodization')};
    if(total<700)return{name:'DUP (Daily Undulating)',key:'dup',desc:_('split_dup'),cycle:1,note:_('split_dup')};
    return{name:'Block Periodization',key:'block',desc:_('split_advanced_periodization'),cycle:10,note:_('split_advanced_periodization')};
  }

  function mainLiftRPE(scheme,week,goal,dayName){
    if(!scheme)return {rpe:8,reps:8,desc:_('peri_standard_rpe_8')};
    if(scheme.key==='linear')return{rpe:8.5,reps:5,desc:_('peri_5x5')};
    if(scheme.key==='531'){
      var w=((week-1)%3)+1;
      if(dayName&&dayName.toLowerCase().indexOf('squ')>=0){
        if(w===1)return{rpe:6.5,reps:5,desc:_('peri_531_w')+' '+w+': '+_('peri_531_w1')};
        if(w===2)return{rpe:8,reps:3,desc:_('peri_531_w')+' '+w+': '+_('peri_531_w2')};
        return{rpe:9,reps:1,desc:_('peri_531_w')+' '+w+': '+_('peri_531_w3')};
      }
      if(w===1)return{rpe:6.5,reps:5,desc:_('peri_531_w1_4')};
      if(w===2)return{rpe:8,reps:3,desc:_('peri_531_w2_4')};
      return{rpe:9,reps:1,desc:_('peri_531_w3_4')};
    }
    if(scheme.key==='dup'){
      if(dayName&&dayName.toLowerCase().indexOf('heavy')>=0)return{rpe:8.5,reps:3,desc:_('peri_heavy')};
      if(dayName&&dayName.toLowerCase().indexOf('moderate')>=0)return{rpe:7.5,reps:5,desc:_('peri_moderate')};
      return{rpe:6.5,reps:8,desc:_('peri_light')};
    }
    if(scheme.key==='block'){
      var phase=((week-1)%10)+1;
      if(phase<=4)return{rpe:7,reps:8,desc:_('peri_accum')};
      if(phase<=8)return{rpe:8.5,reps:3,desc:_('peri_intensify')};
      if(phase<=9)return{rpe:9,reps:1,desc:_('peri_peak')};
      return{rpe:6,reps:5,desc:_('peri_deload_rpe')};
    }
    return{rpe:8,reps:8,desc:_('peri_standard_rpe_8')};
  }

  // ── Fatigue / Stress Ratio Scoring ──
  function defaultFatigue(){return{sleep:7,stress:5,doms:5,nutrition:7,cns:5};}
  function fatigueScore(f){if(!f)return{score:5,label:'UNCHECKED',color:'green',adjust:0};var s=(f.sleep+f.stress+f.doms+f.nutrition+f.cns)/5;f.stress=10-f.stress;var a=(10-s)/2;if(s>=7.5)return{score:s,label:'GREEN',color:'green',adjust:0};if(s>=5)return{score:s,label:'YELLOW',color:'yellow',adjust:-0.5};return{score:s,label:'RED',color:'red',adjust:-1};}
  function getTodayFatigue(){var fl=ls(K.FL,{});var td=new Date().toISOString().split('T')[0];return fl[td]||null;}
  function saveTodayFatigue(f){var fl=ls(K.FL,{});fl[new Date().toISOString().split('T')[0]]=f;ss(K.FL,fl);}

  // ── Cardio Logging ──
  function getCardioLogs(){return ls(K.CL,[]);}
  function saveCardioSession(s){var cl=getCardioLogs();cl.push(s);ss(K.CL,cl);}
  function weeklyCardio(){var cl=getCardioLogs(),wa=new Date(Date.now()-7*864e5).toISOString().split('T')[0];return cl.filter(function(x){return x.date>=wa}).reduce(function(a,x){a.minutes=(a.minutes||0)+(x.dur||0);a.sessions=(a.sessions||0)+1;if(!a.detail)a.detail={};a.detail[x.type]=(a.detail[x.type]||0)+(x.dur||0);return a;},{sessions:0,minutes:0,detail:{}});}
  function todayCardio(){var td=new Date().toISOString().split('T')[0],cl=getCardioLogs();return cl.filter(function(x){return x.date===td});}

  // ── Non-lifting session logging (P1: hybrid-athlete cross-modality load) ──
  var NONLIFT_MAX_DAYS=180;
  function getNonLiftLogs(){return ls(K.NL,[]);}
  function saveNonLiftSession(s){
    var nl=getNonLiftLogs();nl.push(s);
    var cutoff=new Date(Date.now()-NONLIFT_MAX_DAYS*864e5).toISOString().split('T')[0];
    nl=nl.filter(function(x){return x.date>=cutoff;});
    ss(K.NL,nl);
  }
  function weeklyNonLift(){var nl=getNonLiftLogs(),wa=new Date(Date.now()-7*864e5).toISOString().split('T')[0];return nl.filter(function(x){return x.date>=wa}).reduce(function(a,x){a.minutes=(a.minutes||0)+(x.dur||0);a.sessions=(a.sessions||0)+1;return a;},{sessions:0,minutes:0});}
  function todayNonLift(){var td=new Date().toISOString().split('T')[0],nl=getNonLiftLogs();return nl.filter(function(x){return x.date===td});}
  var NONLIFT_EFFORT={Low:3,Moderate:5,High:8};

  // ── Quiz ──
  const QUIZ = [
    {q:"How many days per week can you consistently train?",k:"days",o:[{v:"2",l:"2 days — tight schedule"},{v:"3",l:"3 days — moderate"},{v:"4",l:"4 days — good"},{v:"5",l:"5 days — strong"},{v:"6",l:"6 days — top priority"}]},
    {q:"What is your primary training goal?",k:"goal",o:[{v:"hypertrophy",l:"Hypertrophy — maximise muscle size"},{v:"strength",l:"Strength — maximise weight on the bar"},{v:"both",l:"Both — balanced growth"}]},
    {q:"How is your recovery capacity?",k:"recovery",o:[{v:"low",l:"Low — limited sleep, high stress"},{v:"moderate",l:"Moderate — adequate with good habits"},{v:"high",l:"High — sleep well, handle volume"}]},
    {q:"What is your training experience?",k:"exp",o:[{v:"novice",l:"Novice — less than 1 year"},{v:"intermediate",l:"Intermediate — 1-3 years"},{v:"advanced",l:"Advanced — 3+ years"}]},
    {q:"How consistent is your schedule?",k:"sched",o:[{v:"variable",l:"Variable — training times shift"},{v:"somewhat",l:"Somewhat — mostly similar weeks"},{v:"very",l:"Very — same time, same days"}]}
  ];

  function determineSplit(a){
    const d=parseInt(a.days||4),g=a.goal||'both',r=a.recovery||'moderate',e=a.exp||'intermediate',s=a.sched||'somewhat';
    // Strength/Powerlifting recommendations
    if(g==='strength'){
      if(d>=4){if(e==='advanced')return{name:'Block Periodization (4-Day)',key:'block_4',note:_('split_advanced_periodization')};return{name:'5/3/1 (4-Day)',key:'five_three_one_4',note:_('split_wave_periodization')};}
      if(d===3){if(e==='novice')return{name:'Linear Progression (3-Day)',key:'linear_3',note:_('split_add_weight')};return{name:'DUP (3-Day)',key:'dup_3',note:_('split_dup')};}
      if(d===2)return{name:'Upper/Lower (2-Day)',key:'upper_lower_2',note:_('split_strength_maintenance')};
      return{name:'5/3/1 (4-Day)',key:'five_three_one_4',note:_('split_try_531')};
    }
    if(d>=6){if(g==='both'||r==='high')return{name:'PPL + Arnold Hybrid (6-Day)',key:'ppl_arnold_6',note:_('split_ppl_arnold')};if(r==='low')return{name:'Upper/Lower 3x (6-Day)',key:'ul_3x_6',note:_('split_high_freq')};return{name:'PPL + Arnold Hybrid (6-Day)',key:'ppl_arnold_6',note:_('split_mix_compound')};}
    if(d===5){if(r==='high')return{name:'PPL + Upper/Lower (5-Day)',key:'ppl_ul_5',note:_('split_ppl_ul')};if(e==='advanced')return{name:'Arnold + Upper/Lower (5-Day)',key:'arnold_ul_5',note:_('split_arnold_ul')};if(g==='hypertrophy')return{name:'PPL + Torso/Limbs (5-Day)',key:'ppl_tl_5',note:_('split_torso_limbs')};return{name:'PPL + Upper/Lower (5-Day)',key:'ppl_ul_5',note:_('split_5day_hybrid')};}
    if(d===4){if(g==='both')return{name:'Upper/Lower (4-Day)',key:'upper_lower_4',note:_('split_industry_standard')};if(r==='low'||s==='variable')return{name:'Torso/Limbs (4-Day)',key:'torso_limbs_4',note:_('split_push_pull')};return{name:'Upper/Lower (4-Day)',key:'upper_lower_4',note:_('split_4day_popular')};}
    if(d===3){if(e==='novice'||r==='low')return{name:'Full Body (3-Day)',key:'fullbody_3',note:_('split_max_frequency')};return{name:'Full Body (3-Day)',key:'fullbody_3',note:_('split_full_body')};}
    if(d===2)return{name:'Upper/Lower (2-Day)',key:'upper_lower_2',note:_('split_2day')};
    return{name:'Full Body (2-Day)',key:'upper_lower_2',note:_('split_start_simple')};
  }

