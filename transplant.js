const fs = require('fs');

const oldHtmlPath = 'website_06eeec6.html';
const newHtmlPath = 'website/index.html';

const oldHtml = fs.readFileSync(oldHtmlPath, 'utf8');
const newHtml = fs.readFileSync(newHtmlPath, 'utf8');

// 1. Extract the new pricing section (TABS to the end of Coaching tab)
const pricingStart = newHtml.indexOf('<!-- TABS -->');
const pricingEnd = newHtml.indexOf('<!-- Quiz CTA -->');
let newPricing = newHtml.slice(pricingStart, pricingEnd);

// 2. Extract new script logic
const scriptStart = newHtml.indexOf('<script>');
let scriptContent = newHtml.slice(scriptStart);
scriptContent = scriptContent.replace(/<\/body>[\s\S]*<\/html>/, '');

// 3. Extract the new CSS required for the cards and pricing
const newCss = `
  /* Tab and Card Styles Ported from New Layout */
  .card {
    background: var(--ink-2); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 24px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transition: all 0.3s;
  }
  .card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px -10px var(--yellow); border-color: rgba(244,201,59,0.3); }
  .card h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 22px; }
  .card ul { list-style: none; margin-top: 20px; }
  .card ul li { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: var(--text-muted); }
  .price { font-size: 40px; font-weight: 700; margin: 20px 0 10px; letter-spacing: -1px; }
  .green { color: #10b981; }
  
  .three-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
  .two-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; max-width: 800px; margin: 0 auto; }
  
  .pricing-tier { position: relative; z-index: 1; }
  .pricing-tier.middle { border-color: var(--yellow); transform: scale(1.05); background: var(--ink); }
  @media (max-width: 900px) { .pricing-tier.middle { transform: scale(1); } }
`;

// 4. Splice them into old HTML
// Replace the old #packages section
const oldPackagesStart = oldHtml.indexOf('<section class="packages section-pad" id="packages">');
const oldPackagesEnd = oldHtml.indexOf('<!-- CLIENT REVIEWS');
let finalHtml = oldHtml.slice(0, oldPackagesStart) + 
  '<section class="packages section-pad" id="packages">\n<div class="wrap">\n' +
  '<div class="eyebrow">Store & Pricing</div>\n' +
  '<h2 class="section-title">Upgrade Your<br>Training OS.</h2>\n' +
  '<div style="display:flex; justify-content:center; margin: 30px 0;">' +
  '<div style="background: var(--ink-2); padding: 5px; border-radius: 30px; display:inline-flex; border: 1px solid rgba(255,255,255,0.1);">' +
  '<button id="currencyEGP" class="btn" style="border-radius: 25px; background: var(--yellow); color: #000; padding: 8px 24px;" onclick="setCurrency(\'egp\')">???? EGP</button>' +
  '<button id="currencyUSD" class="btn" style="border-radius: 25px; background: transparent; color: #fff; padding: 8px 24px;" onclick="setCurrency(\'usd\')">?? USD</button>' +
  '</div></div>\n' +
  newPricing + 
  '\n</div></section>\n\n' +
  oldHtml.slice(oldPackagesEnd);

// Add the new CSS
finalHtml = finalHtml.replace('</style>', newCss + '\n</style>');

// Add the scripts at the end before </body>
finalHtml = finalHtml.replace('</body>', scriptContent + '\n</body>');

// Fix colors in the injected new pricing (using var(--yellow) instead of var(--accent-1))
finalHtml = finalHtml.replace(/var\(--accent-1\)/g, 'var(--yellow)');
finalHtml = finalHtml.replace(/var\(--bg-card\)/g, 'var(--ink-2)');

fs.writeFileSync('website/index.html', finalHtml);
console.log("Transplanted pricing into old layout!");
