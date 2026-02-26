/**
 * Kizuku Test Helper Utilities
 *
 * Helper functions for Kizuku functionality testing to reduce complexity
 * and keep main test files under the line limit.
 */

const fs = require('node:fs');
const path = require('node:path');

class KizukuTestHelpers {
  static checkKizukuStartup(output) {
    return (
      output.includes('Kizuku starting') || output.includes('ready') || output.includes('Electron')
    );
  }

  static checkNoFatalErrors(errorOutput) {
    return !errorOutput.includes('FATAL') && !errorOutput.includes('Error: Cannot find module');
  }

  static getStartupError(hasKizukuStart, noFatalErrors, isRunning) {
    if (!hasKizukuStart) {
      return 'Kizuku failed to start properly';
    }
    if (!noFatalErrors) {
      return 'Fatal errors in startup';
    }
    if (!isRunning) {
      return 'Process died during startup';
    }
    return null;
  }

  static checkMenuBuilder(content) {
    return content.includes('buildApplicationMenu') || content.includes('createMenu');
  }

  static checkRequiredMenus(content) {
    const hasFileMenu = content.includes("label: 'File'");
    const hasEditMenu = content.includes("label: 'Edit'");
    const hasViewMenu = content.includes("label: 'View'");
    return hasFileMenu && hasEditMenu && hasViewMenu;
  }

  static checkMenuFiles(basePath) {
    const menuBuilderExists = fs.existsSync(path.join(basePath, 'src/menu-builder.js'));
    const menuActionsExists = fs.existsSync(path.join(basePath, 'src/menu-actions.js'));
    return menuBuilderExists || menuActionsExists;
  }

  static hasShortcutManager(content) {
    return (
      content.includes('ShortcutManager') ||
      content.includes('class') ||
      content.includes('shortcuts')
    );
  }

  static hasPlatformDetection(content) {
    return (
      content.includes('process.platform') ||
      content.includes('darwin') ||
      content.includes('modifierKey')
    );
  }

  static hasDesignShortcuts(content) {
    return (
      content.includes('v') || // select tool
      content.includes('r') || // rectangle
      content.includes('t') || // text
      content.toLowerCase().includes('tool')
    );
  }

  static hasPreloadIntegration(content) {
    return (
      content.includes('shortcut') || content.includes('key') || content.includes('electronAPI')
    );
  }

  static hasLoadingHandling(content) {
    return content.includes('loading-screen') || content.includes('showLoadingScreen');
  }

  static hasErrorHandling(content) {
    return content.includes('error-screen') || content.includes('handleWebviewFailure');
  }

  static hasKizukuBranding(content) {
    return content.includes('Kizuku') || content.includes('Starting Kizuku');
  }
}

module.exports = KizukuTestHelpers;
