const { app } = require('electron');
const path = require('path');

/**
 * Configuration Manager
 * Provides license-aware configuration for the application
 */
class ConfigManager {
  constructor() {
    this.licenseStorage = null;
    this.config = null;
  }

  async initialize() {
    try {
      this.licenseStorage = require('./license-storage');
    } catch {
      this.licenseStorage = null;
    }

    await this.loadConfig();
  }

  async loadConfig() {
    const licenseType = await this._getLicenseType();
    this.config = this._createConfigForLicense(licenseType);
  }

  async _getLicenseType() {
    if (!this.licenseStorage) {
      return 'private';
    }

    try {
      const license = await this.licenseStorage.getLicense();
      return license?.valid ? license.type : 'private';
    } catch {
      return 'private';
    }
  }

  _createConfigForLicense(licenseType) {
    const baseConfig = {
      mode: licenseType === 'private' ? 'local' : 'cloud',
      licenseType,
      paths: this._getPaths(),
      app: this._getAppConfig(),
    };

    if (licenseType === 'private') {
      return { ...baseConfig, ...this._getPrivateConfig() };
    }

    return { ...baseConfig, ...this._getBusinessConfig() };
  }

  _getPaths() {
    const userDataPath = app.getPath('userData');

    return {
      userData: userDataPath,
      database: path.join(userDataPath, 'database'),
      assets: path.join(userDataPath, 'assets'),
      logs: path.join(userDataPath, 'logs'),
      temp: path.join(userDataPath, 'temp'),
    };
  }

  _getAppConfig() {
    return {
      name: 'Kizu',
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    };
  }

  _getPrivateFeatures() {
    return {
      collaboration: false,
      teams: false,
      cloudSync: false,
      versionHistory: true,
      versionHistoryDuration: 24 * 60 * 60 * 1000,
      versionHistoryInterval: 5 * 60 * 1000,
    };
  }

  _getPrivateConfig() {
    return {
      database: { type: 'embedded-postgres', port: 54321, host: 'localhost' },
      storage: { type: 'local', basePath: path.join(app.getPath('userData'), 'assets') },
      auth: { type: 'local', autoLogin: true },
      features: this._getPrivateFeatures(),
    };
  }

  _getBusinessFeatures() {
    return {
      collaboration: true,
      teams: true,
      cloudSync: true,
      versionHistory: true,
      versionHistoryDuration: 30 * 24 * 60 * 60 * 1000,
      versionHistoryInterval: 15 * 60 * 1000,
    };
  }

  _getBusinessConfig() {
    return {
      database: { type: 'cloud-postgres', connectionString: process.env.CLOUD_DB_URL },
      storage: { type: 'cloud-s3', bucket: process.env.S3_BUCKET, region: process.env.S3_REGION },
      auth: { type: 'cloud', apiUrl: process.env.AUTH_API_URL, autoLogin: false },
      features: this._getBusinessFeatures(),
    };
  }

  getConfig() {
    if (!this.config) {
      throw new Error('ConfigManager not initialized');
    }
    return this.config;
  }

  get(key) {
    const config = this.getConfig();
    const keys = key.split('.');
    let value = config;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`) === true;
  }

  isPrivateLicense() {
    return this.get('licenseType') === 'private';
  }

  isBusinessLicense() {
    return this.get('licenseType') === 'business';
  }

  getDatabaseConfig() {
    return this.get('database');
  }

  getStorageConfig() {
    return this.get('storage');
  }

  getAuthConfig() {
    return this.get('auth');
  }

  getPaths() {
    return this.get('paths');
  }
}

module.exports = ConfigManager;
