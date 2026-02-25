// Keyboard Shortcuts System for Kizuku
// Provides cross-platform shortcuts with Figma familiarity + extensibility

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.contexts = new Set(['global', 'canvas', 'text-editing']);
    this.currentContext = 'global';
    this.platform = (typeof process !== 'undefined' && process.platform) || 'linux';
    this.modifierKey = this.platform === 'darwin' ? 'cmd' : 'ctrl';

    this.setupDefaultShortcuts();
    this.bindEvents();
  }

  setupDefaultShortcuts() {
    this.setupToolShortcuts();
    this.setupNavigationShortcuts();
    this.setupUIControlShortcuts();
    this.setupFileOperationShortcuts();
    this.setupEditOperationShortcuts();
    this.setupObjectOperationShortcuts();
    this.setupLayerOrderShortcuts();
    this.setupPanelToggleShortcuts();
    this.setupViewHelperShortcuts();
    this.setupTextEditingShortcuts();
    this.setupModifierShortcuts();
  }

  setupToolShortcuts() {
    // FIGMA-STANDARD TOOL SHORTCUTS (Global Context)
    this.register('v', 'select-tool', 'global', 'Move/Select tool');
    this.register('r', 'rectangle-tool', 'global', 'Rectangle tool');
    this.register('o', 'ellipse-tool', 'global', 'Ellipse/Circle tool');
    this.register('t', 'text-tool', 'global', 'Text tool');
    this.register('l', 'line-tool', 'global', 'Line tool');
    this.register('p', 'pen-tool', 'global', 'Pen tool');
    this.register('f', 'frame-tool', 'global', 'Frame tool');
    this.register('k', 'place-image', 'global', 'Place image');
    this.register('z', 'zoom-tool', 'global', 'Zoom tool');
    this.register('h', 'hand-tool', 'global', 'Hand tool');
  }

  setupNavigationShortcuts() {
    // NAVIGATION & VIEW (Cross-platform aware)
    this.register(`${this.modifierKey}+0`, 'zoom-fit', 'global', 'Zoom to fit');
    this.register(`${this.modifierKey}+1`, 'zoom-actual', 'global', 'Actual size (100%)');
    this.register(`${this.modifierKey}+2`, 'zoom-selection', 'global', 'Zoom to selection');
    this.register(`${this.modifierKey}+plus`, 'zoom-in', 'global', 'Zoom in');
    this.register(`${this.modifierKey}+minus`, 'zoom-out', 'global', 'Zoom out');
  }

  setupUIControlShortcuts() {
    // UI CONTROLS
    this.register('tab', 'toggle-ui', 'global', 'Hide/show UI panels');
    this.register('escape', 'exit-mode', 'global', 'Exit current tool/mode');
    this.register('space', 'pan-mode', 'global', 'Pan canvas (hold)');
  }

  setupFileOperationShortcuts() {
    // FILE OPERATIONS (Platform-aware)
    this.register(`${this.modifierKey}+n`, 'new-project', 'global', 'New project');
    this.register(`${this.modifierKey}+o`, 'open-project', 'global', 'Open project');
    this.register(`${this.modifierKey}+s`, 'save-project', 'global', 'Save project');
    this.register(`${this.modifierKey}+shift+s`, 'save-as', 'global', 'Save as...');
    this.register(`${this.modifierKey}+i`, 'import-image', 'global', 'Import image');
    this.register(`${this.modifierKey}+e`, 'export-selection', 'global', 'Export selection');
  }

  setupEditOperationShortcuts() {
    // EDIT OPERATIONS with Kizuku clipboard integration
    this.register(`${this.modifierKey}+z`, 'undo', 'canvas', 'Undo');
    this.register(
      this.platform === 'darwin' ? `${this.modifierKey}+shift+z` : `ctrl+y`,
      'redo',
      'canvas',
      'Redo'
    );

    // Clipboard operations with Kizuku desktop integration
    this.register(`${this.modifierKey}+c`, 'copy', 'canvas', 'Copy selection');
    this.register(`${this.modifierKey}+v`, 'paste', 'canvas', 'Paste from clipboard');
    this.register(`${this.modifierKey}+x`, 'cut', 'canvas', 'Cut selection');
    this.register(`${this.modifierKey}+a`, 'select-all', 'canvas', 'Select all');
    this.register(`${this.modifierKey}+shift+v`, 'paste-in-place', 'canvas', 'Paste in place');
    this.register(`${this.modifierKey}+d`, 'duplicate', 'canvas', 'Duplicate');
    this.register(`${this.modifierKey}+shift+a`, 'select-none', 'canvas', 'Select none');
  }

  setupObjectOperationShortcuts() {
    // OBJECT OPERATIONS (Platform-aware)
    this.register(`${this.modifierKey}+g`, 'group', 'global', 'Group selection');
    this.register(`${this.modifierKey}+shift+g`, 'ungroup', 'global', 'Ungroup selection');
    this.register(`${this.modifierKey}+l`, 'lock', 'global', 'Lock objects');
    this.register(`${this.modifierKey}+shift+l`, 'unlock', 'global', 'Unlock objects');
    this.register(`${this.modifierKey}+h`, 'hide', 'global', 'Hide objects');
    this.register(`${this.modifierKey}+shift+h`, 'show', 'global', 'Show objects');
  }

  setupLayerOrderShortcuts() {
    // LAYER ORDER (Platform-aware)
    this.register(`${this.modifierKey}+shift+]`, 'bring-to-front', 'global', 'Bring to front');
    this.register(`${this.modifierKey}+]`, 'bring-forward', 'global', 'Bring forward');
    this.register(`${this.modifierKey}+[`, 'send-backward', 'global', 'Send backward');
    this.register(`${this.modifierKey}+shift+[`, 'send-to-back', 'global', 'Send to back');
  }

  setupPanelToggleShortcuts() {
    // PANEL TOGGLES
    this.register('f7', 'toggle-layers', 'global', 'Toggle layers panel');
    this.register('f8', 'toggle-assets', 'global', 'Toggle assets panel');
    this.register('f9', 'toggle-properties', 'global', 'Toggle properties panel');
  }

  setupViewHelperShortcuts() {
    // VIEW HELPERS (Platform-aware)
    this.register(`${this.modifierKey}+'`, 'toggle-grid', 'global', 'Show/hide grid');
    this.register(`${this.modifierKey}+r`, 'toggle-rulers', 'global', 'Show/hide rulers');
    this.register(`${this.modifierKey}+.`, 'toggle-ui', 'global', 'Show/hide UI');
  }

  setupTextEditingShortcuts() {
    // TEXT EDITING CONTEXT
    this.register('enter', 'start-text-edit', 'global', 'Edit selected text');
    this.register('escape', 'exit-text-edit', 'text-editing', 'Exit text editing');
  }

  setupModifierShortcuts() {
    // These are handled in mouse events, not keydown
    this.modifierShortcuts = {
      shift: 'constrain-proportions', // Shift+drag for squares/circles
      alt: 'duplicate-drag', // Alt+drag to duplicate
      [`${this.modifierKey}`]: 'multi-select', // Cmd/Ctrl+click for multi-select
    };
  }

  register(shortcut, action, context = 'global', description = '') {
    const key = `${context}:${shortcut.toLowerCase()}`;
    this.shortcuts.set(key, {
      action,
      context,
      description,
      shortcut: shortcut.toLowerCase(),
    });
  }

  unregister(shortcut, context = 'global') {
    const key = `${context}:${shortcut.toLowerCase()}`;
    this.shortcuts.delete(key);
  }

  setContext(context) {
    if (this.contexts.has(context)) {
      this.currentContext = context;
      console.log(`Shortcut context changed to: ${context}`);
    }
  }

  handleKeyDown(event) {
    const shortcut = this.buildShortcutString(event);
    const globalKey = `global:${shortcut}`;
    const contextKey = `${this.currentContext}:${shortcut}`;

    // Check context-specific shortcuts first, then global
    const shortcutData = this.shortcuts.get(contextKey) || this.shortcuts.get(globalKey);

    if (shortcutData) {
      // Only prevent default for custom shortcuts, not basic editing
      const isBasicEdit = this.isBasicEditShortcut(shortcut);
      if (!isBasicEdit) {
        event.preventDefault();
        event.stopPropagation();
      }

      console.log(`Shortcut triggered: ${shortcut} -> ${shortcutData.action}`);
      this.executeAction(shortcutData.action, event);
      return true;
    }

    return false;
  }

  isBasicEditShortcut(shortcut) {
    // These shortcuts need custom handling through Kizuku clipboard API
    // Don't prevent default - let them be processed by our handlers
    const kizukuManagedShortcuts = [
      `${this.modifierKey}+v`, // paste
      `${this.modifierKey}+a`, // select all
      `${this.modifierKey}+c`, // copy
      `${this.modifierKey}+x`, // cut
    ];
    return kizukuManagedShortcuts.includes(shortcut);
  }

  buildShortcutString(event) {
    const parts = [];
    this.addModifiers(parts, event);
    this.addMainKey(parts, event);
    return parts.join('+');
  }

  addModifiers(parts, event) {
    this.addControlModifier(parts, event);
    this.addCmdModifier(parts, event);
    if (event.altKey) {
      parts.push('alt');
    }
    if (event.shiftKey) {
      parts.push('shift');
    }
  }

  addControlModifier(parts, event) {
    if (event.ctrlKey && this.platform !== 'darwin') {
      parts.push('ctrl');
    }
  }

  addCmdModifier(parts, event) {
    if (event.metaKey && this.platform === 'darwin') {
      parts.push('cmd');
    }
  }

  addMainKey(parts, event) {
    const key = event.key.toLowerCase();
    if (this.isModifierKey(key)) {
      return;
    }
    parts.push(this.mapSpecialKey(key));
  }

  isModifierKey(key) {
    return ['control', 'meta', 'alt', 'shift'].includes(key);
  }

  mapSpecialKey(key) {
    const keyMap = {
      ' ': 'space',
      arrowup: 'up',
      arrowdown: 'down',
      arrowleft: 'left',
      arrowright: 'right',
      '+': 'plus',
      '-': 'minus',
      '=': 'plus',
      "'": "'",
    };
    return keyMap[key] || key;
  }

  executeAction(action, event) {
    this.sendToElectronAPI(action);
    this.dispatchPenpotEvent(action, event);
    this.callDirectHandler(action, event);
  }

  sendToElectronAPI(action) {
    if (window.electronAPI) {
      window.electronAPI.onMenuAction?.(action);
    }
  }

  dispatchPenpotEvent(action, event) {
    const customEvent = new CustomEvent('penpot-shortcut', {
      detail: {
        action,
        originalEvent: event,
        context: this.currentContext,
        platform: this.platform,
      },
    });
    document.dispatchEvent(customEvent);
  }

  callDirectHandler(action, event) {
    if (window.kizuku?.shortcutActions?.[action]) {
      window.kizuku.shortcutActions[action](event);
    }
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    // Handle modifier key releases for temporary modes
    document.addEventListener('keyup', (event) => {
      if (event.key === ' ') {
        // Release pan mode
        this.executeAction('pan-mode-end', event);
      }
    });
  }

  getShortcutsList(context = null) {
    const list = [];
    for (const [, data] of this.shortcuts) {
      if (!context || data.context === context) {
        list.push({
          shortcut: data.shortcut,
          action: data.action,
          context: data.context,
          description: data.description,
        });
      }
    }
    return list.sort((a, b) => a.shortcut.localeCompare(b.shortcut));
  }

  // Helper function for Kizuku to register custom shortcuts
  registerCustomShortcut(shortcut, action, description = '', context = 'global') {
    this.register(shortcut, action, context, description);
  }
}

// Export for use in preload
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShortcutManager;
}

// Initialize if in browser context - DISABLED FOR DEBUGGING
// TODO: Enable when debugging is complete
/*
if (typeof window !== 'undefined') {
  window.shortcutManager = new ShortcutManager();

  // Helper function for Kizuku to register shortcut handlers
  window.registerShortcutHandler = function (action, handler) {
    if (!window.kizuku) {
      window.kizuku = {};
    }
    if (!window.kizuku.shortcutActions) {
      window.kizuku.shortcutActions = {};
    }
    window.kizuku.shortcutActions[action] = handler;
  };
}
*/

module.exports = ShortcutManager;
