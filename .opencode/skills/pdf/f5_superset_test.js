const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

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
  `});

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('#userName', 'SS Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  await page.click('#saveProgBtn');
  await page.waitForTimeout(400);
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForSelector('#dayTabs .day-tab');
  await page.waitForSelector('#exCards .ex-card');

  // ── Test 1: normal mode baseline ──
  const normCards = await page.locator('#exCards .ex-card').count();
  check('Normal mode: ' + normCards + ' ex-cards', normCards >= 4);
  const ssCardsOff = await page.locator('#exCards .superset-card').count();
  check('No superset cards initially', ssCardsOff === 0);
  const toggleLblOff = await page.locator('#supersetToggleLabel').textContent();
  check('Toggle shows off state', toggleLblOff.trim() === 'Superset');

  // ── Test 2: toggle on → paired cards (antagonist pairing) ──
  await page.click('#supersetToggle');
  await page.waitForTimeout(300);
  const expectedPairs = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    return window.__ssBuildPairs(prog.days[0].ex).filter(p => p.length === 2).length;
  });
  const ssCards = await page.locator('#exCards .superset-card').count();
  check('Superset: ' + ssCards + ' paired cards (expect ' + expectedPairs + ')', ssCards === expectedPairs);
  const normalWithSS = await page.locator('#exCards .ex-card:not(.superset-card)').count();
  check('Unpaired exercises render as normal cards (' + normalWithSS + ')', normalWithSS === 6 - expectedPairs * 2);
  const toggleLblOn = await page.locator('#supersetToggleLabel').textContent();
  check('Toggle shows on state', toggleLblOn.trim() === 'Superset ON');
  const firstCard = page.locator('#exCards .superset-card').first();
  const colsA = await firstCard.locator('.ss-title.a').count();
  const colsB = await firstCard.locator('.ss-title.b').count();
  check('Pair card has A + B titles', colsA === 1 && colsB === 1);
  const restTimers = await firstCard.locator('.rest-timer').count();
  const restSecs = await firstCard.locator('.rest-timer').first().getAttribute('data-seconds');
  check('Pair card has single shared 90s timer', restTimers === 1 && restSecs === '90');
  const colLoggers = await firstCard.locator('.set-log-area').count();
  check('Pair card has 2 loggers (A/B columns)', colLoggers === 2);
  const lblA = await firstCard.locator('.ss-col.a .set-row .set-lbl').first().textContent();
  check('A column labels prefixed A (' + lblA.trim() + ')', lblA.trim().startsWith('A'));

  // ── Test 3: log in both columns → 2 eids in K.LG ──
  const aCol = firstCard.locator('.ss-col.a .set-row:not([data-wu])').first();
  const bCol = firstCard.locator('.ss-col.b .set-row:not([data-wu])').first();
  await aCol.locator('input[data-f="w"]').fill('100');
  await aCol.locator('input[data-f="r"]').fill('10');
  await aCol.locator('input[data-f="rpe"]').fill('8');
  await bCol.locator('input[data-f="w"]').fill('70');
  await bCol.locator('input[data-f="r"]').fill('12');
  await bCol.locator('input[data-f="rpe"]').fill('8');
  await page.waitForTimeout(500);
  const logInfo = await page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem('mos_logs'));
    const today = new Date().toISOString().split('T')[0];
    const entry = logs[today] || {};
    return { eids: Object.keys(entry), sets: Object.keys(entry).map(k => entry[k].sets) };
  });
  check('Two eids logged today', logInfo.eids.length === 2);
  const pairNames = await firstCard.evaluate(el => {
    const a = el.querySelector('.ss-title.a .ex-name');
    const b = el.querySelector('.ss-title.b .ex-name');
    const clean = (t) => t ? t.textContent.replace(/^\s*\d+\.\s*/, '').replace(/\s*▶\s*$/, '').trim() : '';
    return { a: clean(a), b: clean(b) };
  });
  check('Eids belong to the pair (A+B)', logInfo.eids.every(eid => {
    const en = eid.split('__')[1];
    return en === pairNames.a || en === pairNames.b;
  }));
  check('A logged 100x10@8', logInfo.sets[0] && logInfo.sets[0][0] && parseFloat(logInfo.sets[0][0].w) === 100);
  check('B logged 70x12@8', logInfo.sets[1] && logInfo.sets[1][0] && parseFloat(logInfo.sets[1][0].w) === 70 && parseInt(logInfo.sets[1][0].r) === 12);

  // ── Test 4: persistence + per-day scope ──
  const suStored = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_supersets')));
  check('mos_supersets persisted {0:true}', suStored && suStored[0] === true);
  await page.click('#dayTabs .day-tab >> nth=1');
  await page.waitForTimeout(300);
  const ssOnDay2 = await page.locator('#exCards .superset-card').count();
  check('Day 2 not superset (0 paired cards)', ssOnDay2 === 0);
  await page.click('#dayTabs .day-tab >> nth=0');
  await page.waitForTimeout(300);
  const ssBackDay1 = await page.locator('#exCards .superset-card').count();
  check('Day 1 back to superset', ssBackDay1 === expectedPairs);

  // ── Test 5: toggle off → original cards, logs intact ──
  await page.click('#supersetToggle');
  await page.waitForTimeout(300);
  const ssOff = await page.locator('#exCards .superset-card').count();
  const normBack = await page.locator('#exCards .ex-card').count();
  check('Toggle off: normal cards restored', ssOff === 0 && normBack === normCards);
  const wVal = await page.locator('#exCards .ex-card .set-row:not([data-wu]) input[data-f="w"]').first().inputValue();
  check('Logged value survives toggle off (' + wVal + ')', parseFloat(wVal) === 100);
  const suOff = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_supersets')));
  check('Toggle off persisted {0:false}', suOff && suOff[0] === false);

  // ── Console errors ──
  if (errors.length) { fail++; console.log('FAIL console errors:', JSON.stringify(errors)); }
  else { pass++; console.log('PASS no console errors'); }

  console.log('=== F5 Superset Mode Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();