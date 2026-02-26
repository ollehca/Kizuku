/**
 * Tab management functionality
 */

const { ipcMain, app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const KIZUKU_TEAM_ID = '00000000-0000-0000-0000-000000000001';

// File tab management - restore from store
let openTabs = [];
let store;
let mainWindow;

/**
 * Get the file path for persisted tabs JSON
 * @returns {string} Absolute path to kizuku-tabs.json
 */
function getTabsFilePath() {
  return path.join(app.getPath('userData'), 'kizuku-tabs.json');
}

/**
 * Read tabs from the JSON file fallback
 * @returns {Array} Persisted tabs or empty array
 */
function readTabsFromFile() {
  try {
    const filePath = getTabsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Failed to read tabs file:', err.message);
  }
  return [];
}

/**
 * Initialize tab manager with store and window references
 * @param {object} storeInstance - Electron store instance
 * @param {object} window - BrowserWindow instance
 */
function initializeTabManager(storeInstance, window) {
  store = storeInstance;
  mainWindow = window;
  openTabs = store.get('openTabs', []);

  if (openTabs.length === 0) {
    openTabs = readTabsFromFile();
  }

  openTabs = deduplicateTabs(openTabs);
}

/**
 * Remove duplicate tabs by name, keeping the most recent (last) one.
 * Preserves the active state on the kept tab if any duplicate was active.
 * @param {Array} tabs - Array of tab objects
 * @returns {Array} Deduplicated tabs array
 */
function deduplicateTabs(tabs) {
  const seen = new Map();
  for (const tab of tabs) {
    const existing = seen.get(tab.name);
    if (existing) {
      if (tab.isActive) {
        existing.isActive = false;
      }
    }
    seen.set(tab.name, tab);
  }
  return Array.from(seen.values());
}

/**
 * Save tabs to persistent storage and JSON file
 */
function saveTabs() {
  store.set('openTabs', openTabs);
  try {
    fs.writeFileSync(getTabsFilePath(), JSON.stringify(openTabs));
  } catch (err) {
    console.warn('Failed to write tabs file:', err.message);
  }
}

/**
 * Notify renderer about tab changes via IPC and direct JS
 */
function notifyTabsUpdated() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('tabs-updated', openTabs);
  const tabsJson = JSON.stringify(openTabs);
  const script =
    `window.__kizukuCurrentTabs=${tabsJson};` +
    'if(window.updateTabsDisplay){' +
    `window.updateTabsDisplay(${tabsJson})}`;
  mainWindow.webContents.executeJavaScript(script).catch(() => {});
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
 * Navigate to tab URL if it exists.
 * Extracts hash fragment for SPA navigation to avoid full page reload.
 * @param {object} tab - Tab object with URL
 * @returns {Promise<void>} Resolves when navigation is dispatched
 */
function navigateToTab(tab) {
  if (!tab || !tab.url || !mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve();
  }
  const hashIdx = tab.url.indexOf('#');
  const hash = hashIdx >= 0 ? tab.url.substring(hashIdx) : tab.url;
  return mainWindow.webContents
    .executeJavaScript(`window.location.hash = '${hash}';`)
    .catch(() => {});
}

/**
 * Navigate to dashboard when no tabs are open
 */
function navigateToDashboard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const dashHash = `#/dashboard/recent?team-id=${KIZUKU_TEAM_ID}`;
    mainWindow.webContents
      .executeJavaScript(`window.location.hash = '${dashHash}';`)
      .catch(() => {});
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

  if (existingTab) {
    updateExistingTab(existingTab, fileInfo);
  } else {
    createNewTab(fileInfo);
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
    const newActiveTab = openTabs.at(-1);
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
 * Handle reorder tabs request (drag and drop)
 * @param {object} event - IPC event
 * @param {object} indices - { fromIndex, toIndex }
 * @returns {Array} Updated tabs array
 */
function handleReorderTabs(event, { fromIndex, toIndex }) {
  if (fromIndex < 0 || fromIndex >= openTabs.length) {
    return openTabs;
  }
  if (toIndex < 0 || toIndex >= openTabs.length) {
    return openTabs;
  }
  const [moved] = openTabs.splice(fromIndex, 1);
  openTabs.splice(toIndex, 0, moved);

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
 * Handle navigate-to-dashboard request
 */
function handleNavigateDashboard() {
  openTabs.forEach((tab) => {
    tab.isActive = false;
  });
  saveTabs();
  notifyTabsUpdated();
  navigateToDashboard();
}

/**
 * Create a new file via the mock backend and open it
 * @returns {Promise<object>} The created file info
 */
async function handleCreateNewFile() {
  const mockBackend = require('./services/penpot-mock-backend');
  const existing = openTabs.filter((t) => t.name.startsWith('Untitled'));
  const fileName = existing.length === 0 ? 'Untitled' : `Untitled ${existing.length + 1}`;
  const result = await mockBackend.handleCommand('create-file', {
    name: fileName,
    'project-id': mockBackend.getKizukuProjectId(),
  });
  if (!result || result.error) {
    return { success: false };
  }
  const teamId = mockBackend.getKizukuTeamId();
  const projId = mockBackend.getKizukuProjectId();
  const fileUrl =
    `http://localhost:3449/#/workspace` +
    `?team-id=${teamId}` +
    `&project-id=${projId}` +
    `&file-id=${result.id}`;

  handleAddTab(null, { id: result.id, name: fileName, url: fileUrl });
  navigateToTab(findTabById(result.id));
  return { success: true, fileId: result.id };
}

/**
 * Register tab management IPC handlers
 */
function registerTabHandlers() {
  ipcMain.handle('get-open-tabs', handleGetTabs);
  ipcMain.handle('add-tab', handleAddTab);
  ipcMain.handle('remove-tab', handleRemoveTab);
  ipcMain.handle('switch-tab', handleSwitchTab);
  ipcMain.handle('reorder-tabs', handleReorderTabs);
  ipcMain.handle('navigate-dashboard', handleNavigateDashboard);
  ipcMain.handle('create-new-file', handleCreateNewFile);
}

/**
 * Add a tab from the main process (not via IPC)
 * @param {object} fileInfo - File information { id, name, url }
 * @returns {Array} Updated tabs array
 */
function addTabFromMain(fileInfo) {
  return handleAddTab(null, fileInfo);
}

/**
 * Find a tab by its display name
 * @param {string} name - Tab name to search for
 * @returns {object|undefined} Tab object or undefined
 */
function findTabByName(name) {
  return openTabs.find((tab) => tab.name === name);
}

/**
 * Switch to an existing tab by ID (for use from main process)
 * @param {string} tabId - Tab ID to switch to
 * @returns {Array} Updated tabs array
 */
function switchToExistingTab(tabId) {
  setActiveTab(tabId);
  const activeTab = findTabById(tabId);
  navigateToTab(activeTab);
  saveTabs();
  notifyTabsUpdated();
  return openTabs;
}

/**
 * Send restored tabs to the renderer after header bar is ready.
 * Returns a promise so callers can wait for navigation to complete.
 * @returns {Promise<void>} Resolves when navigation is dispatched
 */
async function sendRestoredTabs() {
  if (openTabs.length > 0) {
    notifyTabsUpdated();
    const activeTab = openTabs.find((tab) => tab.isActive);
    if (activeTab) {
      await navigateToTab(activeTab);
    }
  }
}

module.exports = {
  initializeTabManager,
  registerTabHandlers,
  addTabFromMain,
  sendRestoredTabs,
  findTabByName,
  switchToExistingTab,
};
