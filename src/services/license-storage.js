/**
 * Kizuku License Storage Service
 *
 * Manages persistent storage of license validation state.
 * Uses OS-appropriate userData directory with encrypted storage.
 *
 * Storage locations:
 * - macOS: ~/Library/Application Support/Kizuku/
 * - Windows: %APPDATA%/Kizuku/
 * - Linux: ~/.config/Kizuku/
 *
 * @module license-storage
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Derive encryption key from machine-specific data
function getDerivedKey() {
  // Use app name + version as salt (consistent across restarts)
  const salt = `kizuku-license-storage-${app.getVersion()}`;
  // Derive key using PBKDF2
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

  // Return: iv + authTag + encrypted data
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData) {
  const key = getDerivedKey();
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract: iv + authTag + encrypted data
  const iv = buffer.slice(0, IV_LENGTH);
  const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Get the license storage file path
 * In development mode, check test-data/ directory first as a fallback
 */
function getLicenseFilePath() {
  const userDataPath = app.getPath('userData');
  const prodPath = path.join(userDataPath, 'license.dat');

  // Check if we're in development mode (Electron app running from source)
  const isDev = !app.isPackaged;

  if (isDev) {
    // Try test-data directory first (used by demo setup script)
    const testDataPath = path.join(__dirname, '../../test-data/license.dat');
    try {
      // Synchronously check if test-data file exists
      const fs = require('fs');
      if (fs.existsSync(testDataPath)) {
        console.log('📁 Using test-data license file:', testDataPath);
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
 * Save license data to encrypted storage
 *
 * @param {Object} licenseData - License information to store
 * @param {string} licenseData.code - License code
 * @param {string} licenseData.type - License type (private, business, trial)
 * @param {boolean} licenseData.validated - Validation status
 * @param {string} licenseData.validatedAt - ISO timestamp of validation
 * @param {string} [licenseData.activatedBy] - User who activated (optional)
 * @returns {Promise<void>}
 */
async function saveLicense(licenseData) {
  try {
    await ensureStorageDirectory();

    const data = {
      code: licenseData.code,
      type: licenseData.type,
      validated: licenseData.validated,
      validatedAt: licenseData.validatedAt || new Date().toISOString(),
      activatedBy: licenseData.activatedBy || null,
      version: 1, // Storage format version
    };

    const encrypted = encrypt(data);
    const filePath = getLicenseFilePath();

    // Atomic write: write to temp file, then rename
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, encrypted, 'utf8');
    await fs.rename(tempPath, filePath);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save license: ${error.message}`,
    };
  }
}

/**
 * Load license data from encrypted storage
 *
 * @returns {Promise<Object|null>} License data or null if not found
 */
async function getLicense() {
  try {
    const filePath = getLicenseFilePath();
    const encrypted = await fs.readFile(filePath, 'utf8');
    const data = decrypt(encrypted);
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - no license stored
      return null;
    }
    // Decryption or corruption error
    throw new Error(`Failed to load license: ${error.message}`);
  }
}

/**
 * Check if a license is stored and validated
 *
 * @returns {Promise<boolean>}
 */
async function hasValidLicense() {
  try {
    const license = await getLicense();
    return license !== null && license.validated === true;
  } catch (error) {
    // Return false for any error (missing file, corruption, etc.)
    console.error('Error checking license validity:', error.message);
    return false;
  }
}

/**
 * Get license validation state
 *
 * @returns {Promise<Object>} Validation state
 */
async function getLicenseValidationState() {
  try {
    const license = await getLicense();
    if (!license) {
      return {
        exists: false,
        validated: false,
        type: null,
      };
    }

    return {
      exists: true,
      validated: license.validated,
      type: license.type,
      validatedAt: license.validatedAt,
      activatedBy: license.activatedBy,
    };
  } catch (error) {
    return {
      exists: false,
      validated: false,
      type: null,
      error: error.message,
    };
  }
}

/**
 * Update license validation status
 *
 * @param {boolean} validated - New validation status
 * @returns {Promise<Object>}
 */
async function updateLicenseValidation(validated) {
  try {
    const license = await getLicense();
    if (!license) {
      return {
        success: false,
        error: 'No license found to update',
      };
    }

    license.validated = validated;
    if (validated) {
      license.validatedAt = new Date().toISOString();
    }

    return await saveLicense(license);
  } catch (error) {
    return {
      success: false,
      error: `Failed to update validation: ${error.message}`,
    };
  }
}

/**
 * Clear license data (remove file)
 *
 * @returns {Promise<Object>}
 */
async function clearLicense() {
  try {
    const filePath = getLicenseFilePath();
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - already cleared
      return { success: true };
    }
    return {
      success: false,
      error: `Failed to clear license: ${error.message}`,
    };
  }
}

/**
 * Migrate license data from old format (if needed)
 * This is a placeholder for future version upgrades
 *
 * @returns {Promise<boolean>} True if migration occurred
 */
async function migrateLicenseData() {
  try {
    const license = await getLicense();
    if (!license) {
      return false;
    }

    // Check version and migrate if needed
    if (!license.version || license.version < 1) {
      // Perform migration
      license.version = 1;
      await saveLicense(license);
      return true;
    }

    return false;
  } catch (error) {
    // Migration failed - not critical, just return false
    console.error('License migration failed:', error.message);
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
    const filePath = getLicenseFilePath();
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
      path: getLicenseFilePath(),
      error: error.message,
    };
  }
}

module.exports = {
  saveLicense,
  getLicense,
  hasValidLicense,
  getLicenseValidationState,
  updateLicenseValidation,
  clearLicense,
  migrateLicenseData,
  getStorageInfo,
};
