/**
 * License Entry Screen Logic
 *
 * Handles license code validation and activation.
 *
 * @module license-entry
 */

const api = window.electronAPI;

// DOM Elements
let form;
let input;
let errorDiv;
let submitBtn;

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  form = document.getElementById('license-form');
  input = document.getElementById('license-code');
  errorDiv = document.getElementById('input-error');
  submitBtn = document.getElementById('btn-validate');

  // Form submission
  form.addEventListener('submit', handleSubmit);

  // Input validation on change
  input.addEventListener('input', handleInputChange);

  // Paste button
  const pasteBtn = document.getElementById('btn-paste');
  pasteBtn.addEventListener('click', handlePaste);

  // Back button
  const backBtn = document.getElementById('btn-back');
  backBtn.addEventListener('click', handleBack);

  // Contact support link
  const supportLink = document.getElementById('contact-support');
  supportLink.addEventListener('click', handleContactSupport);

  // Purchase link
  const purchaseLink = document.getElementById('purchase-link');
  purchaseLink.addEventListener('click', handlePurchase);
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
  event.preventDefault();

  const code = input.value.trim();
  if (!code) {
    showError('Please enter a license code');
    return;
  }

  // Show loading state
  setLoadingState(true);
  clearError();

  try {
    // Validate license code via IPC
    const result = await api.license.validateCode(code);

    if (result.valid) {
      // Show success state
      input.classList.add('success');
      input.classList.remove('error');

      // Proceed to account creation
      proceedToAccountCreation(result);
    } else {
      // Show error
      showError(result.error || 'Invalid license code');
      input.classList.add('error');
      input.classList.remove('success');
      setLoadingState(false);
    }
  } catch {
    showError('Failed to validate license. Please try again.');
    setLoadingState(false);
  }
}

/**
 * Handle input change
 */
function handleInputChange() {
  const code = input.value.trim();

  // Clear error when user starts typing
  if (code) {
    clearError();
    input.classList.remove('error');
    input.classList.remove('success');
  }

  // Auto-format code (add hyphens)
  const formatted = formatLicenseCode(code);
  if (formatted !== code) {
    const cursorPosition = input.selectionStart;
    input.value = formatted;
    input.setSelectionRange(cursorPosition, cursorPosition);
  }
}

/**
 * Handle paste button click
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.trim();
    input.focus();

    // Trigger input change to format
    handleInputChange();

    // Show feedback
    showToast('License code pasted', 'success');
  } catch {
    showToast('Failed to paste from clipboard', 'error');
  }
}

/**
 * Handle back button
 */
function handleBack(event) {
  event.preventDefault();
  api.license.backToSelection();
}

/**
 * Handle contact support
 */
function handleContactSupport(event) {
  event.preventDefault();
  api.onboarding.openExternalLink({
    url: 'mailto:support@kizuku.app',
    label: 'Contact Support',
  });
}

/**
 * Handle purchase link
 */
function handlePurchase(event) {
  event.preventDefault();
  api.onboarding.openExternalLink({
    url: 'https://kizuku.app/purchase',
    label: 'Purchase License',
  });
}

/**
 * Proceed to account creation
 */
function proceedToAccountCreation(licenseResult) {
  setTimeout(() => {
    api.license.validated({
      code: licenseResult.code,
      type: licenseResult.type,
      timestamp: licenseResult.timestamp,
      generatedAt: licenseResult.generatedAt,
    });
  }, 500);
}

/**
 * Format license code with hyphens
 */
function formatLicenseCode(code) {
  const upper = code.toUpperCase();

  // Preserve KIZUKU- prefix, only format the hex portion
  const prefix = 'KIZUKU-';
  const stripped = upper.replace(/[^A-Z0-9]/g, '');

  if (!stripped.startsWith('KIZUKU')) {
    return upper;
  }

  const hexPart = stripped.substring(6);
  const parts = [prefix.slice(0, -1)];
  for (let idx = 0; idx < hexPart.length; idx += 5) {
    parts.push(hexPart.substring(idx, idx + 5));
  }

  return parts.join('-');
}

/**
 * Show error message
 */
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
}

/**
 * Clear error message
 */
function clearError() {
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');
}

/**
 * Set loading state
 */
function setLoadingState(loading) {
  submitBtn.disabled = loading;
  if (loading) {
    submitBtn.classList.add('loading');
  } else {
    submitBtn.classList.remove('loading');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
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
 * Inject toast styles
 */
function injectToastStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      z-index: 3000;
      max-width: 400px;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-success {
      background: var(--color-success);
      color: white;
    }
    .toast-error {
      background: var(--color-error);
      color: white;
    }
    .toast-info {
      background: var(--color-primary);
      color: white;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize screen
 */
function initialize() {
  initializeEventListeners();
  injectToastStyles();

  // Focus input on load
  input.focus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
