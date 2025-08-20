const { contextBridge, ipcRenderer } = require('electron');

console.log('🚀 PenPot Desktop preload script starting...');
console.log('🔧 contextBridge available:', !!contextBridge);
console.log('🔧 ipcRenderer available:', !!ipcRenderer);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action, data) => callback(action, data));
  },
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  },

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // File tab management
  getTabs: () => ipcRenderer.invoke('get-open-tabs'),
  addTab: (fileInfo) => ipcRenderer.invoke('add-tab', fileInfo),
  removeTab: (tabId) => ipcRenderer.invoke('remove-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
  onTabsUpdated: (callback) => {
    ipcRenderer.on('tabs-updated', (event, tabs) => callback(tabs));
  },

  // Platform info
  platform: process.platform,
  isDesktop: true,

  // Desktop-specific features
  openExternal: (url) => {
    // This will be handled by the main process
    window.open(url, '_blank');
  },

  // Manual test function for debugging
  testTabDetection: () => {
    console.log('🧪 Manual tab detection test via electronAPI');
    const url = window.location.href;
    const fileName = getFileNameFromTitle() || 'Manual Test Tab';

    console.log('🧪 Current URL:', url);
    console.log('🧪 Detected file name:', fileName);

    return addTabViaIPC({
      id: 'manual-test-' + Date.now(),
      name: fileName,
      url: url,
    });
  },
});

// Helper functions for tab detection
function getFileNameFromTitle() {
  if (document.title && document.title !== 'Penpot') {
    return document.title.replace(' - Penpot', '');
  }
  return null;
}

function addTabViaIPC(tabInfo) {
  return ipcRenderer
    .invoke('add-tab', tabInfo)
    .then((result) => {
      console.log('🧪 Manual addTab result:', result);
      return result;
    })
    .catch((error) => {
      console.error('🧪 Manual addTab error:', error);
      throw error;
    });
}

function extractFileId(url) {
  const workspacePattern = /workspace\?.*file-id=([^&]+)/;
  const match = url.match(workspacePattern);
  return match ? match[1] : null;
}

// Simple automatic file detection
function detectAndAddTabs() {
  console.log('🔍 Checking for file to create tab');
  const url = window.location.href;
  console.log('🔍 Current URL:', url);

  const fileId = extractFileId(url);
  if (fileId) {
    createTabForFile(fileId, url);
  } else {
    console.log('❌ No workspace file detected');
  }
}

function createTabForFile(fileId, url) {
  console.log('✅ File detected, ID:', fileId);
  const fileName = getFileNameFromTitle() || 'Untitled';
  console.log('📝 Auto-creating tab for:', fileName);

  if (window.electronAPI) {
    window.electronAPI
      .addTab({ id: fileId, name: fileName, url })
      .then((result) => console.log('📝 Auto tab created:', result))
      .catch((error) => console.error('❌ Auto tab creation failed:', error));
  }
}

// Watch for URL changes and page loads
let lastUrl = window.location.href;
const urlObserver = new window.MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    console.log('🔄 URL changed, checking for new file');
    lastUrl = window.location.href;
    setTimeout(detectAndAddTabs, 1000); // Wait for page to load
  }
});

// Start observing when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 Starting automatic file detection');
  urlObserver.observe(document, { subtree: true, childList: true });
  setTimeout(detectAndAddTabs, 2000); // Initial check
});

// Also check on window load
window.addEventListener('load', () => {
  setTimeout(detectAndAddTabs, 3000);
});

console.log('✅ PenPot Desktop preload script loaded successfully');
