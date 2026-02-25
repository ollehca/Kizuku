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

module.exports = {
  buildGeometry,
  buildSelrect,
  buildCornerPoints,
  rotationMatrix,
  invertMatrix,
  transformPoint,
  rotateCorners,
  identityMatrix,
  buildRotationTransform,
};
