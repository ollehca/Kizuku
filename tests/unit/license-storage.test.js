/**
 * Unit Tests: License Storage Service
 *
 * Tests encrypted license storage functionality.
 */

const licenseStorage = require('../../src/services/license-storage');
const fs = require('node:fs').promises;

describe('License Storage Service', () => {
  const testLicense = {
    code: 'KIZUKU-50019-99AC6-14B35-557C8-509D0',
    type: 'private',
    validated: true,
    validatedAt: new Date().toISOString(),
    activatedBy: 'test@example.com',
  };

  beforeEach(async () => {
    // Clean up test data
    try {
      await fs.rm('./test-data', { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm('./test-data', { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('saveLicense()', () => {
    test('saves license successfully', async () => {
      const result = await licenseStorage.saveLicense(testLicense);
      expect(result.success).toBe(true);
    });

    test('creates storage directory if not exists', async () => {
      await licenseStorage.saveLicense(testLicense);

      const dirExists = await fs
        .access('./test-data')
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('creates encrypted file', async () => {
      await licenseStorage.saveLicense(testLicense);

      const fileExists = await fs
        .access('./test-data/license.dat')
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('saves with version number', async () => {
      await licenseStorage.saveLicense(testLicense);
      const loaded = await licenseStorage.getLicense();
      expect(loaded.version).toBe(1);
    });

    test('overwrites existing license', async () => {
      await licenseStorage.saveLicense(testLicense);

      const newLicense = { ...testLicense, code: 'NEW-CODE' };
      await licenseStorage.saveLicense(newLicense);

      const loaded = await licenseStorage.getLicense();
      expect(loaded.code).toBe('NEW-CODE');
    });

    test('handles missing optional fields', async () => {
      const minimal = {
        code: 'TEST-CODE',
        type: 'private',
        validated: true,
      };

      const result = await licenseStorage.saveLicense(minimal);
      expect(result.success).toBe(true);

      const loaded = await licenseStorage.getLicense();
      expect(loaded.activatedBy).toBeNull();
    });
  });

  describe('getLicense()', () => {
    test('returns null when no license exists', async () => {
      const license = await licenseStorage.getLicense();
      expect(license).toBeNull();
    });

    test('retrieves saved license', async () => {
      await licenseStorage.saveLicense(testLicense);
      const loaded = await licenseStorage.getLicense();

      expect(loaded.code).toBe(testLicense.code);
      expect(loaded.type).toBe(testLicense.type);
      expect(loaded.validated).toBe(testLicense.validated);
    });

    test('decrypts data correctly', async () => {
      await licenseStorage.saveLicense(testLicense);
      const loaded = await licenseStorage.getLicense();

      // All fields should match
      expect(loaded.code).toBe(testLicense.code);
      expect(loaded.type).toBe(testLicense.type);
      expect(loaded.validated).toBe(testLicense.validated);
      expect(loaded.activatedBy).toBe(testLicense.activatedBy);
      expect(loaded.validatedAt).toBe(testLicense.validatedAt);
    });

    test('throws error on corrupted data', async () => {
      await licenseStorage.saveLicense(testLicense);

      // Corrupt the file
      await fs.writeFile('./test-data/license.dat', 'corrupted-data');

      await expect(licenseStorage.getLicense()).rejects.toThrow();
    });
  });

  describe('hasValidLicense()', () => {
    test('returns false when no license exists', async () => {
      const result = await licenseStorage.hasValidLicense();
      expect(result).toBe(false);
    });

    test('returns true when valid license exists', async () => {
      await licenseStorage.saveLicense(testLicense);
      const result = await licenseStorage.hasValidLicense();
      expect(result).toBe(true);
    });

    test('returns false when license is not validated', async () => {
      const invalidLicense = { ...testLicense, validated: false };
      await licenseStorage.saveLicense(invalidLicense);

      const result = await licenseStorage.hasValidLicense();
      expect(result).toBe(false);
    });

    test('returns false on corrupted data', async () => {
      await licenseStorage.saveLicense(testLicense);
      await fs.writeFile('./test-data/license.dat', 'corrupted');

      const result = await licenseStorage.hasValidLicense();
      expect(result).toBe(false);
    });
  });

  describe('getLicenseValidationState()', () => {
    test('returns not exists when no license', async () => {
      const state = await licenseStorage.getLicenseValidationState();
      expect(state.exists).toBe(false);
      expect(state.validated).toBe(false);
    });

    test('returns full state for existing license', async () => {
      await licenseStorage.saveLicense(testLicense);
      const state = await licenseStorage.getLicenseValidationState();

      expect(state.exists).toBe(true);
      expect(state.validated).toBe(true);
      expect(state.type).toBe('private');
      expect(state.activatedBy).toBe('test@example.com');
    });

    test('includes error message on failure', async () => {
      await licenseStorage.saveLicense(testLicense);
      await fs.writeFile('./test-data/license.dat', 'corrupted');

      const state = await licenseStorage.getLicenseValidationState();
      expect(state.exists).toBe(false);
      expect(state.error).toBeDefined();
    });
  });

  describe('updateLicenseValidation()', () => {
    test('updates validation status', async () => {
      await licenseStorage.saveLicense(testLicense);
      await licenseStorage.updateLicenseValidation(false);

      const loaded = await licenseStorage.getLicense();
      expect(loaded.validated).toBe(false);
    });

    test('updates validatedAt timestamp when setting to true', async () => {
      await licenseStorage.saveLicense(testLicense);
      const originalTime = testLicense.validatedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await licenseStorage.updateLicenseValidation(true);
      const loaded = await licenseStorage.getLicense();

      expect(loaded.validatedAt).not.toBe(originalTime);
    });

    test('returns error when no license exists', async () => {
      const result = await licenseStorage.updateLicenseValidation(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No license found');
    });
  });

  describe('clearLicense()', () => {
    test('removes license file', async () => {
      await licenseStorage.saveLicense(testLicense);
      await licenseStorage.clearLicense();

      const exists = await fs
        .access('./test-data/license.dat')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    test('returns success even if no file exists', async () => {
      const result = await licenseStorage.clearLicense();
      expect(result.success).toBe(true);
    });

    test('after clear, getLicense returns null', async () => {
      await licenseStorage.saveLicense(testLicense);
      await licenseStorage.clearLicense();

      const license = await licenseStorage.getLicense();
      expect(license).toBeNull();
    });
  });

  describe('getStorageInfo()', () => {
    test('returns file info when license exists', async () => {
      await licenseStorage.saveLicense(testLicense);
      const info = await licenseStorage.getStorageInfo();

      expect(info.exists).toBe(true);
      expect(info.path).toContain('license.dat');
      expect(info.size).toBeGreaterThan(0);
      expect(info.created).toBeDefined();
      expect(info.modified).toBeDefined();
    });

    test('returns not exists when no license', async () => {
      const info = await licenseStorage.getStorageInfo();
      expect(info.exists).toBe(false);
      expect(info.error).toBeDefined();
    });
  });

  describe('Encryption Security', () => {
    test('file content is encrypted (not plaintext)', async () => {
      await licenseStorage.saveLicense(testLicense);
      const fileContent = await fs.readFile('./test-data/license.dat', 'utf8');

      // Should not contain plaintext code
      expect(fileContent).not.toContain(testLicense.code);
      expect(fileContent).not.toContain(testLicense.type);
      expect(fileContent).not.toContain(testLicense.activatedBy);
    });

    test('encrypted content changes each save (random IV)', async () => {
      await licenseStorage.saveLicense(testLicense);
      const content1 = await fs.readFile('./test-data/license.dat', 'utf8');

      await licenseStorage.saveLicense(testLicense);
      const content2 = await fs.readFile('./test-data/license.dat', 'utf8');

      // Different IV means different encrypted output
      expect(content1).not.toBe(content2);
    });

    test('tampering with encrypted file causes decryption failure', async () => {
      await licenseStorage.saveLicense(testLicense);

      // Read and tamper with encrypted content
      const encrypted = await fs.readFile('./test-data/license.dat', 'utf8');
      const tampered = encrypted.slice(0, -10) + 'XXXXXXXXXX';
      await fs.writeFile('./test-data/license.dat', tampered);

      await expect(licenseStorage.getLicense()).rejects.toThrow();
    });
  });

  describe('Migration', () => {
    test('migrateLicenseData returns false when no license', async () => {
      const migrated = await licenseStorage.migrateLicenseData();
      expect(migrated).toBe(false);
    });

    test('saveLicense always adds version', async () => {
      // Save license without version field
      const noVersion = { ...testLicense };
      delete noVersion.version;
      await licenseStorage.saveLicense(noVersion);

      // saveLicense automatically adds version: 1
      const loaded = await licenseStorage.getLicense();
      expect(loaded.version).toBe(1);

      // No migration needed since saveLicense adds version
      const migrated = await licenseStorage.migrateLicenseData();
      expect(migrated).toBe(false);
    });

    test('does not migrate current version', async () => {
      await licenseStorage.saveLicense(testLicense);
      const migrated = await licenseStorage.migrateLicenseData();
      expect(migrated).toBe(false);
    });
  });
});
