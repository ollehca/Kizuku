/**
 * Tab management functionality
 */

const { ipcMain } = require('electron');

// File tab management - restore from store
let openTabs = [];
let store;
let mainWindow;

/**
 * Initialize tab manager with store and window references
 * @param {object} storeInstance - Electron store instance
 * @param {object} window - BrowserWindow instance
 */
function initializeTabManager(storeInstance, window) {
  store = storeInstance;
  mainWindow = window;
  openTabs = store.get('openTabs', []);
}

/**
 * Save tabs to persistent storage
 */
function saveTabs() {
  store.set('openTabs', openTabs);
}

/**
 * Notify renderer about tab changes
 */
function notifyTabsUpdated() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tabs-updated', openTabs);
  }
}

/**
 * Find tab by ID
 * @param {string} tabId - Tab ID to find
 * @returns {object|undefined} Tab object or undefined
 */
function findTabById(tabId) {
  return openTabs.find((tab) => tab.id === tabId);
}

/**
 * Set all tabs as inactive except the specified one
 * @param {string} activeTabId - ID of tab to set as active
 */
function setActiveTab(activeTabId) {
  openTabs.forEach((tab) => {
    tab.isActive = tab.id === activeTabId;
  });
}

/**
 * Navigate to tab URL if it exists
 * @param {object} tab - Tab object with URL
 */
function navigateToTab(tab) {
  if (tab && tab.url && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      if (window.location.href !== '${tab.url}') {
        window.location.href = '${tab.url}';
      }
    `);
  }
}

/**
 * Navigate to dashboard when no tabs are open
 */
function navigateToDashboard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      if (window.location.pathname !== '/dashboard') {
        window.location.href = '/dashboard';
      }
    `);
  }
}

/**
 * Handle get open tabs request
 * @returns {Array} Array of open tabs
 */
function handleGetTabs() {
  return openTabs;
}

/**
 * Handle add tab request
 * @param {object} event - IPC event
 * @param {object} fileInfo - File information
 * @returns {Array} Updated tabs array
 */
function handleAddTab(event, fileInfo) {
  const existingTab = findTabById(fileInfo.id);

  if (!existingTab) {
    createNewTab(fileInfo);
  } else {
    updateExistingTab(existingTab, fileInfo);
  }

  console.log(
    '📊 Updated tabs:',
    openTabs.map((t) => `${t.name} (${t.isActive ? 'active' : 'inactive'})`)
  );

  saveTabs();
  notifyTabsUpdated();
  return openTabs;
}

function createNewTab(fileInfo) {
  openTabs.push({
    id: fileInfo.id,
    name: fileInfo.name || 'Untitled',
    url: fileInfo.url || '',
    isActive: true,
  });
  setActiveTab(fileInfo.id);
}

function updateExistingTab(existingTab, fileInfo) {
  setActiveTab(fileInfo.id);
  if (fileInfo.name) {
    existingTab.name = fileInfo.name;
  }
  if (fileInfo.url) {
    existingTab.url = fileInfo.url;
  }
}

/**
 * Handle remove tab request
 * @param {object} event - IPC event
 * @param {string} tabId - Tab ID to remove
 * @returns {Array} Updated tabs array
 */
function handleRemoveTab(event, tabId) {
  const tabToRemove = findTabById(tabId);
  const wasActive = tabToRemove && tabToRemove.isActive;

  openTabs = openTabs.filter((tab) => tab.id !== tabId);

  if (wasActive && openTabs.length > 0) {
    const newActiveTab = openTabs[openTabs.length - 1];
    newActiveTab.isActive = true;
    navigateToTab(newActiveTab);
  } else if (openTabs.length === 0) {
    navigateToDashboard();
  }

  console.log(
    '📊 Tabs after removal:',
    openTabs.map((t) => `${t.name} (${t.isActive ? 'active' : 'inactive'})`)
  );

  saveTabs();
  notifyTabsUpdated();
  return openTabs;
}

/**
 * Handle switch tab request
 * @param {object} event - IPC event
 * @param {string} tabId - Tab ID to switch to
 * @returns {Array} Updated tabs array
 */
function handleSwitchTab(event, tabId) {
  setActiveTab(tabId);

  const activeTab = findTabById(tabId);
  navigateToTab(activeTab);

  console.log('📊 Switched to tab:', activeTab?.name);

  saveTabs();
  notifyTabsUpdated();
  return openTabs;
}

/**
 * Register tab management IPC handlers
 */
function registerTabHandlers() {
  ipcMain.handle('get-open-tabs', handleGetTabs);
  ipcMain.handle('add-tab', handleAddTab);
  ipcMain.handle('remove-tab', handleRemoveTab);
  ipcMain.handle('switch-tab', handleSwitchTab);
}

module.exports = {
  initializeTabManager,
  registerTabHandlers,
};
