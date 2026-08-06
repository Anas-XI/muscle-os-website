  // ── Custom Exercise Management ──
  function showCeModal(){
    document.getElementById('ceModal').style.display='block';
    renderCeList();
  }
  function hideCeModal(){
    document.getElementById('ceModal').style.display='none';
  }
  function saveCustomExFromModal(){
    var name=document.getElementById('ceName').value.trim();
    if(!name){alert(_('ce_name_required'));return;}
    var type=document.getElementById('ceType').value;
    var focus=document.getElementById('ceFocus').value;
    var inc=parseFloat(document.getElementById('ceInc').value);
    var minRep=parseInt(document.getElementById('ceMinRep').value)||6;
    var maxRep=parseInt(document.getElementById('ceMaxRep').value)||12;
    saveCustomEx(name,type,focus,inc,[minRep,maxRep],[]);
    document.getElementById('ceName').value='';
    renderCeList();
    alert(_('ce_saved'));
  }
  function renderCeList(){
    var el=document.getElementById('ceList');
    if(!el)return;
    var ce=ls(K.CE,[]);
    if(!ce.length){el.innerHTML='<p style="font-size:.5rem;color:rgba(250,250,248,.12);text-align:center" data-i18n="ce_none">No custom exercises yet.</p>';return;}
    el.innerHTML=ce.map(function(e){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-bottom:1px solid rgba(250,250,248,.04);font-size:.55rem"><span>'+e.name+' <span style="color:rgba(250,250,248,.15);font-size:.5rem">('+e.t+', '+e.rr[0]+'-'+e.rr[1]+' reps)</span></span><span onclick="rmCustomEx(\''+e.name+'\');renderCeList()" style="color:#f44336;cursor:pointer;font-size:.55rem">✕</span></div>';}).join('');
  }

