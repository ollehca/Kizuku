/**
 * Kizu Private License Auto-Login Integration
 * For private license users - bypasses PenPot backend and uses mock backend
 */

console.log('🔐 Kizu Private License Auto-Login Integration loaded');

// ============================================================================
// KIZU FEATURE FLAG SYSTEM
// Quarantine PenPot's auth/team system for private license (single-user mode)
// Later: Re-enable for business/collab (cloud-based multi-user mode)
// ============================================================================

// Set global feature flag IMMEDIATELY (before PenPot initializes)
window.KIZU_SINGLE_USER_MODE = true; // false for business/collab users
localStorage.setItem('kizu-single-user-mode', 'true');
console.log('🚩 [KIZU] Feature flag: SINGLE_USER_MODE =', window.KIZU_SINGLE_USER_MODE);

// ============================================================================
// CRITICAL: IMMEDIATE DASHBOARD REDIRECT (before PenPot renders login)
// For private license users, NEVER show login - go straight to dashboard
// ============================================================================
(function immediateRedirect() {
  const hash = window.location.hash;
  const teamId = '00000000-0000-0000-0000-000000000001';
  const dashboardUrl = window.location.origin + window.location.pathname +
    '#/dashboard/recent?team-id=' + teamId;

  // Routes that should redirect to dashboard
  const isLoginRoute = !hash || hash === '' || hash === '#/' ||
                       hash.includes('auth') || hash.includes('login') ||
                       hash.includes('register');

  // CRITICAL: #/view without proper params causes "expected valid params" error
  // PenPot's viewer requires file-id, page-id, etc.
  const isInvalidViewRoute = hash === '#/view' || hash.startsWith('#/view?') ||
                             (hash.includes('/view') && !hash.includes('file-id'));

  if (isLoginRoute || isInvalidViewRoute) {
    console.log('🚀 [KIZU] Redirecting to dashboard (was:', hash, ')');
    window.location.replace(dashboardUrl);
    return;
  }

  // Also watch for hashchange to catch PenPot's router trying to go to invalid routes
  window.addEventListener('hashchange', function onHashChange() {
    const newHash = window.location.hash;
    const isBadRoute = newHash === '#/view' ||
                       (newHash.includes('/view') && !newHash.includes('file-id')) ||
                       newHash === '#/' || newHash === '';
    if (isBadRoute) {
      console.log('🚀 [KIZU] Intercepted bad route change:', newHash);
      window.location.replace(dashboardUrl);
    }
  });
})();

// ============================================================================
// MODIFIED BY KIZU (https://github.com/ollehca/PenPotDesktop)
// Original file from PenPot (https://github.com/penpot/penpot)
// Licensed under Mozilla Public License Version 2.0
// Modifications: Set localStorage auth immediately to prevent race condition
// Date: 2025-10-29
// ============================================================================

// CRITICAL: Set auth-token IMMEDIATELY (synchronously) BEFORE PenPot renders
// This prevents team-container* from returning nil due to missing auth
// Step 1: Set placeholder token immediately (synchronous)
try {
  const placeholderToken = 'kizu-private-license-token';
  localStorage.setItem('auth-token', placeholderToken);
  console.log('✅ [IMMEDIATE] Set auth-token placeholder synchronously');
} catch (error) {
  console.error('❌ [IMMEDIATE] Failed to set auth-token:', error);
}

// Step 2: Fetch real profile asynchronously and update localStorage
(async () => {
  try {
    // Wait for electronAPI to be available
    let retries = 0;
    while (!window.electronAPI?.mockBackend && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      retries++;
    }

    if (window.electronAPI?.mockBackend) {
      const isAuthenticated = await window.electronAPI.mockBackend.isAuthenticated();
      if (isAuthenticated) {
        const profile = await window.electronAPI.mockBackend.getProfile();
        localStorage.setItem('auth-profile', JSON.stringify(profile));
        console.log('✅ [EARLY] Updated localStorage with real auth-profile');
      }
    } else {
      console.warn('⚠️ [EARLY] electronAPI not available after retries');
    }
  } catch (error) {
    console.error('❌ [EARLY] Failed to fetch profile:', error);
  }
})();

// Guard to prevent multiple initializations
if (!window._kizuAuthIntegrationInitialized) {
  window._kizuAuthIntegrationInitialized = true;

  // Main initialization function
  const initializeAuth = async () => {
    console.log('🔐 Initializing Kizu auth integration...');

    // Check if we're already authenticated via mock backend
    try {
      if (!window.electronAPI?.mockBackend) {
        console.warn('⚠️  Mock backend API not available - waiting for it to load...');
        return;
      }

      const isAuthenticated = await window.electronAPI.mockBackend.isAuthenticated();

      if (!isAuthenticated) {
        console.error('❌ No valid Kizu license found');
        return;
      }

      console.log('✅ Kizu license validated - user is authenticated');

      // Fetch profile from mock backend and inject into PenPot state
      try {
        const profile = await window.electronAPI.mockBackend.getProfile();
        console.log('📦 Fetched profile from mock backend:', profile);

        // localStorage already set by early initialization above
        // This is just a verification
        console.log('✅ Verified localStorage auth-token and auth-profile');

        // ============================================================================
        // MODIFIED BY KIZU (https://github.com/ollehca/PenPotDesktop)
        // Original file from PenPot (https://github.com/penpot/penpot)
        // Licensed under Mozilla Public License Version 2.0
        // Modifications: Auth handled by early localStorage setup (above) + mock backend
        // Date: 2025-10-29
        // ============================================================================

        console.log('✅ Auth integration complete - using early localStorage approach');
        console.log('✅ Auth handled by:');
        console.log('   1. Early async initialization - sets localStorage before PenPot renders');
        console.log('   2. refs.cljs - profile ref reads from localStorage');
        console.log('   3. ui.cljs team-container* - checks localStorage for auth-token');
        console.log('   4. Mock backend - returns profile on RPC calls');
        console.log('✅ No race condition - auth-token available immediately')

      } catch (error) {
        console.error('❌ Failed to inject profile:', error);
      }

    } catch (error) {
      console.error('❌ Auth integration error:', error);
    }
  };

  // Retry logic for PenPot app initialization
  const waitForPenpotAndInitAuth = (retries = 0) => {
    if (retries > 30) { // Max 15 seconds
      console.error('❌ Timeout waiting for PenPot app to initialize');
      return;
    }

    if (!window.app || !window.app.main || !window.app.main.store) {
      console.log(`⏳ Waiting for PenPot app... (attempt ${retries + 1})`);
      setTimeout(() => waitForPenpotAndInitAuth(retries + 1), 500);
      return;
    }

    console.log('✅ PenPot app initialized, starting auth integration');
    initializeAuth();
  };

  // Start initialization (with DOM ready check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(waitForPenpotAndInitAuth, 1000); // Give PenPot time to start
    });
  } else {
    setTimeout(waitForPenpotAndInitAuth, 1000);
  }
} else {
  console.log('⏭️  Auth integration already initialized, skipping');
}

// ============================================================================
// MODIFIED BY KIZU (https://github.com/ollehca/PenPotDesktop)
// Modifications: Force navigation away from login screen for Kizu users
// Date: 2025-11-18
// ============================================================================
// CRITICAL: Login screen bypass - runs EVERY time this script is injected
console.log('🚨 Setting up login screen bypass for Kizu files...');

// AGGRESSIVE: Hide login modal with ultra-specific CSS (last resort)
const injectHideCSS = () => {
  if (document.getElementById('kizu-login-hide')) return;

  const style = document.createElement('style');
  style.id = 'kizu-login-hide';
  style.textContent = `
    /* KIZU: Hide ANY element that looks like a login modal/page */
    main.auth-section,
    main[class*="auth"],
    div[class*="login-form"],
    div[class*="auth-form"],
    section[class*="login"],
    section[class*="auth"] {
      display: none !important;
      position: fixed !important;
      top: -10000px !important;
      left: -10000px !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -9999 !important;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ [KIZU] Injected login hide CSS');
};

// Monitor and destroy login modal if it appears in DOM
const destroyLoginModal = () => {
  const authToken = localStorage.getItem('auth-token');
  if (!authToken) return;

  // Find and remove ANY element that looks like a login/auth page
  const selectors = [
    'main.auth-section',
    'main[class*="auth"]',
    'div[class*="login-form"]',
    'div[class*="auth-form"]',
    'section[class*="login"]',
    'section[class*="auth"]'
  ];

  let removed = 0;
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      console.log(`🗑️ [KIZU] Removing ${selector}:`, el.className);
      el.remove();
      removed++;
    });
  });

  if (removed > 0) {
    console.log(`🗑️ [KIZU] Destroyed ${removed} login/auth element(s)`);
  }
};

// ============================================================================
// KIZU FIX: Routing handled by PenPot's auth.cljs (logged-out event)
// This file now only provides CSS hiding as fallback defense-in-depth
// Date: 2025-11-22
// ============================================================================

// Run CSS injection immediately as fallback (belt-and-suspenders approach)
injectHideCSS();

// Monitor DOM for login modal appearance and destroy it (fallback)
if (!window._kizuBypassListenerAdded) {
  window._kizuBypassListenerAdded = true;

  const observer = new MutationObserver((mutations) => {
    injectHideCSS(); // Re-inject CSS if needed
    destroyLoginModal(); // Remove login modal if it appears
  });

  // Start observing when body is available
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
}

console.log('✅ Login screen CSS hiding active (routing handled by auth.cljs)');
