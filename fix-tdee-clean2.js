const fs = require('fs');
const path = 'website/tools/tdee_adaptive_engine.html';
let content = fs.readFileSync(path, 'utf8');

const trialLogic = `if(!active){
  // TDEE Trial Logic
  var TRIAL_DAYS = 7;
  var mos_trial_start = localStorage.getItem('mos_tdee_trial_start');
  if(!mos_trial_start){
    mos_trial_start = new Date().toISOString();
    localStorage.setItem('mos_tdee_trial_start', mos_trial_start);
  }
  var tdeeDaysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(mos_trial_start).getTime()) / 864e5);
  var tdeeTrialActive = tdeeDaysLeft > 0;

  if(tdeeTrialActive) {
    var pill = document.createElement('span');
    pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:.5rem;color:#F4C93B;border:1px solid rgba(244,201,59,.25);background:rgba(244,201,59,.06);border-radius:20px;padding:4px 12px;margin-top:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;';
    pill.innerHTML = 'TRIAL: ' + tdeeDaysLeft + ' DAYS LEFT';
    var header = document.querySelector('.header');
    if(header) header.appendChild(pill);
    return;
  }
  
  // Trial Expired - attach paywall
  document.getElementById('subOverlay').style.display = 'flex';
  var modal = document.querySelector('.sub-modal');
  var el = document.createElement('div');
  el.className = 'sub-error';
  el.style.display = 'block';
  el.style.marginBottom = '15px';
  el.textContent = 'Your 7-day trial has ended. Subscribe or enter code to continue.';
  var anchor = modal ? (modal.querySelector('#authStep2') || modal.lastElementChild) : null;
  if(anchor) modal.insertBefore(el, anchor);
`;

content = content.replace(/if\(!active\)\{\s*\/\* paywall removed \*\//, trialLogic);
fs.writeFileSync(path, content);
console.log("Fixed TDEE with RegExp replace!");
