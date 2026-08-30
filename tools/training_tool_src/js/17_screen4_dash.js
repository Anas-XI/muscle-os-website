 else{exFilters.diff=[];exFilters.type=[];exFilters.pattern=[];}
 syncExFilterChips();
 refreshExSelection();
 });
 });
 // Per-muscle-group search (fast-path; selects via the same path as chips)
 document.querySelectorAll('#exSelContent .esm-search-input').forEach(function(inp){
 inp.addEventListener('input',function(){
 var q=this.value,res=this.parentNode.querySelector('.esm-search-res');
 var m=this.dataset.muscle,di=parseInt(this.dataset.day,10);
 var day=SPLITS[splitKey]&&SPLITS[splitKey].days[di]||null;
 var norm=normalizeSearch(q);
 if(norm.length<2){res.style.display='none';res.innerHTML='';return;}
 var pool=(EXERCISE_POOLS[m]||[]).filter(exFilterMatches);
 var ctx=buildRankCtx(day,{n:null});
 var userEq=ctx.userEq;
 var hits=[];
 pool.forEach(function(n){
 var eq=equipmentOf(n);
 if(!(!userEq||userEq.length===0||eq.length===0||eq.some(function(e){return userEq.indexOf(e)>=0;})))return;
 var dn=normalizeSearch(exDisplay(n)||n);
 var qq=searchQuality(dn,norm);
 if(qq>0)hits.push({n:n,qq:qq,rk:rankScoreOf(n,ctx)});
 });
 hits.sort(function(a,b){if(b.qq!==a.qq)return b.qq-a.qq;return b.rk-a.rk;});
 if(!hits.length){res.innerHTML='<div class="esm-res-none">'+_('search_none')+'</div>';res.style.display='block';return;}
 res.innerHTML=hits.slice(0,8).map(function(h){
 return '<button class="ex-sel-chip search-hit" data-ename="'+inp.dataset.slotkey+'" data-exval="'+h.n+'">'+(EX_TR[h.n]?exDisplay(h.n):h.n)+'</button>';
 }).join('');
 res.style.display='block';
 res.querySelectorAll('.search-hit').forEach(function(chip){
 chip.addEventListener('click',function(){
 var row=document.querySelector('#exSelContent .ex-sel-row[data-day="'+di+'"][data-muscle="'+m+'"]');
 if(!row)return;
 applyChipSelection(chip,row);
 inp.value='';res.style.display='none';res.innerHTML='';
