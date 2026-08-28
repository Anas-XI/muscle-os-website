// Muscle OS — Streak & Consistency Engine
(function(window) {
  'use strict';

  const StreakEngine = {
    calculateStreak: function() {
      try {
        const activeDates = new Set();
        
        // 1. Training logs
        const trainLogs = window.MOS_Storage ? window.MOS_Storage.get('mos_logs', {}) : {};
        Object.keys(trainLogs).forEach(function(k) {
          if (trainLogs[k] && Object.keys(trainLogs[k]).length > 0) {
            const dStr = k.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) activeDates.add(dStr);
          }
        });

        // 2. Nutrition logs
        const foodLogs = window.MOS_Storage ? (window.MOS_Storage.get('muscle_os_food_log', null) || window.MOS_Storage.get('mos_food_log', {})) : {};
        Object.keys(foodLogs).forEach(function(k) {
          if (Array.isArray(foodLogs[k]) && foodLogs[k].length > 0) {
            const dStr = k.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) activeDates.add(dStr);
          }
        });

        // 3. Daily check-in history
        const checkins = window.MOS_Storage ? window.MOS_Storage.get('mos_checkin_history', []) : [];
        checkins.forEach(function(c) {
          if (c.date) activeDates.add(c.date);
        });

        // Count consecutive days backwards from today
        var streak = 0;
        var d = new Date();
        var todayStr = d.toISOString().slice(0, 10);
        if (!activeDates.has(todayStr)) {
          d.setDate(d.getDate() - 1);
        }

        while (activeDates.has(d.toISOString().slice(0, 10))) {
          streak++;
          d.setDate(d.getDate() - 1);
        }

        return streak > 0 ? streak : (activeDates.has(todayStr) ? 1 : 0);
      } catch (e) {
        return 0;
      }
    },

    saveCheckin: function(weight, energy, sleep) {
      if (!weight && !energy && !sleep) {
        if (window.mosToast) window.mosToast('Please enter at least one check-in value.', 'warning');
        return false;
      }
      var today = new Date().toISOString().slice(0, 10);
      var checkins = window.MOS_Storage ? window.MOS_Storage.get('mos_checkin_history', []) : [];
      checkins.push({ date: today, weight: weight, energy: energy, sleep: sleep, ts: Date.now() });
      if (window.MOS_Storage) {
        window.MOS_Storage.set('mos_checkin_history', checkins);
      }
      if (window.mosToast) window.mosToast('Daily biofeedback check-in saved!', 'success');
      return true;
    }
  };

  window.MOS_Streak = StreakEngine;
})(window);
