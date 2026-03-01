/**
 * Kizuku Brand Guidelines Panel
 * A mini-storybook drawer for viewing design tokens at a glance.
 * Runs in PenPot's renderer context (injected via executeJavaScript).
 */

/* global getComputedStyle */

console.log('📐 Kizuku brand guidelines panel loaded');

/**
 * Color token definitions mapping name to CSS variable.
 * @type {Array<{name: string, cssVar: string}>}
 */
const COLOR_TOKENS = [
  { name: 'Primary', cssVar: '--kizuku-primary' },
  { name: 'Primary Dark', cssVar: '--kizuku-primary-dark' },
  { name: 'Primary Light', cssVar: '--kizuku-primary-light' },
  { name: 'BG Dark', cssVar: '--kizuku-bg-dark' },
  { name: 'BG Medium', cssVar: '--kizuku-bg-medium' },
  { name: 'Surface', cssVar: '--kizuku-surface' },
  { name: 'Surface Hover', cssVar: '--kizuku-surface-hover' },
  { name: 'Surface Active', cssVar: '--kizuku-surface-active' },
  { name: 'Text', cssVar: '--kizuku-text' },
  { name: 'Text Muted', cssVar: '--kizuku-text-muted' },
  { name: 'Text Dim', cssVar: '--kizuku-text-dim' },
  { name: 'Border', cssVar: '--kizuku-border' },
  { name: 'Divider', cssVar: '--kizuku-divider' },
  { name: 'Success', cssVar: '--kizuku-success' },
  { name: 'Warning', cssVar: '--kizuku-warning' },
  { name: 'Error', cssVar: '--kizuku-error' },
];

/**
 * Shadow token definitions.
 * @type {Array<{name: string, cssVar: string}>}
 */
const SHADOW_TOKENS = [
  { name: 'Small', cssVar: '--kizuku-shadow-sm' },
  { name: 'Medium', cssVar: '--kizuku-shadow-md' },
  { name: 'Large', cssVar: '--kizuku-shadow-lg' },
];

/**
 * Font size scale for preview.
 * @type {Array<{label: string, size: string}>}
 */
const SIZE_SCALE = [
  { label: 'xs', size: '10px' },
  { label: 'sm', size: '12px' },
  { label: 'base', size: '14px' },
  { label: 'md', size: '16px' },
  { label: 'lg', size: '20px' },
  { label: 'xl', size: '24px' },
  { label: '2xl', size: '32px' },
];

/**
 * Font weight samples for preview.
 * @type {Array<{label: string, weight: number}>}
 */
const WEIGHT_SAMPLES = [
  { label: '300 Light', weight: 300 },
  { label: '400 Regular', weight: 400 },
  { label: '500 Medium', weight: 500 },
  { label: '600 Semi-Bold', weight: 600 },
  { label: '700 Bold', weight: 700 },
];

// --------------- Helpers ---------------

/**
 * Read a CSS custom property value from :root.
 * @param {string} varName - CSS variable name
 * @returns {string} Resolved value or empty string
 */
function getCSSVar(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Copy text to the clipboard.
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

/**
 * Show the copied-to-clipboard toast for 1.5 seconds.
 * @param {string} value - The value that was copied
 */
function showCopiedToast(value) {
  const toast = document.getElementById('kzgl-toast');
  if (!toast) {
    return;
  }
  toast.textContent = `Copied: ${value}`;
  toast.classList.add('kzgl-toast--visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('kzgl-toast--visible');
  }, 1500);
}

// --------------- Section Builders ---------------

/**
 * Build the palette mode preview cards (dark + light).
 * @returns {string} HTML string
 */
function buildPaletteModes() {
  const pri = getCSSVar('--kizuku-primary') || '#35f6e6';
  const priDark = getCSSVar('--kizuku-primary-dark') || '#27bdb1';
  const bgDark = getCSSVar('--kizuku-bg-dark') || '#0f1923';
  const surface = getCSSVar('--kizuku-surface') || '#1a2a3a';
  const text = getCSSVar('--kizuku-text') || '#f0f4f8';
  return [
    '<div class="kzgl-palette-modes">',
    buildPaletteCard('Dark', [bgDark, surface, pri, priDark], text, bgDark),
    buildPaletteCard('Light', ['#f0f4f8', '#e2e8f0', pri, priDark], '#0f1923', '#f0f4f8'),
    '</div>',
  ].join('');
}

/**
 * Build a single palette mode preview card.
 * @param {string} label - Mode label
 * @param {Array<string>} colors - Array of color hex strings
 * @param {string} textColor - Text sample color
 * @param {string} bgColor - Card background color
 * @returns {string} HTML string
 */
function buildPaletteCard(label, colors, textColor, bgColor) {
  const isDark = label === 'Dark';
  const modifier = isDark ? 'dark' : 'light';
  const chips = colors
    .map((clr) => `<div class="kzgl-palette-strip__chip" style="background:${clr}"></div>`)
    .join('');
  return [
    `<div class="kzgl-palette-card kzgl-palette-card--${modifier}" style="background:${bgColor}">`,
    `  <div class="kzgl-palette-card__label">${label}</div>`,
    `  <div class="kzgl-palette-strip">${chips}</div>`,
    `  <div class="kzgl-palette-card__text-sample" style="color:${textColor}">`,
    '    Aa Bb Cc 123',
    '  </div>',
    '</div>',
  ].join('');
}

/**
 * Build interactive state preview buttons.
 * @returns {string} HTML string
 */
function buildStatePreview() {
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Interactive States</div>',
    '  <div class="kzgl-state-preview">',
    buildStateRow('Normal', 'normal', 'Surface Button'),
    buildStateRow('Hover', 'hover', 'Surface Button'),
    buildStateRow('Active', 'active', 'Surface Button'),
    '  </div>',
    '  <div class="kzgl-section__title" style="margin-top:12px">',
    '    Primary States',
    '  </div>',
    '  <div class="kzgl-state-preview">',
    buildStateRow('Normal', 'primary', 'Primary Action'),
    buildStateRow('Hover', 'primary-hover', 'Primary Action'),
    buildStateRow('Active', 'primary-active', 'Primary Action'),
    '  </div>',
    '</div>',
  ].join('');
}

/**
 * Build a single state preview row.
 * @param {string} label - State label (Normal, Hover, Active)
 * @param {string} modifier - CSS class modifier
 * @param {string} text - Button text
 * @returns {string} HTML string
 */
function buildStateRow(label, modifier, text) {
  return [
    '<div class="kzgl-state-row">',
    `  <span class="kzgl-state-row__label">${label}</span>`,
    `  <div class="kzgl-state-btn kzgl-state-btn--${modifier}">`,
    `    ${text}`,
    '  </div>',
    '</div>',
  ].join('');
}

/**
 * Build HTML for a single color swatch button.
 * @param {string} name - Display name
 * @param {string} cssVar - CSS variable name
 * @returns {string} HTML string
 */
function buildColorItem(name, cssVar) {
  const hex = getCSSVar(cssVar) || '#000';
  return [
    `<button class="kzgl-color" data-copy="${hex}">`,
    `  <span class="kzgl-color__swatch" style="background:${hex}"></span>`,
    '  <span class="kzgl-color__info">',
    `    <span class="kzgl-color__name">${name}</span>`,
    `    <span class="kzgl-color__hex">${hex}</span>`,
    '  </span>',
    '</button>',
  ].join('');
}

/**
 * Build the color swatches section.
 * @returns {string} HTML string
 */
function buildColorSection() {
  const items = COLOR_TOKENS.map((tok) => buildColorItem(tok.name, tok.cssVar));
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Colors</div>',
    buildPaletteModes(),
    `  <div class="kzgl-colors">${items.join('')}</div>`,
    '</div>',
  ].join('');
}

/**
 * Build a single typography sample card.
 * @param {string} label - Label text
 * @param {string} fontVar - CSS variable name for font-family
 * @param {string} sampleText - Text to render
 * @param {string} fontSize - CSS font-size value
 * @returns {string} HTML string
 */
function buildTypeSample(label, fontVar, sampleText, fontSize) {
  const fontVal = getCSSVar(fontVar) || 'sans-serif';
  const fontDisplay = fontVal.split(',')[0].replaceAll("'", '');
  return [
    '<div class="kzgl-type-sample">',
    `  <div class="kzgl-type-sample__label">${label} — ${fontDisplay}</div>`,
    `  <div class="kzgl-type-sample__text" style="font-family:${fontVal};font-size:${fontSize}">`,
    `    ${sampleText}`,
    '  </div>',
    '</div>',
  ].join('');
}

/**
 * Build the typography section.
 * @returns {string} HTML string
 */
function buildTypographySection() {
  const heading = buildTypeSample('Heading', '--kizuku-font-heading', 'Kizuku Design', '20px');
  const body = buildTypeSample(
    'Body',
    '--kizuku-font-body',
    'The quick brown fox jumps over the lazy dog.',
    '14px'
  );
  const mono = buildTypeSample('Mono', '--kizuku-font-mono', 'const x = 42;', '13px');
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Typography</div>',
    `  ${heading}${body}${mono}`,
    '</div>',
  ].join('');
}

/**
 * Build the font-size scale section.
 * @returns {string} HTML string
 */
function buildSizeSection() {
  const chips = SIZE_SCALE.map((entry) =>
    [
      '<div class="kzgl-size-chip">',
      `  <span class="kzgl-size-chip__value">${entry.size}</span>`,
      `  <span class="kzgl-size-chip__label">${entry.label}</span>`,
      '</div>',
    ].join('')
  );
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Size Scale</div>',
    `  <div class="kzgl-sizes">${chips.join('')}</div>`,
    '</div>',
  ].join('');
}

/**
 * Build the font-weight samples section.
 * @returns {string} HTML string
 */
function buildWeightSection() {
  const rows = WEIGHT_SAMPLES.map((entry) =>
    [
      '<div class="kzgl-weight">',
      `  <span class="kzgl-weight__sample" style="font-weight:${entry.weight}">`,
      '    Kizuku Design System',
      '  </span>',
      `  <span class="kzgl-weight__label">${entry.label}</span>`,
      '</div>',
    ].join('')
  );
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Font Weights</div>',
    `  <div class="kzgl-weights">${rows.join('')}</div>`,
    '</div>',
  ].join('');
}

/**
 * Build a single shadow preview card.
 * @param {string} name - Display name
 * @param {string} cssVar - CSS variable name
 * @returns {string} HTML string
 */
function buildShadowCard(name, cssVar) {
  const val = getCSSVar(cssVar) || 'none';
  return [
    '<div class="kzgl-shadow">',
    `  <div class="kzgl-shadow__box" style="box-shadow:${val}"></div>`,
    '  <div class="kzgl-shadow__info">',
    `    <span class="kzgl-shadow__name">${name}</span>`,
    `    <span class="kzgl-shadow__value">${val}</span>`,
    '  </div>',
    '</div>',
  ].join('');
}

/**
 * Build the shadows and gradient effects section.
 * Uses CSS class for gradient instead of inline style (fix).
 * @returns {string} HTML string
 */
function buildEffectsSection() {
  const shadows = SHADOW_TOKENS.map((tok) => buildShadowCard(tok.name, tok.cssVar));
  return [
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Shadows</div>',
    `  ${shadows.join('')}`,
    '</div>',
    '<div class="kzgl-section">',
    '  <div class="kzgl-section__title">Gradient</div>',
    '  <div class="kzgl-gradient"></div>',
    '  <div class="kzgl-gradient-label">',
    '    --kizuku-accent-gradient',
    '  </div>',
    '</div>',
  ].join('');
}

// --------------- Panel Lifecycle ---------------

/**
 * Build the full inner HTML content for the panel body.
 * @returns {string} HTML string of all sections
 */
function buildPanelContent() {
  return [
    buildColorSection(),
    buildStatePreview(),
    buildTypographySection(),
    buildSizeSection(),
    buildWeightSection(),
    buildEffectsSection(),
  ].join('');
}

/**
 * Create the panel DOM elements (panel, backdrop, toast).
 * Appends them to document.body.
 */
function createPanelElements() {
  if (document.getElementById('kzgl-panel')) {
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'kzgl-backdrop';
  backdrop.className = 'kizuku-guidelines-backdrop';

  const panel = document.createElement('div');
  panel.id = 'kzgl-panel';
  panel.className = 'kizuku-guidelines-panel';
  panel.innerHTML = buildPanelShell();

  const toast = document.createElement('div');
  toast.id = 'kzgl-toast';
  toast.className = 'kzgl-toast';
  toast.textContent = 'Copied!';

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  document.body.appendChild(toast);

  refreshPanelBody();
  attachPanelListeners();
}

/**
 * Build the panel shell HTML (header + body + footer).
 * @returns {string} HTML for the panel interior
 */
function buildPanelShell() {
  return [
    '<div class="kzgl-header">',
    '  <h2 class="kzgl-header__title">Brand Guidelines</h2>',
    '  <button class="kzgl-header__close" id="kzgl-close">',
    '    &times;',
    '  </button>',
    '</div>',
    '<div class="kzgl-body" id="kzgl-body"></div>',
    '<div class="kzgl-footer">',
    '  <button class="kzgl-footer__btn" id="kzgl-open-editor">',
    '    Open Full Theme Editor',
    '  </button>',
    '</div>',
  ].join('');
}

/**
 * Refresh the panel body with current CSS variable values.
 */
function refreshPanelBody() {
  const body = document.getElementById('kzgl-body');
  if (body) {
    body.innerHTML = buildPanelContent();
  }
}

/**
 * Open the guidelines panel.
 */
function openPanel() {
  createPanelElements();
  refreshPanelBody();
  const panel = document.getElementById('kzgl-panel');
  const backdrop = document.getElementById('kzgl-backdrop');
  if (panel) {
    panel.classList.add('kizuku-guidelines-panel--open');
  }
  if (backdrop) {
    backdrop.classList.add('kizuku-guidelines-backdrop--open');
  }
}

/**
 * Close the guidelines panel.
 */
function closePanel() {
  const panel = document.getElementById('kzgl-panel');
  const backdrop = document.getElementById('kzgl-backdrop');
  if (panel) {
    panel.classList.remove('kizuku-guidelines-panel--open');
  }
  if (backdrop) {
    backdrop.classList.remove('kizuku-guidelines-backdrop--open');
  }
}

/**
 * Toggle the guidelines panel open/closed.
 */
function togglePanel() {
  const panel = document.getElementById('kzgl-panel');
  const isOpen = panel && panel.classList.contains('kizuku-guidelines-panel--open');
  if (isOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

/**
 * Handle click events on color swatches (copy hex).
 * @param {Event} evt - Click event
 */
function handleSwatchClick(evt) {
  const btn = evt.target.closest('.kzgl-color');
  if (!btn) {
    return;
  }
  const hex = btn.getAttribute('data-copy');
  if (hex) {
    copyToClipboard(hex).then(() => showCopiedToast(hex));
  }
}

/**
 * Handle click on the "Open Full Theme Editor" button.
 */
function handleOpenEditor() {
  if (globalThis.electronAPI && globalThis.electronAPI.theme) {
    globalThis.electronAPI.theme.openEditor();
  } else {
    console.warn('electronAPI.theme not available');
  }
}

/**
 * Attach event listeners to panel elements.
 */
function attachPanelListeners() {
  const closeBtn = document.getElementById('kzgl-close');
  const backdrop = document.getElementById('kzgl-backdrop');
  const body = document.getElementById('kzgl-body');
  const editorBtn = document.getElementById('kzgl-open-editor');

  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closePanel);
  }
  if (body) {
    body.addEventListener('click', handleSwatchClick);
  }
  if (editorBtn) {
    editorBtn.addEventListener('click', handleOpenEditor);
  }
}

// --------------- Theme Reactivity ---------------

/**
 * Listen for theme updates and refresh panel if open.
 */
function listenForThemeUpdates() {
  if (globalThis.electronAPI && globalThis.electronAPI.theme) {
    globalThis.electronAPI.theme.onUpdated(() => {
      const panel = document.getElementById('kzgl-panel');
      const isOpen = panel && panel.classList.contains('kizuku-guidelines-panel--open');
      if (isOpen) {
        setTimeout(refreshPanelBody, 100);
      }
    });
  }
}

// --------------- Initialize ---------------

if (!globalThis._kizukuGuidelinesInitialized) {
  globalThis._kizukuGuidelinesInitialized = true;
  globalThis._kizukuToggleGuidelines = togglePanel;
  listenForThemeUpdates();
  console.log('✅ Brand guidelines panel ready');
}
