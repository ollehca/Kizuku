/**
 * Authentication Orchestrator
 *
 * Coordinates the complete authentication flow:
 * 1. Check if user has valid license
 * 2. Check if user account exists
 * 3. Route to appropriate screen (onboarding vs. main app)
 * 4. Handle license validation
 * 5. Handle account creation
 * 6. Handle password authentication
 *
 * @module auth-orchestrator
 */

const { validateLicense } = require('./license-code');
const licenseStorage = require('./license-storage');
const userStorage = require('./user-storage');
const crypto = require('crypto');

/**
 * Check authentication state and determine next screen
 */
async function checkAuthenticationState() {
  try {
    // Check for valid license
    const hasLicense = await licenseStorage.hasValidLicense();

    if (!hasLicense) {
      return {
        authenticated: false,
        nextScreen: 'license-selection',
        reason: 'no-license',
      };
    }

    // Check for user account
    const hasUser = await userStorage.hasUser();

    if (!hasUser) {
      return {
        authenticated: false,
        nextScreen: 'account-creation',
        reason: 'no-account',
      };
    }

    // Both license and account exist
    return {
      authenticated: true,
      nextScreen: 'main-app',
      reason: 'authenticated',
    };
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
 * Create user account with password hashing
 */
async function createUserAccount(userData) {
  try {
    // Validate user data
    const validation = userStorage.validateUserData({
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors[0] || 'Invalid user data',
      };
    }

    // Hash password
    const passwordHash = hashPassword(userData.password);

    // Prepare user data
    const userDataToSave = {
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email || null,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
      preferences: {},
    };

    // Save user account
    const saveResult = await userStorage.saveUser(userDataToSave);

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || 'Failed to create account',
      };
    }

    // Update license with activatedBy email
    if (userData.email) {
      await updateLicenseActivation(userData.email);
    }

    return {
      success: true,
      user: {
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
      },
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    return {
      success: false,
      error: 'Failed to create account. Please try again.',
    };
  }
}

/**
 * Authenticate user with password
 */
async function authenticateUser(username, password) {
  try {
    // Get user data
    const user = await userStorage.getUser();

    if (!user) {
      return {
        success: false,
        error: 'No account found. Please complete setup first.',
      };
    }

    // Verify username matches
    if (user.username !== username) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Verify password
    const isValid = verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    return {
      success: true,
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return {
      success: false,
      error: 'Authentication failed. Please try again.',
    };
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
 * Clear all authentication data (for testing/debugging)
 */
async function clearAuthenticationData() {
  try {
    await licenseStorage.clearLicense();
    await userStorage.deleteUser();
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
  clearAuthenticationData,
  hashPassword,
  verifyPassword,
};
