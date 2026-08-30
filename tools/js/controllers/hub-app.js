// Muscle OS — Omni Hub Application Controller (Phase 3: Smart Dashboard Engine)
(function(window) {
  'use strict';

  const HUB_TAB_KEY = 'mos_hub_active_tab';

  function activateTab(targetId) {
    document.querySelectorAll('.tab-item').forEach(function(tb) {
      const isSelected = tb.getAttribute('data-target') === targetId;
      tb.classList.toggle('active', isSelected);
      tb.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    document.querySelectorAll('iframe, .dashboard-view').forEach(function(view) {
      const isActive = view.id === targetId;
      view.classList.toggle('active', isActive);
      if (isActive) {
        sessionStorage.setItem(HUB_TAB_KEY, targetId);
        if (view.tagName === 'IFRAME') {
          const dataSrc = view.getAttribute('data-src');
          if (dataSrc && !view.getAttribute('src')) {
            view.setAttribute('src', dataSrc);
          }
        }
      }
    });
  }

  // --- 1. Live Training Log Aggregator ---
  function hydrateTrainingWidget() {
    try {
      const logs = window.MOS_Storage ? window.MOS_Storage.get('mos_logs', {}) : {};
      const today = new Date().toISOString().slice(0, 10);
      const todayLogs = logs[today] || {};

      let completedSets = 0;
      let totalExercisesToday = 0;
      Object.keys(todayLogs).forEach(function(eid) {
        if (todayLogs[eid] && Array.isArray(todayLogs[eid].sets)) {
          totalExercisesToday++;
          todayLogs[eid].sets.forEach(function(s) {
            if (s.w && s.r) completedSets++;
          });
        }
      });

      // Planned sets baseline
      const plannedSets = totalExercisesToday > 0 ? (totalExercisesToday * 3) : 18;
      const setsDisplay = completedSets > 0 ? `${completedSets} / ${plannedSets}` : '18';
      const setsEl = document.getElementById('widgetTrainSets');
      if (setsEl) setsEl.textContent = setsDisplay;

      // Calculate ACWR
      const volumeHistory = [];
      const d = new Date();
      for (let i = 0; i < 28; i++) {
        const dStr = d.toISOString().slice(0, 10);
        if (logs[dStr]) {
          let dayVol = 0;
          Object.keys(logs[dStr]).forEach(function(eid) {
            if (logs[dStr][eid] && logs[dStr][eid].sets) {
              logs[dStr][eid].sets.forEach(function(s) {
                dayVol += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0);
              });
            }
          });
          volumeHistory.unshift(dayVol);
        }
        d.setDate(d.getDate() - 1);
      }

      if (window.MOS_TrainingEngine) {
        const acwrRes = window.MOS_TrainingEngine.calcACWR(volumeHistory);
        const fatigueEl = document.getElementById('widgetTrainFatigue');
        if (fatigueEl) {
          fatigueEl.textContent = acwrRes.state.toUpperCase();
          fatigueEl.style.color = acwrRes.state === 'optimal' ? 'var(--green)' : (acwrRes.state === 'warn' ? '#f59e0b' : 'var(--red)');
        }
      }

      // Calculate Readiness from latest check-in
      const checkins = window.MOS_Storage ? window.MOS_Storage.get('mos_checkin_history', []) : [];
      let readiness = 90;
      if (checkins.length > 0) {
        const last = checkins[checkins.length - 1];
        const sleepScore = Math.min(10, (parseFloat(last.sleep) || 7.5) / 8 * 10);
        const energyScore = parseFloat(last.energy) || 8;
        readiness = Math.round((sleepScore * 5) + (energyScore * 5));
      }
      const readinessEl = document.getElementById('widgetTrainReadiness');
      if (readinessEl) readinessEl.textContent = `${readiness}%`;

    } catch (e) {
      console.warn('[HubApp] Training hydration error:', e);
    }
  }

  // --- 2. Live Nutrition Budget & Macro Sync ---
  function hydrateNutritionWidget() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const foodLogs = window.MOS_Storage ? (window.MOS_Storage.get('muscle_os_food_log', null) || window.MOS_Storage.get('mos_food_log', {})) : {};
      const todayItems = foodLogs[today] || [];

      let totCal = 0, totP = 0, totC = 0, totF = 0, totLeu = 0;
      todayItems.forEach(function(item) {
        totCal += (parseFloat(item.calories) || 0);
        totP += (parseFloat(item.protein) || 0);
        totC += (parseFloat(item.carbs) || 0);
        totF += (parseFloat(item.fat) || 0);
        totLeu += (parseFloat(item.leucine) || (item.protein * 0.08) || 0);
      });

      const tdeeData = window.MOS_Storage ? window.MOS_Storage.get('mos_tdee_data', {}) : {};
      const targetCal = (tdeeData.profile && tdeeData.profile.targetCalories) ? tdeeData.profile.targetCalories : 2600;
      const targetP = (tdeeData.profile && tdeeData.profile.protein) ? tdeeData.profile.protein : 180;
      const targetC = (tdeeData.profile && tdeeData.profile.carbs) ? tdeeData.profile.carbs : 310;
      const targetF = (tdeeData.profile && tdeeData.profile.fats) ? tdeeData.profile.fats : 65;

      const titleEl = document.getElementById('widgetNutrTitle');
      if (titleEl) {
        titleEl.textContent = `${Math.round(totCal)} / ${targetCal} kcal`;
      }
      const subEl = document.getElementById('widgetNutrSub');
      if (subEl) {
        const diff = Math.round(targetCal - totCal);
        subEl.textContent = diff >= 0 ? `${diff} kcal remaining today` : `${Math.abs(diff)} kcal over budget`;
      }

      const pEl = document.getElementById('widgetNutrProtein');
      if (pEl) pEl.textContent = `${Math.round(totP)}g / ${targetP}g`;

      const cEl = document.getElementById('widgetNutrCarbs');
      if (cEl) cEl.textContent = `${Math.round(totC)}g / ${targetC}g`;

      const fEl = document.getElementById('widgetNutrFats');
      if (fEl) fEl.textContent = `${Math.round(totF)}g / ${targetF}g`;

    } catch (e) {
      console.warn('[HubApp] Nutrition hydration error:', e);
    }
  }

  // --- 3. Dynamic Estimated 1RM Engine ---
  function hydrateProgressionMatrix() {
    try {
      const logs = window.MOS_Storage ? window.MOS_Storage.get('mos_logs', {}) : {};
      let maxSquat = 0, maxBench = 0, maxDead = 0, maxOHP = 0;

      Object.keys(logs).forEach(function(dateKey) {
        const day = logs[dateKey];
        if (day) {
          Object.keys(day).forEach(function(eid) {
            const exName = eid.toLowerCase();
            const sets = day[eid].sets || [];

            sets.forEach(function(s) {
              const w = parseFloat(s.w) || 0;
              const r = parseFloat(s.r) || 0;
              const rpe = parseFloat(s.rpe) || 10;
              if (w > 0 && r > 0 && window.MOS_TrainingEngine) {
                const e1rm = window.MOS_TrainingEngine.calcE1RM(w, r, rpe);
                if (exName.includes('squat') && e1rm > maxSquat) maxSquat = e1rm;
                if (exName.includes('bench') && e1rm > maxBench) maxBench = e1rm;
                if (exName.includes('deadlift') && e1rm > maxDead) maxDead = e1rm;
                if ((exName.includes('press') || exName.includes('ohp')) && e1rm > maxOHP) maxOHP = e1rm;
              }
            });
          });
        }
      });

      // Default baseline fallback if empty
      maxSquat = maxSquat || 185;
      maxBench = maxBench || 135;
      maxDead = maxDead || 220;
      maxOHP = maxOHP || 85;

      const sEl = document.getElementById('liftSquat');
      if (sEl) sEl.textContent = `${maxSquat} kg`;

      const bEl = document.getElementById('liftBench');
      if (bEl) bEl.textContent = `${maxBench} kg`;

      const dEl = document.getElementById('liftDeadlift');
      if (dEl) dEl.textContent = `${maxDead} kg`;

      const oEl = document.getElementById('liftOHP');
      if (oEl) oEl.textContent = `${maxOHP} kg`;

      const sbdTotal = maxSquat + maxBench + maxDead;
      const totalEl = document.getElementById('sbdTotalDisplay');
      if (totalEl) totalEl.textContent = `Calculated Total: ${sbdTotal} kg`;

    } catch (e) {
      console.warn('[HubApp] Progression hydration error:', e);
    }
  }

  // --- 4. 7-Day Consistency Heatmap ---
  function renderConsistencyHeatmap() {
    try {
      const container = document.getElementById('consistencyHeatmapRow');
      if (!container) return;

      const logs = window.MOS_Storage ? window.MOS_Storage.get('mos_logs', {}) : {};
      const foodLogs = window.MOS_Storage ? (window.MOS_Storage.get('muscle_os_food_log', null) || window.MOS_Storage.get('mos_food_log', {})) : {};

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let html = '';

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().slice(0, 10);
        const dayName = daysOfWeek[d.getDay()];
        const isToday = i === 0;

        const hasTrain = !!(logs[dStr] && Object.keys(logs[dStr]).length > 0);
        const hasNutr = !!(foodLogs[dStr] && Array.isArray(foodLogs[dStr]) && foodLogs[dStr].length > 0);

        let dotCls = 'heat-dot';
        let icon = '·';
        let tip = 'Rest day';

        if (hasTrain && hasNutr) {
          dotCls += ' star';
          icon = '⭐';
          tip = 'Training + Nutrition Completed';
        } else if (hasTrain) {
          dotCls += ' train';
          icon = '🏋️';
          tip = 'Workout Logged';
        } else if (hasNutr) {
          dotCls += ' nutr';
          icon = '🥗';
          tip = 'Nutrition Logged';
        }

        html += `
          <div class="heat-day ${isToday ? 'today' : ''}" onclick="showDayRecap('${dStr}', '${tip}')" title="${dStr}: ${tip}">
            <span class="heat-day-lbl">${dayName}</span>
            <div class="${dotCls}">${icon}</div>
          </div>
        `;
      }

      container.innerHTML = html;
    } catch (e) {
      console.warn('[HubApp] Heatmap error:', e);
    }
  }

  window.showDayRecap = function(dateStr, statusTip) {
    if (window.mosToast) window.mosToast(`📅 ${dateStr}: ${statusTip}`, 'info');
  };

  // --- 5. Cross-Domain Biofeedback Synergy Engine ---
  function renderSynergyAlerts() {
    try {
      const container = document.getElementById('synergyAlertsContainer');
      if (!container) return;

      const alerts = [];
      const logs = window.MOS_Storage ? window.MOS_Storage.get('mos_logs', {}) : {};
      const today = new Date().toISOString().slice(0, 10);
      const foodLogs = window.MOS_Storage ? (window.MOS_Storage.get('muscle_os_food_log', null) || window.MOS_Storage.get('mos_food_log', {})) : {};
      const todayItems = foodLogs[today] || [];
      const tdeeData = window.MOS_Storage ? window.MOS_Storage.get('mos_tdee_data', {}) : {};
      const targetCal = (tdeeData.profile && tdeeData.profile.targetCalories) || 2600;

      let totCal = 0, totP = 0;
      todayItems.forEach(i => {
        totCal += (parseFloat(i.calories) || 0);
        totP += (parseFloat(i.protein) || 0);
      });

      // Check workout status
      const hasWorkoutToday = !!(logs[today] && Object.keys(logs[today]).length > 0);
      if (hasWorkoutToday) {
        alerts.push({
          type: 'success',
          title: '⚡ Post-Workout Anabolic Feeding Window',
          desc: 'Workout logged today! Target 40g Protein + 60g High-GI Carbs within 60 minutes for maximal MPS & glycogen resynthesis.'
        });
      }

      // Check deficit + fatigue
      const deficit = targetCal - totCal;
      if (deficit > 600 && hasWorkoutToday) {
        alerts.push({
          type: 'warn',
          title: '⚠️ Caloric Deficit on High-Volume Day',
          desc: `You are currently ${Math.round(deficit)} kcal below target. Consider adding 50g carbs pre/post workout to avoid systemic CNS fatigue.`
        });
      }

      // Check protein pacing
      if (totCal > (targetCal * 0.7) && totP < 90) {
        alerts.push({
          type: 'info',
          title: '🍗 Protein Pacing Alert',
          desc: '70% of calories consumed but protein is lagging. Prioritize high-leucine protein sources (chicken breast, whey isolate, egg whites) for remaining meals.'
        });
      }

      if (alerts.length === 0) {
        alerts.push({
          type: 'info',
          title: '🎯 Optimal Systemic Recovery',
          desc: 'Training load and nutritional intake are well-synchronized. Maintain hydration and hit your leucine targets.'
        });
      }

      container.innerHTML = alerts.map(a => `
        <div class="synergy-item ${a.type}">
          <div class="synergy-item-title">${a.title}</div>
          <div class="synergy-item-desc">${a.desc}</div>
        </div>
      `).join('');

    } catch (e) {
      console.warn('[HubApp] Synergy alerts error:', e);
    }
  }

  function hydrateHub() {
    try {
      // 1. Streak update
      if (window.MOS_Streak) {
        const streak = window.MOS_Streak.calculateStreak();
        const streakEl = document.getElementById('dashStreakCount');
        if (streakEl) streakEl.textContent = (streak > 0 ? streak : 0) + ' DAYS';
      }

      // 2. Profile metadata
      const tdeeData = window.MOS_Storage ? window.MOS_Storage.get('mos_tdee_data', {}) : {};
      if (tdeeData.profile) {
        if (tdeeData.profile.name) {
          document.getElementById('dashAthleteName').textContent = tdeeData.profile.name + ' Dashboard';
        }
        if (tdeeData.profile.weight) {
          document.getElementById('quickWeight').placeholder = `Weight: ${tdeeData.profile.weight} kg`;
        }
        if (tdeeData.profile.goal) {
          document.getElementById('dashAthleteGoal').textContent = 'Goal: ' + tdeeData.profile.goal.toUpperCase() + ' · Meso Active';
        }
      }

      // 3. Widgets & Progression
      hydrateTrainingWidget();
      hydrateNutritionWidget();
      hydrateProgressionMatrix();
      renderConsistencyHeatmap();
      renderSynergyAlerts();

      // 4. Auth & Subscription check
      if (window.MOS_Auth) {
        const auth = window.MOS_Auth.getStatus('omni_hub');
        const chip = document.getElementById('statusChip');
        if (chip) {
          chip.textContent = auth.statusLabel;
          chip.className = 'status-chip ' + (auth.activeSub ? 'ok' : (auth.trialActive ? 'trial' : 'locked'));
        }
      }
    } catch (e) {
      console.warn('[HubApp] Hydration error:', e);
    }
  }

  function checkFirstTimeOnboarding() {
    const onboarded = window.MOS_Storage ? window.MOS_Storage.getString('mos_onboarded', '0') : '0';
    const tdeeData = window.MOS_Storage ? window.MOS_Storage.get('mos_tdee_data', null) : null;
    if (onboarded !== '1' && !tdeeData && window.MOS_Modal && window.MOS_Modal.onboardingWizard) {
      window.MOS_Modal.onboardingWizard(function() {
        hydrateHub();
      });
    }
  }

  function lockHub() {
    const ov = document.getElementById('hubPaywallOverlay');
    if (ov) ov.style.display = 'flex';
    const chip = document.getElementById('statusChip');
    if (chip) {
      chip.textContent = 'Access Required';
      chip.className = 'status-chip locked';
    }
  }

  async function initHub() {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
          .then(function(reg) { console.log('[HubApp] Service Worker registered:', reg.scope); })
          .catch(function(err) { console.warn('[HubApp] SW failed:', err); });
      });
    }

    // Verify session before rendering protected data
    var authRes = { valid: false };
    if (window.MOS_Auth) {
      authRes = await window.MOS_Auth.verifySession('omni_hub');
    }

    if (!authRes.valid) {
      lockHub();
      return;
    }

    // Start background re-verification every 15 min & visibilitychange
    if (window.MOS_Auth) {
      window.MOS_Auth.startPeriodicCheck('omni_hub', function() {
        lockHub();
      });
    }

    // Tab event bindings
    document.querySelectorAll('.tab-item').forEach(function(tab) {
      tab.addEventListener('click', function() {
        activateTab(tab.getAttribute('data-target'));
      });
    });

    // Escape listener for modals
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const ov = document.getElementById('hubPaywallOverlay');
        const auth = window.MOS_Auth ? window.MOS_Auth.getStatus('omni_hub') : null;
        if (ov && auth && (auth.activeSub || auth.trialActive)) {
          ov.style.display = 'none';
        }
      }
    });

    // Synergy Message Bus
    window.addEventListener('message', function(e) {
      if (!e.data || !e.data.type) return;
      if (e.data.type === 'SESSION_STARTED') {
        if (window.mosToast) window.mosToast('🏃‍♂️ Workout Session Started! Fuel & hydrate properly.', 'info');
      } else if (e.data.type === 'SESSION_ENDED') {
        if (window.mosToast) window.mosToast('✅ Workout Complete! High-protein recovery meal recommended.', 'success');
        hydrateHub();
      }
    });

    // Activate default or saved tab
    const savedTab = sessionStorage.getItem(HUB_TAB_KEY) || 'view-dashboard';
    activateTab(savedTab);
    hydrateHub();
    checkFirstTimeOnboarding();
  }

  window.activate = activateTab;
  window.saveQuickCheckin = function() {
    const w = document.getElementById('quickWeight').value;
    const energy = document.getElementById('quickEnergy').value;
    const sleep = document.getElementById('quickSleep').value;

    if (window.MOS_Streak && window.MOS_Streak.saveCheckin(w, energy, sleep)) {
      hydrateHub();
      document.getElementById('quickWeight').value = '';
      document.getElementById('quickEnergy').value = '';
      document.getElementById('quickSleep').value = '';
    }
  };

  window.stepWeight = function(delta) {
    var inp = document.getElementById('quickWeight');
    if (!inp) return;
    var current = parseFloat(inp.value);
    if (isNaN(current)) {
      var m = (inp.placeholder || '').match(/([0-9.]+)/);
      current = m ? parseFloat(m[1]) : 80.0;
    }
    var next = Math.max(30, Math.min(250, (current + delta))).toFixed(1);
    inp.value = next;
  };

  document.addEventListener('DOMContentLoaded', initHub);
})(window);
