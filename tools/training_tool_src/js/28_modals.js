 banner.style.display='flex';
 try{sessionStorage.setItem('mos_conflict_notice',JSON.stringify({ts:Date.now(),keys:keys}));}catch(e){}
 translateUI();
 }
 window.showConflictNotice=showConflictNotice;
 function initSync(){
 var savedKey=ls(SYNC_KEY,'');
 if(savedKey){
 var inp=document.getElementById('syncKeyInput');
 if(inp)inp.value=savedKey;
 }
 try{
 var nc=sessionStorage.getItem('mos_conflict_notice');
 if(nc){
 var obj=JSON.parse(nc);
 if(obj&&obj.keys&&Array.isArray(obj.keys))showConflictNotice(obj.keys);
 sessionStorage.removeItem('mos_conflict_notice');
 }
 }catch(e){}
 }
 window.showSync=showSync;window.hideSync=hideSync;window.doSyncUpload=doSyncUpload;window.doSyncDownload=doSyncDownload;window.genSyncId=genSyncId;window.showLibrary=showLibrary;window.hideLibrary=hideLibrary;window.renderLibrary=renderLibrary;


 // ── Custom Exercise Management ──
 function showCeModal(){
 document.getElementById('ceModal').style.display='block';
 renderCeList();
 }
 function hideCeModal(){
 document.getElementById('ceModal').style.display='none';
 }
 function saveCustomExFromModal(){
 var name=document.getElementById('ceName').value.trim();
 if(!name){alert(_('ce_name_required'));return;}
 var type=document.getElementById('ceType').value;
 var focus=document.getElementById('ceFocus').value;
 var inc=parseFloat(document.getElementById('ceInc').value);
 var minRep=parseInt(document.getElementById('ceMinRep').value)||6;
 var maxRep=parseInt(document.getElementById('ceMaxRep').value)||12;
 saveCustomEx(name,type,focus,inc,[minRep,maxRep],[]);
 document.getElementById('ceName').value='';
 renderCeList();
 alert(_('ce_saved'));
 }
 function renderCeList(){
 var el=document.getElementById('ceList');
 if(!el)return;
 var ce=ls(K.CE,[]);
 if(!ce.length){el.innerHTML='<p style="font-size:.5rem;color:rgba(250,250,248,.12);text-align:center" data-i18n="ce_none">No custom exercises yet.</p>';return;}
 el.innerHTML=ce.map(function(e){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-bottom:1px solid rgba(250,250,248,.04);font-size:.55rem"><span>'+e.name+' <span style="color:rgba(250,250,248,.15);font-size:.5rem">('+e.t+', '+e.rr[0]+'-'+e.rr[1]+' reps)</span></span><span onclick="rmCustomEx(\''+e.name+'\');renderCeList()" style="color:#f44336;cursor:pointer;font-size:.55rem">✕</span></div>';}).join('');
 }

 // ── Exercise Library ──
 function showLibrary(){
 document.getElementById('libModal').style.display='block';
 renderLibrary(null);
 }
 function hideLibrary(){
 document.getElementById('libModal').style.display='none';
 }
 function renderLibrary(filter){
 var el=document.getElementById('libContent');
 if(!el)return;
 var MUSCLE_NAME={};MUSCLES.forEach(function(m){MUSCLE_NAME[m.id]=m.name;});
 var all={};
 Object.keys(EXERCISE_POOLS).forEach(function(p){
 (EXERCISE_POOLS[p]||[]).forEach(function(n){if(!all[n])all[n]=p;});
 });
 var names=Object.keys(all).sort(function(a,b){return a<b?-1:a>b?1:0;});
 var html='<div class="lib-filters"><button class="lib-fchip'+(filter?'':' active')+'" type="button" onclick="renderLibrary(null)">'+_('lib_all')+'</button>';
 MUSCLES.forEach(function(m){
 html+='<button class="lib-fchip'+(filter===m.id?' active':'')+'" type="button" onclick="renderLibrary(\''+m.id+'\')">'+m.name+'</button>';
 });
 html+='</div>';
 var list=filter?names.filter(function(n){return all[n]===filter;}):names;
 if(!list.length){el.innerHTML=html+'<p style="font-size:.55rem;color:rgba(250,250,248,.25);text-align:center;padding:24px 0" data-i18n="lib_empty">No exercises in this group.</p>';return;}
 var groups=[],gIdx={};
 list.forEach(function(n){
 var p=all[n];
 if(gIdx[p]===undefined){gIdx[p]=groups.length;groups.push({p:p,items:[]});}
 groups[gIdx[p]].items.push(n);
 });
 groups.forEach(function(g){
 html+='<div class="lib-muscle">'+(MUSCLE_NAME[g.p]||g.p)+'<span class="esm-count">'+g.items.length+'</span></div>';
 g.items.forEach(function(n){
 html+='<div class="lib-ex-row"><div class="lib-ex-top">'+
 '<span class="lib-ex-name">'+(EX_TR[n]?exDisplay(n):n)+'</span>'+
 (equipTag(n)?'<span class="lib-eq">'+equipTag(n)+'</span>':'')+
 (meta(n).metadataSource==='inferred'?'<span class="badge-pill bp-inferred" title="'+_('meta_inferred_tip')+'">'+_('meta_inferred')+'</span>':'')+
 '<a class="lib-vid" href="'+vidUrl(n)+'" target="_blank">'+_('watch_video')+'</a>'+
 '<button class="ex-guide-toggle" type="button" data-lib="'+n+'" title="'+_('how_to')+'">'+_('how_to')+' ▾</button>'+
 '</div><div class="ex-guide" data-lib="'+n+'"></div></div>';
 });
 });
 el.innerHTML=html;
 el.querySelectorAll('.ex-guide-toggle[data-lib]').forEach(function(btn){
 btn.addEventListener('click',function(){
 var name=this.dataset.lib;
 var g=this.closest('.lib-ex-row').querySelector('.ex-guide');
 var open=g.style.display==='block';
 if(!open)g.innerHTML=guideHtml(name);
 g.style.display=open?'none':'block';
 this.textContent=(open?'':'▴ ')+_('how_to')+(open?' ▾':'');
 });
 });
 }

 // ═══════════════════════════════════════════════════════════════════
 // EXERCISE DB v2 — gap-driven expansion (metadataSource:"inferred")
 // One delineated module: new entries + rule-based metadata inference.
 // Kept as a single self-contained section so splitting it into a
 // separate versioned data file (loaded + cached by sw.js, which
 // already caches same-origin GETs) is mechanical later.
 // Entry schema: {n:name, p:primary muscle, eq:[equipment ids],
 // sec:[secondary muscle ids], g:{s,e,c,b} guide (en),
 // ar:{name,s,e,c,b} Arabic, optional curated overrides:
 // t (type), mp (pattern), diff (difficulty), f (fatigue),
 // jr (joints), subs (alternatives)}
 // ═══════════════════════════════════════════════════════════════════
 var EX_NEW=[
 // ── Mobility / Warm-up ──
 {n:'World\'s Greatest Stretch',p:'mobility',eq:['bodyweight'],sec:['hip','spine'],g:{s:'Start in a push-up position, step one foot outside your hand.',e:'Rotate the inside arm up to the sky, hold, then switch.',c:'Keep the back leg straight and focus on opening the hip and thoracic spine.',b:'Exhale on the twist.'},ar:{name:'أعظم إطالة في العالم',s:'وضع الضغط، خطوة بقدم واحدة خارج يدك.',e:'لف الذراع الداخلي للسماء، اثبت، ثم بدل.',c:'حافظ على الرجل الخلفية مستقيمة وركز على فتح الحوض والصدر.',b:'زفير عند اللف.'}},
 {n:'90/90 Hip Rotations',p:'mobility',eq:['bodyweight'],sec:['hip'],g:{s:'Sit on the floor, one leg in front bent at 90°, the other behind bent at 90°.',e:'Slowly rotate your hips to switch the legs to the other side without using hands if possible.',c:'Keep your torso upright and move smoothly.',b:'Breathe naturally.'},ar:{name:'90/90 دوران الحوض',s:'اجلس على الأرض، رجل أمامية بزاوية 90 درجة ورجل خلفية بـ 90 درجة.',e:'لف حوضك ببطء لتبديل الأرجل للجهة التانية بدون إيدين لو أمكن.',c:'خلي ظهرك مفرود واتحرك بسلاسة.',b:'تنفس براحتك.'}},
 {n:'Cossack Squat',p:'mobility',eq:['bodyweight'],sec:['quads','hamstrings'],g:{s:'Stand very wide, toes slightly out.',e:'Squat down sideways over one leg, keeping the other leg straight.',c:'Keep the heel of the bent leg on the floor, and point the straight leg\'s toes up.',b:'Exhale as you push back to center.'},ar:{name:'قرفصاء قوزاق',s:'قف بفتحة أرجل واسعة جداً.',e:'انزل قرفصاء على رجل واحدة مع بقاء الرجل التانية مفرودة.',c:'خلي كعب الرجل المتنية على الأرض، واصابع الرجل المفرودة لفوق.',b:'زفير وإنت بتدفع للمنتصف.'}},
 {n:'Shoulder Dislocates',p:'mobility',eq:['band'],sec:['shoulders'],g:{s:'Hold a band or stick with a very wide grip in front of you.',e:'Keeping arms straight, bring it up and over your head to your lower back, then reverse.',c:'Start very wide and do not force through pain.',b:'Inhale up, exhale down.'},ar:{name:'فك الكتف بالشريط',s:'امسك شريط مقاومة أو عصا بمسكة واسعة جداً.',e:'بذراعين مفرودين، ارفعها فوق رأسك لظهرك، ثم ارجع.',c:'ابدأ بمسكة واسعة جداً ولا تضغط على الألم.',b:'شهيق لفوق، زفير لتحت.'}},
 {n:'Thoracic Extensions',p:'mobility',eq:['foam_roller'],sec:['spine'],g:{s:'Lie with a foam roller across your mid-back, hands supporting your head.',e:'Arch your upper back over the roller while keeping your ribs down.',c:'Do not roll the lower back; focus on the thoracic spine.',b:'Exhale as you stretch over the roller.'},ar:{name:'تمديد الصدر برول الفوم',s:'نام ورول الفوم تحت منتصف ظهرك، وإيدك ساندة راسك.',e:'قوس ظهرك العلوي فوق الرول وحافظ على أضلاعك لتحت.',c:'ماتعملش رول لأسفل الظهر؛ ركز على منتصف الظهر.',b:'زفير مع الإطالة.'}},
 {n:'Cat-Cow',p:'mobility',eq:['bodyweight'],sec:['spine'],g:{s:'Get on all fours, hands under shoulders, knees under hips.',e:'Arch your back up (cat) then let your belly dip down (cow).',c:'Move slowly and articulate through the entire spine.',b:'Exhale on cat, inhale on cow.'},ar:{name:'إطالة القطة والبقرة',s:'انزل على إيدك وركبك، الأيدين تحت الكتف والركب تحت الحوض.',e:'قوس ظهرك لفوق (القطة) ثم نزل بطنك لتحت (البقرة).',c:'اتحرك ببطء وشغل العمود الفقري كله.',b:'زفير في القطة، شهيق في البقرة.'}},
 // ── Chest (gap: fly variants, pressing variants, band/home) ──
 {n:'Decline Bench Press',p:'chest',eq:['barbell'],sec:['triceps','shoulders'],g:{s:'Bench at 15-30° decline, feet hooked, bar over the lower chest.',e:'Lower the bar to the lower chest, press up and back.',c:'Keep the bar path over the lower pecs.',b:'Exhale on the press.'},ar:{name:'ضغط بنش مائل لأسفل',s:'بنش مائل 15-30°، ثبّت القدمين، البار فوق أسفل الصدر.',e:'أنزل البار لأسفل الصدر ثم ادفعه للأعلى والخلف.',c:'حافظ على مسار البار فوق الجزء السفلي من الصدر.',b:'زفير عند الدفع.'}},
 {n:'Cable Crossover',p:'chest',eq:['cable'],sec:['shoulders','triceps'],g:{s:'Cables high, step forward, slight lean, arms extended wide.',e:'Bring the handles together in front of the chest, pause, return slowly.',c:'Slight elbow bend; squeeze the chest at the peak.',b:'Exhale on the squeeze.'},ar:{name:'كروس كابل',s:'كابل مرتفع، خطوة للأمام، ميل بسيط، ذراعان ممدودتان.',e:'اجمع المقابض أمام الصدر، توقف قليلاً ثم عُد ببطء.',c:'ثني بسيط بالكوع؛ اضغط الصدر عند الذروة.',b:'زفير عند الضغط.'}},
 {n:'Single-Arm Cable Fly',p:'chest',eq:['cable'],sec:['shoulders'],g:{s:'Cable at chest height, side-on, arm extended across the body.',e:'Bring the handle across the chest, pause, return slowly.',c:'Keep the torso still; fixed elbow angle.',b:'Exhale as you close.'},ar:{name:'تجميع كابل بذراع واحدة',s:'كابل بارتفاع الصدر، واقف جانبياً، ذراع ممدودة عبر الجسم.',e:'اسحب المقبض عبر الصدر، توقف، وعُد ببطء.',c:'أبقِ الجذع ثابتاً وزاوية الكوع ثابتة.',b:'زفير عند التجمع.'}},
 {n:'Svend Press',p:'chest',eq:['dumbbell'],sec:['triceps'],g:{s:'Palms pressed together holding one dumbbell at the chest, elbows out.',e:'Press the palms straight out, squeeze the chest, return.',c:'Squeeze the dumbbell hard between the palms the whole rep.',b:'Exhale on the press.'},ar:{name:'ضغط سفيند',s:'الكفان ملتصقان على دمبل واحد أمام الصدر، مرفقان للخارج.',e:'ادفع الكفين للأمام، اضغط الصدر، وعُد.',c:'اضغط الدمبل بقوة بين الكفين طوال الحركة.',b:'زفير عند الدفع.'}},
 {n:'Landmine Press',p:'chest',eq:['barbell'],sec:['shoulders','triceps'],g:{s:'Bar in a landmine corner, one hand on the top end, staggered stance.',e:'Press the end of the bar up and slightly across, lower with control.',c:'Keep the elbow close to the ribs at the start.',b:'Exhale on the press.'},ar:{name:'ضغط لاندماين',s:'بار في زاوية لاندماين، يد على طرف البار، وقفة متدرجة.',e:'ادفع طرف البار للأعلى قليلاً بشكل عرضي، وأنزله بتحكم.',c:'أبقِ الكوع قريباً من الجسم عند البداية.',b:'زفير عند الدفع.'}},
 {n:'Band Chest Press',p:'chest',eq:['band'],sec:['triceps','shoulders'],g:{s:'Band anchored behind you at chest height, handles at the chest.',e:'Press the handles forward until the arms are straight, return slowly.',c:'Don\'t let the band snap back — control the return.',b:'Exhale on the press.'},ar:{name:'ضغط صدر بباند',s:'ثبّت الباند خلفك بارتفاع الصدر، المقابض عند الصدر.',e:'ادفع المقابض للأمام حتى استقامة الذراعين، وعُد ببطء.',c:'لا تدع الباند يرتد — تحكم في العودة.',b:'زفير عند الدفع.'}},
 {n:'Banded Push-Up',p:'chest',eq:['band'],sec:['triceps','shoulders'],g:{s:'Band across the upper back held under the hands, plank position.',e:'Lower the chest to the floor, press back up against the band.',c:'Keep the core braced; the band adds overload at the top.',b:'Inhale down, exhale up.'},ar:{name:'ضغط أرضي بباند',s:'باند خلف أعلى الظهر مثبت تحت الكفين، وضعية اللوح.',e:'أنزل الصدر للأرض وادفع للأعلى ضد الباند.',c:'ثبّت الجذع؛ الباند يزيد الحمل عند القمة.',b:'شهيق للأسفل، زفير للأعلى.'}},
 {n:'Archer Push-Up',p:'chest',eq:['bodyweight'],sec:['triceps','shoulders'],g:{s:'Wide hand position, body in a straight line.',e:'Lower toward one hand while the other arm straightens, press back, switch.',c:'Shift the weight over the working side.',b:'Exhale on the press.'},ar:{name:'ضغط أرضي قوسي',s:'كفان متباعدان، الجسم في خط مستقيم.',e:'انزل نحو أحد الكفين بينما يمتد الذراع الآخر، ادفع، وبدّل.',c:'انقل الوزن فوق الجانب العامل.',b:'زفير عند الدفع.'}},
 {n:'Incline Dumbbell Fly',p:'chest',eq:['dumbbell'],sec:['shoulders'],g:{s:'Incline bench 30-45°, dumbbells over the chest, palms facing.',e:'Open the arms in an arc to a stretch, bring them back together.',c:'Fixed elbow angle; control the negative.',b:'Exhale as you close.'},ar:{name:'تجميع دمبل مائل',s:'بنش مائل 30-45°، دمبلان فوق الصدر، الكفان متقابلان.',e:'افتح الذراعين بقوس حتى التمدد ثم أعدهما معاً.',c:'زاوية كوع ثابتة؛ تحكم في النزول.',b:'زفير عند التجمع.'}},
 {n:'Dumbbell Pullover',p:'chest',eq:['dumbbell'],sec:['back','triceps'],g:{s:'Lie across a bench, one dumbbell over the chest, both hands under the top plate.',e:'Lower the dumbbell behind the head to a stretch, pull it back over the chest.',c:'Keep the elbows slightly bent throughout.',b:'Exhale on the pull.'},ar:{name:'بول أوفر دمبل',s:'استلقِ على بنش، دمبل واحد فوق الصدر، اليدان تحت القرص العلوي.',e:'أنزل الدمبل خلف الرأس حتى التمدد ثم اسحبه فوق الصدر.',c:'أبقِ الكوعين مثنيين قليلاً طوال الحركة.',b:'زفير عند السحب.'}},
 {n:'Machine Chest Dip',p:'chest',eq:['machine'],sec:['triceps','shoulders'],g:{s:'Set the assist weight, arms on the pads, slight forward lean.',e:'Lower until the shoulders dip below the elbows, press back up.',c:'Lean forward slightly to bias the chest.',b:'Exhale on the press.'},ar:{name:'دايب جهاز للصدر',s:'اضبط وزن المساعدة، ذراعان على الوسائد، ميل بسيط للأمام.',e:'انزل حتى ينخفض الكتف تحت الكوع ثم ادفع للأعلى.',c:'ميل بسيط للأمام لتفعيل الصدر.',b:'زفير عند الدفع.'}},
 {n:'Incline Cable Fly',p:'chest',eq:['cable'],sec:['shoulders'],g:{s:'Cables low, incline bench between the pulleys.',e:'Bring the handles together above the upper chest, pause, return.',c:'Slight elbow bend; feel the upper-chest squeeze.',b:'Exhale on the squeeze.'},ar:{name:'تجميع كابل مائل',s:'كابل منخفض، بنش مائل بين البكرتين.',e:'اجمع المقابض فوق أعلى الصدر، توقف، وعُد.',c:'ثني كوع بسيط؛ اشعر بانقباض أعلى الصدر.',b:'زفير عند الضغط.'}},
 // ── Back (gap: pulldown grip variants, beginner band rows, advanced pull-ups) ──
 {n:'Pendlay Row',p:'back',eq:['barbell'],sec:['biceps','shoulders'],g:{s:'Barbell on the floor, hinge to horizontal back, grip outside the knees.',e:'Explosively row the bar to the chest, lower to a dead stop each rep.',c:'Flat back; the bar returns to the floor every rep.',b:'Exhale on the pull.'},ar:{name:'سحب بندلاي',s:'بار على الأرض، انحناء بظهر مسطح، قبضة خارج الركبتين.',e:'اسحب البار بقوة إلى الصدر وأنزله لتوقف تام كل تكرار.',c:'ظهر مسطح؛ البار يعود للأرض كل تكرار.',b:'زفير عند السحب.'}},
 {n:'Seal Row',p:'back',eq:['dumbbell'],sec:['biceps'],g:{s:'Face-down on an incline bench, dumbbells hanging.',e:'Row the dumbbells to the sides of the ribs, squeeze, lower.',c:'The bench removes cheating — strict form.',b:'Exhale on the pull.'},ar:{name:'سحب سيل',s:'منبطح على بنش مائل، دمبلان معلقان.',e:'اسحب الدمبلين لجانبي الأضلاع، اضغط، وأنزلهما.',c:'البنش يمنع الغش — أداء صارم.',b:'زفير عند السحب.'}},
 {n:'Rack Pull',p:'back',eq:['barbell'],sec:['traps','hamstrings'],g:{s:'Bar on pins at knee height, overhand grip, hips back.',e:'Drive up through the floor with a flat back until standing tall, lower.',c:'A partial deadlift — heavy, keep the bar close.',b:'Exhale at the top.'},ar:{name:'سحب رف',s:'بار على دعامات بارتفاع الركبة، قبضة علوية، ورك للخلف.',e:'ادفع للأعلى بظهر مسطح حتى الوقوف الكامل، ثم أنزل.',c:'رفعة مميتة جزئية — ثقيلة، أبقِ البار قريباً.',b:'زفير عند القمة.'}},
 {n:'Single-Arm Lat Pulldown',p:'back',eq:['cable'],sec:['biceps'],g:{s:'Kneel or sit facing the cable, one handle, other hand free.',e:'Pull the handle to the chest, drive the elbow down, return slowly.',c:'Rotate slightly for a bigger stretch on the working lat.',b:'Exhale on the pull.'},ar:{name:'سحب أمامي بذراع واحدة',s:'اجلس أو اركع مقابل الكابل، مقبض واحد، اليد الأخرى حرة.',e:'اسحب المقبض إلى الصدر، ادفع الكوع للأسفل، وعُد ببطء.',c:'دوران بسيط لتمدد أكبر للّات العامل.',b:'زفير عند السحب.'}},
 {n:'Reverse-Grip Pulldown',p:'back',eq:['cable'],sec:['biceps'],g:{s:'Underhand grip shoulder-width, thighs under the pads.',e:'Pull the bar to the upper chest, squeeze, return slowly.',c:'The underhand grip adds a biceps stretch.',b:'Exhale on the pull.'},ar:{name:'سحب أمامي بقبضة معكوسة',s:'قبضة عكسية بعرض الكتفين، الفخذان تحت الوسائد.',e:'اسحب البار لأعلى الصدر، اضغط، وعُد ببطء.',c:'القبضة المعكوسة تضيف تمدداً للبايسيبس.',b:'زفير عند السحب.'}},
 {n:'Lat Prayer',p:'back',eq:['cable'],sec:['biceps'],g:{s:'Kneel facing a high cable, arms extended overhead holding the bar.',e:'Drive the elbows down and back, leaning into the stretch, return.',c:'Maximal lat stretch at the top — light weight.',b:'Exhale on the pull.'},ar:{name:'صلاة اللاتس',s:'اركع مقابل كابل مرتفع، ذراعان ممدودتان للأعلى ممسكتان البار.',e:'ادفع الكوعين للأسفل والخلف مع ميل للأمام، ثم عُد.',c:'تمدد أقصى للّات عند القمة — وزن خفيف.',b:'زفير عند السحب.'}},
 {n:'Archer Pull-Up',p:'back',eq:['bodyweight'],sec:['biceps','forearms'],g:{s:'Hang with one arm extended to the side on the bar.',e:'Pull toward one hand, the other arm stays straight, lower, switch.',c:'A one-arm-dominant pull-up — strong lats required.',b:'Exhale on the pull.'},ar:{name:'عقلة قوسية',s:'تعلق بذراع ممتد للجانب على البار.',e:'اسحب نحو يد واحدة بينما يبقى الذراع الآخر مستقيماً، أنزل، وبدّل.',c:'عقلة بتركيز ذراع واحدة — تتطلب لاتس قوياً.',b:'زفير عند السحب.'}},
 {n:'Weighted Pull-Up',p:'back',eq:['bodyweight'],sec:['biceps','forearms'],g:{s:'Hang with a plate or dumbbell between the legs.',e:'Pull until the chin clears the bar, lower under control.',c:'Don\'t kip — keep the legs still.',b:'Exhale on the pull.'},ar:{name:'عقلة بأوزان',s:'تعلق مع قرص أو دمبل بين القدمين.',e:'اسحب حتى يتجاوز الذقن البار، وأنزل بتحكم.',c:'لا تتأرجح — أبقِ الساقين ثابتتين.',b:'زفير عند السحب.'}},
 {n:'Wide-Grip Pull-Up',p:'back',eq:['bodyweight'],sec:['biceps'],g:{s:'Grip wider than the shoulders, hang.',e:'Pull until the upper chest approaches the bar, lower with control.',c:'The wide grip biases the upper lats.',b:'Exhale on the pull.'},ar:{name:'عقلة بقبضة واسعة',s:'قبضة أعرض من الكتفين، ثم تعلق.',e:'اسحب حتى يقترب أعلى الصدر من البار، وانزل بتحكم.',c:'القبضة الواسعة تركّز على اللاتس العلوي.',b:'زفير عند السحب.'}},
 {n:'One-Arm Cable Row',p:'back',eq:['cable'],sec:['biceps'],g:{s:'Side-on to a low cable, one handle, staggered stance.',e:'Row the handle to the hip, squeeze, return fully.',c:'No torso rotation — pull with the lat.',b:'Exhale on the pull.'},ar:{name:'سحب كابل بذراع واحدة',s:'جانبي مقابل كابل منخفض، مقبض واحد، وقفة متدرجة.',e:'اسحب المقبض إلى الورك، اضغط، وعُد بالكامل.',c:'بدون دوران للجذع — اسحب باللات.',b:'زفير عند السحب.'}},
 {n:'Band Pulldown',p:'back',eq:['band'],sec:['biceps'],g:{s:'Band anchored overhead, kneeling, arms extended.',e:'Pull the band to the chest, drive the elbows down, return slowly.',c:'Constant tension from the band.',b:'Exhale on the pull.'},ar:{name:'سحب أمامي بباند',s:'باند مثبت للأعلى، راكعاً، ذراعان ممدودتان.',e:'اسحب الباند إلى الصدر، ادفع الكوعين للأسفل، وعُد ببطء.',c:'شد مستمر من الباند.',b:'زفير عند السحب.'}},
 {n:'Band Row',p:'back',eq:['band'],sec:['biceps'],g:{s:'Band anchored at chest height, seated, legs extended.',e:'Row the band to the ribs, squeeze, return slowly.',c:'Sit tall — no rocking.',b:'Exhale on the pull.'},ar:{name:'سحب بباند',s:'باند مثبت بارتفاع الصدر، جالساً بساقين ممدودتين.',e:'اسحب الباند إلى الأضلاع، اضغط، وعُد ببطء.',c:'اجلس منتصباً — بدون تمايل.',b:'زفير عند السحب.'}},
 {n:'Trap Bar Row',p:'back',eq:['barbell'],sec:['biceps','shoulders'],g:{s:'Stand inside the trap bar, hinge slightly, grip the handles.',e:'Row the handles to the ribs, squeeze, lower.',c:'More upright than a barbell row — back-friendly.',b:'Exhale on the pull.'},ar:{name:'سحب بار تراب',s:'قف داخل بار التراب، انحنِ قليلاً، وامسك المقابض.',e:'اسحب المقابض إلى الأضلاع، اضغط، وأنزل.',c:'أكثر استقامة من سحب البار — صديق للظهر.',b:'زفير عند السحب.'}},
 {n:'Narrow-Grip Pulldown',p:'back',eq:['cable'],sec:['biceps'],g:{s:'Close neutral grip, thighs under the pads.',e:'Pull the handle to the upper chest, drive the elbows down, return.',c:'The narrow grip stretches the lats more.',b:'Exhale on the pull.'},ar:{name:'سحب أمامي بقبضة ضيقة',s:'قبضة محايدة ضيقة، الفخذان تحت الوسائد.',e:'اسحب المقبض لأعلى الصدر، ادفع الكوعين للأسفل، وعُد.',c:'القبضة الضيقة تمدد اللاتس أكثر.',b:'زفير عند السحب.'}},
 {n:'V-Grip Pulldown',p:'back',eq:['cable'],sec:['biceps'],g:{s:'V-handle attached, thighs under the pads.',e:'Pull the handle to the sternum, squeeze the mid-back, return.',c:'Lead with the elbows.',b:'Exhale on the pull.'},ar:{name:'سحب بقبضة في',s:'مقبض في مثبت، الفخذان تحت الوسائد.',e:'اسحب المقبض لعظم الصدر، اضغط منتصف الظهر، وعُد.',c:'قُد بالكوعين.',b:'زفير عند السحب.'}},
 {n:'Kettlebell Row',p:'back',eq:['kettlebell'],sec:['biceps','shoulders'],g:{s:'Hinge forward, one kettlebell on the floor, flat back.',e:'Row the kettlebell to the hip, squeeze, lower.',c:'Keep the hips square and the back flat.',b:'Exhale on the pull.'},ar:{name:'سحب كيتلبل',s:'انحنِ للأمام، كيتلبل على الأرض، ظهر مسطح.',e:'اسحب الكيتلبل إلى الورك، اضغط، وأنزل.',c:'أبقِ الوركين مستويين والظهر مسطحاً.',b:'زفير عند السحب.'}},
 // ── Shoulders (gap: no advanced options, no beginner cable/band, rotation) ──
 {n:'Push Press',p:'shoulders',eq:['barbell'],sec:['triceps'],g:{s:'Bar at collarbone height, feet shoulder-width, slight knee bend.',e:'Dip slightly, drive with the legs, press the bar overhead.',c:'Use leg drive — the arms finish the press.',b:'Exhale on the press.'},ar:{name:'ضغط دفعي',s:'بار بارتفاع الترقوة، قدم بعرض الكتفين، ثني ركبة بسيط.',e:'انحنِ قليلاً، ادفع بالساقين، واضغط البار فوق الرأس.',c:'استخدم دفع الساقين — الذراعان ينهيان الضغط.',b:'زفير عند الدفع.'}},
 {n:'Handstand Push-Up',p:'shoulders',eq:['bodyweight'],sec:['triceps'],g:{s:'Handstand against a wall, hands slightly wider than the shoulders.',e:'Lower the head toward the floor, press back up.',c:'Keep the body in a straight line — no arching.',b:'Inhale down, exhale up.'},ar:{name:'ضغط وقوف على اليدين',s:'وقوف على اليدين مقابل الحائط، كفان أوسع قليلاً من الكتفين.',e:'أنزل الرأس نحو الأرض ثم ادفع للأعلى.',c:'أبقِ الجسم في خط مستقيم — بدون تقوس.',b:'شهيق للأسفل، زفير للأعلى.'}},
 {n:'Pike Push-Up',p:'shoulders',eq:['bodyweight'],sec:['triceps'],g:{s:'Hips high in a pike position, hands wider than the shoulders.',e:'Lower the head toward the floor between the hands, press back up.',c:'A handstand push-up progression.',b:'Inhale down, exhale up.'},ar:{name:'ضغط زاوية',s:'ورك مرتفع بوضعية الزاوية، كفان أوسع من الكتفين.',e:'أنزل الرأس نحو الأرض بين الكفين ثم ادفع للأعلى.',c:'خطوة تمهيدية للوقوف على اليدين.',b:'شهيق للأسفل، زفير للأعلى.'}},
 {n:'Single-Arm Dumbbell Press',p:'shoulders',eq:['dumbbell'],sec:['triceps'],g:{s:'One dumbbell at shoulder height, standing or seated.',e:'Press up until the arm is straight, lower with control.',c:'Brace the core against rotation.',b:'Exhale on the press.'},ar:{name:'ضغط دمبل بذراع واحدة',s:'دمبل واحد بارتفاع الكتف، واقفاً أو جالساً.',e:'ادفع للأعلى حتى استقامة الذراع، وأنزل بتحكم.',c:'شدّ الجذع لمقاومة الدوران.',b:'زفير عند الدفع.'}},
 {n:'Cable Front Raise',p:'shoulders',eq:['cable'],sec:[],g:{s:'Low cable, handle in one hand behind the body.',e:'Raise the arm to shoulder height, pause, lower slowly.',c:'Constant tension — no momentum.',b:'Exhale on the raise.'},ar:{name:'رفع أمامي كابل',s:'كابل منخفض، مقبض بيد واحدة خلف الجسم.',e:'ارفع الذراع لارتفاع الكتف، توقف، وأنزل ببطء.',c:'شد مستمر — بدون اندفاع.',b:'زفير عند الرفع.'}},
 {n:'Z-Press',p:'shoulders',eq:['bodyweight'],sec:['triceps','abs'],g:{s:'Seated with legs extended straight, dumbbells at the shoulders.',e:'Press overhead with a tall torso, lower to the shoulders.',c:'No leg drive and no back lean — pure pressing.',b:'Exhale on the press.'},ar:{name:'ضغط زد',s:'جالساً بساقين ممدودتين، دمبلان عند الكتفين.',e:'ادفع فوق الرأس بجذع منتصب ثم أنزل للكتفين.',c:'بدون دفع ساق وبدون ميل للظهر — ضغط نقي.',b:'زفير عند الدفع.'}},
 {n:'Incline Y-Raise',p:'shoulders',eq:['bodyweight'],sec:['traps'],g:{s:'Incline bench 30-45°, arms hanging, thumbs up.',e:'Raise the arms in a Y shape to shoulder height, lower slowly.',c:'Lead with the thumbs — upper-back engagement.',b:'Exhale on the raise.'},ar:{name:'رفع واي مائل',s:'بنش مائل 30-45°، ذراعان معلقان، إبهامان للأعلى.',e:'ارفع الذراعين بشكل واي لارتفاع الكتف، وأنزل ببطء.',c:'قُد بالإبهامين — لتفعيل أعلى الظهر.',b:'زفير عند الرفع.'}},
 {n:'Wall Slide',p:'shoulders',eq:['bodyweight'],sec:['traps'],g:{s:'Back against a wall, arms up in a goalpost, elbows and wrists on the wall.',e:'Slide the arms up and down keeping everything on the wall.',c:'Mobility drill — no weights.',b:'Breathe steadily.'},ar:{name:'انزلاق حائطي',s:'ظهر على الحائط، ذراعان بوضعية المرمى، كوعان ورسغان على الحائط.',e:'انزلق بالذراعين للأعلى والأسفل مع بقاء كل شيء على الحائط.',c:'تمرين حركي — بدون أوزان.',b:'تنفس منتظم.'}},
 {n:'Cuban Rotation',p:'shoulders',eq:['dumbbell'],sec:['traps'],g:{s:'Dumbbells at the thighs, light weight, elbows straight.',e:'Raise the arms to shoulder height, rotate the thumbs down and back, lower.',c:'Stop before discomfort — shoulder health first.',b:'Exhale on the raise.'},ar:{name:'دوران كوبي',s:'دمبلان خفيفان عند الفخذين، كوعان مستقيمان.',e:'ارفع الذراعين لارتفاع الكتف، دوّر الإبهامين للأسفل والخلف، ثم أنزل.',c:'توقف قبل أي انزعاج — صحة الكتف أولاً.',b:'زفير عند الرفع.'}},
 {n:'Band External Rotation',p:'shoulders',eq:['band'],sec:[],g:{s:'Band anchored at elbow height, elbow bent 90° at the side.',e:'Rotate the forearm outward against the band, return slowly.',c:'Elbow stays glued to the side.',b:'Exhale on the rotation.'},ar:{name:'دوران خارجي بباند',s:'باند مثبت بارتفاع الكوع، كوع مثني 90° بجانب الجسم.',e:'دوّر الساعد للخارج ضد الباند وعُد ببطء.',c:'أبقِ الكوع ملاصقاً للجسم.',b:'زفير عند الدوران.'}},
 {n:'Machine Lateral Raise',p:'shoulders',eq:['machine'],sec:['traps'],g:{s:'Seat so the pads sit at the outer elbows.',e:'Raise the arms to shoulder height, pause, lower slowly.',c:'Control the negative — no bouncing.',b:'Exhale on the raise.'},ar:{name:'رفرفة جانبي جهاز',s:'اجلس بحيث تلامس الوسائد المرفقين من الخارج.',e:'ارفع الذراعين لارتفاع الكتف، توقف، وأنزل ببطء.',c:'تحكم في النزول — بدون ارتداد.',b:'زفير عند الرفع.'}},
 {n:'Cable Y-Raise',p:'shoulders',eq:['cable'],sec:['traps'],g:{s:'Low cables, handles in both hands, slight lean forward.',e:'Raise the arms in a Y shape to shoulder height, lower slowly.',c:'Lead with the thumbs.',b:'Exhale on the raise.'},ar:{name:'رفع واي كابل',s:'كابل منخفض، مقبض بكل يد، ميل بسيط للأمام.',e:'ارفع الذراعين بشكل واي لارتفاع الكتف، وأنزل ببطء.',c:'قُد بالإبهامين.',b:'زفير عند الرفع.'}},
 {n:'Scapular Push-Up',p:'shoulders',eq:['bodyweight'],sec:[],g:{s:'Plank position, arms straight.',e:'Protract the shoulder blades (push the floor away), retract, repeat.',c:'Small movement — pure scapular control.',b:'Breathe steadily.'},ar:{name:'ضغط لوحي',s:'وضعية اللوح، ذراعان مستقيمان.',e:'أبعد لوحي الكتفين (ادفع الأرض بعيداً) ثم جمعهما، وكرر.',c:'حركة صغيرة — تحكم لوحي نقي.',b:'تنفس منتظم.'}},
 // ── Quads (gap: lunge family, advanced squatting, referenced Cossack Squat) ──
 {n:'Cossack Squat',p:'quads',eq:['bodyweight'],sec:['glutes','hamstrings'],g:{s:'Feet wide, toes out, one leg straight as the other bends.',e:'Sit deep toward the bent leg, drive up, switch sides.',c:'Heel down; the straight leg stays active.',b:'Exhale up.'},ar:{name:'قرفصاء قوزاقي',s:'قدمان متباعدتان، أصابع للخارج، ساق مستقيمة والأخرى تنثني.',e:'اجلس بعمق نحو الساق المثنية، ادفع للأعلى، وبدّل الجانبين.',c:'الكعب لأسفل؛ الساق المستقيمة تبقى نشطة.',b:'زفير عند الصعود.'}},
 {n:'Box Squat',p:'quads',eq:['barbell'],sec:['glutes','hamstrings'],g:{s:'Box at parallel height, bar on the traps, feet shoulder-width.',e:'Sit back to the box, pause, drive up without bouncing.',c:'Touch-and-go — reset your brace each rep.',b:'Inhale down, exhale up.'},ar:{name:'قرفصاء على صندوق',s:'صندوق بارتفاع الموازاة، بار على الترابيس، قدم بعرض الكتفين.',e:'اجلس للخلف على الصندوق، توقف، وادفع للأعلى بدون ارتداد.',c:'لمسة وانطلاق — أعد شد الجذع كل تكرار.',b:'شهيق للأسفل، زفير للأعلى.'}},
 {n:'Pistol Squat',p:'quads',eq:['bodyweight'],sec:['glutes','hamstrings'],g:{s:'One leg extended forward, arms out for balance.',e:'Squat down on one leg to full depth, drive back up.',c:'A strength + mobility feat — use a support if needed.',b:'Exhale up.'},ar:{name:'قرفصاء مسدس',s:'ساق ممتدة للأمام، ذراعان للتوازن.',e:'قرفصاء على ساق واحدة حتى العمق الكامل ثم ادفع للأعلى.',c:'تتطلب قوة ومرونة — استخدم دعماً عند الحاجة.',b:'زفير عند الصعود.'}},
 {n:'Split Squat',p:'quads',eq:['bodyweight'],sec:['glutes'],g:{s:'Staggered stance, rear foot on the toe, torso tall.',e:'Lower the back knee toward the floor, drive up through the front heel.',c:'No equipment needed — a lunge base pattern.',b:'Exhale up.'},ar:{name:'قرفصاء منقسمة',s:'وقفة متدرجة، قدم خلفية على الأصابع، جذع منتصب.',e:'أنزل الركبة الخلفية نحو الأرض وادفع بكعب القدم الأمامية.',c:'بدون معدات — نمط اندفاع أساسي.',b:'زفير عند الصعود.'}},
 {n:'Forward Lunge',p:'quads',eq:['dumbbell'],sec:['glutes'],g:{s:'Dumbbells at the sides, step forward.',e:'Lower until both knees are ~90°, drive back to standing.',c:'Step long enough for a vertical front shin.',b:'Exhale up.'},ar:{name:'اندفاع أمامي',s:'دمبلان بالجانبين، خطوة للأمام.',e:'انزل حتى تصل الركبتان ~90° ثم ادفع للعودة للوقوف.',c:'خطوة كافية لقصبة أمامية عمودية.',b:'زفير عند الصعود.'}},
 {n:'Reverse Lunge',p:'quads',eq:['dumbbell'],sec:['glutes','hamstrings'],g:{s:'Dumbbells at the sides, step backward.',e:'Lower the rear knee toward the floor, drive back to standing.',c:'Easier on the knee than a forward lunge.',b:'Exhale up.'},ar:{name:'اندفاع خلفي',s:'دمبلان بالجانبين، خطوة للخلف.',e:'أنزل الركبة الخلفية نحو الأرض ثم ادفع للعودة.',c:'أسهل على الركبة من الاندفاع الأمامي.',b:'زفير عند الصعود.'}},
 {n:'Walking Lunge',p:'quads',eq:['dumbbell'],sec:['glutes','hamstrings'],g:{s:'Dumbbells at the sides, walk forward with alternating lunges.',e:'Step, lower, drive through the front heel into the next step.',c:'Stay tall; keep the steps controlled.',b:'Exhale on each drive.'},ar:{name:'اندفاع مشي',s:'دمبلان بالجانبين، امشِ للأمام باندفاعات متبادلة.',e:'خطوة، نزول، دفع بكعب القدم الأمامية للخطوة التالية.',c:'ابقَ منتصباً وتحكم في الخطوات.',b:'زفير عند كل دفع.'}},
 {n:'Lateral Lunge',p:'quads',eq:['dumbbell'],sec:['glutes','hamstrings'],g:{s:'Step to the side, toes forward.',e:'Sit back into the stepping leg, drive back to center.',c:'Keep the other leg straight and the chest up.',b:'Exhale up.'},ar:{name:'اندفاع جانبي',s:'خطوة للجانب، أصابع للأمام.',e:'اجلس للخلف على الساق الخارجة ثم ادفع للعودة للمنتصف.',c:'أبقِ الساق الأخرى مستقيمة والصدر مرفوعاً.',b:'زفير عند الصعود.'}},
 {n:'Wall Sit',p:'quads',eq:['bodyweight'],sec:['glutes'],g:{s:'Back flat on a wall, knees at 90°, feet hip-width.',e:'Hold the position for time.',c:'Thighs parallel to the floor.',b:'Breathe steadily.'},ar:{name:'جلوس الحائط',s:'ظهر مسطح على حائط، ركبتان بزاوية 90°، قدم بعرض الورك.',e:'اثبت على الوضعية لمدة زمنية.',c:'الفخذان موازيان للأرض.',b:'تنفس منتظم.'}},
 {n:'Zercher Squat',p:'quads',eq:['barbell'],sec:['glutes','hamstrings'],g:{s:'Bar held in the elbows at the chest, feet shoulder-width.',e:'Squat to depth keeping the torso tall, drive up.',c:'The front rack position forces an upright torso.',b:'Inhale down, exhale up.'},ar:{name:'قرفصاء زيرشر',s:'بار في ثنية الكوعين عند الصدر، قدم بعرض الكتفين.',e:'قرفصاء حتى العمق مع جذع منتصب ثم ادفع للأعلى.',c:'الوضعية الأمامية تُجبر الجذع على الاستقامة.',b:'شهيق للأسفل، زفير للأعلى.'}},
 {n:'Kettlebell Thruster',p:'quads',eq:['kettlebell'],sec:['glutes','shoulders'],g:{s:'Kettlebells in a front-rack position.',e:'Squat to depth, drive up, and press the kettlebells overhead.',c:'One fluid movement — the legs start the press.',b:'Exhale at the top.'},ar:{name:'ثرستر كيتلبل',s:'كيتلبلان بوضعية الحامل الأمامي.',e:'قرفصاء حتى العمق، ادفع للأعلى، واضغط الكيتلبل فوق الرأس.',c:'حركة واحدة سلسة — الساقان تبدأان الدفع.',b:'زفير عند القمة.'}},
 {n:'Box Jump',p:'quads',eq:['bodyweight'],sec:['glutes','calves'],g:{s:'Box at a challenging height, feet shoulder-width.',e:'Jump onto the box, land soft with both feet, step down.',c:'Land quietly — absorb the landing.',b:'Exhale on the jump.'},ar:{name:'قفز صندوق',s:'صندوق بارتفاع مناسب، قدم بعرض الكتفين.',e:'اقفز على الصندوق، اهبط بهدوء على القدمين، وانزل.',c:'اهبط بهدوء — امتصاص الهبوط.',b:'زفير عند القفز.'}},
 {n:'Curtsy Lunge',p:'quads',eq:['dumbbell'],sec:['glutes'],g:{s:'Dumbbells at the sides, step one leg behind and across.',e:'Lower the back knee toward the floor, drive back to standing.',c:'The cross-over step adds glute activation.',b:'Exhale up.'},ar:{name:'اندفاع كورنيسي',s:'دمبلان بالجانبين، خطوة خلفية عرضية بإحدى الساقين.',e:'أنزل الركبة الخلفية نحو الأرض ثم ادفع للعودة.',c:'الخطوة العرضية تزيد تفعيل الألوية.',b:'زفير عند الصعود.'}},
 {n:'Anderson Squat',p:'quads',eq:['barbell'],sec:['glutes','hamstrings'],g:{s:'Bar on the pins at parallel depth, hands set under the bar.',e:'Stand up from the pins, then lower the bar back to a rest.',c:'A squat from a dead stop — no stretch reflex.',b:'Exhale up.'},ar:{name:'قرفصاء أندرسون',s:'بار على الدعامات عند عمق الموازاة، اليدان تحت البار.',e:'قف من الدعامات ثم أنزل البار لتوقف كامل.',c:'قرفصاء من توقف تام — بدون ارتداد عضلي.',b:'زفير عند الصعود.'}},
 {n:'Kettlebell Squat',p:'quads',eq:['kettlebell'],sec:['glutes'],g:{s:'Kettlebell held at the chest, feet shoulder-width.',e:'Squat to depth, drive up through the midfoot.',c:'Keep the elbows inside the knees at the bottom.',b:'Exhale up.'},ar:{name:'قرفصاء كيتلبل',s:'كيتلبل عند الصدر، قدم بعرض الكتفين.',e:'قرفصاء حتى العمق ثم ادفع للأعلى عبر منتصف القدم.',c:'أبقِ الكوعين داخل الركبتين عند الأسفل.',b:'زفير عند الصعود.'}},
 {n:'Lateral Step-Up',p:'quads',eq:['bodyweight'],sec:['glutes'],g:{s:'Side-on to a box at knee height.',e:'Step up with the near leg, drive through the heel, lower.',c:'Push through the heel; no push-off from the floor leg.',b:'Exhale up.'},ar:{name:'صعود جانبي',s:'جانبي مقابل صندوق بارتفاع الركبة.',e:'اصعد بالساق القريبة، ادفع بالكعب، وانزل.',c:'ادفع بالكعب؛ بدون دفع من الساق الأرضية.',b:'زفير عند الصعود.'}},
 {n:'Single-Leg Leg Press',p:'quads',eq:['machine'],sec:['glutes'],g:{s:'One foot on the platform, hips square.',e:'Lower until the knee reaches ~90°, press up without locking hard.',c:'The single leg exposes imbalances.',b:'Exhale on the press.'},ar:{name:'ضغط أرجل بقدم واحدة',s:'قدم واحدة على المنصة، ورك مستوٍ.',e:'انزل حتى تصل الركبة ~90° ثم ادفع دون قفل كامل.',c:'القدم الواحدة تكشف الاختلالات.',b:'زفير عند الدفع.'}},
 // ── Glutes (gap: beginner/intermediate spread, band, BW) ──
 {n:'Single-Leg Hip Thrust',p:'glutes',eq:['bodyweight'],sec:['hamstrings'],g:{s:'Shoulders on a bench, one foot on the floor, other leg extended.',e:'Drive through the heel until the hips are fully extended, lower.',c:'Keep the hips level — no dropping.',b:'Exhale at the top.'},ar:{name:'دفع ورك بساق واحدة',s:'كتفان على بنش، قدم واحدة على الأرض والساق الأخرى ممدودة.',e:'ادفع بالكعب حتى تمدد الوركين بالكامل ثم انزل.',c:'أبقِ الوركين مستويين — بدون هبوط.',b:'زفير عند القمة.'}},
 {n:'Banded Hip Thrust',p:'glutes',eq:['band'],sec:['hamstrings'],g:{s:'Band around the knees, shoulders on a bench.',e:'Drive the hips up and push the knees out against the band.',c:'The band adds abductor work at the top.',b:'Exhale at the top.'},ar:{name:'دفع ورك بباند',s:'باند حول الركبتين، كتفان على بنش.',e:'ادفع الوركين للأعلى وافتح الركبتين ضد الباند.',c:'الباند يضيف عملاً للعضلات المبعدة عند القمة.',b:'زفير عند القمة.'}},
 {n:'Barbell Glute Bridge',p:'glutes',eq:['barbell'],sec:['hamstrings'],g:{s:'Bar across the hips, lying with knees bent, feet flat.',e:'Drive the hips up to full extension, squeeze, lower.',c:'Pad the bar if needed — keep it over the hips.',b:'Exhale at the top.'},ar:{name:'جسر ألوية ببار',s:'بار عبر الوركين، مستلقٍ بركبتين مثنيتين وقدمين على الأرض.',e:'ادفع الوركين للأعلى حتى التمدد الكامل، اضغط، وانزل.',c:'استخدم وسادة عند الحاجة — أبقِ البار فوق الوركين.',b:'زفير عند القمة.'}},
 {n:'Single-Leg Glute Bridge',p:'glutes',eq:['bodyweight'],sec:['hamstrings'],g:{s:'Lying, knees bent, one foot lifted.',e:'Drive the hips up on one leg, squeeze, lower.',c:'Keep the hips square — no twisting.',b:'Exhale at the top.'},ar:{name:'جسر ألوية بساق واحدة',s:'مستلقٍ بركبتين مثنيتين وقدم واحدة مرفوعة.',e:'ادفع الوركين للأعلى بساق واحدة، اضغط، وانزل.',c:'أبقِ الوركين مستويين — بدون التواء.',b:'زفير عند القمة.'}},
 {n:'Glute Kickback',p:'glutes',eq:['cable'],sec:['hamstrings'],g:{s:'Ankle strap on a low cable, facing the machine.',e:'Kick the leg straight back against the cable, squeeze, return.',c:'Keep the torso still — extend from the hip.',b:'Exhale on the kick.'},ar:{name:'ركلة خلفية للألوية',s:'شريط حول الكاحل على كابل منخفض، مواجهاً للجهاز.',e:'اركل الساق للخلف ضد الكابل، اضغط، وعُد.',c:'أبقِ الجذع ثابتاً — التمديد من الورك.',b:'زفير عند الركلة.'}},
 {n:'Frog Pump',p:'glutes',eq:['bodyweight'],sec:[],g:{s:'Lying, soles of the feet together, knees out.',e:'Drive the hips up, squeeze the glutes, lower slightly.',c:'Small range of motion — constant tension.',b:'Exhale at the top.'},ar:{name:'ضغط الضفدع',s:'مستلقٍ، باطنا القدمين متلاصقان وركبتان للخارج.',e:'ادفع الوركين للأعلى، اضغط الألوية، وانزل قليلاً.',c:'مدى حركة قصير — شد مستمر.',b:'زفير عند القمة.'}},
 {n:'Kettlebell Swing',p:'glutes',eq:['kettlebell'],sec:['back','hamstrings'],g:{s:'Kettlebell between the feet, hinge at the hips.',e:'Hike the bell back, then snap the hips forward to chest height.',c:'The hips drive — the arms just guide.',b:'Exhale sharply on the snap.'},ar:{name:'تأرجح كيتلبل',s:'كيتلبل بين القدمين، انحناء من الوركين.',e:'أرجح الكيتلبل للخلف ثم ادفع الوركين للأمام حتى ارتفاع الصدر.',c:'الوركان يدفعان — الذراعان يوجهان فقط.',b:'زفير حاد عند الدفع.'}},
 {n:'Sumo Squat',p:'glutes',eq:['bodyweight'],sec:['quads','hamstrings'],g:{s:'Feet wide, toes out, hands clasped at the chest.',e:'Squat down between the legs, knees tracking the toes.',c:'A wide-stance squat biased to the inner thighs and glutes.',b:'Inhale down, exhale up.'},ar:{name:'قرفصاء سومو',s:'قدمان متباعدتان، أصابع للخارج، يدان مشبكتان عند الصدر.',e:'قرفصاء بين الساقين مع توجيه الركبتين للأصابع.',c:'قرفصاء بوقفة واسعة تركّز على الفخذ الداخلي والألوية.',b:'شهيق للأسفل، زفير للأعلى.'}},
