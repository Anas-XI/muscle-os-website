const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const URL = 'file://E:/MoS/tools/training_tool.html';

const d = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().split('T')[0];

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

  const bootstrap = async () => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('#userName', 'F4 Tester');
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
  };

  const seedLogs = async (dayIdx, daysAgo) => {
    await page.evaluate(({ dayIdx, daysAgo }) => {
      const prog = JSON.parse(localStorage.getItem('mos_program'));
      const day = prog.days[dayIdx];
      const logs = JSON.parse(localStorage.getItem('mos_logs')) || {};
      const ds = new Date(Date.now() - daysAgo * 864e5).toISOString().split('T')[0];
      if (!logs[ds]) logs[ds] = {};
      day.ex.forEach((ex, i) => {
        logs[ds][day.n + '__' + ex.n] = { sets: [{ w: 60 + i * 5, r: 10, rpe: 8 }] };
      });
      localStorage.setItem('mos_logs', JSON.stringify(logs));
    }, { dayIdx, daysAgo });
  };

  const progData = async () => page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));

  // ── Test 1: no logs → no banner ──
  await bootstrap();
  const bannerHidden1 = await page.evaluate(() => {
    const b = document.getElementById('missedBanner');
    return !b || b.style.display === 'none' || getComputedStyle(b).display === 'none';
  });
  check('No logs → banner hidden', bannerHidden1);

  // ── Test 2: seed day 1 (2 days ago) → banner for day 2 ──
  await seedLogs(0, 2);
  await bootstrap();
  const prog1 = await progData();
  const day2Name = prog1.days[1].n;
  const bannerVis = await page.evaluate(() => {
    const b = document.getElementById('missedBanner');
    return b && getComputedStyle(b).display !== 'none';
  });
  check('Banner visible after missed day', bannerVis);
  const bannerText = await page.locator('#missedText').textContent();
  check('Banner mentions missed day name (' + day2Name + ')', bannerText.includes(day2Name));
  check('Banner mentions days ago', /days? ago|منذ/.test(bannerText));
  const activeTabIdx = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#dayTabs .day-tab'));
    return tabs.findIndex(t => t.classList.contains('active'));
  });
  check('Active tab unchanged (day 1)', activeTabIdx === 0);

  // ── Test 3: Do condensed ──
  await page.click('#missedCondensedBtn');
  await page.waitForTimeout(300);
  const bannerHidden2 = await page.evaluate(() => getComputedStyle(document.getElementById('missedBanner')).display === 'none');
  check('Banner hidden after condensed', bannerHidden2);
  const activeTabIdx2 = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#dayTabs .day-tab'));
    return tabs.findIndex(t => t.classList.contains('active'));
  });
  check('Switched to missed day (day 2)', activeTabIdx2 === 1);
  const chip = await page.locator('#dashHeader .makeup-chip').count();
  check('Makeup chip in header', chip === 1);

  // Per-exercise rows = ex.sets - 1
  const rowData = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const day = prog.days[1];
    const cards = Array.from(document.querySelectorAll('#exCards .ex-card'));
    return day.ex.map((ex, i) => {
      const rows = cards[i] ? Array.from(cards[i].querySelectorAll('.set-row:not([data-wu])')).length : -1;
      return { name: ex.n, sets: ex.sets, rows };
    });
  });
  let condensedOk = true;
  rowData.forEach(r => {
    const ok = r.rows === Math.max(1, r.sets - 1);
    if (!ok) condensedOk = false;
    check('Condensed: ' + r.name + ' rows=' + r.rows + ' (sets-' + r.sets + '-1)', ok);
  });
  check('All exercises 1 set fewer', condensedOk);

  const progAfter = await progData();
  check('Program not persisted (sets unchanged)', progAfter.days[1].ex[0].sets === prog1.days[1].ex[0].sets);

  // Chip follows day switch
  await page.click('#dayTabs .day-tab >> nth=2');
  await page.waitForTimeout(300);
  const chipGone = await page.locator('#dashHeader .makeup-chip').count();
  check('Chip gone on other day', chipGone === 0);
  await page.click('#dayTabs .day-tab >> nth=1');
  await page.waitForTimeout(300);
  const chipBack = await page.locator('#dashHeader .makeup-chip').count();
  check('Chip back on makeup day', chipBack === 1);

  // ── Test 4: Skip ──
  await seedLogs(0, 2);
  await bootstrap();
  const bannerVis2 = await page.evaluate(() => {
    const b = document.getElementById('missedBanner');
    return b && getComputedStyle(b).display !== 'none';
  });
  check('Banner visible again after reload', bannerVis2);
  await page.click('#missedSkipBtn');
  await page.waitForTimeout(200);
  const bannerHidden3 = await page.evaluate(() => getComputedStyle(document.getElementById('missedBanner')).display === 'none');
  check('Banner hidden after skip', bannerHidden3);
  const chipNone = await page.locator('#dashHeader .makeup-chip').count();
  check('No makeup chip after skip', chipNone === 0);

  // ── Console errors ──
  if (errors.length) {
    fail++;
    console.log('FAIL console errors:', JSON.stringify(errors));
  } else {
    pass++;
    console.log('PASS no console errors');
  }

  console.log('=== F4 Makeup Session Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();