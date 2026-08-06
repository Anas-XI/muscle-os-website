  // ═══════════════════════════════════════
  //  A7: SHARE PROGRAM CARD
  // ═══════════════════════════════════════

  var shareToastTimer=null;
  function showToast(msg){
    var t=document.getElementById('shareToast');
    t.textContent=msg;t.classList.add('show');
    clearTimeout(shareToastTimer);
    shareToastTimer=setTimeout(function(){t.classList.remove('show');},2600);
  }
  function wrapText(ctx,txt,x,y,maxW,lh,maxLines){
    var words=String(txt).split(/\s+/),line='',ly=y,lines=0;
    for(var i=0;i<words.length;i++){
      var test=line?line+' '+words[i]:words[i];
      if(ctx.measureText(test).width>maxW&&line){
        ctx.fillText(line,x,ly);ly+=lh;lines++;line=words[i];
        if(lines>=maxLines)return ly;
      }else{line=test;}
    }
    if(line){ctx.fillText(line,x,ly);lines++;}
    return ly;
  }
  function shareProgram(){
    var prog=ls(K.PG,null);
    if(!prog||!prog.days)return;
    var sp=ls(K.SP,null);
    var split=sp&&SPLITS[sp.key]?SPLITS[sp.key]:null;
    var vi=ls(K.VI,{});
    var goal=vi.goal||'hypertrophy',ta=vi.ta||'intermediate';
    var top=[];
    prog.days.forEach(function(d){if(!d.ex)return;d.ex.forEach(function(e){if(top.indexOf(e.n)<0)top.push(e.n);});});
    top=top.slice(0,5);
    var splitName=split?split.name:(prog.splitName||'My Program');
    var W=1080,H=1350,c=document.getElementById('shareCanvas'),ctx=c.getContext('2d');
    c.width=W;c.height=H;
    ctx.fillStyle='#14151A';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#F4C93B';ctx.fillRect(0,0,W,16);
    ctx.fillStyle='#1E2027';ctx.fillRect(0,16,W,120);
    ctx.fillStyle='#F4C93B';ctx.font='800 46px Arial,Helvetica,sans-serif';ctx.fillText('MUSCLE OS',60,95);
    ctx.fillStyle='rgba(250,250,248,.55)';ctx.font='600 24px Arial,Helvetica,sans-serif';ctx.fillText('TRAINING PROGRAM',60,128);
    ctx.fillStyle='#FAFAF8';ctx.font='800 64px Arial,Helvetica,sans-serif';
    var y=wrapText(ctx,splitName,60,300,W-120,76,3);
    ctx.fillStyle='rgba(250,250,248,.4)';ctx.font='600 26px Arial,Helvetica,sans-serif';
    ctx.fillText(prog.days.length+' days/week  ·  '+goal+'  ·  '+ta,60,y+30);
    ctx.fillStyle='#F4C93B';ctx.font='700 30px Arial,Helvetica,sans-serif';ctx.fillText('TOP EXERCISES',60,y+120);
    ctx.fillStyle='#FAFAF8';ctx.font='600 40px Arial,Helvetica,sans-serif';
    top.forEach(function(ex,i){
      var ly=y+170+i*66;
      ctx.fillStyle='#F4C93B';ctx.font='800 30px Arial,Helvetica,sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),60,ly);
      ctx.fillStyle='#FAFAF8';ctx.font='600 38px Arial,Helvetica,sans-serif';ctx.fillText(ex,130,ly);
    });
    ctx.fillStyle='#F4C93B';ctx.fillRect(60,H-170,W-120,4);
    ctx.fillStyle='rgba(250,250,248,.7)';ctx.font='700 30px Arial,Helvetica,sans-serif';ctx.fillText('muscleos.coach',60,H-100);
    ctx.fillStyle='rgba(250,250,248,.35)';ctx.font='500 22px Arial,Helvetica,sans-serif';ctx.fillText('Coach Anas Mo\u2019men',60,H-62);
    var a=document.createElement('a');
    a.href=c.toDataURL('image/png');a.download='muscleos_program.png';
    document.body.appendChild(a);a.click();a.remove();
    var shareTxt='💪 My '+splitName+' program — '+prog.days.length+' days/week · '+goal+'\nTop lifts: '+top.join(', ')+'\nBuilt with Muscle OS → muscleos.coach';
    function done(){showToast(_('share_copied'));}
    function fallback(){
      var ta2=document.createElement('textarea');
      ta2.value=shareTxt;ta2.style.position='fixed';ta2.style.opacity='0';
      document.body.appendChild(ta2);ta2.select();
      try{document.execCommand('copy');}catch(e){}
      ta2.remove();done();
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(shareTxt).then(done).catch(fallback);}
    else{fallback();}
  }
  document.getElementById('shareProgBtn').addEventListener('click',shareProgram);

