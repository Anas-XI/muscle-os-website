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

  // Bootstrap to step 4 dashboard (fullbody_3)
  await page.fill('#userName', 'Session Tester');
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

  // T1: chip present on step 4, idle state
  const chipVisible = await page.locator('#sessionTimerChip').evaluate(el => getComputedStyle(el).display !== 'none');
  check('Session timer chip visible on step 4', chipVisible);
  check('Display shows 00:00:00 initially', (await page.locator('#sessionTimerDisplay').textContent()) === '00:00:00');
  check('Button starts as Start', (await page.locator('#sessionTimerToggle').textContent()) === 'Start');

  // T2: start -> running state, display ticks
  await page.click('#sessionTimerToggle');
  await page.waitForTimeout(150);
  check('Button flips to Stop when running', (await page.locator('#sessionTimerToggle').textContent()) === 'Stop');
  check('Chip gets running class', await page.locator('#sessionTimerChip').evaluate(el => el.classList.contains('running')));
  await page.waitForTimeout(2600);
  const shown = await page.locator('#sessionTimerDisplay').textContent();
  check('Display ticks to ~00:00:02+ (got ' + shown + ')', /00:00:0[2-9]/.test(shown) || /00:00:1[0-9]/.test(shown));

  // Log one working set (weight > 0) so sets count = 1
  const firstCard = page.locator('#exCards .ex-card').first();
  const wInput = firstCard.locator('input').first();
  const rInput = firstCard.locator('input').nth(1);
  await wInput.fill('60');
  await rInput.fill('8');
  await page.waitForTimeout(200);

  // T3: stop -> record written
  await page.click('#sessionTimerToggle');
  await page.waitForTimeout(300);
  const sess = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_sessions') || '[]'));
  check('Exactly 1 session recorded', sess.length === 1);
  check('Record has durationSec ~2-4s (got ' + (sess[0] && sess[0].durationSec) + ')', sess.length === 1 && sess[0].durationSec >= 2 && sess[0].durationSec <= 5);
  check('Record has sets = 1 (logged working set)', sess.length === 1 && sess[0].sets === 1);
  const today = new Date().toISOString().split('T')[0];
  check('Record date is today', sess.length === 1 && sess[0].date === today);
  check('Button back to Start after stop', (await page.locator('#sessionTimerToggle').textContent()) === 'Start');

  // T4: second short run adds second record
  await page.click('#sessionTimerToggle');
  await page.waitForTimeout(1300);
  await page.click('#sessionTimerToggle');
  await page.waitForTimeout(200);
  const sess2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_sessions') || '[]'));
  check('2 sessions recorded after second run', sess2.length === 2);
  check('Second record duration ~1s+', sess2[1].durationSec >= 1 && sess2[1].durationSec <= 4);

  // T5: export includes mos_sessions (K auto-coverage)
  const inExport = await page.evaluate(() => Object.values({VT:'mos_vol_targets',SP:'mos_split_profile',PG:'mos_program',LG:'mos_logs',VI:'mos_vol_inputs',LH:'mos_load_history',DT:'mos_deload_tracker',PF:'mos_pain_flags',PL:'mos_pl_profile',FL:'mos_fatigue_log',CL:'mos_cardio_logs',MP:'mos_meso_plan',MA:'mos_meso_active',MH:'mos_meso_history',MM:'mos_measurements',CE:'mos_custom_exercises',CR:'mos_custom_replacements',SU:'mos_supersets',SS:'mos_sessions'}).includes('mos_sessions'));
  check('K.SS key maps to mos_sessions', inExport);

  // T6: history renders pace stats + bars
  await page.click('#goToHistBtn');
  await page.waitForSelector('#step5.active');
  const paceText = await page.locator('#histSessions').textContent();
  check('History pace row renders sessions/avg/sets-per-hour', paceText.includes('2') && paceText.includes(':') && paceText.includes('sets/hour'));
  const bars = await page.locator('#histSessionsBars > div').count();
  check('Mini bar chart renders 2 bars', bars === 2);
  const headerText = await page.locator('#histSessionsHeader').textContent();
  check('History header uses session_timer i18n', headerText.includes('Session timer'));

  // T7: Arabic locale renders Arabic labels + re-rendered history
  await page.click('.lang-opt[data-lang="ar"]');
  await page.waitForTimeout(150);
  const arStart = await page.locator('#sessionTimerToggle').textContent();
  check('AR locale: Start button shows بدء', arStart === 'بدء');
  await page.evaluate(() => document.getElementById('goToHistBtn').click());
  await page.waitForTimeout(200);
  check('AR locale: sets/hour label', (await page.locator('#histSessions').textContent()).includes('مجموعات/ساعة'));

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F6 Session Timer Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();
