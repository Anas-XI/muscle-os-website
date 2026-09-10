// ===================================================================
// Muscle OS Hyperkinetics - Hevy & Strong Style Exercise Selector & Detail Sheet
// ===================================================================

(function() {
  'use strict';

  var state = {
    mode: 'swap', // 'swap' | 'add' | 'browse' | 'picker'
    dayIdx: 0,
    slotIdx: 0,
    currentEx: '',
    targetMuscle: 'all',
    targetEquip: 'all',
    search: '',
    slotEn: null,
    onSelect: null
  };

  var MUSCLE_TABS = [
    { id: 'all', name: 'All Muscles' },
    { id: 'chest', name: 'Chest' },
    { id: 'back', name: 'Back' },
    { id: 'shoulders', name: 'Shoulders' },
    { id: 'biceps', name: 'Biceps' },
    { id: 'triceps', name: 'Triceps' },
    { id: 'quads', name: 'Quads' },
    { id: 'hamstrings', name: 'Hamstrings' },
    { id: 'glutes', name: 'Glutes' },
    { id: 'calves', name: 'Calves' },
    { id: 'abs', name: 'Abs' },
    { id: 'forearms', name: 'Forearms' },
    { id: 'traps', name: 'Traps' },
    { id: 'mobility', name: 'Mobility' }
  ];

  var EQUIP_TABS = [
    { id: 'all', name: 'All Equipment' },
    { id: 'barbell', name: 'Barbell' },
    { id: 'dumbbell', name: 'Dumbbell' },
    { id: 'cable', name: 'Cable' },
    { id: 'machine', name: 'Machine' },
    { id: 'bodyweight', name: 'Bodyweight' },
    { id: 'kettlebell', name: 'Kettlebell' },
    { id: 'band', name: 'Band' },
    { id: 'smith machine', name: 'Smith Machine' }
  ];

  function ensureModals() {
    // 1. Hevy Exercise Selector Modal
    if (!document.getElementById('hevyExModal')) {
      var m = document.createElement('div');
      m.id = 'hevyExModal';
      m.onclick = function(e) { if (e.target === this) closeHevySelector(); };
      m.innerHTML = 
        '<div class="hevy-modal-dialog">' +
          '<div class="hevy-modal-header">' +
            '<div class="hevy-modal-title" id="hevyModalTitle">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v18M18 3v18M2 8h4M18 8h4M2 16h4M18 16h4M6 12h12"/></svg>' +
              '<span>Select Exercise</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<button type="button" class="hevy-custom-btn" onclick="openCustomFromHevy()">+ Custom</button>' +
              '<button type="button" class="hevy-close-btn" onclick="closeHevySelector()">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="hevy-search-container">' +
            '<div class="hevy-search-bar">' +
              '<span class="hevy-search-icon">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
              '</span>' +
              '<input type="text" id="hevySearchInput" placeholder="Search 790+ exercises..." autocomplete="off" />' +
              '<span class="hevy-search-clear" id="hevySearchClear">&times;</span>' +
            '</div>' +
          '</div>' +
          '<div class="hevy-filter-row" id="hevyMuscleTabs"></div>' +
          '<div class="hevy-filter-row" id="hevyEquipTabs" style="padding-top:2px;"></div>' +
          '<div class="hevy-count-bar">' +
            '<span id="hevyCountTxt">0 Exercises</span>' +
            '<span id="hevyFilterTxt" style="color:var(--text-soft)"></span>' +
          '</div>' +
          '<div class="hevy-ex-list" id="hevyExList"></div>' +
        '</div>';
      document.body.appendChild(m);

      // Wire search input
      var inp = document.getElementById('hevySearchInput');
      var clr = document.getElementById('hevySearchClear');
      inp.addEventListener('input', function() {
        state.search = this.value.trim().toLowerCase();
        clr.style.display = state.search ? 'block' : 'none';
        renderHevyList();
      });
      clr.addEventListener('click', function() {
        inp.value = '';
        state.search = '';
        clr.style.display = 'none';
        renderHevyList();
        inp.focus();
      });
    }

    // 2. Hevy Exercise Detail Modal
    if (!document.getElementById('hevyDetailModal')) {
      var d = document.createElement('div');
      d.id = 'hevyDetailModal';
      d.onclick = function(e) { if (e.target === this) closeHevyDetail(); };
      d.innerHTML = 
        '<div class="hevy-detail-dialog">' +
          '<div class="hevy-modal-header">' +
            '<div class="hevy-modal-title">Exercise Anatomy & Form</div>' +
            '<button type="button" class="hevy-close-btn" onclick="closeHevyDetail()">&times;</button>' +
          '</div>' +
          '<div class="hevy-detail-body" id="hevyDetailBody"></div>' +
          '<div class="hevy-detail-footer">' +
            '<button type="button" class="hevy-detail-action-btn" id="hevyDetailActionBtn">Select Exercise</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(d);
    }
  }

  function getMasterList() {
    return window.MOS_EXERCISE_MASTER || [];
  }

  window.openHevySelector = function(opts) {
    ensureModals();
    opts = opts || {};
    state.mode = opts.mode || 'browse';
    state.dayIdx = opts.dayIdx !== undefined ? opts.dayIdx : 0;
    state.slotIdx = opts.slotIdx !== undefined ? opts.slotIdx : 0;
    state.currentEx = opts.currentEx || '';
    state.slotEn = opts.slotEn || null;
    state.onSelect = opts.onSelect || null;
    state.search = '';
    state.targetMuscle = opts.targetMuscle || 'all';
    state.targetEquip = 'all';

    // Update title
    var titleEl = document.querySelector('#hevyModalTitle span');
    if (titleEl) {
      if (state.mode === 'swap') {
        titleEl.textContent = 'Swap: ' + (state.currentEx || 'Exercise');
      } else if (state.mode === 'add') {
        titleEl.textContent = 'Add Exercise to Day ' + (state.dayIdx + 1);
      } else {
        titleEl.textContent = 'Exercise Explorer';
      }
    }

    var inp = document.getElementById('hevySearchInput');
    if (inp) {
      inp.value = '';
      document.getElementById('hevySearchClear').style.display = 'none';
    }

    renderTabs();
    renderHevyList();

    var modal = document.getElementById('hevyExModal');
    modal.style.display = 'flex';
    if (inp) setTimeout(function() { inp.focus(); }, 150);
  };

  window.closeHevySelector = function() {
    var modal = document.getElementById('hevyExModal');
    if (modal) modal.style.display = 'none';
  };

  function renderTabs() {
    var mTabsEl = document.getElementById('hevyMuscleTabs');
    var eTabsEl = document.getElementById('hevyEquipTabs');
    if (!mTabsEl || !eTabsEl) return;

    mTabsEl.innerHTML = MUSCLE_TABS.map(function(t) {
      var act = state.targetMuscle === t.id ? ' active' : '';
      return '<button type="button" class="hevy-filter-chip' + act + '" data-m="' + t.id + '">' + t.name + '</button>';
    }).join('');

    eTabsEl.innerHTML = EQUIP_TABS.map(function(t) {
      var act = state.targetEquip === t.id ? ' active' : '';
      return '<button type="button" class="hevy-filter-chip' + act + '" data-eq="' + t.id + '">' + t.name + '</button>';
    }).join('');

    mTabsEl.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.targetMuscle = this.dataset.m;
        renderTabs();
        renderHevyList();
      });
    });

    eTabsEl.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.targetEquip = this.dataset.eq;
        renderTabs();
        renderHevyList();
      });
    });
  }

  function filterExercises() {
    var master = getMasterList();
    var q = state.search;
    var m = state.targetMuscle;
    var eq = state.targetEquip;

    return master.filter(function(ex) {
      // Muscle filter
      if (m !== 'all') {
        if (ex.p !== m && (ex.sec || []).indexOf(m) < 0) return false;
      }
      // Equipment filter
      if (eq !== 'all') {
        if ((ex.eq || '').toLowerCase() !== eq) return false;
      }
      // Search query
      if (q) {
        var nameMatch = ex.n.toLowerCase().indexOf(q) >= 0;
        var muscleMatch = ex.p.toLowerCase().indexOf(q) >= 0;
        var equipMatch = (ex.eq || '').toLowerCase().indexOf(q) >= 0;
        var targetMatch = (ex.target || '').toLowerCase().indexOf(q) >= 0;
        if (!nameMatch && !muscleMatch && !equipMatch && !targetMatch) return false;
      }
      return true;
    });
  }

  function renderHevyList() {
    var listEl = document.getElementById('hevyExList');
    var countEl = document.getElementById('hevyCountTxt');
    var filterTxtEl = document.getElementById('hevyFilterTxt');
    if (!listEl) return;

    var filtered = filterExercises();

    if (countEl) countEl.textContent = filtered.length + ' Exercises';
    if (filterTxtEl) {
      var fParts = [];
      if (state.targetMuscle !== 'all') fParts.push(state.targetMuscle);
      if (state.targetEquip !== 'all') fParts.push(state.targetEquip);
      filterTxtEl.textContent = fParts.join(' · ');
    }

    if (!filtered.length) {
      listEl.innerHTML = 
        '<div style="text-align:center;padding:40px 20px;color:var(--text-soft);font-size:.75rem;">' +
          '<div style="font-size:1.6rem;margin-bottom:8px;opacity:.4">🔍</div>' +
          'No exercises match your filters.' +
          '<div style="margin-top:12px;"><button type="button" class="btn-secondary" onclick="openCustomFromHevy()" style="padding:6px 14px;font-size:.7rem;">+ Create Custom Exercise</button></div>' +
        '</div>';
      return;
    }

    // Virtual slice first 100 for maximum performance
    var visible = filtered.slice(0, 100);

    var html = visible.map(function(ex) {
      var thumb = window.renderHevyThumbnail ? window.renderHevyThumbnail(ex, 48) : '';
      var pName = (ex.p || '').toUpperCase();
      var eqName = (ex.eq || '').toUpperCase();
      var badge = ex.t === 'compound' ? 'Compound' : 'Isolation';

      return '<div class="hevy-ex-card" data-ename="' + ex.n.replace(/"/g, '&quot;') + '">' +
               thumb +
               '<div class="hevy-ex-meta">' +
                 '<div class="hevy-ex-name">' + ex.n + '</div>' +
                 '<div class="hevy-ex-sub">' +
                   '<span>' + pName + ' · ' + eqName + '</span>' +
                   '<span class="hevy-badge">' + badge + '</span>' +
                 '</div>' +
               '</div>' +
               '<button type="button" class="hevy-info-btn" title="View details" data-detail="' + ex.n.replace(/"/g, '&quot;') + '">' +
                 '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
               '</button>' +
             '</div>';
    }).join('');

    if (filtered.length > 100) {
      html += '<div style="text-align:center;padding:12px;font-size:.65rem;color:var(--text-soft)">Showing first 100 of ' + filtered.length + ' exercises. Refine search for more.</div>';
    }

    listEl.innerHTML = html;

    // Wire clicks on cards (select/swap)
    listEl.querySelectorAll('.hevy-ex-card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.hevy-info-btn')) return; // handled separately
        var ename = this.dataset.ename;
        var ex = (window.MOS_EX_INDEX && window.MOS_EX_INDEX[ename.toLowerCase()]) || { n: ename, p: state.targetMuscle, eq: 'barbell' };
        selectHevyExercise(ex);
      });
    });

    // Wire detail button clicks
    listEl.querySelectorAll('.hevy-info-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var ename = this.dataset.detail;
        var ex = (window.MOS_EX_INDEX && window.MOS_EX_INDEX[ename.toLowerCase()]) || { n: ename };
        openHevyDetail(ex);
      });
    });
  }

  function selectHevyExercise(ex) {
    if (state.onSelect) {
      state.onSelect(ex);
      closeHevySelector();
      return;
    }

    if (state.mode === 'swap') {
      if (typeof swapEx === 'function') {
        swapEx(state.dayIdx, state.slotIdx, state.currentEx, ex.n);
        showToast('✓ Swapped: ' + ex.n);
      }
      closeHevySelector();
    } else if (state.mode === 'add') {
      addExerciseToDay(state.dayIdx, ex);
      closeHevySelector();
    } else if (state.mode === 'picker') {
      if (state.slotEn && window.pendingExChoices) {
        window.pendingExChoices[state.slotEn] = ex.n;
      }
      closeHevySelector();
      if (typeof refreshExSelection === 'function') refreshExSelection();
    } else {
      openHevyDetail(ex);
    }
  }

  function addExerciseToDay(dayIdx, ex) {
    try {
      var pg = ls(K.PG, null);
      if (!pg || !pg.program || !pg.program[dayIdx]) {
        alert('Active workout program not found.');
        return;
      }
      var day = pg.program[dayIdx];
      var newSlot = {
        n: ex.n,
        s: (ex.rr && ex.rr[0]) ? 3 : 3,
        p: ex.p || 'chest',
        se: ex.sec || []
      };
      day.ex.push(newSlot);
      ss(K.PG, pg);
      if (typeof renderDashboard === 'function') renderDashboard();
      showToast('✓ Added ' + ex.n + ' to Session');
    } catch(err) {
      console.error('Failed to add exercise:', err);
      alert('Error adding exercise: ' + err.message);
    }
  }

  window.openHevyDetail = function(ex) {
    ensureModals();
    if (typeof ex === 'string') {
      ex = (window.MOS_EX_INDEX && window.MOS_EX_INDEX[ex.toLowerCase()]) || { n: ex, p: 'chest', eq: 'barbell' };
    }
    var bodyEl = document.getElementById('hevyDetailBody');
    var actionBtn = document.getElementById('hevyDetailActionBtn');
    if (!bodyEl) return;

    var p = ex.p || 'chest';
    var sec = ex.sec || [];
    var eq = ex.eq || 'barbell';
    var anatSvg = window.renderHevyAnatomySvg ? window.renderHevyAnatomySvg(p, sec, 70) : '';

    var instHtml = '';
    if (ex.inst && ex.inst.length) {
      instHtml = ex.inst.map(function(st) {
        return '<div class="hevy-inst-step">' + st + '</div>';
      }).join('');
    } else if (typeof guideHtml === 'function') {
      instHtml = guideHtml(ex.n);
    } else {
      instHtml = '<div style="color:var(--text-soft);font-size:.72rem;">Follow standard strict form through full active range of motion.</div>';
    }

    bodyEl.innerHTML = 
      '<div class="hevy-detail-hero">' +
        '<div class="hevy-detail-anatomy">' + anatSvg + '</div>' +
        '<div class="hevy-detail-info">' +
          '<div class="hevy-detail-title">' + ex.n + '</div>' +
          '<div style="font-size:.72rem;color:var(--text-soft);text-transform:uppercase;letter-spacing:.5px;">' +
            p + ' · ' + eq +
          '</div>' +
          '<div class="hevy-detail-tags">' +
            '<span class="hevy-badge">' + (ex.t || 'compound') + '</span>' +
            '<span class="hevy-badge">' + (ex.diff || 'intermediate') + '</span>' +
            (ex.rr ? '<span class="hevy-badge">' + ex.rr[0] + '-' + ex.rr[1] + ' reps</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hevy-detail-section">' +
        '<div class="hevy-detail-sec-title">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
          'Muscles Worked' +
        '</div>' +
        '<div style="font-size:.75rem;color:#FFFFFF;margin-bottom:4px;"><strong>Primary:</strong> <span style="color:var(--accent);text-transform:capitalize;">' + p + '</span></div>' +
        (sec.length ? '<div style="font-size:.72rem;color:var(--text-soft);"><strong>Secondary:</strong> ' + sec.join(', ') + '</div>' : '') +
      '</div>' +
      '<div class="hevy-detail-section">' +
        '<div class="hevy-detail-sec-title">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>' +
          'Execution & Form Cues' +
        '</div>' +
        instHtml +
      '</div>';

    if (actionBtn) {
      if (state.mode === 'swap') {
        actionBtn.textContent = 'Swap with ' + state.currentEx;
      } else if (state.mode === 'add') {
        actionBtn.textContent = 'Add to Workout';
      } else {
        actionBtn.textContent = 'Select Exercise';
      }
      actionBtn.onclick = function() {
        closeHevyDetail();
        selectHevyExercise(ex);
      };
    }

    var detailModal = document.getElementById('hevyDetailModal');
    detailModal.style.display = 'flex';
  };

  window.closeHevyDetail = function() {
    var modal = document.getElementById('hevyDetailModal');
    if (modal) modal.style.display = 'none';
  };

  window.openCustomFromHevy = function() {
    closeHevySelector();
    if (typeof showCeModal === 'function') {
      showCeModal();
    }
  };

  function showToast(msg) {
    var t = document.getElementById('mosToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mosToast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#161822;border:1px solid #262936;color:#E2E8F0;padding:10px 18px;border-radius:10px;font-size:.75rem;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,.8);z-index:11000;pointer-events:none;transition:opacity .2s;opacity:0;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(function() { t.style.opacity = '0'; }, 2200);
  }

  // Hook workout logger Swap buttons & add "+ Add Exercise" CTA
  function patchWorkoutLogger() {
    var originalRenderDashboard = window.renderDashboard;
    if (typeof originalRenderDashboard === 'function' && !originalRenderDashboard._hevyPatched) {
      window.renderDashboard = function() {
        originalRenderDashboard.apply(this, arguments);

        // Intercept all .sw-ex-btn
        document.querySelectorAll('.sw-ex-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var exName = this.dataset.ex;
            var card = this.closest('.ex-card');
            var di = parseInt(document.getElementById('dashDaySelect') ? document.getElementById('dashDaySelect').value : 0, 10);
            var ei = card ? Array.from(card.parentNode.children).indexOf(card) : 0;
            var exObj = (window.MOS_EX_INDEX && window.MOS_EX_INDEX[exName.toLowerCase()]) || { n: exName };

            openHevySelector({
              mode: 'swap',
              dayIdx: isNaN(di) ? 0 : di,
              slotIdx: Math.max(0, ei),
              currentEx: exName,
              targetMuscle: exObj.p || 'all'
            });
          }, true);
        });

        // Add "+ Add Exercise" button if not present
        var container = document.getElementById('exCardsContainer');
        if (container && !container.querySelector('#addExToWorkoutBtn')) {
          var addBox = document.createElement('div');
          addBox.style.cssText = 'text-align:center;margin:16px 0 8px;';
          addBox.innerHTML = 
            '<button type="button" id="addExToWorkoutBtn" class="btn-secondary" style="width:100%;max-width:320px;padding:10px 16px;font-size:.75rem;font-weight:700;border:1px dashed #334155;background:rgba(22,24,34,.7);color:#E2E8F0;border-radius:10px;cursor:pointer;transition:all .15s;">' +
              '✚ Add Exercise' +
            '</button>';
          container.appendChild(addBox);

          addBox.querySelector('#addExToWorkoutBtn').addEventListener('click', function() {
            var di = parseInt(document.getElementById('dashDaySelect') ? document.getElementById('dashDaySelect').value : 0, 10);
            openHevySelector({
              mode: 'add',
              dayIdx: isNaN(di) ? 0 : di
            });
          });
        }
      };
      window.renderDashboard._hevyPatched = true;
    }
  }

  // Intercept Exercise Library button to launch Hevy Explorer
  function patchLibrary() {
    window.showLibrary = function() {
      openHevySelector({ mode: 'browse' });
    };
    var libBtn = document.getElementById('libBtn');
    if (libBtn) {
      libBtn.onclick = function() { openHevySelector({ mode: 'browse' }); };
    }
  }

  // Hook Screen 2.5 Exercise Selection (Pre-generation Picker)
  function patchScreen25Picker() {
    var originalRenderExSelection = window.renderExSelection;
    if (typeof originalRenderExSelection === 'function' && !originalRenderExSelection._hevyPatched) {
      window.renderExSelection = function(split) {
        originalRenderExSelection.apply(this, arguments);

        // Add a "+ Browse 790+ Exercises" button to each esm-search container
        document.querySelectorAll('.esm-search').forEach(function(box) {
          if (!box.querySelector('.hevy-browse-picker-btn')) {
            var input = box.querySelector('.esm-search-input');
            var muscle = input ? input.dataset.muscle : 'all';
            var slotkey = input ? input.dataset.slotkey : '';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hevy-browse-picker-btn';
            btn.style.cssText = 'margin-top:6px;width:100%;padding:6px 12px;font-size:0.68rem;font-weight:700;border:1px solid #262936;border-radius:8px;background:#161822;color:#E2E8F0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;';
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v18M18 3v18M2 8h4M18 8h4M2 16h4M18 16h4M6 12h12"/></svg> Browse 790+ Exercises & Anatomies (Hevy/Strong)';
            btn.onmouseover = function() { btn.style.background = '#262936'; btn.style.borderColor = '#E2E8F0'; };
            btn.onmouseout = function() { btn.style.background = '#161822'; btn.style.borderColor = '#262936'; };
            btn.onclick = function() {
              openHevySelector({
                mode: 'picker',
                slotEn: slotkey,
                targetMuscle: muscle || 'all',
                onSelect: function(chosenEx) {
                  if (slotkey) {
                    if (window.pendingExChoices) window.pendingExChoices[slotkey] = chosenEx.n;
                    var ch = (typeof ls === 'function') ? ls('mos_ex_choices', {}) : {};
                    ch[slotkey] = chosenEx.n;
                    if (typeof ss === 'function') ss('mos_ex_choices', ch);
                  }
                  showToast('✓ Selected: ' + chosenEx.n);
                  if (typeof refreshExSelection === 'function') refreshExSelection();
                  else if (typeof renderExSelection === 'function' && window.SPLITS && window.splitKey) renderExSelection(window.SPLITS[window.splitKey]);
                }
              });
            };
            box.appendChild(btn);
          }
        });
      };
      window.renderExSelection._hevyPatched = true;
    }
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      patchWorkoutLogger();
      patchLibrary();
      patchScreen25Picker();
    });
  } else {
    patchWorkoutLogger();
    patchLibrary();
    patchScreen25Picker();
  }

})();

