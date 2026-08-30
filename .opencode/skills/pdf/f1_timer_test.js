const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');
const fs = require('fs');
const path = require('path');

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

  // Pre-set subscription to bypass overlay
  await ctx.addInitScript({ content: `localStorage.clear(); localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));` });

  // Mock AudioContext and navigator.vibrate before page load
  await ctx.addInitScript({ content: `
    window.AudioContext = class MockAudioContext {
      constructor() { this.currentTime = 0; this.destination = {}; }
      createOscillator() { return { type: 'sine', frequency: {value: 880}, connect: () => {}, start: () => {}, stop: () => {} }; }
      createGain() { return { gain: {value: 0.1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}}, connect: () => {} }; }
    };
    window.webkitAudioContext = window.AudioContext;
    navigator.vibrate = (pattern) => { window.__vibrateCalled = pattern; return true; };
  ` });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Step 1: Profile
  await page.fill('#userName', 'Timer Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');

  // Step 2: Choose split - Full Body 3-day
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

  // Now on training screen (step 4), day 0 rendered
  const firstExCard = page.locator('#exCards .ex-card').first();
  await firstExCard.waitFor();

  // Get the exercise name
  const exName = await firstExCard.locator('.ex-name').textContent();
  console.log('Testing exercise:', exName);

  // Fill first set: weight, reps, rpe
  const weightInput = firstExCard.locator('.set-row input[data-f="w"]').first();
  const repsInput = firstExCard.locator('.set-row input[data-f="r"]').first();
  const rpeInput = firstExCard.locator('.set-row input[data-f="rpe"]').first();

  await weightInput.fill('100');
  await repsInput.fill('10');
  await rpeInput.fill('8');

  // Wait for auto-start - the timer should start counting down
  await page.waitForTimeout(1500);

  // Check if timer started (display should change from initial value)
  const rtDisplay = firstExCard.locator('.rt-display').first();
  const displayText = await rtDisplay.textContent();
  console.log('Timer display after 1.5s:', displayText);

  // The timer should have counted down from 240 (compound) or 150 (isolation)
  // Check it's not the initial value
  const initialValue = displayText;
  const isCounting = initialValue !== '4:00' && initialValue !== '2:30';
  check('Timer auto-starts on first complete set', isCounting);

  // Test speaker toggle
  const soundBtn = firstExCard.locator('.rt-sound').first();
  await soundBtn.click();
  await page.waitForTimeout(100);
  const soundIconAfterOff = await soundBtn.textContent();
  console.log('Sound icon after click (should be 🔇):', soundIconAfterOff);
  check('Speaker toggle works', soundIconAfterOff === '🔇');

  // Click again to turn back on
  await soundBtn.click();
  await page.waitForTimeout(100);
  const soundIconAfterOn = await soundBtn.textContent();
  check('Speaker toggle back on', soundIconAfterOn === '🔊');

  // Debug: check stop button visibility
  const stopBtn = firstExCard.locator('.rt-stop').first();
  const stopVisible = await stopBtn.isVisible();
  const stopStyle = await stopBtn.evaluate(el => window.getComputedStyle(el).display);
  console.log('Stop button visible:', stopVisible, 'display:', stopStyle);
  
  // Stop the auto-started timer first, then test manual controls
  await stopBtn.click();
  await page.waitForTimeout(100);

  // Debug: check start button visibility after stop
  const startBtn = firstExCard.locator('.rt-start').first();
  const startVisible = await startBtn.isVisible();
  const startStyle = await startBtn.evaluate(el => window.getComputedStyle(el).display);
  console.log('Start button visible after stop:', startVisible, 'display:', startStyle);

  // Test manual timer controls
  await startBtn.click();
  await page.waitForTimeout(100);
  const startDisplay = await rtDisplay.textContent();
  check('Manual start works', startDisplay !== 'Time!');

  await stopBtn.click();
  await page.waitForTimeout(100);

  const resetBtn = firstExCard.locator('.rt-reset').first();
  await resetBtn.click();
  await page.waitForTimeout(100);
  const resetDisplay = await rtDisplay.textContent();
  check('Reset works', resetDisplay === '4:00' || resetDisplay === '2:30');

  // Test vibrate API is available (mocked)
  const vibrateAvailable = await page.evaluate(() => typeof navigator.vibrate === 'function');
  check('Vibrate API available', vibrateAvailable);

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F1 Timer Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();