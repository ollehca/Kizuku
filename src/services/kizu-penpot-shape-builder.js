/**
 * Kizu PenPot Shape Builder
 * Converts Kizu intermediate format properties to PenPot shape format.
 * Handles fills, strokes, effects, text, paths, layout, and constraints.
 */

/**
 * Convert Kizu solid fill to PenPot fill
 * @param {object} fill - Kizu fill with type 'color'
 * @returns {object} PenPot fill
 */
function convertSolidFill(fill) {
  return {
    'fill-color': fill.color,
    'fill-opacity': fill.opacity ?? 1,
  };
}

/**
 * Convert Kizu gradient fill to PenPot fill
 * @param {object} fill - Kizu fill with type 'gradient'
 * @returns {object} PenPot gradient fill
 */
function convertGradientFill(fill) {
  const grad = fill.gradient || {};
  return {
    'fill-color-gradient': {
      type: grad.type || 'linear',
      'start-x': grad.startX || 0,
      'start-y': grad.startY || 0.5,
      'end-x': grad.endX || 1,
      'end-y': grad.endY || 0.5,
      width: grad.width || 1,
      stops: (grad.stops || []).map(convertGradientStop),
    },
    'fill-opacity': fill.opacity ?? 1,
  };
}

/**
 * Convert a gradient stop to PenPot format
 * @param {object} stop - Gradient stop { position, color }
 * @returns {object} PenPot gradient stop
 */
function convertGradientStop(stop) {
  return {
    offset: stop.position,
    color: stop.color,
    opacity: 1,
  };
}

/**
 * Convert Kizu image fill to PenPot fill
 * @param {object} fill - Kizu fill with type 'image'
 * @returns {object} PenPot image fill
 */
function convertImageFill(fill) {
  return {
    'fill-image': {
      id: fill.imageRef,
      'scale-mode': (fill.scaleMode || 'FILL').toLowerCase(),
    },
    'fill-opacity': fill.opacity ?? 1,
  };
}

/** Fill type converter dispatch map */
const FILL_CONVERTERS = {
  color: convertSolidFill,
  gradient: convertGradientFill,
  image: convertImageFill,
};

/**
 * Convert Kizu fills array to PenPot fills
 * @param {array} fills - Kizu fills
 * @returns {array} PenPot fills
 */
function convertFillsToPenpot(fills) {
  if (!fills || !Array.isArray(fills)) {
    return [];
  }
  return fills
    .map((fill) => {
      if (fill['fill-color'] || fill['fill-color-gradient']) {
        return fill;
      }
      const converter = FILL_CONVERTERS[fill.type];
      return converter ? converter(fill) : convertLegacyFill(fill);
    })
    .filter(Boolean);
}

/**
 * Convert legacy fill format (plain color string)
 * @param {object} fill - Fill with color string property
 * @returns {object|null} PenPot fill or null
 */
function convertLegacyFill(fill) {
  if (fill.color && typeof fill.color === 'string') {
    return {
      'fill-color': fill.color,
      'fill-opacity': fill.opacity ?? 1,
    };
  }
  return null;
}

/**
 * Convert a single Kizu stroke to PenPot stroke
 * @param {object} stroke - Kizu stroke
 * @returns {object|null} PenPot stroke or null
 */
function convertSingleStroke(stroke) {
  if (stroke['stroke-color']) {
    return stroke;
  }
  if (!stroke.color || typeof stroke.color !== 'string') {
    return null;
  }
  const result = {
    'stroke-color': stroke.color,
    'stroke-opacity': stroke.opacity ?? 1,
    'stroke-width': stroke.width || 1,
    'stroke-alignment': stroke.alignment || 'center',
    'stroke-style': stroke.style || 'solid',
  };
  attachStrokeCaps(stroke, result);
  return result;
}

/**
 * Attach stroke cap markers to result
 * @param {object} stroke - Kizu stroke with cap properties
 * @param {object} result - PenPot stroke to extend
 */
function attachStrokeCaps(stroke, result) {
  if (stroke.capStart) {
    result['stroke-cap-start'] = stroke.capStart;
  }
  if (stroke.capEnd) {
    result['stroke-cap-end'] = stroke.capEnd;
  }
}

/**
 * Convert Kizu strokes array to PenPot strokes
 * @param {array} strokes - Kizu strokes
 * @param {number} strokeWeight - Default stroke weight
 * @returns {array} PenPot strokes
 */
function convertStrokesToPenpot(strokes, strokeWeight) {
  if (!strokes || !Array.isArray(strokes)) {
    return [];
  }
  return strokes
    .map((stroke) => {
      const result = convertSingleStroke(stroke);
      if (result && strokeWeight && !result['stroke-width']) {
        result['stroke-width'] = strokeWeight;
      }
      return result;
    })
    .filter(Boolean);
}

/**
 * Convert a shadow effect to PenPot format
 * @param {object} effect - Kizu shadow effect
 * @returns {object} PenPot shadow
 */
function convertShadowEffect(effect) {
  return {
    type: effect.type,
    color: { color: effect.color, opacity: 1 },
    offset: { x: effect.offsetX || 0, y: effect.offsetY || 0 },
    blur: effect.blur || 0,
    spread: effect.spread || 0,
    hidden: false,
  };
}

/**
 * Convert effects array to PenPot shadow and blur arrays
 * @param {array} effects - Kizu effects
 * @returns {object} { shadow, blur } arrays for PenPot
 */
function convertEffectsToPenpot(effects) {
  if (!effects || !Array.isArray(effects)) {
    return { shadow: [], blur: null };
  }
  const shadows = [];
  let blur = null;

  for (const effect of effects) {
    if (effect.type === 'blur') {
      blur = { type: 'layer-blur', value: effect.value || 0, hidden: false };
    } else {
      shadows.push(convertShadowEffect(effect));
    }
  }

  return { shadow: shadows, blur };
}

/**
 * Convert path commands to PenPot path segments
 * @param {array} commands - Kizu path command objects
 * @returns {array} PenPot path segments
 */
function convertPathSegments(commands) {
  if (!commands || !Array.isArray(commands)) {
    return [];
  }
  return commands.map(convertSingleSegment).filter(Boolean);
}

/** Command to PenPot segment type mapping */
const SEGMENT_TYPE_MAP = {
  M: 'move-to',
  L: 'line-to',
  C: 'curve-to',
  Z: 'close-path',
};

/**
 * Convert a single path command to PenPot segment
 * @param {object} cmd - Path command { command, x, y, ... }
 * @returns {object|null} PenPot segment or null
 */
function convertSingleSegment(cmd) {
  const type = SEGMENT_TYPE_MAP[cmd.command];
  if (!type) {
    return null;
  }
  if (cmd.command === 'Z') {
    return { type: 'close-path' };
  }
  if (cmd.command === 'C') {
    return convertCurveSegment(cmd);
  }
  return { type, params: { x: cmd.x || 0, y: cmd.y || 0 } };
}

/**
 * Convert a cubic bezier command to PenPot curve segment
 * @param {object} cmd - Cubic bezier command
 * @returns {object} PenPot curve-to segment
 */
function convertCurveSegment(cmd) {
  return {
    type: 'curve-to',
    params: {
      x: cmd.x || 0,
      y: cmd.y || 0,
      c1x: cmd.x1 || 0,
      c1y: cmd.y1 || 0,
      c2x: cmd.x2 || 0,
      c2y: cmd.y2 || 0,
    },
  };
}

/**
 * Build PenPot path content from Kizu node
 * @param {object} node - Kizu path node
 * @returns {object} PenPot content with segments and fill-rule
 */
function convertPathContent(node) {
  return {
    segments: convertPathSegments(node.commands),
    'fill-rule': node.fillRule || 'nonzero',
  };
}

/**
 * Convert Kizu corner radii to PenPot per-corner format
 * @param {object} node - Kizu node with cornerRadii
 * @returns {object} PenPot corner radius properties
 */
function convertCornerRadius(node) {
  const radii = node.cornerRadii;
  if (!radii) {
    const rad = node.cornerRadius || 0;
    return { r1: rad, r2: rad, r3: rad, r4: rad };
  }
  return {
    r1: radii.topLeft || 0,
    r2: radii.topRight || 0,
    r3: radii.bottomRight || 0,
    r4: radii.bottomLeft || 0,
  };
}

/** Constraint value mapping from Figma to PenPot */
const CONSTRAINT_MAP = {
  MIN: 'left',
  MAX: 'right',
  CENTER: 'center',
  STRETCH: 'leftright',
  SCALE: 'scale',
};

/**
 * Map a single constraint value to PenPot format
 * @param {string} val - Figma constraint value
 * @param {boolean} isVertical - Whether this is vertical
 * @returns {string} PenPot constraint value
 */
function mapConstraintValue(val, isVertical) {
  if (isVertical) {
    const vertMap = { MIN: 'top', MAX: 'bottom', STRETCH: 'topbottom' };
    return vertMap[val] || CONSTRAINT_MAP[val] || 'top';
  }
  return CONSTRAINT_MAP[val] || 'left';
}

/**
 * Convert Kizu constraints to PenPot constraint properties
 * @param {object} constraints - Kizu constraints { horizontal, vertical }
 * @returns {object} PenPot constraints
 */
function convertConstraints(constraints) {
  if (!constraints) {
    return { 'constraints-h': 'left', 'constraints-v': 'top' };
  }
  return {
    'constraints-h': mapConstraintValue(constraints.horizontal, false),
    'constraints-v': mapConstraintValue(constraints.vertical, true),
  };
}

/**
 * Convert Kizu layout properties to PenPot flex properties
 * @param {object} layout - Kizu layout object from transformLayout
 * @returns {object} PenPot layout properties
 */
function convertLayoutToPenpot(layout) {
  if (!layout) {
    return {};
  }
  return {
    layout: layout.layout || 'flex',
    'layout-flex-dir': layout.layoutFlexDir || 'row',
    'layout-gap': layout.layoutGap || { rowGap: 0, columnGap: 0 },
    'layout-padding': layout.layoutPadding || { p1: 0, p2: 0, p3: 0, p4: 0 },
    'layout-justify-content': layout.layoutJustifyContent || 'start',
    'layout-align-items': layout.layoutAlignItems || 'start',
    'layout-wrap-type': layout.layoutWrapType || 'nowrap',
    'layout-align-content': layout.layoutAlignContent || 'start',
  };
}

/**
 * Convert Kizu layout child properties to PenPot format
 * @param {object} layoutChild - Kizu layout child object
 * @returns {object} PenPot layout item properties
 */
function convertLayoutChildToPenpot(layoutChild) {
  if (!layoutChild) {
    return {};
  }
  const result = {
    'layout-item-h-sizing': layoutChild.layoutItemHSizing || 'fix',
    'layout-item-v-sizing': layoutChild.layoutItemVSizing || 'fix',
  };
  attachLayoutChildExtras(layoutChild, result);
  return result;
}

/**
 * Attach optional layout child min/max/absolute properties
 * @param {object} child - Kizu layout child
 * @param {object} result - PenPot result to extend
 */
function attachLayoutChildExtras(child, result) {
  if (child.layoutItemMinW !== null && child.layoutItemMinW !== undefined) {
    result['layout-item-min-w'] = child.layoutItemMinW;
  }
  if (child.layoutItemMaxW !== null && child.layoutItemMaxW !== undefined) {
    result['layout-item-max-w'] = child.layoutItemMaxW;
  }
  if (child.layoutItemMinH !== null && child.layoutItemMinH !== undefined) {
    result['layout-item-min-h'] = child.layoutItemMinH;
  }
  if (child.layoutItemMaxH !== null && child.layoutItemMaxH !== undefined) {
    result['layout-item-max-h'] = child.layoutItemMaxH;
  }
  if (child.layoutItemAbsolute) {
    result['layout-item-absolute'] = true;
  }
}

/**
 * Extract display properties from a Kizu node
 * @param {object} node - Kizu node
 * @returns {object} PenPot display properties
 */
function extractDisplayProps(node) {
  return {
    visible: node.visible !== false && node.hidden !== true,
    opacity: node.opacity ?? 1,
    rotation: node.rotation || 0,
    'blend-mode': node.blendMode || 'normal',
    locked: node.locked || false,
    hidden: node.hidden || false,
  };
}

module.exports = {
  convertFillsToPenpot,
  convertStrokesToPenpot,
  convertEffectsToPenpot,
  convertPathSegments,
  convertPathContent,
  convertCornerRadius,
  convertConstraints,
  convertLayoutToPenpot,
  convertLayoutChildToPenpot,
  extractDisplayProps,
};
