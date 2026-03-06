/**
 * Kizuku PenPot Geometry Builder
 * Handles geometry calculations, rotation matrices,
 * and point transformations for PenPot shapes.
 */

/**
 * Create an identity 2D affine transform matrix
 * @returns {object} Identity matrix { a, b, c, d, e, f }
 */
function identityMatrix() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/**
 * Build a rotation matrix for the given angle in degrees
 * @param {number} degrees - Rotation in degrees
 * @returns {object} Rotation matrix { a, b, c, d, e, f }
 */
function rotationMatrix(degrees) {
  if (!degrees) {
    return identityMatrix();
  }
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/**
 * Invert a 2D affine transform matrix
 * @param {object} mat - Transform matrix { a, b, c, d, e, f }
 * @returns {object} Inverted matrix
 */
function invertMatrix(mat) {
  const det = mat.a * mat.d - mat.b * mat.c;
  if (Math.abs(det) < 1e-10) {
    return identityMatrix();
  }
  const invDet = 1 / det;
  return {
    a: mat.d * invDet,
    b: -mat.b * invDet,
    c: -mat.c * invDet,
    d: mat.a * invDet,
    e: (mat.c * mat.f - mat.d * mat.e) * invDet,
    f: (mat.b * mat.e - mat.a * mat.f) * invDet,
  };
}

/**
 * Apply a 2D affine transform to a point
 * @param {object} mat - Transform matrix
 * @param {number} ptX - Point X coordinate
 * @param {number} ptY - Point Y coordinate
 * @returns {object} Transformed point { x, y }
 */
function transformPoint(mat, ptX, ptY) {
  return {
    x: mat.a * ptX + mat.c * ptY + mat.e,
    y: mat.b * ptX + mat.d * ptY + mat.f,
  };
}

/**
 * Build a PenPot rotation transform centered on a shape
 * @param {number} posX - Shape X position
 * @param {number} posY - Shape Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {number} rotation - Rotation in degrees
 * @returns {object} Transform and inverse { transform, inverse }
 */
function buildRotationTransform(posX, posY, width, height, rotation) {
  if (!rotation) {
    return { transform: identityMatrix(), inverse: identityMatrix() };
  }
  const centerX = posX + width / 2;
  const centerY = posY + height / 2;
  const rotMat = rotationMatrix(rotation);

  const transform = {
    a: rotMat.a,
    b: rotMat.b,
    c: rotMat.c,
    d: rotMat.d,
    e: centerX - rotMat.a * centerX - rotMat.c * centerY,
    f: centerY - rotMat.b * centerX - rotMat.d * centerY,
  };

  return { transform, inverse: invertMatrix(transform) };
}

/**
 * Rotate four corner points around center
 * @param {array} corners - Array of 4 { x, y } points
 * @param {object} transform - Transform matrix
 * @returns {array} Rotated corner points
 */
function rotateCorners(corners, transform) {
  return corners.map((pt) => transformPoint(transform, pt.x, pt.y));
}

/**
 * Build selection rectangle from position and dimensions
 * @param {number} posX - X position
 * @param {number} posY - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {object} Selection rectangle
 */
function buildSelrect(posX, posY, width, height) {
  return {
    x: posX,
    y: posY,
    width,
    height,
    x1: posX,
    y1: posY,
    x2: posX + width,
    y2: posY + height,
  };
}

/**
 * Build un-rotated corner points
 * @param {number} posX - X position
 * @param {number} posY - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {array} Array of 4 corner points
 */
function buildCornerPoints(posX, posY, width, height) {
  return [
    { x: posX, y: posY },
    { x: posX + width, y: posY },
    { x: posX + width, y: posY + height },
    { x: posX, y: posY + height },
  ];
}

/**
 * Build full geometry for a PenPot shape
 * @param {number} posX - X position
 * @param {number} posY - Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {number} rotation - Rotation degrees
 * @returns {object} Complete geometry: selrect, points, transform, inverse
 */
function buildGeometry(posX, posY, width, height, rotation) {
  const selrect = buildSelrect(posX, posY, width, height);
  const corners = buildCornerPoints(posX, posY, width, height);
  const { transform, inverse } = buildRotationTransform(posX, posY, width, height, rotation);
  const points = rotation ? rotateCorners(corners, transform) : corners;

  return {
    selrect,
    points,
    transform,
    'transform-inverse': inverse,
  };
}

/**
 * Normalize relativeTransform to { a, b, c, d, e, f } format
 * @param {*} mat - Matrix in array or object format
 * @returns {object|null} Normalized matrix or null
 */
function normalizeMatrix(mat) {
  if (!mat) {
    return null;
  }
  if (Array.isArray(mat) && mat.length >= 2) {
    const [r0, r1] = mat;
    return { a: r0[0], b: r1[0], c: r0[1], d: r1[1], e: r0[2] || 0, f: r1[2] || 0 };
  }
  if (typeof mat === 'object' && mat.a !== undefined) {
    return mat;
  }
  return null;
}

/** Check if a matrix is non-trivial (not identity) */
function isNonTrivialMatrix(mat) {
  const eps = 1e-6;
  return (
    Math.abs(mat.a - 1) > eps ||
    Math.abs(mat.b) > eps ||
    Math.abs(mat.c) > eps ||
    Math.abs(mat.d - 1) > eps
  );
}

/**
 * Build geometry using full affine transform from relativeTransform.
 * Points are transformed to reflect scale/skew; selrect stays axis-aligned.
 * @param {number} posX - Shape X position
 * @param {number} posY - Shape Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {object} opts - { rotation, relativeTransform }
 * @returns {object} Complete geometry
 */
function buildAffineGeometry(posX, posY, width, height, opts) {
  const mat = normalizeMatrix(opts.relativeTransform);
  if (!mat || !isNonTrivialMatrix(mat)) {
    return buildGeometry(posX, posY, width, height, opts.rotation || 0);
  }
  const selrect = buildSelrect(posX, posY, width, height);
  const corners = buildCornerPoints(0, 0, width, height);
  const points = corners.map((pt) => ({
    x: mat.a * pt.x + mat.c * pt.y + posX,
    y: mat.b * pt.x + mat.d * pt.y + posY,
  }));
  const transform = buildAffineTransformFromPoints(selrect, points);
  return { selrect, points, transform, 'transform-inverse': invertMatrix(transform) };
}

/** Derive PenPot transform from selrect center and point displacement */
function buildAffineTransformFromPoints(selrect, points) {
  const cx = selrect.x + selrect.width / 2;
  const cy = selrect.y + selrect.height / 2;
  const pcx = (points[0].x + points[2].x) / 2;
  const pcy = (points[0].y + points[2].y) / 2;
  const ux = { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
  const uy = { x: points[3].x - points[0].x, y: points[3].y - points[0].y };
  const sclA = ux.x / (selrect.width || 1);
  const sclB = ux.y / (selrect.width || 1);
  const sclC = uy.x / (selrect.height || 1);
  const sclD = uy.y / (selrect.height || 1);
  return {
    a: sclA,
    b: sclB,
    c: sclC,
    d: sclD,
    e: pcx - sclA * cx - sclC * cy,
    f: pcy - sclB * cx - sclD * cy,
  };
}

/**
 * Transform a child's local position through a parent's affine matrix.
 * Used when a parent has rotation/scale to compute correct page-space coords.
 * @param {object} origin - Parent's absolute position { x, y }
 * @param {number} localX - Child's local X offset
 * @param {number} localY - Child's local Y offset
 * @param {*} parentTransform - Parent's relativeTransform (array or object)
 * @returns {object} Absolute position { x, y }
 */
function transformChildPosition(origin, localX, localY, parentTransform) {
  const mat = normalizeMatrix(parentTransform);
  if (!mat || !isNonTrivialMatrix(mat)) {
    return { x: origin.x + localX, y: origin.y + localY };
  }
  return {
    x: origin.x + mat.a * localX + mat.c * localY,
    y: origin.y + mat.b * localX + mat.d * localY,
  };
}

module.exports = {
  buildGeometry,
  buildAffineGeometry,
  buildSelrect,
  buildCornerPoints,
  rotationMatrix,
  invertMatrix,
  transformPoint,
  rotateCorners,
  identityMatrix,
  buildRotationTransform,
  transformChildPosition,
};
