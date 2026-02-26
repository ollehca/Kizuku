const { dialog, Menu, MenuItem } = require('electron');
const recovery = require('./recovery');

/**
 * Handle health check recovery attempt
 */
async function handleHealthCheckRecovery(mainWindow, recovered) {
  await dialog.showMessageBox(mainWindow, {
    type: recovered ? 'info' : 'error',
    title: 'Recovery Results',
    message: recovered ? 'Recovery successful!' : 'Recovery failed',
    detail: recovered
      ? 'Issues have been resolved automatically.'
      : 'Manual intervention may be required. Check the console logs.',
  });
}

/**
 * Handle health check dialog result
 */
async function handleHealthCheckResult(mainWindow, result, healthCheck) {
  if (result.response === 1 && !healthCheck.healthy) {
    const recovered = await recovery.attemptRecovery();
    await handleHealthCheckRecovery(mainWindow, recovered);
  }
}

/**
 * Show health check results dialog
 */
async function showHealthCheckDialog(mainWindow, healthCheck) {
  return await dialog.showMessageBox(mainWindow, {
    type: healthCheck.healthy ? 'info' : 'warning',
    title: 'Health Check Results',
    message: healthCheck.healthy
      ? 'All systems are healthy!'
      : `Issues found: ${healthCheck.issues.join(', ')}`,
    detail: healthCheck.healthy
      ? 'Kizuku development environment is working correctly.'
      : 'Consider running automatic recovery or check the logs.',
    buttons: healthCheck.healthy ? ['OK'] : ['OK', 'Run Recovery'],
  });
}

/**
 * Handle health check click
 */
async function handleHealthCheckClick(mainWindow) {
  console.log('🏥 Running manual health check...');
  const healthCheck = await recovery.runHealthCheck();
  const result = await showHealthCheckDialog(mainWindow, healthCheck);
  await handleHealthCheckResult(mainWindow, result, healthCheck);
}

/**
 * Create health check menu item
 */
function createHealthCheckMenuItem(mainWindow) {
  return new MenuItem({
    label: 'Run Health Check',
    click: () => handleHealthCheckClick(mainWindow),
  });
}

/**
 * Handle emergency recovery confirmation
 */
async function handleEmergencyRecoveryConfirmation(mainWindow, result) {
  if (result.response === 1) {
    console.log('🚨 Starting emergency recovery...');
    const recovered = await recovery.emergencyRecovery();

    await dialog.showMessageBox(mainWindow, {
      type: recovered ? 'info' : 'error',
      title: 'Emergency Recovery',
      message: recovered ? 'Emergency recovery completed!' : 'Emergency recovery failed',
      detail: recovered
        ? 'The development environment has been restarted.'
        : 'Please check the logs and try manual recovery.',
    });
  }
}

/**
 * Create emergency recovery menu item
 */
function createEmergencyRecoveryMenuItem(mainWindow) {
  return new MenuItem({
    label: 'Emergency Recovery',
    click: async () => {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Emergency Recovery',
        message: 'This will restart the entire development environment.',
        detail: 'This may take several minutes and will interrupt any ongoing work.',
        buttons: ['Cancel', 'Proceed'],
        defaultId: 0,
      });

      await handleEmergencyRecoveryConfirmation(mainWindow, result);
    },
  });
}

/**
 * Create recovery status detail text
 */
function createRecoveryStatusDetail(status) {
  const lastRecovery = status.lastRecoveryTime
    ? new Date(status.lastRecoveryTime).toLocaleString()
    : 'Never';

  return `
Recovery Attempts: ${status.attempts}/${status.maxAttempts}
Last Recovery: ${lastRecovery}
Can Recover: ${status.canRecover ? 'Yes' : 'No'}
Cooldown Remaining: ${Math.ceil(status.cooldownRemaining / 1000)}s

Health monitoring is active and checking every 2 minutes.
  `.trim();
}

/**
 * Create recovery status menu item
 */
function createRecoveryStatusMenuItem(mainWindow) {
  return new MenuItem({
    label: 'Recovery Status',
    click: () => {
      const status = recovery.getRecoveryStatus();

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Recovery System Status',
        message: 'Automatic Recovery System',
        detail: createRecoveryStatusDetail(status),
      });
    },
  });
}

/**
 * Add recovery menu items to help menu
 */
function addRecoveryMenuItemsToMenu(helpMenu, mainWindow) {
  helpMenu.submenu.append(new MenuItem({ type: 'separator' }));
  helpMenu.submenu.append(createHealthCheckMenuItem(mainWindow));
  helpMenu.submenu.append(createEmergencyRecoveryMenuItem(mainWindow));
  helpMenu.submenu.append(createRecoveryStatusMenuItem(mainWindow));
}

/**
 * Add recovery options to the application menu
 */
function addRecoveryMenuItems(mainWindow) {
  const currentMenu = Menu.getApplicationMenu();

  if (currentMenu) {
    const helpMenu = currentMenu.items.find(
      (item) =>
        item.label && (item.label.toLowerCase().includes('help') || item.label.includes('?'))
    );

    if (helpMenu?.submenu) {
      addRecoveryMenuItemsToMenu(helpMenu, mainWindow);
      Menu.setApplicationMenu(currentMenu);
    }
  }
}

module.exports = { addRecoveryMenuItems };
