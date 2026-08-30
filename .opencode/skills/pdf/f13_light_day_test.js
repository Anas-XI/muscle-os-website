// Playwright test: P1 — recovery-based light day (red fatigue banner)
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
  await page.fill('#userName', 'P1 Tester');
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

  // ── Seed RED fatigue (today) + load history for every exercise so suggest weights exist ──
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('mos_fatigue_log', JSON.stringify({ [today]: { sleep: 3, stress: 3, doms: 3, nutrition: 3, cns: 3 } }));
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const hist = {};
    prog.days.forEach(d => {
      if (d.restDay) return;
      d.ex.forEach(e => {
        hist[e.n] = [{ date: '2026-07-15', w: 100, r: 10, rpe: 8, e1RM: 125 }];
      });
    });
    localStorage.setItem('mos_load_history', JSON.stringify(hist));
  });
  await page.click('#dayTabs .day-tab >> nth=0');
  await page.waitForTimeout(400);

  // ── Day 1: banner visible; normal weights captured ──
  const day1 = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const exs = prog.days[0].ex;
    const cards = [...document.querySelectorAll('#exCards .ex-card:not(.superset-card)')];
    const weights = cards.map(c => {
      const sv = c.querySelector('.suggest-val');
      return sv ? parseFloat(sv.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
    });
    return { banner: !!document.querySelector('#exCards .fat-light-banner'), weights, sets: exs.map(e => e.sets || 3) };
  });
  check('Red fatigue -> banner shown on day 1', day1.banner === true);
  check('Suggest weights exist (history seeded)', day1.weights.length === 6 && day1.weights.every(w => w > 0));
  const w0 = day1.weights;

  await page.click('#exCards .fat-light-btn[data-light="1"]');
  await page.waitForTimeout(400);

  const day1Light = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#exCards .ex-card:not(.superset-card)')];
    const weights = cards.map(c => {
      const sv = c.querySelector('.suggest-val');
      return sv ? parseFloat(sv.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
    });
    const rows = cards.map(c => c.querySelectorAll('.set-row:not([data-wu])').length);
    return { banner: !!document.querySelector('#exCards .fat-light-banner'), weights, rows };
  });
  check('Banner gone after Light Day', day1Light.banner === false);
  check('6 cards still rendered', day1Light.weights.length === 6);
  const ratios = day1Light.weights.map((w, i) => w / w0[i]);
  check('Every suggested weight ~80% (ratio in 0.70-0.90)', ratios.every(r => r >= 0.70 && r <= 0.90) && day1Light.weights.every((w, i) => w < w0[i]));
  check('One fewer set per exercise', day1Light.rows.every((r, i) => r === Math.max(1, day1.sets[i] - 1)));

  // ── Day 2: banner shows again (global red fatigue); Proceed keeps full load ──
  await page.click('#dayTabs .day-tab >> nth=1');
  await page.waitForTimeout(400);
  const day2Before = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const cards = [...document.querySelectorAll('#exCards .ex-card:not(.superset-card)')];
    const weights = cards.map(c => {
      const sv = c.querySelector('.suggest-val');
      return sv ? parseFloat(sv.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
    });
    return { banner: !!document.querySelector('#exCards .fat-light-banner'), weights, sets: prog.days[1].ex.map(e => e.sets || 3) };
  });
  check('Day 2 also shows banner (red fatigue)', day2Before.banner === true);

  await page.click('#exCards .fat-light-btn[data-light="0"]');
  await page.waitForTimeout(400);
  const day2After = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#exCards .ex-card:not(.superset-card)')];
    const weights = cards.map(c => {
      const sv = c.querySelector('.suggest-val');
      return sv ? parseFloat(sv.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
    });
    const rows = cards.map(c => c.querySelectorAll('.set-row:not([data-wu])').length);
    return { banner: !!document.querySelector('#exCards .fat-light-banner'), weights, rows };
  });
  check('Banner gone after Proceed as Planned', day2After.banner === false);
  check('Weights unchanged with Proceed (not 80%)', day2After.weights.every((w, i) => w === day2Before.weights[i]));
  check('Full (default 3-row) set count kept with Proceed', day2After.rows.every(r => r === 3));

  // ── Day 3: switching days does not leak light mode (session-local per day) ──
  await page.click('#dayTabs .day-tab >> nth=2');
  await page.waitForTimeout(400);
  const day3 = await page.evaluate(() => !!document.querySelector('#exCards .fat-light-banner'));
  check('Day 3 banner visible (light mode did not leak from day 1)', day3 === true);

  // ── Day 1 stays light after tab round-trip (session state held) ──
  await page.click('#dayTabs .day-tab >> nth=0');
  await page.waitForTimeout(400);
  const day1Back = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#exCards .ex-card:not(.superset-card)')];
    return {
      banner: !!document.querySelector('#exCards .fat-light-banner'),
      rows: cards.map(c => c.querySelectorAll('.set-row:not([data-wu])').length)
    };
  });
  check('Day 1 still light after tab round-trip', day1Back.banner === false && day1Back.rows.every((r, i) => r === Math.max(1, day1.sets[i] - 1)));

  if (errors.length) { fail++; console.log('FAIL console errors:', JSON.stringify(errors)); }
  else { pass++; console.log('PASS no console errors'); }

  console.log('=== F13 P1 Light-Day Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
