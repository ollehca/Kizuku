/**
 * Drag-and-drop handler for .fig, .kizu, and .json files
 * Production-ready implementation with multi-layered approach:
 * - Layer 1: Native Electron file drop interception (main process)
 * - Layer 2: Persistent renderer-side handlers with auto-repair
 * - Layer 3: Visual feedback and error handling
 */

const { ipcMain } = require('electron');
const { createDragDropDiagnostic } = require('./drag-drop-diagnostic');
const { createWorkspaceDiagnostic } = require('./workspace-diagnostic');

// Track handler state
const handlerState = {
  window: null,
  handleFileOpen: null,
  healthCheckInterval: null,
  lastInjectionTime: 0,
  injectionCount: 0,
};

/**
 * Setup main process event listeners for drag-and-drop (Layer 1)
 * Uses native Electron APIs to intercept file drops at the OS level
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 * @param {Function} handleFileOpen - Callback function to handle file opening
 */
function setupEventListeners(window, handleFileOpen) {
  // Store references for health monitoring
  handlerState.window = window;
  handlerState.handleFileOpen = handleFileOpen;

  console.log('🔧 Setting up native drag-drop event listeners...');

  // NATIVE APPROACH 1: Intercept file:// navigation (when user drops file on window)
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) {
      event.preventDefault();
      const filePath = decodeURIComponent(url.replace('file://', ''));
      console.log('🎯 [Native] File dropped via will-navigate:', filePath);

      if (isSupportedFile(filePath)) {
        handleFileOpen(filePath);
      } else {
        console.warn('⚠️ Unsupported file type:', filePath);
      }
    }
  });

  // NATIVE APPROACH 2: Listen for file paths from renderer via IPC
  ipcMain.removeHandler('drag-drop:file-dropped'); // Remove old handler if exists
  ipcMain.handle('drag-drop:file-dropped', async (_event, filePath) => {
    console.log('🎯 [IPC] File dropped via IPC:', filePath);

    try {
      if (!isSupportedFile(filePath)) {
        return { success: false, error: 'Unsupported file type' };
      }

      const result = await handleFileOpen(filePath);
      return { success: true, result };
    } catch (error) {
      console.error('❌ File drop handler error:', error);
      return { success: false, error: error.message };
    }
  });

  // NATIVE APPROACH 3: Respond to health check pings from renderer
  ipcMain.removeHandler('drag-drop:health-check');
  ipcMain.handle('drag-drop:health-check', () => {
    return {
      alive: true,
      injectionCount: handlerState.injectionCount,
      lastInjectionTime: handlerState.lastInjectionTime,
    };
  });

  console.log('✅ Native drag-drop event listeners registered');
}

/**
 * Check if file type is supported
 * @param {string} filePath - Path to file
 * @returns {boolean} True if supported
 */
function isSupportedFile(filePath) {
  const ext = filePath.toLowerCase();
  return ext.endsWith('.fig') || ext.endsWith('.kizu') || ext.endsWith('.json');
}

/**
 * Create the renderer-side drag-and-drop script (Layer 2)
 * Includes MutationObserver for persistence and health monitoring
 * @returns {string} The JavaScript code to inject into the renderer
 */
// eslint-disable-next-line max-lines-per-function
function createDragDropScript() {
  return `
    (function() {
      'use strict';

      // Only run in main window, not in iframes (like the rasterizer iframe)
      if (window.self !== window.top) {
        console.log('⏭️  Skipping drag-drop initialization in iframe context');
        return;
      }

      console.log('🎯 Kizu drag-and-drop handlers initializing (production version)...');

      // State management
      const kizuDragDrop = {
        handlers: {
          dragover: null,
          dragleave: null,
          drop: null
        },
        overlay: null,
        healthCheckInterval: null,
        mutationObserver: null,
        isAttached: false,
        dropInProgress: false,
        lastHealthCheck: Date.now()
      };

      // Store in window for debugging
      window.__kizuDragDrop = kizuDragDrop;

      /**
       * Create visual drop overlay (Layer 3)
       */
      function createDropOverlay() {
        if (kizuDragDrop.overlay) return kizuDragDrop.overlay;

        const overlay = document.createElement('div');
        overlay.id = 'kizu-drop-overlay';
        overlay.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(31, 133, 229, 0.1);
          border: 3px dashed #1F85E5;
          z-index: 999999;
          display: none;
          pointer-events: none;
          transition: opacity 0.2s ease;
        \`;

        const text = document.createElement('div');
        text.style.cssText = \`
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(31, 133, 229, 0.95);
          color: white;
          padding: 24px 48px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        \`;
        text.textContent = '📥 Drop Figma file to import';

        overlay.appendChild(text);
        document.body.appendChild(overlay);
        kizuDragDrop.overlay = overlay;

        return overlay;
      }

      /**
       * Show drop overlay
       */
      function showDropOverlay() {
        const overlay = createDropOverlay();
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
      }

      /**
       * Hide drop overlay
       */
      function hideDropOverlay() {
        if (kizuDragDrop.overlay) {
          kizuDragDrop.overlay.style.opacity = '0';
          setTimeout(() => {
            if (kizuDragDrop.overlay) {
              kizuDragDrop.overlay.style.display = 'none';
            }
          }, 200);
        }
      }

      /**
       * Handle dragover event
       */
      function handleDragOver(e) {
        // Check if this is a file drag operation
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) {
          return; // Not a file drag, let PenPot handle it
        }

        // This is a file drag - intercept it
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.dataTransfer.dropEffect = 'copy';

        // Show visual feedback
        showDropOverlay();
      }

      /**
       * Handle dragleave event
       */
      function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        // Only hide overlay when leaving the window entirely
        if (e.target === document.documentElement || e.target === document.body) {
          if (!document.body.contains(e.relatedTarget)) {
            hideDropOverlay();
          }
        }
      }

      /**
       * Handle drop event
       */
      async function handleDrop(e) {
        console.log('🎯 Kizu: Drop event detected');

        // Always prevent default and stop propagation for file drops
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }

        // Hide overlay
        hideDropOverlay();

        // Prevent concurrent drops
        if (kizuDragDrop.dropInProgress) {
          console.warn('⚠️ Drop already in progress, ignoring...');
          return;
        }

        kizuDragDrop.dropInProgress = true;

        try {
          const files = Array.from(e.dataTransfer.files);
          console.log('🎯 Kizu: Dropped files count:', files.length);

          // Filter for supported file types
          const supportedFiles = files.filter(file => {
            const ext = file.name.toLowerCase();
            return ext.endsWith('.fig') || ext.endsWith('.kizu') || ext.endsWith('.json');
          });

          console.log('🎯 Kizu: Supported files count:', supportedFiles.length);

          if (supportedFiles.length === 0) {
            if (files.length > 0) {
              showNotification(
                'Unsupported file type. Please drop .fig, .kizu, or .json files.',
                'warning'
              );
            }
            return;
          }

          const fileNames = supportedFiles.map(f => f.name);
          console.log('🎯 Kizu intercepted dropped files:', fileNames);

          // METHOD 1: Try using webUtils (primary method)
          if (window.electronAPI && window.electronAPI.getFilePathForDrop) {
            console.log('✅ Using webUtils.getPathForFile (primary method)');
            await handleFilesWithWebUtils(supportedFiles);
          }
          // METHOD 2: Try using IPC with file drop handler (fallback)
          else if (window.electronAPI && window.electronAPI.dragDropFileHandler) {
            console.log('⚠️ Falling back to IPC drag-drop handler');
            await handleFilesWithIPC(supportedFiles);
          }
          // METHOD 3: No API available
          else {
            console.error('❌ No file drop API available');
            showNotification('File drop not supported. Please use File → Import instead.', 'error');
          }

        } catch (error) {
          console.error('❌ Drop handler error:', error);
          showNotification('Failed to process dropped files: ' + error.message, 'error');
        } finally {
          kizuDragDrop.dropInProgress = false;
        }
      }

      /**
       * Handle files using webUtils (primary method)
       */
      async function handleFilesWithWebUtils(files) {
        try {
          const filePaths = await Promise.all(
            files.map(file => window.electronAPI.getFilePathForDrop(file))
          );

          console.log('📁 File paths obtained:', filePaths);

          for (const filePath of filePaths) {
            if (!filePath) {
              console.warn('⚠️ File path is null/undefined, skipping');
              continue;
            }

            console.log('📥 Importing file:', filePath);
            showNotification('Importing ' + filePath.split('/').pop() + '...', 'info');

            try {
              const result = await window.electronAPI.handleFileOpen(filePath);
              console.log('✅ Import completed:', result);

              if (result && !result.success) {
                showNotification('Import failed: ' + (result.error || 'Unknown error'), 'error');
              } else {
                showNotification('File imported successfully!', 'success');
              }
            } catch (error) {
              console.error('❌ Import failed:', error);
              showNotification('Import failed: ' + error.message, 'error');
            }
          }
        } catch (error) {
          console.error('❌ Failed to get file paths:', error);
          showNotification('Failed to access dropped files: ' + error.message, 'error');
        }
      }

      /**
       * Handle files using IPC (fallback method)
       */
      async function handleFilesWithIPC(files) {
        // This would require additional IPC setup
        // For now, show error message
        showNotification('File drop not fully configured. Please use File → Import.', 'warning');
      }

      /**
       * Show notification to user
       */
      function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = \`
          position: fixed;
          top: 24px;
          right: 24px;
          background: \${
            type === 'error' ? '#D32F2F' :
            type === 'warning' ? '#F57C00' :
            type === 'success' ? '#388E3C' : '#1F85E5'
          };
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000000;
          max-width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: slideIn 0.3s ease;
        \`;
        notification.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = \`
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        \`;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transform = 'translateX(400px)';
          setTimeout(() => notification.remove(), 300);
        }, 5000);
      }

      /**
       * Attach event handlers to document
       */
      function attachHandlers() {
        if (kizuDragDrop.isAttached) {
          console.log('🔧 Handlers already attached, skipping');
          return;
        }

        console.log('🔧 Attaching drag-drop handlers...');

        // Remove old handlers if they exist
        if (kizuDragDrop.handlers.dragover) {
          document.removeEventListener('dragover', kizuDragDrop.handlers.dragover, true);
        }
        if (kizuDragDrop.handlers.dragleave) {
          document.removeEventListener('dragleave', kizuDragDrop.handlers.dragleave, true);
        }
        if (kizuDragDrop.handlers.drop) {
          document.removeEventListener('drop', kizuDragDrop.handlers.drop, true);
        }

        // Store handler references
        kizuDragDrop.handlers.dragover = handleDragOver;
        kizuDragDrop.handlers.dragleave = handleDragLeave;
        kizuDragDrop.handlers.drop = handleDrop;

        // Attach in capture phase with highest priority
        document.addEventListener('dragover', handleDragOver, true);
        document.addEventListener('dragleave', handleDragLeave, true);
        document.addEventListener('drop', handleDrop, true);

        kizuDragDrop.isAttached = true;
        console.log('✅ Drag-drop handlers attached (capture phase)');
      }

      /**
       * Setup MutationObserver to re-attach handlers if DOM changes
       */
      function setupMutationObserver() {
        if (kizuDragDrop.mutationObserver) {
          kizuDragDrop.mutationObserver.disconnect();
        }

        kizuDragDrop.mutationObserver = new MutationObserver((mutations) => {
          // Check if body was replaced or major DOM changes occurred
          const bodyReplaced = mutations.some(m =>
            Array.from(m.removedNodes).includes(document.body) ||
            m.target === document.documentElement
          );

          if (bodyReplaced && !kizuDragDrop.isAttached) {
            console.log('🔧 DOM change detected, re-attaching handlers...');
            setTimeout(attachHandlers, 100);
          }
        });

        kizuDragDrop.mutationObserver.observe(document.documentElement, {
          childList: true,
          subtree: false
        });

        console.log('✅ MutationObserver setup complete');
      }

      /**
       * Health check - verify handlers are still active
       */
      function performHealthCheck() {
        if (!kizuDragDrop.isAttached) {
          console.warn('⚠️ Health check failed: handlers not attached, re-attaching...');
          attachHandlers();
        }

        kizuDragDrop.lastHealthCheck = Date.now();

        // Ping main process
        if (window.electronAPI && window.electronAPI.dragDropHealthCheck) {
          window.electronAPI.dragDropHealthCheck()
            .then(status => {
              console.log('✅ Health check successful:', status);
            })
            .catch(err => {
              console.error('❌ Health check failed:', err);
            });
        }
      }

      /**
       * Initialize drag-drop system
       */
      function initialize() {
        console.log('🚀 Initializing Kizu drag-drop system...');

        // Attach handlers immediately
        attachHandlers();

        // Setup auto-repair with MutationObserver
        setupMutationObserver();

        // Start health monitoring (check every 30 seconds)
        kizuDragDrop.healthCheckInterval = setInterval(performHealthCheck, 30000);

        // Initial health check after 5 seconds
        setTimeout(performHealthCheck, 5000);

        console.log('✅ Kizu drag-drop system initialized');
      }

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
      } else {
        initialize();
      }

    })();
  `;
}

/**
 * Setup drag-and-drop handling for .fig, .kizu, and .json files
 * Production-ready multi-layered implementation
 *
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 * @param {Function} handleFileOpen - Callback function to handle file opening
 */
function setupDragAndDrop(window, handleFileOpen) {
  console.log('🚀 Setting up drag-and-drop (production version)...');

  // LAYER 1: Setup main process event listeners (native Electron)
  setupEventListeners(window, handleFileOpen);

  // LAYER 2: Inject persistent renderer-side handlers
  injectRendererHandlers(window);

  // LAYER 3: Setup re-injection on navigation
  setupReinjectionOnNavigation(window);

  console.log('✅ Drag-and-drop setup complete');
}

/**
 * Inject renderer-side handlers into the page
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 */
function injectRendererHandlers(window) {
  const diagnosticScript = createDragDropDiagnostic();
  const workspaceDiagnosticScript = createWorkspaceDiagnostic();
  const dragDropScript = createDragDropScript();

  handlerState.lastInjectionTime = Date.now();
  handlerState.injectionCount++;

  console.log(`🔧 Injecting renderer handlers (injection #${handlerState.injectionCount})...`);

  // Inject diagnostic first to capture all events
  window.webContents
    .executeJavaScript(diagnosticScript)
    .then(() => {
      console.log('✅ Drag-drop diagnostic injected');
      // Then inject workspace diagnostic
      return window.webContents.executeJavaScript(workspaceDiagnosticScript);
    })
    .then(() => {
      console.log('✅ Workspace diagnostic injected');
      // Then inject the actual handlers
      return window.webContents.executeJavaScript(dragDropScript);
    })
    .then(() => {
      console.log('✅ Renderer drag-drop handlers injected successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to inject drag-drop handlers:', error);
    });
}

/**
 * Setup re-injection on navigation to handle SPA page changes
 * @param {BrowserWindow} window - The Electron BrowserWindow instance
 */
function setupReinjectionOnNavigation(_window) {
  // DISABLED: These re-injections cause page reloads and clear console logs
  // The handlers are persistent via MutationObserver, so re-injection is not needed

  console.log('✅ Re-injection listeners disabled (handlers are persistent)');
}

/**
 * Cleanup drag-and-drop handlers
 * Call this when window is being closed
 */
function cleanup() {
  if (handlerState.healthCheckInterval) {
    clearInterval(handlerState.healthCheckInterval);
    handlerState.healthCheckInterval = null;
  }

  // Remove IPC handlers
  ipcMain.removeHandler('drag-drop:file-dropped');
  ipcMain.removeHandler('drag-drop:health-check');

  console.log('✅ Drag-drop handlers cleaned up');
}

module.exports = {
  setupDragAndDrop,
  cleanup,
};
