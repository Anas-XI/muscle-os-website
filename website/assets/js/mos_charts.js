/**
 * Muscle OS — MOS_Charts Engine v2.0
 * Zero-dependency, ultra-lightweight Canvas 2D & SVG visualization library.
 * Designed for strict CSP environments with Retina/HiDPI display support,
 * dark-mode palettes, and touch-interactive crosshairs.
 */
(function(window) {
  'use strict';

  var MOS_Charts = {};

  // Color Tokens
  var THEME = {
    bg: '#14151A',
    card: '#1E1E2A',
    cardBorder: 'rgba(244, 201, 59, 0.18)',
    text: '#FAFAF8',
    muted: 'rgba(250, 250, 248, 0.45)',
    accent: '#F4C93B',
    accentGrad: ['#F4C93B', '#E8A83A'],
    green: '#22c55e',
    blue: '#38bdf8',
    red: '#f43f5e',
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    fontDisplay: "'Oswald', sans-serif"
  };

  MOS_Charts.THEME = THEME;

  // Helper: Setup HiDPI Canvas
  function initCanvas(canvas, w, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, dpr: dpr, width: w, height: h };
  }

  // Helper: Ease Out Cubic Animation
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. APPLE HEALTH ACTIVITY RINGS
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createRings = function(container, options) {
    var opts = options || {};
    var size = opts.size || 180;
    var rings = opts.rings || [
      { label: 'Volume', value: 85, max: 100, color: '#F4C93B' },
      { label: 'Adherence', value: 92, max: 100, color: '#22c55e' },
      { label: 'Recovery', value: 78, max: 100, color: '#38bdf8' }
    ];

    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, size, size);
    var ctx = c.ctx;
    var center = size / 2;
    var ringWidth = opts.ringWidth || (size * 0.08);
    var ringGap = opts.ringGap || (size * 0.025);
    var startTime = performance.now();
    var duration = 900;

    function render(time) {
      var progress = Math.min((time - startTime) / duration, 1);
      var eased = easeOutCubic(progress);

      ctx.clearRect(0, 0, size, size);

      rings.forEach(function(r, idx) {
        var radius = center - (ringWidth / 2) - (idx * (ringWidth + ringGap)) - 6;
        var startAngle = -Math.PI / 2;
        var targetFraction = Math.min(Math.max((r.value || 0) / (r.max || 100), 0), 1.5);
        var endAngle = startAngle + (targetFraction * 2 * Math.PI * eased);

        // Background Track
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.trackColor || 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = ringWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Active Ring
        if (targetFraction > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, radius, startAngle, endAngle, false);
          ctx.strokeStyle = r.color;
          ctx.lineWidth = ringWidth;
          ctx.lineCap = 'round';
          ctx.shadowColor = r.color;
          ctx.shadowBlur = ringWidth * 0.6;
          ctx.stroke();
          ctx.restore();
        }
      });

      // Center Icon or Score
      if (opts.centerText !== false) {
        ctx.fillStyle = THEME.text;
        ctx.font = '600 ' + Math.round(size * 0.12) + 'px ' + THEME.fontMono;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var mainVal = Math.round((rings[0].value || 0) * eased);
        ctx.fillText(mainVal + '%', center, center - 2);

        ctx.fillStyle = THEME.muted;
        ctx.font = '500 ' + Math.max(Math.round(size * 0.06), 9) + 'px ' + THEME.fontSans;
        ctx.fillText(opts.centerLabel || 'OVERVIEW', center, center + (size * 0.11));
      }

      if (progress < 1) {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
    return { canvas: canvas };
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SAMSUNG HEALTH READINESS & ENERGY GAUGE
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createGauge = function(container, options) {
    var opts = options || {};
    var w = opts.width || 240;
    var h = opts.height || 160;
    var value = Math.min(Math.max(opts.value !== undefined ? opts.value : 82, 0), 100);
    var statusText = opts.status || (value >= 85 ? 'OPTIMAL' : (value >= 70 ? 'GOOD' : (value >= 50 ? 'MODERATE' : 'REST')));

    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, w, h);
    var ctx = c.ctx;
    var cx = w / 2;
    var cy = h * 0.78;
    var radius = Math.min(w * 0.42, h * 0.65);
    var arcWidth = opts.arcWidth || 14;
    var startAngle = Math.PI * 0.8;
    var endAngle = Math.PI * 2.2;
    var totalSpan = endAngle - startAngle;

    var startTime = performance.now();
    var duration = 950;

    function render(time) {
      var progress = Math.min((time - startTime) / duration, 1);
      var eased = easeOutCubic(progress);
      var curVal = Math.round(value * eased);

      ctx.clearRect(0, 0, w, h);

      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle, false);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = arcWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Colored Gradient Fill
      var activeEnd = startAngle + (totalSpan * (value / 100) * eased);
      if (value > 0) {
        var grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#22c55e');
        grad.addColorStop(1, '#F4C93B');

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, activeEnd, false);
        ctx.strokeStyle = grad;
        ctx.lineWidth = arcWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#F4C93B';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // Indicator Dot
        var dotX = cx + radius * Math.cos(activeEnd);
        var dotY = cy + radius * Math.sin(activeEnd);
        ctx.beginPath();
        ctx.arc(dotX, dotY, arcWidth * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fill();
      }

      // Readout
      ctx.fillStyle = THEME.text;
      ctx.font = '700 ' + Math.round(h * 0.28) + 'px ' + THEME.fontMono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(curVal, cx, cy - (h * 0.12));

      // Label & Status Chip
      ctx.fillStyle = value >= 70 ? THEME.accent : THEME.blue;
      ctx.font = '600 ' + Math.round(h * 0.1) + 'px ' + THEME.fontSans;
      ctx.fillText(statusText, cx, cy + (h * 0.1));

      ctx.fillStyle = THEME.muted;
      ctx.font = '500 ' + Math.round(h * 0.08) + 'px ' + THEME.fontSans;
      ctx.fillText(opts.title || 'READINESS SCORE', cx, cy + (h * 0.22));

      if (progress < 1) {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
    return { canvas: canvas };
  };

  // ─────────────────────────────────────────────────────────────
  // 3. SMOOTH BEZIER AREA / LINE CHART WITH INTERACTIVE CROSSHAIR
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createLineChart = function(container, options) {
    var opts = options || {};
    var data = opts.data || [];
    if (!data || data.length < 2) {
      container.innerHTML = '<div style="padding:28px 16px;text-align:center;color:' + THEME.muted + ';font-size:12px;font-family:' + THEME.fontSans + ';">' +
        (opts.emptyText || 'Log at least 2 entries to display trend') + '</div>';
      return null;
    }

    var w = container.clientWidth || opts.width || 400;
    var h = opts.height || 180;
    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, w, h);
    var ctx = c.ctx;
    var pad = { top: 20, bottom: 30, left: 45, right: 20 };
    var plotW = w - pad.left - pad.right;
    var plotH = h - pad.top - pad.bottom;

    var values = data.map(function(d) { return d.value !== undefined ? d.value : d; });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }
    var spread = (maxVal - minVal) * 1.15;
    var baseline = minVal - (spread * 0.05);

    function getPt(idx, val) {
      var x = pad.left + (idx * (plotW / (data.length - 1)));
      var y = pad.top + plotH - (((val - baseline) / spread) * plotH);
      return { x: x, y: y };
    }

    var pts = values.map(function(val, idx) { return getPt(idx, val); });

    // Cubic Bezier Path Helper
    function drawCurve(ctx, points) {
      ctx.moveTo(points[0].x, points[0].y);
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i === 0 ? 0 : i - 1];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[i + 2 < points.length ? i + 2 : i + 1];
        var cp1x = p1.x + (p2.x - p0.x) / 6;
        var cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6;
        var cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    var hoverIdx = -1;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (var g = 0; g <= 3; g++) {
        var gy = pad.top + (plotH * (g / 3));
        ctx.beginPath();
        ctx.moveTo(pad.left, gy);
        ctx.lineTo(w - pad.right, gy);
        ctx.stroke();

        var gVal = (maxVal - ((maxVal - minVal) * (g / 3))).toFixed(1);
        ctx.fillStyle = THEME.muted;
        ctx.font = '10px ' + THEME.fontMono;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(gVal, pad.left - 8, gy);
      }

      // Target Line
      if (opts.target !== undefined) {
        var tY = pad.top + plotH - (((opts.target - baseline) / spread) * plotH);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.moveTo(pad.left, tY);
        ctx.lineTo(w - pad.right, tY);
        ctx.stroke();
        ctx.restore();
      }

      // Gradient Area Fill
      ctx.save();
      ctx.beginPath();
      drawCurve(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, pad.top + plotH);
      ctx.lineTo(pts[0].x, pad.top + plotH);
      ctx.closePath();
      var areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      areaGrad.addColorStop(0, opts.fillColor || 'rgba(244, 201, 59, 0.25)');
      areaGrad.addColorStop(1, 'rgba(244, 201, 59, 0.0)');
      ctx.fillStyle = areaGrad;
      ctx.fill();
      ctx.restore();

      // Curve Line
      ctx.save();
      ctx.beginPath();
      drawCurve(ctx, pts);
      ctx.strokeStyle = opts.lineColor || THEME.accent;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();

      // Data Dots
      pts.forEach(function(p, i) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === hoverIdx ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === hoverIdx ? '#FFFFFF' : (opts.lineColor || THEME.accent);
        ctx.fill();
        ctx.strokeStyle = THEME.bg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Crosshair & Tooltip
      if (hoverIdx >= 0 && hoverIdx < pts.length) {
        var curP = pts[hoverIdx];
        var item = data[hoverIdx];
        var label = item.label || item.date || ('#' + (hoverIdx + 1));
        var valStr = (item.value !== undefined ? item.value : item) + (opts.unit ? ' ' + opts.unit : '');

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(curP.x, pad.top);
        ctx.lineTo(curP.x, pad.top + plotH);
        ctx.stroke();
        ctx.restore();

        // Tooltip Bubble
        var tipW = 100, tipH = 34;
        var tipX = Math.min(Math.max(curP.x - (tipW / 2), pad.left), w - pad.right - tipW);
        var tipY = Math.max(curP.y - tipH - 10, pad.top - 8);

        ctx.save();
        ctx.fillStyle = 'rgba(20, 21, 26, 0.92)';
        ctx.strokeStyle = THEME.cardBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(tipX, tipY, tipW, tipH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = THEME.text;
        ctx.font = '600 11px ' + THEME.fontMono;
        ctx.textAlign = 'center';
        ctx.fillText(valStr, tipX + (tipW / 2), tipY + 14);

        ctx.fillStyle = THEME.muted;
        ctx.font = '500 9px ' + THEME.fontSans;
        ctx.fillText(label, tipX + (tipW / 2), tipY + 27);
        ctx.restore();
      }
    }

    // Touch / Mouse Tracking
    function handlePointer(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
      var mouseX = clientX - rect.left;
      var closestDist = Infinity;
      var newIdx = -1;

      pts.forEach(function(p, i) {
        var dist = Math.abs(p.x - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          newIdx = i;
        }
      });

      if (newIdx !== hoverIdx) {
        hoverIdx = newIdx;
        draw();
      }
    }

    canvas.addEventListener('mousemove', handlePointer);
    canvas.addEventListener('touchmove', handlePointer, { passive: true });
    canvas.addEventListener('mouseleave', function() { hoverIdx = -1; draw(); });
    canvas.addEventListener('touchend', function() { hoverIdx = -1; draw(); });

    draw();
    return { canvas: canvas, refresh: draw };
  };

  // ─────────────────────────────────────────────────────────────
  // 4. MACRONUTRIENT DONUT CHART WITH CENTRAL SUMMARY
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createDonutChart = function(container, options) {
    var opts = options || {};
    var size = opts.size || 190;
    var segments = opts.segments || [
      { label: 'Protein', value: 180, color: '#F4C93B' },
      { label: 'Fats', value: 65, color: '#e8a83a' },
      { label: 'Carbs', value: 240, color: '#c48a30' }
    ];

    var total = segments.reduce(function(acc, s) { return acc + (s.value || 0); }, 0);
    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, size, size);
    var ctx = c.ctx;
    var cx = size / 2;
    var cy = size / 2;
    var outerR = size * 0.44;
    var innerR = size * 0.31;
    var donutW = outerR - innerR;

    var startTime = performance.now();
    var duration = 850;

    function render(time) {
      var progress = Math.min((time - startTime) / duration, 1);
      var eased = easeOutCubic(progress);

      ctx.clearRect(0, 0, size, size);

      var curAngle = -Math.PI / 2;
      segments.forEach(function(seg) {
        var sliceAngle = total > 0 ? ((seg.value / total) * Math.PI * 2 * eased) : 0;
        var endSlice = curAngle + sliceAngle;

        ctx.beginPath();
        ctx.arc(cx, cy, (outerR + innerR) / 2, curAngle, endSlice, false);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = donutW;
        ctx.stroke();

        curAngle = endSlice;
      });

      // Center Readout
      ctx.fillStyle = THEME.text;
      ctx.font = '700 ' + Math.round(size * 0.15) + 'px ' + THEME.fontMono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.centerVal || Math.round(total), cx, cy - 2);

      ctx.fillStyle = THEME.muted;
      ctx.font = '600 ' + Math.max(Math.round(size * 0.055), 9) + 'px ' + THEME.fontSans;
      ctx.fillText(opts.centerLabel || 'TOTAL GRAMS', cx, cy + (size * 0.11));

      if (progress < 1) {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
    return { canvas: canvas };
  };

  // ─────────────────────────────────────────────────────────────
  // 5. WORKOUT CONSISTENCY MICRO-HEATMAP (12-WEEK GRID)
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createHeatmap = function(container, options) {
    var opts = options || {};
    var weeks = opts.weeks || 12;
    var logs = opts.logs || []; // Array of dates 'YYYY-MM-DD' or objects { date, intensity }

    var logMap = {};
    logs.forEach(function(l) {
      var d = typeof l === 'string' ? l : l.date;
      var count = typeof l === 'object' && l.intensity !== undefined ? l.intensity : 1;
      logMap[d] = (logMap[d] || 0) + count;
    });

    var today = new Date();
    var cols = [];
    for (var w = weeks - 1; w >= 0; w--) {
      var colDays = [];
      for (var d = 0; d < 7; d++) {
        var dt = new Date();
        var offset = (w * 7) + (6 - d);
        dt.setDate(today.getDate() - offset);
        var iso = dt.toISOString().split('T')[0];
        colDays.push({ date: iso, level: logMap[iso] || 0 });
      }
      cols.push(colDays);
    }

    var cellSize = opts.cellSize || 11;
    var gap = opts.gap || 3;
    var totalW = (weeks * (cellSize + gap)) + 20;
    var totalH = (7 * (cellSize + gap)) + 18;

    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, totalW, totalH);
    var ctx = c.ctx;

    function draw() {
      ctx.clearRect(0, 0, totalW, totalH);

      cols.forEach(function(col, cIdx) {
        var x = 16 + (cIdx * (cellSize + gap));
        col.forEach(function(cell, rIdx) {
          var y = 8 + (rIdx * (cellSize + gap));
          var fill = 'rgba(255, 255, 255, 0.05)';
          if (cell.level >= 3) fill = '#F4C93B';
          else if (cell.level === 2) fill = 'rgba(244, 201, 59, 0.65)';
          else if (cell.level === 1) fill = 'rgba(244, 201, 59, 0.3)';

          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(x, y, cellSize, cellSize, 2) : ctx.rect(x, y, cellSize, cellSize);
          ctx.fillStyle = fill;
          ctx.fill();
        });
      });
    }

    draw();
    return { canvas: canvas };
  };

  // ─────────────────────────────────────────────────────────────
  // 6. WHOOP RECOVERY SCORE ARC (0–100%)
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createWhoopRecovery = function(container, options) {
    var opts = options || {};
    var size = opts.size || 220;
    var score = Math.max(0, Math.min(100, opts.score !== undefined ? opts.score : 85));
    var hrv = opts.hrv !== undefined ? opts.hrv : 68;
    var rhr = opts.rhr !== undefined ? opts.rhr : 54;

    var zone = { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.45)', label: 'GREEN RECOVERY', desc: 'Primed for High Strain' };
    if (score < 34) {
      zone = { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', label: 'RED RECOVERY', desc: 'Impaired · Active Rest' };
    } else if (score < 67) {
      zone = { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.45)', label: 'YELLOW RECOVERY', desc: 'Baseline · Moderate Strain' };
    }

    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, size, size);
    var ctx = c.ctx;
    var cx = size / 2;
    var cy = size * 0.48;
    var radius = size * 0.38;
    var strokeW = Math.max(size * 0.075, 10);

    var startAngle = Math.PI * 0.75;
    var totalSweep = Math.PI * 1.5;

    var startTime = performance.now();
    var duration = 900;

    function render(time) {
      var progress = Math.min((time - startTime) / duration, 1);
      var eased = easeOutCubic(progress);

      ctx.clearRect(0, 0, size, size);

      // 1. Background Arc Track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + totalSweep, false);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Active Recovery Arc with Neon Glow
      var currentSweep = totalSweep * (score / 100) * eased;
      if (currentSweep > 0.01) {
        ctx.save();
        ctx.shadowColor = zone.glow;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + currentSweep, false);
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // 3. Center Score %
      var displayScore = Math.round(score * eased);
      ctx.fillStyle = THEME.text;
      ctx.font = '700 ' + Math.round(size * 0.22) + 'px ' + THEME.fontMono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayScore + '%', cx, cy - (size * 0.03));

      // 4. Status Badge
      ctx.fillStyle = zone.color;
      ctx.font = '700 ' + Math.max(Math.round(size * 0.052), 10) + 'px ' + THEME.fontSans;
      ctx.fillText(zone.label, cx, cy + (size * 0.12));

      // 5. HRV & RHR Subtext
      ctx.fillStyle = THEME.muted;
      ctx.font = '500 ' + Math.max(Math.round(size * 0.046), 9) + 'px ' + THEME.fontMono;
      ctx.fillText('HRV ' + hrv + 'ms · RHR ' + rhr + 'bpm', cx, cy + (size * 0.22));

      // 6. Descriptive guidance
      ctx.fillStyle = 'rgba(250, 250, 248, 0.45)';
      ctx.font = '400 ' + Math.max(Math.round(size * 0.042), 9) + 'px ' + THEME.fontSans;
      ctx.fillText(zone.desc, cx, size * 0.92);

      if (progress < 1) {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
    return { canvas: canvas, zone: zone };
  };

  // ─────────────────────────────────────────────────────────────
  // 7. WHOOP STRAIN SCORE DIAL (0.0–21.0)
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createWhoopStrain = function(container, options) {
    var opts = options || {};
    var size = opts.size || 220;
    var strain = Math.max(0, Math.min(21.0, opts.strain !== undefined ? opts.strain : 14.5));
    var targetMin = opts.targetMin !== undefined ? opts.targetMin : 13.0;
    var targetMax = opts.targetMax !== undefined ? opts.targetMax : 16.5;

    var color = '#0284c7';
    var cat = 'LIGHT STRAIN';
    if (strain >= 18.0) { color = '#ef4444'; cat = 'ALL-OUT STRAIN'; }
    else if (strain >= 14.0) { color = '#f97316'; cat = 'STRENUOUS STRAIN'; }
    else if (strain >= 10.0) { color = '#8b5cf6'; cat = 'MODERATE STRAIN'; }

    var canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    var c = initCanvas(canvas, size, size);
    var ctx = c.ctx;
    var cx = size / 2;
    var cy = size * 0.48;
    var radius = size * 0.38;
    var strokeW = Math.max(size * 0.075, 10);

    var startAngle = Math.PI * 0.8;
    var totalSweep = Math.PI * 1.4;

    var startTime = performance.now();
    var duration = 900;

    function render(time) {
      var progress = Math.min((time - startTime) / duration, 1);
      var eased = easeOutCubic(progress);

      ctx.clearRect(0, 0, size, size);

      // 1. Background Arc Track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + totalSweep, false);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Target Corridor Zone on Track
      if (targetMin < targetMax) {
        var tStart = startAngle + (totalSweep * (targetMin / 21.0));
        var tEnd = startAngle + (totalSweep * (targetMax / 21.0));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, tStart, tEnd, false);
        ctx.strokeStyle = 'rgba(244, 201, 59, 0.35)';
        ctx.lineWidth = strokeW + 4;
        ctx.stroke();
      }

      // 3. Active Strain Fill Arc
      var currentSweep = totalSweep * (strain / 21.0) * eased;
      if (currentSweep > 0.01) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + currentSweep, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // 4. Central Strain Value
      var displayStrain = (strain * eased).toFixed(1);
      ctx.fillStyle = THEME.text;
      ctx.font = '700 ' + Math.round(size * 0.22) + 'px ' + THEME.fontMono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayStrain, cx, cy - (size * 0.04));

      ctx.fillStyle = THEME.muted;
      ctx.font = '600 ' + Math.max(Math.round(size * 0.05), 10) + 'px ' + THEME.fontMono;
      ctx.fillText('/ 21.0 STRAIN', cx, cy + (size * 0.10));

      // 5. Category Label
      ctx.fillStyle = color;
      ctx.font = '700 ' + Math.max(Math.round(size * 0.048), 9) + 'px ' + THEME.fontSans;
      ctx.fillText(cat, cx, cy + (size * 0.20));

      // 6. Target Corridor Footnote
      ctx.fillStyle = 'rgba(244, 201, 59, 0.85)';
      ctx.font = '500 ' + Math.max(Math.round(size * 0.044), 9) + 'px ' + THEME.fontSans;
      ctx.fillText('TARGET CORRIDOR: ' + targetMin.toFixed(1) + ' – ' + targetMax.toFixed(1), cx, size * 0.92);

      if (progress < 1) {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
    return { canvas: canvas };
  };

  // ─────────────────────────────────────────────────────────────
  // 8. WHOOP SLEEP PERFORMANCE & STAGES TIMELINE
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createSleepTimeline = function(container, options) {
    var opts = options || {};
    var actualH = opts.actualHours !== undefined ? opts.actualHours : 7.6;
    var needH = opts.needHours !== undefined ? opts.needHours : 8.0;
    var stages = opts.stages || {
      deep: 1.8, // Slow Wave Sleep
      rem: 1.9,
      light: 3.4,
      awake: 0.5
    };

    var perfPct = Math.min(100, Math.round((actualH / needH) * 100));
    var debtMin = Math.round((actualH - needH) * 60);

    var totalH = stages.deep + stages.rem + stages.light + stages.awake;
    var deepPct = totalH > 0 ? Math.round((stages.deep / totalH) * 100) : 25;
    var remPct = totalH > 0 ? Math.round((stages.rem / totalH) * 100) : 25;
    var lightPct = totalH > 0 ? Math.round((stages.light / totalH) * 100) : 40;
    var awakePct = Math.max(0, 100 - deepPct - remPct - lightPct);

    var html = '<div style="background:#1E1E2A;border-radius:14px;padding:16px;border:1px solid rgba(250,250,248,.08);">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">' +
        '<span style="font-size:0.75rem;font-weight:700;color:#38bdf8;letter-spacing:.6px;text-transform:uppercase;">Sleep Performance</span>' +
        '<span style="font-size:1.1rem;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:#FAFAF8;">' + perfPct + '%</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:0.72rem;color:rgba(250,250,248,.6);margin-bottom:12px;font-family:\'JetBrains Mono\',monospace;">' +
        '<span>Actual: <strong>' + actualH.toFixed(1) + 'h</strong> / Need: ' + needH.toFixed(1) + 'h</span>' +
        '<span style="color:' + (debtMin >= 0 ? '#22c55e' : '#f43f5e') + ';">' + (debtMin >= 0 ? '+' : '') + debtMin + 'm debt</span>' +
      '</div>' +
      '<!-- Stacked Stages Bar -->' +
      '<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,0.06);margin-bottom:10px;">' +
        '<div style="width:' + deepPct + '%;background:#38bdf8;" title="Deep (SWS): ' + stages.deep + 'h"></div>' +
        '<div style="width:' + remPct + '%;background:#a855f7;" title="REM: ' + stages.rem + 'h"></div>' +
        '<div style="width:' + lightPct + '%;background:#22c55e;" title="Light: ' + stages.light + 'h"></div>' +
        '<div style="width:' + awakePct + '%;background:#f43f5e;" title="Awake: ' + stages.awake + 'h"></div>' +
      '</div>' +
      '<!-- Legend -->' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.68rem;color:rgba(250,250,248,.65);">' +
        '<div><span style="color:#38bdf8;font-size:0.8rem;">■</span> Deep: ' + stages.deep + 'h (' + deepPct + '%)</div>' +
        '<div><span style="color:#a855f7;font-size:0.8rem;">■</span> REM: ' + stages.rem + 'h (' + remPct + '%)</div>' +
        '<div><span style="color:#22c55e;font-size:0.8rem;">■</span> Light: ' + stages.light + 'h (' + lightPct + '%)</div>' +
        '<div><span style="color:#f43f5e;font-size:0.8rem;">■</span> Awake: ' + stages.awake + 'h (' + awakePct + '%)</div>' +
      '</div>' +
    '</div>';

    container.innerHTML = html;
  };

  // ─────────────────────────────────────────────────────────────
  // 9. WHOOP BEHAVIORAL JOURNAL TAGS
  // ─────────────────────────────────────────────────────────────
  MOS_Charts.createJournalTags = function(container, options) {
    var opts = options || {};
    var tags = opts.tags || [
      { id: 'mag_zinc', label: 'Magnesium / Zinc', delta: 5, active: false },
      { id: 'sleep_8h', label: '8h+ Sleep', delta: 8, active: true },
      { id: 'hydration', label: 'Hydration Target', delta: 4, active: true },
      { id: 'sauna', label: 'Sauna / Cold', delta: 3, active: false },
      { id: 'late_meal', label: 'Late Meal (<2h)', delta: -4, active: false },
      { id: 'late_caffeine', label: 'Caffeine > 2pm', delta: -6, active: false },
      { id: 'high_stress', label: 'High Life Stress', delta: -7, active: false }
    ];

    container.innerHTML = '';
    var wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.gap = '8px';
    wrapper.style.margin = '10px 0';

    function renderTags() {
      wrapper.innerHTML = '';
      tags.forEach(function(t) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.padding = '6px 12px';
        btn.style.borderRadius = '20px';
        btn.style.fontSize = '0.72rem';
        btn.style.fontWeight = '600';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '4px';

        var sign = t.delta > 0 ? '+' : '';
        if (t.active) {
          btn.style.background = t.delta > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)';
          btn.style.border = '1px solid ' + (t.delta > 0 ? '#22c55e' : '#f43f5e');
          btn.style.color = t.delta > 0 ? '#4ade80' : '#fb7185';
        } else {
          btn.style.background = 'rgba(255, 255, 255, 0.04)';
          btn.style.border = '1px solid rgba(250, 250, 248, 0.1)';
          btn.style.color = 'rgba(250, 250, 248, 0.55)';
        }

        btn.innerHTML = (t.active ? '✓ ' : '+ ') + t.label + ' <span style="font-size:0.65rem;opacity:0.8;">(' + sign + t.delta + '%)</span>';

        btn.addEventListener('click', function() {
          t.active = !t.active;
          renderTags();
          if (typeof opts.onChange === 'function') {
            var netDelta = tags.filter(function(x) { return x.active; }).reduce(function(sum, x) { return sum + x.delta; }, 0);
            opts.onChange(tags, netDelta);
          }
        });

        wrapper.appendChild(btn);
      });
    }

    renderTags();
    container.appendChild(wrapper);
  };

  window.MOS_Charts = MOS_Charts;
})(window);
