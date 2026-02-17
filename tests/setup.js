/**
 * Jest Test Setup
 *
 * Global setup for all tests.
 */

// Set environment to test
process.env.NODE_ENV = 'test';

// Set test secret for license generation
process.env.KIZU_LICENSE_SECRET = 'test-secret-key-for-testing-only';

// Mock Electron globally
jest.mock(
  'electron',
  () => ({
    app: {
      getPath: jest.fn(() => './test-data'),
      getVersion: jest.fn(() => '0.1.0'),
    },
    ipcMain: {
      handle: jest.fn(),
      on: jest.fn(),
    },
    shell: {
      openExternal: jest.fn(),
    },
    safeStorage: {
      isEncryptionAvailable: jest.fn(() => true),
      encryptString: jest.fn((str) => Buffer.from(str, 'utf8').toString('base64')),
      decryptString: jest.fn((encrypted) => {
        // Handle both Buffer and string input
        const base64Str = Buffer.isBuffer(encrypted) ? encrypted.toString('utf8') : encrypted;
        return Buffer.from(base64Str, 'base64').toString('utf8');
      }),
    },
  }),
  { virtual: true }
);

// Global test utilities
global.testUtils = {
  /**
   * Wait for a specified time
   */
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Generate random string
   */
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Generate test user data
   */
  generateTestUser: () => ({
    username: `testuser_${Date.now()}`,
    fullName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
  }),
};

// Mock penpot-mock-backend for Figma import tests
jest.mock('../src/services/penpot-mock-backend', () => ({
  getMockProfile: jest.fn().mockResolvedValue({
    id: 'test-profile-id',
    'default-team-id': '00000000-0000-0000-0000-000000000001',
    'default-project-id': '00000000-0000-0000-0000-000000000002',
    fullname: 'Test User',
    email: 'test@kizu.local',
  }),
  handleCommand: jest.fn().mockResolvedValue(null),
  getKizuTeamId: jest.fn(() => '00000000-0000-0000-0000-000000000001'),
  mockHandlers: {},
}));

// Mock backend-service-manager
jest.mock('../src/services/backend-service-manager', () => ({
  getBackendServiceManager: jest.fn(() => ({
    isInitialized: () => false,
    getCurrentProject: () => null,
    getProjectsDirectory: () => './test-data/output',
  })),
}));

// Suppress console output during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
