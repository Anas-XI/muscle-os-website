// Muscle OS — Core TDEE & Nutrition Engine (Pure Functions)
(function(window) {
  'use strict';

  const TDEEEngine = {
    // Katch-McArdle Formula (LBM-based)
    calcBMR_Katch: function(weightKg, bodyfatPct) {
      var lbm = weightKg * (1 - (bodyfatPct / 100));
      return Math.round(370 + (21.6 * lbm));
    },

    // Mifflin-St Jeor Formula
    calcBMR_Mifflin: function(weightKg, heightCm, age, sex) {
      var bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
      return Math.round(sex === 'male' ? bmr + 5 : bmr - 161);
    },

    // Daily Macro Split Calculator
    calcMacros: function(calorieBudget, weightKg, goal) {
      // 2.2g/kg Protein baseline
      var pGrams = Math.round(weightKg * 2.2);
      var pCals = pGrams * 4;

      // 0.8g/kg Fat baseline
      var fGrams = Math.round(weightKg * 0.8);
      var fCals = fGrams * 9;

      // Remainder to carbohydrates
      var cCals = Math.max(0, calorieBudget - pCals - fCals);
      var cGrams = Math.round(cCals / 4);

      return {
        calories: calorieBudget,
        protein: pGrams,
        fats: fGrams,
        carbs: cGrams
      };
    }
  };

  window.MOS_TDEEEngine = TDEEEngine;
})(window);
