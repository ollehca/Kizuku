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

// ============================================================================
// CRITICAL: Single consistent team-id for all Kizu operations
// This allows PenPot to properly track and match teams
// ============================================================================
const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const KIZU_PROJECT_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Get the consistent Kizu team ID
 */
function getKizuTeamId() {
  return KIZU_TEAM_ID;
}

/**
 * Get the consistent Kizu project ID
 */
function getKizuProjectId() {
  return KIZU_PROJECT_ID;
}

/**
 * Generate mock profile from Kizu user
 */
async function getMockProfile() {
  const user = await userStorage.getUser();
  const license = await licenseStorage.getLicense();

  if (!user) {
    return null;
  }

  // Create a consistent UUID based on username (stable across sessions)
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
 * Mock Backend API Handlers
 * These replace all PenPot backend endpoints
 */
const mockHandlers = {
  /**
   * AUTH: Login (always succeeds for private licenses)
   */
  'login-with-password': async () => {
    console.log('🔓 Kizu Mock Backend: Login request (auto-approved for licensed user)');
    const profile = await getMockProfile();
    if (!profile) {
      return { error: 'No Kizu user found' };
    }
    return { success: true, profile };
  },

  /**
   * AUTH: Fetch Profile
   */
  'fetch-profile': async () => {
    console.log('👤 Kizu Mock Backend: Fetching profile');
    return await getMockProfile();
  },

  /**
   * AUTH: Get Profile (alias for fetch-profile)
   */
  'get-profile': async () => {
    console.log('👤 Kizu Mock Backend: Getting profile');
    return await getMockProfile();
  },

  /**
   * AUTH: Logout
   */
  logout: async () => {
    console.log('🚪 Kizu Mock Backend: Logout (local session only)');
    return { success: true };
  },

  /**
   * TEAMS: Fetch teams (return single default team)
   */
  'get-teams': async () => {
    console.log('👥 Kizu Mock Backend: Fetching teams (single-user mode)');
    const profile = await getMockProfile();
    if (!profile) {return [];}

    const now = new Date().toISOString();
    return [
      {
        id: KIZU_TEAM_ID,
        name: `${profile.fullname}'s Workspace`,
        'created-at': now,
        'modified-at': now,
        'is-default': true,
        'photo-id': null,
        permissions: {
          'is-owner': true,
          'is-admin': true,
          'can-edit': true,
        },
      },
    ];
  },

  /**
   * TEAMS: Get single team
   */
  'get-team': async (params) => {
    console.log('👥 Kizu Mock Backend: Get team', params);
    const profile = await getMockProfile();
    if (!profile) {return null;}

    const now = new Date().toISOString();
    return {
      id: KIZU_TEAM_ID,
      name: `${profile.fullname}'s Workspace`,
      'created-at': now,
      'modified-at': now,
      'is-default': true,
      'photo-id': null,
      permissions: {
        'is-owner': true,
        'is-admin': true,
        'can-edit': true,
      },
    };
  },

  /**
   * PROJECTS: Get team projects
   */
  'get-projects': async (params) => {
    console.log('📦 Kizu Mock Backend: Get projects', params);
    const profile = await getMockProfile();
    if (!profile) {return [];}

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

  /**
   * FILES: Get project files
   */
  'get-project-files': async (params) => {
    console.log('📂 Kizu Mock Backend: Get project files', params);
    // Return empty array - no files in fresh project
    return [];
  },

  /**
   * RECENT FILES: Get recent files
   */
  'get-team-recent-files': async (params) => {
    console.log('📂 Kizu Mock Backend: Get team recent files', params);
    return [];
  },

  /**
   * FILES: Get file data
   */
  'get-file': async (params) => {
    console.log('📂 Kizu Mock Backend: Get file', params);

    // TEST MODE: Return hardcoded file for testing (bypasses all Figma logic)
    if (params?.id === TEST_FILE_ID || params?.['file-id'] === TEST_FILE_ID) {
      console.log('🧪 TEST MODE: Returning hardcoded test file');
      return createHardcodedTestFile();
    }

    const { getBackendServiceManager } = require('./backend-service-manager');
    const manager = getBackendServiceManager();
    const project = manager.getCurrentProject();

    if (!project) {
      console.error('❌ No project loaded');
      return { error: 'No file loaded' };
    }

    console.log('📦 DEBUG: Raw project data:', JSON.stringify(project, null, 2).substring(0, 500));

    // Convert Kizu project format to PenPot file format
    const penpotFile = convertKizuToPenpotFile(project);

    console.log('📦 DEBUG: Converted PenPot file structure:');
    console.log('  - File ID:', penpotFile.id);
    console.log('  - File name:', penpotFile.name);
    console.log('  - Pages count:', Object.keys(penpotFile.data['pages-index'] || {}).length);
    console.log('  - Pages array:', penpotFile.data.pages);

    // Count total objects across all pages
    let totalObjects = 0;
    Object.values(penpotFile.data['pages-index'] || {}).forEach(page => {
      const objCount = Object.keys(page.objects || {}).length;
      console.log(`  - Page "${page.name}" has ${objCount} objects`);
      totalObjects += objCount;
    });
    console.log('  - Total objects:', totalObjects);

    // Show first page structure
    const firstPageId = penpotFile.data.pages[0];
    if (firstPageId && penpotFile.data['pages-index'][firstPageId]) {
      const firstPage = penpotFile.data['pages-index'][firstPageId];
      console.log('📦 DEBUG: First page:', JSON.stringify(firstPage, null, 2).substring(0, 1000));
    }

    console.log('✅ Returning file data for:', project.metadata.name);
    return penpotFile;
  },

  /**
   * FILES: Get file summary
   */
  'get-file-summary': async (params) => {
    console.log('📋 Kizu Mock Backend: Get file summary', params);
    const { getBackendServiceManager } = require('./backend-service-manager');
    const manager = getBackendServiceManager();
    const project = manager.getCurrentProject();

    if (!project) {
      return { error: 'No file loaded' };
    }

    return {
      id: project.metadata.id,
      name: project.metadata.name,
      'project-id': 'kizu-local', // Magic string for local-only mode
      'is-shared': false,
      'created-at': project.metadata.created,
      'modified-at': project.metadata.modified,
    };
  },

  /**
   * FILES: Get file info (used when navigating to workspace)
   */
  'get-file-info': async (params) => {
    console.log('ℹ️  Kizu Mock Backend: Get file info', params);

    // Check if this is a kizu-local file (loaded from window.__KIZU_FILE_DATA__)
    // PenPot will use this to validate the file exists before loading workspace
    const fileId = params.id || params['file-id'];

    // ============================================================================
    // MODIFIED BY KIZU (https://github.com/ollehca/PenPotDesktop)
    // Original file from PenPot (https://github.com/penpot/penpot)
    // Licensed under Mozilla Public License Version 2.0
    // Modifications: Use fileId as project-id (must be valid UUID, not "kizu-local")
    // Date: 2025-10-29
    // ============================================================================

    // For kizu-local files, return basic info
    // IMPORTANT: project-id must be a valid UUID - PenPot has assertions checking this
    // ============================================================================
    // MODIFIED BY KIZU (https://github.com/ollehca/PenPotDesktop)
    // Original file from PenPot (https://github.com/penpot/penpot)
    // Licensed under Mozilla Public License Version 2.0
    // Modifications: Use "kizu-local" as project-id to trigger local-only mode
    // Date: 2025-10-30
    // ============================================================================
    return {
      id: fileId,
      'project-id': 'kizu-local', // Magic string for local-only mode
      name: 'Imported File',
      'is-shared': false,
      permissions: ['owner'],
    };
  },

  /**
   * FILES: Get file data for thumbnail
   */
  'get-file-data-for-thumbnail': async () => {
    console.log('🖼️  Kizu Mock Backend: Get thumbnail data');
    // TODO: Implement local file read
    return { data: null };
  },

  /**
   * FILES: Get file object thumbnails (component/asset thumbnails)
   */
  'get-file-object-thumbnails': async (params) => {
    console.log('🖼️  Kizu Mock Backend: Get file object thumbnails', params);
    // Single-user mode doesn't pre-generate thumbnails
    // PenPot will render them on-demand
    return [];
  },

  /**
   * PROJECT: Get project
   */
  'get-project': async (params) => {
    console.log('📦 Kizu Mock Backend: Get project', params);
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

  /**
   * PROJECT: Get all projects
   */
  'get-all-projects': async () => {
    console.log('📦 Kizu Mock Backend: Get all projects (single-user mode)');
    const profile = await getMockProfile();
    if (!profile) {
      return [];
    }

    // Return a single default project for single-user mode
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

  /**
   * FONTS: Get font variants for team (return empty for single-user mode)
   */
  'get-font-variants': async (params) => {
    console.log('🔤 Kizu Mock Backend: Get font variants', params);
    // In single-user mode, we don't have custom team fonts
    // Users will use system fonts instead
    // Return empty array - PenPot will handle this gracefully
    return [];
  },

  /**
   * FILES: Get file libraries (shared libraries used by this file)
   */
  'get-file-libraries': async (params) => {
    console.log('📚 Kizu Mock Backend: Get file libraries', params);
    // Single-user mode doesn't use shared libraries
    return [];
  },

  /**
   * COMMENTS: Get comment threads (return empty for single-user mode)
   */
  'get-comment-threads': async (params) => {
    console.log('💬 Kizu Mock Backend: Get comment threads', params);
    // Single-user mode doesn't have comments
    return [];
  },

  /**
   * COMMENTS: Get unread comment threads (return empty for single-user mode)
   */
  'get-unread-comment-threads': async (params) => {
    console.log('💬 Kizu Mock Backend: Get unread comment threads', params);
    // Single-user mode doesn't have comments
    return [];
  },

  /**
   * COMMENTS: Get profiles for file comments (return empty for single-user mode)
   */
  'get-profiles-for-file-comments': async (params) => {
    console.log('👥 Kizu Mock Backend: Get profiles for comments', params);
    // Single-user mode doesn't have comments
    return [];
  },

  /**
   * PROFILE: Update profile properties
   */
  'update-profile-props': async (params) => {
    console.log('⚙️  Kizu Mock Backend: Update profile props', params);
    // Accept props updates silently for single-user mode
    // In the future, we could persist these to user storage
    return { success: true };
  },

  /**
   * ANALYTICS: Push audit events (ignore)
   */
  'push-audit-events': async () => {
    // Silently ignore - we don't need analytics in offline mode
    return { success: true };
  },

  /**
   * DEMO: Create demo profile (not needed, use Kizu license instead)
   */
  'create-demo-profile': async () => {
    console.log('🎯 Kizu Mock Backend: Demo profile requested (using Kizu license instead)');
    return await getMockProfile();
  },
};

// ============================================================================
// HARDCODED TEST FILE FOR STAGE 3/4 TESTING
// This bypasses ALL Figma import logic to test ONLY backend/frontend integration
// ============================================================================
const TEST_FILE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PAGE_ID = '22222222-2222-2222-2222-222222222222';
const TEST_FRAME_ID = '33333333-3333-3333-3333-333333333333';
const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Creates a minimal valid PenPot file structure for testing
 * If this renders in PenPot, the backend integration works
 * If this fails, the problem is NOT in Figma parsing
 */
function createHardcodedTestFile() {
  const now = new Date().toISOString();

  // Identity matrix as object (PenPot uses gmt/Matrix record)
  const identityMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  return {
    id: TEST_FILE_ID,
    name: 'Hardcoded Test File',
    // CRITICAL: project-id must match URL's project-id parameter
    'project-id': TEST_FILE_ID,  // Use same ID as file for consistency
    'team-id': KIZU_TEAM_ID,
    version: 22,
    revn: 0,
    'created-at': now,
    'modified-at': now,
    features: ['fdata/shape-data-type', 'components/v2'],
    data: {
      pages: [TEST_PAGE_ID],
      'pages-index': {
        [TEST_PAGE_ID]: {
          id: TEST_PAGE_ID,
          name: 'Test Page',
          options: {},
          objects: {
            // Root frame (REQUIRED - uuid/zero)
            [ROOT_FRAME_ID]: {
              id: ROOT_FRAME_ID,
              type: 'frame',
              name: 'Root Frame',
              'frame-id': ROOT_FRAME_ID,
              'parent-id': ROOT_FRAME_ID,
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              selrect: { x: 0, y: 0, width: 1, height: 1, x1: 0, y1: 0, x2: 1, y2: 1 },
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 0, y: 1 },
              ],
              shapes: [TEST_FRAME_ID],
            },
            // A visible frame with content
            [TEST_FRAME_ID]: {
              id: TEST_FRAME_ID,
              type: 'frame',
              name: 'Test Frame - Backend Works!',
              'frame-id': ROOT_FRAME_ID,
              'parent-id': ROOT_FRAME_ID,
              x: 100,
              y: 100,
              width: 400,
              height: 300,
              selrect: { x: 100, y: 100, width: 400, height: 300, x1: 100, y1: 100, x2: 500, y2: 400 },
              points: [
                { x: 100, y: 100 },
                { x: 500, y: 100 },
                { x: 500, y: 400 },
                { x: 100, y: 400 },
              ],
              fills: [{ 'fill-color': '#3388ff', 'fill-opacity': 1 }],
              shapes: [],
            },
          },
        },
      },
      options: {
        'components-v2': true,
      },
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

/**
 * Convert Kizu fills to PenPot format
 * Kizu: [{ type: 'color', color: '#ff0000', opacity: 1 }]
 * PenPot: [{ 'fill-color': '#ff0000', 'fill-opacity': 1 }]
 */
function convertFillsToPenpot(fills) {
  if (!fills || !Array.isArray(fills)) return [];

  return fills.map(fill => {
    // Handle Kizu format
    if (fill.color && typeof fill.color === 'string') {
      return {
        'fill-color': fill.color,
        'fill-opacity': fill.opacity ?? 1,
      };
    }
    // Handle already-converted PenPot format
    if (fill['fill-color']) {
      return fill;
    }
    // Default: return empty fill
    return { 'fill-color': '#000000', 'fill-opacity': 1 };
  }).filter(f => f && f['fill-color']);
}

/**
 * Convert Kizu strokes to PenPot format
 * Kizu: [{ type: 'color', color: '#000000', opacity: 1 }]
 * PenPot: [{ 'stroke-color': '#000000', 'stroke-opacity': 1 }]
 */
function convertStrokesToPenpot(strokes) {
  if (!strokes || !Array.isArray(strokes)) return [];

  return strokes.map(stroke => {
    // Handle Kizu format
    if (stroke.color && typeof stroke.color === 'string') {
      return {
        'stroke-color': stroke.color,
        'stroke-opacity': stroke.opacity ?? 1,
        'stroke-width': stroke.width || 1,
        'stroke-style': 'solid',
        'stroke-alignment': 'center',
      };
    }
    // Handle already-converted PenPot format
    if (stroke['stroke-color']) {
      return stroke;
    }
    // Default: return empty
    return null;
  }).filter(Boolean);
}

/**
 * Convert Kizu project format to PenPot file format
 */
function convertKizuToPenpotFile(kizuProject) {
  // PenPot file structure based on schema investigation
  const pagesArray = [];  // REQUIRED: ordered list of page UUIDs
  const pagesIndex = {};  // REQUIRED: map of page data

  // Convert Kizu's nested structure to PenPot's flat structure
  if (kizuProject.data && kizuProject.data.pages) {
    console.log('📦 Converting', kizuProject.data.pages.length, 'pages from Kizu format...');

    kizuProject.data.pages.forEach(page => {
      const pageId = page.id || crypto.randomUUID();
      console.log('  📄 Processing page:', pageId, page.name, '- Children count:', page.children?.length || 0);

      // Add page ID to pages array
      pagesArray.push(pageId);

      // Build page objects (all shapes on this page)
      const pageObjects = {};

      // CRITICAL: PenPot REQUIRES a root frame with ID uuid/zero for every page
      const ROOT_UUID = '00000000-0000-0000-0000-000000000000';

      // Flatten all children recursively - they become children of root frame
      // flattenChildren RETURNS the array of child IDs (important for root frame!)
      let childIds = [];
      if (page.children && page.children.length > 0) {
        console.log(`    🔄 Flattening ${page.children.length} children...`);
        childIds = flattenChildren(page.children, pageObjects, ROOT_UUID, ROOT_UUID);
        console.log(`    ✅ Flattened to ${Object.keys(pageObjects).length} objects`);
        console.log(`    📋 Root frame will contain ${childIds.length} top-level shapes`);
      } else {
        console.log('    ⚠️  No children to flatten');
      }

      // Create the REQUIRED root frame (uuid/zero)
      // Transform must be object format to be properly tagged as ~#matrix in Transit
      pageObjects[ROOT_UUID] = {
        id: ROOT_UUID,
        type: 'frame',
        name: 'Root Frame',
        'frame-id': ROOT_UUID,
        'parent-id': ROOT_UUID,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        selrect: { x: 0, y: 0, width: 1, height: 1, x1: 0, y1: 0, x2: 1, y2: 1 },
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 }
        ],
        transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        visible: true,
        opacity: 1,
        rotation: 0,
        'blend-mode': 'normal',
        fills: [],
        strokes: [],
        shapes: childIds  // Contains all top-level shapes on this page
      };

      // Store page in pages-index
      pagesIndex[pageId] = {
        id: pageId,
        name: page.name || 'Untitled Page',
        objects: pageObjects  // REQUIRED: all shapes on this page
      };
    });
  } else {
    console.error('❌ No pages found in Kizu project data!');
  }

  return {
    id: kizuProject.metadata.id,
    name: kizuProject.metadata.name,
    'project-id': 'kizu-local',
    version: 22,  // REQUIRED: PenPot version number
    revn: 0,      // REQUIRED: revision number
    'created-at': kizuProject.metadata.created,
    'modified-at': kizuProject.metadata.modified,
    features: ['fdata/shape-data-type', 'components/v2'],  // REQUIRED: feature flags
    data: {
      pages: pagesArray,           // REQUIRED: ordered page IDs
      'pages-index': pagesIndex,   // REQUIRED: page objects
      options: {
        'components-v2': true,
        'base-font-size': '16px'
      }
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

/**
 * Recursively flatten children into PenPot's flat objects structure
 * @param {Array} children - Array of child objects with nested structure
 * @param {Object} objects - The flat objects map to populate
 * @param {String} frameId - The ID of the containing frame/canvas (for frame-id)
 * @param {String} parentId - The ID of the direct parent (for parent-id)
 * @returns {Array} Array of child IDs
 */
function flattenChildren(children, objects, frameId, parentId) {
  const childIds = [];

  children.forEach(child => {
    const childId = child.id || crypto.randomUUID();
    childIds.push(childId);

    const x = child.x || 0;
    const y = child.y || 0;
    const width = child.width || 100;
    const height = child.height || 100;
    const rotation = child.rotation || 0;

    // REQUIRED: Computed geometry fields for PenPot
    // selrect: selection rectangle
    const selrect = {
      x: x,
      y: y,
      width: width,
      height: height,
      x1: x,
      y1: y,
      x2: x + width,
      y2: y + height
    };

    // REQUIRED: Corner points (top-left, top-right, bottom-right, bottom-left)
    const points = [
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x + width, y: y + height },
      { x: x, y: y + height }
    ];

    // REQUIRED: Transformation matrix as object { a, b, c, d, e, f }
    // Identity matrix (no transformation)
    // Must be object format to be properly tagged as ~#matrix in Transit
    const transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const transformInverse = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    // Determine frame-id based on shape type
    // For frames: frame-id is themselves
    // For other shapes: frame-id is the containing frame
    const isFrame = child.type === 'frame' || child.type === 'component';
    const shapeFrameId = isFrame ? childId : frameId;
    const shapeParentId = isFrame ? parentId : parentId; // Frames are parented to root, others to their container

    // Convert Kizu object to PenPot object format
    const shape = {
      id: childId,
      type: child.type || 'rect',
      name: child.name || 'Unnamed',
      'frame-id': shapeFrameId,
      'parent-id': shapeParentId,

      // Geometry
      x: x,
      y: y,
      width: width,
      height: height,

      // REQUIRED computed geometry
      selrect: selrect,
      points: points,
      transform: transform,
      'transform-inverse': transformInverse,

      // Display properties
      visible: child.visible !== false,
      opacity: child.opacity ?? 1,
      rotation: rotation,
      'blend-mode': child.blendMode || 'normal',

      // Fill and stroke - convert Kizu format to PenPot format
      fills: convertFillsToPenpot(child.fills),
      strokes: convertStrokesToPenpot(child.strokes),

      // Container for child shapes
      shapes: []
    };

    // Add optional properties if they exist
    if (child.strokeWeight) shape['stroke-weight'] = child.strokeWeight;
    if (child.effects) shape.effects = child.effects;

    objects[childId] = shape;

    // If this object has children, flatten them too
    // Pass the shape's frame-id for nested children (if it's a frame, it becomes the frame-id)
    if (child.children && child.children.length > 0) {
      const nestedChildIds = flattenChildren(child.children, objects, shapeFrameId, childId);
      objects[childId].shapes = nestedChildIds;
    }

    // Special handling for paths
    if (child.type === 'path' && child.commands) {
      objects[childId].content = convertPathCommands(child.commands);
    }
  });

  return childIds;
}

/**
 * Convert Kizu path commands to PenPot SVG path string
 * @param {Array} commands - Array of path command objects
 * @returns {String} SVG path string
 */
function convertPathCommands(commands) {
  return commands.map(cmd => {
    if (cmd.command === 'M') {
      return `M ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'L') {
      return `L ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'C') {
      return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'Z') {
      return 'Z';
    }
    return '';
  }).join(' ');
}

/**
 * Main interceptor function
 * Call this instead of PenPot's rp/cmd!
 */
async function handleCommand(commandName, params = {}) {
  console.log(`📨 [MockBackend] Command received: ${commandName}`);

  const handler = mockHandlers[commandName];

  if (!handler) {
    console.warn(`⚠️  Kizu Mock Backend: Unhandled command: ${commandName}`, JSON.stringify(params));
    // Return empty result instead of error to allow PenPot to continue
    // Most unhandled commands are optional (analytics, etc.)
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
 */
async function isAuthenticated() {
  const license = await licenseStorage.hasValidLicense();
  const user = await userStorage.hasUser();
  return license && user;
}

/**
 * Express/HTTP middleware to intercept PenPot API calls
 * Use this in main.js to intercept all /api/rpc/* requests
 */
function createMockBackendMiddleware() {
  return async (req, res, next) => {
    // Only intercept PenPot API calls
    if (!req.url.startsWith('/api/rpc/command/')) {
      return next();
    }

    const commandName = req.url.replace('/api/rpc/command/', '').split('?')[0];
    const params = req.method === 'POST' ? req.body : req.query;

    console.log(`🌐 Intercepted API call: ${commandName}`);

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
