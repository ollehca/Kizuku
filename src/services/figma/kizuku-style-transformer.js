/**
 * Kizuku Style Transformer
 * Converts Figma style properties (fills, strokes, effects, colors)
 * to PenPot/Kizuku format.
 */

/**
 * Transform Figma color (0-1 RGBA) to hex/rgba string
 * @param {object} figmaColor - Figma color { r, g, b, a }
 * @returns {string} Hex or rgba color string
 */
function transformColor(figmaColor) {
  if (!figmaColor) {
    return '#000000';
  }
  const rawR = figmaColor.r || 0;
  const rawG = figmaColor.g || 0;
  const rawB = figmaColor.b || 0;
  // If any channel > 1, assume already 0-255 range
  const scale = rawR > 1 || rawG > 1 || rawB > 1 ? 1 : 255;
  const red = Math.round(rawR * scale);
  const grn = Math.round(rawG * scale);
  const blu = Math.round(rawB * scale);
  const alpha = figmaColor.a ?? 1;

  if (alpha < 1) {
    return `rgba(${red}, ${grn}, ${blu}, ${alpha})`;
  }
  const hex = (v) => v.toString(16).padStart(2, '0');
  return `#${hex(red)}${hex(grn)}${hex(blu)}`;
}

/**
 * Clamp opacity value to valid [0, 1] range
 * @param {number} val - Raw opacity value
 * @returns {number} Clamped opacity
 */
function clampOpacity(val) {
  const raw = val ?? 1;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Transform a single Figma fill to Kizuku fill
 * @param {object} fill - Figma fill
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {object|null} Kizuku fill or null
 */
function transformSingleFill(fill, onWarning, unsupported) {
  const opacity = clampOpacity(fill.opacity);
  switch (fill.type) {
    case 'SOLID':
      return {
        type: 'color',
        color: transformColor(fill.color),
        opacity,
      };
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND':
      return {
        type: 'gradient',
        gradient: transformGradient(fill),
        opacity,
      };
    case 'IMAGE':
      return transformImageFill(fill);
    default:
      onWarning(`Unsupported fill type: ${fill.type}`);
      unsupported.add(`fill-${fill.type}`);
      return null;
  }
}

/**
 * Transform an image fill from Figma
 * @param {object} fill - Figma image fill
 * @returns {object} Kizuku image fill
 */
function transformImageFill(fill) {
  const ref = fill.imageRef || fill.imageHash || null;
  return {
    type: 'image',
    imageRef: ref ? String(ref) : null,
    scaleMode: fill.scaleMode || 'FILL',
    opacity: clampOpacity(fill.opacity),
  };
}

/**
 * Transform fills array
 * @param {array} figmaFills - Figma fills
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {array} Kizuku fills
 */
function transformFills(figmaFills, onWarning, unsupported) {
  if (!figmaFills?.length) {
    return [];
  }
  return figmaFills
    .filter((f) => f.visible !== false)
    .map((f) => transformSingleFill(f, onWarning, unsupported))
    .filter(Boolean);
}

/**
 * Map Figma stroke alignment to Kizuku/PenPot alignment
 * @param {string} align - Figma stroke align (INSIDE/CENTER/OUTSIDE)
 * @returns {string} PenPot alignment (inner/center/outer)
 */
function mapStrokeAlign(align) {
  const map = { INSIDE: 'inner', CENTER: 'center', OUTSIDE: 'outer' };
  return map[align] || 'center';
}

/**
 * Map Figma dash pattern to stroke style
 * @param {array} pattern - Figma dashPattern array
 * @returns {string} Stroke style (solid/dashed/dotted)
 */
function mapDashPattern(pattern) {
  if (!pattern || pattern.length === 0) {
    return 'solid';
  }
  const maxDash = Math.max(...pattern);
  return maxDash <= 3 ? 'dotted' : 'dashed';
}

/**
 * Map Figma stroke cap to PenPot cap
 * @param {string} cap - Figma stroke cap
 * @returns {string} PenPot stroke cap
 */
function mapStrokeCap(cap) {
  const map = {
    NONE: null,
    ROUND: 'round',
    SQUARE: 'square',
    ARROW_LINES: 'line-arrow',
    ARROW_EQUILATERAL: 'triangle-arrow',
    TRIANGLE_FILLED: 'triangle-arrow',
    DIAMOND_FILLED: 'diamond-marker',
    CIRCLE_FILLED: 'circle-marker',
  };
  return map[cap] || null;
}

/**
 * Map Figma stroke join to PenPot join
 * @param {string} join - Figma stroke join (MITER/BEVEL/ROUND)
 * @returns {string|null} PenPot stroke join
 */
function mapStrokeJoin(join) {
  const map = { MITER: 'miter', ROUND: 'round', BEVEL: 'bevel' };
  return map[join] || null;
}

/**
 * Resolve stroke width from individual weights or uniform weight
 * @param {object} figmaNode - Figma node with stroke properties
 * @returns {number} Resolved stroke width
 */
function resolveStrokeWidth(figmaNode) {
  if (figmaNode.individualStrokeWeights) {
    const weights = figmaNode.individualStrokeWeights;
    const vals = [weights.top, weights.right, weights.bottom, weights.left].filter(
      (v) => v !== undefined && v > 0
    );
    return vals.length > 0 ? Math.max(...vals) : 1;
  }
  return figmaNode.strokeWeight || 1;
}

/**
 * Transform a single stroke with full properties
 * @param {object} stroke - Figma stroke paint
 * @param {object} figmaNode - Parent Figma node (for alignment, weight, etc.)
 * @returns {object} Kizuku stroke
 */
function transformSingleStroke(stroke, figmaNode) {
  const result = {
    type: 'color',
    color: transformColor(stroke.color),
    opacity: clampOpacity(stroke.opacity),
    width: resolveStrokeWidth(figmaNode),
    alignment: mapStrokeAlign(figmaNode.strokeAlign),
    style: mapDashPattern(figmaNode.dashPattern),
    capStart: mapStrokeCap(figmaNode.strokeCap),
    capEnd: mapStrokeCap(figmaNode.strokeCap),
  };
  const join = mapStrokeJoin(figmaNode.strokeJoin);
  if (join) {
    result.join = join;
  }
  return result;
}

/**
 * Transform strokes array with full properties
 * @param {array} figmaStrokes - Figma strokes
 * @param {object} figmaNode - Parent Figma node
 * @returns {array} Kizuku strokes
 */
function transformStrokes(figmaStrokes, figmaNode) {
  if (!figmaStrokes?.length) {
    return [];
  }
  const node = figmaNode || {};
  return figmaStrokes.filter((s) => s.visible !== false).map((s) => transformSingleStroke(s, node));
}

/**
 * Transform a shadow effect (drop or inner) to Kizuku format
 * @param {object} effect - Figma shadow effect
 * @param {string} shadowType - Kizuku shadow type string
 * @returns {object} Kizuku shadow effect
 */
function transformShadowEffect(effect, shadowType) {
  return {
    type: shadowType,
    color: transformColor(effect.color),
    offsetX: effect.offset?.x || 0,
    offsetY: effect.offset?.y || 0,
    blur: effect.radius || 0,
    spread: effect.spread || 0,
  };
}

/** @type {Object.<string, string>} Effect type to Kizuku type mapping */
const EFFECT_TYPE_MAP = {
  DROP_SHADOW: 'drop-shadow',
  INNER_SHADOW: 'inner-shadow',
  LAYER_BLUR: 'blur',
  BACKGROUND_BLUR: 'blur',
};

/**
 * Transform a single effect to Kizuku format
 * @param {object} effect - Figma effect
 * @param {Function} onWarning - Warning callback
 * @returns {object|null} Kizuku effect or null
 */
function transformSingleEffect(effect, onWarning) {
  const kizukuType = EFFECT_TYPE_MAP[effect.type];
  if (!kizukuType) {
    onWarning(`Unsupported effect type: ${effect.type}`);
    return null;
  }
  if (kizukuType === 'blur') {
    return { type: 'blur', value: effect.radius || 0 };
  }
  return transformShadowEffect(effect, kizukuType);
}

/**
 * Transform effects array
 * @param {array} figmaEffects - Figma effects
 * @param {Function} onWarning - Warning callback
 * @returns {array} Kizuku effects
 */
function transformEffects(figmaEffects, onWarning) {
  if (!figmaEffects?.length) {
    return [];
  }
  return figmaEffects
    .filter((e) => e.visible !== false)
    .map((e) => transformSingleEffect(e, onWarning))
    .filter(Boolean);
}

/**
 * Extract gradient endpoint positions from Figma's gradientTransform
 * @param {array} matrix - 2x3 affine matrix [[a,b,tx],[c,d,ty]]
 * @returns {object} Gradient position { startX, startY, endX, endY, width }
 */
function extractGradientPosition(matrix) {
  if (!matrix || !Array.isArray(matrix) || matrix.length < 2) {
    return buildDefaultGradientPosition();
  }
  return buildGradientPosition(matrix[0], matrix[1]);
}

/**
 * Build default gradient position when matrix is invalid
 * @returns {object} Default gradient position
 */
function buildDefaultGradientPosition() {
  return { startX: 0, startY: 0.5, endX: 1, endY: 0.5, width: 1 };
}

/**
 * Build gradient position from matrix rows
 * @param {array} row0 - First row of transform matrix
 * @param {array} row1 - Second row of transform matrix
 * @returns {object} Gradient position
 */
function buildGradientPosition(row0, row1) {
  return {
    startX: row0[2] || 0,
    startY: row1[2] || 0,
    endX: (row0[0] || 0) + (row0[2] || 0),
    endY: (row1[0] || 0) + (row1[2] || 0),
    width: Math.sqrt((row0[1] || 0) ** 2 + (row1[1] || 0) ** 2) || 1,
  };
}

/**
 * Transform gradient fill
 * @param {object} figmaGradient - Figma gradient fill
 * @returns {object} Kizuku gradient
 */
function transformGradient(figmaGradient) {
  const gradient = {
    type: figmaGradient.type.replace('GRADIENT_', '').toLowerCase(),
    stops: [],
    ...extractGradientPosition(figmaGradient.gradientTransform),
  };
  if (figmaGradient.gradientStops) {
    gradient.stops = figmaGradient.gradientStops.map((stop) => ({
      position: stop.position,
      color: transformColor(stop.color),
    }));
  }
  return gradient;
}

/**
 * Transform blend mode from Figma to Kizuku
 * @param {string} figmaBlendMode - Figma blend mode
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {string} Kizuku blend mode
 */
function transformBlendMode(figmaBlendMode, onWarning, unsupported) {
  if (!figmaBlendMode || figmaBlendMode === 'PASS_THROUGH' || figmaBlendMode === 'NORMAL') {
    return 'normal';
  }
  const map = {
    DARKEN: 'darken',
    MULTIPLY: 'multiply',
    COLOR_BURN: 'color-burn',
    LIGHTEN: 'lighten',
    SCREEN: 'screen',
    COLOR_DODGE: 'color-dodge',
    OVERLAY: 'overlay',
    SOFT_LIGHT: 'soft-light',
    HARD_LIGHT: 'hard-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity',
  };
  const mode = map[figmaBlendMode];
  if (!mode) {
    onWarning(`Unsupported blend mode: ${figmaBlendMode}`);
    unsupported.add(`blend-mode-${figmaBlendMode}`);
    return 'normal';
  }
  return mode;
}

module.exports = {
  transformColor,
  transformFills,
  transformStrokes,
  transformEffects,
  transformGradient,
  transformBlendMode,
  extractGradientPosition,
  mapStrokeAlign,
  mapDashPattern,
  mapStrokeCap,
  mapStrokeJoin,
};
