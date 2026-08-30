const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'website', 'index.html');
const orderFile = path.join(__dirname, 'website', 'order.html');

let indexContent = fs.readFileSync(indexFile, 'utf8');

// Revert variables in index.html
indexContent = indexContent.replace(/--accent-1:\s*#F4C93B;\s*\/\*\s*MOS Gold\s*\*\//g, '--accent-1: #c026d3; /* Neon Purple */');
indexContent = indexContent.replace(/--accent-2:\s*#E11D2E;\s*\/\*\s*MOS Red\s*\*\//g, '--accent-2: #3b82f6; /* Neon Blue */');
indexContent = indexContent.replace(/--accent-3:\s*(#FAFAF8|#14151A);\s*\/\*\s*MOS (White|Dark)\s*\*\//g, '--accent-3: #ec4899; /* Neon Pink */');

// Hardcoded references to #F4C93B in index.html (there are some inline)
indexContent = indexContent.replace(/rgba\(244,201,59,/g, 'rgba(192,38,211,');

fs.writeFileSync(indexFile, indexContent);

let orderContent = fs.readFileSync(orderFile, 'utf8');
orderContent = orderContent.replace(/#F4C93B/g, '#c026d3');
orderContent = orderContent.replace(/rgba\(244,201,59,/g, 'rgba(192,38,211,');

fs.writeFileSync(orderFile, orderContent);
console.log("Reverted CSS colors to the neon theme!");
