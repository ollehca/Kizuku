/**
 * Workspace Launcher
 * Launches Kizu workspace with a .kizu project file
 * Bypasses Kizu's default dashboard and authentication flow
 */

const { createLogger } = require('./logger');
const { getBackendServiceManager } = require('../services/backend-service-manager');

const logger = createLogger('WorkspaceLauncher');

/**
 * Get Kizu workspace URL configuration
 */
function getPenpotConfig() {
  return {
    dev: 'http://localhost:3449',
    prod: 'http://localhost:3449', // TODO: Update for production
  };
}

/**
 * Build workspace URL from project metadata
 */
function buildWorkspaceUrl(projectMetadata) {
  const config = getPenpotConfig();
  const baseUrl = process.env.NODE_ENV === 'production' ? config.prod : config.dev;

  const fileId = projectMetadata.id;
  const projectId = projectMetadata.id; // Use same ID for both

  // PenPot workspace URL format: /workspace/<project-id>/<file-id>
  // Using legacy route format which is more reliable
  const workspaceUrl = `${baseUrl}/workspace/${projectId}/${fileId}`;

  logger.info('Built workspace URL', { fileId, projectId, workspaceUrl });

  return workspaceUrl;
}

/**
 * Prepare project for workspace launch
 */
async function prepareProject(filePath) {
  try {
    const manager = getBackendServiceManager();

    // Load project from file
    const project = await manager.loadProject(filePath);

    logger.info('Project loaded for workspace', {
      name: project.metadata.name,
      id: project.metadata.id,
    });

    return project;
  } catch (error) {
    logger.error('Failed to prepare project', { filePath, error });
    throw new Error(`Failed to load project: ${error.message}`);
  }
}

/**
 * Validate project can be launched
 */
function validateProject(project) {
  if (!project || !project.metadata) {
    throw new Error('Invalid project: missing metadata');
  }

  if (!project.metadata.id) {
    throw new Error('Invalid project: missing project ID');
  }

  if (!project.metadata.name) {
    throw new Error('Invalid project: missing project name');
  }

  logger.info('Project validation passed', { id: project.metadata.id });
}

/**
 * Convert Kizu project format to PenPot file format
 */
function convertToPenpotFormat(kizuProject) {
  return {
    id: kizuProject.metadata.id,
    name: kizuProject.metadata.name,
    'project-id': kizuProject.metadata.id,
    version: kizuProject.version || '1.0.0',
    'created-at': kizuProject.metadata.created,
    'modified-at': kizuProject.metadata.modified,
    data: kizuProject.data || {
      pages: [],
      components: [],
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

/**
 * Inject file data directly into PenPot's state
 */
async function injectFileDataIntoState(mainWindow, project) {
  logger.info('Injecting file data into PenPot state', { projectId: project.metadata.id });

  // Convert Kizu format to PenPot format
  const penpotFile = convertToPenpotFormat(project);

  const injectionScript = `
    (function() {
      const fileData = ${JSON.stringify(penpotFile)};
      const fileId = '${project.metadata.id}';

      console.log('📦 Injecting file data into PenPot state for file:', fileId);
      console.log('📦 File data structure:', {
        id: fileData.id,
        name: fileData.name,
        projectId: fileData['project-id'],
        hasData: !!fileData.data,
        version: fileData.version
      });

      // Wait for PenPot app to be ready with proper state atom
      let retryCount = 0;
      const maxRetries = 50; // 5 seconds max

      // Helper function to create file data injection
      function injectFileDataIntoState(state, fileData, fileId) {
        return {
          ...state,
          // Workspace file keys
          'workspace-file': fileData,
          'workspace-data': fileData.data,
          'current-file': fileData,
          'file': fileData,

          // Workspace project keys
          'workspace-project': {
            id: fileId,
            name: fileData.name
          },
          'current-project': {
            id: fileId,
            name: fileData.name
          },

          // File ID for routing
          'current-file-id': fileId,
          'workspace-file-id': fileId,

          // Data keys
          'workspace': {
            ...state['workspace'],
            'file': fileData,
            'data': fileData.data,
            'file-id': fileId,
            'project-id': fileId
          }
        };
      }

      const injectData = () => {
        retryCount++;

        // Debug: Log what we have available (only on first retry)
        if (retryCount === 1) {
          console.log('🔍 Scanning for PenPot state atom...');

          // Deep scan for any object with swap function (with circular reference protection)
          function findAtomInObject(obj, path = '', visited = new WeakSet()) {
            if (!obj || typeof obj !== 'object') return null;

            // Prevent circular references
            if (visited.has(obj)) return null;
            visited.add(obj);

            // Check current object
            if (typeof obj.swap === 'function' && typeof obj.deref === 'function') {
              console.log('🎯 FOUND ATOM at:', path || 'root');
              return { atom: obj, path };
            }

            // Limit depth to prevent performance issues
            const depth = path.split('.').length;
            if (depth > 10) return null;

            // Check properties
            try {
              const keys = Object.keys(obj);
              for (const key of keys) {
                const val = obj[key];
                if (val && typeof val === 'object') {
                  const result = findAtomInObject(val, path + '.' + key, visited);
                  if (result) return result;
                }
              }
            } catch (error) {
              // Ignore errors from accessing certain properties
              console.warn('Error scanning', path, error.message);
            }

            return null;
          }

          // Scan starting from window.app
          if (window.app) {
            const found = findAtomInObject(window.app, 'window.app');
            if (found) {
              console.log('✅ Atom location:', found.path);
            } else {
              console.log('❌ No atom with swap+deref found in window.app tree (depth limit: 10)');
            }
          }

          // Also check if swap exists but is non-enumerable
          if (window.app?.main?.store?.state) {
            const testObj = window.app.main.store.state;
            console.log('🔍 Checking for non-enumerable swap:', {
              hasSwapInObj: 'swap' in testObj,
              swapType: typeof testObj.swap,
              protoSwap: typeof Object.getPrototypeOf(testObj)?.swap
            });
          }
        }

        // Check if PenPot app and state exist
        if (!window.app?.main?.store?.state) {
          if (retryCount < maxRetries) {
            if (retryCount % 10 === 1) {
              console.log('⏳ PenPot state not ready, retrying... (' + retryCount + '/' + maxRetries + ')');
            }
            setTimeout(injectData, 100);
          } else {
            console.error('❌ Timeout waiting for PenPot state to initialize');
          }
          return;
        }

        console.log('✅ PenPot app structure is ready, attempting injection...');

        // STRATEGY 1: Try to find and use ClojureScript atom with swap
        let injectionSuccess = false;
        const stateContainer = window.app.main.store.state;

        // Check if the state container itself has swap
        if (typeof stateContainer.swap === 'function' && typeof stateContainer.deref === 'function') {
          console.log('✅ Found atom at window.app.main.store.state (direct)');
          try {
            stateContainer.swap(state => {
              console.log('✅ Using atom.swap to inject file data');
              return injectFileDataIntoState(state, fileData, fileId);
            });
            injectionSuccess = true;
            console.log('✅ Injection via atom.swap successful');
          } catch (error) {
            console.warn('⚠️ atom.swap failed:', error);
          }
        }

        // STRATEGY 2: Try nested state.state
        if (!injectionSuccess && stateContainer.state) {
          const nestedState = stateContainer.state;
          if (typeof nestedState.swap === 'function' && typeof nestedState.deref === 'function') {
            console.log('✅ Found atom at window.app.main.store.state.state');
            try {
              nestedState.swap(state => {
                console.log('✅ Using nested atom.swap to inject file data');
                return injectFileDataIntoState(state, fileData, fileId);
              });
              injectionSuccess = true;
              console.log('✅ Injection via nested atom.swap successful');
            } catch (error) {
              console.warn('⚠️ Nested atom.swap failed:', error);
            }
          }
        }

        // STRATEGY 3: Direct property manipulation (fallback)
        if (!injectionSuccess) {
          console.log('⚠️ No ClojureScript atom found, trying direct property manipulation...');
          try {
            // PenPot reads from window.app.main.store.state.state (double nested)
            // So we need to inject there, not at window.app.main.store.state
            const targetState = stateContainer.state;

            if (typeof targetState === 'object') {
              console.log('🎯 Injecting into state.state (nested level)');

              // Create the file data structure
              const injectedData = {
                'workspace-file': fileData,
                'workspace-data': fileData.data,
                'current-file': fileData,
                'file': fileData,
                'current-file-id': fileId,
                'workspace-file-id': fileId,
                'workspace-project': {
                  id: fileId,
                  name: fileData.name
                },
                'current-project': {
                  id: fileId,
                  name: fileData.name
                }
              };

              // Inject into the nested state
              Object.assign(targetState, injectedData);

              // Also try setting workspace nested object
              if (!targetState.workspace) {
                targetState.workspace = {};
              }
              targetState.workspace.file = fileData;
              targetState.workspace.data = fileData.data;
              targetState.workspace['file-id'] = fileId;
              targetState.workspace['project-id'] = fileId;

              console.log('✅ Direct property injection completed at state.state');
              console.log('🔍 Injected keys:', Object.keys(injectedData));

              // Verify the injection
              console.log('🔍 Verification - can read back file:', !!targetState.file);
              console.log('🔍 Verification - can read back workspace-file:', !!targetState['workspace-file']);

              injectionSuccess = true;
            } else {
              console.warn('⚠️ state.state is not an object, trying at state level');

              // Fallback: inject at the state level
              const fallbackData = {
                'workspace-file': fileData,
                'workspace-data': fileData.data,
                'current-file': fileData,
                'file': fileData,
                'current-file-id': fileId,
                'workspace-file-id': fileId,
                'workspace-project': {
                  id: fileId,
                  name: fileData.name
                },
                'current-project': {
                  id: fileId,
                  name: fileData.name
                }
              };

              Object.assign(stateContainer, fallbackData);
              console.log('✅ Fallback injection at state level completed');
              injectionSuccess = true;
            }
          } catch (error) {
            console.error('❌ Direct property manipulation failed:', error);
          }
        }

        // STRATEGY 4: Store in global variable as last resort
        if (!injectionSuccess) {
          console.log('⚠️ All injection strategies failed, storing in global variable');
          window.KIZU_FILE_DATA = {
            file: fileData,
            fileId: fileId,
            timestamp: Date.now()
          };
          console.log('✅ Stored in window.KIZU_FILE_DATA for PenPot to discover');
        }

        // Log result
        if (injectionSuccess) {
          console.log('✅ File data injection completed successfully');
        } else {
          console.warn('⚠️ Could not inject into PenPot state, file stored in window.KIZU_FILE_DATA');
        }
      };

      injectData();
    })();
  `;

  await mainWindow.webContents.executeJavaScript(injectionScript);
  logger.info('File data injection script executed');
}

/**
 * Launch workspace in main window using PenPot's kizu-local mechanism
 */
async function launchInMainWindow(mainWindow, workspaceUrl, project) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('Main window not available');
  }

  console.log('🔧 [WorkspaceLauncher] Launching workspace in main window');
  logger.info('Launching workspace in main window');

  // Use PenPot's kizu-local mechanism for loading files from outside the database
  // This is the same approach used in main.js for drag-and-drop imports
  const fileId = project.metadata.id;

  // Get team ID from mock profile
  const mockBackend = require('../services/penpot-mock-backend');
  const profile = await mockBackend.getMockProfile();
  const teamId = profile['default-team-id'];

  // Convert Kizu project to PenPot format
  const penpotFile = convertToPenpotFormat(project);

  console.log('📦 [WorkspaceLauncher] Using kizu-local mechanism for file:', fileId);

  // Inject file data and navigate using PenPot's built-in kizu-local loader
  // Simple navigation - PenPot will load the file via normal API calls to our mock backend
  const loadScript = `
    (async () => {
      try {
        console.log('🔐 [WorkspaceLauncher] Checking authentication...');

        // Verify auth tokens are set (should be done by auth-integration.js)
        const authToken = localStorage.getItem('auth-token');
        const profileStr = localStorage.getItem('auth-profile');

        if (!authToken || !profileStr) {
          console.error('❌ [WorkspaceLauncher] Missing auth - auth-integration.js should have set this');
          throw new Error('Authentication not available');
        }

        const profile = JSON.parse(profileStr);
        const profileTeamId = profile['default-team-id'] || '${teamId}';

        console.log('✅ [WorkspaceLauncher] Auth verified, navigating to workspace');
        console.log('📊 [WorkspaceLauncher] Team ID:', profileTeamId, 'Project ID:', '${fileId}', 'File ID:', '${fileId}');

        // Navigate to workspace using NORMAL PenPot URL format
        // PenPot will make API calls to get-file, which our mock backend handles
        // Use fileId as BOTH project-id and file-id (they're the same for imported files)
        const workspaceUrl = \`/workspace?team-id=\${profileTeamId}&project-id=${fileId}&file-id=${fileId}\`;

        console.log('🔗 [WorkspaceLauncher] Navigating to:', workspaceUrl);
        window.location.hash = workspaceUrl;

        console.log('✅ [WorkspaceLauncher] Navigation complete - PenPot will load file via API');
      } catch (error) {
        console.error('❌ [WorkspaceLauncher] Failed to navigate:', error);
      }
    })();
  `;

  // Execute the load script
  await mainWindow.webContents.executeJavaScript(loadScript);

  console.log('✅ [WorkspaceLauncher] File load script executed');

  // Focus the window
  mainWindow.focus();
}

/**
 * Create success result
 */
function createSuccessResult(project, url) {
  logger.info('Workspace launched successfully', {
    project: project.name,
    id: project.id,
  });

  return {
    success: true,
    project,
    url,
  };
}

/**
 * Launch Kizu workspace with a .kizu project
 * @param {string} filePath - Path to .kizu file
 * @param {BrowserWindow} mainWindow - Main application window
 */
async function launchWorkspace(filePath, mainWindow) {
  try {
    console.log('🚀 [WorkspaceLauncher] Starting workspace launch for:', filePath);
    logger.info('Starting workspace launch', { filePath });

    const project = await prepareProject(filePath);
    console.log('📦 [WorkspaceLauncher] Project loaded:', project.metadata.name, project.metadata.id);

    validateProject(project);
    console.log('✅ [WorkspaceLauncher] Project validation passed');

    const workspaceUrl = buildWorkspaceUrl(project.metadata);
    console.log('🔗 [WorkspaceLauncher] Built workspace URL:', workspaceUrl);

    await launchInMainWindow(mainWindow, workspaceUrl, project);
    console.log('✅ [WorkspaceLauncher] Launched in main window successfully');

    return createSuccessResult(project.metadata, workspaceUrl);
  } catch (error) {
    console.error('❌ [WorkspaceLauncher] Workspace launch failed:', error);
    logger.error('Workspace launch failed', { filePath, error });
    throw error;
  }
}

module.exports = {
  launchWorkspace,
  buildWorkspaceUrl,
};
