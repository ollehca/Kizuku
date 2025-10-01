#!/usr/bin/env node
/* eslint-env node, commonjs */
/* eslint-disable max-lines-per-function, max-statements */
/**
 * Demo License Setup Script
 *
 * Creates a demo Kizu account with a valid test private license.
 * This allows testing the authentication flow without manual license entry.
 *
 * Usage: node scripts/setup-demo-license.js
 *
 * Note: This script mocks Electron's app for Node.js testing.
 * In production, the actual Electron app will use real paths.
 */

// Mock Electron for testing
const path = require('path');
const mockApp = {
  getPath: () => path.join(__dirname, '../test-data'),
  getVersion: () => '0.1.0',
};

// Inject mock before requiring services
// eslint-disable-next-line no-global-assign
if (typeof jest !== 'undefined') {jest = undefined;}

// Mock Electron module
require.cache[require.resolve('electron')] = {
  exports: {
    app: mockApp,
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (str) => Buffer.from(str, 'utf8').toString('base64'),
      decryptString: (encrypted) => {
        const base64Str = Buffer.isBuffer(encrypted) ? encrypted.toString('utf8') : encrypted;
        return Buffer.from(base64Str, 'base64').toString('utf8');
      },
    },
  },
};

const licenseStorage = require('../src/services/license-storage');
const userStorage = require('../src/services/user-storage');
const { validateLicense } = require('../src/services/license-code');

// Demo credentials
const DEMO_LICENSE_CODE = 'KIZU-50019-99FF9-D4EFF-5DE58-DC837';
const DEMO_USER = {
  username: 'demouser',
  fullName: 'Demo User',
  email: 'demo@penpot.local',
};

async function setupDemoLicense() {
  try {
    console.log('🔧 Setting up demo license and account...\n');

    // Validate license code
    console.log('1️⃣  Validating demo license code...');
    const validation = validateLicense(DEMO_LICENSE_CODE);

    if (!validation.valid) {
      console.error('❌ Invalid demo license code!');
      console.error('Error:', validation.error);
      process.exit(1);
    }

    console.log('✅ License validated successfully');
    console.log('   Type:', validation.type);
    console.log('   Code:', DEMO_LICENSE_CODE);
    console.log();

    // Save license
    console.log('2️⃣  Saving license to storage...');
    const saveResult = await licenseStorage.saveLicense({
      code: DEMO_LICENSE_CODE,
      type: validation.type,
      validated: true,
      validatedAt: new Date().toISOString(),
      activatedBy: DEMO_USER.email,
    });

    if (!saveResult.success) {
      console.error('❌ Failed to save license:', saveResult.error);
      process.exit(1);
    }

    console.log('✅ License saved to storage');
    console.log();

    // Create user account
    console.log('3️⃣  Creating demo user account...');
    const userResult = await userStorage.saveUser({
      username: DEMO_USER.username,
      fullName: DEMO_USER.fullName,
      email: DEMO_USER.email,
      passwordHash: null, // Private license doesn't need password
      createdAt: new Date().toISOString(),
      preferences: {
        licenseType: 'private',
        demo: true,
      },
    });

    if (!userResult.success) {
      console.error('❌ Failed to create user:', userResult.error);
      process.exit(1);
    }

    console.log('✅ Demo user account created');
    console.log('   Username:', DEMO_USER.username);
    console.log('   Full Name:', DEMO_USER.fullName);
    console.log('   Email:', DEMO_USER.email);
    console.log();

    // Verify setup
    console.log('4️⃣  Verifying setup...');
    const license = await licenseStorage.getLicense();
    const user = await userStorage.getUser();

    if (!license || !user) {
      console.error('❌ Verification failed - data not found');
      process.exit(1);
    }

    console.log('✅ Setup verified successfully');
    console.log();

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Demo License Setup Complete!');
    console.log('═══════════════════════════════════════════════');
    console.log();
    console.log('Demo Account Details:');
    console.log('  License Code: ' + DEMO_LICENSE_CODE);
    console.log('  License Type: private');
    console.log('  Username:     ' + DEMO_USER.username);
    console.log('  Full Name:    ' + DEMO_USER.fullName);
    console.log('  Email:        ' + DEMO_USER.email);
    console.log('  Password:     (not required for private license)');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Start the app: npm start');
    console.log('  2. App will auto-login with demo account');
    console.log('  3. No license entry or password needed!');
    console.log();
  } catch (error) {
    console.error('❌ Error setting up demo license:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  setupDemoLicense();
}

module.exports = { setupDemoLicense };
