/**
 * Binary .fig File Parser
 * Parses Figma's proprietary binary format into JSON structure.
 * Based on yagudaev/figma-to-json, fig2sketch, kiwi-schema.
 */

const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const { createLogger } = require('../../utils/logger');
const { parseBinary } = require('./fig-binary-decoder');
const {
  addTypeSpecificProperties: applyTypeProps,
  convertPaints,
} = require('./fig-node-properties');

const logger = createLogger('FigFileParser');

/** Handles parsing of binary .fig files */
class FigFileParser {
  constructor() {
    this.supportedVersions = ['0.1', '0.2', '0.3', '0.4']; // Known versions
  }

  /** Check if buffer is a ZIP file (starts with "PK") */
  isZipFile(buffer) {
    return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  /** Extract .fig file from ZIP container */
  async extractFromZip(buffer) {
    logger.info('Extracting .fig file from ZIP container');

    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      const extracted = {
        canvasBuffer: null,
        metadata: null,
        thumbnail: null,
        images: [],
      };

      for (const entry of zipEntries) {
        const entryName = entry.entryName;

        if (entryName === 'canvas.fig') {
          // Extract the actual binary .fig file
          extracted.canvasBuffer = entry.getData();
          logger.info('Extracted canvas.fig', { size: extracted.canvasBuffer.length });
        } else if (entryName === 'meta.json') {
          // Extract metadata
          const metaData = entry.getData().toString('utf8');
          extracted.metadata = JSON.parse(metaData);
          logger.info('Extracted meta.json', extracted.metadata);
        } else if (entryName === 'thumbnail.png') {
          // Extract thumbnail
          extracted.thumbnail = entry.getData();
          logger.info('Extracted thumbnail.png', { size: extracted.thumbnail.length });
        } else if (entryName.startsWith('images/') && !entry.isDirectory) {
          // Extract embedded images
          const imageHash = entryName.replace('images/', '');
          extracted.images.push({
            hash: imageHash,
            data: entry.getData(),
          });
          logger.info('Extracted image', { hash: imageHash });
        }
      }

      if (!extracted.canvasBuffer) {
        throw new Error('ZIP archive does not contain canvas.fig');
      }

      logger.info('ZIP extraction complete', {
        hasMetadata: !!extracted.metadata,
        hasThumbnail: !!extracted.thumbnail,
        imageCount: extracted.images.length,
      });

      return extracted;
    } catch (error) {
      logger.error('Failed to extract ZIP archive', error);
      throw new Error(`Failed to extract ZIP archive: ${error.message}`);
    }
  }

  /** Parse binary .fig file into Figma JSON structure */
  async parse(filePath) {
    logger.info('Parsing binary .fig file', { filePath });

    try {
      const buffer = await fs.readFile(filePath);
      const { canvasBuffer, extractedData } = await this.unwrapBuffer(buffer);

      this.validateFigFile(canvasBuffer);
      const figData = await this.parseBinary(canvasBuffer);
      const figmaJSON = this.convertToFigmaJSON(figData);

      this.attachZipMetadata(figmaJSON, extractedData);

      logger.info('Binary .fig file parsed successfully', {
        filePath,
        version: figmaJSON.version,
        pages: figmaJSON.document?.children?.length || 0,
      });

      return figmaJSON;
    } catch (error) {
      logger.error('Failed to parse .fig file', { filePath, error });
      throw new Error(`Failed to parse .fig file: ${error.message}`);
    }
  }

  /**
   * Unwrap buffer from ZIP if needed
   * @param {Buffer} buffer - Raw file buffer
   * @returns {Promise<object>} { canvasBuffer, extractedData }
   */
  async unwrapBuffer(buffer) {
    if (!this.isZipFile(buffer)) {
      return { canvasBuffer: buffer, extractedData: null };
    }
    logger.info('Detected ZIP-wrapped .fig file');
    const extractedData = await this.extractFromZip(buffer);
    return { canvasBuffer: extractedData.canvasBuffer, extractedData };
  }

  /**
   * Attach ZIP metadata to figmaJSON if available
   * @param {object} figmaJSON - Target JSON
   * @param {object} extractedData - Extracted ZIP data (or null)
   */
  attachZipMetadata(figmaJSON, extractedData) {
    if (!extractedData) {
      return;
    }
    const thumb = extractedData.thumbnail;
    figmaJSON._meta = {
      ...figmaJSON._meta,
      zipMetadata: extractedData.metadata,
      thumbnail: thumb ? thumb.toString('base64') : null,
      extractedImages: extractedData.images.map((img) => ({
        hash: img.hash,
        data: img.data.toString('base64'),
      })),
    };
  }

  /**
   * Validate that the file is a valid .fig file
   * @param {Buffer} buffer - File buffer
   */
  validateFigFile(buffer) {
    // Check minimum size
    if (buffer.length < 100) {
      throw new Error('File is too small to be a valid .fig file');
    }

    // Check magic bytes (if known)
    // Figma files typically start with specific byte sequences
    // This is a simplified check
    const header = buffer.slice(0, 4).toString('hex');
    logger.debug('File header', { header });

    // Note: Actual validation may require more sophisticated checks
  }

  /**
   * Parse binary data using kiwi-schema (delegated)
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<object>} Parsed data
   */
  async parseBinary(buffer) {
    return parseBinary(buffer);
  }

  /**
   * Convert parsed .fig data to Figma JSON structure
   * @param {object} parsedData - Parsed fig data from parseBinary
   * @returns {object} Figma JSON structure
   */
  convertToFigmaJSON(parsedData) {
    logger.info('Converting parsed .fig data to Figma JSON structure');

    const { header, version, data } = parsedData;

    // .fig files use a delta/change-based format with nodeChanges array
    if (!data.nodeChanges || !Array.isArray(data.nodeChanges)) {
      logger.warn('No nodeChanges found in .fig data, returning empty structure');
      return this.createEmptyFigmaJSON(header, version);
    }

    logger.info(`Processing ${data.nodeChanges.length} node changes`);

    // Build tree from nodeChanges
    const { document, components, componentSets } = this.buildTreeFromNodeChanges(
      data.nodeChanges,
      data.blobs || []
    );

    const figmaJSON = {
      name: document.name || 'Untitled',
      version: version.toString(),
      document: document,
      components: components,
      componentSets: componentSets,
      styles: {}, // Styles are extracted separately
      schemaVersion: version,
      _meta: {
        sourceFormat: header,
        parsedVersion: version,
        totalNodes: data.nodeChanges.length,
        totalBlobs: (data.blobs || []).length,
      },
    };

    logger.info('Conversion complete', {
      documentChildren: figmaJSON.document?.children?.length || 0,
      componentsCount: Object.keys(figmaJSON.components || {}).length,
      totalNodes: data.nodeChanges.length,
    });

    return figmaJSON;
  }

  /**
   * Create empty Figma JSON structure
   * @param {string} header - File header
   * @param {number} version - File version
   * @returns {object} Empty Figma JSON
   */
  createEmptyFigmaJSON(header, version) {
    return {
      name: 'Untitled',
      version: version.toString(),
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [],
      },
      components: {},
      componentSets: {},
      styles: {},
      schemaVersion: version,
      _meta: {
        sourceFormat: header,
        parsedVersion: version,
      },
    };
  }

  /**
   * Build tree structure from nodeChanges array
   * @param {array} nodeChanges - Array of node change objects
   * @param {array} blobs - Array of blob data
   * @returns {object} { document, components, componentSets }
   */
  buildTreeFromNodeChanges(nodeChanges, _blobs) {
    logger.info('Building tree from nodeChanges');

    const indexed = this.indexNodeChanges(nodeChanges);
    this.linkChildrenToParents(nodeChanges, indexed);

    logger.info('Tree built successfully', {
      totalNodes: indexed.nodesByIndex.length,
      rootChildren: indexed.nodesByIndex[0]?.children?.length || 0,
      components: Object.keys(indexed.components).length,
    });

    return {
      document: indexed.nodesByIndex[0],
      components: indexed.components,
      componentSets: indexed.componentSets,
    };
  }

  /**
   * Index all node changes by guid and collect components
   * @param {array} nodeChanges - Node change array
   * @returns {object} { nodesByGuid, nodesByIndex, components, componentSets }
   */
  indexNodeChanges(nodeChanges) {
    const nodesByGuid = new Map();
    const nodesByIndex = [];
    const components = {};
    const componentSets = {};

    for (let idx = 0; idx < nodeChanges.length; idx++) {
      const change = nodeChanges[idx];
      const node = this.convertFigNode(change, idx);

      nodesByIndex[idx] = node;
      const guidKey = this.guidToString(change.guid);
      nodesByGuid.set(guidKey, { node, parentIndex: change.parentIndex });

      if (change.type === 'COMPONENT') {
        components[node.id] = node;
      }
      if (change.type === 'COMPONENT_SET') {
        componentSets[node.id] = node;
      }
    }

    return { nodesByGuid, nodesByIndex, components, componentSets };
  }

  /**
   * Link child nodes to their parents
   * @param {array} nodeChanges - Node change array
   * @param {object} indexed - Indexed data from indexNodeChanges
   */
  linkChildrenToParents(nodeChanges, indexed) {
    const { nodesByGuid, nodesByIndex } = indexed;

    for (let idx = 1; idx < nodeChanges.length; idx++) {
      const change = nodeChanges[idx];
      if (!change.parentIndex?.guid) {
        continue;
      }

      const parentGuidKey = this.guidToString(change.parentIndex.guid);
      const parentInfo = nodesByGuid.get(parentGuidKey);

      if (parentInfo?.node) {
        if (!parentInfo.node.children) {
          parentInfo.node.children = [];
        }
        parentInfo.node.children.push(nodesByIndex[idx]);
      } else {
        logger.warn(`Parent not found for node ${idx}`);
      }
    }
  }

  /**
   * Convert .fig node to Figma API format
   * @param {object} figNode - .fig node from nodeChanges
   * @param {number} index - Node index in array
   * @returns {object} Figma-compatible node
   */
  convertFigNode(figNode, index) {
    // Generate node ID from guid
    const nodeId = this.guidToNodeId(figNode.guid, index);

    // Base node properties
    const node = {
      id: nodeId,
      name: figNode.name || 'Unnamed',
      type: this.mapFigTypeToFigmaType(figNode.type),
      visible: figNode.visible !== false,
    };

    this.addCommonFigNodeProps(node, figNode);
    this.addTypeSpecificProperties(node, figNode);

    return node;
  }

  /**
   * Add common properties (opacity, transform, paints, effects)
   * @param {object} node - Target node
   * @param {object} figNode - Source .fig node
   */
  addCommonFigNodeProps(node, figNode) {
    if (figNode.opacity !== undefined && figNode.opacity !== 1) {
      node.opacity = figNode.opacity;
    }
    if (figNode.transform || figNode.size) {
      this.addTransformAndBounds(node, figNode);
    }
    if (figNode.fillPaints?.length > 0) {
      node.fills = this.convertPaints(figNode.fillPaints);
    }
    this.addStrokeProps(node, figNode);
    if (figNode.effects?.length > 0) {
      node.effects = figNode.effects;
    }
  }

  /**
   * Add stroke properties if present
   * @param {object} node - Target node
   * @param {object} figNode - Source .fig node
   */
  addStrokeProps(node, figNode) {
    if (!figNode.strokePaints?.length) {
      return;
    }
    node.strokes = this.convertPaints(figNode.strokePaints);
    if (figNode.strokeWeight !== undefined) {
      node.strokeWeight = figNode.strokeWeight;
    }
    if (figNode.strokeAlign) {
      node.strokeAlign = figNode.strokeAlign;
    }
  }

  /** @returns {string} Figma API type (currently identity) */
  mapFigTypeToFigmaType(figType) {
    return figType;
  }

  /** Convert guid to node ID string (e.g. "1:42") */
  guidToNodeId(guid, fallbackIndex) {
    if (guid && guid.sessionID !== undefined && guid.localID !== undefined) {
      return `${guid.sessionID}:${guid.localID}`;
    }
    return `0:${fallbackIndex}`;
  }

  /** Convert guid to string key */
  guidToString(guid) {
    return `${guid.sessionID}:${guid.localID}`;
  }

  /**
   * Add transform and bounds to node
   * @param {object} node - Target node
   * @param {object} figNode - Source .fig node
   */
  addTransformAndBounds(node, figNode) {
    if (figNode.size) {
      const tfm = figNode.transform || [];
      node.absoluteBoundingBox = {
        x: (tfm[0] && tfm[0][2]) || 0,
        y: (tfm[1] && tfm[1][2]) || 0,
        width: figNode.size.x || 0,
        height: figNode.size.y || 0,
      };
    }
    if (figNode.transform) {
      node.relativeTransform = figNode.transform;
    }
  }

  /**
   * Convert .fig paints to Figma paints (delegated)
   * @param {array} figPaints - .fig paint array
   * @returns {array} Figma paints
   */
  convertPaints(figPaints) {
    return convertPaints(figPaints);
  }

  /**
   * Add type-specific properties to node
   * @param {object} node - Target node
   * @param {object} figNode - Source .fig node
   */
  addTypeSpecificProperties(node, figNode) {
    applyTypeProps(node, figNode);
  }

  /**
   * Check if this parser can handle the file
   * @param {Buffer} buffer - File buffer
   * @returns {boolean} True if supported
   */
  async canParse(buffer) {
    try {
      this.validateFigFile(buffer);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get parser version info
   * @returns {object} Version information
   */
  getVersionInfo() {
    return {
      parser: 'fig-kiwi',
      supportedVersions: this.supportedVersions,
      experimental: true,
    };
  }
}

// Singleton instance
let instance = null;

/** @returns {FigFileParser} Singleton instance */
function getFigFileParser() {
  if (!instance) {
    instance = new FigFileParser();
  }
  return instance;
}

module.exports = {
  FigFileParser,
  getFigFileParser,
};
