/**
 * IPC handlers for desktop-specific functionality
 */

const { ipcMain, dialog, app, clipboard, nativeImage } = require('electron');
const fs = require('fs').promises;
const { createLogger } = require('./utils/logger');
const authStorage = require('./services/auth-storage');
const { registerBackendIpcHandlers } = require('./services/backend-ipc-handlers');
const { launchWorkspace } = require('./utils/workspace-launcher');
const { getFigmaImporter } = require('./services/figma/figma-importer');
const mockBackend = require('./services/penpot-mock-backend');
const transit = require('transit-js');
const { registerThemeHandlers } = require('./services/theme-ipc-handlers');
const autosave = require('./services/autosave-service');
// QUARANTINED: Backend injection not needed for v1.0 file-based workflow
// const { createPenpotFrontendInjector } = require('./services/figma/penpot-backend-uploader');

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
 * Handle workspace launch
 * @param {object} event - IPC event
 * @param {string} filePath - Path to .kizuku file
 * @param {object} window - BrowserWindow instance
 */
async function handleLaunchWorkspace(event, filePath, window) {
  try {
    logger.info('Launching workspace', { filePath });
    const result = await launchWorkspace(filePath, window);
    return result;
  } catch (error) {
    logger.error('Workspace launch failed', { filePath, error });
    return { success: false, error: error.message };
  }
}

/**
 * Handle Figma file import
 * @param {object} event - IPC event
 * @param {string} filePath - Path to Figma file
 * @param {object} options - Import options
 * @returns {Promise<object>} Import result
 */
async function handleFigmaImport(event, filePath, options = {}) {
  try {
    logger.info('Starting Figma import', { filePath, options });
    const importer = getFigmaImporter();

    // Set up progress tracking
    importer.on('progress', (progress) => {
      event.sender.send('figma:import-progress', progress);
    });

    importer.on('status-change', (status) => {
      event.sender.send('figma:import-status', status);
    });

    const result = await importer.importFromFile(filePath, options);
    return result;
  } catch (error) {
    logger.error('Figma import failed', { filePath, error });
    return { success: false, error: error.message };
  }
}

/**
 * Validate Figma file before import
 * @param {object} event - IPC event
 * @param {string} filePath - Path to Figma file
 * @returns {Promise<object>} Validation result
 */
async function handleFigmaValidation(event, filePath) {
  try {
    const importer = getFigmaImporter();
    const validation = await importer.validateFile(filePath);
    return { success: true, ...validation };
  } catch (error) {
    logger.error('Figma validation failed', { filePath, error });
    return { success: false, error: error.message };
  }
}

/**
 * Get current Figma import status
 * @returns {object} Status object
 */
function getFigmaImportStatus() {
  const importer = getFigmaImporter();
  return importer.getStatus();
}

/**
 * Cancel current Figma import
 * @returns {object} Result
 */
function cancelFigmaImport() {
  const importer = getFigmaImporter();
  importer.cancel();
  return { success: true };
}

/**
 * Handle file open request (for drag-and-drop and double-click)
 * @param {object} event - IPC event
 * @param {string} filePath - Path to file
 * @returns {Promise<object>} Import result
 */
async function handleFileOpen(event, filePath, _window) {
  console.log('🔵 IPC handleFileOpen called with:', filePath);
  logger.info('File open requested', { filePath });

  // Delegate to the main.js handleFileOpen function
  // which shows the progress dialog and navigates to dashboard
  const mainHandleFileOpen = require('./main').handleFileOpen;

  if (mainHandleFileOpen) {
    console.log('✅ Delegating to main.js handleFileOpen with progress dialog');
    const result = await mainHandleFileOpen(filePath);
    return result;
  } else {
    // Fallback if for some reason the export isn't available
    console.warn('⚠️ Could not find main.handleFileOpen, using fallback');
    try {
      const importer = getFigmaImporter();
      const result = await importer.importFromFile(filePath);
      return result;
    } catch (error) {
      logger.error('File open failed', { filePath, error });
      return { success: false, error: error.message };
    }
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
  ipcMain.handle('launch-workspace', (event, filePath) =>
    handleLaunchWorkspace(event, filePath, window)
  );
}

/**
 * Register Figma import IPC handlers
 * @param {object} window - BrowserWindow instance
 */
function registerFigmaHandlers(window) {
  ipcMain.handle('figma:import-file', handleFigmaImport);
  ipcMain.handle('figma:validate-file', handleFigmaValidation);
  ipcMain.handle('figma:get-import-status', getFigmaImportStatus);
  ipcMain.handle('figma:cancel-import', cancelFigmaImport);
  ipcMain.handle('handle-file-open', (event, filePath) => handleFileOpen(event, filePath, window));
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
 * Handle mock backend API command
 * @param {object} event - IPC event
 * @param {string} commandName - API command name
 * @param {object} params - Command parameters
 * @returns {Promise<object>} Command result with transit-encoded response
 */
async function handleMockBackendCommand(event, commandName, params = {}) {
  logger.info('Mock backend command', { commandName, params });
  const result = await mockBackend.handleCommand(commandName, params);

  // Encode the result as transit format (what PenPot expects)
  const writer = transit.writer('json-verbose');
  const transitEncoded = writer.write(result); // Call write() on the writer object

  // Return an object with both the raw result and transit-encoded version
  return {
    raw: result,
    transit: transitEncoded,
  };
}

/**
 * Get mock profile
 * @returns {Promise<object>} Mock profile
 */
async function getMockBackendProfile() {
  return await mockBackend.getMockProfile();
}

/**
 * Check if user is authenticated (has valid license)
 * @returns {Promise<boolean>} Authentication status
 */
async function checkMockBackendAuth() {
  return await mockBackend.isAuthenticated();
}

/**
 * Register mock backend IPC handlers (for private license users)
 */
function registerMockBackendHandlers() {
  ipcMain.handle('mock-backend:command', handleMockBackendCommand);
  ipcMain.handle('mock-backend:get-profile', getMockBackendProfile);
  ipcMain.handle('mock-backend:is-authenticated', checkMockBackendAuth);
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
 * Register autosave IPC handlers and start the service
 */
function registerAutosaveHandlers() {
  autosave.setFileDataProvider((fileId) => {
    const files = mockBackend.getCreatedFiles();
    return files.get(fileId) || null;
  });

  // Restore autosaved files into createdFiles cache
  const saved = autosave.loadAllAutosavedFiles();
  const cache = mockBackend.getCreatedFiles();
  for (const { id: fileId, data } of saved) {
    if (!cache.has(fileId)) {
      cache.set(fileId, data);
      console.log(`📂 Restored file from autosave: ${fileId}`);
    }
  }

  autosave.startAutosave();

  ipcMain.handle('autosave:get-status', () => ({
    active: autosave.isAutosaving(),
  }));
}

/**
 * Register all IPC handlers
 * @param {object} window - BrowserWindow instance
 */
function registerIpcHandlers(window) {
  registerCoreHandlers(window);
  registerWebviewHandlers();
  registerAuthHandlers();
  registerMockBackendHandlers();
  registerClipboardHandlers();
  registerBackendIpcHandlers();
  registerFigmaHandlers(window);
  registerThemeHandlers();
  registerAutosaveHandlers();
  logger.info('IPC handlers registered (incl. autosave)');
}

module.exports = {
  registerIpcHandlers,
};
