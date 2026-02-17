/**
 * PenPot Auth System Override for Kizu
 *
 * This script monkey-patches PenPot's compiled JavaScript to bypass
 * the authentication system for private license users.
 *
 * CRITICAL: This runs BEFORE PenPot's app initializes and overrides
 * the auth checking logic at the source.
 */

console.log('🔧 [KIZU] Loading PenPot auth system override...');

/**
 * Override auth module login and profile checks
 * @param {object} authModule - PenPot auth module
 */
function overrideAuthModule(authModule) {
  const originalLogin = authModule.logged_in;
  if (originalLogin) {
    authModule.logged_in = function () {
      const token = localStorage.getItem('auth-token');
      if (token) {
        return true;
      }
      return originalLogin.apply(this, arguments);
    };
    console.log('✅ [KIZU] Overrode auth.logged_in');
  }

  const originalProfile = authModule.get_profile;
  if (originalProfile) {
    authModule.get_profile = function () {
      const token = localStorage.getItem('auth-token');
      const profile = localStorage.getItem('auth-profile');
      if (token && profile) {
        return JSON.parse(profile);
      }
      return originalProfile.apply(this, arguments);
    };
    console.log('✅ [KIZU] Overrode auth.get_profile');
  }
}

/**
 * Override profile atom deref to inject Kizu profile
 * @param {object} profileAtom - ClojureScript atom
 */
function overrideProfileAtom(profileAtom) {
  if (!profileAtom.deref || !profileAtom.reset) {
    return;
  }
  const originalDeref = profileAtom.deref;
  profileAtom.deref = function () {
    const token = localStorage.getItem('auth-token');
    const profile = localStorage.getItem('auth-profile');
    if (token && profile) {
      const current = originalDeref.call(this);
      if (!current) {
        return JSON.parse(profile);
      }
    }
    return originalDeref.call(this);
  };
  console.log('✅ [KIZU] Overrode profile atom deref');
}

// Wait for PenPot's app to be available
const waitForPenPot = setInterval(() => {
  if (!window.app || !window.app.main) {
    return;
  }

  clearInterval(waitForPenPot);
  console.log('✅ [KIZU] PenPot app detected, applying auth override...');

  try {
    if (window.app.main.data && window.app.main.data.auth) {
      overrideAuthModule(window.app.main.data.auth);
    }
    if (window.app.main.refs && window.app.main.refs.profile) {
      overrideProfileAtom(window.app.main.refs.profile);
    }
    console.log('✅ [KIZU] Auth system override complete');
  } catch (error) {
    console.error('❌ [KIZU] Failed to override auth system:', error);
  }
}, 100);

// Timeout after 30 seconds
setTimeout(() => {
  if (window.app) {
    return;
  }
  clearInterval(waitForPenPot);
  console.log('❌ [KIZU] Timeout waiting for PenPot app');
}, 30000);
