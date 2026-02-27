/**
 * Backend Client for Renderer Process
 * Provides a clean, promise-based API for interacting with backend services
 */

class BackendClient {
  constructor() {
    if (!globalThis.electronAPI?.backend) {
      throw new Error('Backend API not available. Ensure preload script loaded correctly.');
    }
    this.api = globalThis.electronAPI.backend;
  }

  /**
   * Config Methods
   */

  async getConfig() {
    try {
      return await this.api.config.get();
    } catch (error) {
      console.error('Failed to get config:', error);
      throw new Error(`Config retrieval failed: ${error.message}`);
    }
  }

  async getConfigValue(key) {
    try {
      return await this.api.config.getValue(key);
    } catch (error) {
      console.error(`Failed to get config value for ${key}:`, error);
      throw new Error(`Config value retrieval failed: ${error.message}`);
    }
  }

  async isFeatureEnabled(featureName) {
    try {
      return await this.api.config.isFeatureEnabled(featureName);
    } catch (error) {
      console.error(`Failed to check feature ${featureName}:`, error);
      return false; // Default to disabled on error
    }
  }

  async getLicenseType() {
    try {
      return await this.getConfigValue('licenseType');
    } catch (error) {
      console.error('Failed to get license type:', error);
      return 'private'; // Default to private
    }
  }

  /**
   * Auth Methods
   */

  async authenticate(credentials) {
    try {
      return await this.api.auth.authenticate(credentials);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async getAuthState() {
    try {
      return await this.api.auth.getState();
    } catch (error) {
      console.error('Failed to get auth state:', error);
      throw new Error(`Auth state retrieval failed: ${error.message}`);
    }
  }

  async logout() {
    try {
      return await this.api.auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  async createAccount(userData) {
    try {
      return await this.api.auth.createAccount(userData);
    } catch (error) {
      console.error('Account creation failed:', error);
      throw new Error(`Account creation failed: ${error.message}`);
    }
  }

  async hasAccount() {
    try {
      return await this.api.auth.hasAccount();
    } catch (error) {
      console.error('Failed to check account existence:', error);
      return false; // Default to no account on error
    }
  }

  /**
   * Storage Methods
   */

  async storeFile(category, fileName, data) {
    try {
      return await this.api.storage.storeFile(category, fileName, data);
    } catch (error) {
      console.error(`Failed to store file ${fileName} in ${category}:`, error);
      throw new Error(`File storage failed: ${error.message}`);
    }
  }

  async retrieveFile(category, fileName) {
    try {
      return await this.api.storage.retrieveFile(category, fileName);
    } catch (error) {
      console.error(`Failed to retrieve file ${fileName} from ${category}:`, error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  async listFiles(category) {
    try {
      return await this.api.storage.listFiles(category);
    } catch (error) {
      console.error(`Failed to list files in ${category}:`, error);
      throw new Error(`File listing failed: ${error.message}`);
    }
  }

  async deleteFile(category, fileName) {
    try {
      return await this.api.storage.deleteFile(category, fileName);
    } catch (error) {
      console.error(`Failed to delete file ${fileName} from ${category}:`, error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Project Methods
   */

  createProject(metadata) {
    try {
      return this.api.project.create(metadata);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error(`Project creation failed: ${error.message}`);
    }
  }

  async loadProject(filePath) {
    try {
      return await this.api.project.load(filePath);
    } catch (error) {
      console.error(`Failed to load project from ${filePath}:`, error);
      throw new Error(`Project load failed: ${error.message}`);
    }
  }

  async saveProject(filePath) {
    try {
      return await this.api.project.save(filePath);
    } catch (error) {
      console.error('Failed to save project:', error);
      throw new Error(`Project save failed: ${error.message}`);
    }
  }

  async getCurrentProject() {
    try {
      return await this.api.project.getCurrent();
    } catch (error) {
      console.error('Failed to get current project:', error);
      return null;
    }
  }

  async getCurrentProjectPath() {
    try {
      return await this.api.project.getCurrentPath();
    } catch (error) {
      console.error('Failed to get current project path:', error);
      return null;
    }
  }

  async closeProject() {
    try {
      return await this.api.project.close();
    } catch (error) {
      console.error('Failed to close project:', error);
      throw new Error(`Project close failed: ${error.message}`);
    }
  }

  async getProjectsDirectory() {
    try {
      return await this.api.project.getDirectory();
    } catch (error) {
      console.error('Failed to get projects directory:', error);
      return null;
    }
  }

  async listRecentProjects(limit = 10) {
    try {
      return await this.api.project.listRecent(limit);
    } catch (error) {
      console.error('Failed to list recent projects:', error);
      return [];
    }
  }

  /**
   * System Methods
   */

  async getServiceStatus() {
    try {
      return await this.api.system.getStatus();
    } catch (error) {
      console.error('Failed to get service status:', error);
      return {
        initialized: false,
        config: false,
        auth: false,
        storage: false,
        projects: false,
      };
    }
  }

  async isInitialized() {
    try {
      return await this.api.system.isInitialized();
    } catch (error) {
      console.error('Failed to check initialization status:', error);
      return false;
    }
  }

  /**
   * Helper Methods
   */

  async waitForInitialization(timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const initialized = await this.isInitialized();
      if (initialized) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Backend services initialization timeout');
  }
}

// Create singleton instance
let backendClientInstance = null;

/**
 * Get Backend Client instance
 * @returns {BackendClient} Backend client singleton
 */
function getBackendClient() {
  if (!backendClientInstance) {
    backendClientInstance = new BackendClient();
  }
  return backendClientInstance;
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BackendClient, getBackendClient };
}

// Also expose globally for easy access in renderer
if (typeof globalThis !== 'undefined') {
  globalThis.BackendClient = BackendClient;
  globalThis.getBackendClient = getBackendClient;
}
