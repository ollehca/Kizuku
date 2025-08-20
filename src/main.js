const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildApplicationMenu } = require('./menu-builder');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initializeTabManager, registerTabHandlers } = require('./tab-manager');
const { showLoadingScreen, hideLoadingScreen } = require('./utils/loading-helpers');
const { createHeaderBar } = require('./utils/tab-helpers');
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

// Development mode detection - default to dev if penpot directory exists
const isDev =
  process.env.NODE_ENV === 'development' || fs.existsSync(path.join(__dirname, '../../penpot'));

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

// Check if PenPot development server is running
async function checkPenpotServer() {
  try {
    const frontendResponse = await createTimeoutFetch(PENPOT_CONFIG.frontend.dev);

    if (!frontendResponse.ok) {
      console.log('Frontend not responding');
      return false;
    }

    const htmlContent = await frontendResponse.text();
    const isPenpotApp = validatePenpotContent(htmlContent);

    console.log('Frontend status:', frontendResponse.ok);
    console.log('PenPot app detected:', isPenpotApp);

    return isPenpotApp;
  } catch (error) {
    console.error('Server check error:', error.message);
    return false;
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

// Helper function to create title bar options
function createTitleBarOptions() {
  if (process.platform !== 'darwin') {
    return {
      titleBarStyle: 'default',
      titleBarOverlay: false,
    };
  }

  return {
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#1E1E1E',
      symbolColor: '#FFFFFF',
      height: 40,
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

// Loading screen functions moved to ./utils/loading-helpers.js

// Helper function to inject CSS and show loading screen
function injectCSSAndLoadingScreen(window) {
  injectCSSFiles(window);
  showLoadingScreen(window);
}

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

// Helper function to handle successful server connection
function handleServerSuccess(window) {
  console.log('Loading URL:', PENPOT_CONFIG.frontend.dev);
  window
    .loadURL(PENPOT_CONFIG.frontend.dev)
    .then(() => {
      console.log('URL loaded successfully');

      injectCSSAndLoadingScreen(window);
      createHeaderBar(window);
      hideLoadingScreen(window);
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
    window.show();
    window.focus();
    app.focus();

    if (isDev) {
      console.log('Opening dev tools');
      window.webContents.openDevTools();
    }
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
    'PenPot Connection Error',
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

// App event handlers
app.whenReady().then(() => {
  createWindow();
  buildApplicationMenu(mainWindow);
  registerIpcHandlers(mainWindow);
  initializeTabManager(store, mainWindow);
  registerTabHandlers();

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

console.log('PenPot Desktop starting...');
console.log('Development mode:', isDev);
console.log('Electron version:', process.versions.electron);
