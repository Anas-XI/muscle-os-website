"""Tests for Interactive Telemetry Visualizer."""

import pytest
from mos_bot.core.telemetry_visualizer import (
    calculate_ema,
    generate_ascii_bar,
    generate_ascii_sparkline,
    render_ascii_telemetry_card,
    generate_weight_svg,
    generate_rings_svg,
    generate_gauge_svg,
    generate_whoop_recovery_svg,
    generate_whoop_strain_svg,
)


class TestTelemetryVisualizer:
    """Test telemetry math and rendering."""

    def test_ema_calculation(self):
        data = [80.0, 80.5, 79.5, 79.0]
        ema = calculate_ema(data, span=3)
        assert len(ema) == len(data)
        assert ema[0] == 80.0
        assert round(ema[-1], 1) <= 79.5

    def test_ascii_bar_generation(self):
        bar_full = generate_ascii_bar(10, 10, 5)
        assert bar_full == "█████"
        bar_half = generate_ascii_bar(5, 10, 6)
        assert bar_half == "███░░░"

    def test_ascii_sparkline(self):
        values = [80.0, 79.5, 79.0, 78.5]
        spark = generate_ascii_sparkline(values)
        assert len(spark) == 4
        assert spark[0] == "█"
        assert spark[-1] == " "

    def test_render_ascii_telemetry_card(self):
        card = render_ascii_telemetry_card(
            weights=[82.0, 81.5, 81.0],
            readiness=8,
            sleep=7.5,
            adherence=95,
        )
        assert "Weekly Telemetry Overview" in card
        assert "82.0 → 81.0 kg" in card
        assert "Readiness:" in card
        assert "Sleep Average:" in card

    def test_generate_weight_svg(self):
        svg = generate_weight_svg([85.0, 84.5, 84.0, 83.8])
        assert "<svg" in svg
        assert "</svg>" in svg
        assert "BODYWEIGHT TRAJECTORY & EMA" in svg
        assert "85.0 kg" in svg
        assert "83.8 kg" in svg

    def test_generate_rings_svg(self):
        svg = generate_rings_svg(volume_pct=85, adherence_pct=90, recovery_pct=75)
        assert "<svg" in svg
        assert "</svg>" in svg
        assert "RINGS" in svg
        assert "#F4C93B" in svg
        assert "#22c55e" in svg
        assert "#38bdf8" in svg

    def test_generate_gauge_svg(self):
        svg = generate_gauge_svg(score=88, max_score=100)
        assert "<svg" in svg
        assert "</svg>" in svg
        assert "READINESS SCORE" in svg
        assert "88" in svg
        assert "OPTIMAL" in svg

    def test_generate_whoop_recovery_svg(self):
        svg_green = generate_whoop_recovery_svg(recovery_pct=85, hrv=72, rhr=52)
        assert "<svg" in svg_green
        assert "</svg>" in svg_green
        assert "85%" in svg_green
        assert "GREEN RECOVERY" in svg_green
        assert "HRV 72ms" in svg_green

        svg_red = generate_whoop_recovery_svg(recovery_pct=28)
        assert "RED RECOVERY" in svg_red
        assert "#f43f5e" in svg_red

        svg_yellow = generate_whoop_recovery_svg(recovery_pct=50)
        assert "YELLOW RECOVERY" in svg_yellow

    def test_generate_whoop_strain_svg(self):
        svg = generate_whoop_strain_svg(strain=15.4, max_strain=21.0, target_min=13.0, target_max=16.5)
        assert "<svg" in svg
        assert "</svg>" in svg
        assert "15.4" in svg
        assert "/ 21.0 STRAIN" in svg
        assert "STRENUOUS STRAIN" in svg
        assert "TARGET: 13.0 – 16.5" in svg

