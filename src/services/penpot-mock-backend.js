/**
 * Kizu Mock Backend for PenPot
 *
 * This layer intercepts ALL PenPot backend API calls and handles them locally.
 * PenPot backend is NOT needed in production - this is the complete replacement.
 *
 * Architecture:
 * - Auth: Always authenticated (Kizu license = authentication)
 * - Files: Local filesystem (no database needed)
 * - Teams/Collab: Mocked for single-user mode
 * - Analytics: Ignored
 */

const crypto = require('crypto');
const userStorage = require('./user-storage');
const licenseStorage = require('./license-storage');
const converter = require('./kizu-to-penpot-converter');

// Single consistent team/project IDs for all Kizu operations
const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const KIZU_PROJECT_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Get the consistent Kizu team ID
 * @returns {string} Team UUID
 */
function getKizuTeamId() {
  return KIZU_TEAM_ID;
}

/**
 * Get the consistent Kizu project ID
 * @returns {string} Project UUID
 */
function getKizuProjectId() {
  return KIZU_PROJECT_ID;
}

/**
 * Generate mock profile from Kizu user
 * @returns {Promise<object|null>} Mock profile or null
 */
async function getMockProfile() {
  const user = await userStorage.getUser();
  // TODO: Use license data for profile enrichment at launch
  // const license = await licenseStorage.getLicense();

  if (!user) {
    return null;
  }

  const profileId = crypto
    .createHash('md5')
    .update(user.username)
    .digest('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

  const now = new Date().toISOString();

  return {
    id: profileId,
    email: user.email || `${user.username}@kizu.local`,
    fullname: user.fullName,
    lang: 'en',
    theme: 'default',
    'created-at': now,
    'modified-at': now,
    'is-active': true,
    'is-muted': false,
    'is-demo': false,
    'auth-backend': 'penpot',
    'default-team-id': KIZU_TEAM_ID,
    'default-project-id': KIZU_PROJECT_ID,
    props: {
      'release-notes-viewed': '3.5',
      'newsletter-news': false,
      'newsletter-updates': false,
      'onboarding-viewed': true,
    },
  };
}

/**
 * Build a team object from profile
 * @param {object} profile - Mock profile
 * @returns {object} Team object
 */
function buildTeamObject(profile) {
  return {
    id: KIZU_TEAM_ID,
    name: `${profile.fullname}'s Workspace`,
    'created-at': new Date().toISOString(),
    'modified-at': new Date().toISOString(),
    'is-default': true,
    'photo-id': null,
    permissions: { 'is-owner': true, 'is-admin': true, 'can-edit': true },
  };
}

/**
 * Handle get-file command with test mode and project loading
 * @param {object} params - Command parameters
 * @returns {Promise<object>} PenPot file data
 */
async function handleGetFile(params) {
  console.log('📂 Kizu Mock Backend: Get file', params);

  if (params?.id === converter.TEST_FILE_ID || params?.['file-id'] === converter.TEST_FILE_ID) {
    console.log('🧪 TEST MODE: Returning hardcoded test file');
    return converter.createHardcodedTestFile();
  }

  const { getBackendServiceManager } = require('./backend-service-manager');
  const manager = getBackendServiceManager();
  const project = manager.getCurrentProject();

  if (!project) {
    console.error('❌ No project loaded');
    return { error: 'No file loaded' };
  }

  const penpotFile = converter.convertKizuToPenpotFile(project);
  console.log('✅ Returning file data for:', project.metadata.name);
  return penpotFile;
}

/**
 * Mock Backend API Handlers
 * These replace all PenPot backend endpoints
 */
const mockHandlers = {
  /** AUTH: Login (always succeeds for private licenses) */
  'login-with-password': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return { error: 'No Kizu user found' };
    }
    return { success: true, profile };
  },

  /** AUTH: Fetch Profile */
  'fetch-profile': async () => await getMockProfile(),

  /** AUTH: Get Profile */
  'get-profile': async () => await getMockProfile(),

  /** AUTH: Logout */
  logout: async () => ({ success: true }),

  /** TEAMS: Fetch teams (single-user mode) */
  'get-teams': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }
    return [buildTeamObject(profile)];
  },

  /** TEAMS: Get single team */
  'get-team': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return null;
    }
    return buildTeamObject(profile);
  },

  /** PROJECTS: Get team projects */
  'get-projects': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }
    const now = new Date().toISOString();
    return [
      {
        id: KIZU_PROJECT_ID,
        name: 'My Designs',
        'team-id': KIZU_TEAM_ID,
        'created-at': now,
        'modified-at': now,
        'is-default': true,
        'is-pinned': false,
      },
    ];
  },

  /** FILES: Get project files */
  'get-project-files': async () => [],

  /** RECENT FILES: Get recent files */
  'get-team-recent-files': async () => [],

  /** FILES: Get file data */
  'get-file': handleGetFile,

  /** FILES: Get file summary */
  'get-file-summary': async (params) => {
    console.log('📋 Kizu Mock Backend: Get file summary', params);
    const { getBackendServiceManager } = require('./backend-service-manager');
    const project = getBackendServiceManager().getCurrentProject();
    if (!project) {
      return { error: 'No file loaded' };
    }
    return {
      id: project.metadata.id,
      name: project.metadata.name,
      'project-id': 'kizu-local',
      'is-shared': false,
      'created-at': project.metadata.created,
      'modified-at': project.metadata.modified,
    };
  },

  /** FILES: Get file info (used when navigating to workspace) */
  'get-file-info': async (params) => {
    const fileId = params.id || params['file-id'];
    return {
      id: fileId,
      'project-id': 'kizu-local',
      name: 'Imported File',
      'is-shared': false,
      permissions: ['owner'],
    };
  },

  /** FILES: Get thumbnail data */
  'get-file-data-for-thumbnail': async () => ({ data: null }),

  /** FILES: Get file object thumbnails */
  'get-file-object-thumbnails': async () => [],

  /** PROJECT: Get project */
  'get-project': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return { error: 'No user' };
    }
    return {
      id: profile['default-team-id'],
      name: 'My Project',
      'team-id': profile['default-team-id'],
      'is-default': true,
    };
  },

  /** PROJECT: Get all projects */
  'get-all-projects': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile['default-team-id'],
        name: 'My Project',
        'team-id': profile['default-team-id'],
        'is-default': true,
        'created-at': new Date().toISOString(),
        'modified-at': new Date().toISOString(),
      },
    ];
  },

  /** FONTS: Get font variants (empty for single-user) */
  'get-font-variants': async () => [],

  /** FILES: Get file libraries */
  'get-file-libraries': async () => [],

  /** COMMENTS: Get comment threads */
  'get-comment-threads': async () => [],

  /** COMMENTS: Get unread comment threads */
  'get-unread-comment-threads': async () => [],

  /** COMMENTS: Get profiles for file comments */
  'get-profiles-for-file-comments': async () => [],

  /** PROFILE: Update profile properties */
  'update-profile-props': async () => ({ success: true }),

  /** ANALYTICS: Push audit events (ignore) */
  'push-audit-events': async () => ({ success: true }),

  /** DEMO: Create demo profile */
  'create-demo-profile': async () => await getMockProfile(),
};

/**
 * Main interceptor function - call instead of PenPot's rp/cmd!
 * @param {string} commandName - PenPot command name
 * @param {object} params - Command parameters
 * @returns {Promise<object|null>} Command result
 */
async function handleCommand(commandName, params = {}) {
  console.log(`📨 [MockBackend] Command received: ${commandName}`);

  const handler = mockHandlers[commandName];
  if (!handler) {
    console.warn(
      `⚠️  Kizu Mock Backend: Unhandled command: ${commandName}`,
      JSON.stringify(params)
    );
    return null;
  }

  try {
    const result = await handler(params);
    console.log(`✅ Kizu Mock Backend: ${commandName} completed`);
    return result;
  } catch (error) {
    console.error(`❌ Kizu Mock Backend: ${commandName} failed:`, error);
    return null;
  }
}

/**
 * Check if Kizu license is valid (determines authentication)
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated() {
  const license = await licenseStorage.hasValidLicense();
  const user = await userStorage.hasUser();
  return license && user;
}

/**
 * Express/HTTP middleware to intercept PenPot API calls
 * @returns {Function} Express middleware
 */
function createMockBackendMiddleware() {
  return async (req, res, next) => {
    if (!req.url.startsWith('/api/rpc/command/')) {
      return next();
    }

    const commandName = req.url.replace('/api/rpc/command/', '').split('?')[0];
    const params = req.method === 'POST' ? req.body : req.query;

    const result = await handleCommand(commandName, params);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  };
}

module.exports = {
  handleCommand,
  getMockProfile,
  isAuthenticated,
  createMockBackendMiddleware,
  mockHandlers,
  getKizuTeamId,
  getKizuProjectId,
};
