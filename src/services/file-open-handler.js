/**
 * File Open Handler
 * Handles opening .fig, .kizu, and .json files via import + workspace navigation.
 */

const { createLogger } = require('../utils/logger');
const logger = createLogger('FileOpen');

/**
 * Build workspace navigation script for renderer injection
 * @param {string} projectId - Project ID
 * @param {string} teamId - Team ID
 * @param {string} firstPageId - First page ID
 * @param {string} filePath - Escaped file path
 * @returns {string} JavaScript source
 */
function buildWorkspaceScript(projectId, teamId, firstPageId, filePath) {
  return `
    (async () => {
      try {
        console.log('🎯 Opening imported file in workspace...');
        console.log('📥 Fetching file data from mock backend...');
        var response = await window.electronAPI.mockBackend.command('get-file', {
          id: '${projectId}',
          features: 'fdata/shape-data-type'
        });
        if (!response || response.error) {
          throw new Error('Failed to fetch file data: ' + (response?.error || 'Unknown'));
        }
        var fileData = response.raw || response;
        if (!fileData || !fileData.data) {
          throw new Error('File data has invalid structure');
        }
        if (!window.__KIZU_FILE_DATA__) {
          window.__KIZU_FILE_DATA__ = {};
        }
        window.__KIZU_FILE_DATA__['${projectId}'] = fileData;
        console.log('✅ File data stored in window.__KIZU_FILE_DATA__');

        window.__KIZU_IMPORTED_FILE = {
          fileId: '${projectId}',
          projectId: '${projectId}',
          teamId: '${teamId}',
          pageId: '${firstPageId}',
          filePath: '${filePath}',
          timestamp: Date.now()
        };

        var wsUrl = '#/workspace?team-id=${teamId}' +
          '&project-id=kizu-local&file-id=${projectId}' +
          '&page-id=${firstPageId}';
        console.log('🔗 Navigating to:', wsUrl);
        window.location.hash = wsUrl;
        console.log('✅ Workspace navigation complete');
      } catch (error) {
        console.error('❌ Failed to open workspace:', error);
        alert('Failed to open workspace: ' + error.message);
      }
    })();
  `;
}

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Extract project IDs from import result
 * @param {object} importResult - Import result
 * @returns {object} projectId, teamId, firstPageId
 */
function extractProjectIds(importResult) {
  const meta = importResult.project && importResult.project.metadata;
  const data = importResult.project && importResult.project.data;
  const projectId = meta && meta.id;
  const teamId = (meta && meta.teamId) || DEFAULT_TEAM_ID;
  const firstPage = data && data.pages && data.pages[0];
  const firstPageId = (firstPage && firstPage.id) || firstPage;
  return { projectId, teamId, firstPageId };
}

/**
 * Load imported project into backend and navigate
 * @param {object} importResult - Import result from figma-importer
 * @param {object} mainWindow - BrowserWindow instance
 * @returns {Promise<object>} Result object
 */
async function openImportedProject(importResult, mainWindow) {
  const { projectId, teamId, firstPageId } = extractProjectIds(importResult);

  const { getBackendServiceManager } = require('./backend-service-manager');
  const backend = getBackendServiceManager();
  logger.info('Loading project into backend:', importResult.filePath);
  await backend.loadProject(importResult.filePath);

  if (!firstPageId) {
    throw new Error('Project has no pages - cannot open workspace');
  }

  const escapedPath = importResult.filePath.replace(/\\/g, '\\\\');
  const script = buildWorkspaceScript(projectId, teamId, firstPageId, escapedPath);
  await mainWindow.webContents.executeJavaScript(script);

  return {
    success: true,
    filePath: importResult.filePath,
    compatibilityScore: importResult.compatibilityScore,
  };
}

/**
 * Handle opening .fig, .kizu, or .json files
 * @param {string} filePath - Path to file to open
 * @param {object} mainWindow - BrowserWindow instance
 * @returns {Promise<object>} Result object
 */
async function handleFileOpen(filePath, mainWindow) {
  logger.info('Opening file:', filePath);

  try {
    const { getFigmaImporter } = require('./figma/figma-importer');
    const importer = getFigmaImporter();
    const result = await importer.importFromFile(filePath);

    if (result.success && result.filePath) {
      logger.info('File imported:', result.filePath);
      return await openImportedProject(result, mainWindow);
    }

    const errorMsg = result.error || 'Import failed - unknown error';
    logger.error('Import failed:', errorMsg);
    return { success: false, error: errorMsg };
  } catch (error) {
    logger.error('File import exception:', error);
    showImportError(mainWindow, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Show import error notification in the main window
 * @param {object} mainWindow - BrowserWindow instance
 * @param {string} message - Error message
 */
function showImportError(mainWindow, message) {
  const escaped = message.replace(/'/g, "\\'");
  const script = `
    console.error('Import error:', '${escaped}');
    alert('Failed to import file: ${escaped}');
  `;
  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

module.exports = {
  handleFileOpen,
  openImportedProject,
  buildWorkspaceScript,
};
