// P3: auto prehab insertion — pain-flagged joints get prehab prepended in generated programs.
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');
const URL = 'file://E:/MoS/tools/training_tool.html';
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } }
async function regenerate(page) {
  const back3 = page.locator('#backToSplitBtn');
  if (await back3.isVisible()) await back3.click();
  else await page.click('#changeSplitBtn');
  await page.waitForSelector('#step2.active');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
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

  // Onboard: intermediate / hypertrophy / 3 days / moderate
  await page.fill('#userName', 'PH');
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

  // T1: baseline — no pain flags, no prehab
  const prog0 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));
  check('T1 baseline day0 ex0 = Barbell Squat', prog0.days[0].ex[0].n === 'Barbell Squat');
  const prehabCount0 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')).days.reduce((s, d) => s + d.ex.filter(e => e.prehab).length, 0));
  check('T1 no prehab without pain flags', prehabCount0 === 0);

  // T2: seed Lateral Raise yellow (shoulder) -> regenerate -> Band Pull-Apart prepended, first, 2 sets RPE 4
  await page.evaluate(() => localStorage.setItem('mos_pain_flags', JSON.stringify({ 'Lateral Raise': 'yellow' })));
  try {
    await regenerate(page);
  } catch (e) {
    console.log('  STEP BEFORE CRASH: ' + (await page.evaluate(() => document.querySelector('.step.active') ? document.querySelector('.step.active').id : 'none')));
    console.log('  ERRORS SO FAR: ' + errs.join(' | '));
    throw e;
  }
  const prog1 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));
  const p1 = prog1.days[0].ex[0];
  check('T2 shoulder yellow -> day0 ex0 = Band Pull-Apart', p1.n === 'Band Pull-Apart');
  check('T2 prehab flags set', p1.prehab === true && p1.prehabJoint === 'shoulder');
  check('T2 2 sets + targetRpe 4', p1.sets === 2 && p1.targetRpe === 4);
  const bpaDays = prog1.days.filter(d => d.ex.filter(e => e.n === 'Band Pull-Apart').length === 1).length;
  check('T2 exactly one Band Pull-Apart per shoulder-using day', bpaDays === prog1.days.filter(d => !d.restDay).length);
  const wrongPrehab = prog1.days.some(d => d.ex.some(e => e.prehab && e.n !== 'Band Pull-Apart'));
  check('T2 no other prehab exercises inserted', !wrongPrehab);
  const benchStill = prog1.days[0].ex.some(e => e.n === 'Lateral Raise');
  check('T2 Lateral Raise still present', benchStill);

  // T3: chip + reason on the rendered card
  await page.click('#saveProgBtn');
  await page.waitForSelector('#step35.active');
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForTimeout(400);
  const card0 = page.locator('#exCards .ex-card').first();
  const chipText = await card0.locator('.prehab-chip').textContent();
  check('T3 prehab chip shown on first card', chipText && chipText.trim() === '⚠ Prehab');
  const chipCount = await card0.locator('.prehab-chip').count();
  check('T3 exactly one chip on prehab card', chipCount === 1);
  const suggText = await card0.locator('.suggest-box').first().textContent();
  check('T3 prehab reason shown in suggest box', !!suggText && suggText.indexOf('Prehab:') >= 0);

  // T4: red flags — rehab-blocked behavior unchanged, red joint still gets prehab
  await page.evaluate(() => localStorage.setItem('mos_pain_flags', JSON.stringify({ 'Lateral Raise': 'red' })));
  await regenerate(page);
  const prog2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));
  check('T4 red shoulder -> prehab still prepended', prog2.days[0].ex[0].n === 'Band Pull-Apart' && prog2.days[0].ex[0].prehab === true);
  check('T4 flagged exercise not removed', prog2.days[0].ex.some(e => e.n === 'Lateral Raise'));
  await page.click('#saveProgBtn');
  await page.waitForSelector('#step35.active');
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForTimeout(400);
  const lrCard = page.locator('#exCards .ex-card', { hasText: 'Lateral Raise' }).first();
  const lrWarn = await lrCard.locator('.safety-badge.danger').count();
  const lrBlock = await lrCard.locator('.safety-block').count();
  check('T4 red exercise shows rehab-blocked warning', lrWarn === 1 && lrBlock === 1);

  // T5: cleared flags -> no prehab
  await page.evaluate(() => localStorage.removeItem('mos_pain_flags'));
  await regenerate(page);
  const prehabCount5 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')).days.reduce((s, d) => s + d.ex.filter(e => e.prehab).length, 0));
  check('T5 clearing flags removes prehab', prehabCount5 === 0);
  const prog5 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));
  check('T5 day0 ex0 back to Barbell Squat', prog5.days[0].ex[0].n === 'Barbell Squat');

  check('No page errors', errs.length === 0);
  if (errs.length) console.log('  ERRORS: ' + errs.join(' | '));
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH: ' + e.message); process.exit(2); });
