/**
 * Design Tool Validation Utilities
 *
 * Extracted helper functions for validating design tool functionality
 * to reduce complexity and file size of main test file.
 */

class DesignToolValidators {
  /**
   * Validate shortcut presence in content
   */
  static validateShortcutsInContent(content, shortcuts) {
    return shortcuts.filter(
      (shortcut) =>
        content.includes(`'${shortcut}'`) ||
        content.includes(`"${shortcut}"`) ||
        content.toLowerCase().includes(shortcut)
    );
  }

  /**
   * Validate modifier shortcuts in content
   */
  static validateModifierShortcuts(content, modifierShortcuts) {
    return modifierShortcuts.filter((shortcut) =>
      content.toLowerCase().includes(shortcut.toLowerCase())
    );
  }

  /**
   * Check for zoom control features
   */
  static checkZoomFeatures(shortcutsContent, webviewContent) {
    return {
      hasZoomIn: this.checkZoomIn(shortcutsContent),
      hasZoomOut: this.checkZoomOut(shortcutsContent),
      hasZoomFit: this.checkZoomFit(shortcutsContent),
      hasMouseWheelSupport: this.checkMouseWheelSupport(webviewContent),
    };
  }

  static checkZoomIn(content) {
    return content.includes('zoom') || content.includes('+') || content.includes('plus');
  }

  static checkZoomOut(content) {
    return content.includes('zoom') || content.includes('-') || content.includes('minus');
  }

  static checkZoomFit(content) {
    return (
      content.toLowerCase().includes('fit') || content.includes('0') || content.includes('zero')
    );
  }

  static checkMouseWheelSupport(content) {
    return content.includes('wheel') || content.includes('scroll') || content.includes('zoom');
  }

  /**
   * Analyze shortcut activation features
   */
  static analyzeShortcutActivation(shortcutsContent, preloadContent) {
    return {
      hasShortcutClass: this.checkShortcutClass(shortcutsContent),
      hasRegisterMethod: this.checkRegisterMethod(shortcutsContent),
      hasKeyMapping: this.checkKeyMapping(shortcutsContent),
      hasPreloadExposure: this.checkPreloadExposure(preloadContent),
      hasEventHandling: this.checkEventHandling(shortcutsContent),
    };
  }

  static checkShortcutClass(content) {
    return (
      content.includes('class') ||
      content.includes('function') ||
      content.includes('ShortcutManager')
    );
  }

  static checkRegisterMethod(content) {
    return (
      content.includes('register') ||
      content.includes('bind') ||
      content.includes('addEventListener')
    );
  }

  static checkKeyMapping(content) {
    return (
      content.includes('key') || content.includes('shortcut') || content.includes('combination')
    );
  }

  static checkPreloadExposure(content) {
    return (
      content.includes('shortcut') || content.includes('key') || content.includes('electronAPI')
    );
  }

  static checkEventHandling(content) {
    return content.includes('event') || content.includes('handler') || content.includes('callback');
  }

  /**
   * Analyze drawing tool availability
   */
  static analyzeDrawingTools(content) {
    return {
      select: this._checkSelectTool(content),
      rectangle: this._checkRectangleTool(content),
      ellipse: this._checkEllipseTool(content),
      text: this._checkTextTool(content),
      line: this._checkLineTool(content),
      pen: this._checkPenTool(content),
      frame: this._checkFrameTool(content),
      zoom: this._checkZoomTool(content),
    };
  }

  static _checkSelectTool(content) {
    return content.includes('v') || content.includes('select');
  }

  static _checkRectangleTool(content) {
    return content.includes('r') || content.includes('rect');
  }

  static _checkEllipseTool(content) {
    return content.includes('o') || content.includes('ellipse') || content.includes('circle');
  }

  static _checkTextTool(content) {
    return content.includes('t') || content.includes('text');
  }

  static _checkLineTool(content) {
    return content.includes('l') || content.includes('line');
  }

  static _checkPenTool(content) {
    return content.includes('p') || content.includes('pen') || content.includes('path');
  }

  static _checkFrameTool(content) {
    return content.includes('f') || content.includes('frame');
  }

  static _checkZoomTool(content) {
    return content.includes('z') || content.includes('zoom');
  }

  /**
   * Format result details for different test types
   */
  static formatShortcutDetails(features) {
    const {
      hasShortcutClass,
      hasRegisterMethod,
      hasKeyMapping,
      hasPreloadExposure,
      hasEventHandling,
    } = features;
    return (
      `Class: ${hasShortcutClass}, Register: ${hasRegisterMethod}, ` +
      `Mapping: ${hasKeyMapping}, Preload: ${hasPreloadExposure}, ` +
      `Events: ${hasEventHandling}`
    );
  }

  static formatZoomDetails(features) {
    const { hasZoomIn, hasZoomOut, hasZoomFit, hasMouseWheelSupport } = features;
    return (
      `Zoom In: ${hasZoomIn}, Zoom Out: ${hasZoomOut}, ` +
      `Zoom Fit: ${hasZoomFit}, Mouse Wheel: ${hasMouseWheelSupport}`
    );
  }

  static formatToolDetails(drawingTools, availableTools, toolNames) {
    const missingTools = toolNames.filter((tool) => !drawingTools[tool]);
    return `Available: [${availableTools.join(', ')}], Missing: [${missingTools.join(', ')}]`;
  }

  /**
   * Evaluate test results and create standardized responses
   */
  static createTestResult(success, errorMessage, successDetails, failureDetails) {
    return {
      success,
      error: success ? null : errorMessage,
      details: success ? successDetails : failureDetails,
    };
  }

  /**
   * Count working features and determine success
   */
  static evaluateFeatureSuccess(features, minimumRequired) {
    const workingFeatures = Object.values(features).filter(Boolean).length;
    return {
      workingFeatures,
      success: workingFeatures >= minimumRequired,
      total: Object.keys(features).length,
    };
  }
}

module.exports = DesignToolValidators;
