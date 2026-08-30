// Playwright test: antagonist (opposite muscle group) superset pairing
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
  `});

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // ── Unit checks of the pairing engine (pure JS via page) ──
  const unit = await page.evaluate(() => {
    const B = window.__ssBuildPairs;
    const P = window.__ssPoolOf;
    const mk = (names) => names.map(n => ({ n, s: 3, r: [10, 10], rpe: 7 }));
    const out = [];
    const pairsOf = (exs) => B(exs).map(p => p.length === 2 ? [p[0].e.n, p[1].e.n] : [p[0].e.n]);
    out.push({ t: 'chest+back split', p: pairsOf(mk(['Bench Press','Barbell Row','Incline Chest Press','Lat Pulldown'])) });
    out.push({ t: 'legs+arms split', p: pairsOf(mk(['Barbell Squat','Leg Curl','Bicep Curl','Triceps Pushdown','Calf Raise'])) });
    out.push({ t: 'shoulders rear/front', p: pairsOf(mk(['Shoulder Press','Rear Delt Flies','Lateral Raise'])) });
    out.push({ t: 'same-muscle leftovers', p: pairsOf(mk(['Calf Raise','Calf Raise','Plank','Plank'])) });
    out.push({ t: 'cross-muscle leftovers are singles', p: pairsOf(mk(['Calf Raise','Plank'])) });
    out.push({ t: 'custom ex pool fallback', p: pairsOf(mk(['Bench Press','My Custom Lift'])) });
    out.push({ t: 'pools', chest: P({ n: 'Bench Press' }), quads: P({ n: 'Barbell Squat' }), null_: P({ n: 'My Custom Lift' }) });
    return out;
  });

  const u0 = unit[0];
  console.log('DEBUG u0.p:', JSON.stringify(u0.p));
  check('Unit: chest+back -> (Bench,Row)+(Incline Chest Press,Lat Pulldown)', u0.p.length === 2 && u0.p[0].join('|') === 'Bench Press|Barbell Row' && u0.p[1].join('|') === 'Incline Chest Press|Lat Pulldown');
  const u1 = unit[1];
  check('Unit: legs+arms -> (Squat,Leg Curl) + (Curl,Pushdown) + Calf single', u1.p.length === 3 && u1.p[0].join('|') === 'Barbell Squat|Leg Curl' && u1.p[1].join('|') === 'Bicep Curl|Triceps Pushdown' && u1.p[2].length === 1 && u1.p[2][0] === 'Calf Raise');
  const u2 = unit[2];
  check('Unit: Shoulder Press paired with Rear Delt, Lateral single', u2.p.some(pr => pr.join('|') === 'Shoulder Press|Rear Delt Flies') && u2.p.some(pr => pr.length === 1 && pr[0] === 'Lateral Raise'));
  const u3 = unit[3];
  check('Unit: same-muscle leftovers pair', u3.p.length === 2 && u3.p[0].join('|') === 'Calf Raise|Calf Raise' && u3.p[1].join('|') === 'Plank|Plank');
  const u4 = unit[4];
  check('Unit: cross-muscle leftovers render as singles', u4.p.length === 2 && u4.p[0].length === 1 && u4.p[1].length === 1);
  const u5 = unit[5];
  check('Unit: custom exercise never pairs', u5.p.length === 2 && u5.p[0].length === 1 && u5.p[1].length === 1);
  const u6 = unit[6];
  check('Unit: poolOf resolves', u6.chest === 'chest' && u6.quads === 'quads' && u6.null_ === null);

  // ── Full bootstrap → toggle superset on Full Body day 1 ──
  await page.fill('#userName', 'ANT Tester');
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
  await page.waitForSelector('#exCards .ex-card');

  const dayEx = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')).days[0].ex.map(e => e.n));
  check('Day 1 has 6 exercises', dayEx.length === 6);

  await page.click('#supersetToggle');
  await page.waitForTimeout(400);

  // ── DOM-level antagonist assertions ──
  const cards = await page.evaluate(() => {
    const out = { ss: 0, normal: 0 };
    document.querySelectorAll('#exCards .ex-card').forEach(c => {
      if (c.classList.contains('superset-card')) out.ss++;
      else out.normal++;
    });
    return out;
  });
  check('2 superset cards on day 1', cards.ss === 2);
  check('2 normal cards (no antagonist available)', cards.normal === 2);

  // ── Authoritative pairing from program data + engine ──
  const pairInfo = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const B = window.__ssBuildPairs;
    const P = window.__ssPoolOf;
    return B(prog.days[0].ex).map(p => p.length === 2 ? [P(p[0].e), P(p[1].e), p[0].e.n, p[1].e.n] : [P(p[0].e), null, p[0].e.n, null]);
  });
  console.log('DEBUG pairInfo:', JSON.stringify(pairInfo));
  const pairs = pairInfo.filter(p => p[1] !== null);
  const singles = pairInfo.filter(p => p[1] === null);
  const isOpposite = (a, b) =>
    (a === 'chest' && b === 'back') || (a === 'back' && b === 'chest') ||
    (a === 'quads' && b === 'hamstrings') || (a === 'hamstrings' && b === 'quads') ||
    (a === 'biceps' && b === 'triceps') || (a === 'triceps' && b === 'biceps');
  check('Every superset pair is antagonist (opposite muscle groups)', pairs.length === 2 && pairs.every(p => isOpposite(p[0], p[1])));
  check('Has a chest+back pair (not 2 chest exercises)', pairs.some(p => (p[0] === 'chest' && p[1] === 'back') || (p[0] === 'back' && p[1] === 'chest')));
  check('Has a quads+hamstrings pair', pairs.some(p => (p[0] === 'quads' && p[1] === 'hamstrings') || (p[0] === 'hamstrings' && p[1] === 'quads')));
  check('Singles are shoulders + triceps (no partners available)', singles.length === 2 && singles.map(p => p[0]).sort().join(',') === 'shoulders,triceps');

  // ── Logging still works across the pair ──
  const firstCard = page.locator('#exCards .superset-card').first();
  await firstCard.locator('.ss-col.a .set-row:not([data-wu]) input[data-f="w"]').first().fill('100');
  await firstCard.locator('.ss-col.a .set-row:not([data-wu]) input[data-f="r"]').first().fill('10');
  await firstCard.locator('.ss-col.b .set-row:not([data-wu]) input[data-f="w"]').first().fill('60');
  await firstCard.locator('.ss-col.b .set-row:not([data-wu]) input[data-f="r"]').first().fill('12');
  await page.waitForTimeout(400);
  const eids = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('mos_logs') || '{}'))[new Date().toISOString().split('T')[0]] || {}));
  check('2 eids logged (one per muscle group)', eids.length === 2);
  check('Eids match the pair A+B', eids.every(e => e.split('__')[1] === pairs[0][2] || e.split('__')[1] === pairs[0][3]));

  // ── Toggle off restores 6 normal cards ──
  await page.click('#supersetToggle');
  await page.waitForTimeout(400);
  const backToNormal = await page.locator('#exCards .ex-card').count();
  const ssGone = await page.locator('#exCards .superset-card').count();
  check('Toggle off -> 6 normal cards, 0 superset', backToNormal === 6 && ssGone === 0);

  if (errors.length) { fail++; console.log('FAIL console errors:', JSON.stringify(errors)); }
  else { pass++; console.log('PASS no console errors'); }

  console.log('=== F11 Antagonist Superset Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
