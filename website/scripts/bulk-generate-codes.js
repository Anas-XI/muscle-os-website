/**
 * Bulk code generator + seeder for Muscle OS
 *
 * Generates 1000 codes per product (tool / book / bundle), writes:
 * - codes/<product>_codes_1000.csv (distribution sheet, same format as training app batch)
 * - codes/<product>_codes_sheet.html (printable A4 sheet — print to PDF from browser)
 * - codes/all_products_codes_<date>.txt (WhatsApp-friendly sections)
 * - codes/kv-seed-<date>.json (plaintext seed for `wrangler kv bulk put`)
 * - codes/fallback-hashes-<date>.json (SHA-256 hashes to merge into access-codes.json)
 *
 * The script also merges the new hashes into assets/data/access-codes.json
 * (existing hashes are preserved) so the 48h offline fallback covers the
 * new codes too.
 *
 * Usage:
 * node scripts/bulk-generate-codes.js # generate + write files + merge hashes
 * node scripts/bulk-generate-codes.js --no-merge # skip access-codes.json merge
 * node scripts/bulk-generate-codes.js --count 1000 # codes per product (default 1000)
 *
 * Seed KV afterwards:
 * cd worker && npx wrangler kv bulk put --namespace-id <ACCESS_CODES_ID> <kv-seed-file>
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CODES_DIR = path.resolve(__dirname, '..', '..', 'codes');
const ACCESS_JSON_PATH = path.resolve(__dirname, '..', 'assets', 'data', 'access-codes.json');

// Same charset as the existing TR batch / worker generateOrderCode (full alphabet).
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LEN = 10;

// ── Products ──
// TR (training_tool) already generated + seeded — not regenerated here.
const PRODUCTS = [
 { key: 'tdee_adaptive_engine', prefix: 'TD', label: 'TDEE Adaptive Engine', products: ['tdee_adaptive_engine'], plan: 'single_product', durationDays: 30 },
 { key: 'both_tools', prefix: 'TB', label: 'Training Apps Bundle', products: ['training_tool', 'tdee_adaptive_engine'], plan: 'single_product', durationDays: 30 },
 { key: 'training_book', prefix: 'BK', label: 'Training Book', products: ['training_book'], plan: 'single_product', durationDays: 0 },
 { key: 'nutrition_book', prefix: 'BN', label: 'Nutrition Book', products: ['nutrition_book'], plan: 'single_product', durationDays: 0 },
 { key: 'both_books', prefix: 'BB', label: 'Books Bundle', products: ['training_book', 'nutrition_book'], plan: 'single_product', durationDays: 0 },
 { key: 'all_access', prefix: 'MA', label: 'All Access', products: 'all', plan: 'master', durationDays: 30 },
];

function todayISO() {
 const d = new Date();
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
}

function addDays(iso, days) {
 const d = new Date(iso + 'T00:00:00Z');
 d.setUTCDate(d.getUTCDate() + days);
 return d.toISOString().split('T')[0];
}

function genCode(prefix) {
 let code = prefix + '-';
 const bytes = crypto.randomBytes(CODE_LEN);
 for (let i = 0; i < CODE_LEN; i++) {
 code += CHARS[bytes[i] % CHARS.length];
 }
 return code;
}

function sha256(code) {
 return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

function fallbackEntry(p) {
 const entry = { plan: p.plan };
 entry.productId = p.products;
 if (p.durationDays > 0) entry.durationDays = p.durationDays;
 return entry;
}

function kvRecord(p) {
 return {
 products: p.products,
 plan: p.plan,
 durationDays: p.durationDays,
 uses: 0,
 };
}

function csvRow(idx, code, p, generated, expires) {
 return `${idx},${code},${p.label},${p.plan},${p.durationDays},UNUSED,${generated},${expires}`;
}

function sheetHtml(p, codes, generated, expires) {
 const rows = codes.map((c, i) =>
 ` <td class="idx">${i + 1}</td>\n <td class="code">${c}</td>\n <td>${p.label}</td>\n <td>${p.durationDays}</td>\n <td class="status">UNUSED</td>\n <td class="exp">${expires}</td>`
 ).join('\n');
 const title = `${p.label} Access Codes`;
 return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Muscle OS — ${title}</title>
<style>
 @page {
 size: A4 landscape;
 margin: 1.5cm 1.2cm;
 @bottom-center { content: counter(page) " / " counter(pages); font-size: 8pt; color: #888; }
 }
 body { margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; color: #333; }
 .header { margin-bottom: 0.5cm; }
 .header h1 { font-size: 16pt; margin: 0 0 4px 0; color: #1a1a1a; }
 .header p { margin: 0; font-size: 9.5pt; color: #555; }
 .meta { display: flex; gap: 24px; margin-top: 6px; font-size: 9pt; color: #444; }
 .meta span b { color: #1a1a1a; }
 table { width: 100%; border-collapse: collapse; font-size: 8.5pt; max-width: 100%; }
 thead { display: table-header-group; }
 th { background: #1a1a1a; color: #fff; padding: 5px 6px; text-align: left; font-size: 8.5pt; font-weight: bold; }
 td { padding: 4px 6px; border-bottom: 0.5pt solid #ddd; }
 tr { page-break-inside: avoid; }
 tbody tr:nth-child(even) { background: #f5f5f5; }
 td.code { font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 0.5px; color: #1a1a1a; }
 td.idx { color: #888; }
 td.status { color: #2e7d32; font-weight: bold; }
 td.exp { color: #555; }
 .footer-note { margin-top: 0.4cm; font-size: 8pt; color: #777; border-top: 1px solid #ccc; padding-top: 4px; }
</style>
</head>
<body>
 <div class="header">
 <h1>Muscle OS — ${title}</h1>
 <p>Master code sheet &middot; ${codes.length} generated codes &middot; valid from ${generated} &middot; expires ${expires}</p>
 <div class="meta">
 <span><b>Product:</b> ${p.label}</span>
 <span><b>Plan:</b> ${p.plan}</span>
 <span><b>Duration:</b> ${p.durationDays === 0 ? 'LIFETIME' : p.durationDays + ' days'}</span>
 <span><b>Total codes:</b> ${codes.length}</span>
 </div>
 </div>

 <table>
 <thead>
 <tr>
 <th style="width:6%">#</th>
 <th style="width:30%">Access Code</th>
 <th style="width:22%">Product</th>
 <th style="width:14%">Days</th>
 <th style="width:12%">Status</th>
 <th style="width:16%">Expires</th>
 </tr>
 </thead>
 <tbody>
${rows}
 </tbody>
 </table>

 <div class="footer-note">Muscle OS access codes &middot; distribute one code per customer &middot; codes activate on first use${p.durationDays > 0 ? ' and expire ' + p.durationDays + ' days later' : ' and never expire'}</div>
</body>
</html>
`;
}

function main() {
 const args = process.argv.slice(2);
 const noMerge = args.includes('--no-merge');
 const countArg = args.indexOf('--count');
 const perProduct = countArg !== -1 ? parseInt(args[countArg + 1], 10) || 1000 : 1000;
 const generated = todayISO();

 fs.mkdirSync(CODES_DIR, { recursive: true });

 const kvEntries = [];
 const fallbackHashes = {};
 const txtSections = [];
 let grandTotal = 0;

 for (const p of PRODUCTS) {
 const unique = new Set();
 while (unique.size < perProduct) unique.add(genCode(p.prefix));
 const codes = Array.from(unique);
 const expires = p.durationDays > 0 ? addDays(generated, p.durationDays) : 'LIFETIME';

 // CSV
 const csvLines = ['Index,Code,Product,Plan,Duration (days),Status,Generated,Expires'];
 codes.forEach((c, i) => csvLines.push(csvRow(i + 1, c, p, generated, expires)));
 const csvPath = path.join(CODES_DIR, `${p.key}_codes_${perProduct}.csv`);
 fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');

 // Printable sheet
 const sheetPath = path.join(CODES_DIR, `${p.key}_codes_sheet.html`);
 fs.writeFileSync(sheetPath, sheetHtml(p, codes, generated, expires));

 // KV seed + fallback hashes
 for (const c of codes) {
 kvEntries.push({ key: `code:${c}`, value: JSON.stringify(kvRecord(p)) });
 fallbackHashes[sha256(c)] = fallbackEntry(p);
 }

 // WhatsApp text section
 const lines = [];
 lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
 lines.push(`${p.label.toUpperCase()} — ${p.durationDays === 0 ? 'LIFETIME' : p.durationDays + ' DAYS'}`);
 lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
 codes.forEach(c => lines.push(c));
 lines.push('');
 txtSections.push(lines.join('\n'));

 grandTotal += codes.length;
 console.log(` ${p.key}: ${codes.length} codes → ${path.relative(process.cwd(), csvPath)}`);
 }

 // Combined WhatsApp file
 const stamp = generated;
 const txtPath = path.join(CODES_DIR, `all_products_codes_${stamp}.txt`);
 const txtHeader = `MUSCLE OS — ALL ACCESS CODES\nGenerated ${generated} · ${grandTotal} codes total\nOne code per customer. Codes activate on first use.\n\n`;
 fs.writeFileSync(txtPath, txtHeader + txtSections.join('\n'));

 // KV seed file
 const kvPath = path.join(CODES_DIR, `kv-seed-${stamp}.json`);
 fs.writeFileSync(kvPath, JSON.stringify(kvEntries));

 // Fallback hashes file
 const hashesPath = path.join(CODES_DIR, `fallback-hashes-${stamp}.json`);
 fs.writeFileSync(hashesPath, JSON.stringify(fallbackHashes, null, 2));

 console.log(`\nTotal codes: ${grandTotal}`);
 console.log(`KV seed: ${path.relative(process.cwd(), kvPath)} (${kvEntries.length} entries)`);
 console.log(`Hashes: ${path.relative(process.cwd(), hashesPath)} (${Object.keys(fallbackHashes).length})`);
 console.log(`WhatsApp: ${path.relative(process.cwd(), txtPath)}`);

 // Merge into access-codes.json (preserve existing hashes)
 if (!noMerge) {
 const db = JSON.parse(fs.readFileSync(ACCESS_JSON_PATH, 'utf8'));
 const before = Object.keys(db.hashes).length;
 let added = 0;
 for (const [h, e] of Object.entries(fallbackHashes)) {
 if (!db.hashes[h]) { db.hashes[h] = e; added++; }
 }
 fs.writeFileSync(ACCESS_JSON_PATH, JSON.stringify(db, null, 2) + '\n');
 console.log(`access-codes.json: ${before} hashes → ${before + added} (added ${added})`);
 } else {
 console.log('access-codes.json merge skipped (--no-merge)');
 }

 console.log('\nSeed KV now:');
 console.log(' cd worker && npx wrangler kv bulk put --namespace-id <ACCESS_CODES_ID> ' + path.relative(process.cwd(), kvPath));
}

main();
