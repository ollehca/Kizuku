/**
 * Kizuku PenPot Shape Builder
 * Converts Kizuku intermediate format properties to PenPot shape format.
 * Handles fills, strokes, effects, text, paths, layout, and constraints.
 */

const imageBuilder = require('./kizuku-penpot-image-builder');

/** Convert Kizuku solid fill to PenPot fill */
function convertSolidFill(fill) {
  return {
    'fill-color': fill.color,
    'fill-opacity': fill.opacity ?? 1,
  };
}

/** Convert Kizuku gradient fill to PenPot fill */
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

/** Parse opacity from a color string (rgba or hex) */
function parseColorOpacity(colorStr) {
  if (typeof colorStr === 'string' && colorStr.startsWith('rgba(')) {
    const match = /rgba\(\s*\d+.*,\s*([\d.]+)\s*\)/.exec(colorStr);
    return match ? Number.parseFloat(match[1]) : 1;
  }
  return 1;
}

/** Convert a gradient stop to PenPot format */
function convertGradientStop(stop) {
  return {
    offset: stop.position,
    color: stop.color,
    opacity: parseColorOpacity(stop.color),
  };
}

/** Delegate image operations to image builder module */
const { setImageAssets, convertImageFill } = imageBuilder;

/** Fill type converter dispatch map */
const FILL_CONVERTERS = {
  color: convertSolidFill,
  gradient: convertGradientFill,
  image: convertImageFill,
};

/** Convert Kizuku fills array to PenPot fills */
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
      const result = converter ? converter(fill) : convertLegacyFill(fill);
      return result ? attachPenpotFillBlend(result, fill) : null;
    })
    .filter(Boolean);
}

/** Attach per-fill blend mode to PenPot fill output */
function attachPenpotFillBlend(result, fill) {
  if (fill.blendMode) {
    result['fill-blend-mode'] = fill.blendMode;
  }
  return result;
}

/** Convert legacy fill format (plain color string) */
function convertLegacyFill(fill) {
  if (fill.color && typeof fill.color === 'string') {
    return {
      'fill-color': fill.color,
      'fill-opacity': fill.opacity ?? 1,
    };
  }
  return null;
}

/** Convert a single Kizuku stroke to PenPot stroke */
function convertSingleStroke(stroke) {
  if (stroke['stroke-color'] || stroke['stroke-color-gradient']) {
    return stroke;
  }
  if (stroke.type === 'gradient' && stroke.gradient) {
    return convertGradientStroke(stroke);
  }
  if (!stroke.color || typeof stroke.color !== 'string') {
    return null;
  }
  const result = buildColorStroke(stroke);
  attachStrokeCaps(stroke, result);
  if (stroke.join) {
    result['stroke-join'] = stroke.join;
  }
  if (stroke.miterLimit !== undefined) {
    result['stroke-miter-limit'] = stroke.miterLimit;
  }
  return result;
}

/** Build a PenPot color stroke from Kizuku stroke */
function buildColorStroke(stroke) {
  const result = {
    'stroke-color': stroke.color,
    'stroke-opacity': stroke.opacity ?? 1,
    'stroke-width': stroke.width || 1,
    'stroke-alignment': stroke.alignment || 'center',
    'stroke-style': stroke.style || 'solid',
  };
  if (Array.isArray(stroke.dashPattern) && stroke.dashPattern.length > 0) {
    result['stroke-style'] = 'dashed';
  }
  return result;
}

/** Build gradient object for a stroke in PenPot format */
function buildStrokeGradient(grad) {
  return {
    type: grad.type || 'linear',
    'start-x': grad.startX || 0,
    'start-y': grad.startY || 0.5,
    'end-x': grad.endX || 1,
    'end-y': grad.endY || 0.5,
    width: grad.width || 1,
    stops: (grad.stops || []).map(convertGradientStop),
  };
}

/** Convert a gradient stroke to PenPot format */
function convertGradientStroke(stroke) {
  return {
    'stroke-color-gradient': buildStrokeGradient(stroke.gradient || {}),
    'stroke-opacity': stroke.opacity ?? 1,
    'stroke-width': stroke.width || 1,
    'stroke-alignment': stroke.alignment || 'center',
    'stroke-style': stroke.style || 'solid',
  };
}

/** Attach stroke cap markers to result */
function attachStrokeCaps(stroke, result) {
  if (stroke.capStart) {
    result['stroke-cap-start'] = stroke.capStart;
  }
  if (stroke.capEnd) {
    result['stroke-cap-end'] = stroke.capEnd;
  }
}

/** Convert Kizuku strokes array to PenPot strokes */
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

/** Convert a shadow effect to PenPot format */
function convertShadowEffect(effect) {
  const opacity = effect.opacity ?? parseColorOpacity(effect.color);
  return {
    type: effect.type,
    color: { color: effect.color, opacity },
    offset: { x: effect.offsetX || 0, y: effect.offsetY || 0 },
    blur: effect.blur || 0,
    spread: effect.spread || 0,
    hidden: effect.hidden || false,
  };
}

/** Convert effects array to PenPot shadow and blur arrays */
function convertEffectsToPenpot(effects) {
  if (!effects || !Array.isArray(effects)) {
    return { shadow: [], blur: null };
  }
  const shadows = [];
  let blur = null;

  for (const effect of effects) {
    if (effect.type === 'blur') {
      blur = { type: 'layer-blur', value: effect.value || 0, hidden: effect.hidden || false };
    } else if (effect.type === 'background-blur') {
      blur = { type: 'background-blur', value: effect.value || 0, hidden: effect.hidden || false };
    } else {
      shadows.push(convertShadowEffect(effect));
    }
  }

  return { shadow: shadows, blur };
}

/** Convert path commands to PenPot path segments */
function convertPathSegments(commands, offset) {
  if (!commands || !Array.isArray(commands)) {
    return [];
  }
  const off = offset || { x: 0, y: 0 };
  return commands.map((cmd) => convertSingleSegment(cmd, off)).filter(Boolean);
}

/** Command to PenPot segment type mapping */
const SEGMENT_TYPE_MAP = {
  M: 'move-to',
  L: 'line-to',
  C: 'curve-to',
  Z: 'close-path',
};

/** Convert a single path command to PenPot segment */
function convertSingleSegment(cmd, off) {
  const command = SEGMENT_TYPE_MAP[cmd.command];
  if (!command) {
    return null;
  }
  if (cmd.command === 'Z') {
    return { command: 'close-path', params: {} };
  }
  if (cmd.command === 'C') {
    return convertCurveSegment(cmd, off);
  }
  return {
    command,
    params: { x: (cmd.x || 0) + off.x, y: (cmd.y || 0) + off.y },
  };
}

/** Convert a cubic bezier command to PenPot curve segment */
function convertCurveSegment(cmd, off) {
  return {
    command: 'curve-to',
    params: {
      x: (cmd.x || 0) + off.x,
      y: (cmd.y || 0) + off.y,
      c1x: (cmd.x1 || 0) + off.x,
      c1y: (cmd.y1 || 0) + off.y,
      c2x: (cmd.x2 || 0) + off.x,
      c2y: (cmd.y2 || 0) + off.y,
    },
  };
}

/** Build PenPot path content from Kizuku node */
function convertPathContent(node, absPos) {
  const offset = absPos || { x: node.x || 0, y: node.y || 0 };
  return convertPathSegments(node.commands, offset);
}

/** Convert Kizuku corner radii to PenPot per-corner format */
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

/** Convert Kizuku constraints to PenPot constraint properties */
function convertConstraints(constraints) {
  if (!constraints) {
    return { 'constraints-h': 'left', 'constraints-v': 'top' };
  }
  return {
    'constraints-h': mapConstraintValue(constraints.horizontal, false),
    'constraints-v': mapConstraintValue(constraints.vertical, true),
  };
}

/** Convert Kizuku layout properties to PenPot layout properties */
function convertLayoutToPenpot(layout) {
  if (!layout) {
    return {};
  }
  if (layout.layout === 'grid') {
    return convertGridLayoutToPenpot(layout);
  }
  return convertFlexLayoutToPenpot(layout);
}

/** Convert flex layout to PenPot format */
function convertFlexLayoutToPenpot(layout) {
  const result = {
    layout: 'flex',
    'layout-flex-dir': layout.layoutFlexDir || 'row',
    'layout-gap': layout.layoutGap || { rowGap: 0, columnGap: 0 },
    'layout-padding': layout.layoutPadding || buildEmptyPadding(),
    'layout-justify-content': layout.layoutJustifyContent || 'start',
    'layout-align-items': layout.layoutAlignItems || 'start',
    'layout-wrap-type': layout.layoutWrapType || 'nowrap',
    'layout-align-content': layout.layoutAlignContent || 'start',
  };
  attachContainerMinMax(layout, result);
  return result;
}

/** Attach container min/max to PenPot layout result */
function attachContainerMinMax(layout, result) {
  const props = [
    ['layoutContainerMinW', 'layout-container-min-w'],
    ['layoutContainerMaxW', 'layout-container-max-w'],
    ['layoutContainerMinH', 'layout-container-min-h'],
    ['layoutContainerMaxH', 'layout-container-max-h'],
  ];
  for (const [src, dst] of props) {
    if (layout[src] !== null && layout[src] !== undefined) {
      result[dst] = layout[src];
    }
  }
}

/** Convert grid layout to PenPot format */
function convertGridLayoutToPenpot(layout) {
  return {
    layout: 'grid',
    'layout-grid-dir': layout.layoutGridDir || 'row',
    'layout-grid-rows': layout.layoutGridRows || [],
    'layout-grid-columns': layout.layoutGridColumns || [],
    'layout-grid-cells': layout.layoutGridCells || {},
    'layout-gap': layout.layoutGap || { rowGap: 0, columnGap: 0 },
    'layout-padding': layout.layoutPadding || buildEmptyPadding(),
  };
}

/** Build empty padding object */
function buildEmptyPadding() {
  return { p1: 0, p2: 0, p3: 0, p4: 0 };
}

/** Convert Kizuku layout child properties to PenPot format */
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

/** Attach optional layout child min/max/absolute properties */
function attachLayoutChildExtras(child, result) {
  attachMinMaxDimensions(child, result);
  if (child.layoutItemGrow !== null && child.layoutItemGrow !== undefined) {
    result['layout-item-grow'] = child.layoutItemGrow;
  }
  if (child.layoutItemShrink !== null && child.layoutItemShrink !== undefined) {
    result['layout-item-shrink'] = child.layoutItemShrink;
  }
  if (child.layoutItemAbsolute) {
    result['layout-item-absolute'] = true;
  }
}

/** Attach min/max dimension constraints */
function attachMinMaxDimensions(child, result) {
  const props = [
    ['layoutItemMinW', 'layout-item-min-w'],
    ['layoutItemMaxW', 'layout-item-max-w'],
    ['layoutItemMinH', 'layout-item-min-h'],
    ['layoutItemMaxH', 'layout-item-max-h'],
  ];
  for (const [src, dst] of props) {
    if (child[src] !== null && child[src] !== undefined) {
      result[dst] = child[src];
    }
  }
}

/** Extract display properties from a Kizuku node */
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
  setImageAssets,
};
