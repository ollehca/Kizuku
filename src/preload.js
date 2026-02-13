const { contextBridge, ipcRenderer, webUtils, webFrame } = require('electron');

// ============================================================================
// CRITICAL: Inject fetch interceptor IMMEDIATELY into main world
// This MUST run before any page scripts to intercept PenPot's API calls
// ============================================================================
const FETCH_INTERCEPTOR = `
(function() {
  if (window.__kizuFetchInterceptorInstalled) return;
  window.__kizuFetchInterceptorInstalled = true;

  const originalFetch = window.fetch;
  const MOCK_SERVER = 'http://localhost:9999';

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu Fetch] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalFetch(mockUrl, {
        ...init,
        method: init.method || 'GET',
        headers: { ...init.headers },
        body: init.body,
      });
    }
    return originalFetch(input, init);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (url && url.includes('/api/rpc/command/')) {
      const apiPath = url.substring(url.indexOf('/api/rpc/command/'));
      const mockUrl = MOCK_SERVER + apiPath;
      console.log('🔄 [Kizu XHR] Redirecting:', url.split('/api/rpc/command/')[1]);
      return originalXHROpen.call(this, method, mockUrl, ...args);
    }
    return originalXHROpen.call(this, method, url, ...args);
  };

  console.log('✅ [Kizu Preload] Fetch interceptor installed in main world');
})();
`;

// Execute in main world IMMEDIATELY (before page scripts run)
webFrame.executeJavaScript(FETCH_INTERCEPTOR).catch(err => {
  console.error('❌ [Preload] Failed to inject fetch interceptor:', err);
});

console.log('🚀 Kizu preload script starting...');
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

  // Clipboard operations
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
    readText: () => ipcRenderer.invoke('clipboard:read-text'),
    writeHTML: (html) => ipcRenderer.invoke('clipboard:write-html', html),
    readHTML: () => ipcRenderer.invoke('clipboard:read-html'),
    writeImage: (image) => ipcRenderer.invoke('clipboard:write-image', image),
    readImage: () => ipcRenderer.invoke('clipboard:read-image'),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    hasText: () => ipcRenderer.invoke('clipboard:has-text'),
    hasImage: () => ipcRenderer.invoke('clipboard:has-image'),
  },

  // Desktop-specific features
  openExternal: (url) => {
    // This will be handled by the main process
    window.open(url, '_blank');
  },

  // Workspace launcher
  launchWorkspace: (filePath) => ipcRenderer.invoke('launch-workspace', filePath),

  // File open (for drag-and-drop and OS file associations)
  handleFileOpen: (filePath) => ipcRenderer.invoke('handle-file-open', filePath),

  // Get file path from File object (for drag-and-drop) - PRIMARY METHOD
  getFilePathForDrop: (file) => {
    try {
      const filePath = webUtils.getPathForFile(file);
      console.log('✅ [webUtils] Got file path:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ [webUtils] Failed to get file path:', error);
      return null;
    }
  },

  // Drag-drop health check - verify main process handlers are alive
  dragDropHealthCheck: () => ipcRenderer.invoke('drag-drop:health-check'),

  // Drag-drop file handler - FALLBACK METHOD (if webUtils fails)
  dragDropFileHandler: (filePath) => ipcRenderer.invoke('drag-drop:file-dropped', filePath),

  // Import progress updates
  onImportProgress: (callback) => {
    ipcRenderer.on('import-progress', (event, data) => callback(data));
  },

  // Open imported file in workspace
  openImportedFile: (filePath) => ipcRenderer.invoke('open-imported-file', filePath),

  // Figma import
  figmaAPI: {
    importFile: (filePath, options) => ipcRenderer.invoke('figma:import-file', filePath, options),
    validateFile: (filePath) => ipcRenderer.invoke('figma:validate-file', filePath),
    getImportStatus: () => ipcRenderer.invoke('figma:get-import-status'),
    cancelImport: () => ipcRenderer.invoke('figma:cancel-import'),
    onImportProgress: (callback) => {
      ipcRenderer.on('figma:import-progress', (event, progress) => callback(progress));
    },
    onImportStatus: (callback) => {
      ipcRenderer.on('figma:import-status', (event, status) => callback(status));
    },
  },

  // Authentication storage (legacy)
  auth: {
    storeCredentials: (credentials) => ipcRenderer.invoke('auth:store-credentials', credentials),
    getCredentials: () => ipcRenderer.invoke('auth:get-credentials'),
    clearCredentials: () => ipcRenderer.invoke('auth:clear-credentials'),
    hasValidCredentials: () => ipcRenderer.invoke('auth:has-valid-credentials'),
    getSessionInfo: () => ipcRenderer.invoke('auth:get-session-info'),
  },

  // Mock Backend API (for private license users - replaces PenPot backend)
  mockBackend: {
    command: (commandName, params) => ipcRenderer.invoke('mock-backend:command', commandName, params),
    getProfile: () => ipcRenderer.invoke('mock-backend:get-profile'),
    isAuthenticated: () => ipcRenderer.invoke('mock-backend:is-authenticated'),
  },

  // Backend Services API
  backend: {
    // Config API
    config: {
      get: () => ipcRenderer.invoke('backend:config:get'),
      getValue: (key) => ipcRenderer.invoke('backend:config:get-value', key),
      isFeatureEnabled: (featureName) =>
        ipcRenderer.invoke('backend:config:is-feature-enabled', featureName),
    },

    // Auth API
    auth: {
      authenticate: (credentials) => ipcRenderer.invoke('backend:auth:authenticate', credentials),
      getState: () => ipcRenderer.invoke('backend:auth:get-state'),
      logout: () => ipcRenderer.invoke('backend:auth:logout'),
      createAccount: (userData) => ipcRenderer.invoke('backend:auth:create-account', userData),
      hasAccount: () => ipcRenderer.invoke('backend:auth:has-account'),
    },

    // Storage API
    storage: {
      storeFile: (category, fileName, data) =>
        ipcRenderer.invoke('backend:storage:store-file', category, fileName, data),
      retrieveFile: (category, fileName) =>
        ipcRenderer.invoke('backend:storage:retrieve-file', category, fileName),
      listFiles: (category) => ipcRenderer.invoke('backend:storage:list-files', category),
      deleteFile: (category, fileName) =>
        ipcRenderer.invoke('backend:storage:delete-file', category, fileName),
    },

    // Project API
    project: {
      create: (metadata) => ipcRenderer.invoke('backend:project:create', metadata),
      load: (filePath) => ipcRenderer.invoke('backend:project:load', filePath),
      save: (filePath) => ipcRenderer.invoke('backend:project:save', filePath),
      getCurrent: () => ipcRenderer.invoke('backend:project:get-current'),
      getCurrentPath: () => ipcRenderer.invoke('backend:project:get-current-path'),
      close: () => ipcRenderer.invoke('backend:project:close'),
      getDirectory: () => ipcRenderer.invoke('backend:project:get-directory'),
      listRecent: (limit) => ipcRenderer.invoke('backend:project:list-recent', limit),
    },

    // System API
    system: {
      getStatus: () => ipcRenderer.invoke('backend:system:get-status'),
      isInitialized: () => ipcRenderer.invoke('backend:system:is-initialized'),
    },
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
  // Only run in main window, not in iframes
  if (window.self !== window.top) {
    return;
  }

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
  setTimeout(detectAndAddTabs, 2000); // Back to original timing
});

// Also check on window load
window.addEventListener('load', () => {
  setTimeout(detectAndAddTabs, 3000); // Back to original timing

  // MANUAL TEST - Add this automatically for debugging
  setTimeout(() => {
    if (window.electronAPI) {
      console.log('🧪 Running manual IPC test...');
      window.electronAPI
        .addTab({
          id: 'test-123',
          name: 'Manual Test',
          url: window.location.href,
        })
        .then((result) => console.log('🧪 Manual test result:', result))
        .catch((error) => console.log('🧪 Manual test error:', error));
    }
  }, 5000);
});

console.log('✅ Kizu preload script loaded successfully');
