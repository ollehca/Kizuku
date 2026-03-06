/**
 * Kizuku Transform Decomposer
 * Decomposes 2x3 affine matrices into rotation, scale, skew,
 * translation, and flip components using QR decomposition.
 * Also handles position extraction from various .fig formats.
 */

const DEG_PER_RAD = 180 / Math.PI;
const EPSILON = 1e-10;

/**
 * Normalize various .fig matrix formats to { a, b, c, d, e, f }.
 * Supports: 2D array [[a,b,tx],[c,d,ty]], {m00,...}, {a,...}, {tx,...}
 * @param {*} transform - Raw transform from .fig file
 * @returns {object|null} Normalized {a,b,c,d,e,f} or null
 */
function normalizeMatrix(transform) {
  if (!transform) {
    return null;
  }
  if (Array.isArray(transform)) {
    return normalizeArrayMatrix(transform);
  }
  if (transform.m00 !== undefined) {
    return normalizeMnnMatrix(transform);
  }
  if (transform.a !== undefined) {
    return { ...transform };
  }
  if (transform.tx !== undefined) {
    return normalizeTxMatrix(transform);
  }
  return null;
}

/**
 * Normalize 2D array matrix [[a,c,tx],[b,d,ty]]
 * @param {array} arr - 2D array transform
 * @returns {object} Normalized matrix
 */
function normalizeArrayMatrix(arr) {
  const row0 = arr[0] || [];
  const row1 = arr[1] || [];
  return {
    a: row0[0] ?? 1,
    b: row1[0] ?? 0,
    c: row0[1] ?? 0,
    d: row1[1] ?? 1,
    e: row0[2] ?? 0,
    f: row1[2] ?? 0,
  };
}

/**
 * Normalize {m00,m01,m02,m10,m11,m12} matrix
 * @param {object} mat - Matrix with m-notation
 * @returns {object} Normalized matrix
 */
function normalizeMnnMatrix(mat) {
  return {
    a: mat.m00 ?? 1,
    b: mat.m10 ?? 0,
    c: mat.m01 ?? 0,
    d: mat.m11 ?? 1,
    e: mat.m02 ?? 0,
    f: mat.m12 ?? 0,
  };
}

/**
 * Normalize {tx,ty} style matrix (scale/rotate assumed identity)
 * @param {object} mat - Matrix with tx/ty
 * @returns {object} Normalized matrix
 */
function normalizeTxMatrix(mat) {
  return {
    a: mat.a ?? 1,
    b: mat.b ?? 0,
    c: mat.c ?? 0,
    d: mat.d ?? 1,
    e: mat.tx ?? 0,
    f: mat.ty ?? 0,
  };
}

/**
 * Decompose a 2x3 affine matrix via QR decomposition.
 * @param {*} transform - Raw transform (any format)
 * @returns {object} { rotation, scaleX, scaleY, skewX, tx, ty, flipH, flipV }
 */
function decomposeAffineMatrix(transform) {
  const mat = normalizeMatrix(transform);
  if (!mat) {
    return buildIdentityResult();
  }
  const { a, b, c, d, e, f } = mat;
  const det = a * d - b * c;
  const scaleX = Math.sqrt(a * a + b * b);
  const rawScaleY = Math.sqrt(c * c + d * d);
  const scaleY = det < 0 ? -rawScaleY : rawScaleY;
  const rotation = Math.atan2(b, a) * DEG_PER_RAD;
  const skewX = Math.atan2(a * c + b * d, scaleX * scaleX) * DEG_PER_RAD;

  const flipped = det < 0;
  const flipV = flipped && a >= 0;
  const flipH = flipped && !flipV;
  return {
    rotation,
    scaleX,
    scaleY: flipped ? rawScaleY : scaleY,
    skewX,
    translateX: e,
    translateY: f,
    flipH,
    flipV,
  };
}

/**
 * Build identity decomposition result
 * @returns {object} Default decomposition
 */
function buildIdentityResult() {
  return {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    translateX: 0,
    translateY: 0,
    flipH: false,
    flipV: false,
  };
}

/**
 * Extract rotation in degrees from a raw transform.
 * @param {*} transform - Raw transform
 * @returns {number} Rotation in degrees
 */
function extractRotationDegrees(transform) {
  const decomposed = decomposeAffineMatrix(transform);
  return decomposed.rotation;
}

/**
 * Check if a transform has non-trivial components (not identity).
 * @param {*} transform - Raw transform
 * @returns {boolean} True if rotation, scale, or skew present
 */
function hasNonTrivialTransform(transform) {
  const mat = normalizeMatrix(transform);
  if (!mat) {
    return false;
  }
  const offIdentity =
    Math.abs(mat.a - 1) > EPSILON ||
    Math.abs(mat.b) > EPSILON ||
    Math.abs(mat.c) > EPSILON ||
    Math.abs(mat.d - 1) > EPSILON;
  return offIdentity;
}

/**
 * Extract x,y position from a .fig transform (any format).
 * @param {*} transform - Raw transform
 * @returns {object} { x, y }
 */
function extractPosition(transform) {
  if (!transform) {
    return { x: 0, y: 0 };
  }
  if (Array.isArray(transform)) {
    return {
      x: transform[0]?.[2] || 0,
      y: transform[1]?.[2] || 0,
    };
  }
  if (transform.m02 !== undefined) {
    return { x: transform.m02, y: transform.m12 };
  }
  if (transform.tx !== undefined) {
    return { x: transform.tx, y: transform.ty };
  }
  return { x: 0, y: 0 };
}

/**
 * Add transform, bounds, rotation, and flip to a node.
 * @param {object} node - Output node to enrich
 * @param {object} figNode - Source .fig node
 */
function addTransformAndBounds(node, figNode) {
  if (figNode.size) {
    const pos = extractPosition(figNode.transform);
    node.absoluteBoundingBox = {
      x: pos.x,
      y: pos.y,
      width: figNode.size.x || 0,
      height: figNode.size.y || 0,
    };
  }
  if (figNode.transform) {
    node.relativeTransform = figNode.transform;
    enrichWithDecomposition(node, figNode.transform);
  }
}

/**
 * Enrich node with decomposed rotation and flip flags.
 * @param {object} node - Output node
 * @param {*} transform - Raw transform
 */
function enrichWithDecomposition(node, transform) {
  if (!hasNonTrivialTransform(transform)) {
    return;
  }
  const decomposed = decomposeAffineMatrix(transform);
  if (Math.abs(decomposed.rotation) > EPSILON) {
    node.rotation = decomposed.rotation;
  }
  if (decomposed.flipH) {
    node.flipH = true;
  }
  if (decomposed.flipV) {
    node.flipV = true;
  }
}

module.exports = {
  normalizeMatrix,
  decomposeAffineMatrix,
  extractRotationDegrees,
  hasNonTrivialTransform,
  extractPosition,
  addTransformAndBounds,
};
