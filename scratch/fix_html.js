const fs = require('fs');
const p = 'e:/MoS/website/tools/training_tool.html';
let c = fs.readFileSync(p, 'utf8');

// Fix step0 missing closing div
const endStep0Regex = /<button class="btn-secondary" id="twEditBtn">.*?<\/button>\s*<\/div>\s*<\/div>/;
const match = c.match(endStep0Regex);
if (match) {
    c = c.replace(match[0], match[0] + '\n  </div>');
    console.log('Fixed step0 closing div');
}

// Fix step3 button
const step3Regex = /<button class="btn-primary" id="saveProgramBtn".*?<\/button>/;
const m3 = c.match(step3Regex);
if (m3 && !c.includes('Return to Hub')) {
    c = c.replace(m3[0], m3[0] + '\n      <button class="btn-secondary" onclick="go(0)" style="margin-top:12px;background:rgba(250,250,248,.05);border:none">Return to Hub</button>');
    console.log('Fixed step3 button');
}

fs.writeFileSync(p, c, 'utf8');
