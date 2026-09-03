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
  :root { --primary: #14151A; --accent: #F4C93B; --bg: #1E2027; --card: #2A2C33; --text: #FAFAF8; --muted: #8A8D96; --green: #2ecc71; --orange: #f39c12; --border: #2A2C33; --card-hover: rgba(244,201,59,0.06); --shadow: rgba(0,0,0,0.3); --chart-line: #F4C93B; --chart-fill: rgba(244,201,59,0.15); }
  .light { --primary: #FAFAF8; --accent: #14151A; --bg: #FAFAF8; --card: #FAFAF8; --text: #14151A; --muted: #5B5F68; --border: #E4E1D8; --card-hover: rgba(20,21,26,0.03); --shadow: rgba(0,0,0,0.06); --chart-line: #14151A; --chart-fill: rgba(20,21,26,0.08); }
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
    <div class="card rings-card" style="display:flex;align-items:center;gap:14px;margin-bottom:12px;padding:12px 14px;background:var(--card);border-radius:12px;box-shadow:0 1px 4px var(--shadow);">
      <div id="workout-rings" style="width:105px;height:105px;flex-shrink:0;"></div>
      <div style="flex:1;">
        <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.8px;">Activity Targets</div>
        <div style="font-size:12px;color:var(--text);margin-top:4px;">Session Sets: <span id="vol-ring-val" style="color:#F4C93B;font-weight:700;">0/0</span></div>
        <div style="font-size:12px;color:var(--text);margin-top:2px;">Weekly Adherence: <span id="adh-ring-val" style="color:#22c55e;font-weight:700;">100%</span></div>
        <div style="font-size:12px;color:var(--text);margin-top:2px;">System Readiness: <span id="rec-ring-val" style="color:#38bdf8;font-weight:700;">80%</span></div>
      </div>
    </div>
    <div class="card whoop-card" id="whoop-strain-card" style="display:flex;align-items:center;justify-content:space-around;margin-bottom:14px;padding:12px;background:var(--card);border-radius:12px;box-shadow:0 1px 4px var(--shadow);flex-wrap:wrap;">
      <div id="whoop-strain-dial" style="width:160px;height:160px;"></div>
      <div style="font-size:12px;color:var(--text);margin:6px 0;">
        <div style="font-weight:700;color:#f97316;text-transform:uppercase;margin-bottom:4px;">⚡ Workout Strain</div>
        <div>Session Volume: <span id="session-tonnage" style="font-weight:700;color:var(--text);">0 kg</span></div>
        <div>Completed Sets: <span id="session-sets-count" style="font-weight:700;color:var(--text);">0</span></div>
        <div style="margin-top:4px;color:#F4C93B;">Target Strain: <span id="strain-corridor-label">14.0 – 17.0</span></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h2 style="margin:0;">Today's Session</h2>
      <span id="today-label" style="font-size:13px;color:var(--muted);"></span>
    </div>
    <div class="session-nav" id="session-nav"></div>
    <div id="workout-exercises"></div>
    <button class="btn btn-primary" id="save-workout" style="margin-top:12px;">💾 Save This Session</button>
  </div>

  <div class="section" id="sec-checkin">
    <div class="card whoop-card" id="whoop-recovery-card" style="display:flex;align-items:center;justify-content:space-around;margin-bottom:14px;padding:14px;background:var(--card);border-radius:12px;box-shadow:0 1px 4px var(--shadow);flex-wrap:wrap;">
      <div id="whoop-recovery-arc" style="width:180px;height:180px;"></div>
      <div style="flex:1;min-width:180px;margin-left:12px;">
        <div id="whoop-sleep-perf" style="margin-bottom:10px;"></div>
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">Behavioral Habits:</div>
        <div id="whoop-journal-tags"></div>
      </div>
    </div>
    <div class="card gauge-card" style="display:flex;flex-direction:column;align-items:center;margin-bottom:14px;padding:12px;background:var(--card);border-radius:12px;box-shadow:0 1px 4px var(--shadow);">
      <div id="checkin-gauge" style="width:220px;height:140px;"></div>
    </div>
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
      <div id="weight-chart-container" style="width:100%;height:150px;"></div>
      <canvas id="weight-chart" style="display:none;"></canvas>
    </div>
    <div class="chart-container" id="volume-chart-box" style="display:none;">
      <h3>💪 Volume Trend (total kg per session)</h3>
      <canvas id="volume-chart"></canvas>
    </div>
    <div class="chart-container" id="consistency-chart-box">
      <h3>🔥 12-Week Consistency Heatmap</h3>
      <div id="consistency-heatmap" style="overflow-x:auto;padding:6px 0;"></div>
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

const STORAGE_KEY = 'mos_tracker_' + (PROGRAM.client?.user_id || PROGRAM.client?.name || 'default');
const THEME_KEY = 'mos_theme_' + (PROGRAM.client?.user_id || PROGRAM.client?.name || 'default');
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{{"workouts":[],"checkins":[]}}');
let currentSessionIdx = 0;
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
    if (tab.dataset.tab === 'workout') {{ renderWorkout(); renderRings(); renderWhoopStrain(); }}
    if (tab.dataset.tab === 'checkin') {{ renderGauge(); renderWhoopRecovery(); }}
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

  // checkbox → dim & update strain/rings
  document.querySelectorAll('.set-done').forEach(cb => {{
    cb.addEventListener('change', () => {{
      const el = document.getElementById('si-' + cb.dataset.e + '-' + cb.dataset.s);
      if (el) el.classList.toggle('dimmed', cb.checked);
      renderRings();
      renderWhoopStrain();
    }});
  }});

  document.querySelectorAll('.set-kg, .set-reps').forEach(inp => {{
    inp.addEventListener('input', () => {{
      renderWhoopStrain();
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

// ── Health Visualizers: Apple Health Rings & Samsung Health Gauge ──
function renderRings() {{
  const container = document.getElementById('workout-rings');
  if (!container) return;
  const session = getCurrentPhase().sessions[currentSessionIdx];
  const existingLog = data.workouts.find(w => w.session === session?.day && w.date === getDateStr());
  const doneSets = existingLog ? existingLog.sets.filter(s => s.done).length : 0;
  const totalSets = session ? session.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0) : 10;
  const volPct = Math.min(Math.round((doneSets / (totalSets || 1)) * 100), 100);

  // Adherence: checkins in last 7 days
  const today = new Date();
  let past7Count = 0;
  for (let i = 0; i < 7; i++) {{
    const d = new Date(); d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (data.checkins.some(c => c.date === ds) || data.workouts.some(w => w.date === ds)) past7Count++;
  }}
  const adhPct = Math.min(Math.round((past7Count / 7) * 100), 100);

  // Readiness from latest checkin
  const latestCheckin = data.checkins.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const readinessPct = latestCheckin && latestCheckin.readiness ? Math.min(latestCheckin.readiness * 10, 100) : 80;

  document.getElementById('vol-ring-val').textContent = doneSets + '/' + totalSets + ' (' + volPct + '%)';
  document.getElementById('adh-ring-val').textContent = adhPct + '%';
  document.getElementById('rec-ring-val').textContent = readinessPct + '%';

  // Render Rings Canvas
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  const size = 105;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const rings = [
    {{ r: 42, val: volPct, color: '#F4C93B' }},
    {{ r: 31, val: adhPct, color: '#22c55e' }},
    {{ r: 20, val: readinessPct, color: '#38bdf8' }}
  ];

  ctx.clearRect(0, 0, size, size);
  rings.forEach(ring => {{
    // track
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = ring.color;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 7;
    ctx.stroke();

    // active
    if (ring.val > 0) {{
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      const start = -Math.PI / 2;
      const end = start + (Math.PI * 2 * (ring.val / 100));
      ctx.arc(cx, cy, ring.r, start, end, false);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke();
    }}
  }});
  ctx.globalAlpha = 1.0;
}}

function renderGauge() {{
  const container = document.getElementById('checkin-gauge');
  if (!container) return;
  const latestCheckin = data.checkins.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const score = latestCheckin && latestCheckin.readiness ? latestCheckin.readiness * 10 : 80;
  const status = score >= 85 ? 'OPTIMAL' : (score >= 70 ? 'GOOD' : (score >= 50 ? 'MODERATE' : 'REST'));

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  const w = 220, h = 135;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = w / 2, cy = h * 0.76;
  const radius = 68;
  const startAngle = Math.PI * 0.8;
  const endAngle = Math.PI * 2.2;
  const totalSpan = endAngle - startAngle;

  // track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  // active gradient
  const activeEnd = startAngle + (totalSpan * (score / 100));
  const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#22c55e');
  grad.addColorStop(1, '#F4C93B');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, activeEnd, false);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  // readout
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#FAFAF8';
  ctx.font = '700 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(score, cx, cy - 14);

  ctx.fillStyle = score >= 70 ? '#F4C93B' : '#38bdf8';
  ctx.font = '700 12px sans-serif';
  ctx.fillText(status, cx, cy + 12);

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || 'rgba(250,250,248,0.5)';
  ctx.font = '600 10px sans-serif';
  ctx.fillText('READINESS SCORE', cx, cy + 28);
}}

// ── WHOOP Physiological Visualizers: Recovery & Strain ──
let whoopHabitDelta = 0;
const defaultHabits = [
  {{ id: 'mag_zinc', label: 'Magnesium/Zinc', delta: 5, active: false }},
  {{ id: 'sleep_8h', label: '8h+ Sleep', delta: 8, active: true }},
  {{ id: 'hydration', label: 'Hydration Hit', delta: 4, active: true }},
  {{ id: 'sauna', label: 'Sauna/Cold', delta: 3, active: false }},
  {{ id: 'late_meal', label: 'Late Meal', delta: -4, active: false }},
  {{ id: 'caffeine', label: 'Caffeine > 2pm', delta: -6, active: false }}
];

function renderWhoopRecovery() {{
  const container = document.getElementById('whoop-recovery-arc');
  if (!container) return;
  const latestCheckin = data.checkins.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const baseReadiness = latestCheckin && latestCheckin.readiness ? latestCheckin.readiness * 10 : 80;
  const baseSleep = latestCheckin && latestCheckin.sleep_hours ? latestCheckin.sleep_hours : 7.5;
  const recoveryScore = Math.max(1, Math.min(100, Math.round(baseReadiness + whoopHabitDelta)));

  // WHOOP Arc Colors
  let zoneColor = '#22c55e', zoneLabel = 'GREEN RECOVERY', zoneDesc = 'Primed for High Strain';
  if (recoveryScore < 34) {{
    zoneColor = '#f43f5e'; zoneLabel = 'RED RECOVERY'; zoneDesc = 'Impaired · Active Rest';
  }} else if (recoveryScore < 67) {{
    zoneColor = '#fbbf24'; zoneLabel = 'YELLOW RECOVERY'; zoneDesc = 'Baseline · Moderate Strain';
  }}

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  const size = 180;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size * 0.48;
  const radius = size * 0.38;
  const strokeW = 12;
  const startAngle = Math.PI * 0.75;
  const totalSweep = Math.PI * 1.5;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + totalSweep, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Active
  const sweep = totalSweep * (recoveryScore / 100);
  ctx.save();
  ctx.shadowColor = zoneColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + sweep, false);
  ctx.strokeStyle = zoneColor;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Text
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#FAFAF8';
  ctx.font = '700 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(recoveryScore + '%', cx, cy - 4);

  ctx.fillStyle = zoneColor;
  ctx.font = '700 11px sans-serif';
  ctx.fillText(zoneLabel, cx, cy + 20);

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || 'rgba(250,250,248,0.5)';
  ctx.font = '600 10px monospace';
  ctx.fillText('HRV 68ms · RHR 54bpm', cx, cy + 36);

  ctx.font = '400 9px sans-serif';
  ctx.fillText(zoneDesc, cx, size * 0.92);

  // Sleep Perf Bar
  const sleepEl = document.getElementById('whoop-sleep-perf');
  if (sleepEl) {{
    const needH = 8.0;
    const perfPct = Math.min(100, Math.round((baseSleep / needH) * 100));
    const debtM = Math.round((baseSleep - needH) * 60);
    sleepEl.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:4px;"><span>SLEEP PERFORMANCE</span><span>' + perfPct + '%</span></div>' +
      '<div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-family:monospace;">' + baseSleep.toFixed(1) + 'h logged / ' + needH + 'h need (' + (debtM >= 0 ? '+' : '') + debtM + 'm)</div>' +
      '<div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;"><div style="width:' + perfPct + '%;background:#38bdf8;height:100%;border-radius:4px;"></div></div>';
  }}

  // Journal Tags
  const tagsEl = document.getElementById('whoop-journal-tags');
  if (tagsEl) {{
    tagsEl.innerHTML = '';
    tagsEl.style.display = 'flex';
    tagsEl.style.flexWrap = 'wrap';
    tagsEl.style.gap = '6px';
    defaultHabits.forEach(h => {{
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = 'padding:4px 8px;border-radius:12px;font-size:10px;font-weight:600;cursor:pointer;transition:all .2s;' +
        (h.active ? (h.delta > 0 ? 'background:rgba(34,197,94,0.2);border:1px solid #22c55e;color:#4ade80;' : 'background:rgba(244,63,94,0.2);border:1px solid #f43f5e;color:#fb7185;') : 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--muted);');
      b.textContent = (h.active ? '✓ ' : '+ ') + h.label + ' (' + (h.delta > 0 ? '+' : '') + h.delta + '%)';
      b.addEventListener('click', () => {{
        h.active = !h.active;
        whoopHabitDelta = defaultHabits.filter(x => x.active).reduce((sum, x) => sum + x.delta, 0);
        renderWhoopRecovery();
      }});
      tagsEl.appendChild(b);
    }});
  }}
}}

function renderWhoopStrain() {{
  const container = document.getElementById('whoop-strain-dial');
  if (!container) return;

  // Calculate live session tonnage and sets
  const session = getCurrentPhase().sessions[currentSessionIdx];
  let tonnage = 0, doneSets = 0;
  document.querySelectorAll('.set-row').forEach(row => {{
    const cb = row.querySelector('.set-done');
    const repsInput = row.querySelector('.set-reps');
    const kgInput = row.querySelector('.set-kg');
    if (cb && cb.checked) {{
      doneSets++;
      const r = parseFloat(repsInput?.value) || 0;
      const k = parseFloat(kgInput?.value) || 0;
      tonnage += (r * k);
    }}
  }});

  // Non-linear strain formula (0.0 to 21.0)
  const strain = Math.min(21.0, (1 - Math.exp(-0.00032 * tonnage)) * 17.5 + (doneSets * 0.35));

  // Determine recovery target corridor
  const latestCheckin = data.checkins.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const rec = latestCheckin && latestCheckin.readiness ? latestCheckin.readiness * 10 : 80;
  let targetMin = 14.0, targetMax = 17.5;
  if (rec < 34) {{ targetMin = 6.0; targetMax = 10.0; }}
  else if (rec < 67) {{ targetMin = 10.5; targetMax = 14.5; }}

  // Update DOM labels
  const tonEl = document.getElementById('session-tonnage');
  const cntEl = document.getElementById('session-sets-count');
  const corEl = document.getElementById('strain-corridor-label');
  if (tonEl) tonEl.textContent = Math.round(tonnage).toLocaleString() + ' kg';
  if (cntEl) cntEl.textContent = doneSets;
  if (corEl) corEl.textContent = targetMin.toFixed(1) + ' – ' + targetMax.toFixed(1);

  // Colors & tiers
  let color = '#0284c7', cat = 'LIGHT STRAIN';
  if (strain >= 18.0) {{ color = '#ef4444'; cat = 'ALL-OUT'; }}
  else if (strain >= 14.0) {{ color = '#f97316'; cat = 'STRENUOUS'; }}
  else if (strain >= 10.0) {{ color = '#8b5cf6'; cat = 'MODERATE'; }}

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  const size = 160;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size * 0.48;
  const radius = size * 0.38;
  const strokeW = 10;
  const startAngle = Math.PI * 0.8;
  const totalSweep = Math.PI * 1.4;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + totalSweep, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Target corridor on track
  const tStart = startAngle + (totalSweep * (targetMin / 21.0));
  const tEnd = startAngle + (totalSweep * (targetMax / 21.0));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, tStart, tEnd, false);
  ctx.strokeStyle = 'rgba(244, 201, 59, 0.35)';
  ctx.lineWidth = strokeW + 4;
  ctx.stroke();

  // Active Arc
  const currentSweep = totalSweep * (strain / 21.0);
  if (currentSweep > 0.01) {{
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + currentSweep, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }}

  // Center strain
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#FAFAF8';
  ctx.font = '700 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(strain.toFixed(1), cx, cy - 6);

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || 'rgba(250,250,248,0.5)';
  ctx.font = '600 10px monospace';
  ctx.fillText('/ 21.0 STRAIN', cx, cy + 16);

  ctx.fillStyle = color;
  ctx.font = '700 10px sans-serif';
  ctx.fillText(cat, cx, cy + 28);
}}

// ── Charts ──
function renderCharts() {{
  renderWeightChart();
  renderVolumeChart();
  renderHeatmap();
}}

function renderWeightChart() {{
  const box = document.getElementById('weight-chart-box');
  const container = document.getElementById('weight-chart-container');
  const checkins = data.checkins.filter(c => c.weight_kg).sort((a, b) => a.date.localeCompare(b.date));
  if (checkins.length < 2) {{ box.style.display = 'none'; return; }}
  box.style.display = 'block';

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const rect = container.getBoundingClientRect();
  const w = rect.width > 0 ? rect.width : 340;
  const h = 150;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = {{ top: 16, bottom: 24, left: 38, right: 16 }};
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const vals = checkins.map(c => c.weight_kg);
  const min = Math.min(...vals) - 0.5;
  const max = Math.max(...vals) + 0.5;
  const spread = Math.max(max - min, 0.1);

  const pts = checkins.map((c, i) => ({{
    x: pad.left + (i * (cw / (checkins.length - 1 || 1))),
    y: pad.top + ch - (((c.weight_kg - min) / spread) * ch),
    date: c.date,
    weight: c.weight_kg
  }}));

  // Area gradient
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {{
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }}
  ctx.lineTo(pts[pts.length - 1].x, pad.top + ch);
  ctx.lineTo(pts[0].x, pad.top + ch);
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  areaGrad.addColorStop(0, 'rgba(244, 201, 59, 0.25)');
  areaGrad.addColorStop(1, 'rgba(244, 201, 59, 0.0)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Curve line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {{
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }}
  ctx.strokeStyle = '#F4C93B';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Dots & min/max labels
  pts.forEach(p => {{
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#F4C93B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }});

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#8899aa';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(vals[0] + ' kg', pad.left, h - 6);
  ctx.textAlign = 'right';
  ctx.fillText(vals[vals.length - 1] + ' kg', w - pad.right, h - 6);
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
  const pad = {{ top: 10, bottom: 22, left: 40, right: 10 }};
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const maxVol = Math.max(...vols.map(v => v.vol)) * 1.1;
  const barW = Math.max((cw / vols.length) * 0.65, 8);
  const gap = (cw / vols.length) * 0.35;
  ctx.clearRect(0, 0, w, h);
  vols.forEach((v, i) => {{
    const x = pad.left + i * (barW + gap) + gap / 2;
    const bh = (v.vol / maxVol) * ch;
    const y = pad.top + ch - bh;
    
    // Rounded bar top
    ctx.fillStyle = '#F4C93B';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]) : ctx.rect(x, y, barW, bh);
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#8899aa';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v.session.substring(0, 3), x + barW / 2, h - 6);
  }});
}}

function renderHeatmap() {{
  const container = document.getElementById('consistency-heatmap');
  if (!container) return;
  const logMap = {{}};
  data.workouts.forEach(w => {{ logMap[w.date] = (logMap[w.date] || 0) + 1; }});
  data.checkins.forEach(c => {{ logMap[c.date] = (logMap[c.date] || 0) + 1; }});

  const weeks = 12;
  const today = new Date();
  const cellSize = 11, gap = 3;
  const w = (weeks * (cellSize + gap)) + 16;
  const h = (7 * (cellSize + gap)) + 10;

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);
  for (let c = 0; c < weeks; c++) {{
    for (let r = 0; r < 7; r++) {{
      const dayOffset = ((weeks - 1 - c) * 7) + (6 - r);
      const d = new Date();
      d.setDate(today.getDate() - dayOffset);
      const iso = d.toISOString().split('T')[0];
      const count = logMap[iso] || 0;

      let fill = 'rgba(255, 255, 255, 0.06)';
      if (count >= 2) fill = '#F4C93B';
      else if (count === 1) fill = 'rgba(244, 201, 59, 0.45)';

      const x = 4 + (c * (cellSize + gap));
      const y = 4 + (r * (cellSize + gap));
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, cellSize, cellSize, 2) : ctx.rect(x, y, cellSize, cellSize);
      ctx.fillStyle = fill;
      ctx.fill();
    }}
  }}
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
renderRings();
renderWhoopStrain();

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
    program_json = pc.model_dump_json(indent=2).replace("</script>", "<\\/script>")
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
