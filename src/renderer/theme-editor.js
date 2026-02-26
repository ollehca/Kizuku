/**
 * Kizuku Theme Editor Controller
 * Manages theme editing, live preview, and persistence via IPC.
 */

/* global confirm */

let currentTheme = null;

/** Color keys that have color picker inputs */
const COLOR_KEYS = [
  'primary',
  'primaryDark',
  'primaryLight',
  'bgDark',
  'surface',
  'surfaceHover',
  'text',
  'success',
  'warning',
  'error',
];

/**
 * Initialize the theme editor
 */
async function initEditor() {
  try {
    currentTheme = await globalThis.electronAPI.theme.load();
    populateControls(currentTheme);
    updatePreview();
    attachEventListeners();
  } catch (error) {
    console.error('Failed to init theme editor:', error);
  }
}

/**
 * Populate all form controls from theme data
 * @param {object} theme - Theme configuration
 */
function populateControls(theme) {
  populateColorPickers(theme.colors);
  populateFontSelects(theme.typography);
}

/**
 * Set color picker values and hex labels
 * @param {object} colors - Theme color values
 */
function populateColorPickers(colors) {
  for (const key of COLOR_KEYS) {
    const picker = document.getElementById(`color-${key}`);
    const hexLabel = document.getElementById(`hex-${key}`);
    if (picker && colors[key]) {
      const hex = toHexColor(colors[key]);
      picker.value = hex;
      if (hexLabel) {
        hexLabel.textContent = hex;
      }
    }
  }
}

/**
 * Set font select values from typography config
 * @param {object} typography - Theme typography values
 */
function populateFontSelects(typography) {
  if (!typography) {
    return;
  }
  setSelectValue('font-heading', typography.fontHeading);
  setSelectValue('font-body', typography.fontBody);
}

/**
 * Set a select element value, falling back to first option
 * @param {string} elementId - Select element ID
 * @param {string} value - Value to set
 */
function setSelectValue(elementId, value) {
  const select = document.getElementById(elementId);
  if (!select || !value) {
    return;
  }
  const option = Array.from(select.options).find((opt) => opt.value === value);
  if (option) {
    select.value = value;
  }
}

/**
 * Convert any CSS color to hex format (for color picker)
 * @param {string} color - CSS color string
 * @returns {string} Hex color string
 */
function toHexColor(color) {
  if (color.startsWith('#') && color.length === 7) {
    return color;
  }
  if (color.startsWith('#') && color.length === 4) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

/**
 * Attach event listeners to all controls
 */
function attachEventListeners() {
  attachColorListeners();
  attachFontListeners();
  attachButtonListeners();
}

/**
 * Attach change listeners to all color pickers
 */
function attachColorListeners() {
  for (const key of COLOR_KEYS) {
    const picker = document.getElementById(`color-${key}`);
    if (picker) {
      picker.addEventListener('input', () => handleColorChange(key, picker.value));
    }
  }
}

/**
 * Attach change listeners to font selects
 */
function attachFontListeners() {
  const headingSelect = document.getElementById('font-heading');
  const bodySelect = document.getElementById('font-body');
  if (headingSelect) {
    headingSelect.addEventListener('change', () => {
      currentTheme.typography.fontHeading = headingSelect.value;
      updatePreview();
    });
  }
  if (bodySelect) {
    bodySelect.addEventListener('change', () => {
      currentTheme.typography.fontBody = bodySelect.value;
      updatePreview();
    });
  }
}

/**
 * Attach click listeners to action buttons
 */
function attachButtonListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveAndApply);
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  document.getElementById('exportBtn').addEventListener('click', handleExport);
  document.getElementById('importBtn').addEventListener('click', handleImport);
}

/**
 * Handle a color picker change
 * @param {string} key - Color key name
 * @param {string} value - New hex color value
 */
function handleColorChange(key, value) {
  currentTheme.colors[key] = value;
  const hexLabel = document.getElementById(`hex-${key}`);
  if (hexLabel) {
    hexLabel.textContent = value;
  }
  updatePreview();
}

/**
 * Update the live preview with current theme values
 */
function updatePreview() {
  const colors = currentTheme.colors;
  const container = document.getElementById('previewContainer');
  const header = document.getElementById('previewHeader');

  container.style.background = colors.bgDark;
  header.style.background = colors.surface;

  applyPreviewElements(colors);
  applyPreviewBadges(colors);
}

/**
 * Apply theme colors to preview elements
 * @param {object} colors - Theme color values
 */
function applyPreviewElements(colors) {
  setStyles('previewTitle', { color: colors.primary });
  setStyles('previewBtnPrimary', {
    background: colors.primary,
    color: colors.bgDark,
  });
  setStyles('previewCard', {
    background: colors.surface,
    borderRadius: '12px',
  });
  setStyles('previewCardTitle', { color: colors.text });
  setStyles('previewCardText', { color: colors.text, opacity: '0.6' });
  setStyles('previewBtnAccent', {
    background: colors.primary,
    color: colors.bgDark,
  });
  setStyles('previewBtnSurface', {
    background: colors.surfaceHover,
    color: colors.text,
  });
}

/**
 * Apply theme colors to preview badge elements
 * @param {object} colors - Theme color values
 */
function applyPreviewBadges(colors) {
  setStyles('badgeSuccess', {
    background: colors.success + '22',
    color: colors.success,
  });
  setStyles('badgeWarning', {
    background: colors.warning + '22',
    color: colors.warning,
  });
  setStyles('badgeError', {
    background: colors.error + '22',
    color: colors.error,
  });
}

/**
 * Helper to set multiple style properties on an element
 * @param {string} elementId - Element ID
 * @param {object} styles - Style key-value pairs
 */
function setStyles(elementId, styles) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }
  for (const [prop, val] of Object.entries(styles)) {
    element.style[prop] = val;
  }
}

/**
 * Save theme and apply across the app
 */
async function saveAndApply() {
  try {
    await globalThis.electronAPI.theme.save(currentTheme);
    await globalThis.electronAPI.theme.apply();
    showToast('Theme saved and applied!');
  } catch (error) {
    showToast('Failed to save theme: ' + error.message);
  }
}

/**
 * Reset theme to defaults
 */
async function handleReset() {
  const confirmed = confirm('Reset all brand values to defaults?');
  if (!confirmed) {
    return;
  }
  try {
    currentTheme = await globalThis.electronAPI.theme.reset();
    populateControls(currentTheme);
    updatePreview();
    showToast('Theme reset to defaults');
  } catch (error) {
    showToast('Failed to reset: ' + error.message);
  }
}

/**
 * Export theme to JSON file
 */
async function handleExport() {
  try {
    const result = await globalThis.electronAPI.theme.exportFile();
    if (result.success) {
      showToast('Theme exported!');
    }
  } catch (error) {
    showToast('Export failed: ' + error.message);
  }
}

/**
 * Import theme from JSON file
 */
async function handleImport() {
  try {
    const result = await globalThis.electronAPI.theme.importFile();
    if (result.success) {
      currentTheme = result.theme;
      populateControls(currentTheme);
      updatePreview();
      showToast('Theme imported and applied!');
    }
  } catch (error) {
    showToast('Import failed: ' + error.message);
  }
}

/**
 * Show a temporary toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  const existing = document.getElementById('toast');
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '60px',
    right: '24px',
    background: '#333',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    zIndex: '9999',
    animation: 'fadeIn 0.3s',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initEditor);
