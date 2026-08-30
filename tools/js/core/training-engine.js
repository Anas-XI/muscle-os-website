// Muscle OS — Core Training Mathematics Engine (Defensive Pure Functions)
(function(window) {
  'use strict';

  const TrainingEngine = {
    // Epley Estimated 1RM Formula with boundary clamps
    calcE1RM: function(weight, reps, rpe) {
      weight = parseFloat(weight) || 0;
      reps = parseFloat(reps) || 0;
      rpe = parseFloat(rpe) || 10;
      if (weight <= 0 || reps <= 0) return 0;
      
      // Clamp reps and RPE to realistic physiological ranges
      reps = Math.min(30, Math.max(1, reps));
      rpe = Math.min(10, Math.max(5, rpe));

      var rir = Math.max(0, 10 - rpe);
      var effectiveReps = reps + rir;
      
      if (effectiveReps <= 1) return Math.round(weight);
      return Math.round(weight * (1 + effectiveReps / 30));
    },

    // Progressive Warm-up Set Generator (45%, 65%, 85%)
    calcWarmup: function(workWeight) {
      workWeight = parseFloat(workWeight) || 0;
      if (workWeight <= 40) return [];
      
      return [
        { pct: '45%', weight: Math.max(20, Math.round((workWeight * 0.45) / 2.5) * 2.5), reps: 5 },
        { pct: '65%', weight: Math.max(20, Math.round((workWeight * 0.65) / 2.5) * 2.5), reps: 3 },
        { pct: '85%', weight: Math.max(20, Math.round((workWeight * 0.85) / 2.5) * 2.5), reps: 1 }
      ];
    },

    // Acute:Chronic Workload Ratio (ACWR) Calculation
    calcACWR: function(weeklyVolumeHistory) {
      if (!Array.isArray(weeklyVolumeHistory) || weeklyVolumeHistory.length < 2) {
        return { acwr: 1.0, state: 'optimal', label: 'Optimal Load' };
      }
      var acute = weeklyVolumeHistory[weeklyVolumeHistory.length - 1] || 0;
      var chronicSum = weeklyVolumeHistory.slice(-4).reduce(function(a, b) { return a + b; }, 0);
      var chronicAvg = (chronicSum / Math.min(4, weeklyVolumeHistory.length)) || 1;
      var ratio = parseFloat((acute / chronicAvg).toFixed(2));

      if (ratio > 1.5) return { acwr: ratio, state: 'danger', label: 'High Fatigue (Overload)' };
      if (ratio > 1.3) return { acwr: ratio, state: 'warn', label: 'Elevated Fatigue' };
      if (ratio < 0.8) return { acwr: ratio, state: 'under', label: 'Under-Stimulated' };
      return { acwr: ratio, state: 'optimal', label: 'Optimal Recovery' };
    }
  };

  window.MOS_TrainingEngine = TrainingEngine;
})(window);
