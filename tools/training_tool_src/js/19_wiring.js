 sets[si].wu=true;
 if(s.w)sets[si].w=s.w;
 if(s.r)sets[si].r=s.r;
 if(s.rpe)sets[si].rpe=s.rpe;
 }else{
 sets[si]=s;
 }
 });
 }else{
 var padEmpty=(makeupDays[di]||lightDays[di])?Math.max(1,(ex.sets||3)-1):3;
 for(var i2=0;i2<padEmpty;i2++)sets.push({w:'',r:'',rpe:''});
 }
 var h='<div class="set-log-area"><div class="set-log-header"><span style="line-height:1.25;white-space:normal;font-size:.42rem;letter-spacing:.2px">'+_('sets_work')+'</span><span>'+_('load')+'</span><span>'+_('reps')+'</span><span>'+_('rpe')+'</span><span></span></div><div class="set-rows-'+('c_'+di+'_'+ex.n).replace(/[^a-zA-Z0-9]/g,'_')+'">';
 sets.forEach(function(set,si){
 var isWu=!!set.wu;
 var wVal = set.w||'';
 var wClick = wVal ? 'onclick="showPlateCalculator('+parseFloat(wVal)+',event)" style="cursor:pointer"' : '';
 var wuAttr=isWu?' data-wu="1"':'';
 var rowCls=isWu?' set-row wu-row':'set-row';
 var lbl=prefix+(isWu?' '+_('warmup_row')+' '+(si+1):(si+1));
 if(!isWu&&wuCount>0&&si===wuCount)h+='<div class="wu-divider">'+_('warmup_lbl')+'</div>';
 h+='<div class="'+rowCls+'" data-ex="'+ex.n+'" data-set="'+si+'"'+(isWu?' data-wu="1"':'')+'><span class="set-lbl">'+lbl+'</span>'+
 '<input type="number" step="0.5" placeholder="'+_('weight')+'" value="'+wVal+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="w"'+wuAttr+' '+wClick+'>'+
 '<input type="number" step="1" placeholder="'+_('reps')+'" value="'+(set.r||'')+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="r"'+wuAttr+'>'+
 '<input type="number" step="0.5" placeholder="'+_('rpe')+'" value="'+(set.rpe||'')+'" data-ex="'+ex.n+'" data-set="'+si+'" data-f="rpe"'+wuAttr+'>'+
 '<button class="del-set-btn" data-ex="'+ex.n+'" data-set="'+si+'">✕</button></div>';
 });
 h+='</div><button class="add-set-btn" data-ex="'+ex.n+'">+ '+_('set')+'</button></div>';
 return h;
 }
 function buildNormalExCard(ex,ei,di,day){
 var c=exCtx(ex,ei,di,day);
 var today=new Date().toISOString().split('T')[0];
 var html='<div class="'+c.cc+'" id="'+c.sid+'">'+
 '<div class="ex-title">'+c.titleInnerHtml+
 (ex.optional?'<span class="opt-badge">'+_('sess_optional')+'</span>':'')+
 '<button class="sw-ex-btn" data-ex="'+ex.n+'" title="'+_('swap_title')+'"> '+_('swap_btn')+'</button></div>'+
 c.metaHtml+c.prNoteHtml+c.safetyHtml+c.suggestHtml+
 restTimerHTML(ex,c.restSec,c.restLabel)+
 c.painHtml+c.swapHtml+
 setLoggerHTML(ex,di,day.n,today,ls(K.LG,{}),c.sugg,'')+
 '</div>';
 return html;
 }
 function buildSupersetExCard(exA,exB,eiA,eiB,di,day){
 var cA=exCtx(exA,eiA,di,day),cB=exCtx(exB,eiB,di,day);
 var today=new Date().toISOString().split('T')[0],logs=ls(K.LG,{});
 var safetyRow=(cA.safetyHtml||cB.safetyHtml)?'<div class="ss-safety">'+cA.safetyHtml+cB.safetyHtml+'</div>':'';
 return '<div class="ex-card superset-card">'+
 '<div class="ss-title-row">'+
 '<div class="ss-title a"><span class="ss-badge">'+_('superset_a')+'</span>'+cA.titleInnerHtml+'</div>'+
 '<div class="ss-title b"><span class="ss-badge">'+_('superset_b')+'</span>'+cB.titleInnerHtml+'</div>'+
 '</div>'+
 '<div class="ss-meta-row"><div>'+cA.metaHtml+'</div><div>'+cB.metaHtml+'</div></div>'+
 safetyRow+
 '<div class="ss-suggest"><div class="ss-col">'+cA.suggestHtml+'</div><div class="ss-col">'+cB.suggestHtml+'</div></div>'+
 '<div class="rest-timer ss-rest" data-ex="'+exA.n+'" data-seconds="90">'+_('rest_timer_label')+' · <span class="rt-recommend">90s</span> — '+
 '<span class="rt-display" id="rtd_'+exA.n.replace(/[^a-zA-Z0-9]/g,'_')+'">'+formatTime(90)+'</span>'+
 '<button class="rt-start" data-ex="'+exA.n+'">'+_('timer_start')+'</button>'+
 '<button class="rt-stop" data-ex="'+exA.n+'" style="display:none">'+_('timer_stop')+'</button>'+
 '<button class="rt-reset" data-ex="'+exA.n+'">'+_('timer_reset')+'</button></div>'+
 '<div class="ss-cols">'+
 '<div class="ss-col a">'+setLoggerHTML(exA,di,day.n,today,logs,cA.sugg,'A')+'</div>'+
 '<div class="ss-col b">'+setLoggerHTML(exB,di,day.n,today,logs,cB.sugg,'B')+'</div>'+
 '</div>'+
 '</div>';
 }

 // ── Antagonist superset pairing (opposite muscle groups) ──
 var SS_ANTAGONIST={
 chest:'back',back:'chest',
 biceps:'triceps',triceps:'biceps',
 quads:'hamstrings',hamstrings:'quads',
 glutes:'hamstrings'
 };
 var SS_POOL_ORDER=['chest','back','shoulders','quads','hamstrings','glutes','biceps','triceps','calves','traps','forearms','abs'];
 function poolOf(ex){
 for(var i=0;i<SS_POOL_ORDER.length;i++){
 if(EXERCISE_POOLS[SS_POOL_ORDER[i]].indexOf(ex.n)>=0)return SS_POOL_ORDER[i];
 }
 var ce=ls(K.CE,[]);
 for(var j=0;j<ce.length;j++){if(ce[j].name===ex.n&&ce[j].f&&EXERCISE_POOLS[ce[j].f])return ce[j].f;}
 var p=ex.p||ex.f;
 if(p&&EXERCISE_POOLS[p])return p;
 return null;
 }
 function shoulderKind(ex){
 return /rear|face pull|reverse pec|bent-over|wide row/i.test(ex)?'rear':'frontmid';
 }
 function ssCanPair(a,b){
 var pa=poolOf(a),pb=poolOf(b);
 if(!pa||!pb)return false;
 if(pa==='shoulders'&&pb==='shoulders')return shoulderKind(a.n)!==shoulderKind(b.n);
 return SS_ANTAGONIST[pa]===pb;
 }
 function buildAntagonistPairs(exs){
 var used=[],i;
 for(i=0;i<exs.length;i++)used.push(false);
 var pairs=[];
 for(i=0;i<exs.length;i++){
 if(used[i])continue;
 var j2=-1;
 for(var j=i+1;j<exs.length;j++){
 if(!used[j]&&ssCanPair(exs[i],exs[j])){j2=j;break;}
 }
 if(j2>=0){pairs.push([{e:exs[i],i:i},{e:exs[j2],i:j2}]);used[i]=used[j2]=true;}
 }
 var rest=[];
 for(var k=0;k<exs.length;k++)if(!used[k])rest.push({e:exs[k],i:k});
 var r=0;
 while(r<rest.length){
 var a=rest[r++],b=rest[r++];
 if(b&&poolOf(a.e)&&poolOf(a.e)===poolOf(b.e))pairs.push([a,b]);
 else if(b){pairs.push([a]);pairs.push([b]);}
 else pairs.push([a]);
 }
 return pairs;
 }
 window.__ssBuildPairs=buildAntagonistPairs;
 window.__ssPoolOf=poolOf;

 function renderDay(di){
 var prog=ls(K.PG,null);if(!prog||!prog.days[di])return;
 var day=prog.days[di],goal=(ls(K.VI,{})).goal||'hypertrophy',age=(ls(K.VI,{})).ta||'intermediate';
 var logs=ls(K.LG,{}),hist=loadHist(),pf=painFlags(),today=new Date().toISOString().split('T')[0];
 var fCheck=getTodayFatigue(),fs=fCheck?fatigueScore(fCheck):null;
 var fatigueAdj=fs?fs.adjust:0;
 var peri=ls('mos_periodization',null),wkCount=ls('mos_week_count',1);
 var container=document.getElementById('exCards'),html='';

 if(day.restDay){
 container.innerHTML='<div class="rest-card"><div class="rc-title">'+_('rest_day')+'</div><div class="rc-tip">'+_('rest_day_recover')+'</div>'+
 '<div class="rc-tip">• '+_('rest_tip_1')+'</div>'+
 '<div class="rc-tip">• '+_('rest_tip_2')+'</div>'+
 '<div class="rc-tip">• '+_('rest_tip_3')+'</div>'+
 '<div class="rc-tip">• '+_('rest_tip_4')+'</div></div>';
 updateSummary(di);
 return;
 }

 // General warm-up for this day
 html+=renderGeneralWarmup(day.n);
 if(day.ssSuggested)html+='<div style="font-size:.5rem;color:#F4C93B;text-align:center;margin:2px 0 6px"> '+_('sess_suggest_ss')+'</div>';

 if(fs&&fs.adjust<=-1&&!lightDays[di]&&!lightProceed[di]){evLog('fat_gate',{di:di,score:fs.score});
 html+='<div class="fat-light-banner"><span class="flb-title">'+_('fat_light_title')+'</span>'+
 '<span class="flb-desc">'+_('fat_light_desc')+'</span>'+
 '<div class="flb-btns"><button class="fat-light-btn" data-di="'+di+'" data-light="1">'+_('fat_light_btn')+'</button>'+
 '<button class="fat-light-btn" data-di="'+di+'" data-light="0">'+_('fat_planned_btn')+'</button></div></div>';
 }

 // P2: Foster monotony soft-gate (read-time, no hard block). Suggest variation/recovery; never modifies the program.
 var ms=monotonyStrain();
 if(ms.mono>2&&!monoDismissed[di]&&!lightDays[di]){evLog('mono_gate',{di:di,mono:ms.mono,strain:ms.strain});
 html+='<div class="fat-light-banner mono-banner"><span class="flb-title">'+_('mono_title')+'</span>'+
 '<span class="flb-desc">'+_('mono_desc').replace('{m}',ms.mono.toFixed(2))+'</span>'+
 '<div class="flb-btns"><button class="mono-ack-btn" data-di="'+di+'">'+_('mono_ack')+'</button></div></div>';
 }

 html+=renderSorenessCards(day,di);

 var ssOn=!!ls(K.SU,{})[di];
 if(ssOn){
 buildAntagonistPairs(day.ex).forEach(function(pair){
 if(pair.length===2)html+=buildSupersetExCard(pair[0].e,pair[1].e,pair[0].i,pair[1].i,di,day);
 else html+=buildNormalExCard(pair[0].e,pair[0].i,di,day);
 });
 }else{
 day.ex.forEach(function(ex,ei){html+=buildNormalExCard(ex,ei,di,day);});
 }

 container.innerHTML=html;

 // Wire inputs
 container.querySelectorAll('.set-row input').forEach(function(inp){inp.addEventListener('input',function(){saveSet(di,this.dataset.ex,parseInt(this.dataset.set),this.dataset.f,this.value,this.dataset.wu);});});
 container.querySelectorAll('.del-set-btn').forEach(function(b){b.addEventListener('click',function(){delSet(di,this.dataset.ex,parseInt(this.dataset.set));});});
 container.querySelectorAll('.add-set-btn').forEach(function(b){b.addEventListener('click',function(){addSet(di,this.dataset.ex);});});
 container.querySelectorAll('.rm-ex-btn').forEach(function(b){b.addEventListener('click',function(){if(confirm('Remove "'+this.dataset.ex+'" from '+_('today_train')+'?'))rmEx(di,this.dataset.ex);});});
 container.querySelectorAll('.sw-ex-btn').forEach(function(b){b.addEventListener('click',function(){var p=b.parentElement.parentElement.querySelector('.swap-panel');if(p)p.classList.toggle('open');});});
 container.querySelectorAll('.swap-chip').forEach(function(chip){chip.addEventListener('click',function(){swapEx(parseInt(chip.dataset.di),parseInt(chip.dataset.idx),chip.dataset.ex,chip.dataset.to);});});
 container.querySelectorAll('.pain-btn').forEach(function(b){b.addEventListener('click',function(){var pf=painFlags();pf[this.dataset.ex]=this.dataset.p;ss(K.PF,pf);
 // P5: append to joint-stress-flag history (180-day window kept in saveNonLift-style prune below)
 var pfh=ls(K.PFH,[]);pfh.push({date:new Date().toISOString().split('T')[0],ex:this.dataset.ex,severity:this.dataset.p});
 var cutoff=new Date(Date.now()-180*864e5).toISOString().split('T')[0];
 ss(K.PFH,pfh.filter(function(f){return f.date>=cutoff;}));
 renderDay(di);});});
 container.querySelectorAll('.mono-ack-btn').forEach(function(b){b.addEventListener('click',function(){var i=parseInt(this.dataset.di);monoDismissed[i]=true;evLog('mono_gate_ack',{di:i});renderDay(i);});});
 container.querySelectorAll('.fat-light-btn').forEach(function(b){b.addEventListener('click',function(){if(this.dataset.gm!==undefined)return;var i=parseInt(this.dataset.di);evLog(this.dataset.light==='1'?'fat_gate_light':'fat_gate_proceed',{di:i});if(this.dataset.light==='1')lightDays[i]=true;else lightProceed[i]=true;renderDay(i);});});
