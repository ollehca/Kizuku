const { exec } = require('child_process');
const path = require('path');

// Use native fetch if available, otherwise use a simple HTTP implementation
let fetch;
try {
  // Try to use global fetch (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback to require if global fetch is not available
    fetch = require('node-fetch');
  }
} catch {
  // If node-fetch is not available, create a simple fetch implementation
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');

  fetch = function (url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;

      const req = requestModule.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {},
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: () => Promise.resolve(data),
              json: () => Promise.resolve(JSON.parse(data)),
            });
          });
        }
      );

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  };
}

// Recovery and health monitoring utilities for Kizu

const PENPOT_CONFIG = {
  frontend: {
    dev: 'http://localhost:3449',
  },
  backend: {
    dev: 'http://localhost:6060',
  },
};

// Recovery attempt tracking
let recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 3;
let lastRecoveryTime = 0;
const RECOVERY_COOLDOWN = 30000; // 30 seconds

/**
 * Check if a service is responding
 */
async function checkService(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // For backend, 404 is OK (means server is responding)
    return response.ok || response.status === 404;
  } catch (error) {
    console.warn(`Service check failed for ${url}:`, error.message);
    return false;
  }
}

/**
 * Check if essential frontend assets are available
 */
async function checkFrontendAssets() {
  const essentialAssets = [
    `${PENPOT_CONFIG.frontend.dev}/js/config.js`,
    `${PENPOT_CONFIG.frontend.dev}/css/debug.css`,
    `${PENPOT_CONFIG.frontend.dev}/css/main.css`,
  ];

  const results = {};

  for (const assetUrl of essentialAssets) {
    const assetName = assetUrl.split('/').pop();
    results[assetName] = await checkService(assetUrl, 3000);
  }

  return results;
}

/**
 * Create missing config.js file
 */
function createConfigJS() {
  return new Promise((resolve) => {
    exec(
      'docker exec penpot-devenv-main bash -c "mkdir -p /home/penpot/penpot/frontend/resources/public/js && echo \'// Config placeholder for development\' > /home/penpot/penpot/frontend/resources/public/js/config.js"',
      (error) => {
        if (error) {
          console.error('Failed to create config.js:', error.message);
          resolve(false);
        } else {
          console.log('✅ config.js created');
          resolve(true);
        }
      }
    );
  });
}

/**
 * Compile debug.css file
 */
function compileDebugCSS() {
  return new Promise((resolve) => {
    exec(
      'docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && npx sass resources/styles/debug.scss resources/public/css/debug.css"',
      (error) => {
        if (error) {
          console.error('Failed to compile debug.css:', error.message);
          resolve(false);
        } else {
          console.log('✅ debug.css compiled');
          resolve(true);
        }
      }
    );
  });
}

/**
 * Restart frontend watch process
 */
function restartWatchProcess() {
  return new Promise((resolve) => {
    exec(
      'docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"',
      (error) => {
        if (error) {
          console.error('Failed to restart watch process:', error.message);
          resolve(false);
        } else {
          console.log('✅ Frontend watch process restarted');
          resolve(true);
        }
      }
    );
  });
}

/**
 * Attempt to repair missing frontend assets
 */
async function repairFrontendAssets() {
  console.log('🔧 Attempting to repair missing frontend assets...');

  const configResult = await createConfigJS();
  const cssResult = await compileDebugCSS();
  await restartWatchProcess();

  return configResult && cssResult;
}

/**
 * Check if demo account is working
 */
async function checkDemoAccount() {
  const loginUrl = `${PENPOT_CONFIG.backend.dev}/api/rpc/command/login-with-password`;
  const credentials = {
    email: 'demo@penpot.local',
    password: 'demo123',
  };

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    return response.ok;
  } catch (error) {
    console.warn('Demo account check failed:', error.message);
    return false;
  }
}

/**
 * Attempt to repair demo account
 */
async function repairDemoAccount() {
  console.log('🔧 Attempting to repair demo account...');

  return new Promise((resolve) => {
    exec(
      './scripts/manage-demo-accounts.sh setup',
      { cwd: path.join(__dirname, '../..') },
      (error, stdout, _stderr) => {
        if (error) {
          console.error('Failed to repair demo account:', error.message);
          resolve(false);
        } else {
          console.log('✅ Demo account repair completed');
          console.log(stdout);
          resolve(true);
        }
      }
    );
  });
}

/**
 * Analyze health check results and identify issues
 */
function analyzeHealthIssues(checks) {
  const issues = [];
  const checkMap = [
    [!checks.frontend, 'Frontend not responding'],
    [!checks.backend, 'Backend not responding'],
    [!checks.assets['config.js'], 'config.js missing'],
    [!checks.assets['debug.css'], 'debug.css missing'],
    [!checks.demoAccount, 'Demo account not working'],
  ];

  checkMap.forEach(([condition, message]) => {
    if (condition) {
      issues.push(message);
    }
  });

  return issues;
}

/**
 * Run comprehensive health check
 */
async function runHealthCheck() {
  console.log('🏥 Running health check...');

  const checks = {
    frontend: await checkService(PENPOT_CONFIG.frontend.dev),
    backend: await checkService(PENPOT_CONFIG.backend.dev),
    assets: await checkFrontendAssets(),
    demoAccount: await checkDemoAccount(),
  };

  const issues = analyzeHealthIssues(checks);

  return {
    healthy: issues.length === 0,
    issues,
    checks,
  };
}

/**
 * Check if recovery can proceed
 */
function canProceedWithRecovery() {
  const now = Date.now();

  // Check recovery cooldown
  if (now - lastRecoveryTime < RECOVERY_COOLDOWN) {
    console.log('⏳ Recovery on cooldown, skipping...');
    return { canProceed: false, now };
  }

  // Check max attempts
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    console.log('❌ Max recovery attempts reached, manual intervention required');
    return { canProceed: false, now };
  }

  return { canProceed: true, now };
}

/**
 * Perform specific repairs based on health issues
 */
async function performRepairs(healthCheck) {
  let recoverySuccess = true;

  // Repair frontend assets if needed
  if (
    healthCheck.issues.some((issue) => issue.includes('config.js') || issue.includes('debug.css'))
  ) {
    const assetRepair = await repairFrontendAssets();
    if (!assetRepair) {
      recoverySuccess = false;
    }
  }

  // Repair demo account if needed
  if (healthCheck.issues.includes('Demo account not working')) {
    const demoRepair = await repairDemoAccount();
    if (!demoRepair) {
      recoverySuccess = false;
    }
  }

  return recoverySuccess;
}

/**
 * Verify recovery was successful
 */
async function verifyRecoverySuccess() {
  console.log('✅ Recovery attempt completed successfully');

  // Wait a bit for changes to take effect
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Re-check health
  const postRecoveryCheck = await runHealthCheck();
  if (postRecoveryCheck.healthy) {
    console.log('✅ System recovered successfully');
    recoveryAttempts = 0; // Reset on success
    return true;
  } else {
    console.log('⚠️  Recovery completed but issues remain:', postRecoveryCheck.issues);
    return false;
  }
}

/**
 * Attempt automatic recovery
 */
async function attemptRecovery() {
  const recoveryCheck = canProceedWithRecovery();
  if (!recoveryCheck.canProceed) {
    return false;
  }

  recoveryAttempts++;
  lastRecoveryTime = recoveryCheck.now;
  console.log(`🚑 Starting recovery attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}...`);

  const healthCheck = await runHealthCheck();
  if (healthCheck.healthy) {
    console.log('✅ System is healthy, no recovery needed');
    recoveryAttempts = 0;
    return true;
  }

  console.log('🔍 Issues detected:', healthCheck.issues);
  const recoverySuccess = await performRepairs(healthCheck);

  return recoverySuccess
    ? await verifyRecoverySuccess()
    : (console.log('❌ Recovery attempt failed'), false);
}

/**
 * Start periodic health monitoring
 */
function startHealthMonitoring(intervalMs = 60000) {
  console.log(`🔄 Starting health monitoring (interval: ${intervalMs}ms)`);

  const monitor = async () => {
    try {
      const healthCheck = await runHealthCheck();

      if (!healthCheck.healthy) {
        console.log('⚠️  Health check failed, attempting recovery...');
        await attemptRecovery();
      }
    } catch (error) {
      console.error('Health monitoring error:', error);
    }
  };

  // Initial check after a delay
  setTimeout(monitor, 10000);

  // Periodic checks
  return setInterval(monitor, intervalMs);
}

/**
 * Emergency recovery for critical failures
 */
async function emergencyRecovery() {
  console.log('🚨 Starting emergency recovery...');

  // Reset recovery limits for emergency
  recoveryAttempts = 0;
  lastRecoveryTime = 0;

  // Try more aggressive recovery
  return new Promise((resolve) => {
    exec(
      './start-dev-environment.sh',
      { cwd: path.join(__dirname, '../..') },
      (error, _stdout, _stderr) => {
        if (error) {
          console.error('Emergency recovery failed:', error.message);
          resolve(false);
        } else {
          console.log('✅ Emergency recovery completed');
          resolve(true);
        }
      }
    );
  });
}

/**
 * Get recovery status
 */
function getRecoveryStatus() {
  const now = Date.now();
  const timeSinceLastRecovery = now - lastRecoveryTime;

  return {
    attempts: recoveryAttempts,
    maxAttempts: MAX_RECOVERY_ATTEMPTS,
    lastRecoveryTime,
    cooldownRemaining: Math.max(0, RECOVERY_COOLDOWN - timeSinceLastRecovery),
    canRecover:
      recoveryAttempts < MAX_RECOVERY_ATTEMPTS && timeSinceLastRecovery >= RECOVERY_COOLDOWN,
  };
}

module.exports = {
  checkService,
  checkFrontendAssets,
  checkDemoAccount,
  runHealthCheck,
  attemptRecovery,
  emergencyRecovery,
  startHealthMonitoring,
  getRecoveryStatus,
  repairFrontendAssets,
  repairDemoAccount,
};
