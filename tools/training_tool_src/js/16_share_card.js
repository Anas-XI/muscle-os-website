 setTimeout(function(){renderExSelection(split);},0);
 }
 function renderExSelection(split){
 var pf=painFlags();
 var hist=ls(K.LH,{});
 var html='';
 // Rehab warning banner
 var rehabInfo=rehabSummary(pf);
 if(rehabInfo)html+='<div class="rehab-card rehab-'+(rehabInfo.hasRed?'red':'yellow')+'" style="margin-bottom:8px;font-size:.6rem">'+
 '<div class="rc-header"> '+_('rehab_inj_safe')+'</div>'+
 '<div style="color:rgba(250,250,248,.5);line-height:1.2">'+rehabInfo.areas.map(function(a){return a.icon+' '+a.name+' ('+a.severity+')'}).join(', ')+
 '. '+_('rehab_ex_green')+' <span class="rel-safe">green</span> '+_('rehab_ex_risk')+
 ' <a href="https://wa.me/201040796017" target="_blank" style="color:#F4C93B">'+_('rehab_book_short')+'</a></div></div>';
 split.days.forEach(function(day,di){
 if(day.restDay){html+='<div class="ex-sel-day" style="opacity:.45"><div class="esd-title">'+_('day_prefix')+' '+(di+1)+': '+day.n+' — '+_('rest_day')+'</div></div>';return;}
 html+='<div class="ex-sel-day"><div class="esd-title">'+_('day_prefix')+' '+(di+1)+': '+day.n+'</div><div class="esd-est"><span id="estChip_'+di+'" class="est-chip"></span></div><div id="estWarn_'+di+'" class="est-warn" style="display:none"></div>';
 // Group slots by muscle group (preserve first-seen order)
 var musGroups=[],musIdx={};
 day.ex.forEach(function(ex){
 if(musIdx[ex.p]===undefined){musIdx[ex.p]=musGroups.length;musGroups.push({p:ex.p,slots:[]});}
 musGroups[musIdx[ex.p]].slots.push(ex);
 });
 musGroups.forEach(function(g){
 html+='<div class="ex-sel-muscle"><span class="esm-name">'+(MUSCLE_NAME[g.p]||g.p)+(g.slots.length>1?'<span class="esm-count">· '+g.slots.length+'</span>':'')+'</span>'+muscleHighlightHtml(g.p)+'</div>';
 html+='<div class="esm-search"><input type="text" class="esm-search-input" data-muscle="'+g.p+'" data-day="'+di+'" data-slotkey="'+g.slots[0].n+'" placeholder="'+_('search_ex')+'" aria-label="'+_('search_ex')+'"><div class="esm-search-res"></div></div>';
 g.slots.forEach(function(ex){
 var pf0=pf;
 var safety=isExerciseSafeForInjuries(ex.n,pf0);
 var exClass=pf0&&pf0[ex.n]==='red'?'rehab-ex-blocked':(!safety.ok?'rehab-ex-blocked':(safety.reason&&safety.reason.indexOf('🟡')>=0?'rehab-ex-safe':''));
 html+='<div class="ex-sel-row '+exClass+'" data-muscle="'+ex.p+'" data-day="'+di+'">'+
 '<span class="esr-lbl">'+exLinkHtml(ex.n)+'</span>'+
 rowBadgesHtml(ex.n)+
 lastPerfHtml(ex.n,hist)+
 '<button class="ex-guide-toggle" type="button" data-slot="'+esc(ex.n)+'" title="'+_('how_to')+'">'+_('how_to')+' ▾</button>'+
 slotChipsHtml(ex.n,ex.p,day);
 if(!safety.ok)html+='<span style="font-size:.45rem;color:#f44336;margin-left:4px">⛔ '+safety.reason+'</span>';
 else if(safety.reason)html+='<span style="font-size:.45rem;color:#FF9800;margin-left:4px">'+safety.reason+'</span>';
 html+='<div class="ex-guide" data-slot="'+esc(ex.n)+'"></div>';
 html+='</div>';
 });
 html+='<div class="vol-live" data-muscle="'+g.p+'"></div>';
 });
 html+='</div>';
 });
 document.getElementById('exSelContent').innerHTML=html;
 syncExFilterChips();
 document.querySelectorAll('#exSelContent .vol-live').forEach(function(el){renderLiveVol(el.dataset.muscle);});
 renderDayEstimates();

 // Wire chip clicks (re-rank in place via shared binder)
 document.querySelectorAll('#exSelContent .ex-sel-chip').forEach(bindChipClick);
 // Wire how-to toggles (expand / collapse per slot)
 document.querySelectorAll('#exSelContent .ex-guide-toggle').forEach(function(btn){
 btn.addEventListener('click',function(){
 var row=this.closest('.ex-sel-row');
 var g=row.querySelector('.ex-guide');
 if(!g)return;
 var open=g.style.display==='block';
 if(!open){
 var sel=row.querySelector('.ex-sel-chip.selected');
 var name=sel?sel.dataset.exval:this.dataset.slot;
 g.innerHTML=guideHtml(name);
 }
 g.style.display=open?'none':'block';
 this.textContent=(open?'':'▴ ')+_('how_to')+(open?' ▾':'');
 });
 });
 // Empty-state action buttons (loosen the most restrictive filter)
 document.querySelectorAll('#exSelContent .ex-empty-btn').forEach(function(b){
 b.addEventListener('click',function(){
 var act=this.dataset.act;
 if(act==='cleareq'){var vi=ls(K.VI,{});vi.eq=null;ss(K.VI,vi);}
