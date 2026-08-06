  // ═══════════════════════════════════════
  //  SCREEN 4: DASHBOARD
  // ═══════════════════════════════════════

  function renderWeekRow(){
    var row=document.getElementById('weekRow');if(!row)return;
    var logs=ls(K.LG,{});
    var labels=(window.__lang==='ar')?['أح','إث','ثل','أر','خم','جم','سب']:['Su','Mo','Tu','We','Th','Fr','Sa'];
    var chips='',now=new Date();
    for(var i=6;i>=0;i--){
      var d=new Date(now.getTime()-i*86400000);
      var ds=d.toISOString().split('T')[0];
      var done=dayHasSets(logs[ds]);
      chips+='<div class="week-chip'+(done?' done':'')+(i===0?' today':'')+'" title="'+ds+'">'+labels[d.getDay()]+'</div>';
    }
    var streak=weekStreak(logs);
    row.innerHTML='<span class="wr-lbl">'+_('week_row')+'</span><div class="week-chips">'+chips+'</div>'+(streak>0?'<span class="streak-chip">🔥 '+streak+' '+_('streak')+'</span>':'');
  }
  function dayHasSets(dl){
    if(!dl)return false;
    for(var k in dl){var s=dl[k].sets;if(s&&s.length)for(var j=0;j<s.length;j++){if(s[j]&&(parseFloat(s[j].w)>0||parseInt(s[j].r)>0||parseFloat(s[j].rpe)>0))return true;}}
    return false;
  }
  function weekStreak(logs){
    var streak=0,now=new Date();
    for(var w=0;w<52;w++){
      var wkStart=new Date(now.getTime()-(w*7+6)*86400000);
      var count=0;
      for(var i=0;i<7;i++){
        var d=new Date(wkStart.getTime()+i*86400000);
        if(dayHasSets(logs[d.toISOString().split('T')[0]]))count++;
      }
      if(count>=3)streak++;else break;
    }
    return streak;
  }
