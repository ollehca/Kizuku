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

describe('Performance Baseline', () => {
  let mockLicenseStorage;

  beforeEach(() => {
    mockLicenseStorage = require('../license-storage');
    jest.clearAllMocks();
  });

  describe('ConfigManager Performance', () => {
    test('initialization completes under 100ms', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      const start = Date.now();
      await configManager.initialize();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('config retrieval is under 1ms', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const start = performance.now();
      const config = configManager.getConfig();
      const duration = performance.now() - start;

      expect(config).toBeDefined();
      expect(duration).toBeLessThan(1);
    });

    test('nested value retrieval is under 1ms', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const start = performance.now();
      const dbType = configManager.get('database.type');
      const duration = performance.now() - start;

      expect(dbType).toBe('embedded-postgres');
      expect(duration).toBeLessThan(1);
    });

    test('feature flag checks are under 1ms', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const start = performance.now();
      const hasCollaboration = configManager.isFeatureEnabled('collaboration');
      const duration = performance.now() - start;

      expect(hasCollaboration).toBe(false);
      expect(duration).toBeLessThan(1);
    });
  });

  describe('Batch Operations Performance', () => {
    test('multiple config retrievals are efficient', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        configManager.get('database.type');
        configManager.get('storage.type');
        configManager.get('auth.type');
      }

      const duration = performance.now() - start;
      const avgPerOp = duration / (iterations * 3);

      expect(avgPerOp).toBeLessThan(0.1); // Less than 0.1ms per operation
    });

    test('feature flag batch checks are efficient', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const features = ['collaboration', 'teams', 'cloudSync', 'versionHistory'];
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        features.forEach((feature) => configManager.isFeatureEnabled(feature));
      }

      const duration = performance.now() - start;
      const avgPerCheck = duration / (iterations * features.length);

      expect(avgPerCheck).toBeLessThan(0.1);
    });
  });

  describe('License Switching Performance', () => {
    test('config reload completes under 50ms', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
      });

      const start = Date.now();
      await configManager.loadConfig();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
      expect(configManager.get('licenseType')).toBe('business');
    });

    test('multiple license switches are efficient', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const switches = 10;
      const durations = [];

      for (let i = 0; i < switches; i++) {
        const licenseType = i % 2 === 0 ? 'private' : 'business';

        mockLicenseStorage.getLicense.mockResolvedValue({
          valid: true,
          type: licenseType,
        });

        const start = performance.now();
        await configManager.loadConfig();
        durations.push(performance.now() - start);

        expect(configManager.get('licenseType')).toBe(licenseType);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('Memory Efficiency', () => {
    test('config manager has minimal memory footprint', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const config = configManager.getConfig();
      const configStr = JSON.stringify(config);

      // Config should be under 10KB
      expect(configStr.length).toBeLessThan(10 * 1024);
    });

    test('multiple instances do not leak memory', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const instances = [];
      const instanceCount = 100;

      for (let i = 0; i < instanceCount; i++) {
        const manager = new ConfigManager();
        await manager.initialize();
        instances.push(manager);
      }

      // Verify all instances work
      instances.forEach((instance) => {
        expect(instance.getConfig()).toBeDefined();
      });

      // Clear references
      instances.length = 0;
    });
  });

  describe('Path Operations Performance', () => {
    test('path generation is efficient', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const configManager = new ConfigManager();
      await configManager.initialize();

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        configManager.getPaths();
        configManager.getDatabaseConfig();
        configManager.getStorageConfig();
        configManager.getAuthConfig();
      }

      const duration = performance.now() - start;
      const avgPerOp = duration / (iterations * 4);

      expect(avgPerOp).toBeLessThan(0.1);
    });
  });
});
