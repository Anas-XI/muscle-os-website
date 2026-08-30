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
    """Render a structured ASCII summary card for Telegram / Chat."""
    lines = ["📊 **Weekly Telemetry Overview**"]
    
    # Weight trend
    if weights and len(weights) >= 2:
        spark = generate_ascii_sparkline(weights)
        delta = weights[-1] - weights[0]
        arrow = "↘️" if delta < 0 else ("↗️" if delta > 0 else "➡️")
        lines.append(f"• **Weight Trend:** `{spark}` ({weights[0]} → {weights[-1]} kg, {arrow} {delta:+.1f} kg)")
    elif weights:
        lines.append(f"• **Current Weight:** {weights[-1]} kg")

    # Readiness
    r_bar = generate_ascii_bar(readiness, 10, 8)
    r_status = "High" if readiness >= 7 else ("Moderate" if readiness >= 5 else "Fatigued")
    lines.append(f"• **Readiness:** `[{r_bar}]` {readiness}/10 ({r_status})")

    # Sleep
    s_bar = generate_ascii_bar(sleep, 10.0, 8)
    lines.append(f"• **Sleep Average:** `[{s_bar}]` {sleep:.1f}h/night")

    # Adherence
    a_bar = generate_ascii_bar(adherence, 100, 8)
    lines.append(f"• **Adherence:** `[{a_bar}]` {adherence}%")

    return "\n".join(lines)


def generate_weight_svg(weights: List[float], width: int = 400, height: int = 150) -> str:
    """Generate self-contained dark-mode SVG chart of weight trajectory & EMA."""
    if not weights:
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

    circles = "\n".join(
        f'<circle cx="{x}" cy="{y}" r="3.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5"/>'
        for x, y in raw_pts
    )

    svg = f"""<svg viewBox="0 0 {width} {height}" width="100%" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a; border-radius:12px; font-family:sans-serif;">
  <text x="{pad_x}" y="18" fill="#94a3b8" font-size="11" font-weight="600">BODYWEIGHT TRAJECTORY & EMA (kg)</text>
  <polyline points="{ema_polyline}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
  <polyline points="{raw_polyline}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  {circles}
  <text x="{pad_x}" y="{height - 8}" fill="#64748b" font-size="10">{weights[0]} kg</text>
  <text x="{width - pad_x - 30}" y="{height - 8}" fill="#38bdf8" font-size="10" font-weight="bold">{weights[-1]} kg</text>
</svg>"""
    return svg
