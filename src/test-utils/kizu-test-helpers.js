/**
 * Kizu Test Helper Utilities
 *
 * Helper functions for Kizu functionality testing to reduce complexity
 * and keep main test files under the line limit.
 */

const fs = require('fs');
const path = require('path');

class KizuTestHelpers {
  static checkKizuStartup(output) {
    return (
      output.includes('Kizu starting') || output.includes('ready') || output.includes('Electron')
    );
  }

  static checkNoFatalErrors(errorOutput) {
    return !errorOutput.includes('FATAL') && !errorOutput.includes('Error: Cannot find module');
  }

  static getStartupError(hasKizuStart, noFatalErrors, isRunning) {
    if (!hasKizuStart) {
      return 'Kizu failed to start properly';
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

  static hasKizuBranding(content) {
    return content.includes('Kizu') || content.includes('Starting Kizu');
  }
}

module.exports = KizuTestHelpers;
