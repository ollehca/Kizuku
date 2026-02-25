const AuthProvider = require('./auth-provider');

/**
 * Local authentication provider
 * Wraps existing auth-orchestrator for local-first authentication
 *
 * NOTE: This will be fully implemented when we merge the auth branch
 * For now, this is a stub that shows the interface
 */
class LocalAuthProvider extends AuthProvider {
  constructor(config = {}) {
    super(config);
    this.authOrchestrator = null;
    this.authStorage = null;
    this.userStorage = null;
  }

  async initialize() {
    // Will load auth modules when auth branch is merged
    try {
      this.authOrchestrator = require('../auth-orchestrator');
      this.authStorage = require('../auth-storage');
      this.userStorage = require('../user-storage');
    } catch {
      throw new Error(
        'Auth modules not found. ' +
          'LocalAuthProvider requires auth-orchestrator, auth-storage, ' +
          'and user-storage modules from feature/authentication-system-foundation branch. ' +
          'These will be available after merging the auth branch.'
      );
    }
  }

  async authenticate(credentials) {
    if (!this.authOrchestrator) {
      throw new Error('LocalAuthProvider not initialized');
    }

    const { username, password, rememberMe = false } = credentials;

    const result = await this.authOrchestrator.authenticateUser(username, password, rememberMe);

    return {
      success: result.authenticated,
      reason: result.reason,
      licenseType: result.licenseType,
      user: result.user,
    };
  }

  async validateSession(_token) {
    if (!this.authStorage) {
      throw new Error('LocalAuthProvider not initialized');
    }

    return this.authStorage.hasValidCredentials();
  }

  async getAuthState() {
    if (!this.authOrchestrator) {
      throw new Error('LocalAuthProvider not initialized');
    }

    const state = await this.authOrchestrator.checkAuthenticationState();

    return {
      authenticated: state.authenticated,
      reason: state.reason,
      licenseType: state.licenseType,
      user: state.user,
      nextScreen: state.nextScreen,
    };
  }

  async logout() {
    if (!this.authOrchestrator) {
      throw new Error('LocalAuthProvider not initialized');
    }

    const result = this.authOrchestrator.logoutUser();
    return result.success;
  }

  async createAccount(userData) {
    if (!this.authOrchestrator) {
      throw new Error('LocalAuthProvider not initialized');
    }

    const result = await this.authOrchestrator.createUserAccount(userData);

    return {
      success: result.success,
      user: result.user,
      error: result.error,
    };
  }

  async hasAccount() {
    if (!this.userStorage) {
      throw new Error('LocalAuthProvider not initialized');
    }

    const user = await this.userStorage.getUser();
    return user !== null;
  }
}

module.exports = LocalAuthProvider;
