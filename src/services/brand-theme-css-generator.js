/**
 * Kizu Brand Theme CSS Generator
 * Generates CSS and SCSS variable files from theme configuration.
 */

/**
 * Map of theme color keys to CSS variable names
 */
const COLOR_VAR_MAP = {
  primary: '--kizu-primary',
  primaryDark: '--kizu-primary-dark',
  primaryLight: '--kizu-primary-light',
  bgDark: '--kizu-bg-dark',
  bgMedium: '--kizu-bg-medium',
  surface: '--kizu-surface',
  surfaceHover: '--kizu-surface-hover',
  surfaceActive: '--kizu-surface-active',
  text: '--kizu-text',
  textMuted: '--kizu-text-muted',
  textDim: '--kizu-text-dim',
  border: '--kizu-border',
  divider: '--kizu-divider',
  success: '--kizu-success',
  warning: '--kizu-warning',
  error: '--kizu-error',
};

/**
 * Map of theme typography keys to CSS variable names
 */
const TYPO_VAR_MAP = {
  fontHeading: '--kizu-font-heading',
  fontBody: '--kizu-font-body',
  fontMono: '--kizu-font-mono',
};

/**
 * Generate color CSS variable declarations
 * @param {object} colors - Theme color values
 * @returns {string} CSS variable declarations
 */
function generateColorVars(colors) {
  const lines = [];
  for (const [key, varName] of Object.entries(COLOR_VAR_MAP)) {
    if (colors[key]) {
      lines.push(`  ${varName}: ${colors[key]};`);
    }
  }
  return lines.join('\n');
}

/**
 * Generate typography CSS variable declarations
 * @param {object} typography - Theme typography values
 * @returns {string} CSS variable declarations
 */
function generateTypographyVars(typography) {
  const lines = [];
  for (const [key, varName] of Object.entries(TYPO_VAR_MAP)) {
    if (typography[key]) {
      lines.push(`  ${varName}: ${typography[key]};`);
    }
  }
  return lines.join('\n');
}

/**
 * Generate computed CSS variable declarations (gradient, shadows)
 * @param {object} colors - Theme color values
 * @returns {string} CSS variable declarations
 */
function generateComputedVars(colors) {
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`;
  return [
    `  --kizu-accent-gradient: ${gradient};`,
    '  --kizu-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);',
    '  --kizu-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);',
    '  --kizu-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);',
  ].join('\n');
}

/**
 * Generate complete CSS palette file content from theme
 * @param {object} theme - Theme configuration
 * @returns {string} Full CSS file content with :root block
 */
function generatePaletteCSS(theme) {
  const header = [
    '/**',
    ' * Kizu Brand Color Palette (Auto-Generated)',
    ' * Do not edit manually — use the Theme Editor.',
    ' */',
    '',
  ].join('\n');

  const colorVars = generateColorVars(theme.colors);
  const typoVars = generateTypographyVars(theme.typography || {});
  const computedVars = generateComputedVars(theme.colors);

  return `${header}:root {\n${colorVars}\n\n${typoVars}\n\n${computedVars}\n}\n`;
}

/**
 * Generate SCSS variables file content from theme
 * @param {object} theme - Theme configuration
 * @returns {string} SCSS variable declarations
 */
function generateSCSSVariables(theme) {
  const header = [
    '// Kizu Brand Variables (Auto-Generated)',
    '// Do not edit manually — use the Theme Editor.',
    '',
  ].join('\n');

  const lines = [];
  for (const [key, varName] of Object.entries(COLOR_VAR_MAP)) {
    if (theme.colors[key]) {
      const scssVar = varName.replace(/^--kizu-/, '$kizu-');
      lines.push(`${scssVar}: ${theme.colors[key]};`);
    }
  }

  return `${header}${lines.join('\n')}\n`;
}

module.exports = {
  generatePaletteCSS,
  generateSCSSVariables,
  COLOR_VAR_MAP,
};
