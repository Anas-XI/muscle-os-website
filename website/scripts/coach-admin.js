/**
 * Muscle OS Coach Admin CLI
 * 
 * Usage:
 * node coach-admin.js generate training_tool 1 # generate 1 tool code
 * node coach-admin.js generate training_book # generate 1 book code
 * node coach-admin.js generate all 3 # generate 3 all-access codes
 * node coach-admin.js verify BK-XZWY5YU78H4Q # check code status
 * node coach-admin.js list # list all codes
 * node coach-admin.js revoke BK-XZWY5YU78H4Q # delete a code
 */
const crypto = require('crypto');
const https = require('https');

const API = 'https://muscleos-access-control.muscleos.workers.dev';
const ADMIN_KEY = process.env.ADMIN_KEY || 'MOS-ADMIN-DEV-2026';

const PRODUCTS = {
 training_tool: { label: 'Training App (1mo)', plan: 'training_tool', days: 30, multi: false },
 training_tool_3mo: { label: 'Training App (3mo)', plan: 'training_tool', days: 90, multi: false },
 tdee_adaptive_engine: { label: 'TDEE Engine (1mo)', plan: 'tdee_adaptive_engine', days: 30, multi: false },
 bundle: { label: 'Both Tools (1mo)', plan: 'bundle', days: 30, multi: true },
 training_book: { label: 'Training Book (lifetime)', plan: 'single_product', days: 0, multi: false },
 nutrition_book: { label: 'Nutrition Book (lifetime)', plan: 'single_product', days: 0, multi: false },
 books: { label: 'Both Books (lifetime)', plan: 'master', days: 0, multi: true },
 all: { label: 'All Access (1mo)', plan: 'master', days: 30, multi: true },
};

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIXES = {
 training_tool: 'TR', training_tool_3mo: 'TR', tdee_adaptive_engine: 'TD',
 bundle: 'TB', training_book: 'BK', nutrition_book: 'BN', books: 'BB', all: 'MA',
};

function genCode(prefix, len = 10) {
 let c = prefix + '-';
 for (let i = 0; i < len; i++) c += CHARS[crypto.randomInt(CHARS.length)];
 return c;
}

function fetchAPI(path, body) {
 return new Promise((resolve, reject) => {
 const data = JSON.stringify(body);
 const req = https.request(API + path, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY, 'Content-Length': Buffer.byteLength(data) },
 }, (res) => {
 let d = '';
 res.on('data', c => d += c);
 res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ error: d }); } });
 });
 req.on('error', reject);
 req.write(data);
 req.end();
 });
}

async function cmdGenerate(type, count = 1) {
 const prod = PRODUCTS[type];
 if (!prod) { console.log('Unknown type. Options:', Object.keys(PRODUCTS).join(', ')); return; }
 const prefix = PREFIXES[type] || 'XX';
 for (let i = 0; i < count; i++) {
 const code = genCode(prefix);
 const products = prod.multi ? [type === 'bundle' ? ['training_tool','tdee_adaptive_engine'] :
 type === 'books' ? ['training_book','nutrition_book'] : type === 'all' ? 'all' : type] :
 [type];
 const result = await fetchAPI('/api/issue-code', {
 code, products: products[0], plan: prod.plan, durationDays: prod.days, maxUses: 1,
 });
 console.log(`${result.success ? '' : ''} ${code} → ${prod.label} ${result.success ? '' : '(' + result.error + ')'}`);
 }
}

async function cmdVerify(code) {
 const result = await fetchAPI('/api/verify-code', { code, productId: 'training_tool' });
 console.log('Code:', code);
 console.log('Valid:', result.valid);
 if (result.valid) {
 console.log('Plan:', result.plan);
 console.log('Expires:', result.expiresAt);
 console.log('Token:', result.token ? result.token.substring(0, 30) + '...' : 'N/A');
 } else {
 console.log('Error:', result.error);
 }
}

async function cmdList() {
 console.log('Listing codes requires wrangler CLI:\n');
 console.log(' npx wrangler kv key list --binding ACCESS_CODES --remote --prefix "code:"');
}

async function cmdRevoke(code) {
 console.log(`To revoke ${code}:\n`);
 console.log(` npx wrangler kv key delete --binding ACCESS_CODES --remote "code:${code.toUpperCase()}"`);
}

// ── Main ──
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'generate') {
 const type = args[1] || 'training_tool';
 const count = parseInt(args[2]) || 1;
 cmdGenerate(type, count);
} else if (cmd === 'verify') {
 cmdVerify(args[1]);
} else if (cmd === 'list') {
 cmdList();
} else if (cmd === 'revoke') {
 cmdRevoke(args[1]);
} else {
 console.log('Muscle OS Coach Admin CLI\n');
 console.log('Commands:');
 console.log(' generate <type> [count] Generate codes');
 console.log(' Types:', Object.entries(PRODUCTS).map(([k,v]) => `${k} (${v.label})`).join('\n '));
 console.log(' verify <code> Check code status');
 console.log(' list List all codes');
 console.log(' revoke <code> Delete a code');
 console.log('\nSet ADMIN_KEY env var or default MOS-ADMIN-DEV-2026 is used.');
}
