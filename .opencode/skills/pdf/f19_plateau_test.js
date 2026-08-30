// Playwright test: P7 — plateau detection -> auto-meso suggestion
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

  // ── Bootstrap a full 3-day program ──
  await page.fill('#userName', 'P7 Tester');
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

  // Find a main lift in the program
  const mainInfo = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const lifts = ['Barbell Squat','Bench Press','Deadlift Variation','Squat','Deadlift'];
    for (let di = 0; di < prog.days.length; di++) {
      const d = prog.days[di];
      if (d.restDay) continue;
      for (const e of d.ex) {
        if (lifts.includes(e.n)) return { name: e.n, di };
      }
    }
    return null;
  });
  check('Program contains a main lift', mainInfo !== null);
  if (!mainInfo) { await browser.close(); console.log('RESULT ' + pass + ' passed, ' + fail + ' failed'); process.exit(1); }

  // Seed stagnant history for the main lift (3 sessions, 0% gain, RPE 8-9)
  await page.evaluate((m) => {
    const hist = {
      [m.name]: [
        { date: '2026-07-01', w: 60, r: 8, rpe: 8, e1RM: 75 },
        { date: '2026-07-04', w: 60, r: 8, rpe: 8, e1RM: 75 },
        { date: '2026-07-07', w: 60, r: 8, rpe: 9, e1RM: 75 }
      ]
    };
    localStorage.setItem('mos_load_history', JSON.stringify(hist));
  }, mainInfo);

  // Re-render dashboard (History -> back re-renders since P5 fix)
  await page.click('#goToHistBtn');
  await page.waitForTimeout(300);
  await page.click('#backToDashBtn');
  await page.waitForTimeout(300);

  // T1: plateau card visible with the correct exercise name
  const card1 = await page.evaluate(() => {
    const card = document.getElementById('plateauCard');
    const text = card.textContent;
    return { visible: card.style.display !== 'none' && text.trim().length > 0, text };
  });
  check('T1 plateau card visible', card1.visible === true);
  check('T1 card names the main lift', card1.text.includes(mainInfo.name));
  check('T1 card shows plateau title', card1.text.toLowerCase().includes('plateau'));

  // T2: three action buttons
  const btnState = await page.evaluate(() => ({
    swap: document.querySelectorAll('#plateauCard .pc-btn.swap').length,
    intense: document.querySelectorAll('#plateauCard .pc-btn.intense').length,
    deload: document.querySelectorAll('#plateauCard .pc-btn.deload').length
  }));
  check('T2 swap button present', btnState.swap === 1);
  check('T2 intensification button present', btnState.intense === 1);
  check('T2 deload button present', btnState.deload === 1);

  // T3: swap button opens that exercise's swap panel
  await page.click('#plateauCard .pc-btn.swap');
  await page.waitForTimeout(300);
  const swapState = await page.evaluate((m) => {
    const cards = document.querySelectorAll('#exCards .ex-card');
    let found = null;
    cards.forEach(c => {
      if (c.textContent.includes(m.name)) found = c;
    });
    return {
      panelOpen: !!document.querySelector('#exCards .swap-panel.open'),
      chipCount: found ? found.querySelectorAll('.swap-chip').length : 0,
      activeTab: document.querySelector('#dayTabs .day-tab.active') ? document.querySelector('#dayTabs .day-tab.active').textContent : ''
    };
  }, mainInfo);
  check('T3 swap panel opened for main lift day', swapState.panelOpen === true);
  check('T3 swap chips listed', swapState.chipCount > 0);
  check('T3 correct day tab active', swapState.activeTab.includes('Day ' + (mainInfo.di + 1)));

  // T4: deload button marks deload today
  await page.click('#goToHistBtn');
  await page.waitForTimeout(300);
  await page.click('#backToDashBtn');
  await page.waitForTimeout(300);
  await page.click('#plateauCard .pc-btn.deload');
  await page.waitForTimeout(300);
  const dt = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_deload_tracker') || '{}'));
  check('T4 deload marked today', dt.lastDeload === new Date().toISOString().split('T')[0]);
  check('T4 deload sessions reset', dt.sessions === 0);

  // T5: intensification button jumps to meso config with phase preselected
  await page.click('#goToHistBtn');
  await page.waitForTimeout(300);
  await page.click('#backToDashBtn');
  await page.waitForTimeout(300);
  await page.click('#plateauCard .pc-btn.intense');
  await page.waitForTimeout(300);
  const meso = await page.evaluate(() => ({
    step35: document.getElementById('step35').classList.contains('active'),
    type: document.getElementById('mesoType').value,
    weeks: document.getElementById('mesoWeeks').value
  }));
  check('T5 jumped to meso config (step35)', meso.step35 === true);
  check('T5 meso type strength preselected', meso.type === 'strength');
  check('T5 10 weeks (intensification phase) preselected', meso.weeks === '10');

  // T6: no plateau when last session RPE < 8
  await page.evaluate((m) => {
    const hist = JSON.parse(localStorage.getItem('mos_load_history'));
    hist[m.name][2].rpe = 7;
    localStorage.setItem('mos_load_history', JSON.stringify(hist));
  }, mainInfo);
  await page.click('#mesoBackBtn').catch(() => {});
  await page.evaluate(() => {
    // navigate back to dashboard directly via stored state render
    document.getElementById('startTrainingBtn').click();
  });
  await page.waitForSelector('#step4.active');
  await page.click('#goToHistBtn');
  await page.waitForTimeout(300);
  await page.click('#backToDashBtn');
  await page.waitForTimeout(300);
  const card2 = await page.evaluate(() => {
    const card = document.getElementById('plateauCard');
    return card.style.display === 'none' || card.textContent.trim() === '';
  });
  check('T6 card hidden when RPE < 8', card2 === true);

  check('No page errors', errors.length === 0);
  if (errors.length) errors.forEach(e => console.log('  console:', e));

  await browser.close();
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0 || errors.length) process.exit(1);
})().catch(e => { console.log('CRASH:', e.message); process.exit(2); });
