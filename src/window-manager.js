/**
 * Window management for PenPot Desktop
 */

const { BrowserWindow, dialog } = require('electron');
const path = require('path');

// Window configuration constants
const DEFAULT_WIDTH = 1400;
const DEFAULT_HEIGHT = 900;
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;

/**
 * Get stored window position and size
 * @param {object} store - Electron store instance
 * @returns {object} Window state configuration
 */
function getWindowState(store) {
  return store.get('windowState', {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    x: undefined,
    y: undefined,
    maximized: false,
  });
}

/**
 * Save window position and size
 * @param {object} window - BrowserWindow instance
 * @param {object} store - Electron store instance
 */
function saveWindowState(window, store) {
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

/**
 * Get app icon path for current platform
 * @returns {string} Path to app icon
 */
function getAppIconPath() {
  let iconName = 'icon.png'; // Default

  if (process.platform === 'win32') {
    iconName = 'icon.ico';
  } else if (process.platform === 'darwin') {
    iconName = 'icon.icns';
  }

  return path.join(__dirname, '../assets', iconName);
}

/**
 * Get web preferences for BrowserWindow with webview support
 * @param {boolean} isDev - Whether in development mode
 * @returns {object} Web preferences configuration
 */
function getWebPreferences(isDev) {
  return {
    nodeIntegration: true,
    contextIsolation: false,
    enableRemoteModule: false,
    webviewTag: true,
    webSecurity: !isDev,
    // Remove preload for now to avoid errors
  };
}

/**
 * Create title bar configuration
 * @returns {object} Title bar configuration
 */
function createTitleBarConfig() {
  return {
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? false
        : {
            color: '#1E1E20',
            symbolColor: '#FFFFFF',
            height: 40,
          },
  };
}

/**
 * Create window configuration object
 * @param {object} windowState - Window state from store
 * @param {boolean} isDev - Development mode flag
 * @returns {object} Window configuration
 */
function createWindowConfig(windowState, isDev) {
  const titleBarConfig = createTitleBarConfig();

  return {
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: getWebPreferences(isDev),
    ...titleBarConfig,
    title: 'PenPot Desktop',
    backgroundColor: '#1E1E20',
    show: true,
    icon: getAppIconPath(),
  };
}

/**
 * Create browser window with saved state
 * @param {object} store - Electron store instance
 * @returns {object} BrowserWindow instance
 */
function createBrowserWindow(store) {
  const windowState = getWindowState(store);
  const isDev = process.env.NODE_ENV === 'development';
  const config = createWindowConfig(windowState, isDev);

  const window = new BrowserWindow(config);

  if (windowState.maximized) {
    window.maximize();
  }

  return window;
}

/**
 * Show error dialog for connection issues
 * @param {boolean} isDev - Whether in development mode
 */
function showConnectionError(isDev) {
  const message = isDev
    ? 'Could not connect to PenPot development server at localhost:3449.\n\nPlease ensure PenPot is running with: ./manage.sh run-devenv'
    : 'Could not load the PenPot application. Please check the installation.';

  dialog.showErrorBox('PenPot Connection Error', message);
}

module.exports = {
  createBrowserWindow,
  saveWindowState,
  showConnectionError,
};
