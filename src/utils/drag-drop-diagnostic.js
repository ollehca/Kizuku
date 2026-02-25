/**
 * Drag-and-Drop Diagnostic Tool
 * Injected into renderer to diagnose drag-drop event capture issues
 */

/**
 * Build the dragover handler script fragment
 * @returns {string} JS source for dragover diagnostics
 */
function buildDragOverHandler() {
  return `
      function diagnosticDragOver(e) {
        diagnostics.dragoverCount++;
        if (diagnostics.dragoverCount === 1 || diagnostics.dragoverCount % 10 === 0) {
          console.log('🔬 DIAGNOSTIC dragover #' + diagnostics.dragoverCount);
          var dtTypes = e.dataTransfer ? Array.from(e.dataTransfer.types) : 'null';
          console.log('  - dataTransfer.types:', dtTypes);
          console.log('  - dataTransfer.files:', e.dataTransfer?.files?.length || 0);
          console.log('  - dataTransfer.items:', e.dataTransfer?.items?.length || 0);
          console.log('  - defaultPrevented:', e.defaultPrevented);
          console.log('  - eventPhase:', e.eventPhase,
            e.eventPhase === 1 ? '(CAPTURING)' :
            e.eventPhase === 2 ? '(AT_TARGET)' :
            e.eventPhase === 3 ? '(BUBBLING)' : '(NONE)');
          console.log('  - target:', e.target?.tagName, e.target?.className);
        }
        if (e.dataTransfer && e.dataTransfer.types) {
          diagnostics.dataTransferTypes = Array.from(e.dataTransfer.types);
        }
      }`;
}

/**
 * Build the drop handler script fragment
 * @returns {string} JS source for drop diagnostics
 */
function buildDropHandler() {
  return `
      function diagnosticDrop(e) {
        diagnostics.dropCount++;
        console.log('🔬 DIAGNOSTIC DROP EVENT #' + diagnostics.dropCount);
        var dropTypes = e.dataTransfer ? Array.from(e.dataTransfer.types) : 'null';
        console.log('  - dataTransfer.types:', dropTypes);
        console.log('  - dataTransfer.files.length:', e.dataTransfer?.files?.length || 0);
        console.log('  - defaultPrevented:', e.defaultPrevented);
        console.log('  - eventPhase:', e.eventPhase,
            e.eventPhase === 1 ? '(CAPTURING)' :
            e.eventPhase === 2 ? '(AT_TARGET)' :
            e.eventPhase === 3 ? '(BUBBLING)' : '(NONE)');
        console.log('  - target:', e.target?.tagName, e.target?.className);
        if (e.dataTransfer?.files?.length > 0) {
          console.log('  - Files dropped:');
          for (var i = 0; i < e.dataTransfer.files.length; i++) {
            var file = e.dataTransfer.files[i];
            console.log('    ' + i + ': ' + file.name +
              ' (' + file.type + ', ' + file.size + ' bytes)');
          }
        }
      }`;
}

/**
 * Build the monitor/bubble listener setup script
 * @returns {string} JS source for event monitors
 */
function buildMonitorSetup() {
  return `
      document.addEventListener('dragover', diagnosticDragOver, true);
      document.addEventListener('drop', diagnosticDrop, true);

      document.addEventListener('dragover', function(e) {
        if (diagnostics.dragoverCount % 10 === 0) {
          var status = e.defaultPrevented ? 'PREVENTED' : 'active';
          console.log('🔬 DIAGNOSTIC dragover (BUBBLE):', status);
        }
      }, false);

      document.addEventListener('drop', function(e) {
        var dropStatus = e.defaultPrevented ? 'PREVENTED' : 'active';
        console.log('🔬 DIAGNOSTIC drop (BUBBLE):', dropStatus);
      }, false);

      var origRemove = document.removeEventListener.bind(document);
      document.removeEventListener = function(type, listener, options) {
        if (type === 'dragover' || type === 'drop') {
          console.log('⚠️  DIAGNOSTIC: removeEventListener for', type);
        }
        return origRemove(type, listener, options);
      };

      console.log('✅ Diagnostic handlers attached');

      setTimeout(function() {
        console.log('🔬 Checking for Kizuku drag-drop handlers...');
        console.log('  - window.__kizukuDragDrop:', !!window.__kizukuDragDrop);
        if (window.__kizukuDragDrop) {
          console.log('  - attached:', window.__kizukuDragDrop.isAttached);
        }
      }, 2000);`;
}

/**
 * Create the full drag-drop diagnostic script
 * @returns {string} Complete diagnostic script
 */
function createDragDropDiagnostic() {
  return `(function() {
      'use strict';
      console.log('🔬 Kizuku Drag-Drop Diagnostic Tool Starting...');
      if (window.self !== window.top) { return; }
      var diagnostics = {
        dragoverCount: 0, dropCount: 0,
        eventPhases: [], handlers: [], dataTransferTypes: []
      };
      window.__kizukuDragDropDiagnostics = diagnostics;
${buildDragOverHandler()}
${buildDropHandler()}
${buildMonitorSetup()}
    })();`;
}

module.exports = {
  createDragDropDiagnostic,
};
