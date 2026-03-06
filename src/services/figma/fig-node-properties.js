/**
 * Fig Node Property Handlers
 * Maps Figma node types to property extraction functions.
 */

/**
 * Copy a property from source to target if it exists
 * @param {object} target - Target node
 * @param {object} source - Source node
 * @param {string} key - Property key
 */
function copyIfDefined(target, source, key) {
  if (source[key] !== undefined) {
    target[key] = source[key];
  }
}

/**
 * Copy a property from source to target if truthy
 * @param {object} target - Target node
 * @param {object} source - Source node
 * @param {string} key - Property key
 */
function copyIfPresent(target, source, key) {
  if (source[key]) {
    target[key] = source[key];
  }
}

/**
 * Copy multiple properties if they exist
 * @param {object} target - Target node
 * @param {object} source - Source node
 * @param {array} keys - Property keys
 */
function copyManyIfDefined(target, source, keys) {
  for (const key of keys) {
    copyIfDefined(target, source, key);
  }
}

/**
 * Add layout child sizing properties common to all node types
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addLayoutChildProps(node, figNode) {
  copyIfPresent(node, figNode, 'layoutSizingHorizontal');
  copyIfPresent(node, figNode, 'layoutSizingVertical');
  copyIfPresent(node, figNode, 'layoutPositioning');
  copyIfDefined(node, figNode, 'layoutGrow');
  copyManyIfDefined(node, figNode, ['minWidth', 'maxWidth', 'minHeight', 'maxHeight']);
}

/**
 * Add text-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addTextProperties(node, figNode) {
  extractTextCharacters(node, figNode);
  extractTextStyle(node, figNode);
  copyIfPresent(node, figNode, 'characterStyleOverrides');
  copyIfPresent(node, figNode, 'styleOverrideTable');
  copyIfPresent(node, figNode, 'textAutoResize');
}

/**
 * Extract text characters from binary or REST API format
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function extractTextCharacters(node, figNode) {
  if (figNode.characters) {
    node.characters = figNode.characters;
  } else if (figNode.textData?.characters) {
    node.characters = figNode.textData.characters;
  }
}

/**
 * Extract text style from binary format fields
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function extractTextStyle(node, figNode) {
  if (figNode.style) {
    node.style = figNode.style;
    return;
  }
  node.style = buildStyleFromBinary(figNode);
}

/**
 * Extract numeric value from binary unit object or plain number
 * @param {object|number} val - Value like {value, units} or number
 * @param {number} fontSize - Font size for percent conversion
 * @returns {number} Pixel value
 */
function extractUnitValue(val, fontSize) {
  if (typeof val === 'number') {
    return val;
  }
  if (val && typeof val === 'object' && val.value !== undefined) {
    if (val.units === 'PERCENT' && fontSize) {
      return (val.value / 100) * fontSize;
    }
    return val.value;
  }
  return 0;
}

/**
 * Extract lineHeight unit info from binary value
 * @param {object} style - Target style
 * @param {object|number} lineHeight - Raw lineHeight value
 */
function extractLineHeightUnit(style, lineHeight) {
  if (typeof lineHeight === 'object' && lineHeight.units) {
    style.lineHeightUnit = lineHeight.units === 'PERCENT' ? 'FONT_SIZE_%' : 'PIXELS';
    if (lineHeight.units === 'PERCENT') {
      style.lineHeightPercent = lineHeight.value;
    }
  }
}

/**
 * Build a Figma REST API style object from binary fields
 * @param {object} figNode - Source .fig node
 * @returns {object} Figma-compatible style object
 */
function buildStyleFromBinary(figNode) {
  const style = {};
  if (figNode.fontName?.family) {
    style.fontFamily = figNode.fontName.family;
  }
  if (figNode.fontSize) {
    style.fontSize = figNode.fontSize;
  }
  if (figNode.fontName?.style) {
    style.fontWeight = parseFontWeight(figNode.fontName.style);
    style.italic = /italic/i.test(figNode.fontName.style);
  }
  if (figNode.lineHeight) {
    style.lineHeightPx = extractUnitValue(figNode.lineHeight, figNode.fontSize);
    extractLineHeightUnit(style, figNode.lineHeight);
  }
  if (figNode.letterSpacing) {
    style.letterSpacing = extractUnitValue(figNode.letterSpacing, figNode.fontSize);
  }
  copyIfDefined(style, figNode, 'paragraphSpacing');
  copyIfDefined(style, figNode, 'paragraphIndent');
  copyIfPresent(style, figNode, 'textAlignHorizontal');
  copyIfPresent(style, figNode, 'textAlignVertical');
  copyIfPresent(style, figNode, 'textDecoration');
  copyIfPresent(style, figNode, 'textCase');
  copyIfPresent(style, figNode, 'listType');
  copyIfPresent(style, figNode, 'hyperlink');
  copyIfPresent(style, figNode, 'openTypeFeatures');
  return style;
}

/**
 * Parse font weight from font style string
 * @param {string} fontStyle - Font style e.g. "Bold", "Regular"
 * @returns {number} Font weight number
 */
function parseFontWeight(fontStyle) {
  const map = {
    thin: 100,
    extralight: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  };
  const lower = (fontStyle || '').toLowerCase();
  for (const [key, weight] of Object.entries(map)) {
    if (lower.includes(key)) {
      return weight;
    }
  }
  return 400;
}

/**
 * Add rectangle-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addRectangleProperties(node, figNode) {
  copyIfDefined(node, figNode, 'cornerRadius');
  copyIfPresent(node, figNode, 'rectangleCornerRadii');
  copyIfDefined(node, figNode, 'locked');
}

/**
 * Add frame/component layout properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addFrameProperties(node, figNode) {
  copyIfPresent(node, figNode, 'layoutMode');
  copyIfPresent(node, figNode, 'primaryAxisSizingMode');
  copyIfPresent(node, figNode, 'counterAxisSizingMode');
  copyIfPresent(node, figNode, 'primaryAxisAlignItems');
  copyIfPresent(node, figNode, 'counterAxisAlignItems');
  copyManyIfDefined(node, figNode, [
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'itemSpacing',
  ]);
  copyIfPresent(node, figNode, 'backgroundColor');
  copyIfDefined(node, figNode, 'clipsContent');
  copyIfPresent(node, figNode, 'layoutWrap');
  copyIfDefined(node, figNode, 'counterAxisSpacing');
}

/**
 * Add instance-specific properties (instances are frame-like)
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addInstanceProperties(node, figNode) {
  copyIfPresent(node, figNode, 'componentId');
  copyIfPresent(node, figNode, 'componentProperties');
  copyIfPresent(node, figNode, 'overrides');
  copyIfPresent(node, figNode, 'componentPropertyReferences');
  addFrameProperties(node, figNode);
}

/**
 * Add vector-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addVectorProperties(node, figNode) {
  copyIfPresent(node, figNode, 'vectorData');
  copyIfPresent(node, figNode, 'handleMirroring');
  copyIfPresent(node, figNode, 'fillGeometry');
  copyIfPresent(node, figNode, 'strokeGeometry');
}

/**
 * Add ellipse-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addEllipseProperties(node, figNode) {
  copyIfPresent(node, figNode, 'arcData');
  copyIfPresent(node, figNode, 'fillGeometry');
}

/**
 * Add star-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addStarProperties(node, figNode) {
  copyIfDefined(node, figNode, 'starInnerRadius');
  copyIfDefined(node, figNode, 'starPointCount');
  copyIfPresent(node, figNode, 'fillGeometry');
  copyIfPresent(node, figNode, 'strokeGeometry');
}

/**
 * Add polygon-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addPolygonProperties(node, figNode) {
  copyIfDefined(node, figNode, 'polygonSides');
  copyIfPresent(node, figNode, 'fillGeometry');
  copyIfPresent(node, figNode, 'strokeGeometry');
}

/**
 * Add line-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addLineProperties(node, figNode) {
  copyIfPresent(node, figNode, 'strokeCap');
  copyIfPresent(node, figNode, 'fillGeometry');
  copyIfPresent(node, figNode, 'strokeGeometry');
}

/**
 * Add table-specific properties (rows, columns + frame layout)
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addTableProperties(node, figNode) {
  addFrameProperties(node, figNode);
  copyIfDefined(node, figNode, 'numRows');
  copyIfDefined(node, figNode, 'numColumns');
}

/**
 * Dispatch map: Figma type -> property handler for raw .fig nodes
 */
const typePropertyHandlers = {
  TEXT: addTextProperties,
  RECTANGLE: addRectangleProperties,
  ROUNDED_RECTANGLE: addRectangleProperties,
  FRAME: addFrameProperties,
  GROUP: addFrameProperties,
  COMPONENT: addFrameProperties,
  COMPONENT_SET: addFrameProperties,
  INSTANCE: addInstanceProperties,
  VECTOR: addVectorProperties,
  BOOLEAN_OPERATION: addVectorProperties,
  ELLIPSE: addEllipseProperties,
  STAR: addStarProperties,
  REGULAR_POLYGON: addPolygonProperties,
  LINE: addLineProperties,
  SECTION: addFrameProperties,
  TABLE: addTableProperties,
};

/**
 * Add type-specific properties to a node using dispatch map
 * @param {object} node - Target node (with .type set)
 * @param {object} figNode - Source .fig node
 */
function addTypeSpecificProperties(node, figNode) {
  const handler = typePropertyHandlers[node.type];
  if (handler) {
    handler(node, figNode);
  }
  addLayoutChildProps(node, figNode);
  copyIfPresent(node, figNode, 'isMask');
}

/**
 * Add styling properties to a converted node
 * @param {object} converted - Target node
 * @param {object} node - Source node
 */
function addStylingProperties(converted, node) {
  copyIfPresent(converted, node, 'fills');
  copyIfPresent(converted, node, 'strokes');
  copyIfDefined(converted, node, 'strokeWeight');
  copyIfPresent(converted, node, 'strokeAlign');
  copyIfPresent(converted, node, 'dashPattern');
  copyIfPresent(converted, node, 'strokeCap');
  copyIfPresent(converted, node, 'strokeCapStart');
  copyIfPresent(converted, node, 'strokeCapEnd');
  copyIfPresent(converted, node, 'strokeJoin');
  copyIfPresent(converted, node, 'individualStrokeWeights');
  copyIfPresent(converted, node, 'effects');
  copyIfDefined(converted, node, 'opacity');
  copyIfPresent(converted, node, 'blendMode');
  copyIfDefined(converted, node, 'locked');
  copyIfPresent(converted, node, 'isMask');
  copyIfPresent(converted, node, 'exportSettings');
  copyIfPresent(converted, node, 'styles');
}

/**
 * Add converted rectangle properties
 * @param {object} converted - Target node
 * @param {object} node - Source node
 */
function addConvertedRectProps(converted, node) {
  copyIfDefined(converted, node, 'cornerRadius');
  copyIfPresent(converted, node, 'rectangleCornerRadii');
}

/**
 * Add converted text properties
 * @param {object} converted - Target node
 * @param {object} node - Source node
 */
function addConvertedTextProps(converted, node) {
  copyIfPresent(converted, node, 'characters');
  copyIfPresent(converted, node, 'style');
  copyIfPresent(converted, node, 'styleOverrideTable');
  copyIfPresent(converted, node, 'textAutoResize');
}

/**
 * Add converted frame properties (with children)
 * @param {object} converted - Target node
 * @param {object} node - Source node
 * @param {Function} convertChildren - Child converter function
 */
function addConvertedFrameProps(converted, node, convertChildren) {
  if (node.children) {
    converted.children = convertChildren(node.children);
  }
  copyIfPresent(converted, node, 'layoutMode');
  copyIfDefined(converted, node, 'itemSpacing');
  copyManyIfDefined(converted, node, [
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
  ]);
  copyIfPresent(converted, node, 'layoutWrap');
  copyIfDefined(converted, node, 'counterAxisSpacing');
  copyIfPresent(converted, node, 'counterAxisAlignContent');
}

/**
 * Add converted instance properties (with children)
 * @param {object} converted - Target node
 * @param {object} node - Source node
 * @param {Function} convertChildren - Child converter function
 */
function addConvertedInstanceProps(converted, node, convertChildren) {
  if (node.children) {
    converted.children = convertChildren(node.children);
  }
  copyIfPresent(converted, node, 'componentId');
  copyIfPresent(converted, node, 'overrides');
  copyIfPresent(converted, node, 'componentPropertyReferences');
}

/**
 * Convert .fig paints to Figma paint format
 * @param {array} figPaints - .fig paint array
 * @returns {array} Figma paints
 */
function convertPaints(figPaints) {
  if (!Array.isArray(figPaints)) {
    return [];
  }
  return figPaints.map(convertSinglePaint);
}

/** Convert a single .fig paint to Figma paint format */
function convertSinglePaint(paint) {
  const converted = {
    type: paint.type || 'SOLID',
    visible: paint.visible !== false,
  };
  copyIfPresent(converted, paint, 'color');
  copyIfDefined(converted, paint, 'opacity');
  copyIfPresent(converted, paint, 'gradientStops');
  copyIfPresent(converted, paint, 'gradientTransform');
  copyIfDefined(converted, paint, 'blendMode');
  copyIfPresent(converted, paint, 'imageTransform');
  copyIfDefined(converted, paint, 'tileOffsetX');
  copyIfDefined(converted, paint, 'tileOffsetY');
  copyIfDefined(converted, paint, 'scalingFactor');
  extractImageRef(paint, converted);
  return converted;
}

/**
 * Extract image reference from binary paint format
 * @param {object} paint - .fig paint with image data
 * @param {object} converted - Target paint to populate
 */
function extractImageRef(paint, converted) {
  if (paint.imageRef) {
    converted.imageRef = paint.imageRef;
    converted.scaleMode = paint.scaleMode || 'FILL';
    return;
  }
  if (paint.image?.hash) {
    converted.imageRef = hashBytesToHex(paint.image.hash);
    converted.scaleMode = paint.imageScaleMode || 'FILL';
  }
}

/**
 * Convert a byte-array hash object to hex string
 * @param {object} hashObj - Byte array like {0: 34, 1: 222, ...}
 * @returns {string} Hex string
 */
function hashBytesToHex(hashObj) {
  if (typeof hashObj === 'string') {
    return hashObj;
  }
  const keys = Object.keys(hashObj).sort((a, b) => Number(a) - Number(b));
  return keys.map((k) => hashObj[k].toString(16).padStart(2, '0')).join('');
}

module.exports = {
  addTypeSpecificProperties,
  addStylingProperties,
  addConvertedRectProps,
  addConvertedTextProps,
  addConvertedFrameProps,
  addConvertedInstanceProps,
  convertPaints,
  copyIfDefined,
  copyIfPresent,
  copyManyIfDefined,
};
