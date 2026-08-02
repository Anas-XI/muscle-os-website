// Playwright test: dark-only theme (light theme removed)
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const URL = 'file://E:/MoS/tools/training_tool.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('dialog', async dlg => dlg.accept());
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  await ctx.addInitScript({ content: `
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
    localStorage.setItem('mos_theme','light');
  `});

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const theme = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return {
      hasThemeBtn: !!document.getElementById('themeBtn'),
      themeWrapCount: document.querySelectorAll('.theme-wrap').length,
      toggleCount: document.querySelectorAll('.theme-toggle').length,
      htmlTheme: document.documentElement.getAttribute('data-theme'),
      storedTheme: localStorage.getItem('mos_theme'),
      bg: cs.backgroundColor,
      color: cs.color,
      accPicker: !!document.getElementById('accPicker'),
      swatchCount: document.querySelectorAll('.acc-swatch').length
    };
  });

  check('No #themeBtn button', theme.hasThemeBtn === false);
  check('No .theme-wrap / .theme-toggle elements', theme.themeWrapCount === 0 && theme.toggleCount === 0);
  check('html[data-theme] forced to dark even with saved light', theme.htmlTheme === 'dark');
  check('mos_theme persisted as dark', theme.storedTheme === 'dark');
  check('Body background is dark (#14151A)', theme.bg === 'rgb(20, 21, 26)');
  check('Body text is light (#FAFAF8)', theme.color === 'rgb(250, 250, 248)');
  check('Accent picker still present', theme.accPicker === true);
  check('4 accent swatches still present', theme.swatchCount === 4);

  await page.click('#accPicker .acc-swatch[data-acc="green"]');
  await page.waitForTimeout(200);
  const accent = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-accent'),
    stored: localStorage.getItem('mos_accent'),
    active: document.querySelector('.acc-swatch.active') && document.querySelector('.acc-swatch.active').dataset.acc
  }));
  check('Accent switch still works (green)', accent.attr === 'green' && accent.stored === 'green' && accent.active === 'green');

  await page.click('#accPicker .acc-swatch[data-acc="yellow"]');
  await page.waitForTimeout(200);
  const accentReset = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-accent'),
    active: document.querySelector('.acc-swatch.active') && document.querySelector('.acc-swatch.active').dataset.acc
  }));
  check('Accent switch resets to yellow', accentReset.attr === null && accentReset.active === 'yellow');

  if (errors.length) { fail++; console.log('FAIL console errors:', JSON.stringify(errors)); }
  else { pass++; console.log('PASS no console errors'); }

  console.log('=== F12 Dark-Only Theme Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
