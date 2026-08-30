// Muscle OS — Universal Modal & Bottom-Sheet Service
(function(window) {
  'use strict';

  const ModalService = {
    confirm: function(title, message, onConfirm, onCancel) {
      var ov = document.createElement('div');
      ov.className = 'mos-modal-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');

      var box = document.createElement('div');
      box.className = 'mos-modal-box';

      var t = document.createElement('div');
      t.className = 'mos-modal-title';
      t.textContent = title;

      var desc = document.createElement('div');
      desc.className = 'mos-modal-desc';
      desc.textContent = message;

      var actions = document.createElement('div');
      actions.className = 'mos-modal-actions';

      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = function() {
        ov.remove();
        if (onCancel) onCancel();
      };

      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = 'Confirm';
      confirmBtn.onclick = function() {
        ov.remove();
        if (onConfirm) onConfirm();
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      box.appendChild(t);
      box.appendChild(desc);
      box.appendChild(actions);
      ov.appendChild(box);
      document.body.appendChild(ov);

      var escHandler = function(e) {
        if (e.key === 'Escape') {
          ov.remove();
          document.removeEventListener('keydown', escHandler);
          if (onCancel) onCancel();
        }
      };
      document.addEventListener('keydown', escHandler);
    },

    quickAddMacroSheet: function(onAdd) {
      var ov = document.createElement('div');
      ov.className = 'mos-modal-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');

      var box = document.createElement('div');
      box.className = 'mos-modal-box';

      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="mos-modal-title">⚡ Quick Add Macros</div>
          <button id="closeMacroSheet" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
        <p class="mos-modal-desc">Directly log custom food or restaurant meal without database lookup.</p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <input type="text" id="qaMealName" class="quick-input" placeholder="Meal Name (e.g. Steak Dinner)" style="width:100%;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <input type="number" id="qaCals" class="quick-input" placeholder="Calories (kcal)" style="width:100%;">
            <input type="number" id="qaProtein" class="quick-input" placeholder="Protein (g)" style="width:100%;">
            <input type="number" id="qaCarbs" class="quick-input" placeholder="Carbs (g)" style="width:100%;">
            <input type="number" id="qaFats" class="quick-input" placeholder="Fats (g)" style="width:100%;">
          </div>
        </div>
        <div class="mos-modal-actions">
          <button class="btn btn-secondary" id="cancelMacroSheet">Cancel</button>
          <button class="btn btn-primary" id="submitMacroSheet">Add to Log</button>
        </div>
      `;

      ov.appendChild(box);
      document.body.appendChild(ov);

      document.getElementById('closeMacroSheet').onclick = function() { ov.remove(); };
      document.getElementById('cancelMacroSheet').onclick = function() { ov.remove(); };
      
      document.getElementById('submitMacroSheet').onclick = function() {
        var name = document.getElementById('qaMealName').value.trim() || 'Custom Meal';
        var cals = parseFloat(document.getElementById('qaCals').value) || 0;
        var p = parseFloat(document.getElementById('qaProtein').value) || 0;
        var c = parseFloat(document.getElementById('qaCarbs').value) || 0;
        var f = parseFloat(document.getElementById('qaFats').value) || 0;

        if (cals <= 0 && p <= 0 && c <= 0 && f <= 0) {
          if (window.mosToast) window.mosToast('Please enter calories or macros.', 'warning');
          return;
        }

        ov.remove();
        if (onAdd) onAdd({ name: name, calories: cals, protein: p, carbs: c, fats: f });
      };

      var escHandler = function(e) {
        if (e.key === 'Escape') {
          ov.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    },

    onboardingWizard: function(onComplete) {
      var ov = document.createElement('div');
      ov.className = 'mos-modal-overlay';
      ov.id = 'mosOnboardingOverlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');

      var box = document.createElement('div');
      box.className = 'mos-modal-box';
      box.style.maxWidth = '480px';

      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="mos-modal-title">⚡ Welcome to Muscle OS</div>
          <span style="font-size:0.75rem;color:var(--accent);font-family:'JetBrains Mono',monospace;" id="onboardStepIndicator">Step 1 of 3</span>
        </div>

        <!-- Step 1: Goal Selection -->
        <div class="onboard-step active" id="obStep1">
          <p class="mos-modal-desc">Select your primary athletic adaptation goal to auto-configure your training and metabolic engine.</p>
          <div class="onboard-options">
            <div class="onboard-card selected" data-goal="hypertrophy" onclick="selectOnboardCard(this)">
              <div style="font-size:1.5rem;margin-bottom:4px;">💪</div>
              <h5>Hypertrophy</h5>
              <p>Max muscle volume &amp; aesthetic development</p>
            </div>
            <div class="onboard-card" data-goal="strength" onclick="selectOnboardCard(this)">
              <div style="font-size:1.5rem;margin-bottom:4px;">⚡</div>
              <h5>Strength</h5>
              <p>SBD 1RM powerlifting progression</p>
            </div>
            <div class="onboard-card" data-goal="fat_loss" onclick="selectOnboardCard(this)">
              <div style="font-size:1.5rem;margin-bottom:4px;">🔥</div>
              <h5>Fat Loss</h5>
              <p>Metabolic deficit preserving lean mass</p>
            </div>
            <div class="onboard-card" data-goal="recomp" onclick="selectOnboardCard(this)">
              <div style="font-size:1.5rem;margin-bottom:4px;">⚖</div>
              <h5>Recomposition</h5>
              <p>Simultaneous fat loss &amp; muscle gain</p>
            </div>
          </div>
          <div class="mos-modal-actions">
            <button class="btn btn-primary" onclick="nextOnboardStep(2)">Next: Athlete Vitals &rarr;</button>
          </div>
        </div>

        <!-- Step 2: Athlete Vitals -->
        <div class="onboard-step" id="obStep2">
          <p class="mos-modal-desc">Enter your physiological baseline for adaptive expenditure and volume calculations.</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0;">
            <input type="text" id="obName" class="quick-input" placeholder="Your Name or Nickname" style="width:100%;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <input type="number" id="obWeight" class="quick-input" placeholder="Bodyweight (kg)" value="80" style="width:100%;">
              <input type="number" id="obHeight" class="quick-input" placeholder="Height (cm)" value="178" style="width:100%;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <input type="number" id="obAge" class="quick-input" placeholder="Age (years)" value="25" style="width:100%;">
              <select id="obSex" class="quick-input" style="width:100%;">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div class="mos-modal-actions">
            <button class="btn btn-secondary" onclick="nextOnboardStep(1)">&larr; Back</button>
            <button class="btn btn-primary" onclick="nextOnboardStep(3)">Next: Training Split &rarr;</button>
          </div>
        </div>

        <!-- Step 3: Training Schedule -->
        <div class="onboard-step" id="obStep3">
          <p class="mos-modal-desc">Choose your weekly training frequency. We will generate your periodized mesocycle.</p>
          <div class="onboard-options">
            <div class="onboard-card" data-split="full_body" onclick="selectOnboardCard(this)">
              <h5>3 Days / Week</h5>
              <p>Full Body Frequency A/B/C</p>
            </div>
            <div class="onboard-card selected" data-split="upper_lower" onclick="selectOnboardCard(this)">
              <h5>4 Days / Week</h5>
              <p>Upper / Lower Split (Balanced)</p>
            </div>
            <div class="onboard-card" data-split="ppl_ul" onclick="selectOnboardCard(this)">
              <h5>5 Days / Week</h5>
              <p>Push / Pull / Legs + Upper / Lower</p>
            </div>
            <div class="onboard-card" data-split="ppl" onclick="selectOnboardCard(this)">
              <h5>6 Days / Week</h5>
              <p>Push / Pull / Legs × 2 (Advanced)</p>
            </div>
          </div>
          <div class="mos-modal-actions">
            <button class="btn btn-secondary" onclick="nextOnboardStep(2)">&larr; Back</button>
            <button class="btn btn-primary" onclick="finishOnboarding()">Complete Setup &amp; Launch &rarr;</button>
          </div>
        </div>
      `;

      ov.appendChild(box);
      document.body.appendChild(ov);

      window.selectOnboardCard = function(cardEl) {
        var parent = cardEl.closest('.onboard-options');
        if (parent) {
          parent.querySelectorAll('.onboard-card').forEach(function(c) { c.classList.remove('selected'); });
          cardEl.classList.add('selected');
        }
      };

      window.nextOnboardStep = function(stepNum) {
        document.querySelectorAll('.onboard-step').forEach(function(s) { s.classList.remove('active'); });
        var target = document.getElementById('obStep' + stepNum);
        if (target) target.classList.add('active');
        document.getElementById('onboardStepIndicator').textContent = 'Step ' + stepNum + ' of 3';
      };

      window.finishOnboarding = function() {
        var goalCard = document.querySelector('#obStep1 .onboard-card.selected');
        var goal = goalCard ? goalCard.dataset.goal : 'hypertrophy';
        
        var name = (document.getElementById('obName').value || '').trim() || 'Athlete';
        var weight = parseFloat(document.getElementById('obWeight').value) || 80;
        var height = parseFloat(document.getElementById('obHeight').value) || 178;
        var age = parseFloat(document.getElementById('obAge').value) || 25;
        var sex = document.getElementById('obSex').value || 'male';

        var splitCard = document.querySelector('#obStep3 .onboard-card.selected');
        var split = splitCard ? splitCard.dataset.split : 'upper_lower';

        // Calculate baseline TDEE & macros
        var bmr = (10 * weight) + (6.25 * height) - (5 * age) + (sex === 'male' ? 5 : -161);
        var tdee = Math.round(bmr * 1.55);
        var targetCals = goal === 'fat_loss' ? (tdee - 400) : (goal === 'hypertrophy' ? (tdee + 250) : tdee);

        var pGrams = Math.round(weight * 2.2);
        var fGrams = Math.round(weight * 0.8);
        var cGrams = Math.max(100, Math.round((targetCals - (pGrams * 4) - (fGrams * 9)) / 4));

        var profileData = {
          profile: {
            name: name,
            weight: weight,
            height: height,
            age: age,
            sex: sex,
            goal: goal,
            split: split,
            bmr: Math.round(bmr),
            tdee: tdee,
            targetCalories: targetCals,
            protein: pGrams,
            carbs: cGrams,
            fats: fGrams
          }
        };

        if (window.MOS_Storage) {
          window.MOS_Storage.set('mos_tdee_data', profileData);
          window.MOS_Storage.set('mos_active_split', split);
          window.MOS_Storage.set('mos_onboarded', '1');
        }

        ov.remove();
        if (window.mosToast) window.mosToast('🎉 Profile initialized! Your custom dashboard is ready.', 'success');
        if (onComplete) onComplete(profileData);
      };
    }
  };

  window.MOS_Modal = ModalService;
  window.mosConfirm = ModalService.confirm;
})(window);
