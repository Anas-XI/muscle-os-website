(function() {
  const APP_VERSION = 'v4.0.2';
  
  // Auto force refresh if client version is older than v3.1.0
  try {
    const currentVer = localStorage.getItem('mos_app_ver');
    if (currentVer !== APP_VERSION) {
      localStorage.setItem('mos_app_ver', APP_VERSION);
      if (currentVer) {
        console.log(`[MOS UPDATE] Upgrading from ${currentVer} to ${APP_VERSION}. Triggering forceAppUpdate().`);
        setTimeout(function() {
          forceAppUpdate();
        }, 300);
      }
    }
  } catch(e) {}
  
  // Create & inject update notification UI styles
  const style = document.createElement('style');
  style.textContent = `
    .update-banner-overlay {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      width: 90%;
      max-width: 480px;
      background: #1E1E2A;
      border: 1.5px solid #F4C93B;
      border-radius: 14px;
      padding: 14px 18px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: slideUpIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Inter', sans-serif;
    }
    @keyframes slideUpIn {
      from { transform: translate(-50%, 100px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .update-banner-text {
      flex: 1;
    }
    .update-banner-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #F4C93B;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .update-banner-sub {
      font-size: 0.72rem;
      color: rgba(250,250,248,0.7);
      line-height: 1.3;
    }
    .update-btn-action {
      background: #F4C93B;
      color: #14151A;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.15s, background 0.15s;
    }
    .update-btn-action:hover {
      background: #e8a83a;
      transform: scale(1.03);
    }
    .update-btn-close {
      background: transparent;
      border: none;
      color: rgba(250,250,248,0.4);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 4px;
    }
    .update-btn-close:hover { color: #FAFAF8; }
  `;
  document.head.appendChild(style);

  function showUpdateBanner(msg) {
    if (document.getElementById('updateBannerOverlay')) return;
    
    const banner = document.createElement('div');
    banner.id = 'updateBannerOverlay';
    banner.className = 'update-banner-overlay';
    banner.innerHTML = `
      <div class="update-banner-text">
        <div class="update-banner-title">🔔 Update Available (${APP_VERSION})</div>
        <div class="update-banner-sub">${msg || 'New features & 1000+ Food DB available. Tap to apply.'}</div>
      </div>
      <button class="update-btn-action" id="applyUpdateBtn">Update Now</button>
      <button class="update-btn-close" id="dismissUpdateBtn">&times;</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('applyUpdateBtn').addEventListener('click', function() {
      forceAppUpdate();
    });
    document.getElementById('dismissUpdateBtn').addEventListener('click', function() {
      banner.remove();
    });

    // Also trigger browser push/local notification if permitted
    sendNotificationReminder(msg);
  }

  function forceAppUpdate() {
    if ('caches' in window) {
      caches.keys().then(function(names) {
        return Promise.all(names.map(function(name) {
          return caches.delete(name);
        }));
      }).then(function() {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
              registration.unregister();
            }
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      });
    } else {
      window.location.reload(true);
    }
  }

  function sendNotificationReminder(msg) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('MuscleOS Tools Update Available 🚀', {
          body: msg || 'New 1000+ Food DB & Welcome Back features available. Tap to reload.',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png'
        });
      } catch (e) {}
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  // Check version & register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').then(function(reg) {
        reg.onupdatefound = function() {
          const installingWorker = reg.installing;
          if (installingWorker == null) return;
          installingWorker.onstatechange = function() {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                showUpdateBanner('New updates available! Tap to refresh cache.');
              }
            }
          };
        };
      }).catch(function(err) {
        console.warn('ServiceWorker registration failed: ', err);
      });

      navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
          showUpdateBanner(event.data.message);
        }
      });
    });
  }

  // Periodic version ping check on window focus
  window.addEventListener('focus', function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }
  });

  window.forceAppUpdate = forceAppUpdate;
})();
