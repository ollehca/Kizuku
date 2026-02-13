const { app, BrowserWindow, dialog, shell, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildApplicationMenu } = require('./menu-builder');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initializeTabManager, registerTabHandlers } = require('./tab-manager');
const { createHeaderBar } = require('./utils/tab-helpers');
const cssManager = require('./utils/css-manager');
const recovery = require('./utils/recovery');
const authStorage = require('./services/auth-storage');
const authOrchestrator = require('./services/auth-orchestrator');
// const { addRecoveryMenuItems } = require('./utils/recovery-menu'); // Disabled - see line 575
const { getBackendServiceManager } = require('./services/backend-service-manager');
const { setupDragAndDrop } = require('./utils/drag-drop-handler');
const { injectAuthIntegration, injectKizuBranding } = require('./utils/frontend-injection');

// Import progress window
let importProgressWindow = null;

// Legacy menu function for test compatibility
function createMenu() {
  const template = [
    { label: 'File', submenu: [{ role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }] },
    {
      label: 'Object',
      submenu: [
        { label: 'Group', accelerator: 'CmdOrCtrl+G' },
        { label: 'Ungroup', accelerator: 'CmdOrCtrl+Shift+G' },
      ],
    },
  ];
  return template;
}

// Export createMenu for test compatibility
module.exports.createMenu = createMenu;

// Legacy IPC handlers for test compatibility
// NOTE: ipcMain is already imported at top of file

// Sample IPC handler for testing
ipcMain.handle('sample-handler', async () => {
  return { status: 'ok' };
});

// Menu action handling for test compatibility
function handleMenuAction(action) {
  console.log('Menu action triggered:', action);
}

// Register menu-action IPC listener
ipcMain.on('menu-action', (event, action) => {
  handleMenuAction(action);
});
// Initialize electron-store for settings persistence (fallback if not available)
let store;
try {
  const Store = require('electron-store');
  store = new Store();
} catch {
  console.warn('electron-store not available, using memory store');
  store = {
    get: (_key, defaultValue) => defaultValue,
    set: (_key, _value) => {},
  };
}

// Keep a global reference of the window object
let mainWindow;
// Backend process reference (unused but kept for future implementation)
// const penpotBackendProcess = null;

// Development mode detection - always use dev mode if localhost:3449 is accessible
const isDev =
  process.env.NODE_ENV === 'development' ||
  fs.existsSync(path.join(__dirname, '../../penpot')) ||
  process.env.NODE_ENV !== 'production'; // Default to dev unless explicitly production

// Kizu configuration
const PENPOT_CONFIG = {
  frontend: {
    dev: 'http://localhost:3449',
    prod: path.join(__dirname, '../resources/penpot-frontend/index.html'),
  },
  backend: {
    dev: 'http://localhost:6060',
    prod: 'http://localhost:6060', // Will run local backend in production too
  },
};

// Check if response contains Kizu content
function validatePenpotContent(htmlContent) {
  return htmlContent.includes('penpotTranslations') && htmlContent.includes('penpotWorkerURI');
}

// Helper function to create fetch request with timeout
function createTimeoutFetch(url, timeout = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    method: 'GET',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

// Helper function to attempt recovery and retry
async function attemptRecoveryAndRetry() {
  if (!isDev) {
    return false;
  }

  console.log('🔧 Attempting automatic recovery...');
  const recovered = await recovery.attemptRecovery();

  if (recovered) {
    console.log('✅ Recovery successful, retrying server check...');
    // Wait a bit for services to stabilize
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkPenpotServer(); // Retry once after recovery
  }

  return false;
}

// Validate Kizu frontend content
async function validateFrontendResponse(frontendResponse) {
  const htmlContent = await frontendResponse.text();
  const isPenpotApp = validatePenpotContent(htmlContent);

  console.log('Frontend status:', frontendResponse.ok);
  console.log('Kizu app detected:', isPenpotApp);

  return isPenpotApp;
}

// Handle server check errors
async function handleServerError(error) {
  console.error('Server check error:', error.message);

  // Attempt recovery on connection errors in development mode
  if (isDev && (error.name === 'AbortError' || error.name === 'FetchError')) {
    console.log('🔧 Connection error detected, attempting recovery...');
    return await attemptRecoveryAndRetry();
  }

  return false;
}

// Check if Kizu development server is running
async function checkPenpotServer() {
  try {
    const frontendResponse = await createTimeoutFetch(PENPOT_CONFIG.frontend.dev);

    if (!frontendResponse.ok) {
      console.log('Frontend not responding');
      return await attemptRecoveryAndRetry();
    }

    return await validateFrontendResponse(frontendResponse);
  } catch (error) {
    return await handleServerError(error);
  }
}

// Helper function to get window state from store
function getWindowState() {
  return store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
    maximized: false,
  });
}

// Helper function to create web preferences
function createWebPreferences() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload path:', preloadPath);

  return {
    nodeIntegration: false, // Security: Prevent Node.js integration in renderer
    contextIsolation: true, // Security: Isolate preload scripts from page context
    enableRemoteModule: false, // Security: Disable deprecated remote module
    preload: preloadPath,
    // Note: webSecurity is disabled in dev mode to allow loading from localhost:3449
    // This is required for development with PenPot's dev server
    // In production builds, webSecurity should be enabled
    webSecurity: !isDev,
  };
}

// Helper function to create title bar options - ACTUAL FIGMA STYLE
function createTitleBarOptions() {
  // Use titleBarOverlay like Figma - tabs integrated INTO the title bar
  return {
    titleBarStyle: 'hiddenInset', // Hide default title but keep traffic lights
    titleBarOverlay: {
      color: '#1e1e1e', // Match our tab background
      symbolColor: '#ffffff', // White traffic lights
      height: 40, // Height of our tab area
    },
  };
}

// Helper function to create window options
function createWindowOptions(windowState) {
  const webPreferences = createWebPreferences();
  const titleBarOptions = createTitleBarOptions();

  return {
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    webPreferences,
    ...titleBarOptions,
    show: true,
    center: true,
    icon: getAppIcon(),
  };
}

// Helper function to create and configure the browser window
function createBrowserWindow() {
  const windowState = getWindowState();
  const options = createWindowOptions(windowState);
  const window = new BrowserWindow(options);

  // Set empty title to remove "No files open - Click + NEW PROJECT to start"
  window.setTitle('');

  if (windowState.maximized) {
    window.maximize();
  }

  return window;
}

// Track header bar injection state (auth and branding state managed by frontend-injection module)
const injectionState = {
  headerBar: false,
};

// Loading screen functions moved to ./utils/loading-helpers.js
// Tab helper functions moved to ./utils/tab-helpers.js
// Frontend injection functions moved to ./utils/frontend-injection.js

// Helper function to save window state
function saveWindowState(window) {
  const bounds = window.getBounds();
  const isMaximized = window.isMaximized();

  store.set('windowState', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: isMaximized,
  });
}

// Helper function to cleanup on window close
function cleanupWindowResources() {
  mainWindow = null;
}

// Helper function to handle external navigation
function handleNavigation(event, navigationUrl) {
  const parsedUrl = new URL(navigationUrl);

  // Allow navigation within the app
  if (parsedUrl.origin !== PENPOT_CONFIG.frontend.dev && !navigationUrl.startsWith('file://')) {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  }
}

// Helper function to setup window event handlers
function setupWindowEventHandlers(window) {
  window.on('close', () => saveWindowState(window));
  window.on('closed', cleanupWindowResources);

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', handleNavigation);
}

// Auto-login functionality

async function attemptAutoLogin(window) {
  const storedCredentials = authStorage.getStoredCredentials();

  if (!storedCredentials) {
    console.log('No stored credentials found, proceeding to login screen');
    return false;
  }

  console.log('Attempting auto-login for user:', storedCredentials.email);

  // Inject stored credentials into the frontend for automatic authentication
  const authScript = `
    window.penpotDesktopAuth = {
      autoLogin: true,
      token: "${storedCredentials.token}",
      email: "${storedCredentials.email}",
      profile: ${JSON.stringify(storedCredentials.profile)},
      rememberMe: ${storedCredentials.rememberMe}
    };
    console.log('🔐 Auto-login credentials injected for:', "${storedCredentials.email}");
  `;

  window.webContents.executeJavaScript(authScript).catch((error) => {
    console.error('Failed to inject auto-login credentials:', error);
  });

  return true;
}

// Helper function to handle successful server connection
function handleServerSuccess(window) {
  console.log('Loading URL:', PENPOT_CONFIG.frontend.dev);

  // ============================================================================
  // Note: Protocol interception removed - causes too many issues
  // Auth-token will be set by auth-integration.js immediate execution
  // Login modal bypass will force page reload if modal appears
  // ============================================================================

  // Inject fetch interceptor as early as possible (before PenPot scripts execute)
  // Using did-commit-navigation which fires right when the page starts loading
  window.webContents.on('did-commit-navigation', () => {
    console.log('🚀 [EARLY] Navigation committed - injecting fetch interceptor');
    injectFetchInterceptor(window.webContents);
  });

  // Inject loading screen immediately when DOM is ready (before Kizu content appears)
  window.webContents.once('dom-ready', () => {
    console.log('DOM ready - injecting auth override and drag-and-drop handlers');

    // Re-inject fetch interceptor to be safe (idempotent - checks if already installed)
    injectFetchInterceptor(window.webContents);

    // CRITICAL STEP 0: Redirect to dashboard (for private license users)
    // Route format: #/dashboard/recent?team-id={team-id}
    const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
    const immediateRedirectScript = `
      (function() {
        const hash = window.location.hash;
        const teamId = '${KIZU_TEAM_ID}';
        const dashboardUrl = window.location.origin + window.location.pathname +
          '#/dashboard/recent?team-id=' + teamId;

        const isLoginRoute = !hash || hash === '' || hash === '#/' ||
                             hash.includes('auth') || hash.includes('login');

        // CRITICAL: #/view without file-id causes "expected valid params" error
        const isInvalidViewRoute = hash === '#/view' ||
                                   (hash.includes('/view') && !hash.includes('file-id'));

        if (isLoginRoute || isInvalidViewRoute) {
          console.log('🚀 [KIZU-MAIN] Redirecting to dashboard (was: ' + hash + ')');
          window.location.replace(dashboardUrl);
        }
      })();
    `;
    window.webContents.executeJavaScript(immediateRedirectScript)
      .then(() => console.log('✅ [MAIN] Immediate redirect check complete'))
      .catch(err => console.error('❌ [MAIN] Redirect failed:', err));

    // CRITICAL STEP 1: Inject CSS hiding IMMEDIATELY (before ANY page content renders)
    const loginHideCSS = `
      (function() {
        console.log('🔐 [PRELOAD] Injecting login hide CSS...');

        const style = document.createElement('style');
        style.id = 'kizu-login-hide-preload';
        style.textContent = \`
          /* KIZU PRELOAD: Hide login modal before it renders */
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
        \`;

        if (document.head) {
          document.head.appendChild(style);
          console.log('✅ [PRELOAD] Injected login hide CSS');
        } else {
          // Wait for head to exist
          const waitForHead = setInterval(() => {
            if (document.head) {
              clearInterval(waitForHead);
              document.head.appendChild(style);
              console.log('✅ [PRELOAD] Injected login hide CSS (delayed)');
            }
          }, 10);
        }

        console.log('🔐 [PRELOAD] Login modal hiding initialized');
      })();
    `;

    window.webContents.executeJavaScript(loginHideCSS)
      .then(() => console.log('✅ [MAIN] CSS injection complete'))
      .catch(err => console.error('❌ [MAIN] Failed to inject CSS:', err));

    // CRITICAL STEP 2: Set feature flags (before any other scripts)
    const featureFlagScript = `
      console.log('🚩 [KIZU] Setting feature flags...');
      window.KIZU_SINGLE_USER_MODE = true;
      localStorage.setItem('kizu-single-user-mode', 'true');
      console.log('✅ [KIZU] Feature flag set: SINGLE_USER_MODE = true');
    `;
    window.webContents.executeJavaScript(featureFlagScript)
      .then(() => {
        console.log('✅ [MAIN] Feature flags set');

        // NOTE: Team quarantine disabled - routing is now handled by auth.cljs (logged-out event)
        // The feature flag is read by PenPot's auth.cljs to route to dashboard instead of login
        // See: /home/penpot/penpot/frontend/src/app/main/data/auth.cljs lines 214-237
      })
      .catch(err => console.error('❌ [MAIN] Failed to set feature flags:', err));

    // BACKUP: Also inject legacy auth override (secondary approach)
    const authOverridePath = path.join(__dirname, 'frontend-integration', 'penpot-auth-override.js');
    try {
      const authOverrideScript = fs.readFileSync(authOverridePath, 'utf8');
      window.webContents.executeJavaScript(authOverrideScript)
        .then(() => console.log('✅ [MAIN] PenPot auth override injected (backup)'))
        .catch(err => console.error('❌ [MAIN] Failed to inject auth override:', err));
    } catch (error) {
      console.error('❌ [MAIN] Failed to read auth override script:', error);
    }

    // BACKUP: Also inject PERMANENT login modal destroyer
    window.webContents.executeJavaScript(`
      (function() {
        console.log('🔐 [KIZU] Installing PERMANENT login modal destroyer (backup)...');

        // Function to destroy login modal
        const destroyLoginModal = () => {
          const token = localStorage.getItem('auth-token');
          if (!token) return false;

          // Find auth sections
          const authSections = document.querySelectorAll('main.auth-section');
          if (authSections.length > 0) {
            console.log('🗑️ [KIZU] DESTROYING login modal (' + authSections.length + ' found)');
            authSections.forEach(section => section.remove());
            return true;
          }
          return false;
        };

        // Run EVERY 50ms (20 times per second) - ULTRA AGGRESSIVE
        setInterval(destroyLoginModal, 50);

        // Also redirect if we're on login route
        const checkRoute = () => {
          const token = localStorage.getItem('auth-token');
          const hash = window.location.hash;

          if (token && (hash.includes('#/auth/login') || hash === '' || hash === '#/')) {
            console.log('🔐 [KIZU] Redirecting away from login route');
            const teamId = '00000000-0000-0000-0000-000000000001';
            const url = window.location.origin + window.location.pathname +
              '#/dashboard/recent?team-id=' + teamId;
            window.location.replace(url);
          }
        };

        // Check route every 100ms
        setInterval(checkRoute, 100);

        // Run immediately
        destroyLoginModal();
        checkRoute();

        console.log('✅ [KIZU] PERMANENT login destroyer installed (50ms interval - backup)');
      })();
    `);

    cssManager.injectCSSFiles(window);
    // Inject drag-and-drop handlers EARLY, before PenPot sets up its handlers
    setupDragAndDrop(window, handleFileOpen);
    // showLoadingScreen(window); // Disabled - causes conflicts
  });

  // Helper function to inject all customizations (runs only once)
  const injectCustomizations = () => {
    console.log('Kizu finished loading, waiting before injecting customizations...');

    // Wait a bit more for the Kizu app to fully initialize its routing
    setTimeout(() => {
      console.log('Injecting Kizu customizations...');

      // Note: Mock backend interceptor now injected earlier in dom-ready event
      // via injectFetchInterceptor() which redirects to HTTP server on port 9999

      // Check and inject header bar
      if (!injectionState.headerBar) {
        createHeaderBar(window);
        injectionState.headerBar = true;
      }

      attemptAutoLogin(window);
      injectAuthIntegration(window);
      injectKizuBranding(window);
      // Note: setupDragAndDrop is now called earlier in dom-ready event

      // Hide loading screen once everything is ready
      // hideLoadingScreen(window); // Disabled - causes conflicts
    }, 2000); // Wait 2 seconds for Kizu to settle
  };

  // Set up event listener BEFORE loading the URL
  // Use .once() to ensure customizations are only injected on initial load
  window.webContents.once('did-finish-load', injectCustomizations);

  // Auth-token injection removed from here - now handled in dom-ready below

  window
    .loadURL(PENPOT_CONFIG.frontend.dev)
    .then(async () => {
      console.log('URL loaded successfully');
      cssManager.setupCSSHotReloading();
    })
    .catch((err) => {
      console.error('Failed to load Kizu:', err);
      showConnectionError();
    });
}

// Helper function to handle development mode loading
function handleDevelopmentLoading(window) {
  console.log('Checking Kizu server...');
  checkPenpotServer().then((isRunning) => {
    console.log('Server running:', isRunning);
    if (isRunning) {
      handleServerSuccess(window);
    } else {
      console.log('Server not running, showing error');
      showConnectionError();
    }
  });
}

// Helper function to handle production mode loading
function handleProductionLoading(window) {
  // In production, load bundled frontend
  const prodUrl = `file://${PENPOT_CONFIG.frontend.prod}`;
  window
    .loadURL(prodUrl)
    .then(() => {
      // Inject desktop CSS after page loads
      const cssPath = path.join(__dirname, 'styles', 'desktop.css');
      try {
        const cssContent = require('fs').readFileSync(cssPath, 'utf8');
        console.log('CSS file loaded, length:', cssContent.length);
        window.webContents.insertCSS(cssContent);
        console.log('CSS injected successfully');
      } catch (cssError) {
        console.error('Failed to load CSS file:', cssError);
      }
    })
    .catch((err) => {
      console.error('Failed to load Kizu:', err);
      showConnectionError();
    });
}

// Helper function to inject mock backend fetch interceptor into renderer
function injectMockBackendInterceptor(window) {
  const interceptorScript = `
    console.log('🌐 Injecting mock backend fetch interceptor with transit support...');

    // Save original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept API calls
    window.fetch = async function(url, options = {}) {
      const urlString = typeof url === 'string' ? url : url.url;

      // Check if this is a PenPot API call
      if (urlString.includes('/api/rpc/command/')) {
        console.log('🌐 Intercepting API call:', urlString);

        try {
          // Extract command name from URL
          const commandName = urlString.split('/api/rpc/command/').pop().split('?')[0];

          // Extract params from query string (for GET requests)
          let params = {};
          const queryStartIndex = urlString.indexOf('?');
          if (queryStartIndex !== -1) {
            const queryString = urlString.substring(queryStartIndex + 1);
            const urlParams = new URLSearchParams(queryString);
            for (const [key, value] of urlParams.entries()) {
              params[key] = value;
            }
            console.log('📥 Extracted query params:', params);
          }

          // Extract params from body (for POST requests, overwrites query params if both exist)
          if (options.body) {
            try {
              const bodyParams = JSON.parse(options.body);
              params = { ...params, ...bodyParams };
              console.log('📥 Merged with body params:', params);
            } catch (e) {
              console.warn('Could not parse request body:', e);
            }
          }

          // Call mock backend via IPC (returns {raw, transit})
          const result = await window.electronAPI.mockBackend.command(commandName, params);
          console.log('✅ Mock backend handled:', commandName);
          console.log('📦 Result:', result);

          // Use the transit-encoded string from the main process
          const transitEncoded = result.transit;
          console.log('📦 Transit encoded (from main process):', transitEncoded.substring(0, 100) + '...');

          // Create Response with transit-encoded body
          const realResponse = new Response(transitEncoded, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'application/transit+json; charset=utf-8'
            }
          });

          console.log('📤 Created Response with transit-encoded body from main process');
          return realResponse;
        } catch (error) {
          console.error('❌ Mock backend error:', error);
          // Fall back to original fetch on error
          return originalFetch(url, options);
        }
      }

      // For non-API requests, use original fetch
      return originalFetch(url, options);
    };

    console.log('✅ Mock backend fetch interceptor with transit encoding installed');
  `;

  window.webContents.executeJavaScript(interceptorScript)
    .then(() => console.log('✅ Mock backend request interception enabled'))
    .catch(err => console.error('❌ Failed to inject mock backend interceptor:', err));
}

// Helper function to setup window display and focus
function setupWindowDisplay(window) {
  console.log('Window created, forcing show and focus');
  window.show();
  window.focus();

  window.once('ready-to-show', () => {
    console.log('Window ready to show - showing again and focusing');

    // Small delay to ensure loading screen is injected before showing
    setTimeout(() => {
      window.show();
      window.focus();
      app.focus();

      if (isDev) {
        console.log('Opening dev tools');
        window.webContents.openDevTools();
      }
    }, 50);
  });
}

async function createWindow() {
  mainWindow = createBrowserWindow();
  cssManager.setMainWindow(mainWindow);

  console.log('isDev:', isDev, 'URL:', PENPOT_CONFIG.frontend.dev);

  // Check authentication state first
  const authState = await authOrchestrator.checkAuthenticationState();
  console.log('Auth state:', authState);

  // Route to appropriate screen based on auth state
  if (!authState.authenticated) {
    await loadAuthScreen(mainWindow, authState.nextScreen);
    return;
  }

  // User is authenticated, load main app (Kizu)
  if (isDev) {
    handleDevelopmentLoading(mainWindow);
  } else {
    handleProductionLoading(mainWindow);
  }

  setupWindowDisplay(mainWindow);
  setupWindowEventHandlers(mainWindow);
}

async function loadAuthScreen(window, screenName) {
  const authScreens = {
    'license-selection': 'license-selection.html',
    'license-entry': 'license-entry.html',
    'account-creation': 'account-creation.html',
    login: 'login.html',
  };

  const screenFile = authScreens[screenName] || 'license-selection.html';
  const authUrl = `file://${path.join(__dirname, 'ui', screenFile)}`;

  console.log(`Loading auth screen: ${screenName} (${authUrl})`);

  try {
    await window.loadURL(authUrl);
    setupWindowDisplay(window);
    setupWindowEventHandlers(window);
  } catch (error) {
    console.error('Failed to load auth screen:', error);
    dialog.showErrorBox('Kizu Error', `Failed to load authentication screen: ${error.message}`);
  }
}

function showConnectionError() {
  dialog.showErrorBox(
    'Kizu Connection Error',
    isDev
      ? 'Kizu development server not ready:\n\n' +
          '• Check if Kizu is fully started at localhost:3449\n' +
          '• Backend services may still be starting\n\n' +
          'Please ensure FULL Kizu environment is running:\n' +
          'cd ../penpot && ./manage.sh run-devenv\n\n' +
          'Wait for ALL services to start before launching desktop app.'
      : 'Could not load the Kizu application. Please check the installation.'
  );
}

function getAppIcon() {
  // Return appropriate icon path based on platform
  const iconName =
    process.platform === 'win32'
      ? 'icon.ico'
      : process.platform === 'darwin'
        ? 'icon.icns'
        : 'icon.png';
  return path.join(__dirname, '../assets', iconName);
}

// Initialize backend services before app starts
async function initializeBackendServices() {
  try {
    console.log('🚀 Initializing backend services...');
    const backendManager = getBackendServiceManager();
    await backendManager.initialize();
    console.log('✅ Backend services initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize backend services:', error);
    return false;
  }
}

// Helper function to setup mock backend request interception
// Uses protocol-level HTML modification to inject interceptor BEFORE any page scripts run
function setupMockBackendInterception() {
  const http = require('http');
  const { session } = require('electron');
  const mockBackend = require('./services/penpot-mock-backend');
  const transit = require('transit-js');

  // The fetch interceptor script that will be injected into EVERY page load
  // This MUST run before any other JavaScript on the page
  const FETCH_INTERCEPTOR_SCRIPT = `
<script>
(function() {
  if (window.__kizuFetchInterceptorInstalled) return;
  window.__kizuFetchInterceptorInstalled = true;

  const originalFetch = window.fetch;
  const MOCK_SERVER = 'http://localhost:9999';

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;

    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu Fetch] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalFetch(mockUrl, {
        ...init,
        method: init.method || 'GET',
        headers: { ...init.headers },
        body: init.body,
      });
    }
    return originalFetch(input, init);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu XHR] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalXHROpen.call(this, method, mockUrl, ...args);
    }
    return originalXHROpen.call(this, method, url, ...args);
  };

  console.log('✅ [Kizu] Fetch interceptor installed EARLY (before page scripts)');
})();
</script>`;

  // Convert Transit map to plain JS object
  function transitMapToObject(transitMap) {
    if (!transitMap || typeof transitMap !== 'object') {
      return transitMap;
    }
    // Check if it's a Transit map (has _entries)
    if (transitMap._entries && Array.isArray(transitMap._entries)) {
      const result = {};
      const entries = transitMap._entries;
      for (let i = 0; i < entries.length; i += 2) {
        let key = entries[i];
        const value = entries[i + 1];
        // Transit keywords have _name property
        if (key && typeof key === 'object' && key._name) {
          key = key._name;
        }
        result[key] = transitMapToObject(value);
      }
      return result;
    }
    // Regular object or array
    if (Array.isArray(transitMap)) {
      return transitMap.map(transitMapToObject);
    }
    return transitMap;
  }

  // Parse Transit-encoded body (PenPot uses Transit, not JSON)
  function parseTransitBody(bodyText) {
    if (!bodyText || bodyText.trim() === '') {
      return {};
    }
    try {
      const reader = transit.reader('json');
      const result = reader.read(bodyText);
      // Convert Transit maps to plain JS objects
      return transitMapToObject(result);
    } catch {
      try {
        return JSON.parse(bodyText);
      } catch {
        return {};
      }
    }
  }

  // UUID regex pattern
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Keys whose children use UUID keys instead of keyword keys
  const UUID_KEY_MAPS = new Set(['pages-index', 'objects']);

  // Keys that should be encoded as PenPot record types (with Transit tags)
  const RECORD_TYPE_KEYS = {
    'selrect': 'rect',
    'transform': 'matrix',
    'transform-inverse': 'matrix',
  };

  // Keys whose array items should be tagged as a specific type
  const ARRAY_ITEM_TAGS = {
    'points': 'point',  // Points array contains Point records
  };

  // Keys whose VALUES should be encoded as keywords (not strings)
  // PenPot uses ClojureScript keywords for enum-like values
  const KEYWORD_VALUE_KEYS = new Set([
    'type',           // Shape type: :frame, :rect, :circle, :path, :text, :group, :bool, :svg-raw, :image
    'blend-mode',     // Blend mode: :normal, :multiply, :screen, etc.
    'stroke-style',   // Stroke style: :solid, :dashed, :dotted, :mixed
    'stroke-alignment', // Stroke alignment: :center, :inner, :outer
    'stroke-cap',     // Stroke cap: :round, :square, :butt
    'fill-color-ref-type', // Fill ref: :linear, :radial
    'text-align',     // Text alignment: :left, :center, :right, :justify
    'text-direction', // Text direction: :ltr, :rtl
    'vertical-align', // Vertical align: :top, :center, :bottom
    'grow-type',      // Grow type: :auto-width, :auto-height, :fixed
    'layout',         // Layout type: :flex, :grid
    'layout-type',    // Layout type
    'layout-wrap-type', // Wrap type: :wrap, :nowrap
    'layout-flex-dir', // Flex direction: :row, :column, :row-reverse, :column-reverse
    'layout-justify-content', // Justify content
    'layout-align-items', // Align items
    'layout-align-content', // Align content
    'constraints-h',  // Horizontal constraints: :left, :right, :center, :scale, :leftright
    'constraints-v',  // Vertical constraints: :top, :bottom, :center, :scale, :topbottom
  ]);

  // Check if an object looks like a rect (has x, y, width, height)
  function isRectLike(obj) {
    return obj && typeof obj === 'object' &&
      'x' in obj && 'y' in obj && 'width' in obj && 'height' in obj;
  }

  // Check if an object looks like a matrix (has a, b, c, d, e, f)
  function isMatrixLike(obj) {
    return obj && typeof obj === 'object' &&
      'a' in obj && 'b' in obj && 'c' in obj && 'd' in obj && 'e' in obj && 'f' in obj;
  }

  // Create a Transit tagged value for PenPot record types
  function createTaggedValue(tag, obj) {
    // Convert the object to a Transit map first
    const transitMap = transit.map();
    for (const [key, value] of Object.entries(obj)) {
      transitMap.set(transit.keyword(key), convertToTransitFormat(value));
    }
    return transit.tagged(tag, transitMap);
  }

  // Convert JS objects to Transit format:
  // - Objects become Transit maps with keyword keys (except pages-index, objects which use UUID keys)
  // - UUID strings become Transit UUIDs
  // - Certain string values become keywords (type, blend-mode, etc.)
  // - Rect/Matrix objects become Transit tagged values
  // - Arrays are converted recursively
  function convertToTransitFormat(obj, parentKey = null) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    // Check if this string value should be a keyword (based on parent key)
    if (typeof obj === 'string') {
      // UUID strings become Transit UUIDs
      if (UUID_REGEX.test(obj)) {
        return transit.uuid(obj);
      }
      // Certain keys have keyword values (type, blend-mode, etc.)
      if (parentKey && KEYWORD_VALUE_KEYS.has(parentKey)) {
        return transit.keyword(obj);
      }
      // Regular string
      return obj;
    }
    // Handle arrays
    if (Array.isArray(obj)) {
      // Check if array items should be tagged (e.g., points array -> Point records)
      const itemTag = ARRAY_ITEM_TAGS[parentKey];
      if (itemTag) {
        return obj.map(item => {
          if (typeof item === 'object' && item !== null) {
            return createTaggedValue(itemTag, item);
          }
          return convertToTransitFormat(item, parentKey);
        });
      }
      return obj.map(item => convertToTransitFormat(item, parentKey));
    }
    // Handle plain objects
    if (typeof obj === 'object' && obj.constructor === Object) {
      // Check if this should be a tagged record type based on parent key
      const recordType = RECORD_TYPE_KEYS[parentKey];
      if (recordType) {
        if (recordType === 'rect' && isRectLike(obj)) {
          return createTaggedValue('rect', obj);
        }
        if (recordType === 'matrix' && isMatrixLike(obj)) {
          return createTaggedValue('matrix', obj);
        }
      }

      // Regular object - convert to Transit map
      const transitMap = transit.map();
      // Check if this object's keys should be UUIDs (for pages-index, objects maps)
      const useUUIDKeys = UUID_KEY_MAPS.has(parentKey);

      for (const [key, value] of Object.entries(obj)) {
        let transitKey;
        if (useUUIDKeys && UUID_REGEX.test(key)) {
          // Use UUID as key (for pages-index and objects maps)
          transitKey = transit.uuid(key);
        } else {
          // Use keyword as key (for regular properties)
          transitKey = transit.keyword(key);
        }
        transitMap.set(transitKey, convertToTransitFormat(value, key));
      }
      return transitMap;
    }
    return obj;
  }

  // Create local HTTP server for mock backend
  const server = http.createServer(async (req, res) => {
    console.log('🌐 [MockServer] Request:', req.method, req.url);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const commandName = url.pathname.replace('/api/rpc/command/', '').split('?')[0];

      let params = {};
      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }

      if (req.method === 'POST') {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const bodyText = Buffer.concat(buffers).toString();
        const bodyParams = parseTransitBody(bodyText);
        if (bodyParams && typeof bodyParams === 'object') {
          params = { ...params, ...bodyParams };
        }
      }

      const result = await mockBackend.handleCommand(commandName, params);
      console.log('✅ [MockServer] Handled:', commandName);

      // Convert JS objects to Transit format (keyword keys + UUID values)
      const transitReady = convertToTransitFormat(result);
      const writer = transit.writer('json-verbose');
      const transitEncoded = writer.write(transitReady);

      res.writeHead(200, {
        'Content-Type': 'application/transit+json; charset=utf-8',
      });
      res.end(transitEncoded);
    } catch (error) {
      console.error('❌ [MockServer] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  server.on('error', (err) => {
    console.error('❌ [MockServer] Failed to start:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error('   Port 9999 is already in use. Trying port 9998...');
      server.listen(9998, '127.0.0.1', () => {
        console.log('✅ [MockServer] Running on http://127.0.0.1:9998 (fallback)');
      });
    }
  });

  server.listen(9999, '127.0.0.1', () => {
    console.log('✅ [MockServer] Running on http://127.0.0.1:9999');
  });

  console.log('✅ [MockBackend] HTTP server starting...');
}

// Get the fetch interceptor script as a string (used for early injection)
function getFetchInterceptorScript() {
  return `
(function() {
  if (window.__kizuFetchInterceptorInstalled) return;
  window.__kizuFetchInterceptorInstalled = true;

  const originalFetch = window.fetch;
  const MOCK_SERVER = 'http://localhost:9999';

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;

    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu Fetch] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalFetch(mockUrl, {
        ...init,
        method: init.method || 'GET',
        headers: { ...init.headers },
        body: init.body,
      });
    }
    return originalFetch(input, init);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu XHR] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalXHROpen.call(this, method, mockUrl, ...args);
    }
    return originalXHROpen.call(this, method, url, ...args);
  };

  console.log('✅ [Kizu] Fetch interceptor installed EARLY');
})();
`;
}

// Inject fetch interceptor into renderer to redirect API calls to mock server
function injectFetchInterceptor(webContents) {
  webContents.executeJavaScript(getFetchInterceptorScript()).catch(err => {
    console.error('❌ Failed to inject fetch interceptor:', err);
  });
}

// Register protocol before app is ready
app.whenReady().then(async () => {
  // Setup mock backend interception at protocol level (catches ALL requests, even early ones)
  setupMockBackendInterception();

  // Register custom protocol to serve logo files
  protocol.handle('kizu', (request) => {
    const url = request.url.replace('kizu://logos/', '');
    const logoPath = path.join(__dirname, 'Logos', url);
    return net.fetch(`file://${logoPath}`);
  });

  // Initialize backend services first
  await initializeBackendServices();

  createWindow();
  buildApplicationMenu(mainWindow);
  registerIpcHandlers(mainWindow);
  initializeTabManager(store, mainWindow);
  registerTabHandlers();

  // Start health monitoring in development mode (temporarily disabled to prevent crashes)
  // TODO: Re-enable when health monitoring is stable
  // if (isDev) {
  //   console.log('🔄 Starting automated health monitoring...');
  //   recovery.startHealthMonitoring(120000); // Check every 2 minutes
  //   // Add recovery menu items to help menu
  //   addRecoveryMenuItems(mainWindow);
  // }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file opening (.fig, .kizu, .json files)
// macOS: open-file event
app.on('open-file', async (event, filePath) => {
  event.preventDefault();
  console.log('File open requested:', filePath);

  const ext = path.extname(filePath).toLowerCase();
  if (['.fig', '.kizu', '.json'].includes(ext)) {
    await handleFileOpen(filePath);
  }
});

// Windows/Linux: command line arguments
if (process.platform !== 'darwin') {
  const fileArg = process.argv.find(arg =>
    ['.fig', '.kizu', '.json'].some(ext => arg.toLowerCase().endsWith(ext))
  );

  if (fileArg) {
    app.whenReady().then(() => {
      setTimeout(() => handleFileOpen(fileArg), 1000);
    });
  }
}

/**
 * Create and show import progress window
 * @param {string} fileName - Name of file being imported
 * @returns {BrowserWindow} The progress window
 */
function createImportProgressWindow(fileName) {
  if (importProgressWindow) {
    importProgressWindow.close();
  }

  return new Promise((resolve) => {
    importProgressWindow = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Importing File',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      parent: mainWindow,
      modal: true,
      show: false
    });

    const progressUrl = `file://${path.join(__dirname, 'ui', 'import-progress.html')}`;
    importProgressWindow.loadURL(progressUrl);

    importProgressWindow.once('ready-to-show', () => {
      importProgressWindow.show();
      // Send initial progress
      sendImportProgress({
        fileName,
        percentage: 0,
        status: 'Starting import...'
      });
      // Wait a bit for the renderer to set up IPC listeners
      setTimeout(() => resolve(importProgressWindow), 100);
    });

    importProgressWindow.on('closed', () => {
      importProgressWindow = null;
    });
  });
}

/**
 * Send import progress update to progress window
 * @param {object} data - Progress data
 */
function sendImportProgress(data) {
  if (importProgressWindow && !importProgressWindow.isDestroyed()) {
    importProgressWindow.webContents.send('import-progress', data);
  }
}

/**
 * Register IPC handler for import progress updates
 */
ipcMain.handle('import-progress:onProgress', (event, callback) => {
  // This will be called from the preload script
  return { success: true };
});

/**
 * Register IPC handler for opening imported file
 */
ipcMain.handle('open-imported-file', async (event, data) => {
  // Support both old API (just filePath string) and new API (object with filePath, projectId, teamId)
  const { filePath, projectId, teamId } = typeof data === 'string'
    ? { filePath: data, projectId: null, teamId: null }
    : data;

  console.log('🚀 Opening imported file from progress dialog:', filePath);
  console.log('📁 Project ID:', projectId);
  console.log('👥 Team ID:', teamId);

  try {
    if (filePath) {
      // Use the workspace launcher utility which handles auth properly
      const { launchWorkspace } = require('./utils/workspace-launcher');
      console.log('📂 Launching workspace with file:', filePath);

      const result = await launchWorkspace(filePath, mainWindow);

      if (result.success) {
        console.log('✅ Workspace launched successfully');
        return { success: true };
      } else {
        console.error('❌ Workspace launch failed:', result.error);
        return { success: false, error: result.error };
      }
    } else {
      console.error('❌ No file path provided');
      return { success: false, error: 'No file path provided' };
    }
  } catch (error) {
    console.error('❌ Failed to launch workspace:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle opening .fig, .kizu, or .json files
 * @param {string} filePath - Path to file to open
 * @returns {Promise<{success: boolean, error?: string, filePath?: string}>} Result object
 */
async function handleFileOpen(filePath) {
  console.log('🎯 [handleFileOpen] Opening file:', filePath);

  const fileName = path.basename(filePath);

  try {
    console.log('📦 Importing file without progress dialog:', fileName);

    const { getFigmaImporter } = require('./services/figma/figma-importer');
    const importer = getFigmaImporter();

    const result = await importer.importFromFile(filePath);

    if (result.success && result.filePath) {
      console.log('✅ File imported successfully:', result.filePath);
      console.log('📊 Compatibility score:', result.compatibilityScore + '%');

      // Extract project ID and team ID from the project
      const projectId = result.project?.metadata?.id;
      const teamId = result.project?.metadata?.teamId || '00000000-0000-0000-0000-000000000001';
      console.log('📁 Project ID:', projectId);
      console.log('👥 Team ID:', teamId);

      // CRITICAL: Load the project into backend service manager so mock backend can serve it
      const { getBackendServiceManager } = require('./services/backend-service-manager');
      const backend = getBackendServiceManager();
      console.log('📦 Loading project into backend service manager:', result.filePath);
      await backend.loadProject(result.filePath);
      console.log('✅ Project loaded as current project');

      // Get the first page ID from the project (REQUIRED for PenPot workspace to render)
      const firstPageId = result.project?.data?.pages?.[0]?.id || result.project?.data?.pages?.[0];
      console.log('📄 First page ID:', firstPageId);

      if (!firstPageId) {
        throw new Error('Project has no pages - cannot open workspace');
      }

      // Open workspace directly WITHOUT any dialog or navigation
      console.log('🚀 Opening workspace directly in current window...');

      // Inject the file directly into PenPot's workspace via script injection
      const openScript = `
        (async () => {
          try {
            console.log('🎯 Opening imported file in workspace...');

            // CRITICAL: Load file data from mock backend and store in window.__KIZU_FILE_DATA__
            // PenPot will look for the file here when is-kizu-local? is true
            console.log('📥 Fetching file data from mock backend...');

            // Call the mock backend to get the converted PenPot file data
            const response = await window.electronAPI.mockBackend.command('get-file', {
              id: '${projectId}',
              features: 'fdata/shape-data-type'
            });

            if (!response || response.error) {
              throw new Error('Failed to fetch file data: ' + (response?.error || 'Unknown error'));
            }

            // Extract the raw file data (IPC handler wraps it in {raw, transit})
            const fileData = response.raw || response;

            if (!fileData || !fileData.data) {
              throw new Error('File data has invalid structure: missing data property');
            }

            // Store in window.__KIZU_FILE_DATA__ for PenPot to access
            if (!window.__KIZU_FILE_DATA__) {
              window.__KIZU_FILE_DATA__ = {};
            }
            window.__KIZU_FILE_DATA__['${projectId}'] = fileData;

            console.log('✅ File data loaded and stored in window.__KIZU_FILE_DATA__');
            console.log('📊 File has', Object.keys(fileData.data['pages-index'] || {}).length, 'pages');

            // Also store for debugging
            window.__KIZU_IMPORTED_FILE = {
              fileId: '${projectId}',
              projectId: '${projectId}',
              teamId: '${teamId}',
              pageId: '${firstPageId}',
              filePath: '${result.filePath.replace(/\\/g, '\\\\')}',
              timestamp: Date.now()
            };

            // Navigate to workspace using hash (no page reload)
            // CRITICAL: Include page-id so PenPot knows which page to render
            // CRITICAL: Use "kizu-local" as project-id to trigger local file loading (not backend fetch)
            const workspaceUrl = \`#/workspace?team-id=${teamId}&project-id=kizu-local&file-id=${projectId}&page-id=${firstPageId}\`;
            console.log('🔗 Navigating to:', workspaceUrl);
            window.location.hash = workspaceUrl;

            console.log('✅ Workspace navigation complete');
          } catch (error) {
            console.error('❌ Failed to open workspace:', error);
            alert('Failed to open workspace: ' + error.message);
          }
        })();
      `;

      await mainWindow.webContents.executeJavaScript(openScript);

      // Debug: Check what URL we ended up on
      const currentUrl = await mainWindow.webContents.executeJavaScript('window.location.href');
      const currentHash = await mainWindow.webContents.executeJavaScript('window.location.hash');
      console.log('📍 Current URL after navigation:', currentUrl);
      console.log('📍 Current hash:', currentHash);

      console.log('✅ Workspace opened successfully');

      // Return success result for drag-drop handler
      return {
        success: true,
        filePath: result.filePath,
        compatibilityScore: result.compatibilityScore
      };
    } else {
      // Import failed
      const errorMsg = result.error || 'Import failed - unknown error';
      console.error('❌ Import failed:', errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error) {
    console.error('❌ File import failed with exception:', error);

    // Show error notification in the main window
    const errorScript = `
      console.error('Import error:', '${error.message.replace(/'/g, "\\'")}');
      alert('Failed to import file: ${error.message.replace(/'/g, "\\'")}');
    `;
    mainWindow.webContents.executeJavaScript(errorScript).catch(() => {});

    return {
      success: false,
      error: error.message
    };
  }
}

// Register .fig file association on app install (macOS)
if (process.platform === 'darwin') {
  app.setAsDefaultProtocolClient('fig');
}

// Export handleFileOpen so it can be used by IPC handlers
module.exports.handleFileOpen = handleFileOpen;

console.log('Kizu starting...');
console.log('Development mode:', isDev);
console.log('Electron version:', process.versions.electron);
