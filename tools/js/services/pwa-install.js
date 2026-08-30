// Muscle OS — Universal PWA Install & Add-to-Home-Screen Service
(function(window) {
  'use strict';

  var deferredPrompt = null;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallButtons(true);
  });

  window.addEventListener('appinstalled', function() {
    deferredPrompt = null;
    updateInstallButtons(false);
    if (window.mosToast) {
      window.mosToast('🎉 Muscle OS installed to Home Screen! Launch anytime with 0 friction.', 'success');
    }
  });

  function updateInstallButtons(available) {
    document.querySelectorAll('.btn-pwa-install, #pwaInstallBtn, .install-app-btn').forEach(function(btn) {
      if (isStandalone) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'inline-flex';
        if (available) {
          btn.classList.add('pulse-ready');
        }
      }
    });
  }

  function showIOSInstallModal() {
    var ov = document.createElement('div');
    ov.className = 'mos-modal-overlay';
    ov.id = 'mosIOSInstallOverlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');

    var box = document.createElement('div');
    box.className = 'mos-modal-box';
    box.style.maxWidth = '440px';
    box.style.textAlign = 'center';

    box.innerHTML = `
      <div style="font-size:36px;margin-bottom:6px;">📲</div>
      <div class="mos-modal-title" style="font-size:1.3rem;">Install Muscle OS</div>
      <p class="mos-modal-desc">Add this app to your iPhone/iPad Home Screen for fast, full-screen offline access without Safari address bars.</p>
      
      <div style="display:flex;flex-direction:column;gap:12px;text-align:left;margin:16px 0;background:rgba(0,0,0,0.35);padding:14px;border-radius:12px;border:1px solid var(--line);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="background:var(--accent);color:#0A0B0E;font-weight:800;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">1</div>
          <div style="font-size:0.8rem;color:#fff;">Tap the <b>Share button</b> <span style="font-size:1.1rem;vertical-align:middle;">⎋</span> or <span style="font-size:1.1rem;vertical-align:middle;">📤</span> in Safari's bottom toolbar.</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="background:var(--accent);color:#0A0B0E;font-weight:800;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">2</div>
          <div style="font-size:0.8rem;color:#fff;">Scroll down and tap <b>'Add to Home Screen'</b> <span style="font-size:1.1rem;vertical-align:middle;">➕</span>.</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="background:var(--accent);color:#0A0B0E;font-weight:800;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">3</div>
          <div style="font-size:0.8rem;color:#fff;">Tap <b>'Add'</b> in the top-right corner. Done!</div>
        </div>
      </div>

      <div class="mos-modal-actions" style="justify-content:center;">
        <button class="btn btn-primary" id="closeIOSInstall" style="width:100%;">Got It &rarr;</button>
      </div>
    `;

    ov.appendChild(box);
    document.body.appendChild(ov);

    document.getElementById('closeIOSInstall').onclick = function() {
      ov.remove();
    };

    ov.onclick = function(e) {
      if (e.target === ov) ov.remove();
    };
  }

  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(choice) {
        if (choice.outcome === 'accepted') {
          if (window.mosToast) window.mosToast('🎉 Installing Muscle OS...', 'success');
        }
        deferredPrompt = null;
      });
    } else if (isIOS) {
      showIOSInstallModal();
    } else {
      if (window.mosToast) {
        window.mosToast('📲 Tap the install icon (⊕) in your browser address bar to install.', 'info');
      }
    }
  }

  window.MOS_PWA = {
    triggerInstall: triggerInstall,
    isStandalone: isStandalone,
    isIOS: isIOS
  };

  window.installPWA = triggerInstall;

  document.addEventListener('DOMContentLoaded', function() {
    updateInstallButtons(!!deferredPrompt || isIOS);
  });
})(window);
