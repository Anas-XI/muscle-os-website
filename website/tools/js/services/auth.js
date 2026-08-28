// Muscle OS — Universal Auth & Subscription Gate Service
(function(window) {
  'use strict';

  const TRIAL_DAYS = 7;
  const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const HUB_PRODUCT = 'omni_hub';

  function deriveProd(code, plan) {
    var p = (code || '').toUpperCase();
    if (plan === 'master') return 'all_access';
    if (p.indexOf('OH-') === 0) return 'omni_hub';
    if (p.indexOf('TR-') === 0) return 'training_tool';
    if (p.indexOf('MA-') === 0) return 'all_access';
    if (p.indexOf('TD-') === 0) return 'tdee_adaptive_engine';
    if (p.indexOf('TB-') === 0) return 'both_tools';
    return 'all_access';
  }

  const AuthService = {
    deriveProduct: deriveProd,

    getStatus: function(requiredProduct) {
      requiredProduct = requiredProduct || HUB_PRODUCT;
      var OWNER_EMAILS = ['ANASSTEM2025@GMAIL.COM', '1022066.ANAS@STEMEGYPT.EDU.EG', 'ANASSMOMEN@GMAIL.COM'];
      
      var gs = window.MOS_Storage ? window.MOS_Storage.get('mos_google_session', null) : null;
      var isOwner = gs && gs.email && OWNER_EMAILS.includes(gs.email.toUpperCase());

      var sub = window.MOS_Storage ? window.MOS_Storage.get('mos_subscription', null) : null;
      var subProd = sub ? (sub.prodId || deriveProd(sub.code, sub.plan)) : null;
      var prodOk = !!sub && (sub.plan === 'master' || sub.code === 'OWNER' || subProd === requiredProduct || subProd === 'all_access' || subProd === 'both_tools');
      var activeSub = isOwner || !!(sub && sub.active && prodOk && sub.expiry && new Date(sub.expiry + 'T23:59:59') > new Date());

      var trialStart = window.MOS_Storage ? window.MOS_Storage.getString('mos_trial_start', null) : null;
      if (!trialStart && !activeSub) {
        trialStart = new Date().toISOString();
        if (window.MOS_Storage) {
          window.MOS_Storage.setString('mos_trial_start', trialStart);
          window.MOS_Storage.setString('mos_tdee_trial_start', trialStart);
        }
      }
      var trialActive = !!(trialStart && (Date.now() - new Date(trialStart).getTime()) < TRIAL_MS);
      var daysLeft = trialActive ? Math.max(1, Math.ceil((new Date(trialStart).getTime() + TRIAL_MS - Date.now()) / 864e5)) : 0;

      return {
        isOwner: isOwner,
        activeSub: activeSub,
        trialActive: trialActive,
        daysLeft: daysLeft,
        statusLabel: activeSub ? (isOwner ? 'VIP OWNER' : 'PRO ACTIVE') : (trialActive ? `TRIAL · ${daysLeft}d` : 'LOCKED')
      };
    }
  };

  window.MOS_Auth = AuthService;
})(window);
