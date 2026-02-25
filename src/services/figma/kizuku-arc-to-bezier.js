/**
 * SVG Arc to Cubic Bezier Converter
 * Converts SVG arc (A) commands to cubic bezier (C) curves.
 * Based on the standard SVG arc parameterization algorithm.
 */

const TAU = Math.PI * 2;

/**
 * Convert an SVG arc to one or more cubic bezier curves
 * @param {object} options - Arc parameters
 * @param {number} options.lastX - Start point X
 * @param {number} options.lastY - Start point Y
 * @param {number} options.arcRx - Arc X radius
 * @param {number} options.arcRy - Arc Y radius
 * @param {number} options.xRot - X-axis rotation in degrees
 * @param {number} options.largeArc - Large arc flag (0 or 1)
 * @param {number} options.sweep - Sweep flag (0 or 1)
 * @param {number} options.endX - End point X
 * @param {number} options.endY - End point Y
 * @returns {array} Array of cubic bezier command objects
 */
function arcToBezier(options) {
  const { lastX, lastY, arcRx, arcRy, xRot, largeArc, sweep, endX, endY } = options;
  if (arcRx === 0 || arcRy === 0) {
    return [{ command: 'L', x: endX, y: endY }];
  }

  const sinPhi = Math.sin((xRot * Math.PI) / 180);
  const cosPhi = Math.cos((xRot * Math.PI) / 180);

  const midX = (lastX - endX) / 2;
  const midY = (lastY - endY) / 2;
  const pxp = cosPhi * midX + sinPhi * midY;
  const pyp = -sinPhi * midX + cosPhi * midY;

  const corrected = correctRadii(arcRx, arcRy, pxp, pyp);
  const rx = corrected.rx;
  const ry = corrected.ry;

  const center = computeCenter({ rx, ry, pxp, pyp, largeArc, sweep });
  const theta1 = vectorAngle(1, 0, (pxp - center.cx) / rx, (pyp - center.cy) / ry);
  let dTheta = vectorAngle(
    (pxp - center.cx) / rx,
    (pyp - center.cy) / ry,
    (-pxp - center.cx) / rx,
    (-pyp - center.cy) / ry
  );

  if (!sweep && dTheta > 0) {
    dTheta -= TAU;
  }
  if (sweep && dTheta < 0) {
    dTheta += TAU;
  }

  return generateBezierSegments({
    cx: center.cx,
    cy: center.cy,
    rx,
    ry,
    theta1,
    dTheta,
    cosPhi,
    sinPhi,
    originX: lastX,
    originY: lastY,
  });
}

/**
 * Correct radii to ensure they're large enough for the arc
 * @param {number} rx - X radius
 * @param {number} ry - Y radius
 * @param {number} pxp - Transformed X midpoint
 * @param {number} pyp - Transformed Y midpoint
 * @returns {object} Corrected { rx, ry }
 */
function correctRadii(rx, ry, pxp, pyp) {
  let absRx = Math.abs(rx);
  let absRy = Math.abs(ry);
  const lambda = (pxp * pxp) / (absRx * absRx) + (pyp * pyp) / (absRy * absRy);
  if (lambda > 1) {
    const sqrtL = Math.sqrt(lambda);
    absRx *= sqrtL;
    absRy *= sqrtL;
  }
  return { rx: absRx, ry: absRy };
}

/**
 * Compute center point of the arc ellipse
 * @param {object} options - Center computation parameters
 * @param {number} options.rx - X radius
 * @param {number} options.ry - Y radius
 * @param {number} options.pxp - Transformed X
 * @param {number} options.pyp - Transformed Y
 * @param {number} options.largeArc - Large arc flag
 * @param {number} options.sweep - Sweep flag
 * @returns {object} Center { cx, cy }
 */
function computeCenter(options) {
  const { rx, ry, pxp, pyp, largeArc, sweep } = options;
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const pxpSq = pxp * pxp;
  const pypSq = pyp * pyp;
  let radicand = (rxSq * rySq - rxSq * pypSq - rySq * pxpSq) / (rxSq * pypSq + rySq * pxpSq);
  radicand = Math.max(0, radicand);
  const root = Math.sqrt(radicand) * (largeArc === sweep ? -1 : 1);
  return {
    cx: (root * rx * pyp) / ry,
    cy: (-root * ry * pxp) / rx,
  };
}

/**
 * Compute angle between two vectors
 * @param {number} ux - Vector U x
 * @param {number} uy - Vector U y
 * @param {number} vx - Vector V x
 * @param {number} vy - Vector V y
 * @returns {number} Angle in radians
 */
function vectorAngle(ux, uy, vx, vy) {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = ux * vx + uy * vy;
  const mag = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
  return sign * Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

/**
 * Generate cubic bezier segments from arc parameters
 * @param {object} options - Bezier segment parameters
 * @param {number} options.cx - Center X
 * @param {number} options.cy - Center Y
 * @param {number} options.rx - X radius
 * @param {number} options.ry - Y radius
 * @param {number} options.theta1 - Start angle
 * @param {number} options.dTheta - Angular extent
 * @param {number} options.cosPhi - Cosine of rotation
 * @param {number} options.sinPhi - Sine of rotation
 * @param {number} options.originX - Original start X
 * @param {number} options.originY - Original start Y
 * @returns {array} Cubic bezier command array
 */
function generateBezierSegments(options) {
  const { cx, cy, rx, ry, theta1, dTheta, cosPhi, sinPhi, originX, originY } = options;
  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (TAU / 4)));
  const delta = dTheta / segments;
  const alpha = (4 / 3) * Math.tan(delta / 4);
  const commands = [];
  let prevX = originX;
  let prevY = originY;

  for (let idx = 0; idx < segments; idx++) {
    const t1 = theta1 + idx * delta;
    const t2 = t1 + delta;
    const pts = computeSegmentPoints({ cx, cy, rx, ry, t1, t2, alpha, cosPhi, sinPhi });
    commands.push({
      command: 'C',
      x1: prevX + alpha * (pts.dx1 * (-rx * sinPhi) - pts.dy1 * (ry * cosPhi)),
      y1: prevY + alpha * (pts.dx1 * (rx * cosPhi) + pts.dy1 * (ry * sinPhi)),
      x2: pts.x2 - alpha * (pts.dx2 * (-rx * sinPhi) - pts.dy2 * (ry * cosPhi)),
      y2: pts.y2 - alpha * (pts.dx2 * (rx * cosPhi) + pts.dy2 * (ry * sinPhi)),
      x: pts.x2,
      y: pts.y2,
    });
    prevX = pts.x2;
    prevY = pts.y2;
  }
  return commands;
}

/**
 * Compute endpoint and derivative for a bezier segment
 * @param {object} options - Segment point parameters
 * @param {number} options.cx - Center X
 * @param {number} options.cy - Center Y
 * @param {number} options.rx - X radius
 * @param {number} options.ry - Y radius
 * @param {number} options.t1 - Start angle of segment
 * @param {number} options.t2 - End angle of segment
 * @param {number} options.alpha - Tangent factor
 * @param {number} options.cosPhi - Cosine of rotation
 * @param {number} options.sinPhi - Sine of rotation
 * @returns {object} Segment geometry
 */
function computeSegmentPoints(options) {
  const { cx, cy, rx, ry, t1, t2, cosPhi, sinPhi } = options;
  const cos2 = Math.cos(t2);
  const sin2 = Math.sin(t2);
  return {
    x2: cosPhi * rx * cos2 - sinPhi * ry * sin2 + cx,
    y2: sinPhi * rx * cos2 + cosPhi * ry * sin2 + cy,
    dx1: -Math.sin(t1),
    dy1: Math.cos(t1),
    dx2: -Math.sin(t2),
    dy2: Math.cos(t2),
  };
}

module.exports = { arcToBezier };
