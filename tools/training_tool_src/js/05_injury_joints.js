  const INJURY_PROTOCOLS = {
    shoulder:{
      name:'Shoulder',icon:'🏋️',
      acute:'Stop all overhead and pressing work. Apply ice 15min every 2-3h. Avoid any movement that reproduces pain. Band pull-aparts only if pain-free.',
      recovery:'Band external rotation, scapular retractions, YTWLs, face pulls, dead hangs. Progress to neutral-grip pressing at <50% load.',
      return:'Gradually reintroduce incline pressing at RPE 6. No behind-neck work. Avoid heavy dips. Stay at RPE ≤7 for 2 weeks.',
      safe:['Lat Pulldown','Seated Row','Rear Delt Flies','Face Pull','Triceps Pushdown','Preacher Curls','Leg Extensions','Leg Curls','Calf Raises','Hip Thrust','Machine Chest Flies','Barbell Squat','RDL'],
      avoid:['Overhead Press','Shoulder Press','Incline Chest Press','Incline Press','Bench Press','Dumbbell Bench Press','Pull-Up','Arnold Press','Close-Grip Bench','JM Press','Skull Crusher','Triceps Overhead Extensions']
    },
    elbow:{
      name:'Elbow',icon:'💪',
      acute:'Stop all triceps isolation and heavy pulling. Ice medial/lateral epicondyle. Avoid full extension under load. Use elbow sleeves for warmth.',
      recovery:'Neutral-grip pulling, band curls, wrist mobility. Progress to light triceps isolation at RPE 5-6. Avoid ballistic movements.',
      return:'Reintroduce pressing and pulling at RPE ≤7. Use hammer/neutral grip when possible. Avoid heavy skull crushers and JM press.',
      safe:['Lat Pulldown','Seated Row','Barbell Squat','Leg Extensions','Leg Curls','Lateral Raises','Rear Delt Flies','Calf Raises','Hip Thrust','Machine Chest Flies','RDL','Deadlift Variation','Barbell Row'],
      avoid:['Preacher Curls','Hammer Curls','Triceps Pushdown','Triceps Overhead Extensions','Close-Grip Bench','JM Press','Skull Crusher','Bicep Curl','Dips']
    },
    knee:{
      name:'Knee',icon:'🦵',
      acute:'Stop all quad-dominant work. Ice and elevate. Avoid deep knee flexion under load. Walking is OK if pain-free.',
      recovery:'Leg curls, RDL, hip thrust, step-ups (shallow). Banded knee extensions at light load. No full range extensions.',
      return:'Reintroduce squats at 50% with controlled depth. No belt squats or heavy hack squats. Calf raises and hip thrust are safe.',
      safe:['RDL','Hip Thrust','Leg Curls','Calf Raises','Lat Pulldown','Seated Row','Bench Press','Lateral Raises','Triceps Pushdown','Preacher Curls','Rear Delt Flies'],
      avoid:['Barbell Squat','Leg Extensions','Leg Press','Bulgarian Split Squat','Sissy Squat','Step-Up','Front Squat or Lunge','Hack Squat','Goblet Squat','Belt Squat','Adductors (Machine)']
    },
    spine:{
      name:'Lower Back / Spine',icon:'🔙',
      acute:'Stop all axial loading and hinging. No deadlifts, squats, or standing OHP. Ice and avoid prolonged sitting. Gentle cat-cow and child pose.',
      recovery:'Bird-dog, dead bug, glute bridges, side planks. Banded pull-throughs. No spinal flexion under load. Core bracing practice.',
      return:'RDL at 40% with perfect bracing → goblet squat → trap bar deadlift. No conventional deadlift for 2-3 weeks. Always brace before each rep.',
      safe:['Lat Pulldown','Machine Chest Flies','Lateral Raises','Rear Delt Flies','Triceps Pushdown','Preacher Curls','Calf Raises','Leg Extensions','Leg Curls','Hip Thrust','Bench Press','Incline Chest Press'],
      avoid:['Deadlift Variation','Barbell Row','Barbell Squat','RDL','Good Morning','T-Bar Row','Overhead Press','Shoulder Press','Kelso Shrugs','Standing OHP','Farmers Walk']
    },
    hip:{
      name:'Hip',icon:'🦵',
      acute:'Stop adductor/abductor work and deep squats. Ice hip joint. Avoid explosive hip extension. Gentle hip CARs and circles.',
      recovery:'Leg extensions (light), leg curls, calf raises. Banded lateral walks. Progress to shallow squat at <50%. Glute bridges at high reps.',
      return:'Hip thrust, RDL, deep squat at RPE ≤7. No adductor machine or ballistic hip work for 2 weeks.',
      safe:['Leg Extensions','Leg Curls','Calf Raises','Lat Pulldown','Seated Row','Bench Press','Triceps Pushdown','Preacher Curls','Lateral Raises','Incline Chest Press','Machine Chest Flies'],
      avoid:['Adductors (Machine)','Abductors (Machine)','Hip Thrust','Barbell Squat','Front Squat or Lunge','Bulgarian Split Squat','Step-Up','Cossack Squat']
    },
    trap:{
      name:'Traps / Neck',icon:'🔝',
      acute:'Stop all shrugging and heavy pulling. No direct trap work. Ice upper traps. Gentle neck rotations and chin tucks.',
      recovery:'Band face pulls, YTWLs, wall angels. No direct trap isolation. Unweighted scapular retraction.',
      return:'Start with band shrugs → light dumbbell shrugs at RPE 6. No barbell shrugs for 2 weeks.',
      safe:['Lat Pulldown','Seated Row','Bench Press','Incline Chest Press','Lateral Raises','Triceps Pushdown','Leg Extensions','Leg Curls','Calf Raises','RDL','Barbell Squat','Hip Thrust'],
      avoid:['Kelso Shrugs','Vertical Shrugs','Barbell Shrugs','Farmers Walk','Barbell Row','Deadlift Variation','Pull-Up']
    },
    wrist:{
      name:'Wrist',icon:'✋',
      acute:'Stop all wrist-flexing exercises. No curls or pressing that extends wrist. Ice and brace. Rice bucket mobility.',
      recovery:'Neutral-grip work, wrist curls (light), finger extensions. Progress to push-ups on fists/dumbbells.',
      return:'Reintroduce pressing on flat surface. Use wrist wraps for heavy pressing. No barbell curls for 2 weeks.',
      safe:['Barbell Squat','Leg Extensions','Leg Curls','Hip Thrust','Calf Raises','Lat Pulldown','Lateral Raises','Rear Delt Flies','Machine Chest Flies','Preacher Curls (EZ bar)','RDL','Deadlift Variation (trap bar)'],
      avoid:['Forearm Ext/Flex','Bench Press (wide)','Bicep Curl (barbell)','Wrist Curl','Reverse Wrist Curl','Farmers Walk','Plate Pinch','Push-Up']
    }
  };
  // Map joints to exercises (which exercises use which joints)
  function jointsForExercise(ex){
    var m=meta(ex);
    return (m.jr||[]).map(function(j){return j.replace(/"/g,'').trim().toLowerCase();});
  }
  function exerciseAffectsJoint(ex,joint){
    var jrs=jointsForExercise(ex);
    return jrs.indexOf(joint.toLowerCase())>=0;
  }
  function getInjuredJoints(pf){
    var joints={};
    Object.keys(pf||{}).forEach(function(ex){
      var jrs=jointsForExercise(ex);
      if(pf[ex]==='red')jrs.forEach(function(j){if(j)joints[j]='red';});
      if(pf[ex]==='yellow')jrs.forEach(function(j){if(j&&!joints[j])joints[j]='yellow';});
    });
    return joints;
  }
  function rehabForExercise(ex,pf){
    var jrs=jointsForExercise(ex);
    for(var i=0;i<jrs.length;i++){
      var j=jrs[i];if(j&&pf&&(pf[ex]==='red'||pf[ex]==='yellow'))return INJURY_PROTOCOLS[j]||null;
      // Also check if any OTHER exercise flags a joint this one uses
      if(pf)for(var k in pf){if(k===ex)continue;var otherJrs=jointsForExercise(k);if(otherJrs.indexOf(j)>=0&&(pf[k]==='red'||pf[k]==='yellow'))return INJURY_PROTOCOLS[j]||null;}
    }
    return null;
  }
  function rehabSummary(pf){
    var joints={};var hasRed=false;
    Object.keys(pf||{}).forEach(function(ex){
      var v=pf[ex];
      if(v==='red')hasRed=true;
      jointsForExercise(ex).forEach(function(j){if(j&&INJURY_PROTOCOLS[j]){joints[j]=joints[j]||(v==='red'?'🔴':'🟡');}});
    });
    if(!Object.keys(joints).length)return null;
    return{hasRed:hasRed,areas:Object.keys(joints).map(function(j){return{id:j,name:INJURY_PROTOCOLS[j].name,icon:INJURY_PROTOCOLS[j].icon,severity:joints[j]}})};
  }

  const EXERCISE_META = {
    "Barbell Squat":{t:"compound",f:"high",jr:["knee","spine","hip"],inc:2.5,rr:[6,12],subs:["Front Squat","Leg Press","Goblet Squat","Belt Squat","Hack Squat"]},
    "Bench Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Dumbbell Bench Press","Machine Chest Press","Floor Press","Incline Press"]},
    "Barbell Row":{t:"compound",f:"moderate",jr:["spine","shoulder"],inc:2.5,rr:[6,12],subs:["Chest-Supported Row","Seated Cable Row","T-Bar Row","Dumbbell Row"]},
    "Leg Curl":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[8,15],subs:["RDL","Nordic Curl","Kneeling Leg Curl","Good Morning"]},
    "Leg Curls":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[8,15],subs:["RDL","Nordic Curl","Kneeling Leg Curl","Good Morning"]},
    "Lateral Raise":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Cable Lateral Raise","Lean-Away Lateral Raise","DB Upright Row"]},
    "Lateral Raises":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Cable Lateral Raise","Lean-Away Lateral Raise","DB Upright Row"]},
    "Triceps Pushdown":{t:"isolation",f:"low",jr:["elbow"],inc:2.5,rr:[8,15],subs:["Overhead Triceps Ext","JM Press","Close-Grip Bench","Skull Crusher"]},
    "Deadlift Variation":{t:"compound",f:"high",jr:["spine","hip"],inc:2.5,rr:[4,8],subs:["Trap Bar Deadlift","RDL","Good Morning","Hyperextension"]},
    "Overhead Press":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[5,10],subs:["Seated DB Press","Machine Shoulder Press","Incline Press"]},
    "Pull-Up":{t:"compound",f:"high",jr:["shoulder","elbow"],inc:-1,rr:[6,12],subs:["Lat Pulldown","Cable Pullover","Inverted Row","Assisted Pull-Up"]},
    "Leg Extension":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[10,15],subs:["Bulgarian Split Squat","Sissy Squat","Step-Up","Leg Press"]},
    "Leg Extensions":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[10,15],subs:["Bulgarian Split Squat","Sissy Squat","Step-Up","Leg Press"]},
    "Bicep Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Incline DB Curl","Preacher Curl","Cable Curl","Hammer Curl"]},
    "Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Seated Calf Raise","Leg Press Calf Raise","Donkey Calf Raise"]},
    "Calf Raises":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Seated Calf Raise","Leg Press Calf Raise","Donkey Calf Raise"]},
    "Front Squat or Lunge":{t:"compound",f:"high",jr:["knee","spine","hip"],inc:2.5,rr:[6,12],subs:["Leg Press","Bulgarian Split Squat","Goblet Squat","Hack Squat"]},
    "Incline Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Dumbbell Incline Press","Machine Incline Press","Flat Dumbbell Press"]},
    "Incline Chest Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Dumbbell Incline Press","Machine Incline Press","Flat Dumbbell Press"]},
    "Lat Pulldown":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Pull-Up","Cable Pullover","Inverted Row","Straight-Arm Pulldown"]},
    "RDL":{t:"compound",f:"high",jr:["spine","hip"],inc:2.5,rr:[6,12],subs:["Good Morning","Hyperextension","Kneeling Leg Curl","Trap Bar Deadlift"]},
    "Triceps Overhead Ext":{t:"isolation",f:"low",jr:["elbow","shoulder"],inc:1,rr:[8,15],subs:["Triceps Pushdown","Close-Grip Bench","JM Press","Skull Crusher"]},
    "Triceps Overhead Extensions":{t:"isolation",f:"low",jr:["elbow","shoulder"],inc:1,rr:[8,15],subs:["Triceps Pushdown","Close-Grip Bench","JM Press","Skull Crusher"]},
    "Machine Chest Flies":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[8,15],subs:["Dumbbell Flies","Cable Flies","Pec Deck","Push-Up"]},
    "T-Bar Row":{t:"compound",f:"moderate",jr:["spine","shoulder"],inc:2.5,rr:[6,12],subs:["Chest-Supported Row","Seated Cable Row","Dumbbell Row","Meadows Row"]},
    "Kelso Shrugs":{t:"isolation",f:"low",jr:["trap"],inc:5,rr:[8,15],subs:["Dumbbell Shrugs","Barbell Shrugs","Farmers Walk","Face Pull"]},
    "Shoulder Press":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[6,12],subs:["Seated DB Press","Machine Shoulder Press","Arnold Press","Lateral Raise"]},
    "Rear Delt Flies":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Face Pull","Reverse Pec Deck","Bent-Over Cable Rear Delt","Wide Row"]},
    "Preacher Curls":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[8,15],subs:["Standing DB Curl","Cable Curl","Incline Curl","Hammer Curl"]},
    "Preacher Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[8,15],subs:["Standing DB Curl","Cable Curl","Incline Curl","Hammer Curl"]},
    "Adductors (Machine)":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Cable Adduction","Side-Lying Leg Raise","Cossack Squat","Bulgarian Split Squat"]},
    "Abductors (Machine)":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Band Lateral Walk","Clam Shell","Side-Lying Leg Raise","Cable Abduction"]},
    "Hip Thrust":{t:"compound",f:"moderate",jr:["hip","spine"],inc:2.5,rr:[6,15],subs:["Glute Bridge","Cable Pull-Through","Bulgarian Split Squat","KAS Glute Bridge"]},
    "Seated Row":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[6,12],subs:["Chest-Supported Row","Cable Row","Dumbbell Row","Inverted Row"]},
    "Vertical Shrugs":{t:"isolation",f:"low",jr:["trap"],inc:5,rr:[8,15],subs:["Barbell Shrugs","Dumbbell Shrugs","Farmers Walk","Face Pull"]},
    "Hammer Curls":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[8,15],subs:["Standing DB Curl","Cable Curl","Reverse Curl","Incline Curl"]},
    "Forearm Ext/Flex":{t:"isolation",f:"low",jr:["wrist"],inc:1,rr:[10,20],subs:["Wrist Curl","Reverse Wrist Curl","Farmers Walk","Plate Pinch"]},
    // ── Prehab (P3) ──
    "Band Pull-Apart":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:[],prehab:true},
    "Terminal Knee Extension":{t:"isolation",f:"low",jr:["knee"],inc:1,rr:[12,20],subs:[],prehab:true},
    "Bird Dog":{t:"isolation",f:"low",jr:["hip","spine"],inc:1,rr:[10,20],subs:[],prehab:true},
    "Dead Bug":{t:"isolation",f:"low",jr:["spine"],inc:1,rr:[8,15],subs:[],prehab:true},
    // ── Pool expansion (quads) ──
    "Front Squat":{t:"compound",f:"high",jr:["knee","spine","hip"],inc:2.5,rr:[6,12],subs:["Barbell Squat","Leg Press","Goblet Squat","Hack Squat"]},
    "Leg Press":{t:"compound",f:"moderate",jr:["knee","hip"],inc:2.5,rr:[6,15],subs:["Barbell Squat","Hack Squat","Bulgarian Split Squat","Goblet Squat"]},
    "Goblet Squat":{t:"compound",f:"moderate",jr:["knee","spine"],inc:2.5,rr:[8,15],subs:["Barbell Squat","Front Squat","Bulgarian Split Squat","Leg Press"]},
    "Hack Squat":{t:"compound",f:"moderate",jr:["knee","hip"],inc:2.5,rr:[6,12],subs:["Leg Press","Barbell Squat","Front Squat","Belt Squat"]},
    "Belt Squat":{t:"compound",f:"moderate",jr:["knee","hip"],inc:2.5,rr:[6,12],subs:["Leg Press","Hack Squat","Barbell Squat","Goblet Squat"]},
    "Bulgarian Split Squat":{t:"compound",f:"high",jr:["knee","hip"],inc:2.5,rr:[6,12],subs:["Leg Press","Goblet Squat","Step-Up","Barbell Squat"]},
    "Sissy Squat":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[10,15],subs:["Leg Extension","Bulgarian Split Squat","Step-Up","Leg Press"]},
    "Step-Up":{t:"compound",f:"moderate",jr:["knee","hip"],inc:2.5,rr:[8,12],subs:["Bulgarian Split Squat","Leg Press","Goblet Squat","Barbell Squat"]},
    // ── Pool expansion (hamstrings) ──
    "Trap Bar Deadlift":{t:"compound",f:"high",jr:["spine","hip","knee"],inc:2.5,rr:[4,8],subs:["Deadlift Variation","RDL","Hack Squat","Leg Press"]},
    "Stiff-Leg Deadlift":{t:"compound",f:"high",jr:["spine","hip"],inc:2.5,rr:[6,12],subs:["RDL","Good Morning","Hyperextension","Leg Curl"]},
    "Good Morning":{t:"compound",f:"moderate",jr:["spine","hip"],inc:2.5,rr:[6,12],subs:["RDL","Stiff-Leg Deadlift","Hyperextension","Kneeling Leg Curl"]},
    "Nordic Curl":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[6,10],subs:["Leg Curl","Kneeling Leg Curl","RDL","Hyperextension"]},
    "Kneeling Leg Curl":{t:"isolation",f:"low",jr:["knee"],inc:2.5,rr:[8,15],subs:["Leg Curl","Nordic Curl","RDL","Good Morning"]},
    "Hyperextension":{t:"isolation",f:"low",jr:["spine","hip"],inc:2.5,rr:[8,15],subs:["Good Morning","RDL","Kneeling Leg Curl","Trap Bar Deadlift"]},
    // ── Pool expansion (glutes) ──
    "Glute Bridge":{t:"compound",f:"moderate",jr:["hip"],inc:2.5,rr:[10,15],subs:["Hip Thrust","KAS Glute Bridge","Cable Pull-Through","Sumo Deadlift"]},
    "Cable Pull-Through":{t:"compound",f:"moderate",jr:["hip","spine"],inc:2.5,rr:[10,15],subs:["Hip Thrust","Glute Bridge","KAS Glute Bridge","RDL"]},
    "KAS Glute Bridge":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[8,15],subs:["Hip Thrust","Glute Bridge","Cable Pull-Through","Abductors (Machine)"]},
    "Cable Abduction":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Abductors (Machine)","Band Lateral Walk","Clam Shell","Side-Lying Leg Raise"]},
    "Band Lateral Walk":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Abductors (Machine)","Cable Abduction","Clam Shell","Side-Lying Leg Raise"]},
    "Clam Shell":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Abductors (Machine)","Band Lateral Walk","Cable Abduction","Side-Lying Leg Raise"]},
    "Side-Lying Leg Raise":{t:"isolation",f:"low",jr:["hip"],inc:2.5,rr:[10,20],subs:["Abductors (Machine)","Cable Abduction","Clam Shell","Band Lateral Walk"]},
    "Sumo Deadlift":{t:"compound",f:"high",jr:["spine","hip","knee"],inc:2.5,rr:[4,8],subs:["Deadlift Variation","Trap Bar Deadlift","Hip Thrust","RDL"]},
    // ── Pool expansion (chest) ──
    "Dumbbell Bench Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Bench Press","Machine Chest Press","Dumbbell Incline Press","Floor Press"]},
    "Machine Chest Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[8,15],subs:["Bench Press","Dumbbell Bench Press","Machine Incline Press","Floor Press"]},
    "Dumbbell Incline Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Incline Chest Press","Machine Incline Press","Dumbbell Bench Press","Bench Press"]},
    "Machine Incline Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[8,15],subs:["Incline Chest Press","Dumbbell Incline Press","Machine Chest Press","Bench Press"]},
    "Dumbbell Flies":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,15],subs:["Machine Chest Flies","Cable Flies","Pec Deck","Push-Up"]},
    "Cable Flies":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,15],subs:["Machine Chest Flies","Dumbbell Flies","Pec Deck","Push-Up"]},
    "Pec Deck":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,15],subs:["Machine Chest Flies","Cable Flies","Dumbbell Flies","Push-Up"]},
    "Floor Press":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,10],subs:["Bench Press","Close-Grip Bench","Dumbbell Bench Press","Machine Chest Press"]},
    "Push-Up":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[10,20],subs:["Bench Press","Machine Chest Press","Floor Press","Dumbbell Bench Press"]},
    "Chest Dip":{t:"compound",f:"high",jr:["shoulder","elbow"],inc:2.5,rr:[6,12],subs:["Bench Press","Dumbbell Bench Press","Push-Up","Machine Chest Press"]},
    // ── Pool expansion (back) ──
    "Chest-Supported Row":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[8,15],subs:["Seated Cable Row","T-Bar Row","Dumbbell Row","Meadows Row"]},
    "Seated Cable Row":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[6,12],subs:["Seated Row","Chest-Supported Row","Dumbbell Row","T-Bar Row"]},
    "Dumbbell Row":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[6,12],subs:["Barbell Row","Chest-Supported Row","Seated Cable Row","Meadows Row"]},
    "Meadows Row":{t:"compound",f:"moderate",jr:["spine","shoulder"],inc:2.5,rr:[6,12],subs:["T-Bar Row","Chest-Supported Row","Dumbbell Row","Barbell Row"]},
    "Chin-Up":{t:"compound",f:"high",jr:["shoulder","elbow"],inc:-1,rr:[6,12],subs:["Pull-Up","Lat Pulldown","Assisted Pull-Up","Inverted Row"]},
    "Assisted Pull-Up":{t:"compound",f:"high",jr:["shoulder","elbow"],inc:-1,rr:[6,12],subs:["Pull-Up","Lat Pulldown","Chin-Up","Inverted Row"]},
    "Straight-Arm Pulldown":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,15],subs:["Cable Pullover","Lat Pulldown","Pull-Up","Seated Row"]},
    "Inverted Row":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[8,15],subs:["Pull-Up","Lat Pulldown","Seated Cable Row","Chest-Supported Row"]},
    "Cable Pullover":{t:"compound",f:"moderate",jr:["shoulder"],inc:2.5,rr:[8,15],subs:["Straight-Arm Pulldown","Lat Pulldown","Pull-Up","Seated Row"]},
    // ── Pool expansion (shoulders) ──
    "Seated DB Press":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[6,12],subs:["Overhead Press","Machine Shoulder Press","Arnold Press","Shoulder Press"]},
    "Machine Shoulder Press":{t:"compound",f:"moderate",jr:["shoulder"],inc:2.5,rr:[8,15],subs:["Overhead Press","Seated DB Press","Arnold Press","Shoulder Press"]},
    "Arnold Press":{t:"compound",f:"moderate",jr:["shoulder"],inc:2.5,rr:[8,15],subs:["Seated DB Press","Overhead Press","Machine Shoulder Press","Lateral Raise"]},
    "Cable Lateral Raise":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Lateral Raise","Lean-Away Lateral Raise","DB Upright Row","Front Raise"]},
    "Lean-Away Lateral Raise":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Lateral Raise","Cable Lateral Raise","DB Upright Row","Front Raise"]},
    "Front Raise":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Lateral Raise","Cable Lateral Raise","Arnold Press","DB Upright Row"]},
    "Face Pull":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,20],subs:["Rear Delt Flies","Reverse Pec Deck","Bent-Over Cable Rear Delt","Wide Row"]},
    "Reverse Pec Deck":{t:"isolation",f:"low",jr:["shoulder"],inc:2.5,rr:[10,20],subs:["Rear Delt Flies","Face Pull","Bent-Over Cable Rear Delt","Wide Row"]},
    "Bent-Over Cable Rear Delt":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,20],subs:["Rear Delt Flies","Face Pull","Reverse Pec Deck","Wide Row"]},
    "DB Upright Row":{t:"isolation",f:"low",jr:["shoulder"],inc:1,rr:[10,15],subs:["Barbell Upright Row","Lateral Raise","Cable Lateral Raise","Front Raise"]},
    "Barbell Upright Row":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[8,12],subs:["DB Upright Row","Lateral Raise","Cable Lateral Raise","Arnold Press"]},
    "Wide Row":{t:"compound",f:"moderate",jr:["shoulder","spine"],inc:2.5,rr:[8,15],subs:["Rear Delt Flies","Seated Row","Face Pull","Chest-Supported Row"]},
    // ── Pool expansion (triceps) ──
    "Rope Pushdown":{t:"isolation",f:"low",jr:["elbow"],inc:2.5,rr:[8,15],subs:["Triceps Pushdown","Overhead Cable Extension","Skull Crusher","Close-Grip Bench"]},
    "Overhead Cable Extension":{t:"isolation",f:"low",jr:["elbow","shoulder"],inc:1,rr:[10,15],subs:["Triceps Overhead Ext","Rope Pushdown","Triceps Pushdown","Skull Crusher"]},
    "Skull Crusher":{t:"isolation",f:"low",jr:["elbow"],inc:2.5,rr:[8,15],subs:["Triceps Overhead Ext","Rope Pushdown","Close-Grip Bench","JM Press"]},
    "Close-Grip Bench":{t:"compound",f:"moderate",jr:["shoulder","elbow"],inc:2.5,rr:[6,10],subs:["Bench Press","JM Press","Triceps Pushdown","Floor Press"]},
    "JM Press":{t:"compound",f:"moderate",jr:["elbow"],inc:2.5,rr:[6,10],subs:["Close-Grip Bench","Skull Crusher","Triceps Pushdown","Bench Press"]},
    "Bench Dip":{t:"isolation",f:"low",jr:["elbow","shoulder"],inc:2.5,rr:[10,15],subs:["Triceps Pushdown","Rope Pushdown","Skull Crusher","Close-Grip Bench"]},
    // ── Pool expansion (biceps) ──
    "EZ-Bar Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Bicep Curl","Standing DB Curl","Cable Curl","Preacher Curl"]},
    "Standing DB Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Bicep Curl","EZ-Bar Curl","Cable Curl","Incline DB Curl"]},
    "Incline DB Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Bicep Curl","Preacher Curl","Cable Curl","Standing DB Curl"]},
    "Cable Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Bicep Curl","EZ-Bar Curl","Preacher Curl","Standing DB Curl"]},
    "Spider Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Preacher Curl","Bicep Curl","Incline DB Curl","EZ-Bar Curl"]},
    "Concentration Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Bicep Curl","Standing DB Curl","Incline DB Curl","Spider Curl"]},
    "Reverse Curl":{t:"isolation",f:"low",jr:["elbow"],inc:1,rr:[10,15],subs:["Hammer Curls","Bicep Curl","EZ-Bar Curl","Standing DB Curl"]},
    // ── Pool expansion (calves) ──
    "Standing Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Calf Raise","Seated Calf Raise","Single-Leg Calf Raise","Donkey Calf Raise"]},
    "Single-Leg Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Calf Raise","Standing Calf Raise","Seated Calf Raise","Leg Press Calf Raise"]},
    "Seated Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Calf Raise","Leg Press Calf Raise","Donkey Calf Raise","Standing Calf Raise"]},
    "Leg Press Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Calf Raise","Seated Calf Raise","Donkey Calf Raise","Standing Calf Raise"]},
    "Donkey Calf Raise":{t:"isolation",f:"low",jr:["ankle"],inc:5,rr:[10,20],subs:["Calf Raise","Seated Calf Raise","Leg Press Calf Raise","Standing Calf Raise"]},
    // ── Pool expansion (traps) ──
    "Barbell Shrugs":{t:"isolation",f:"low",jr:["trap"],inc:5,rr:[8,15],subs:["Kelso Shrugs","Vertical Shrugs","Dumbbell Shrugs","Farmers Walk"]},
    "Dumbbell Shrugs":{t:"isolation",f:"low",jr:["trap"],inc:5,rr:[8,15],subs:["Kelso Shrugs","Vertical Shrugs","Barbell Shrugs","Farmers Walk"]},
    "Farmers Walk":{t:"isolation",f:"low",jr:["trap","wrist"],inc:5,rr:[10,20],subs:["Kelso Shrugs","Barbell Shrugs","Dumbbell Shrugs","Dead Hang"]},
    // ── Pool expansion (forearms) ──
    "Wrist Curl":{t:"isolation",f:"low",jr:["wrist"],inc:1,rr:[10,20],subs:["Forearm Ext/Flex","Reverse Wrist Curl","Plate Pinch","Dead Hang"]},
    "Reverse Wrist Curl":{t:"isolation",f:"low",jr:["wrist"],inc:1,rr:[10,20],subs:["Forearm Ext/Flex","Wrist Curl","Plate Pinch","Dead Hang"]},
    "Plate Pinch":{t:"isolation",f:"low",jr:["wrist"],inc:1,rr:[10,20],subs:["Forearm Ext/Flex","Wrist Curl","Reverse Wrist Curl","Dead Hang"]},
    "Dead Hang":{t:"isolation",f:"low",jr:["wrist","shoulder"],inc:1,rr:[10,20],subs:["Plate Pinch","Farmers Walk","Wrist Curl","Reverse Wrist Curl"]},
    // ── Pool expansion (abs) ──
    "Hanging Leg Raise":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[10,15],subs:["Leg Raise","Cable Crunch","Ab Wheel Rollout","Plank"]},
    "Leg Raise":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[10,20],subs:["Hanging Leg Raise","Cable Crunch","Ab Wheel Rollout","Plank"]},
    "Cable Crunch":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[10,20],subs:["Hanging Leg Raise","Leg Raise","Ab Wheel Rollout","Plank"]},
    "Ab Wheel Rollout":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[8,15],subs:["Plank","Hanging Leg Raise","Cable Crunch","Leg Raise"]},
    "Plank":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[10,20],subs:["Ab Wheel Rollout","Hanging Leg Raise","Leg Raise","Cable Crunch"]}
  };

  // ── Exercise pools per muscle group (favorites picker) ──
  const EXERCISE_POOLS = {
    chest:["Bench Press","Incline Chest Press","Machine Chest Press","Dumbbell Bench Press","Dumbbell Incline Press","Machine Incline Press","Machine Chest Flies","Dumbbell Flies","Cable Flies","Pec Deck","Floor Press","Push-Up","Chest Dip"],
    back:["Barbell Row","T-Bar Row","Meadows Row","Seated Row","Chest-Supported Row","Seated Cable Row","Dumbbell Row","Lat Pulldown","Pull-Up","Assisted Pull-Up","Chin-Up","Straight-Arm Pulldown","Cable Pullover","Inverted Row"],
    shoulders:["Overhead Press","Shoulder Press","Seated DB Press","Machine Shoulder Press","Arnold Press","Lateral Raise","Cable Lateral Raise","Lean-Away Lateral Raise","Front Raise","DB Upright Row","Barbell Upright Row","Rear Delt Flies","Face Pull","Reverse Pec Deck","Bent-Over Cable Rear Delt","Wide Row"],
    quads:["Barbell Squat","Front Squat","Belt Squat","Leg Press","Hack Squat","Goblet Squat","Bulgarian Split Squat","Step-Up","Leg Extension","Sissy Squat"],
    hamstrings:["Deadlift Variation","RDL","Trap Bar Deadlift","Stiff-Leg Deadlift","Good Morning","Hyperextension","Leg Curl","Nordic Curl","Kneeling Leg Curl"],
    glutes:["Hip Thrust","Glute Bridge","KAS Glute Bridge","Cable Pull-Through","Sumo Deadlift","Abductors (Machine)","Cable Abduction","Band Lateral Walk","Clam Shell","Side-Lying Leg Raise","Step-Up"],
    biceps:["Bicep Curl","EZ-Bar Curl","Standing DB Curl","Incline DB Curl","Cable Curl","Preacher Curl","Spider Curl","Concentration Curl","Hammer Curls","Reverse Curl"],
    triceps:["Triceps Pushdown","Rope Pushdown","Triceps Overhead Ext","Overhead Cable Extension","Skull Crusher","Close-Grip Bench","JM Press","Bench Dip"],
    calves:["Calf Raise","Standing Calf Raise","Single-Leg Calf Raise","Seated Calf Raise","Leg Press Calf Raise","Donkey Calf Raise"],
    traps:["Kelso Shrugs","Vertical Shrugs","Barbell Shrugs","Dumbbell Shrugs","Farmers Walk","Face Pull"],
    forearms:["Forearm Ext/Flex","Wrist Curl","Reverse Wrist Curl","Plate Pinch","Dead Hang"],
    abs:["Hanging Leg Raise","Leg Raise","Cable Crunch","Ab Wheel Rollout","Plank"]
  };
  window.__pools=EXERCISE_POOLS;window.__exMeta=EXERCISE_META;

  // ── Exercise regions: muscle → region buckets (library + picker grouping) ──
  const EXERCISE_REGIONS = {
    chest:[
      {k:'rgn_upper',ex:['Incline Chest Press','Dumbbell Incline Press','Machine Incline Press']},
      {k:'rgn_mid',ex:['Bench Press','Machine Chest Press','Dumbbell Bench Press','Floor Press','Push-Up']},
      {k:'rgn_lower',ex:['Chest Dip']},
      {k:'rgn_flies',ex:['Machine Chest Flies','Dumbbell Flies','Cable Flies','Pec Deck']}
    ],
    back:[
      {k:'rgn_lats',ex:['Lat Pulldown','Pull-Up','Assisted Pull-Up','Chin-Up','Straight-Arm Pulldown','Cable Pullover']},
      {k:'rgn_rows',ex:['Barbell Row','T-Bar Row','Meadows Row','Seated Row','Chest-Supported Row','Seated Cable Row','Dumbbell Row','Inverted Row']}
    ],
    shoulders:[
      {k:'rgn_front',ex:['Overhead Press','Shoulder Press','Seated DB Press','Machine Shoulder Press','Arnold Press','Front Raise','DB Upright Row','Barbell Upright Row']},
      {k:'rgn_lateral',ex:['Lateral Raise','Cable Lateral Raise','Lean-Away Lateral Raise']},
      {k:'rgn_rear',ex:['Rear Delt Flies','Face Pull','Reverse Pec Deck','Bent-Over Cable Rear Delt','Wide Row']}
    ],
    quads:[
      {k:'rgn_squat',ex:['Barbell Squat','Front Squat','Belt Squat','Hack Squat','Goblet Squat','Bulgarian Split Squat','Step-Up','Sissy Squat']},
      {k:'rgn_press',ex:['Leg Press']},
      {k:'rgn_isol',ex:['Leg Extension']}
    ],
    hamstrings:[
      {k:'rgn_hinge',ex:['Deadlift Variation','RDL','Trap Bar Deadlift','Stiff-Leg Deadlift','Good Morning','Hyperextension']},
      {k:'rgn_curl',ex:['Leg Curl','Nordic Curl','Kneeling Leg Curl']}
    ],
    glutes:[
      {k:'rgn_thrust',ex:['Hip Thrust','Glute Bridge','KAS Glute Bridge','Cable Pull-Through','Sumo Deadlift','Step-Up']},
      {k:'rgn_abduct',ex:['Abductors (Machine)','Cable Abduction','Band Lateral Walk','Clam Shell','Side-Lying Leg Raise']}
    ],
    biceps:[
      {k:'rgn_curl',ex:['Bicep Curl','EZ-Bar Curl','Standing DB Curl','Cable Curl','Preacher Curl','Spider Curl','Concentration Curl']},
      {k:'rgn_stretch',ex:['Incline DB Curl']},
      {k:'rgn_hammer',ex:['Hammer Curls','Reverse Curl']}
    ],
    triceps:[
      {k:'rgn_pushdown',ex:['Triceps Pushdown','Rope Pushdown']},
      {k:'rgn_overhead',ex:['Triceps Overhead Ext','Overhead Cable Extension','Skull Crusher']},
      {k:'rgn_pressing',ex:['Close-Grip Bench','JM Press','Bench Dip']}
    ],
    calves:[
      {k:'rgn_standing',ex:['Calf Raise','Standing Calf Raise','Single-Leg Calf Raise','Donkey Calf Raise']},
      {k:'rgn_seated',ex:['Seated Calf Raise','Leg Press Calf Raise']}
    ],
    traps:[{k:'rgn_traps',ex:['Kelso Shrugs','Vertical Shrugs','Barbell Shrugs','Dumbbell Shrugs','Farmers Walk','Face Pull']}],
    forearms:[
      {k:'rgn_wrist',ex:['Wrist Curl','Reverse Wrist Curl','Forearm Ext/Flex']},
      {k:'rgn_grip',ex:['Plate Pinch','Dead Hang','Farmers Walk']}
    ],
    abs:[
      {k:'rgn_core',ex:['Plank','Ab Wheel Rollout','Cable Crunch']},
      {k:'rgn_lowcore',ex:['Hanging Leg Raise','Leg Raise']}
    ]
  };
  function regionOf(muscle,name){
    var regs=EXERCISE_REGIONS[muscle]||[];
    for(var i=0;i<regs.length;i++){if(regs[i].ex.indexOf(name)>=0)return regs[i].k;}
    return 'rgn_other';
  }

