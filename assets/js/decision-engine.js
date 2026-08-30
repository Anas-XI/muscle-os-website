// Muscle OS — Declarative Decision Engine (Safe AST Matcher, Zero new Function / eval)
(function (window) {
  'use strict';

  // Pure AST Matcher Evaluator
  function evalMatcher(matcher, profile) {
    if (!matcher || matcher.op === 'always' || matcher === true) return true;
    if (matcher.all && Array.isArray(matcher.all)) {
      return matcher.all.every(function(m) { return evalMatcher(m, profile); });
    }
    if (matcher.any && Array.isArray(matcher.any)) {
      return matcher.any.some(function(m) { return evalMatcher(m, profile); });
    }

    var fieldVal = profile ? profile[matcher.field] : undefined;
    var expected = matcher.value;
    var op = matcher.op || 'eq';

    if (fieldVal === undefined || fieldVal === null) {
      if (matcher.field === 'goal' && profile && profile.goal) {
        fieldVal = profile.goal;
      } else if (matcher.field === 'bmi' && profile) {
        var h = Number(profile.height_cm) || 0;
        var w = Number(profile.bodyweight_kg) || 0;
        if (h > 0 && w > 0) fieldVal = w / Math.pow(h / 100, 2);
        else return false;
      } else {
        return false;
      }
    }

    if (typeof fieldVal === 'string') fieldVal = fieldVal.toLowerCase().trim();

    switch (op) {
      case 'eq':
        return typeof expected === 'string' ? fieldVal === expected.toLowerCase().trim() : fieldVal === expected;
      case 'neq':
        return typeof expected === 'string' ? fieldVal !== expected.toLowerCase().trim() : fieldVal !== expected;
      case 'in':
        if (!Array.isArray(expected)) return false;
        var lowerList = expected.map(function(x) { return typeof x === 'string' ? x.toLowerCase().trim() : x; });
        return lowerList.includes(fieldVal);
      case 'not_in':
        if (!Array.isArray(expected)) return true;
        var lowerListNotIn = expected.map(function(x) { return typeof x === 'string' ? x.toLowerCase().trim() : x; });
        return !lowerListNotIn.includes(fieldVal);
      case 'gt':
        return Number(fieldVal) > Number(expected);
      case 'gte':
        return Number(fieldVal) >= Number(expected);
      case 'lt':
        return Number(fieldVal) < Number(expected);
      case 'lte':
        return Number(fieldVal) <= Number(expected);
      default:
        return false;
    }
  }

  var DecisionEngine = {
    rules: [],

    init: async function(assetRoot) {
      try {
        var root = assetRoot || (window.MOS_ASSET_ROOT) || '../assets/data';
        var url = root.replace(/\/+$/, '') + '/decision_rules.json';
        var res = await fetch(url);
        if (!res.ok) {
          // Fallback to relative or absolute path
          res = await fetch('/assets/data/decision_rules.json');
        }
        if (res.ok) {
          this.rules = await res.json();
        }
      } catch (e) {
        console.warn('[DecisionEngine] Failed to load rules:', e);
      }
    },

    evaluateRules: function(profile) {
      var p = profile || {};
      var activeRules = [];
      for (var i = 0; i < this.rules.length; i++) {
        var rule = this.rules[i];
        if (evalMatcher(rule.matcher, p)) {
          activeRules.push(rule);
        }
      }
      return activeRules;
    },

    calculateVolumeAdjustment: function(pump, fatigue, soreness) {
      pump = Number(pump) || 3;
      fatigue = Number(fatigue) || 3;
      soreness = Number(soreness) || 3;

      if (fatigue >= 4 || soreness >= 4) {
        return { delta: -1, reason: 'High systemic fatigue / muscle soreness detected. Reducing volume by 1 set.' };
      }
      if (pump >= 4 && fatigue <= 2 && soreness <= 2) {
        return { delta: 1, reason: 'High recovery capacity & excellent stimulus-to-fatigue ratio. Adding 1 set.' };
      }
      return { delta: 0, reason: 'Volume at optimal adaptive baseline.' };
    }
  };

  window.DecisionEngine = DecisionEngine;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { DecisionEngine.init(); });
  } else {
    DecisionEngine.init();
  }
})(window);
