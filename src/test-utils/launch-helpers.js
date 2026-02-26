/**
 * Launch Helper Utilities
 *
 * Extracted helper functions for launching and validating Electron process
 * to reduce complexity and file size of main test files.
 */

class LaunchHelpers {
  /**
   * Initialize launch state for tracking startup
   */
  static initializeLaunchState() {
    return {
      startupOutput: '',
      foundSuccessIndicators: {
        developmentMode: false,
        serverRunning: false,
        urlLoaded: false,
        cssInjected: false,
      },
    };
  }

  /**
   * Process output data and update indicators
   */
  static processOutputData(data, launchState) {
    const output = data.toString();
    launchState.startupOutput += output;
    this.updateSuccessIndicators(output, launchState.foundSuccessIndicators);
  }

  /**
   * Update success indicators based on output
   */
  static updateSuccessIndicators(output, indicators) {
    if (output.includes('Development mode: true')) {
      indicators.developmentMode = true;
    }
    if (output.includes('Server running: true')) {
      indicators.serverRunning = true;
    }
    if (output.includes('URL loaded successfully')) {
      indicators.urlLoaded = true;
    }
    if (output.includes('CSS injected successfully')) {
      indicators.cssInjected = true;
    }
  }

  /**
   * Validate launch success
   */
  static validateLaunchSuccess(electronProcess, launchState) {
    const { foundSuccessIndicators, startupOutput } = launchState;
    const successCount = Object.values(foundSuccessIndicators).filter(Boolean).length;
    const hasValidProcess = electronProcess?.pid;

    if (hasValidProcess && successCount >= 3) {
      return {
        success: true,
        result: {
          pid: electronProcess.pid,
          status: 'launched_and_validated',
          success_indicators: foundSuccessIndicators,
          startup_output: startupOutput.slice(-500),
          validation_score: `${successCount}/4`,
        },
      };
    } else {
      return {
        success: false,
        error: `App launch validation failed. Found ${successCount}/4 success indicators.`,
      };
    }
  }

  /**
   * Attach process listeners for launch monitoring
   */
  static attachProcessListeners(electronProcess, launchState) {
    electronProcess.stdout.on('data', (data) => {
      this.processOutputData(data, launchState);
    });

    electronProcess.stderr.on('data', (data) => {
      this.processOutputData(data, launchState);
    });
  }
}

module.exports = LaunchHelpers;
