/**
 * Login Screen Logic
 *
 * Handles user authentication for business/collab license holders.
 *
 * @module login
 */

const api = globalThis.electronAPI;

// DOM Elements
let form;
let usernameInput;
let passwordInput;
let rememberMeCheckbox;
let submitBtn;
let formError;

// Password visibility toggle
let passwordVisible = false;
let togglePasswordBtn;
let iconVisible;
let iconHidden;

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  form = document.getElementById('login-form');
  usernameInput = document.getElementById('username');
  passwordInput = document.getElementById('password');
  rememberMeCheckbox = document.getElementById('remember-me');
  submitBtn = document.getElementById('btn-login');
  formError = document.getElementById('form-error');

  togglePasswordBtn = document.getElementById('btn-toggle-password');
  iconVisible = togglePasswordBtn.querySelector('.icon-visible');
  iconHidden = togglePasswordBtn.querySelector('.icon-hidden');

  // Form submission
  form.addEventListener('submit', handleSubmit);

  // Real-time validation
  usernameInput.addEventListener('input', handleUsernameInput);
  passwordInput.addEventListener('input', handlePasswordInput);

  // Password visibility toggle
  togglePasswordBtn.addEventListener('click', handleTogglePassword);

  // Enter key handling
  passwordInput.addEventListener('keypress', handleKeyPress);

  // Help link
  const helpLink = document.getElementById('help-link');
  if (helpLink) {
    helpLink.addEventListener('click', handleHelpClick);
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
  event.preventDefault();

  // Clear previous errors
  clearFormError();

  // Validate fields
  const isValid = validateForm();
  if (!isValid) {
    return;
  }

  // Prepare credentials
  const credentials = {
    username: usernameInput.value.trim(),
    password: passwordInput.value,
    rememberMe: rememberMeCheckbox.checked,
  };

  // Show loading state
  setLoadingState(true);

  try {
    // Authenticate via IPC
    const result = await api.onboarding.authenticateUser(credentials);

    if (result.success) {
      // Authentication successful - proceed to main app
      proceedToMainApp();
    } else {
      // Authentication failed
      showFormError(result.error || 'Invalid username or password');
      setLoadingState(false);
      passwordInput.select();
    }
  } catch {
    showFormError('Authentication failed. Please try again.');
    setLoadingState(false);
  }
}

/**
 * Validate entire form
 */
function validateForm() {
  let isValid = true;

  // Username
  if (!validateUsername()) {
    isValid = false;
  }

  // Password
  if (!validatePassword()) {
    isValid = false;
  }

  return isValid;
}

/**
 * Handle username input
 */
function handleUsernameInput() {
  clearError('username-error');
  clearFormError();
  usernameInput.classList.remove('error');
}

/**
 * Validate username
 */
function validateUsername() {
  const username = usernameInput.value.trim();

  if (!username) {
    showError('username-error', 'Username is required');
    usernameInput.classList.add('error');
    return false;
  }

  return true;
}

/**
 * Handle password input
 */
function handlePasswordInput() {
  clearError('password-error');
  clearFormError();
  passwordInput.classList.remove('error');
}

/**
 * Validate password
 */
function validatePassword() {
  const password = passwordInput.value;

  if (!password) {
    showError('password-error', 'Password is required');
    passwordInput.classList.add('error');
    return false;
  }

  return true;
}

/**
 * Handle toggle password visibility
 */
function handleTogglePassword() {
  passwordVisible = !passwordVisible;

  if (passwordVisible) {
    passwordInput.type = 'text';
    iconVisible.style.display = 'none';
    iconHidden.style.display = 'block';
  } else {
    passwordInput.type = 'password';
    iconVisible.style.display = 'block';
    iconHidden.style.display = 'none';
  }
}

/**
 * Handle Enter key press
 */
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    handleSubmit(event);
  }
}

/**
 * Handle help link click
 */
function handleHelpClick(event) {
  event.preventDefault();
  // Could open external help page or show in-app help
  api.onboarding.openHelpPage('login-help');
}

/**
 * Show error message for specific field
 */
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

/**
 * Clear error message for specific field
 */
function clearError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
}

/**
 * Show form-level error message
 */
function showFormError(message) {
  if (formError) {
    formError.textContent = message;
    formError.style.display = 'block';
  }
}

/**
 * Clear form-level error message
 */
function clearFormError() {
  if (formError) {
    formError.textContent = '';
    formError.style.display = 'none';
  }
}

/**
 * Set loading state
 */
function setLoadingState(loading) {
  submitBtn.disabled = loading;
  usernameInput.disabled = loading;
  passwordInput.disabled = loading;
  rememberMeCheckbox.disabled = loading;

  if (loading) {
    submitBtn.classList.add('loading');
  } else {
    submitBtn.classList.remove('loading');
  }
}

/**
 * Proceed to main app
 */
function proceedToMainApp() {
  setTimeout(() => {
    api.onboarding.authenticationSuccessful();
  }, 300);
}

/**
 * Initialize screen
 */
function initialize() {
  initializeEventListeners();

  // Focus username input on load
  if (usernameInput) {
    usernameInput.focus();
  }

  // Load saved username if available (UX improvement)
  loadSavedUsername();
}

/**
 * Load saved username from previous session (optional UX improvement)
 */
async function loadSavedUsername() {
  try {
    const status = await api.onboarding.getAuthStatus();
    if (status.success && status.user?.username) {
      usernameInput.value = status.user.username;
      passwordInput.focus();
    }
  } catch (error) {
    // Silently fail - not critical
    console.error('Could not load saved username:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
