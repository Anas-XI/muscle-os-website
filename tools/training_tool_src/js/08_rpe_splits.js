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
 // otherwise derived. difficulty/pattern: curated overrides win,
 // else inferred from existing fields + name keywords.
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
 var disp=esc(EX_TR[ex]?exDisplay(ex):ex);
 var id=V_VIDS[ex];
 if(id)return '<a class="ex-vid-link" href="https://www.youtube.com/watch?v='+id+'" target="_blank" title="'+_('watch_video')+'"><span class="ex-vid-name">'+disp+'</span><img class="ex-vid-thumb" loading="lazy" src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="'+disp+'"></a>';
 return '<a class="ex-vid-link" href="'+vidUrl(ex)+'" target="_blank" title="'+_('watch_video')+'">'+disp+' ▶</a>';
