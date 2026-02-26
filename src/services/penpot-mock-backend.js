/**
 * Kizuku Mock Backend for PenPot
 * Intercepts all PenPot API calls and handles them locally.
 * Auth via license, files on local FS, teams mocked for single-user.
 */

const crypto = require('node:crypto');
const userStorage = require('./user-storage');
const licenseStorage = require('./license-storage');
const converter = require('./kizuku-to-penpot-converter');
const autosave = require('./autosave-service');

// Single consistent team/project IDs for all Kizuku operations
const KIZUKU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const KIZUKU_PROJECT_ID = '00000000-0000-0000-0000-000000000002';

// In-memory store for newly created files (dashboard "+ New File")
const createdFiles = new Map();

// Blank-frame SVG used as default file thumbnail on the dashboard
const BLANK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#1e1e2e" rx="4"/><rect x="30" y="25" width="240" height="150" fill="none" stroke="#3a3a4a" stroke-width="1" rx="2"/></svg>';
const BLANK_THUMBNAIL = 'data:image/svg+xml,' + encodeURIComponent(BLANK_SVG);

/**
 * Build file summary objects from the createdFiles cache
 * @returns {Array} Array of file summary objects for dashboard
 */
function buildFileSummaries() {
  const summaries = [];
  for (const [fileId, file] of createdFiles) {
    summaries.push({
      id: fileId,
      name: file.name || 'Untitled',
      'project-id': file['project-id'] || KIZUKU_PROJECT_ID,
      'team-id': KIZUKU_TEAM_ID,
      'created-at': file['created-at'] || new Date().toISOString(),
      'modified-at': file['modified-at'] || new Date().toISOString(),
      'is-shared': false,
      'thumbnail-uri': file['thumbnail-uri'] || BLANK_THUMBNAIL,
      revn: file.revn || 0,
    });
  }
  return summaries;
}

/** @returns {string} Kizuku team UUID */
function getKizukuTeamId() {
  return KIZUKU_TEAM_ID;
}

/** @returns {string} Kizuku project UUID */
function getKizukuProjectId() {
  return KIZUKU_PROJECT_ID;
}

/**
 * Generate mock profile from Kizuku user
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
    email: user.email || `${user.username}@kizuku.local`,
    fullname: user.fullName,
    lang: 'en',
    theme: 'default',
    'created-at': now,
    'modified-at': now,
    'is-active': true,
    'is-muted': false,
    'is-demo': false,
    'auth-backend': 'penpot',
    'default-team-id': KIZUKU_TEAM_ID,
    'default-project-id': KIZUKU_PROJECT_ID,
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
    id: KIZUKU_TEAM_ID,
    name: `${profile.fullname}'s Workspace`,
    'created-at': new Date().toISOString(),
    'modified-at': new Date().toISOString(),
    'is-default': true,
    'photo-id': null,
    permissions: { 'is-owner': true, 'is-admin': true, 'can-edit': true },
  };
}

/**
 * Extract the file ID from command params
 * @param {object} params - Command parameters
 * @returns {string|undefined} File ID or undefined
 */
function extractFileId(params) {
  return params?.id || params?.['file-id'];
}

/**
 * Try restoring a file from the autosave directory
 * @param {string} fileId - File UUID
 * @returns {object|null} Restored file data or null
 */
function tryLoadAutosaved(fileId) {
  const saved = autosave.loadAutosavedFile(fileId);
  if (saved) {
    createdFiles.set(fileId, saved);
    return saved;
  }
  return null;
}

/**
 * Look up a file by ID in test files and created files cache
 * @param {object} params - Command parameters
 * @returns {object|null} Cached file or null
 */
function lookupCachedFile(params) {
  const reqId = extractFileId(params);

  if (reqId === converter.TEST_FILE_ID) {
    console.log('🧪 TEST MODE: Returning hardcoded test file');
    return converter.createHardcodedTestFile();
  }

  if (reqId && createdFiles.has(reqId)) {
    console.log('✅ Returning newly created file:', reqId);
    return createdFiles.get(reqId);
  }

  return reqId ? tryLoadAutosaved(reqId) : null;
}

/**
 * Create a minimal empty PenPot file for an unknown ID
 * @param {string} fileId - The requested file UUID
 * @returns {object} Valid PenPot file structure
 */
function createPlaceholderFile(fileId) {
  if (createdFiles.has(fileId)) {
    return createdFiles.get(fileId);
  }
  const pageId = crypto.randomUUID();
  const rootId = '00000000-0000-0000-0000-000000000000';
  const now = new Date().toISOString();
  const file = {
    id: fileId,
    name: 'Untitled',
    'project-id': KIZUKU_PROJECT_ID,
    'team-id': KIZUKU_TEAM_ID,
    version: 22,
    revn: 0,
    'is-shared': false,
    'created-at': now,
    'modified-at': now,
    features: ['components/v2'],
    data: {
      pages: [pageId],
      'pages-index': {
        [pageId]: {
          id: pageId,
          name: 'Page 1',
          objects: {
            [rootId]: {
              id: rootId,
              type: 'frame',
              name: 'Root Frame',
              'frame-id': rootId,
              'parent-id': rootId,
              shapes: [],
            },
          },
        },
      },
      options: { 'components-v2': true },
    },
    permissions: ['owner'],
  };
  createdFiles.set(fileId, file);
  autosave.persistFileNow(fileId, file);
  return file;
}

/**
 * Handle get-file command with test mode and project loading
 * @param {object} params - Command parameters
 * @returns {Promise<object>} PenPot file data
 */
async function handleGetFile(params) {
  console.log('📂 Kizuku Mock Backend: Get file', params);

  const cached = lookupCachedFile(params);
  if (cached) {
    return cached;
  }

  const { getBackendServiceManager } = require('./backend-service-manager');
  const manager = getBackendServiceManager();
  let project = manager.getCurrentProject();

  if (!project) {
    console.log('⏳ No project yet, waiting briefly...');
    project = await waitForProject(manager, 3000);
  }

  if (project) {
    const penpotFile = converter.convertKizukuToPenpotFile(project);
    const cacheId = penpotFile.id || extractFileId(params);
    if (cacheId) {
      createdFiles.set(cacheId, penpotFile);
      autosave.persistFileNow(cacheId, penpotFile);
    }
    console.log('✅ Returning file data for:', project.metadata.name);
    return penpotFile;
  }

  // No project and no cache — create an empty placeholder file
  const fileId = extractFileId(params) || crypto.randomUUID();
  console.log('📄 Creating placeholder file for:', fileId);
  return createPlaceholderFile(fileId);
}

/**
 * Wait for a project to be loaded (handles race condition)
 * @param {object} manager - Backend service manager
 * @param {number} timeoutMs - Max wait time in ms
 * @returns {Promise<object|null>} Project or null
 */
function waitForProject(manager, timeoutMs) {
  const interval = 200;
  let elapsed = 0;
  return new Promise((resolve) => {
    const check = () => {
      const proj = manager.getCurrentProject();
      if (proj) {
        return resolve(proj);
      }
      elapsed += interval;
      if (elapsed >= timeoutMs) {
        return resolve(null);
      }
      setTimeout(check, interval);
    };
    setTimeout(check, interval);
  });
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
      return { error: 'No Kizuku user found' };
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

  /** TEAMS: Get team info (dashboard route) */
  'get-team-info': async (params) => {
    const profile = await getMockProfile();
    if (!profile) {
      return null;
    }
    const team = buildTeamObject(profile);
    if (params?.id) {
      team.id = params.id;
    }
    return team;
  },

  /** TEAMS: Get team members */
  'get-team-members': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile.id,
        email: profile.email,
        fullname: profile.fullname,
        'is-owner': true,
        'is-admin': true,
        'can-edit': true,
      },
    ];
  },

  /** TEAMS: Get team invitations */
  'get-team-invitations': async () => [],

  /** TEAMS: Get team shared files */
  'get-team-shared-files': async () => [],

  /** TEAMS: Get team users */
  'get-team-users': async () => {
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile.id,
        email: profile.email,
        fullname: profile.fullname,
        photo: null,
      },
    ];
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
        id: KIZUKU_PROJECT_ID,
        name: 'My Designs',
        'team-id': KIZUKU_TEAM_ID,
        'created-at': now,
        'modified-at': now,
        'is-default': true,
        'is-pinned': false,
      },
    ];
  },

  /** FILES: Create a new file (from dashboard "+ New File") */
  'create-file': async (params) => {
    const fileId = crypto.randomUUID();
    const pageId = crypto.randomUUID();
    const rootId = '00000000-0000-0000-0000-000000000000';
    const now = new Date().toISOString();
    console.log('📄 Kizuku Mock Backend: create-file', { name: params?.name, fileId });
    const file = {
      id: fileId,
      name: params?.name || 'Untitled',
      'project-id': params?.['project-id'] || KIZUKU_PROJECT_ID,
      'team-id': KIZUKU_TEAM_ID,
      version: 22,
      revn: 0,
      'is-shared': false,
      'created-at': now,
      'modified-at': now,
      features: ['components/v2'],
      data: {
        pages: [pageId],
        'pages-index': {
          [pageId]: {
            id: pageId,
            name: 'Page 1',
            objects: {
              [rootId]: {
                id: rootId,
                type: 'frame',
                name: 'Root Frame',
                'frame-id': rootId,
                'parent-id': rootId,
                shapes: [],
              },
            },
          },
        },
        options: { 'components-v2': true },
      },
      permissions: ['owner'],
    };
    createdFiles.set(fileId, file);
    autosave.persistFileNow(fileId, file);
    return file;
  },

  /** FILES: Get project files */
  'get-project-files': async () => buildFileSummaries(),

  /** RECENT FILES: Get recent files */
  'get-team-recent-files': async () => buildFileSummaries(),

  /** FILES: Get file data */
  'get-file': handleGetFile,

  /** FILES: Get file summary */
  'get-file-summary': async (params) => {
    console.log('📋 Kizuku Mock Backend: Get file summary', params);
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

  /** FILES: Get thumbnail data — return first page for rendering */
  'get-file-data-for-thumbnail': async (params) => {
    const fileId = extractFileId(params);
    const file = createdFiles.get(fileId);
    if (!file?.data) {
      return { 'file-id': fileId, revn: 0, page: null };
    }
    const pageId = file.data.pages?.[0];
    const page = file.data['pages-index']?.[pageId];
    return {
      'file-id': fileId,
      revn: file.revn || 0,
      page: page || null,
    };
  },

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

  /** TEMPLATES: Get builtin templates (empty for offline) */
  'get-builtin-templates': async () => [],

  /** TEMPLATES: Retrieve list of builtin templates */
  'retrieve-list-of-builtin-templates': async () => [],

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

  /** CHANGES: Update file — merge changes and flag for autosave */
  'update-file': async (params) => {
    const fileId = params?.id;
    const nextRevn = (params?.revn || 0) + 1;
    console.log('📝 Kizuku Mock Backend: update-file', fileId);

    if (fileId && createdFiles.has(fileId)) {
      const existing = createdFiles.get(fileId);
      if (params?.changes) {
        existing.data = { ...existing.data, ...params.changes };
      }
      existing.revn = nextRevn;
      existing['modified-at'] = new Date().toISOString();
    }

    try {
      const autosave = require('./autosave-service');
      if (fileId) {
        autosave.markDirty(fileId);
      }
    } catch {
      // autosave not wired yet — safe to ignore
    }

    return { id: fileId, revn: nextRevn };
  },

  /** CHANGES: Persist temp file (stub) */
  'persist-temp-file': async () => ({ success: true }),

  /** CHANGES: Update file data (stub) */
  'update-file-data': async () => ({ success: true }),

  /** THUMBNAILS: Persist rendered thumbnail (stub) */
  'create-file-thumbnail': async () => ({
    id: crypto.randomUUID(),
  }),

  /** THUMBNAILS: Persist object thumbnail (stub) */
  'create-file-object-thumbnail': async () => ({
    id: crypto.randomUUID(),
  }),

  /** CHANGES: Create file change (stub) */
  'create-file-change': async () => ({ success: true }),

  /** CHANGES: Get file changes (stub) */
  'get-file-changes': async () => [],

  /** MEDIA: Get file media object (images) */
  'get-file-media-object': async (params) => {
    const { getBackendServiceManager } = require('./backend-service-manager');
    const project = getBackendServiceManager().getCurrentProject();
    if (!project) {
      return { error: 'No project loaded' };
    }
    const images = project.assets?.images || [];
    const mediaId = params?.id || params?.['media-id'];
    const found = images.find((img) => img.hash === mediaId);
    if (!found) {
      return { error: `Media not found: ${mediaId}` };
    }
    return { id: found.hash, data: found.data, mtype: found.mtype || 'image/png' };
  },
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
      `⚠️  Kizuku Mock Backend: Unhandled command: ${commandName}`,
      JSON.stringify(params)
    );
    return null;
  }

  try {
    const result = await handler(params);
    console.log(`✅ Kizuku Mock Backend: ${commandName} completed`);
    return result;
  } catch (error) {
    console.error(`❌ Kizuku Mock Backend: ${commandName} failed:`, error);
    return null;
  }
}

/**
 * Check if Kizuku license is valid (determines authentication)
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

/** @returns {Map} In-memory created files map */
function getCreatedFiles() {
  return createdFiles;
}

module.exports = {
  handleCommand,
  getMockProfile,
  isAuthenticated,
  createMockBackendMiddleware,
  mockHandlers,
  getKizukuTeamId,
  getKizukuProjectId,
  getCreatedFiles,
};
