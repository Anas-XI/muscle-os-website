  // ── Data Sync ──
  var SYNC_KEY='mos_sync_key';
  var SYNC_PW='mos_sync_pw';
  var SYNC_LAST='mos_sync_last';
  var SYNC_BASE='https://muscleos-access-control.muscleos.workers.dev/api/sync';
  var API_BASE='https://muscleos-access-control.muscleos.workers.dev/api';
  function notifyCoach(type, data){
    try{
      fetch(API_BASE+'/notify-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type,data:data})})
      .catch(function(){});
    }catch(e){}
  }
  function syncPayload(){
    var allKeys=Object.values(K).concat(['mos_periodization','mos_week_count','mos_ex_choices','mos_pref']);
    var data={};allKeys.forEach(function(k){var v=localStorage.getItem(k);if(v)data[k]=JSON.parse(v);});
    return data;
  }
  function genSyncId(){
    var id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'sync-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    var inp=document.getElementById('syncKeyInput');
    if(inp)inp.value=id;
    ss(SYNC_KEY,id);
  }
  function showSync(){
    var modal=document.getElementById('syncModal');
    var inp=document.getElementById('syncKeyInput');
    if(inp&&!inp.value.trim()){
      var saved=ls(SYNC_KEY,'');
      if(!saved){
        saved=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'sync-'+Date.now().toString(36);
        ss(SYNC_KEY,saved);
      }
      inp.value=saved;
    }
    var pw=document.getElementById('syncPwInput');
    if(pw&&!pw.value)pw.value=ls(SYNC_PW,'');
    var lastRow=document.getElementById('syncLastRow'),lt=ls(SYNC_LAST,'');
    if(lastRow&&lt){lastRow.style.display='block';document.getElementById('syncLastTs').textContent=new Date(lt).toLocaleString();}
    if(modal)modal.style.display='block';
  }
  function hideSync(){
    var modal=document.getElementById('syncModal');
    if(modal)modal.style.display='none';
  }
  function doSyncUpload(){
    var key=document.getElementById('syncKeyInput').value.trim();
    var pw=document.getElementById('syncPwInput').value.trim();
    if(!key||key.length<4){alert(_('sync_fail'));return;}
    if(!confirm(_('sync_confirm_upload')))return;
    ss(SYNC_KEY,key);ss(SYNC_PW,pw);evLog('sync_push');
    fetch(SYNC_BASE+'/'+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pw:pw,data:syncPayload()})})
    .then(function(r){return r.json();})
    .then(function(j){
      if(j.status==='ok'){ss(SYNC_LAST,new Date().toISOString());evLog('sync_push_ok');alert(_('sync_done'));hideSync();}
      else alert(_('sync_fail')+': '+(j.error||''));
    })
    .catch(function(){alert(_('sync_fail'));});
  }
  function doSyncDownload(){
    var key=document.getElementById('syncKeyInput').value.trim();
    var pw=document.getElementById('syncPwInput').value.trim();
    if(!key||key.length<4){alert(_('sync_fail'));return;}
    if(!confirm(_('sync_confirm_download')))return;
    ss(SYNC_KEY,key);ss(SYNC_PW,pw);evLog('sync_pull');
    fetch(SYNC_BASE+'/'+encodeURIComponent(key)+'?pw='+encodeURIComponent(pw))
    .then(function(r){return r.json();})
    .then(function(j){
      if(j.data){
        var size=new TextEncoder().encode(JSON.stringify(j.data)).length;
        if(size>1048576){alert(_('sync_fail'));return;}
        var conflicts=[];
        Object.keys(j.data).forEach(function(k){
          var lv=localStorage.getItem(k);
          if(lv!==null&&lv!==JSON.stringify(j.data[k]))conflicts.push(k);
        });
        if(conflicts.length){
          if(window.__evLog)window.__evLog('sync_conflict',{count:conflicts.length,keys:conflicts.slice(0,10)});
          showConflictNotice(conflicts);
        }
        Object.keys(j.data).forEach(function(k){localStorage.setItem(k,JSON.stringify(j.data[k]));});
        ss(SYNC_LAST,new Date().toISOString());evLog('sync_pull_ok');
        alert(_('sync_done'));
        hideSync();
        location.reload();
      } else if(j.error){alert(_('sync_fail')+': '+j.error);}
      else alert(_('sync_fail')+': no data');
    })
    .catch(function(){alert(_('sync_fail'));});
  }
  function showConflictNotice(keys){
    var banner=document.getElementById('conflictBanner');
    var lt=ls(SYNC_LAST,'');
    var lastTxt=lt?new Date(lt).toLocaleDateString()+' '+new Date(lt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
    if(!banner){
      banner=document.createElement('div');
      banner.id='conflictBanner';
      banner.style.cssText='display:flex;align-items:center;gap:8px;justify-content:space-between;background:rgba(255,152,0,.06);border:1px solid rgba(255,152,0,.2);color:#FFB74D;border-radius:8px;padding:8px 10px;margin:0 0 10px;font-size:.55rem';
      banner.innerHTML='<div><span style="font-weight:700;color:#FFB74D;margin-right:6px" data-i18n="conflict_title"></span><span id="conflictBody"></span></div><button id="conflictDismiss" style="background:none;border:1px solid rgba(255,152,0,.25);color:#FFB74D;border-radius:6px;padding:3px 8px;font-size:.55rem;cursor:pointer" data-i18n="conflict_dismiss"></button>';
      var container=document.querySelector('.container');
      if(container)container.insertBefore(banner,container.firstChild);
      banner.querySelector('#conflictDismiss').addEventListener('click',function(){banner.style.display='none';try{sessionStorage.removeItem('mos_conflict_notice');}catch(e){}});
    }
    var body=document.getElementById('conflictBody');
    body.textContent=_('conflict_body').replace('{n}',keys.length).replace('{k}',keys.slice(0,5).join(', ')+(keys.length>5?' +'+(keys.length-5):'')).replace('{t}',lastTxt);
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

