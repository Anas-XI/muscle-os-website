const fs = require('fs');

const path = 'website/training bundle/training_tool.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /try\{ sub = JSON\.parse\(localStorage\.getItem\('mos_subscription'\)\); \}catch\(e\)\{\}\s*var active = true;/g,
  "try{ sub = JSON.parse(localStorage.getItem('mos_subscription')); }catch(e){}\n   var active = !!(sub && sub.active && new Date(sub.expiry + 'T23:59:59') > new Date());"
);

fs.writeFileSync(path, content);
console.log("Fixed active bugs in bundle/training_tool.html");
