/**
 * Base class for authentication providers
 *
 * Provides abstraction layer for authentication operations.
 * Implementations: LocalAuthProvider (local auth), CloudAuthProvider (cloud)
 */
class AuthProvider {
  constructor(config = {}) {
    if (new.target === AuthProvider) {
      throw new Error('AuthProvider is abstract, use LocalAuthProvider or CloudAuthProvider');
    }
    this.config = config;
  }

  /**
   * Initialize authentication provider
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Authenticate user with credentials
   * @param {Object} credentials - User credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @param {boolean} [credentials.rememberMe] - Remember me flag
   * @returns {Promise<Object>} Auth result with success, user, reason
   */
  async authenticate(_credentials) {
    throw new Error('authenticate() must be implemented by subclass');
  }

  /**
   * Validate existing session
   * @param {string} [token] - Session token (if applicable)
   * @returns {Promise<boolean>} True if session is valid
   */
  async validateSession(_token) {
    throw new Error('validateSession() must be implemented by subclass');
  }

  /**
   * Get current authentication state
   * @returns {Promise<Object>} State with authenticated, user, licenseType
   */
  async getAuthState() {
    throw new Error('getAuthState() must be implemented by subclass');
  }

  /**
   * Logout current user
   * @returns {Promise<boolean>} True if logout successful
   */
  async logout() {
    throw new Error('logout() must be implemented by subclass');
  }

  /**
   * Create new user account
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.fullName - Full name
   * @param {string} userData.email - Email address
   * @param {string} [userData.password] - Password (required for business)
   * @returns {Promise<Object>} Result with success, user
   */
  async createAccount(_userData) {
    throw new Error('createAccount() must be implemented by subclass');
  }

  /**
   * Check if user account exists
   * @returns {Promise<boolean>} True if account exists
   */
  async hasAccount() {
    throw new Error('hasAccount() must be implemented by subclass');
  }
}

module.exports = AuthProvider;
