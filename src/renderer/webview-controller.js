/**
 * Kizu Webview Controller
 * Manages webview lifecycle and user experience
 */

// Create logger for webview operations
function createLogMethods(isDev) {
  return {
    info: (message, data) => {
      if (isDev) {
        console.log(`🎨 [WebView] ${message}`, data || '');
      }
    },
    warn: (message, data) => {
      if (isDev) {
        console.warn(`⚠️ [WebView] ${message}`, data || '');
      }
    },
    error: (message, data) => {
      console.error(`❌ [WebView] ${message}`, data || '');
    },
  };
}

function createWebviewLogger() {
  const isDev =
    typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

  return createLogMethods(isDev);
}

const logger = createWebviewLogger();

// Get DOM elements
const loadingScreen = document.getElementById('loading-screen');
const errorScreen = document.getElementById('error-screen');
const webview = document.getElementById('penpot-webview');
const retryButton = document.getElementById('retry-button');

// Configuration constants
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const RETRY_DELAY = 2000; // 2 seconds

// Get PenPot URL based on environment
function getPenpotUrl() {
  // For now, always use development URL since we're in development mode
  return 'http://localhost:3449';
}

// Application state
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Initialize the webview controller
 */
function initializeWebviewController() {
  logger.info('Initializing Kizu webview controller');

  setupWebviewEventHandlers();
  setupRetryButton();
  startPenpotConnection();
}

/**
 * Set up webview event handlers for lifecycle management
 */
function setupWebviewEventHandlers() {
  webview.addEventListener('dom-ready', handleWebviewReady);
  webview.addEventListener('did-fail-load', handleWebviewFailure);
  webview.addEventListener('did-finish-load', handleWebviewLoaded);
  webview.addEventListener('crashed', handleWebviewCrash);
  webview.addEventListener('unresponsive', handleWebviewUnresponsive);
  webview.addEventListener('responsive', handleWebviewResponsive);
}

/**
 * Set up retry button functionality
 */
function setupRetryButton() {
  retryButton.addEventListener('click', () => {
    logger.info('User requested connection retry');
    hideErrorScreen();
    showLoadingScreen();
    connectionAttempts = 0;
    startPenpotConnection();
  });
}

/**
 * Start PenPot connection process
 */
function startPenpotConnection() {
  logger.info('Starting PenPot connection attempt', connectionAttempts + 1);

  showLoadingScreen();
  webview.style.display = 'none';

  // Set webview source to trigger loading
  webview.src = getPenpotUrl();

  // Set connection timeout
  setTimeout(() => {
    if (loadingScreen.style.display !== 'none') {
      handleConnectionTimeout();
    }
  }, CONNECTION_TIMEOUT);
}

/**
 * Handle successful webview ready state
 */
function handleWebviewReady() {
  logger.info('PenPot webview DOM ready');
}

/**
 * Handle successful webview load
 */
function handleWebviewLoaded() {
  logger.info('PenPot webview fully loaded');

  hideLoadingScreen();
  hideErrorScreen();
  showWebview();

  // Reset connection attempts on success
  connectionAttempts = 0;

  // CSS fixes are now in PenPot's source files directly

  // Notify main process of successful load
  notifyMainProcess('webview:loaded', {
    url: getPenpotUrl(),
    timestamp: Date.now(),
    attempts: connectionAttempts,
  });
}

/**
 * Handle webview load failure
 */
function handleWebviewFailure(event) {
  logger.error('PenPot webview failed to load', event.errorDescription);

  connectionAttempts++;

  // Notify main process of error
  notifyMainProcess('webview:error', {
    error: event.errorDescription,
    errorCode: event.errorCode,
    attempts: connectionAttempts,
    url: getPenpotUrl(),
  });

  if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    retryConnectionWithDelay();
  } else {
    showErrorScreen();
  }
}

/**
 * Handle connection timeout
 */
function handleConnectionTimeout() {
  logger.warn('PenPot connection timed out');

  connectionAttempts++;

  if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    retryConnectionWithDelay();
  } else {
    showErrorScreen();
  }
}

/**
 * Handle webview crash
 */
function handleWebviewCrash() {
  logger.error('PenPot webview crashed');
  handleCriticalError(new Error('Webview crashed'));
}

/**
 * Handle webview becoming unresponsive
 */
function handleWebviewUnresponsive() {
  logger.warn('PenPot webview became unresponsive');
  // Could show a "PenPot is loading..." message
}

/**
 * Handle webview becoming responsive again
 */
function handleWebviewResponsive() {
  logger.info('PenPot webview is responsive again');
}

/**
 * Retry connection with delay
 */
function retryConnectionWithDelay() {
  logger.info(
    `Retrying connection in ${RETRY_DELAY}ms... ` +
      `(attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})`
  );

  setTimeout(() => {
    startPenpotConnection();
  }, RETRY_DELAY);
}

/**
 * Show loading screen
 */
function showLoadingScreen() {
  loadingScreen.style.display = 'flex';
  updateLoadingMessage();
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
  loadingScreen.style.display = 'none';
}

/**
 * Show error screen
 */
function showErrorScreen() {
  hideLoadingScreen();
  webview.style.display = 'none';
  errorScreen.style.display = 'flex';

  logger.error('Max retry attempts reached. Showing error screen.');
}

/**
 * Hide error screen
 */
function hideErrorScreen() {
  errorScreen.style.display = 'none';
}

/**
 * Show webview
 */
function showWebview() {
  webview.style.display = 'flex';
}

/**
 * Update loading screen message based on attempt count
 */
function updateLoadingMessage() {
  const messages = ['Starting Kizu...', 'Reconnecting to PenPot...', 'Almost there...'];

  const messageIndex = Math.min(connectionAttempts, messages.length - 1);
  const messageElement = loadingScreen.querySelector('p');

  if (messageElement) {
    messageElement.textContent = messages[messageIndex];
  }
}

/**
 * Handle critical errors
 */
function handleCriticalError(error) {
  logger.error('Critical webview error:', error);

  notifyMainProcess('webview:error', {
    error: error.message || 'Critical webview error',
    critical: true,
    timestamp: Date.now(),
  });

  showErrorScreen();
}

/**
 * Notify main process via IPC
 * @param {string} channel - IPC channel name
 * @param {object} data - Data to send
 */
function notifyMainProcess(channel, data) {
  try {
    if (globalThis.electronAPI && globalThis.electronAPI.sendToMain) {
      globalThis.electronAPI.sendToMain(channel, data);
    } else {
      logger.warn('electronAPI not available for IPC communication');
    }
  } catch (error) {
    logger.error('Failed to notify main process:', error);
  }
}

// Handle paste commands from main process
if (globalThis.electronAPI && globalThis.electronAPI.onPasteCommand) {
  globalThis.electronAPI.onPasteCommand(() => {
    try {
      const webContents = webview.getWebContents();
      if (webContents) {
        webContents.paste();
      }
    } catch (error) {
      logger.error('Failed to paste:', error);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebviewController);
} else {
  initializeWebviewController();
}

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeWebviewController,
    startPenpotConnection,
  };
}
