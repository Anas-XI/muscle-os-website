 document.getElementById('fatigueHistCard').style.display='block';
 var ft='<div style="display:flex;gap:4px;align-items:flex-end;height:50px;padding:4px 0">';
 dates.forEach(function(d){
 var fs=fatigueScore(fl[d]);var h=Math.min(fs.score*8,50);
 var c=fs.color==='green'?'#4CAF50':fs.color==='yellow'?'#FF9800':'#f44336';
 ft+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div title="'+d+': '+fs.score.toFixed(1)+' — '+fs.label+'" style="width:100%;height:'+Math.max(h,4)+'px;background:'+c+';border-radius:3px 3px 0 0;opacity:.7"></div><span style="font-size:.4rem;color:rgba(250,250,248,.15);margin-top:2px">'+d.slice(5)+'</span></div>';
 });
 ft+='</div>';
 var avg=dates.reduce(function(s,d){return s+fatigueScore(fl[d]).score},0)/dates.length;
 ft+='<div style="font-size:.55rem;color:rgba(250,250,248,.2);margin-top:4px">'+_('hist_7day_fatigue')+': <strong>'+(avg.toFixed(1))+'</strong> — '+(avg>=7.5?_('hist_fatigue_green'):avg>=5?_('hist_fatigue_yellow'):_('hist_fatigue_red'))+'</div>';
 document.getElementById('fatigueTrend').innerHTML=ft;
 } else {document.getElementById('fatigueHistCard').style.display='none';}

 renderOutcomeSection();
 }

 function renderChart(ex){
 var hist=loadHist(),entries=hist[ex];if(!entries||entries.length<2){document.getElementById('histChart').innerHTML='<p style="font-size:.6rem;color:rgba(250,250,248,.15);padding:20px;text-align:center">'+_('chart_need_sessions')+'</p>';return;}
 var sorted=entries.slice().sort(function(a,b){return a.date<b.date?-1:1}).slice(-8);
 var maxE=sorted.reduce(function(m,x){return Math.max(m,x.e1RM)},0);
 var html='<div class="hc-row">';
 sorted.forEach(function(e){
 var h=e.e1RM/maxE*100;
 html+='<div class="hc-bar" style="height:'+Math.max(h,5)+'%"><span class="hc-tooltip">'+e.date+'<br>'+e.w+' kg '+e.r+' @ '+e.rpe+'<br>e1RM: '+e.e1RM+'</span></div>';
 });
 html+='</div><div style="display:flex;justify-content:space-between;font-size:.4rem;color:rgba(250,250,248,.12);margin-top:2px">';
 sorted.forEach(function(e){html+='<span>'+e.date.slice(5)+'</span>';});
 html+='</div><div style="margin-top:6px;font-size:.55rem;color:rgba(250,250,248,.2)">e1RM: <strong style="color:#F4C93B">'+sorted[0].e1RM+'</strong> → <strong style="color:#F4C93B">'+sorted[sorted.length-1].e1RM+'</strong> kg ('+(((sorted[sorted.length-1].e1RM-sorted[0].e1RM)/sorted[0].e1RM*100)||0).toFixed(1)+'%)</div>';
 document.getElementById('histChart').innerHTML=html;
