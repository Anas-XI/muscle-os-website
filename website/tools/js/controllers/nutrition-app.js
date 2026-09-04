// Muscle OS — Metabolix Nutrition Engine Controller

(function(){
 const STORAGE_KEY = 'muscle_os_adaptive_tdee';

 // ─── Data model ───
 function emptyStore(){
 return {profile:null,dashboard:null,weights:[],adjustments:[],created:null};
 }

 function loadStore(){
 try{
 const raw = localStorage.getItem(STORAGE_KEY);
 if(raw){
 const d = JSON.parse(raw);
 if(d && typeof d === 'object') return {...emptyStore(), ...d};
 }
 }catch(e){}
 return emptyStore();
 }

 function saveStore(store){
 localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
 }

 // ─── Constants ───
 const OCC_MULT = {bed:0.05, desk:0.12, light:0.20, moderate:0.30, active:0.42};
 const STEP_CALS = [-60,0,70,160,260,360,480];
 const SLEEP_FACTOR = {poor:.95, fair:.98, good:1.0, excellent:1.02};
 const CHRONIC_ADJUST = {no:1.0, yes:0.92};
 const CYCLE_ADJUST = {menstrual:1.0, follicular:1.0, ovulation:1.02, luteal:1.07};

 const PROTEIN_TARGETS = {
 omnivore: {aggressive_loss:2.3, moderate_loss:2.0, recomp:2.0, maintenance:1.8, lean_gain:1.8, aggressive_gain:1.6},
 vegetarian: {aggressive_loss:2.6, moderate_loss:2.3, recomp:2.3, maintenance:2.1, lean_gain:2.1, aggressive_gain:1.9},
 vegan: {aggressive_loss:2.7, moderate_loss:2.4, recomp:2.4, maintenance:2.2, lean_gain:2.2, aggressive_gain:2.0},
 other: {aggressive_loss:2.3, moderate_loss:2.0, recomp:2.0, maintenance:1.8, lean_gain:1.8, aggressive_gain:1.6}
 };

 const GOAL_MULT = {
 aggressive_loss:0.75, moderate_loss:0.80, recomp:0.95,
 maintenance:1.0, lean_gain:1.05, aggressive_gain:1.15
 };

 const GOAL_LABELS = {
 aggressive_loss:'Aggressive Fat Loss', moderate_loss:'Moderate Fat Loss',
 recomp:'Recomp', maintenance:'Maintenance',
 lean_gain:'Lean Gain', aggressive_gain:'Aggressive Muscle Gain'
 };

 const TRAIN_MET = {novice:{rt:4.0,min:30,max:60},intermediate:{rt:5.0,min:30,max:75},advanced:{rt:5.5,min:45,max:90}};

 // ─── Calculation Engine ───
 function calcBMR(sex, w, h, a, bf){
 if(bf && parseFloat(bf)>0){
 const lbm = w*(1-parseFloat(bf)/100);
 return {value:Math.round(370+21.6*lbm), method:'Katch-McArdle'};
 }
 const bmr = sex==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
 return {value:Math.round(bmr), method:'Mifflin-St Jeor'};
 }

 function calcTDEE(sex, w, h, a, bf, trainingAge, trainDays, sessionLen, occ, stepsIdx, sleep, dietPattern, goalVal, chronicDiet, cyclePhase){
 const bmr = calcBMR(sex, w, h, a, bf);
 const sleepF = SLEEP_FACTOR[sleep] || 1;
 const chronicF = CHRONIC_ADJUST[chronicDiet] || 1;
 const cycleF = (sex==='female' && cyclePhase) ? (CYCLE_ADJUST[cyclePhase]||1) : 1;

 // Occupation NEAT
 const occMult = OCC_MULT[occ] || 0.12;
 const neatOcc = Math.round(bmr.value * occMult);
 const stepsCals = Math.round(STEP_CALS[parseInt(stepsIdx)] || 0);
 const neatTotal = neatOcc + stepsCals;

 // Exercise EAT
 const trainMet = TRAIN_MET[trainingAge] || TRAIN_MET.intermediate;
 const eatPerSession = trainMet.rt * 3.5 * w / 200 * sessionLen;
 const eatWeekly = Math.round(eatPerSession * trainDays);
 const dailyEat = Math.round(eatWeekly / 7);

 // Baseline
 const rawBaseline = bmr.value + neatTotal;
 const baselineAdj = Math.round(rawBaseline * sleepF * chronicF * cycleF);
 const bioAdj = Math.round(rawBaseline * (sleepF * chronicF * cycleF - 1));

 // TDEE
 const tdee = baselineAdj + dailyEat;

 // Goal
 const goalMult = GOAL_MULT[goalVal] || 1;
 let goalCal = Math.round(tdee * goalMult);

 // Safety cap based on BF%
 let capApplied = false;
 if(bf && parseFloat(bf)>0){
 const bfPct = parseFloat(bf);
 if(goalVal === 'aggressive_loss' && bfPct < 15){
 goalCal = Math.round(tdee * 0.85);
 capApplied = true;
 }
 if(goalVal === 'recomp' && bfPct < 10 && trainingAge !== 'novice'){
 goalCal = Math.round(tdee * 1.03);
 capApplied = true;
 }
 if(goalVal === 'aggressive_gain' && bfPct > 25){
 goalCal = Math.round(tdee * 1.08);
 capApplied = true;
 }
 }

 // Macros
   // Muscle OS Decision Engine — protein override (SH-NU-01 / BB-NU-01)
  let engProteinMult = null;
  try{
   if(typeof DecisionEngine !== 'undefined' && DecisionEngine.isLoaded){
    const engGoal = (goalVal === 'aggressive_loss' || goalVal === 'moderate_loss') ? 'cut'
      : (goalVal === 'aggressive_gain' || goalVal === 'moderate_gain') ? 'bulk' : 'maintain';
    const engYrs = (trainingAge === 'novice') ? 1 : (trainingAge === 'advanced' ? 5 : 2);
    const engRecs = DecisionEngine.applyBookRulesSync({goal: engGoal, experience_years: engYrs, age: a, sex: sex, bodyweight_kg: w, height_cm: h});
    if(engRecs && engRecs.protein_per_kg) engProteinMult = engRecs.protein_per_kg;
   }
  }catch(e){}
  const proteinG = (engProteinMult || (PROTEIN_TARGETS[dietPattern] ? PROTEIN_TARGETS[dietPattern][goalVal] || 1.8 : 1.8));
 const pG = Math.round(proteinG * w);

 const isFL = goalVal==='aggressive_loss'||goalVal==='moderate_loss';
 const fatMin = isFL ? 0.6 : 0.8;
 const fatPct = isFL ? 0.20 : 0.25;
 const fG = Math.round(Math.max(fatMin * w, goalCal * fatPct / 9));

 const cCal = goalCal - (pG*4) - (fG*9);
 const cG = Math.round(Math.max(0, cCal/4));

 return {
 bmr: bmr.value,
 bmrMethod: bmr.method,
 neat: neatTotal,
 eat: dailyEat,
 bioAdj: bioAdj,
 tdee: tdee,
 goalCal: goalCal,
 protein: pG,
 fat: fG,
 carbs: cG,
 pctProtein: Math.round(pG*4/goalCal*100),
 pctFat: Math.round(fG*9/goalCal*100),
 pctCarbs: Math.round(cG*4/goalCal*100),
 safetyCapped: capApplied
 };
 }

 // ─── Recalibration ───
 function calcWeightTrend(weights){
 if(!weights || weights.length < 5) return null;
 const sorted = [...weights].sort((a,b)=>new Date(a.date)-new Date(b.date));
 const recent = sorted.slice(-14); // last 14 entries max
 if(recent.length < 5) return null;

 // Simple linear regression: weight ~ day
 const n = recent.length;
 const indices = recent.map((_,i)=>i);
 const vals = recent.map(e=>e.weight);

 const sumX = indices.reduce((s,x)=>s+x,0);
 const sumY = vals.reduce((s,y)=>s+y,0);
 const sumXY = indices.reduce((s,x,i)=>s+x*vals[i],0);
 const sumX2 = indices.reduce((s,x)=>s+x*x,0);

 const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
 // slope = kg per entry (approximately kg per day if logging ~daily)

 const avgInterval = recent.length>1 ? (new Date(recent[recent.length-1].date)-new Date(recent[0].date))/(recent.length-1)/86400000 : 1;
 const dailyTrend = slope / Math.max(avgInterval, 0.5);

 return {
 dailyTrend: dailyTrend, // kg/day, negative = losing
 weeklyTrend: dailyTrend * 7,
 slope: slope,
 avgInterval: avgInterval,
 direction: dailyTrend < -0.01 ? 'losing' : (dailyTrend > 0.01 ? 'gaining' : 'stable'),
 confidence: recent.length >= 10 ? 'high' : (recent.length >= 7 ? 'moderate' : 'low')
 };
 }

 function recalibrate(store){
 const p = store.profile;
 if(!p) return null;
 const trend = calcWeightTrend(store.weights);
 if(!trend) return null;

 // Current TDEE
 const r = calcTDEE(p.sex,p.weight,p.height,p.age,p.bf,p.trainingAge,
 p.trainDays,p.sessionLen,p.occupation,p.steps,p.sleep,p.dietPattern,
 p.goal,p.chronicDiet,p.cyclePhase);

 // If trend is stable (±100g/week), no adjustment needed
 if(Math.abs(trend.weeklyTrend) < 0.1){
 return {adjusted:false, reason:'Your weight is stable — your current target appears accurate.', trend:trend, results:r};
 }

 // Estimate implied actual TDEE from weight trend
 // 1 kg ≈ 7700 kcal
 const kcalPerKg = 7700;
 const dailySurplusDeficit = trend.dailyTrend * kcalPerKg;
 const impliedTDEE = Math.round(r.goalCal - dailySurplusDeficit);

 // Only adjust if implied differs by more than 150 kcal (filters noise)
 const diff = impliedTDEE - r.tdee;
 if(Math.abs(diff) < 150){
 return {adjusted:false, reason:'Weight trend is within the normal fluctuation range. No adjustment needed yet. Keep logging.', trend:trend, results:r};
 }

 // Calculate new target
 const goalMult = GOAL_MULT[p.goal] || 1;
 let newTarget = Math.round(impliedTDEE * goalMult);

 // Safety cap (same rules as initial calc)
 if(p.bf && parseFloat(p.bf)>0){
 const bfPct = parseFloat(p.bf);
 if(p.goal==='aggressive_loss' && bfPct<15) newTarget = Math.round(impliedTDEE*0.85);
 if(p.goal==='recomp' && bfPct<10 && p.trainingAge!=='novice') newTarget = Math.round(impliedTDEE*1.03);
 if(p.goal==='aggressive_gain' && bfPct>25) newTarget = Math.round(impliedTDEE*1.08);
 }

 // Adjust macros for new target
 const proteinG = PROTEIN_TARGETS[p.dietPattern] ? PROTEIN_TARGETS[p.dietPattern][p.goal] || 1.8 : 1.8;
 const pG = Math.round(proteinG * p.weight);
 const isFL = p.goal==='aggressive_loss'||p.goal==='moderate_loss';
 const fG = Math.round(Math.max((isFL?0.6:0.8)*p.weight, newTarget*(isFL?0.20:0.25)/9));
 const cCal = newTarget - (pG*4) - (fG*9);
 const cG = Math.round(Math.max(0, cCal/4));

 return {
 adjusted:true,
 oldCal: r,
 newCal: {
 tdee: impliedTDEE,
 goalCal: newTarget,
 protein: pG,
 fat: fG,
 carbs: cG,
 pctProtein: Math.round(pG*4/newTarget*100),
 pctFat: Math.round(fG*9/newTarget*100),
 pctCarbs: Math.round(cG*4/newTarget*100)
 },
 diff: diff,
 reason: buildAdjustReason(trend, r, impliedTDEE, diff, p),
 trend: trend,
 results: r
 };
 }

 function buildAdjustReason(trend, r, impliedTDEE, diff, p){
 const dir = trend.direction === 'losing' ? 'losing' : 'gaining';
 const rate = Math.abs(trend.weeklyTrend).toFixed(2);
 const expectedRate = p.goal==='aggressive_loss' ? '0.7-1.0%' : (p.goal==='moderate_loss' ? '0.5-0.7%' : (p.goal==='lean_gain'||p.goal==='aggressive_gain' ? '0.5-1.5% per month' : 'stable'));

 let lines = [];
 lines.push('Based on your logged weight trend over the last 2 weeks:');
 lines.push('');
 lines.push('• Actual trend: '+dir+' ~'+rate+' kg/week');
 lines.push('• Expected for your goal ('+GOAL_LABELS[p.goal]+'): ~'+expectedRate);

 if(Math.abs(diff) >= 150){
 const adjDir = diff > 0 ? 'higher' : 'lower';
 lines.push('');
 lines.push('Your actual weight change suggests your true maintenance is ~'+Math.abs(Math.round(diff/50)*50)+' kcal '+adjDir+' than the initial estimate.');
 lines.push('Adjusting your target by ~'+Math.abs(Math.round((impliedTDEE-r.tdee)*GOAL_MULT[p.goal]/50)*50)+' kcal/day.');
 lines.push('');
 lines.push('This is normal — no formula is perfect for everyone. Real data always beats a static calculation.');
 } else {
 lines.push('');
 lines.push('Your trend is close to the expected range. No adjustment needed this cycle.');
 }

 if(trend.confidence === 'low'){
 lines.push('');
 lines.push('Note: This adjustment is based on limited data ('+store.weights.length+' entries over '+
 Math.round(trend.avgInterval*store.weights.length)+' days). Log 3-5x/week for higher confidence.');
 }

 return lines.join('\n');
 }

 // ─── UI ───
 let store = loadStore();
 let selectedSex = null;

 function sexInit(){
 document.querySelectorAll('.sex-btn').forEach(b=>{
 b.addEventListener('click',function(){
 document.querySelectorAll('.sex-btn').forEach(x=>x.classList.remove('active'));
 this.classList.add('active'); selectedSex=this.dataset.sex;
 document.getElementById('cycleGroup').style.display=selectedSex==='female'?'block':'none';
 });
 });
 }

 function showTab(container, tabId){
 container.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
 container.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
 const content = document.getElementById(tabId);
 if(content) content.classList.add('active');
 container.querySelectorAll('.tab[data-tab="'+tabId+'"]').forEach(t=>t.classList.add('active'));
 }

 function renderDashboard(){
 const p = store.profile;
 if(!p) return;
 const r = calcTDEE(p.sex, p.weight, p.height, p.age, p.bf, p.trainingAge,
 p.trainDays, p.sessionLen, p.occupation, p.steps, p.sleep, p.dietPattern,
 p.goal, p.chronicDiet, p.cyclePhase);

 const trend = calcWeightTrend(store.weights);
 let adjustment = null;
 if(trend && store.weights.length >= 5){
 adjustment = recalibrate(store);
 }

 // Status banner
 const statusEl = document.getElementById('dashStatus');
 let statusHtml = '';
 if(adjustment && adjustment.adjusted){
 statusHtml = '<div class="status-banner status-adjust animate-in"><strong><span class="s-icon">&#9888;</span> Adjustment Suggested</strong><br>'+adjustment.reason.replace(/\n/g,'<br>')+'</div>';
 // Auto-save adjustment
 if(!store.adjustments.some(a=>Math.abs(new Date()-new Date(a.date))<86400000)){
 store.adjustments.push({
 date: new Date().toISOString(),
 oldTDEE: r.tdee,
 newTDEE: adjustment.newCal.tdee,
 oldGoal: r.goalCal,
 newGoal: adjustment.newCal.goalCal,
 reason: adjustment.reason.split('\n')[4] || 'Adjusted based on weight trend'
 });
 saveStore(store);
 }
 } else if(trend && trend.confidence === 'low'){
 statusHtml = '<div class="status-banner status-warn animate-in"><strong>Building Accuracy</strong><br>You have '+store.weights.length+' weight entries. Log 3-5x per week. First recalibration triggers after ~2 weeks of data (minimum 5 entries).</div>';
 } else if(trend && Math.abs(trend.weeklyTrend) < 0.15){
 statusHtml = '<div class="status-banner status-ok animate-in"><strong>On Track</strong><br>Your weight is stable or moving as expected at '+Math.abs(trend.weeklyTrend).toFixed(2)+' kg/week. No adjustment needed.</div>';
 } else if(trend){
 statusHtml = '<div class="status-banner status-ok animate-in"><strong>Tracking Active</strong><br>'+trend.direction+' at '+Math.abs(trend.weeklyTrend).toFixed(2)+' kg/week over '+store.weights.length+' entries.</div>';
 } else {
 statusHtml = '<div class="status-banner status-warn animate-in"><strong>Start Logging</strong><br>Log your weight 3-5x/week in the "Log Weight" tab. After ~2 weeks, the engine will recalibrate your numbers from real data.</div>';
 }
 statusEl.innerHTML = statusHtml;

 // Numbers tab
 const targetCal = (adjustment && adjustment.adjusted) ? adjustment.newCal.goalCal : r.goalCal;
 const targetTDEE = (adjustment && adjustment.adjusted) ? adjustment.newCal.tdee : r.tdee;
 const protein = (adjustment && adjustment.adjusted) ? adjustment.newCal.protein : r.protein;
 const fat = (adjustment && adjustment.adjusted) ? adjustment.newCal.fat : r.fat;
 const carbs = (adjustment && adjustment.adjusted) ? adjustment.newCal.carbs : r.carbs;
 const pP = (adjustment && adjustment.adjusted) ? adjustment.newCal.pctProtein : r.pctProtein;
 const fP = (adjustment && adjustment.adjusted) ? adjustment.newCal.pctFat : r.pctFat;
 const cP = (adjustment && adjustment.adjusted) ? adjustment.newCal.pctCarbs : r.pctCarbs;

 let numbersHtml = '<div class="dash-grid">' +
 '<div class="dash-card"><div class="dash-label">Goal Calories</div><div class="dash-val">'+targetCal.toLocaleString()+'</div><div class="dash-sub">kcal/day</div></div>' +
 '<div class="dash-card"><div class="dash-label">Estimated TDEE</div><div class="dash-val">'+targetTDEE+'</div><div class="dash-sub">'+r.bmrMethod+'</div></div>' +
 '</div>';

   // Decision Engine — Coach Intelligence card
  try{
   if(typeof DecisionEngine !== 'undefined' && DecisionEngine.isLoaded){
    const engGoal2 = (p.goal === 'aggressive_loss' || p.goal === 'moderate_loss') ? 'cut'
      : (p.goal === 'aggressive_gain' || p.goal === 'moderate_gain') ? 'bulk' : 'maintain';
    const engYrs2 = (p.trainingAge === 'novice') ? 1 : (p.trainingAge === 'advanced' ? 5 : 2);
    const eR = DecisionEngine.applyBookRulesSync({goal: engGoal2, experience_years: engYrs2, age: p.age, sex: p.sex, bodyweight_kg: p.weight, height_cm: p.height});
    if(eR){
     const eNotes = (eR.program_notes || []).concat(eR.nutrition_notes || []);
     if(eR.protein_per_kg || eNotes.length){
      numbersHtml += '<div class="engine-recs-card"><div class="ec-header">&#10003; Coach Intelligence</div><div class="ec-sub">Evidence-based adjustments from the Muscle OS Decision Engine (Schoenfeld, Nippard, NSCA, ACE, IPTA)</div>'+
       (eR.protein_per_kg ? '<span class="engine-rule-chip">Protein '+eR.protein_per_kg.toFixed(1)+' g/kg</span>' : '') +
       (eR.rep_range ? '<span class="engine-rule-chip">Rep Range '+eR.rep_range+'</span>' : '') +
       eNotes.map(function(n){return '<div class="engine-note">&#8226; '+n+'</div>';}).join('') +
       '</div>';
     }
    }
   }
  }catch(e){}

numbersHtml += '<div class="dash-macro-grid">' +
 '<div class="dash-macro"><div class="dash-macro-val">'+protein+'</div><div class="dash-macro-lbl">Protein (g)</div></div>' +
 '<div class="dash-macro"><div class="dash-macro-val">'+fat+'</div><div class="dash-macro-lbl">Fat (g)</div></div>' +
 '<div class="dash-macro"><div class="dash-macro-val">'+carbs+'</div><div class="dash-macro-lbl">Carbs (g)</div></div>' +
 '</div>';

 numbersHtml += '<div class="bar-track">' +
 '<div class="bar-seg bar-p" style="width:'+pP+'%">'+pP+'%</div>' +
 '<div class="bar-seg bar-f" style="width:'+fP+'%">'+fP+'%</div>' +
 '<div class="bar-seg bar-c" style="width:'+cP+'%">'+cP+'%</div>' +
 '</div>' +
 '<div class="bar-legend">' +
 '<span class="bar-leg-item"><span class="bar-dot" style="background:#F4C93B"></span>Protein</span>' +
 '<span class="bar-leg-item"><span class="bar-dot" style="background:#e8a83a"></span>Fat</span>' +
 '<span class="bar-leg-item"><span class="bar-dot" style="background:#c48a30"></span>Carbs</span>' +
 '</div>';

 // Detailed breakdown
 numbersHtml += '<div class="section-header" style="margin-top:10px">Breakdown</div>' +
 '<div class="dash-row"><span class="l">BMR ('+r.bmrMethod+')</span><span class="v">'+r.bmr.toLocaleString()+' kcal</span></div>' +
 '<div class="dash-row"><span class="l">NEAT (occupation + steps)</span><span class="v">'+r.neat+' kcal</span></div>' +
 '<div class="dash-row"><span class="l">EAT (training)</span><span class="v">'+r.eat+' kcal</span></div>' +
 '<div class="dash-row"><span class="l">Bio adjustment</span><span class="v">'+(r.bioAdj>=0?'+':'')+r.bioAdj+' kcal</span></div>';

 if(r.safetyCapped){
 numbersHtml += '<div class="dash-row"><span class="l">Safety cap (BF% too low for this goal)</span><span class="v" style="color:#F4C93B">Active</span></div>';
 }

 const cycleLabel = p.cyclePhase === 'luteal' ? ' (luteal +7%)' : '';
 numbersHtml += '<div class="dash-row"><span class="l">Goal adjustment'+cycleLabel+'</span><span class="v">'+GOAL_LABELS[p.goal]+'</span></div>';

 // Rationale
 const allGood = !(adjustment && adjustment.adjusted);
 numbersHtml += '<div class="rationale"><div class="r-title">Why These Numbers?</div>' +
 '<strong>'+(allGood ? 'Initial estimate based on your profile' : 'Adjusted from real data')+'</strong><br>' +
 'Your BMR was calculated using <strong>'+r.bmrMethod+'</strong> ' +
 (r.bmrMethod==='Katch-McArdle' ? 'because you provided body fat % (most accurate method).' : '(standard formula, ~200-300 kcal uncertainty without body fat %).') +
 '<br>Activity estimated from: <strong>'+p.occupation+'</strong> occupation + <strong>'+p.steps+'</strong> steps range + <strong>'+p.trainDays+''+p.sessionLen+'min</strong> training.' +
 '<br>Goal: <strong>'+GOAL_LABELS[p.goal]+'</strong> — applying <strong>'+(GOAL_MULT[p.goal]>1?'+'+(Math.round((GOAL_MULT[p.goal]-1)*100)):(Math.round((1-GOAL_MULT[p.goal])*100)))+'%</strong> adjustment from estimated TDEE.' +
 (p.chronicDiet==='yes' ? '<br>Chronic dieting flag applied: <strong>-8% metabolic adaptation adjustment</strong>.' : '') +
 (p.cyclePhase==='luteal' ? '<br>Luteal phase applied: <strong>+7% REE adjustment</strong>.' : '') +
 (r.safetyCapped ? '<br><strong>Safety cap:</strong> Your goal was adjusted because aggressive targets are not appropriate at your current body fat level.' : '') +
 '</div>';

 document.getElementById('dash-numbers').innerHTML = numbersHtml;

 // Weight tab in dashboard
 document.getElementById('dash-weight').innerHTML = renderWeightTab();

 // History tab in dashboard
 document.getElementById('dash-history').innerHTML = renderHistory();

 // Food Log tab in dashboard
 renderFoodTab();

 // Edit tab
 document.getElementById('dash-edit').innerHTML = '<div class="section-header">Edit Profile</div><p style="font-size:.72rem;color:rgba(250,250,248,.7);margin-bottom:12px;line-height:1.5;">Changing your profile will reset the recalibration cycle (current weight log is preserved).</p><button class="btn-secondary" id="backToProfile">Edit Profile Settings</button><div style="margin-top:14px;border-top:1px solid rgba(250,250,248,.06);padding-top:14px"><div class="section-header" style="margin-top:0">Data Management</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-secondary" id="exportTdeeBtn" style="flex:1;text-align:center">⬇ Export JSON</button><button class="btn-secondary" id="importTdeeBtn" style="flex:1;text-align:center">⬆ Import JSON</button><button class="btn-secondary" onclick="copyBackupToClipboard()" style="flex:1;text-align:center;color:#F4C93B"> Copy Backup Code</button><button class="btn-secondary" onclick="pasteBackupFromClipboard()" style="flex:1;text-align:center;color:#F4C93B"> Paste Backup Code</button></div></div><input type="file" id="tdeeImportInput" accept=".json" style="display:none">';
 document.getElementById('backToProfile').addEventListener('click', function(){
 document.getElementById('dashboardView').style.display = 'none';
 document.getElementById('profileView').style.display = 'block';
 document.getElementById('welcomeCard').style.display = 'none';
 document.getElementById('profileFormCard').style.display = 'block';
 populateProfileForm(store.profile);
 });
 document.getElementById('exportTdeeBtn').addEventListener('click', exportTdeeData);
 document.getElementById('importTdeeBtn').addEventListener('click', function(){ document.getElementById('tdeeImportInput').click(); });
 document.getElementById('tdeeImportInput').addEventListener('change', function(){
 if(this.files && this.files[0]) importTdeeData(this.files[0]);
 this.value = '';
 });

 document.getElementById('dashboardView').style.display = 'block';
 document.getElementById('profileView').style.display = 'none';
 syncOmniHub();
 }

 function syncOmniHub() {
   if (window.parent !== window && window.store && store.profile) {
     try {
       const p = store.profile;
       const r = calcTDEE(p.sex, p.w, p.h, p.a, p.bf, p.trainingAge, p.trainDays, p.sessionLen, p.occupation, p.steps, p.sleep, p.dietPattern, p.goal, p.chronicDiet, p.cyclePhase);
       let tdeeGoal = r.tdeeGoal;
       let adjustment = null;
       if (store.adjustments && store.adjustments.length > 0) {
         adjustment = store.adjustments[store.adjustments.length - 1];
         if (adjustment.adjusted) {
           tdeeGoal = Math.round(tdeeGoal * (1 + adjustment.factor));
         }
       }
       const t = calcTargets(tdeeGoal, p.goal);
       window.parent.postMessage({
         type: 'OMNI_SYNC_N',
         payload: {
           tdee: tdeeGoal,
           protein: t.p,
           carbs: t.c,
           fats: t.f
         }
       }, '*');
     } catch(e) {}
   }
 }

 function renderWeightTab(){
 let html = '<div class="weight-input-row">' +
 '<input type="number" id="dashWeightInput" step="0.1" placeholder="Enter weight (kg)">' +
 '<button id="dashLogBtn">Log</button></div>' +
 '<div class="section-header">Recent Entries</div><div class="weight-log" id="dashWeightLog"></div>';

 // Defer rendering after DOM insert
 return html;
 }

 function renderHistory(){
 if(!store.adjustments || store.adjustments.length === 0){
 return '<div class="section-header">Adjustment History</div><p style="font-size:.78rem;color:rgba(250,250,248,.65);text-align:center;padding:20px 0">No adjustments yet. Keep logging weight for 2+ weeks.</p>';
 }
 let html = '<div class="section-header">Adjustment History</div>';
 [...store.adjustments].reverse().forEach(a => {
 const diff = a.newGoal - a.oldGoal;
 const cls = diff > 0 ? 'hist-up' : 'hist-down';
 const sign = diff > 0 ? '+' : '';
 const d = new Date(a.date);
 html += '<div class="hist-entry">' +
 '<div class="h-date">'+d.toLocaleDateString()+'</div>' +
 '<div class="h-reason">'+a.reason+'</div>' +
 '<div class="h-change '+cls+'">'+a.oldGoal+' &rarr; '+a.newGoal+' kcal ('+sign+diff+')</div></div>';
 });
 return html;
 }

 function renderWeightEntries(){
 const containers = ['weightLog', 'dashWeightLog'];
 containers.forEach(id => {
 const el = document.getElementById(id);
 if(!el) return;
 if(!store.weights || store.weights.length === 0){
 el.innerHTML = '<p style="font-size:.72rem;color:rgba(250,250,248,.2);text-align:center;padding:14px 0">No entries yet. Log your weight above.</p>';
 return;
 }
 const sorted = [...store.weights].sort((a,b)=>new Date(b.date)-new Date(a.date));
 el.innerHTML = sorted.slice(0,20).map(e =>
 '<div class="weight-entry"><span class="d">'+new Date(e.date).toLocaleDateString()+'</span><span class="w">'+e.weight.toFixed(1)+' kg</span></div>'
 ).join('');
 });
 }

 function logWeight(val){
 if(isNaN(val) || val <= 0) return;
 store.weights.push({date:new Date().toISOString().split('T')[0], weight:Math.round(val*10)/10});
 saveStore(store);
 renderWeightEntries();
 if(document.getElementById('dashboardView').style.display !== 'none'){
 const dashEl = document.getElementById('dashStatus');
 if(dashEl){
 const trend = calcWeightTrend(store.weights);
 dashEl.innerHTML = '<div class="status-banner status-ok animate-in"><strong>Weight Logged</strong><br>'+(trend?'Current trend: '+trend.direction+' at '+Math.abs(trend.weeklyTrend).toFixed(2)+' kg/week ('+store.weights.length+' entries).':'You have '+store.weights.length+' entries. Keep logging!')+'</div>';
 }
 }
 }

 function updateWelcomeCard(){
 const welcomeCard = document.getElementById('welcomeCard');
 const profileFormCard = document.getElementById('profileFormCard');
 if(!welcomeCard || !profileFormCard) return;

 if(store.profile){
 const p = store.profile;
 const userNameEl = document.getElementById('welcomeUserName');
 const greetingTitle = document.getElementById('welcomeTitleText');
 const hour = new Date().getHours();
 let greeting = ' WELCOME BACK';
 if(hour >= 5 && hour < 12) greeting = '☀ GOOD MORNING';
 else if(hour >= 12 && hour < 17) greeting = ' GOOD AFTERNOON';
 else if(hour >= 17 && hour < 22) greeting = ' GOOD EVENING';
 else greeting = ' NIGHT SHIFT ACTIVE';

 if(greetingTitle) greetingTitle.innerHTML = `${greeting}, <span id="welcomeUserName">${(p.name || 'ATHLETE').toUpperCase()}</span>!`;

 const badgeEl = document.getElementById('welcomeBadge');
 const nowStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
 if(badgeEl) badgeEl.innerHTML = `<span class="pulse-dot"></span> METABOLIC MATRIX ACTIVE // LIVE SYNC [${nowStr}]`;

 const statsGrid = document.getElementById('welcomeStatsGrid');
 const sortedW = (store.weights && store.weights.length > 0) 
 ? [...store.weights].sort((a,b)=>new Date(b.date)-new Date(a.date))
 : [];
 const latestW = sortedW.length > 0 ? sortedW[0].weight : p.weight;
 const initialW = p.weight;
 const diffW = (latestW - initialW).toFixed(1);
 const diffStr = diffW > 0 ? `(+${diffW} kg)` : diffW < 0 ? `(${diffW} kg)` : `(Baseline)`;

 const r = calcTDEE(p.sex, latestW, p.height, p.age, p.bf, p.trainingAge,
 p.trainDays, p.sessionLen, p.occupation, p.steps, p.sleep, p.dietPattern,
 p.goal, p.chronicDiet, p.cyclePhase);
 const recalibCount = (store.adjustments && store.adjustments.length) || 0;
 const loggedDaysCount = sortedW.length;

 const chronotype = localStorage.getItem('mos_chronotype') || 'early_lark';
 const chronotypeStr = chronotype === 'early_lark' ? 'Early Lark (Morning GLUT4)' : 'Night Owl (Evening GLUT4)';

 statsGrid.innerHTML = `
 <div class="welcome-stat-item">
 <div class="welcome-stat-lbl">Target Caloric Intake</div>
 <div class="welcome-stat-val" style="color:#F4C93B">${Math.round(r.goalCal)} kcal/day</div>
 <div class="welcome-stat-sub">TDEE Baseline: ${Math.round(r.tdee)} kcal</div>
 </div>
 <div class="welcome-stat-item">
 <div class="welcome-stat-lbl">Active Goal &amp; Chronotype</div>
 <div class="welcome-stat-val">${GOAL_LABELS[p.goal] || p.goal}</div>
 <div class="welcome-stat-sub">${chronotypeStr}</div>
 </div>
 <div class="welcome-stat-item">
 <div class="welcome-stat-lbl">Current Bodyweight</div>
 <div class="welcome-stat-val">${latestW} kg</div>
 <div class="welcome-stat-sub">Initial Delta: ${diffStr}</div>
 </div>
 <div class="welcome-stat-item">
 <div class="welcome-stat-lbl">Adherence &amp; Engine Status</div>
 <div class="welcome-stat-val" style="color:#4CAF50">${loggedDaysCount} Days Logged</div>
 <div class="welcome-stat-sub">${recalibCount} Active Recalibrations</div>
 </div>
 `;

 welcomeCard.style.display = 'block';
 profileFormCard.style.display = 'none';
 } else {
 welcomeCard.style.display = 'none';
 profileFormCard.style.display = 'block';
 }
 }

 function populateProfileForm(p){
 if(!p) return;
 if(p.sex){
 selectedSex = p.sex;
 document.querySelectorAll('.sex-btn').forEach(b => {
 b.classList.toggle('active', b.dataset.sex === p.sex);
 });
 if(p.sex === 'female'){
 document.getElementById('cycleGroup').style.display = 'block';
 } else {
 document.getElementById('cycleGroup').style.display = 'none';
 }
 }
 if(p.weight) document.getElementById('weight').value = p.weight;
 if(p.height) document.getElementById('height').value = p.height;
 if(p.age) document.getElementById('age').value = p.age;
 if(p.bf !== undefined) document.getElementById('bf').value = p.bf;
 if(p.trainingAge) document.getElementById('trainingAge').value = p.trainingAge;
 if(p.trainDays !== undefined) document.getElementById('trainDays').value = p.trainDays;
 if(p.sessionLen !== undefined) document.getElementById('sessionLen').value = p.sessionLen;
 if(p.occupation) document.getElementById('occupation').value = p.occupation;
 if(p.steps !== undefined) document.getElementById('steps').value = p.steps;
 if(p.sleep) document.getElementById('sleep').value = p.sleep;
 if(p.dietPattern) document.getElementById('dietPattern').value = p.dietPattern;
 if(p.chronicDiet) document.getElementById('chronicDiet').value = p.chronicDiet;
 if(p.cycleRegular) document.getElementById('cycleRegular').value = p.cycleRegular;
 if(p.cyclePhase) document.getElementById('cyclePhase').value = p.cyclePhase;
 if(p.goal) document.getElementById('goal').value = p.goal;
 }

 // ─── Initialize ───
 sexInit();

 // Show female-cycle group only if female selected
 document.getElementById('cycleGroup').style.display = 'none';

 // Setup welcome screen if profile exists
 updateWelcomeCard();

 document.getElementById('welcomeResumeBtn').addEventListener('click', function(){
 if(store.profile) renderDashboard();
 });

 document.getElementById('welcomeEditBtn').addEventListener('click', function(){
 document.getElementById('welcomeCard').style.display = 'none';
 document.getElementById('profileFormCard').style.display = 'block';
 populateProfileForm(store.profile);
 });

 // Tabs in profile view
 document.querySelectorAll('#profileView .tab').forEach(tab => {
 tab.addEventListener('click', function(){
 showTab(document.getElementById('profileView'), this.dataset.tab);
 });
 });

 // Tabs in dashboard
 document.addEventListener('click', function(e){
 if(e.target.classList.contains('tab') && e.target.closest('#dashboardView')){
 showTab(document.getElementById('dashboardView'), e.target.dataset.tab);
 }
 });

 // Log weight buttons
 document.getElementById('logWeightBtn').addEventListener('click', function(){
 logWeight(parseFloat(document.getElementById('weightInput').value));
 document.getElementById('weightInput').value = '';
 });

 document.addEventListener('click', function(e){
 if(e.target.id === 'dashLogBtn'){
 logWeight(parseFloat(document.getElementById('dashWeightInput').value));
 document.getElementById('dashWeightInput').value = '';
 }
 });

 // Calculate
 document.getElementById('calcBtn').addEventListener('click', function(){
 const err = document.getElementById('errorMsg');
 const w = parseFloat(document.getElementById('weight').value);
 const h = parseFloat(document.getElementById('height').value);
 const a = parseFloat(document.getElementById('age').value);
 const goal = document.getElementById('goal').value;

 if(!selectedSex||isNaN(w)||w<=0||isNaN(h)||h<=0||isNaN(a)||a<=0||!goal){
 err.style.display='block'; return;
 }
 err.style.display='none';

 store = loadStore();
 store.profile = {
 sex: selectedSex,
 weight: w,
 height: h,
 age: a,
 bf: document.getElementById('bf').value,
 trainingAge: document.getElementById('trainingAge').value,
 trainDays: parseInt(document.getElementById('trainDays').value),
 sessionLen: parseInt(document.getElementById('sessionLen').value),
 occupation: document.getElementById('occupation').value,
 steps: document.getElementById('steps').value,
 sleep: document.getElementById('sleep').value,
 dietPattern: document.getElementById('dietPattern').value,
 chronicDiet: document.getElementById('chronicDiet').value,
 cycleRegular: document.getElementById('cycleRegular').value,
 cyclePhase: document.getElementById('cyclePhase').value,
 goal: goal
 };
 if(!store.created) store.created = new Date().toISOString();
 saveStore(store);
 renderDashboard();
 });

 // Load existing weight log data into profile view
 renderWeightEntries();

 // Enter key to log weight
 document.getElementById('weightInput').addEventListener('keydown', function(e){
 if(e.key === 'Enter') document.getElementById('logWeightBtn').click();
 });
 document.addEventListener('keydown', function(e){
 if(e.key === 'Enter' && document.getElementById('dashWeightInput')){
 const btn = document.getElementById('dashLogBtn');
 if(btn) btn.click();
 }
 });

 // ─── Export / Import ───
 window.exportTdeeData = function(){
 const data = {};
 const raw = localStorage.getItem(STORAGE_KEY);
 if(raw) data[STORAGE_KEY] = JSON.parse(raw);
 const blob = new Blob([JSON.stringify({exported:new Date().toISOString(), data:data}, null, 2)], {type:'application/json'});
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = 'muscle_os_tdee_data_' + new Date().toISOString().split('T')[0] + '.json';
 a.click();
 };

 window.importTdeeData = function(file){
 const reader = new FileReader();
 reader.onload = function(e){
 try {
 const parsed = JSON.parse(e.target.result);
 if(!parsed.data || typeof parsed.data !== 'object') throw new Error('Invalid format');
 const imported = parsed.data;
 if(imported[STORAGE_KEY] === undefined) throw new Error('No TDEE data found in file');
 if(!confirm('Import will overwrite all current TDEE tracking data. Continue?')) return;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(imported[STORAGE_KEY]));
 alert('Data imported successfully. Reloading...');
 location.reload();
 } catch(err){
 alert('Import failed: '+err.message);
 }
 };
 reader.readAsText(file);
 };

 // ─── Sound & Haptic Feedback ───
 function playSoundEffect(type){
 try {
 if(navigator.vibrate) navigator.vibrate(15);
 const ctx = new (window.AudioContext || window.webkitAudioContext)();
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.type = 'sine';
 osc.frequency.setValueAtTime(type === 'success' ? 587.33 : 440, ctx.currentTime);
 gain.gain.setValueAtTime(0.08, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.start();
 osc.stop(ctx.currentTime + 0.15);
 } catch(e) {}
 }

 // ─── Clipboard Backup & Restore ───
 window.copyBackupToClipboard = function(){
 const data = {};
 for(let i=0; i<localStorage.length; i++){
 const k = localStorage.key(i);
 if(k.startsWith('muscle_os_') || k.startsWith('mos_')){
 try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e){ data[k] = localStorage.getItem(k); }
 }
 }
 const str = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
 navigator.clipboard.writeText(str).then(() => {
 alert(' Backup code copied to clipboard! You can paste this on any device.');
 }).catch(() => {
 prompt('Copy this backup code:', str);
 });
 };

 window.pasteBackupFromClipboard = function(){
 const str = prompt('Paste your MuscleOS backup code here:');
 if(!str) return;
 try {
 const json = decodeURIComponent(escape(atob(str.trim())));
 const data = JSON.parse(json);
 if(typeof data !== 'object') throw new Error('Invalid format');
 Object.keys(data).forEach(k => {
 const val = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
 localStorage.setItem(k, val);
 });
 alert(' Backup restored successfully! Reloading...');
 location.reload();
 } catch(e) {
 alert(' Invalid backup code: ' + e.message);
 }
 };

 // ─── Food Log Engine ───
 function escapeHTML(str) {
 if (typeof str !== 'string') return '';
 return str.replace(/[&<>"']/g, function(m) {
 return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
 });
 }

 let foodDB = [];
 let foodLogStore = {};
 const FOOD_STORAGE_KEY = 'muscle_os_food_log';
 let currentFoodDate = new Date().toISOString().split('T')[0];

 function loadFoodLogs(){
 try{
 const raw = localStorage.getItem(FOOD_STORAGE_KEY);
 if(raw) foodLogStore = JSON.parse(raw);
 }catch(e){}
 }
 function saveFoodLogs(){
 localStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(foodLogStore));
 }
 loadFoodLogs();

 async function fetchFoodDB(){
 if(foodDB.length > 0) return;
 try {
 const res = await fetch('../assets/data/food-database.json');
 if(res.ok) foodDB = await res.json();
 } catch(e) {
 console.error('Failed to load food database:', e);
 }
 }

 window.changeFoodDate = function(offset){
 let d = new Date(currentFoodDate);
 d.setDate(d.getDate() + offset);
 currentFoodDate = d.toISOString().split('T')[0];
 renderFoodTab();
 }

 window.copyYesterdayLogs = function(){
 let d = new Date(currentFoodDate);
 d.setDate(d.getDate() - 1);
 const prevDate = d.toISOString().split('T')[0];
 const prevLogs = foodLogStore[prevDate] || [];
 if(prevLogs.length === 0){
 alert('No food logs found for yesterday (' + prevDate + ')');
 return;
 }
 if(!foodLogStore[currentFoodDate]) foodLogStore[currentFoodDate] = [];
 foodLogStore[currentFoodDate] = foodLogStore[currentFoodDate].concat(JSON.parse(JSON.stringify(prevLogs)));
 saveFoodLogs();
 playSoundEffect('success');
 renderFoodTab();
 alert(' Successfully copied ' + prevLogs.length + ' food entries from yesterday!');
 };

 window.quickAddMacros = function(){
 const name = prompt('Meal / Food Name:', 'Custom Quick Meal');
 if(!name) return;
 const cals = parseFloat(prompt('Calories (kcal):', '350')) || 0;
 const p = parseFloat(prompt('Protein (g):', '30')) || 0;
 const c = parseFloat(prompt('Carbs (g):', '40')) || 0;
 const f = parseFloat(prompt('Fat (g):', '10')) || 0;
 const leu = (p * 0.08);

 if(!foodLogStore[currentFoodDate]) foodLogStore[currentFoodDate] = [];
 foodLogStore[currentFoodDate].push({
 id: 'custom_' + Date.now(),
 name: name,
 amount: 1,
 cals: cals,
 p: p,
 c: c,
 f: f,
 leu: leu
 });
 saveFoodLogs();
 playSoundEffect('success');
 renderFoodTab();
 };

 window.addWater = function(ml){
 const key = 'mos_water_' + currentFoodDate;
 let cur = parseFloat(localStorage.getItem(key)) || 0;
 cur += ml;
 localStorage.setItem(key, cur);
 playSoundEffect('success');
 renderFoodTab();
 };

 window.generateGroceryList = function(){
 const todayLogs = foodLogStore[currentFoodDate] || [];
 if(todayLogs.length === 0){
 alert('No food logged today to generate a grocery list!');
 return;
 }
 const summary = {};
 todayLogs.forEach(item => {
 const key = item.name;
 if(!summary[key]) summary[key] = 0;
 summary[key] += item.amount;
 });
 let txt = ' ANABOLIC GROCERY SHOPPING LIST (' + currentFoodDate + '):\n\n';
 Object.keys(summary).forEach(name => {
 const totalGrams = summary[name];
 const packQty = totalGrams >= 1000 ? (totalGrams/1000).toFixed(2) + ' kg' : Math.round(totalGrams) + 'g';
 txt += '• ' + name + ': ' + packQty + '\n';
 });
 navigator.clipboard.writeText(txt).then(() => {
 alert(' Grocery list copied to clipboard!\n\n' + txt);
 }).catch(() => {
 prompt('Your Grocery List:', txt);
 });
 };

 window.calcBatchMealPrep = function(){
 const rawW = parseFloat(prompt('Total Raw Batch Weight (g):', '1500'));
 if(!rawW || isNaN(rawW)) return;
 const cookedW = parseFloat(prompt('Total Cooked Batch Weight (g):', '1120'));
 if(!cookedW || isNaN(cookedW)) return;
 const targetP = parseFloat(prompt('Target Protein Per Meal Container (g):', '40'));
 if(!targetP || isNaN(targetP)) return;
 const rawP100 = parseFloat(prompt('Raw Protein Per 100g (g, e.g. Chicken = 22.5):', '22.5')) || 22.5;

 const shrinkage = ((1 - (cookedW / rawW)) * 100).toFixed(1);
 const totalBatchProtein = (rawW / 100) * rawP100;
 const portionCookedW = Math.round(cookedW * (targetP / totalBatchProtein));
 const numMeals = (totalBatchProtein / targetP).toFixed(1);

 alert(
 '⚖ BATCH MEAL PREP PORTION SPLITTER:\n\n' +
 '• Water Shrinkage Loss: ' + shrinkage + '%\n' +
 '• Total Batch Protein: ' + Math.round(totalBatchProtein) + 'g\n' +
 '• Number of ' + targetP + 'g Protein Meals: ' + numMeals + ' containers\n\n' +
 ' Portion EXACTLY ' + portionCookedW + 'g of Cooked Food into each container!'
 );
 };

 window.calcGlycogenCarbSizer = function(){
 const bw = (store.profile && store.profile.weight) ? store.profile.weight : 80;
 const type = prompt('Select Session Intensity:\n1 = Heavy Legs / Back (High Demand)\n2 = Chest / Shoulders / Arms (Moderate Demand)\n3 = Rest Day / Light Cardio', '1');
 let mult = 1.0;
 if(type === '2') mult = 0.6;
 if(type === '3') mult = 0.3;

 const preCarbs = Math.round(bw * mult);
 const intraCarbs = mult >= 0.6 ? Math.round(bw * 0.4) : 0;
 const waterMl = intraCarbs * 16.6;

 alert(
 ' SCIENTIFIC GLYCOGEN & INTRA-WORKOUT CARBS:\n\n' +
 '• Pre-Workout Carbs (1-2h before): ' + preCarbs + 'g Fast Carbs\n' +
 (intraCarbs > 0 ? '• Intra-Workout Drink (6% Isotonic Solution):\n - ' + intraCarbs + 'g Fast Carbs (Cluster Dextrin/Maltodextrin)\n - ' + Math.round(waterMl) + 'ml Water\n - 300mg Sodium\n' : '• Intra-Workout: Water + Electrolytes only\n') +
 '• Post-Workout Recovery: 3.0g Leucine + ' + preCarbs + 'g Carbs'
 );
 };

 window.calcReverseDiet = function(){
 const p = store.profile || { sex:'male', weight:80, height:178, age:25, bf:15, trainingAge:'intermediate', trainDays:4, sessionLen:60, occupation:'desk', steps:8000, sleep:7.5, dietPattern:'balanced', goal:'recomp', chronicDiet:'none', cyclePhase:'none' };
 const calcRes = calcTDEE(p.sex, p.weight, p.height, p.age, p.bf, p.trainingAge, p.trainDays, p.sessionLen, p.occupation, p.steps, p.sleep, p.dietPattern, p.goal, p.chronicDiet, p.cyclePhase);
 const curCal = parseFloat(prompt('Current Calorie Intake (kcal):', '1600')) || 1600;
 const targetCal = Math.round(calcRes.goalCal) || 2200;
 const rampKcal = 75; // +75 kcal per week
 const weeks = Math.ceil((targetCal - curCal) / rampKcal);

 alert(
 ' SCIENCE-BACKED REVERSE DIETING CONTROLLER:\n\n' +
 '• Starting Deficit Intake: ' + curCal + ' kcal\n' +
 '• Calculated Maintenance Target: ' + targetCal + ' kcal\n' +
 '• Weekly Ramp Increment: +' + rampKcal + ' kcal/week (+15g Carbs, +2g Fat)\n' +
 '• Estimated Ramp Duration: ' + weeks + ' Weeks\n\n' +
 ' Week 1 Target: ' + (curCal + 75) + ' kcal\n' +
 ' Week 2 Target: ' + (curCal + 150) + ' kcal\n\n' +
 ' Restores T3/T4 thyroid function, leptin levels, and Resting Metabolic Rate (RMR) without fat rebound!'
 );
 };

 window.setCarbCycleDay = function(mode){
 localStorage.setItem('mos_carb_cycle_' + currentFoodDate, mode);
 playSoundEffect('click');
 renderFoodTab();
 };

 window.setChronotype = function(mode){
 localStorage.setItem('mos_chronotype', mode);
 playSoundEffect('click');
 renderFoodTab();
 };

 // MOS Interactive Product Tour Engine
 const MOS_TOUR_STEPS = [
 {
 title: ' Step 1: Adaptive Profile & 2-Week Recalibration',
 desc: 'Welcome to MOS-METABOLIX! Enter your age, sex, weight, height, body fat, and lifestyle inputs. The engine uses rolling exponential moving averages to recalibrate your TDEE every 2 weeks based on your real-world weight trends!'
 },
 {
 title: ' Step 2: 5,000 Food DB & Raw vs Cooked Selector',
 desc: 'Search 5,000+ foods in English or Arabic using voice dictation (🎙) or quick category chips. When adding food, toggle between Raw (النيء) and Cooked (المطبوخ) to account for exact water shrinkage math!'
 },
 {
 title: ' Step 3: Anabolic Leucine MPS Meter & 8-Micro Grid',
 desc: 'Track your Leucine MPS threshold — hit 3.0g Leucine per meal window to trigger maximal mTORc1 muscle protein synthesis! Monitor your 8-item micro grid: Iron, Calcium, Zinc, Magnesium, Potassium, Vit C, Vit D, and Vit B12.'
 },
 {
 title: ' Step 4: Carb Cycling & Circadian Chronotype Timing',
 desc: 'Switch between High Carb (Legs/Back), ⚖ Mod Carb, and Low Carb (Rest Day) modes. Select your Early Lark (morning GLUT4 peak) or Night Owl chronotype to align nutrient timing with your circadian rhythm.'
 },
 {
 title: ' Step 5: Reverse Dieting & Athlete Productivity Suite',
 desc: 'Use the Reverse Dieting Controller (+75 kcal/wk ramp) to restore thyroid & leptin levels post-cut. Access 1-Click Grocery Lists, ⚖ Batch Meal Prep Splitters, Quick Add Macros, and Copy Yesterday!'
 }
 ];

 window.startInteractiveTour = function(){
 showTourStep(0);
 };

 window.showTourStep = function(stepIdx){
 let modal = document.getElementById('mosTourModal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'mosTourModal';
 modal.className = 'modal-overlay';
 document.body.appendChild(modal);
 }
 const step = MOS_TOUR_STEPS[stepIdx];
 modal.innerHTML = `
 <div class="card animate-in" style="max-width:440px;width:90%;border:1.5px solid #F4C93B;box-shadow:0 0 32px rgba(244,201,59,.35);background:#1A1B26">
 <div style="font-family:'Oswald',sans-serif;font-size:1.15rem;color:#F4C93B;margin-bottom:8px">${step.title}</div>
 <div style="font-size:.78rem;line-height:1.6;color:rgba(250,250,248,.85);margin-bottom:16px">${step.desc}</div>
 <div style="display:flex;justify-content:space-between;align-items:center">
 <span style="font-size:.65rem;color:rgba(250,250,248,.7)">Step ${stepIdx + 1} of ${MOS_TOUR_STEPS.length}</span>
 <div style="display:flex;gap:6px">
 ${stepIdx > 0 ? `<button class="btn-secondary" onclick="showTourStep(${stepIdx - 1})" style="padding:5px 10px;font-size:.65rem">◄ Back</button>` : ''}
 ${stepIdx < MOS_TOUR_STEPS.length - 1 ? `<button class="btn-primary" onclick="showTourStep(${stepIdx + 1})" style="margin:0;padding:5px 12px;font-size:.65rem">Next ➔</button>` : `<button class="btn-primary" onclick="closeTourModal()" style="margin:0;padding:5px 12px;font-size:.65rem">Finish Tour </button>`}
 <button class="btn-secondary" onclick="closeTourModal()" style="padding:5px 8px;font-size:.65rem">Skip</button>
 </div>
 </div>
 </div>
 `;
 modal.style.display = 'flex';
 };

 window.closeTourModal = function(){
 const modal = document.getElementById('mosTourModal');
 if(modal) modal.style.display = 'none';
 };

 window.renderFoodTab = async function(){
 const tabEl = document.getElementById('dash-food');
 if(!tabEl) return;
 await fetchFoodDB();

 // calculate target macros for current profile
 const p = store.profile;
 const r = calcTDEE(p.sex, p.weight, p.height, p.age, p.bf, p.trainingAge,
 p.trainDays, p.sessionLen, p.occupation, p.steps, p.sleep, p.dietPattern,
 p.goal, p.chronicDiet, p.cyclePhase);
 
 // adjust if recalibrated
 const trend = calcWeightTrend(store.weights);
 let targetCal = r.goalCal, targetP = r.protein, targetF = r.fat, targetC = r.carbs;
 if(trend && store.weights.length >= 5){
 let adjustment = recalibrate(store);
 if(adjustment && adjustment.adjusted){
 targetCal = adjustment.newCal.goalCal;
 targetP = adjustment.newCal.protein;
 targetF = adjustment.newCal.fat;
 targetC = adjustment.newCal.carbs;
 }
 }

 const todayLogs = foodLogStore[currentFoodDate] || [];
 let totCal = 0, totP = 0, totF = 0, totC = 0, totLeu = 0;
 let totVitC = 0, totVitD = 0, totB12 = 0, totIron = 0, totCalcium = 0, totZinc = 0, totMag = 0, totPot = 0, totSod = 0;
 
 let listHtml = todayLogs.length === 0 ? '<p style="font-size:.72rem;color:rgba(250,250,248,.65);text-align:center;padding:10px 0">No food logged for this date.</p>' : '';
 
 todayLogs.forEach((item, idx) => {
 totCal += item.cals || 0;
 totP += item.p || 0;
 totF += item.f || 0;
 totC += item.c || 0;
 totLeu += item.leu || 0;
 totVitC += item.vit_c || 0;
 totVitD += item.vit_d || 0;
 totB12 += item.b12 || 0;
 totIron += item.iron || 0;
 totCalcium += item.calcium || 0;
 totZinc += item.zinc || 0;
 totMag += item.mag || 0;
 totPot += item.pot || 0;
 totSod += item.sod || 0;

 const safeName = escapeHTML(item.name);
 listHtml += `
 <div class="food-log-item">
 <div class="food-log-info">
 <span class="food-log-title">${item.amount}g ${safeName}</span>
 <span class="food-log-macros">${Math.round(item.p)}g P &bull; ${Math.round(item.f)}g F &bull; ${Math.round(item.c)}g C &bull; ${(item.leu||0).toFixed(1)}g Leu</span>
 </div>
 <div class="food-log-actions">
 <span class="food-log-cals">${Math.round(item.cals)} kcal</span>
 <button class="food-log-del" onclick="deleteFoodLog(${idx})"></button>
 </div>
 </div>`;
 });

 let html = `
 <div class="food-date-selector">
 <button class="food-date-btn" onclick="changeFoodDate(-1)">&#9664;</button>
 <span class="food-date-display">${currentFoodDate === new Date().toISOString().split('T')[0] ? 'Today' : currentFoodDate}</span>
 <button class="food-date-btn" onclick="changeFoodDate(1)">&#9654;</button>
 </div>

 <div class="cat-chips" id="catChips">
 <div class="cat-chip active" data-cat="all">All</div>
 <div class="cat-chip" data-cat="Meat"> Proteins</div>
 <div class="cat-chip" data-cat="Carbs"> Carbs</div>
 <div class="cat-chip" data-cat="Meals"> Egyptian</div>
 <div class="cat-chip" data-cat="Dairy"> Dairy</div>
 <div class="cat-chip" data-cat="Fats"> Fats/Nuts</div>
 <div class="cat-chip" data-cat="Fruits"> Fruits</div>
 <div class="cat-chip" data-cat="Vegetables"> Veggies</div>
 </div>

 <div class="food-search-wrapper" style="display:flex;gap:6px">
 <input type="text" class="food-search-input" id="foodSearch" placeholder="Search 5,000+ foods with Leucine &amp; Micros..." autocomplete="off" style="flex:1">
 <button class="voice-search-btn" id="voiceSearchBtn" title="Voice Search">🎙</button>
 <div class="food-autocomplete" id="foodAutocomplete"></div>
 </div>

 <!-- Dynamic Carb Cycling & Chronotype Controller -->
 <div class="section-header" style="margin-top:14px">Dynamic Carb Cycling &amp; Chronotype Eating</div>
 <div style="background:rgba(20,21,26,.5);padding:10px;border-radius:10px;border:1px solid rgba(250,250,248,.08);margin:8px 0;font-size:.7rem">
 <div style="font-weight:600;color:#F4C93B;margin-bottom:4px"> Carb Cycling Mode Today:</div>
 <div style="display:flex;gap:6px;margin-bottom:8px">
 <button class="sex-btn ${(localStorage.getItem('mos_carb_cycle_'+currentFoodDate)||'mod')==='high'?'active':''}" onclick="setCarbCycleDay('high')" style="padding:4px;font-size:.6rem"> High Carb (+25% Legs/Back)</button>
 <button class="sex-btn ${(localStorage.getItem('mos_carb_cycle_'+currentFoodDate)||'mod')==='mod'?'active':''}" onclick="setCarbCycleDay('mod')" style="padding:4px;font-size:.6rem">⚖ Moderate (Upper Body)</button>
 <button class="sex-btn ${(localStorage.getItem('mos_carb_cycle_'+currentFoodDate)||'mod')==='low'?'active':''}" onclick="setCarbCycleDay('low')" style="padding:4px;font-size:.6rem"> Low Carb (-35% Rest Day)</button>
 </div>

 <div style="font-weight:600;color:#F4C93B;margin-bottom:4px"> Chronotype &amp; Circadian Rhythm Timing:</div>
 <div style="display:flex;gap:6px;margin-bottom:6px">
 <button class="sex-btn ${(localStorage.getItem('mos_chronotype')||'lark')==='lark'?'active':''}" onclick="setChronotype('lark')" style="padding:4px;font-size:.6rem"> Early Lark (60% Carbs before 2pm)</button>
 <button class="sex-btn ${(localStorage.getItem('mos_chronotype')||'lark')==='owl'?'active':''}" onclick="setChronotype('owl')" style="padding:4px;font-size:.6rem"> Night Owl (Backload Carbs)</button>
 </div>
 <div style="font-size:.62rem;color:rgba(250,250,248,.6);font-style:italic">
 ${(localStorage.getItem('mos_chronotype')||'lark')==='lark'?'Front-loads carbs during morning GLUT4 translocation peak. Stop high-GI carbs 2h before bed to preserve nocturnal Growth Hormone pulse.':'Backloads carbs to post-workout and dinner. Takes 400mg Magnesium Glycinate + Casein 45m before bed for slow-wave sleep.'}
 </div>
 </div>

 <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
 <button class="btn-secondary" onclick="quickAddMacros()" style="padding:7px;font-size:.65rem"> Quick Add Macros</button>
 <button class="btn-secondary" onclick="copyYesterdayLogs()" style="padding:7px;font-size:.65rem"> Copy Yesterday</button>
 <button class="btn-secondary" onclick="generateGroceryList()" style="padding:7px;font-size:.65rem"> Grocery List</button>
 <button class="btn-secondary" onclick="calcBatchMealPrep()" style="padding:7px;font-size:.65rem">⚖ Meal Prep Splitter</button>
 <button class="btn-secondary" onclick="calcReverseDiet()" style="padding:7px;font-size:.65rem"> Reverse Dieting Controller</button>
 <button class="btn-secondary" onclick="calcGlycogenCarbSizer()" style="padding:7px;font-size:.65rem"> Glycogen Carb Sizer</button>
 </div>
 
 <div class="food-add-modal" id="foodAddModal">
 <h4 id="foodAddTitle"></h4>
 <div style="display:flex;gap:6px;margin:8px 0;justify-content:center">
 <button class="sex-btn active" id="stateRawBtn" style="padding:5px 10px;font-size:.65rem"> النيء / Raw (قبل الطبخ)</button>
 <button class="sex-btn" id="stateCookedBtn" style="padding:5px 10px;font-size:.65rem"> المطبوخ / Cooked (بعد الطبخ)</button>
 </div>
 <div class="macros-preview" id="foodAddPreview"></div>
 <div class="food-add-row">
 <input type="number" id="foodAddAmount" placeholder="Grams" min="1">
 <button id="foodAddBtn">Add</button>
 </div>
 </div>

 <div class="section-header">Daily Caloric &amp; Macro Summary</div>
 <div class="dash-macro-grid" style="margin-top:10px;margin-bottom:6px">
 <div class="dash-macro"><div class="dash-macro-val" style="color:${totCal>targetCal?'#f44336':'#FAFAF8'}">${Math.round(totCal)}</div><div class="dash-macro-lbl">Kcal / ${targetCal}</div></div>
 <div class="dash-macro"><div class="dash-macro-val">${Math.round(totP)}</div><div class="dash-macro-lbl">Pro / ${targetP}g</div></div>
 <div class="dash-macro"><div class="dash-macro-val">${Math.round(totC)}</div><div class="dash-macro-lbl">Carbs / ${targetC}g</div></div>
 </div>

 <!-- Leucine MPS Threshold Engine -->
 <div class="status-banner ${totLeu>=3.0?'status-ok':'status-warn'}" style="margin-top:10px;margin-bottom:10px">
 <strong>${totLeu>=3.0?' Anabolic Leucine Threshold Achieved!':' Leucine MPS Threshold (mTORc1)'}</strong><br>
 Current Leucine: <strong>${totLeu.toFixed(1)}g / 3.0g Target</strong><br>
 <span style="font-size:.65rem;color:rgba(250,250,248,.6)">
 ${totLeu>=3.0?'Maximal Muscle Protein Synthesis (MPS) triggered for this meal window.':'Add Whey Isolate (+2.4g Leu) or 2 Boiled Eggs (+0.6g Leu) to reach 3.0g for full MPS stimulation.'}
 </span>
 </div>

 <!-- Micronutrients & Minerals Profile Grid -->
 <div class="section-header" style="margin-top:12px">Vitamins &amp; Minerals Profile</div>
 <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0;text-align:center">
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">IRON</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${totIron.toFixed(1)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">CALCIUM</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${Math.round(totCalcium)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">ZINC</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${totZinc.toFixed(1)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">MAGNESIUM</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${Math.round(totMag)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">POTASSIUM</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${Math.round(totPot)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">VIT C</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${Math.round(totVitC)}mg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">VIT D</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${totVitD.toFixed(1)}mcg</div></div>
 <div style="background:rgba(20,21,26,.5);padding:6px;border-radius:6px;border:1px solid rgba(250,250,248,.05)"><div style="font-size:.55rem;color:rgba(250,250,248,.7)">VIT B12</div><div style="font-size:.75rem;font-weight:600;color:#FAFAF8">${totB12.toFixed(1)}mcg</div></div>
 </div>

 <!-- Hydration & Electrolyte Balance Tracker -->
 <div class="section-header" style="margin-top:12px">Hydration &amp; Electrolyte Balance</div>
 <div style="background:rgba(20,21,26,.5);padding:10px;border-radius:10px;border:1px solid rgba(250,250,248,.08);margin:8px 0">
 <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:6px">
 <span> Daily Water Intake: <strong>${((parseFloat(localStorage.getItem('mos_water_'+currentFoodDate))||0)/1000).toFixed(2)}L / 3.5L Target</strong></span>
 <span style="color:${totPot>0 && (totSod/totPot)<=0.8?'#4CAF50':'#F4C93B'}">Na:K Ratio: <strong>${totPot>0?(totSod/totPot).toFixed(2):'0.00'}</strong> (Ideal &lt; 0.8)</span>
 </div>
 <div style="display:flex;gap:6px">
 <button class="btn-secondary" onclick="addWater(250)" style="flex:1;padding:4px;font-size:.65rem">+250 ml</button>
 <button class="btn-secondary" onclick="addWater(500)" style="flex:1;padding:4px;font-size:.65rem">+500 ml</button>
 <button class="btn-secondary" onclick="addWater(1000)" style="flex:1;padding:4px;font-size:.65rem">+1.0 Liter</button>
 </div>
 </div>

 <!-- Pharmacokinetic Supplement Stack Checklist -->
 <div class="section-header" style="margin-top:14px">Pharmacokinetic Supplement Stack</div>
 <div style="background:rgba(20,21,26,.5);padding:10px;border-radius:10px;border:1px solid rgba(250,250,248,.08);margin:8px 0;font-size:.7rem">
 <div style="display:flex;flex-direction:column;gap:6px">
 <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
 <input type="checkbox" ${localStorage.getItem('mos_supp_'+currentFoodDate+'_creatine')==='1'?'checked':''} onchange="toggleSupp('creatine')" style="width:auto">
 <span> <strong>Creatine Monohydrate (5g)</strong> — Post-workout with Carbs</span>
 </label>
 <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
 <input type="checkbox" ${localStorage.getItem('mos_supp_'+currentFoodDate+'_caffeine')==='1'?'checked':''} onchange="toggleSupp('caffeine')" style="width:auto">
 <span> <strong>Caffeine (200-400mg)</strong> — 45m Pre-workout ($t_{\\max}$ Peak)</span>
 </label>
 <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
 <input type="checkbox" ${localStorage.getItem('mos_supp_'+currentFoodDate+'_omega3')==='1'?'checked':''} onchange="toggleSupp('omega3')" style="width:auto">
 <span> <strong>Omega-3 Fish Oil (2g)</strong> — With Fatty Meals</span>
 </label>
 <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
 <input type="checkbox" ${localStorage.getItem('mos_supp_'+currentFoodDate+'_vitd')==='1'?'checked':''} onchange="toggleSupp('vitd')" style="width:auto">
 <span>☀ <strong>Vitamin D3 + K2 (5000 IU)</strong> — Morning with Fats</span>
 </label>
 <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
 <input type="checkbox" ${localStorage.getItem('mos_supp_'+currentFoodDate+'_mag')==='1'?'checked':''} onchange="toggleSupp('mag')" style="width:auto">
 <span> <strong>Magnesium Glycinate (400mg)</strong> — 45m Before Sleep</span>
 </label>
 </div>
 </div>
 
 <div class="section-header" style="margin-top:16px">Logged Food</div>
 <div class="food-log-list">${listHtml}</div>
 `;

 tabEl.innerHTML = html;
 
 // Attach event listeners
 const searchInput = document.getElementById('foodSearch');
 const autocomplete = document.getElementById('foodAutocomplete');
 let selectedFood = null;

 searchInput.addEventListener('input', function(){
 const q = this.value.toLowerCase().trim();
 if(q.length < 2){ autocomplete.style.display = 'none'; return; }
 
 const matches = foodDB.filter(f => f.name_en.toLowerCase().includes(q) || (f.name_ar && f.name_ar.includes(q))).slice(0, 15);
 
 if(matches.length > 0){
 autocomplete.innerHTML = matches.map(f => {
 const safeEn = escapeHTML(f.name_en);
 const safeAr = escapeHTML(f.name_ar || '');
 return `
 <div class="food-ac-item" data-id="${escapeHTML(f.id)}">
 <div><span class="food-ac-name">${safeEn}</span><span class="food-ac-name-ar">${safeAr}</span></div>
 <span class="food-ac-macros">${f.calories}kcal</span>
 </div>
 `;
 }).join('');
 autocomplete.style.display = 'block';
 } else {
 autocomplete.innerHTML = '<div style="padding:10px;text-align:center;color:rgba(250,250,248,.65);font-size:.7rem">No food found.</div>';
 autocomplete.style.display = 'block';
 }
 });

 autocomplete.addEventListener('click', function(e){
 const item = e.target.closest('.food-ac-item');
 if(!item) return;
 const fId = item.dataset.id;
 selectedFood = foodDB.find(f => f.id === fId);
 if(!selectedFood) return;
 
 autocomplete.style.display = 'none';
 searchInput.value = '';
 
 const rawBtn = document.getElementById('stateRawBtn');
 const cookedBtn = document.getElementById('stateCookedBtn');

 if(selectedFood.cooking_state === 'raw'){
 rawBtn.classList.add('active'); cookedBtn.classList.remove('active');
 } else {
 cookedBtn.classList.add('active'); rawBtn.classList.remove('active');
 }

 document.getElementById('foodAddModal').style.display = 'block';
 document.getElementById('foodAddTitle').textContent = selectedFood.name_en + ' ' + (selectedFood.name_ar||'');
 const amtInput = document.getElementById('foodAddAmount');
 amtInput.value = '100';

 let currentFoodState = selectedFood;

 rawBtn.onclick = function(){
 rawBtn.classList.add('active'); cookedBtn.classList.remove('active');
 if(selectedFood.cooking_state === 'cooked'){
 // Multiply calories & macros by 0.75 ratio for raw state water expansion
 currentFoodState = Object.assign({}, selectedFood, {
 calories: selectedFood.calories * 0.75,
 protein: selectedFood.protein * 0.75,
 fat: selectedFood.fat * 0.75,
 carbs: selectedFood.carbs * 0.75,
 leucine: selectedFood.leucine * 0.75
 });
 } else {
 currentFoodState = selectedFood;
 }
 updatePreview();
 };

 cookedBtn.onclick = function(){
 cookedBtn.classList.add('active'); rawBtn.classList.remove('active');
 if(selectedFood.cooking_state === 'raw'){
 // Multiply calories & macros by 1.33 ratio for cooked state density concentration
 currentFoodState = Object.assign({}, selectedFood, {
 calories: selectedFood.calories * 1.33,
 protein: selectedFood.protein * 1.33,
 fat: selectedFood.fat * 1.33,
 carbs: selectedFood.carbs * 1.33,
 leucine: selectedFood.leucine * 1.33
 });
 } else {
 currentFoodState = selectedFood;
 }
 updatePreview();
 };
 
 function updatePreview(){
 const ratio = (parseFloat(amtInput.value)||0) / 100;
 document.getElementById('foodAddPreview').innerHTML = 
 `${Math.round(currentFoodState.calories*ratio)} kcal &bull; `+
 `${(currentFoodState.protein*ratio).toFixed(1)}g P &bull; `+
 `${(currentFoodState.fat*ratio).toFixed(1)}g F &bull; `+
 `${(currentFoodState.carbs*ratio).toFixed(1)}g C`;
 }
 updatePreview();
 amtInput.oninput = updatePreview;
 });

 document.addEventListener('click', function(e){
 if(e.target.closest('.food-search-wrapper') === null){
 const ac = document.getElementById('foodAutocomplete');
 if(ac) ac.style.display = 'none';
 }
 });

 // Category chips click listener
 let activeCat = 'all';
 document.querySelectorAll('.cat-chip').forEach(chip => {
 chip.addEventListener('click', function(){
 document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
 this.classList.add('active');
 activeCat = this.dataset.cat;
 if(activeCat === 'all'){
 searchInput.value = '';
 autocomplete.style.display = 'none';
 } else {
 const matches = foodDB.filter(f => f.category === activeCat).slice(0, 15);
 autocomplete.innerHTML = matches.map(f => `
 <div class="food-ac-item" data-id="${escapeHTML(f.id)}">
 <div><span class="food-ac-name">${escapeHTML(f.name_en)}</span><span class="food-ac-name-ar">${escapeHTML(f.name_ar||'')}</span></div>
 <span class="food-ac-macros">${f.calories}kcal</span>
 </div>
 `).join('');
 autocomplete.style.display = 'block';
 }
 });
 });

 // Voice Dictation
 const voiceBtn = document.getElementById('voiceSearchBtn');
 if(voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
 const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
 const rec = new SpeechRecognition();
 rec.continuous = false;
 rec.interimResults = false;

 voiceBtn.addEventListener('click', function(){
 try {
 voiceBtn.classList.add('recording');
 rec.start();
 } catch(e) { voiceBtn.classList.remove('recording'); }
 });

 rec.onresult = function(e){
 voiceBtn.classList.remove('recording');
 const transcript = e.results[0][0].transcript;
 if(transcript){
 searchInput.value = transcript;
 searchInput.dispatchEvent(new Event('input'));
 }
 };
 rec.onerror = function(){ voiceBtn.classList.remove('recording'); };
 rec.onend = function(){ voiceBtn.classList.remove('recording'); };
 } else if(voiceBtn){
 voiceBtn.style.display = 'none';
 }

 document.getElementById('foodAddBtn').addEventListener('click', function(){
 if(!currentFoodState) return;
 const amt = parseFloat(document.getElementById('foodAddAmount').value);
 if(isNaN(amt) || amt <= 0) return;
 
 const ratio = amt / 100;
 if(!foodLogStore[currentFoodDate]) foodLogStore[currentFoodDate] = [];
 foodLogStore[currentFoodDate].push({
 id: currentFoodState.id,
 name: currentFoodState.name_en,
 amount: amt,
 cals: currentFoodState.calories * ratio,
 p: currentFoodState.protein * ratio,
 f: currentFoodState.fat * ratio,
 c: currentFoodState.carbs * ratio,
 leu: (currentFoodState.leucine || 0) * ratio,
 vit_c: (currentFoodState.vit_c || 0) * ratio,
 vit_d: (currentFoodState.vit_d || 0) * ratio,
 b12: (currentFoodState.b12 || 0) * ratio,
 iron: (currentFoodState.iron || 0) * ratio,
 calcium: (currentFoodState.calcium || 0) * ratio,
 zinc: (currentFoodState.zinc || 0) * ratio,
 mag: (currentFoodState.mag || 0) * ratio,
 pot: (currentFoodState.pot || 0) * ratio,
 sod: (currentFoodState.sod || 0) * ratio
 });
 
 playSoundEffect('success');
 saveFoodLogs();
 renderFoodTab();
 });
 };

 window.deleteFoodLog = function(index){
 if(!foodLogStore[currentFoodDate]) return;
 foodLogStore[currentFoodDate].splice(index, 1);
 saveFoodLogs();
 renderFoodTab();
 }
 // ─── End Food Log ───

 console.log('Adaptive TDEE Engine loaded. Data stored in localStorage under key: '+STORAGE_KEY);
})();

;(function(){
 var SUB_KEY = 'mos_subscription';
 var GS_KEY = 'mos_google_session';
 var OWNER_EMAIL = 'ANASSTEM2025@GMAIL.COM';
 var API_BASE = 'https://muscleos-access-control.muscleos.workers.dev';
 var GOOGLE_CLIENT_ID = '335156097845-vq52ttt74pak112mn2eet5j3s1k15fn9.apps.googleusercontent.com';
 var PRODUCT_ID = 'tdee_adaptive_engine';
 var HUB_PRODUCT = 'omni_hub';
 var hubMode = (window.self !== window.top) && (function(){ try { return sessionStorage.getItem('mos_hub_mode') === '1'; } catch(e){ return false; } })();
 function deriveProd(code, plan){
  var p = (code || '').toUpperCase();
  if (plan === 'master') return 'all_access';
  if (p.indexOf('OH-') === 0) return 'omni_hub';
  if (p.indexOf('TR-') === 0) return 'training_tool';
  if (p.indexOf('MA-') === 0) return 'all_access';
  if (p.indexOf('TD-') === 0) return 'tdee_adaptive_engine';
  if (p.indexOf('TB-') === 0) return 'both_tools';
  if (p.indexOf('BK-') === 0) return 'training_book';
  if (p.indexOf('BN-') === 0) return 'nutrition_book';
  if (p.indexOf('BB-') === 0) return 'both_books';
  return PRODUCT_ID;
 }
 var sub = null;
 try { sub = JSON.parse(localStorage.getItem(SUB_KEY)); } catch(e){}
 var subProd = sub ? (sub.prodId || deriveProd(sub.code, sub.plan)) : null;
 var prodOk = !!sub && (sub.plan === 'master' || sub.code === 'OWNER' || (hubMode ? subProd === HUB_PRODUCT : (subProd === PRODUCT_ID || subProd === HUB_PRODUCT)));
 var active = !!(sub && sub.active && prodOk && new Date(sub.expiry + 'T23:59:59') > new Date());
 window.__MOS_PRODUCT__ = hubMode ? HUB_PRODUCT : PRODUCT_ID;
 window.__MOS_GATE__ = function(){ return { active: active, prodId: subProd, plan: sub ? sub.plan : null, hub: hubMode }; };

 function getGs(){ try { var g = JSON.parse(localStorage.getItem(GS_KEY)); return (g && g.session) ? g : null; } catch(e){ return null; } }
 function showStep(n){
 // Code box + Google sign-in are always visible; n===2 additionally shows the signed-in state (welcome + switch link)
 document.getElementById('authStep1').style.display = 'block';
 document.getElementById('authStep2').style.display = 'block';
 var linked = n === 2;
 document.getElementById('authWelcomeRow').style.display = linked ? 'block' : 'none';
 document.getElementById('subSignOut').style.display = linked ? 'inline' : 'none';
 }
 function showErr(id, msg){ var el = document.getElementById(id); el.style.display = 'block'; el.textContent = msg; }
 function showNoLink(show){
 var el = document.getElementById('subNoLink');
 if(el) el.style.display = show ? 'block' : 'none';
 }
function pickAccountSub(subs){
  // Worker returns active account-bound subs sorted by expiry desc
  if(!Array.isArray(subs) || !subs.length) return null;
  var want = hubMode ? HUB_PRODUCT : PRODUCT_ID;
  for(var i = 0; i < subs.length; i++){
  var s = subs[i];
  if(!s) continue;
  if(s.products === 'all') return s;
  if(Array.isArray(s.products) && s.products.indexOf(want) !== -1) return s;
if(Array.isArray(s.products) && s.products.indexOf('omni_hub') !== -1 && (want === 'training_tool' || want === 'tdee_adaptive_engine')) return s;
  }
  return null;
  }
  function subProdOf(s){ return s ? (s.products === 'all' ? 'all_access' : (Array.isArray(s.products) && s.products.length === 1 ? s.products[0] : null)) : null; }
  function setSub(plan, expiry, token, code, email, prodId){
  localStorage.setItem(SUB_KEY, JSON.stringify({ active: true, plan: plan, expiry: expiry, token: token || '', code: code, email: email || '', prodId: prodId || deriveProd(code, plan) }));
  }
  function grantAndReload(plan, expiry, token, code, email, quiet, prodId){
  setSub(plan, expiry, token, code, email, prodId);
 showStep(2);
 document.getElementById('subError').style.display = 'none';
 document.getElementById('subSuccess').style.display = 'block';
 showNoLink(false);
 setTimeout(function(){ location.reload(); }, 1500);
 }
 function verifyCode(code, email, btn){
 btn.disabled = true;
 btn.textContent = 'Checking...';
 var gs = getGs();
 fetch(API_BASE + '/api/verify-code', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ code: code, productId: hubMode ? 'omni_hub' : 'tdee_adaptive_engine', session: gs ? gs.session : undefined })
  }).then(function(r){ return r.json(); }).then(function(data){
  if(data && data.valid){
  grantAndReload(data.plan || 'pro_tdee', (data.expiresAt || '').slice(0, 10), data.token || '', code, email, false, data.productId);
 } else {
 var msg = 'Wrong code. Please check and try again.';
 if(data && data.error === 'code_used_by_other') msg = 'This code is already linked to another account.';
 if(data && data.error === 'code_exhausted') msg = 'This code has already been used.';
if(data && data.error === 'wrong_product') msg = 'This code unlocks the OMNI HUB app — open the OMNI HUB to use it here.';
 if(data && data.error === 'invalid_session'){
 localStorage.removeItem(GS_KEY);
 showStep(1);
 showNoLink(false);
 msg = 'Session expired. Please sign in again.';
 initGsi();
 }
 showErr('subError', msg);
 btn.disabled = false;
 btn.textContent = 'Verify';
 }
 }).catch(function(){
 showErr('subError', 'Network error. Please try again.');
 btn.disabled = false;
 btn.textContent = 'Verify';
 });
 }

  function finishGoogle(data){
    localStorage.setItem(GS_KEY, JSON.stringify({ session: data.session, email: data.email, name: data.name || '', ts: Date.now() }));
    if(['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(data.email.toUpperCase())){
      var expiry = new Date('2099-12-31');
      grantAndReload('pro_tdee', expiry.toISOString().split('T')[0], '', 'OWNER', data.email);
      return;
    }
    var linked = pickAccountSub(data.subscriptions);
    if(linked){
      grantAndReload(linked.plan || 'pro_tdee', (linked.expiresAt || '').slice(0, 10), '', linked.code, data.email, true, subProdOf(linked));
      return;
    }
    document.getElementById('authWelcome').textContent = 'Signed in as ' + (data.name || data.email);
    showStep(2);
    showNoLink(true);
  }

  function initGsi(){
    // Deactivated for testing
    return;
  }

  // ─── Trial + Paywall Gate ───
  var TRIAL_DAYS = 7;
  function getTrialState(){
    var TRIAL_EPOCH = new Date('2026-08-27T00:00:00.000Z').getTime();
    var start = localStorage.getItem('mos_tdee_trial_start') || localStorage.getItem('mos_trial_start');
    if(!start || new Date(start).getTime() < TRIAL_EPOCH){
      start = new Date().toISOString();
      localStorage.setItem('mos_tdee_trial_start', start);
      localStorage.setItem('mos_trial_start', start);
    }
    var daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(start).getTime()) / 864e5);
    return { start: start, daysLeft: Math.max(0, daysLeft), active: daysLeft > 0 };
  }
  var trial = getTrialState();

  if(active){
    if (sub && sub.token) {
      fetch(API_BASE + '/api/check-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sub.token, productId: 'tdee_adaptive_engine' })
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d && !d.valid) {
          localStorage.removeItem('mos_subscription');
          location.reload();
        }
      }).catch(function(){});
    }
  } else if(trial.active){
    var pill = document.getElementById('trialPill');
    if(!pill){
      pill = document.createElement('span');
      pill.id = 'trialPill';
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:.55rem;color:#F4C93B;border:1px solid rgba(244,201,59,.25);background:rgba(244,201,59,.06);border-radius:20px;padding:3px 10px;margin-top:6px;font-weight:600;letter-spacing:1px;text-transform:uppercase;';
      pill.innerHTML = 'TRIAL: ' + trial.daysLeft + ' DAYS LEFT';
      var header = document.querySelector('.header');
      if(header) header.appendChild(pill);
    }
  } else {
    var overlay = document.getElementById('subOverlay');
    if(overlay) overlay.style.display = 'flex';
    var modal = document.querySelector('.sub-modal');
    var el = document.getElementById('trialExpiredNote');
    if(!el && modal){
      el = document.createElement('div');
      el.id = 'trialExpiredNote';
      el.className = 'sub-error';
      el.style.display = 'block';
      el.style.marginBottom = '15px';
      el.textContent = 'Your 7-day trial has ended. Subscribe or enter code to continue.';
      var anchor = modal.querySelector('#authStep2') || modal.lastElementChild;
      if(anchor) modal.insertBefore(el, anchor);
    }
    var gs = getGs();
    var started = false;
    function start(){
      if(started) return;
      started = true;
      if(gs){
        fetch(API_BASE + '/api/check-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: gs.session })
        }).then(function(r){ return r.json(); }).then(function(data){
          if(data && data.valid){
            var linked = pickAccountSub(data.subscriptions);
            if(linked){
              grantAndReload(linked.plan || 'pro_tdee', (linked.expiresAt || '').slice(0, 10), '', linked.code, gs.email, true, subProdOf(linked));
              return;
            }
            document.getElementById('authWelcome').textContent = 'Signed in as ' + (gs.name || gs.email);
            showStep(2);
            showNoLink(true);
          } else {
            localStorage.removeItem(GS_KEY);
            showStep(1);
            showNoLink(false);
            initGsi();
          }
        }).catch(function(){
          document.getElementById('authWelcome').textContent = 'Signed in as ' + (gs.name || gs.email);
          showStep(2);
        });
      } else {
        showStep(1);
        initGsi();
      }
    }
    start();

    var vBtn = document.getElementById('subVerify');
    if(vBtn){
      vBtn.addEventListener('click', function(){
        var code = document.getElementById('subCode').value.trim().toUpperCase();
        if(!code){ showErr('subError', 'Wrong code. Please check and try again.'); return; }
        var g = getGs();
        var email = g ? g.email : '';
        if(['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'].includes(email.toUpperCase())){
          var expiry = new Date('2099-12-31');
          grantAndReload('pro_tdee', expiry.toISOString().split('T')[0], '', 'OWNER', email);
          return;
        }
        verifyCode(code, email, vBtn);
      });
    }
    var subCodeInput = document.getElementById('subCode');
    if(subCodeInput){
      subCodeInput.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && vBtn) vBtn.click();
      });
    }
    var subSignOutBtn = document.getElementById('subSignOut');
    if(subSignOutBtn){
      subSignOutBtn.addEventListener('click', function(e){
        e.preventDefault();
        localStorage.removeItem(GS_KEY);
        showStep(1);
        showNoLink(false);
        initGsi();
      });
    }
  }
})();


// === Phase 2: Recent Foods & Starred Favorites System ===
function getRecentFoods() {
  try {
    return JSON.parse(localStorage.getItem('mos_recent_foods') || '[]');
  } catch(e) { return []; }
}

function saveRecentFood(foodId) {
  try {
    var recents = getRecentFoods().filter(id => id !== foodId);
    recents.unshift(foodId);
    localStorage.setItem('mos_recent_foods', JSON.stringify(recents.slice(0, 15)));
  } catch(e) {}
}

function getFavoriteFoods() {
  try {
    return JSON.parse(localStorage.getItem('mos_favorite_foods') || '[]');
  } catch(e) { return []; }
}

window.toggleFavoriteFood = function(foodId, event) {
  if (event) event.stopPropagation();
  try {
    var favs = getFavoriteFoods();
    var idx = favs.indexOf(foodId);
    if (idx > -1) {
      favs.splice(idx, 1);
      if (window.mosToast) window.mosToast('Removed from favorites', 'info');
    } else {
      favs.push(foodId);
      if (window.mosToast) window.mosToast('⭐ Added to favorite foods!', 'success');
    }
    localStorage.setItem('mos_favorite_foods', JSON.stringify(favs));
    renderFoodLogTab();
  } catch(e) {}
};

window.quickSelectRecentFood = function(foodId) {
  var food = foodDB.find(f => f.id === foodId);
  if (!food) return;

  var modal = document.getElementById('foodAddModal');
  var title = document.getElementById('foodAddTitle');
  var preview = document.getElementById('foodAddPreview');
  var amtInp = document.getElementById('foodAddAmount');
  
  if (modal && title && preview) {
    title.textContent = food.name_en + (food.name_ar ? ' / ' + food.name_ar : '');
    preview.textContent = `${food.calories} kcal | P: ${food.protein}g | C: ${food.carbs}g | F: ${food.fat}g (per 100g)`;
    amtInp.value = '100';
    modal.style.display = 'block';
    modal.dataset.foodId = food.id;
    if (amtInp) amtInp.focus();
  }
};

window.toggleAccordion = function(headerEl) {
  var box = headerEl.closest('.accordion-box');
  if (box) box.classList.toggle('open');
};


// === Phase 4: Multi-Add Staging Drawer (MacroFactor Plate Engine) ===
window.currentPlate = [];

window.addToPlate = function(foodId) {
  var food = foodDB.find(f => f.id === foodId);
  if (!food) return;

  var existing = window.currentPlate.find(p => p.id === food.id);
  if (existing) {
    existing.amount += 100;
  } else {
    window.currentPlate.push({
      id: food.id,
      name_en: food.name_en,
      name_ar: food.name_ar,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      leucine: food.leucine || (food.protein * 0.08),
      amount: 100,
      unit: 'g'
    });
  }

  saveRecentFood(food.id);
  renderPlateBar();
  if (window.mosToast) window.mosToast(`Added 100g ${food.name_en} to Plate 🥗`, 'info');
};

function renderPlateBar() {
  var bar = document.getElementById('plateDrawerBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'plateDrawerBar';
    bar.className = 'plate-drawer-bar';
    document.body.appendChild(bar);
  }

  if (window.currentPlate.length === 0) {
    bar.style.display = 'none';
    return;
  }

  var totalCals = 0;
  window.currentPlate.forEach(p => {
    totalCals += Math.round((p.calories * p.amount) / 100);
  });

  bar.innerHTML = `
    <div class="plate-info">
      <span>🥗 Plate</span>
      <span class="plate-count-badge">${window.currentPlate.length} items</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:var(--accent);">${totalCals} kcal</span>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn-plate-action" onclick="openPlateDrawerModal()">Review &amp; Log &rarr;</button>
    </div>
  `;
  bar.style.display = 'flex';
}

window.openPlateDrawerModal = function() {
  var ov = document.createElement('div');
  ov.className = 'mos-modal-overlay';
  ov.id = 'plateModalOverlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');

  var box = document.createElement('div');
  box.className = 'mos-modal-box';
  box.style.maxWidth = '480px';

  function renderModalItems() {
    var totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
    var itemsHtml = window.currentPlate.map((p, idx) => {
      var itemCals = Math.round((p.calories * p.amount) / 100);
      var itemP = Math.round((p.protein * p.amount) / 100);
      var itemC = Math.round((p.carbs * p.amount) / 100);
      var itemF = Math.round((p.fat * p.amount) / 100);

      totalCals += itemCals;
      totalP += itemP;
      totalC += itemC;
      totalF += itemF;

      return `
        <div class="plate-item-row">
          <div class="plate-item-info">
            <h5>${p.name_en}</h5>
            <span>${itemCals} kcal | P: ${itemP}g | C: ${itemC}g | F: ${itemF}g</span>
          </div>
          <div class="plate-stepper">
            <button class="btn-plate-step" onclick="adjustPlateGrams(${idx}, -25)">−25</button>
            <input type="number" value="${p.amount}" onchange="setPlateGrams(${idx}, this.value)">
            <button class="btn-plate-step" onclick="adjustPlateGrams(${idx}, 25)">+25</button>
            <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem;margin-left:4px;" onclick="removePlateItem(${idx})">🗑</button>
          </div>
        </div>
      `;
    }).join('');

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="mos-modal-title">🥗 Review Meal Plate</div>
        <button id="closePlateModal" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <p class="mos-modal-desc">Adjust individual food portions before committing all to today's log.</p>
      
      <div style="max-height:280px;overflow-y:auto;margin:10px 0;">
        ${itemsHtml}
      </div>

      <div style="background:rgba(0,0,0,0.4);padding:10px 14px;border-radius:10px;border:1px solid var(--line);display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:0.85rem;margin-bottom:12px;">
        <span style="color:#fff;font-weight:700;">Total: ${totalCals} kcal</span>
        <span style="color:#60a5fa;">P: ${totalP}g</span>
        <span style="color:var(--accent);">C: ${totalC}g</span>
        <span style="color:#ec4899;">F: ${totalF}g</span>
      </div>

      <div class="mos-modal-actions">
        <button class="btn btn-secondary" onclick="clearPlate()">Clear Plate</button>
        <button class="btn btn-primary" onclick="commitPlateToLog()">Log Entire Plate &rarr;</button>
      </div>
    `;

    document.getElementById('closePlateModal').onclick = function() { ov.remove(); };
  }

  window.adjustPlateGrams = function(idx, delta) {
    if (window.currentPlate[idx]) {
      window.currentPlate[idx].amount = Math.max(10, window.currentPlate[idx].amount + delta);
      renderModalItems();
      renderPlateBar();
    }
  };

  window.setPlateGrams = function(idx, val) {
    if (window.currentPlate[idx]) {
      window.currentPlate[idx].amount = Math.max(10, parseFloat(val) || 100);
      renderModalItems();
      renderPlateBar();
    }
  };

  window.removePlateItem = function(idx) {
    window.currentPlate.splice(idx, 1);
    renderModalItems();
    renderPlateBar();
    if (window.currentPlate.length === 0) ov.remove();
  };

  window.clearPlate = function() {
    window.currentPlate = [];
    renderPlateBar();
    ov.remove();
  };

  window.commitPlateToLog = function() {
    if (!foodLogStore[currentFoodDate]) foodLogStore[currentFoodDate] = [];
    window.currentPlate.forEach(p => {
      foodLogStore[currentFoodDate].push({
        id: p.id,
        name_en: p.name_en,
        name_ar: p.name_ar,
        calories: Math.round((p.calories * p.amount) / 100),
        protein: Math.round((p.protein * p.amount) / 100),
        carbs: Math.round((p.carbs * p.amount) / 100),
        fat: Math.round((p.fat * p.amount) / 100),
        leucine: (p.leucine * p.amount) / 100,
        amount: p.amount,
        unit: 'g',
        state: 'cooked'
      });
    });

    saveFoodLogs();
    renderFoodLogTab();
    window.currentPlate = [];
    renderPlateBar();
    ov.remove();
    if (window.mosToast) window.mosToast('🎉 Meal plate successfully logged!', 'success');
  };

  ov.appendChild(box);
  document.body.appendChild(ov);
  renderModalItems();
};
