/**
 * Kizuku Logo System
 * Provides utilities for displaying logos with proper theming
 */

const fs = require('fs');
const path = require('path');

// Logo variants available
const LOGO_VARIANTS = {
  DARK: 'KizukuDark',
  LIGHT: 'KizukuLight',
  DARK_OUTLINE: 'KizukuDarkOutline',
  LIGHT_OUTLINE: 'KizukuLightOutline',
};

/**
 * Get the appropriate logo variant based on theme
 * @param {string} theme - 'dark' or 'light'
 * @param {boolean} outline - Whether to use outline variant
 * @returns {string} Logo variant name
 */
function getLogoVariant(theme = 'dark', outline = false) {
  const variants = {
    'light-outline': LOGO_VARIANTS.LIGHT_OUTLINE,
    light: LOGO_VARIANTS.LIGHT,
    'dark-outline': LOGO_VARIANTS.DARK_OUTLINE,
    dark: LOGO_VARIANTS.DARK,
  };

  const key = outline ? `${theme}-outline` : theme;
  return variants[key] || LOGO_VARIANTS.DARK;
}

/**
 * Load SVG logo content
 * @param {string} variant - Logo variant name
 * @returns {string} SVG content
 */
function loadLogoSVG(variant) {
  try {
    const logoPath = path.join(__dirname, '..', 'Logos', `${variant}.svg`);
    return fs.readFileSync(logoPath, 'utf8');
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
}

/**
 * Get logo SVG with custom sizing
 * @param {string} theme - 'dark' or 'light'
 * @param {boolean} outline - Whether to use outline variant
 * @param {number} width - Desired width
 * @param {number} height - Desired height (optional, maintains aspect ratio)
 * @returns {string} Modified SVG content
 */
function getLogoSVG(theme, outline, width, height) {
  return getLogoSVGWithDefaults(theme, outline, width, height);
}

function getLogoSVGWithDefaults(theme, outline, width, height) {
  const finalTheme = theme || 'dark';
  const finalOutline = outline || false;
  const finalWidth = width || 32;
  const finalHeight = height || null;

  return processLogoRequest(finalTheme, finalOutline, finalWidth, finalHeight);
}

function processLogoRequest(theme, outline, width, height) {
  const svgContent = getLogoSVGContent(theme, outline);

  if (!svgContent) {
    return null;
  }

  return applySVGSizing(svgContent, width, height);
}

function getLogoSVGContent(theme, outline) {
  const variant = getLogoVariant(theme, outline);
  return loadLogoSVG(variant);
}

function applySVGSizing(svgContent, width, height) {
  const finalHeight = determineFinalHeight(height, svgContent, width);
  return resizeSVG(svgContent, width, finalHeight);
}

function determineFinalHeight(providedHeight, svgContent, width) {
  if (providedHeight) {
    return providedHeight;
  }
  return calculateHeight(svgContent, width);
}

function calculateHeight(svgContent, width) {
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    return width; // Fallback to square
  }

  const [, , , origWidth, origHeight] = viewBoxMatch[1].split(' ').map(Number);
  return Math.round((width / origWidth) * origHeight);
}

function resizeSVG(svgContent, width, height) {
  let result = svgContent.replace(/width="[^"]*"/, `width="${width}"`);
  result = result.replace(/height="[^"]*"/, `height="${height}"`);
  return result;
}

/**
 * Create logo element for loading screens
 * @param {string} theme - 'dark' or 'light'
 * @param {number} size - Logo size
 * @returns {string} HTML string for logo element
 */
function createLogoElement(theme = 'dark', size = 48) {
  const svgContent = getLogoSVG(theme, false, size);

  if (!svgContent) {
    // Fallback to text logo
    return `<div class="logo-fallback" style="
      font-size: ${size}px; 
      font-family: 'Josefin Sans', sans-serif; 
      font-weight: bold; 
      color: ${theme === 'dark' ? '#35F6E6' : '#11605A'};
    ">K</div>`;
  }

  return `<div class="kizuku-logo" style="display: inline-block;">${svgContent}</div>`;
}

/**
 * Get data URL for logo (useful for icons)
 * @param {string} theme - 'dark' or 'light'
 * @param {boolean} outline - Whether to use outline variant
 * @param {number} size - Size for the logo
 * @returns {string} Data URL
 */
function getLogoDataURL(theme = 'dark', outline = false, size = 32) {
  const svgContent = getLogoSVG(theme, outline, size);

  if (!svgContent) {
    return null;
  }

  const base64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate CSS with logo background images
 * @returns {string} CSS content
 */
function generateLogoCSSClasses() {
  return `
    .kizuku-logo {
      display: inline-block;
      vertical-align: middle;
    }
    
    .kizuku-logo svg {
      display: block;
    }
    
    .logo-dark { background-image: url("data:image/svg+xml,${encodeURIComponent(loadLogoSVG('KizukuDark') || '')}"); }
    .logo-light { background-image: url("data:image/svg+xml,${encodeURIComponent(loadLogoSVG('KizukuLight') || '')}"); }
    .logo-dark-outline { background-image: url("data:image/svg+xml,${encodeURIComponent(loadLogoSVG('KizukuDarkOutline') || '')}"); }
    .logo-light-outline { background-image: url("data:image/svg+xml,${encodeURIComponent(loadLogoSVG('KizukuLightOutline') || '')}"); }
    
    .logo-bg {
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
  `;
}

module.exports = {
  LOGO_VARIANTS,
  getLogoVariant,
  loadLogoSVG,
  getLogoSVG,
  createLogoElement,
  getLogoDataURL,
  generateLogoCSSClasses,
};
