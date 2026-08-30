// Playwright test: P6 — time-based program variants (session length 45/60/90)
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

  // ── Bootstrap a full 3-day program (default 60) ──
  await page.fill('#userName', 'P6 Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');

  // T1: chips present, default 60 selected
  const chipState = await page.evaluate(() => ({
    count: document.querySelectorAll('#sessLenGrid .sess-len-chip').length,
    sel: document.querySelector('#sessLenGrid .sess-len-chip.selected')?.dataset.len || null
  }));
  check('T1 sess-len chips exist (3)', chipState.count === 3);
  check('T1 default 60 selected', chipState.sel === '60');

  // Baseline generation at 60
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const base = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    return prog.days.map(d => d.restDay ? null : d.ex.length);
  });
  check('T1 baseline 60 generated', base.every(n => n !== null && n > 0));

  // ── 45 min: cap 4/day + supersets suggested ──
  await page.click('#backToSplitBtn');
  await page.waitForSelector('#step2.active');
  await page.click('#sessLenGrid .sess-len-chip[data-len="45"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const r45 = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const counts = prog.days.filter(d => !d.restDay).map(d => d.ex.length);
    const sugg = prog.days.filter(d => !d.restDay).every(d => d.ssSuggested === true);
    const html = document.getElementById('progOutput').textContent;
    return { counts, sugg, note: html.includes('supersets suggested'), len: prog.sessLen };
  });
  check('T2 45-min: all days <=4 exercises', r45.counts.every(n => n <= 4));
  check('T2 45-min: days marked ssSuggested', r45.sugg === true);
  check('T2 45-min: step3 shows supersets note', r45.note === true);
  check('T2 45-min: prog.sessLen stored', r45.len === 45);

  // ── 90 min: +1 optional exercise/day ──
  await page.click('#backToSplitBtn');
  await page.waitForSelector('#step2.active');
  await page.click('#sessLenGrid .sess-len-chip[data-len="90"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const r90 = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const days = prog.days.filter(d => !d.restDay);
    const optCounts = days.map(d => d.ex.filter(e => e.optional).length);
    const counts = days.map(d => d.ex.length);
    const html = document.getElementById('progOutput').textContent;
    const badges = document.querySelectorAll('#progOutput .opt-badge').length;
    return { optCounts, counts, badge: badges > 0, label: html.includes('optional'), len: prog.sessLen };
  });
  check('T3 90-min: exactly 1 optional per training day', r90.optCounts.every(n => n === 1));
  check('T3 90-min: day count = baseline +1', r90.counts.every((n, i) => n === base[i] + 1));
  check('T3 90-min: optional badge shown in step3', r90.badge === true && r90.label === true);
  check('T3 90-min: prog.sessLen stored', r90.len === 90);

  // T4: optional exercises excluded from volume compliance
  const vol = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const today = new Date().toISOString().split('T')[0];
    const d0 = prog.days.find(d => !d.restDay);
    const d1 = prog.days.find(d => !d.restDay && d !== d0);
    const optEx = d0.ex.find(e => e.optional);
    const normEx = d1.ex.find(e => !e.optional);
    const optMuscle = optEx.p, normMuscle = normEx.p;
    const logs = {
      [today]: {
        [optEx.n]: { sets: [{ w: 10 }], n: optEx.n },
        [normEx.n]: { sets: [{ w: 100 }], n: normEx.n }
      }
    };
    const v = window.__weeklyVol(logs);
    return { optMuscle: v[optMuscle], normMuscle: v[normMuscle], distinct: optMuscle !== normMuscle };
  });
  check('T4 optional sets excluded from weeklyVol', vol.optMuscle === 0);
  check('T4 normal sets still counted', vol.normMuscle === 1);

  // T5: persistence — stored + chip state on return
  const persist = await page.evaluate(() => localStorage.getItem('mos_sess_len'));
  check('T5 mos_sess_len persisted as 90', JSON.parse(persist) === 90);
  await page.click('#backToSplitBtn');
  await page.waitForSelector('#step2.active');
  const chipSel = await page.evaluate(() => document.querySelector('#sessLenGrid .sess-len-chip.selected')?.dataset.len || null);
  check('T5 90 chip selected after return', chipSel === '90');

  // T6: back to 60 → no optional / no ssSuggested / baseline counts
  await page.click('#sessLenGrid .sess-len-chip[data-len="60"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  const r60 = await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const days = prog.days.filter(d => !d.restDay);
    return {
      counts: days.map(d => d.ex.length),
      anyOptional: days.some(d => d.ex.some(e => e.optional)),
      anySugg: days.some(d => d.ssSuggested === true),
      len: prog.sessLen
    };
  });
  check('T6 60-min: counts match baseline', r60.counts.every((n, i) => n === base[i]));
  check('T6 60-min: no optional exercises', r60.anyOptional === false);
  check('T6 60-min: no ssSuggested flag', r60.anySugg === false);
  check('T6 60-min: prog.sessLen stored', r60.len === 60);

  check('No page errors', errors.length === 0);
  if (errors.length) errors.forEach(e => console.log('  console:', e));

  await browser.close();
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0 || errors.length) process.exit(1);
})().catch(e => { console.log('CRASH:', e.message); process.exit(2); });
