 // Replacements must hit the same muscle region (e.g. lats not the full
 // back) — the slot's exercise defines which region. Fall back to the
 // full muscle pool when the region has fewer than 2 exercises.
 var rk=regionOf(muscle,en);
 var regionPool=pool.filter(function(n){return regionOf(muscle,n)===rk;});
 if(regionPool.length>=2)pool=regionPool;
 var list=pool.filter(exFilterMatches);
 var saved=ls('mos_ex_choices',{});
 var top=prefTop(en);
 var chosen=saved[en]||pendingExChoices[en]||top||en;
 // When a filter is active, the default/chosen exercise must match it too —
 // otherwise the hard filter is meaningless. With no filters, keep the
 // current selection visible even if it is not in the pool (custom ex).
 var filterActive=exFiltersActive();
 if(!filterActive){
 if(list.indexOf(en)<0)list.unshift(en);
 if(list.indexOf(chosen)<0)list.unshift(chosen);
 }
 var ranked=rankExercises(list,buildRankCtx(day,{n:en}));
 if(!ranked.length){
 var listF=pool.filter(exFilterMatches);
 var eqKilled=listF.length>0;
 var act=eqKilled?'cleareq':'clearfilters';
 return '<div class="ex-empty"><div class="ex-empty-msg">'+(eqKilled?_('empty_eq'):_('empty_filters'))+'</div>'+
 '<button class="ex-empty-btn" type="button" data-act="'+act+'">'+(eqKilled?_('empty_btn_eq'):_('empty_btn_filters'))+'</button></div>';
 }
 var chosenRanked=ranked.filter(function(r){return r.name===chosen;});
 var rest=ranked.filter(function(r){return r.name!==chosen;});
 ranked=chosenRanked.concat(rest);
 var recIdx={},whyBy={};ranked.forEach(function(r,i){recIdx[r.name]=i;whyBy[r.name]=r.why;});
 var buckets={},regOrder=[];
 ranked.forEach(function(r){
 var rk=regionOf(muscle,r.name);
 if(!buckets[rk]){buckets[rk]=[];regOrder.push(rk);}
 buckets[rk].push(r.name);
 });
 var html='<div class="ex-regions">';
 regOrder.forEach(function(rk){
 html+='<div class="ex-region"><span class="ex-region-lbl">'+_(rk)+'</span>';
 buckets[rk].forEach(function(name){
 var s=isExerciseSafeForInjuries(name,pf);
 var isTop=name===top&&top;
 var ri=recIdx[name];
 var blocked=!s.ok||(pf&&pf[name]==='red');
 var safeWarn=s.reason&&s.reason.indexOf('🟡')>=0;
 var chipCls='ex-sel-chip'+(chosen===name?' selected':'')+(blocked?' rehab-ex-blocked':'')+(safeWarn?' rehab-ex-safe':'')+(isTop?' pref-top':'')+(ri>=0&&ri<3?' chip-rec':'');
 var eq=equipTag(name);
 html+='<button class="'+chipCls+'" data-ename="'+esc(en)+'" data-exval="'+esc(name)+'" title="'+esc(name)+'">'
 +(blocked?'⛔ ':(safeWarn?' ':''))
 +(isTop?'<span class="pref-star">★ </span>':'')
 +(ri===0?'<span class="rec-badge">✦ '+_('rec_badge')+'</span>':(ri===1||ri===2?'<span class="rec-badge">✦</span>':''))
 +(EX_TR[name]?exDisplay(name):esc(name))
 +(ri>=0&&ri<3&&whyBy[name]&&whyBy[name]!=='balanced'?'<span class="why-chip">'+_('why_'+whyBy[name])+'</span>':'')
 +(eq?'<span class="equip-tag">'+eq+'</span>':'')+'</button>';
 });
 html+='</div>';
 });
 html+='</div>';
 return html;
 }
 function applyChipSelection(chip,row){
 var en=chip.dataset.ename,val=chip.dataset.exval;
 var pref=ls('mos_pref',{});
 if(!pref[en])pref[en]={};
 pref[en][val]=(pref[en][val]||0)+1;
 ss('mos_pref',pref);
 pendingExChoices[en]=val;
 var day=SPLITS[splitKey]&&SPLITS[splitKey].days[parseInt(row.dataset.day,10)]||null;
 var regions=row.querySelector('.ex-regions');
 if(regions)regions.outerHTML=slotChipsHtml(en,row.dataset.muscle,day);
 row.querySelectorAll('.ex-sel-chip').forEach(bindChipClick);
 var g=row.querySelector('.ex-guide');
 if(g&&g.style.display!=='none')g.innerHTML=guideHtml(val);
 renderLiveVol(row.dataset.muscle);
 renderDayEstimate(parseInt(row.dataset.day,10));
 }
 function bindChipClick(chip){
 chip.addEventListener('click',function(){
 applyChipSelection(chip,this.closest('.ex-sel-row'));
 });
 }

 function showExSelection(k){
 var split=SPLITS[k];if(!split)return;
 document.getElementById('splitGrid').style.display='none';
 document.getElementById('splitBtnGroup').style.display='none';
 var panel=document.getElementById('exSelPanel');
 panel.classList.add('show');
 panel.classList.toggle('ex-compact',ls('mos_card_density','rich')==='compact');
 // Skeleton first, real render on next frame (load/filter/rank work is sync)
 var skel='';
 split.days.forEach(function(day){
 if(day.restDay)return;
 skel+='<div class="ex-skel-day">'+day.ex.map(function(){
 return '<div class="ex-skel-row"><div class="ex-skel-lbl"></div><div class="ex-skel-chips"></div></div>';
 }).join('')+'</div>';
 });
 document.getElementById('exSelContent').innerHTML=skel;
