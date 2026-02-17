/**
 * Kizu Brand Theme Applicator
 * Orchestrates theme application across all screen types:
 * CSS palette files, SCSS variables, workspace injection.
 */

const path = require('path');
const fs = require('fs');
const themeStorage = require('./brand-theme-storage');
const cssGenerator = require('./brand-theme-css-generator');

let cssManagerRef = null;
let mainWindowRef = null;

/**
 * Initialize the applicator with dependencies
 * @param {object} cssManager - CSS manager module
 * @param {object} mainWindow - Main BrowserWindow instance
 */
function initApplicator(cssManager, mainWindow) {
  cssManagerRef = cssManager;
  mainWindowRef = mainWindow;
}

/**
 * Update the main window reference
 * @param {object} window - BrowserWindow instance
 */
function setMainWindow(window) {
  mainWindowRef = window;
}

/**
 * Get the styles directory path
 * @returns {string} Absolute path to styles directory
 */
function getStylesDir() {
  return path.join(__dirname, '..', 'styles');
}

/**
 * Write the CSS palette file used by all HTML screens
 * @param {object} theme - Theme configuration
 * @returns {Promise<void>}
 */
async function writePaletteCSS(theme) {
  const css = cssGenerator.generatePaletteCSS(theme);
  const filePath = path.join(getStylesDir(), 'kizu-palette.css');
  await fs.promises.writeFile(filePath, css, 'utf8');
  console.log('Theme: wrote kizu-palette.css');
}

/**
 * Write the SCSS variables file for Sass compilation
 * @param {object} theme - Theme configuration
 * @returns {Promise<void>}
 */
async function writeSCSSVariables(theme) {
  const scss = cssGenerator.generateSCSSVariables(theme);
  const filePath = path.join(getStylesDir(), '_kizu-variables.scss');
  await fs.promises.writeFile(filePath, scss, 'utf8');
  console.log('Theme: wrote _kizu-variables.scss');
}

/**
 * Trigger SCSS recompilation if css-manager is available
 */
function recompileSCSS() {
  if (!cssManagerRef) {
    return;
  }
  const stylesDir = getStylesDir();
  const desktopScss = path.join(stylesDir, 'desktop.scss');
  const desktopCss = path.join(stylesDir, 'desktop.css');
  if (fs.existsSync(desktopScss)) {
    cssManagerRef.compileSCSS(desktopScss, desktopCss);
  }
}

/**
 * Inject updated palette CSS into running workspace windows
 */
function injectIntoWorkspace() {
  if (!cssManagerRef) {
    return;
  }
  const palettePath = path.join(getStylesDir(), 'kizu-palette.css');
  if (fs.existsSync(palettePath)) {
    cssManagerRef.reloadCSS(palettePath);
  }
}

/**
 * Send theme-updated event to all renderer windows
 * @param {object} theme - The updated theme
 */
function notifyRenderers(theme) {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) {
    return;
  }
  mainWindowRef.webContents.send('theme:updated', theme);
}

/**
 * Apply the current theme to all screens
 * Main orchestrator function called after theme changes.
 * @returns {Promise<object>} Result with success status
 */
async function applyTheme() {
  try {
    const theme = themeStorage.loadTheme();
    await writePaletteCSS(theme);
    await writeSCSSVariables(theme);
    recompileSCSS();
    injectIntoWorkspace();
    notifyRenderers(theme);
    return { success: true };
  } catch (error) {
    console.error('Theme apply failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initApplicator,
  setMainWindow,
  applyTheme,
};
