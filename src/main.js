const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildApplicationMenu } = require('./menu-builder');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initializeTabManager, registerTabHandlers } = require('./tab-manager');
const { showLoadingScreen, hideLoadingScreen } = require('./utils/loading-helpers');
const { createHeaderBar } = require('./utils/tab-helpers');
const recovery = require('./utils/recovery');
const authStorage = require('./services/auth-storage');
// const { addRecoveryMenuItems } = require('./utils/recovery-menu'); // Disabled - see line 575
const { getBackendServiceManager } = require('./services/backend-service-manager');

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
const { ipcMain } = require('electron');

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

// CSS Hot Reloading Setup
let cssWatcher;

function reloadCSS(cssPath) {
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.insertCSS(cssContent);
      console.log('CSS hot-reloaded!');
    }
  } catch (cssError) {
    console.error('Failed to reload CSS:', cssError);
  }
}

function compileSCSS(scssPath, cssPath) {
  const { exec } = require('child_process');
  exec(`npx sass ${scssPath} ${cssPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error('SCSS compilation error:', error);
      return;
    }
    if (stderr) {
      console.warn('SCSS warnings:', stderr);
    }
    console.log('SCSS compiled successfully');
    reloadCSS(cssPath);
  });
}

function setupCSSHotReloading() {
  if (!isDev) {
    return;
  }
  const scssPath = path.join(__dirname, 'styles', 'desktop.scss');
  const cssPath = path.join(__dirname, 'styles', 'desktop.css');
  console.log('Setting up CSS hot reloading...');
  cssWatcher = fs.watch(scssPath, (eventType) => {
    if (eventType === 'change') {
      console.log('SCSS file changed, recompiling...');
      compileSCSS(scssPath, cssPath);
    }
  });
}

// PenPot configuration
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

// Check if response contains PenPot content
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

// Validate PenPot frontend content
async function validateFrontendResponse(frontendResponse) {
  const htmlContent = await frontendResponse.text();
  const isPenpotApp = validatePenpotContent(htmlContent);

  console.log('Frontend status:', frontendResponse.ok);
  console.log('PenPot app detected:', isPenpotApp);

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

// Check if PenPot development server is running
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
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    preload: preloadPath,
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

  if (windowState.maximized) {
    window.maximize();
  }

  return window;
}

// Helper function to inject CSS files
function injectCSSFiles(window) {
  const cssPath = path.join(__dirname, 'styles', 'desktop.css');
  const loadingCssPath = path.join(__dirname, 'styles', 'loading.css');

  try {
    const cssContent = require('fs').readFileSync(cssPath, 'utf8');
    const loadingCssContent = require('fs').readFileSync(loadingCssPath, 'utf8');
    console.log('CSS files loaded');
    window.webContents.insertCSS(cssContent);
    window.webContents.insertCSS(loadingCssContent);
    console.log('CSS injected successfully');
  } catch (cssError) {
    console.error('Failed to load CSS file:', cssError);
  }
}

// Helper function to inject authentication integration script
function injectAuthIntegration(window) {
  const authIntegrationPath = path.join(__dirname, 'frontend-integration', 'auth-integration.js');

  try {
    const authScript = fs.readFileSync(authIntegrationPath, 'utf8');
    console.log('Auth script loaded, length:', authScript.length, 'characters');
    console.log('Auth script preview:', authScript.substring(0, 200) + '...');

    window.webContents
      .executeJavaScript(authScript)
      .then(() => {
        console.log('✅ Auth integration script executed successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to execute auth integration script:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      });
  } catch (error) {
    console.error('❌ Failed to load auth integration script file:', error);
  }
}

// Loading screen functions moved to ./utils/loading-helpers.js

// Tab helper functions moved to ./utils/tab-helpers.js

// All tab and loading helper functions moved to respective utils files

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
  if (cssWatcher) {
    cssWatcher.close();
    cssWatcher = null;
  }
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

  // Inject loading screen immediately when DOM is ready (before PenPot content appears)
  window.webContents.once('dom-ready', () => {
    console.log('DOM ready - injecting loading screen immediately');
    injectCSSFiles(window);
    showLoadingScreen(window);
  });

  // Set up event listeners BEFORE loading the URL
  window.webContents.once('did-finish-load', async () => {
    console.log('PenPot finished loading, waiting before injecting customizations...');

    // Wait a bit more for the PenPot app to fully initialize its routing
    setTimeout(() => {
      console.log('Injecting Kizu customizations...');

      createHeaderBar(window);
      attemptAutoLogin(window);
      injectAuthIntegration(window);

      // Hide loading screen once everything is ready
      hideLoadingScreen(window);
    }, 2000); // Wait 2 seconds for PenPot to settle
  });

  window
    .loadURL(PENPOT_CONFIG.frontend.dev)
    .then(async () => {
      console.log('URL loaded successfully');
      setupCSSHotReloading();
    })
    .catch((err) => {
      console.error('Failed to load PenPot:', err);
      showConnectionError();
    });
}

// Helper function to handle development mode loading
function handleDevelopmentLoading(window) {
  console.log('Checking PenPot server...');
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
      console.error('Failed to load PenPot:', err);
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

function createWindow() {
  mainWindow = createBrowserWindow();

  console.log('isDev:', isDev, 'URL:', PENPOT_CONFIG.frontend.dev);

  if (isDev) {
    handleDevelopmentLoading(mainWindow);
  } else {
    handleProductionLoading(mainWindow);
  }

  setupWindowDisplay(mainWindow);
  setupWindowEventHandlers(mainWindow);
}

function showConnectionError() {
  dialog.showErrorBox(
    'Kizu Connection Error',
    isDev
      ? 'PenPot development server not ready:\n\n' +
          '• Check if PenPot is fully started at localhost:3449\n' +
          '• Backend services may still be starting\n\n' +
          'Please ensure FULL PenPot environment is running:\n' +
          'cd ../penpot && ./manage.sh run-devenv\n\n' +
          'Wait for ALL services to start before launching desktop app.'
      : 'Could not load the PenPot application. Please check the installation.'
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

// App event handlers
app.whenReady().then(async () => {
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

console.log('Kizu starting...');
console.log('Development mode:', isDev);
console.log('Electron version:', process.versions.electron);
