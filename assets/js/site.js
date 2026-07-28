/* ── Site-wide: page-load fade, scroll reveal, scroll nav, active link, mobile toggle ── */
(function () {
  'use strict';

  // ── Page-load fade ──
  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(function () {
      document.body.classList.add('loaded');
    });
  });

  // ── Scroll reveal: observe .reveal elements and add .visible when in view ──
  document.addEventListener('DOMContentLoaded', function () {
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right').forEach(function (el) {
        el.classList.add('visible');
      });
    }
  });

  // ── Scroll-aware sticky nav (hide on scroll down, show on scroll up) ──
  var nav = document.querySelector('header, .mos-nav');
  if (!nav) return;
  var lastScroll = 0;
  var ticking = false;

  function updateNav() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (y > 80) {
      nav.classList.add('scrolled');
      if (y > lastScroll && y > 120) {
        nav.classList.add('nav-hidden');
      } else {
        nav.classList.remove('nav-hidden');
      }
    } else {
      nav.classList.remove('scrolled', 'nav-hidden');
    }
    lastScroll = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  // ── Active nav link highlighting ──
  var path = window.location.pathname.replace(/\/$/, '');
  var links = nav.querySelectorAll('.nav-links a, .mos-nav-links a');
  links.forEach(function (a) {
    var href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (!href.startsWith('#')) {
      if (href.startsWith('http')) {
        if (path === new URL(href).pathname.replace(/\/$/, '')) {
          a.style.color = 'var(--yellow)';
        }
      } else {
        var resolved = (href.startsWith('/') ? href : (path.substring(0, path.lastIndexOf('/') + 1) + href)).replace(/\/$/, '');
        if (path === resolved || (resolved.endsWith('/index.html') && path === resolved.replace('/index.html', ''))) {
          a.style.color = 'var(--yellow)';
        }
      }
    }
  });

  // ── Mobile nav toggle ──
  var toggle = document.querySelector('.menu-toggle, .mos-menu-toggle');
  var panel = document.querySelector('.mobile-panel, .mos-mobile-panel');
  var overlay = document.querySelector('.menu-overlay, .mos-menu-overlay');

  if (toggle && panel) {
    function closeMenu() {
      toggle.classList.remove('active');
      panel.classList.remove('open');
      document.body.style.overflow = '';
      if (overlay) overlay.classList.remove('visible');
    }
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (overlay) overlay.classList.toggle('visible', isOpen);
    });
    if (overlay) overlay.addEventListener('click', closeMenu);
    // Close button inside panel
    panel.querySelectorAll('.mob-close').forEach(function (btn) {
      btn.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
    // Close on nav link click
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  // ── Touch-friendly submenu hover on mobile ──
  var hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (hasTouch) {
    document.querySelectorAll('.has-sub').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var sub = this.querySelector('.sub-menu');
        if (sub && sub.style.display !== 'block') { e.preventDefault(); sub.style.display = 'block'; }
      });
    });
  }
})();
