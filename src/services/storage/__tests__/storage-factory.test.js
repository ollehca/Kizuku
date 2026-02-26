const { createStorageAdapter, createLocalStorageAdapter } = require('../storage-factory');
const LocalStorageAdapter = require('../local-storage-adapter');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs').promises;

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/kizuku-test-factory'),
  },
}));

jest.mock(
  '../../license-storage',
  () => ({
    getLicense: jest.fn(),
  }),
  { virtual: true }
);

describe('StorageFactory', () => {
  let testDir;
  let mockLicenseStorage;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `kizuku-test-factory-${Date.now()}`);
    mockLicenseStorage = require('../../license-storage');
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createStorageAdapter', () => {
    test('creates LocalStorageAdapter for private license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
        code: 'KIZUKU-12345-ABCDE-FGHIJ-KLMNO-PQRST',
      });

      const adapter = await createStorageAdapter();

      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
      expect(mockLicenseStorage.getLicense).toHaveBeenCalled();
    });

    test('throws error for business license (not yet implemented)', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
        code: 'KIZUKU-BIZ-12345-ABCDE',
      });

      await expect(createStorageAdapter()).rejects.toThrow('Cloud storage not yet implemented');
    });

    test('throws error when no valid license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: false,
      });

      await expect(createStorageAdapter()).rejects.toThrow('No valid license found');
    });

    test('throws error when license is null', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue(null);

      await expect(createStorageAdapter()).rejects.toThrow('No valid license found');
    });

    test('uses explicit licenseType option', async () => {
      const adapter = await createStorageAdapter({
        licenseType: 'private',
        config: { basePath: testDir },
      });

      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
      expect(mockLicenseStorage.getLicense).not.toHaveBeenCalled();
    });

    test('passes config to adapter', async () => {
      const config = { basePath: testDir };
      const adapter = await createStorageAdapter({
        licenseType: 'private',
        config,
      });

      expect(adapter.basePath).toBe(testDir);
    });

    test('initializes adapter before returning', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const adapter = await createStorageAdapter({
        config: { basePath: testDir },
      });

      const stats = await fs.stat(adapter.basePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('createLocalStorageAdapter', () => {
    test('creates and initializes LocalStorageAdapter', async () => {
      const adapter = await createLocalStorageAdapter({
        basePath: testDir,
      });

      expect(adapter).toBeInstanceOf(LocalStorageAdapter);

      const stats = await fs.stat(adapter.basePath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('uses default config if none provided', async () => {
      const adapter = await createLocalStorageAdapter();

      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
      expect(adapter.basePath).toBeTruthy();
    });

    test('does not require license check', async () => {
      await createLocalStorageAdapter({ basePath: testDir });

      expect(mockLicenseStorage.getLicense).not.toHaveBeenCalled();
    });
  });

  describe('integration test', () => {
    test('factory-created adapter can save and load files', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
      });

      const adapter = await createStorageAdapter({
        config: { basePath: testDir },
      });

      await adapter.saveFile({
        id: 'integration-test.txt',
        content: 'Factory test content',
        metadata: { mimeType: 'text/plain' },
      });

      const loaded = await adapter.loadFile('integration-test.txt');
      expect(loaded.toString()).toBe('Factory test content');
    });
  });
});
