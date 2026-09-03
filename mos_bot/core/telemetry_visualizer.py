"""Interactive Telemetry Visualizer for Muscle OS Check-ins & Coaching Dashboards.

Generates:
1. Self-contained modern SVG sparkline charts for weight trends & EMA.
2. SVG circular gauges for Systemic Readiness & Allostatic Load.
3. Clean text-based ASCII sparklines and progress bars for Telegram Bot messages.
"""

from typing import List, Optional, Tuple


def calculate_ema(data: List[float], span: int = 3) -> List[float]:
    """Calculate Exponentially Weighted Moving Average (EMA)."""
    if not data:
        return []
    alpha = 2.0 / (span + 1)
    ema = [data[0]]
    for val in data[1:]:
        ema.append(round(alpha * val + (1 - alpha) * ema[-1], 2))
    return ema


def generate_ascii_bar(val: float, max_val: float = 10.0, length: int = 10) -> str:
    """Generate a clean unicode progress bar."""
    if max_val <= 0:
        return "░" * length
    fraction = max(0.0, min(1.0, val / max_val))
    filled = int(round(fraction * length))
    return "█" * filled + "░" * (length - filled)


def generate_ascii_sparkline(values: List[float]) -> str:
    """Generate unicode sparkline ( ▂▃▄▅▆▇█) from numeric series."""
    if not values:
        return ""
    if len(values) == 1:
        return "▅"
    
    ticks = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    min_v = min(values)
    max_v = max(values)
    spread = max_v - min_v
    
    if spread == 0:
        return "▅" * len(values)
    
    res = []
    for v in values:
        idx = int((v - min_v) / spread * (len(ticks) - 1))
        res.append(ticks[idx])
    return "".join(res)


def render_ascii_telemetry_card(weights: List[float], readiness: int, sleep: float, adherence: int) -> str:
    """Render a structured Apple/Samsung Health-styled ASCII summary card for Telegram / Chat."""
    lines = ["📊 **Weekly Telemetry Overview**"]
    
    # Weight trend
    if weights and len(weights) >= 2:
        spark = generate_ascii_sparkline(weights)
        delta = weights[-1] - weights[0]
        arrow = "↘️" if delta < 0 else ("↗️" if delta > 0 else "➡️")
        lines.append(f"• **Weight Trend:** `{spark}` ({weights[0]} → {weights[-1]} kg, {arrow} {delta:+.1f} kg)")
    elif weights:
        lines.append(f"• **Current Weight:** {weights[-1]} kg")

    # Readiness (Samsung Health style)
    r_bar = generate_ascii_bar(readiness, 10, 8)
    r_status = "Optimal" if readiness >= 8 else ("Good" if readiness >= 6 else "Fatigued")
    lines.append(f"• **Readiness:** `[{r_bar}]` {readiness}/10 ({r_status}) ⚡")

    # Sleep
    s_bar = generate_ascii_bar(sleep, 10.0, 8)
    lines.append(f"• **Sleep Average:** `[{s_bar}]` {sleep:.1f}h/night 🌙")

    # Adherence & Rings (Apple Health style)
    a_bar = generate_ascii_bar(adherence, 100, 8)
    rings_icon = "🟢" if adherence >= 90 else ("🟡" if adherence >= 70 else "🔴")
    lines.append(f"• **Adherence:** `[{a_bar}]` {adherence}% {rings_icon}")

    return "\n".join(lines)


def generate_rings_svg(volume_pct: float, adherence_pct: float, recovery_pct: float, size: int = 180) -> str:
    """Generate Apple Health 3-Ring Activity Visualizer SVG."""
    center = size / 2
    stroke_w = size * 0.08
    r_vol = center - stroke_w - 4
    r_adh = r_vol - stroke_w - 4
    r_rec = r_adh - stroke_w - 4

    def ring_path(r: float, pct: float, color: str) -> Tuple[str, str]:
        circum = 2 * 3.14159 * r
        clamped = max(0.0, min(pct / 100.0, 1.5))
        dasharray = f"{clamped * circum:.1f} {circum:.1f}"
        track = f'<circle cx="{center}" cy="{center}" r="{r:.1f}" fill="none" stroke="{color}" stroke-opacity="0.15" stroke-width="{stroke_w:.1f}"/>'
        active = f'<circle cx="{center}" cy="{center}" r="{r:.1f}" fill="none" stroke="{color}" stroke-width="{stroke_w:.1f}" stroke-linecap="round" stroke-dasharray="{dasharray}" transform="rotate(-90 {center} {center})"/>'
        return track, active

    t1, a1 = ring_path(r_vol, volume_pct, "#F4C93B")
    t2, a2 = ring_path(r_adh, adherence_pct, "#22c55e")
    t3, a3 = ring_path(r_rec, recovery_pct, "#38bdf8")

    avg_score = round((volume_pct + adherence_pct + recovery_pct) / 3)

    return f"""<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg" style="background:#14151A; border-radius:16px; font-family:'Inter', sans-serif;">
  {t1} {a1}
  {t2} {a2}
  {t3} {a3}
  <text x="{center}" y="{center - 2}" fill="#FAFAF8" font-size="{size * 0.13:.0f}" font-weight="700" text-anchor="middle" font-family="'JetBrains Mono', monospace">{avg_score}%</text>
  <text x="{center}" y="{center + size * 0.12:.0f}" fill="rgba(250,250,248,0.45)" font-size="{size * 0.065:.0f}" font-weight="600" text-anchor="middle">RINGS</text>
</svg>"""


def generate_gauge_svg(score: int, max_score: int = 100, width: int = 240, height: int = 150, title: str = "READINESS SCORE") -> str:
    """Generate Samsung Health 220-degree Readiness & Energy Gauge SVG."""
    clamped = max(0, min(score, max_score))
    fraction = clamped / max_score
    cx, cy = width / 2, height * 0.76
    radius = min(width * 0.42, height * 0.65)
    stroke_w = 14

    # 220 degree arc from 160 deg to 380 deg
    total_len = 2 * 3.14159 * radius * (220.0 / 360.0)
    active_len = total_len * fraction

    status = "OPTIMAL" if score >= 85 else ("GOOD" if score >= 70 else ("MODERATE" if score >= 50 else "REST"))
    status_color = "#F4C93B" if score >= 85 else ("#22c55e" if score >= 70 else ("#38bdf8" if score >= 50 else "#f43f5e"))

    return f"""<svg viewBox="0 0 {width} {height}" width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#14151A; border-radius:16px; font-family:'Inter', sans-serif;">
  <defs>
    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#F4C93B"/>
    </linearGradient>
  </defs>
  <!-- Background Arc -->
  <circle cx="{cx}" cy="{cy}" r="{radius:.1f}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="{stroke_w}" stroke-linecap="round" stroke-dasharray="{total_len:.1f} 999" transform="rotate(160 {cx} {cy})"/>
  <!-- Active Gradient Arc -->
  <circle cx="{cx}" cy="{cy}" r="{radius:.1f}" fill="none" stroke="url(#gaugeGrad)" stroke-width="{stroke_w}" stroke-linecap="round" stroke-dasharray="{active_len:.1f} 999" transform="rotate(160 {cx} {cy})"/>
  <!-- Score and Label -->
  <text x="{cx}" y="{cy - height * 0.1:.1f}" fill="#FAFAF8" font-size="{height * 0.28:.0f}" font-weight="700" text-anchor="middle" font-family="'JetBrains Mono', monospace">{clamped}</text>
  <text x="{cx}" y="{cy + height * 0.1:.1f}" fill="{status_color}" font-size="{height * 0.09:.0f}" font-weight="700" text-anchor="middle">{status}</text>
  <text x="{cx}" y="{cy + height * 0.22:.1f}" fill="rgba(250,250,248,0.45)" font-size="{height * 0.075:.0f}" font-weight="600" text-anchor="middle">{title}</text>
</svg>"""


def generate_weight_svg(weights: List[float], width: int = 400, height: int = 150) -> str:
    """Generate self-contained dark-mode SVG chart of weight trajectory & EMA with smooth area curve."""
    if not weights or len(weights) < 2:
        return ""
    
    ema = calculate_ema(weights)
    min_w = min(min(weights), min(ema)) - 0.5
    max_w = max(max(weights), max(ema)) + 0.5
    spread = max(max_w - min_w, 0.1)

    pad_x = 30
    pad_y = 25
    plot_w = width - (pad_x * 2)
    plot_h = height - (pad_y * 2)

    def get_coords(data: List[float]) -> List[Tuple[float, float]]:
        step = plot_w / max(len(data) - 1, 1)
        pts = []
        for i, val in enumerate(data):
            x = pad_x + (i * step)
            y = pad_y + plot_h - ((val - min_w) / spread * plot_h)
            pts.append((round(x, 1), round(y, 1)))
        return pts

    raw_pts = get_coords(weights)
    ema_pts = get_coords(ema)

    raw_polyline = " ".join(f"{x},{y}" for x, y in raw_pts)
    ema_polyline = " ".join(f"{x},{y}" for x, y in ema_pts)

    # Build closed area path for gradient fill
    first_pt = raw_pts[0]
    last_pt = raw_pts[-1]
    baseline_y = pad_y + plot_h
    area_path = f"M {first_pt[0]} {first_pt[1]} " + " ".join(f"L {x} {y}" for x, y in raw_pts[1:]) + f" L {last_pt[0]} {baseline_y} L {first_pt[0]} {baseline_y} Z"

    circles = "\n".join(
        f'<circle cx="{x}" cy="{y}" r="3.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5"/>'
        for x, y in raw_pts
    )

    svg = f"""<svg viewBox="0 0 {width} {height}" width="100%" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a; border-radius:12px; font-family:sans-serif;">
  <defs>
    <linearGradient id="weightAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
    </linearGradient>
  </defs>
  <text x="{pad_x}" y="18" fill="#94a3b8" font-size="11" font-weight="600">BODYWEIGHT TRAJECTORY & EMA (kg)</text>
  <path d="{area_path}" fill="url(#weightAreaGrad)"/>
  <polyline points="{ema_polyline}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
  <polyline points="{raw_polyline}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  {circles}
  <text x="{pad_x}" y="{height - 8}" fill="#64748b" font-size="10">{weights[0]} kg</text>
  <text x="{width - pad_x - 30}" y="{height - 8}" fill="#38bdf8" font-size="10" font-weight="bold">{weights[-1]} kg</text>
</svg>"""
    return svg


def generate_whoop_recovery_svg(recovery_pct: float, hrv: int = 68, rhr: int = 54, size: int = 200) -> str:
    """Generate WHOOP Recovery Arc SVG (0–100%) with Red/Yellow/Green zones and telemetry."""
    clamped = max(0.0, min(float(recovery_pct), 100.0))
    cx = size / 2.0
    cy = size * 0.48
    r = size * 0.38
    stroke_w = max(size * 0.075, 10)
    circum = 2 * 3.14159 * r
    arc_len = circum * 0.75  # 270 degrees sweep

    if clamped >= 67:
        color = "#22c55e"
        glow_color = "rgba(34, 197, 94, 0.4)"
        status = "GREEN RECOVERY"
        sub = "Primed for High Strain"
    elif clamped >= 34:
        color = "#fbbf24"
        glow_color = "rgba(251, 191, 36, 0.4)"
        status = "YELLOW RECOVERY"
        sub = "Baseline Recovery"
    else:
        color = "#f43f5e"
        glow_color = "rgba(244, 63, 94, 0.4)"
        status = "RED RECOVERY"
        sub = "Impaired Recovery · Rest"

    active_len = (clamped / 100.0) * arc_len
    dasharray = f"{active_len:.1f} {circum:.1f}"
    track_dasharray = f"{arc_len:.1f} {circum:.1f}"

    return f"""<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg" style="background:#14151A; border-radius:16px; font-family:'Inter', sans-serif;">
  <defs>
    <filter id="whoopGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="{color}" flood-opacity="0.6"/>
    </filter>
  </defs>
  <!-- Background Arc -->
  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="{stroke_w:.1f}" stroke-linecap="round" stroke-dasharray="{track_dasharray}" transform="rotate(135 {cx:.1f} {cy:.1f})"/>
  <!-- Active Zone Arc -->
  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="{color}" stroke-width="{stroke_w:.1f}" stroke-linecap="round" stroke-dasharray="{dasharray}" filter="url(#whoopGlow)" transform="rotate(135 {cx:.1f} {cy:.1f})"/>
  <!-- Central Text -->
  <text x="{cx:.1f}" y="{cy - 4:.1f}" fill="#FAFAF8" font-size="{size * 0.2:.0f}" font-weight="700" text-anchor="middle" font-family="'JetBrains Mono', monospace">{round(clamped)}%</text>
  <text x="{cx:.1f}" y="{cy + (size * 0.12):.1f}" fill="{color}" font-size="{size * 0.055:.0f}" font-weight="700" text-anchor="middle">{status}</text>
  <text x="{cx:.1f}" y="{cy + (size * 0.22):.1f}" fill="#94a3b8" font-size="{size * 0.046:.0f}" font-weight="600" text-anchor="middle" font-family="'JetBrains Mono', monospace">HRV {hrv}ms · RHR {rhr}bpm</text>
  <text x="{cx:.1f}" y="{size * 0.92:.1f}" fill="rgba(250,250,248,0.4)" font-size="{size * 0.042:.0f}" text-anchor="middle">{sub}</text>
</svg>"""


def generate_whoop_strain_svg(strain: float, max_strain: float = 21.0, target_min: float = 13.0, target_max: float = 16.5, size: int = 200) -> str:
    """Generate WHOOP Strain Dial SVG (0.0–21.0) with target corridor."""
    clamped = max(0.0, min(float(strain), max_strain))
    cx = size / 2.0
    cy = size * 0.48
    r = size * 0.38
    stroke_w = max(size * 0.075, 10)
    circum = 2 * 3.14159 * r
    arc_len = circum * (240.0 / 360.0)  # 240 degrees sweep

    if clamped >= 18.0:
        color = "#ef4444"
        cat = "ALL-OUT STRAIN"
    elif clamped >= 14.0:
        color = "#f97316"
        cat = "STRENUOUS STRAIN"
    elif clamped >= 10.0:
        color = "#8b5cf6"
        cat = "MODERATE STRAIN"
    else:
        color = "#0284c7"
        cat = "LIGHT STRAIN"

    active_len = (clamped / max_strain) * arc_len
    dasharray = f"{active_len:.1f} {circum:.1f}"
    track_dasharray = f"{arc_len:.1f} {circum:.1f}"

    return f"""<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg" style="background:#14151A; border-radius:16px; font-family:'Inter', sans-serif;">
  <defs>
    <filter id="whoopStrainGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="{color}" flood-opacity="0.6"/>
    </filter>
  </defs>
  <!-- Background Arc -->
  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="{stroke_w:.1f}" stroke-linecap="round" stroke-dasharray="{track_dasharray}" transform="rotate(150 {cx:.1f} {cy:.1f})"/>
  <!-- Active Strain Arc -->
  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="{color}" stroke-width="{stroke_w:.1f}" stroke-linecap="round" stroke-dasharray="{dasharray}" filter="url(#whoopStrainGlow)" transform="rotate(150 {cx:.1f} {cy:.1f})"/>
  <!-- Central Text -->
  <text x="{cx:.1f}" y="{cy - 6:.1f}" fill="#FAFAF8" font-size="{size * 0.2:.0f}" font-weight="700" text-anchor="middle" font-family="'JetBrains Mono', monospace">{clamped:.1f}</text>
  <text x="{cx:.1f}" y="{cy + (size * 0.09):.1f}" fill="#94a3b8" font-size="{size * 0.05:.0f}" font-weight="600" text-anchor="middle" font-family="'JetBrains Mono', monospace">/ {max_strain:.1f} STRAIN</text>
  <text x="{cx:.1f}" y="{cy + (size * 0.18):.1f}" fill="{color}" font-size="{size * 0.048:.0f}" font-weight="700" text-anchor="middle">{cat}</text>
  <text x="{cx:.1f}" y="{size * 0.92:.1f}" fill="#F4C93B" font-size="{size * 0.042:.0f}" font-weight="600" text-anchor="middle">TARGET: {target_min:.1f} – {target_max:.1f}</text>
</svg>"""

