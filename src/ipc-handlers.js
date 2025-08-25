/**
 * IPC handlers for desktop-specific functionality
 */

const { ipcMain, dialog, app } = require('electron');
const fs = require('fs').promises;
const { createLogger } = require('./utils/logger');
const authStorage = require('./services/auth-storage');

const logger = createLogger('IPC');

/**
 * Get application version
 * @returns {string} App version
 */
function getAppVersion() {
  return app.getVersion();
}

/**
 * Show save dialog
 * @param {object} event - IPC event
 * @param {object} options - Dialog options
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<object>} Dialog result
 */
async function showSaveDialog(event, options, window) {
  const result = await dialog.showSaveDialog(window, options);
  return result;
}

/**
 * Show open dialog
 * @param {object} event - IPC event
 * @param {object} options - Dialog options
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<object>} Dialog result
 */
async function showOpenDialog(event, options, window) {
  const result = await dialog.showOpenDialog(window, options);
  return result;
}

/**
 * Write file to filesystem
 * @param {object} event - IPC event
 * @param {string} filePath - Path to write to
 * @param {string} data - Data to write
 * @returns {Promise<object>} Result object
 */
async function writeFile(event, filePath, data) {
  try {
    await fs.writeFile(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Read file from filesystem
 * @param {object} event - IPC event
 * @param {string} filePath - Path to read from
 * @returns {Promise<object>} Result object
 */
async function readFile(event, filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check for app updates (placeholder)
 * @returns {object} Update status
 */
function checkForUpdates() {
  return { hasUpdate: false };
}

/**
 * Handle webview loaded event
 * @param {object} event - IPC event
 * @param {object} data - Webview data
 */
function handleWebviewLoaded(event, data) {
  logger.info('Webview loaded successfully', data);
  // Future: Track webview state, send confirmation to renderer
}

/**
 * Handle webview error event
 * @param {object} event - IPC event
 * @param {object} error - Error details
 */
function handleWebviewError(event, error) {
  logger.error('Webview error', error);
  // Future: Log error, potentially show native error dialog
}

/**
 * Handle webview retry request
 * @param {object} event - IPC event
 * @param {object} data - Retry data
 */
function handleWebviewRetry(event, data) {
  logger.info('Webview retry requested', data);
  // Future: Restart webview or refresh connection
}

// Authentication storage handlers

/**
 * Store authentication credentials
 * @param {object} event - IPC event
 * @param {object} credentials - Auth credentials
 * @returns {boolean} Success status
 */
function storeAuthCredentials(event, credentials) {
  logger.info('Storing auth credentials', {
    email: credentials.email,
    rememberMe: credentials.rememberMe,
  });
  return authStorage.storeCredentials(credentials);
}

/**
 * Get stored authentication credentials
 * @returns {object|null} Stored credentials or null
 */
function getStoredAuthCredentials() {
  const credentials = authStorage.getStoredCredentials();
  if (credentials) {
    logger.info('Retrieved stored credentials', {
      email: credentials.email,
      rememberMe: credentials.rememberMe,
    });
  }
  return credentials;
}

/**
 * Clear stored authentication credentials
 */
function clearAuthCredentials() {
  logger.info('Clearing stored auth credentials');
  authStorage.clearStoredCredentials();
}

/**
 * Check if valid credentials exist
 * @returns {boolean} True if valid credentials exist
 */
function hasValidAuthCredentials() {
  return authStorage.hasValidCredentials();
}

/**
 * Get session info for debugging
 * @returns {object} Session information
 */
function getAuthSessionInfo() {
  return authStorage.getSessionInfo();
}

/**
 * Register all IPC handlers
 * @param {object} window - BrowserWindow instance
 */
function registerIpcHandlers(window) {
  // Core app handlers
  ipcMain.handle('get-app-version', getAppVersion);
  ipcMain.handle('show-save-dialog', (event, options) => showSaveDialog(event, options, window));
  ipcMain.handle('show-open-dialog', (event, options) => showOpenDialog(event, options, window));
  ipcMain.handle('write-file', writeFile);
  ipcMain.handle('read-file', readFile);
  ipcMain.handle('check-for-updates', checkForUpdates);

  // Webview communication handlers
  ipcMain.on('webview:loaded', handleWebviewLoaded);
  ipcMain.on('webview:error', handleWebviewError);
  ipcMain.on('webview:retry', handleWebviewRetry);

  // Authentication storage handlers
  ipcMain.handle('auth:store-credentials', storeAuthCredentials);
  ipcMain.handle('auth:get-credentials', getStoredAuthCredentials);
  ipcMain.handle('auth:clear-credentials', clearAuthCredentials);
  ipcMain.handle('auth:has-valid-credentials', hasValidAuthCredentials);
  ipcMain.handle('auth:get-session-info', getAuthSessionInfo);

  logger.info('IPC handlers registered for webview communication and authentication');
}

module.exports = {
  registerIpcHandlers,
};
