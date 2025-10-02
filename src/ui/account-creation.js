/**
 * Account Creation Screen Logic
 *
 * Handles local account creation after license validation.
 *
 * @module account-creation
 */

const { ipcRenderer } = require('electron');

// DOM Elements
let form;
let usernameInput;
let fullnameInput;
let emailInput;
let passwordInput;
let confirmPasswordInput;
let submitBtn;

// Password visibility toggle
let passwordVisible = false;
let togglePasswordBtn;
let iconVisible;
let iconHidden;

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  form = document.getElementById('account-form');
  usernameInput = document.getElementById('username');
  fullnameInput = document.getElementById('fullname');
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  confirmPasswordInput = document.getElementById('confirm-password');
  submitBtn = document.getElementById('btn-create');

  togglePasswordBtn = document.getElementById('btn-toggle-password');
  iconVisible = togglePasswordBtn.querySelector('.icon-visible');
  iconHidden = togglePasswordBtn.querySelector('.icon-hidden');

  // Form submission
  form.addEventListener('submit', handleSubmit);

  // Real-time validation
  usernameInput.addEventListener('input', handleUsernameInput);
  fullnameInput.addEventListener('input', handleFullnameInput);
  emailInput.addEventListener('input', handleEmailInput);
  passwordInput.addEventListener('input', handlePasswordInput);
  confirmPasswordInput.addEventListener('input', handleConfirmPasswordInput);

  // Password visibility toggle
  togglePasswordBtn.addEventListener('click', handleTogglePassword);
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
  event.preventDefault();

  // Validate all fields
  const isValid = validateForm();
  if (!isValid) {
    return;
  }

  // Prepare user data
  const userData = {
    username: usernameInput.value.trim(),
    fullName: fullnameInput.value.trim(),
    email: emailInput.value.trim() || null,
    password: passwordInput.value,
  };

  // Show loading state
  setLoadingState(true);

  try {
    // Create account via IPC
    const result = await ipcRenderer.invoke('create-user-account', userData);

    if (result.success) {
      // Account created successfully
      proceedToCompletion();
    } else {
      showError('account-error', result.error || 'Failed to create account');
      setLoadingState(false);
    }
  } catch {
    showError('account-error', 'Failed to create account. Please try again.');
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

  // Full name
  if (!validateFullname()) {
    isValid = false;
  }

  // Email (optional but must be valid if provided)
  if (emailInput.value.trim() && !validateEmail()) {
    isValid = false;
  }

  // Password
  if (!validatePassword()) {
    isValid = false;
  }

  // Confirm password
  if (!validateConfirmPassword()) {
    isValid = false;
  }

  return isValid;
}

/**
 * Handle username input
 */
function handleUsernameInput() {
  clearError('username-error');
  usernameInput.classList.remove('error');
  usernameInput.classList.remove('success');
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

  if (username.length < 3) {
    showError('username-error', 'Username must be at least 3 characters');
    usernameInput.classList.add('error');
    return false;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError('username-error', 'Username can only contain letters, numbers, and underscores');
    usernameInput.classList.add('error');
    return false;
  }

  usernameInput.classList.add('success');
  return true;
}

/**
 * Handle full name input
 */
function handleFullnameInput() {
  clearError('fullname-error');
  fullnameInput.classList.remove('error');
  fullnameInput.classList.remove('success');
}

/**
 * Validate full name
 */
function validateFullname() {
  const fullname = fullnameInput.value.trim();

  if (!fullname) {
    showError('fullname-error', 'Full name is required');
    fullnameInput.classList.add('error');
    return false;
  }

  fullnameInput.classList.add('success');
  return true;
}

/**
 * Handle email input
 */
function handleEmailInput() {
  clearError('email-error');
  emailInput.classList.remove('error');
  emailInput.classList.remove('success');
}

/**
 * Validate email
 */
function validateEmail() {
  const email = emailInput.value.trim();

  // Email is optional, so empty is valid
  if (!email) {
    return true;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email-error', 'Please enter a valid email address');
    emailInput.classList.add('error');
    return false;
  }

  emailInput.classList.add('success');
  return true;
}

/**
 * Handle password input
 */
function handlePasswordInput() {
  clearError('password-error');
  passwordInput.classList.remove('error');
  passwordInput.classList.remove('success');

  // Update password strength indicator
  updatePasswordStrength(passwordInput.value);

  // Re-validate confirm password if it has a value
  if (confirmPasswordInput.value) {
    handleConfirmPasswordInput();
  }
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

  if (password.length < 8) {
    showError('password-error', 'Password must be at least 8 characters');
    passwordInput.classList.add('error');
    return false;
  }

  passwordInput.classList.add('success');
  return true;
}

/**
 * Handle confirm password input
 */
function handleConfirmPasswordInput() {
  clearError('confirm-password-error');
  confirmPasswordInput.classList.remove('error');
  confirmPasswordInput.classList.remove('success');

  // If confirm password has value, validate it matches
  if (confirmPasswordInput.value) {
    validateConfirmPassword();
  }
}

/**
 * Validate confirm password
 */
function validateConfirmPassword() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!confirmPassword) {
    showError('confirm-password-error', 'Please confirm your password');
    confirmPasswordInput.classList.add('error');
    return false;
  }

  if (password !== confirmPassword) {
    showError('confirm-password-error', 'Passwords do not match');
    confirmPasswordInput.classList.add('error');
    return false;
  }

  confirmPasswordInput.classList.add('success');
  return true;
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(password) {
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');

  if (!password) {
    strengthFill.className = 'strength-fill';
    strengthLabel.className = 'strength-label';
    strengthLabel.textContent = 'Enter a password';
    return;
  }

  let strength = 0;
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];

  strength = checks.filter(Boolean).length;

  const levels = ['weak', 'weak', 'fair', 'good', 'strong'];
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  const level = levels[strength];
  const label = labels[strength];

  strengthFill.className = `strength-fill ${level}`;
  strengthLabel.className = `strength-label ${level}`;
  strengthLabel.textContent = label;
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
 * Show error message
 */
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.add('show');
}

/**
 * Clear error message
 */
function clearError(elementId) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = '';
  errorElement.classList.remove('show');
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
 * Proceed to completion screen
 */
function proceedToCompletion() {
  setTimeout(() => {
    ipcRenderer.send('account-created-successfully');
  }, 500);
}

/**
 * Initialize screen
 */
function initialize() {
  initializeEventListeners();

  // Focus username input on load
  usernameInput.focus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
