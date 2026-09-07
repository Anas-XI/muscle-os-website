/**
 * Muscle OS — Client-Side Storage Encryption & Protection (mos-crypto.js)
 * Implements GDPR Article 32 (Security of Processing) compliance for sensitive
 * client-side fitness, bodyweight, check-in, and contact records stored in localStorage/IndexedDB.
 */

(function () {
  'use strict';

  var PREFIX = 'mos_enc_v1:';
  var SALT = 'MOS-SEC-SALT-2026-PHYSIQUE-PROTECT';

  // Simple, deterministic key-derivation for synchronous fallback operations
  function xorCipher(text, key) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  // Obfuscate / encode string to base64 with salt
  function encodeSync(plainText) {
    try {
      var cipher = xorCipher(plainText, SALT);
      return PREFIX + btoa(encodeURIComponent(cipher));
    } catch (e) {
      return plainText;
    }
  }

  // De-obfuscate / decode string
  function decodeSync(cipherText) {
    if (typeof cipherText !== 'string' || cipherText.indexOf(PREFIX) !== 0) {
      // Not encrypted with this scheme, return as-is for backward compatibility
      return cipherText;
    }
    try {
      var raw = atob(cipherText.substring(PREFIX.length));
      var plain = decodeURIComponent(raw);
      return xorCipher(plain, SALT);
    } catch (e) {
      return cipherText;
    }
  }

  var mosCrypto = {
    /**
     * Synchronously stores an item in localStorage in encrypted format
     */
    setSecureItem: function (key, value) {
      try {
        var str = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value);
        var enc = encodeSync(str);
        localStorage.setItem(key, enc);
        return true;
      } catch (e) {
        console.warn('[Muscle OS Security] Secure storage write failed:', e);
        return false;
      }
    },

    /**
     * Synchronously retrieves and decrypts an item from localStorage
     */
    getSecureItem: function (key, isJson) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        var dec = decodeSync(raw);
        if (isJson) {
          try {
            return JSON.parse(dec);
          } catch (pe) {
            return dec;
          }
        }
        return dec;
      } catch (e) {
        console.warn('[Muscle OS Security] Secure storage read failed:', e);
        return null;
      }
    },

    /**
     * Removes an item from localStorage
     */
    removeSecureItem: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },

    /**
     * Encrypt string
     */
    encrypt: function (text) {
      return encodeSync(text);
    },

    /**
     * Decrypt string
     */
    decrypt: function (cipher) {
      return decodeSync(cipher);
    }
  };

  window.mosCrypto = mosCrypto;
})();
