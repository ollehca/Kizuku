/**
 * Simple menu builder - each function under 20 lines
 *
 * Note: Parameters prefixed with underscore (_) indicate intentionally unused variables
 * This is a standard ESLint convention to suppress "no-unused-vars" warnings
 */

const { Menu, app, dialog } = require('electron');
const { sendMenuAction, showOpenProjectDialog, showSaveAsDialog } = require('./menu-actions');

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
 * Create basic file menu items
 * @param {object} window - BrowserWindow instance
 * @returns {Array} Basic file menu items
 */
function createBasicFileItems(window) {
  const newItem = createNewProjectItem(window);
  const fileItems = createFileOperationItems(window);
  return [newItem, ...fileItems];
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

  const baseItems = [...zoomItems, { type: 'separator' }, { role: 'togglefullscreen' }];

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
        label: 'About PenPot Desktop',
        click: () => {
          dialog.showMessageBox(window, {
            type: 'info',
            title: 'About PenPot Desktop',
            message: 'PenPot Desktop',
            detail: `Version: ${app.getVersion()}\nProfessional offline design tool`,
          });
        },
      },
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
