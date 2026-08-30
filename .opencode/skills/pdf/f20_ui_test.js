// Playwright test: UI polish — button size/shape/theme consistency, focus-visible, hover lift
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

  // ── T1: computed style map for every interactive class (scratch elements) ──
  const styles = await page.evaluate(() => {
    const classes = ['btn-primary','btn-secondary','step','toggle-opt','sess-len-chip','pc-btn','mb-btn','ss-toggle','day-tab','fat-light-btn','weak-chip','st-toggle','lang-opt','add-set-btn','option','ex-sel-chip','ex-sel-more','swap-chip','prio-btn','meso-train-btn','rm-ex-btn','sw-ex-btn','sub-verify-btn','consult-cta','cardio-toggle','notif-toggle','nudge-dismiss'];
    const out = {};
    for (const c of classes) {
      const el = document.createElement('button');
      el.className = c;
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      out[c] = { radius: cs.borderRadius, pad: cs.padding, shadow: cs.boxShadow };
      el.remove();
    }
    const real = document.querySelector('.btn-primary');
    const rcs = getComputedStyle(real);
    const st = document.querySelector('.stepper');
    const stcs = getComputedStyle(st);
    const card = document.querySelector('.card');
    return {
      map: out,
      primaryShadow: rcs.boxShadow,
      primaryUserSelect: rcs.userSelect,
      stepperBorder: stcs.borderTopWidth + ' ' + stcs.borderTopColor,
      stepperShadow: stcs.boxShadow,
      cardBg: getComputedStyle(card).backgroundColor
    };
  });

  check('T1 btn-primary radius 12px', styles.map['btn-primary'].radius === '12px');
  check('T1 btn-secondary radius 10px', styles.map['btn-secondary'].radius === '10px');
  check('T1 btn-secondary padding 8px 16px', styles.map['btn-secondary'].pad === '8px 16px');
  check('T1 step radius 10px', styles.map['step'].radius === '10px');
  check('T1 toggle-opt radius 8px', styles.map['toggle-opt'].radius === '8px');
  check('T1 sess-len-chip radius 10px', styles.map['sess-len-chip'].radius === '10px');
  check('T1 sess-len-chip padding 10px 8px', styles.map['sess-len-chip'].pad === '10px 8px');
  check('T1 pc-btn radius 8px', styles.map['pc-btn'].radius === '8px');
  check('T1 pc-btn padding 6px 12px', styles.map['pc-btn'].pad === '6px 12px');
  check('T1 mb-btn radius 8px', styles.map['mb-btn'].radius === '8px');
  check('T1 ss-toggle radius 8px', styles.map['ss-toggle'].radius === '8px');
  check('T1 day-tab radius 8px', styles.map['day-tab'].radius === '8px');
  check('T1 day-tab padding 7px 12px', styles.map['day-tab'].pad === '7px 12px');
  check('T1 fat-light-btn radius 8px', styles.map['fat-light-btn'].radius === '8px');
  check('T1 weak-chip radius 8px', styles.map['weak-chip'].radius === '8px');
  check('T1 st-toggle radius 8px', styles.map['st-toggle'].radius === '8px');
  check('T1 lang-opt padding 4px 10px', styles.map['lang-opt'].pad === '4px 10px');
  check('T1 option radius 10px', styles.map['option'].radius === '10px');
  check('T1 ex-sel-chip radius 6px', styles.map['ex-sel-chip'].radius === '6px');
  check('T1 ex-sel-chip padding 3px 7px', styles.map['ex-sel-chip'].pad === '3px 7px');
  check('T1 ex-sel-more radius 6px', styles.map['ex-sel-more'].radius === '6px');
  check('T1 swap-chip radius 6px', styles.map['swap-chip'].radius === '6px');
  check('T1 prio-btn radius 6px', styles.map['prio-btn'].radius === '6px');
  check('T1 meso-train-btn radius 6px', styles.map['meso-train-btn'].radius === '6px');
  check('T1 rm-ex-btn radius 6px', styles.map['rm-ex-btn'].radius === '6px');
  check('T1 sw-ex-btn radius 6px', styles.map['sw-ex-btn'].radius === '6px');
  check('T1 sub-verify-btn radius 8px', styles.map['sub-verify-btn'].radius === '8px');
  check('T1 consult-cta radius 10px', styles.map['consult-cta'].radius === '10px');
  check('T1 consult-cta accent shadow', styles.map['consult-cta'].shadow !== 'none');
  check('T1 cardio-toggle radius 8px', styles.map['cardio-toggle'].radius === '8px');
  check('T1 notif-toggle radius 8px', styles.map['notif-toggle'].radius === '8px');
  check('T1 nudge-dismiss radius 6px', styles.map['nudge-dismiss'].radius === '6px');

  // ── T2: real btn-primary theme & states ──
  check('T2 btn-primary accent glow shadow', styles.primaryShadow.includes('244, 201, 59'));
  check('T2 buttons user-select none', styles.primaryUserSelect === 'none');
  check('T2 stepper bordered + shadow', styles.stepperBorder === '1px rgba(250, 250, 248, 0.08)' && styles.stepperShadow !== 'none');
  check('T2 card uses theme var bg', styles.cardBg === 'rgb(30, 32, 39)');

  await page.hover('.btn-primary');
  await page.waitForTimeout(250);
  const hoverT = await page.evaluate(() => getComputedStyle(document.querySelector('.btn-primary')).transform);
  check('T2 hover lifts button 1px', hoverT === 'matrix(1, 0, 0, 1, 0, -1)');

  await page.keyboard.press('Tab');
  const fv = await page.evaluate(() => {
    const b = document.querySelector('.btn-primary');
    b.focus();
    const cs = getComputedStyle(b);
    return { matches: b.matches(':focus-visible'), style: cs.outlineStyle, color: cs.outlineColor };
  });
  check('T2 focus-visible matches', fv.matches === true);
  check('T2 focus ring accent solid 2px', fv.style === 'solid' && fv.color === 'rgb(244, 201, 59)');

  const dis = await page.evaluate(() => {
    const b = document.querySelector('.btn-primary');
    b.style.transition = 'none';
    b.disabled = true;
    const cs = getComputedStyle(b);
    const r = { shadow: cs.boxShadow, opacity: cs.opacity };
    b.disabled = false;
    b.style.transition = '';
    return r;
  });
  check('T2 disabled: no shadow', dis.shadow === 'none');
  check('T2 disabled: opacity 0.3', dis.opacity === '0.3');

  // ── T3: accent variants propagate to button glow ──
  await page.click('.acc-swatch[data-acc="green"]');
  await page.waitForTimeout(250);
  const green = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-accent'),
    shadow: getComputedStyle(document.querySelector('.btn-primary')).boxShadow
  }));
  check('T3 green accent applied to html', green.attr === 'green');
  check('T3 glow follows accent (green rgb)', green.shadow.includes('76, 175, 80'));

  // ── T4: core flow still functional after CSS-only change ──
  await page.click('#onboardNext').catch(() => {});
  await page.waitForTimeout(400);
  const step2 = await page.evaluate(() => document.getElementById('step2').classList.contains('active'));
  check('T4 onboarding still navigates to split', step2 === true);

  check('No page errors', errors.length === 0);
  if (errors.length) errors.forEach(e => console.log('  console:', e));

  await browser.close();
  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0 || errors.length) process.exit(1);
})().catch(e => { console.log('CRASH:', e.message); process.exit(2); });
