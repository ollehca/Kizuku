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

const ConfigManager = require('../config-manager');

describe('Week 1 Integration Tests', () => {
  let configManager;
  let mockLicenseStorage;

  beforeEach(async () => {
    configManager = new ConfigManager();
    mockLicenseStorage = require('../license-storage');
    jest.clearAllMocks();
  });

  describe('Private License Integration', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await configManager.initialize();
    });

    test('config manager provides correct private config', () => {
      expect(configManager.isPrivateLicense()).toBe(true);
      expect(configManager.get('mode')).toBe('local');
      expect(configManager.get('database.type')).toBe('embedded-postgres');
      expect(configManager.get('storage.type')).toBe('local');
      expect(configManager.get('auth.type')).toBe('local');
    });

    test('storage config matches expected structure', () => {
      const storageConfig = configManager.getStorageConfig();
      expect(storageConfig.type).toBe('local');
      expect(storageConfig.basePath).toContain('assets');
      expect(storageConfig.basePath).toContain('/test/userData');
    });

    test('feature flags work correctly for private license', () => {
      expect(configManager.isFeatureEnabled('collaboration')).toBe(false);
      expect(configManager.isFeatureEnabled('teams')).toBe(false);
      expect(configManager.isFeatureEnabled('cloudSync')).toBe(false);
      expect(configManager.isFeatureEnabled('versionHistory')).toBe(true);
    });

    test('paths are consistent across all services', () => {
      const paths = configManager.getPaths();
      const storageConfig = configManager.getStorageConfig();

      expect(paths.userData).toBe('/test/userData');
      expect(paths.assets).toBe('/test/userData/assets');
      expect(storageConfig.basePath).toBe(paths.assets);
    });
  });

  describe('Business License Integration', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });
      await configManager.initialize();
    });

    test('config manager provides correct business config', () => {
      expect(configManager.isBusinessLicense()).toBe(true);
      expect(configManager.get('mode')).toBe('cloud');
      expect(configManager.get('database.type')).toBe('cloud-postgres');
      expect(configManager.get('storage.type')).toBe('cloud-s3');
      expect(configManager.get('auth.type')).toBe('cloud');
    });

    test('feature flags work correctly for business license', () => {
      expect(configManager.isFeatureEnabled('collaboration')).toBe(true);
      expect(configManager.isFeatureEnabled('teams')).toBe(true);
      expect(configManager.isFeatureEnabled('cloudSync')).toBe(true);
      expect(configManager.isFeatureEnabled('versionHistory')).toBe(true);
    });

    test('cloud storage config includes required fields', () => {
      const storageConfig = configManager.getStorageConfig();
      expect(storageConfig.type).toBe('cloud-s3');
      expect(storageConfig).toHaveProperty('bucket');
      expect(storageConfig).toHaveProperty('region');
    });
  });

  describe('Configuration Lifecycle', () => {
    test('config provides all required data for storage factory', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await configManager.initialize();
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.licenseType).toBe('private');
      expect(config.storage).toBeDefined();
      expect(config.storage.type).toBe('local');
      expect(config.storage.basePath).toBeDefined();
    });

    test('config manager handles license changes on reload', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await configManager.initialize();
      expect(configManager.get('licenseType')).toBe('private');

      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });

      await configManager.loadConfig();
      expect(configManager.get('licenseType')).toBe('business');
    });
  });

  describe('Error Handling Integration', () => {
    test('config manager handles missing license gracefully', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue(null);

      await configManager.initialize();
      expect(configManager.get('licenseType')).toBe('private');
      expect(configManager.get('mode')).toBe('local');
    });

    test('config manager handles license storage errors', async () => {
      mockLicenseStorage.getLicense.mockRejectedValue(new Error('Storage error'));

      await configManager.initialize();
      expect(configManager.get('licenseType')).toBe('private');
    });

    test('throws error when accessing config before initialization', () => {
      const uninitializedManager = new ConfigManager();
      expect(() => uninitializedManager.getConfig()).toThrow('ConfigManager not initialized');
    });
  });

  describe('Cross-Service Data Flow', () => {
    test('config flows correctly from license to all services', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await configManager.initialize();

      const dbConfig = configManager.getDatabaseConfig();
      const storageConfig = configManager.getStorageConfig();
      const authConfig = configManager.getAuthConfig();

      expect(dbConfig.type).toBe('embedded-postgres');
      expect(storageConfig.type).toBe('local');
      expect(authConfig.type).toBe('local');

      expect(dbConfig.port).toBe(54321);
      expect(authConfig.autoLogin).toBe(true);
    });

    test('version history config varies by license type', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await configManager.initialize();

      const privateDuration = configManager.get('features.versionHistoryDuration');
      const privateInterval = configManager.get('features.versionHistoryInterval');

      expect(privateDuration).toBe(24 * 60 * 60 * 1000); // 1 day
      expect(privateInterval).toBe(5 * 60 * 1000); // 5 minutes

      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });
      await configManager.loadConfig();

      const businessDuration = configManager.get('features.versionHistoryDuration');
      const businessInterval = configManager.get('features.versionHistoryInterval');

      expect(businessDuration).toBe(30 * 24 * 60 * 60 * 1000); // 30 days
      expect(businessInterval).toBe(15 * 60 * 1000); // 15 minutes
    });
  });
});
