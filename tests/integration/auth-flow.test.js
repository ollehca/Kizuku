/**
 * Integration Tests: Complete Authentication Flow
 *
 * Tests the end-to-end authentication flow including:
 * - License validation and storage
 * - User account creation
 * - Authentication state checking
 * - Session management (business licenses)
 * - Auto-login (private licenses)
 */

const authOrchestrator = require('../../src/services/auth-orchestrator');
const licenseStorage = require('../../src/services/license-storage');
const userStorage = require('../../src/services/user-storage');
const authStorage = require('../../src/services/auth-storage');
const { generateLicense } = require('../../src/services/license-code');
const fs = require('fs').promises;

describe('Complete Authentication Flow - Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
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

  describe('Private License Complete Flow', () => {
    test('first-time setup: license entry → account creation → auto-login', async () => {
      // 1. User has no license - should show license selection
      let authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(false);
      expect(authState.nextScreen).toBe('license-selection');
      expect(authState.reason).toBe('no-license');

      // 2. User enters license code
      const license = generateLicense({ type: 'private', email: 'user@example.com' });
      const licenseResult = await authOrchestrator.validateAndSaveLicense(license.code);

      expect(licenseResult.success).toBe(true);
      expect(licenseResult.license.type).toBe('private');

      // 3. License valid but no account - should show account creation
      authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(false);
      expect(authState.nextScreen).toBe('account-creation');
      expect(authState.reason).toBe('no-account');
      expect(authState.licenseType).toBe('private');

      // 4. User creates account (no password for private license)
      const accountResult = await authOrchestrator.createUserAccount({
        username: 'testuser',
        fullName: 'Test User',
        email: 'user@example.com',
      });

      expect(accountResult.success).toBe(true);
      expect(accountResult.user.licenseType).toBe('private');

      // 5. Setup complete - should auto-login
      authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(true);
      expect(authState.nextScreen).toBe('main-app');
      expect(authState.reason).toBe('private-license-auto-login');
      expect(authState.licenseType).toBe('private');
    });

    test('subsequent launches: auto-login directly', async () => {
      // Setup: existing license and account
      const license = generateLicense({ type: 'private' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'testuser',
        fullName: 'Test User',
        email: 'user@example.com',
      });

      // Simulate app restart - should go straight to main app
      const authState = await authOrchestrator.checkAuthenticationState();

      expect(authState.authenticated).toBe(true);
      expect(authState.nextScreen).toBe('main-app');
      expect(authState.reason).toBe('private-license-auto-login');
    });

    test('no password required or stored for private licenses', async () => {
      const license = generateLicense({ type: 'private' });
      await authOrchestrator.validateAndSaveLicense(license.code);

      const accountResult = await authOrchestrator.createUserAccount({
        username: 'testuser',
        fullName: 'Test User',
        email: 'user@example.com',
        // Note: no password provided
      });

      expect(accountResult.success).toBe(true);

      const user = await userStorage.getUser();
      expect(user.passwordHash).toBeNull();
    });
  });

  describe('Business License Complete Flow', () => {
    test('first-time setup: license entry → account with password → session token', async () => {
      // 1. Generate business license
      const license = generateLicense({ type: 'business', email: 'biz@example.com' });
      const licenseResult = await authOrchestrator.validateAndSaveLicense(license.code);

      expect(licenseResult.success).toBe(true);
      expect(licenseResult.license.type).toBe('business');

      // 2. Create account with password
      const accountResult = await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
        email: 'biz@example.com',
        password: 'SecurePassword123!',
        rememberMe: false,
      });

      expect(accountResult.success).toBe(true);
      expect(accountResult.user.licenseType).toBe('business');

      // 3. Verify password was hashed
      const user = await userStorage.getUser();
      expect(user.passwordHash).not.toBeNull();
      expect(user.passwordHash).toContain(':'); // salt:hash format

      // 4. Verify session token was created
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(true);

      // 5. Should auto-login via session
      const authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(true);
      expect(authState.reason).toBe('valid-session-token');
    });

    test('subsequent launch with valid session: auto-login', async () => {
      // Setup: existing business account with session
      const license = generateLicense({ type: 'business' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
        email: 'biz@example.com',
        password: 'password123',
      });

      // Simulate app restart - should still have valid session
      const authState = await authOrchestrator.checkAuthenticationState();

      expect(authState.authenticated).toBe(true);
      expect(authState.nextScreen).toBe('main-app');
      expect(authState.reason).toBe('valid-session-token');
    });

    test('session expired: requires re-authentication', async () => {
      // Setup: existing business account
      const license = generateLicense({ type: 'business' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
        email: 'biz@example.com',
        password: 'password123',
      });

      // Clear session (simulate expiry)
      authStorage.clearStoredCredentials();

      // Should require login
      const authState = await authOrchestrator.checkAuthenticationState();

      expect(authState.authenticated).toBe(false);
      expect(authState.nextScreen).toBe('login');
      expect(authState.reason).toBe('session-expired');
    });

    test('re-authentication flow: password → new session token', async () => {
      // Setup: existing business account, no session
      const license = generateLicense({ type: 'business' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
        email: 'biz@example.com',
        password: 'password123',
      });
      authStorage.clearStoredCredentials();

      // Re-authenticate
      const authResult = await authOrchestrator.authenticateUser('bizuser', 'password123', true);

      expect(authResult.success).toBe(true);
      expect(authResult.sessionToken).toBeDefined();

      // Verify new session was created
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(true);

      // Should now be authenticated
      const authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(true);
    });

    test('logout flow: clears session, requires re-auth', async () => {
      // Setup: authenticated business user
      const license = generateLicense({ type: 'business' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
        email: 'biz@example.com',
        password: 'password123',
      });

      // Logout
      const logoutResult = authOrchestrator.logoutUser();
      expect(logoutResult.success).toBe(true);

      // Session should be cleared
      const hasSession = authStorage.hasValidCredentials();
      expect(hasSession).toBe(false);

      // Should require re-authentication
      const authState = await authOrchestrator.checkAuthenticationState();
      expect(authState.authenticated).toBe(false);
      expect(authState.nextScreen).toBe('login');
    });
  });

  describe('Cross-License Type Scenarios', () => {
    test('cannot authenticate private license users with password', async () => {
      // Setup: private license user
      const license = generateLicense({ type: 'private' });
      await authOrchestrator.validateAndSaveLicense(license.code);
      await authOrchestrator.createUserAccount({
        username: 'testuser',
        fullName: 'Test User',
      });

      // Try to authenticate (should fail)
      const authResult = await authOrchestrator.authenticateUser('testuser', 'anypassword');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('Private licenses do not require password');
    });

    test('business license requires password for account creation', async () => {
      const license = generateLicense({ type: 'business' });
      await authOrchestrator.validateAndSaveLicense(license.code);

      // Try to create account without password
      const accountResult = await authOrchestrator.createUserAccount({
        username: 'bizuser',
        fullName: 'Business User',
      });

      expect(accountResult.success).toBe(false);
      expect(accountResult.error).toContain('Password is required');
    });
  });

  describe('Demo Account Integration', () => {
    test('demo license setup creates working authentication', async () => {
      // Simulate the demo setup script
      const DEMO_LICENSE_CODE = 'KIZUKU-50019-99FF9-D4EFF-5DE58-DC837';

      // Save demo license
      await licenseStorage.saveLicense({
        code: DEMO_LICENSE_CODE,
        type: 'private',
        validated: true,
        validatedAt: new Date().toISOString(),
        activatedBy: 'demo@penpot.local',
      });

      // Create demo user
      await userStorage.saveUser({
        username: 'demouser',
        fullName: 'Demo User',
        email: 'demo@penpot.local',
        passwordHash: null,
        createdAt: new Date().toISOString(),
        preferences: {
          licenseType: 'private',
          demo: true,
        },
      });

      // Verify authentication works
      const authState = await authOrchestrator.checkAuthenticationState();

      expect(authState.authenticated).toBe(true);
      expect(authState.nextScreen).toBe('main-app');
      expect(authState.reason).toBe('private-license-auto-login');
      expect(authState.licenseType).toBe('private');
    });
  });
});
