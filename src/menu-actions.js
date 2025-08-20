/**
 * Menu action handlers for PenPot Desktop
 */

const { dialog } = require('electron');

/**
 * Send menu action to renderer process or handle directly for BrowserView
 * @param {object} window - BrowserWindow instance
 * @param {string} action - Action name
 * @param {any} data - Optional action data
 */
function sendMenuAction(window, action, data) {
  // Since we're using webview tag, send actions to main window which will handle webview
  window.webContents.send('menu-action', action, data);
}

/**
 * Show file open dialog for projects
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showOpenProjectDialog(window) {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: [
      { name: 'PenPot Files', extensions: ['penpot'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    sendMenuAction(window, 'open-project', result.filePaths[0]);
  }
}

/**
 * Show file save dialog for projects
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showSaveAsDialog(window) {
  const result = await dialog.showSaveDialog(window, {
    defaultPath: 'Untitled Project.penpot',
    filters: [
      { name: 'PenPot Files', extensions: ['penpot'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled) {
    sendMenuAction(window, 'save-as-project', result.filePath);
  }
}

/**
 * Show image import dialog
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showImportImageDialog(window) {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    sendMenuAction(window, 'import-images', result.filePaths);
  }
}

/**
 * Show font import dialog
 * @param {object} window - BrowserWindow instance
 * @returns {Promise<void>}
 */
async function showImportFontDialog(window) {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    sendMenuAction(window, 'import-fonts', result.filePaths);
  }
}

module.exports = {
  sendMenuAction,
  showOpenProjectDialog,
  showSaveAsDialog,
  showImportImageDialog,
  showImportFontDialog,
};
