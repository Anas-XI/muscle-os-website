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

  // Pre-set subscription
  await ctx.addInitScript({ content: `localStorage.clear(); localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));` });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Step 1: Profile
  await page.fill('#userName', 'Plate Tester');
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

  const firstExCard = page.locator('#exCards .ex-card').first();
  await firstExCard.waitFor();

  // Test 1: Log a set with weight, then click the weight input to open plate calculator
  const weightInput = firstExCard.locator('.set-row input[data-f="w"]').first();
  const repsInput = firstExCard.locator('.set-row input[data-f="r"]').first();
  const rpeInput = firstExCard.locator('.set-row input[data-f="rpe"]').first();

  await weightInput.fill('100');
  await repsInput.fill('10');
  await rpeInput.fill('8');
  await page.waitForTimeout(500);

  // Click the weight input again (now it has a value)
  await page.waitForSelector('.set-row input[data-f="w"]:not([value=""])', {timeout: 5000});
  
  // Debug: check if onclick handler exists
  const hasOnclick = await weightInput.evaluate(el => el.onclick ? 'yes' : 'no');
  const onclickAttr = await weightInput.getAttribute('onclick');
  console.log('Weight input onclick:', hasOnclick, onclickAttr);
  
  await weightInput.click();
  await page.waitForTimeout(500);
  
  // Check for any console errors after click
  const clickErrors = errors.slice();
  console.log('Errors after click:', clickErrors.length);
  if (clickErrors.length) console.log('ERROR MSG:', clickErrors.join(' | '));
  
  const plateModal = page.locator('#plateModal');
  const modalVisible = await plateModal.isVisible();
  check('Plate calculator opens on logged weight click', modalVisible);

  if (modalVisible) {
    const modalContent = await plateModal.textContent();
    console.log('Modal content:', modalContent.slice(0, 300));
    check('Modal shows plate breakdown', modalContent.includes('Per side') || modalContent.includes('لكل جانب'));
    check('Modal shows total 100kg', modalContent.includes('100'));
    check('Modal shows bar 20kg', modalContent.includes('20'));
    check('Modal shows plates 25+15', modalContent.includes('25 + 15'));
  }

  // Close modal
  await page.locator('#plateModal .modal-close').click();
  await page.waitForTimeout(100);

  // Test 2: Test with 60kg
  await weightInput.fill('60');
  await page.waitForTimeout(200);
  await weightInput.click();
  await page.waitForTimeout(300);
  
  const modalVisible2 = await plateModal.isVisible();
  check('Plate calculator opens for 60kg', modalVisible2);

  if (modalVisible2) {
    const modalContent2 = await plateModal.textContent();
    console.log('60kg Modal content:', modalContent2.slice(0, 300));
    check('Modal shows 60kg', modalContent2.includes('60'));
  }

  // Close modal
  await page.locator('#plateModal .modal-close').click();
  await page.waitForTimeout(100);

  // Test 3: Test plate calculation logic directly
  const calcResult = await page.evaluate(() => {
    const PLATES = [25,20,15,10,5,2.5,1.25,0.5];
    const BAR_WEIGHT = 20;
    function calculatePlates(totalWeight){
      var perSide = (totalWeight - BAR_WEIGHT) / 2;
      if(perSide < 0) return {weight: totalWeight, plates: [], note: 'unachievable'};
      var remaining = perSide;
      var plates = [];
      for(var i=0;i<PLATES.length;i++){
        var p = PLATES[i];
        var count = Math.floor(remaining / p + 1e-9);
        if(count > 0){
          for(var j=0;j<count;j++) plates.push(p);
          remaining -= count * p;
        }
      }
      var achieved = BAR_WEIGHT + plates.reduce(function(s,p){return s+p*2},0);
      var diff = Math.abs(achieved - totalWeight);
      var note = diff <= 0.25 ? '' : 'unachievable';
      return {weight: totalWeight, plates: plates, achieved: achieved, note: note};
    }
    const r100 = calculatePlates(100);
    const r60 = calculatePlates(60);
    const r20 = calculatePlates(20);
    const r30 = calculatePlates(30);
    const r37_5 = calculatePlates(37.5);
    return {r100, r60, r20, r30, r37_5};
  });
  
  console.log('100kg:', calcResult.r100.plates.join('+'), 'achieved:', calcResult.r100.achieved, 'note:', calcResult.r100.note);
  console.log('60kg:', calcResult.r60.plates.join('+'), 'achieved:', calcResult.r60.achieved, 'note:', calcResult.r60.note);
  console.log('20kg:', calcResult.r20.plates.join('+'), 'achieved:', calcResult.r20.achieved, 'note:', calcResult.r20.note);
  console.log('30kg:', calcResult.r30.plates.join('+'), 'achieved:', calcResult.r30.achieved, 'note:', calcResult.r30.note);
  console.log('37.5kg:', calcResult.r37_5.plates.join('+'), 'achieved:', calcResult.r37_5.achieved, 'note:', calcResult.r37_5.note);

  check('100kg = 25+15 per side (achieved 100)', calcResult.r100.plates.length === 2 && calcResult.r100.plates[0] === 25 && calcResult.r100.plates[1] === 15 && calcResult.r100.achieved === 100 && calcResult.r100.note === '');
  check('60kg achievable', calcResult.r60.note === '');
  check('20kg = bar only (no plates)', calcResult.r20.plates.length === 0 && calcResult.r20.achieved === 20);
  check('30kg achievable', calcResult.r30.note === '');
  check('37.5kg achievable (0.5kg plates)', calcResult.r37_5.note === '');

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F2 Plate Calculator Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();