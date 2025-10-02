const { ipcMain } = require('electron');
const { getBackendServiceManager } = require('./backend-service-manager');
const { createLogger } = require('../utils/logger');

const logger = createLogger('BackendIPC');

/**
 * Config IPC Handlers
 */

async function handleGetConfig() {
  const manager = getBackendServiceManager();
  return manager.getConfig();
}

async function handleGetConfigValue(event, key) {
  const manager = getBackendServiceManager();
  return manager.getConfigValue(key);
}

async function handleIsFeatureEnabled(event, featureName) {
  const manager = getBackendServiceManager();
  return manager.isFeatureEnabled(featureName);
}

/**
 * Auth IPC Handlers
 */

async function handleAuthenticate(event, credentials) {
  const manager = getBackendServiceManager();
  return manager.authenticate(credentials);
}

async function handleGetAuthState() {
  const manager = getBackendServiceManager();
  return manager.getAuthState();
}

async function handleLogout() {
  const manager = getBackendServiceManager();
  return manager.logout();
}

async function handleCreateAccount(event, userData) {
  const manager = getBackendServiceManager();
  return manager.createAccount(userData);
}

async function handleHasAccount() {
  const manager = getBackendServiceManager();
  return manager.hasAccount();
}

/**
 * Storage IPC Handlers
 */

async function handleStoreFile(event, category, fileName, data) {
  const manager = getBackendServiceManager();
  return manager.storeFile(category, fileName, data);
}

async function handleRetrieveFile(event, category, fileName) {
  const manager = getBackendServiceManager();
  return manager.retrieveFile(category, fileName);
}

async function handleListFiles(event, category) {
  const manager = getBackendServiceManager();
  return manager.listFiles(category);
}

async function handleDeleteFile(event, category, fileName) {
  const manager = getBackendServiceManager();
  return manager.deleteFile(category, fileName);
}

/**
 * System IPC Handlers
 */

async function handleGetServiceStatus() {
  const manager = getBackendServiceManager();
  return manager.getServiceStatus();
}

async function handleIsInitialized() {
  const manager = getBackendServiceManager();
  return manager.isInitialized();
}

/**
 * Register all backend IPC handlers
 */
function registerBackendIpcHandlers() {
  // Config handlers
  ipcMain.handle('backend:config:get', handleGetConfig);
  ipcMain.handle('backend:config:get-value', handleGetConfigValue);
  ipcMain.handle('backend:config:is-feature-enabled', handleIsFeatureEnabled);

  // Auth handlers
  ipcMain.handle('backend:auth:authenticate', handleAuthenticate);
  ipcMain.handle('backend:auth:get-state', handleGetAuthState);
  ipcMain.handle('backend:auth:logout', handleLogout);
  ipcMain.handle('backend:auth:create-account', handleCreateAccount);
  ipcMain.handle('backend:auth:has-account', handleHasAccount);

  // Storage handlers
  ipcMain.handle('backend:storage:store-file', handleStoreFile);
  ipcMain.handle('backend:storage:retrieve-file', handleRetrieveFile);
  ipcMain.handle('backend:storage:list-files', handleListFiles);
  ipcMain.handle('backend:storage:delete-file', handleDeleteFile);

  // System handlers
  ipcMain.handle('backend:system:get-status', handleGetServiceStatus);
  ipcMain.handle('backend:system:is-initialized', handleIsInitialized);

  logger.info('Backend IPC handlers registered');
}

module.exports = {
  registerBackendIpcHandlers,
};
