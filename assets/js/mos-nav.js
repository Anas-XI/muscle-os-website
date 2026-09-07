/**
 * ═══════════════════════════════════════════════════════════
 * MUSCLE OS // UNIFIED TACTICAL NAVIGATION COMPONENT
 * Self-initializing, zero-dependency, high-contrast dark UI.
 * Provides Command Tool Switcher, Mobile Bottom Dock, and Drawer.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var TOOL_CATALOG = [
    {
      category: 'Core Engines',
      items: [
        {
          id: 'training_tool',
          name: 'MOS-HYPERKINETIX',
          desc: 'Mesocycle generator, exercise library & autoregulated logs',
          icon: '🏋️',
          badge: 'FLAGSHIP',
          file: 'training_tool.html',
          context: 'TRAINING // HYPERKINETIX'
        },
        {
          id: 'tdee_adaptive_engine',
          name: 'Adaptive TDEE Engine',
          desc: 'Dynamic metabolic tracking, 14 protocols & macro calculator',
          icon: '🥗',
          badge: 'METABOLIC',
          file: 'tdee_adaptive_engine.html',
          context: 'NUTRITION // METABOLIX'
        },
        {
          id: 'muscle_os_app',
          name: 'Omni Hub App',
          desc: 'Unified athlete dashboard, PWA, heatmaps & synergy insights',
          icon: '📱',
          badge: 'ALL-IN-ONE',
          file: 'muscle_os_app.html',
          context: 'OMNI HUB // DASHBOARD'
        }
      ]
    },
    {
      category: 'Precision Calculators & Systems',
      items: [
        {
          id: 'rpe_load_calculator',
          name: 'RPE & Load Calculator',
          desc: 'RIR load progression, e1RM math & systemic deload tracker',
          icon: '🧮',
          badge: 'STRENGTH',
          file: 'rpe_load_calculator.html',
          context: 'STRENGTH // RPE LOAD'
        },
        {
          id: 'volume_set_calculator',
          name: 'Weekly Volume Calculator',
          desc: 'MEV, MAV & MRV hypertrophy set distribution curves',
          icon: '📊',
          badge: 'VOLUME',
          file: 'volume_set_calculator.html',
          context: 'VOLUME // SET MATRIX'
        },
        {
          id: 'tdee_macro_calculator',
          name: 'TDEE & Macro Calculator',
          desc: 'Fast metabolic baseline & macro targets with bio-factors',
          icon: '⚡',
          badge: 'CALCULATOR',
          file: 'tdee_macro_calculator.html',
          context: 'MACROS // TDEE CALC'
        },
        {
          id: 'split_selector_quiz',
          name: 'Training Split Quiz',
          desc: 'Find your optimal split by schedule, recovery & training age',
          icon: '🧩',
          badge: 'QUIZ',
          file: 'split_selector_quiz.html',
          context: 'PROGRAMMING // SPLIT'
        }
      ]
    }
  ];

  function resolvePaths() {
    var rawPath = window.location.pathname.replace(/\\/g, '/');
    var inTools = rawPath.indexOf('/tools/') !== -1 || (rawPath.indexOf('tools/') !== -1 && !rawPath.endsWith('/tools/'));
    var inBundle = rawPath.indexOf('bundle') !== -1;
    var toolsPrefix = inTools ? '' : (inBundle ? '../tools/' : 'tools/');
    var homePrefix = (inTools || inBundle) ? '../' : './';
    return {
      tools: toolsPrefix,
      home: homePrefix,
      currentFile: rawPath.substring(rawPath.lastIndexOf('/') + 1) || 'index.html'
    };
  }

  function detectCurrentTool(currentFile) {
    for (var c = 0; c < TOOL_CATALOG.length; c++) {
      var cat = TOOL_CATALOG[c];
      for (var i = 0; i < cat.items.length; i++) {
        if (cat.items[i].file === currentFile) {
          return cat.items[i];
        }
      }
    }
    return null;
  }

  function buildNavHTML(paths, currentTool) {
    var currentBadgeText = currentTool ? currentTool.context : 'SUITE // NAVIGATION';
    var isToolsIndex = paths.currentFile === 'index.html' || paths.currentFile === '';

    // Switcher items HTML
    var switcherHTML = '';
    for (var c = 0; c < TOOL_CATALOG.length; c++) {
      var cat = TOOL_CATALOG[c];
      switcherHTML += '<div class="mos-menu-sec-title">' + cat.category + '</div>';
      switcherHTML += '<div class="mos-menu-grid">';
      for (var i = 0; i < cat.items.length; i++) {
        var item = cat.items[i];
        var isCurr = currentTool && currentTool.id === item.id;
        var href = paths.tools + item.file;
        switcherHTML += '<a href="' + href + '" class="mos-menu-item' + (isCurr ? ' is-current' : '') + '">' +
          '<div class="mos-item-icon">' + item.icon + '</div>' +
          '<div class="mos-item-info">' +
            '<div class="mos-item-header">' +
              '<span class="mos-item-name">' + item.name + '</span>' +
              '<span class="mos-item-badge ' + (isCurr ? 'mos-badge-active' : (item.badge === 'FLAGSHIP' ? 'mos-badge-flagship' : '')) + '">' +
                (isCurr ? 'CURRENT' : item.badge) +
              '</span>' +
            '</div>' +
            '<div class="mos-item-desc">' + item.desc + '</div>' +
          '</div>' +
        '</a>';
      }
      switcherHTML += '</div>';
    }

    // Top Header HTML
    var headerHTML =
      '<div class="mos-nav-inner">' +
        '<div class="mos-nav-left">' +
          '<a href="' + paths.home + 'index.html" class="mos-brand">' +
            'ANAS MO\'MEN <span>COACHING</span>' +
          '</a>' +
          '<span class="mos-context-sep">/</span>' +
          '<span class="mos-context-badge">' + currentBadgeText + '</span>' +
          '<div class="mos-switcher-wrap">' +
            '<button class="mos-switcher-btn" id="mosSwitcherBtn" aria-expanded="false" aria-label="Quick Switch Tools">' +
              '<span class="mos-switcher-icon">⚡</span>' +
              '<span>Tools</span>' +
              '<span class="mos-switcher-arrow">▼</span>' +
            '</button>' +
            '<div class="mos-switcher-menu" id="mosSwitcherMenu" role="menu">' +
              switcherHTML +
              '<div class="mos-menu-footer">' +
                '<a href="' + paths.tools + 'index.html" class="mos-menu-hub-link">Explore All Tools Directory &rarr;</a>' +
                '<a href="' + paths.home + 'portal.html" class="mos-menu-hub-link" style="color:var(--mos-nav-muted);">Client Portal</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mos-nav-right">' +
          '<div class="mos-nav-links">' +
            '<a href="' + paths.home + 'index.html">Home</a>' +
            '<a href="' + paths.tools + 'index.html"' + (isToolsIndex ? ' class="active"' : '') + '>Tools</a>' +
            '<a href="' + paths.home + 'guides/">Guides</a>' +
            '<a href="' + paths.home + 'books/">Books</a>' +
            '<a href="' + paths.home + 'index.html#packages">Coaching</a>' +
            '<a href="' + paths.home + 'portal.html" style="color:var(--mos-nav-gold);">Portal</a>' +
          '</div>' +
          '<button class="mos-hamburger-btn" id="mosHamburgerBtn" aria-label="Open Navigation Menu">☰</button>' +
        '</div>' +
      '</div>';

    // Mobile Bottom Dock HTML
    var isTrain = currentTool && currentTool.id === 'training_tool';
    var isTdee = currentTool && currentTool.id === 'tdee_adaptive_engine';
    var isApp = currentTool && currentTool.id === 'muscle_os_app';
    var isRpe = currentTool && currentTool.id === 'rpe_load_calculator';

    var bottomDockHTML =
      '<nav class="mos-bottom-dock" id="mosBottomDock" aria-label="Mobile Navigation Dock">' +
        '<a href="' + paths.tools + 'muscle_os_app.html" class="mos-dock-item' + (isApp ? ' active' : '') + '">' +
          '<span class="mos-dock-icon">📱</span>' +
          '<span class="mos-dock-label">Hub</span>' +
        '</a>' +
        '<a href="' + paths.tools + 'training_tool.html" class="mos-dock-item' + (isTrain ? ' active' : '') + '">' +
          '<span class="mos-dock-icon">🏋️</span>' +
          '<span class="mos-dock-label">Training</span>' +
        '</a>' +
        '<a href="' + paths.tools + 'tdee_adaptive_engine.html" class="mos-dock-item' + (isTdee ? ' active' : '') + '">' +
          '<span class="mos-dock-icon">🥗</span>' +
          '<span class="mos-dock-label">TDEE</span>' +
        '</a>' +
        '<a href="' + paths.tools + 'rpe_load_calculator.html" class="mos-dock-item' + (isRpe ? ' active' : '') + '">' +
          '<span class="mos-dock-icon">🧮</span>' +
          '<span class="mos-dock-label">RPE</span>' +
        '</a>' +
        '<button class="mos-dock-item" id="mosDockMenuBtn" aria-label="More Navigation Options">' +
          '<span class="mos-dock-icon">🧭</span>' +
          '<span class="mos-dock-label">Menu</span>' +
        '</button>' +
      '</nav>';

    // Tactical Slide-Over Drawer HTML
    var drawerLinksHTML = '';
    for (var dc = 0; dc < TOOL_CATALOG.length; dc++) {
      var dcat = TOOL_CATALOG[dc];
      drawerLinksHTML += '<div class="mos-drawer-sec">' +
        '<div class="mos-drawer-sec-lbl">' + dcat.category + '</div>';
      for (var di = 0; di < dcat.items.length; di++) {
        var ditem = dcat.items[di];
        var dCurr = currentTool && currentTool.id === ditem.id;
        drawerLinksHTML += '<a href="' + paths.tools + ditem.file + '" class="mos-drawer-link' + (dCurr ? ' active' : '') + '">' +
          '<span class="mos-drawer-link-icon">' + ditem.icon + '</span>' +
          '<span>' + ditem.name + '</span>' +
        '</a>';
      }
      drawerLinksHTML += '</div>';
    }

    drawerLinksHTML += '<div class="mos-drawer-sec">' +
      '<div class="mos-drawer-sec-lbl">Resources &amp; Coaching</div>' +
      '<a href="' + paths.tools + 'index.html" class="mos-drawer-link' + (isToolsIndex ? ' active' : '') + '"><span class="mos-drawer-link-icon">⚡</span><span>Tools Directory</span></a>' +
      '<a href="' + paths.home + 'guides/" class="mos-drawer-link"><span class="mos-drawer-link-icon">📖</span><span>Guides &amp; Protocols</span></a>' +
      '<a href="' + paths.home + 'books/" class="mos-drawer-link"><span class="mos-drawer-link-icon">📚</span><span>Coaching Books</span></a>' +
      '<a href="' + paths.home + 'index.html#packages" class="mos-drawer-link"><span class="mos-drawer-link-icon">👑</span><span>1-on-1 Coaching</span></a>' +
      '<a href="' + paths.home + 'portal.html" class="mos-drawer-link" style="color:var(--mos-nav-gold);"><span class="mos-drawer-link-icon">👤</span><span>Client Portal</span></a>' +
      '<button class="mos-drawer-link" onclick="if(window.installPWA){window.installPWA();}else if(window.mosToast){window.mosToast(\'PWA ready in browser menu: Add to Home Screen\', \'info\');}" style="background:none; border:none; width:100%; text-align:left; cursor:pointer; font:inherit; color:var(--mos-nav-gold);"><span class="mos-drawer-link-icon">📲</span><span>Install App (PWA)</span></button>' +
    '</div>';

    var drawerHTML =
      '<div class="mos-drawer-scrim" id="mosDrawerScrim"></div>' +
      '<div class="mos-drawer" id="mosDrawer" role="dialog" aria-modal="true" aria-label="Navigation Drawer">' +
        '<div class="mos-drawer-header">' +
          '<span class="mos-drawer-title">MUSCLE OS // NAVIGATION</span>' +
          '<button class="mos-drawer-close" id="mosDrawerCloseBtn" aria-label="Close Drawer">✕</button>' +
        '</div>' +
        '<div class="mos-drawer-body">' +
          drawerLinksHTML +
        '</div>' +
      '</div>';

    return {
      headerHTML: headerHTML,
      bottomDockHTML: bottomDockHTML,
      drawerHTML: drawerHTML
    };
  }

  function initNav() {
    var paths = resolvePaths();
    var currentTool = detectCurrentTool(paths.currentFile);

    var isHubApp = document.querySelector('.hub-header');
    var navContainer = document.querySelector('.mos-nav');
    var rendered = buildNavHTML(paths, currentTool);

    if (!isHubApp) {
      if (!navContainer) {
        navContainer = document.createElement('nav');
        navContainer.className = 'mos-nav';
        document.body.insertBefore(navContainer, document.body.firstChild);
      }
      navContainer.innerHTML = rendered.headerHTML;

      if (!document.getElementById('mosBottomDock')) {
        var dockWrap = document.createElement('div');
        dockWrap.innerHTML = rendered.bottomDockHTML + rendered.drawerHTML;
        while (dockWrap.firstChild) {
          document.body.appendChild(dockWrap.firstChild);
        }
      }
      document.body.classList.add('has-mos-dock');
    } else {
      // Hub App PWA: Inject slide-over drawer so "All Tools" can be accessed smoothly
      if (!document.getElementById('mosDrawer')) {
        var drawerWrap = document.createElement('div');
        drawerWrap.innerHTML = rendered.drawerHTML;
        while (drawerWrap.firstChild) {
          document.body.appendChild(drawerWrap.firstChild);
        }
      }
    }

    // ── Interaction Wiring ──
    var switcherBtn = document.getElementById('mosSwitcherBtn');
    var switcherMenu = document.getElementById('mosSwitcherMenu');
    var hamburgerBtn = document.getElementById('mosHamburgerBtn');
    var dockMenuBtn = document.getElementById('mosDockMenuBtn');
    var drawer = document.getElementById('mosDrawer');
    var drawerScrim = document.getElementById('mosDrawerScrim');
    var drawerCloseBtn = document.getElementById('mosDrawerCloseBtn');

    function closeSwitcher() {
      if (switcherBtn) {
        switcherBtn.classList.remove('active');
        switcherBtn.setAttribute('aria-expanded', 'false');
      }
      if (switcherMenu) switcherMenu.classList.remove('open');
    }

    function toggleSwitcher(e) {
      if (e) e.stopPropagation();
      if (!switcherMenu) return;
      var isOpen = switcherMenu.classList.contains('open');
      if (isOpen) {
        closeSwitcher();
      } else {
        switcherMenu.classList.add('open');
        if (switcherBtn) {
          switcherBtn.classList.add('active');
          switcherBtn.setAttribute('aria-expanded', 'true');
        }
      }
    }

    function openDrawer() {
      closeSwitcher();
      if (drawer) drawer.classList.add('open');
      if (drawerScrim) drawerScrim.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      if (drawer) drawer.classList.remove('open');
      if (drawerScrim) drawerScrim.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Expose global methods for other controllers (e.g. Hub App)
    window.openMosDrawer = openDrawer;
    window.closeMosDrawer = closeDrawer;

    if (switcherBtn) {
      switcherBtn.addEventListener('click', toggleSwitcher);
    }

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    }

    if (dockMenuBtn) {
      dockMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    }

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeDrawer);
    }

    if (drawerScrim) {
      drawerScrim.addEventListener('click', closeDrawer);
    }

    // Dismiss on outside click
    document.addEventListener('click', function (e) {
      if (switcherMenu && !switcherMenu.contains(e.target) && (!switcherBtn || !switcherBtn.contains(e.target))) {
        closeSwitcher();
      }
    });

    // Dismiss on ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSwitcher();
        closeDrawer();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
