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
  function guideHtml(name){
    var g=guideFor(name);
    if(!g&&EX_TR[name])g=exGuide(name);
    if(!g)return '<div class="eg-none">'+_('guide_none')+'</div>';
    return '<div class="eg-line"><span class="eg-k">'+_('guide_setup')+'</span>'+g.s+'</div>'+
           '<div class="eg-line"><span class="eg-k">'+_('guide_exec')+'</span>'+g.e+'</div>'+
           '<div class="eg-line"><span class="eg-k">'+_('guide_cue')+'</span>'+g.c+'</div>'+
           '<div class="eg-line"><span class="eg-k">'+_('guide_breathe')+'</span>'+g.b+'</div>';
  }

  function equipTag(ex){
    var n=(' '+ex+' ').toLowerCase();
    if(n.indexOf('barbell')>=0||n.indexOf('ez-bar')>=0||n.indexOf('t-bar')>=0)return 'BB';
    if(n.indexOf('dumbbell')>=0||n.indexOf(' db ')>=0||n.indexOf('db upright')>=0)return 'DB';
    if(n.indexOf('machine')>=0||n.indexOf('pec deck')>=0||n.indexOf('leg press')>=0||n.indexOf('hack squat')>=0||n.indexOf('kneeling')>=0)return 'MAC';
    if(n.indexOf('cable')>=0||n.indexOf('face pull')>=0||n.indexOf('rope')>=0||n.indexOf('straight-arm')>=0)return 'CAB';
    if(n.indexOf('pull-up')>=0||n.indexOf('chin-up')>=0||n.indexOf('push-up')>=0||n.indexOf('dip')>=0||n.indexOf('plank')>=0||n.indexOf('farmers')>=0||n.indexOf('dead hang')>=0||n.indexOf('band')>=0||n.indexOf('clam')>=0||n.indexOf('side-lying')>=0||n.indexOf('hyperextension')>=0||n.indexOf('nordic')>=0||n.indexOf('inverted')>=0||n.indexOf('step-up')>=0)return 'BW';
    if(n.indexOf('kettlebell')>=0||n.indexOf('turkish get-up')>=0)return 'KB';
    return '';
  }
  function meta(ex){
    var b=EXERCISE_META[ex];
    if(b)return b;
    var ce=ls(K.CE,[]);
    for(var i=0;i<ce.length;i++){if(ce[i].name===ex)return ce[i];}
    return{t:"compound",f:"moderate",jr:[],inc:2.5,rr:[6,12],subs:[]};
  }

  // ── Smart exercise metadata (schema extension, derived + curated) ──
  // equipment: explicit where the name-regex `equipTag` is wrong/ambiguous;
  //            otherwise derived. difficulty/pattern: curated overrides win,
  //            else inferred from existing fields + name keywords.
  var EQUIP_ENUM=['bodyweight','dumbbell','barbell','machine','cable','band','kettlebell'];
  // Curated equipment per exercise — the name-regex `equipTag` misses most
  // core barbell/dumbbell/machine movements; explicit table wins where the
  // regex is empty or wrong. Unknown (custom) exercises pass any filter.
  var EQ_UNKNOWN_FALLBACK=['barbell','dumbbell','machine','cable','bodyweight','band','kettlebell'];
  var EQ_OVERRIDES={
    'Band Lateral Walk':['band'],'Band Pull-Apart':['band'],'Kneeling Leg Curl':['cable','band'],
    'Farmers Walk':['dumbbell'],'Plate Pinch':['barbell'],'Nordic Curl':['bodyweight'],
    'Dead Hang':['bodyweight'],'Inverted Row':['bodyweight'],'Push-Up':['bodyweight'],
    'Bench Press':['barbell'],'Incline Chest Press':['barbell'],'Floor Press':['dumbbell'],'Chest Dip':['bodyweight'],
    'Meadows Row':['barbell'],'Seated Row':['machine','cable'],'Chest-Supported Row':['machine','dumbbell'],
    'Lat Pulldown':['machine','cable'],
    'Overhead Press':['barbell'],'Shoulder Press':['barbell','machine','dumbbell'],'Arnold Press':['dumbbell'],
    'Lateral Raise':['dumbbell'],'Lean-Away Lateral Raise':['dumbbell'],'Front Raise':['dumbbell'],
    'Rear Delt Flies':['dumbbell','machine'],'Wide Row':['cable','machine'],
    'Barbell Squat':['barbell'],'Front Squat':['barbell'],'Belt Squat':['machine'],'Goblet Squat':['dumbbell'],
    'Bulgarian Split Squat':['dumbbell'],'Leg Extension':['machine'],'Sissy Squat':['bodyweight'],
    'Deadlift Variation':['barbell'],'RDL':['barbell','dumbbell'],'Trap Bar Deadlift':['barbell'],
    'Stiff-Leg Deadlift':['barbell'],'Good Morning':['barbell'],'Leg Curl':['machine'],
    'Hip Thrust':['barbell'],'Glute Bridge':['bodyweight'],'KAS Glute Bridge':['bodyweight','barbell'],
    'Sumo Deadlift':['barbell'],
    'Bicep Curl':['barbell','dumbbell'],'Preacher Curl':['machine','dumbbell'],'Spider Curl':['dumbbell'],
    'Concentration Curl':['dumbbell'],'Hammer Curls':['dumbbell'],'Reverse Curl':['barbell','dumbbell'],
    'Triceps Pushdown':['cable','machine'],'Triceps Overhead Ext':['cable','dumbbell'],'Skull Crusher':['barbell','dumbbell'],
    'Close-Grip Bench':['barbell'],'JM Press':['barbell'],
    'Calf Raise':['machine','bodyweight'],'Standing Calf Raise':['machine'],'Single-Leg Calf Raise':['bodyweight','dumbbell'],
    'Seated Calf Raise':['machine'],'Donkey Calf Raise':['machine','bodyweight'],
    'Kelso Shrugs':['machine','dumbbell'],'Vertical Shrugs':['machine','dumbbell'],
    'Forearm Ext/Flex':['dumbbell'],'Wrist Curl':['dumbbell','barbell'],'Reverse Wrist Curl':['dumbbell','barbell'],
    'Hanging Leg Raise':['bodyweight'],'Leg Raise':['bodyweight'],'Ab Wheel Rollout':['bodyweight']
  };
  function equipmentOf(ex){
    var o=EQ_OVERRIDES[ex];if(o)return o.slice();
    var m=meta(ex);if(m.eq)return m.eq.slice();
    var map={BB:'barbell',DB:'dumbbell',MAC:'machine',CAB:'cable',BW:'bodyweight',KB:'kettlebell'};
    var e=map[equipTag(ex)];
    if(e)return[e];
    return EQ_UNKNOWN_FALLBACK.slice();
  }
  var DIFF_OVERRIDES={
    'Nordic Curl':'advanced','Chest Dip':'advanced','Pull-Up':'intermediate','Chin-Up':'intermediate',
    'Push-Up':'beginner','Plank':'beginner','Assisted Pull-Up':'beginner','Inverted Row':'beginner'
  };
  function difficultyOf(ex){
    var m=meta(ex);if(m.diff)return m.diff;
    var o=DIFF_OVERRIDES[ex];if(o)return o;
    var f=m.f||'moderate';
    return f==='low'?'beginner':(f==='high'?'advanced':'intermediate');
  }
  var MP_OVERRIDES={
    'Forearm Ext/Flex':'pull','Wrist Curl':'pull','Reverse Wrist Curl':'pull','Leg Curl':'pull',
    'Leg Curls':'pull','Nordic Curl':'pull','Kneeling Leg Curl':'pull','Abductors (Machine)':'other',
    'Adductors (Machine)':'other','Cable Abduction':'other','Band Lateral Walk':'other','Clam Shell':'other',
    'Side-Lying Leg Raise':'other','Step-Up':'squat','Incline DB Curl':'pull','Hammer Curls':'pull'
  };
  var MP_KEYWORDS=[
    ['rotation',['rotation','woodchopper','twist','russian']],
    ['carry',['farmers','carry','dead hang','plate pinch']],
    ['core',['crunch','plank','rollout','leg raise','bird dog','dead bug','knee raise','ab wheel']],
    ['hinge',['deadlift','rdl','good morning','hip thrust','glute bridge','pull-through','hyperextension','sumo','stiff-leg']],
    ['squat',['squat','lunge','leg press','hack','sissy','step-up','split squat','adductor']],
    ['pull',['row','pulldown','pull-up','chin-up','curl','face pull','rear delt','reverse','shrug','grip','wrist']],
    ['push',['press','pushdown','push-up','dip','bench','flies','fly','pec deck','extension','raise','calf']]
  ];
  function movementPatternOf(ex){
    var m=meta(ex);if(m.mp)return m.mp;
    var o=MP_OVERRIDES[ex];if(o)return o;
    var n=(' '+ex+' ').toLowerCase();
    for(var i=0;i<MP_KEYWORDS.length;i++){
      for(var j=0;j<MP_KEYWORDS[i][1].length;j++){
        if(n.indexOf(MP_KEYWORDS[i][1][j])>=0)return MP_KEYWORDS[i][0];
      }
    }
    return 'other';
  }
  function jointStressOf(ex){
    var m=meta(ex);
    return{level:m.f||'moderate',joints:(m.jr||[]).map(function(j){return j.replace(/"/g,'').trim().toLowerCase();})};
  }
  var POOL_INDEX={};
  Object.keys(EXERCISE_POOLS).forEach(function(muscle){
    EXERCISE_POOLS[muscle].forEach(function(name){POOL_INDEX[name]=muscle;});
  });
  function primaryOf(ex){return POOL_INDEX[ex]||null;}
  // Curated secondary-muscle activations (partial backfill — covers the most
  // common slots; activation % drives ranking tiebreak + "also works" badge)
  var SECONDARY_MAP={
    'Bench Press':[['triceps',45],['shoulders',25]],
    'Dumbbell Bench Press':[['triceps',40],['shoulders',20]],
    'Incline Chest Press':[['shoulders',40],['triceps',30]],
    'Machine Chest Press':[['triceps',40],['shoulders',20]],
    'Push-Up':[['triceps',35],['shoulders',30]],
    'Chest Dip':[['triceps',40],['shoulders',30]],
    'Barbell Row':[['biceps',40],['shoulders',25]],
    'Dumbbell Row':[['biceps',35],['shoulders',20]],
    'Lat Pulldown':[['biceps',40],['forearms',15]],
    'Pull-Up':[['biceps',35],['forearms',15]],
    'Barbell Squat':[['glutes',30],['hamstrings',20]],
    'Front Squat':[['glutes',25],['abs',20]],
    'Leg Press':[['glutes',35],['hamstrings',20]],
    'Hip Thrust':[['hamstrings',35],['quads',15]],
    'RDL':[['glutes',35],['back',20]],
    'Deadlift Variation':[['glutes',40],['back',25],['traps',15]],
    'Overhead Press':[['triceps',35],['chest',15]],
    'Lateral Raise':[['traps',20]],
    'Lateral Raises':[['traps',20]],
    'Bicep Curl':[['forearms',20]]
  };
  function secondaryOf(ex){return SECONDARY_MAP[ex]||null;}
  function saveCustomEx(name,type,focus,inc,rr,subs){
    var ce=ls(K.CE,[]);
    for(var i=0;i<ce.length;i++){if(ce[i].name===name){ce[i]={name:name,t:type,f:focus,inc:inc,rr:rr,subs:subs||[]};ss(K.CE,ce);return;}}
    ce.push({name:name,t:type,f:focus,inc:inc,rr:rr,subs:subs||[]});
    ss(K.CE,ce);
  }
  function rmCustomEx(name){
    var ce=ls(K.CE,[]);
    ss(K.CE,ce.filter(function(e){return e.name!==name;}));
  }

  var V_VIDS={'Barbell Squat':'gcNh17Ckjgg','Bench Press':'BYKScL2sgCs','Deadlift Variation':'MBbyAqvTNkU','RDL':'jEy_czb3RKA','Overhead Press':'eNFXEEdfQp4'};
  function vidUrl(ex){return V_VIDS[ex]?'https://www.youtube.com/watch?v='+V_VIDS[ex]:'https://www.youtube.com/results?search_query='+encodeURIComponent(ex);}
  function exLinkHtml(ex){
    var disp=EX_TR[ex]?exDisplay(ex):ex;
    var id=V_VIDS[ex];
    if(id)return '<a class="ex-vid-link" href="https://www.youtube.com/watch?v='+id+'" target="_blank" title="'+_('watch_video')+'"><span class="ex-vid-name">'+disp+'</span><img class="ex-vid-thumb" loading="lazy" src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="'+disp+'"></a>';
    return '<a class="ex-vid-link" href="'+vidUrl(ex)+'" target="_blank" title="'+_('watch_video')+'">'+disp+' ▶</a>';
  }

