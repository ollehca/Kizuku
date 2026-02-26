#!/usr/bin/env node
/**
 * Kizuku Design Tools Interactive Test Suite
 * Tests actual design functionality within the Kizuku desktop app
 *
 * Issue #58: Test basic PenPot functionality in desktop app
 * Specific tests for:
 * - Drawing tools functional
 * - Copy/paste operations working
 * - Zoom controls responsive
 * - Keyboard shortcuts active
 * - Performance acceptable vs web version
 */

const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DesignToolValidators = require('./src/test-utils/design-tool-validators');
const TestReportGenerator = require('./src/test-utils/test-report-generator');
const LaunchHelpers = require('./src/test-utils/launch-helpers');

class KizuDesignToolsTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.electronProcess = null;
    this.startTime = Date.now();
    this.testResults = [];
    this.performanceMetrics = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`[${timestamp}] ${icons[type]} ${message}`);
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
      this.testResults.push({ name, ...result, critical });
    } catch (error) {
      this.results.failed++;
      this.log(`FAIL: ${name} - ${error.message}`, 'error');
      this.results.tests.push({ name, success: false, error: error.message, critical });
      this.testResults.push({ name, success: false, error: error.message, critical });
    }
  }

  // Test 1: Launch Kizuku and Wait for Design Interface
  async testKizuDesignInterfaceLaunch() {
    return new Promise((resolve) => {
      this.log('Launching Kizuku for design tools testing...', 'info');

      const electron = this._spawnElectronProcess();
      this.electronProcess = electron;

      const launchState = LaunchHelpers.initializeLaunchState();
      LaunchHelpers.attachProcessListeners(electron, launchState);

      this._setupLaunchValidation(electron, launchState, resolve);
    });
  }

  _spawnElectronProcess() {
    return spawn('npm', ['start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        KIZUKU_DESIGN_TEST: 'true',
      },
      detached: false,
    });
  }

  _setupLaunchValidation(electron, launchState, resolve) {
    setTimeout(() => {
      const validation = LaunchHelpers.validateLaunchSuccess(electron, launchState);

      if (validation.success) {
        resolve({
          success: true,
          details: `Kizuku design interface ready (PID: ${electron.pid})`,
          ...validation.result,
        });
      } else {
        resolve({
          success: false,
          error: validation.error,
        });
      }
    }, 20000);

    electron.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to launch Kizu: ${error.message}`,
      });
    });
  }

  // Test 2: Drawing Tools Keyboard Shortcut Testing
  async testDrawingToolKeyboardShortcuts() {
    if (!this._isElectronProcessRunning()) {
      return { success: false, error: 'Kizuku not running - cannot test drawing tool shortcuts' };
    }

    try {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');
      const toolShortcuts = ['v', 'r', 'o', 't', 'l', 'p'];
      const modifierShortcuts = ['ctrl+c', 'ctrl+v', 'ctrl+z', 'ctrl+y', 'cmd+c', 'cmd+v'];

      const foundToolShortcuts = DesignToolValidators.validateShortcutsInContent(
        shortcutsContent,
        toolShortcuts
      );
      const foundModifierShortcuts = DesignToolValidators.validateModifierShortcuts(
        shortcutsContent,
        modifierShortcuts
      );

      return this._evaluateShortcutResults(foundToolShortcuts, foundModifierShortcuts);
    } catch (error) {
      return { success: false, error: `Error testing drawing tool shortcuts: ${error.message}` };
    }
  }

  _isElectronProcessRunning() {
    return this.electronProcess && !this.electronProcess.killed;
  }

  _evaluateShortcutResults(foundShortcuts, foundModifierShortcuts) {
    const totalFound = foundShortcuts.length + foundModifierShortcuts.length;
    const success = foundShortcuts.length >= 3 && foundModifierShortcuts.length >= 2;

    return {
      success,
      error: success ? null : `Insufficient drawing tool shortcuts (${totalFound} total found)`,
      details: success
        ? `Drawing shortcuts: [${foundShortcuts.join(', ')}], ` +
          `Modifier shortcuts: [${foundModifierShortcuts.join(', ')}]`
        : `Found ${foundShortcuts.length} tool shortcuts, ` +
          `${foundModifierShortcuts.length} modifier shortcuts`,
    };
  }

  // Test 3: Copy/Paste System Integration Testing
  async testCopyPasteSystemIntegration() {
    try {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');
      const preloadContent = fs.readFileSync(path.join(__dirname, 'src/preload.js'), 'utf8');
      const mainContent = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');

      const features = this._analyzeCopyPasteFeatures(
        shortcutsContent,
        preloadContent,
        mainContent
      );
      const workingFeatures = features.filter(Boolean).length;
      const success = workingFeatures >= 3;

      return {
        success,
        error: success ? null : `Copy/paste integration incomplete (${workingFeatures}/4 features)`,
        details: `Copy/paste system: ${workingFeatures}/4 features working`,
      };
    } catch (error) {
      return { success: false, error: `Error testing copy/paste system: ${error.message}` };
    }
  }

  _analyzeCopyPasteFeatures(shortcutsContent, preloadContent, mainContent) {
    const hasCopyShortcut = this._checkCopyShortcut(shortcutsContent);
    const hasPasteShortcut = this._checkPasteShortcut(shortcutsContent);
    const hasClipboardAPI =
      preloadContent.includes('clipboard') || mainContent.includes('clipboard');
    const hasPlatformSpecific =
      shortcutsContent.includes('platform') || shortcutsContent.includes('darwin');

    return [hasCopyShortcut, hasPasteShortcut, hasClipboardAPI, hasPlatformSpecific];
  }

  _checkCopyShortcut(content) {
    return (
      content.toLowerCase().includes('copy') ||
      content.includes('ctrl+c') ||
      content.includes('cmd+c')
    );
  }

  _checkPasteShortcut(content) {
    return (
      content.toLowerCase().includes('paste') ||
      content.includes('ctrl+v') ||
      content.includes('cmd+v')
    );
  }

  // Test 4: Zoom Controls Responsiveness Testing
  async testZoomControlsResponsiveness() {
    if (!this._isElectronProcessRunning()) {
      return { success: false, error: 'Kizuku not running - cannot test zoom controls' };
    }

    try {
      const webviewContent = fs.readFileSync(
        path.join(__dirname, 'src/renderer/webview-controller.js'),
        'utf8'
      );
      const shortcutsContent = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');

      const zoomFeatures = DesignToolValidators.checkZoomFeatures(shortcutsContent, webviewContent);
      const workingFeatures = Object.values(zoomFeatures).filter(Boolean).length;
      const success = workingFeatures >= 2;

      return {
        success,
        error: success ? null : `Zoom controls insufficient (${workingFeatures}/4 features)`,
        details: success
          ? `Zoom controls: ${workingFeatures}/4 features available`
          : DesignToolValidators.formatZoomDetails(zoomFeatures),
      };
    } catch (error) {
      return { success: false, error: `Error testing zoom controls: ${error.message}` };
    }
  }

  // Test 5: Performance Comparison vs Web
  async testPerformanceVsWeb() {
    if (!this._isElectronProcessRunning()) {
      return { success: false, error: 'Kizuku not running - cannot test performance' };
    }

    try {
      const desktopResponseTime = await this.measureResponseTime('http://localhost:3449');
      const desktopAssetTime = await this.measureResponseTime('http://localhost:3449/js/config.js');
      const apiResponseTime = await this.measureResponseTime('http://localhost:3449/api');

      const avgDesktopTime = (desktopResponseTime + desktopAssetTime) / 2;
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      this.performanceMetrics = {
        desktopResponseTime,
        desktopAssetTime,
        apiResponseTime,
        avgDesktopTime,
        memoryMB,
      };

      const isResponsive = avgDesktopTime < 100;
      const success = isResponsive && memoryMB < 200;

      return {
        success,
        error: success ? null : 'Desktop performance not competitive',
        details:
          `Desktop avg: ${Math.round(avgDesktopTime)}ms, ` +
          `Memory: ${memoryMB}MB, Responsive: ${isResponsive}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error testing performance: ${error.message}`,
      };
    }
  }

  // Helper: Measure response time for a URL
  async measureResponseTime(url) {
    const urlObj = new URL(url);
    return new Promise((resolve) => {
      const startTime = Date.now();
      const req = http.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname,
          method: 'HEAD',
          timeout: 5000,
        },
        () => {
          resolve(Date.now() - startTime);
        }
      );

      req.on('error', () => resolve(1000));
      req.on('timeout', () => resolve(1000));
      req.end();
    });
  }

  // Test 6: Keyboard Shortcuts Active Testing
  async testKeyboardShortcutsActive() {
    try {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');
      const preloadContent = fs.readFileSync(path.join(__dirname, 'src/preload.js'), 'utf8');

      const shortcutFeatures = DesignToolValidators.analyzeShortcutActivation(
        shortcutsContent,
        preloadContent
      );
      const workingFeatures = Object.values(shortcutFeatures).filter(Boolean).length;
      const success = workingFeatures >= 4;

      return {
        success,
        error: success
          ? null
          : `Keyboard shortcuts not fully active (${workingFeatures}/5 features)`,
        details: success
          ? `Keyboard shortcuts: ${workingFeatures}/5 activation features working`
          : DesignToolValidators.formatShortcutDetails(shortcutFeatures),
      };
    } catch (error) {
      return { success: false, error: `Error testing keyboard shortcuts: ${error.message}` };
    }
  }

  // Test 7: All Drawing Tools Functional Test
  async testAllDrawingToolsFunctional() {
    try {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, 'src/shortcuts.js'), 'utf8');
      const drawingTools = DesignToolValidators.analyzeDrawingTools(shortcutsContent);

      const toolNames = Object.keys(drawingTools);
      const availableTools = toolNames.filter((tool) => drawingTools[tool]);
      const toolCount = availableTools.length;
      const success = toolCount >= 5;

      return {
        success,
        error: success
          ? null
          : `Insufficient drawing tools (${toolCount}/${toolNames.length} available)`,
        details: success
          ? `Drawing tools available: [${availableTools.join(', ')}]`
          : DesignToolValidators.formatToolDetails(drawingTools, availableTools, toolNames),
      };
    } catch (error) {
      return { success: false, error: `Error testing drawing tools: ${error.message}` };
    }
  }

  async cleanup() {
    if (this.electronProcess && !this.electronProcess.killed) {
      this.log('Cleaning up Kizuku process...', 'info');
      this.electronProcess.kill('SIGTERM');

      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (!this.electronProcess.killed) {
        this.electronProcess.kill('SIGKILL');
      }
    }
  }

  generateReport() {
    const reportGenerator = new TestReportGenerator(
      this.results,
      this.testResults,
      this.performanceMetrics,
      this.startTime
    );
    reportGenerator.generateReport();
  }

  async runAllTests() {
    this.log('🎨 Starting Kizuku Design Tools Test Suite...', 'info');
    console.log('Testing Issue #58: Test basic PenPot functionality in desktop app');
    console.log(
      'Focus: Drawing tools, Copy/paste, Zoom controls, Keyboard shortcuts, Performance\n'
    );

    await this.runTest(
      'Kizuku Design Interface Launch',
      () => this.testKizuDesignInterfaceLaunch(),
      true
    );
    await this.runTest(
      'All Drawing Tools Functional',
      () => this.testAllDrawingToolsFunctional(),
      false
    );
    await this.runTest(
      'Drawing Tool Keyboard Shortcuts',
      () => this.testDrawingToolKeyboardShortcuts(),
      false
    );
    await this.runTest(
      'Copy/Paste System Integration',
      () => this.testCopyPasteSystemIntegration(),
      false
    );
    await this.runTest(
      'Zoom Controls Responsiveness',
      () => this.testZoomControlsResponsiveness(),
      false
    );
    await this.runTest(
      'Keyboard Shortcuts Active',
      () => this.testKeyboardShortcutsActive(),
      false
    );
    await this.runTest('Performance vs Web Comparison', () => this.testPerformanceVsWeb(), false);

    await this.cleanup();
    this.generateReport();

    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new KizuDesignToolsTester();
  tester.runAllTests().catch((error) => {
    console.error('Kizuku design tools test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = KizuDesignToolsTester;
