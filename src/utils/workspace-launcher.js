/**
 * Workspace Launcher
 * Launches Kizuku workspace with a .kizuku project file
 * Bypasses Kizuku's default dashboard and authentication flow
 */

const { createLogger } = require('./logger');
const { getBackendServiceManager } = require('../services/backend-service-manager');

const logger = createLogger('WorkspaceLauncher');

/**
 * Get Kizuku workspace URL configuration
 */
function getPenpotConfig() {
  return {
    dev: 'http://localhost:3449',
    prod: 'http://localhost:3449',
  };
}

/**
 * Build workspace URL from project metadata
 */
function buildWorkspaceUrl(projectMetadata) {
  const config = getPenpotConfig();
  const baseUrl = process.env.NODE_ENV === 'production' ? config.prod : config.dev;

  const fileId = projectMetadata.id;
  const projectId = projectMetadata.id; // Use same ID for both

  // PenPot workspace URL format: /workspace/<project-id>/<file-id>
  // Using legacy route format which is more reliable
  const workspaceUrl = `${baseUrl}/workspace/${projectId}/${fileId}`;

  logger.info('Built workspace URL', { fileId, projectId, workspaceUrl });

  return workspaceUrl;
}

/**
 * Prepare project for workspace launch
 */
async function prepareProject(filePath) {
  try {
    const manager = getBackendServiceManager();

    // Load project from file
    const project = await manager.loadProject(filePath);

    logger.info('Project loaded for workspace', {
      name: project.metadata.name,
      id: project.metadata.id,
    });

    return project;
  } catch (error) {
    logger.error('Failed to prepare project', { filePath, error });
    throw new Error(`Failed to load project: ${error.message}`);
  }
}

/**
 * Validate project can be launched
 */
function validateProject(project) {
  if (!project?.metadata) {
    throw new Error('Invalid project: missing metadata');
  }

  if (!project.metadata.id) {
    throw new Error('Invalid project: missing project ID');
  }

  if (!project.metadata.name) {
    throw new Error('Invalid project: missing project name');
  }

  logger.info('Project validation passed', { id: project.metadata.id });
}

/**
 * Launch workspace in main window using PenPot's kizu-local mechanism
 */
async function launchInMainWindow(mainWindow, workspaceUrl, project) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('Main window not available');
  }

  console.log('🔧 [WorkspaceLauncher] Launching workspace in main window');
  logger.info('Launching workspace in main window');

  // Use PenPot's kizu-local mechanism for loading files from outside the database
  // This is the same approach used in main.js for drag-and-drop imports
  const fileId = project.metadata.id;

  // Get team ID from mock profile
  const mockBackend = require('../services/penpot-mock-backend');
  const profile = await mockBackend.getMockProfile();
  const teamId = profile['default-team-id'];

  console.log('📦 [WorkspaceLauncher] Using kizu-local mechanism for file:', fileId);

  // Inject file data and navigate using PenPot's built-in kizu-local loader
  // Simple navigation - PenPot will load the file via normal API calls to our mock backend
  const loadScript = `
    (async () => {
      try {
        console.log('🔐 [WorkspaceLauncher] Checking authentication...');

        // Verify auth tokens are set (should be done by auth-integration.js)
        const authToken = localStorage.getItem('auth-token');
        const profileStr = localStorage.getItem('auth-profile');

        if (!authToken || !profileStr) {
          console.error(
            '❌ [WorkspaceLauncher] Missing auth -',
            'auth-integration.js should have set this'
          );
          throw new Error('Authentication not available');
        }

        const profile = JSON.parse(profileStr);
        const profileTeamId = profile['default-team-id'] || '${teamId}';

        console.log('✅ [WorkspaceLauncher] Auth verified, navigating to workspace');
        console.log('📊 [WorkspaceLauncher] Team:', profileTeamId,
          'Project:', '${fileId}', 'File:', '${fileId}');

        // Navigate to workspace using NORMAL PenPot URL format
        // PenPot will make API calls to get-file, which our mock backend handles
        // Use fileId as BOTH project-id and file-id (they're the same for imported files)
        const workspaceUrl = \`/workspace?team-id=\${profileTeamId}\` +
          \`&project-id=${fileId}&file-id=${fileId}\`;

        console.log('🔗 [WorkspaceLauncher] Navigating to:', workspaceUrl);
        window.location.hash = workspaceUrl;

        console.log('✅ [WorkspaceLauncher] Navigation complete - PenPot will load file via API');
      } catch (error) {
        console.error('❌ [WorkspaceLauncher] Failed to navigate:', error);
      }
    })();
  `;

  // Execute the load script
  await mainWindow.webContents.executeJavaScript(loadScript);

  console.log('✅ [WorkspaceLauncher] File load script executed');

  // Focus the window
  mainWindow.focus();
}

/**
 * Create success result
 */
function createSuccessResult(project, url) {
  logger.info('Workspace launched successfully', {
    project: project.name,
    id: project.id,
  });

  return {
    success: true,
    project,
    url,
  };
}

/**
 * Launch Kizuku workspace with a .kizuku project
 * @param {string} filePath - Path to .kizuku file
 * @param {BrowserWindow} mainWindow - Main application window
 */
async function launchWorkspace(filePath, mainWindow) {
  try {
    console.log('🚀 [WorkspaceLauncher] Starting workspace launch for:', filePath);
    logger.info('Starting workspace launch', { filePath });

    const project = await prepareProject(filePath);
    console.log(
      '📦 [WorkspaceLauncher] Project loaded:',
      project.metadata.name,
      project.metadata.id
    );

    validateProject(project);
    console.log('✅ [WorkspaceLauncher] Project validation passed');

    const workspaceUrl = buildWorkspaceUrl(project.metadata);
    console.log('🔗 [WorkspaceLauncher] Built workspace URL:', workspaceUrl);

    await launchInMainWindow(mainWindow, workspaceUrl, project);
    console.log('✅ [WorkspaceLauncher] Launched in main window successfully');

    return createSuccessResult(project.metadata, workspaceUrl);
  } catch (error) {
    console.error('❌ [WorkspaceLauncher] Workspace launch failed:', error);
    logger.error('Workspace launch failed', { filePath, error });
    throw error;
  }
}

module.exports = {
  launchWorkspace,
  buildWorkspaceUrl,
};
