const ConfigManager = require('./config-manager');
const { createAuthProvider } = require('./auth/auth-factory');
const { createStorageAdapter } = require('./storage/storage-factory');
const ProjectManager = require('./project-manager');
const { createLogger } = require('../utils/logger');

const logger = createLogger('BackendServiceManager');

/**
 * Backend Service Manager
 * Coordinates all backend services (config, auth, storage, projects) for the application
 */
class BackendServiceManager {
  constructor() {
    this.configManager = null;
    this.authProvider = null;
    this.storageAdapter = null;
    this.projectManager = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      logger.warn('Backend services already initialized');
      return;
    }

    try {
      await this._initConfig();
      await this._initAuth();
      await this._initStorage();
      this._initProjects();

      // Auto-create PenPot demo account for private licenses
      await this._ensurePenpotDemoAccount();

      this.initialized = true;
      logger.info('Backend services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize backend services', error);
      throw error;
    }
  }

  async _initConfig() {
    logger.info('Initializing configuration manager');
    this.configManager = new ConfigManager();
    await this.configManager.initialize();

    const licenseType = this.configManager.get('licenseType');
    logger.info('Configuration loaded', { licenseType });
    console.log('💳 License type detected:', licenseType);
  }

  async _initAuth() {
    logger.info('Initializing auth provider');
    const authConfig = this.configManager.getAuthConfig();

    this.authProvider = await createAuthProvider({
      licenseType: this.configManager.get('licenseType'),
      config: authConfig,
    });

    logger.info('Auth provider initialized', { type: authConfig.type });
  }

  async _initStorage() {
    logger.info('Initializing storage adapter');
    const storageConfig = this.configManager.getStorageConfig();

    this.storageAdapter = await createStorageAdapter({
      licenseType: this.configManager.get('licenseType'),
      config: storageConfig,
    });

    logger.info('Storage adapter initialized', { type: storageConfig.type });
  }

  _initProjects() {
    logger.info('Initializing project manager');
    this.projectManager = new ProjectManager(this.configManager);
    logger.info('Project manager initialized');
  }

  async _ensurePenpotDemoAccount() {
    const licenseType = this.configManager.get('licenseType');
    console.log('🔍 Checking PenPot demo account for license type:', licenseType);

    // Only auto-create for private licenses (demo/development)
    if (licenseType !== 'private') {
      console.log('⏭️  Skipping demo account creation (not a private license)');
      return;
    }

    logger.info('Ensuring PenPot demo account exists...');
    console.log('🔐 Ensuring PenPot demo account exists...');

    try {
      // Check if demo account already exists (with timeout)
      console.log('📡 Checking if demo account exists...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const checkResponse = await fetch(
        'http://localhost:6060/api/rpc/command/login-with-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'demo@penpot.local',
            password: 'demo123',
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (checkResponse.ok) {
        console.log('✅ PenPot demo account already exists');
        logger.info('✅ PenPot demo account already exists');
        return;
      }

      console.log('❌ Demo account does not exist, creating it...');

      // Account doesn't exist, create it
      logger.info('Creating PenPot demo account...');
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const result = await execPromise('./scripts/manage-demo-accounts.sh create', {
        cwd: require('path').join(__dirname, '../..'),
      });

      console.log('✅ PenPot demo account created:', result.stdout);
      logger.info('✅ PenPot demo account created successfully');
    } catch (error) {
      console.error('⚠️ Could not ensure PenPot demo account:', error.message);
      logger.warn('Could not ensure PenPot demo account:', error.message);
      // Don't fail initialization if demo account creation fails
    }
  }

  getConfig() {
    this._ensureInit();
    return this.configManager.getConfig();
  }

  getConfigValue(key) {
    this._ensureInit();
    return this.configManager.get(key);
  }

  isFeatureEnabled(featureName) {
    this._ensureInit();
    return this.configManager.isFeatureEnabled(featureName);
  }

  async authenticate(credentials) {
    this._ensureInit();
    return this.authProvider.authenticate(credentials);
  }

  async getAuthState() {
    this._ensureInit();
    return this.authProvider.getAuthState();
  }

  async logout() {
    this._ensureInit();
    return this.authProvider.logout();
  }

  async createAccount(userData) {
    this._ensureInit();
    return this.authProvider.createAccount(userData);
  }

  async hasAccount() {
    this._ensureInit();
    return this.authProvider.hasAccount();
  }

  async storeFile(category, fileName, data) {
    this._ensureInit();
    return this.storageAdapter.storeFile(category, fileName, data);
  }

  async retrieveFile(category, fileName) {
    this._ensureInit();
    return this.storageAdapter.retrieveFile(category, fileName);
  }

  async listFiles(category) {
    this._ensureInit();
    return this.storageAdapter.listFiles(category);
  }

  async deleteFile(category, fileName) {
    this._ensureInit();
    return this.storageAdapter.deleteFile(category, fileName);
  }

  createProject(metadata) {
    this._ensureInit();
    return this.projectManager.createProject(metadata);
  }

  async loadProject(filePath) {
    this._ensureInit();
    return this.projectManager.loadProject(filePath);
  }

  async saveProject(filePath) {
    this._ensureInit();
    return this.projectManager.saveProject(filePath);
  }

  getCurrentProject() {
    this._ensureInit();
    return this.projectManager.getCurrentProject();
  }

  getCurrentProjectPath() {
    this._ensureInit();
    return this.projectManager.getCurrentProjectPath();
  }

  closeProject() {
    this._ensureInit();
    return this.projectManager.closeProject();
  }

  getProjectsDirectory() {
    this._ensureInit();
    return this.projectManager.getProjectsDirectory();
  }

  async listRecentProjects(limit) {
    this._ensureInit();
    return this.projectManager.listRecentProjects(limit);
  }

  _ensureInit() {
    if (!this.initialized) {
      throw new Error('Backend services not initialized');
    }
  }

  isInitialized() {
    return this.initialized;
  }

  getServiceStatus() {
    return {
      initialized: this.initialized,
      config: this.configManager !== null,
      auth: this.authProvider !== null,
      storage: this.storageAdapter !== null,
      projects: this.projectManager !== null,
    };
  }
}

let instance = null;

function getBackendServiceManager() {
  if (!instance) {
    instance = new BackendServiceManager();
  }
  return instance;
}

module.exports = {
  BackendServiceManager,
  getBackendServiceManager,
};
