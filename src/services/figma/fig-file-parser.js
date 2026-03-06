/**
 * Binary .fig File Parser
 * Parses Figma's proprietary binary format into JSON structure.
 * Based on yagudaev/figma-to-json, fig2sketch, kiwi-schema.
 */

const fs = require('node:fs').promises;
const AdmZip = require('adm-zip');
const { createLogger } = require('../../utils/logger');
const { parseBinary } = require('./fig-binary-decoder');
const {
  addTypeSpecificProperties: applyTypeProps,
  convertPaints,
} = require('./fig-node-properties');
const { resolveFillGeometryBlobs } = require('./fig-blob-decoder');
const transformDecomposer = require('./kizuku-transform-decomposer');

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
        this.classifyZipEntry(entry, extracted);
      }

      if (!extracted.canvasBuffer) {
        throw new Error('ZIP archive does not contain canvas.fig');
      }

      return extracted;
    } catch (error) {
      logger.error('Failed to extract ZIP archive', error);
      throw new Error(`Failed to extract ZIP archive: ${error.message}`);
    }
  }

  /** Classify and store a single ZIP entry */
  classifyZipEntry(entry, extracted) {
    const name = entry.entryName;
    if (name === 'canvas.fig') {
      extracted.canvasBuffer = entry.getData();
    } else if (name === 'meta.json') {
      extracted.metadata = JSON.parse(entry.getData().toString('utf8'));
    } else if (name === 'thumbnail.png') {
      extracted.thumbnail = entry.getData();
    } else if (name.startsWith('images/') && !entry.isDirectory) {
      extracted.images.push({ hash: name.replace('images/', ''), data: entry.getData() });
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
    const { header, version, data } = parsedData;
    if (!data.nodeChanges || !Array.isArray(data.nodeChanges)) {
      return this.createEmptyFigmaJSON(header, version);
    }
    logger.info(`Processing ${data.nodeChanges.length} node changes`);
    const result = this.buildTreeFromNodeChanges(data.nodeChanges, data.blobs || []);
    const figmaJSON = {
      name: result.document.name || 'Untitled',
      version: version.toString(),
      document: result.document,
      components: result.components,
      componentSets: result.componentSets,
      styles: result.styles,
      schemaVersion: version,
      _coordsRelative: true,
      _meta: {
        sourceFormat: header,
        parsedVersion: version,
        totalNodes: data.nodeChanges.length,
        totalBlobs: (data.blobs || []).length,
      },
    };
    logger.info('Conversion complete', { totalNodes: data.nodeChanges.length });
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

  /** Build tree structure from nodeChanges array */
  buildTreeFromNodeChanges(nodeChanges, blobs) {
    const indexed = this.indexNodeChanges(nodeChanges, blobs);
    this.linkChildrenToParents(nodeChanges, indexed);
    return {
      document: indexed.nodesByIndex[0],
      components: indexed.components,
      componentSets: indexed.componentSets,
      styles: indexed.styles,
    };
  }

  /** Index all node changes by guid, collect components and styles */
  indexNodeChanges(nodeChanges, blobs) {
    const nodesByGuid = new Map();
    const nodesByIndex = [];
    const components = {};
    const componentSets = {};
    const styles = {};

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
      this.collectStyleNode(change, node, styles);
    }

    return { nodesByGuid, nodesByIndex, components, componentSets, styles };
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
    this.addMiscCommonProps(node, figNode);
  }

  /** Copy blendMode, constraints, locked, clipsContent, exportSettings */
  addMiscCommonProps(node, figNode) {
    if (figNode.blendMode) {
      node.blendMode = figNode.blendMode;
    }
    if (figNode.constraints) {
      node.constraints = figNode.constraints;
    }
    if (figNode.locked) {
      node.locked = true;
    }
    if (figNode.clipsContent !== undefined) {
      node.clipsContent = figNode.clipsContent;
    }
    if (figNode.exportSettings?.length > 0) {
      node.exportSettings = figNode.exportSettings;
    }
    this.addStyleRefs(node, figNode);
  }

  /** Extract style reference IDs from binary inherit*StyleID fields */
  addStyleRefs(node, figNode) {
    const styles = {};
    const keys = [
      ['inheritFillStyleID', 'fill'],
      ['inheritStrokeStyleID', 'stroke'],
      ['inheritTextStyleID', 'text'],
      ['inheritEffectStyleID', 'effect'],
    ];
    for (const [src, dst] of keys) {
      const guid = figNode[src];
      if (guid) {
        styles[dst] = this.guidToNodeId(guid, 0);
      }
    }
    if (Object.keys(styles).length > 0) {
      node.styles = styles;
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
    if (figNode.strokeCapStart) {
      node.strokeCapStart = figNode.strokeCapStart;
    }
    if (figNode.strokeCapEnd) {
      node.strokeCapEnd = figNode.strokeCapEnd;
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
      SECTION: 'SECTION',
      STICKY: 'FRAME',
      SHAPE_WITH_TEXT: 'FRAME',
      CONNECTOR: 'LINE',
      TABLE: 'TABLE',
      TABLE_CELL: 'FRAME',
      WIDGET: 'FRAME',
    };
    return binaryTypeMap[figType] || figType;
  }

  /** Convert guid to node ID string (e.g. "1:42") */
  guidToNodeId(guid, fallbackIndex) {
    if (guid?.sessionID !== undefined && guid?.localID !== undefined) {
      return `${guid.sessionID}:${guid.localID}`;
    }
    return `0:${fallbackIndex}`;
  }

  /** Convert guid to string key */
  guidToString(guid) {
    return `${guid.sessionID}:${guid.localID}`;
  }

  /** Collect style definition node into the styles registry */
  collectStyleNode(change, node, styles) {
    const styleTypeMap = {
      PAINT_STYLE: 'FILL',
      TEXT_STYLE: 'TEXT',
      EFFECT_STYLE: 'EFFECT',
      GRID_STYLE: 'GRID',
    };
    const styleType = styleTypeMap[change.type];
    if (styleType) {
      styles[node.id] = {
        name: node.name,
        styleType,
        description: '',
      };
    }
  }

  /** Add transform, bounds, rotation, and flip to node */
  addTransformAndBounds(node, figNode) {
    transformDecomposer.addTransformAndBounds(node, figNode);
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
