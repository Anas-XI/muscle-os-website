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

  // Pre-set subscription + seeded history for Barbell Squat (so suggestions + warm-up rows exist)
  await ctx.addInitScript({ content: `
    localStorage.clear();
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
    localStorage.setItem('mos_load_history', JSON.stringify({'Barbell Squat':[{date:'2026-07-25',w:90,r:10,rpe:8,e1RM:114,day:'Full Body A'}]}));
  `});

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Step 1: Profile
  await page.fill('#userName', 'Wu Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');

  // Step 2: Choose split
  await page.waitForSelector('#splitGrid .split-card');
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');

  // Step 3: Save program
  await page.click('#saveProgBtn');
  await page.waitForTimeout(400);
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForSelector('#dayTabs .day-tab');
  await page.waitForSelector('#exCards .ex-card');

  const firstEx = page.locator('#exCards .ex-card').first();
  await firstEx.waitFor();

  // Read suggested work weight from suggest-val
  const suggText = await page.locator('#exCards .ex-card .suggest-val').first().textContent();
  const suggW = parseFloat(suggText);
  console.log('Suggested weight:', suggText, '->', suggW);
  check('Suggestion present (history seeded)', suggW > 0);

  // Warm-up rows present
  const wuRows = page.locator('.set-row[data-wu="1"]');
  const wuCount = await wuRows.count();
  console.log('Warm-up rows:', wuCount);
  check('3 warm-up rows for compound', wuCount === 3);

  // Prefill check: row 0 = 40% of suggested weight rounded to 2.5
  const wuPrefill0 = parseFloat(await wuRows.nth(0).locator('input[data-f="w"]').inputValue());
  const expPrefill0 = Math.round(suggW * 0.4 / 2.5) * 2.5;
  check('Warm-up row 0 prefill = 40% of suggestion (' + expPrefill0 + ')', wuPrefill0 === expPrefill0);
  const wuPrefill2 = parseFloat(await wuRows.nth(2).locator('input[data-f="w"]').inputValue());
  const expPrefill2 = Math.round(suggW * 0.8 / 2.5) * 2.5;
  check('Warm-up row 2 prefill = 80% of suggestion (' + expPrefill2 + ')', wuPrefill2 === expPrefill2);

  // Working rows start after warm-ups (divider present)
  const dividerCount = await page.locator('.wu-divider').count();
  check('Warm-up divider rendered', dividerCount > 0);

  // Fill warm-up row 0: 40 x 8 @ 6 (complete)
  const wuRow0 = wuRows.nth(0);
  await wuRow0.locator('input[data-f="w"]').fill('40');
  await wuRow0.locator('input[data-f="r"]').fill('8');
  await wuRow0.locator('input[data-f="rpe"]').fill('6');
  await page.waitForTimeout(400);

  // Warm-up completion must NOT auto-start the rest timer
  const rtStartVisible = await firstEx.locator('.rt-start').isVisible();
  check('Rest timer NOT auto-started by warm-up set', rtStartVisible);

  // K.LG: wu row has wu:true, working row not yet logged
  let lg = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_logs') || '{}'));
  const td = new Date().toISOString().split('T')[0];
  const eid = Object.keys(lg[td] || {})[0];
  console.log('Today eid:', eid);
  const sets = lg[td][eid].sets;
  console.log('Storage sets (after wu log):', JSON.stringify(sets));
  check('wu:true present on warm-up row in K.LG', sets[0] && sets[0].wu === true);

  // Fill working set row (first non-wu row): 80 x 10 @ 8
  const workRow = page.locator('#exCards .ex-card .set-row:not([data-wu])').first();
  await workRow.locator('input[data-f="w"]').fill('80');
  await workRow.locator('input[data-f="r"]').fill('10');
  await workRow.locator('input[data-f="rpe"]').fill('8');
  await page.waitForTimeout(800);

  // K.LG: working row must NOT have wu flag
  lg = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_logs') || '{}'));
  const lgSets = lg[td][eid].sets;
  console.log('Storage sets (after working log):', JSON.stringify(lgSets));
  check('Working row has no wu flag', lgSets.length > 3 && !lgSets[3].wu);
  check('wu placeholders aligned (3 wu rows + working)', lgSets[1] && lgSets[1].wu === true && lgSets[2] && lgSets[2].wu === true);

  // Working set completion SHOULD auto-start the timer
  const rtStartHidden = await firstEx.locator('.rt-start').isHidden();
  check('Rest timer auto-started by working set', rtStartHidden);

  // K.LH: only working set recorded (w:80 r:10), warm-up excluded (no w:40 entry)
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_load_history') || '{}'));
  const bs = hist['Barbell Squat'] || [];
  const hasWorking = bs.some(x => x.w === 80 && x.r === 10);
  const hasWu = bs.some(x => x.w === 40);
  console.log('Hist entries:', JSON.stringify(bs));
  check('History contains working 80x10', hasWorking);
  check('History excludes warm-up 40kg', !hasWu);

  // e1RM display still reflects seeded best (114), not polluted by warm-up
  const metaText = await firstEx.locator('.ex-meta').textContent();
  check('e1RM display from working-only history', metaText.includes('114'));

  // Volume summary: 2 sets total (1 wu + 1 working), warm-up marked
  const sumSets = await page.locator('#sumSets').textContent();
  const wuMark = await page.locator('.wu-sum-mark').textContent();
  console.log('Summary sets:', sumSets, '| wu mark:', wuMark);
  check('Volume counts both sets (2)', sumSets.trim() === '2');
  check('Warm-up marked in set count', wuMark.includes('warm-up'));

  // Volume excludes nothing: reps = 8 + 10 = 18
  const sumReps = await page.locator('#sumReps').textContent();
  check('Volume reps = 18', sumReps.trim() === '18');

  // No PR badge (80x10@8 -> e1RM 112 < seeded 114)
  const prBadges = await firstEx.locator('.pr-badge').count();
  if (prBadges) console.log('PR badge html:', await firstEx.locator('.pr-badge').first().evaluate(el => el.parentElement.innerHTML));
  const prDebug = await page.evaluate(() => {
    const h = JSON.parse(localStorage.getItem('mos_load_history')||'{}');
    const bs = h['Barbell Squat']||[];
    function rpePct(reps, rpe){ if(rpe<6||rpe>10)return null; return 100/(1+(reps+(10-rpe))/30); }
    function est1RM(w,r,rpe){ if(!w||!r||!rpe)return null; const p=rpePct(r,rpe); return p?Math.round(w/(p/100)*10)/10:null; }
    const best = bs.reduce(function(m,x){const e1=x.e1RM||est1RM(x.weight,x.reps,x.rpe);return e1>(m.e1||0)?{w:x.weight,r:x.reps,rpe:x.rpe,e1:e1}:m;},{w:0,r:0,rpe:0,e1:0});
    const sv = document.querySelector('#exCards .ex-card .suggest-val');
    const sw = sv?parseFloat(sv.textContent):0;
    const cur = est1RM(sw,9,8);
    return {hist:bs, best, suggW:sw, cur, meta: document.querySelector('.ex-meta').textContent};
  });
  console.log('PR debug:', JSON.stringify(prDebug));
  check('No PR badge from warm-up/working set', prBadges === 0);

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F3 Warm-up Set Logging Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();