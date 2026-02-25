/**
 * Success Modal Component
 *
 * Displays after successful account creation.
 * Shows welcome message and next steps.
 *
 * @module success-modal
 */

const api = window.electronAPI;

/**
 * Initialize modal
 */
async function initialize() {
  // Load user data
  await loadUserData();

  // Setup button handler
  const getStartedBtn = document.getElementById('btn-get-started');
  getStartedBtn.addEventListener('click', handleGetStarted);

  // Auto-close after 10 seconds if user doesn't interact
  setTimeout(() => {
    handleGetStarted();
  }, 10000);
}

/**
 * Load user data and populate modal
 */
async function loadUserData() {
  try {
    const userData = await api.onboarding.getUserSummary();
    const licenseData = await api.license.getValidationState();

    if (userData) {
      // Update username
      const usernameElement = document.getElementById('username');
      if (usernameElement) {
        usernameElement.textContent = userData.username;
      }
    }

    if (licenseData) {
      // Update license type
      const licenseTypeElement = document.getElementById('license-type');
      if (licenseTypeElement) {
        licenseTypeElement.textContent = getLicenseTypeLabel(licenseData.type);
      }
    }
  } catch {
    // Use defaults if data loading fails
  }
}

/**
 * Get human-readable license type label
 */
function getLicenseTypeLabel(type) {
  const labels = {
    private: 'Private',
    business: 'Business',
    trial: 'Trial',
  };
  return labels[type] || 'Private';
}

/**
 * Handle get started button click
 */
function handleGetStarted() {
  // Send event to main process to proceed to main app
  api.onboarding.onboardingComplete();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
