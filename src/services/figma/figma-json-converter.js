/**
 * Figma JSON to PenPot Converter
 * Figma JSON → Node Transformers → PenPot Library → .penpot file
 */

const { createLogger } = require('../../utils/logger');
const EventEmitter = require('node:events');
const mockBackend = require('../penpot-mock-backend');
const styles = require('./kizuku-style-transformer');
const libExtractor = require('./kizuku-library-extractor');
const nodes = require('./kizuku-node-transformer');
const layoutTransformer = require('./kizuku-layout-transformer');
const { extractRotationDegrees } = require('./kizuku-transform-decomposer');
const { groupChildrenWithMasks } = require('./kizuku-mask-transformer');

const logger = createLogger('FigmaJSONConverter');

/** Handles conversion of Figma JSON to PenPot format */
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
    this.figmaIdToUuid = new Map();
    this.parentStack = [];
    this.dispatch = nodes.buildDispatch(this);
  }

  /**
   * Get or generate a UUID for a Figma ID
   * @param {string} figmaId - Figma node ID (e.g., "0:1")
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
   * Convert Figma document JSON to .kiz format
   * @param {object} figmaDocument - Figma document from REST API
   * @param {object} metadata - Optional metadata for the project
   * @returns {Promise<object>} .kiz project structure
   */
  async convert(figmaDocument, metadata = {}) {
    logger.info('Starting conversion', {
      name: figmaDocument.name,
      version: figmaDocument.version,
    });
    this.resetStats();
    this.coordsRelative = !!figmaDocument._coordsRelative;

    try {
      const kizukuProject = await this.transformToKizukuProject(figmaDocument, metadata);
      const score = this.calculateCompatibilityScore();
      logger.info('Conversion completed', { stats: this.stats, score });
      return {
        project: kizukuProject,
        stats: {
          ...this.stats,
          unsupportedFeatures: Array.from(this.stats.unsupportedFeatures),
        },
        compatibilityScore: score,
      };
    } catch (error) {
      logger.error('Conversion failed', { error });
      throw error;
    }
  }

  /**
   * Transform Figma document to .kiz project format
   * @param {object} figmaDoc - Figma document object
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} .kiz project
   */
  async transformToKizukuProject(figmaDoc, metadata = {}) {
    const teamId = await this.resolveTeamId();
    const project = this.createProjectSkeleton(figmaDoc, metadata, teamId);
    await this.populatePages(figmaDoc, project);
    const getUuid = (id) => this.getOrCreateUuid(id);
    libExtractor.extractComponents(figmaDoc, project.data.components, getUuid);
    libExtractor.extractColorLibrary(figmaDoc, project.data.colorLibrary, getUuid);
    libExtractor.extractTypographyLibrary(figmaDoc, project.data.typographyLibrary, getUuid);
    libExtractor.extractEffectLibrary(figmaDoc, project.data.effectLibrary, getUuid);
    this.attachExtractedImages(figmaDoc, project);
    return project;
  }

  /**
   * Resolve team ID from mock profile or generate one
   * @returns {Promise<string>} Team ID
   */
  async resolveTeamId() {
    try {
      const profile = await mockBackend.getMockProfile();
      return profile['default-team-id'];
    } catch {
      logger.warn('Could not get mock profile, using generated team ID');
      return this.generateId();
    }
  }

  /**
   * Create empty project skeleton
   * @param {object} figmaDoc - Figma document
   * @param {object} metadata - Project metadata
   * @param {string} teamId - Team ID
   * @returns {object} Project skeleton
   */
  createProjectSkeleton(figmaDoc, metadata, teamId) {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      type: 'kizuku-project',
      metadata: {
        id: this.generateId(),
        teamId,
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
        canvas: { width: 1920, height: 1080, backgroundColor: '#ffffff' },
        grid: { enabled: true, size: 8, color: '#e0e0e0' },
        units: 'px',
      },
      data: {
        pages: [],
        components: [],
        colorLibrary: [],
        typographyLibrary: [],
        effectLibrary: [],
      },
      assets: { images: [], fonts: [], media: [] },
      history: { enabled: true, maxEntries: 100, entries: [] },
    };
  }

  /**
   * Populate project pages from Figma canvases
   * @param {object} figmaDoc - Figma document
   * @param {object} project - Target project
   */
  async populatePages(figmaDoc, project) {
    const children = figmaDoc.document?.children || [];
    for (const canvas of children) {
      if (canvas.type === 'CANVAS') {
        const page = await this.transformCanvas(canvas);
        project.data.pages.push(page);
      }
    }
  }

  /**
   * Attach extracted images from .fig metadata to project assets
   * @param {object} figmaDoc - Figma document (may have _meta)
   * @param {object} project - Target project
   */
  attachExtractedImages(figmaDoc, project) {
    const images = figmaDoc._meta?.extractedImages;
    if (Array.isArray(images) && images.length > 0) {
      project.assets.images = images;
      logger.info('Attached extracted images', { count: images.length });
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    const crypto = require('node:crypto');
    return crypto.randomUUID();
  }

  /**
   * Transform canvas (page) node
   * @param {object} figmaCanvas - Figma canvas node
   * @returns {Promise<object>} PenPot page
   */
  async transformCanvas(figmaCanvas) {
    return {
      id: this.getOrCreateUuid(figmaCanvas.id),
      name: figmaCanvas.name || 'Untitled Page',
      type: 'page',
      children: await this.transformChildren(figmaCanvas.children, { x: 0, y: 0 }),
    };
  }

  /**
   * Transform any Figma node to PenPot equivalent
   * @param {object} figmaNode - Figma node
   * @returns {Promise<object|null>} PenPot node or null
   */
  async transformNode(figmaNode) {
    this.stats.totalNodes++;
    try {
      const handler = this.dispatch[figmaNode.type];
      if (!handler) {
        this.addWarning(`Unsupported node type: ${figmaNode.type}`, figmaNode);
        logger.info('[DIAG] Skipped node - no handler', {
          type: figmaNode.type,
          name: figmaNode.name,
          id: figmaNode.id,
        });
        this.stats.skippedNodes++;
        return null;
      }
      const result = await handler(figmaNode);
      return result;
    } catch (error) {
      this.addError(`Failed to transform node: ${error.message}`, figmaNode);
      logger.error('[DIAG] Node transform failed', {
        type: figmaNode.type,
        name: figmaNode.name,
        error: error.message,
      });
      this.stats.skippedNodes++;
      return null;
    }
  }

  /**
   * Transform child nodes array with parent context for relative coords
   * @param {array} children - Figma child nodes
   * @param {object} parentBbox - Parent's absoluteBoundingBox
   * @returns {Promise<array>} Converted children
   */
  async transformChildren(children, parentBbox) {
    if (!children) {
      return [];
    }
    const absParent = this.resolveAbsoluteParent(parentBbox);
    if (absParent) {
      this.parentStack.push(absParent);
    }
    const results = [];
    for (const child of children) {
      const converted = await this.transformNode(child);
      if (converted) {
        results.push(converted);
      }
    }
    if (absParent) {
      this.parentStack.pop();
    }
    return groupChildrenWithMasks(results);
  }

  /**
   * Resolve absolute parent position for the parent stack
   * @param {object} parentBbox - Parent's bounding box
   * @returns {object|null} Absolute position or null
   */
  resolveAbsoluteParent(parentBbox) {
    if (!parentBbox) {
      return null;
    }
    if (!this.coordsRelative) {
      return parentBbox;
    }
    const current = this.getParentPosition();
    return {
      x: (parentBbox.x || 0) + (current.x || 0),
      y: (parentBbox.y || 0) + (current.y || 0),
    };
  }

  /**
   * Transform common properties shared by all nodes
   * @param {object} figmaNode - Figma node
   * @returns {object} Common properties
   */
  transformCommonProperties(figmaNode) {
    const warn = (msg) => this.addWarning(msg);
    const unsupported = this.stats.unsupportedFeatures;
    return {
      ...this.transformGeometry(figmaNode),
      fills: styles.transformFills(figmaNode.fills, warn, unsupported),
      strokes: styles.transformStrokes(figmaNode.strokes, figmaNode),
      strokeWeight: figmaNode.strokeWeight || 0,
      effects: styles.transformEffects(figmaNode.effects, warn),
      blendMode: styles.transformBlendMode(figmaNode.blendMode, warn, unsupported),
      constraints: nodes.transformConstraints(figmaNode.constraints),
      clipContent: figmaNode.clipsContent ?? null,
      locked: figmaNode.locked ?? false,
      hidden: figmaNode.visible === false,
      isMask: figmaNode.isMask === true,
      styleRefs: this.mapStyleRefs(figmaNode.styles),
      exportSettings: figmaNode.exportSettings || null,
      ...this.transformLayoutProps(figmaNode),
    };
  }

  /** Get the current parent position from the stack */
  getParentPosition() {
    if (this.parentStack.length === 0) {
      return { x: 0, y: 0 };
    }
    return this.parentStack.at(-1);
  }

  /**
   * Map style references to UUIDs for library cross-referencing
   * @param {object} rawStyles - Figma style refs { fill: id, stroke: id }
   * @returns {object|null} Mapped style refs with UUIDs
   */
  mapStyleRefs(rawStyles) {
    if (!rawStyles || typeof rawStyles !== 'object') {
      return null;
    }
    const mapped = {};
    for (const [key, styleId] of Object.entries(rawStyles)) {
      mapped[key] = this.getOrCreateUuid(styleId);
    }
    return mapped;
  }

  /**
   * Extract geometry with coordinates relative to parent
   * @param {object} figmaNode - Figma node
   * @returns {object} Geometry properties with relative coordinates
   */
  transformGeometry(figmaNode) {
    const absBbox = figmaNode.absoluteBoundingBox || {};
    const parent = this.getParentPosition();
    const nodeSize = figmaNode.size;
    const coords = this.calculateRelativeCoords(absBbox, parent);
    const dimensions = this.extractDimensions(nodeSize, absBbox);
    return this.buildGeometryResult(figmaNode, coords, dimensions);
  }

  /** Calculate relative coordinates from absolute bbox and parent */
  calculateRelativeCoords(absBbox, parent) {
    if (this.coordsRelative) {
      // .fig binary: coords are already relative to parent
      return { x: absBbox.x || 0, y: absBbox.y || 0 };
    }
    return {
      x: (absBbox.x || 0) - (parent.x || 0),
      y: (absBbox.y || 0) - (parent.y || 0),
    };
  }

  /** Extract width and height dimensions from node size or bbox */
  extractDimensions(nodeSize, absBbox) {
    const width = nodeSize?.x || absBbox.width || 0;
    const height = nodeSize?.y || absBbox.height || 0;
    if (width === 0 || height === 0) {
      this.addWarning(`Node has zero dimensions (${width}x${height})`);
    }
    return { width, height };
  }

  /**
   * Build final geometry result with all properties
   * @param {object} figmaNode - Figma node
   * @param {object} coords - Relative coordinates
   * @param {object} dimensions - Width and height
   * @returns {object} Complete geometry result
   */
  buildGeometryResult(figmaNode, coords, dimensions) {
    const rotation =
      figmaNode.rotation ||
      (figmaNode.relativeTransform ? extractRotationDegrees(figmaNode.relativeTransform) : 0);
    const result = {
      ...coords,
      ...dimensions,
      visible: figmaNode.visible !== false,
      opacity: figmaNode.opacity ?? 1,
      rotation,
    };
    if (figmaNode.relativeTransform) {
      result.relativeTransform = figmaNode.relativeTransform;
    }
    if (figmaNode.flipH) {
      result.flipH = true;
    }
    if (figmaNode.flipV) {
      result.flipV = true;
    }
    return result;
  }

  /**
   * Transform layout-related properties for a node
   * @param {object} figmaNode - Figma node
   * @returns {object} Layout and layout child properties
   */
  transformLayoutProps(figmaNode) {
    const result = {};
    if (layoutTransformer.hasLayoutChildSizing(figmaNode)) {
      result.layoutChild = layoutTransformer.transformLayoutChild(figmaNode);
    }
    return result;
  }

  /** Add warning to stats */
  addWarning(message, node = null) {
    this.stats.warnings.push({
      message,
      nodeId: node?.id,
      nodeName: node?.name,
    });
    this.emit('warning', { message, node });
  }

  /** Add error to stats */
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
    const base = (this.stats.convertedNodes / this.stats.totalNodes) * 100;
    const featurePenalty = Math.min(this.stats.unsupportedFeatures.size * 2, 10);
    const errorPenalty = Math.min(this.stats.errors.length, 10);
    return Math.round(Math.max(0, Math.min(100, base - featurePenalty - errorPenalty)));
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
    this.figmaIdToUuid.clear();
    this.parentStack = [];
    this.dispatch = nodes.buildDispatch(this);
  }

  /** Get conversion statistics */
  getStats() {
    return {
      ...this.stats,
      unsupportedFeatures: Array.from(this.stats.unsupportedFeatures),
    };
  }
}
// Singleton instance
let instance = null;
/** @returns {FigmaJSONConverter} Singleton instance */
function getFigmaJSONConverter() {
  if (!instance) {
    instance = new FigmaJSONConverter();
  }
  return instance;
}

module.exports = {
  FigmaJSONConverter,
  getFigmaJSONConverter,
};
