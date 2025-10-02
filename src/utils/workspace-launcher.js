/**
 * Workspace Launcher
 * Launches PenPot workspace with a .kizu project file
 * Bypasses PenPot's default dashboard and authentication flow
 */

const { createLogger } = require('./logger');
const { getBackendServiceManager } = require('../services/backend-service-manager');

const logger = createLogger('WorkspaceLauncher');

/**
 * Get PenPot workspace URL configuration
 */
function getPenpotConfig() {
  return {
    dev: 'http://localhost:3449',
    prod: 'http://localhost:3449', // TODO: Update for production
  };
}

/**
 * Build workspace URL from project metadata
 */
function buildWorkspaceUrl(projectMetadata) {
  const config = getPenpotConfig();
  const baseUrl = process.env.NODE_ENV === 'production' ? config.prod : config.dev;

  // PenPot workspace URL format: /workspace/:project-id/:file-id
  // For local .kizu files, we use the project ID for both
  const projectId = projectMetadata.id;
  const fileId = projectMetadata.id; // Same as project for local files

  const workspaceUrl = `${baseUrl}/workspace/${projectId}/${fileId}`;

  logger.info('Built workspace URL', { projectId, fileId, workspaceUrl });

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
  if (!project || !project.metadata) {
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
 * Launch workspace in main window
 */
function launchInMainWindow(mainWindow, workspaceUrl) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('Main window not available');
  }

  logger.info('Launching workspace in main window', { url: workspaceUrl });

  // Load workspace URL
  mainWindow.loadURL(workspaceUrl).catch((error) => {
    logger.error('Failed to load workspace URL', { error });
    throw new Error(`Failed to load workspace: ${error.message}`);
  });

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
 * Launch PenPot workspace with a .kizu project
 * @param {string} filePath - Path to .kizu file
 * @param {BrowserWindow} mainWindow - Main application window
 */
async function launchWorkspace(filePath, mainWindow) {
  try {
    logger.info('Starting workspace launch', { filePath });

    const project = await prepareProject(filePath);
    validateProject(project);

    const workspaceUrl = buildWorkspaceUrl(project.metadata);
    launchInMainWindow(mainWindow, workspaceUrl);

    return createSuccessResult(project.metadata, workspaceUrl);
  } catch (error) {
    logger.error('Workspace launch failed', { filePath, error });
    throw error;
  }
}

module.exports = {
  launchWorkspace,
  buildWorkspaceUrl,
};
