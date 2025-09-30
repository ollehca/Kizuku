/**
 * License Info Component
 *
 * Displays license information and allows users to:
 * - View their license code
 * - Copy license code to clipboard
 * - Toggle code visibility
 * - Change or deactivate license
 *
 * @module license-info
 */

const { ipcRenderer } = require('electron');

// State
let licenseData = null;
let isCodeVisible = true;

// DOM Elements
let codeElement;
let visibilityBtn;
let visibilityLabel;
let iconVisible;
let iconHidden;

/**
 * Initialize component
 */
async function initialize() {
  // Get DOM elements
  codeElement = document.getElementById('license-code');
  visibilityBtn = document.getElementById('btn-toggle-visibility');
  visibilityLabel = document.getElementById('visibility-label');
  iconVisible = document.querySelector('.icon-visible');
  iconHidden = document.querySelector('.icon-hidden');

  // Load license data
  await loadLicenseData();

  // Setup event listeners
  setupEventListeners();
}

/**
 * Load license data from storage
 */
async function loadLicenseData() {
  try {
    const result = await ipcRenderer.invoke('get-license-data');

    if (result.success && result.license) {
      licenseData = result.license;
      updateUI();
    } else {
      showError('Failed to load license information');
    }
  } catch {
    showError('Failed to load license information');
  }
}

/**
 * Update UI with license data
 */
function updateUI() {
  if (!licenseData) {
    return;
  }

  // Update license code
  document.getElementById('license-code').textContent = licenseData.code;

  // Update type badge and text
  const typeBadge = document.getElementById('license-type-badge');
  const typeText = document.getElementById('license-type-text');

  const typeLabel = getTypeLabelFromCode(licenseData.type);
  typeBadge.textContent = typeLabel;
  typeText.textContent = getFullTypeLabel(licenseData.type);

  // Update activation date
  const activatedDate = document.getElementById('activated-date');
  activatedDate.textContent = formatDate(licenseData.validatedAt);

  // Update activated by
  const activatedBy = document.getElementById('activated-by');
  activatedBy.textContent = licenseData.activatedBy || 'N/A';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Copy button
  document.getElementById('btn-copy').addEventListener('click', handleCopy);

  // Toggle visibility button
  visibilityBtn.addEventListener('click', handleToggleVisibility);

  // Change license button
  document.getElementById('btn-change-license').addEventListener('click', handleChangeLicense);

  // Deactivate button
  document.getElementById('btn-deactivate').addEventListener('click', handleDeactivate);
}

/**
 * Handle copy to clipboard
 */
async function handleCopy() {
  if (!licenseData) {
    return;
  }

  try {
    await navigator.clipboard.writeText(licenseData.code);

    // Show success feedback
    const btn = document.getElementById('btn-copy');
    const originalText = btn.querySelector('span').textContent;

    btn.classList.add('success');
    btn.querySelector('span').textContent = 'Copied!';

    setTimeout(() => {
      btn.classList.remove('success');
      btn.querySelector('span').textContent = originalText;
    }, 2000);

    showToast('License code copied to clipboard');
  } catch {
    showError('Failed to copy to clipboard');
  }
}

/**
 * Handle toggle code visibility
 */
function handleToggleVisibility() {
  isCodeVisible = !isCodeVisible;

  if (isCodeVisible) {
    codeElement.classList.remove('hidden');
    visibilityLabel.textContent = 'Hide';
    iconVisible.style.display = 'block';
    iconHidden.style.display = 'none';
  } else {
    codeElement.classList.add('hidden');
    visibilityLabel.textContent = 'Show';
    iconVisible.style.display = 'none';
    iconHidden.style.display = 'block';
  }
}

/**
 * Handle change license
 */
function handleChangeLicense() {
  ipcRenderer.send('show-change-license-dialog');
}

/**
 * Handle deactivate license
 */
function handleDeactivate() {
  ipcRenderer.send('show-deactivate-license-dialog');
}

/**
 * Get type label from code
 */
function getTypeLabelFromCode(type) {
  const typeMap = {
    private: 'Private',
    business: 'Business',
    trial: 'Trial',
  };
  return typeMap[type] || 'Unknown';
}

/**
 * Get full type label
 */
function getFullTypeLabel(type) {
  const typeMap = {
    private: 'Private / Individual',
    business: 'Business / Collaborative',
    trial: 'Trial',
  };
  return typeMap[type] || 'Unknown';
}

/**
 * Format date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  showToast(message);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
