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

