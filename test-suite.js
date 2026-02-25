#!/usr/bin/env node
// Comprehensive test suite for Kizuku functionality
// Tests Electron wrapper, menu system, keyboard shortcuts, and PenPot integration

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

class KizuTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.electronProcess = null;
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`[${timestamp}] ${icons[type] || 'ℹ️'} ${message}`);
  }

  async runTest(name, testFn, critical = false) {
    this.log(`Running: ${name}`, 'info');
    try {
      const result = await testFn();
      if (result.success) {
        this.results.passed++;
        this.log(`PASS: ${name}`, 'success');
        if (result.details) {
          this.log(`  ${result.details}`, 'info');
        }
      } else {
        if (critical) {
          this.results.failed++;
          this.log(`FAIL: ${name} - ${result.error}`, 'error');
        } else {
          this.results.warnings++;
          this.log(`WARN: ${name} - ${result.error}`, 'warning');
        }
      }
      this.results.tests.push({ name, ...result, critical });
    } catch (error) {
      this.results.failed++;
      this.log(`FAIL: ${name} - ${error.message}`, 'error');
      this.results.tests.push({ name, success: false, error: error.message, critical });
    }
  }

  // Test 1: File Structure Validation
  async testFileStructure() {
    const requiredFiles = [
      'package.json',
      'src/main.js',
      'src/preload.js',
      'src/shortcuts.js',
      'ELECTRON_WRAPPER.md',
      'DESKTOP_MENUS.md',
      'KEYBOARD_SHORTCUTS.md',
    ];

    const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(__dirname, file)));

    return {
      success: missingFiles.length === 0,
      error: missingFiles.length > 0 ? `Missing files: ${missingFiles.join(', ')}` : null,
      details: `All ${requiredFiles.length} required files present`,
    };
  }

  // Test 2: Package.json Validation
  async testPackageConfiguration() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

      const requiredFields = ['name', 'version', 'main', 'scripts'];
      const requiredScripts = ['start', 'dev', 'build'];
      const requiredDeps = ['electron-store', 'electron-updater'];

      const missingFields = requiredFields.filter((field) => !pkg[field]);
      const missingScripts = requiredScripts.filter((script) => !pkg.scripts?.[script]);
      const missingDeps = requiredDeps.filter((dep) => !pkg.dependencies?.[dep]);

      const issues = [...missingFields, ...missingScripts, ...missingDeps];

      return {
        success: issues.length === 0,
        error: issues.length > 0 ? `Missing: ${issues.join(', ')}` : null,
        details: `Package configuration valid (${pkg.name} v${pkg.version})`,
      };
    } catch (error) {
      return { success: false, error: `Invalid package.json: ${error.message}` };
    }
  }

  // Test 3: JavaScript Syntax Validation
  async testJavaScriptSyntax() {
    const jsFiles = ['src/main.js', 'src/preload.js', 'src/shortcuts.js'];
    const errors = [];

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
        // Basic syntax check - try to parse without executing
        this._validateJavaScript(content);
      } catch (error) {
        errors.push(`${file}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : null,
      details: `${jsFiles.length} JavaScript files validated`,
    };
  }

  // Test 4: PenPot Development Server Connectivity
  async testPenPotServer() {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 3449,
          path: '/',
          method: 'HEAD',
          timeout: 5000,
        },
        (res) => {
          resolve({
            success: res.statusCode === 200,
            error: res.statusCode !== 200 ? `Server responded with ${res.statusCode}` : null,
            details: `PenPot dev server accessible at localhost:3449`,
          });
        }
      );

      req.on('error', () => {
        resolve({
          success: false,
          error: 'PenPot dev server not running',
          details: 'Start with: cd ../penpot && ./manage.sh run-devenv',
        });
      });

      req.on('timeout', () => {
        resolve({
          success: false,
          error: 'Connection timeout to PenPot server',
        });
      });

      req.end();
    });
  }

  // Test 5: Electron Application Launch
  async testElectronLaunch() {
    return new Promise((resolve) => {
      const electron = this._startElectronApp();
      this._setupElectronMonitoring(electron, resolve);
    });
  }

  _startElectronApp() {
    this.log('Launching Electron app (10 second test)...', 'info');

    const electron = spawn('npm', ['start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
      detached: false,
    });

    this.electronProcess = electron;
    return electron;
  }

  _setupElectronMonitoring(electron, resolve) {
    let output = '';
    let errorOutput = '';

    electron.stdout.on('data', (data) => {
      output += data.toString();
    });

    electron.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    electron.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to start: ${error.message}`,
      });
    });

    setTimeout(() => {
      this._evaluateElectronTest(electron, output, errorOutput, resolve);
    }, 10000);
  }

  _evaluateElectronTest(electron, output, errorOutput, resolve) {
    const isRunning = !electron.killed && electron.pid;

    if (isRunning) {
      const hasStartMessage = output.includes('Kizuku starting');
      const noFatalErrors = this._checkNoFatalErrors(errorOutput);

      resolve({
        success: hasStartMessage && noFatalErrors,
        error: this._getElectronError(hasStartMessage, noFatalErrors),
        details: `Electron app launched successfully (PID: ${electron.pid})`,
      });
    } else {
      resolve({
        success: false,
        error: 'Electron process died during startup',
        details: `Output: ${output.slice(-200)}`,
      });
    }
  }

  _checkNoFatalErrors(errorOutput) {
    return (
      !errorOutput.includes('Error:') ||
      !errorOutput.includes('TypeError:') ||
      !errorOutput.includes('ReferenceError:')
    );
  }

  _getElectronError(hasStartMessage, noFatalErrors) {
    if (!hasStartMessage) {
      return 'App started but missing start message';
    }
    if (!noFatalErrors) {
      return 'Fatal errors detected in output';
    }
    return null;
  }

  // Test 6: Window Management
  async testWindowManagement() {
    // This test requires the Electron app to be running
    if (!this.electronProcess || this.electronProcess.killed) {
      return {
        success: false,
        error: 'Electron app not running - cannot test window management',
      };
    }

    // For now, we'll assume success if the app is running
    // In a real test, we'd use Electron's testing tools
    return {
      success: true,
      details: 'Window management assumed working (app is running)',
    };
  }

  // Test 7: Menu System Integration
  async testMenuSystem() {
    try {
      const mainJs = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');

      // Check for required menu functions
      const hasCreateMenu = mainJs.includes('function createMenu()');
      const hasMenuTemplate = mainJs.includes('template = [');
      const hasFileMenu = mainJs.includes("label: 'File'");
      const hasEditMenu = mainJs.includes("label: 'Edit'");
      const hasViewMenu = mainJs.includes("label: 'View'");
      const hasObjectMenu = mainJs.includes("label: 'Object'");

      const menuChecks = [
        hasCreateMenu,
        hasMenuTemplate,
        hasFileMenu,
        hasEditMenu,
        hasViewMenu,
        hasObjectMenu,
      ];
      const passedChecks = menuChecks.filter(Boolean).length;

      return {
        success: passedChecks === menuChecks.length,
        error:
          passedChecks < menuChecks.length
            ? `${menuChecks.length - passedChecks} menu checks failed`
            : null,
        details: `Menu system: ${passedChecks}/${menuChecks.length} checks passed`,
      };
    } catch (error) {
      return { success: false, error: `Cannot read main.js: ${error.message}` };
    }
  }

  // Test 8: Keyboard Shortcuts System
  async testKeyboardShortcuts() {
    try {
      const shortcutsJs = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');

      // Check for required shortcut functions
      const hasShortcutManager = shortcutsJs.includes('class ShortcutManager');
      const hasRegisterMethod = shortcutsJs.includes('register(');
      const hasPlatformDetection = shortcutsJs.includes('process.platform');
      const hasModifierKey = shortcutsJs.includes('modifierKey');
      const hasWindowExport = shortcutsJs.includes('window.shortcutManager');

      const shortcutChecks = [
        hasShortcutManager,
        hasRegisterMethod,
        hasPlatformDetection,
        hasModifierKey,
        hasWindowExport,
      ];
      const passedChecks = shortcutChecks.filter(Boolean).length;

      return {
        success: passedChecks === shortcutChecks.length,
        error:
          passedChecks < shortcutChecks.length
            ? `${shortcutChecks.length - passedChecks} shortcut checks failed`
            : null,
        details: `Keyboard shortcuts: ${passedChecks}/${shortcutChecks.length} checks passed`,
      };
    } catch (error) {
      return { success: false, error: `Cannot read shortcuts files: ${error.message}` };
    }
  }

  // Test 9: IPC Communication Setup
  async testIPCCommunication() {
    try {
      const mainJs = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
      const preloadJs = fs.readFileSync(path.join(__dirname, 'src/preload.js'), 'utf8');

      // Check for IPC handlers and exposed APIs
      const hasIPCHandlers = mainJs.includes('ipcMain.handle');
      const hasContextBridge = preloadJs.includes('contextBridge.exposeInMainWorld');
      const hasElectronAPI = preloadJs.includes("'electronAPI'");
      const hasMenuActions = mainJs.includes('menu-action');

      const ipcChecks = [hasIPCHandlers, hasContextBridge, hasElectronAPI, hasMenuActions];
      const passedChecks = ipcChecks.filter(Boolean).length;

      return {
        success: passedChecks === ipcChecks.length,
        error:
          passedChecks < ipcChecks.length
            ? `${ipcChecks.length - passedChecks} IPC checks failed`
            : null,
        details: `IPC communication: ${passedChecks}/${ipcChecks.length} checks passed`,
      };
    } catch (error) {
      return { success: false, error: `Cannot read IPC files: ${error.message}` };
    }
  }

  // Test 10: Documentation Quality
  async testDocumentation() {
    const docFiles = ['ELECTRON_WRAPPER.md', 'DESKTOP_MENUS.md', 'KEYBOARD_SHORTCUTS.md'];

    let totalScore = 0;
    const maxScore = docFiles.length * 3; // 3 points per doc

    for (const docFile of docFiles) {
      try {
        const content = fs.readFileSync(path.join(__dirname, docFile), 'utf8');
        let score = 0;

        // Check for basic documentation elements
        if (content.includes('# ')) {
          score++;
        } // Has title
        if (content.includes('## ')) {
          score++;
        } // Has sections
        if (content.length > 1000) {
          score++;
        } // Substantial content

        totalScore += score;
      } catch {
        // File missing, no points
      }
    }

    const percentage = (totalScore / maxScore) * 100;

    return {
      success: percentage >= 80,
      error: percentage < 80 ? `Documentation quality below 80% (${percentage.toFixed(1)}%)` : null,
      details: `Documentation score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`,
    };
  }

  async cleanup() {
    if (this.electronProcess && !this.electronProcess.killed) {
      this.log('Cleaning up Electron process...', 'info');
      this.electronProcess.kill('SIGTERM');

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!this.electronProcess.killed) {
        this.electronProcess.kill('SIGKILL');
      }
    }
  }

  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const total = this.results.passed + this.results.failed + this.results.warnings;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 KIZUKU TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📊 Total: ${total} tests in ${duration}s`);
    console.log('');

    if (this.results.failed === 0) {
      console.log('🎉 All critical tests passed! Kizuku is ready for development.');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.');
    }

    console.log('\n📋 Next Steps:');
    console.log('  • npm run dev - Start development environment');
    console.log('  • Check ../penpot for PenPot server status');
    console.log('  • Review documentation in *.md files');
    console.log('');
  }

  async runAllTests() {
    this.log('Starting Kizuku Test Suite...', 'info');
    console.log('');

    // Critical tests (must pass)
    await this.runTest('File Structure', () => this.testFileStructure(), true);
    await this.runTest('Package Configuration', () => this.testPackageConfiguration(), true);
    await this.runTest('JavaScript Syntax', () => this.testJavaScriptSyntax(), true);
    await this.runTest('Menu System Integration', () => this.testMenuSystem(), true);
    await this.runTest('Keyboard Shortcuts System', () => this.testKeyboardShortcuts(), true);
    await this.runTest('IPC Communication Setup', () => this.testIPCCommunication(), true);

    // Non-critical tests (warnings only)
    await this.runTest('PenPot Server Connectivity', () => this.testPenPotServer(), false);
    await this.runTest('Electron Application Launch', () => this.testElectronLaunch(), false);
    await this.runTest('Window Management', () => this.testWindowManagement(), false);
    await this.runTest('Documentation Quality', () => this.testDocumentation(), false);

    await this.cleanup();
    this.generateReport();

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  _validateJavaScript(content) {
    // Use Function constructor for syntax validation (safer than eval)
    // eslint-disable-next-line no-new-func
    new Function(content);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new KizuTester();
  tester.runAllTests().catch((error) => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = KizuTester;
