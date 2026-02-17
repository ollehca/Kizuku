/**
 * Theme IPC Handlers
 * Handles all theme-related IPC communication between renderer and main process.
 */

const { ipcMain, dialog } = require('electron');
const { BrowserWindow } = require('electron');
const path = require('path');
const themeStorage = require('./brand-theme-storage');
const themeApplicator = require('./brand-theme-applicator');

/**
 * Handle theme load request
 * @returns {object} Current theme configuration
 */
function handleThemeLoad() {
  return themeStorage.loadTheme();
}

/**
 * Handle theme save request
 * @param {object} _event - IPC event
 * @param {object} theme - Theme configuration to save
 * @returns {object} Saved theme with metadata
 */
function handleThemeSave(_event, theme) {
  return themeStorage.saveTheme(theme);
}

/**
 * Handle theme apply request
 * @returns {Promise<object>} Apply result
 */
async function handleThemeApply() {
  return await themeApplicator.applyTheme();
}

/**
 * Handle theme reset request
 * @returns {Promise<object>} Reset result with default theme
 */
async function handleThemeReset() {
  const defaults = themeStorage.resetTheme();
  await themeApplicator.applyTheme();
  return defaults;
}

/**
 * Handle theme export to file
 * @returns {Promise<object>} Export result
 */
async function handleThemeExport() {
  const result = await dialog.showSaveDialog({
    title: 'Export Theme',
    defaultPath: 'kizu-theme.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }
  await themeStorage.exportThemeToFile(result.filePath);
  return { success: true, filePath: result.filePath };
}

/**
 * Handle theme import from file
 * @returns {Promise<object>} Import result with theme
 */
async function handleThemeImport() {
  const result = await dialog.showOpenDialog({
    title: 'Import Theme',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) {
    return { success: false, canceled: true };
  }
  const theme = await themeStorage.importThemeFromFile(result.filePaths[0]);
  await themeApplicator.applyTheme();
  return { success: true, theme };
}

/**
 * Handle opening the theme editor window
 * @returns {Promise<object>} Result
 */
async function handleOpenThemeEditor() {
  const editorWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    title: 'Kizu Theme Editor',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });
  await editorWindow.loadFile(path.join(__dirname, '..', 'renderer', 'theme-editor.html'));
  return { success: true };
}

/**
 * Register all theme-related IPC handlers
 */
function registerThemeHandlers() {
  ipcMain.handle('theme:load', handleThemeLoad);
  ipcMain.handle('theme:save', handleThemeSave);
  ipcMain.handle('theme:apply', handleThemeApply);
  ipcMain.handle('theme:reset', handleThemeReset);
  ipcMain.handle('theme:export', handleThemeExport);
  ipcMain.handle('theme:import', handleThemeImport);
  ipcMain.handle('theme:open-editor', handleOpenThemeEditor);
}

module.exports = { registerThemeHandlers };
