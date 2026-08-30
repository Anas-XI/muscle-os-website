"""Unit tests for Precision TDEE & Nutrition Calculator Engine."""

import pytest
from mos_bot.core.nutrition_calculator import (
    calculate_tdee,
    calculate_macro_split,
)


class TestNutritionCalculator:
    def test_calculate_tdee_mifflin_male(self):
        # 80kg, 180cm, 25yo male, moderately active
        # BMR = 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805 kcal
        # TDEE = 1805 * 1.55 = 2798 kcal
        tdee = calculate_tdee(80.0, 180.0, 25, "male", "moderately_active", goal="hypertrophy")
        assert 1800 <= tdee.bmr_kcal <= 1810
        assert 2790 <= tdee.tdee_kcal <= 2810
        assert tdee.target_calories_kcal == tdee.tdee_kcal + 250
        assert tdee.formula_used == "Mifflin-St Jeor"

    def test_calculate_tdee_katch_mcardle(self):
        # 80kg at 15% body fat -> Lean Mass = 68kg
        # BMR = 370 + (21.6 * 68) = 370 + 1468.8 = 1838.8 kcal
        tdee = calculate_tdee(80.0, 180.0, 25, "male", "moderately_active", goal="fat_loss", body_fat_pct=15.0)
        assert 1835 <= tdee.bmr_kcal <= 1845
        assert tdee.target_calories_kcal == tdee.tdee_kcal - 500
        assert tdee.formula_used == "Katch-McArdle"

    def test_calculate_macro_split_training_vs_rest(self):
        res_train = calculate_macro_split(2500, weight_kg=80.0, goal="hypertrophy", is_training_day=True)
        res_rest = calculate_macro_split(2500, weight_kg=80.0, goal="hypertrophy", is_training_day=False)
        assert res_train.protein_g == round(80.0 * 1.8)
        assert res_train.carbs_g > res_rest.carbs_g
        assert "Training Day" in res_train.carb_cycling_mode
        assert "Rest Day" in res_rest.carb_cycling_mode
