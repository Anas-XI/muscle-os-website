const fs = require('fs');
const p = 'e:/MoS/website/tools/training_tool.html';
let c = fs.readFileSync(p, 'utf8');

const targetStr = `document.getElementById('startTrainingBtn').addEventListener('click',function(){
  go(4);renderDashboard();
});`;
const newStr = `document.getElementById('startTrainingBtn').addEventListener('click',function(){
  document.getElementById('hubEmptyState').style.display='none';
  document.getElementById('hubActiveState').style.display='block';
  document.getElementById('stepper').style.display='flex';
  setAppMode('program');
  go(0);
});`;

if (c.includes('go(4);renderDashboard();')) {
    c = c.replace(targetStr, newStr);
    console.log('Fixed startTrainingBtn logic');
    fs.writeFileSync(p, c, 'utf8');
} else {
    console.log('Could not find startTrainingBtn block');
}
