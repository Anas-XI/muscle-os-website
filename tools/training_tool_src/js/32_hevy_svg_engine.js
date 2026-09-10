// ===================================================================
// Muscle OS Hyperkinetics - High-Quality Vector SVG Anatomy & Equipment Engine
// Precision vector silhouettes and equipment glyphs for Hevy/Strong exercise cards
// ===================================================================

(function() {
  'use strict';

  // Base human anatomical silhouettes (Front & Rear)
  // Scale optimized for 100 x 150 viewport
  var ANATOMY_BASE_FRONT = 
    '<circle cx="50" cy="12" r="7" class="anat-base-part"/>' + // Head
    '<path d="M47 19 L47 23 L53 23 L53 19 Z" class="anat-base-part"/>' + // Neck
    '<path d="M35 24 C40 22 60 22 65 24 L69 48 L64 70 L50 72 L36 70 L31 48 Z" class="anat-base-part"/>' + // Torso/Core
    '<path d="M30 25 C24 28 20 40 21 54 L26 55 C26 43 28 32 34 27 Z" class="anat-base-part"/>' + // Left Upper Arm
    '<path d="M21 55 C18 69 17 82 20 94 L25 93 C23 81 24 70 26 56 Z" class="anat-base-part"/>' + // Left Forearm
    '<path d="M70 25 C76 28 80 40 79 54 L74 55 C74 43 72 32 66 27 Z" class="anat-base-part"/>' + // Right Upper Arm
    '<path d="M79 55 C82 69 83 82 80 94 L75 93 C77 81 76 70 74 56 Z" class="anat-base-part"/>' + // Right Forearm
    '<path d="M36 72 C33 88 35 104 38 118 L48 118 C46 104 46 89 48 73 Z" class="anat-base-part"/>' + // Left Thigh
    '<path d="M64 72 C67 88 65 104 62 118 L52 118 C54 104 54 89 52 73 Z" class="anat-base-part"/>' + // Right Thigh
    '<path d="M38 120 C36 128 38 138 41 146 L47 146 C45 138 45 128 47 120 Z" class="anat-base-part"/>' + // Left Calf
    '<path d="M62 120 C64 128 62 138 59 146 L53 146 C55 138 55 128 53 120 Z" class="anat-base-part"/>';  // Right Calf

  var ANATOMY_BASE_REAR = 
    '<circle cx="50" cy="12" r="7" class="anat-base-part"/>' + // Head
    '<path d="M47 19 L47 23 L53 23 L53 19 Z" class="anat-base-part"/>' + // Neck
    '<path d="M34 24 C40 21 60 21 66 24 L69 48 L64 70 L50 72 L36 70 L31 48 Z" class="anat-base-part"/>' + // Back torso
    '<path d="M30 25 C24 28 20 40 21 54 L26 55 C26 43 28 32 34 27 Z" class="anat-base-part"/>' + // Left Arm
    '<path d="M21 55 C18 69 17 82 20 94 L25 93 C23 81 24 70 26 56 Z" class="anat-base-part"/>' + // Left Forearm
    '<path d="M70 25 C76 28 80 40 79 54 L74 55 C74 43 72 32 66 27 Z" class="anat-base-part"/>' + // Right Arm
    '<path d="M79 55 C82 69 83 82 80 94 L75 93 C77 81 76 70 74 56 Z" class="anat-base-part"/>' + // Right Forearm
    '<path d="M36 72 C33 88 35 104 38 118 L48 118 C46 104 46 89 48 73 Z" class="anat-base-part"/>' + // Left Hamstring
    '<path d="M64 72 C67 88 65 104 62 118 L52 118 C54 104 54 89 52 73 Z" class="anat-base-part"/>' + // Right Hamstring
    '<path d="M38 120 C36 128 38 138 41 146 L47 146 C45 138 45 128 47 120 Z" class="anat-base-part"/>' + // Left Calf
    '<path d="M62 120 C64 128 62 138 59 146 L53 146 C55 138 55 128 53 120 Z" class="anat-base-part"/>';  // Right Calf

  // Muscle Highlight Overlay Paths
  var MUSCLE_PATHS = {
    // Front View
    chest: {
      view: 'front',
      d: '<path d="M37 28 C42 27 49 28 50 34 C50 41 42 44 34 40 Z"/>' +
         '<path d="M63 28 C58 27 51 28 50 34 C50 41 58 44 66 40 Z"/>'
    },
    abs: {
      view: 'front',
      d: '<rect x="43" y="44" width="6" height="5" rx="1"/>' +
         '<rect x="51" y="44" width="6" height="5" rx="1"/>' +
         '<rect x="43" y="51" width="6" height="5" rx="1"/>' +
         '<rect x="51" y="51" width="6" height="5" rx="1"/>' +
         '<rect x="44" y="58" width="5" height="6" rx="1"/>' +
         '<rect x="51" y="58" width="5" height="6" rx="1"/>'
    },
    biceps: {
      view: 'front',
      d: '<ellipse cx="27" cy="38" rx="4" ry="7"/>' +
         '<ellipse cx="73" cy="38" rx="4" ry="7"/>'
    },
    shoulders: {
      view: 'front',
      d: '<path d="M32 24 C28 25 25 30 27 35 C30 35 34 32 35 27 Z"/>' +
         '<path d="M68 24 C72 25 75 30 73 35 C70 35 66 32 65 27 Z"/>'
    },
    quads: {
      view: 'front',
      d: '<path d="M37 74 C34 86 36 100 39 114 L47 114 C45 100 45 86 47 74 Z"/>' +
         '<path d="M63 74 C66 86 64 100 61 114 L53 114 C55 100 55 86 53 74 Z"/>'
    },
    forearms: {
      view: 'front',
      d: '<ellipse cx="22" cy="70" rx="3.5" ry="10"/>' +
         '<ellipse cx="78" cy="70" rx="3.5" ry="10"/>'
    },

    // Rear View
    back: {
      view: 'rear',
      d: '<path d="M36 29 C44 32 46 48 48 60 L44 62 C39 52 35 40 34 33 Z"/>' +
         '<path d="M64 29 C56 32 54 48 52 60 L56 62 C61 52 65 40 66 33 Z"/>'
    },
    traps: {
      view: 'rear',
      d: '<path d="M43 20 L50 26 L57 20 L64 25 L50 36 L36 25 Z"/>'
    },
    triceps: {
      view: 'rear',
      d: '<ellipse cx="26" cy="38" rx="4" ry="8"/>' +
         '<ellipse cx="74" cy="38" rx="4" ry="8"/>'
    },
    glutes: {
      view: 'rear',
      d: '<path d="M37 70 C34 76 36 86 44 89 L48 82 C43 78 41 73 42 69 Z"/>' +
         '<path d="M63 70 C66 76 64 86 56 89 L52 82 C57 78 59 73 58 69 Z"/>'
    },
    hamstrings: {
      view: 'rear',
      d: '<path d="M37 88 C35 96 36 106 39 116 L47 116 C46 106 46 96 48 88 Z"/>' +
         '<path d="M63 88 C65 96 64 106 61 116 L53 116 C54 106 54 96 52 88 Z"/>'
    },
    calves: {
      view: 'rear',
      d: '<ellipse cx="42" cy="130" rx="4" ry="9"/>' +
         '<ellipse cx="58" cy="130" rx="4" ry="9"/>'
    },
    mobility: {
      view: 'front',
      d: '<circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/>'
    }
  };

  // Equipment SVG Icons
  var EQUIP_ICONS = {
    barbell: '<path d="M2 12h20M5 7v10M8 9v6M16 9v6M19 7v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    dumbbell: '<path d="M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    cable: '<path d="M12 2v6M8 8h8M6 22l6-14 6 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    machine: '<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9h6v6H9z" fill="currentColor"/>',
    bodyweight: '<circle cx="12" cy="5" r="2.5" fill="currentColor"/><path d="M12 9v7M8 12h8M9 20l3-4 3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    kettlebell: '<circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2"/>',
    band: '<ellipse cx="12" cy="12" rx="7" ry="4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/>',
    'smith machine': '<path d="M4 4v16M20 4v16M4 12h16M10 9v6M14 9v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    other: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="2"/>'
  };

  /**
   * Render high-resolution anatomical human vector SVG with target muscle highlight
   */
  window.renderHevyAnatomySvg = function(primaryMuscle, secondaryMuscles, size) {
    primaryMuscle = (primaryMuscle || 'chest').toLowerCase();
    secondaryMuscles = secondaryMuscles || [];
    var mDef = MUSCLE_PATHS[primaryMuscle] || MUSCLE_PATHS.chest;
    var isRear = mDef.view === 'rear';
    var basePaths = isRear ? ANATOMY_BASE_REAR : ANATOMY_BASE_FRONT;

    var secHlHtml = '';
    secondaryMuscles.forEach(function(sec) {
      var sNorm = (sec || '').toLowerCase();
      var sKey = null;
      if (sNorm.indexOf('tricep') >= 0) sKey = 'triceps';
      else if (sNorm.indexOf('bicep') >= 0) sKey = 'biceps';
      else if (sNorm.indexOf('delt') >= 0 || sNorm.indexOf('shoulder') >= 0) sKey = 'shoulders';
      else if (sNorm.indexOf('lat') >= 0 || sNorm.indexOf('back') >= 0) sKey = 'back';
      else if (sNorm.indexOf('trap') >= 0) sKey = 'traps';
      else if (sNorm.indexOf('glute') >= 0) sKey = 'glutes';
      else if (sNorm.indexOf('hamstring') >= 0) sKey = 'hamstrings';
      else if (sNorm.indexOf('quad') >= 0) sKey = 'quads';
      else if (sNorm.indexOf('calv') >= 0) sKey = 'calves';
      else if (sNorm.indexOf('ab') >= 0 || sNorm.indexOf('core') >= 0) sKey = 'abs';

      if (sKey && MUSCLE_PATHS[sKey] && MUSCLE_PATHS[sKey].view === mDef.view && sKey !== primaryMuscle) {
        secHlHtml += '<g class="anat-sec-hl">' + MUSCLE_PATHS[sKey].d + '</g>';
      }
    });

    var primHlHtml = '<g class="anat-prim-hl">' + mDef.d + '</g>';
    var s = size ? ' width="' + size + '" height="' + Math.round(size * 1.3) + '"' : '';

    return '<svg class="hevy-anatomy-svg"' + s + ' viewBox="15 5 70 145" xmlns="http://www.w3.org/2000/svg">' +
           '<g class="anat-base">' + basePaths + '</g>' +
           secHlHtml +
           primHlHtml +
           '</svg>';
  };

  /**
   * Render equipment vector glyph SVG
   */
  window.renderHevyEquipSvg = function(equipment, size) {
    equipment = (equipment || 'barbell').toLowerCase();
    var icon = EQUIP_ICONS[equipment] || EQUIP_ICONS.other;
    var sz = size || 16;
    return '<svg class="hevy-equip-glyph" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
           icon +
           '</svg>';
  };

  /**
   * Render complete composite exercise card thumbnail (Anatomy vector + mini equipment pill)
   */
  window.renderHevyThumbnail = function(ex, size) {
    if (!ex) return '';
    var p = ex.p || 'chest';
    var sec = ex.sec || [];
    var eq = ex.eq || 'barbell';
    var sz = size || 48;

    return '<div class="hevy-thumb-box" style="width:' + sz + 'px;height:' + sz + 'px;">' +
           window.renderHevyAnatomySvg(p, sec, sz * 0.72) +
           '<div class="hevy-thumb-eq" title="' + eq + '">' +
           window.renderHevyEquipSvg(eq, 12) +
           '</div>' +
           '</div>';
  };

})();
