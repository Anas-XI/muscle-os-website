  // ── RPE ──
  function rpePct(reps, rpe){ if(rpe<6||rpe>10)return null; return 100/(1+(reps+(10-rpe))/30); }
  function est1RM(w,r,rpe){ if(!w||!r||!rpe)return null; const p=rpePct(r,rpe); return p?Math.round(w/(p/100)*10)/10:null; }

  // ── SPLITS ──
  const SPLITS = {
    fullbody_3: { name:'Full Body (3-Day)', d:3, days:[
      {n:'Session A (Squat)',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Barbell Row',s:3,p:'back',se:['biceps']},{n:'Leg Curl',s:2,p:'hamstrings',se:[]},{n:'Lateral Raise',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Session B (Hinge)',ex:[{n:'Deadlift Variation',s:3,p:'hamstrings',se:['glutes','back']},{n:'Overhead Press',s:3,p:'shoulders',se:['triceps']},{n:'Pull-Up',s:3,p:'back',se:['biceps']},{n:'Leg Extension',s:2,p:'quads',se:[]},{n:'Bicep Curl',s:2,p:'biceps',se:[]},{n:'Calf Raise',s:2,p:'calves',se:[]}]},
      {n:'Session C (Balanced)',ex:[{n:'Front Squat or Lunge',s:3,p:'quads',se:['glutes']},{n:'Incline Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'RDL',s:2,p:'hamstrings',se:['glutes','back']},{n:'Lateral Raise',s:2,p:'shoulders',se:[]},{n:'Triceps Overhead Ext',s:2,p:'triceps',se:[]}]}
    ]},
    upper_lower_4: { name:'Upper/Lower (4-Day)', d:4, days:[
      {n:'Upper 1',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'T-Bar Row',s:2,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:1,p:'traps',se:[]},{n:'Shoulder Press',s:1,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:1,p:'shoulders',se:[]},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Lower 1',ex:[{n:'Leg Extensions',s:3,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]},
      {n:'Upper 2',ex:[{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Seated Row',s:2,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:2,p:'traps',se:[]},{n:'Vertical Shrugs',s:1,p:'traps',se:[]},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Preacher Curls',s:3,p:'biceps',se:[]},{n:'Triceps Overhead Extensions',s:3,p:'triceps',se:[]}]},
      {n:'Lower 2',ex:[{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:3,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]}
    ]},
    ppl_6: { name:'PPL (6-Day)', d:6, days:[
      {n:'Push',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Shoulder Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]},
      {n:'Pull',ex:[{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Seated Row',s:2,p:'back',se:['biceps']},{n:'T-Bar Row',s:2,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:1,p:'traps',se:[]},{n:'Vertical Shrugs',s:1,p:'traps',se:[]},{n:'Rear Delt Flies',s:2,p:'shoulders',se:[]},{n:'Preacher Curls',s:3,p:'biceps',se:[]},{n:'Forearm Ext/Flex',s:1,p:'forearms',se:[]}]},
      {n:'Legs',ex:[{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]}
    ]},
    torso_limbs_4: { name:'Torso/Limbs (4-Day)', d:4, days:[
      {n:'Torso',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Seated Row',s:1,p:'back',se:['biceps']},{n:'T-Bar Row',s:2,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:1,p:'traps',se:[]},{n:'Vertical Shrugs',s:1,p:'traps',se:[]},{n:'Shoulder Press',s:1,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:1,p:'shoulders',se:[]}]},
      {n:'Limbs',ex:[{n:'Leg Extensions',s:3,p:'quads',se:[]},{n:'Leg Curls',s:3,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Hammer Curls',s:2,p:'biceps',se:['forearms']},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]}
    ]},
    arnold_3r: { name:'Arnold Split (3-Rot)', d:6, days:[
      {n:'Chest & Back',ex:[{n:'Incline Chest Press',s:4,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Seated Row',s:3,p:'back',se:['biceps']},{n:'T-Bar Row',s:2,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:1,p:'traps',se:[]}]},
      {n:'Legs',ex:[{n:'Leg Extensions',s:3,p:'quads',se:[]},{n:'Leg Curls',s:3,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:3,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:3,p:'calves',se:[]}]},
      {n:'Shoulders & Arms',ex:[{n:'Shoulder Press',s:3,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:3,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:2,p:'shoulders',se:[]},{n:'Preacher Curls',s:3,p:'biceps',se:[]},{n:'Hammer Curls',s:2,p:'biceps',se:['forearms']},{n:'Triceps Pushdown',s:3,p:'triceps',se:[]},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]}
    ]}
  };

  // ── Build Hybrid Splits from base SPLITS ──
  (function(){
    function cp(d){return JSON.parse(JSON.stringify(d.ex));}
    // 2-day
    SPLITS.upper_lower_2={name:'Upper/Lower (2-Day)',d:2,days:[
      {n:'Upper (Chest, Back, Delts, Arms)',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Bicep Curl',s:2,p:'biceps',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Lower (Quads, Hams, Glutes, Calves)',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'RDL',s:3,p:'hamstrings',se:['glutes','back']},{n:'Leg Extension',s:2,p:'quads',se:[]},{n:'Leg Curl',s:2,p:'hamstrings',se:[]},{n:'Calf Raise',s:2,p:'calves',se:[]}]}
    ]};
    // 5-day hybrids
    SPLITS.ppl_ul_5={name:'PPL + Upper/Lower (5-Day)',d:5,days:[
      {n:'Push',ex:cp(SPLITS.ppl_6.days[0])},
      {n:'Pull',ex:cp(SPLITS.ppl_6.days[1])},
      {n:'Legs',ex:cp(SPLITS.ppl_6.days[2])},
      {n:'Upper',ex:cp(SPLITS.upper_lower_4.days[0])},
      {n:'Lower',ex:cp(SPLITS.upper_lower_4.days[1])}
    ]};
    SPLITS.ppl_tl_5={name:'PPL + Torso/Limbs (5-Day)',d:5,days:[
      {n:'Push',ex:cp(SPLITS.ppl_6.days[0])},
      {n:'Pull',ex:cp(SPLITS.ppl_6.days[1])},
      {n:'Legs',ex:cp(SPLITS.ppl_6.days[2])},
      {n:'Torso',ex:cp(SPLITS.torso_limbs_4.days[0])},
      {n:'Limbs',ex:cp(SPLITS.torso_limbs_4.days[1])}
    ]};
    SPLITS.arnold_ul_5={name:'Arnold + Upper/Lower (5-Day)',d:5,days:[
      {n:'Chest & Back',ex:cp(SPLITS.arnold_3r.days[0])},
      {n:'Legs',ex:cp(SPLITS.arnold_3r.days[1])},
      {n:'Shoulders & Arms',ex:cp(SPLITS.arnold_3r.days[2])},
      {n:'Upper',ex:cp(SPLITS.upper_lower_4.days[0])},
      {n:'Lower',ex:cp(SPLITS.upper_lower_4.days[1])}
    ]};
    SPLITS.arnold_tl_5={name:'Arnold + Torso/Limbs (5-Day)',d:5,days:[
      {n:'Chest & Back',ex:cp(SPLITS.arnold_3r.days[0])},
      {n:'Legs',ex:cp(SPLITS.arnold_3r.days[1])},
      {n:'Shoulders & Arms',ex:cp(SPLITS.arnold_3r.days[2])},
      {n:'Torso',ex:cp(SPLITS.torso_limbs_4.days[0])},
      {n:'Limbs',ex:cp(SPLITS.torso_limbs_4.days[1])}
    ]};
    // Rest-day splits (scheduled recovery slots)
    SPLITS.ppl_rest_ul_6={name:'PPL + Rest + UL (6-Day)',d:6,days:[
      {n:'Push',ex:cp(SPLITS.ppl_6.days[0])},
      {n:'Pull',ex:cp(SPLITS.ppl_6.days[1])},
      {n:'Legs',ex:cp(SPLITS.ppl_6.days[2])},
      {n:'Rest',restDay:true},
      {n:'Upper',ex:cp(SPLITS.upper_lower_4.days[0])},
      {n:'Lower',ex:cp(SPLITS.upper_lower_4.days[1])}
    ]};
    SPLITS.arnold_rest_4={name:'Arnold + Rest (4-Day)',d:4,days:[
      {n:'Chest & Back',ex:cp(SPLITS.arnold_3r.days[0])},
      {n:'Legs',ex:cp(SPLITS.arnold_3r.days[1])},
      {n:'Shoulders & Arms',ex:cp(SPLITS.arnold_3r.days[2])},
      {n:'Rest',restDay:true}
    ]};
    // 6-day hybrids
    SPLITS.ppl_arnold_6={name:'PPL + Arnold Hybrid (6-Day)',d:6,days:[
      {n:'Push',ex:cp(SPLITS.ppl_6.days[0])},
      {n:'Pull',ex:cp(SPLITS.ppl_6.days[1])},
      {n:'Legs',ex:cp(SPLITS.ppl_6.days[2])},
      {n:'Chest & Back (Compound Focus)',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'T-Bar Row',s:3,p:'back',se:['biceps']},{n:'Seated Row',s:3,p:'back',se:['biceps']},{n:'Kelso Shrugs',s:1,p:'traps',se:[]},{n:'Vertical Shrugs',s:1,p:'traps',se:[]}]},
      {n:'Shoulders & Arms (Isolation Focus)',ex:[{n:'Shoulder Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:3,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:2,p:'shoulders',se:[]},{n:'Preacher Curls',s:3,p:'biceps',se:[]},{n:'Hammer Curls',s:2,p:'biceps',se:['forearms']},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]},
      {n:'Legs + Weak Points',ex:[{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]}
    ]};
    SPLITS.ul_3x_6={name:'Upper/Lower 3x (6-Day)',d:6,days:[
      {n:'Upper 1 (Heavy)',ex:cp(SPLITS.upper_lower_4.days[0])},
      {n:'Lower 1 (Heavy)',ex:cp(SPLITS.upper_lower_4.days[1])},
      {n:'Upper 2 (Volume)',ex:cp(SPLITS.upper_lower_4.days[2])},
      {n:'Lower 2 (Volume)',ex:cp(SPLITS.upper_lower_4.days[3])},
      {n:'Upper 3 (Pump)',ex:[{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Seated Row',s:2,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:1,p:'shoulders',se:[]},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Lower 3 (Pump)',ex:[{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]}
    ]};
    SPLITS.tl_3x_6={name:'Torso/Limbs 3x (6-Day)',d:6,days:[
      {n:'Torso 1 (Heavy)',ex:cp(SPLITS.torso_limbs_4.days[0])},
      {n:'Limbs 1 (Heavy)',ex:cp(SPLITS.torso_limbs_4.days[1])},
      {n:'Torso 2 (Volume)',ex:[{n:'Incline Chest Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'T-Bar Row',s:2,p:'back',se:['biceps']},{n:'Shoulder Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:1,p:'shoulders',se:[]}]},
      {n:'Limbs 2 (Volume)',ex:[{n:'Leg Extensions',s:3,p:'quads',se:[]},{n:'Leg Curls',s:3,p:'hamstrings',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Torso 3 (Pump)',ex:[{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:1,p:'shoulders',se:[]}]},
      {n:'Limbs 3 (Pump)',ex:[{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Calf Raises',s:2,p:'calves',se:[]},{n:'Hammer Curls',s:2,p:'biceps',se:['forearms']},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]}
    ]};
  })();

  // ── Powerlifting Splits ──
  (function(){
    SPLITS.linear_3={name:'Linear Progression (3-Day)',d:3,g:'strength',days:[
      {n:'Squat Focus',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Barbell Row',s:3,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Bench Focus',ex:[{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Calf Raises',s:2,p:'calves',se:[]}]},
      {n:'Deadlift Focus',ex:[{n:'Deadlift Variation',s:3,p:'hamstrings',se:['glutes','back']},{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]}]}
    ]};
    SPLITS.five_three_one_4={name:'5/3/1 (4-Day)',d:4,g:'strength',days:[
      {n:'Press Day (OHP + Triceps)',ex:[{n:'Overhead Press',s:3,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:3,p:'shoulders',se:[]},{n:'Rear Delt Flies',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:3,p:'triceps',se:[]},{n:'Triceps Overhead Extensions',s:2,p:'triceps',se:[]}]},
      {n:'Deadlift Day',ex:[{n:'Deadlift Variation',s:3,p:'hamstrings',se:['glutes','back']},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']},{n:'Calf Raises',s:2,p:'calves',se:[]},{n:'Preacher Curls',s:2,p:'biceps',se:[]}]},
      {n:'Bench Day',ex:[{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Machine Chest Flies',s:2,p:'chest',se:[]},{n:'Lat Pulldown',s:2,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]}]},
      {n:'Squat Day',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'RDL',s:2,p:'hamstrings',se:['glutes','back']},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]}]}
    ]};
    SPLITS.dup_3={name:'DUP (3-Day)',d:3,g:'strength',days:[
      {n:'Heavy (Squat/Bench)',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Barbell Row',s:3,p:'back',se:['biceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]},
      {n:'Moderate (Bench/Row)',ex:[{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Preacher Curls',s:2,p:'biceps',se:[]},{n:'Calf Raises',s:2,p:'calves',se:[]}]},
      {n:'Light (Deadlift/OHP)',ex:[{n:'Deadlift Variation',s:2,p:'hamstrings',se:['glutes','back']},{n:'Overhead Press',s:2,p:'shoulders',se:['triceps']},{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Hip Thrust',s:2,p:'glutes',se:['hamstrings']}]}
    ]};
    SPLITS.block_4={name:'Block Periodization (4-Day)',d:4,g:'strength',days:[
      {n:'Heavy Lower',ex:[{n:'Barbell Squat',s:3,p:'quads',se:['glutes','hamstrings']},{n:'Deadlift Variation',s:3,p:'hamstrings',se:['glutes','back']},{n:'Leg Extensions',s:2,p:'quads',se:[]},{n:'Leg Curls',s:2,p:'hamstrings',se:[]},{n:'Calf Raises',s:2,p:'calves',se:[]}]},
      {n:'Heavy Upper',ex:[{n:'Bench Press',s:3,p:'chest',se:['shoulders','triceps']},{n:'Incline Chest Press',s:2,p:'chest',se:['shoulders','triceps']},{n:'Barbell Row',s:3,p:'back',se:['biceps']},{n:'Overhead Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]}]},
      {n:'Volume Lower',ex:[{n:'Leg Extensions',s:3,p:'quads',se:[]},{n:'Leg Curls',s:3,p:'hamstrings',se:[]},{n:'Hip Thrust',s:3,p:'glutes',se:['hamstrings']},{n:'Adductors (Machine)',s:2,p:'quads',se:[]},{n:'Abductors (Machine)',s:2,p:'glutes',se:[]}]},
      {n:'Volume Upper',ex:[{n:'Lat Pulldown',s:3,p:'back',se:['biceps']},{n:'Seated Row',s:3,p:'back',se:['biceps']},{n:'Machine Chest Flies',s:3,p:'chest',se:[]},{n:'Shoulder Press',s:2,p:'shoulders',se:['triceps']},{n:'Lateral Raises',s:2,p:'shoulders',se:[]},{n:'Triceps Pushdown',s:2,p:'triceps',se:[]}]}
    ]};
  })();

  window.__splits=SPLITS;

  // ── Custom split builder constants ──
  const CUSTOM_SPLIT_KEY='__custom__';
  const DEFAULT_SLOT_SETS=3;
  const SLOT_DEFAULTS={chest:'Bench Press',back:'Lat Pulldown',shoulders:'Overhead Press',quads:'Barbell Squat',hamstrings:'Deadlift Variation',glutes:'Hip Thrust',biceps:'Bicep Curl',triceps:'Triceps Pushdown',calves:'Calf Raise',traps:'Kelso Shrugs',forearms:'Wrist Curl',abs:'Cable Crunch'};

  const CARDIO_TYPES = ['Walking','Jogging','Running','Cycling','Swimming','Rowing','Elliptical','Stairmaster','HIIT','Other'];
  const WEAK_POINTS = [
    {id:'lockout',l:'Lockout (bench/overhead)'},{id:'off_chest',l:'Off Chest (bench)'},
    {id:'off_floor',l:'Off Floor (deadlift)'},{id:'lockout_dl',l:'Lockout (deadlift)'},
    {id:'hole',l:'Bottom of Squat (the hole)'},{id:'midpoint',l:'Mid-Point Sticking'},
    {id:'legs',l:'Leg Strength / Mass'},{id:'back',l:'Back Strength / Thickness'}
  ];
  const K = {VT:'mos_vol_targets',SP:'mos_split_profile',PG:'mos_program',LG:'mos_logs',VI:'mos_vol_inputs',LH:'mos_load_history',DT:'mos_deload_tracker',PF:'mos_pain_flags',PL:'mos_pl_profile',FL:'mos_fatigue_log',CL:'mos_cardio_logs',MP:'mos_meso_plan',MA:'mos_meso_active',MH:'mos_meso_history',MM:'mos_measurements',CE:'mos_custom_exercises',CR:'mos_custom_replacements',SU:'mos_supersets',SS:'mos_sessions',PR:'mos_priority',SR:'mos_soreness_log',PC:'mos_pr_credit',VA:'mos_vol_alloc',FO:'mos_freq_override',CQ:'mos_coach_queue',EV:'mos_events',CS:'mos_custom_split'};

