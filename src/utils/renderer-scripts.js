/**
 * Renderer Injection Scripts
 * Template strings injected into the renderer for auth/redirect/CSS.
 * Extracted from main.js handleServerSuccess for readability.
 */

const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Script to redirect login routes to dashboard
 * @returns {string} JavaScript source
 */
function getDashboardRedirectScript() {
  return `
    (function() {
      var hash = window.location.hash;
      var teamId = '${KIZU_TEAM_ID}';
      var dashboardUrl = window.location.origin + window.location.pathname +
        '#/dashboard/recent?team-id=' + teamId;
      var isLogin = !hash || hash === '' || hash === '#/' ||
                    hash.includes('auth') || hash.includes('login');
      var isBadView = hash === '#/view' ||
                      (hash.includes('/view') && !hash.includes('file-id'));
      if (isLogin || isBadView) {
        console.log('🚀 [KIZU-MAIN] Redirecting to dashboard');
        window.location.replace(dashboardUrl);
      }
    })();
  `;
}

/**
 * Script to hide login modal with CSS
 * @returns {string} JavaScript source
 */
function getLoginHideCSSScript() {
  return `
    (function() {
      var style = document.createElement('style');
      style.id = 'kizu-login-hide-preload';
      style.textContent =
        'main.auth-section,' +
        'main[class*="auth"],' +
        'div[class*="login-form"],' +
        'div[class*="auth-form"],' +
        'section[class*="login"],' +
        'section[class*="auth"]' +
        '{display:none!important;position:fixed!important;' +
        'top:-10000px!important;left:-10000px!important;' +
        'visibility:hidden!important;opacity:0!important;' +
        'pointer-events:none!important;z-index:-9999!important;}';
      if (document.head) {
        document.head.appendChild(style);
      } else {
        var wait = setInterval(function() {
          if (document.head) {
            clearInterval(wait);
            document.head.appendChild(style);
          }
        }, 10);
      }
    })();
  `;
}

/**
 * Script to set Kizu feature flags
 * @returns {string} JavaScript source
 */
function getFeatureFlagScript() {
  return `
    window.KIZU_SINGLE_USER_MODE = true;
    localStorage.setItem('kizu-single-user-mode', 'true');
    console.log('✅ [KIZU] Feature flag set: SINGLE_USER_MODE = true');
  `;
}

/**
 * Script to permanently destroy login modal and redirect
 * @returns {string} JavaScript source
 */
function getLoginDestroyerScript() {
  return `
    (function() {
      var destroyLogin = function() {
        var token = localStorage.getItem('auth-token');
        if (!token) return;
        var sections = document.querySelectorAll('main.auth-section');
        if (sections.length > 0) {
          sections.forEach(function(s) { s.remove(); });
        }
      };
      var checkRoute = function() {
        var token = localStorage.getItem('auth-token');
        var hash = window.location.hash;
        if (token && (hash.includes('#/auth/login') || hash === '' || hash === '#/')) {
          var teamId = '${KIZU_TEAM_ID}';
          var url = window.location.origin + window.location.pathname +
            '#/dashboard/recent?team-id=' + teamId;
          window.location.replace(url);
        }
      };
      setInterval(destroyLogin, 50);
      setInterval(checkRoute, 100);
      destroyLogin();
      checkRoute();
    })();
  `;
}

module.exports = {
  getDashboardRedirectScript,
  getLoginHideCSSScript,
  getFeatureFlagScript,
  getLoginDestroyerScript,
};
