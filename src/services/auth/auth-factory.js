const LocalAuthProvider = require('./local-auth-provider');
const CloudAuthProvider = require('./cloud-auth-provider');

let licenseStorage;
try {
  licenseStorage = require('../license-storage');
} catch {
  licenseStorage = null;
}

/**
 * Factory for creating auth providers based on license type
 *
 * Private license -> LocalAuthProvider (local auth)
 * Business license -> CloudAuthProvider (cloud auth, future)
 */

async function getLicenseType(explicitType) {
  if (explicitType) {
    return explicitType;
  }

  if (!licenseStorage) {
    throw new Error(
      'License storage module not found. ' +
        'Either provide licenseType option explicitly or ' +
        'ensure license-storage module exists.'
    );
  }

  const license = await licenseStorage.getLicense();

  if (!license?.valid) {
    throw new Error('No valid license found. Auth provider requires valid license.');
  }

  return license.type;
}

function createProviderForType(licenseType, config) {
  if (licenseType === 'private') {
    return new LocalAuthProvider(config || {});
  }

  if (licenseType === 'business') {
    throw new Error(
      'Cloud authentication not yet implemented. ' +
        'Business licenses will support cloud auth in future releases. ' +
        'For now, please use a private license for local-only authentication.'
    );
  }

  throw new Error(`Unknown license type: ${licenseType}`);
}

/**
 * Create appropriate auth provider based on license type
 * @param {Object} [options] - Factory options
 * @param {string} [options.licenseType] - Override license type detection
 * @param {Object} [options.config] - Provider-specific configuration
 * @returns {Promise<AuthProvider>} Initialized auth provider
 */
async function createAuthProvider(options = {}) {
  const licenseType = await getLicenseType(options.licenseType);
  const provider = createProviderForType(licenseType, options.config);

  await provider.initialize();

  return provider;
}

/**
 * Create local auth provider directly
 * Useful for testing or when you know you want local auth
 * @param {Object} [config] - LocalAuthProvider configuration
 * @returns {Promise<LocalAuthProvider>} Initialized local auth provider
 */
async function createLocalAuthProvider(config = {}) {
  const provider = new LocalAuthProvider(config);
  await provider.initialize();
  return provider;
}

/**
 * Create cloud auth provider directly (future)
 * @param {Object} config - CloudAuthProvider configuration
 * @returns {Promise<CloudAuthProvider>} Initialized cloud auth provider
 */
async function createCloudAuthProvider(config = {}) {
  const provider = new CloudAuthProvider(config);
  await provider.initialize();
  return provider;
}

module.exports = {
  createAuthProvider,
  createLocalAuthProvider,
  createCloudAuthProvider,
};
