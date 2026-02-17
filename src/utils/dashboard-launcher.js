/**
 * Dashboard Launcher
 * Handles launching and managing the project dashboard window
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const { createLogger } = require('./logger');

const logger = createLogger('DashboardLauncher');

let dashboardWindow = null;

/**
 * Create dashboard window configuration
 */
function createDashboardConfig() {
  return {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
    title: 'Kizu - Project Dashboard',
    show: false,
    backgroundColor: '#0f1923',
  };
}

/**
 * Setup dashboard window events
 */
function setupDashboardEvents(window) {
  window.once('ready-to-show', () => {
    window.show();
    logger.info('Dashboard window shown');
  });

  window.on('closed', () => {
    dashboardWindow = null;
    logger.info('Dashboard window closed');
  });
}

/**
 * Show project dashboard
 * @returns {BrowserWindow} Dashboard window instance
 */
function showProjectDashboard() {
  // If dashboard already open, focus it
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    logger.info('Dashboard window already open, focusing');
    return dashboardWindow;
  }

  // Create new dashboard window
  const config = createDashboardConfig();
  dashboardWindow = new BrowserWindow(config);

  // Setup event handlers
  setupDashboardEvents(dashboardWindow);

  // Load dashboard HTML
  const dashboardPath = path.join(__dirname, '../renderer/project-dashboard.html');
  dashboardWindow.loadFile(dashboardPath);

  logger.info('Dashboard window created', { path: dashboardPath });

  return dashboardWindow;
}

/**
 * Close project dashboard
 */
function closeDashboard() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.close();
    logger.info('Dashboard window closed');
  }
}

/**
 * Check if dashboard is open
 */
function isDashboardOpen() {
  return dashboardWindow && !dashboardWindow.isDestroyed();
}

module.exports = {
  showProjectDashboard,
  closeDashboard,
  isDashboardOpen,
};
