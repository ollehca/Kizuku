/**
 * Kizu Node Transformer
 * Handles transformation of individual Figma node types to PenPot format.
 * Used by FigmaJSONConverter to keep the main converter under 500 lines.
 */

/**
 * Transform auto layout properties
 * @param {object} figmaNode - Figma node with auto layout
 * @returns {object} PenPot layout properties
 */
function transformAutoLayout(figmaNode) {
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
 * Transform constraints
 * @param {object} figmaConstraints - Figma constraints
 * @returns {object} PenPot constraints
 */
function transformConstraints(figmaConstraints) {
  if (!figmaConstraints) {
    return { horizontal: 'MIN', vertical: 'MIN' };
  }
  return {
    horizontal: figmaConstraints.horizontal || 'MIN',
    vertical: figmaConstraints.vertical || 'MIN',
  };
}

/** Text alignment map from Figma to PenPot */
const TEXT_ALIGN_MAP = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFIED: 'justify',
};

/**
 * Transform text alignment
 * @param {string} figmaAlign - Figma text align
 * @returns {string} PenPot text align
 */
function transformTextAlign(figmaAlign) {
  return TEXT_ALIGN_MAP[figmaAlign] || 'left';
}

/** Boolean operation map from Figma to PenPot */
const BOOLEAN_OP_MAP = {
  UNION: 'union',
  INTERSECT: 'intersection',
  SUBTRACT: 'difference',
  EXCLUDE: 'exclusion',
};

/**
 * Transform boolean operation type
 * @param {string} figmaOp - Figma boolean operation
 * @returns {string} PenPot boolean type
 */
function transformBooleanType(figmaOp) {
  return BOOLEAN_OP_MAP[figmaOp] || 'union';
}

/**
 * Transform line to path commands
 * @param {object} figmaLine - Figma line node
 * @returns {array} Path commands
 */
function transformLineToPath(figmaLine) {
  return [
    { command: 'M', x: 0, y: 0 },
    { command: 'L', x: figmaLine.absoluteBoundingBox?.width || 0, y: 0 },
  ];
}

/**
 * Transform rectangle node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma rectangle
 * @returns {object} PenPot rectangle
 */
function transformRectangle(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'rect',
    ...converter.transformCommonProperties(figmaNode),
    cornerRadius: figmaNode.cornerRadius || 0,
    rx: figmaNode.topLeftRadius || figmaNode.cornerRadius || 0,
    ry: figmaNode.topRightRadius || figmaNode.cornerRadius || 0,
  };
}

/**
 * Transform ellipse node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma ellipse
 * @returns {object} PenPot circle
 */
function transformEllipse(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'circle',
    ...converter.transformCommonProperties(figmaNode),
  };
}

/**
 * Transform text node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma text node
 * @returns {object} PenPot text
 */
function transformText(converter, figmaNode) {
  const nodeStyle = figmaNode.style || {};
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'text',
    ...converter.transformCommonProperties(figmaNode),
    content: figmaNode.characters || '',
    fontSize: nodeStyle.fontSize || 16,
    fontFamily: nodeStyle.fontFamily || 'Arial',
    fontWeight: nodeStyle.fontWeight || 'normal',
    textAlign: transformTextAlign(nodeStyle.textAlignHorizontal),
    lineHeight: nodeStyle.lineHeightPx || 'auto',
  };
}

/**
 * Transform vector node (paths, lines, stars, polygons)
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma vector node
 * @returns {object} PenPot path
 */
function transformVector(converter, figmaNode) {
  const vector = {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'path',
    ...converter.transformCommonProperties(figmaNode),
    commands: [],
  };

  if (figmaNode.type === 'LINE') {
    vector.commands = transformLineToPath(figmaNode);
  }

  if (!vector.commands.length) {
    converter.addWarning('Vector path conversion incomplete', figmaNode);
    converter.stats.unsupportedFeatures.add('complex-vectors');
  }

  converter.stats.convertedNodes++;
  return vector;
}

/**
 * Transform boolean operation node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma boolean node
 * @returns {Promise<object>} PenPot boolean group
 */
async function transformBoolean(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'bool',
    ...converter.transformCommonProperties(figmaNode),
    boolType: transformBooleanType(figmaNode.booleanOperation),
    children: await converter.transformChildren(figmaNode.children),
  };
}

/**
 * Transform component node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma component
 * @returns {Promise<object>} PenPot component
 */
async function transformComponent(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'component',
    ...converter.transformCommonProperties(figmaNode),
    children: await converter.transformChildren(figmaNode.children),
  };
}

/**
 * Transform component instance node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma instance
 * @returns {object} PenPot instance
 */
function transformInstance(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'instance',
    ...converter.transformCommonProperties(figmaNode),
    componentId: converter.getOrCreateUuid(figmaNode.componentId),
  };
}

/**
 * Transform component set node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma component set
 * @returns {Promise<object>} PenPot component set
 */
async function transformComponentSet(converter, figmaNode) {
  converter.stats.convertedNodes++;
  return {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'component-set',
    ...converter.transformCommonProperties(figmaNode),
    children: await converter.transformChildren(figmaNode.children),
  };
}

/**
 * Transform frame or group node
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma frame/group node
 * @returns {Promise<object>} PenPot frame
 */
async function transformFrame(converter, figmaNode) {
  const frame = {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: figmaNode.type === 'GROUP' ? 'group' : 'frame',
    ...converter.transformCommonProperties(figmaNode),
    children: await converter.transformChildren(figmaNode.children),
  };

  if (figmaNode.layoutMode && figmaNode.layoutMode !== 'NONE') {
    frame.layout = transformAutoLayout(figmaNode);
  }

  converter.stats.convertedNodes++;
  return frame;
}

/**
 * Build node type dispatch map bound to a converter instance
 * @param {object} converter - FigmaJSONConverter instance
 * @returns {object} Dispatch map of type -> handler
 */
function buildDispatch(converter) {
  return {
    FRAME: (n) => transformFrame(converter, n),
    GROUP: (n) => transformFrame(converter, n),
    RECTANGLE: (n) => transformRectangle(converter, n),
    ELLIPSE: (n) => transformEllipse(converter, n),
    TEXT: (n) => transformText(converter, n),
    VECTOR: (n) => transformVector(converter, n),
    STAR: (n) => transformVector(converter, n),
    LINE: (n) => transformVector(converter, n),
    REGULAR_POLYGON: (n) => transformVector(converter, n),
    BOOLEAN_OPERATION: (n) => transformBoolean(converter, n),
    COMPONENT: (n) => transformComponent(converter, n),
    INSTANCE: (n) => transformInstance(converter, n),
    COMPONENT_SET: (n) => transformComponentSet(converter, n),
  };
}

module.exports = {
  buildDispatch,
  transformAutoLayout,
  transformConstraints,
  transformTextAlign,
  transformBooleanType,
  transformLineToPath,
};
