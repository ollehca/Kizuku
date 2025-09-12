/**
 * IPC handlers for desktop-specific functionality
 */

const { ipcMain, dialog, app, clipboard, nativeImage } = require('electron');
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

// Clipboard operation handlers

/**
 * Write text to clipboard
 * @param {object} event - IPC event
 * @param {string} text - Text to write
 */
function writeTextToClipboard(event, text) {
  try {
    clipboard.writeText(text);
    logger.info('Text written to clipboard', { length: text.length });
    return { success: true };
  } catch (error) {
    logger.error('Failed to write text to clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read text from clipboard
 * @returns {string} Clipboard text content
 */
function readTextFromClipboard() {
  try {
    const text = clipboard.readText();
    logger.info('Text read from clipboard', { length: text.length });
    return { success: true, data: text };
  } catch (error) {
    logger.error('Failed to read text from clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Write HTML to clipboard
 * @param {object} event - IPC event
 * @param {string} html - HTML to write
 */
function writeHTMLToClipboard(event, html) {
  try {
    clipboard.writeHTML(html);
    logger.info('HTML written to clipboard', { length: html.length });
    return { success: true };
  } catch (error) {
    logger.error('Failed to write HTML to clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read HTML from clipboard
 * @returns {string} Clipboard HTML content
 */
function readHTMLFromClipboard() {
  try {
    const html = clipboard.readHTML();
    logger.info('HTML read from clipboard', { length: html.length });
    return { success: true, data: html };
  } catch (error) {
    logger.error('Failed to read HTML from clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Write image to clipboard
 * @param {object} event - IPC event
 * @param {string} image - Base64 image data
 */
function writeImageToClipboard(event, image) {
  try {
    const nativeImg = nativeImage.createFromDataURL(image);
    clipboard.writeImage(nativeImg);
    logger.info('Image written to clipboard');
    return { success: true };
  } catch (error) {
    logger.error('Failed to write image to clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read image from clipboard
 * @returns {string} Base64 image data
 */
function readImageFromClipboard() {
  try {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return { success: false, error: 'No image in clipboard' };
    }
    const dataURL = image.toDataURL();
    logger.info('Image read from clipboard');
    return { success: true, data: dataURL };
  } catch (error) {
    logger.error('Failed to read image from clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear clipboard
 */
function clearClipboard() {
  try {
    clipboard.clear();
    logger.info('Clipboard cleared');
    return { success: true };
  } catch (error) {
    logger.error('Failed to clear clipboard', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if clipboard has text
 * @returns {boolean} True if clipboard has text
 */
function clipboardHasText() {
  try {
    const hasText = clipboard.has('text/plain');
    return { success: true, data: hasText };
  } catch (error) {
    logger.error('Failed to check clipboard for text', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if clipboard has image
 * @returns {boolean} True if clipboard has image
 */
function clipboardHasImage() {
  try {
    const hasImage = clipboard.has('image');
    return { success: true, data: hasImage };
  } catch (error) {
    logger.error('Failed to check clipboard for image', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register core IPC handlers
 * @param {object} window - BrowserWindow instance
 */
function registerCoreHandlers(window) {
  ipcMain.handle('get-app-version', getAppVersion);
  ipcMain.handle('show-save-dialog', (event, options) => showSaveDialog(event, options, window));
  ipcMain.handle('show-open-dialog', (event, options) => showOpenDialog(event, options, window));
  ipcMain.handle('write-file', writeFile);
  ipcMain.handle('read-file', readFile);
  ipcMain.handle('check-for-updates', checkForUpdates);
}

/**
 * Register webview IPC handlers
 */
function registerWebviewHandlers() {
  ipcMain.on('webview:loaded', handleWebviewLoaded);
  ipcMain.on('webview:error', handleWebviewError);
  ipcMain.on('webview:retry', handleWebviewRetry);
}

/**
 * Register auth IPC handlers
 */
function registerAuthHandlers() {
  ipcMain.handle('auth:store-credentials', storeAuthCredentials);
  ipcMain.handle('auth:get-credentials', getStoredAuthCredentials);
  ipcMain.handle('auth:clear-credentials', clearAuthCredentials);
  ipcMain.handle('auth:has-valid-credentials', hasValidAuthCredentials);
  ipcMain.handle('auth:get-session-info', getAuthSessionInfo);
}

/**
 * Register clipboard IPC handlers
 */
function registerClipboardHandlers() {
  ipcMain.handle('clipboard:write-text', writeTextToClipboard);
  ipcMain.handle('clipboard:read-text', readTextFromClipboard);
  ipcMain.handle('clipboard:write-html', writeHTMLToClipboard);
  ipcMain.handle('clipboard:read-html', readHTMLFromClipboard);
  ipcMain.handle('clipboard:write-image', writeImageToClipboard);
  ipcMain.handle('clipboard:read-image', readImageFromClipboard);
  ipcMain.handle('clipboard:clear', clearClipboard);
  ipcMain.handle('clipboard:has-text', clipboardHasText);
  ipcMain.handle('clipboard:has-image', clipboardHasImage);
}

/**
 * Register all IPC handlers
 * @param {object} window - BrowserWindow instance
 */
function registerIpcHandlers(window) {
  registerCoreHandlers(window);
  registerWebviewHandlers();
  registerAuthHandlers();
  registerClipboardHandlers();
  logger.info(
    'IPC handlers registered for webview communication, authentication, and clipboard operations'
  );
}

module.exports = {
  registerIpcHandlers,
};
