// P4: personalized weekly coach note — rule-based recap on History from logs only.
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');
const URL = 'file://E:/MoS/tools/training_tool.html';
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } }
function dISO(offset) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - offset);
  return d.toISOString().split('T')[0];
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

  // Onboard: intermediate / hypertrophy / 3 days / moderate -> fullbody_3 -> generate
  await page.fill('#userName', 'CN');
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
  await page.waitForTimeout(300);

  // T1: empty data -> start logging variant
  await page.click('#goToHistBtn');
  await page.waitForSelector('#step5.active');
  await page.waitForTimeout(300);
  const emptyNote = await page.locator('#coachNote').textContent();
  check('T1 empty -> start logging variant', !!emptyNote && emptyNote.indexOf('Start logging') >= 0);

  // Seed 2 weeks of logs: 5 sessions (6 expected = 3 train days x 2), bench +5kg e1RM, squat flat
  const benchHist = [{ date: dISO(10), w: 100, r: 5, rpe: 8, e1RM: 120 }, { date: dISO(2), w: 105, r: 5, rpe: 8, e1RM: 125 }];
  const squatHist = [{ date: dISO(9), w: 140, r: 5, rpe: 8, e1RM: 160 }, { date: dISO(1), w: 140, r: 5, rpe: 8, e1RM: 160 }];
  const logs = {};
  [1, 3, 5, 8, 11].forEach((off, i) => {
    logs[dISO(off)] = { ['Session ' + (i % 3) + '__Bench Press']: { sets: [{ w: 100 + i, r: 5 }] } };
  });
  await page.evaluate(([h, l]) => {
    localStorage.setItem('mos_load_history', JSON.stringify(h));
    localStorage.setItem('mos_logs', JSON.stringify(l));
  }, [Object.assign({ 'Bench Press': benchHist, 'Barbell Squat': squatHist }, {}), logs]);

  // Back to dashboard then re-enter history
  await page.click('#backToDashBtn');
  await page.waitForSelector('#step4.active');
  await page.click('#goToHistBtn');
  await page.waitForSelector('#step5.active');
  await page.waitForTimeout(300);
  const note = await page.locator('#coachNote').textContent();

  // T2: adherence 5 of 6 = 83%
  check('T2 adherence 5 of 6 sessions', note.indexOf('5 of 6') >= 0);
  check('T2 83% shown', note.indexOf('83%') >= 0);
  // T3: total sets
  check('T3 total sets 5', note.indexOf('Total: 5') >= 0);
  // T4: bench +5 kg e1RM
  check('T4 Bench Press mentioned', note.indexOf('Bench Press') >= 0);
  check('T4 +5 kg delta', note.indexOf('+5') >= 0 && note.indexOf('Bench Press +5') >= 0);
  // T5: positive tone icon
  check('T5 positive tone', note.indexOf('💪') >= 0);
  // T6: next-week tip present
  check('T6 next-week tip', note.indexOf('Next week') >= 0);

  // T7: pain flags -> pain sentence instead of tip
  await page.evaluate(() => localStorage.setItem('mos_pain_flags', JSON.stringify({ 'Lateral Raise': 'yellow' })));
  await page.click('#backToDashBtn');
  await page.waitForSelector('#step4.active');
  await page.click('#goToHistBtn');
  await page.waitForSelector('#step5.active');
  await page.waitForTimeout(300);
  const note2 = await page.locator('#coachNote').textContent();
  check('T7 pain flag sentence', note2.indexOf('Pain flags active: 1 exercises (Lateral Raise)') >= 0);
  check('T7 tip replaced by pain', note2.indexOf('Next week') < 0);

  // T8: i18n keys exist in both en + ar blocks (parse source: each key appears twice)
  const fs = require('fs');
  const src = fs.readFileSync(URL.replace('file://', ''), 'utf8');
  const keys8 = ['coach_note:', 'cn_adh:', 'cn_pr:', 'cn_pain:', 'cn_next:', 'cn_next_good:', 'cn_next_ok:', 'cn_next_warn:', 'cn_empty:'];
  const allKeys = keys8.every(k => (src.split(k).length - 1) >= 2);
  check('T8 i18n en+ar keys present', allKeys);

  check('No page errors', errs.length === 0);
  if (errs.length) console.log('  ERRORS: ' + errs.join(' | '));
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH: ' + e.message); process.exit(2); });
