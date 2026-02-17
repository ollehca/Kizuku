/**
 * Workspace Rendering Diagnostic Tool
 * Injected into renderer to diagnose why workspace doesn't display content
 */

/**
 * Build state accessor script (getState function)
 * @returns {string} JS source for state access
 */
function buildStateAccessor() {
  return `
        var getState = function() {
          try {
            if (typeof store === 'function') return store();
            if (store.deref && typeof store.deref === 'function') return store.deref();
            if (store.state && typeof store.state === 'object') return store.state;
            if (store.state && store.state.deref) return store.state.deref();
            if (store._state) return store._state;
            return null;
          } catch (err) {
            console.error('❌ Error accessing state:', err);
            return null;
          }
        };`;
}

/**
 * Build file logging helper script
 * @returns {string} JS source for file detail logging
 */
function buildFileLogger() {
  return `
        var lastState = null;

        var logFileDetails = function(state) {
          var fileIds = Object.keys(state.files || {});
          if (fileIds.length === 0) return;
          if (lastState && lastState.fileIds.length > 0) return;
          console.log('🔬 FILE LOADED INTO STATE:');
          console.log('  - File IDs:', fileIds);
          fileIds.forEach(function(fid) {
            var file = state.files[fid];
            console.log('  - File ' + fid + ':', {
              name: file?.name, version: file?.version,
              hasData: !!file?.data,
              pageCount: file?.data?.pages?.length || 0
            });
          });
        };`;
}

/**
 * Build workspace change logger and polling setup
 * @returns {string} JS source for workspace monitoring
 */
function buildStateChecker() {
  return `
        var logWorkspaceChanges = function(state) {
          var ws = state['workspace-data'];
          if (ws?.['current-page-id'] && (!lastState
              || lastState.currentPageId !== ws['current-page-id'])) {
            console.log('🔬 CURRENT PAGE: ' + ws['current-page-id']);
          }
          if (state['workspace-file'] && (!lastState
              || lastState.workspaceFile !== state['workspace-file'])) {
            console.log('🔬 WORKSPACE-FILE: ' + state['workspace-file']);
          }
          if (state['workspace-project'] && (!lastState
              || lastState.workspaceProject !== state['workspace-project'])) {
            console.log('🔬 WORKSPACE-PROJECT: ' + state['workspace-project']);
          }
        };

        var checkState = function() {
          var state = getState();
          if (!state) return;
          if (state.files) logFileDetails(state);
          logWorkspaceChanges(state);
          lastState = {
            fileIds: state.files ? Object.keys(state.files) : [],
            workspaceFile: state['workspace-file'],
            workspaceProject: state['workspace-project'],
            currentPageId: state['workspace-data']?.['current-page-id']
          };
        };

        setInterval(checkState, 500);`;
}

/**
 * Build diagnostic API script (exposed on window)
 * @returns {string} JS source for diagnostic API
 */
function buildDiagnosticAPI() {
  return `
        window.__kizuWorkspaceDiag = {
          getState: function() { return getState(); },
          getFiles: function() { var s = getState(); return s?.files; },
          getWorkspaceData: function() {
            var s = getState();
            return s?.['workspace-data'];
          },
          getCurrentFile: function() {
            var s = getState();
            var fid = s?.['workspace-file'];
            return fid ? s.files?.[fid] : null;
          },
          getCurrentPage: function() {
            var s = getState();
            var fid = s?.['workspace-file'];
            var pid = s?.['workspace-data']?.['current-page-id'];
            if (!fid || !pid) return null;
            return s.files?.[fid]?.data?.['pages-index']?.[pid];
          },
          getPageObjects: function() {
            var s = getState();
            var fid = s?.['workspace-file'];
            var pid = s?.['workspace-data']?.['current-page-id'];
            if (!fid || !pid) return null;
            return s.files?.[fid]?.data?.['pages-index']?.[pid]?.objects;
          }
        };
        console.log('✅ Workspace diagnostics enabled');
        console.log('📊 Use window.__kizuWorkspaceDiag.*');`;
}

/**
 * Create the full workspace diagnostic script
 * @returns {string} Complete diagnostic script
 */
function createWorkspaceDiagnostic() {
  return `(function() {
      'use strict';
      console.log('🔬 Kizu Workspace Diagnostic Tool Starting...');
      if (window.self !== window.top) { return; }
      var waitForApp = setInterval(function() {
        if (!window.app || !window.app.main || !window.app.main.store) return;
        clearInterval(waitForApp);
        console.log('✅ PenPot app detected, setting up diagnostics...');
        var store = window.app.main.store;
        console.log('🔬 Store type:', typeof store);
${buildStateAccessor()}
${buildFileLogger()}
${buildStateChecker()}
${buildDiagnosticAPI()}
      }, 100);
      setTimeout(function() {
        if (window.app) return;
        clearInterval(waitForApp);
        console.log('❌ PenPot app not detected after 30s');
      }, 30000);
    })();`;
}

module.exports = {
  createWorkspaceDiagnostic,
};
