const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const URL = 'file://E:/MoS/tools/training_tool.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('dialog', async d => d.accept());
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  await ctx.addInitScript({ content: `localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));` });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Go through onboarding to the split screen
  await page.fill('#userName', 'Pool Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');

  // T1: pool integrity — every pool name resolves in EXERCISE_META; all 12 muscles have pools
  const integ = await page.evaluate(() => {
    const P = window.__pools, M = window.__exMeta;
    const missing = [];
    Object.keys(P).forEach(m => {
      P[m].forEach(n => { if (!M[n]) missing.push(m + ':' + n); });
    });
    const noPool = [];
    Object.keys(window.__splits).forEach(k => {
      window.__splits[k].days.forEach(d => { if (d.restDay) return; d.ex.forEach(e => { if (!P[e.p]) noPool.push(k + ':' + d.n + ':' + e.p); }); });
    });
    return { missing, noPool, pools: Object.keys(P).length, total: Object.values(P).reduce((s, a) => s + a.length, 0) };
  });
  check('All pool exercises exist in EXERCISE_META (missing=' + integ.missing.length + ')', integ.missing.length === 0);
  check('Every split slot muscle has a pool (missing=' + integ.noPool.length + ')', integ.noPool.length === 0);
  check('12 muscle pools defined', integ.pools === 12);
  check('Pool library size >= 100 exercises', integ.total >= 100);
  console.log('  pools:', integ.pools, 'total pool entries:', integ.total);

  // Open exercise selection for fullbody_3
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');

  // T2: first row = Barbell Squat with full quads pool (10 chips: 6 visible + 4 hidden) + more button
  const firstRow = page.locator('#exSelContent .ex-sel-row').first();
  const chipCount = await firstRow.locator('.ex-sel-chip').count();
  const visibleChips = await firstRow.locator(':scope > .ex-sel-chip').count();
  const hiddenChips = await firstRow.locator('.ex-sel-hidden .ex-sel-chip').count();
  const moreBtn = firstRow.locator('.ex-sel-more');
  check('First row has full quads pool (10 chips, got ' + chipCount + ')', chipCount === 10);
  check('6 chips visible by default', visibleChips === 6);
  check('4 chips collapsed in hidden span', hiddenChips === 4);
  check('Show-all expander present', await moreBtn.count() === 1);
  check('Expander label shows total count', (await moreBtn.textContent()).includes('10'));

  // T3: hidden chips are hidden, expander reveals them
  check('Hidden chips initially display:none', await firstRow.locator('.ex-sel-hidden').evaluate(el => getComputedStyle(el).display === 'none'));
  await moreBtn.click();
  await page.waitForTimeout(150);
  check('Expander label switches to Show fewer', (await moreBtn.textContent()).includes('Show fewer'));
  check('Hidden chips visible after expand', await firstRow.locator('.ex-sel-hidden').evaluate(el => getComputedStyle(el).display !== 'none'));
  await moreBtn.click();
  await page.waitForTimeout(150);
  check('Collapse works again', await firstRow.locator('.ex-sel-hidden').evaluate(el => getComputedStyle(el).display === 'none'));

  // T4: equip tags rendered on chips
  const eqTags = await page.evaluate(() => Array.from(document.querySelectorAll('#exSelContent .equip-tag')).map(e => e.textContent));
  check('Equip tags rendered (BB/DB/MAC/CAB/BW)', eqTags.length > 5 && eqTags.includes('BB') && eqTags.includes('MAC'));

  // T5: row-level safety classes still applied to chips (no injuries seeded -> no blocked chips)
  const blockedChips = await page.evaluate(() => document.querySelectorAll('#exSelContent .ex-sel-chip.rehab-ex-blocked').length);
  check('No blocked chips without injuries', blockedChips === 0);

  // T6: select a visible non-default pool exercise (Leg Press, 4th chip in row 1)
  const legPressChip = firstRow.locator('.ex-sel-chip', { hasText: 'Leg Press' });
  check('Leg Press chip present in quads pool', await legPressChip.count() === 1);
  await legPressChip.click();
  await page.waitForTimeout(100);
  const selText = await firstRow.locator('.ex-sel-chip.selected').textContent();
  check('Selection moves to Leg Press', selText.includes('Leg Press'));

  // T7: hidden chip selection works after expand (Sissy Squat)
  await moreBtn.click();
  await page.waitForTimeout(100);
  const sissyChip = firstRow.locator('.ex-sel-chip', { hasText: 'Sissy Squat' });
  check('Hidden chip (Sissy Squat) present after expand', await sissyChip.count() === 1);
  await sissyChip.click();
  await page.waitForTimeout(100);
  check('Hidden chip becomes selected (single selection per row)', (await firstRow.locator('.ex-sel-chip.selected').count()) === 1 && (await firstRow.locator('.ex-sel-chip.selected').textContent()).includes('Sissy Squat'));

  // T8: confirm -> choices persisted + program uses chosen exercise
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const choices = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_ex_choices') || '{}'));
  check('mos_ex_choices persisted with Sissy Squat for slot Barbell Squat', choices['Barbell Squat'] === 'Sissy Squat');
  const progHasSissy = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('mos_program') || 'null'); return p && p.days[0].ex[0].n === 'Sissy Squat'; });
  check('Program day 1 slot 1 uses Sissy Squat', progHasSissy);

  // T9: program preview shows chosen exercise name
  const step3Text = await page.locator('#step3').textContent();
  check('Step 3 preview shows Sissy Squat', step3Text.includes('Sissy Squat'));

  // T10: full flow into training — chosen exercise renders with suggest values (meta-driven)
  await page.click('#saveProgBtn');
  await page.waitForTimeout(400);
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForSelector('#exCards .ex-card');
  const firstTitle = await page.locator('#exCards .ex-card .ex-title').first().textContent();
  check('Training day 1 first exercise is Sissy Squat', firstTitle.includes('Sissy Squat'));
  const hasSuggest = await page.locator('#exCards .ex-card').first().locator('.suggest-box').count();
  check('Chosen exercise renders suggest box (meta integration)', hasSuggest > 0);

  // T11: second scenario — Leg Press via expanded panel, confirm, verify persisted
  await page.click('#changeSplitBtn');
  await page.waitForSelector('#step2.active');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  const row1 = page.locator('#exSelContent .ex-sel-row').first();
  const legPress = row1.locator('.ex-sel-chip', { hasText: 'Leg Press' });
  const legVisible = await legPress.evaluate(el => getComputedStyle(el).display !== 'none');
  if (!legVisible) {
    await row1.locator('.ex-sel-more').click();
    await page.waitForTimeout(100);
  }
  await legPress.click();
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const choices2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_ex_choices') || '{}'));
  check('Second scenario: Leg Press persisted', choices2['Barbell Squat'] === 'Leg Press');

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F6 Exercise Pool Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();
