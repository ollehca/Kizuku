/**
 * Kizuku server connection utilities
 */

const path = require('path');
const { createLogger } = require('./utils/logger');

const logger = createLogger('KizukuServer');

// Kizuku server configuration
const PENPOT_CONFIG = {
  frontend: {
    dev: 'http://localhost:3449',
    prod: path.join(__dirname, '../resources/penpot-frontend/index.html'),
  },
  backend: {
    dev: 'http://localhost:6060',
    prod: 'http://localhost:6060',
  },
};

const SERVER_TIMEOUT = 3000;

/**
 * Check if Kizuku development server is running
 * @returns {Promise<boolean>} True if server is accessible
 */
async function checkPenpotServer() {
  try {
    const response = await fetch(PENPOT_CONFIG.frontend.dev, {
      method: 'HEAD',
      signal: AbortSignal.timeout(SERVER_TIMEOUT),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get Kizuku frontend URL for current mode
 * @param {boolean} isDev - Whether in development mode
 * @returns {string} URL to load
 */
function getPenpotUrl(isDev) {
  return isDev ? PENPOT_CONFIG.frontend.dev : `file://${PENPOT_CONFIG.frontend.prod}`;
}

/**
 * Load Kizuku in window with connection checking
 * @param {object} window - BrowserWindow instance
 * @param {boolean} isDev - Whether in development mode
 * @param {Function} onError - Error callback function
 */
async function loadPenpotInWindow(window, isDev, onError) {
  if (isDev) {
    const isServerRunning = await checkPenpotServer();
    if (!isServerRunning) {
      onError();
      return;
    }
  }

  const url = getPenpotUrl(isDev);

  try {
    await window.loadURL(url);
  } catch (error) {
    logger.error('Failed to load Kizuku', error);
    onError();
  }
}

module.exports = {
  loadPenpotInWindow,
  getPenpotUrl,
  checkPenpotServer,
};
