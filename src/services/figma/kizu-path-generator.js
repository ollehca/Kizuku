/**
 * Kizu Path Generator
 * Generates SVG path commands for Figma vector shapes.
 * Handles stars, regular polygons, and parsed vector geometry.
 */

/**
 * Generate star path commands from bounding box
 * @param {number} width - Bounding box width
 * @param {number} height - Bounding box height
 * @param {number} pointCount - Number of star points
 * @returns {array} Path command objects
 */
function generateStarPath(width, height, pointCount = 5) {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRx = width / 2;
  const outerRy = height / 2;
  const innerRx = outerRx * 0.38;
  const innerRy = outerRy * 0.38;
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
 * Parse an SVG path d-attribute string into command objects
 * @param {string} pathStr - SVG path string (e.g. "M 0 0 L 100 0")
 * @returns {array} Path command objects
 */
function parseSvgPathString(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') {
    return [];
  }
  const commands = [];
  const tokens = pathStr.match(/[MLCQZmlcqz][^MLCQZmlcqz]*/g) || [];

  for (const token of tokens) {
    const cmd = token[0].toUpperCase();
    const nums = extractNumbers(token.slice(1));
    commands.push(buildCommand(cmd, nums));
  }

  return commands.filter(Boolean);
}

/**
 * Extract numbers from a path segment string
 * @param {string} str - Numeric portion of path segment
 * @returns {array} Array of numbers
 */
function extractNumbers(str) {
  const matches = str.match(/-?[\d.]+/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Build a move or line command
 * @param {string} cmd - M or L
 * @param {array} nums - [x, y]
 * @returns {object} Command object
 */
function buildMoveOrLine(cmd, nums) {
  return { command: cmd, x: nums[0] || 0, y: nums[1] || 0 };
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

/** Command builders by letter */
const CMD_BUILDERS = {
  M: (nums) => buildMoveOrLine('M', nums),
  L: (nums) => buildMoveOrLine('L', nums),
  C: (nums) => buildCubic(nums),
  Q: (nums) => buildCubic([nums[0], nums[1], nums[0], nums[1], nums[2], nums[3]]),
  Z: () => ({ command: 'Z' }),
};

/**
 * Build a path command object from type and numbers
 * @param {string} cmd - Command letter (M, L, C, Q, Z)
 * @param {array} nums - Numeric parameters
 * @returns {object|null} Command object or null
 */
function buildCommand(cmd, nums) {
  const builder = CMD_BUILDERS[cmd];
  return builder ? builder(nums) : null;
}

/**
 * Parse vector geometry from Figma node
 * @param {object} figmaNode - Figma VECTOR node
 * @returns {array} Path command objects
 */
function parseVectorGeometry(figmaNode) {
  const geometry = figmaNode.fillGeometry || figmaNode.strokeGeometry;
  if (geometry && geometry.length > 0 && geometry[0].path) {
    return parseSvgPathString(geometry[0].path);
  }
  return [];
}

/**
 * Round a number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
function round(num) {
  return Math.round(num * 100) / 100;
}

module.exports = {
  generateStarPath,
  generatePolygonPath,
  parseSvgPathString,
  parseVectorGeometry,
};
