/**
 * Menu action handlers for Kizuku
 */

const { dialog } = require('electron');
const { createLogger } = require('./utils/logger');
const { showProjectDashboard } = require('./utils/dashboard-launcher');

const logger = createLogger('MenuActions');

/**
 * Send menu action to renderer process or handle directly for BrowserView
 * @param {object} window - BrowserWindow instance
 * @param {string} action - Action name
 * @param {any} data - Optional action data
 */
function sendMenuAction(window, action, data) {
  // Handle dashboard action directly
  if (action === 'show-dashboard') {
    showProjectDashboard();
    return;
  }

  // Since we're using webview tag, send actions to main window which will handle webview
  window.webContents.send('menu-action', action, data);
}

/**
 * Get project file filters configuration
 */
function getProjectFileFilters() {
  return [
    { name: 'Kizuku Files', extensions: ['kizuku'] },
    { name: 'Kizuku Files (Legacy)', extensions: ['penpot'] },
    { name: 'Figma Files', extensions: ['fig'] },
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] },
  ];
}

/**
 * Handle open dialog result
 */
function handleOpenDialogResult(result, window, logger) {
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    logger.info('Project file selected for opening', { filePath });
    sendMenuAction(window, 'open-project', filePath);
  } else {
    logger.info('Open project dialog cancelled');
  }
}

/**
 * Show file open dialog for projects
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showOpenProjectDialog(window) {
  try {
    logger.info('Opening project file dialog');
    const result = await dialog.showOpenDialog(window, {
      title: 'Open Kizuku Project',
      properties: ['openFile'],
      filters: getProjectFileFilters(),
    });
    handleOpenDialogResult(result, window, logger);
  } catch (error) {
    logger.error('Error showing open project dialog', error);
    dialog.showErrorBox('Error', `Failed to open file dialog: ${error.message}`);
  }
}

/**
 * Handle save dialog result
 */
function handleSaveDialogResult(result, window, logger) {
  if (result.canceled) {
    logger.info('Save project dialog cancelled');
  } else {
    logger.info('Save location selected', { filePath: result.filePath });
    sendMenuAction(window, 'save-as-project', result.filePath);
  }
}

/**
 * Show file save dialog for projects
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showSaveAsDialog(window) {
  try {
    logger.info('Opening save project dialog');
    const result = await dialog.showSaveDialog(window, {
      title: 'Save Kizuku Project',
      defaultPath: 'Untitled Project.kizuku',
      filters: getProjectFileFilters(),
    });
    handleSaveDialogResult(result, window, logger);
  } catch (error) {
    logger.error('Error showing save project dialog', error);
    dialog.showErrorBox('Error', `Failed to open save dialog: ${error.message}`);
  }
}

/**
 * Get image file filters configuration
 */
function getImageFileFilters() {
  return [
    {
      name: 'Images',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'],
    },
    { name: 'All Files', extensions: ['*'] },
  ];
}

/**
 * Handle import dialog result
 */
function handleImportDialogResult(result, window, logger, config) {
  if (!result.canceled && result.filePaths.length > 0) {
    logger.info(`${config.itemType} selected for import`, {
      count: result.filePaths.length,
      files: result.filePaths,
    });
    sendMenuAction(window, config.actionType, result.filePaths);
  } else {
    logger.info(`${config.itemType} import dialog cancelled`);
  }
}

/**
 * Show image import dialog
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showImportImageDialog(window) {
  try {
    logger.info('Opening image import dialog');
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Images to Kizuku',
      properties: ['openFile', 'multiSelections'],
      filters: getImageFileFilters(),
    });
    handleImportDialogResult(result, window, logger, {
      actionType: 'import-images',
      itemType: 'Images',
    });
  } catch (error) {
    logger.error('Error showing image import dialog', error);
    dialog.showErrorBox('Error', `Failed to open image import dialog: ${error.message}`);
  }
}

/**
 * Get font file filters configuration
 */
function getFontFileFilters() {
  return [
    { name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
    { name: 'All Files', extensions: ['*'] },
  ];
}

/**
 * Show font import dialog
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showImportFontDialog(window) {
  try {
    logger.info('Opening font import dialog');
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Fonts to Kizuku',
      properties: ['openFile', 'multiSelections'],
      filters: getFontFileFilters(),
    });
    handleImportDialogResult(result, window, logger, {
      actionType: 'import-fonts',
      itemType: 'Fonts',
    });
  } catch (error) {
    logger.error('Error showing font import dialog', error);
    dialog.showErrorBox('Error', `Failed to open font import dialog: ${error.message}`);
  }
}

module.exports = {
  sendMenuAction,
  showOpenProjectDialog,
  showSaveAsDialog,
  showImportImageDialog,
  showImportFontDialog,
};
