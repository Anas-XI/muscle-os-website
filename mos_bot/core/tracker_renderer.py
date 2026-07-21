"""HTML workout tracker generator — produces a self-contained tracker for each client program."""

import json
import os
from datetime import datetime
from mos_bot.core.models import ProgramContent
from mos_bot.config import DATA_ROOT

TRACKERS_DIR = os.path.join(DATA_ROOT, "trackers")


def _exercise_icon(name: str) -> str:
    name_l = name.lower()
    if "squat" in name_l or "leg press" in name_l or "lunge" in name_l or "bulgarian" in name_l:
        return "🦵"
    if "bench" in name_l or "press" in name_l or "push" in name_l or "chest" in name_l:
        return "🏋️"
    if "row" in name_l or "pulldown" in name_l or "pull" in name_l or "face" in name_l:
        return "🔙"
    if "curl" in name_l or "tri" in name_l or "tricep" in name_l or "bicep" in name_l:
        return "💪"
    if "rdl" in name_l or "deadlift" in name_l or "hamstring" in name_l or "glute" in name_l or "hip" in name_l:
        return "🍑"
    if "lateral" in name_l or "raise" in name_l or "fly" in name_l or "shoulder" in name_l:
        return "🔺"
    if "plank" in name_l or "core" in name_l or "crunch" in name_l:
        return "🧠"
    if "cardio" in name_l or "walk" in name_l or "bike" in name_l or "run" in name_l:
        return "🏃"
    return "🏋️"


TRACKER_HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workout Tracker — {CLIENT_NAME}</title>
<style>
  :root { --primary: #1a1a2e; --accent: #e94560; --bg: #16213e; --card: #0f3460; --text: #eee; --muted: #8899aa; --green: #2ecc71; --orange: #f39c12; --border: #2a2a4a; --card-hover: rgba(255,255,255,0.04); --shadow: rgba(0,0,0,0.3); --chart-line: #e94560; --chart-fill: rgba(233,69,96,0.15); }
  .light { --primary: #f5f5f5; --accent: #d63031; --bg: #ffffff; --card: #ffffff; --text: #2d3436; --muted: #636e72; --border: #dfe6e9; --card-hover: rgba(0,0,0,0.02); --shadow: rgba(0,0,0,0.08); --chart-line: #d63031; --chart-fill: rgba(214,48,49,0.1); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--primary); color: var(--text); min-height: 100vh; transition: background .3s, color .3s; }
  .header { background: var(--bg); padding: 12px 20px; text-align: center; border-bottom: 2px solid var(--accent); display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .header h1 { font-size: 18px; color: var(--accent); }
  .header .sub { font-size: 12px; color: var(--muted); }
  .theme-toggle { background: none; border: 1px solid var(--border); color: var(--muted); cursor: pointer; padding: 4px 10px; border-radius: 6px; font-size: 16px; line-height: 1; margin-left: auto; }
  .theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
  .tabs { display: flex; background: var(--bg); border-bottom: 1px solid var(--border); overflow-x: auto; transition: background .3s; }
  .tab { flex: 1; padding: 12px 8px; text-align: center; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--muted); border-bottom: 3px solid transparent; transition: all .2s; white-space: nowrap; }
  .tab:hover { color: var(--text); background: var(--card-hover); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .content { padding: 16px; max-width: 800px; margin: 0 auto; }
  .section { display: none; }
  .section.active { display: block; }
  h2 { font-size: 15px; color: var(--accent); margin: 16px 0 8px; }
  h3 { font-size: 14px; color: var(--text); margin: 12px 0 6px; }
  .card { background: var(--card); border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 4px var(--shadow); transition: background .3s, box-shadow .3s; }
  .card-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .card-title .icon { font-size: 18px; }
  .exercise-row { display: grid; grid-template-columns: 1fr; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .exercise-row:last-child { border-bottom: none; }
  .exercise-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; }
  .exercise-prescription { font-size: 12px; color: var(--muted); }
  .set-log { display: flex; gap: 6px; align-items: center; margin-top: 6px; flex-wrap: wrap; }
  .set-log label { font-size: 11px; color: var(--muted); }
  .set-log input { width: 56px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--primary); color: var(--text); font-size: 13px; transition: background .3s; }
  .set-log input:focus { outline: none; border-color: var(--accent); }
  .set-done { accent-color: var(--green); cursor: pointer; width: 18px; height: 18px; }
  .set-done:checked + .set-inputs { opacity: .5; }
  .set-inputs { display: contents; }
  .set-inputs.dimmed { opacity: .5; }
  .btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; }
  .btn-primary { background: var(--accent); color: #fff; width: 100%; }
  .btn-primary:hover { opacity: .85; }
  .btn-secondary { background: var(--border); color: var(--text); }
  .btn-secondary:hover { opacity: .8; }
  .btn-success { background: var(--green); color: #fff; }
  .btn-success:hover { opacity: .85; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-danger { background: var(--accent); color: #fff; }
  .btn-danger:hover { opacity: .85; }
  .checkin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .checkin-item { background: var(--card); border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px var(--shadow); }
  .checkin-item label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 4px; }
  .checkin-item input, .checkin-item select { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--primary); color: var(--text); font-size: 14px; }
  .checkin-item select { appearance: auto; }
  .checkin-item textarea { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--primary); color: var(--text); font-size: 14px; resize: vertical; min-height: 60px; font-family: inherit; }
  .history-item { background: var(--card); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 13px; box-shadow: 0 1px 3px var(--shadow); }
  .history-item .date { color: var(--accent); font-weight: 600; }
  .history-item .detail { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-done { background: var(--green); color: #fff; }
  .badge-miss { background: #555; color: #ccc; }
  .badge-today { background: var(--orange); color: #fff; }
  .session-nav { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
  .session-nav button { padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--text); cursor: pointer; font-size: 12px; }
  .session-nav button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .session-nav button.completed { border-color: var(--green); color: var(--green); }
  .rest-timer { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: var(--orange); padding: 2px 8px; border-radius: 4px; background: var(--card-hover); }
  .rest-timer.active { color: var(--accent); font-weight: 600; }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--green); color: #fff; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; opacity: 0; transition: opacity .3s; z-index: 100; }
  .toast.show { opacity: 1; }
  .toast.error { background: var(--accent); }
  .sync-status { font-size: 11px; color: var(--muted); text-align: center; margin-top: 12px; }
  .log-full { grid-column: 1 / -1; }
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .stat-card { background: var(--card); border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 3px var(--shadow); }
  .stat-card .value { font-size: 20px; font-weight: 700; color: var(--accent); }
  .stat-card .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
  .chart-container { background: var(--card); border-radius: 10px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px var(--shadow); }
  .chart-container h3 { margin: 0 0 8px; font-size: 13px; color: var(--muted); }
  .chart-container canvas { width: 100% !important; height: 140px !important; }
  @media (max-width: 500px) { .checkin-grid { grid-template-columns: 1fr; } .tabs { font-size: 11px; } .stats-row { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>

<div class="header">
  <div style="flex:1;text-align:center;">
    <h1>🏋️ {CLIENT_NAME}'s Tracker</h1>
    <div class="sub">{GOAL_LABEL} · {SPLIT_LABEL} · Generated {GENERATED_DATE}</div>
  </div>
  <button class="theme-toggle" id="theme-toggle" title="Toggle theme">🌙</button>
</div>

<div class="tabs">
  <div class="tab active" data-tab="workout">Today's Workout</div>
  <div class="tab" data-tab="checkin">Daily Check-in</div>
  <div class="tab" data-tab="program">Full Program</div>
  <div class="tab" data-tab="history">History</div>
</div>

<div class="content">
  <div class="section active" id="sec-workout">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h2 style="margin:0;">Today's Session</h2>
      <span id="today-label" style="font-size:13px;color:var(--muted);"></span>
    </div>
    <div class="session-nav" id="session-nav"></div>
    <div id="workout-exercises"></div>
    <button class="btn btn-primary" id="save-workout" style="margin-top:12px;">💾 Save This Session</button>
  </div>

  <div class="section" id="sec-checkin">
    <h2>Daily Check-in</h2>
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Fill this in every day — even rest days.</p>
    <div class="checkin-grid">
      <div class="checkin-item"><label>Weight (kg)</label><input type="number" step="0.1" id="ci-weight" placeholder="e.g. 84.5"></div>
      <div class="checkin-item"><label>Sleep (hours)</label><input type="number" step="0.5" min="0" max="24" id="ci-sleep" placeholder="e.g. 7.5"></div>
      <div class="checkin-item"><label>Readiness (1-10)</label><input type="number" min="1" max="10" id="ci-readiness" placeholder="Rate 1-10"></div>
      <div class="checkin-item"><label>Soreness</label><select id="ci-soreness"><option value="">Select...</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></div>
      <div class="checkin-item"><label>Adherence (%)</label><select id="ci-adherence"><option value="">Select...</option><option value="100">100%</option><option value="80">80%</option><option value="50">50%</option><option value="less">&lt;50%</option></select></div>
      <div class="checkin-item"><label>Mood</label><select id="ci-mood"><option value="">Select...</option><option value="great">Great</option><option value="good">Good</option><option value="okay">Okay</option><option value="bad">Bad</option></select></div>
      <div class="checkin-item log-full"><label>Notes</label><textarea id="ci-notes" placeholder="How do you feel? Any issues?"></textarea></div>
    </div>
    <button class="btn btn-primary" id="save-checkin" style="margin-top:12px;">📝 Save Check-in</button>
  </div>

  <div class="section" id="sec-program">
    <div id="program-view"></div>
  </div>

  <div class="section" id="sec-history">
    <h2>Log History</h2>
    <div class="stats-row" id="stats-row"></div>
    <div class="chart-container" id="weight-chart-box" style="display:none;">
      <h3>⚖️ Weight Trend</h3>
      <canvas id="weight-chart"></canvas>
    </div>
    <div class="chart-container" id="volume-chart-box" style="display:none;">
      <h3>💪 Volume Trend (total kg per session)</h3>
      <canvas id="volume-chart"></canvas>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn btn-secondary btn-sm" id="export-logs">📥 Export JSON</button>
      <button class="btn btn-success btn-sm" id="submit-logs">📤 Submit to Coach</button>
      <button class="btn btn-danger btn-sm" id="clear-data" style="margin-left:auto;">🗑️ Clear Local</button>
    </div>
    <div id="history-list"></div>
  </div>
</div>

<div class="toast" id="toast"></div>
<div class="sync-status" id="sync-status"></div>

<script>
const PROGRAM = {PROGRAM_JSON};

const STORAGE_KEY = 'mos_tracker_' + PROGRAM.client.user_id;
const THEME_KEY = 'mos_theme_' + PROGRAM.client.user_id;
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{{"workouts":[],"checkins":[]}}');
let currentSessionIdx = 0;
let restTimer = null;
let restInterval = null;

function saveData() {{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}}

function getWeekday() {{
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}}

function getDateStr() {{
  return new Date().toISOString().split('T')[0];
}}

function getTodaySessionIndex() {{
  const ss = PROGRAM.program.phases[0]?.sessions;
  if (!ss?.length) return 0;
  return new Date().getDay() % ss.length;
}}

function getCurrentPhase() {{
  return PROGRAM.program.phases[0];
}}

function getIcon(name) {{
  const n = name.toLowerCase();
  if (/(squat|leg press|lunge|bulgarian)/.test(n)) return '🦵';
  if (/(bench|press|push|chest|dip)/.test(n)) return '🏋️';
  if (/(row|pulldown|pull.?up|face.?pull|chin)/.test(n)) return '🔙';
  if (/(curl|tricep|bicep|skull|french)/.test(n)) return '💪';
  if (/(rdl|deadlift|hamstring|glute|hip.?thrust|good.?morn)/.test(n)) return '🍑';
  if (/(lateral|raise|fly|shoulder|upright)/.test(n)) return '🔺';
  if (/(plank|core|crunch|hollow|dragon)/.test(n)) return '🧠';
  if (/(cardio|walk|bike|run|rower|ski)/.test(n)) return '🏃';
  return '🏋️';
}}

// ── Theme ──
function applyTheme(theme) {{
  document.body.classList.toggle('light', theme === 'light');
  document.getElementById('theme-toggle').textContent = theme === 'light' ? '☀️' : '🌙';
}}
function toggleTheme() {{
  const cur = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(cur);
  localStorage.setItem(THEME_KEY, cur);
}}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

// ── Tab Navigation ──
document.querySelectorAll('.tab').forEach(tab => {{
  tab.addEventListener('click', () => {{
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('sec-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'workout') renderWorkout();
    if (tab.dataset.tab === 'history') {{ renderStats(); renderCharts(); renderHistory(); }}
    if (tab.dataset.tab === 'program') renderProgram();
  }});
}});

// ── Workout Tab ──
function renderWorkout() {{
  const sessions = getCurrentPhase().sessions;
  const nav = document.getElementById('session-nav');
  nav.innerHTML = '';
  sessions.forEach((s, i) => {{
    const btn = document.createElement('button');
    btn.textContent = s.day;
    if (data.workouts.find(w => w.session === s.day && w.date === getDateStr())) btn.classList.add('completed');
    if (i === currentSessionIdx) btn.classList.add('active');
    btn.addEventListener('click', () => {{ currentSessionIdx = i; renderWorkout(); renderWorkoutExercises(); }});
    nav.appendChild(btn);
  }});
  document.getElementById('today-label').textContent = getWeekday();
  renderWorkoutExercises();
}}

function renderWorkoutExercises() {{
  const session = getCurrentPhase().sessions[currentSessionIdx];
  const container = document.getElementById('workout-exercises');
  if (!session) {{ container.innerHTML = '<p>No sessions defined.</p>'; return; }}
  container.innerHTML = '';
  const existingLog = data.workouts.find(w => w.session === session.day && w.date === getDateStr());
  session.exercises.forEach((ex, ei) => {{
    const card = document.createElement('div');
    card.className = 'card';
    const reps = ex.reps || '';
    const rir = ex.rir ? ` RIR ${{ex.rir}}` : '';
    card.innerHTML = '<div class="card-title"><span><span class="icon">' + getIcon(ex.name) + '</span> ' + ex.name + '</span><span style="font-size:12px;color:var(--muted);">' + ex.sets + '×' + reps + rir + '</span></div>';
    const existingSets = existingLog ? existingLog.sets.filter(s => s.exercise === ex.name) : [];
    for (let s = 0; s < ex.sets; s++) {{
      const existing = existingSets[s] || {{}};
      const done = existing.done || false;
      const setDiv = document.createElement('div');
      setDiv.className = 'set-log';
      setDiv.innerHTML = '<input type="checkbox" class="set-done" data-e="' + ei + '" data-s="' + s + '"' + (done ? ' checked' : '') + '> ' +
        '<span class="set-inputs" id="si-' + ei + '-' + s + '">' +
        '<label>kg</label><input type="number" step="0.5" class="set-kg" data-e="' + ei + '" data-s="' + s + '" value="' + (existing.kg || '') + '" placeholder="' + (ex.weight || 'RM') + '"> ' +
        '<label>reps</label><input type="number" class="set-reps" data-e="' + ei + '" data-s="' + s + '" value="' + (existing.reps || '') + '" placeholder="' + reps + '"> ' +
        '<label>RPE</label><input type="number" step="0.5" min="1" max="10" class="set-rpe" data-e="' + ei + '" data-s="' + s + '" value="' + (existing.rpe || '') + '" placeholder="-" style="width:46px;">' +
        '</span>' +
        '<span class="rest-timer" data-minutes="' + (parseFloat(ex.rest) || 2) + '" data-e="' + ei + '" data-s="' + s + '">⏱</span>';
      card.appendChild(setDiv);
      if (done) document.getElementById('si-' + ei + '-' + s)?.classList.add('dimmed');
    }}
    if (ex.notes) {{
      const note = document.createElement('div');
      note.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
      note.textContent = '📝 ' + ex.notes;
      card.appendChild(note);
    }}
    container.appendChild(card);
  }});

  // checkbox → dim
  document.querySelectorAll('.set-done').forEach(cb => {{
    cb.addEventListener('change', () => {{
      const el = document.getElementById('si-' + cb.dataset.e + '-' + cb.dataset.s);
      if (el) el.classList.toggle('dimmed', cb.checked);
    }});
  }});

  // rest timer
  document.querySelectorAll('.rest-timer').forEach(el => {{
    el.addEventListener('click', () => startRestTimer(el));
  }});
}}

function startRestTimer(el) {{
  if (restInterval) {{ clearInterval(restInterval); restInterval = null; }}
  const total = parseInt(el.dataset.minutes) * 60;
  let remaining = total;
  el.classList.add('active');
  el.textContent = '⏱ ' + Math.ceil(remaining / 60) + ':00';
  restInterval = setInterval(() => {{
    remaining--;
    if (remaining <= 0) {{
      clearInterval(restInterval); restInterval = null;
      el.textContent = '⏱ 0:00';
      el.classList.remove('active');
      showToast('⏰ Rest over!');
      return;
    }}
    const m = Math.floor(remaining / 60);
    const sec = remaining % 60;
    el.textContent = '⏱ ' + m + ':' + String(sec).padStart(2, '0');
  }}, 1000);
}}

document.getElementById('save-workout').addEventListener('click', () => {{
  const session = getCurrentPhase().sessions[currentSessionIdx];
  if (!session) {{ showToast('No session selected'); return; }}
  const date = getDateStr();
  const existingIdx = data.workouts.findIndex(w => w.session === session.day && w.date === date);
  const sets = [];
  document.querySelectorAll('.set-kg').forEach(inp => {{
    const ei = parseInt(inp.dataset.e);
    const s = parseInt(inp.dataset.s);
    const ex = session.exercises[ei];
    const done = document.querySelector('.set-done[data-e="' + ei + '"][data-s="' + s + '"]')?.checked || false;
    const kg = inp.value;
    const reps = document.querySelector('.set-reps[data-e="' + ei + '"][data-s="' + s + '"]').value;
    const rpe = document.querySelector('.set-rpe[data-e="' + ei + '"][data-s="' + s + '"]').value;
    sets.push({{ exercise: ex.name, set: s + 1, done, kg: kg ? parseFloat(kg) : null, reps: reps ? parseInt(reps) : null, rpe: rpe ? parseFloat(rpe) : null }});
  }});
  const entry = {{ date, session: session.day, phase: getCurrentPhase().name, focus: session.focus, sets }};
  if (existingIdx >= 0) data.workouts[existingIdx] = entry;
  else data.workouts.push(entry);
  saveData();
  renderWorkout();
  showToast('✅ Workout saved!');
}});

// ── Check-in Tab ──
document.getElementById('save-checkin').addEventListener('click', () => {{
  const weight = parseFloat(document.getElementById('ci-weight').value);
  const sleep = parseFloat(document.getElementById('ci-sleep').value);
  const readiness = parseInt(document.getElementById('ci-readiness').value);
  const soreness = document.getElementById('ci-soreness').value;
  const adherence = document.getElementById('ci-adherence').value;
  const mood = document.getElementById('ci-mood').value;
  const notes = document.getElementById('ci-notes').value;
  if (!weight && !sleep && !readiness) {{ showToast('Fill at least weight, sleep, or readiness'); return; }}
  const date = getDateStr();
  const existingIdx = data.checkins.findIndex(c => c.date === date);
  const entry = {{ date, weight_kg: weight || null, sleep_hours: sleep || null, readiness: readiness || null, soreness: soreness || null, adherence_pct: adherence || null, mood: mood || null, notes: notes || '' }};
  if (existingIdx >= 0) data.checkins[existingIdx] = entry;
  else data.checkins.push(entry);
  saveData();
  ['ci-weight','ci-sleep','ci-readiness','ci-soreness','ci-adherence','ci-mood','ci-notes'].forEach(id => document.getElementById(id).value = '');
  showToast('📝 Check-in saved!');
}});

// ── Program Tab ──
function renderProgram() {{
  const container = document.getElementById('program-view');
  const p = PROGRAM.program;
  let html = '<div class="card"><h3 style="margin:0;">' + p.split + '</h3><p style="font-size:13px;color:var(--muted);margin-top:4px;">' + (p.weekly_schedule || '') + '</p></div>';
  p.phases.forEach(phase => {{
    html += '<h2>' + phase.name + ' (' + phase.duration + ')</h2><p style="font-size:13px;color:var(--muted);margin-bottom:8px;">' + phase.goal + '</p>';
    phase.sessions.forEach(session => {{
      html += '<div class="card"><div class="card-title">' + session.day + ' — ' + session.focus + '</div>';
      session.exercises.forEach(ex => {{
        html += '<div class="exercise-row"><div class="exercise-name"><span class="icon">' + getIcon(ex.name) + '</span> ' + ex.name + '</div>';
        html += '<div class="exercise-prescription">' + ex.sets + ' sets × ' + (ex.reps || 'N/A') + (ex.rir ? ' · RIR ' + ex.rir : '') + (ex.rest ? ' · Rest ' + ex.rest : '') + '</div>';
        if (ex.notes) html += '<div class="exercise-prescription" style="color:var(--orange);">📝 ' + ex.notes + '</div>';
        html += '</div>';
      }});
      if (session.notes) html += '<p style="font-size:12px;color:var(--muted);margin-top:4px;">' + session.notes + '</p>';
      html += '</div>';
    }});
    if (phase.progression_notes) html += '<p style="font-size:12px;color:var(--orange);margin-bottom:12px;">📈 ' + phase.progression_notes + '</p>';
  }});
  if (p.warm_up_protocol) html += '<div class="card"><div class="card-title">🔥 Warm-up</div><p style="font-size:13px;white-space:pre-line;">' + p.warm_up_protocol + '</p></div>';
  if (p.cool_down_protocol) html += '<div class="card"><div class="card-title">🧊 Cool-down</div><p style="font-size:13px;white-space:pre-line;">' + p.cool_down_protocol + '</p></div>';
  container.innerHTML = html;
}}

// ── Stats ──
function renderStats() {{
  const row = document.getElementById('stats-row');
  const totalWorkouts = data.workouts.length;
  const totalCheckins = data.checkins.length;
  const avgReadiness = data.checkins.filter(c => c.readiness).reduce((a, c, _, arr) => a + c.readiness / arr.length, 0) || 0;
  const avgSleep = data.checkins.filter(c => c.sleep_hours).reduce((a, c, _, arr) => a + c.sleep_hours / arr.length, 0) || 0;
  const totalVolume = data.workouts.reduce((sum, w) => sum + w.sets.reduce((s, set) => s + ((set.kg || 0) * (set.reps || 0)), 0), 0);
  row.innerHTML = '<div class="stat-card"><div class="value">' + totalWorkouts + '</div><div class="label">Workouts</div></div>' +
    '<div class="stat-card"><div class="value">' + totalCheckins + '</div><div class="label">Check-ins</div></div>' +
    '<div class="stat-card"><div class="value">' + (avgReadiness ? avgReadiness.toFixed(1) : '-') + '</div><div class="label">Avg Readiness</div></div>' +
    '<div class="stat-card"><div class="value">' + (avgSleep ? avgSleep.toFixed(1) + 'h' : '-') + '</div><div class="label">Avg Sleep</div></div>' +
    '<div class="stat-card"><div class="value">' + (totalVolume ? (totalVolume / 1000).toFixed(1) + 'k' : '-') + '</div><div class="label">Total Vol (kg)</div></div>';
}}

// ── Charts ──
function renderCharts() {{
  renderWeightChart();
  renderVolumeChart();
}}

function renderWeightChart() {{
  const box = document.getElementById('weight-chart-box');
  const canvas = document.getElementById('weight-chart');
  const checkins = data.checkins.filter(c => c.weight_kg).sort((a, b) => a.date.localeCompare(b.date));
  if (checkins.length < 2) {{ box.style.display = 'none'; return; }}
  box.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 24;
  const h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  const pad = {{ top: 10, bottom: 20, left: 40, right: 10 }};
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const vals = checkins.map(c => c.weight_kg);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const xScale = cw / (checkins.length - 1 || 1);
  const yScale = ch / (max - min || 1);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--chart-line').trim() || '#e94560';
  ctx.lineWidth = 2;
  ctx.beginPath();
  checkins.forEach((c, i) => {{
    const x = pad.left + i * xScale, y = pad.top + ch - (c.weight_kg - min) * yScale;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }});
  ctx.stroke();
  // fill
  const last = checkins[checkins.length - 1];
  ctx.lineTo(pad.left + (checkins.length - 1) * xScale, pad.top + ch);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--chart-fill').trim() || 'rgba(233,69,96,0.15)';
  ctx.fill();
  // dots
  checkins.forEach((c, i) => {{
    const x = pad.left + i * xScale, y = pad.top + ch - (c.weight_kg - min) * yScale;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--chart-line').trim() || '#e94560';
    ctx.lineWidth = 1.5; ctx.stroke();
  }});
}}

function renderVolumeChart() {{
  const box = document.getElementById('volume-chart-box');
  const canvas = document.getElementById('volume-chart');
  const sorted = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date));
  const vols = sorted.map(w => ({{
    date: w.date, session: w.session,
    vol: w.sets.reduce((s, set) => s + ((set.kg || 0) * (set.reps || 0)), 0)
  }})).filter(v => v.vol > 0);
  if (vols.length < 2) {{ box.style.display = 'none'; return; }}
  box.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 24;
  const h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  const pad = {{ top: 10, bottom: 20, left: 40, right: 10 }};
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const maxVol = Math.max(...vols.map(v => v.vol)) * 1.1;
  const barW = cw / vols.length * 0.7;
  const gap = cw / vols.length * 0.3;
  ctx.clearRect(0, 0, w, h);
  vols.forEach((v, i) => {{
    const x = pad.left + i * (barW + gap) + gap / 2;
    const bh = (v.vol / maxVol) * ch;
    const y = pad.top + ch - bh;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--chart-line').trim() || '#e94560';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#8899aa';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v.session.substring(0, 3), x + barW / 2, h - 4);
  }});
}}

// ── History Tab ──
function renderHistory() {{
  const container = document.getElementById('history-list');
  if (!data.workouts.length && !data.checkins.length) {{
    container.innerHTML = '<p style="color:var(--muted);">No logs yet. Start by saving a workout or check-in.</p>';
    return;
  }}
  let html = '';
  const allDates = [...new Set([...data.workouts.map(w => w.date), ...data.checkins.map(c => c.date)])].sort().reverse();
  allDates.forEach(date => {{
    html += '<div class="history-item"><div class="date">' + date + '</div>';
    const w = data.workouts.filter(w => w.date === date);
    const c = data.checkins.find(c => c.date === date);
    if (w.length) html += w.map(wk => {{
      const done = wk.sets.filter(s => s.done).length;
      const total = wk.sets.length;
      const vol = wk.sets.reduce((s, set) => s + ((set.kg || 0) * (set.reps || 0)), 0);
      return '<div class="detail">💪 ' + wk.session + ' — ' + done + '/' + total + ' sets' + (vol ? ' · ' + vol.toLocaleString() + ' kg volume' : '') + '</div>';
    }}).join('');
    if (c) {{
      const parts = [];
      if (c.weight_kg) parts.push('⚖️ ' + c.weight_kg + ' kg');
      if (c.sleep_hours) parts.push('😴 ' + c.sleep_hours + 'h');
      if (c.readiness) parts.push('🔋 ' + c.readiness + '/10');
      if (c.soreness) parts.push('🤕 ' + c.soreness);
      if (c.mood) parts.push('😊 ' + c.mood);
      html += '<div class="detail">' + parts.join(' · ') + '</div>';
    }}
    html += '</div>';
  }});
  container.innerHTML = html;
}}

document.getElementById('export-logs').addEventListener('click', () => {{
  const blob = new Blob([JSON.stringify({{ user_id: PROGRAM.client.user_id, name: PROGRAM.client.name, exported_at: new Date().toISOString(), ...data }}, null, 2)], {{ type: 'application/json' }});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tracker_' + PROGRAM.client.user_id + '_' + getDateStr() + '.json';
  a.click();
  showToast('📥 Logs exported');
}});

document.getElementById('submit-logs').addEventListener('click', async () => {{
  const payload = {{ user_id: PROGRAM.client.user_id, name: PROGRAM.client.name, exported_at: new Date().toISOString(), ...data }};
  const btn = document.getElementById('submit-logs');
  btn.disabled = true; btn.textContent = '⏳ Submitting...';
  try {{
    const resp = await fetch('/api/tracker/log', {{ method: 'POST', headers: {{ 'Content-Type': 'application/json' }}, body: JSON.stringify(payload) }});
    if (resp.ok) {{ showToast('📤 Submitted to coach!'); document.getElementById('sync-status').textContent = 'Last submitted: ' + new Date().toLocaleString(); }}
    else {{ const err = await resp.json(); showToast('❌ Submit failed: ' + (err.detail || 'unknown error'), true); }}
  }} catch (e) {{ showToast('❌ Could not reach server. Check connection.', true); }}
  btn.disabled = false; btn.textContent = '📤 Submit to Coach';
}});

document.getElementById('clear-data').addEventListener('click', () => {{
  if (!confirm('Clear all local tracker data?')) return;
  data = {{ workouts: [], checkins: [] }};
  saveData();
  renderHistory(); renderStats(); renderCharts();
  showToast('🗑️ Local data cleared');
}});

function showToast(msg, isError) {{
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '') + ' show';
  setTimeout(() => el.classList.remove('show'), 2500);
}}

// ── Init ──
currentSessionIdx = getTodaySessionIndex();
renderWorkout();

// debounced chart redraw on resize
let resizeTimer;
window.addEventListener('resize', () => {{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {{ if (document.getElementById('sec-history').classList.contains('active')) renderCharts(); }}, 300);
}});

</script>
</body>
</html>"""


def generate_tracker_html(pc: ProgramContent) -> str:
    """Generate a self-contained HTML workout tracker from ProgramContent."""
    program_json = pc.model_dump_json(indent=2)
    client_name = pc.client.name or pc.client.user_id
    goal_label = pc.client.goal.replace("_", " ").title() if pc.client.goal else "Fitness"
    split_label = pc.program.split if pc.program.split else "Custom"
    generated_date = datetime.now().strftime("%b %d, %Y")

    html = TRACKER_HTML_TEMPLATE
    html = html.replace("{CLIENT_NAME}", client_name)
    html = html.replace("{GOAL_LABEL}", goal_label)
    html = html.replace("{SPLIT_LABEL}", split_label)
    html = html.replace("{GENERATED_DATE}", generated_date)
    html = html.replace("{PROGRAM_JSON}", program_json)
    return html


def generate_tracker_file(pc: ProgramContent, user_id: str) -> str:
    """Generate and save the HTML tracker file. Returns the file path."""
    os.makedirs(TRACKERS_DIR, exist_ok=True)
    html = generate_tracker_html(pc)
    file_path = os.path.join(TRACKERS_DIR, f"{user_id}_tracker.html")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html)
    return file_path
