/**
 * Kizuku User Storage Service
 *
 * Manages persistent storage of local user account data.
 * Uses OS-appropriate userData directory with encrypted storage.
 *
 * Storage locations:
 * - macOS: ~/Library/Application Support/Kizuku/
 * - Windows: %APPDATA%/Kizuku/
 * - Linux: ~/.config/Kizuku/
 *
 * @module user-storage
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Derive encryption key from machine-specific data
function getDerivedKey() {
  const salt = `kizuku-user-storage-${app.getVersion()}`;
  return crypto.pbkdf2Sync(salt, 'kizuku-secret', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(data) {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData) {
  const key = getDerivedKey();
  const buffer = Buffer.from(encryptedData, 'base64');

  const iv = buffer.slice(0, IV_LENGTH);
  const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Get the user storage file path
 * In development mode, check test-data/ directory first as a fallback
 */
function getUserFilePath() {
  const userDataPath = app.getPath('userData');
  const prodPath = path.join(userDataPath, 'user.dat');

  // Check if we're in development mode (Electron app running from source)
  const isDev = !app.isPackaged;

  if (isDev) {
    // Try test-data directory first (used by demo setup script)
    const testDataPath = path.join(__dirname, '../../test-data/user.dat');
    try {
      // Synchronously check if test-data file exists
      const fsSync = require('fs');
      if (fsSync.existsSync(testDataPath)) {
        console.log('📁 Using test-data user file:', testDataPath);
        return testDataPath;
      }
    } catch {
      // Fall through to production path
    }
  }

  return prodPath;
}

/**
 * Ensure storage directory exists
 */
async function ensureStorageDirectory() {
  const userDataPath = app.getPath('userData');
  try {
    await fs.mkdir(userDataPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Save user account data to encrypted storage
 *
 * @param {Object} userData - User account information
 * @param {string} userData.username - Username
 * @param {string} [userData.email] - Email (optional)
 * @param {string} userData.fullName - Full name
 * @param {string} userData.createdAt - ISO timestamp of account creation
 * @param {Object} [userData.preferences] - User preferences (optional)
 * @returns {Promise<Object>}
 */
async function saveUser(userData) {
  try {
    await ensureStorageDirectory();

    const data = {
      username: userData.username,
      email: userData.email || null,
      fullName: userData.fullName,
      passwordHash: userData.passwordHash || null, // Add passwordHash support
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: userData.preferences || {},
      version: 1, // Storage format version
    };

    const encrypted = encrypt(data);
    const filePath = getUserFilePath();

    // Atomic write
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, encrypted, 'utf8');
    await fs.rename(tempPath, filePath);

    return { success: true, user: data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save user: ${error.message}`,
    };
  }
}

/**
 * Load user account data from encrypted storage
 *
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUser() {
  try {
    const filePath = getUserFilePath();
    const encrypted = await fs.readFile(filePath, 'utf8');
    const data = decrypt(encrypted);
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to load user: ${error.message}`);
  }
}

/**
 * Check if a user account exists
 *
 * @returns {Promise<boolean>}
 */
async function hasUser() {
  try {
    const user = await getUser();
    return user !== null;
  } catch (error) {
    // Return false for any error (missing file, corruption, etc.)
    console.error('Error checking user existence:', error.message);
    return false;
  }
}

/**
 * Update user account data
 *
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
async function updateUser(updates) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'No user account found to update',
      };
    }

    // Merge updates
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
      // Preserve created timestamp
      createdAt: user.createdAt,
      // Preserve version
      version: user.version,
    };

    return await saveUser(updatedUser);
  } catch (error) {
    return {
      success: false,
      error: `Failed to update user: ${error.message}`,
    };
  }
}

/**
 * Update user preferences
 *
 * @param {Object} preferences - Preferences to merge
 * @returns {Promise<Object>}
 */
async function updatePreferences(preferences) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'No user account found',
      };
    }

    const updatedPreferences = {
      ...user.preferences,
      ...preferences,
    };

    return await updateUser({ preferences: updatedPreferences });
  } catch (error) {
    return {
      success: false,
      error: `Failed to update preferences: ${error.message}`,
    };
  }
}

/**
 * Get user preferences
 *
 * @returns {Promise<Object|null>}
 */
async function getPreferences() {
  try {
    const user = await getUser();
    return user ? user.preferences : null;
  } catch (error) {
    // Return null if preferences can't be loaded
    console.error('Error loading preferences:', error.message);
    return null;
  }
}

/**
 * Delete user account data
 *
 * @returns {Promise<Object>}
 */
async function deleteUser() {
  try {
    const filePath = getUserFilePath();
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true };
    }
    return {
      success: false,
      error: `Failed to delete user: ${error.message}`,
    };
  }
}

/**
 * Get user account summary (for display)
 *
 * @returns {Promise<Object|null>}
 */
async function getUserSummary() {
  try {
    const user = await getUser();
    if (!user) {
      return null;
    }

    return {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      hasPreferences: Object.keys(user.preferences || {}).length > 0,
    };
  } catch (error) {
    // Return null if user summary can't be loaded
    console.error('Error loading user summary:', error.message);
    return null;
  }
}

/**
 * Migrate user data from old format (if needed)
 *
 * @returns {Promise<boolean>} True if migration occurred
 */
async function migrateUserData() {
  try {
    const user = await getUser();
    if (!user) {
      return false;
    }

    if (!user.version || user.version < 1) {
      user.version = 1;
      await saveUser(user);
      return true;
    }

    return false;
  } catch (error) {
    // Migration failed - not critical, just return false
    console.error('User migration failed:', error.message);
    return false;
  }
}

/**
 * Get storage file information (for debugging)
 *
 * @returns {Promise<Object>}
 */
async function getStorageInfo() {
  try {
    const filePath = getUserFilePath();
    const stats = await fs.stat(filePath);

    return {
      exists: true,
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (error) {
    return {
      exists: false,
      path: getUserFilePath(),
      error: error.message,
    };
  }
}

/**
 * Validate username field
 * @param {Object} userData - User data to validate
 * @param {Array} errors - Error collection array
 */
function validateUsername(userData, errors) {
  if (!userData.username || typeof userData.username !== 'string') {
    errors.push('Username is required');
  } else if (userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
}

/**
 * Validate full name field
 * @param {Object} userData - User data to validate
 * @param {Array} errors - Error collection array
 */
function validateFullName(userData, errors) {
  if (!userData.fullName || typeof userData.fullName !== 'string') {
    errors.push('Full name is required');
  }
}

/**
 * Validate email field
 * @param {Object} userData - User data to validate
 * @param {Array} errors - Error collection array
 */
function validateEmail(userData, errors) {
  if (userData.email) {
    if (typeof userData.email !== 'string') {
      errors.push('Email must be a string');
    } else if (!userData.email.includes('@')) {
      errors.push('Email must be valid');
    }
  }
}

/**
 * Validate user data structure
 *
 * @param {Object} userData - Data to validate
 * @returns {Object} Validation result
 */
function validateUserData(userData) {
  const errors = [];

  validateUsername(userData, errors);
  validateFullName(userData, errors);
  validateEmail(userData, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  saveUser,
  getUser,
  hasUser,
  updateUser,
  updatePreferences,
  getPreferences,
  deleteUser,
  getUserSummary,
  migrateUserData,
  getStorageInfo,
  validateUserData,
};
