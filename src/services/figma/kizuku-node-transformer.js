/**
 * Kizuku Node Transformer
 * Handles transformation of individual Figma node types to PenPot format.
 * Used by FigmaJSONConverter to keep the main converter under 500 lines.
 */

const { buildParagraphSet } = require('./kizuku-text-formatter');
const { transformColor } = require('./kizuku-style-transformer');
const pathGen = require('./kizuku-path-generator');
const layoutTransformer = require('./kizuku-layout-transformer');

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
 * Extract per-corner radii from a Figma node
 * @param {object} figmaNode - Figma rectangle node
 * @returns {object} Corner radii for each corner
 */
function extractCornerRadii(figmaNode) {
  const radii = figmaNode.rectangleCornerRadii;
  if (radii && Array.isArray(radii) && radii.length === 4) {
    return {
      topLeft: radii[0] || 0,
      topRight: radii[1] || 0,
      bottomRight: radii[2] || 0,
      bottomLeft: radii[3] || 0,
    };
  }
  const uniform = figmaNode.cornerRadius || 0;
  return {
    topLeft: uniform,
    topRight: uniform,
    bottomRight: uniform,
    bottomLeft: uniform,
  };
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
    cornerRadii: extractCornerRadii(figmaNode),
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
    content: buildParagraphSet(figmaNode),
    fontSize: nodeStyle.fontSize || 16,
    fontFamily: nodeStyle.fontFamily || 'Arial',
    fontWeight: nodeStyle.fontWeight || 400,
    textAlign: transformTextAlign(nodeStyle.textAlignHorizontal),
    lineHeight: nodeStyle.lineHeightPx || Math.round((nodeStyle.fontSize || 16) * 1.2),
  };
}

/**
 * Transform vector node (paths, lines, stars, polygons)
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma vector node
 * @returns {object} PenPot path
 */
function transformVector(converter, figmaNode) {
  const result = generateVectorCommands(figmaNode, converter);
  const vector = {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'path',
    ...converter.transformCommonProperties(figmaNode),
    commands: result.commands || result,
    fillRule: result.fillRule || 'nonzero',
  };

  converter.stats.convertedNodes++;
  return vector;
}

/** Dispatch map for vector type to path generator */
const VECTOR_GENERATORS = {
  LINE: (node) => ({
    commands: transformLineToPath(node),
    fillRule: 'nonzero',
  }),
  STAR: (node) => {
    const parsed = pathGen.parseVectorGeometry(node);
    if (parsed.commands && parsed.commands.length > 0) {
      return parsed;
    }
    const bbox = node.absoluteBoundingBox || {};
    const innerRadius = node.starInnerScale ?? node.starInnerRadius ?? 0.38;
    return {
      commands: pathGen.generateStarPath(
        bbox.width || 100,
        bbox.height || 100,
        node.starPointCount || 5,
        innerRadius
      ),
      fillRule: 'nonzero',
    };
  },
  REGULAR_POLYGON: (node) => {
    const parsed = pathGen.parseVectorGeometry(node);
    if (parsed.commands && parsed.commands.length > 0) {
      return parsed;
    }
    const bbox = node.absoluteBoundingBox || {};
    return {
      commands: pathGen.generatePolygonPath(
        bbox.width || 100,
        bbox.height || 100,
        node.polygonSides || 3
      ),
      fillRule: 'nonzero',
    };
  },
};

/**
 * Generate path commands based on vector node type
 * @param {object} figmaNode - Figma vector node
 * @param {object} converter - Converter for warnings
 * @returns {object} Object with commands array and fillRule
 */
function generateVectorCommands(figmaNode, converter) {
  const generator = VECTOR_GENERATORS[figmaNode.type];
  if (generator) {
    return generator(figmaNode);
  }

  const parsed = pathGen.parseVectorGeometry(figmaNode);
  if (parsed.commands && parsed.commands.length > 0) {
    return parsed;
  }

  converter.addWarning('Vector path conversion incomplete', figmaNode);
  converter.stats.unsupportedFeatures.add('complex-vectors');
  return { commands: [], fillRule: 'nonzero' };
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
    children: await converter.transformChildren(figmaNode.children, figmaNode.absoluteBoundingBox),
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
    children: await converter.transformChildren(figmaNode.children, figmaNode.absoluteBoundingBox),
  };
}

/**
 * Transform component instance node with children
 * @param {object} converter - FigmaJSONConverter instance
 * @param {object} figmaNode - Figma instance
 * @returns {Promise<object>} PenPot instance
 */
async function transformInstance(converter, figmaNode) {
  converter.stats.convertedNodes++;
  const instance = {
    id: converter.getOrCreateUuid(figmaNode.id),
    name: figmaNode.name,
    type: 'instance',
    ...converter.transformCommonProperties(figmaNode),
    componentId: converter.getOrCreateUuid(figmaNode.componentId),
  };
  if (figmaNode.children && figmaNode.children.length > 0) {
    instance.children = await converter.transformChildren(
      figmaNode.children,
      figmaNode.absoluteBoundingBox
    );
  }
  return instance;
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
    children: await converter.transformChildren(figmaNode.children, figmaNode.absoluteBoundingBox),
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
    children: await converter.transformChildren(figmaNode.children, figmaNode.absoluteBoundingBox),
  };

  applyFrameFillDefaults(frame, figmaNode);

  if (layoutTransformer.hasLayout(figmaNode)) {
    frame.layout = layoutTransformer.transformLayout(figmaNode);
  }

  converter.stats.convertedNodes++;
  return frame;
}

/**
 * Apply fill defaults for frames: use backgroundColor if no fills,
 * or transparent fill for clipping frames with nothing
 * @param {object} frame - Kizuku frame node
 * @param {object} figmaNode - Source Figma node
 */
function applyFrameFillDefaults(frame, figmaNode) {
  const hasNoFills = !frame.fills || frame.fills.length === 0;
  if (!hasNoFills) {
    return;
  }
  if (figmaNode.backgroundColor) {
    frame.fills = [
      {
        type: 'color',
        color: transformColor(figmaNode.backgroundColor),
        opacity: figmaNode.backgroundColor.a ?? 1,
      },
    ];
    return;
  }
  if (frame.clipContent === true) {
    frame.fills = [{ type: 'color', color: '#000000', opacity: 0 }];
  }
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
    ROUNDED_RECTANGLE: (n) => transformRectangle(converter, n),
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
    SYMBOL: (n) => transformComponent(converter, n),
    SLICE: (n) => transformFrame(converter, n),
  };
}

module.exports = {
  buildDispatch,
  transformAutoLayout,
  transformConstraints,
  transformTextAlign,
  transformBooleanType,
  transformLineToPath,
  extractCornerRadii,
};
