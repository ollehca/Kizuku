# Backend API Usage Guide

This guide explains how to use Kizu's backend services from the renderer process.

## Overview

The backend services provide a unified API for configuration, authentication, and storage operations. All communication between renderer and main process happens through secure IPC channels.

## Quick Start

### Option 1: Direct API Access (Simple)

```javascript
// Access the backend API directly via electronAPI
const config = await window.electronAPI.backend.config.get();
console.log('License type:', config.licenseType);

// Check if a feature is enabled
const hasCloudSync = await window.electronAPI.backend.config.isFeatureEnabled('cloudSync');
```

### Option 2: Backend Client (Recommended)

```javascript
// Use the BackendClient helper for better error handling
const client = window.getBackendClient();

try {
  const config = await client.getConfig();
  console.log('License type:', config.licenseType);
} catch (error) {
  console.error('Failed to get config:', error);
}
```

## Configuration API

### Get Full Config

```javascript
const config = await window.electronAPI.backend.config.get();

// Returns:
// {
//   mode: 'local' | 'cloud',
//   licenseType: 'private' | 'business',
//   paths: { userData, database, assets, logs, temp },
//   app: { name, version, platform, arch },
//   database: { type, port, host, ... },
//   storage: { type, basePath, ... },
//   auth: { type, autoLogin, ... },
//   features: { collaboration, teams, cloudSync, ... }
// }
```

### Get Specific Config Value

```javascript
// Get nested values using dot notation
const dbType = await window.electronAPI.backend.config.getValue('database.type');
const licenseType = await window.electronAPI.backend.config.getValue('licenseType');
```

### Check Feature Flags

```javascript
const hasCollaboration = await window.electronAPI.backend.config.isFeatureEnabled('collaboration');
const hasTeams = await window.electronAPI.backend.config.isFeatureEnabled('teams');
const hasCloudSync = await window.electronAPI.backend.config.isFeatureEnabled('cloudSync');
const hasVersionHistory = await window.electronAPI.backend.config.isFeatureEnabled('versionHistory');
```

## Authentication API

### Check Auth State

```javascript
const state = await window.electronAPI.backend.auth.getState();

// Returns:
// {
//   authenticated: boolean,
//   reason?: string,
//   licenseType?: 'private' | 'business',
//   user?: { username, fullName, email, createdAt },
//   nextScreen?: string
// }
```

### Authenticate User

```javascript
const result = await window.electronAPI.backend.auth.authenticate({
  username: 'user@example.com',
  password: 'password123',
  rememberMe: true
});

if (result.success) {
  console.log('Authenticated:', result.user);
} else {
  console.error('Auth failed:', result.reason);
}
```

### Create Account

```javascript
const result = await window.electronAPI.backend.auth.createAccount({
  username: 'newuser',
  fullName: 'New User',
  email: 'newuser@example.com',
  password: 'password123' // Required for business, optional for private
});

if (result.success) {
  console.log('Account created:', result.user);
} else {
  console.error('Creation failed:', result.error);
}
```

### Logout

```javascript
const success = await window.electronAPI.backend.auth.logout();
if (success) {
  console.log('Logged out successfully');
}
```

### Check Account Existence

```javascript
const hasAccount = await window.electronAPI.backend.auth.hasAccount();
if (!hasAccount) {
  // Show account creation screen
}
```

## Storage API

### Store File

```javascript
await window.electronAPI.backend.storage.storeFile(
  'images',           // category: 'images' | 'fonts' | 'media' | 'data'
  'logo.png',         // fileName
  base64ImageData     // data (string)
);
```

### Retrieve File

```javascript
const fileData = await window.electronAPI.backend.storage.retrieveFile(
  'images',
  'logo.png'
);
console.log('File data:', fileData);
```

### List Files

```javascript
const files = await window.electronAPI.backend.storage.listFiles('images');

// Returns array of FileMetadata:
// [
//   { name: 'logo.png', size: 12345, category: 'images', createdAt: '2025-10-02T...' },
//   ...
// ]
```

### Delete File

```javascript
await window.electronAPI.backend.storage.deleteFile('images', 'logo.png');
```

## System API

### Check Initialization Status

```javascript
const initialized = await window.electronAPI.backend.system.isInitialized();
if (!initialized) {
  console.warn('Backend services not ready');
}
```

### Get Service Status

```javascript
const status = await window.electronAPI.backend.system.getStatus();

// Returns:
// {
//   initialized: boolean,
//   config: boolean,
//   auth: boolean,
//   storage: boolean
// }
```

## Using Backend Client Helper

For better error handling and convenience, use the BackendClient:

```javascript
const client = window.getBackendClient();

// Wait for backend to initialize
await client.waitForInitialization();

// Get license type with error handling
const licenseType = await client.getLicenseType();

// Check features safely (returns false on error)
const hasCloudSync = await client.isFeatureEnabled('cloudSync');

// Authenticate with clear error messages
try {
  const result = await client.authenticate({
    username: 'user@example.com',
    password: 'password123'
  });
  console.log('Authenticated:', result);
} catch (error) {
  // Error already logged to console
  alert('Authentication failed: ' + error.message);
}
```

## TypeScript Support

TypeScript definitions are available in `src/types/backend-api.d.ts`:

```typescript
import type { BackendAPI, AppConfig, AuthState } from '../types/backend-api';

async function checkConfig() {
  const config: AppConfig = await window.electronAPI.backend.config.get();
  const state: AuthState = await window.electronAPI.backend.auth.getState();

  if (config.licenseType === 'private') {
    // Private license logic
  }
}
```

## Complete Example: App Initialization

```javascript
async function initializeApp() {
  const client = window.getBackendClient();

  try {
    // Wait for backend services
    await client.waitForInitialization();
    console.log('✅ Backend services ready');

    // Get config
    const config = await client.getConfig();
    console.log('📋 License:', config.licenseType);
    console.log('📍 Mode:', config.mode);

    // Check auth state
    const authState = await client.getAuthState();

    if (authState.authenticated) {
      console.log('✅ User authenticated:', authState.user.username);
      // Show main app
    } else {
      console.log('❌ Not authenticated');
      // Show login/account creation

      const hasAccount = await client.hasAccount();
      if (hasAccount) {
        // Show login
      } else {
        // Show account creation
      }
    }

    // Check available features
    const features = config.features;
    if (features.collaboration) {
      // Enable collaboration UI
    }
    if (features.versionHistory) {
      // Enable version history UI
    }

  } catch (error) {
    console.error('❌ App initialization failed:', error);
    // Show error screen
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', initializeApp);
```

## Architecture Notes

### License-Based Behavior

- **Private License**: Local auth, local storage, no cloud features
- **Business License**: Cloud auth, cloud storage, full collaboration features

The backend automatically configures itself based on the license type.

### Error Handling

All backend methods may throw errors. Always use try-catch or .catch():

```javascript
// Good: with try-catch
try {
  const config = await client.getConfig();
} catch (error) {
  console.error('Config error:', error);
}

// Also good: with .catch()
client.getConfig()
  .then(config => console.log(config))
  .catch(error => console.error('Config error:', error));
```

### Security

- All IPC communication uses `contextBridge` for security
- Credentials never stored in renderer memory
- File paths validated in main process
- Storage operations restricted to user's data directory

## Troubleshooting

### "Backend API not available"
- Ensure preload script loaded: Check console for "✅ Kizu preload script loaded"
- Verify `contextIsolation: true` in webPreferences
- Check preload path is correct in main.js

### "Backend services not initialized"
- Wait for initialization: `await client.waitForInitialization()`
- Check main process logs for initialization errors
- Verify license storage is accessible

### Storage operations failing
- Ensure category is valid: 'images', 'fonts', 'media', 'data'
- Check file paths don't contain path traversal (`..`)
- Verify sufficient disk space

## Next Steps

- See `src/types/backend-api.d.ts` for complete type definitions
- Check `src/services/` for backend implementation details
- Review integration tests in `src/services/__tests__/`
