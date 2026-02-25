/**
 * Kizuku Layout Transformer
 * Maps Figma auto-layout properties to PenPot flex layout format.
 * Handles container layout, child sizing, and absolute positioning.
 */

/** Figma primary axis alignment to PenPot justify-content */
const JUSTIFY_MAP = {
  MIN: 'start',
  CENTER: 'center',
  MAX: 'end',
  SPACE_BETWEEN: 'space-between',
  SPACE_AROUND: 'space-around',
  SPACE_EVENLY: 'space-evenly',
};

/** Figma counter axis alignment to PenPot align-items */
const ALIGN_MAP = {
  MIN: 'start',
  CENTER: 'center',
  MAX: 'end',
  BASELINE: 'start',
};

/** Figma sizing mode to PenPot item sizing */
const SIZING_MAP = {
  FIXED: 'fix',
  HUG: 'auto',
  FILL: 'fill',
};

/**
 * Map Figma primary axis alignment to PenPot justify-content
 * @param {string} align - Figma primaryAxisAlignItems
 * @returns {string} PenPot justify-content value
 */
function mapJustifyContent(align) {
  return JUSTIFY_MAP[align] || 'start';
}

/**
 * Map Figma counter axis alignment to PenPot align-items
 * @param {string} align - Figma counterAxisAlignItems
 * @returns {string} PenPot align-items value
 */
function mapAlignItems(align) {
  return ALIGN_MAP[align] || 'start';
}

/**
 * Map Figma sizing mode to PenPot item sizing value
 * @param {string} sizing - Figma layoutSizingHorizontal/Vertical
 * @returns {string} PenPot sizing (fix/auto/fill)
 */
function mapItemSizing(sizing) {
  return SIZING_MAP[sizing] || 'fix';
}

/**
 * Map Figma wrap mode to PenPot wrap type
 * @param {string} wrap - Figma layoutWrap value
 * @returns {string} PenPot wrap type (wrap/nowrap)
 */
function mapWrapType(wrap) {
  return wrap === 'WRAP' ? 'wrap' : 'nowrap';
}

/**
 * Transform Figma auto-layout container to PenPot flex layout
 * @param {object} figmaNode - Figma node with layoutMode
 * @returns {object} PenPot flex layout properties
 */
function transformLayout(figmaNode) {
  if (!figmaNode.layoutMode || figmaNode.layoutMode === 'NONE') {
    return null;
  }
  return {
    layout: 'flex',
    layoutFlexDir: figmaNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
    layoutGap: buildLayoutGap(figmaNode),
    layoutPadding: buildLayoutPadding(figmaNode),
    layoutJustifyContent: mapJustifyContent(figmaNode.primaryAxisAlignItems),
    layoutAlignItems: mapAlignItems(figmaNode.counterAxisAlignItems),
    layoutWrapType: mapWrapType(figmaNode.layoutWrap),
    layoutAlignContent: mapAlignItems(figmaNode.counterAxisAlignItems),
  };
}

/**
 * Build layout gap from Figma spacing properties
 * @param {object} figmaNode - Figma node
 * @returns {object} Gap object { rowGap, columnGap }
 */
function buildLayoutGap(figmaNode) {
  const spacing = figmaNode.itemSpacing || 0;
  const counterSpacing = figmaNode.counterAxisSpacing || spacing;
  return {
    rowGap: spacing,
    columnGap: counterSpacing,
  };
}

/**
 * Build layout padding from Figma padding properties
 * @param {object} figmaNode - Figma node
 * @returns {object} Padding object { p1, p2, p3, p4 }
 */
function buildLayoutPadding(figmaNode) {
  return {
    p1: figmaNode.paddingTop || 0,
    p2: figmaNode.paddingRight || 0,
    p3: figmaNode.paddingBottom || 0,
    p4: figmaNode.paddingLeft || 0,
  };
}

/**
 * Transform child sizing properties for layout children
 * @param {object} figmaNode - Figma child node
 * @returns {object} PenPot layout child properties
 */
function transformLayoutChild(figmaNode) {
  const result = {
    layoutItemHSizing: mapItemSizing(figmaNode.layoutSizingHorizontal),
    layoutItemVSizing: mapItemSizing(figmaNode.layoutSizingVertical),
  };

  attachMinMaxConstraints(figmaNode, result);
  attachAbsolutePosition(figmaNode, result);
  attachGrowShrink(figmaNode, result);

  return result;
}

/**
 * Attach min/max dimension constraints to result
 * @param {object} figmaNode - Figma node
 * @param {object} result - Result object to extend
 */
function attachMinMaxConstraints(figmaNode, result) {
  if (figmaNode.minWidth !== null && figmaNode.minWidth !== undefined) {
    result.layoutItemMinW = figmaNode.minWidth;
  }
  if (figmaNode.maxWidth !== null && figmaNode.maxWidth !== undefined) {
    result.layoutItemMaxW = figmaNode.maxWidth;
  }
  if (figmaNode.minHeight !== null && figmaNode.minHeight !== undefined) {
    result.layoutItemMinH = figmaNode.minHeight;
  }
  if (figmaNode.maxHeight !== null && figmaNode.maxHeight !== undefined) {
    result.layoutItemMaxH = figmaNode.maxHeight;
  }
}

/**
 * Attach absolute positioning flag to result
 * @param {object} figmaNode - Figma node
 * @param {object} result - Result object to extend
 */
function attachAbsolutePosition(figmaNode, result) {
  if (figmaNode.layoutPositioning === 'ABSOLUTE') {
    result.layoutItemAbsolute = true;
  }
}

/**
 * Attach grow/shrink factors to result
 * @param {object} figmaNode - Figma node
 * @param {object} result - Result object to extend
 */
function attachGrowShrink(figmaNode, result) {
  if (figmaNode.layoutGrow !== null && figmaNode.layoutGrow !== undefined) {
    result.layoutItemGrow = figmaNode.layoutGrow;
  }
  if (figmaNode.layoutShrink !== null && figmaNode.layoutShrink !== undefined) {
    result.layoutItemShrink = figmaNode.layoutShrink;
  }
}

/**
 * Check if a Figma node has auto-layout
 * @param {object} figmaNode - Figma node
 * @returns {boolean} True if node has auto-layout
 */
function hasLayout(figmaNode) {
  return figmaNode.layoutMode && figmaNode.layoutMode !== 'NONE';
}

/**
 * Check if a Figma node is a layout child with sizing info
 * @param {object} figmaNode - Figma node
 * @returns {boolean} True if node has layout child sizing
 */
function hasLayoutChildSizing(figmaNode) {
  return !!(figmaNode.layoutSizingHorizontal || figmaNode.layoutSizingVertical);
}

module.exports = {
  transformLayout,
  transformLayoutChild,
  hasLayout,
  hasLayoutChildSizing,
  mapJustifyContent,
  mapAlignItems,
  mapItemSizing,
  mapWrapType,
};
