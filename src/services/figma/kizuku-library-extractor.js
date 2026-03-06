/**
 * Kizuku Library Extractor
 * Extracts components, colors, and typography from Figma documents.
 * Cross-references style IDs with nodes to extract actual values.
 */

const { createLogger } = require('../../utils/logger');
const { transformColor } = require('./kizuku-style-transformer');

const logger = createLogger('KizukuLibraryExtractor');

/**
 * Find a node by ID in the document tree
 * @param {object} node - Root node to search from
 * @param {string} targetId - Node ID to find
 * @returns {object|null} Found node or null
 */
function findNodeById(node, targetId) {
  if (!node) {
    return null;
  }
  if (node.id === targetId) {
    return node;
  }
  const children = node.children || node.document?.children || [];
  for (const child of children) {
    const found = findNodeById(child, targetId);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Collect nodes that reference a specific style ID
 * @param {object} node - Root node
 * @param {string} styleId - Style ID to search for
 * @param {string} styleType - Style type (fill/text/effect)
 * @returns {array} Nodes using this style
 */
function collectStyleReferences(node, styleId, styleType) {
  const results = [];
  walkTree(node, (child) => {
    const styleMap = child.styles || {};
    const refMatches = Object.entries(styleMap).some(
      ([key, val]) => val === styleId && matchesStyleType(key, styleType)
    );
    if (refMatches) {
      results.push(child);
    }
  });
  return results;
}

/**
 * Check if a style key matches the expected type
 * @param {string} key - Style key (fill, stroke, text, effect)
 * @param {string} styleType - Expected style type
 * @returns {boolean} True if matching
 */
function matchesStyleType(key, styleType) {
  if (styleType === 'FILL') {
    return key === 'fill' || key === 'fills';
  }
  if (styleType === 'TEXT') {
    return key === 'text';
  }
  return key === 'effect';
}

/**
 * Walk the document tree and call visitor on each node
 * @param {object} node - Root node
 * @param {Function} visitor - Visitor function
 */
function walkTree(node, visitor) {
  if (!node) {
    return;
  }
  visitor(node);
  const children = node.children || node.document?.children || [];
  for (const child of children) {
    walkTree(child, visitor);
  }
}

/**
 * Extract color value from a node's fills
 * @param {object} node - Figma node with fills
 * @returns {string|null} Hex color or null
 */
function extractColorFromNode(node) {
  const fills = node.fills || [];
  const visibleFill = fills.find((f) => f.visible !== false);
  if (!visibleFill) {
    return null;
  }
  if (visibleFill.type === 'SOLID' && visibleFill.color) {
    return transformColor(visibleFill.color);
  }
  if (visibleFill.type?.startsWith('GRADIENT_')) {
    return extractGradientColor(visibleFill);
  }
  return null;
}

/**
 * Extract gradient info from a gradient fill
 * @param {object} fill - Gradient fill
 * @returns {object} Gradient style data
 */
function extractGradientColor(fill) {
  return {
    type: 'gradient',
    gradientType: fill.type,
    stops: (fill.gradientStops || []).map((stop) => ({
      color: transformColor(stop.color),
      position: stop.position || 0,
    })),
  };
}

/**
 * Extract text style properties from a node
 * @param {object} node - Figma text node
 * @returns {object|null} Text style properties or null
 */
function extractTextStyleFromNode(node) {
  const style = node.style;
  if (!style) {
    return null;
  }
  return {
    fontFamily: style.fontFamily || null,
    fontSize: style.fontSize || null,
    fontWeight: style.fontWeight || null,
    lineHeightPx: style.lineHeightPx || null,
    letterSpacing: style.letterSpacing || null,
    italic: style.italic || false,
  };
}

/**
 * Extract components from Figma document with visual data
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target components array
 * @param {Function} getUuid - UUID generator function
 */
function extractComponents(figmaDoc, target, getUuid) {
  if (!figmaDoc.components) {
    return;
  }

  for (const [componentId, component] of Object.entries(figmaDoc.components)) {
    const entry = {
      id: getUuid(componentId),
      name: component.name,
      description: component.description || '',
      key: component.key,
    };
    const node = findNodeById(figmaDoc, componentId);
    if (node) {
      entry.hasVisualData = true;
      entry.boundingBox = node.absoluteBoundingBox || null;
    }
    target.push(entry);
  }

  logger.info('Extracted components', { count: target.length });
}

/**
 * Extract color library from Figma document with values
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target colors array
 * @param {Function} getUuid - UUID generator function
 */
function extractColorLibrary(figmaDoc, target, getUuid) {
  if (!figmaDoc.styles) {
    return;
  }

  for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
    if (style.styleType !== 'FILL') {
      continue;
    }
    const entry = {
      id: getUuid(styleId),
      name: style.name,
      description: style.description || '',
      color: null,
    };
    const refs = collectStyleReferences(figmaDoc, styleId, 'FILL');
    if (refs.length > 0) {
      entry.color = extractColorFromNode(refs[0]);
    }
    target.push(entry);
  }

  logger.info('Extracted colors', { count: target.length });
}

/**
 * Extract typography library from Figma document with font props
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target typography array
 * @param {Function} getUuid - UUID generator function
 */
function extractTypographyLibrary(figmaDoc, target, getUuid) {
  if (!figmaDoc.styles) {
    return;
  }

  for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
    if (style.styleType !== 'TEXT') {
      continue;
    }
    const entry = {
      id: getUuid(styleId),
      name: style.name,
      description: style.description || '',
      fontProps: null,
    };
    const refs = collectStyleReferences(figmaDoc, styleId, 'TEXT');
    if (refs.length > 0) {
      entry.fontProps = extractTextStyleFromNode(refs[0]);
    }
    target.push(entry);
  }

  logger.info('Extracted typography', { count: target.length });
}

/**
 * Extract effect library from Figma document
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target effects array
 * @param {Function} getUuid - UUID generator function
 */
function extractEffectLibrary(figmaDoc, target, getUuid) {
  if (!figmaDoc.styles) {
    return;
  }
  for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
    if (style.styleType !== 'EFFECT') {
      continue;
    }
    const entry = {
      id: getUuid(styleId),
      name: style.name,
      description: style.description || '',
      effects: null,
    };
    const refs = collectStyleReferences(figmaDoc, styleId, 'EFFECT');
    if (refs.length > 0 && refs[0].effects) {
      entry.effects = refs[0].effects;
    }
    target.push(entry);
  }
  logger.info('Extracted effects', { count: target.length });
}

/**
 * Collect all style references in a single tree walk (O(N)).
 * Returns a map of styleId -> [nodes]
 * @param {object} rootNode - Document root
 * @returns {Map<string, array>} Map of style ID to referencing nodes
 */
function collectAllStyleReferences(rootNode) {
  const refMap = new Map();
  walkTree(rootNode, (node) => {
    const styles = node.styles || {};
    for (const val of Object.values(styles)) {
      if (!refMap.has(val)) {
        refMap.set(val, []);
      }
      refMap.get(val).push(node);
    }
  });
  return refMap;
}

module.exports = {
  extractComponents,
  extractColorLibrary,
  extractTypographyLibrary,
  extractEffectLibrary,
  findNodeById,
  collectStyleReferences,
  collectAllStyleReferences,
};
