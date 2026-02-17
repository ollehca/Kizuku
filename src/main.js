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
const { getBackendServiceManager } = require('./services/backend-service-manager');
const { setupDragAndDrop } = require('./utils/drag-drop-handler');
const { injectAuthIntegration, injectKizuBranding } = require('./utils/frontend-injection');
const { injectFetchInterceptor } = require('./utils/fetch-interceptor');
const rendererScripts = require('./utils/renderer-scripts');
const { startMockServer } = require('./services/mock-server');
const { handleFileOpen } = require('./services/file-open-handler');

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

/**
 * Inject early scripts on DOM ready (redirect, CSS hiding, feature flags, auth)
 * @param {object} window - BrowserWindow instance
 */
function injectDomReadyScripts(window) {
  const wc = window.webContents;

  injectFetchInterceptor(wc);

  wc.executeJavaScript(rendererScripts.getDashboardRedirectScript()).catch((err) =>
    console.error('❌ Redirect failed:', err)
  );

  wc.executeJavaScript(rendererScripts.getLoginHideCSSScript()).catch((err) =>
    console.error('❌ CSS injection failed:', err)
  );

  wc.executeJavaScript(rendererScripts.getFeatureFlagScript()).catch((err) =>
    console.error('❌ Feature flags failed:', err)
  );

  // Inject legacy auth override (backup)
  const authPath = path.join(__dirname, 'frontend-integration', 'penpot-auth-override.js');
  try {
    wc.executeJavaScript(fs.readFileSync(authPath, 'utf8')).catch((err) =>
      console.error('❌ Auth override failed:', err)
    );
  } catch (error) {
    console.error('❌ Failed to read auth override:', error);
  }

  // Inject login modal destroyer (backup)
  wc.executeJavaScript(rendererScripts.getLoginDestroyerScript());

  cssManager.injectCSSFiles(window);
  setupDragAndDrop(window, (filePath) => handleFileOpen(filePath, mainWindow));
}

/**
 * Inject customizations after page fully loads (header, auth, branding)
 * @param {object} window - BrowserWindow instance
 */
function injectCustomizations(window) {
  console.log('Kizu finished loading, injecting customizations...');

  setTimeout(() => {
    if (!injectionState.headerBar) {
      createHeaderBar(window);
      injectionState.headerBar = true;
    }
    attemptAutoLogin(window);
    injectAuthIntegration(window);
    injectKizuBranding(window);
  }, 2000);
}

/**
 * Handle successful server connection
 * @param {object} window - BrowserWindow instance
 */
function handleServerSuccess(window) {
  console.log('Loading URL:', PENPOT_CONFIG.frontend.dev);

  window.webContents.on('did-commit-navigation', () => {
    injectFetchInterceptor(window.webContents);
  });

  window.webContents.once('dom-ready', () => injectDomReadyScripts(window));
  window.webContents.once('did-finish-load', () => injectCustomizations(window));

  window
    .loadURL(PENPOT_CONFIG.frontend.dev)
    .then(() => {
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

/**
 * Setup mock backend HTTP server interception
 */
function setupMockBackendInterception() {
  const mockBackend = require('./services/penpot-mock-backend');
  startMockServer(mockBackend);
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
    await handleFileOpen(filePath, mainWindow);
  }
});

// Windows/Linux: command line arguments
if (process.platform !== 'darwin') {
  const fileArg = process.argv.find((arg) =>
    ['.fig', '.kizu', '.json'].some((ext) => arg.toLowerCase().endsWith(ext))
  );

  if (fileArg) {
    app.whenReady().then(() => {
      setTimeout(() => handleFileOpen(fileArg, mainWindow), 1000);
    });
  }
}

/**
 * Register IPC handler for opening imported file
 */
ipcMain.handle('open-imported-file', async (_event, data) => {
  const { filePath } = typeof data === 'string' ? { filePath: data } : data;

  if (!filePath) {
    return { success: false, error: 'No file path provided' };
  }

  try {
    const { launchWorkspace } = require('./utils/workspace-launcher');
    const result = await launchWorkspace(filePath, mainWindow);
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (error) {
    console.error('❌ Failed to launch workspace:', error);
    return { success: false, error: error.message };
  }
});

// Register .fig file association on app install (macOS)
if (process.platform === 'darwin') {
  app.setAsDefaultProtocolClient('fig');
}

// Re-export handleFileOpen for IPC handlers that reference main.handleFileOpen
module.exports.handleFileOpen = (filePath) => handleFileOpen(filePath, mainWindow);

console.log('Kizu starting...');
console.log('Development mode:', isDev);
console.log('Electron version:', process.versions.electron);
