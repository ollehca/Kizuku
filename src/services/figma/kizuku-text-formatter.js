/**
 * Kizuku Text Formatter
 * Converts Figma text nodes to PenPot rich text format.
 * PenPot expects: root > paragraph-set > paragraph[] > text-run[]
 */

const { transformColor } = require('./kizuku-style-transformer');

/**
 * Map Figma text decoration to PenPot format
 * @param {string} decoration - Figma textDecoration
 * @returns {string} PenPot text-decoration value
 */
function mapTextDecoration(decoration) {
  const map = { UNDERLINE: 'underline', STRIKETHROUGH: 'line-through' };
  return map[decoration] || 'none';
}

/**
 * Map Figma text case to PenPot text-transform
 * @param {string} textCase - Figma textCase
 * @returns {string} PenPot text-transform value
 */
function mapTextCase(textCase) {
  const map = {
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
    SMALL_CAPS: 'uppercase',
    SMALL_CAPS_FORCED: 'uppercase',
  };
  return map[textCase] || 'none';
}

/**
 * Map Figma horizontal text alignment to PenPot
 * @param {string} align - Figma textAlignHorizontal
 * @returns {string} PenPot text-align value
 */
function mapTextAlign(align) {
  const map = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
  return map[align] || 'left';
}

/**
 * Map Figma vertical text alignment to PenPot
 * @param {string} align - Figma textAlignVertical
 * @returns {string} PenPot vertical-align value
 */
function mapVerticalAlign(align) {
  const map = { TOP: 'top', CENTER: 'center', BOTTOM: 'bottom' };
  return map[align] || 'top';
}

/**
 * Map Figma textAutoResize to PenPot grow-type
 * @param {string} autoResize - Figma textAutoResize
 * @returns {string} PenPot grow-type value
 */
function mapGrowType(autoResize) {
  const map = {
    WIDTH_AND_HEIGHT: 'auto-width',
    HEIGHT: 'auto-height',
    NONE: 'fixed',
    TRUNCATE: 'fixed',
  };
  return map[autoResize] || 'fixed';
}

/**
 * Extract default text style from a Figma text node
 * @param {object} figmaNode - Figma text node
 * @returns {object} Default style properties
 */
function extractDefaultStyle(figmaNode) {
  const style = figmaNode.style || {};
  const baseStyle = extractBaseStyleProps(style);
  const layoutStyle = extractLayoutStyleProps(style);
  return {
    ...baseStyle,
    ...layoutStyle,
    textAutoResize: figmaNode.textAutoResize || 'NONE',
  };
}

/**
 * Extract base font and decoration style properties
 * @param {object} style - Figma style object
 * @returns {object} Base style properties
 */
function extractBaseStyleProps(style) {
  return {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: style.fontSize || 16,
    fontWeight: style.fontWeight || 400,
    italic: style.italic || false,
    lineHeightPx: style.lineHeightPx || null,
    letterSpacing: style.letterSpacing || 0,
  };
}

/**
 * Extract text layout and alignment style properties
 * @param {object} style - Figma style object
 * @returns {object} Layout style properties
 */
function extractLayoutStyleProps(style) {
  return {
    textAlignHorizontal: style.textAlignHorizontal || 'LEFT',
    textAlignVertical: style.textAlignVertical || 'TOP',
    textDecoration: style.textDecoration || 'NONE',
    textCase: style.textCase || 'ORIGINAL',
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
 * Build text run styling properties
 * @param {object} style - Figma style properties
 * @returns {object} PenPot text run style fields
 */
function buildRunStyle(style) {
  const run = buildBaseFontProps(style);
  attachOptionalTextProps(style, run);
  return run;
}

/**
 * Build base font properties for a text run
 * @param {object} style - Figma style properties
 * @returns {object} Base font properties
 */
function buildBaseFontProps(style) {
  return {
    'font-family': style.fontFamily || 'Arial',
    'font-size': String(style.fontSize || 16),
    'font-weight': String(style.fontWeight || 400),
  };
}

/**
 * Attach optional text styling properties
 * @param {object} style - Figma style properties
 * @param {object} run - Text run object to extend
 */
function attachOptionalTextProps(style, run) {
  if (style.italic) {
    run['font-style'] = 'italic';
  }
  const lineHeight = style.lineHeightPx || Math.round((style.fontSize || 16) * 1.2);
  run['line-height'] = String(lineHeight);
  if (style.letterSpacing) {
    run['letter-spacing'] = String(style.letterSpacing);
  }
  if (style.textDecoration && style.textDecoration !== 'NONE') {
    run['text-decoration'] = mapTextDecoration(style.textDecoration);
  }
  if (style.textCase && style.textCase !== 'ORIGINAL') {
    run['text-transform'] = mapTextCase(style.textCase);
  }
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
    ...buildRunStyle(style),
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
  const runs = groupCharsByStyle(characters, overrides);
  return resolveRunStyles(runs, overrideTable, defaultStyle);
}

/**
 * Group characters into runs by style index
 * @param {string} characters - Full text string
 * @param {array} overrides - Style override indices per character
 * @returns {array} Array of { text, styleIndex }
 */
function groupCharsByStyle(characters, overrides) {
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
  return runs;
}

/**
 * Resolve style overrides for each text run
 * @param {array} runs - Array of { text, styleIndex }
 * @param {object} overrideTable - Style override table
 * @param {object} defaultStyle - Default style
 * @returns {array} Array of { text, styleIndex, style }
 */
function resolveRunStyles(runs, overrideTable, defaultStyle) {
  return runs.map((run) => {
    const override = overrideTable?.[run.styleIndex] || {};
    return {
      ...run,
      style: run.styleIndex === 0 ? defaultStyle : { ...defaultStyle, ...override },
      fills: override.fills || null,
    };
  });
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
          fills: run.fills,
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
  const textAlign = mapTextAlign(defaultStyle.textAlignHorizontal);

  const paragraphs = paraGroups.map((group) => ({
    type: 'paragraph',
    'text-align': textAlign,
    children: group.map((run) => {
      const fills = run.fills || defaultFills;
      return formatTextRun(run.text, run.style, fills);
    }),
  }));

  return {
    type: 'root',
    'vertical-align': mapVerticalAlign(defaultStyle.textAlignVertical),
    'grow-type': mapGrowType(defaultStyle.textAutoResize),
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
  mapTextDecoration,
  mapTextCase,
  mapTextAlign,
  mapVerticalAlign,
  mapGrowType,
};
