// Muscle OS — Enhanced Client-Side & Server-Verified Auth Service
(function(window) {
  'use strict';

  const TRIAL_DAYS = 7;
  const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const OWNER_EMAILS = ['anas@muscleos.coach', 'anass.momen@gmail.com', 'anasstem2025@gmail.com', '1022066.anas@stemegypt.edu.eg'];
  const API_BASE = (window.__MOS_CONFIG__ && window.__MOS_CONFIG__.API_BASE) || 'https://muscleos-access-control.muscleos.workers.dev/api';

  const AuthService = {
    API_BASE: API_BASE,

    // 1. Synchronous Quick Local Status Check
    getStatus: function(productKey) {
      productKey = productKey || 'omni_hub';
      var email = window.MOS_Storage ? window.MOS_Storage.getString('mos_user_email', '') : '';
      if (!email) {
        var gs = window.MOS_Storage ? window.MOS_Storage.get('mos_google_session', null) : null;
        if (gs && gs.email) email = gs.email;
      }
      if (email && OWNER_EMAILS.includes(email.toLowerCase())) {
        return { activeSub: true, trialActive: false, daysRemaining: 999, statusLabel: 'Owner Lifetime Access' };
      }

      var tokenKey = 'mos_sub_' + productKey;
      var subData = window.MOS_Storage ? window.MOS_Storage.get(tokenKey, null) : null;
      if (!subData) {
        var legacySub = window.MOS_Storage ? window.MOS_Storage.get('mos_subscription', null) : null;
        if (legacySub && legacySub.active && (legacySub.plan === 'master' || legacySub.code === 'OWNER' || legacySub.prodId === productKey || legacySub.prodId === 'all_access')) {
          subData = legacySub;
        }
      }

      // Valid subscription must have a token unless owner
      if (subData && subData.active && (subData.token || subData.code === 'OWNER')) {
        var exp = subData.expiry ? new Date(subData.expiry + (subData.expiry.includes('T') ? '' : 'T23:59:59')) : null;
        if (exp && exp.getTime() > Date.now()) {
          var days = Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          return { activeSub: true, trialActive: false, daysRemaining: days, statusLabel: 'PRO Active (' + days + 'd)' };
        }
      }

      var trialStartKey = 'mos_trial_start_' + productKey;
      var start = parseInt(window.MOS_Storage ? window.MOS_Storage.getString(trialStartKey, '0') : '0', 10);
      var now = Date.now();

      if (!start) {
        start = now;
        if (window.MOS_Storage) window.MOS_Storage.setString(trialStartKey, String(start));
      }

      var elapsed = now - start;
      if (elapsed < TRIAL_MS) {
        var daysLeft = Math.max(1, Math.ceil((TRIAL_MS - elapsed) / (24 * 60 * 60 * 1000)));
        return { activeSub: false, trialActive: true, daysRemaining: daysLeft, statusLabel: 'Trial (' + daysLeft + 'd left)' };
      }

      return { activeSub: false, trialActive: false, daysRemaining: 0, statusLabel: 'Trial Expired' };
    },

    // 2. Cryptographic Server-Side Token Verification
    verifySession: async function(productKey) {
      productKey = productKey || 'omni_hub';
      var status = this.getStatus(productKey);
      if (status.trialActive || (status.statusLabel && status.statusLabel.includes('Owner'))) {
        return { valid: true, status: status };
      }

      var tokenKey = 'mos_sub_' + productKey;
      var subData = window.MOS_Storage ? window.MOS_Storage.get(tokenKey, null) : null;
      if (!subData || !subData.token) {
        var legacy = window.MOS_Storage ? window.MOS_Storage.get('mos_subscription', null) : null;
        if (legacy && legacy.token) subData = legacy;
      }

      // No token and no trial -> unauthenticated
      if (!subData || !subData.token) {
        return { valid: false, status: status };
      }

      // Check online status and verify with Cloudflare Worker
      if (!navigator.onLine) {
        if (subData.active && subData.expiry) {
          var expTime = new Date(subData.expiry + (subData.expiry.includes('T') ? '' : 'T23:59:59')).getTime();
          // 48h offline grace past expiry or while active
          if (Date.now() - expTime < 48 * 60 * 60 * 1000) {
            return { valid: true, offlineGrace: true, status: status };
          }
        }
        return { valid: false, reason: 'offline_token_expired', status: status };
      }

      try {
        var res = await fetch(API_BASE + '/check-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: subData.token, productId: productKey })
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            if (window.MOS_Storage) {
              window.MOS_Storage.remove(tokenKey);
              window.MOS_Storage.remove('mos_subscription');
            }
          }
          return { valid: false, status: this.getStatus(productKey) };
        }
        var data = await res.json();
        if (data.valid) {
          return { valid: true, plan: data.plan, status: status };
        } else {
          if (window.MOS_Storage) {
            window.MOS_Storage.remove(tokenKey);
            window.MOS_Storage.remove('mos_subscription');
          }
          return { valid: false, error: data.error || 'token_invalid', status: this.getStatus(productKey) };
        }
      } catch (e) {
        // Network failure fallback
        if (!navigator.onLine && status.activeSub) {
          return { valid: true, offlineGrace: true, status: status };
        }
        return { valid: status.activeSub, status: status };
      }
    },

    // 3. Periodic Background Re-Validation (15-min interval & visibilitychange)
    startPeriodicCheck: function(productKey, onRevoked) {
      var self = this;
      async function runCheck() {
        var res = await self.verifySession(productKey);
        if (!res.valid) {
          if (typeof onRevoked === 'function') onRevoked();
        }
      }

      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          runCheck();
        }
      });

      return setInterval(runCheck, 15 * 60 * 1000);
    }
  };

  window.MOS_Auth = AuthService;
})(window);
