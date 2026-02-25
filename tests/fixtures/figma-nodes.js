/**
 * Figma Node Fixtures
 * Factory functions for creating test Figma nodes with realistic data.
 * All nodes include absoluteBoundingBox for coordinate conversion testing.
 */

let nodeCounter = 0;

/**
 * Generate a unique Figma-style node ID
 * @returns {string} Node ID like "100:1"
 */
function nextId() {
  nodeCounter++;
  return `${nodeCounter}:1`;
}

/**
 * Reset the node ID counter (call in beforeEach)
 */
function resetIds() {
  nodeCounter = 0;
}

/**
 * Create a bounding box object
 * @param {number} posX - X position
 * @param {number} posY - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {object} absoluteBoundingBox
 */
function bbox(posX, posY, width, height) {
  return { x: posX, y: posY, width, height };
}

/**
 * Create a solid fill
 * @param {number} red - Red channel (0-1)
 * @param {number} grn - Green channel (0-1)
 * @param {number} blu - Blue channel (0-1)
 * @param {number} alpha - Alpha (0-1)
 * @returns {object} Figma solid fill
 */
function solidFill(red, grn, blu, alpha = 1) {
  return {
    type: 'SOLID',
    color: { r: red, g: grn, b: blu, a: alpha },
    opacity: alpha,
    visible: true,
  };
}

/**
 * Create a Figma DOCUMENT wrapper
 * @param {array} canvases - Canvas children
 * @returns {object} Figma document
 */
function createDocument(canvases = []) {
  return {
    name: 'Test Document',
    version: '1.0',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: canvases,
    },
  };
}

/**
 * Create a Figma CANVAS (page) node
 * @param {string} name - Canvas name
 * @param {array} children - Child nodes
 * @returns {object} Figma canvas node
 */
function createCanvas(name = 'Page 1', children = []) {
  return {
    id: nextId(),
    name,
    type: 'CANVAS',
    children,
    backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
  };
}

/**
 * Create a Figma FRAME node
 * @param {object} opts - Frame options
 * @returns {object} Figma frame node
 */
function createFrame(opts = {}) {
  const frame = {
    id: opts.id || nextId(),
    name: opts.name || 'Frame',
    type: 'FRAME',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 400,
      opts.height || 300,
    ),
    children: opts.children || [],
    fills: opts.fills || [solidFill(1, 1, 1)],
    strokes: [],
    effects: [],
    visible: opts.visible !== false,
    opacity: opts.opacity ?? 1,
    rotation: opts.rotation || 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };

  if (opts.layoutMode) {
    frame.layoutMode = opts.layoutMode;
    frame.itemSpacing = opts.itemSpacing || 0;
    frame.paddingTop = opts.paddingTop || 0;
    frame.paddingRight = opts.paddingRight || 0;
    frame.paddingBottom = opts.paddingBottom || 0;
    frame.paddingLeft = opts.paddingLeft || 0;
  }

  return frame;
}

/**
 * Create a Figma RECTANGLE node
 * @param {object} opts - Rectangle options
 * @returns {object} Figma rectangle node
 */
function createRectangle(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Rectangle',
    type: 'RECTANGLE',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    fills: opts.fills || [solidFill(0.8, 0.2, 0.2)],
    strokes: opts.strokes || [],
    effects: [],
    visible: opts.visible !== false,
    opacity: opts.opacity ?? 1,
    rotation: opts.rotation || 0,
    blendMode: opts.blendMode || 'NORMAL',
    cornerRadius: opts.cornerRadius || 0,
    rectangleCornerRadii: opts.cornerRadii || undefined,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma ELLIPSE node
 * @param {object} opts - Ellipse options
 * @returns {object} Figma ellipse node
 */
function createEllipse(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Ellipse',
    type: 'ELLIPSE',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    fills: opts.fills || [solidFill(0.2, 0.6, 1)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma TEXT node
 * @param {object} opts - Text options
 * @returns {object} Figma text node
 */
function createText(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Text',
    type: 'TEXT',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 200,
      opts.height || 24,
    ),
    characters: opts.characters || 'Hello World',
    style: opts.style || {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      textAlignHorizontal: 'LEFT',
      lineHeightPx: 24,
    },
    characterStyleOverrides: opts.overrides || [],
    styleOverrideTable: opts.overrideTable || {},
    fills: opts.fills || [solidFill(0, 0, 0)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma VECTOR node
 * @param {object} opts - Vector options
 * @returns {object} Figma vector node
 */
function createVector(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Vector',
    type: 'VECTOR',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    fillGeometry: opts.fillGeometry || [],
    strokeGeometry: opts.strokeGeometry || [],
    fills: opts.fills || [solidFill(0, 0, 0)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma STAR node
 * @param {object} opts - Star options
 * @returns {object} Figma star node
 */
function createStar(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Star',
    type: 'STAR',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    fills: opts.fills || [solidFill(1, 0.8, 0)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    starPointCount: opts.pointCount || 5,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma REGULAR_POLYGON node
 * @param {object} opts - Polygon options
 * @returns {object} Figma polygon node
 */
function createPolygon(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Polygon',
    type: 'REGULAR_POLYGON',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    fills: opts.fills || [solidFill(0.4, 0.8, 0.4)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    polygonSides: opts.sideCount || 3,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma LINE node
 * @param {object} opts - Line options
 * @returns {object} Figma line node
 */
function createLine(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Line',
    type: 'LINE',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.length || 200,
      0,
    ),
    fills: [],
    strokes: opts.strokes || [{
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0, a: 1 },
      visible: true,
    }],
    strokeWeight: opts.strokeWeight || 1,
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma COMPONENT node
 * @param {object} opts - Component options
 * @returns {object} Figma component node
 */
function createComponent(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Component',
    type: 'COMPONENT',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 200,
      opts.height || 200,
    ),
    children: opts.children || [],
    fills: opts.fills || [solidFill(1, 1, 1)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma INSTANCE node
 * @param {object} opts - Instance options
 * @returns {object} Figma instance node
 */
function createInstance(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Instance',
    type: 'INSTANCE',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 200,
      opts.height || 200,
    ),
    componentId: opts.componentId || 'comp-1',
    fills: opts.fills || [],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * Create a Figma BOOLEAN_OPERATION node
 * @param {object} opts - Boolean operation options
 * @returns {object} Figma boolean node
 */
function createBooleanOp(opts = {}) {
  return {
    id: opts.id || nextId(),
    name: opts.name || 'Boolean',
    type: 'BOOLEAN_OPERATION',
    absoluteBoundingBox: bbox(
      opts.x || 0,
      opts.y || 0,
      opts.width || 100,
      opts.height || 100,
    ),
    booleanOperation: opts.operation || 'UNION',
    children: opts.children || [],
    fills: opts.fills || [solidFill(0, 0, 0)],
    strokes: [],
    effects: [],
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: 'NORMAL',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
}

module.exports = {
  resetIds,
  bbox,
  solidFill,
  createDocument,
  createCanvas,
  createFrame,
  createRectangle,
  createEllipse,
  createText,
  createVector,
  createStar,
  createPolygon,
  createLine,
  createComponent,
  createInstance,
  createBooleanOp,
};
