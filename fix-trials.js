const fs = require('fs');

const tdeePath = 'website/tools/tdee_adaptive_engine.html';
let content = fs.readFileSync(tdeePath, 'utf8');

// The replacement logic:
const newLogic = `
  // TDEE Trial Logic
  var TRIAL_DAYS = 7;
  var mos_trial_start = localStorage.getItem('mos_tdee_trial_start');
  if(!mos_trial_start){
    mos_trial_start = new Date().toISOString();
    localStorage.setItem('mos_tdee_trial_start', mos_trial_start);
  }
  var tdeeDaysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(mos_trial_start).getTime()) / 864e5);
  var tdeeTrialActive = tdeeDaysLeft > 0;

  if(!active){
    if(tdeeTrialActive) {
      // Trial is active, keep tool unlocked. Show pill.
      var pill = document.createElement('span');
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:.5rem;color:#F4C93B;border:1px solid rgba(244,201,59,.25);background:rgba(244,201,59,.06);border-radius:20px;padding:4px 12px;margin-top:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;';
      pill.innerHTML = 'TRIAL: ' + tdeeDaysLeft + ' DAYS LEFT';
      var header = document.querySelector('.header');
      if(header) header.appendChild(pill);
    } else {
      document.getElementById('subOverlay').style.display = 'flex';
      
      // Inject expired note in paywall
      var modal = document.querySelector('.sub-modal');
      var el = document.createElement('div');
      el.className = 'sub-error';
      el.style.display = 'block';
      el.style.marginBottom = '15px';
      el.textContent = 'Your 7-day trial has ended. Subscribe or enter code to continue.';
      var anchor = modal ? (modal.querySelector('#authStep2') || modal.lastElementChild) : null;
      if(anchor) modal.insertBefore(el, anchor);
`;

content = content.replace("if(!active){\n /* paywall removed */", newLogic);

// We still need to close the `} else {` at the end of the `!active` block.
// The `!active` block normally spans all the way down to a `start();` followed by some closing braces.
// Let's find `start();\n }` and replace it with `start();\n }\n }` (to close the else block).
content = content.replace(/start\(\);\s*\}/, "start();\n   }\n  }");

fs.writeFileSync(tdeePath, content);
console.log("Fixed TDEE.");

// Now fix training_tool.html (standalone)
const trainPath = 'website/tools/training_tool.html';
let content2 = fs.readFileSync(trainPath, 'utf8');
content2 = content2.replace(/\/\* paywall removed \*\//, "document.getElementById('subOverlay').style.display = 'flex';");
// Also fix the active=true bug
content2 = content2.replace(
  /try\{ sub = JSON\.parse\(localStorage\.getItem\('mos_subscription'\)\); \}catch\(e\)\{\}\s*var active = true;/g,
  "try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}\n   var active = !!(sub && sub.active && new Date(sub.expiry + 'T23:59:59') > new Date());"
);
fs.writeFileSync(trainPath, content2);
console.log("Fixed Standalone Training Tool.");

// Now fix training_tool.html (bundle)
const bundlePath = 'website/training bundle/training_tool.html';
let content3 = fs.readFileSync(bundlePath, 'utf8');
content3 = content3.replace(
  /try\{ sub = JSON\.parse\(localStorage\.getItem\('mos_subscription'\)\); \}catch\(e\)\{\}\s*var active = true;/g,
  "try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}\n   var active = !!(sub && sub.active && new Date(sub.expiry + 'T23:59:59') > new Date());"
);
fs.writeFileSync(bundlePath, content3);
console.log("Fixed Bundle Training Tool.");
