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
 "Plank":{t:"isolation",f:"low",jr:["spine"],inc:2.5,rr:[10,20],subs:["Ab Wheel Rollout","Hanging Leg Raise","Leg Raise","Cable Crunch"]},
 "World's Greatest Stretch":{t:"isolation",f:"low",jr:["hip","spine"],inc:0,rr:[5,10],subs:["90/90 Hip Rotations","Cossack Squat"]},
 "90/90 Hip Rotations":{t:"isolation",f:"low",jr:["hip"],inc:0,rr:[10,20],subs:["World's Greatest Stretch","Cossack Squat"]},
 "Cossack Squat":{t:"isolation",f:"low",jr:["hip","knee"],inc:0,rr:[8,12],subs:["90/90 Hip Rotations","World's Greatest Stretch"]},
 "Shoulder Dislocates":{t:"isolation",f:"low",jr:["shoulder"],inc:0,rr:[15,20],subs:["Thoracic Extensions","Cat-Cow"]},
 "Thoracic Extensions":{t:"isolation",f:"low",jr:["spine"],inc:0,rr:[10,15],subs:["Cat-Cow","Shoulder Dislocates"]},
 "Cat-Cow":{t:"isolation",f:"low",jr:["spine"],inc:0,rr:[8,12],subs:["Thoracic Extensions","Shoulder Dislocates"]}
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
 abs:["Hanging Leg Raise","Leg Raise","Cable Crunch","Ab Wheel Rollout","Plank"],
 mobility:["World's Greatest Stretch","90/90 Hip Rotations","Cossack Squat","Shoulder Dislocates","Thoracic Extensions","Cat-Cow"]
 };
 window.__pools=EXERCISE_POOLS;window.__exMeta=EXERCISE_META;window.__tendonProtocols=TENDON_PROTOCOLS;

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

 // ── Muscle highlight: stylized front/rear body diagram (SVG) ──
 // One reusable component for all muscle groups. Each muscle is a left-side
 // path (mirrored for the right side); center muscles span both sides.
 var BODY_BASE='<ellipse cx="100" cy="20" rx="16" ry="18"/>'
 +'<rect x="93" y="36" width="14" height="18" rx="4"/>'
 +'<path d="M60 56 L56 128 L64 196 L100 203 L136 196 L144 128 L140 56 C122 48 78 48 60 56 Z"/>'
 +'<path d="M62 60 C44 66 38 104 40 138 L52 140 C50 108 52 78 66 64 Z"/>'
 +'<path d="M42 142 C36 182 36 216 40 248 L52 246 C48 210 48 176 52 144 Z"/>'
 +'<path d="M72 206 C64 250 68 290 74 330 L96 330 C92 290 92 252 94 212 Z"/>'
 +'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'
 +'<rect x="70" y="408" width="26" height="10" rx="5"/>'
 +'<g transform="translate(200,0) scale(-1,1)">'
 +'<path d="M62 60 C44 66 38 104 40 138 L52 140 C50 108 52 78 66 64 Z"/>'
 +'<path d="M42 142 C36 182 36 216 40 248 L52 246 C48 210 48 176 52 144 Z"/>'
 +'<path d="M72 206 C64 250 68 290 74 330 L96 330 C92 290 92 252 94 212 Z"/>'
 +'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'
 +'<rect x="70" y="408" width="26" height="10" rx="5"/>'
 +'</g>';
 var BODY_MUSCLES={
 chest:{view:'front',d:'<path d="M63 62 C62 82 74 94 97 96 L97 62 Z"/>'},
 shoulders:{view:'front',d:'<ellipse cx="57" cy="60" rx="13" ry="14"/>'},
 biceps:{view:'front',d:'<path d="M60 60 C44 66 40 102 42 130 L54 130 C52 104 54 78 66 64 Z"/>'},
 forearms:{view:'front',d:'<path d="M43 136 C37 174 37 210 41 244 L53 242 C49 206 49 174 53 140 Z"/>'},
 abs:{view:'front',center:true,d:'<path d="M85 98 C88 120 88 168 84 194 L116 194 C112 168 112 120 115 98 Z"/>'},
 quads:{view:'front',d:'<path d="M73 206 C66 250 69 290 75 330 L95 330 C91 290 91 252 93 214 Z"/>'},
 traps:{view:'rear',center:true,d:'<path d="M64 52 C74 68 126 68 136 52 L126 40 C112 48 88 48 74 40 Z"/>'},
 back:{view:'rear',d:'<path d="M66 62 C58 96 60 134 70 170 L84 160 C78 120 76 88 82 64 Z"/>'},
 glutes:{view:'rear',d:'<path d="M73 200 C64 226 72 250 88 260 L95 240 C85 232 84 214 86 202 Z"/>'},
 hamstrings:{view:'rear',d:'<path d="M73 208 C67 252 69 292 75 330 L95 330 C91 292 91 252 93 214 Z"/>'},
 calves:{view:'rear',d:'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'},
 triceps:{view:'rear',d:'<path d="M60 58 C42 64 38 102 40 132 L52 132 C50 104 52 78 64 62 Z"/>'}
 };
 function muscleHighlightHtml(muscle){
 var s=BODY_MUSCLES[muscle];
 if(!s)return '';
 var hl=s.d+(s.center?'':'<g transform="translate(200,0) scale(-1,1)">'+s.d+'</g>');
 return '<svg class="esm-hl" viewBox="0 0 200 430" aria-label="'+muscle+'"><g class="hl-base">'+BODY_BASE+'</g><g class="hl-muscles">'+hl+'</g></svg>';
 }
 window.muscleHighlightHtml=muscleHighlightHtml;

 // ── Curated how-to instructions (setup / execution / cue / breathing) ──
 const EXERCISE_GUIDE = {
 // Chest
 "Bench Press":{s:"Feet planted, shoulder blades pinched into the bench, eyes under the bar.",e:"Unrack, lower the bar to mid-chest, press up and slightly back over the shoulders.",c:"Elbows ~45° from the torso; wrists stacked over elbows; bar touches the chest, not the neck.",b:"Inhale at the top, exhale as you press."},
 "Incline Chest Press":{s:"Bench at 30–45°, bar over the upper chest, feet planted.",e:"Lower the bar to the upper chest, press up and slightly back.",c:"Keep the bar path over the upper pecs; don't let it drift toward the face.",b:"Exhale on the press."},
 "Machine Chest Press":{s:"Set the seat so handles align with mid-chest, back flat.",e:"Press the handles until the arms are nearly straight, return with control.",c:"Shoulders stay pinned; don't shrug into the press.",b:"Exhale on the press."},
 "Dumbbell Bench Press":{s:"Dumbbells at chest level, feet planted, shoulder blades set.",e:"Press the dumbbells up and slightly inward, lower to a stretch at the sides.",c:"Keep the wrists neutral; dumbbells track over the mid-chest.",b:"Exhale as you press."},
 "Dumbbell Incline Press":{s:"Incline bench 30–45°, dumbbells at upper-chest height.",e:"Press up and slightly inward, lower until you feel a chest stretch.",c:"Don't let the dumbbells drift back toward your head.",b:"Exhale on the press."},
 "Machine Incline Press":{s:"Adjust the seat so the handles hit the upper chest.",e:"Press up and back, return under control.",c:"Keep the upper back against the pad.",b:"Exhale on the press."},
 "Machine Chest Flies":{s:"Set the seat so the handles are at mid-chest, slight bend in the elbows.",e:"Bring the handles together in an arc, pause, open back to a stretch.",c:"Fixed elbow angle; fly, don't press.",b:"Exhale as you close the arc."},
 "Dumbbell Flies":{s:"Lie back, dumbbells over the chest, palms facing, elbows slightly bent.",e:"Open the arms in a wide arc until you feel a stretch, then bring them back together.",c:"Fixed elbow angle; imagine hugging a barrel.",b:"Exhale as you close."},
 "Cable Flies":{s:"Cables at chest height, one foot forward, slight forward lean.",e:"Bring the handles together in front of the chest, pause, return slowly.",c:"Keep the torso still; squeeze the chest at the peak.",b:"Exhale as you squeeze."},
 "Pec Deck":{s:"Seat height so the arms align with the shoulders, back flat.",e:"Squeeze the pads together in front of the chest, return with control.",c:"Keep the range short and controlled.",b:"Exhale on the squeeze."},
 "Floor Press":{s:"Lie on the floor, bar or dumbbells over the chest, feet planted.",e:"Lower until the upper arms touch the floor, press back up.",c:"The floor caps the range — no bouncing.",b:"Exhale on the press."},
 "Push-Up":{s:"Plank position, hands just wider than the shoulders, body in one line.",e:"Lower the chest to the floor, press back up.",c:"Elbows ~45°, core braced, hips don't sag.",b:"Inhale down, exhale up."},
 "Chest Dip":{s:"Support on the parallel bars, slight forward lean.",e:"Lower until the shoulders are below the elbows, press back up.",c:"Lean forward to bias the chest; no swinging.",b:"Exhale on the press."},
 // Back
 "Barbell Row":{s:"Hip hinge to ~45°, back flat, bar hanging at arm's length.",e:"Row the bar to the lower ribs, squeeze, lower with control.",c:"Initiate with the lats, not a hip swing.",b:"Exhale on the pull."},
 "T-Bar Row":{s:"Straddle the bar, hips back, back flat.",e:"Row the handles to the chest, pause, lower.",c:"Keep the chest up; no jerking.",b:"Exhale on the pull."},
 "Meadows Row":{s:"Side-on to a landmine, feet staggered, back flat.",e:"Row the handle to the hip, keeping the torso still.",c:"Pull the elbow back and down toward the hip.",b:"Exhale on the pull."},
 "Seated Row":{s:"Sit tall, feet braced, arms extended.",e:"Pull the handle to the stomach, squeeze, extend with control.",c:"Don't rock the torso.",b:"Exhale on the pull."},
 "Chest-Supported Row":{s:"Chest on the pad, handles at arm's length.",e:"Row the handles to the ribs, squeeze, lower.",c:"The pad removes cheating — use control.",b:"Exhale on the pull."},
 "Seated Cable Row":{s:"Same as the seated row with a V-handle.",e:"Pull to the navel, squeeze the mid-back, return.",c:"Keep the shoulders down and chest up.",b:"Exhale on the pull."},
 "Dumbbell Row":{s:"One knee and hand on a bench, back flat, dumbbell hanging.",e:"Row the dumbbell to the hip, pause, lower fully.",c:"Pull with the lat, not the biceps.",b:"Exhale on the pull."},
 "Lat Pulldown":{s:"Sit, thighs under the pads, grip wider than the shoulders.",e:"Pull the bar to the upper chest, drive the elbows down, return slowly.",c:"Lean back slightly; lead with the elbows.",b:"Exhale on the pull."},
 "Pull-Up":{s:"Hang from the bar, grip slightly wider than the shoulders.",e:"Pull until the chin clears the bar, lower with control.",c:"Engage the lats first; no kipping.",b:"Exhale on the pull."},
 "Assisted Pull-Up":{s:"Set the assist weight, grip the bar.",e:"Pull up until the chin clears, lower slowly.",c:"Keep tension through the whole rep.",b:"Exhale on the pull."},
 "Chin-Up":{s:"Underhand grip shoulder-width, hang.",e:"Pull the chin over the bar, lower with control.",c:"Same pattern as the pull-up, more biceps bias.",b:"Exhale on the pull."},
 "Straight-Arm Pulldown":{s:"Stand facing a high cable, arms straight, slight hinge.",e:"Pull the bar to the thighs keeping the arms straight, return to shoulder height.",c:"Think 'sweep' — lat-dominant.",b:"Exhale on the pull."},
 "Cable Pullover":{s:"Face away from a low cable, rope overhead, arms straight.",e:"Pull the rope down and forward to the thighs, keeping the arms straight.",c:"Feel the lats stretch overhead.",b:"Exhale on the pull."},
 "Inverted Row":{s:"Bar at hip height, hang beneath it, body straight.",e:"Pull the chest to the bar, squeeze, lower.",c:"Keep a straight line from heels to head.",b:"Exhale on the pull."},
 // Shoulders
 "Overhead Press":{s:"Bar at collarbone height, grip just outside the shoulders, feet planted.",e:"Press the bar overhead until the arms lock, lower to the collarbone.",c:"Brace the glutes; don't lean back.",b:"Exhale on the press."},
 "Shoulder Press":{s:"Seated or standing, dumbbells at shoulder height.",e:"Press up until the arms are straight, lower with control.",c:"Keep the core tight; no arching.",b:"Exhale on the press."},
 "Seated DB Press":{s:"Back supported, dumbbells at ear level.",e:"Press up, lower to a light stretch.",c:"Elbows slightly in front of the body.",b:"Exhale on the press."},
 "Machine Shoulder Press":{s:"Seat so the handles are at shoulder height.",e:"Press up, return until the shoulders feel a light stretch.",c:"Keep the back flat against the pad.",b:"Exhale on the press."},
 "Arnold Press":{s:"Dumbbells in front of the shoulders, palms facing you.",e:"Press up while rotating the palms outward, reverse on the way down.",c:"Rotate smoothly; keep the movement controlled.",b:"Exhale on the press."},
 "Lateral Raise":{s:"Dumbbells at the sides, slight elbow bend.",e:"Raise the arms to shoulder height, lead with the elbows, lower slowly.",c:"No swinging — pinky side slightly up.",b:"Exhale on the raise."},
 "Cable Lateral Raise":{s:"Side-on to a low cable, handle in the far hand.",e:"Raise the arm to shoulder height, pause, lower.",c:"Constant tension from the cable.",b:"Exhale on the raise."},
 "Lean-Away Lateral Raise":{s:"One hand braced, lean away from it.",e:"Raise the free arm to shoulder height, lower slowly.",c:"The lean increases the range on the side delt.",b:"Exhale on the raise."},
 "Front Raise":{s:"Dumbbells at the thighs, palms down.",e:"Raise one arm to shoulder height, lower, alternate.",c:"No momentum — pause at the top.",b:"Exhale on the raise."},
 "DB Upright Row":{s:"Dumbbells at the thighs, close grip.",e:"Pull the dumbbells up to chest height, elbows leading, lower.",c:"Stop at chest height — protect the shoulder.",b:"Exhale on the pull."},
 "Barbell Upright Row":{s:"Barbell at the thighs, hands shoulder-width.",e:"Pull up to the chest, elbows high, lower.",c:"Use a wider grip to reduce shoulder stress.",b:"Exhale on the pull."},
 "Rear Delt Flies":{s:"Hinge forward, flat back, dumbbells hanging.",e:"Raise the arms out to the sides to shoulder height, squeeze, lower.",c:"Lead with the elbows; slight bend.",b:"Exhale on the raise."},
 "Face Pull":{s:"Rope at eye height, step back for tension.",e:"Pull the rope to the face, split the ends, squeeze the rear delts.",c:"Elbows high, finish with external rotation.",b:"Exhale on the pull."},
 "Reverse Pec Deck":{s:"Face the machine, handles at shoulder height.",e:"Open the arms out and back, squeeze, return.",c:"Chest stays on the pad.",b:"Exhale on the squeeze."},
 "Bent-Over Cable Rear Delt":{s:"Hinge forward, cable at shoulder height, arm extended across the body.",e:"Pull the handle up and out to shoulder height, squeeze, lower.",c:"Keep the torso still.",b:"Exhale on the pull."},
 "Wide Row":{s:"Hinge at ~45°, wide grip.",e:"Row the bar to the chest, elbows out, squeeze the rear delts.",c:"A row that trains the upper back and rear delts.",b:"Exhale on the pull."},
 // Quads
 "Barbell Squat":{s:"Bar on the upper traps, feet shoulder-width, toes slightly out.",e:"Sit down to at least parallel, drive through the midfoot to stand.",c:"Knees track over the toes; chest tall; brace hard.",b:"Inhale down, exhale up."},
 "Front Squat":{s:"Bar on the front delts, elbows high, grip light.",e:"Squat straight down, torso tall, drive up.",c:"Elbows stay up; heels stay down.",b:"Inhale down, exhale up."},
 "Belt Squat":{s:"Attach the belt, stand on the platform, feet shoulder-width.",e:"Squat down under control, drive up.",c:"Minimal spinal loading — safe on the back.",b:"Exhale up."},
 "Leg Press":{s:"Back and hips flat on the pad, feet shoulder-width on the platform.",e:"Lower until the knees reach ~90°, press up without locking hard.",c:"Keep the lower back on the pad.",b:"Exhale on the press."},
 "Hack Squat":{s:"Back against the pad, feet mid-platform.",e:"Lower until the thighs are near parallel, drive up.",c:"Don't let the hips lift off the pad.",b:"Exhale on the drive."},
 "Goblet Squat":{s:"Hold one dumbbell at the chest, feet slightly wider than the shoulders.",e:"Squat down between the knees, drive up.",c:"Elbows inside the knees; chest up.",b:"Exhale up."},
 "Bulgarian Split Squat":{s:"Rear foot elevated, front foot far enough for a vertical shin.",e:"Lower the back knee toward the floor, drive through the front heel.",c:"Stay tall; the front heel drives.",b:"Exhale up."},
 "Step-Up":{s:"Facing a bench at knee height, one foot planted.",e:"Drive through the planted foot to stand on the bench, lower with control.",c:"Push through the heel; don't bounce off the back foot.",b:"Exhale up."},
 "Leg Extension":{s:"Seat back so the knees align with the pivot.",e:"Extend the legs until straight, pause, lower slowly.",c:"Don't lock out aggressively.",b:"Exhale on the extension."},
 "Sissy Squat":{s:"Hold a support, heels together, lean back.",e:"Bend the knees letting them travel forward until the thighs are near parallel, then stand.",c:"Keep the torso leaning back in one line.",b:"Exhale up."},
 // Hamstrings
 "Deadlift Variation":{s:"Bar over midfoot, shins close, hips hinged, flat back.",e:"Drive through the floor keeping the bar close, stand tall, lower with control.",c:"Bar in a straight line; brace the core.",b:"Inhale at the start, exhale at the top."},
 "RDL":{s:"Bar at hip height, soft knees, hips back, flat back.",e:"Lower the bar down the legs until you feel a hamstring stretch, drive the hips forward.",c:"Bar stays close to the thighs.",b:"Inhale down, exhale up."},
 "Trap Bar Deadlift":{s:"Stand inside the trap bar, grip the handles.",e:"Drive up with the legs and hips, stand tall, lower.",c:"More upright than a barbell deadlift — back-friendly.",b:"Exhale at the top."},
 "Stiff-Leg Deadlift":{s:"Bar at thigh height, knees nearly straight.",e:"Hinge forward, lower the bar to mid-shin, return.",c:"Feel the stretch in the hamstrings.",b:"Inhale down, exhale up."},
 "Good Morning":{s:"Bar on the upper back, feet shoulder-width.",e:"Hinge forward with a flat back until the torso is near parallel, drive up.",c:"Push the hips back; neck neutral.",b:"Inhale down, exhale up."},
 "Hyperextension":{s:"Hips on the pad, ankles anchored.",e:"Lower the torso with a flat back, rise until the body is in a line.",c:"Stop at neutral — don't over-extend.",b:"Exhale up."},
 "Leg Curl":{s:"Prone, ankles under the pad, knees just off the bench.",e:"Curl the heels toward the glutes, pause, lower slowly.",c:"Hips stay pressed down.",b:"Exhale on the curl."},
 "Nordic Curl":{s:"Kneel, ankles anchored, body straight.",e:"Lower the torso under control resisting with the hamstrings, catch with the hands.",c:"The slower, the better.",b:"Exhale on the way down."},
 "Kneeling Leg Curl":{s:"Kneel in the machine, pads on the ankles.",e:"Curl the heels down, pause, return.",c:"Constant tension — no resting at the top.",b:"Exhale on the curl."},
 // Glutes
 "Hip Thrust":{s:"Upper back on the bench, bar over the hips, feet planted near the glutes.",e:"Drive the hips up until the body is a straight line, squeeze, lower.",c:"Chin tucked; push through the heels.",b:"Exhale at the top."},
 "Glute Bridge":{s:"Lying, knees bent, feet planted.",e:"Lift the hips to a straight line, squeeze, lower.",c:"Drive through the heels.",b:"Exhale at the top."},
 "KAS Glute Bridge":{s:"Shoulders elevated, feet closer to the hips.",e:"Lift the hips just past neutral and hold the squeeze.",c:"Short range, constant tension.",b:"Exhale at the top."},
 "Cable Pull-Through":{s:"Face away from a low cable, handle between the legs.",e:"Hinge at the hips, drive them forward to stand tall, squeeze.",c:"Hip hinge, not a squat.",b:"Exhale on the drive."},
 "Sumo Deadlift":{s:"Wide stance, toes out, grip inside the knees.",e:"Drive up keeping the bar close, stand tall, lower.",c:"Knees track over the toes.",b:"Exhale at the top."},
 "Abductors (Machine)":{s:"Seat so the pads sit on the outer thighs.",e:"Push the pads apart, pause, return slowly.",c:"Control the return — no bouncing.",b:"Exhale on the push."},
 "Cable Abduction":{s:"Ankle cuff on the far leg, hand on the frame.",e:"Sweep the leg out to the side, pause, lower.",c:"Keep the torso still.",b:"Exhale on the sweep."},
 "Band Lateral Walk":{s:"Band around the ankles, quarter-squat stance.",e:"Step sideways, keeping tension on the band.",c:"Stay in the squat; small steps.",b:"Steady breathing."},
 "Clam Shell":{s:"Side-lying, knees bent, feet together.",e:"Open the top knee like a clam, lower slowly.",c:"Hips stay stacked; don't roll back.",b:"Exhale on the open."},
 "Side-Lying Leg Raise":{s:"Side-lying, legs straight, head supported.",e:"Raise the top leg to ~45°, lower slowly.",c:"Point the toe slightly down to hit the glute medius.",b:"Exhale on the raise."},
 // Biceps
 "Bicep Curl":{s:"Stand tall, elbows at the sides, palms up.",e:"Curl the bar or dumbbells to the shoulders, squeeze, lower slowly.",c:"No swinging — elbows stay pinned.",b:"Exhale on the curl."},
 "EZ-Bar Curl":{s:"EZ-bar, elbows at the sides.",e:"Curl up, squeeze, lower under control.",c:"The EZ grip spares the wrists.",b:"Exhale on the curl."},
 "Standing DB Curl":{s:"Dumbbells at the sides, palms forward.",e:"Curl both dumbbells, squeeze, lower.",c:"Supinate at the top for a peak contraction.",b:"Exhale on the curl."},
 "Incline DB Curl":{s:"Incline bench, arms hanging behind the torso.",e:"Curl the dumbbells, lower until the arms are nearly straight.",c:"The stretch position hits the long head.",b:"Exhale on the curl."},
 "Cable Curl":{s:"Low cable with a straight bar, elbows at the sides.",e:"Curl up, pause, lower slowly.",c:"Constant tension from the cable.",b:"Exhale on the curl."},
 "Preacher Curl":{s:"Upper arms on the pad, grip shoulder-width.",e:"Curl up, squeeze, lower until the elbows are nearly straight.",c:"No cheating — the pad blocks momentum.",b:"Exhale on the curl."},
 "Spider Curl":{s:"Face-down on a 45° bench, arms hanging.",e:"Curl the dumbbells, squeeze, lower.",c:"Keep the upper arms vertical.",b:"Exhale on the curl."},
 "Concentration Curl":{s:"Seated, elbow braced on the inner thigh.",e:"Curl up, squeeze, lower slowly.",c:"Strict tempo, full squeeze.",b:"Exhale on the curl."},
 "Hammer Curls":{s:"Dumbbells at the sides, neutral grip.",e:"Curl up keeping the palms facing each other, lower.",c:"Hits the brachialis for arm thickness.",b:"Exhale on the curl."},
 "Reverse Curl":{s:"Pronated grip (palms down).",e:"Curl up, lower under control.",c:"Trains the brachioradialis and grip.",b:"Exhale on the curl."},
 // Triceps
 "Triceps Pushdown":{s:"High cable, straight bar, elbows at the sides.",e:"Press the bar down until the arms are straight, squeeze, return to chest height.",c:"Elbows stay glued to the sides.",b:"Exhale on the press."},
 "Rope Pushdown":{s:"Rope attachment, elbows at the sides.",e:"Press down splitting the rope at the bottom, return.",c:"Split the ends at full extension.",b:"Exhale on the press."},
 "Triceps Overhead Ext":{s:"Dumbbell overhead with both hands, elbows close to the head.",e:"Lower the weight behind the head, extend back up.",c:"Elbows point forward and stay still.",b:"Exhale on the extension."},
 "Overhead Cable Extension":{s:"Low cable, rope overhead, elbows close.",e:"Extend the arms straight overhead, lower behind the head.",c:"Same as DB overhead — constant tension.",b:"Exhale on the extension."},
 "Skull Crusher":{s:"Lying, EZ-bar over the eyes, elbows pointing up.",e:"Lower the bar to the forehead, extend back up.",c:"Elbows stay fixed in place.",b:"Exhale on the extension."},
 "Close-Grip Bench":{s:"Bench press grip shoulder-width, bar over the chest.",e:"Lower the bar to the lower chest with tucked elbows, press up.",c:"Elbows ~30° from the torso.",b:"Exhale on the press."},
 "JM Press":{s:"Bar over the chest, elbows tucked.",e:"Lower the bar to the upper chest while the elbows slide back, press up.",c:"Half bench, half skull crusher.",b:"Exhale on the press."},
 "Bench Dip":{s:"Hands on a bench behind you, feet out front.",e:"Lower the hips until the elbows reach ~90°, press back up.",c:"Keep the shoulders down, away from the ears.",b:"Exhale on the press."},
 // Calves
 "Calf Raise":{s:"Balls of the feet on a step, heels hanging.",e:"Lower for a deep stretch, rise onto the toes, pause.",c:"Full range, no bouncing.",b:"Exhale on the rise."},
 "Standing Calf Raise":{s:"Same setup, on a standing machine.",e:"Rise as high as possible, pause, lower slowly.",c:"Knees stay locked.",b:"Exhale on the rise."},
 "Single-Leg Calf Raise":{s:"One foot on the step, one hand for balance.",e:"Rise onto the toe, pause, lower.",c:"Control the full range.",b:"Exhale on the rise."},
 "Seated Calf Raise":{s:"Seated with the pad on the knees.",e:"Rise onto the toes, pause, lower for a stretch.",c:"Bent knee targets the soleus.",b:"Exhale on the rise."},
 "Leg Press Calf Raise":{s:"Balls of the feet on the platform edge, knees soft.",e:"Press the platform with the toes, pause, lower for a stretch.",c:"Keep the legs nearly straight.",b:"Exhale on the rise."},
 "Donkey Calf Raise":{s:"Hips flexed, pad on the lower back.",e:"Rise onto the toes, pause, lower.",c:"Full stretch between reps.",b:"Exhale on the rise."},
 // Traps
 "Kelso Shrugs":{s:"Chest-supported, dumbbells at the sides.",e:"Shrug up and slightly back, pause, lower.",c:"Squeeze the traps at the top.",b:"Exhale on the shrug."},
 "Vertical Shrugs":{s:"Dumbbells or trap bar at the sides.",e:"Shrug straight up, pause, lower.",c:"No rolling — vertical only.",b:"Exhale on the shrug."},
 "Barbell Shrugs":{s:"Barbell at the thighs, overhand grip.",e:"Shrug up, pause, lower.",c:"Keep the arms straight.",b:"Exhale on the shrug."},
 "Dumbbell Shrugs":{s:"Dumbbells at the sides.",e:"Shrug up and back, pause, lower.",c:"Full range of motion.",b:"Exhale on the shrug."},
 "Farmers Walk":{s:"Heavy dumbbells or kettlebells at the sides.",e:"Walk with tall posture for the set distance or time.",c:"Shoulders back, core braced.",b:"Breathe steadily."},
 // Forearms
 "Forearm Ext/Flex":{s:"Forearms on a bench, wrists hanging over.",e:"Curl the wrists up (flexion) or down (extension), pause.",c:"Keep the forearms pinned.",b:"Exhale on the curl."},
 "Wrist Curl":{s:"Forearms on the thighs, palms up, wrists over the knees.",e:"Curl the bar up with the wrists, pause, lower.",c:"Only the wrists move.",b:"Exhale on the curl."},
 "Reverse Wrist Curl":{s:"Same setup, palms down.",e:"Raise the hands up, pause, lower.",c:"Light weight, high reps.",b:"Exhale on the curl."},
 "Plate Pinch":{s:"Pinch two plates together, smooth sides out.",e:"Hold for time at your side.",c:"Squeeze hard; switch hands when needed.",b:"Breathe steadily."},
 "Dead Hang":{s:"Hang from a pull-up bar, arms straight.",e:"Hold for time with the shoulders packed.",c:"Don't shrug the shoulders.",b:"Breathe steadily."},
 // Abs
 "Hanging Leg Raise":{s:"Hang from the bar, legs straight.",e:"Raise the legs to hip height or above, lower slowly.",c:"Curl the pelvis at the top; no swinging.",b:"Exhale on the raise."},
 "Leg Raise":{s:"Lying, hands under the hips.",e:"Raise the legs to vertical, lower slowly without touching down.",c:"Press the lower back into the floor.",b:"Exhale on the raise."},
 "Cable Crunch":{s:"Kneel under a high cable, rope at the face.",e:"Crunch down curling the ribs toward the pelvis, return.",c:"The hips stay still — only the spine curls.",b:"Exhale on the crunch."},
 "Ab Wheel Rollout":{s:"Kneel with the wheel under the shoulders.",e:"Roll out until the body is nearly straight, pull back with the core.",c:"Brace hard; don't let the hips sag.",b:"Exhale on the pull-back."},
 "Plank":{s:"Forearms and toes, body in a straight line.",e:"Hold for time, squeezing the glutes and core.",c:"Don't let the hips sag or pike.",b:"Breathe steadily."},
 // Prehab
 "Band Pull-Apart":{s:"Band at chest height, arms extended.",e:"Pull the band apart to the chest, squeeze the shoulder blades, return.",c:"Keep the arms straight.",b:"Exhale on the pull."},
 "Terminal Knee Extension":{s:"Band around a post, knee bent, seated.",e:"Extend the knee fully against the band, pause, return.",c:"Slow and controlled — quad isolation.",b:"Exhale on the extension."},
 "Bird Dog":{s:"On all fours, back flat.",e:"Extend the opposite arm and leg to hip height, pause, switch.",c:"Keep the hips square and the spine still.",b:"Breathe steadily."},
 "Dead Bug":{s:"Lying, arms up, knees at 90°.",e:"Lower the opposite arm and leg toward the floor, return.",c:"Keep the lower back pressed down.",b:"Breathe steadily."}
 };
 const GUIDE_ALIASES = {'Leg Curls':'Leg Curl','Leg Extensions':'Leg Extension','Lateral Raises':'Lateral Raise','Calf Raises':'Calf Raise','Preacher Curls':'Preacher Curl','Triceps Overhead Extensions':'Triceps Overhead Ext','Incline Press':'Incline Chest Press','Front Squat or Lunge':'Front Squat'};
 window.__guide=EXERCISE_GUIDE;window.__guideAliases=GUIDE_ALIASES;
 function guideFor(name){return EXERCISE_GUIDE[name]||EXERCISE_GUIDE[GUIDE_ALIASES[name]]||null;}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function guideHtml(name){
 var g=guideFor(name);
 if(!g&&EX_TR[name])g=exGuide(name);
 if(!g)return '<div class="eg-none">'+_('guide_none')+'</div>';
 return '<div class="eg-line"><span class="eg-k">'+_('guide_setup')+'</span>'+g.s+'</div>'+
