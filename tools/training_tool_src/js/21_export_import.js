  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  EXPORT / IMPORT / RESET
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  document.getElementById('exportBtn').addEventListener('click',function(){
    var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
    var data={};allKeys.forEach(function(k){var v=localStorage.getItem(k);if(v)data[k]=JSON.parse(v);});
    var b=new Blob([JSON.stringify({exported:new Date().toISOString(),ver:4,data:data},null,2)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='muscle_os_data_'+new Date().toISOString().split('T')[0]+'.json';a.click();
  });
  document.getElementById('importBtn').addEventListener('click',function(){document.getElementById('importFile').click()});
  document.getElementById('importFile').addEventListener('change',function(){
    if(!this.files||!this.files[0])return;
    var r=new FileReader();r.onload=function(e){try{var p=JSON.parse(e.target.result),d=p.data||p;if(!d||typeof d!=='object')throw Error('Invalid');var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);var ok=false;allKeys.forEach(function(k){if(d[k]!==undefined){localStorage.setItem(k,JSON.stringify(d[k]));ok=true;}});      if(!ok)throw Error('No recognized data');alert(_('alert_imported'));location.reload();}catch(err){alert('Import failed: '+err.message);}};r.readAsText(this.files[0]);this.value='';
  });
  document.getElementById('resetBtn').addEventListener('click',function(){
    if(!confirm(_('confirm_reset_all')))return;
    var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref','mos_card_density']);
    allKeys.forEach(function(k){localStorage.removeItem(k)});
    go(1);renderPriorities();
  });


