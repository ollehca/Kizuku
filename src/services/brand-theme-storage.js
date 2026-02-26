/**
 * Kizuku Brand Theme Storage
 * Manages persistence of brand theme configuration via electron-store.
 */

const fs = require('node:fs');
const { getDefaultTheme } = require('./brand-theme-defaults');

const STORE_KEY = 'kizuku-brand-theme';
let storeInstance = null;

/**
 * Initialize storage with an electron-store instance
 * @param {object} store - electron-store instance
 */
function initThemeStorage(store) {
  storeInstance = store;
}

/**
 * Get the store instance, throwing if not initialized
 * @returns {object} The electron-store instance
 */
function getStore() {
  if (!storeInstance) {
    throw new Error('Theme storage not initialized. Call initThemeStorage first.');
  }
  return storeInstance;
}

/**
 * Load the current theme, merging stored values with defaults
 * @returns {object} Complete theme configuration
 */
function loadTheme() {
  const defaults = getDefaultTheme();
  const stored = getStore().get(STORE_KEY, {});
  return mergeWithDefaults(stored, defaults);
}

/**
 * Deep merge stored theme with defaults for any missing keys
 * @param {object} stored - Stored theme (may be partial)
 * @param {object} defaults - Default theme (complete)
 * @returns {object} Merged theme
 */
function mergeWithDefaults(stored, defaults) {
  const result = { ...defaults };
  for (const key of Object.keys(stored)) {
    const val = stored[key];
    const def = defaults[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && def) {
      result[key] = mergeWithDefaults(val, def);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Save theme configuration to store
 * @param {object} theme - Theme configuration to save
 * @returns {object} The saved theme with updated metadata
 */
function saveTheme(theme) {
  validateTheme(theme);
  const updated = {
    ...theme,
    customized: true,
    lastModified: new Date().toISOString(),
  };
  getStore().set(STORE_KEY, updated);
  return updated;
}

/**
 * Validate that a theme object has required structure
 * @param {object} theme - Theme to validate
 * @throws {Error} If theme is invalid
 */
function validateTheme(theme) {
  if (!theme || typeof theme !== 'object') {
    throw new Error('Theme must be a non-null object');
  }
  if (!theme.colors || typeof theme.colors !== 'object') {
    throw new Error('Theme must include a colors object');
  }
  const requiredColors = ['primary', 'bgDark', 'surface', 'text'];
  for (const key of requiredColors) {
    if (!theme.colors[key]) {
      throw new Error(`Missing required color: ${key}`);
    }
  }
}

/**
 * Reset theme to defaults by removing stored config
 * @returns {object} The default theme
 */
function resetTheme() {
  getStore().delete(STORE_KEY);
  return getDefaultTheme();
}

/**
 * Export current theme to a JSON file
 * @param {string} filePath - Destination file path
 * @returns {Promise<void>}
 */
async function exportThemeToFile(filePath) {
  const theme = loadTheme();
  const json = JSON.stringify(theme, null, 2);
  await fs.promises.writeFile(filePath, json, 'utf8');
}

/**
 * Import theme from a JSON file, validate and save it
 * @param {string} filePath - Source file path
 * @returns {Promise<object>} The imported theme
 */
async function importThemeFromFile(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const theme = JSON.parse(content);
  validateTheme(theme);
  return saveTheme(theme);
}

module.exports = {
  initThemeStorage,
  loadTheme,
  saveTheme,
  validateTheme,
  resetTheme,
  exportThemeToFile,
  importThemeFromFile,
};
