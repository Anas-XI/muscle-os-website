 '<div class="sr-chips">';
 for(var i=1;i<=10;i++)html+='<button class="sr-chip" data-m="'+m+'" data-v="'+i+'" data-di="'+di+'">'+i+'</button>';
 html+='</div><div class="sr-scale"><span>'+_('sr_chip_ready')+'</span><span>'+_('sr_chip_sore')+'</span></div></div>';
 }
 });
 var fo=ls(K.FO,{}),wk=weekStartISO();
 sched.forEach(function(pm){
 var m=pm.m,name=MUSCLE_NAME[m]||m;
 var dropped=fo[wk]&&fo[wk][m]!==undefined&&fo[wk][m]!==pm.freq;
 if(softGateActive(m)&&(!fo[wk]||fo[wk][m]===undefined)){
 html+='<div class="fat-light-banner"><span class="flb-title">'+_('sr_gate_title').replace('{M}',name)+'</span>'+
 '<span class="flb-desc">'+_('sr_gate_body').replace('{M}',name)+'</span>'+
 '<div class="flb-btns"><button class="fat-light-btn" data-gm="'+m+'" data-gfreq="'+pm.freq+'" data-di="'+di+'">'+_('sr_gate_keep').replace('{F}',pm.freq)+'</button>'+
 '<button class="fat-light-btn" data-gm="'+m+'" data-gfreq="2" data-di="'+di+'">'+_('sr_gate_drop')+'</button></div></div>';
 }else if(dropped){
 html+='<div class="sr-done">'+_('sr_gate_dropped').replace('{M}',name).replace('{F}',pm.freq)+'</div>';
 }
 });
 return html;
 }

 // ── Split recommendation (priority-aware) + structural conflict ──
 function cycleLengthOf(split){
 if(!split||!split.days)return 7;
 return split.days.length||7;
 }
 function muscleFrequencyInSplit(split,m){
 if(!split||!split.days)return 0;
 var n=0;
 split.days.forEach(function(day){
 if(day.restDay)return;
 if(day.ex&&day.ex.some(function(ex){return ex.p===m||(ex.se||[]).indexOf(m)>=0;}))n++;
 else if(day.muscleGroups&&day.muscleGroups.indexOf(m)>=0)n++;
 });
 return n;
 }
 function freq7Of(split,m){
 var cyc=cycleLengthOf(split);
 return muscleFrequencyInSplit(split,m)/cyc*7;
 }
 function prioritySatisfaction(split,pr){
 var out={score:0,list:[]};
 (pr.muscles||[]).forEach(function(pm){
 var f=muscleFrequencyInSplit(split,pm.m),f7=Math.round(freq7Of(split,pm.m)*10)/10,ok=f7>=pm.freq;
 out.list.push({m:pm.m,f:f,f7:f7,need:pm.freq,ok:ok});
 if(ok)out.score++;
 });
 return out;
 }
 function recommendSplit(){
 var vi=ls(K.VI,{}),d=parseInt(vi.days||4,10),g=vi.goal||'hypertrophy';
 var a={days:d,goal:g,recovery:vi.rec||'moderate',exp:vi.ta||'intermediate',sched:'somewhat'};
 var base=determineSplit(a);
 var pr=getPriority();
 if(!pr.muscles.length)return{key:base.key,name:base.name,why:base.note||'',satisfies:null,base:true};
 var best=null,bestScore=-1;
 Object.keys(SPLITS).forEach(function(k){
 var s=SPLITS[k];
 if(s.d!==d)return;
 if(g!=='strength'&&s.g==='strength')return;
 var sat=prioritySatisfaction(s,pr);
 if(sat.score>bestScore){bestScore=sat.score;best={key:k,name:s.name,sat:sat};}
 });
 var prioDesc=pr.muscles.map(function(pm){return(MUSCLE_NAME[pm.m]||pm.m)+' '+pm.freq+'x';}).join(', ');
 if(best&&bestScore===pr.muscles.length&&best.key!==base.key){
 return{key:best.key,name:best.name,why:_('split_rec_priority')+': '+prioDesc,satisfies:best.sat,base:false};
 }
 return{key:base.key,name:base.name,why:base.note+' · '+_('split_rec_priority')+': '+prioDesc,satisfies:best?best.sat:null,base:true};
 }
 function renderSplitConflict(k){
 var box=document.getElementById('splitConflict');
 var pr=getPriority();
 if(!pr.muscles.length){box.style.display='none';box.innerHTML='';return;}
 var split=SPLITS[k],sat=prioritySatisfaction(split,pr);
 var bad=sat.list.filter(function(x){return !x.ok;});
 if(!bad.length){
 box.style.display='block';box.className='conflict-box ok';
 box.innerHTML=' '+sat.list.map(function(x){return(MUSCLE_NAME[x.m]||x.m)+' '+x.f7+'x/w ('+_('split_conflict_ok')+' '+x.need+'x)';}).join(' · ');
 return;
 }
 box.style.display='block';box.className='conflict-box warn';
 box.innerHTML='<span class="cb-title"> '+_('split_conflict_head')+'</span>'+
 bad.map(function(x){return(MUSCLE_NAME[x.m]||x.m)+': '+_('split_conflict_body').replace('{F}',x.f7).replace('{N}',x.need);}).join('<br>')+
 '<br><span class="cb-fix">'+_('split_conflict_fix')+'</span>';
 }

 // ── Volume distribution engine ──
 var SBD_FAMILY={
 'Bench Press':[['triceps',45],['shoulders',25]],
 'Barbell Squat':[['glutes',30],['hamstrings',20]],
 'Front Squat':[['glutes',25],['abs',20]],
 'Deadlift Variation':[['glutes',40],['back',25],['traps',15]],
 'Trap Bar Deadlift':[['glutes',35],['back',20]],
 'Sumo Deadlift':[['glutes',35],['back',20]]
 };
 function prHistoryOf(exName){
 var h=(loadHist()[exName]||[]).slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
 var prs=[],max=0;
 h.forEach(function(e){if(e.e1RM>max){max=e.e1RM;prs.push(e.date);}});
 return prs;
 }
 function hasPrInLastDays(exName,days){
 var cut=new Date(Date.now()-days*864e5).toISOString().split('T')[0];
 return prHistoryOf(exName).some(function(d){return d>=cut;});
 }
 function distributeVolume(muscleTarget,selectedExercises,opts){
 opts=opts||{};
 var list=selectedExercises.slice();
 if(!list.length)return{alloc:{},total:0,fragmentation:[],indirect:{},directOnly:!opts.prCredit};
 var weights=list.map(function(name){
 var t=meta(name).t,w=t==='compound'?1.35:0.85;
 if(opts.prCredit&&SBD_FAMILY[name]&&hasPrInLastDays(name,14))w*=1.15;
 return w;
 });
 var sw=weights.reduce(function(a,b){return a+b;},0);
 var raw=list.map(function(name,i){return muscleTarget*weights[i]/sw;});
 var alloc={};
 raw.forEach(function(v,i){alloc[list[i]]=v<1?1:Math.floor(v);});
 var total=0;Object.keys(alloc).forEach(function(n){total+=alloc[n];});
 var diff=muscleTarget-total;
 if(diff>0){
 var rem=list.map(function(name,i){return{name:name,r:raw[i]-alloc[name]};}).sort(function(a,b){return b.r-a.r;});
 for(var k=0;k<diff&&k<rem.length;k++)alloc[rem[k].name]++;
 }else if(diff<0){
 var order=list.slice().sort(function(a,b){return alloc[b]-alloc[a];});
 for(var k2=0;k2<-diff&&k2<order.length;k2++){if(alloc[order[k2]]>1)alloc[order[k2]]--;}
 }
 total=0;Object.keys(alloc).forEach(function(n){total+=alloc[n];});
 var fragmentation=list.filter(function(n){return alloc[n]<2;});
 var indirect={};
 if(opts.prCredit){
 list.forEach(function(name){
 if(!SBD_FAMILY[name]||!hasPrInLastDays(name,14))return;
 SBD_FAMILY[name].forEach(function(sec){
 var sm=sec[0],pp=sec[1];
 if(!indirect[sm])indirect[sm]={sets:0,from:[]};
 var cr=Math.round(alloc[name]*pp/100*10)/10;
 indirect[sm].sets+=cr;
 indirect[sm].from.push({ex:name,sets:cr});
 });
 });
 }
 return{alloc:alloc,total:total,fragmentation:fragmentation,indirect:indirect,directOnly:!opts.prCredit};
 }
 function computeSelection(){
 var sel={};
 document.querySelectorAll('#exSelContent .ex-sel-row').forEach(function(row){
 var chip=row.querySelector('.ex-sel-chip.selected');
 if(!chip)return;
 var m=row.dataset.muscle;
 if(!sel[m])sel[m]=[];
 if(sel[m].indexOf(chip.dataset.exval)<0)sel[m].push(chip.dataset.exval);
 });
 return sel;
 }
 function computeAllocation(prCredit){
 var targets=ls(K.VT,{}),sel=computeSelection(),out={};
 Object.keys(sel).forEach(function(m){
 var t=targets[m]&&targets[m].rec||8;
 out[m]=distributeVolume(t,sel[m],{prCredit:prCredit});
 });
 return out;
 }
 function renderLiveVol(muscle){
