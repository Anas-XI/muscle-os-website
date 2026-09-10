/**
 * Muscle OS — Modern UI Core & Interaction Engine (mos-ui-core.js)
 * Integrates shadcn/ui, 10x UX, Haikei SVGs, Lottie, Fontjoy, OriginKit, Bklit UI, and GSAP.
 */

(function () {
  'use strict';

  var mosUI = {};

  // ── 1. GSAP Orchestrator & Smooth RAF Tweener ────────────────────────────
  mosUI.animateCounter = function (element, start, end, duration, formatFn) {
    if (!element) return;
    duration = duration || 800;
    start = Number(start) || 0;
    end = Number(end) || 0;

    if (window.gsap) {
      var obj = { val: start };
      window.gsap.to(obj, {
        val: end,
        duration: duration / 1000,
        ease: 'power2.out',
        onUpdate: function () {
          element.textContent = formatFn ? formatFn(obj.val) : Math.round(obj.val);
        }
      });
      return;
    }

    // High-performance RAF fallback
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = start + (end - start) * ease;
      element.textContent = formatFn ? formatFn(current) : Math.round(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = formatFn ? formatFn(end) : Math.round(end);
      }
    }
    window.requestAnimationFrame(step);
  };

  mosUI.staggerEntrance = function (selector, delay) {
    var items = document.querySelectorAll(selector);
    if (!items.length) return;
    if (window.gsap) {
      window.gsap.from(items, {
        opacity: 0,
        y: 18,
        duration: 0.4,
        stagger: delay || 0.06,
        ease: 'power2.out'
      });
      return;
    }
    items.forEach(function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, (delay || 60) * i);
    });
  };

  // ── 2. Lottie Micro-Interactions & Audio Chime ────────────────────────────
  mosUI.playCheckmark = function (targetEl) {
    if (!targetEl) return;
    var checkSvg = [
      '<svg class="mos-lottie-icon" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: mosPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">',
      '  <polyline points="20 6 9 17 4 12"></polyline>',
      '</svg>'
    ].join('');
    
    var orig = targetEl.innerHTML;
    targetEl.innerHTML = checkSvg;
    setTimeout(function () {
      targetEl.innerHTML = orig;
    }, 1200);
  };

  mosUI.playConfetti = function () {
    // Lightweight canvas confetti burst
    var canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999999';
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var pieces = [];
    var colors = ['#E2E8F0', '#34D399', '#38BDF8', '#FAFAF8', '#E53E3E'];
    for (var i = 0; i < 60; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 100,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        dRot: (Math.random() - 0.5) * 10
      });
    }

    var start = performance.now();
    function render(now) {
      var elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      pieces.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravity
        p.rotation += p.dRot;
        if (p.y < canvas.height) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (alive && elapsed < 2000) {
        requestAnimationFrame(render);
      } else {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }
    requestAnimationFrame(render);
  };

  mosUI.playRestChime = function () {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      var ctx = new AudioContext();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15); // A6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {}
  };

  // ── 3. Bklit-Grade Composable SVG Chart Components ────────────────────────
  mosUI.renderAreaChart = function (container, data, options) {
    if (!container || !data || data.length < 2) return;
    options = options || {};
    var height = options.height || 180;
    var width = container.clientWidth || 500;
    var color = options.color || '#E2E8F0';

    var vals = data.map(function (d) { return d.y; });
    var minY = Math.min.apply(null, vals);
    var maxY = Math.max.apply(null, vals);
    var padY = (maxY - minY) * 0.15 || 1;
    minY = Math.max(0, minY - padY);
    maxY = maxY + padY;

    var padLeft = 40, padRight = 16, padTop = 16, padBottom = 26;
    var chartW = width - padLeft - padRight;
    var chartH = height - padTop - padBottom;

    var points = data.map(function (d, i) {
      var x = padLeft + (i / (data.length - 1)) * chartW;
      var y = padTop + chartH - ((d.y - minY) / (maxY - minY)) * chartH;
      return { x: x, y: y, raw: d };
    });

    var lineD = 'M ' + points[0].x + ' ' + points[0].y;
    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var curr = points[i];
      var cp1x = prev.x + (curr.x - prev.x) / 2;
      var cp2x = cp1x;
      lineD += ' C ' + cp1x + ' ' + prev.y + ', ' + cp2x + ' ' + curr.y + ', ' + curr.x + ' ' + curr.y;
    }

    var areaD = lineD + ' L ' + points[points.length - 1].x + ' ' + (padTop + chartH) +
                ' L ' + points[0].x + ' ' + (padTop + chartH) + ' Z';

    var gradId = 'bklit-grad-' + Math.random().toString(36).substring(2, 8);

    var svg = [
      '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '" style="overflow:visible;">',
      '  <defs>',
      '    <linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">',
      '      <stop offset="0%" stop-color="' + color + '" stop-opacity="0.32" />',
      '      <stop offset="100%" stop-color="' + color + '" stop-opacity="0.0" />',
      '    </linearGradient>',
      '  </defs>',
      '  <!-- Grid Lines -->',
      '  <line x1="' + padLeft + '" y1="' + padTop + '" x2="' + (width - padRight) + '" y2="' + padTop + '" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3,3" />',
      '  <line x1="' + padLeft + '" y1="' + (padTop + chartH / 2) + '" x2="' + (width - padRight) + '" y2="' + (padTop + chartH / 2) + '" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3,3" />',
      '  <line x1="' + padLeft + '" y1="' + (padTop + chartH) + '" x2="' + (width - padRight) + '" y2="' + (padTop + chartH) + '" stroke="rgba(255,255,255,0.08)" />',
      '  <!-- Area Fill -->',
      '  <path d="' + areaD + '" fill="url(#' + gradId + ')" />',
      '  <!-- Main Line -->',
      '  <path d="' + lineD + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" />',
      '  <!-- Axes Labels -->',
      '  <text x="' + (padLeft - 8) + '" y="' + (padTop + 4) + '" fill="rgba(250,250,248,0.4)" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="end">' + Math.round(maxY) + '</text>',
      '  <text x="' + (padLeft - 8) + '" y="' + (padTop + chartH) + '" fill="rgba(250,250,248,0.4)" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="end">' + Math.round(minY) + '</text>',
      '  <text x="' + padLeft + '" y="' + (height - 4) + '" fill="rgba(250,250,248,0.4)" font-family="JetBrains Mono, monospace" font-size="9">' + (data[0].x || '') + '</text>',
      '  <text x="' + (width - padRight) + '" y="' + (height - 4) + '" fill="rgba(250,250,248,0.4)" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="end">' + (data[data.length - 1].x || '') + '</text>',
      '</svg>',
      '<div class="bklit-tooltip" style="opacity: 0;"></div>'
    ].join('');

    container.innerHTML = svg;
    var tooltip = container.querySelector('.bklit-tooltip');

    // Crosshair hover interaction
    container.onmousemove = function (e) {
      var rect = container.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var ratio = (mouseX - padLeft) / chartW;
      var idx = Math.round(ratio * (points.length - 1));
      if (idx >= 0 && idx < points.length) {
        var pt = points[idx];
        tooltip.style.opacity = '1';
        tooltip.style.left = pt.x + 'px';
        tooltip.style.top = pt.y + 'px';
        tooltip.textContent = pt.raw.x + ': ' + pt.raw.y + (options.unit ? ' ' + options.unit : '');
      }
    };

    container.onmouseleave = function () {
      tooltip.style.opacity = '0';
    };
  };

  mosUI.renderVolumeRadar = function (container, muscleGroups) {
    if (!container) return;
    // muscleGroups: [{ name: 'Chest', val: 0.8, sets: 16, mev: 10, mav: 16, mrv: 22 }, ...]
    var size = 280;
    var center = size / 2;
    var radius = size * 0.36;

    // Use passed muscleGroups or rich calibrated baseline
    var groups = (muscleGroups && muscleGroups.length > 0) ? muscleGroups : [
      { name: 'Chest', val: 0.80, sets: 16, mev: 10, mav: 16, mrv: 22 },
      { name: 'Back', val: 0.90, sets: 18, mev: 12, mav: 18, mrv: 25 },
      { name: 'Quads', val: 0.70, sets: 14, mev: 8, mav: 14, mrv: 20 },
      { name: 'Hamstrings', val: 0.65, sets: 12, mev: 6, mav: 12, mrv: 18 },
      { name: 'Shoulders', val: 0.78, sets: 15, mev: 8, mav: 16, mrv: 22 },
      { name: 'Arms', val: 0.72, sets: 14, mev: 8, mav: 14, mrv: 20 }
    ];
    var total = groups.length;

    var gridLevels = [
      { level: 0.45, label: 'MEV' },
      { level: 0.75, label: 'MAV' },
      { level: 1.00, label: 'MRV' }
    ];

    var gridPaths = gridLevels.map(function (gl) {
      var pts = [];
      for (var i = 0; i < total; i++) {
        var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        var r = radius * gl.level;
        pts.push((center + r * Math.cos(angle)).toFixed(1) + ',' + (center + r * Math.sin(angle)).toFixed(1));
      }
      return { path: pts.join(' '), level: gl.level, label: gl.label };
    });

    var dataPts = [];
    var labels = [];
    for (var i = 0; i < total; i++) {
      var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
      var rawVal = groups[i].val !== undefined ? groups[i].val : ((groups[i].sets || 12) / (groups[i].mrv || 20));
      var r = radius * Math.min(Math.max(rawVal || 0.6, 0.2), 1.15);
      var px = (center + r * Math.cos(angle)).toFixed(1);
      var py = (center + r * Math.sin(angle)).toFixed(1);
      dataPts.push({ x: px, y: py, group: groups[i] });

      var lx = (center + (radius + 24) * Math.cos(angle)).toFixed(1);
      var ly = (center + (radius + 24) * Math.sin(angle)).toFixed(1);
      labels.push({ x: lx, y: ly, text: groups[i].name, sets: groups[i].sets || Math.round(rawVal * 20) });
    }

    var polygonCoords = dataPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    var radarGradId = 'bklit-radar-grad-' + Math.random().toString(36).substring(2, 7);

    var svg = [
      '<div style="position:relative; width:100%; max-width:' + size + 'px; margin:0 auto;">',
      '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="' + size + '" style="overflow:visible;">',
      '  <defs>',
      '    <linearGradient id="' + radarGradId + '" x1="0" y1="0" x2="1" y2="1">',
      '      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />',
      '      <stop offset="50%" stop-color="#E2E8F0" stop-opacity="0.18" />',
      '      <stop offset="100%" stop-color="#64748B" stop-opacity="0.05" />',
      '    </linearGradient>',
      '    <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">',
      '      <feGaussianBlur stdDeviation="3" result="blur" />',
      '      <feComposite in="SourceGraphic" in2="blur" operator="over" />',
      '    </filter>',
      '  </defs>',
      '  <!-- Landmark Concentric Hexagons -->',
      gridPaths.map(function (gp) {
        var strokeStyle = gp.level === 0.75 ? 'stroke="rgba(226,232,240,0.3)" stroke-dasharray="3,3"' : 'stroke="rgba(255,255,255,0.08)"';
        return '<polygon points="' + gp.path + '" fill="none" ' + strokeStyle + ' stroke-width="1" />';
      }).join(''),
      '  <!-- Kinetic Spoke Axes -->',
      groups.map(function (_, i) {
        var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        var ex = (center + radius * Math.cos(angle)).toFixed(1);
        var ey = (center + radius * Math.sin(angle)).toFixed(1);
        return '<line x1="' + center + '" y1="' + center + '" x2="' + ex + '" y2="' + ey + '" stroke="rgba(226,232,240,0.12)" stroke-width="1" />';
      }).join(''),
      '  <!-- Volume Distribution Polygon -->',
      '  <polygon points="' + polygonCoords + '" fill="url(#' + radarGradId + ')" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round" filter="url(#radarGlow)" />',
      '  <!-- Interactive Vertices -->',
      dataPts.map(function (p) {
        return '<circle class="radar-vertex" cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#FFFFFF" stroke="#08090C" stroke-width="1.8" style="cursor:pointer;transition:transform 0.2s;" data-tip="' + p.group.name + ': ' + (p.group.sets || 14) + ' sets/wk" />';
      }).join(''),
      '  <!-- Axis Labels -->',
      labels.map(function (l) {
        return '<text x="' + l.x + '" y="' + l.y + '" fill="#FAFAF8" font-family="Oswald, sans-serif" font-size="10.5" font-weight="600" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5">' +
               l.text + ' <tspan fill="#94A3B8" font-size="9" font-family="JetBrains Mono, monospace">(' + l.sets + ')</tspan></text>';
      }).join(''),
      '</svg>',
      '<div id="radarTooltip" style="position:absolute;display:none;background:#161822;border:1px solid rgba(226,232,240,0.3);border-radius:6px;padding:4px 8px;font-size:0.7rem;font-family:JetBrains Mono,monospace;color:#FFF;pointer-events:none;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap;"></div>',
      '<div style="display:flex;justify-content:center;gap:14px;margin-top:10px;font-family:JetBrains Mono,monospace;font-size:0.68rem;color:#94A3B8;">',
      '  <span style="color:#94A3B8;">⬡ MEV: ' + (groups[0].mev || 8) + '+</span>',
      '  <span style="color:#FFFFFF;font-weight:700;">★ MAV Peak: ' + (groups[0].mav || 16) + '</span>',
      '  <span style="color:#EF4444;">▲ MRV Cap: ' + (groups[0].mrv || 22) + '</span>',
      '</div>',
      '</div>'
    ].join('');

    container.innerHTML = svg;

    var tip = container.querySelector('#radarTooltip');
    container.querySelectorAll('.radar-vertex').forEach(function(dot) {
      dot.addEventListener('mouseenter', function(e) {
        if (!tip) return;
        tip.textContent = dot.getAttribute('data-tip');
        tip.style.display = 'block';
        tip.style.left = (parseFloat(dot.getAttribute('cx')) - 30) + 'px';
        tip.style.top = (parseFloat(dot.getAttribute('cy')) - 26) + 'px';
        dot.setAttribute('r', '6');
      });
      dot.addEventListener('mouseleave', function() {
        if (tip) tip.style.display = 'none';
        dot.setAttribute('r', '4');
      });
    });
  };

  // ── 4. OriginKit Interactive Effects & Plate Calculator ──────────────────
  mosUI.initSpotlights = function () {
    document.querySelectorAll('.originkit-spotlight').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
      });
    });
  };

  mosUI.openPlateCalculator = function (targetWeight) {
    var weight = Number(targetWeight);
    if (!weight || isNaN(weight) || weight < 20) {
      // Check if user has active working weight stored or default to 100 kg
      var storedWeight = 100;
      try {
        var lastEx = localStorage.getItem('mos_last_working_weight');
        if (lastEx) storedWeight = parseFloat(lastEx) || 100;
      } catch (e) {}
      weight = storedWeight;
    }

    var modalId = 'mos-plate-modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var sheet = document.createElement('div');
    sheet.id = modalId;
    sheet.className = 'mos-sheet-backdrop';

    function calculatePlatesForWeight(w) {
      var barWeight = 20;
      var sideWeight = Math.max(0, (w - barWeight) / 2);
      var availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
      var loaded = [];
      var counts = {};
      var rem = sideWeight;

      availablePlates.forEach(function (p) {
        counts[p] = 0;
        while (rem >= p) {
          loaded.push(p);
          counts[p]++;
          rem = Math.round((rem - p) * 100) / 100;
        }
      });

      var breakdownParts = [];
      availablePlates.forEach(function(p) {
        if (counts[p] > 0) breakdownParts.push(counts[p] + '× ' + p + 'kg');
      });

      return {
        targetWeight: w,
        sideWeight: sideWeight,
        loaded: loaded,
        counts: counts,
        totalPlatesSide: loaded.length,
        totalPlatesBar: loaded.length * 2,
        breakdownText: breakdownParts.length ? breakdownParts.join(' · ') : 'None (Empty Bar)'
      };
    }

    function renderDrawer(curWeight) {
      var data = calculatePlatesForWeight(curWeight);
      var platesHtml = data.loaded.map(function (p) {
        var cls = 'plate-' + String(p).replace('.', '_');
        return '<div class="mos-plate ' + cls + '">' + p + '</div>';
      }).join('');

      var lbsVal = Math.round(curWeight * 2.20462);

      sheet.innerHTML = [
        '<div class="mos-sheet-drawer" role="dialog" aria-label="Olympic Plate Math">',
        '  <!-- Header -->',
        '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">',
        '    <div>',
        '      <div style="font-family:Oswald,sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; color:#fff; display:flex; align-items:center; gap:8px;">',
        '        <span><svg class="mos-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 8h12" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="4" width="2.5" height="8" rx=".5" fill="currentColor"/><rect x="10.5" y="4" width="2.5" height="8" rx=".5" fill="currentColor"/></svg></span>',
        '        Olympic Plate Math',
        '      </div>',
        '      <div style="font-size:0.75rem; color:#94A3B8;">Standard 20 kg Barbell &middot; Load <strong>' + data.sideWeight.toFixed(2) + ' kg</strong> per side</div>',
        '    </div>',
        '    <button type="button" id="mos-plate-close" style="background:none; border:none; color:#94A3B8; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>',
        '  </div>',
        '',
        '  <!-- Barbell Visualization -->',
        '  <div class="mos-plate-barbell">',
        '    <div style="width:14px; height:48px; background:#475569; border-radius:3px; margin-right:4px; border:1px solid #64748B;" title="Barbell Collar"></div>',
        '    <div style="width:8px; height:24px; background:#334155; margin-right:4px;"></div>',
        data.loaded.length ? platesHtml : '<span style="color:#94A3B8; font-family:JetBrains Mono, monospace; font-size:0.85rem;">Empty Bar (20 kg / 45 lbs)</span>',
        '  </div>',
        '',
        '  <!-- Plate Count & Breakdown Badge -->',
        '  <div class="mos-plate-count-badge">',
        '    <div>',
        '      <div style="font-weight:700; font-family:JetBrains Mono, monospace; color:#FFFFFF;">',
        '        ' + data.totalPlatesBar + ' Plates Total <span style="color:#94A3B8; font-weight:400;">(' + data.totalPlatesSide + ' per side)</span>',
        '      </div>',
        '      <div style="font-size:0.7rem; color:#94A3B8; margin-top:2px;">',
        '        ' + data.breakdownText,
        '      </div>',
        '    </div>',
        '    <div style="text-align:right;">',
        '      <span style="font-family:JetBrains Mono, monospace; font-size:1.15rem; font-weight:700; color:#E2E8F0;">' + curWeight + ' kg</span>',
        '      <div style="font-size:0.68rem; color:#94A3B8;">~' + lbsVal + ' lbs</div>',
        '    </div>',
        '  </div>',
        '',
        '  <!-- Interactive Steppers & Controls -->',
        '  <div class="mos-plate-controls">',
        '    <div class="mos-plate-input-row">',
        '      <span style="font-family:Oswald,sans-serif; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:#94A3B8;">Direct Target:</span>',
        '      <div class="mos-plate-input-wrap">',
        '        <input type="number" id="mos-plate-num" class="mos-plate-input" value="' + curWeight + '" step="2.5" min="20" max="500">',
        '        <span style="font-family:JetBrains Mono, monospace; font-size:0.8rem; color:#94A3B8;">kg</span>',
        '      </div>',
        '    </div>',
        '',
        '    <div class="mos-plate-steppers">',
        '      <button type="button" class="mos-plate-step-btn" data-step="-20">&minus;20kg</button>',
        '      <button type="button" class="mos-plate-step-btn" data-step="-10">&minus;10kg</button>',
        '      <button type="button" class="mos-plate-step-btn" data-step="-2.5">&minus;2.5kg</button>',
        '      <button type="button" class="mos-plate-step-btn" data-step="2.5">+2.5kg</button>',
        '      <button type="button" class="mos-plate-step-btn" data-step="10">+10kg</button>',
        '      <button type="button" class="mos-plate-step-btn" data-step="20">+20kg</button>',
        '    </div>',
        '',
        '    <!-- Quick Presets -->',
        '    <div class="mos-plate-presets">',
        '      <button type="button" class="mos-plate-preset-chip" data-w="60">60 kg (135 lbs)</button>',
        '      <button type="button" class="mos-plate-preset-chip" data-w="100">100 kg (225 lbs)</button>',
        '      <button type="button" class="mos-plate-preset-chip" data-w="140">140 kg (315 lbs)</button>',
        '      <button type="button" class="mos-plate-preset-chip" data-w="180">180 kg (405 lbs)</button>',
        '      <button type="button" class="mos-plate-preset-chip" data-w="220">220 kg (495 lbs)</button>',
        '    </div>',
        '  </div>',
        '',
        '  <div style="display:flex; justify-content:flex-end; margin-top:16px;">',
        '    <button type="button" class="originkit-btn originkit-btn-primary" id="mos-plate-done" style="width:100%; justify-content:center; padding:10px;">Done &middot; Ready to Lift</button>',
        '  </div>',
        '</div>'
      ].join('');

      bindEvents(curWeight);
    }

    function bindEvents(curWeight) {
      var closeBtn = document.getElementById('mos-plate-close');
      var doneBtn = document.getElementById('mos-plate-done');
      var numInput = document.getElementById('mos-plate-num');

      function close() {
        if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
      }

      if (closeBtn) closeBtn.onclick = close;
      if (doneBtn) doneBtn.onclick = close;

      if (numInput) {
        numInput.onchange = function() {
          var val = Math.max(20, Math.round((parseFloat(numInput.value) || 20) * 2) / 2);
          if (navigator.vibrate) navigator.vibrate(15);
          renderDrawer(val);
        };
      }

      sheet.querySelectorAll('.mos-plate-step-btn').forEach(function(btn) {
        btn.onclick = function() {
          var delta = parseFloat(btn.getAttribute('data-step')) || 0;
          var next = Math.max(20, curWeight + delta);
          if (navigator.vibrate) navigator.vibrate(20);
          renderDrawer(next);
        };
      });

      sheet.querySelectorAll('.mos-plate-preset-chip').forEach(function(chip) {
        chip.onclick = function() {
          var target = parseFloat(chip.getAttribute('data-w')) || 100;
          if (navigator.vibrate) navigator.vibrate(25);
          renderDrawer(target);
        };
      });
    }

    document.body.appendChild(sheet);
    renderDrawer(weight);

    sheet.onclick = function (e) {
      if (e.target === sheet && sheet.parentNode) {
        sheet.parentNode.removeChild(sheet);
      }
    };
  };

  // ── 5. Toast Notifications (Sonner-style) ───────────────────────────────
  mosUI.toast = function (msg, type) {
    var container = document.getElementById('mos-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mos-toast-container';
      container.className = 'mos-toast-container';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'mos-toast';
    var icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = '<span style="color:#E2E8F0; font-weight:bold;">' + icon + '</span><span>' + msg + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 3200);
  };

  // ── 6. 10x Free Trial & VIP Coaching Upsell ──────────────────────────────
  mosUI.openCoachingUpsell = function (contextData) {
    contextData = contextData || {};
    var exercise = contextData.exercise || 'Training Protocol';
    var weight = contextData.weight || '--';
    var reps = contextData.reps || '--';

    var msg = 'Hi Coach Anas! I am using Muscle OS and would like a personalized 1-on-1 form audit & split calibration:%0A%0A' +
              '🏋️ *Exercise:* ' + exercise + '%0A' +
              '📊 *Working Weight:* ' + weight + ' kg x ' + reps + ' reps%0A' +
              '🎯 *Goal:* Elite Periodization & Direct Coaching%0A%0A' +
              'How can I upgrade to VIP 1-on-1 coaching?';

    window.open('https://wa.me/201040796017?text=' + msg, '_blank');
  };

  // Auto-init on load
  document.addEventListener('DOMContentLoaded', function () {
    mosUI.initSpotlights();
  });

  window.mosUI = mosUI;
})();
