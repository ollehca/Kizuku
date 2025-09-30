/**
 * Authentication IPC Handlers
 *
 * Registers all IPC handlers for the authentication flow.
 * Connects UI screens with auth orchestrator.
 *
 * @module auth-ipc-handlers
 */

const { ipcMain } = require('electron');
const authOrchestrator = require('./auth-orchestrator');

/**
 * Register query IPC handlers (invoke/handle pattern)
 */
function registerQueryHandlers() {
  ipcMain.handle('check-auth-state', async () => {
    return await authOrchestrator.checkAuthenticationState();
  });

  ipcMain.handle('check-license-status', async () => {
    const state = await authOrchestrator.getLicenseValidationState();
    return {
      hasValidLicense: state.exists && state.validated,
      type: state.type,
    };
  });

  ipcMain.handle('validate-license-code', async (_event, code) => {
    return await authOrchestrator.validateAndSaveLicense(code);
  });

  ipcMain.handle('create-user-account', async (_event, userData) => {
    return await authOrchestrator.createUserAccount(userData);
  });

  ipcMain.handle('authenticate-user', async (_event, credentials) => {
    return await authOrchestrator.authenticateUser(credentials.username, credentials.password);
  });

  ipcMain.handle('get-user-summary', async () => {
    return await authOrchestrator.getUserSummary();
  });

  ipcMain.handle('get-license-data', async () => {
    return await authOrchestrator.getLicenseData();
  });

  ipcMain.handle('get-license-validation-state', async () => {
    return await authOrchestrator.getLicenseValidationState();
  });

  ipcMain.handle('clear-auth-data', async () => {
    return await authOrchestrator.clearAuthenticationData();
  });
}

/**
 * Register onboarding flow handlers
 */
function registerOnboardingHandlers(mainWindow) {
  ipcMain.on('license-type-selected', (_event, data) => {
    console.log('License type selected:', data.type);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('src/ui/license-entry.html');
    }
  });

  ipcMain.on('skip-license-selection', (_event, data) => {
    console.log('Skipping license selection:', data.reason);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (data.reason === 'existing-license') {
        mainWindow.loadFile('src/ui/account-creation.html');
      }
    }
  });

  ipcMain.on('back-to-license-selection', () => {
    console.log('Going back to license selection');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('src/ui/license-selection.html');
    }
  });

  ipcMain.on('license-validated', (_event, licenseData) => {
    console.log('License validated:', licenseData.type);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('src/ui/account-creation.html');
    }
  });

  ipcMain.on('account-created-successfully', () => {
    console.log('Account created successfully');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('src/ui/components/success-modal.html');
    }
  });

  ipcMain.on('onboarding-complete', () => {
    console.log('Onboarding complete, loading main app...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      loadMainApp(mainWindow);
    }
  });
}

/**
 * Register miscellaneous event handlers
 */
function registerMiscHandlers() {
  ipcMain.on('business-notify-request', (_event, data) => {
    console.log('Business license notification requested:', data.email);
    // TODO: Implement email notification
  });

  ipcMain.on('open-external-link', (_event, data) => {
    console.log('Opening external link:', data.url);
    const { shell } = require('electron');
    if (data.url.startsWith('mailto:') || data.url.startsWith('https:')) {
      shell.openExternal(data.url);
    }
  });

  ipcMain.on('show-change-license-dialog', () => {
    console.log('Change license requested');
    // TODO: Implement license change flow
  });

  ipcMain.on('show-deactivate-license-dialog', () => {
    console.log('Deactivate license requested');
    // TODO: Implement deactivation confirmation dialog
  });
}

/**
 * Register all authentication IPC handlers
 */
function registerAuthIPCHandlers(mainWindow) {
  registerQueryHandlers();
  registerOnboardingHandlers(mainWindow);
  registerMiscHandlers();
}

/**
 * Load main PenPot application
 */
function loadMainApp(mainWindow) {
  // Determine URL based on environment
  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev ? 'http://localhost:3449' : 'http://localhost:3449';

  console.log('Loading main app from:', url);
  mainWindow.loadURL(url);
}

/**
 * Initialize authentication flow
 * Called on app startup
 */
async function initializeAuthFlow(mainWindow) {
  console.log('Initializing authentication flow...');

  // Check authentication state
  const authState = await authOrchestrator.checkAuthenticationState();

  console.log('Authentication state:', authState);

  // Route to appropriate screen
  if (authState.authenticated) {
    // User is fully set up, load main app
    console.log('User authenticated, loading main app...');
    loadMainApp(mainWindow);
  } else {
    // Navigate to appropriate onboarding screen
    console.log('Starting onboarding, showing:', authState.nextScreen);

    const screenMap = {
      'license-selection': 'src/ui/license-selection.html',
      'account-creation': 'src/ui/account-creation.html',
      'main-app': null, // Handled above
    };

    const screenPath = screenMap[authState.nextScreen];
    if (screenPath) {
      mainWindow.loadFile(screenPath);
    } else {
      // Fallback to license selection
      mainWindow.loadFile('src/ui/license-selection.html');
    }
  }
}

module.exports = {
  registerAuthIPCHandlers,
  initializeAuthFlow,
};
