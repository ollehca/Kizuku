/**
 * Kizu Text Formatter
 * Converts Figma text nodes to PenPot rich text format.
 * PenPot expects: root > paragraph-set > paragraph[] > text-run[]
 */

const { transformColor } = require('./kizu-style-transformer');

/**
 * Extract default text style from a Figma text node
 * @param {object} figmaNode - Figma text node
 * @returns {object} Default style properties
 */
function extractDefaultStyle(figmaNode) {
  const style = figmaNode.style || {};
  return {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: style.fontSize || 16,
    fontWeight: style.fontWeight || 400,
    lineHeightPx: style.lineHeightPx || null,
    letterSpacing: style.letterSpacing || 0,
    textAlignHorizontal: style.textAlignHorizontal || 'LEFT',
  };
}

/**
 * Extract fill color from Figma fills array
 * @param {array} fills - Figma fills
 * @returns {object} Color and opacity
 */
function extractFillColor(fills) {
  if (!fills || !fills.length) {
    return { color: '#000000', opacity: 1 };
  }
  const solidFill = fills.find((f) => f.type === 'SOLID' && f.visible !== false);
  if (!solidFill) {
    return { color: '#000000', opacity: 1 };
  }
  return {
    color: transformColor(solidFill.color),
    opacity: solidFill.opacity ?? 1,
  };
}

/**
 * Format a single text run for PenPot
 * @param {string} text - Text content
 * @param {object} style - Figma style properties
 * @param {array} fills - Figma fills for color
 * @returns {object} PenPot text run
 */
function formatTextRun(text, style, fills) {
  const { color, opacity } = extractFillColor(fills);
  return {
    text,
    'font-family': style.fontFamily || 'Arial',
    'font-size': String(style.fontSize || 16),
    'font-weight': String(style.fontWeight || 400),
    'fill-color': color,
    'fill-opacity': opacity,
  };
}

/**
 * Build text runs by grouping characters with the same style index
 * @param {string} characters - Full text string
 * @param {array} overrides - Style override indices per character
 * @param {object} overrideTable - Map of style index to style props
 * @param {object} defaultStyle - Default style for index 0
 * @returns {array} Array of { text, styleIndex, style }
 */
function buildTextRuns(characters, overrides, overrideTable, defaultStyle) {
  if (!overrides || overrides.length === 0) {
    return [{ text: characters, styleIndex: 0, style: defaultStyle }];
  }

  const runs = [];
  let currentIdx = overrides[0] || 0;
  let currentText = characters[0] || '';

  for (let idx = 1; idx < characters.length; idx++) {
    const styleIdx = overrides[idx] || 0;
    if (styleIdx === currentIdx) {
      currentText += characters[idx];
    } else {
      runs.push({ text: currentText, styleIndex: currentIdx });
      currentIdx = styleIdx;
      currentText = characters[idx];
    }
  }
  runs.push({ text: currentText, styleIndex: currentIdx });

  return runs.map((run) => ({
    ...run,
    style:
      run.styleIndex === 0
        ? defaultStyle
        : { ...defaultStyle, ...(overrideTable[run.styleIndex] || {}) },
  }));
}

/**
 * Split text runs at newline boundaries into paragraph groups
 * @param {array} runs - Array of { text, style }
 * @returns {array} Array of paragraph arrays, each containing runs
 */
function splitIntoParagraphs(runs) {
  const paragraphs = [[]];

  for (const run of runs) {
    const parts = run.text.split('\n');
    for (let idx = 0; idx < parts.length; idx++) {
      if (idx > 0) {
        paragraphs.push([]);
      }
      if (parts[idx].length > 0) {
        paragraphs[paragraphs.length - 1].push({
          text: parts[idx],
          style: run.style,
        });
      }
    }
  }

  return paragraphs.filter((para) => para.length > 0);
}

/**
 * Build PenPot paragraph-set from a Figma text node
 * @param {object} figmaNode - Figma text node
 * @returns {object} PenPot rich text content structure
 */
function buildParagraphSet(figmaNode) {
  const defaultStyle = extractDefaultStyle(figmaNode);
  const defaultFills = figmaNode.fills || [];

  const textRuns = buildTextRuns(
    figmaNode.characters || '',
    figmaNode.characterStyleOverrides,
    figmaNode.styleOverrideTable,
    defaultStyle
  );

  const paraGroups = splitIntoParagraphs(textRuns);

  const paragraphs = paraGroups.map((group) => ({
    type: 'paragraph',
    children: group.map((run) => {
      const fills = run.style.fills || defaultFills;
      return formatTextRun(run.text, run.style, fills);
    }),
  }));

  return {
    type: 'root',
    children: [
      {
        type: 'paragraph-set',
        children: paragraphs,
      },
    ],
  };
}

module.exports = {
  buildParagraphSet,
  buildTextRuns,
  formatTextRun,
  splitIntoParagraphs,
  extractDefaultStyle,
};
