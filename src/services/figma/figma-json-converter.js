/**
 * Figma JSON to PenPot Converter
 * Converts Figma REST API JSON into PenPot-compatible format
 *
 * Architecture:
 * - Figma JSON → Node Transformers → PenPot Library → .penpot file
 */

const { createLogger } = require('../../utils/logger');
const EventEmitter = require('events');
const mockBackend = require('../penpot-mock-backend');
const styles = require('./kizu-style-transformer');
const libExtractor = require('./kizu-library-extractor');
const nodes = require('./kizu-node-transformer');

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
    this.figmaIdToUuid = new Map();
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
      const kizuProject = await this.transformToKizuProject(figmaDocument, metadata);
      const score = this.calculateCompatibilityScore();
      logger.info('Conversion completed', { stats: this.stats, score });
      return {
        project: kizuProject,
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
   * Transform Figma document to .kizu project format
   * @param {object} figmaDoc - Figma document object
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} .kizu project
   */
  async transformToKizuProject(figmaDoc, metadata = {}) {
    const teamId = await this.resolveTeamId();
    const project = this.createProjectSkeleton(figmaDoc, metadata, teamId);
    await this.populatePages(figmaDoc, project);
    const getUuid = (id) => this.getOrCreateUuid(id);
    libExtractor.extractComponents(figmaDoc, project.data.components, getUuid);
    libExtractor.extractColorLibrary(figmaDoc, project.data.colorLibrary, getUuid);
    libExtractor.extractTypographyLibrary(figmaDoc, project.data.typographyLibrary, getUuid);
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
      type: 'kizu-project',
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
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    const crypto = require('crypto');
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
      children: await this.transformChildren(figmaCanvas.children),
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
        this.stats.skippedNodes++;
        return null;
      }
      return await handler(figmaNode);
    } catch (error) {
      this.addError(`Failed to transform node: ${error.message}`, figmaNode);
      this.stats.skippedNodes++;
      return null;
    }
  }

  /**
   * Transform child nodes array
   * @param {array} children - Figma child nodes
   * @returns {Promise<array>} Converted children
   */
  async transformChildren(children) {
    if (!children) {
      return [];
    }
    const results = [];
    for (const child of children) {
      const converted = await this.transformNode(child);
      if (converted) {
        results.push(converted);
      }
    }
    return results;
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
      strokes: styles.transformStrokes(figmaNode.strokes),
      strokeWeight: figmaNode.strokeWeight || 0,
      effects: styles.transformEffects(figmaNode.effects, warn),
      blendMode: styles.transformBlendMode(figmaNode.blendMode, warn, unsupported),
      constraints: nodes.transformConstraints(figmaNode.constraints),
    };
  }

  /**
   * Extract geometry and display properties
   * @param {object} figmaNode - Figma node
   * @returns {object} Geometry properties
   */
  transformGeometry(figmaNode) {
    const bbox = figmaNode.absoluteBoundingBox || {};
    return {
      x: bbox.x || 0,
      y: bbox.y || 0,
      width: bbox.width || 0,
      height: bbox.height || 0,
      visible: figmaNode.visible !== false,
      opacity: figmaNode.opacity ?? 1,
      rotation: figmaNode.rotation || 0,
    };
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
    this.dispatch = nodes.buildDispatch(this);
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
