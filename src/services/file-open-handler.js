/**
 * File Open Handler
 * Handles opening .fig, .kizuku, and .json files via import + workspace navigation.
 * Shows progress UI and user-friendly error messages.
 */

const { createLogger } = require('../utils/logger');
const { getImportProgressManager } = require('./import-progress-manager');
const { formatImportError } = require('./import-error-formatter');

const { addTabFromMain, findTabByName, switchToExistingTab } = require('../tab-manager');

const logger = createLogger('FileOpen');

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const IMPORT_TIMEOUT_MS = 60000;

/**
 * Build workspace navigation script for renderer injection
 * @param {string} projectId - Project ID (also used as file-id)
 * @param {string} teamId - Team ID
 * @param {string} firstPageId - First page ID
 * @returns {string} JavaScript source
 */
function buildWorkspaceScript(projectId, teamId, firstPageId) {
  return `
    (function() {
      try {
        console.log('Opening imported file in workspace...');
        window.__KIZU_IMPORTED_FILE = {
          fileId: '${projectId}',
          projectId: '${projectId}',
          teamId: '${teamId}',
          pageId: '${firstPageId}',
          timestamp: Date.now()
        };
        var wsUrl = '#/workspace?team-id=${teamId}' +
          '&project-id=${projectId}&file-id=${projectId}' +
          '&page-id=${firstPageId}';
        window.location.hash = wsUrl;
      } catch (error) {
        console.error('Failed to open workspace:', error);
      }
    })();
  `;
}

/**
 * Extract project IDs from import result
 * @param {object} importResult - Import result
 * @returns {object} projectId, teamId, firstPageId
 */
function extractProjectIds(importResult) {
  const meta = importResult.project?.metadata;
  const data = importResult.project?.data;
  const projectId = meta?.id;
  const teamId = meta?.teamId || DEFAULT_TEAM_ID;
  const firstPage = data?.pages?.[0];
  const firstPageId = firstPage?.id || firstPage;
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

  const script = buildWorkspaceScript(projectId, teamId, firstPageId);
  await mainWindow.webContents.executeJavaScript(script);

  const projectName = importResult.project?.metadata?.name || 'Imported File';
  const wsUrl = `#/workspace?team-id=${teamId}&project-id=${projectId}&file-id=${projectId}`;
  addTabFromMain({ id: projectId, name: projectName, url: wsUrl });

  return {
    success: true,
    filePath: importResult.filePath,
    compatibilityScore: importResult.compatibilityScore,
  };
}

/**
 * Attach progress listeners to the importer
 * @param {object} importer - FigmaImporter instance
 * @param {object} progress - ImportProgressManager instance
 */
function attachProgressListeners(importer, progress) {
  importer.on('status-change', (status) => {
    progress.updateProgress(status);
  });
  importer.on('progress', (data) => {
    progress.sendUpdate(data);
  });
}

/**
 * Run import with timeout protection
 * @param {object} importer - FigmaImporter instance
 * @param {string} filePath - Path to file
 * @returns {Promise<object>} Import result
 */
function importWithTimeout(importer, filePath) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Import timed out after 60 seconds'));
    }, IMPORT_TIMEOUT_MS);

    importer
      .importFromFile(filePath)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Log diagnostic import statistics
 * @param {object} result - Import result
 */
function logImportDiagnostics(result) {
  const stats = result.stats || {};
  const pages = result.project?.data;
  logger.info('[DIAG] Import stats', {
    score: result.compatibilityScore,
    pages: pages ? pages.pages.length : 0,
    converted: stats.convertedNodes,
    total: stats.totalNodes,
    skipped: stats.skippedNodes,
  });
}

/**
 * Handle successful import result
 * @param {object} result - Import result
 * @param {object} mainWindow - BrowserWindow instance
 * @param {object} progress - ImportProgressManager instance
 * @returns {Promise<object>} Final result
 */
async function handleImportSuccess(result, mainWindow, progress) {
  if (!result.success || !result.filePath) {
    const errorMsg = result.error || 'Import failed - unknown error';
    logger.error('Import failed:', errorMsg);
    progress.showError(formatImportError(errorMsg));
    return { success: false, error: errorMsg };
  }

  logger.info('File imported:', result.filePath);
  logImportDiagnostics(result);
  progress.showSuccess(result);
  const openResult = await openImportedProject(result, mainWindow);
  return openResult;
}

/**
 * Handle opening .fig, .kizuku, or .json files
 * @param {string} filePath - Path to file to open
 * @param {object} mainWindow - BrowserWindow instance
 * @returns {Promise<object>} Result object
 */
async function handleFileOpen(filePath, mainWindow) {
  logger.info('Opening file:', filePath);
  const fileName = require('node:path').basename(filePath);
  const tabName = require('node:path').basename(filePath, require('node:path').extname(filePath));

  const existingTab = findTabByName(tabName);
  if (existingTab) {
    logger.info('Tab already open for:', tabName);
    switchToExistingTab(existingTab.id);
    return { success: true, reused: true };
  }

  const progress = getImportProgressManager();

  try {
    progress.show(fileName, mainWindow);

    const { getFigmaImporter } = require('./figma/figma-importer');
    const importer = getFigmaImporter();
    attachProgressListeners(importer, progress);

    const result = await importWithTimeout(importer, filePath);
    return await handleImportSuccess(result, mainWindow, progress);
  } catch (error) {
    logger.error('File import exception:', error);
    progress.showError(formatImportError(error));
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleFileOpen,
  openImportedProject,
  buildWorkspaceScript,
};
