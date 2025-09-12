/**
 * Secure Authentication Storage Service
 * Handles persistent login credentials using Electron's secure storage
 */

const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');

class AuthStorageService {
  constructor() {
    this.storageDir = path.join(app.getPath('userData'), 'secure');
    this.credentialsPath = path.join(this.storageDir, 'credentials.enc');
    this.setupStorageDirectory();
  }

  setupStorageDirectory() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create secure storage directory:', error);
    }
  }

  /**
   * Store authentication credentials securely
   * @param {Object} credentials - Auth data to store
   * @returns {boolean} Success status
   */
  /* eslint-disable-next-line max-lines-per-function */
  storeCredentials(credentials) {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('Encryption not available, skipping credential storage');
        return false;
      }

      const now = Date.now();
      // 30 days or 7 days
      const duration = credentials.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

      const dataToStore = {
        ...credentials,
        storedAt: now,
        expiresAt: now + duration,
        version: '1.0',
      };

      const encryptedData = safeStorage.encryptString(JSON.stringify(dataToStore));
      fs.writeFileSync(this.credentialsPath, encryptedData);

      console.log('Credentials stored securely for', credentials.rememberMe ? '30 days' : '7 days');
      return true;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      return false;
    }
  }

  /**
   * Check if credentials are valid and not expired
   * @param {Object} credentials - Credentials to check
   * @returns {boolean} True if valid
   */
  isCredentialsValid(credentials) {
    const now = Date.now();
    return credentials.expiresAt && now <= credentials.expiresAt;
  }

  /**
   * Extend session if needed
   * @param {Object} credentials - Credentials to extend
   */
  extendSessionIfNeeded(credentials) {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const shouldExtend =
      credentials.rememberMe && credentials.expiresAt && credentials.expiresAt - now < sevenDays;

    if (shouldExtend) {
      console.log('Auto-extending session for remember me user');
      credentials.expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      this.storeCredentials(credentials);
    }
  }

  /**
   * Retrieve stored authentication credentials
   * @returns {Object|null} Stored credentials or null if not found/expired
   */
  getStoredCredentials() {
    try {
      if (!fs.existsSync(this.credentialsPath) || !safeStorage.isEncryptionAvailable()) {
        return null;
      }

      const encryptedData = fs.readFileSync(this.credentialsPath);
      const credentials = JSON.parse(safeStorage.decryptString(encryptedData));

      if (!this.isCredentialsValid(credentials)) {
        this.clearStoredCredentials();
        return null;
      }

      this.extendSessionIfNeeded(credentials);
      return credentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      this.clearStoredCredentials();
      return null;
    }
  }

  /**
   * Clear stored credentials
   */
  clearStoredCredentials() {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        fs.unlinkSync(this.credentialsPath);
        console.log('Stored credentials cleared');
      }
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * Check if user has valid stored credentials
   * @returns {boolean} True if valid credentials exist
   */
  hasValidCredentials() {
    const credentials = this.getStoredCredentials();
    return credentials !== null && credentials.token;
  }

  /**
   * Get session info for debugging
   * @returns {Object} Session information
   */
  getSessionInfo() {
    const credentials = this.getStoredCredentials();
    if (!credentials) {
      return { hasSession: false };
    }

    const now = Date.now();
    const timeToExpiry = credentials.expiresAt - now;
    const daysRemaining = Math.ceil(timeToExpiry / (24 * 60 * 60 * 1000));

    return {
      hasSession: true,
      email: credentials.email,
      rememberMe: credentials.rememberMe,
      daysRemaining,
      expiresAt: new Date(credentials.expiresAt).toLocaleString(),
      storedAt: new Date(credentials.storedAt).toLocaleString(),
    };
  }
}

// Export singleton instance
const authStorage = new AuthStorageService();
module.exports = authStorage;
