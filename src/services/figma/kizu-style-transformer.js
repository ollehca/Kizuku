/**
 * Kizu Style Transformer
 * Converts Figma style properties (fills, strokes, effects, colors)
 * to PenPot/Kizu format.
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
  const red = Math.round((figmaColor.r || 0) * 255);
  const grn = Math.round((figmaColor.g || 0) * 255);
  const blu = Math.round((figmaColor.b || 0) * 255);
  const alpha = figmaColor.a ?? 1;

  if (alpha < 1) {
    return `rgba(${red}, ${grn}, ${blu}, ${alpha})`;
  }
  const hex = (v) => v.toString(16).padStart(2, '0');
  return `#${hex(red)}${hex(grn)}${hex(blu)}`;
}

/**
 * Transform a single Figma fill to Kizu fill
 * @param {object} fill - Figma fill
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {object|null} Kizu fill or null
 */
function transformSingleFill(fill, onWarning, unsupported) {
  switch (fill.type) {
    case 'SOLID':
      return {
        type: 'color',
        color: transformColor(fill.color),
        opacity: fill.opacity ?? 1,
      };
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND':
      return {
        type: 'gradient',
        gradient: transformGradient(fill),
        opacity: fill.opacity ?? 1,
      };
    case 'IMAGE':
      unsupported.add('image-fills');
      onWarning('Image fills require special handling');
      return null;
    default:
      onWarning(`Unsupported fill type: ${fill.type}`);
      return null;
  }
}

/**
 * Transform fills array
 * @param {array} figmaFills - Figma fills
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {array} Kizu fills
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
 * Transform strokes array
 * @param {array} figmaStrokes - Figma strokes
 * @returns {array} Kizu strokes
 */
function transformStrokes(figmaStrokes) {
  if (!figmaStrokes?.length) {
    return [];
  }
  return figmaStrokes
    .filter((s) => s.visible !== false)
    .map((s) => ({
      type: 'color',
      color: transformColor(s.color),
      opacity: s.opacity ?? 1,
    }));
}

/**
 * Transform a shadow effect (drop or inner) to Kizu format
 * @param {object} effect - Figma shadow effect
 * @param {string} shadowType - Kizu shadow type string
 * @returns {object} Kizu shadow effect
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

/** @type {Object.<string, string>} Effect type to Kizu type mapping */
const EFFECT_TYPE_MAP = {
  DROP_SHADOW: 'drop-shadow',
  INNER_SHADOW: 'inner-shadow',
  LAYER_BLUR: 'blur',
  BACKGROUND_BLUR: 'blur',
};

/**
 * Transform a single effect to Kizu format
 * @param {object} effect - Figma effect
 * @param {Function} onWarning - Warning callback
 * @returns {object|null} Kizu effect or null
 */
function transformSingleEffect(effect, onWarning) {
  const kizuType = EFFECT_TYPE_MAP[effect.type];
  if (!kizuType) {
    onWarning(`Unsupported effect type: ${effect.type}`);
    return null;
  }
  if (kizuType === 'blur') {
    return { type: 'blur', value: effect.radius || 0 };
  }
  return transformShadowEffect(effect, kizuType);
}

/**
 * Transform effects array
 * @param {array} figmaEffects - Figma effects
 * @param {Function} onWarning - Warning callback
 * @returns {array} Kizu effects
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
 * Transform gradient fill
 * @param {object} figmaGradient - Figma gradient fill
 * @returns {object} Kizu gradient
 */
function transformGradient(figmaGradient) {
  const gradient = {
    type: figmaGradient.type.replace('GRADIENT_', '').toLowerCase(),
    stops: [],
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
 * Transform blend mode from Figma to Kizu
 * @param {string} figmaBlendMode - Figma blend mode
 * @param {Function} onWarning - Warning callback
 * @param {Set} unsupported - Unsupported features set
 * @returns {string} Kizu blend mode
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
};
