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

jest.mock(
  '../auth-orchestrator',
  () => ({
    authenticateUser: jest.fn(),
    checkAuthenticationState: jest.fn(),
    logoutUser: jest.fn(),
    createUserAccount: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '../auth-storage',
  () => ({
    hasValidCredentials: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '../user-storage',
  () => ({
    getUser: jest.fn(),
  }),
  { virtual: true }
);

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true }),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
  },
}));

jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const { BackendServiceManager, getBackendServiceManager } = require('../backend-service-manager');

describe('BackendServiceManager', () => {
  let manager;
  let mockLicenseStorage;

  beforeEach(() => {
    jest.resetModules(); // Reset module cache
    manager = new BackendServiceManager();
    mockLicenseStorage = require('../license-storage');
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('initializes successfully with private license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.configManager).toBeDefined();
      expect(manager.authProvider).toBeDefined();
      expect(manager.storageAdapter).toBeDefined();
    });

    test('prevents double initialization', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      await manager.initialize();
      await manager.initialize(); // Second call should warn

      expect(manager.isInitialized()).toBe(true);
    });

    test('handles license errors gracefully', async () => {
      mockLicenseStorage.getLicense.mockRejectedValue(new Error('License error'));

      // Should initialize with default 'private' license
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
      expect(manager.getConfigValue('licenseType')).toBe('private');
    });
  });

  describe('Config Methods', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await manager.initialize();
    });

    test('getConfig returns full config', () => {
      const config = manager.getConfig();
      expect(config).toBeDefined();
      expect(config.licenseType).toBe('private');
    });

    test('getConfigValue retrieves nested values', () => {
      expect(manager.getConfigValue('licenseType')).toBe('private');
      expect(manager.getConfigValue('database.type')).toBe('embedded-postgres');
    });

    test('isFeatureEnabled checks feature flags', () => {
      expect(manager.isFeatureEnabled('versionHistory')).toBe(true);
      expect(manager.isFeatureEnabled('cloudSync')).toBe(false);
    });

    test('throws when accessing config before init', () => {
      const uninitializedManager = new BackendServiceManager();
      expect(() => uninitializedManager.getConfig()).toThrow('Backend services not initialized');
    });
  });

  describe('Auth Methods', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await manager.initialize();
    });

    test('throws when auth methods called before init', async () => {
      const uninitializedManager = new BackendServiceManager();
      await expect(uninitializedManager.hasAccount()).rejects.toThrow(
        'Backend services not initialized'
      );
    });
  });

  describe('Storage Methods', () => {
    beforeEach(async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await manager.initialize();
    });

    test('throws when storage methods called before init', async () => {
      const uninitializedManager = new BackendServiceManager();
      await expect(uninitializedManager.listFiles('images')).rejects.toThrow(
        'Backend services not initialized'
      );
    });
  });

  describe('Service Status', () => {
    test('getServiceStatus returns correct state when not initialized', () => {
      const status = manager.getServiceStatus();
      expect(status.initialized).toBe(false);
      expect(status.config).toBe(false);
      expect(status.auth).toBe(false);
      expect(status.storage).toBe(false);
    });

    test('getServiceStatus returns correct state when initialized', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });
      await manager.initialize();

      const status = manager.getServiceStatus();
      expect(status.initialized).toBe(true);
      expect(status.config).toBe(true);
      expect(status.auth).toBe(true);
      expect(status.storage).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    test('getBackendServiceManager returns same instance', () => {
      const instance1 = getBackendServiceManager();
      const instance2 = getBackendServiceManager();
      expect(instance1).toBe(instance2);
    });
  });
});
