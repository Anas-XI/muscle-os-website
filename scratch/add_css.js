const fs = require('fs');
const p = 'e:/MoS/website/tools/training_tool.html';
let c = fs.readFileSync(p, 'utf8');

const cssAdd = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulseGlow { 0% { box-shadow: 0 0 15px rgba(244,201,59,.2); } 50% { box-shadow: 0 0 25px rgba(244,201,59,.6); } 100% { box-shadow: 0 0 15px rgba(244,201,59,.2); } }
</style>
`;

if (c.includes('</style>') && !c.includes('@keyframes fadeIn')) {
    c = c.replace('</style>', cssAdd);
}

// Update the inline animation name
c = c.replace('animation:pulse 2s infinite', 'animation:pulseGlow 2s infinite');

fs.writeFileSync(p, c, 'utf8');
console.log('Added CSS animations');
