/**
 * Kizuku PenPot Shape Builder
 * Converts Kizuku intermediate format properties to PenPot shape format.
 * Handles fills, strokes, effects, text, paths, layout, and constraints.
 */

/**
 * Convert Kizuku solid fill to PenPot fill
 * @param {object} fill - Kizuku fill with type 'color'
 * @returns {object} PenPot fill
 */
function convertSolidFill(fill) {
  return {
    'fill-color': fill.color,
    'fill-opacity': fill.opacity ?? 1,
  };
}

/**
 * Convert Kizuku gradient fill to PenPot fill
 * @param {object} fill - Kizuku fill with type 'gradient'
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

/** Module-level image asset lookup */
let imageAssetMap = new Map();

/**
 * Set image assets for data-uri embedding
 * Stores both full hash and extension-stripped hash for flexible lookup
 * @param {array} images - Array of { hash, data } objects
 */
function setImageAssets(images) {
  imageAssetMap = new Map();
  if (Array.isArray(images)) {
    for (const img of images) {
      if (img.hash && img.data) {
        imageAssetMap.set(img.hash, img);
        const stripped = img.hash.replace(/\.[^.]+$/, '');
        if (stripped !== img.hash) {
          imageAssetMap.set(stripped, img);
        }
      }
    }
  }
}

/**
 * Build fill-image object for PenPot (served via mock server)
 * @param {string} imageRef - Image hash reference
 * @returns {object} PenPot fill-image object
 */
function buildFillImage(imageRef) {
  const imgData = imageAssetMap.get(imageRef);
  const dims = resolveImageDimensions(imgData);
  const mtype = imgData?.mtype || 'image/png';
  return {
    id: imageRef || 'unknown',
    width: dims.width,
    height: dims.height,
    mtype,
    name: imageRef || 'image',
  };
}

/**
 * Resolve image dimensions from metadata or buffer headers
 * @param {object} imgData - Image asset data
 * @returns {object} { width, height }
 */
function resolveImageDimensions(imgData) {
  if (!imgData) {
    return { width: 100, height: 100 };
  }
  const estimated = estimateImageDimensions(imgData);
  return {
    width: estimated.width || imgData.width || 100,
    height: estimated.height || imgData.height || 100,
  };
}

/** Estimate image dimensions from PNG/JPEG header bytes */
function estimateImageDimensions(imgData) {
  if (imgData.width && imgData.height) {
    return { width: imgData.width, height: imgData.height };
  }
  try {
    const buf = Buffer.from(imgData.data, 'base64');
    if (buf.length < 24) {
      return {};
    }
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      return parseJpegDimensions(buf);
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Parse JPEG dimensions from SOF marker */
function parseJpegDimensions(buf) {
  let off = 2;
  while (off < buf.length - 8) {
    if (buf[off] !== 0xff) {
      break;
    }
    const marker = buf[off + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return {};
}

/**
 * Convert Kizuku image fill to PenPot fill with data-uri
 * @param {object} fill - Kizuku fill with type 'image'
 * @returns {object} PenPot image fill
 */
function convertImageFill(fill) {
  return {
    'fill-image': buildFillImage(fill.imageRef),
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
 * Convert Kizuku fills array to PenPot fills
 * @param {array} fills - Kizuku fills
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
 * Convert a single Kizuku stroke to PenPot stroke
 * @param {object} stroke - Kizuku stroke
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
  if (stroke.join) {
    result['stroke-join'] = stroke.join;
  }
  return result;
}

/**
 * Attach stroke cap markers to result
 * @param {object} stroke - Kizuku stroke with cap properties
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
 * Convert Kizuku strokes array to PenPot strokes
 * @param {array} strokes - Kizuku strokes
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
 * @param {object} effect - Kizuku shadow effect
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
 * @param {array} effects - Kizuku effects
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
 * @param {array} commands - Kizuku path command objects
 * @param {object} offset - Position offset { x, y }
 * @returns {array} PenPot path segments
 */
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

/**
 * Convert a single path command to PenPot segment
 * @param {object} cmd - Path command { command, x, y, ... }
 * @param {object} off - Position offset { x, y }
 * @returns {object|null} PenPot segment or null
 */
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

/**
 * Convert a cubic bezier command to PenPot curve segment
 * @param {object} cmd - Cubic bezier command
 * @param {object} off - Position offset { x, y }
 * @returns {object} PenPot curve-to segment
 */
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

/**
 * Build PenPot path content from Kizuku node
 * @param {object} node - Kizuku path node with commands
 * @param {object} absPos - Absolute page position { x, y }
 * @returns {Array} PenPot content segments in absolute coords
 */
function convertPathContent(node, absPos) {
  const offset = absPos || { x: node.x || 0, y: node.y || 0 };
  return convertPathSegments(node.commands, offset);
}

/**
 * Convert Kizuku corner radii to PenPot per-corner format
 * @param {object} node - Kizuku node with cornerRadii
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

/** Convert Kizuku layout properties to PenPot flex properties */
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
