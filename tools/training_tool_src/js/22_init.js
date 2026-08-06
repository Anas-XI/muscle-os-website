  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════

  (function init(){
    var prog=ls(K.PG,null),sp=ls(K.SP,null),vt=ls(K.VT,null);
    var vi=ls(K.VI,{});
    // Pre-fill name/age if profile exists
    if(vi.name){var nEl=document.getElementById('userName');if(nEl)nEl.value=vi.name;}
    if(vi.age){var aEl=document.getElementById('userAge');if(aEl)aEl.value=vi.age;}
    if(vi.ta){var tEl=document.getElementById('ta');if(tEl)tEl.value=vi.ta;}
    if(vi.goal){var gEl=document.getElementById('goal');if(gEl)gEl.value=vi.goal;}
    if(vi.days){var dEl=document.getElementById('dow');if(dEl)dEl.value=vi.days;}
    if(vi.rec){var rEl=document.getElementById('recFactor');if(rEl)rEl.value=vi.rec;}
    // Profile greeting
    if(vi.name&&ls('mos_profile_saved',null)){
      var greeting=document.getElementById('profileGreeting');
      if(greeting){greeting.style.display='block';greeting.textContent=_('profile_greeting')+', '+vi.name+(vi.age?' ('+vi.age+')':'');}
    }
    if(prog&&sp){
      var banner=document.getElementById('savedDataBanner');
      banner.style.display='block';
      banner.innerHTML='<div class="rb-title">'+_('saved_session')+'</div><strong>'+prog.splitName+'</strong> · '+prog.totalSets+' '+_('weekly_sets')+
        '<button class="btn-secondary" id="resumeBtn" style="display:inline-block;margin-left:8px;padding:4px 10px;font-size:.55rem">'+_('resume')+'</button>'+
        '<button class="btn-secondary" id="newBtn" style="display:inline-block;margin-left:4px;padding:4px 10px;font-size:.55rem">'+_('start_fresh')+'</button>';
      document.getElementById('resumeBtn').addEventListener('click',function(){go(4);renderDashboard();});
      document.getElementById('newBtn').addEventListener('click',function(){Object.values(K).forEach(function(k){localStorage.removeItem(k)});location.reload();});
    }
    console.log('Unified Training Tool loaded');
    translateUI();
    initTheme();
    initInstall();
    initSync();
    updateNotifToggle();
    checkNotif();
  })();

