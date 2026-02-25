/**
 * Frontend Integration Injection Utilities
 * Handles injection of authentication and branding scripts into the renderer process
 */

const path = require('path');
const fs = require('fs');

// Track injection state to prevent race conditions
const injectionState = {
  auth: false,
  branding: false,
};

/**
 * Inject authentication integration script into the renderer
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 */
function injectAuthIntegration(window) {
  if (injectionState.auth) {
    console.log('⏭️  Auth integration already injected, skipping');
    return;
  }

  const authIntegrationPath = path.join(
    __dirname,
    '../frontend-integration',
    'auth-integration.js'
  );

  try {
    const authScript = fs.readFileSync(authIntegrationPath, 'utf8');
    console.log('Auth script loaded, length:', authScript.length, 'characters');

    window.webContents
      .executeJavaScript(authScript)
      .then(() => {
        console.log('✅ Auth integration script executed successfully');
        injectionState.auth = true;
      })
      .catch((error) => {
        console.error('❌ Failed to execute auth integration script:', error);
        console.error('Error details:', error.message);
      });
  } catch (error) {
    console.error('❌ Failed to load auth integration script file:', error);
  }
}

/**
 * Inject Kizuku branding into the renderer
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 */
function injectKizukuBranding(window) {
  if (injectionState.branding) {
    console.log('⏭️  Kizuku branding already injected, skipping');
    return;
  }

  const brandingPath = path.join(__dirname, '../frontend-integration', 'kizuku-branding.js');
  const logoModulePath = path.join(__dirname, '../frontend-integration', 'kizuku-svg-logo.js');

  try {
    // Read the logo module as plain text (don't require() it to avoid Node.js processing)
    let logoModuleScript = fs.readFileSync(logoModulePath, 'utf8');

    // Remove the module.exports line since we're in browser context
    logoModuleScript = logoModuleScript.replace(/module\.exports\s*=\s*\{[^}]+\};?\s*$/, '');

    // Load the branding script
    const brandingScript = fs.readFileSync(brandingPath, 'utf8');
    console.log('Kizuku branding script loaded');

    // Inject the logo script first (which defines KIZUKU_LOGO_SVG), then the branding script
    const wrappedScript = `
      try {
        // Execute the logo building script (defines KIZUKU_LOGO_SVG)
        ${logoModuleScript}

        // Now execute the branding script (which uses KIZUKU_LOGO_SVG)
        ${brandingScript}
      } catch (error) {
        console.error('❌ Branding script error:', error);
        console.error('Stack:', error.stack);
      }
    `;

    window.webContents
      .executeJavaScript(wrappedScript)
      .then(() => {
        console.log('✅ Kizuku branding applied successfully');
        injectionState.branding = true;
      })
      .catch((error) => {
        console.error('Failed to execute branding script:', error);
      });
  } catch (error) {
    console.error('Failed to load branding script:', error);
  }
}

/**
 * Reset injection state (useful for testing)
 */
function resetInjectionState() {
  injectionState.auth = false;
  injectionState.branding = false;
}

/**
 * Get current injection state
 * @returns {Object} Current state of injections
 */
function getInjectionState() {
  return { ...injectionState };
}

module.exports = {
  injectAuthIntegration,
  injectKizukuBranding,
  resetInjectionState,
  getInjectionState,
};
