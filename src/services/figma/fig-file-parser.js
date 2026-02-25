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
const { resolveFillGeometryBlobs } = require('./fig-blob-decoder');

const logger = createLogger('FigFileParser');

/** Detect MIME type from image buffer magic bytes */
function detectMimeType(buf) {
  if (!buf || buf.length < 4) {
    return 'image/png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (buf[0] === 0x52 && buf[1] === 0x49) {
    return 'image/webp';
  }
  if (buf[0] === 0x47 && buf[1] === 0x49) {
    return 'image/gif';
  }
  return 'image/png';
}

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

  /** Unwrap buffer from ZIP if needed */
  async unwrapBuffer(buffer) {
    if (!this.isZipFile(buffer)) {
      return { canvasBuffer: buffer, extractedData: null };
    }
    logger.info('Detected ZIP-wrapped .fig file');
    const extractedData = await this.extractFromZip(buffer);
    return { canvasBuffer: extractedData.canvasBuffer, extractedData };
  }

  /** Attach ZIP metadata to figmaJSON if available */
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
        mtype: detectMimeType(img.data),
      })),
    };
  }

  /** Validate that the buffer is a valid .fig file */
  validateFigFile(buffer) {
    if (buffer.length < 100) {
      throw new Error('File is too small to be a valid .fig file');
    }
    logger.debug('File header', { header: buffer.slice(0, 4).toString('hex') });
  }

  /** Parse binary data using kiwi-schema */
  async parseBinary(buffer) {
    return parseBinary(buffer);
  }

  /** Convert parsed .fig data to Figma JSON structure */
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
      _coordsRelative: true, // .fig binary uses relative transforms
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

  /** Create empty Figma JSON structure */
  createEmptyFigmaJSON(header, version) {
    return {
      name: 'Untitled',
      version: version.toString(),
      document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
      components: {},
      componentSets: {},
      styles: {},
      schemaVersion: version,
      _meta: { sourceFormat: header, parsedVersion: version },
    };
  }

  /**
   * Build tree structure from nodeChanges array
   * @param {array} nodeChanges - Array of node change objects
   * @param {array} blobs - Array of blob data
   * @returns {object} { document, components, componentSets }
   */
  buildTreeFromNodeChanges(nodeChanges, blobs) {
    logger.info('Building tree from nodeChanges');

    const indexed = this.indexNodeChanges(nodeChanges, blobs);
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

  /** Index all node changes by guid and collect components */
  indexNodeChanges(nodeChanges, blobs) {
    const nodesByGuid = new Map();
    const nodesByIndex = [];
    const components = {};
    const componentSets = {};

    for (let idx = 0; idx < nodeChanges.length; idx++) {
      const change = nodeChanges[idx];
      const node = this.convertFigNode(change, idx, blobs);

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

  /** Link child nodes to their parents, orphans go to first canvas */
  linkChildrenToParents(nodeChanges, indexed) {
    const { nodesByGuid, nodesByIndex } = indexed;
    const rootNode = nodesByIndex[0];
    let linked = 0;
    let orphaned = 0;
    let noParentRef = 0;

    for (let idx = 1; idx < nodeChanges.length; idx++) {
      const change = nodeChanges[idx];
      if (!change.parentIndex?.guid) {
        noParentRef++;
        this.attachOrphan(rootNode, nodesByIndex[idx]);
        continue;
      }

      const parentGuidKey = this.guidToString(change.parentIndex.guid);
      const parentInfo = nodesByGuid.get(parentGuidKey);

      if (parentInfo?.node) {
        if (!parentInfo.node.children) {
          parentInfo.node.children = [];
        }
        parentInfo.node.children.push(nodesByIndex[idx]);
        linked++;
      } else {
        orphaned++;
        this.attachOrphan(rootNode, nodesByIndex[idx]);
      }
    }

    logger.info('Tree linking stats', {
      total: nodeChanges.length - 1,
      linked,
      orphaned,
      noParentRef,
    });
  }

  /** Attach an orphaned node to the first canvas or root */
  attachOrphan(rootNode, node) {
    if (!node) {
      return;
    }
    const canvas = rootNode.children?.find((child) => child.type === 'CANVAS');
    const parent = canvas || rootNode;
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(node);
  }

  /** Convert .fig node to Figma API format */
  convertFigNode(figNode, index, blobs) {
    const nodeId = this.guidToNodeId(figNode.guid, index);

    // Base node properties
    const node = {
      id: nodeId,
      name: figNode.name || 'Unnamed',
      type: this.mapFigTypeToFigmaType(figNode.type),
      visible: figNode.visible !== false,
    };

    this.resolveBlobRefs(figNode, blobs);
    this.addCommonFigNodeProps(node, figNode);
    this.addTypeSpecificProperties(node, figNode);

    return node;
  }

  /** Resolve blob references in fillGeometry/strokeGeometry */
  resolveBlobRefs(figNode, blobs) {
    if (figNode.fillGeometry) {
      figNode.fillGeometry = resolveFillGeometryBlobs(figNode.fillGeometry, blobs);
    }
    if (figNode.strokeGeometry) {
      figNode.strokeGeometry = resolveFillGeometryBlobs(figNode.strokeGeometry, blobs);
    }
  }

  /** Add common properties (opacity, transform, paints, effects) */
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

  /** Add stroke properties if present */
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
    this.addExtraStrokeProps(node, figNode);
  }

  /** Copy dash, cap, join, and per-side stroke weights */
  addExtraStrokeProps(node, figNode) {
    if (figNode.dashPattern) {
      node.dashPattern = figNode.dashPattern;
    }
    if (figNode.strokeCap) {
      node.strokeCap = figNode.strokeCap;
    }
    if (figNode.strokeJoin) {
      node.strokeJoin = figNode.strokeJoin;
    }
    if (figNode.strokeMiterAngle !== undefined) {
      node.strokeMiterAngle = figNode.strokeMiterAngle;
    }
    if (figNode.individualStrokeWeights) {
      node.individualStrokeWeights = figNode.individualStrokeWeights;
    }
  }

  /** Map .fig binary node type to Figma REST API type */
  mapFigTypeToFigmaType(figType) {
    const binaryTypeMap = {
      ROUNDED_RECTANGLE: 'RECTANGLE',
      SYMBOL: 'COMPONENT',
      BRUSH: 'SLICE',
      SECTION: 'FRAME',
      STICKY: 'FRAME',
      SHAPE_WITH_TEXT: 'FRAME',
      CONNECTOR: 'LINE',
      TABLE: 'FRAME',
      TABLE_CELL: 'FRAME',
      WIDGET: 'FRAME',
    };
    return binaryTypeMap[figType] || figType;
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

  /** Add transform and bounds to node */
  addTransformAndBounds(node, figNode) {
    if (figNode.size) {
      const pos = this.extractPosition(figNode.transform);
      node.absoluteBoundingBox = {
        x: pos.x,
        y: pos.y,
        width: figNode.size.x || 0,
        height: figNode.size.y || 0,
      };
    }
    if (figNode.transform) {
      node.relativeTransform = figNode.transform;
    }
  }

  /** Extract x,y position from .fig transform */
  extractPosition(transform) {
    if (!transform) {
      return { x: 0, y: 0 };
    }
    if (Array.isArray(transform)) {
      return {
        x: transform[0]?.[2] || 0,
        y: transform[1]?.[2] || 0,
      };
    }
    if (transform.m02 !== undefined) {
      return { x: transform.m02, y: transform.m12 };
    }
    if (transform.tx !== undefined) {
      return { x: transform.tx, y: transform.ty };
    }
    return { x: 0, y: 0 };
  }

  /** Delegate paint conversion */
  convertPaints(figPaints) {
    return convertPaints(figPaints);
  }

  /** Delegate type-specific property extraction */
  addTypeSpecificProperties(node, figNode) {
    applyTypeProps(node, figNode);
  }

  /** @returns {boolean} True if file can be parsed */
  async canParse(buffer) {
    try {
      this.validateFigFile(buffer);
      return true;
    } catch {
      return false;
    }
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
