/**
 * Unit Tests: User Storage Service
 *
 * Tests encrypted user storage functionality.
 */

const userStorage = require('../../src/services/user-storage');
const fs = require('node:fs').promises;

describe('User Storage Service', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    preferences: {
      theme: 'dark',
      language: 'en',
    },
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

  describe('saveUser()', () => {
    test('saves user successfully', async () => {
      const result = await userStorage.saveUser(testUser);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    test('creates storage directory', async () => {
      await userStorage.saveUser(testUser);

      const exists = await fs
        .access('./test-data')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test('adds timestamps automatically', async () => {
      const result = await userStorage.saveUser(testUser);
      expect(result.user.createdAt).toBeDefined();
      expect(result.user.updatedAt).toBeDefined();
    });

    test('adds version number', async () => {
      await userStorage.saveUser(testUser);
      const loaded = await userStorage.getUser();
      expect(loaded.version).toBe(1);
    });

    test('handles null email', async () => {
      const noEmail = { ...testUser };
      delete noEmail.email;

      const result = await userStorage.saveUser(noEmail);
      expect(result.success).toBe(true);
      expect(result.user.email).toBeNull();
    });

    test('handles empty preferences', async () => {
      const noPrefs = { ...testUser };
      delete noPrefs.preferences;

      const result = await userStorage.saveUser(noPrefs);
      expect(result.success).toBe(true);
      expect(result.user.preferences).toEqual({});
    });

    test('overwrites existing user', async () => {
      await userStorage.saveUser(testUser);

      const newUser = { ...testUser, username: 'newuser' };
      await userStorage.saveUser(newUser);

      const loaded = await userStorage.getUser();
      expect(loaded.username).toBe('newuser');
    });
  });

  describe('getUser()', () => {
    test('returns null when no user exists', async () => {
      const user = await userStorage.getUser();
      expect(user).toBeNull();
    });

    test('retrieves saved user', async () => {
      await userStorage.saveUser(testUser);
      const loaded = await userStorage.getUser();

      expect(loaded.username).toBe(testUser.username);
      expect(loaded.email).toBe(testUser.email);
      expect(loaded.fullName).toBe(testUser.fullName);
    });

    test('decrypts preferences correctly', async () => {
      await userStorage.saveUser(testUser);
      const loaded = await userStorage.getUser();

      expect(loaded.preferences).toEqual(testUser.preferences);
    });

    test('throws error on corrupted data', async () => {
      await userStorage.saveUser(testUser);
      await fs.writeFile('./test-data/user.dat', 'corrupted');

      await expect(userStorage.getUser()).rejects.toThrow();
    });
  });

  describe('hasUser()', () => {
    test('returns false when no user exists', async () => {
      const exists = await userStorage.hasUser();
      expect(exists).toBe(false);
    });

    test('returns true when user exists', async () => {
      await userStorage.saveUser(testUser);
      const exists = await userStorage.hasUser();
      expect(exists).toBe(true);
    });

    test('returns false on corrupted data', async () => {
      await userStorage.saveUser(testUser);
      await fs.writeFile('./test-data/user.dat', 'corrupted');

      const exists = await userStorage.hasUser();
      expect(exists).toBe(false);
    });
  });

  describe('updateUser()', () => {
    test('updates user fields', async () => {
      await userStorage.saveUser(testUser);
      await userStorage.updateUser({ email: 'new@example.com' });

      const loaded = await userStorage.getUser();
      expect(loaded.email).toBe('new@example.com');
      expect(loaded.username).toBe(testUser.username); // Unchanged
    });

    test('updates updatedAt timestamp', async () => {
      await userStorage.saveUser(testUser);
      const original = await userStorage.getUser();

      await new Promise((resolve) => setTimeout(resolve, 10));
      await userStorage.updateUser({ email: 'new@example.com' });

      const updated = await userStorage.getUser();
      expect(updated.updatedAt).not.toBe(original.updatedAt);
    });

    test('preserves createdAt timestamp', async () => {
      await userStorage.saveUser(testUser);
      const original = await userStorage.getUser();

      await userStorage.updateUser({ email: 'new@example.com' });
      const updated = await userStorage.getUser();

      expect(updated.createdAt).toBe(original.createdAt);
    });

    test('returns error when no user exists', async () => {
      const result = await userStorage.updateUser({ email: 'new@example.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No user account found');
    });
  });

  describe('updatePreferences()', () => {
    test('merges new preferences', async () => {
      await userStorage.saveUser(testUser);
      await userStorage.updatePreferences({ fontSize: 14 });

      const loaded = await userStorage.getUser();
      expect(loaded.preferences).toEqual({
        theme: 'dark',
        language: 'en',
        fontSize: 14,
      });
    });

    test('overwrites existing preference', async () => {
      await userStorage.saveUser(testUser);
      await userStorage.updatePreferences({ theme: 'light' });

      const loaded = await userStorage.getUser();
      expect(loaded.preferences.theme).toBe('light');
    });

    test('returns error when no user exists', async () => {
      const result = await userStorage.updatePreferences({ theme: 'light' });
      expect(result.success).toBe(false);
    });
  });

  describe('getPreferences()', () => {
    test('returns preferences for existing user', async () => {
      await userStorage.saveUser(testUser);
      const prefs = await userStorage.getPreferences();

      expect(prefs).toEqual(testUser.preferences);
    });

    test('returns null when no user exists', async () => {
      const prefs = await userStorage.getPreferences();
      expect(prefs).toBeNull();
    });
  });

  describe('deleteUser()', () => {
    test('deletes user file', async () => {
      await userStorage.saveUser(testUser);
      await userStorage.deleteUser();

      const exists = await fs
        .access('./test-data/user.dat')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    test('returns success even if no user exists', async () => {
      const result = await userStorage.deleteUser();
      expect(result.success).toBe(true);
    });
  });

  describe('getUserSummary()', () => {
    test('returns summary for existing user', async () => {
      await userStorage.saveUser(testUser);
      const summary = await userStorage.getUserSummary();

      expect(summary.username).toBe(testUser.username);
      expect(summary.fullName).toBe(testUser.fullName);
      expect(summary.email).toBe(testUser.email);
      expect(summary.hasPreferences).toBe(true);
    });

    test('returns null when no user exists', async () => {
      const summary = await userStorage.getUserSummary();
      expect(summary).toBeNull();
    });

    test('indicates no preferences when empty', async () => {
      const noPrefs = { ...testUser, preferences: {} };
      await userStorage.saveUser(noPrefs);
      const summary = await userStorage.getUserSummary();

      expect(summary.hasPreferences).toBe(false);
    });
  });

  describe('validateUserData()', () => {
    test('validates correct user data', () => {
      const result = userStorage.validateUserData(testUser);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('requires username', () => {
      const noUsername = { ...testUser };
      delete noUsername.username;

      const result = userStorage.validateUserData(noUsername);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username is required');
    });

    test('requires username min length', () => {
      const result = userStorage.validateUserData({
        ...testUser,
        username: 'ab',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 3 characters');
    });

    test('requires full name', () => {
      const noFullName = { ...testUser };
      delete noFullName.fullName;

      const result = userStorage.validateUserData(noFullName);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Full name is required');
    });

    test('validates email format', () => {
      const result = userStorage.validateUserData({
        ...testUser,
        email: 'invalid-email',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Email must be valid');
    });

    test('allows missing email', () => {
      const noEmail = { ...testUser };
      delete noEmail.email;

      const result = userStorage.validateUserData(noEmail);
      expect(result.valid).toBe(true);
    });
  });

  describe('Encryption Security', () => {
    test('file content is encrypted', async () => {
      await userStorage.saveUser(testUser);
      const fileContent = await fs.readFile('./test-data/user.dat', 'utf8');

      expect(fileContent).not.toContain(testUser.username);
      expect(fileContent).not.toContain(testUser.email);
      expect(fileContent).not.toContain(testUser.fullName);
    });

    test('random IV produces different encrypted output', async () => {
      await userStorage.saveUser(testUser);
      const content1 = await fs.readFile('./test-data/user.dat', 'utf8');

      await userStorage.saveUser(testUser);
      const content2 = await fs.readFile('./test-data/user.dat', 'utf8');

      expect(content1).not.toBe(content2);
    });
  });
});
