#!/usr/bin/env node
/* Builds codes/all_products_codes_sheet.html: cover + TOC + per-product tables
   for all 7 products (1000 codes each). Sources: existing codes_sheet.html
   (Training App batch) + the 6 product CSVs. */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const out = [];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function readCsv(file) {
  const lines = fs.readFileSync(path.join(DIR, file), 'utf8').trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map(l => {
    const cells = l.split(',');
    const row = {};
    header.forEach((h, i) => { row[h.trim()] = (cells[i] || '').trim(); });
    return row;
  });
}

const sections = [
  {
    id: 'sec-1',
    title: 'Training App',
    prefix: 'TR',
    kind: 'html',
    file: 'codes_sheet.html',
    meta: { product: 'Training App', plan: 'single_product', duration: '30', generated: '2026-07-31', expires: '2026-08-30' }
  },
  { id: 'sec-2', title: 'TDEE Adaptive Engine', prefix: 'TD', kind: 'csv', file: 'tdee_adaptive_engine_codes_1000.csv' },
  { id: 'sec-3', title: 'Both Tools', prefix: 'TB', kind: 'csv', file: 'both_tools_codes_1000.csv' },
  { id: 'sec-4', title: 'Training Book', prefix: 'BK', kind: 'csv', file: 'training_book_codes_1000.csv' },
  { id: 'sec-5', title: 'Nutrition Book', prefix: 'BN', kind: 'csv', file: 'nutrition_book_codes_1000.csv' },
  { id: 'sec-6', title: 'Both Books', prefix: 'BB', kind: 'csv', file: 'both_books_codes_1000.csv' },
  { id: 'sec-7', title: 'All Access', prefix: 'MA', kind: 'csv', file: 'all_access_codes_1000.csv' }
];

const total = sections.reduce((sum, s) => sum + 1000, 0);

function trRow(idx, code, product, days, status, expires) {
  return `<tr>\n  <td class="idx">${idx}</td>\n  <td class="code">${esc(code)}</td>\n  <td>${esc(product)}</td>\n  <td>${days}</td>\n  <td class="status">${esc(status)}</td>\n  <td class="exp">${esc(expires)}</td>\n</tr>`;
}

function buildSection(s, num) {
  let rows = '';
  let meta = s.meta || null;

  if (s.kind === 'html') {
    const html = fs.readFileSync(path.join(DIR, s.file), 'utf8');
    const m = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    rows = m ? m[1].trim() : '';
  } else {
    const data = readCsv(s.file);
    const first = data[0];
    meta = {
      product: first.Product,
      plan: first.Plan,
      duration: first['Duration (days)'],
      generated: first.Generated,
      expires: first.Expires
    };
    rows = data.map(r => trRow(r.Index, r.Code, r.Product, r['Duration (days)'], r.Status, r.Expires)).join('\n');
  }

  const daysLabel = meta.duration === '0' ? 'Lifetime' : meta.duration + ' days';
  const expiresLabel = meta.duration === '0' ? 'LIFETIME' : meta.expires;

  return `<section id="${s.id}" class="product-section">
  <div class="header">
    <h2>${num}. ${s.title} (${s.prefix})</h2>
    <p>Master code sheet &middot; 1000 generated codes &middot; valid from ${meta.generated} &middot; expires ${expiresLabel}</p>
    <div class="meta">
      <span><b>Product:</b> ${esc(meta.product)}</span>
      <span><b>Plan:</b> ${esc(meta.plan)}</span>
      <span><b>Duration:</b> ${daysLabel}</span>
      <span><b>Total codes:</b> 1000</span>
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
</section>`;
}

const tocPages = { 'sec-1': 3, 'sec-2': 35, 'sec-3': 67, 'sec-4': 99, 'sec-5': 131, 'sec-6': 163, 'sec-7': 195 };

const toc = sections
  .map((s, i) => `<li><a href="#${s.id}">${i + 1}. ${s.title} (${s.prefix})<span class="toc-pg">${tocPages[s.id]}</span></a></li>`)
  .join('\n      ');

const bodies = sections.map((s, i) => buildSection(s, i + 1)).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Muscle OS — All Products Access Codes</title>
<style>
  @page {
    size: A4 landscape;
    margin: 1.5cm 1.2cm;
    @top-center { content: string(doctitle); font-size: 8pt; color: #888; }
    @bottom-center { content: counter(page) " / " counter(pages); font-size: 8pt; color: #888; }
  }
  @page cover { margin: 0; @top-center { content: none; } @bottom-center { content: none; } }
  @page toc { @top-center { content: none; } @bottom-center { content: none; } }
  body { margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; color: #333; string-set: doctitle ""; }
  h1 { string-set: doctitle content(); }
  .cover { width: 297mm; height: 210mm; margin: 0; position: relative; overflow: hidden; page: cover; page-break-after: always; background: #fff; }
  .cover-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 80%; }
  .cover-title { font-size: 28pt; font-weight: 700; color: #1a1a1a; margin: 0 0 0.5cm; }
  .cover-subtitle { font-size: 15pt; color: #555; margin: 0 0 3cm; }
  .cover-meta { font-size: 11pt; color: #333; line-height: 2; }
  .toc-page { page: toc; page-break-after: always; }
  .toc-page h2 { font-size: 18pt; color: #1a1a1a; margin: 0 0 0.6cm; }
  .toc { list-style: none; padding: 0; margin: 0; font-size: 11pt; }
  .toc li { margin: 0.25cm 0; }
  .toc a { color: #333; text-decoration: none; display: flex; justify-content: space-between; border-bottom: 1px dotted #999; padding-bottom: 2px; }
  .toc-pg { color: #444; }
  .product-section { page-break-before: always; }
  .header { margin-bottom: 0.5cm; }
  .header h2 { font-size: 15pt; margin: 0 0 4px 0; color: #1a1a1a; }
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
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-content">
      <h1 class="cover-title">Muscle OS — Access Codes Master Sheet</h1>
      <p class="cover-subtitle">All Products &middot; ${total.toLocaleString()} Codes</p>
      <div class="cover-meta">
        <p>Training App &middot; TDEE Adaptive Engine &middot; Both Tools</p>
        <p>Training Book &middot; Nutrition Book &middot; Both Books &middot; All Access</p>
        <p>Generated 2026-08-03 &middot; 30-day codes expire 2026-09-02 &middot; Book codes lifetime</p>
      </div>
    </div>
  </div>

  <div class="toc-page">
    <h2>Contents</h2>
    <ul class="toc">
      ${toc}
    </ul>
  </div>

${bodies}
</body>
</html>
`;

const outFile = path.join(DIR, 'all_products_codes_sheet.html');
fs.writeFileSync(outFile, html, 'utf8');
console.log(`Wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB, ${sections.length} sections, ${total} codes)`);
