 }

 function renderTrendHistory(){
 var range=parseInt(document.getElementById('trendRange').value)||180;
 var logs=ls(K.LG,{}),byDay=dailyCombinedLoads(range);
 var dates=Object.keys(byDay).sort();
 var card=document.getElementById('trendHistCard');
 if(!dates.length){if(card)card.style.display='none';return;}
 var weeks=[];
 for(var i=0;i<dates.length;i+=7){
 var chunk=dates.slice(i,i+7),sets=0,cl=0,vals=[];
 chunk.forEach(function(d){
 var l=logs[d]||{};
 Object.keys(l).forEach(function(eid){(l[eid].sets||[]).forEach(function(x){if(x&&x.w&&parseFloat(x.w)>0&&!x.wu)sets++;});});
 cl+=byDay[d].combined;vals.push(byDay[d].combined);
 });
 var sum=vals.reduce(function(a,x){return a+x},0),mean=sum/Math.max(vals.length,1);
 var sd=Math.sqrt(vals.reduce(function(a,x){return a+(x-mean)*(x-mean)},0)/Math.max(vals.length,1))||0;
 var mono=sd>0?mean/sd:0;
 weeks.push({label:chunk[0].slice(5)+'–'+chunk[chunk.length-1].slice(5),sets:sets,combined:cl,mono:mono,strain:mono>0?cl*mono:0});
 }
 var hasData=weeks.some(function(w){return w.sets>0||w.combined>0});
 if(!hasData){card.style.display='none';return;}
 card.style.display='block';
 var mxSets=Math.max.apply(null,weeks.map(function(w){return w.sets}).concat([1]));
 var mxCl=Math.max.apply(null,weeks.map(function(w){return w.combined}).concat([1]));
 var html='';
 html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:6px 0 2px">'+_('trend_volume')+' <span style="font-size:.42rem;color:rgba(250,250,248,.1)">— '+_('weekly_sets')+'</span></div>';
 html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.round(w.sets/mxSets*40));return '<div title="'+w.label+': '+w.sets+' sets" style="flex:1;height:'+h+'px;background:rgba(244,201,59,.45);border-radius:2px"></div>';}).join('')+'</div>';
 html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:8px 0 2px">'+_('trend_combined')+'</div>';
 html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.round(w.combined/mxCl*40));return '<div title="'+w.label+': '+w.combined+' u" style="flex:1;height:'+h+'px;background:rgba(33,150,243,.45);border-radius:2px"></div>';}).join('')+'</div>';
 html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin:8px 0 2px">'+_('mono_label')+' <span style="font-size:.42rem;color:rgba(250,250,248,.1)">— '+_('mono_thresh')+'</span></div>';
 html+='<div style="display:flex;align-items:flex-end;gap:2px;height:44px">'+weeks.map(function(w){var h=Math.max(3,Math.min(40,Math.round(w.mono*16)));var c=w.mono>2?'#f44336':w.mono>1.5?'#FF9800':'#4CAF50';return '<div title="'+w.label+': mono '+w.mono.toFixed(2)+' · strain '+w.strain.toFixed(0)+'" style="flex:1;height:'+h+'px;background:'+c+';border-radius:2px;opacity:.75"></div>';}).join('')+'</div>';
 var pr=ls(K.PR,null);
 if(pr&&pr.muscles&&pr.muscles.length){
 var names=pr.muscles.map(function(m){for(var i2=0;i2<MUSCLES.length;i2++){if(MUSCLES[i2].id===m)return MUSCLES[i2].name;}return m;}).join(', ');
 html+='<div style="font-size:.5rem;color:rgba(250,250,248,.2);margin-top:8px">'+_('trend_priority')+': <strong style="color:#F4C93B">'+names+'</strong> <span style="font-size:.45rem;color:rgba(250,250,248,.15)">— '+_('trend_updated')+': '+(pr.updated||'—')+'</span></div>';
 }
 var overMono=weeks.filter(function(w){return w.mono>2}).length;
 var totSets=weeks.reduce(function(a,w){return a+w.sets},0);
 html+='<div style="font-size:.5rem;color:rgba(250,250,248,.15);margin-top:6px">'+_('trend_summary').replace('{s}',totSets).replace('{w}',weeks.length).replace('{m}',overMono)+'</div>';
 document.getElementById('trendContent').innerHTML=html;
 }
 document.getElementById('trendRange').addEventListener('change',renderTrendHistory);

 document.getElementById('backToDashBtn').addEventListener('click',function(){go(4);renderDashboard();});
 document.getElementById('markDeloadBtn').addEventListener('click',function(){evLog('deload_marked',{src:'history'});
 if(!confirm(_('confirm_mark_deload')))return;
 var dt=dlTracker();dt.lastDeload=new Date().toISOString().split('T')[0];dt.sessions=0;dt.overshoots=0;ss(K.DT,dt);
 alert(_('alert_deload_marked'));
 renderHistory();
 });

 // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 // EXPORT / IMPORT / RESET
