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
    // muscleGroups: [{ name: 'Chest', current: 14, mev: 10, mrv: 20 }, ...]
    var size = 260;
    var center = size / 2;
    var radius = size * 0.38;
    var groups = muscleGroups || [
      { name: 'Chest', val: 0.75 },
      { name: 'Back', val: 0.85 },
      { name: 'Quads', val: 0.65 },
      { name: 'Hamstrings', val: 0.6 },
      { name: 'Shoulders', val: 0.8 },
      { name: 'Arms', val: 0.9 }
    ];
    var total = groups.length;

    var gridLevels = [0.33, 0.66, 1.0];
    var gridPaths = gridLevels.map(function (level) {
      var pts = [];
      for (var i = 0; i < total; i++) {
        var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        var r = radius * level;
        pts.push((center + r * Math.cos(angle)) + ',' + (center + r * Math.sin(angle)));
      }
      return pts.join(' ');
    });

    var dataPts = [];
    var labels = [];
    for (var i = 0; i < total; i++) {
      var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
      var r = radius * Math.min(Math.max(groups[i].val || 0.5, 0.1), 1.15);
      var px = center + r * Math.cos(angle);
      var py = center + r * Math.sin(angle);
      dataPts.push(px + ',' + py);

      var lx = center + (radius + 22) * Math.cos(angle);
      var ly = center + (radius + 22) * Math.sin(angle);
      labels.push({ x: lx, y: ly, text: groups[i].name });
    }

    var svg = [
      '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="' + size + '">',
      '  <!-- Grid Rings -->',
      gridPaths.map(function (p) {
        return '<polygon points="' + p + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />';
      }).join(''),
      '  <!-- Axis Lines -->',
      groups.map(function (_, i) {
        var angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        var ex = center + radius * Math.cos(angle);
        var ey = center + radius * Math.sin(angle);
        return '<line x1="' + center + '" y1="' + center + '" x2="' + ex + '" y2="' + ey + '" stroke="rgba(255,255,255,0.08)" />';
      }).join(''),
      '  <!-- Volume Distribution Polygon -->',
      '  <polygon points="' + dataPts.join(' ') + '" fill="rgba(226,232,240,0.22)" stroke="#E2E8F0" stroke-width="2" stroke-linejoin="round" />',
      '  <!-- Data Points -->',
      dataPts.map(function (p) {
        var coords = p.split(',');
        return '<circle cx="' + coords[0] + '" cy="' + coords[1] + '" r="3" fill="#E2E8F0" />';
      }).join(''),
      '  <!-- Labels -->',
      labels.map(function (l) {
        return '<text x="' + l.x + '" y="' + l.y + '" fill="#FAFAF8" font-family="Oswald, sans-serif" font-size="10" font-weight="600" text-anchor="middle" dominant-baseline="central">' + l.text + '</text>';
      }).join(''),
      '</svg>'
    ].join('');

    container.innerHTML = svg;
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
    targetWeight = Number(targetWeight) || 100;
    var barWeight = 20;
    var sideWeight = Math.max(0, (targetWeight - barWeight) / 2);

    var availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    var loaded = [];
    var rem = sideWeight;

    availablePlates.forEach(function (p) {
      while (rem >= p) {
        loaded.push(p);
        rem = Math.round((rem - p) * 100) / 100;
      }
    });

    var modalId = 'mos-plate-modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var platesHtml = loaded.map(function (p) {
      var cls = 'plate-' + String(p).replace('.', '_');
      return '<div class="mos-plate ' + cls + '">' + p + '</div>';
    }).join('');

    var sheet = document.createElement('div');
    sheet.id = modalId;
    sheet.className = 'mos-sheet-backdrop';
    sheet.innerHTML = [
      '<div class="mos-sheet-drawer" role="dialog" aria-label="Olympic Plate Math">',
      '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">',
      '    <div style="font-family:Oswald,sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; color:#fff;">',
      '      Olympic Plate Math &middot; <span style="color:#E2E8F0;">' + targetWeight + ' kg</span>',
      '    </div>',
      '    <button type="button" id="mos-plate-close" style="background:transparent; border:none; color:#8A8D96; font-size:1.4rem; cursor:pointer;">&times;</button>',
      '  </div>',
      '  <p style="font-size:0.82rem; color:#8A8D96; margin:0 0 12px;">Standard 20 kg bar &middot; Load <strong>' + sideWeight.toFixed(2) + ' kg</strong> on each side:</p>',
      '  <div class="mos-plate-barbell">',
      '    <div style="width:12px; height:45px; background:#4A5568; border-radius:2px; margin-right:4px;" title="Barbell Collar"></div>',
      loaded.length ? platesHtml : '<span style="color:#8A8D96; font-size:0.85rem;">Empty Bar (20 kg)</span>',
      '  </div>',
      '  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">',
      '    <div style="font-family:JetBrains Mono, monospace; font-size:0.8rem; color:#FAFAF8;">',
      '      Exact Plates / Side: ' + (loaded.length ? loaded.join(', ') + ' kg' : 'None'),
      '    </div>',
      '    <button type="button" class="originkit-btn originkit-btn-primary" id="mos-plate-done">Got It</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(sheet);

    function close() {
      if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }
    document.getElementById('mos-plate-close').onclick = close;
    document.getElementById('mos-plate-done').onclick = close;
    sheet.onclick = function (e) {
      if (e.target === sheet) close();
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
