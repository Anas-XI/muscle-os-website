 var body=document.getElementById('conflictBody');
 body.textContent=_('conflict_body').replace('{n}',keys.length).replace('{k}',keys.slice(0,5).join(', ')+(keys.length>5?' +'+(keys.length-5):'')).replace('{t}',lastTxt);
