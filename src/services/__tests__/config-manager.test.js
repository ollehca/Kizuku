const ConfigManager = require('../config-manager');
const path = require('path');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((type) => {
      if (type === 'userData') {
        return '/test/userData';
      }
      return '/test';
    }),
    getVersion: jest.fn(() => '1.0.0'),
  },
}));

jest.mock(
  '../license-storage',
  () => ({
    getLicense: jest.fn(),
  }),
  { virtual: true }
);

describe('ConfigManager', () => {
  let configManager;
  let mockLicenseStorage;

  beforeEach(async () => {
    configManager = new ConfigManager();
    mockLicenseStorage = require('../license-storage');
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('initializes with private license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.licenseType).toBe('private');
      expect(config.mode).toBe('local');
    });

    test('initializes with business license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.licenseType).toBe('business');
      expect(config.mode).toBe('cloud');
    });

    test('defaults to private when no license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue(null);

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.licenseType).toBe('private');
      expect(config.mode).toBe('local');
    });

    test('defaults to private when license invalid', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: false,
        type: 'private',
      });

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.licenseType).toBe('private');
    });
  });

  describe('private license config', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await configManager.initialize();
    });

    test('configures local database', () => {
      const dbConfig = configManager.getDatabaseConfig();
      expect(dbConfig.type).toBe('embedded-postgres');
      expect(dbConfig.port).toBe(54321);
    });

    test('configures local storage', () => {
      const storageConfig = configManager.getStorageConfig();
      expect(storageConfig.type).toBe('local');
      expect(storageConfig.basePath).toContain('assets');
    });

    test('configures local auth', () => {
      const authConfig = configManager.getAuthConfig();
      expect(authConfig.type).toBe('local');
      expect(authConfig.autoLogin).toBe(true);
    });

    test('disables cloud features', () => {
      expect(configManager.isFeatureEnabled('collaboration')).toBe(false);
      expect(configManager.isFeatureEnabled('teams')).toBe(false);
      expect(configManager.isFeatureEnabled('cloudSync')).toBe(false);
    });

    test('enables local features', () => {
      expect(configManager.isFeatureEnabled('versionHistory')).toBe(true);
    });
  });

  describe('business license config', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });
      await configManager.initialize();
    });

    test('configures cloud database', () => {
      const dbConfig = configManager.getDatabaseConfig();
      expect(dbConfig.type).toBe('cloud-postgres');
    });

    test('configures cloud storage', () => {
      const storageConfig = configManager.getStorageConfig();
      expect(storageConfig.type).toBe('cloud-s3');
    });

    test('configures cloud auth', () => {
      const authConfig = configManager.getAuthConfig();
      expect(authConfig.type).toBe('cloud');
      expect(authConfig.autoLogin).toBe(false);
    });

    test('enables cloud features', () => {
      expect(configManager.isFeatureEnabled('collaboration')).toBe(true);
      expect(configManager.isFeatureEnabled('teams')).toBe(true);
      expect(configManager.isFeatureEnabled('cloudSync')).toBe(true);
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await configManager.initialize();
    });

    test('get() retrieves nested values', () => {
      expect(configManager.get('database.type')).toBe('embedded-postgres');
      expect(configManager.get('features.versionHistory')).toBe(true);
    });

    test('get() returns undefined for missing keys', () => {
      expect(configManager.get('nonexistent')).toBeUndefined();
      expect(configManager.get('database.nonexistent')).toBeUndefined();
    });

    test('isPrivateLicense() works', () => {
      expect(configManager.isPrivateLicense()).toBe(true);
      expect(configManager.isBusinessLicense()).toBe(false);
    });

    test('getPaths() returns path config', () => {
      const paths = configManager.getPaths();
      expect(paths.userData).toBe('/test/userData');
      expect(paths.database).toBe('/test/userData/database');
    });
  });
});
