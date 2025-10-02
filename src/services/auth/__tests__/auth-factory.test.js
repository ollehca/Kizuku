const { createAuthProvider, createLocalAuthProvider } = require('../auth-factory');
const LocalAuthProvider = require('../local-auth-provider');

jest.mock(
  '../../license-storage',
  () => ({
    getLicense: jest.fn(),
  }),
  { virtual: true }
);

describe('AuthFactory', () => {
  let mockLicenseStorage;

  beforeEach(() => {
    mockLicenseStorage = require('../../license-storage');
    jest.clearAllMocks();
  });

  describe('createAuthProvider', () => {
    test('throws error for private license (auth modules not available)', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'private',
        code: 'KIZU-12345-ABCDE-FGHIJ-KLMNO-PQRST',
      });

      await expect(createAuthProvider()).rejects.toThrow('Auth modules not found');
    });

    test('throws error for business license (not yet implemented)', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: true,
        type: 'business',
        code: 'KIZU-BIZ-12345-ABCDE',
      });

      await expect(createAuthProvider()).rejects.toThrow(
        'Cloud authentication not yet implemented'
      );
    });

    test('throws error when no valid license', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue({
        valid: false,
      });

      await expect(createAuthProvider()).rejects.toThrow('No valid license found');
    });

    test('throws error when license is null', async () => {
      mockLicenseStorage.getLicense.mockResolvedValue(null);

      await expect(createAuthProvider()).rejects.toThrow('No valid license found');
    });

    test('creates provider with explicit licenseType', async () => {
      const provider = createLocalAuthProvider.bind(null, {});

      await expect(provider()).rejects.toThrow('Auth modules not found');
    });
  });

  describe('createLocalAuthProvider', () => {
    test('creates LocalAuthProvider instance', () => {
      const provider = new LocalAuthProvider();
      expect(provider).toBeInstanceOf(LocalAuthProvider);
    });

    test('throws error during initialization (auth modules not available)', async () => {
      await expect(createLocalAuthProvider()).rejects.toThrow('Auth modules not found');
    });

    test('does not require license check', async () => {
      try {
        await createLocalAuthProvider();
      } catch {
        // Expected to fail due to missing auth modules
      }

      expect(mockLicenseStorage.getLicense).not.toHaveBeenCalled();
    });
  });

  describe('provider interface', () => {
    test('LocalAuthProvider has correct interface', () => {
      const provider = new LocalAuthProvider();

      expect(typeof provider.initialize).toBe('function');
      expect(typeof provider.authenticate).toBe('function');
      expect(typeof provider.validateSession).toBe('function');
      expect(typeof provider.getAuthState).toBe('function');
      expect(typeof provider.logout).toBe('function');
      expect(typeof provider.createAccount).toBe('function');
      expect(typeof provider.hasAccount).toBe('function');
    });

    test('methods throw when not initialized', async () => {
      const provider = new LocalAuthProvider();

      await expect(provider.authenticate({ username: 'test', password: 'test' })).rejects.toThrow(
        'LocalAuthProvider not initialized'
      );

      await expect(provider.validateSession()).rejects.toThrow('LocalAuthProvider not initialized');

      await expect(provider.getAuthState()).rejects.toThrow('LocalAuthProvider not initialized');

      await expect(provider.logout()).rejects.toThrow('LocalAuthProvider not initialized');

      await expect(
        provider.createAccount({
          username: 'test',
          fullName: 'Test',
          email: 'test@example.com',
        })
      ).rejects.toThrow('LocalAuthProvider not initialized');

      await expect(provider.hasAccount()).rejects.toThrow('LocalAuthProvider not initialized');
    });
  });
});
