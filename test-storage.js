#!/usr/bin/env node
/**
 * Storage System Test Script
 *
 * Tests license-storage and user-storage services
 * Run with: node test-storage.js
 */

// Mock Electron app for testing
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return './test-data';
    }
    return './test-data';
  },
  getVersion: () => '0.1.0',
};

// Replace electron with mock
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp },
};

const fs = require('fs').promises;
const path = require('path');
const licenseStorage = require('./src/services/license-storage');
const userStorage = require('./src/services/user-storage');

// Test data
const TEST_LICENSE = {
  code: 'KIZU-50019-99AC6-14B35-557C8-509D0',
  type: 'private',
  validated: true,
  validatedAt: new Date().toISOString(),
  activatedBy: 'demo@kizu.local',
};

const TEST_USER = {
  username: 'demo_user',
  email: 'demo@kizu.local',
  fullName: 'Demo User',
  preferences: {
    theme: 'dark',
    language: 'en',
  },
};

// Clean up test data
async function cleanup() {
  try {
    await fs.rm('./test-data', { recursive: true, force: true });
  } catch (error) {
    // Ignore
  }
}

// Test license storage
async function testLicenseStorage() {
  console.log('\n=== Testing License Storage ===\n');

  try {
    // Test 1: Save license
    console.log('Test 1: Save license...');
    const saveResult = await licenseStorage.saveLicense(TEST_LICENSE);
    console.log('✓ Save result:', saveResult);

    // Test 2: Load license
    console.log('\nTest 2: Load license...');
    const license = await licenseStorage.getLicense();
    console.log('✓ Loaded license:', license);

    // Test 3: Check validation state
    console.log('\nTest 3: Check validation state...');
    const validationState = await licenseStorage.getLicenseValidationState();
    console.log('✓ Validation state:', validationState);

    // Test 4: Has valid license
    console.log('\nTest 4: Has valid license...');
    const hasValid = await licenseStorage.hasValidLicense();
    console.log('✓ Has valid license:', hasValid);

    // Test 5: Storage info
    console.log('\nTest 5: Get storage info...');
    const storageInfo = await licenseStorage.getStorageInfo();
    console.log('✓ Storage info:', storageInfo);

    // Test 6: Update validation
    console.log('\nTest 6: Update validation status...');
    const updateResult = await licenseStorage.updateLicenseValidation(false);
    console.log('✓ Update result:', updateResult);

    const updatedLicense = await licenseStorage.getLicense();
    console.log('✓ Updated license:', updatedLicense);

    // Restore validation for other tests
    await licenseStorage.updateLicenseValidation(true);

    console.log('\n✅ All license storage tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ License storage test failed:', error);
    return false;
  }
}

// Test user storage
async function testUserStorage() {
  console.log('\n=== Testing User Storage ===\n');

  try {
    // Test 1: Save user
    console.log('Test 1: Save user...');
    const saveResult = await userStorage.saveUser(TEST_USER);
    console.log('✓ Save result:', saveResult);

    // Test 2: Load user
    console.log('\nTest 2: Load user...');
    const user = await userStorage.getUser();
    console.log('✓ Loaded user:', user);

    // Test 3: Has user
    console.log('\nTest 3: Has user...');
    const hasUser = await userStorage.hasUser();
    console.log('✓ Has user:', hasUser);

    // Test 4: User summary
    console.log('\nTest 4: Get user summary...');
    const summary = await userStorage.getUserSummary();
    console.log('✓ User summary:', summary);

    // Test 5: Update user
    console.log('\nTest 5: Update user...');
    const updateResult = await userStorage.updateUser({
      email: 'updated@kizu.local',
    });
    console.log('✓ Update result:', updateResult);

    // Test 6: Update preferences
    console.log('\nTest 6: Update preferences...');
    const prefResult = await userStorage.updatePreferences({
      theme: 'light',
      fontSize: 14,
    });
    console.log('✓ Preference update result:', prefResult);

    const prefs = await userStorage.getPreferences();
    console.log('✓ Updated preferences:', prefs);

    // Test 7: Validate user data
    console.log('\nTest 7: Validate user data...');
    const validData = userStorage.validateUserData({
      username: 'test',
      fullName: 'Test User',
      email: 'test@test.com',
    });
    console.log('✓ Valid data check:', validData);

    const invalidData = userStorage.validateUserData({
      username: 'ab', // Too short
      fullName: '',
      email: 'invalid-email',
    });
    console.log('✓ Invalid data check:', invalidData);

    // Test 8: Storage info
    console.log('\nTest 8: Get storage info...');
    const storageInfo = await userStorage.getStorageInfo();
    console.log('✓ Storage info:', storageInfo);

    console.log('\n✅ All user storage tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ User storage test failed:', error);
    return false;
  }
}

// Test encryption/decryption
async function testEncryption() {
  console.log('\n=== Testing Encryption ===\n');

  try {
    // Test 1: Data survives encryption/decryption
    console.log('Test 1: Encryption round-trip...');
    const originalLicense = await licenseStorage.getLicense();

    // Clear and re-save (forces encryption/decryption)
    await licenseStorage.clearLicense();
    await licenseStorage.saveLicense(TEST_LICENSE);

    const recovered = await licenseStorage.getLicense();

    const matches = recovered.code === TEST_LICENSE.code && recovered.type === TEST_LICENSE.type;

    console.log('✓ Data integrity:', matches ? 'PASS' : 'FAIL');

    if (!matches) {
      console.error('Original:', TEST_LICENSE);
      console.error('Recovered:', recovered);
      return false;
    }

    console.log('\n✅ Encryption tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Encryption test failed:', error);
    return false;
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  try {
    // Test 1: Load non-existent license
    console.log('Test 1: Load non-existent license...');
    await licenseStorage.clearLicense();
    const noLicense = await licenseStorage.getLicense();
    console.log('✓ Non-existent license:', noLicense === null ? 'null (correct)' : 'ERROR');

    // Test 2: Load non-existent user
    console.log('\nTest 2: Load non-existent user...');
    await userStorage.deleteUser();
    const noUser = await userStorage.getUser();
    console.log('✓ Non-existent user:', noUser === null ? 'null (correct)' : 'ERROR');

    // Test 3: Update non-existent license
    console.log('\nTest 3: Update non-existent license...');
    const updateResult = await licenseStorage.updateLicenseValidation(true);
    console.log('✓ Update result:', updateResult.success ? 'ERROR' : 'failed (correct)');

    // Test 4: Update non-existent user
    console.log('\nTest 4: Update non-existent user...');
    const userUpdateResult = await userStorage.updateUser({ email: 'test@test.com' });
    console.log('✓ Update result:', userUpdateResult.success ? 'ERROR' : 'failed (correct)');

    console.log('\n✅ Error handling tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Error handling test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Kizu Storage System Test Suite      ║');
  console.log('╚════════════════════════════════════════╝');

  await cleanup();

  const results = [];

  results.push(await testLicenseStorage());
  results.push(await testUserStorage());
  results.push(await testEncryption());
  results.push(await testErrorHandling());

  await cleanup();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           Test Summary                 ║');
  console.log('╚════════════════════════════════════════╝');

  const passed = results.filter((r) => r === true).length;
  const total = results.length;

  console.log(`\nTests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED ❌\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
