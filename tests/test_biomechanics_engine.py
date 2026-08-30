"""Unit tests for Kinetic Chain Biomechanics & Injury Override Engine."""

import pytest
from mos_bot.core.biomechanics_engine import (
    get_injury_override,
    suggest_exercise_substitutions,
)


class TestBiomechanicsEngine:
    def test_shoulder_impingement_override(self):
        ov = get_injury_override("Shoulder Impingement")
        assert ov is not None
        assert "Glenohumeral" in ov.affected_joint
        assert "horizontal_push" in ov.movement_pattern_modifications
        assert "Face Pulls with External Rotation" in ov.rehab_primers
        assert any("flared" in c.lower() for c in ov.contraindicated_movements)

    def test_low_back_pain_override(self):
        ov = get_injury_override("low back pain")
        assert ov is not None
        assert "squat" in ov.movement_pattern_modifications
        assert "McGill Big 3" in ov.rehab_primers[0]

    def test_exercise_substitutions_shoulder_bench(self):
        subs = suggest_exercise_substitutions("Barbell Bench Press", ["Shoulder Impingement"])
        assert len(subs) >= 1
        assert "Floor Press" in subs[0].substitute_exercise or "Incline" in subs[0].substitute_exercise
        assert "scapular" in subs[0].rationale.lower()

    def test_exercise_substitutions_back_squat(self):
        subs = suggest_exercise_substitutions("Barbell Back Squat", ["Lumbar Disc Herniation"])
        assert len(subs) >= 1
        assert "Goblet Squat" in subs[0].substitute_exercise or "Belt Squat" in subs[0].substitute_exercise
