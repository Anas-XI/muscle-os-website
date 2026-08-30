# Phase 1 — Decision Engine Integration
## Full Implementation Plan

> **Goal:** Wire the existing `decision-engine.js` (33 evidence-based rules) into `training_tool.html` so every user gets personalized rep ranges, rest periods, protein targets, deload schedules, and safety gates — replacing all hardcoded values.
>
> **Effort:** ~2 days of focused work | **ROI:** Beats RP Hypertrophy App ($35/mo) immediately

---

## How the Engine Works (Recap)

The `DecisionEngine` object (in `website/assets/js/decision-engine.js`) already:
1. Loads `decision_rules.json` (33 rules from Schoenfeld, Nippard, NSCA, ACE, IPTA)
2. Evaluates each rule's `trigger_js` expression against a **profile object**
3. Returns a `result` object with: `rep_range`, `rest_compounds`, `rest_isolation`, `protein_per_kg`, `surplus_kcal`, `deficit_kcal`, `meal_timing`, `warm_up`, `program_notes[]`, `nutrition_notes[]`

**Profile object required by engine:**
```js
{
  goal: "hypertrophy" | "strength" | "both",
  experience_years: 0.5 | 2 | 5,   // mapped from "novice" | "intermediate" | "advanced"
  age: 25,
  sex: "male" | "female",
  bodyweight_kg: 80,
  height_cm: 175,
  training_days: 4
}
```

**Form fields already in `training_tool.html`:**
| Engine field | Form element ID | Notes |
|---|---|---|
| `goal` | `#goal` | hypertrophy / strength / both |
| `age` | `#userAge` | numeric input |
| `sex` | `#userSex` | male / female |
| `training_days` | `#dow` | 2–6 |
| `experience_years` | `#ta` | needs mapping: novice→0.5, intermediate→2, advanced→5 |
| `bodyweight_kg` | ❌ **MISSING** | Must add field to Screen 1 |
| `height_cm` | ❌ **MISSING** | Must add field to Screen 1 (optional, used by some rules) |

---

## Exact Changes to Make

### STEP 1 — Add `decision-engine.js` Script Tag to `training_tool.html`

**Location:** Head section, before closing `</head>` (line ~18, after Google Fonts link)

```html
<!-- Decision Engine — must load before main script -->
<script>window.MOS_ASSET_ROOT = '../assets/data';</script>
<script src="../assets/js/decision-engine.js"></script>
```

> ⚠️ `MOS_ASSET_ROOT` must be set BEFORE loading the engine so it resolves the JSON paths correctly. The engine checks `window.MOS_ASSET_ROOT` in its `_resolveBasePath()` method.

---

### STEP 2 — Add Missing Profile Fields to Screen 1

**Location:** After the `userSex` row in Screen 1 (around line 984), add a new form row:

```html
<div class="form-row" id="bodyCompRow">
  <div class="form-group">
    <label data-i18n="weight_label">Bodyweight (kg)</label>
    <input type="number" id="userWeight" placeholder="75" min="30" max="300" step="0.5"
      style="width:100%;padding:6px 8px;background:rgba(20,21,26,.5);border:1px solid rgba(250,250,248,.08);border-radius:6px;color:#FAFAF8;font-size:.55rem">
  </div>
  <div class="form-group">
    <label data-i18n="height_label">Height (cm) <span style="color:rgba(250,250,248,.3);font-size:.5rem">(optional)</span></label>
    <input type="number" id="userHeight" placeholder="175" min="100" max="250" step="1"
      style="width:100%;padding:6px 8px;background:rgba(20,21,26,.5);border:1px solid rgba(250,250,248,.08);border-radius:6px;color:#FAFAF8;font-size:.55rem">
  </div>
</div>
```

**Add i18n keys** to the translations object in the `STRINGS` constant (search for `"name_label"` to find where to add):
```js
weight_label: { en: "Bodyweight (kg)", ar: "الوزن (كجم)" },
height_label:  { en: "Height (cm)", ar: "الطول (سم)" },
```

---

### STEP 3 — Create `buildEngineProfile()` Helper Function

**Location:** Add near the top of the `<script>` block, after the `K` constants object (around line 3374).

```js
// ── Decision Engine Profile Builder ──
const TA_TO_YEARS = { novice: 0.5, intermediate: 2, advanced: 5 };

function buildEngineProfile() {
  const goal    = (document.getElementById('goal')?.value)    || 'hypertrophy';
  const ta      = (document.getElementById('ta')?.value)      || 'intermediate';
  const age     = parseInt(document.getElementById('userAge')?.value)   || 25;
  const sex     = (document.getElementById('userSex')?.value)  || 'male';
  const weight  = parseFloat(document.getElementById('userWeight')?.value) || 75;
  const height  = parseFloat(document.getElementById('userHeight')?.value) || 175;
  const days    = parseInt(document.getElementById('dow')?.value)        || 4;

  return {
    goal:             goal,
    experience_years: TA_TO_YEARS[ta] || 2,
    age:              age,
    sex:              sex,
    bodyweight_kg:    weight,
    height_cm:        height,
    training_days:    days
  };
}

// Cache engine recommendations — call once per session, update when profile changes
let _engineRecs = null;

async function getEngineRecs(forceRefresh) {
  if (_engineRecs && !forceRefresh) return _engineRecs;
  if (typeof DecisionEngine === 'undefined') return null;
  await DecisionEngine.init();
  _engineRecs = DecisionEngine.applyBookRulesSync(buildEngineProfile());
  return _engineRecs;
}

// Re-run engine when any profile field changes
['goal','ta','userAge','userSex','userWeight','userHeight','dow'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('change', function() { _engineRecs = null; });
});
```

---

### STEP 4 — Replace Hardcoded Rest Timer Duration

**Location:** Line 6721 — the single hardcoded line:
```js
// BEFORE (line 6721):
var restSec=m.t==='compound'?240:150;

// AFTER:
var recs = DecisionEngine.applyBookRulesSync(buildEngineProfile());
var restCompound = recs ? parseInt(recs.rest_compounds) : 180;  // e.g. "120-180s" → 180
var restIsolation = recs ? parseInt(recs.rest_isolation) : 90;
var restSec = m.t === 'compound' ? restCompound : restIsolation;
```

**Parse helper** to extract seconds from strings like `"120-180s"`:
```js
function parseRestSec(str, fallback) {
  if (!str) return fallback;
  // Handle "120-180s" → take upper bound (180)
  var match = str.match(/(\d+)-(\d+)/);
  if (match) return parseInt(match[2]);
  var single = str.match(/(\d+)/);
  if (single) return parseInt(single[1]);
  return fallback;
}
```

Then:
```js
var restCompound  = parseRestSec(recs && recs.rest_compounds, 180);
var restIsolation = parseRestSec(recs && recs.rest_isolation, 90);
var restSec = m.t === 'compound' ? restCompound : restIsolation;
```

---

### STEP 5 — Inject Engine Recommendations Panel on Screen 3

When the program is generated (Screen 3), show a collapsible "Coach Intelligence" card above the exercise list displaying what rules fired and why.

**Location:** Find where Screen 3 renders the program heading and inject after it.

```js
async function renderEngineRecsPanel() {
  var recs = await getEngineRecs();
  if (!recs || !recs.applied_rules.length) return '';

  var notes = [...recs.program_notes, ...recs.nutrition_notes].slice(0, 5);
  var rulesHtml = recs.applied_rules.map(function(r) {
    return '<span class="engine-rule-chip" title="' + (r.rule_id||'') + '">' + (r.source||'') + '</span>';
  }).join('');

  return [
    '<div class="card engine-recs-card" style="border-color:rgba(244,201,59,.25);margin-bottom:12px">',
      '<div class="section-header" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">',
        '🧠 Coach Intelligence',
        '<span style="font-size:.5rem;color:rgba(250,250,248,.3);float:right">▼ show/hide</span>',
      '</div>',
      '<div id="engineRecsBody" style="margin-top:8px">',
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">' + rulesHtml + '</div>',
        '<div style="font-size:.55rem;color:rgba(250,250,248,.5);border-left:2px solid rgba(244,201,59,.3);padding-left:8px;line-height:1.7">',
          '<strong style="color:#F4C93B">Rep Range:</strong> ' + recs.rep_range + '<br>',
          '<strong style="color:#F4C93B">Rest (Compounds):</strong> ' + recs.rest_compounds + '<br>',
          '<strong style="color:#F4C93B">Rest (Isolation):</strong> ' + recs.rest_isolation + '<br>',
          '<strong style="color:#F4C93B">Protein Target:</strong> ' + recs.protein_per_kg + ' g/kg/day<br>',
          notes.map(function(n) { return '<br>📌 ' + n; }).join(''),
        '</div>',
      '</div>',
    '</div>'
  ].join('');
}
```

**CSS for rule chips** (add to `<style>` block):
```css
.engine-rule-chip {
  display: inline-block;
  padding: 2px 7px;
  font-size: .45rem;
  font-weight: 600;
  background: rgba(244,201,59,.08);
  border: 1px solid rgba(244,201,59,.2);
  border-radius: 4px;
  color: rgba(244,201,59,.7);
  font-family: 'JetBrains Mono', monospace;
}
.engine-recs-card { animation: fadeSlideIn .4s ease-out; }
```

---

### STEP 6 — Override Rep Range in `suggestLoad()` Function

**Location:** Line 3713 — currently `tRR=goal==='strength'?[3,6]:goal==='hypertrophy'?(m.rr||[6,12]):[5,10]`

Update to use engine rep range when available:

```js
// BEFORE (line 3713):
var tRR=goal==='strength'?[3,6]:goal==='hypertrophy'?(m.rr||[6,12]):[5,10];

// AFTER:
var recs = DecisionEngine.applyBookRulesSync(buildEngineProfile());
var engineRR = recs && !recs.rep_range_overridden === false ? null : recs;
// Parse "6-12" → [6,12]
var tRR;
if (recs && recs.rep_range) {
  var rrMatch = recs.rep_range.match(/(\d+)[-–](\d+)/);
  tRR = rrMatch ? [parseInt(rrMatch[1]), parseInt(rrMatch[2])] : (goal==='strength'?[3,6]:[6,12]);
} else {
  tRR = goal==='strength'?[3,6]:goal==='hypertrophy'?(m.rr||[6,12]):[5,10];
}
```

---

### STEP 7 — Inject Protein Target into Nutrition Notes Panel

Find where Screen 3 or the TDEE/nutrition section renders protein guidance, and inject engine value.

**Add to any existing nutrition tip display:**
```js
async function renderProteinBanner() {
  var recs = await getEngineRecs();
  if (!recs) return;
  var vi = ls(K.VI, {});
  var bw = parseFloat(document.getElementById('userWeight')?.value) || vi.bodyweight_kg || 75;
  var dailyProtein = Math.round(recs.protein_per_kg * bw);
  
  var banner = document.getElementById('proteinTargetBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'proteinTargetBanner';
    banner.style.cssText = 'font-size:.55rem;background:rgba(244,201,59,.04);border:1px solid rgba(244,201,59,.15);border-radius:8px;padding:8px 12px;margin:8px 0;color:rgba(250,250,248,.7);line-height:1.6';
    // Inject near top of Screen 3
    var s3 = document.getElementById('step3');
    if (s3) s3.prepend(banner);
  }
  banner.innerHTML = '🥩 <strong style="color:#F4C93B">Daily Protein Target:</strong> ' + dailyProtein + 'g (' + recs.protein_per_kg + ' g/kg × ' + bw + ' kg) — ' + recs.meal_timing;
}
```

---

### STEP 8 — Trigger Safety Gates from Engine

The decision engine already fires rules like `ACE-BC-02` (beginners: adherence over volume), `ACE-SP-03` (BMI>30: non-weight-bearing), `NSCA-FM-03` (overtraining red flags), and `NSCA-EX-05` (detraining reload taper). These output in `program_notes[]`.

Check for critical notes and surface them as banners:

```js
const SAFETY_KEYWORDS = ['consult', 'medical', 'physician', 'non-weight-bearing', 'overtraining', 'de-train'];

async function checkEngineSafetyAlerts() {
  var recs = await getEngineRecs();
  if (!recs) return;
  
  var safetyNotes = [...recs.program_notes, ...recs.nutrition_notes].filter(function(n) {
    return SAFETY_KEYWORDS.some(function(kw) { return n.toLowerCase().includes(kw); });
  });
  
  if (!safetyNotes.length) return;
  
  var alert = document.getElementById('engineSafetyAlert');
  if (!alert) {
    alert = document.createElement('div');
    alert.id = 'engineSafetyAlert';
    alert.style.cssText = 'background:rgba(244,67,54,.06);border:1px solid rgba(244,67,54,.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:.55rem;color:rgba(250,250,248,.8);line-height:1.7';
    var s1 = document.getElementById('step1');
    if (s1) s1.appendChild(alert);
  }
  alert.innerHTML = '⚠️ <strong style="color:#ef5350">Safety Notice</strong><br>' + safetyNotes.map(function(n){ return '• ' + n; }).join('<br>');
}
```

Call `checkEngineSafetyAlerts()` after Screen 1 form values change and on page load.

---

### STEP 9 — Persist Engine Profile to `K.VI` (localStorage)

When the user advances past Screen 1, save the engine profile to localStorage alongside existing volume inputs. This lets other tools (TDEE engine) read it.

Find the existing `goToStep2()` or equivalent function and add:

```js
// Inside the function that saves Screen 1 data and advances:
var engProfile = buildEngineProfile();
var vi = ls(K.VI, {});
vi.bodyweight_kg = engProfile.bodyweight_kg;
vi.height_cm     = engProfile.height_cm;
vi.engine_profile = engProfile;
ss(K.VI, vi);
```

---

### STEP 10 — Deload Trigger from Engine Rules

The engine's `SH-PL-02` and `ML-PL-03` rules recommend preventative deloads every 6–8 weeks. The tool already tracks sessions via `K.DT` (deload tracker). Wire them together:

```js
async function checkEngineDeloadTrigger() {
  var recs = await getEngineRecs();
  if (!recs) return;
  
  var dt = dlTracker();
  var sessions = dt.sessions || 0;
  
  // Engine recommends deload every 6-8 weeks × avg 4 sessions/week = 24-32 sessions
  var deloadInterval = 28; // sessions
  var dueForDeload = sessions > 0 && sessions % deloadInterval === 0;
  
  // Also check if engine program_notes mention deload
  var deloadNote = recs.program_notes.find(function(n) {
    return n.toLowerCase().includes('deload');
  });
  
  if (dueForDeload || deloadNote) {
    var banner = document.getElementById('deloadEngineBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'deloadEngineBanner';
      banner.className = 'deload-tracker'; // reuse existing style
      banner.style.cssText += ';cursor:pointer;border-color:rgba(244,201,59,.4)';
      banner.onclick = function() { this.style.display = 'none'; };
    }
    banner.innerHTML = '💤 <strong>Deload Recommended</strong> — ' + 
      (deloadNote || 'You\'ve completed ' + sessions + ' sessions. Take a deload week: 50% volume, 70% intensity.') +
      ' <span style="opacity:.4;float:right">✕</span>';
    var s4 = document.getElementById('step4');
    if (s4) s4.prepend(banner);
    banner.style.display = 'block';
    evLog('deload_prompt', { sessions: sessions, source: 'engine' });
  }
}
```

---

## Integration Test Checklist

After implementing, verify these scenarios:

| Scenario | Expected Result |
|---|---|
| User: 25yo, intermediate, hypertrophy | Rep range: 6–15 (Schoenfeld rule `SH-TR-05`) |
| User: 65yo male | Protein target jumps to 0.4–0.6 g/kg per meal (rule `SH-IN-01`) |
| User: strength goal | Rep range: 2–6 (rule `NSCA-PD-01`) |
| User: novice | Rep range adjusts, linear periodization recommended (`IPTA-PE-01`) |
| Compound exercise rest timer | Shows engine-prescribed rest, not hardcoded 240s |
| After 28 sessions | Deload banner appears in Screen 4 |
| After program generates | "Coach Intelligence" card visible with rule chips |

---

## Files Modified

| File | Change |
|---|---|
| `website/tools/training_tool.html` | +script tag, +2 form fields, +`buildEngineProfile()`, +`getEngineRecs()`, +`renderEngineRecsPanel()`, +`renderProteinBanner()`, +`checkEngineSafetyAlerts()`, +`checkEngineDeloadTrigger()`, override `restSec` at line 6721, override `tRR` at line 3713 |
| `website/tools/muscle_os_app.html` | Set `window.MOS_ASSET_ROOT` before iframe loads |
| `website/tools/tdee_adaptive_engine.html` | Read `engine_profile` from `localStorage['mos_vol_inputs']` for protein target display |

## Files NOT Modified

| File | Why |
|---|---|
| `decision-engine.js` | Already production-ready — zero changes needed |
| `decision_rules.json` | Already complete — zero changes needed |
| `vault_data.json` | Already complete — only load if vault insights needed |
| `index.js` (Worker) | No backend changes needed for Phase 1 |

---

## Commit Plan

```bash
git add website/tools/training_tool.html
git add website/tools/tdee_adaptive_engine.html
git commit -m "feat(engine): wire DecisionEngine into training tool — personalized reps, rest, protein, deload triggers"
git push origin master
```

---

## What This Unlocks vs. Competitors

| Competitor | Their Price | What They Offer | What We Now Match/Beat |
|---|---|---|---|
| RP Hypertrophy App | $35/mo | Biofeedback autoregulation + rep range personalization | ✅ Rep range + rest + deload from same evidence base |
| Fitbod | $29.99/mo | Dynamic exercise selection | ✅ Injury-aware substitution already built |
| Strong | Free/Pro | Manual rest timer | ✅ Now engine-driven rest prescription with science citations |
| Caliber | Free | Strength scoring | Phase 2 |
