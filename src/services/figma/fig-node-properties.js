/**
 * Fig Node Property Handlers
 * Maps Figma node types to property extraction functions.
 * Used by FigFileParser to decompose high-complexity switch blocks.
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
 * Add text-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addTextProperties(node, figNode) {
  copyIfPresent(node, figNode, 'characters');
  copyIfPresent(node, figNode, 'style');
  copyIfPresent(node, figNode, 'characterStyleOverrides');
}

/**
 * Add rectangle-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addRectangleProperties(node, figNode) {
  copyIfDefined(node, figNode, 'cornerRadius');
  copyIfPresent(node, figNode, 'rectangleCornerRadii');
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
  copyIfDefined(node, figNode, 'paddingLeft');
  copyIfDefined(node, figNode, 'paddingRight');
  copyIfDefined(node, figNode, 'paddingTop');
  copyIfDefined(node, figNode, 'paddingBottom');
  copyIfDefined(node, figNode, 'itemSpacing');
  copyIfPresent(node, figNode, 'backgroundColor');
  copyIfDefined(node, figNode, 'clipsContent');
}

/**
 * Add instance-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addInstanceProperties(node, figNode) {
  copyIfPresent(node, figNode, 'componentId');
  copyIfPresent(node, figNode, 'componentProperties');
}

/**
 * Add vector-specific properties
 * @param {object} node - Target node
 * @param {object} figNode - Source .fig node
 */
function addVectorProperties(node, figNode) {
  copyIfPresent(node, figNode, 'vectorData');
  copyIfPresent(node, figNode, 'handleMirroring');
}

/**
 * Dispatch map: Figma type -> property handler for raw .fig nodes
 */
const typePropertyHandlers = {
  TEXT: addTextProperties,
  RECTANGLE: addRectangleProperties,
  FRAME: addFrameProperties,
  COMPONENT: addFrameProperties,
  COMPONENT_SET: addFrameProperties,
  INSTANCE: addInstanceProperties,
  VECTOR: addVectorProperties,
  BOOLEAN_OPERATION: addVectorProperties,
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
  copyIfPresent(converted, node, 'effects');
  copyIfDefined(converted, node, 'opacity');
  copyIfPresent(converted, node, 'blendMode');
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
  copyIfDefined(converted, node, 'paddingLeft');
  copyIfDefined(converted, node, 'paddingRight');
  copyIfDefined(converted, node, 'paddingTop');
  copyIfDefined(converted, node, 'paddingBottom');
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

  return figPaints.map((paint) => {
    const converted = {
      type: paint.type || 'SOLID',
      visible: paint.visible !== false,
    };
    copyIfPresent(converted, paint, 'color');
    copyIfDefined(converted, paint, 'opacity');
    copyIfPresent(converted, paint, 'gradientStops');
    copyIfPresent(converted, paint, 'gradientTransform');
    if (paint.imageRef) {
      converted.imageRef = paint.imageRef;
      converted.scaleMode = paint.scaleMode || 'FILL';
    }
    return converted;
  });
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
};
