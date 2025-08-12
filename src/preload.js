const { contextBridge, ipcRenderer } = require('electron');

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
  
  // Platform info
  platform: process.platform,
  isDesktop: true,
  
  // Desktop-specific features
  openExternal: (url) => {
    // This will be handled by the main process
    window.open(url, '_blank');
  }
});

// Load shortcuts system
const ShortcutManager = require('./shortcuts.js');

// Inject desktop-specific styles and modifications
window.addEventListener('DOMContentLoaded', () => {
  // Add desktop-specific CSS class
  document.body.classList.add('penpot-desktop');
  
  // Override some web-specific behaviors for desktop
  console.log('PenPot Desktop preload script loaded');
  
  // Add desktop-specific global variables that PenPot might check
  window.penpotDesktop = {
    version: process.versions.electron,
    isOffline: true,
    fileSystem: true,
    platform: process.platform,
    menuActions: {}, // Store for menu action handlers
    shortcutActions: {} // Store for shortcut handlers
  };
  
  // Initialize shortcut system
  if (!window.shortcutManager) {
    window.shortcutManager = new ShortcutManager();
  }
  
  // Set up menu action integration with PenPot
  if (window.electronAPI) {
    window.electronAPI.onMenuAction((action, data) => {
      console.log('Menu action received:', action, data);
      
      // Dispatch custom events that PenPot can listen to
      const event = new CustomEvent('penpot-desktop-action', {
        detail: { action, data }
      });
      document.dispatchEvent(event);
      
      // Try to trigger PenPot actions directly if possible
      if (window.penpotDesktop.menuActions[action]) {
        window.penpotDesktop.menuActions[action](data);
      }
    });
  }
  
  // Set up shortcut integration
  document.addEventListener('penpot-shortcut', (event) => {
    const { action, originalEvent, context, platform } = event.detail;
    console.log(`Shortcut: ${action} (${context}, ${platform})`);
    
    // Also dispatch as menu action for compatibility
    if (window.electronAPI) {
      const menuEvent = new CustomEvent('penpot-desktop-action', {
        detail: { action, data: { originalEvent, context, platform } }
      });
      document.dispatchEvent(menuEvent);
    }
  });
});

// Helper function for PenPot to register menu action handlers
window.registerDesktopMenuHandler = function(action, handler) {
  if (window.penpotDesktop) {
    window.penpotDesktop.menuActions[action] = handler;
  }
};