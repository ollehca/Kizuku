/**
 * Unit Tests: Authentication Orchestrator
 *
 * Tests authentication flow coordination.
 */

const authOrchestrator = require('../../src/services/auth-orchestrator');
const licenseStorage = require('../../src/services/license-storage');
const userStorage = require('../../src/services/user-storage');
const fs = require('node:fs').promises;

describe('Authentication Orchestrator', () => {
  const validLicenseCode = 'KIZUKU-50019-99AC6-14B35-557C8-509D0';

  const testUserData = {
    username: 'testuser',
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'SecurePass123!',
  };

  beforeEach(async () => {
    try {
      await fs.rm('./test-data', { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('./test-data', { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('checkAuthenticationState()', () => {
    test('returns no-license when no license exists', async () => {
      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(false);
      expect(state.nextScreen).toBe('license-selection');
      expect(state.reason).toBe('no-license');
    });

    test('returns no-account when license but no account', async () => {
      // Save valid license
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });

      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(false);
      expect(state.nextScreen).toBe('account-creation');
      expect(state.reason).toBe('no-account');
    });

    test('returns authenticated when both license and account exist', async () => {
      // Save license
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });

      // Save user
      await userStorage.saveUser({
        username: 'testuser',
        fullName: 'Test User',
        preferences: {},
      });

      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(true);
      expect(state.nextScreen).toBe('main-app');
      expect(state.reason).toBe('private-license-auto-login');
      expect(state.licenseType).toBe('private');
    });

    test('handles corrupted storage gracefully', async () => {
      // Corrupt storage - hasValidLicense() returns false instead of throwing
      await fs.mkdir('./test-data', { recursive: true });
      await fs.writeFile('./test-data/license.dat', 'corrupted');

      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(false);
      expect(state.reason).toBe('no-license'); // Corrupted license treated as missing
      expect(state.nextScreen).toBe('license-selection');
    });
  });

  describe('validateAndSaveLicense()', () => {
    test('validates and saves correct license', async () => {
      const { generateLicense } = require('../../src/services/license-code');
      const generated = generateLicense();

      const result = await authOrchestrator.validateAndSaveLicense(generated.code);

      expect(result.success).toBe(true);
      expect(result.license.code).toBe(generated.code);
      expect(result.license.type).toBe(generated.type);
    });

    test('rejects invalid license code', async () => {
      const result = await authOrchestrator.validateAndSaveLicense('INVALID-CODE');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('saves validated license to storage', async () => {
      const { generateLicense } = require('../../src/services/license-code');
      const generated = generateLicense();

      await authOrchestrator.validateAndSaveLicense(generated.code);

      const stored = await licenseStorage.getLicense();
      expect(stored).not.toBeNull();
      expect(stored.code).toBe(generated.code);
      expect(stored.validated).toBe(true);
    });

    test('sets validated flag to true', async () => {
      const { generateLicense } = require('../../src/services/license-code');
      const generated = generateLicense();

      await authOrchestrator.validateAndSaveLicense(generated.code);

      const stored = await licenseStorage.getLicense();
      expect(stored.validated).toBe(true);
    });
  });

  describe('createUserAccount()', () => {
    test('creates user account successfully', async () => {
      const result = await authOrchestrator.createUserAccount(testUserData);

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(testUserData.username);
    });

    test('hashes password before storage', async () => {
      await authOrchestrator.createUserAccount(testUserData);

      const stored = await userStorage.getUser();
      expect(stored.passwordHash).toBeDefined();
      expect(stored.passwordHash).not.toBe(testUserData.password);
      expect(stored.passwordHash).toContain(':'); // salt:hash format
    });

    test('stores user data correctly', async () => {
      await authOrchestrator.createUserAccount(testUserData);

      const stored = await userStorage.getUser();
      expect(stored.username).toBe(testUserData.username);
      expect(stored.fullName).toBe(testUserData.fullName);
      expect(stored.email).toBe(testUserData.email);
    });

    test('validates user data before saving', async () => {
      const invalidData = {
        username: 'ab', // Too short
        fullName: 'Test',
        password: 'pass',
      };

      const result = await authOrchestrator.createUserAccount(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    test('updates license with activation email', async () => {
      // Save license first
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });

      await authOrchestrator.createUserAccount(testUserData);

      const license = await licenseStorage.getLicense();
      expect(license.activatedBy).toBe(testUserData.email);
    });

    test('handles missing email gracefully', async () => {
      const noEmail = { ...testUserData };
      delete noEmail.email;

      const result = await authOrchestrator.createUserAccount(noEmail);

      expect(result.success).toBe(true);
      expect(result.user.email).toBeUndefined();
    });
  });

  describe('authenticateUser()', () => {
    beforeEach(async () => {
      // Create user account first
      await authOrchestrator.createUserAccount(testUserData);
    });

    test('authenticates with correct credentials', async () => {
      const result = await authOrchestrator.authenticateUser(
        testUserData.username,
        testUserData.password
      );

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(testUserData.username);
    });

    test('rejects incorrect password', async () => {
      const result = await authOrchestrator.authenticateUser(
        testUserData.username,
        'WrongPassword'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid username or password');
    });

    test('rejects incorrect username', async () => {
      const result = await authOrchestrator.authenticateUser('wronguser', testUserData.password);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid username or password');
    });

    test('fails when no user account exists', async () => {
      await userStorage.deleteUser();

      const result = await authOrchestrator.authenticateUser(
        testUserData.username,
        testUserData.password
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No account found');
    });
  });

  describe('Password Security', () => {
    test('hashPassword creates unique hashes', () => {
      const hash1 = authOrchestrator.hashPassword('password123');
      const hash2 = authOrchestrator.hashPassword('password123');

      // Same password should produce different hashes (different salts)
      expect(hash1).not.toBe(hash2);
    });

    test('hashPassword produces salt:hash format', () => {
      const hash = authOrchestrator.hashPassword('password123');

      expect(hash).toContain(':');
      const parts = hash.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBe(32); // 16 bytes hex = 32 chars
      expect(parts[1].length).toBe(128); // 64 bytes hex = 128 chars
    });

    test('verifyPassword correctly verifies matching password', () => {
      const password = 'SecurePassword123!';
      const hash = authOrchestrator.hashPassword(password);

      const result = authOrchestrator.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    test('verifyPassword rejects wrong password', () => {
      const hash = authOrchestrator.hashPassword('correct');

      const result = authOrchestrator.verifyPassword('wrong', hash);
      expect(result).toBe(false);
    });

    test('verifyPassword handles corrupted hash', () => {
      const result = authOrchestrator.verifyPassword('password', 'corrupted-hash');
      expect(result).toBe(false);
    });
  });

  describe('getUserSummary()', () => {
    test('returns user summary', async () => {
      await authOrchestrator.createUserAccount(testUserData);

      const result = await authOrchestrator.getUserSummary();

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(testUserData.username);
      expect(result.user.fullName).toBe(testUserData.fullName);
    });

    test('fails when no user exists', async () => {
      const result = await authOrchestrator.getUserSummary();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getLicenseData()', () => {
    test('returns license data', async () => {
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });

      const result = await authOrchestrator.getLicenseData();

      expect(result.success).toBe(true);
      expect(result.license.code).toBe(validLicenseCode);
    });

    test('fails when no license exists', async () => {
      const result = await authOrchestrator.getLicenseData();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('clearAuthenticationData()', () => {
    test('clears both license and user data', async () => {
      // Setup data
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });
      await authOrchestrator.createUserAccount(testUserData);

      // Clear
      const result = await authOrchestrator.clearAuthenticationData();
      expect(result.success).toBe(true);

      // Verify cleared
      const license = await licenseStorage.getLicense();
      const user = await userStorage.getUser();
      expect(license).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe('Business License Flow', () => {
    beforeEach(async () => {
      // Setup business license
      const { generateLicense } = require('../../src/services/license-code');
      const businessLicense = generateLicense({ type: 'business' });
      await licenseStorage.saveLicense({
        code: businessLicense.code,
        type: 'business',
        validated: true,
        validatedAt: new Date().toISOString(),
      });
    });

    test('requires password for business license account creation', async () => {
      const noPassword = { ...testUserData };
      delete noPassword.password;

      const result = await authOrchestrator.createUserAccount(noPassword);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password is required');
    });

    test('creates session token on business license account creation', async () => {
      const result = await authOrchestrator.createUserAccount(testUserData);

      expect(result.success).toBe(true);
      expect(result.user.licenseType).toBe('business');

      // Verify session token was stored
      const authStorage = require('../../src/services/auth-storage');
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(true);
    });

    test('business license with valid session auto-logs in', async () => {
      // Create account (creates session token)
      await authOrchestrator.createUserAccount(testUserData);

      // Check auth state
      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(true);
      expect(state.nextScreen).toBe('main-app');
      expect(state.reason).toBe('valid-session-token');
      expect(state.licenseType).toBe('business');
    });

    test('business license without session requires login', async () => {
      // Create account
      await authOrchestrator.createUserAccount(testUserData);

      // Clear session
      const authStorage = require('../../src/services/auth-storage');
      authStorage.clearStoredCredentials();

      // Check auth state
      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(false);
      expect(state.nextScreen).toBe('login');
      expect(state.reason).toBe('session-expired');
      expect(state.licenseType).toBe('business');
    });

    test('authenticateUser creates new session token', async () => {
      // Create account
      await authOrchestrator.createUserAccount(testUserData);

      // Clear session
      const authStorage = require('../../src/services/auth-storage');
      authStorage.clearStoredCredentials();

      // Authenticate
      const result = await authOrchestrator.authenticateUser(
        testUserData.username,
        testUserData.password,
        true // rememberMe
      );

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBeDefined();

      // Verify session was stored
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(true);
    });

    test('authenticateUser rejects private license authentication', async () => {
      // Switch to private license
      await licenseStorage.clearLicense();
      const { generateLicense } = require('../../src/services/license-code');
      const privateLicense = generateLicense({ type: 'private' });
      await licenseStorage.saveLicense({
        code: privateLicense.code,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });

      // Create account without password
      const noPassword = { ...testUserData };
      delete noPassword.password;
      await authOrchestrator.createUserAccount(noPassword);

      // Try to authenticate (should fail)
      const result = await authOrchestrator.authenticateUser('testuser', 'anypassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Private licenses do not require password');
    });
  });

  describe('Private License Flow', () => {
    beforeEach(async () => {
      // Setup private license
      const { generateLicense } = require('../../src/services/license-code');
      const privateLicense = generateLicense({ type: 'private' });
      await licenseStorage.saveLicense({
        code: privateLicense.code,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });
    });

    test('allows account creation without password', async () => {
      const noPassword = { ...testUserData };
      delete noPassword.password;

      const result = await authOrchestrator.createUserAccount(noPassword);

      expect(result.success).toBe(true);
      expect(result.user.licenseType).toBe('private');
    });

    test('does not create session token for private license', async () => {
      const noPassword = { ...testUserData };
      delete noPassword.password;

      await authOrchestrator.createUserAccount(noPassword);

      // Verify no session token
      const authStorage = require('../../src/services/auth-storage');
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(false);
    });

    test('auto-logs in on every launch', async () => {
      const noPassword = { ...testUserData };
      delete noPassword.password;
      await authOrchestrator.createUserAccount(noPassword);

      const state = await authOrchestrator.checkAuthenticationState();

      expect(state.authenticated).toBe(true);
      expect(state.nextScreen).toBe('main-app');
      expect(state.reason).toBe('private-license-auto-login');
    });
  });

  describe('Session Management', () => {
    test('logoutUser clears session token', () => {
      const authStorage = require('../../src/services/auth-storage');
      authStorage.storeCredentials({
        email: 'test@example.com',
        token: 'test-token',
        rememberMe: false,
      });

      const result = authOrchestrator.logoutUser();

      expect(result.success).toBe(true);
      expect(authStorage.hasValidCredentials()).toBe(false);
    });

    test('getAuthenticationStatus returns complete status', async () => {
      // Setup
      await licenseStorage.saveLicense({
        code: validLicenseCode,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
      });
      await userStorage.saveUser({
        username: 'testuser',
        fullName: 'Test User',
        preferences: {},
      });

      const status = await authOrchestrator.getAuthenticationStatus();

      expect(status.success).toBe(true);
      expect(status.hasLicense).toBe(true);
      expect(status.hasUser).toBe(true);
      expect(status.licenseType).toBe('private');
      expect(status.isPrivateLicense).toBe(true);
      expect(status.requiresPassword).toBe(false);
      expect(status.user).toBeDefined();
      expect(status.user.username).toBe('testuser');
    });
  });
});
