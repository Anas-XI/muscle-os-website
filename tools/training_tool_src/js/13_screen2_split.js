  // ═══════════════════════════════════════
  //  SCREEN 2: VOLUME + SPLIT
  // ═══════════════════════════════════════

  function renderVolumeSplit(targets,total,ta,g,dd){
    document.getElementById('dowDisplay').textContent=dd+' '+_('vol_days_wk');
    document.getElementById('volSummary').innerHTML='<div class="rb-title">'+_('vol_targets')+'</div><strong>'+total+' '+_('weekly_sets')+'</strong> · '+ta+' · '+g+' · '+dd+' '+_('vol_days_wk');
    var html='';
    MUSCLES.forEach(function(m){
      var t=targets[m.id]||{mev:4,mav:8,mrv:12,rec:6};var mx=Math.max(t.mrv,1);
      html+='<div class="vol-row"><span class="vol-label">'+m.name+'</span><div class="vol-bar-wrap"><div class="vol-bar-mev" style="width:'+(t.mev/mx*100)+'%"></div><div class="vol-bar-mav" style="left:'+(t.mev/mx*100)+'%;width:'+((t.mav-t.mev)/mx*100)+'%"></div><div class="vol-bar-mrv" style="left:'+(t.mrv/mx*100)+'%"></div></div><div class="vol-num"><span class="vol-rec">'+t.rec+'</span><span style="font-size:.45rem;color:rgba(250,250,248,.12)">'+t.mev+'-'+t.mav+'</span><div class="vol-adjust"><button class="vol-minus" data-muscle="'+m.id+'">–</button><button class="vol-plus" data-muscle="'+m.id+'">+</button></div></div></div>';
    });
    document.getElementById('volBars').innerHTML=html;

    // Split grid — recommended split highlighted (badge + why), never pre-selected
    var grid=document.getElementById('splitGrid');grid.innerHTML='';var first=null;
    var rec=recommendSplit();
    document.getElementById('splitWhy').innerHTML=rec.why?'<div class="rec-why"><span class="rec-badge">✦ '+_('split_rec_badge')+'</span> '+rec.why+'</div>':'';
    Object.keys(SPLITS).forEach(function(k){
      var s=SPLITS[k];if(s.d!==dd)return;
      if(g!=='strength'&&s.g==='strength')return;
      var card=document.createElement('div');card.className='split-card'+(rec.key===k?' rec-card':'');card.dataset.key=k;
      var plTag=s.g==='strength'?' <span style="background:rgba(33,150,243,.1);color:#2196F3;font-size:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:1px 4px;border-radius:3px;margin-left:4px">PL</span>':'';
      var sRest=(s.days||[]).filter(function(x){return x.restDay;}).length;
      card.innerHTML='<div class="s-name">'+s.name+plTag+(rec.key===k?'<span class="rec-badge">✦ '+_('split_rec_badge')+'</span>':'')+(sRest?'<span class="rest-badge">'+sRest+' '+_('rest_day')+'</span>':'')+'</div><div class="s-detail">'+s.days.length+' '+_('sessions')+'</div>';
      card.addEventListener('click',function(){
        grid.querySelectorAll('.split-card').forEach(function(c){c.classList.remove('selected')});
        this.classList.add('selected');splitKey=k;
        renderSplitConflict(k);
      });
      grid.appendChild(card);if(!first)first=k;
    });
    if(!first)return;
    if(splitKey){
      grid.querySelectorAll('.split-card').forEach(function(c){
        if(c.dataset.key===splitKey){c.classList.add('selected');renderSplitConflict(splitKey);}
      });
    }
  }

  document.getElementById('volBars').addEventListener('click',function(e){
    var btn=e.target.closest('.vol-adjust button');if(!btn)return;
    var id=btn.dataset.muscle,dir=btn.classList.contains('vol-plus')?1:-1,
        targets=ls(K.VT,{}),vi=ls(K.VI,{}),ta=vi.ta||'intermediate',g=vi.goal||'hypertrophy',
        t=targets[id];
    if(!t)return;
    t.rec=Math.max(0,Math.min(t.mrv,t.rec+dir));
    targets[id]=t;ss(K.VT,targets);
    var total=0;MUSCLES.forEach(function(m){var x=targets[m.id];if(x)total+=x.rec;});
    renderVolumeSplit(targets,total,ta,g,vi.days||4);
  });

  document.getElementById('backToSetupBtn').addEventListener('click',function(){go(1);});

  document.getElementById('genProgBtn').addEventListener('click',function(){
    var sel=document.querySelector('.split-card.selected');
    if(!sel){document.getElementById('splitErr').style.display='block';return;}
    document.getElementById('splitErr').style.display='none';
    var k=sel.dataset.key;splitKey=k;
    showExSelection(k);
  });

  document.getElementById('backToSplitBtn2').addEventListener('click',function(){
    document.getElementById('exSelPanel').classList.remove('show');
    document.getElementById('splitBtnGroup').style.display='flex';
    document.getElementById('splitGrid').style.display='grid';
  });

  // P6: session length chips
  document.getElementById('sessLenGrid').addEventListener('click',function(ev){
    var btn=ev.target.closest('.sess-len-chip');
    if(!btn)return;
    var len=parseInt(btn.dataset.len,10);
    ss('mos_sess_len',len);
    document.querySelectorAll('#sessLenGrid .sess-len-chip').forEach(function(c){c.classList.remove('selected');});
    btn.classList.add('selected');
  });
  (function(){
    var stored=parseInt(ls('mos_sess_len',60),10)||60;
    document.querySelectorAll('#sessLenGrid .sess-len-chip').forEach(function(c){
      c.classList.toggle('selected',parseInt(c.dataset.len,10)===stored);
    });
  })();
  (function(){
    if(location.search.indexOf('coached=1')>=0)SuggestionRouter.setCoached(true);
  })();

