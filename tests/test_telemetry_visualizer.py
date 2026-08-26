"""Tests for Interactive Telemetry Visualizer."""

import pytest
from mos_bot.core.telemetry_visualizer import (
    calculate_ema,
    generate_ascii_bar,
    generate_ascii_sparkline,
    render_ascii_telemetry_card,
    generate_weight_svg,
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
