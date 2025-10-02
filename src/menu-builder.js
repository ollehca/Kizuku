/**
 * Simple menu builder - each function under 20 lines
 *
 * Note: Parameters prefixed with underscore (_) indicate intentionally unused variables
 * This is a standard ESLint convention to suppress "no-unused-vars" warnings
 */

const { Menu, app, dialog } = require('electron');
const { sendMenuAction, showOpenProjectDialog, showSaveAsDialog } = require('./menu-actions');
const authStorage = require('./services/auth-storage');

/**
 * Create new project menu item
 * @param {object} window - BrowserWindow instance
 * @returns {object} New project menu item
 */
function createNewProjectItem(window) {
  return {
    label: 'New Project',
    accelerator: 'CmdOrCtrl+N',
    click: () => sendMenuAction(window, 'new-project'),
  };
}

/**
 * Create file operation menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} File operation menu items
 */
function createFileOperationItems(window) {
  return [
    {
      label: 'Open Project',
      accelerator: 'CmdOrCtrl+O',
      click: () => showOpenProjectDialog(window),
    },
    {
      label: 'Save Project',
      accelerator: 'CmdOrCtrl+S',
      click: () => sendMenuAction(window, 'save-project'),
    },
    {
      label: 'Save As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => showSaveAsDialog(window),
    },
  ];
}

/**
 * Create project dashboard menu item
 * @param {object} window - BrowserWindow instance
 * @returns {object} Dashboard menu item
 */
function createDashboardItem(window) {
  return {
    label: 'Project Dashboard',
    accelerator: 'CmdOrCtrl+Shift+D',
    click: () => sendMenuAction(window, 'show-dashboard'),
  };
}

/**
 * Create basic file menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Basic file menu items
 */
function createBasicFileItems(window) {
  const dashboardItem = createDashboardItem(window);
  const newItem = createNewProjectItem(window);
  const fileItems = createFileOperationItems(window);
  return [dashboardItem, { type: 'separator' }, newItem, ...fileItems];
}

/**
 * Create file menu
 * @param {object} window - BrowserWindow instance
 * @returns {object} File menu
 */
function createFileMenu(window) {
  const basicItems = createBasicFileItems(window);
  const closeItem = process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' };

  return {
    label: 'File',
    submenu: [...basicItems, { type: 'separator' }, closeItem],
  };
}

/**
 * Create basic edit menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Basic edit menu items
 */
function createBasicEditItems(_window) {
  // underscore indicates intentionally unused parameter
  return [
    {
      role: 'undo', // Use built-in role - automatically forwards to web content
    },
    {
      role: 'redo', // Use built-in role - automatically forwards to web content
    },
  ];
}

/**
 * Create cut/copy/paste menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Cut/copy/paste menu items
 */
function createCutCopyPasteItems(_window) {
  // underscore indicates intentionally unused parameter
  return [
    {
      role: 'cut', // Use built-in role - automatically forwards to web content
    },
    {
      role: 'copy', // Use built-in role - automatically forwards to web content
    },
    {
      role: 'paste', // Use built-in role - automatically forwards to web content
    },
  ];
}

/**
 * Create select all menu item
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Select all menu items
 */
function createSelectAllItems(_window) {
  // underscore indicates intentionally unused parameter
  return [
    { type: 'separator' },
    {
      role: 'selectall', // Use built-in role - automatically forwards to web content
    },
  ];
}

/**
 * Create edit menu
 * @param {object} window - BrowserWindow instance
 * @returns {object} Edit menu
 */
function createEditMenu(window) {
  const basicItems = createBasicEditItems(window);
  const cutCopyPasteItems = createCutCopyPasteItems(window);
  const selectAllItems = createSelectAllItems(window);

  return {
    label: 'Edit',
    submenu: [...basicItems, { type: 'separator' }, ...cutCopyPasteItems, ...selectAllItems],
  };
}

/**
 * Create zoom menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Zoom menu items
 */
function createZoomItems(window) {
  return [
    {
      label: 'Zoom In',
      accelerator: 'CmdOrCtrl+Plus',
      click: () => sendMenuAction(window, 'zoom-in'),
    },
    {
      label: 'Zoom Out',
      accelerator: 'CmdOrCtrl+-',
      click: () => sendMenuAction(window, 'zoom-out'),
    },
    {
      label: 'Zoom to Fit',
      accelerator: 'CmdOrCtrl+0',
      click: () => sendMenuAction(window, 'zoom-fit'),
    },
  ];
}

/**
 * Create view menu
 * @param {object} window - BrowserWindow instance
 * @returns {object} View menu
 */
function createViewMenu(window) {
  const zoomItems = createZoomItems(window);

  const baseItems = [
    { role: 'reload', accelerator: 'CmdOrCtrl+R' },
    { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
    { type: 'separator' },
    ...zoomItems,
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ];

  // Always add dev tools option
  baseItems.push({ role: 'toggleDevTools' });

  return { label: 'View', submenu: baseItems };
}

/**
 * Create help menu
 * @param {object} window - BrowserWindow instance
 * @returns {object} Help menu
 */
function createHelpMenu(window) {
  return {
    role: 'help',
    submenu: [
      {
        label: 'About Kizu 築',
        click: () => {
          dialog.showMessageBox(window, {
            type: 'info',
            title: 'About Kizu 築',
            message: 'Kizu 築',
            detail: `Version: ${app.getVersion()}\nProfessional offline design tool`,
          });
        },
      },
    ],
  };
}

/**
 * Create session info menu item
 * @param {object} window - BrowserWindow instance
 * @returns {object} Session info menu item
 */
/* eslint-disable-next-line max-lines-per-function */
function createSessionInfoItem(window) {
  return {
    label: 'Session Info',
    click: () => {
      const sessionInfo = authStorage.getSessionInfo();
      const message = sessionInfo.hasSession
        ? `Logged in as: ${sessionInfo.email}`
        : 'No active session';

      const detail = sessionInfo.hasSession
        ? `Remember Me: ${sessionInfo.rememberMe ? 'Yes' : 'No'}\n` +
          `Days Remaining: ${sessionInfo.daysRemaining}\n` +
          `Expires: ${sessionInfo.expiresAt}\n` +
          `Stored: ${sessionInfo.storedAt}`
        : 'Please log in to view session information.';

      dialog.showMessageBox(window, {
        type: 'info',
        title: 'Session Information',
        message,
        detail,
      });
    },
  };
}

/**
 * Handle session clear confirmation
 * @param {object} window - BrowserWindow instance
 * @param {object} result - Dialog result
 */
function handleSessionClearConfirmation(window, result) {
  if (result.response === 1) {
    authStorage.clearStoredCredentials();
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Session Cleared',
      message: 'Stored session has been cleared successfully.',
    });
  }
}

/**
 * Create clear session menu item
 * @param {object} window - BrowserWindow instance
 * @returns {object} Clear session menu item
 */
function createClearSessionItem(window) {
  return {
    label: 'Clear Stored Session',
    click: () => {
      dialog
        .showMessageBox(window, {
          type: 'warning',
          title: 'Clear Stored Session',
          message: 'Are you sure you want to clear the stored session?',
          detail: 'You will need to log in again next time you open the app.',
          buttons: ['Cancel', 'Clear Session'],
          defaultId: 0,
        })
        .then((result) => handleSessionClearConfirmation(window, result));
    },
  };
}

/**
 * Create account menu for authentication options
 * @param {object} window - BrowserWindow instance
 * @returns {object} Account menu
 */
function createAccountMenu(window) {
  return {
    label: 'Account',
    submenu: [
      createSessionInfoItem(window),
      createClearSessionItem(window),
      { type: 'separator' },
      { label: 'Logout', click: () => sendMenuAction(window, 'logout') },
    ],
  };
}

/**
 * Create complete menu template
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Complete menu template
 */
function createMenuTemplate(window) {
  return [
    createFileMenu(window),
    createEditMenu(window),
    createAccountMenu(window),
    createViewMenu(window),
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    createHelpMenu(window),
  ];
}

/**
 * Build and set application menu
 * @param {object} window - BrowserWindow instance
 */
function buildApplicationMenu(window) {
  const template = createMenuTemplate(window);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildApplicationMenu };
