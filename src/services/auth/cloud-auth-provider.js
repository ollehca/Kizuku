const AuthProvider = require('./auth-provider');

/**
 * Cloud authentication provider
 * Future implementation for business/cloud users
 *
 * NOT IMPLEMENTED YET - Stub for future development
 */
class CloudAuthProvider extends AuthProvider {
  constructor(config = {}) {
    super(config);

    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;

    if (!this.apiUrl) {
      throw new Error('CloudAuthProvider requires apiUrl configuration');
    }
  }

  async initialize() {
    throw new Error(
      'CloudAuthProvider not yet implemented. ' +
        'Use LocalAuthProvider for private licenses. ' +
        'Cloud authentication will be available in future releases.'
    );
  }

  async authenticate(_credentials) {
    throw new Error('CloudAuthProvider not yet implemented');
  }

  async validateSession(_token) {
    throw new Error('CloudAuthProvider not yet implemented');
  }

  async getAuthState() {
    throw new Error('CloudAuthProvider not yet implemented');
  }

  async logout() {
    throw new Error('CloudAuthProvider not yet implemented');
  }

  async createAccount(_userData) {
    throw new Error('CloudAuthProvider not yet implemented');
  }

  async hasAccount() {
    throw new Error('CloudAuthProvider not yet implemented');
  }
}

module.exports = CloudAuthProvider;

/**
 * FUTURE IMPLEMENTATION NOTES:
 *
 * When implementing cloud auth (Week 10+), use REST API:
 *
 * Example authenticate implementation:
 *
 * async authenticate(credentials) {
 *   const response = await fetch(`${this.apiUrl}/auth/login`, {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'X-API-Key': this.apiKey
 *     },
 *     body: JSON.stringify({
 *       username: credentials.username,
 *       password: credentials.password
 *     })
 *   });
 *
 *   if (!response.ok) {
 *     return {
 *       success: false,
 *       error: 'Authentication failed'
 *     };
 *   }
 *
 *   const data = await response.json();
 *
 *   return {
 *     success: true,
 *     user: data.user,
 *     token: data.token,
 *     licenseType: 'business'
 *   };
 * }
 */
