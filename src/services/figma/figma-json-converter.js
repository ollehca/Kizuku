/**
 * Figma JSON to PenPot Converter
 * Converts Figma REST API JSON into PenPot-compatible format
 *
 * This converter works with Figma's JSON structure (from REST API or parsed .fig files)
 * and transforms it into a format that can be imported by PenPot/Kizu.
 *
 * Architecture:
 * - Figma JSON → Node Transformers → PenPot Library → .penpot file
 */

const { createLogger } = require('../../utils/logger');
const EventEmitter = require('events');
const mockBackend = require('../penpot-mock-backend');

const logger = createLogger('FigmaJSONConverter');

/**
 * Node type mapping from Figma to PenPot
 */
const NODE_TYPE_MAP = {
  DOCUMENT: 'document',
  CANVAS: 'page',
  FRAME: 'frame',
  GROUP: 'group',
  VECTOR: 'path',
  BOOLEAN_OPERATION: 'bool',
  STAR: 'path',
  LINE: 'path',
  ELLIPSE: 'circle',
  REGULAR_POLYGON: 'path',
  RECTANGLE: 'rect',
  TEXT: 'text',
  SLICE: 'frame',
  COMPONENT: 'component',
  COMPONENT_SET: 'component',
  INSTANCE: 'instance',
};

/**
 * FigmaJSONConverter class
 * Handles conversion of Figma JSON to PenPot format
 */
class FigmaJSONConverter extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      totalNodes: 0,
      convertedNodes: 0,
      skippedNodes: 0,
      errors: [],
      warnings: [],
      unsupportedFeatures: new Set(),
    };
    // Map Figma IDs (e.g., "0:1", "1:2") to proper UUIDs for PenPot
    this.figmaIdToUuid = new Map();
  }

  /**
   * Get or generate a UUID for a Figma ID
   * This ensures consistent ID mapping across parent-child relationships
   * @param {string} figmaId - Figma node ID (e.g., "0:1", "1:2")
   * @returns {string} UUID compatible with PenPot
   */
  getOrCreateUuid(figmaId) {
    if (!figmaId) {
      return this.generateId();
    }
    if (!this.figmaIdToUuid.has(figmaId)) {
      this.figmaIdToUuid.set(figmaId, this.generateId());
    }
    return this.figmaIdToUuid.get(figmaId);
  }

  /**
   * Convert Figma document JSON to .kizu format
   * @param {object} figmaDocument - Figma document from REST API
   * @param {object} metadata - Optional metadata for the project
   * @returns {Promise<object>} .kizu project structure
   */
  async convert(figmaDocument, metadata = {}) {
    logger.info('Starting conversion', {
      name: figmaDocument.name,
      version: figmaDocument.version,
    });

    this.resetStats();

    try {
      // Transform document root to .kizu format
      const kizuProject = await this.transformToKizuProject(figmaDocument, metadata);

      const compatibilityScore = this.calculateCompatibilityScore();

      logger.info('Conversion completed', {
        stats: this.stats,
        compatibilityScore,
      });

      return {
        project: kizuProject,
        stats: { ...this.stats, unsupportedFeatures: Array.from(this.stats.unsupportedFeatures) },
        compatibilityScore,
      };
    } catch (error) {
      logger.error('Conversion failed', { error });
      throw error;
    }
  }

  /**
   * Transform Figma document to .kizu project format
   * @param {object} figmaDoc - Figma document object
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} .kizu project
   */
  async transformToKizuProject(figmaDoc, metadata = {}) {
    const now = new Date().toISOString();
    const projectId = this.generateId();

    // Get team-id from user profile (for workspace navigation)
    // This is optional - only needed when running in full Electron context
    let teamId = null;
    try {
      const profile = await mockBackend.getMockProfile();
      teamId = profile['default-team-id'];
    } catch {
      // Running outside Electron context (e.g., in tests)
      // Generate a default team ID
      logger.warn('Could not get mock profile, using generated team ID');
      teamId = this.generateId();
    }

    const project = {
      version: '1.0.0',
      type: 'kizu-project',
      metadata: {
        id: projectId,
        teamId: teamId, // Add team-id for workspace navigation
        name: metadata.name || figmaDoc.name || 'Imported from Figma',
        description:
          metadata.description || `Imported from Figma on ${new Date().toLocaleDateString()}`,
        author: metadata.author || { name: 'Anonymous', email: '' },
        tags: metadata.tags || ['figma-import'],
        customData: {
          originalFigmaName: figmaDoc.name,
          figmaVersion: figmaDoc.version,
          importDate: now,
        },
        created: now,
        modified: now,
        license: metadata.license || 'private',
      },
      settings: {
        canvas: {
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        },
        grid: {
          enabled: true,
          size: 8,
          color: '#e0e0e0',
        },
        units: 'px',
      },
      data: {
        pages: [],
        components: [],
        colorLibrary: [],
        typographyLibrary: [],
      },
      assets: {
        images: [],
        fonts: [],
        media: [],
      },
      history: {
        enabled: true,
        maxEntries: 100,
        entries: [],
      },
    };

    // Process all canvases (pages in Kizu)
    if (figmaDoc.document && figmaDoc.document.children) {
      for (const canvas of figmaDoc.document.children) {
        if (canvas.type === 'CANVAS') {
          const page = await this.transformCanvas(canvas);
          project.data.pages.push(page);
        }
      }
    }

    // Extract components
    this.extractComponents(figmaDoc, project.data.components);

    // Extract color library
    this.extractColorLibrary(figmaDoc, project.data.colorLibrary);

    // Extract typography library
    this.extractTypographyLibrary(figmaDoc, project.data.typographyLibrary);

    return project;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    // Use proper UUID format that PenPot expects
    // PenPot's workspace component validates that file-id is a valid UUID
    const crypto = require('crypto');
    return crypto.randomUUID();
  }

  /**
   * Transform canvas (page) node
   * @param {object} figmaCanvas - Figma canvas node
   * @returns {Promise<object>} PenPot page
   */
  async transformCanvas(figmaCanvas) {
    const page = {
      id: this.getOrCreateUuid(figmaCanvas.id),
      name: figmaCanvas.name || 'Untitled Page',
      type: 'page',
      children: [],
    };

    // Process all children
    if (figmaCanvas.children) {
      for (const child of figmaCanvas.children) {
        const converted = await this.transformNode(child);
        if (converted) {
          page.children.push(converted);
        }
      }
    }

    return page;
  }

  /**
   * Transform any Figma node to PenPot equivalent
   * @param {object} figmaNode - Figma node
   * @returns {Promise<object|null>} PenPot node or null if unsupported
   */
  async transformNode(figmaNode) {
    this.stats.totalNodes++;

    try {
      // Route to appropriate transformer based on type
      switch (figmaNode.type) {
        case 'FRAME':
        case 'GROUP':
          return await this.transformFrame(figmaNode);

        case 'RECTANGLE':
          return await this.transformRectangle(figmaNode);

        case 'ELLIPSE':
          return await this.transformEllipse(figmaNode);

        case 'TEXT':
          return await this.transformText(figmaNode);

        case 'VECTOR':
        case 'STAR':
        case 'LINE':
        case 'REGULAR_POLYGON':
          return await this.transformVector(figmaNode);

        case 'BOOLEAN_OPERATION':
          return await this.transformBoolean(figmaNode);

        case 'COMPONENT':
          return await this.transformComponent(figmaNode);

        case 'INSTANCE':
          return await this.transformInstance(figmaNode);

        case 'COMPONENT_SET':
          return await this.transformComponentSet(figmaNode);

        default:
          this.addWarning(`Unsupported node type: ${figmaNode.type}`, figmaNode);
          this.stats.skippedNodes++;
          return null;
      }
    } catch (error) {
      this.addError(`Failed to transform node: ${error.message}`, figmaNode);
      this.stats.skippedNodes++;
      return null;
    }
  }

  /**
   * Transform frame or group node
   * @param {object} figmaNode - Figma frame/group node
   * @returns {Promise<object>} PenPot frame
   */
  async transformFrame(figmaNode) {
    const frame = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: figmaNode.type === 'GROUP' ? 'group' : 'frame',
      ...this.transformCommonProperties(figmaNode),
      children: [],
    };

    // Transform auto-layout properties if present
    if (figmaNode.layoutMode && figmaNode.layoutMode !== 'NONE') {
      frame.layout = this.transformAutoLayout(figmaNode);
    }

    // Process children
    if (figmaNode.children) {
      for (const child of figmaNode.children) {
        const converted = await this.transformNode(child);
        if (converted) {
          frame.children.push(converted);
        }
      }
    }

    this.stats.convertedNodes++;
    return frame;
  }

  /**
   * Transform rectangle node
   * @param {object} figmaNode - Figma rectangle
   * @returns {object} PenPot rectangle
   */
  async transformRectangle(figmaNode) {
    const rect = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'rect',
      ...this.transformCommonProperties(figmaNode),
      cornerRadius: figmaNode.cornerRadius || 0,
      rx: figmaNode.topLeftRadius || figmaNode.cornerRadius || 0,
      ry: figmaNode.topRightRadius || figmaNode.cornerRadius || 0,
    };

    this.stats.convertedNodes++;
    return rect;
  }

  /**
   * Transform ellipse node
   * @param {object} figmaNode - Figma ellipse
   * @returns {object} PenPot circle
   */
  async transformEllipse(figmaNode) {
    const circle = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'circle',
      ...this.transformCommonProperties(figmaNode),
    };

    this.stats.convertedNodes++;
    return circle;
  }

  /**
   * Transform text node
   * @param {object} figmaNode - Figma text node
   * @returns {object} PenPot text
   */
  async transformText(figmaNode) {
    const text = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'text',
      ...this.transformCommonProperties(figmaNode),
      content: figmaNode.characters || '',
      fontSize: figmaNode.style?.fontSize || 16,
      fontFamily: figmaNode.style?.fontFamily || 'Arial',
      fontWeight: figmaNode.style?.fontWeight || 'normal',
      textAlign: this.transformTextAlign(figmaNode.style?.textAlignHorizontal),
      lineHeight: figmaNode.style?.lineHeightPx || 'auto',
    };

    this.stats.convertedNodes++;
    return text;
  }

  /**
   * Transform vector node (paths, lines, stars, polygons)
   * @param {object} figmaNode - Figma vector node
   * @returns {object} PenPot path
   */
  async transformVector(figmaNode) {
    const vector = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'path',
      ...this.transformCommonProperties(figmaNode),
      // TODO: Parse and transform vector paths from fillGeometry
      commands: [],
    };

    if (figmaNode.type === 'LINE') {
      // Transform line to path
      vector.commands = this.transformLineToPath(figmaNode);
    }

    // Note: Full vector path transformation requires more complex logic
    // This is a simplified version
    if (!vector.commands.length) {
      this.addWarning('Vector path conversion incomplete', figmaNode);
      this.stats.unsupportedFeatures.add('complex-vectors');
    }

    this.stats.convertedNodes++;
    return vector;
  }

  /**
   * Transform boolean operation node
   * @param {object} figmaNode - Figma boolean node
   * @returns {Promise<object>} PenPot boolean group
   */
  async transformBoolean(figmaNode) {
    const bool = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'bool',
      ...this.transformCommonProperties(figmaNode),
      boolType: this.transformBooleanType(figmaNode.booleanOperation),
      children: [],
    };

    // Process children
    if (figmaNode.children) {
      for (const child of figmaNode.children) {
        const converted = await this.transformNode(child);
        if (converted) {
          bool.children.push(converted);
        }
      }
    }

    this.stats.convertedNodes++;
    return bool;
  }

  /**
   * Transform component node
   * @param {object} figmaNode - Figma component
   * @returns {Promise<object>} PenPot component
   */
  async transformComponent(figmaNode) {
    const component = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'component',
      ...this.transformCommonProperties(figmaNode),
      children: [],
    };

    // Process children
    if (figmaNode.children) {
      for (const child of figmaNode.children) {
        const converted = await this.transformNode(child);
        if (converted) {
          component.children.push(converted);
        }
      }
    }

    this.stats.convertedNodes++;
    return component;
  }

  /**
   * Transform component instance node
   * @param {object} figmaNode - Figma instance
   * @returns {object} PenPot instance
   */
  async transformInstance(figmaNode) {
    const instance = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'instance',
      ...this.transformCommonProperties(figmaNode),
      componentId: this.getOrCreateUuid(figmaNode.componentId),
    };

    this.stats.convertedNodes++;
    return instance;
  }

  /**
   * Transform component set node
   * @param {object} figmaNode - Figma component set
   * @returns {Promise<object>} PenPot component set
   */
  async transformComponentSet(figmaNode) {
    // Component sets become component groups in PenPot
    const componentSet = {
      id: this.getOrCreateUuid(figmaNode.id),
      name: figmaNode.name,
      type: 'component-set',
      ...this.transformCommonProperties(figmaNode),
      children: [],
    };

    // Process children
    if (figmaNode.children) {
      for (const child of figmaNode.children) {
        const converted = await this.transformNode(child);
        if (converted) {
          componentSet.children.push(converted);
        }
      }
    }

    this.stats.convertedNodes++;
    return componentSet;
  }

  /**
   * Transform common properties shared by all nodes
   * @param {object} figmaNode - Figma node
   * @returns {object} Common properties
   */
  transformCommonProperties(figmaNode) {
    const props = {
      // Position and size
      x: figmaNode.absoluteBoundingBox?.x || 0,
      y: figmaNode.absoluteBoundingBox?.y || 0,
      width: figmaNode.absoluteBoundingBox?.width || 0,
      height: figmaNode.absoluteBoundingBox?.height || 0,

      // Visibility
      visible: figmaNode.visible !== false,
      opacity: figmaNode.opacity ?? 1,

      // Rotation
      rotation: figmaNode.rotation || 0,

      // Fills
      fills: this.transformFills(figmaNode.fills),

      // Strokes
      strokes: this.transformStrokes(figmaNode.strokes),
      strokeWeight: figmaNode.strokeWeight || 0,

      // Effects
      effects: this.transformEffects(figmaNode.effects),

      // Blend mode
      blendMode: this.transformBlendMode(figmaNode.blendMode),

      // Constraints
      constraints: this.transformConstraints(figmaNode.constraints),
    };

    return props;
  }

  /**
   * Transform fills
   * @param {array} figmaFills - Figma fills
   * @returns {array} PenPot fills
   */
  transformFills(figmaFills) {
    if (!figmaFills || !figmaFills.length) {
      return [];
    }

    return figmaFills
      .filter((fill) => fill.visible !== false)
      .map((fill) => {
        switch (fill.type) {
          case 'SOLID':
            return {
              type: 'color',
              color: this.transformColor(fill.color),
              opacity: fill.opacity ?? 1,
            };

          case 'GRADIENT_LINEAR':
          case 'GRADIENT_RADIAL':
          case 'GRADIENT_ANGULAR':
          case 'GRADIENT_DIAMOND':
            return {
              type: 'gradient',
              gradient: this.transformGradient(fill),
              opacity: fill.opacity ?? 1,
            };

          case 'IMAGE':
            this.stats.unsupportedFeatures.add('image-fills');
            this.addWarning('Image fills require special handling');
            return null;

          default:
            this.addWarning(`Unsupported fill type: ${fill.type}`);
            return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Transform strokes
   * @param {array} figmaStrokes - Figma strokes
   * @returns {array} PenPot strokes
   */
  transformStrokes(figmaStrokes) {
    if (!figmaStrokes || !figmaStrokes.length) {
      return [];
    }

    return figmaStrokes
      .filter((stroke) => stroke.visible !== false)
      .map((stroke) => ({
        type: 'color',
        color: this.transformColor(stroke.color),
        opacity: stroke.opacity ?? 1,
      }));
  }

  /**
   * Transform effects (shadows, blurs)
   * @param {array} figmaEffects - Figma effects
   * @returns {array} PenPot effects
   */
  transformEffects(figmaEffects) {
    if (!figmaEffects || !figmaEffects.length) {
      return [];
    }

    return figmaEffects
      .filter((effect) => effect.visible !== false)
      .map((effect) => {
        switch (effect.type) {
          case 'DROP_SHADOW':
          case 'INNER_SHADOW':
            return {
              type: effect.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow',
              color: this.transformColor(effect.color),
              offsetX: effect.offset?.x || 0,
              offsetY: effect.offset?.y || 0,
              blur: effect.radius || 0,
              spread: effect.spread || 0,
            };

          case 'LAYER_BLUR':
          case 'BACKGROUND_BLUR':
            return {
              type: 'blur',
              value: effect.radius || 0,
            };

          default:
            this.addWarning(`Unsupported effect type: ${effect.type}`);
            return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Transform color from Figma to PenPot format
   * @param {object} figmaColor - Figma color (RGBA)
   * @returns {string} PenPot color (hex or rgba)
   */
  transformColor(figmaColor) {
    if (!figmaColor) {
      return '#000000';
    }

    const r = Math.round((figmaColor.r || 0) * 255);
    const g = Math.round((figmaColor.g || 0) * 255);
    const b = Math.round((figmaColor.b || 0) * 255);
    const a = figmaColor.a ?? 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    // Convert to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Transform gradient
   * @param {object} figmaGradient - Figma gradient fill
   * @returns {object} PenPot gradient
   */
  transformGradient(figmaGradient) {
    const gradient = {
      type: figmaGradient.type.replace('GRADIENT_', '').toLowerCase(),
      stops: [],
    };

    if (figmaGradient.gradientStops) {
      gradient.stops = figmaGradient.gradientStops.map((stop) => ({
        position: stop.position,
        color: this.transformColor(stop.color),
      }));
    }

    return gradient;
  }

  /**
   * Transform auto layout properties
   * @param {object} figmaNode - Figma node with auto layout
   * @returns {object} PenPot layout properties
   */
  transformAutoLayout(figmaNode) {
    return {
      mode: figmaNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
      gap: figmaNode.itemSpacing || 0,
      padding: {
        top: figmaNode.paddingTop || 0,
        right: figmaNode.paddingRight || 0,
        bottom: figmaNode.paddingBottom || 0,
        left: figmaNode.paddingLeft || 0,
      },
      align: figmaNode.primaryAxisAlignItems || 'MIN',
      justify: figmaNode.counterAxisAlignItems || 'MIN',
    };
  }

  /**
   * Transform blend mode
   * @param {string} figmaBlendMode - Figma blend mode
   * @returns {string} PenPot blend mode
   */
  transformBlendMode(figmaBlendMode) {
    if (!figmaBlendMode || figmaBlendMode === 'PASS_THROUGH' || figmaBlendMode === 'NORMAL') {
      return 'normal';
    }

    // Map Figma blend modes to PenPot
    const blendModeMap = {
      DARKEN: 'darken',
      MULTIPLY: 'multiply',
      COLOR_BURN: 'color-burn',
      LIGHTEN: 'lighten',
      SCREEN: 'screen',
      COLOR_DODGE: 'color-dodge',
      OVERLAY: 'overlay',
      SOFT_LIGHT: 'soft-light',
      HARD_LIGHT: 'hard-light',
      DIFFERENCE: 'difference',
      EXCLUSION: 'exclusion',
      HUE: 'hue',
      SATURATION: 'saturation',
      COLOR: 'color',
      LUMINOSITY: 'luminosity',
    };

    const mode = blendModeMap[figmaBlendMode];
    if (!mode) {
      this.addWarning(`Unsupported blend mode: ${figmaBlendMode}, using normal`);
      this.stats.unsupportedFeatures.add(`blend-mode-${figmaBlendMode}`);
      return 'normal';
    }

    return mode;
  }

  /**
   * Transform constraints
   * @param {object} figmaConstraints - Figma constraints
   * @returns {object} PenPot constraints
   */
  transformConstraints(figmaConstraints) {
    if (!figmaConstraints) {
      return { horizontal: 'MIN', vertical: 'MIN' };
    }

    return {
      horizontal: figmaConstraints.horizontal || 'MIN',
      vertical: figmaConstraints.vertical || 'MIN',
    };
  }

  /**
   * Transform text alignment
   * @param {string} figmaAlign - Figma text align
   * @returns {string} PenPot text align
   */
  transformTextAlign(figmaAlign) {
    const alignMap = {
      LEFT: 'left',
      CENTER: 'center',
      RIGHT: 'right',
      JUSTIFIED: 'justify',
    };

    return alignMap[figmaAlign] || 'left';
  }

  /**
   * Transform boolean operation type
   * @param {string} figmaOp - Figma boolean operation
   * @returns {string} PenPot boolean type
   */
  transformBooleanType(figmaOp) {
    const opMap = {
      UNION: 'union',
      INTERSECT: 'intersection',
      SUBTRACT: 'difference',
      EXCLUDE: 'exclusion',
    };

    return opMap[figmaOp] || 'union';
  }

  /**
   * Transform line to path commands
   * @param {object} figmaLine - Figma line node
   * @returns {array} Path commands
   */
  transformLineToPath(figmaLine) {
    // Simplified line to path conversion
    return [
      { command: 'M', x: 0, y: 0 },
      { command: 'L', x: figmaLine.absoluteBoundingBox?.width || 0, y: 0 },
    ];
  }

  /**
   * Add warning to stats
   * @param {string} message - Warning message
   * @param {object} node - Related Figma node
   */
  addWarning(message, node = null) {
    this.stats.warnings.push({
      message,
      nodeId: node?.id,
      nodeName: node?.name,
    });

    this.emit('warning', { message, node });
  }

  /**
   * Add error to stats
   * @param {string} message - Error message
   * @param {object} node - Related Figma node
   */
  addError(message, node = null) {
    this.stats.errors.push({
      message,
      nodeId: node?.id,
      nodeName: node?.name,
    });

    this.emit('error', { message, node });
  }

  /**
   * Calculate compatibility score based on conversion stats
   * @returns {number} Score from 0-100
   */
  calculateCompatibilityScore() {
    if (this.stats.totalNodes === 0) {
      return 0;
    }

    const baseScore = (this.stats.convertedNodes / this.stats.totalNodes) * 100;

    // Deduct points for unsupported features
    const featurePenalty = Math.min(this.stats.unsupportedFeatures.size * 2, 10);

    // Deduct points for errors
    const errorPenalty = Math.min(this.stats.errors.length, 10);

    const finalScore = Math.max(0, Math.min(100, baseScore - featurePenalty - errorPenalty));

    return Math.round(finalScore);
  }

  /**
   * Reset conversion statistics
   */
  resetStats() {
    this.stats = {
      totalNodes: 0,
      convertedNodes: 0,
      skippedNodes: 0,
      errors: [],
      warnings: [],
      unsupportedFeatures: new Set(),
    };
    // Clear the Figma ID to UUID mapping for fresh conversion
    this.figmaIdToUuid.clear();
  }

  /**
   * Get conversion statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      unsupportedFeatures: Array.from(this.stats.unsupportedFeatures),
    };
  }

  /**
   * Extract components from Figma document
   * @param {object} figmaDoc - Figma document
   * @param {array} componentsArray - Target components array
   */
  extractComponents(figmaDoc, componentsArray) {
    if (!figmaDoc.components) {
      return;
    }

    // Figma provides a components map
    for (const [componentId, component] of Object.entries(figmaDoc.components)) {
      componentsArray.push({
        id: this.getOrCreateUuid(componentId),
        name: component.name,
        description: component.description || '',
        key: component.key,
      });
    }

    logger.info('Extracted components', { count: componentsArray.length });
  }

  /**
   * Extract color library from Figma document
   * @param {object} figmaDoc - Figma document
   * @param {array} colorsArray - Target colors array
   */
  extractColorLibrary(figmaDoc, colorsArray) {
    if (!figmaDoc.styles) {
      return;
    }

    // Extract paint styles (colors)
    for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
      if (style.styleType === 'FILL') {
        colorsArray.push({
          id: this.getOrCreateUuid(styleId),
          name: style.name,
          description: style.description || '',
          // Note: Actual color values need to be extracted from the document nodes
        });
      }
    }

    logger.info('Extracted colors', { count: colorsArray.length });
  }

  /**
   * Extract typography library from Figma document
   * @param {object} figmaDoc - Figma document
   * @param {array} typographyArray - Target typography array
   */
  extractTypographyLibrary(figmaDoc, typographyArray) {
    if (!figmaDoc.styles) {
      return;
    }

    // Extract text styles
    for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
      if (style.styleType === 'TEXT') {
        typographyArray.push({
          id: this.getOrCreateUuid(styleId),
          name: style.name,
          description: style.description || '',
          // Note: Actual font properties need to be extracted from the document nodes
        });
      }
    }

    logger.info('Extracted typography', { count: typographyArray.length });
  }
}

// Singleton instance
let instance = null;

/**
 * Get FigmaJSONConverter instance
 * @returns {FigmaJSONConverter} Singleton instance
 */
function getFigmaJSONConverter() {
  if (!instance) {
    instance = new FigmaJSONConverter();
  }
  return instance;
}

module.exports = {
  FigmaJSONConverter,
  getFigmaJSONConverter,
  NODE_TYPE_MAP,
};
