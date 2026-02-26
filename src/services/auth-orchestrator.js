/**
 * Authentication Orchestrator
 *
 * Coordinates the complete authentication flow:
 *
 * PRIVATE LICENSE (Offline-First):
 * 1. License validation → Account creation → Auto-login (no password required)
 * 2. Subsequent launches: Direct access (license proves ownership)
 *
 * BUSINESS/COLLAB LICENSE (Online Features):
 * 1. License validation → Account creation with password → Session token stored
 * 2. Subsequent launches: Auto-login via token (7-30 days, remember me option)
 * 3. Re-authenticate only when token expires or user logs out
 *
 * @module auth-orchestrator
 */

const { validateLicense } = require('./license-code');
const licenseStorage = require('./license-storage');
const userStorage = require('./user-storage');
const authStorage = require('./auth-storage');
const crypto = require('node:crypto');

/**
 * Check if license is valid
 */
async function checkLicenseState() {
  const hasLicense = await licenseStorage.hasValidLicense();
  if (!hasLicense) {
    return { valid: false, nextScreen: 'license-selection', reason: 'no-license' };
  }
  return { valid: true, license: await licenseStorage.getLicense() };
}

/**
 * Check if user account exists
 */
async function checkUserState(license) {
  const hasUser = await userStorage.hasUser();
  if (!hasUser) {
    return {
      valid: false,
      nextScreen: 'account-creation',
      reason: 'no-account',
      licenseType: license.type,
    };
  }
  return { valid: true };
}

/**
 * Check business license session
 */
function checkBusinessSession(license) {
  const hasValidSession = authStorage.hasValidCredentials();
  if (hasValidSession) {
    return {
      authenticated: true,
      nextScreen: 'main-app',
      reason: 'valid-session-token',
      licenseType: license.type,
    };
  }
  return {
    authenticated: false,
    nextScreen: 'login',
    reason: 'session-expired',
    licenseType: license.type,
  };
}

/**
 * Check authentication state and determine next screen
 */
async function checkAuthenticationState() {
  try {
    const licenseState = await checkLicenseState();
    if (!licenseState.valid) {
      return { authenticated: false, ...licenseState };
    }

    const { license } = licenseState;
    const userState = await checkUserState(license);
    if (!userState.valid) {
      return { authenticated: false, ...userState };
    }

    // PRIVATE LICENSE: Auto-login (license proves ownership)
    if (license.type === 'private') {
      return {
        authenticated: true,
        nextScreen: 'main-app',
        reason: 'private-license-auto-login',
        licenseType: 'private',
      };
    }

    // BUSINESS/COLLAB LICENSE: Check for valid session token
    return checkBusinessSession(license);
  } catch (error) {
    console.error('Error checking authentication state:', error);
    return {
      authenticated: false,
      nextScreen: 'license-selection',
      reason: 'error',
      error: error.message,
    };
  }
}

/**
 * Validate and save license code
 */
async function validateAndSaveLicense(code) {
  try {
    // Validate license code cryptographically
    const validation = validateLicense(code);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid license code',
      };
    }

    // Save license to encrypted storage
    const saveResult = await licenseStorage.saveLicense({
      code: code, // Use original code parameter
      type: validation.type,
      validated: true,
      validatedAt: validation.generatedAt,
      activatedBy: null, // Will be set when account is created
    });

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || 'Failed to save license',
      };
    }

    return {
      success: true,
      license: {
        code: code, // Use original code parameter
        type: validation.type,
        generatedAt: validation.generatedAt,
        timestamp: validation.timestamp,
      },
    };
  } catch (error) {
    console.error('Error validating license:', error);
    return {
      success: false,
      error: 'Failed to validate license. Please try again.',
    };
  }
}

/**
 * Validate password requirement based on license type
 */
function validatePasswordRequirement(license, userData) {
  const isPrivateLicense = license?.type === 'private';
  const requiresPassword = !isPrivateLicense;

  if (requiresPassword && !userData.password) {
    return { valid: false, error: 'Password is required for business/collab licenses' };
  }
  return { valid: true, requiresPassword };
}

/**
 * Prepare user data for storage
 */
function prepareUserData(userData, license) {
  const passwordHash = userData.password ? hashPassword(userData.password) : null;

  return {
    username: userData.username,
    fullName: userData.fullName,
    email: userData.email || null,
    passwordHash: passwordHash,
    createdAt: new Date().toISOString(),
    preferences: {
      licenseType: license?.type || 'private',
    },
  };
}

/**
 * Create session token for business licenses
 */
function createSessionForBusinessLicense(userData, requiresPassword) {
  if (requiresPassword) {
    const sessionToken = generateSessionToken();
    authStorage.storeCredentials({
      email: userData.email || userData.username,
      token: sessionToken,
      rememberMe: userData.rememberMe || false,
    });
  }
}

/**
 * Try creating a PenPot backend user for private licenses
 * @param {object} userData - User data
 * @param {object} license - License object
 */
async function tryCreatePenpotUser(userData, license) {
  if (license?.type !== 'private') {
    return;
  }
  console.log('🔐 Creating PenPot backend user for private license...');
  const result = await createPenpotUserForLicense(userData, license);
  if (!result.success) {
    console.warn('⚠️ Failed to create PenPot user, but Kizuku account created:', result.error);
  }
}

/**
 * Create user account with optional password hashing
 * - Private license: Password optional (not required for local-only use) + auto-creates PenPot user
 * - Business license: Password required + session token created
 */
async function createUserAccount(userData) {
  try {
    const license = await licenseStorage.getLicense();
    const passwordCheck = validatePasswordRequirement(license, userData);
    if (!passwordCheck.valid) {
      return { success: false, error: passwordCheck.error };
    }

    const validation = userStorage.validateUserData({
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email,
    });

    if (!validation.valid) {
      return { success: false, error: validation.errors[0] || 'Invalid user data' };
    }

    const userDataToSave = prepareUserData(userData, license);
    const saveResult = await userStorage.saveUser(userDataToSave);

    if (!saveResult.success) {
      return { success: false, error: saveResult.error || 'Failed to create account' };
    }

    if (userData.email) {
      await updateLicenseActivation(userData.email);
    }

    await tryCreatePenpotUser(userData, license);
    createSessionForBusinessLicense(userData, passwordCheck.requiresPassword);

    return {
      success: true,
      user: {
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
        licenseType: license?.type,
      },
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Create PenPot backend user for private license
 * Uses PenPot's registration API to create the user account
 */
async function createPenpotUserForLicense(userData, _license) {
  try {
    // Generate a secure password for the PenPot account
    const penpotPassword = generateSessionToken();

    // Email is required for PenPot, use username@kizuku.local if not provided
    const email = userData.email || `${userData.username}@kizuku.local`;

    console.log(`🔐 Registering PenPot user: ${email}`);

    // Register via PenPot API (no token required for initial registration in dev mode)
    const response = await fetch('http://localhost:6060/api/rpc/command/register-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: penpotPassword,
        fullname: userData.fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ PenPot registration failed:', error);
      return { success: false, error: `PenPot registration failed: ${response.status}` };
    }

    const result = await response.json();
    console.log('✅ PenPot user created successfully');

    // Store the PenPot credentials so we can auto-login
    const authStorage = require('./auth-storage');
    authStorage.storeCredentials({
      email: email,
      token: penpotPassword, // Store password as token for auto-login
      profile: result,
      rememberMe: true,
    });

    return { success: true, penpotUser: result };
  } catch (error) {
    console.error('❌ Error creating PenPot user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate authentication prerequisites
 */
async function validateAuthPrerequisites(username) {
  const user = await userStorage.getUser();
  if (!user) {
    return { valid: false, error: 'No account found. Please complete setup first.' };
  }

  const license = await licenseStorage.getLicense();
  if (license?.type === 'private') {
    return { valid: false, error: 'Private licenses do not require password authentication' };
  }

  if (user.username !== username) {
    return { valid: false, error: 'Invalid username or password' };
  }

  if (!user.passwordHash) {
    return { valid: false, error: 'No password set for this account' };
  }

  return { valid: true, user };
}

/**
 * Create and store session token
 */
function storeSessionToken(user, rememberMe) {
  const sessionToken = generateSessionToken();
  authStorage.storeCredentials({
    email: user.email || user.username,
    token: sessionToken,
    rememberMe: rememberMe,
  });
  return sessionToken;
}

/**
 * Authenticate user with password (Business/Collab licenses only)
 * Creates and stores session token on successful authentication
 */
async function authenticateUser(username, password, rememberMe = false) {
  try {
    const validation = await validateAuthPrerequisites(username);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { user } = validation;
    const isValid = verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    const sessionToken = storeSessionToken(user, rememberMe);

    return {
      success: true,
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
      sessionToken: sessionToken,
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}

/**
 * Get user summary for display
 */
async function getUserSummary() {
  try {
    const summary = await userStorage.getUserSummary();
    if (!summary) {
      return {
        success: false,
        error: 'No user account found',
      };
    }
    return {
      success: true,
      user: summary,
    };
  } catch (error) {
    console.error('Error getting user summary:', error);
    return {
      success: false,
      error: 'Failed to load user data',
    };
  }
}

/**
 * Get license data for display
 */
async function getLicenseData() {
  try {
    const license = await licenseStorage.getLicense();
    if (!license) {
      return {
        success: false,
        error: 'No license found',
      };
    }
    return {
      success: true,
      license: license,
    };
  } catch (error) {
    console.error('Error getting license data:', error);
    return {
      success: false,
      error: 'Failed to load license data',
    };
  }
}

/**
 * Get license validation state
 */
async function getLicenseValidationState() {
  try {
    const state = await licenseStorage.getLicenseValidationState();
    return {
      success: true,
      ...state,
    };
  } catch (error) {
    console.error('Error getting license state:', error);
    return {
      success: false,
      error: 'Failed to load license state',
    };
  }
}

/**
 * Update license with activation email
 */
async function updateLicenseActivation(email) {
  try {
    const license = await licenseStorage.getLicense();
    if (license) {
      license.activatedBy = email;
      await licenseStorage.saveLicense(license);
    }
  } catch (error) {
    console.error('Error updating license activation:', error);
  }
}

/**
 * Hash password using PBKDF2
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Logout user (Business/Collab licenses only)
 * Clears session token, forcing re-authentication on next launch
 */
function logoutUser() {
  try {
    authStorage.clearStoredCredentials();
    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Error logging out:', error);
    return {
      success: false,
      error: 'Failed to logout',
    };
  }
}

/**
 * Get current authentication status with detailed info
 */
async function getAuthenticationStatus() {
  try {
    const license = await licenseStorage.getLicense();
    const user = await userStorage.getUser();
    const sessionInfo = authStorage.getSessionInfo();

    return {
      success: true,
      hasLicense: !!license,
      hasUser: !!user,
      licenseType: license?.type,
      isPrivateLicense: license?.type === 'private',
      requiresPassword: license?.type !== 'private',
      hasValidSession: authStorage.hasValidCredentials(),
      sessionInfo: sessionInfo.hasSession ? sessionInfo : null,
      user: user
        ? {
            username: user.username,
            fullName: user.fullName,
            email: user.email,
          }
        : null,
    };
  } catch (error) {
    console.error('Error getting authentication status:', error);
    return {
      success: false,
      error: 'Failed to get authentication status',
    };
  }
}

/**
 * Clear all authentication data (for testing/debugging)
 */
async function clearAuthenticationData() {
  try {
    await licenseStorage.clearLicense();
    await userStorage.deleteUser();
    authStorage.clearStoredCredentials();
    return { success: true };
  } catch (error) {
    console.error('Error clearing authentication data:', error);
    return {
      success: false,
      error: 'Failed to clear data',
    };
  }
}

module.exports = {
  checkAuthenticationState,
  validateAndSaveLicense,
  createUserAccount,
  authenticateUser,
  getUserSummary,
  getLicenseData,
  getLicenseValidationState,
  getAuthenticationStatus,
  logoutUser,
  generateSessionToken,
  clearAuthenticationData,
  hashPassword,
  verifyPassword,
};
