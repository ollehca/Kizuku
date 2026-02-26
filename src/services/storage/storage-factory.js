const LocalStorageAdapter = require('./local-storage-adapter');
const CloudStorageAdapter = require('./cloud-storage-adapter');

let licenseStorage;
try {
  licenseStorage = require('../license-storage');
} catch {
  licenseStorage = null;
}

/**
 * Factory for creating storage adapters based on license type
 *
 * Private license -> LocalStorageAdapter (filesystem)
 * Business license -> CloudStorageAdapter (S3, future)
 */

/**
 * Create appropriate storage adapter based on license type
 * @param {Object} [options] - Factory options
 * @param {string} [options.licenseType] - Override license type detection
 * @param {Object} [options.config] - Adapter-specific configuration
 * @returns {Promise<StorageAdapter>} Initialized storage adapter
 */
async function getLicenseType(explicitType) {
  if (explicitType) {
    return explicitType;
  }

  if (!licenseStorage) {
    throw new Error(
      'License storage module not found. ' +
        'Either provide licenseType option explicitly or ensure license-storage module exists.'
    );
  }

  const license = await licenseStorage.getLicense();

  if (!license?.valid) {
    throw new Error('No valid license found. Storage adapter requires valid license.');
  }

  return license.type;
}

function createAdapterForType(licenseType, config) {
  if (licenseType === 'private') {
    return new LocalStorageAdapter(config || {});
  }

  if (licenseType === 'business') {
    throw new Error(
      'Cloud storage not yet implemented. ' +
        'Business licenses will support cloud storage in future releases. ' +
        'For now, please use a private license for local-only storage.'
    );
  }

  throw new Error(`Unknown license type: ${licenseType}`);
}

async function createStorageAdapter(options = {}) {
  const licenseType = await getLicenseType(options.licenseType);
  const adapter = createAdapterForType(licenseType, options.config);

  await adapter.initialize();

  return adapter;
}

/**
 * Create local storage adapter directly
 * Useful for testing or when you know you want local storage
 * @param {Object} [config] - LocalStorageAdapter configuration
 * @returns {Promise<LocalStorageAdapter>} Initialized local storage adapter
 */
async function createLocalStorageAdapter(config = {}) {
  const adapter = new LocalStorageAdapter(config);
  await adapter.initialize();
  return adapter;
}

/**
 * Create cloud storage adapter directly (future)
 * @param {Object} config - CloudStorageAdapter configuration
 * @returns {Promise<CloudStorageAdapter>} Initialized cloud storage adapter
 */
async function createCloudStorageAdapter(config = {}) {
  const adapter = new CloudStorageAdapter(config);
  await adapter.initialize();
  return adapter;
}

module.exports = {
  createStorageAdapter,
  createLocalStorageAdapter,
  createCloudStorageAdapter,
};
