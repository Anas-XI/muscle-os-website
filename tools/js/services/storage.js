// Muscle OS — Safe Storage Service
(function(window) {
  'use strict';

  const StorageService = {
    get: function(key, defaultValue) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn('[StorageService] Read error for key:', key, e);
        return defaultValue;
      }
    },

    set: function(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('[StorageService] Write error for key:', key, e);
        return false;
      }
    },

    getString: function(key, defaultValue) {
      try {
        return localStorage.getItem(key) || defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },

    setString: function(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },

    remove: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  window.MOS_Storage = StorageService;
})(window);
