// P5: body-trend feedback nudge — weight trend from measurements drives a dismissable dashboard nudge.
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');
const URL = 'file://E:/MoS/tools/training_tool.html';
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } }
function dISO(offset) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - offset);
  return d.toISOString().split('T')[0];
}
async function reenterDashboard(page) {
  await page.click('#goToHistBtn');
  await page.waitForSelector('#step5.active');
  await page.click('#backToDashBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForTimeout(300);
}
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

  // Onboard: hypertrophy / 3 days / moderate -> fullbody_3 -> training
  await page.fill('#userName', 'NU');
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
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  await page.click('#saveProgBtn');
  await page.waitForSelector('#step35.active');
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForTimeout(400);

  // T1: no measurements -> nudge hidden
  const vis1 = await page.locator('#nudgeBar').isVisible();
  check('T1 hidden without measurements', !vis1);

  // T2: seed 3 declining measurements spanning >=14 days -> nudge visible (hypertrophy)
  await page.evaluate((dates) => {
    localStorage.setItem('mos_measurements', JSON.stringify([
      { date: dates[0], weight: 82 }, { date: dates[1], weight: 81 }, { date: dates[2], weight: 79.9 }
    ]));
  }, [dISO(16), dISO(10), dISO(2)]);
  await reenterDashboard(page);
  const vis2 = await page.locator('#nudgeBar').isVisible();
  check('T2 nudge visible with declining trend', vis2);
  const txt2 = await page.locator('#nudgeText').textContent();
  check('T2 hypertrophy nudge text', txt2.indexOf('Weight trending down') >= 0 && txt2.indexOf('200 kcal') >= 0);
  const yellow = await page.locator('#nudgeBar').evaluate(el => !el.classList.contains('note'));
  check('T2 yellow tone (not note)', yellow);

  // T3: dismiss -> hidden
  await page.click('#nudgeDismissBtn');
  await page.waitForTimeout(150);
  const vis3 = await page.locator('#nudgeBar').isVisible();
  check('T3 dismissed -> hidden', !vis3);
  const storedRaw = await page.evaluate(() => localStorage.getItem('mos_nudge_dismiss'));
  check('T3 dismiss date stored', JSON.parse(storedRaw) === new Date().toISOString().split('T')[0]);

  // T4: re-render -> still gone (dismissed for the day)
  await reenterDashboard(page);
  const vis4 = await page.locator('#nudgeBar').isVisible();
  check('T4 gone after re-render', !vis4);

  // T5: strength goal + >1%/week gain -> note variant
  await page.evaluate((dates) => {
    localStorage.setItem('mos_nudge_dismiss', '');
    const vi = JSON.parse(localStorage.getItem('mos_vol_inputs') || '{}');
    vi.goal = 'strength';
    localStorage.setItem('mos_vol_inputs', JSON.stringify(vi));
    localStorage.setItem('mos_measurements', JSON.stringify([
      { date: dates[0], weight: 80 }, { date: dates[1], weight: 82 }, { date: dates[2], weight: 83.5 }
    ]));
  }, [dISO(16), dISO(10), dISO(2)]);
  await reenterDashboard(page);
  const vis5 = await page.locator('#nudgeBar').isVisible();
  check('T5 strength nudge visible on >1%/week gain', vis5);
  const txt5 = await page.locator('#nudgeText').textContent();
  check('T5 strength nudge text', txt5.indexOf('verify surplus') >= 0);
  const noteCls = await page.locator('#nudgeBar').evaluate(el => el.classList.contains('note'));
  check('T5 note tone class', noteCls);

  // T6: span <14 days -> no nudge
  await page.evaluate((dates) => {
    localStorage.setItem('mos_nudge_dismiss', '');
    const vi = JSON.parse(localStorage.getItem('mos_vol_inputs') || '{}');
    vi.goal = 'hypertrophy';
    localStorage.setItem('mos_vol_inputs', JSON.stringify(vi));
    localStorage.setItem('mos_measurements', JSON.stringify([
      { date: dates[0], weight: 82 }, { date: dates[1], weight: 81 }, { date: dates[2], weight: 79.9 }
    ]));
  }, [dISO(4), dISO(2), dISO(0)]);
  await reenterDashboard(page);
  const vis6 = await page.locator('#nudgeBar').isVisible();
  check('T6 no nudge under 14-day span', !vis6);

  check('No page errors', errs.length === 0);
  if (errs.length) console.log('  ERRORS: ' + errs.join(' | '));
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH: ' + e.message); process.exit(2); });
