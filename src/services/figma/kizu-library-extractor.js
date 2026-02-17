/**
 * Kizu Library Extractor
 * Extracts components, colors, and typography from Figma documents.
 */

const { createLogger } = require('../../utils/logger');

const logger = createLogger('KizuLibraryExtractor');

/**
 * Extract components from Figma document
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target components array
 * @param {Function} getUuid - UUID generator function
 */
function extractComponents(figmaDoc, target, getUuid) {
  if (!figmaDoc.components) {
    return;
  }

  for (const [componentId, component] of Object.entries(figmaDoc.components)) {
    target.push({
      id: getUuid(componentId),
      name: component.name,
      description: component.description || '',
      key: component.key,
    });
  }

  logger.info('Extracted components', { count: target.length });
}

/**
 * Extract color library from Figma document
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target colors array
 * @param {Function} getUuid - UUID generator function
 */
function extractColorLibrary(figmaDoc, target, getUuid) {
  if (!figmaDoc.styles) {
    return;
  }

  for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
    if (style.styleType === 'FILL') {
      target.push({
        id: getUuid(styleId),
        name: style.name,
        description: style.description || '',
      });
    }
  }

  logger.info('Extracted colors', { count: target.length });
}

/**
 * Extract typography library from Figma document
 * @param {object} figmaDoc - Figma document
 * @param {array} target - Target typography array
 * @param {Function} getUuid - UUID generator function
 */
function extractTypographyLibrary(figmaDoc, target, getUuid) {
  if (!figmaDoc.styles) {
    return;
  }

  for (const [styleId, style] of Object.entries(figmaDoc.styles)) {
    if (style.styleType === 'TEXT') {
      target.push({
        id: getUuid(styleId),
        name: style.name,
        description: style.description || '',
      });
    }
  }

  logger.info('Extracted typography', { count: target.length });
}

module.exports = {
  extractComponents,
  extractColorLibrary,
  extractTypographyLibrary,
};
