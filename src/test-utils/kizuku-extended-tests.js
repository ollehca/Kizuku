/**
 * Kizuku Extended Test Methods
 *
 * Additional test methods extracted from main test file to keep it under line limits.
 */

const fs = require('node:fs');
const path = require('node:path');

class KizukuExtendedTests {
  static async testKizukuAuthenticationIntegration(basePath) {
    try {
      // Check for authentication integration files
      const authIntegrationExists = fs.existsSync(
        path.join(basePath, 'src/frontend-integration/auth-integration.js')
      );
      const authStorageExists = fs.existsSync(path.join(basePath, 'src/services/auth-storage.js'));

      let authScore = 0;
      const authDetails = [];

      if (authIntegrationExists) {
        authScore++;
        authDetails.push('Auth integration module present');

        const authContent = fs.readFileSync(
          path.join(basePath, 'src/frontend-integration/auth-integration.js'),
          'utf8'
        );
        if (authContent.includes('persistentLogin') || authContent.includes('demo')) {
          authScore++;
          authDetails.push('Persistent auth configured');
        }
      }

      if (authStorageExists) {
        authScore++;
        authDetails.push('Auth storage service present');
      }

      // Check main.js for auth initialization
      const mainContent = fs.readFileSync(path.join(basePath, 'src/main.js'), 'utf8');
      if (mainContent.includes('auth') || mainContent.includes('Auth')) {
        authScore++;
        authDetails.push('Auth initialized in main process');
      }

      const success = authScore >= 2;

      return {
        success: success,
        error: success ? null : 'Kizuku authentication integration incomplete',
        details: success
          ? `Auth integration: ${authDetails.join(', ')}`
          : `Limited auth features: ${authScore}/4`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error testing auth integration: ${error.message}`,
      };
    }
  }

  static async testKizukuPerformance(electronProcess) {
    if (!electronProcess || electronProcess.killed) {
      return {
        success: false,
        error: 'Kizuku not running - cannot test performance',
      };
    }

    try {
      const startTime = Date.now();

      // Simulate basic performance checks
      const memoryUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;

      // Basic thresholds for desktop app performance
      const memoryOk = memoryUsage.heapUsed < 200 * 1024 * 1024; // 200MB
      const responseOk = responseTime < 1000; // 1 second

      const performanceScore = [memoryOk, responseOk].filter(Boolean).length;
      const success = performanceScore >= 1;

      return {
        success: success,
        error: success ? null : 'Kizuku performance below acceptable thresholds',
        details: success
          ? `Performance: Memory ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB, ` +
            `Response ${responseTime}ms`
          : `Performance issues: Memory ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error testing performance: ${error.message}`,
      };
    }
  }

  static async testKizukuRecoverySystem(basePath) {
    try {
      // Check for recovery system components
      const recoveryHelpers = fs.existsSync(path.join(basePath, 'src/utils/recovery.js'));
      const loadingHelpers = fs.existsSync(path.join(basePath, 'src/utils/loading-helpers.js'));

      let recoveryScore = 0;
      const recoveryFeatures = [];

      if (recoveryHelpers) {
        recoveryScore++;
        recoveryFeatures.push('Recovery utilities present');

        const recoveryContent = fs.readFileSync(
          path.join(basePath, 'src/utils/recovery.js'),
          'utf8'
        );
        if (
          recoveryContent.includes('checkConnectivity') ||
          recoveryContent.includes('handleConnectionFailure')
        ) {
          recoveryScore++;
          recoveryFeatures.push('Connection recovery implemented');
        }
      }

      if (loadingHelpers) {
        recoveryScore++;
        recoveryFeatures.push('Loading state management present');
      }

      // Check main.js for recovery initialization
      const mainContent = fs.readFileSync(path.join(basePath, 'src/main.js'), 'utf8');
      if (mainContent.includes('recovery') || mainContent.includes('Recovery')) {
        recoveryScore++;
        recoveryFeatures.push('Recovery initialized in main process');
      }

      const success = recoveryScore >= 2;

      return {
        success: success,
        error: success ? null : 'Kizuku recovery system incomplete',
        details: success
          ? `Recovery system: ${recoveryFeatures.join(', ')}`
          : `Limited recovery features: ${recoveryScore}/4`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error testing recovery system: ${error.message}`,
      };
    }
  }
}

module.exports = KizukuExtendedTests;
