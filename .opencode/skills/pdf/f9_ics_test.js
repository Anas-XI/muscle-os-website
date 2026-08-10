const fs = require('fs');
const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const PAGE_URL = 'file://E:/MoS/tools/training_tool.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  await ctx.addInitScript({ content: `
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
  ` });
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Bootstrap to step 3 (program generated)
  await page.fill('#userName', 'ICS Tester');
  await page.fill('#userAge', '30');
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
  await page.waitForSelector('#dashHeader');

  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_program')));
  const trainDayCount = prog.days.filter(d => !d.restDay).length;
  check('Program has training days', trainDayCount > 0);

  // T1: click export -> download event
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportIcsBtn')
  ]);
  check('Download filename = muscle_os_program.ics', download.suggestedFilename() === 'muscle_os_program.ics');

  const path = await download.path();
  const raw = fs.readFileSync(path, 'utf8');

  // T2: structure
  check('Starts with BEGIN:VCALENDAR', raw.startsWith('BEGIN:VCALENDAR'));
  check('Has VERSION:2.0', raw.includes('VERSION:2.0'));
  check('Has PRODID', raw.includes('PRODID:-//Muscle OS//Training App//EN'));
  check('Ends with END:VCALENDAR', raw.trimEnd().endsWith('END:VCALENDAR'));
  check('CRLF line endings', raw.includes('\r\n'));

  // T3: one VEVENT per training day, each with weekly RRULE + day name
  const vevents = raw.split('BEGIN:VEVENT').length - 1;
  check('One VEVENT per training day (' + trainDayCount + ')', vevents === trainDayCount);
  const rrules = (raw.match(/RRULE:FREQ=WEEKLY/g) || []).length;
  check('Every VEVENT has RRULE:FREQ=WEEKLY', rrules === trainDayCount);
  const summaries = prog.days.filter(d => !d.restDay);
  let allDaysNamed = true, allHasDesc = true;
  summaries.forEach(d => {
    if (!raw.includes('SUMMARY:Muscle OS: ' + d.n)) allDaysNamed = false;
    if (d.ex && d.ex.length && !raw.includes('DESCRIPTION:' + d.ex[0].n)) allHasDesc = false;
  });
  check('All day names in SUMMARY', allDaysNamed);
  check('DESCRIPTION lists exercises', allHasDesc);
  const dtstarts = (raw.match(/DTSTART;TZID=Africa\/Cairo:\d{8}T\d{6}/g) || []).length;
  check('DTSTART present for every event', dtstarts === trainDayCount);
  const dtends = (raw.match(/DTEND;TZID=Africa\/Cairo:\d{8}T\d{6}/g) || []).length;
  check('DTEND present for every event', dtends === trainDayCount);

  // T4: window exposure
  check('window.exportIcs exposed', await page.evaluate(() => typeof window.exportIcs === 'function'));

  // T5: Arabic label
  await page.click('.lang-opt[data-lang="ar"]');
  await page.waitForTimeout(200);
  check('AR locale: export label', (await page.locator('#exportIcsBtn').textContent()) === 'تصدير التقويم');

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F9 ICS Export Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();
