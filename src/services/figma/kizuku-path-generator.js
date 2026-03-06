/**
 * Kizuku Path Generator
 * Generates path commands for Figma vector shapes.
 * Handles stars, regular polygons, and full SVG path parsing
 * including H, V, S, T, A commands and relative coordinates.
 */

const { arcToBezier } = require('./kizuku-arc-to-bezier');

/**
 * Generate star path commands from bounding box
 * @param {number} width - Bounding box width
 * @param {number} height - Bounding box height
 * @param {number} pointCount - Number of star points
 * @param {number} innerRadius - Inner radius ratio (0-1)
 * @returns {array} Path command objects
 */
function generateStarPath(width, height, pointCount = 5, innerRadius = 0.38) {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRx = width / 2;
  const outerRy = height / 2;
  const innerRx = outerRx * innerRadius;
  const innerRy = outerRy * innerRadius;
  const totalPoints = pointCount * 2;
  const commands = [];

  for (let idx = 0; idx < totalPoints; idx++) {
    const angle = (idx * Math.PI) / pointCount - Math.PI / 2;
    const isOuter = idx % 2 === 0;
    const radX = isOuter ? outerRx : innerRx;
    const radY = isOuter ? outerRy : innerRy;
    const ptX = round(centerX + radX * Math.cos(angle));
    const ptY = round(centerY + radY * Math.sin(angle));

    commands.push({
      command: idx === 0 ? 'M' : 'L',
      x: ptX,
      y: ptY,
    });
  }

  commands.push({ command: 'Z' });
  return commands;
}

/**
 * Generate regular polygon path commands
 * @param {number} width - Bounding box width
 * @param {number} height - Bounding box height
 * @param {number} sideCount - Number of polygon sides
 * @returns {array} Path command objects
 */
function generatePolygonPath(width, height, sideCount = 3) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;
  const commands = [];

  for (let idx = 0; idx < sideCount; idx++) {
    const angle = (idx * 2 * Math.PI) / sideCount - Math.PI / 2;
    const ptX = round(centerX + radiusX * Math.cos(angle));
    const ptY = round(centerY + radiusY * Math.sin(angle));

    commands.push({
      command: idx === 0 ? 'M' : 'L',
      x: ptX,
      y: ptY,
    });
  }

  commands.push({ command: 'Z' });
  return commands;
}

/**
 * Create a fresh parsing context for SVG path parsing
 * @returns {object} Parsing context with position tracking
 */
function createParseContext() {
  return { lastX: 0, lastY: 0, lastCx2: 0, lastCy2: 0, lastQx: 0, lastQy: 0 };
}

/**
 * Parse an SVG path d-attribute string into command objects
 * @param {string} pathStr - SVG path string (e.g. "M 0 0 L 100 0")
 * @returns {array} Path command objects
 */
function parseSvgPathString(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') {
    return [];
  }
  const commands = [];
  const ctx = createParseContext();
  const tokens = pathStr.match(/[MmLlHhVvCcSsTtQqAaZz][^MmLlHhVvCcSsTtQqAaZz]*/g) || [];

  for (const token of tokens) {
    const cmdChar = token[0];
    const nums = extractNumbers(token.slice(1));
    const isRelative = cmdChar === cmdChar.toLowerCase() && cmdChar !== 'z';
    const result = processCommand(cmdChar.toUpperCase(), nums, ctx, isRelative);
    if (result) {
      commands.push(...(Array.isArray(result) ? result : [result]));
    }
  }

  return commands.filter(Boolean);
}

/**
 * Process a single SVG command with context tracking
 * @param {string} cmd - Uppercase command letter
 * @param {array} nums - Numeric parameters
 * @param {object} ctx - Parsing context
 * @param {boolean} isRelative - Whether command was lowercase
 * @returns {object|array|null} Command(s) or null
 */
function processCommand(cmd, nums, ctx, isRelative) {
  const absNums = isRelative ? toAbsolute(cmd, nums, ctx) : nums;
  const result = buildCommandWithContext(cmd, absNums, ctx);
  updateContext(cmd, absNums, ctx);
  return result;
}

/**
 * Convert relative coordinates to absolute
 * @param {string} cmd - Command letter
 * @param {array} nums - Relative coordinates
 * @param {object} ctx - Current position context
 * @returns {array} Absolute coordinates
 */
function toAbsolute(cmd, nums, ctx) {
  const abs = [...nums];
  if (cmd === 'H') {
    abs[0] += ctx.lastX;
  } else if (cmd === 'V') {
    abs[0] += ctx.lastY;
  } else if (cmd === 'A') {
    abs[5] += ctx.lastX;
    abs[6] += ctx.lastY;
  } else {
    for (let idx = 0; idx < abs.length; idx++) {
      abs[idx] += idx % 2 === 0 ? ctx.lastX : ctx.lastY;
    }
  }
  return abs;
}

/**
 * Build command object from absolute coordinates
 * @param {string} cmd - Command letter
 * @param {array} nums - Absolute coordinates
 * @param {object} ctx - Parsing context
 * @returns {object|array|null} Command object(s)
 */
function buildCommandWithContext(cmd, nums, ctx) {
  const builders = {
    M: () => ({ command: 'M', x: nums[0] || 0, y: nums[1] || 0 }),
    L: () => ({ command: 'L', x: nums[0] || 0, y: nums[1] || 0 }),
    H: () => ({ command: 'L', x: nums[0] || 0, y: ctx.lastY }),
    V: () => ({ command: 'L', x: ctx.lastX, y: nums[0] || 0 }),
    C: () => buildCubic(nums),
    S: () => buildSmoothCubic(nums, ctx),
    Q: () => buildQuadratic(nums, ctx),
    T: () => buildSmoothQuad(nums, ctx),
    A: () => buildArc(nums, ctx),
    Z: () => ({ command: 'Z' }),
  };
  const builder = builders[cmd];
  return builder ? builder() : null;
}

/**
 * Update parsing context after a command
 * @param {string} cmd - Command letter
 * @param {array} nums - Absolute coordinates used
 * @param {object} ctx - Context to update
 */
function updateContext(cmd, nums, ctx) {
  const updaters = {
    C: () => updateCubicContext(nums, ctx),
    S: () => updateSmoothCubicContext(nums, ctx),
    Q: () => updateQuadContext(nums, ctx),
    T: () => updateSmoothQuadContext(nums, ctx),
    A: () => updateArcContext(nums, ctx),
    H: () => {
      ctx.lastX = nums[0];
    },
    V: () => {
      ctx.lastY = nums[0];
    },
    M: () => updateMoveLineContext(nums, ctx),
    L: () => updateMoveLineContext(nums, ctx),
  };
  const updater = updaters[cmd];
  if (updater) {
    updater();
  }
}

/**
 * Update context for cubic bezier command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateCubicContext(nums, ctx) {
  ctx.lastCx2 = nums[2];
  ctx.lastCy2 = nums[3];
  ctx.lastX = nums[4];
  ctx.lastY = nums[5];
}

/**
 * Update context for smooth cubic command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateSmoothCubicContext(nums, ctx) {
  ctx.lastCx2 = nums[0];
  ctx.lastCy2 = nums[1];
  ctx.lastX = nums[2];
  ctx.lastY = nums[3];
}

/**
 * Update context for quadratic bezier command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateQuadContext(nums, ctx) {
  ctx.lastQx = nums[0];
  ctx.lastQy = nums[1];
  ctx.lastX = nums[2];
  ctx.lastY = nums[3];
}

/**
 * Update context for smooth quadratic command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateSmoothQuadContext(nums, ctx) {
  ctx.lastQx = 2 * ctx.lastX - (ctx.lastQx || ctx.lastX);
  ctx.lastQy = 2 * ctx.lastY - (ctx.lastQy || ctx.lastY);
  ctx.lastX = nums[0];
  ctx.lastY = nums[1];
}

/**
 * Update context for arc command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateArcContext(nums, ctx) {
  ctx.lastX = nums[5];
  ctx.lastY = nums[6];
}

/**
 * Update context for move/line command
 * @param {array} nums - Coordinate array
 * @param {object} ctx - Context to update
 */
function updateMoveLineContext(nums, ctx) {
  ctx.lastX = nums[0] || 0;
  ctx.lastY = nums[1] || 0;
}

/**
 * Build a cubic bezier command
 * @param {array} nums - [x1, y1, x2, y2, x, y]
 * @returns {object} Command object
 */
function buildCubic(nums) {
  return {
    command: 'C',
    x1: nums[0] || 0,
    y1: nums[1] || 0,
    x2: nums[2] || 0,
    y2: nums[3] || 0,
    x: nums[4] || 0,
    y: nums[5] || 0,
  };
}

/**
 * Build smooth cubic (S) by reflecting previous control point
 * @param {array} nums - [x2, y2, x, y]
 * @param {object} ctx - Parsing context
 * @returns {object} Cubic bezier command
 */
function buildSmoothCubic(nums, ctx) {
  const cx1 = 2 * ctx.lastX - (ctx.lastCx2 || ctx.lastX);
  const cy1 = 2 * ctx.lastY - (ctx.lastCy2 || ctx.lastY);
  return buildCubic([cx1, cy1, nums[0], nums[1], nums[2], nums[3]]);
}

/**
 * Build quadratic bezier as cubic approximation
 * @param {array} nums - [cx, cy, x, y]
 * @param {object} ctx - Parsing context with lastX, lastY
 * @returns {object} Cubic bezier command
 */
function buildQuadratic(nums, ctx) {
  const qx = nums[0];
  const qy = nums[1];
  const endX = nums[2];
  const endY = nums[3];
  const c1x = ctx.lastX + (2 / 3) * (qx - ctx.lastX);
  const c1y = ctx.lastY + (2 / 3) * (qy - ctx.lastY);
  const c2x = endX + (2 / 3) * (qx - endX);
  const c2y = endY + (2 / 3) * (qy - endY);
  return buildCubic([c1x, c1y, c2x, c2y, endX, endY]);
}

/**
 * Build smooth quadratic (T) by reflecting previous control point
 * @param {array} nums - [x, y]
 * @param {object} ctx - Parsing context
 * @returns {object} Cubic bezier command
 */
function buildSmoothQuad(nums, ctx) {
  const qx = 2 * ctx.lastX - (ctx.lastQx || ctx.lastX);
  const qy = 2 * ctx.lastY - (ctx.lastQy || ctx.lastY);
  const endX = nums[0];
  const endY = nums[1];
  const c1x = ctx.lastX + (2 / 3) * (qx - ctx.lastX);
  const c1y = ctx.lastY + (2 / 3) * (qy - ctx.lastY);
  const c2x = endX + (2 / 3) * (qx - endX);
  const c2y = endY + (2 / 3) * (qy - endY);
  return buildCubic([c1x, c1y, c2x, c2y, endX, endY]);
}

/**
 * Build arc command as cubic bezier approximation
 * @param {array} nums - [rx, ry, xRot, largeArc, sweep, x, y]
 * @param {object} ctx - Parsing context
 * @returns {array} Array of cubic bezier commands
 */
function buildArc(nums, ctx) {
  return arcToBezier({
    lastX: ctx.lastX,
    lastY: ctx.lastY,
    arcRx: nums[0] || 0,
    arcRy: nums[1] || 0,
    xRot: nums[2] || 0,
    largeArc: nums[3] || 0,
    sweep: nums[4] || 0,
    endX: nums[5] || 0,
    endY: nums[6] || 0,
  });
}

/**
 * Extract numbers from a path segment string
 * @param {string} str - Numeric portion of path segment
 * @returns {array} Array of numbers
 */
function extractNumbers(str) {
  const matches = str.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
  return matches ? matches.map(Number) : [];
}

/**
 * Parse vector geometry from Figma node (all paths)
 * Falls back to vectorPaths or vectorNetwork if fillGeometry missing
 * @param {object} figmaNode - Figma VECTOR node
 * @returns {object} { commands, fillRule }
 */
function parseVectorGeometry(figmaNode) {
  const geometry = figmaNode.fillGeometry || figmaNode.strokeGeometry;
  if (geometry && geometry.length > 0) {
    return parseGeometryArray(geometry);
  }
  return parseVectorFallback(figmaNode);
}

/**
 * Parse a geometry array (fillGeometry or strokeGeometry)
 * @param {array} geometry - Array of geometry objects with path strings
 * @returns {object} { commands, fillRule }
 */
function parseGeometryArray(geometry) {
  const allCommands = [];
  for (const geo of geometry) {
    if (geo.path) {
      allCommands.push(...parseSvgPathString(geo.path));
    }
  }
  const rule = geometry[0]?.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero';
  return { commands: allCommands, fillRule: rule };
}

/**
 * Fallback path parsing from vectorPaths or vectorNetwork
 * @param {object} figmaNode - Figma VECTOR node
 * @returns {object} { commands, fillRule }
 */
function parseVectorFallback(figmaNode) {
  if (figmaNode.vectorPaths?.length > 0) {
    const allCommands = [];
    for (const vPath of figmaNode.vectorPaths) {
      if (vPath.data) {
        allCommands.push(...parseSvgPathString(vPath.data));
      }
    }
    const rule = figmaNode.vectorPaths[0]?.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero';
    return { commands: allCommands, fillRule: rule };
  }
  return { commands: [], fillRule: 'nonzero' };
}

/**
 * Round a number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
function round(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Generate ellipse arc path for partial ellipses (pie/ring)
 * @param {number} width - Ellipse width
 * @param {number} height - Ellipse height
 * @param {object} arcData - { startAngle, endAngle, innerRadius }
 * @returns {array} Path command objects
 */
function generateEllipseArcPath(width, height, arcData) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const start = arcData.startAngle || 0;
  const end = arcData.endAngle || Math.PI * 2;
  const inner = arcData.innerRadius || 0;

  const outerStart = ellipsePoint(cx, cy, rx, ry, start);
  const outerEnd = ellipsePoint(cx, cy, rx, ry, end);
  const sweep = end - start;
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  const commands = [{ command: 'M', x: outerStart.x, y: outerStart.y }];

  const arcs = arcToBezier({
    lastX: outerStart.x,
    lastY: outerStart.y,
    arcRx: rx,
    arcRy: ry,
    xRot: 0,
    largeArc: large,
    sweep: 1,
    endX: outerEnd.x,
    endY: outerEnd.y,
  });
  commands.push(...arcs);

  if (inner > 0) {
    const irx = rx * inner;
    const iry = ry * inner;
    const innerEnd = ellipsePoint(cx, cy, irx, iry, end);
    const innerStart = ellipsePoint(cx, cy, irx, iry, start);
    commands.push({ command: 'L', x: innerEnd.x, y: innerEnd.y });
    const innerArcs = arcToBezier({
      lastX: innerEnd.x,
      lastY: innerEnd.y,
      arcRx: irx,
      arcRy: iry,
      xRot: 0,
      largeArc: large,
      sweep: 0,
      endX: innerStart.x,
      endY: innerStart.y,
    });
    commands.push(...innerArcs);
  } else {
    commands.push({ command: 'L', x: cx, y: cy });
  }
  commands.push({ command: 'Z' });
  return commands;
}

/**
 * Calculate point on ellipse at given angle
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} rx - Radius X
 * @param {number} ry - Radius Y
 * @param {number} angle - Angle in radians
 * @returns {object} { x, y }
 */
function ellipsePoint(cx, cy, rx, ry, angle) {
  return {
    x: round(cx + rx * Math.cos(angle)),
    y: round(cy + ry * Math.sin(angle)),
  };
}

module.exports = {
  generateStarPath,
  generatePolygonPath,
  parseSvgPathString,
  parseVectorGeometry,
  generateEllipseArcPath,
};
