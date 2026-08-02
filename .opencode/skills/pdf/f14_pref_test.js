const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');
const URL = 'file://E:/MoS/tools/training_tool.html';
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } }
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('dialog', async dlg => dlg.accept());
  page.setDefaultTimeout(45000);
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  await ctx.addInitScript({ content: `localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));` });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Onboard: intermediate / hypertrophy / 3 days / moderate
  await page.fill('#userName', 'PF');
  await page.fill('#userAge', '26');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');

  // Row 1 = Barbell Squat (quads pool). Grab first row's chips before touching.
  const row0 = await page.locator('#exSelContent .ex-sel-row').first();
  const chipNames0 = await row0.locator('.ex-sel-chip').allTextContents();
  check('Row 0 has chips (pool listing)', chipNames0.length >= 2);

  // Find a valid swap target (not the current default 'Barbell Squat', not blocked)
  const target = await row0.locator('.ex-sel-chip:not(.rehab-ex-blocked)').evaluateAll(chips => {
    for (const c of chips) { const n = c.dataset.exval; if (n !== 'Barbell Squat' && n) return n; }
    return null;
  });
  check('Swap target found', !!target);

  // First click: bump preference for target
  await row0.locator('.ex-sel-chip[data-exval="' + target + '"]').click();
  await page.waitForTimeout(250);
  // After re-render: target should be selected + pref-top star + first chip
  const after1 = await row0.locator('.ex-sel-chip').first().getAttribute('data-exval');
  check('Re-render: chosen moves to first position', after1 === target);
  const star1 = await row0.locator('.ex-sel-chip').first().locator('.pref-star').count();
  check('Star shown on top pref', star1 === 1);
  const prefs1 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_pref')));
  check('mos_pref recorded', prefs1 && prefs1['Barbell Squat'] && prefs1['Barbell Squat'][target] === 1);

  // Second click (same chip) -> count 2
  await row0.locator('.ex-sel-chip[data-exval="' + target + '"]').click();
  await page.waitForTimeout(250);
  const prefs2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_pref'))['Barbell Squat']);
  check('Second click bumped count to 2', prefs2[target] === 2);

  // Confirm -> program generated with target as chosen exercise
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const prog1 = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('mos_program'));
    return p.days[0].ex[0].n;
  });
  check('Program day 1 ex1 = target', prog1 === target);

  // Re-open selection: chosen = saved choice; chips ordered pref-first
  await page.click('#saveProgBtn');
  await page.waitForSelector('#step35.active');
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.click('#changeSplitBtn');
  await page.waitForSelector('#step2.active');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.waitForTimeout(300);
  const row0b = await page.locator('#exSelContent .ex-sel-row').first();
  const firstChip = await row0b.locator('.ex-sel-chip').first().getAttribute('data-exval');
  check('Saved choice first on reopen', firstChip === target);
  await page.locator('#backToSplitBtn2').click({ force: true });
  await page.waitForTimeout(200);

  // Clear explicit choices -> generation must default to top pref
  await page.evaluate(() => localStorage.removeItem('mos_ex_choices'));
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const prog2 = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('mos_program'));
    return p.days[0].ex[0].n;
  });
  check('No explicit choice -> defaults to top pref', prog2 === target);

  // Dashboard swap bumps pref too
  await page.click('#saveProgBtn');
  await page.waitForSelector('#step35.active');
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForTimeout(400);
  const card0 = page.locator('#exCards .ex-card').first();
  await card0.locator('.sw-ex-btn').click();
  await page.waitForTimeout(200);
  const swTarget = await card0.locator('.swap-panel .swap-chip').evaluateAll(chips => {
    for (const c of chips) { if (c.dataset.to && c.dataset.to !== 'Barbell Squat') return c.dataset.to; }
    return null;
  });
  check('Swap target exists on day 1 card', !!swTarget);
  if (swTarget) {
    await card0.locator('.swap-chip[data-to="' + swTarget + '"]').click();
    await page.waitForTimeout(300);
    const pref3 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_pref'))['Barbell Squat']);
    check('Swap bumped mos_pref', pref3 && pref3[swTarget] === 1);
    const prog3 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')).days[0].ex[0].n);
    check('Program updated by swap', prog3 === swTarget);
  }

  console.log('=== F14 Preference Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
})().catch(e => { console.log('ERROR ' + e); process.exit(1); });
