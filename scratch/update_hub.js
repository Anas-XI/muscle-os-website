const fs = require('fs');

const file = 'e:/MoS/website/tools/training_tool.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Add startNewProgram globally (near other global functions like window.closeTrainingTourModal)
if (!content.includes('function startNewProgram(')) {
    content = content.replace(
        'window.closeTrainingTourModal = function(){',
        `window.startNewProgram = function(){
  setAppMode('intake');
  go(1);
};
window.closeTrainingTourModal = function(){`
    );
}

// 2. Modify step0 HTML
const step0Regex = /<div class="step-content" id="step0">\s*<div class="training-welcome-card" id="welcomeTrainingCard">/;
if (step0Regex.test(content) && !content.includes('id="hubEmptyState"')) {
    content = content.replace(step0Regex, `<div class="step-content" id="step0">
  <!-- Empty State for New Users -->
  <div id="hubEmptyState" style="display:none;text-align:center;padding:40px 20px;animation:fadeIn 0.5s ease-out">
    <div style="margin-bottom:24px">
      <h2 style="font-size:1.2rem;font-weight:700;color:#FAFAF8;margin-bottom:8px">Welcome to Muscle OS</h2>
      <p style="font-size:0.75rem;color:rgba(250,250,248,.6);max-width:300px;margin:0 auto;line-height:1.4">Your autoregulated, periodized training journey begins here. Build a custom program tailored to your goals.</p>
    </div>
    <button class="btn-primary" onclick="startNewProgram()" style="font-size:0.9rem;padding:12px 24px;width:auto;box-shadow:0 0 15px rgba(244,201,59,.2);animation:pulse 2s infinite">Build Your Program</button>
  </div>

  <!-- Active State for Returning Users -->
  <div id="hubActiveState" style="display:none">
    <div class="training-welcome-card" id="welcomeTrainingCard">`);
    
    // Now close the hubActiveState div
    const endStep0Regex = /<button class="btn-secondary" id="twEditBtn">.*?<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/;
    const match = content.match(endStep0Regex);
    if (match) {
        content = content.replace(match[0], match[0].replace('</div>\n  </div>', '</div>\n    </div>\n  </div>'));
    }
}

// 3. Modify init()
const initRegex = /if\(prog \|\| sp \|\| vi\.name\)\{\s*setAppMode\('program'\);\s*go\(0\);/;
if (initRegex.test(content)) {
    content = content.replace(initRegex, `go(0);
    var hubEmpty = document.getElementById('hubEmptyState');
    var hubActive = document.getElementById('hubActiveState');
    var stepper = document.getElementById('stepper');
    
    if(prog || sp || vi.name){
      setAppMode('program');
      if(hubEmpty) hubEmpty.style.display = 'none';
      if(hubActive) hubActive.style.display = 'block';
      if(stepper) stepper.style.display = 'flex';`);
      
    const initEndRegex = /go\(1\);\s*\}\);\s*\}\s*\}\s*\}\)\(\);/;
    content = content.replace(initEndRegex, `go(1);
          });
        }
      }
    } else {
      if(hubActive) hubActive.style.display = 'none';
      if(hubEmpty) hubEmpty.style.display = 'block';
      if(stepper) stepper.style.display = 'none';
    }
  })();`);
}

// 4. Update step3 so it has a button to return to dashboard
const step3EndRegex = /<button class="btn-primary" id="saveProgramBtn" data-i18n="save_start_prog">Save &amp; Start Program<\/button>/;
if (step3EndRegex.test(content)) {
    content = content.replace(step3EndRegex, `<button class="btn-primary" id="saveProgramBtn" data-i18n="save_start_prog">Save &amp; Start Program</button>
      <button class="btn-secondary" onclick="go(0)" style="margin-top:12px;background:rgba(250,250,248,.05);border:none">Return to Hub</button>`);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Hub screen modifications complete.');
