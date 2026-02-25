/**
 * Kizuku Brand Theme Defaults
 * Central default configuration for all brand values.
 * This is the single source of truth for the Kizuku look and feel.
 */

/**
 * Default color palette
 * @returns {object} Color definitions
 */
function getDefaultColors() {
  return {
    primary: '#35f6e6',
    primaryDark: '#27bdb1',
    primaryLight: '#6dfff3',
    bgDark: '#0f1923',
    bgMedium: '#152231',
    surface: '#1a2a3a',
    surfaceHover: '#243a4e',
    surfaceActive: '#2d4a62',
    text: '#f0f4f8',
    textMuted: 'rgba(240, 244, 248, 0.6)',
    textDim: 'rgba(240, 244, 248, 0.35)',
    border: 'rgba(53, 246, 230, 0.15)',
    divider: 'rgba(255, 255, 255, 0.08)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };
}

/**
 * Default typography settings
 * @returns {object} Typography definitions
 */
function getDefaultTypography() {
  return {
    fontHeading: "'Josefin Sans', -apple-system, sans-serif",
    fontBody:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    fontMono: "'SF Mono', Monaco, 'Cascadia Code', monospace",
    fontSize: {
      base: '14px',
      small: '12px',
      large: '16px',
      heading1: '32px',
      heading2: '24px',
      heading3: '18px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  };
}

/**
 * Get the complete default theme configuration
 * @returns {object} Frozen default theme object
 */
function getDefaultTheme() {
  return Object.freeze({
    version: '1.0.0',
    colors: getDefaultColors(),
    typography: getDefaultTypography(),
    customized: false,
    lastModified: null,
  });
}

module.exports = {
  getDefaultTheme,
  getDefaultColors,
  getDefaultTypography,
};
