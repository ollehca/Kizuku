/**
 * Unit Tests: Authentication Storage Service
 *
 * Tests secure credential storage using Electron's safeStorage.
 */

const fs = require('node:fs').promises;
const path = require('node:path');

// Need to require auth-storage after the mock is set up
let authStorage;

describe('Authentication Storage Service', () => {
  const testCredentials = {
    email: 'test@example.com',
    token: 'test-auth-token-12345',
    rememberMe: false,
  };

  const testCredentialsWithRememberMe = {
    email: 'remember@example.com',
    token: 'remember-token-67890',
    rememberMe: true,
  };

  beforeAll(() => {
    // Require auth-storage after mocks are set up
    authStorage = require('../../src/services/auth-storage');
  });

  beforeEach(async () => {
    // Clean up test data
    try {
      await fs.rm('./test-data/secure', { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      authStorage.clearStoredCredentials();
      await fs.rm('./test-data/secure', { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('storeCredentials()', () => {
    test('stores credentials successfully without remember me', () => {
      const result = authStorage.storeCredentials(testCredentials);
      expect(result).toBe(true);
    });

    test('stores credentials successfully with remember me', () => {
      const result = authStorage.storeCredentials(testCredentialsWithRememberMe);
      expect(result).toBe(true);
    });

    test('creates secure directory if not exists', () => {
      authStorage.storeCredentials(testCredentials);

      const dirExists = require('node:fs').existsSync('./test-data/secure');
      expect(dirExists).toBe(true);
    });

    test('creates encrypted file', () => {
      authStorage.storeCredentials(testCredentials);

      const fileExists = require('node:fs').existsSync('./test-data/secure/credentials.enc');
      expect(fileExists).toBe(true);
    });

    test('sets expiry to 7 days for non-remember-me', () => {
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiry = stored.storedAt + sevenDays;

      // Allow 1 second tolerance for test execution time
      expect(stored.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(stored.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    test('sets expiry to 30 days for remember-me', () => {
      authStorage.storeCredentials(testCredentialsWithRememberMe);
      const stored = authStorage.getStoredCredentials();

      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expectedExpiry = stored.storedAt + thirtyDays;

      // Allow 1 second tolerance for test execution time
      expect(stored.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(stored.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    test('adds version to stored data', () => {
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.version).toBe('1.0');
    });

    test('adds timestamps to stored data', () => {
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.storedAt).toBeDefined();
      expect(stored.expiresAt).toBeDefined();
      expect(typeof stored.storedAt).toBe('number');
      expect(typeof stored.expiresAt).toBe('number');
    });

    test('overwrites existing credentials', () => {
      authStorage.storeCredentials(testCredentials);
      authStorage.storeCredentials(testCredentialsWithRememberMe);

      const stored = authStorage.getStoredCredentials();
      expect(stored.email).toBe(testCredentialsWithRememberMe.email);
      expect(stored.token).toBe(testCredentialsWithRememberMe.token);
    });
  });

  describe('getStoredCredentials()', () => {
    test('returns null when no credentials exist', () => {
      const credentials = authStorage.getStoredCredentials();
      expect(credentials).toBeNull();
    });

    test('retrieves stored credentials', () => {
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.email).toBe(testCredentials.email);
      expect(stored.token).toBe(testCredentials.token);
      expect(stored.rememberMe).toBe(testCredentials.rememberMe);
    });

    test('returns null for expired credentials', () => {
      // Store credentials with a past expiry
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      // Manually corrupt the file to set past expiry
      const { safeStorage } = require('electron');
      const expiredData = {
        ...stored,
        expiresAt: Date.now() - 1000, // 1 second ago
      };

      const fs = require('node:fs');
      const encrypted = safeStorage.encryptString(JSON.stringify(expiredData));
      fs.writeFileSync('./test-data/secure/credentials.enc', encrypted);

      const retrieved = authStorage.getStoredCredentials();
      expect(retrieved).toBeNull();
    });

    test('clears expired credentials', () => {
      // Store credentials
      authStorage.storeCredentials(testCredentials);

      // Manually set expired date
      const { safeStorage } = require('electron');
      const stored = authStorage.getStoredCredentials();
      const expiredData = {
        ...stored,
        expiresAt: Date.now() - 1000,
      };

      const fs = require('node:fs');
      const encrypted = safeStorage.encryptString(JSON.stringify(expiredData));
      fs.writeFileSync('./test-data/secure/credentials.enc', encrypted);

      authStorage.getStoredCredentials();

      // File should be deleted
      const fileExists = fs.existsSync('./test-data/secure/credentials.enc');
      expect(fileExists).toBe(false);
    });

    test('extends session for remember-me users', () => {
      authStorage.storeCredentials(testCredentialsWithRememberMe);

      // Manually set expiry to 6 days from now (within 7 day extension threshold)
      const { safeStorage } = require('electron');
      const stored = authStorage.getStoredCredentials();
      const sixDays = 6 * 24 * 60 * 60 * 1000;
      const nearExpiry = {
        ...stored,
        expiresAt: Date.now() + sixDays,
      };

      const fs = require('node:fs');
      const encrypted = safeStorage.encryptString(JSON.stringify(nearExpiry));
      fs.writeFileSync('./test-data/secure/credentials.enc', encrypted);

      // Get credentials - should trigger extension
      const retrieved = authStorage.getStoredCredentials();

      // Should be extended to 30 days from now
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expectedExpiry = Date.now() + thirtyDays;

      expect(retrieved.expiresAt).toBeGreaterThan(Date.now() + sixDays);
      expect(retrieved.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    });

    test('does not extend session for non-remember-me users', () => {
      authStorage.storeCredentials(testCredentials);

      const { safeStorage } = require('electron');
      const stored = authStorage.getStoredCredentials();
      const originalExpiry = stored.expiresAt;

      // Get credentials again
      const retrieved = authStorage.getStoredCredentials();

      // Expiry should not change
      expect(retrieved.expiresAt).toBe(originalExpiry);
    });

    test('returns null on corrupted data', () => {
      const fs = require('node:fs');
      fs.mkdirSync('./test-data/secure', { recursive: true });
      fs.writeFileSync('./test-data/secure/credentials.enc', 'corrupted-data');

      const credentials = authStorage.getStoredCredentials();
      expect(credentials).toBeNull();
    });

    test('clears corrupted data', () => {
      const fs = require('node:fs');
      fs.mkdirSync('./test-data/secure', { recursive: true });
      fs.writeFileSync('./test-data/secure/credentials.enc', 'corrupted-data');

      authStorage.getStoredCredentials();

      const fileExists = fs.existsSync('./test-data/secure/credentials.enc');
      expect(fileExists).toBe(false);
    });
  });

  describe('clearStoredCredentials()', () => {
    test('removes credentials file', () => {
      authStorage.storeCredentials(testCredentials);
      authStorage.clearStoredCredentials();

      const fs = require('node:fs');
      const fileExists = fs.existsSync('./test-data/secure/credentials.enc');
      expect(fileExists).toBe(false);
    });

    test('does not error if no file exists', () => {
      expect(() => {
        authStorage.clearStoredCredentials();
      }).not.toThrow();
    });

    test('after clear, getStoredCredentials returns null', () => {
      authStorage.storeCredentials(testCredentials);
      authStorage.clearStoredCredentials();

      const credentials = authStorage.getStoredCredentials();
      expect(credentials).toBeNull();
    });
  });

  describe('hasValidCredentials()', () => {
    test('returns false when no credentials exist', () => {
      const hasValid = authStorage.hasValidCredentials();
      expect(hasValid).toBe(false);
    });

    test('returns true when valid credentials exist', () => {
      authStorage.storeCredentials(testCredentials);
      const hasValid = authStorage.hasValidCredentials();
      expect(hasValid).toBe(true);
    });

    test('returns false when credentials expired', () => {
      authStorage.storeCredentials(testCredentials);

      // Manually set expired date
      const { safeStorage } = require('electron');
      const stored = authStorage.getStoredCredentials();
      const expiredData = {
        ...stored,
        expiresAt: Date.now() - 1000,
      };

      const fs = require('node:fs');
      const encrypted = safeStorage.encryptString(JSON.stringify(expiredData));
      fs.writeFileSync('./test-data/secure/credentials.enc', encrypted);

      const hasValid = authStorage.hasValidCredentials();
      expect(hasValid).toBe(false);
    });

    test('returns false when credentials lack token', () => {
      authStorage.storeCredentials(testCredentials);

      // Manually corrupt credentials to remove token
      const { safeStorage } = require('electron');
      const stored = authStorage.getStoredCredentials();
      const noToken = {
        ...stored,
        token: null,
      };

      const fs = require('node:fs');
      const encrypted = safeStorage.encryptString(JSON.stringify(noToken));
      fs.writeFileSync('./test-data/secure/credentials.enc', encrypted);

      const hasValid = authStorage.hasValidCredentials();
      expect(hasValid).toBe(false);
    });
  });

  describe('getSessionInfo()', () => {
    test('returns no session when no credentials', () => {
      const info = authStorage.getSessionInfo();
      expect(info.hasSession).toBe(false);
    });

    test('returns session info for valid credentials', () => {
      authStorage.storeCredentials(testCredentials);
      const info = authStorage.getSessionInfo();

      expect(info.hasSession).toBe(true);
      expect(info.email).toBe(testCredentials.email);
      expect(info.rememberMe).toBe(testCredentials.rememberMe);
      expect(info.daysRemaining).toBeDefined();
      expect(info.expiresAt).toBeDefined();
      expect(info.storedAt).toBeDefined();
    });

    test('calculates correct days remaining', () => {
      authStorage.storeCredentials(testCredentials);
      const info = authStorage.getSessionInfo();

      // Should be approximately 7 days for non-remember-me
      expect(info.daysRemaining).toBeGreaterThanOrEqual(6);
      expect(info.daysRemaining).toBeLessThanOrEqual(8);
    });

    test('calculates correct days remaining for remember-me', () => {
      authStorage.storeCredentials(testCredentialsWithRememberMe);
      const info = authStorage.getSessionInfo();

      // Should be approximately 30 days for remember-me
      expect(info.daysRemaining).toBeGreaterThanOrEqual(29);
      expect(info.daysRemaining).toBeLessThanOrEqual(31);
    });

    test('formats dates as locale strings', () => {
      authStorage.storeCredentials(testCredentials);
      const info = authStorage.getSessionInfo();

      expect(typeof info.expiresAt).toBe('string');
      expect(typeof info.storedAt).toBe('string');
      expect(info.expiresAt).toContain('/'); // Date format includes /
      expect(info.storedAt).toContain('/');
    });
  });

  describe('Encryption Security', () => {
    test('file content is encrypted (base64)', () => {
      authStorage.storeCredentials(testCredentials);

      const fs = require('node:fs');
      const fileContent = fs.readFileSync('./test-data/secure/credentials.enc', 'utf8');

      // Should be base64 encoded (our mock)
      expect(fileContent).not.toContain(testCredentials.email);
      expect(fileContent).not.toContain(testCredentials.token);
    });

    test('stored data includes all credential fields', () => {
      authStorage.storeCredentials(testCredentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.email).toBe(testCredentials.email);
      expect(stored.token).toBe(testCredentials.token);
      expect(stored.rememberMe).toBe(testCredentials.rememberMe);
    });
  });

  describe('Edge Cases', () => {
    test('handles very long tokens', () => {
      const longToken = 'x'.repeat(10000);
      const credentials = {
        ...testCredentials,
        token: longToken,
      };

      authStorage.storeCredentials(credentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.token).toBe(longToken);
    });

    test('handles special characters in email', () => {
      const specialEmail = 'test+special@example.com';
      const credentials = {
        ...testCredentials,
        email: specialEmail,
      };

      authStorage.storeCredentials(credentials);
      const stored = authStorage.getStoredCredentials();

      expect(stored.email).toBe(specialEmail);
    });

    test('handles missing optional fields', () => {
      const minimal = {
        token: 'token123',
      };

      authStorage.storeCredentials(minimal);
      const stored = authStorage.getStoredCredentials();

      expect(stored.token).toBe(minimal.token);
      expect(stored.email).toBeUndefined();
    });
  });
});
