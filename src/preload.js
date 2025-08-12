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
    fileSystem: true
  };
});