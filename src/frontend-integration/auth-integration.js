/**
 * Kizu Authentication Integration
 * This script integrates with the PenPot frontend to provide persistent login functionality
 */

// Authentication utility functions
const AuthUtils = {
  // Wait for the frontend to load and electronAPI to be available
  waitForElectronAPI() {
    if (window.electronAPI && window.electronAPI.auth) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.electronAPI && window.electronAPI.auth) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  },

  // Check for auth system availability
  isAuthSystemReady() {
    return window.app || window.penpot || document.querySelector('[data-testid="login-form"]');
  },

  // Wait for PenPot's authentication system to be available
  waitForPenpotAuth() {
    if (this.isAuthSystemReady()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkForAuth = () => {
        if (this.isAuthSystemReady()) {
          resolve();
        } else {
          setTimeout(checkForAuth, 500);
        }
      };

      checkForAuth();
    });
  },
};

// Auto-login functionality
const AutoLogin = {
  // Check if on login page
  isOnLoginPage() {
    const currentUrl = window.location.href;
    return currentUrl.includes('/auth/login') || currentUrl.includes('/auth/register');
  },

  // Set authentication cookie
  setAuthCookie(authToken) {
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `auth-token=${authToken}; path=/; SameSite=Lax; Secure=${isSecure}`;
    console.log('🔐 Auth token cookie set');
  },

  // Check if auto-login should proceed
  shouldPerformAutoLogin() {
    return window.kizuAuth && window.kizuAuth.autoLogin && this.isOnLoginPage();
  },

  // Perform redirect to dashboard
  redirectToDashboard() {
    setTimeout(() => {
      console.log('🔐 Redirecting to dashboard after auto-login');
      window.location.href = '/dashboard/recent';
    }, 1000);
  },

  // Handle auto-login failure
  handleAutoLoginError(error) {
    console.error('🔐 Auto-login failed:', error);
    if (window.electronAPI && window.electronAPI.auth) {
      window.electronAPI.auth.clearCredentials();
    }
  },

  // Auto-login function
  async performAutoLogin() {
    if (!this.shouldPerformAutoLogin()) {
      return;
    }

    console.log('🔐 Attempting auto-login for:', window.kizuAuth.email);

    try {
      const authToken = window.kizuAuth.token;
      if (authToken) {
        this.setAuthCookie(authToken);
        this.redirectToDashboard();
      }
    } catch (error) {
      this.handleAutoLoginError(error);
    }
  },
};

// UI enhancement functionality
const UIEnhancement = {
  // Find login form
  findLoginForm() {
    return (
      document.querySelector('[data-testid="login-form"]') ||
      document.querySelector('form[class*="login"]') ||
      document.querySelector('form[class*="auth"]')
    );
  },

  // Create remember me container
  createRememberContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      margin: 12px 0;
      font-family: inherit;
      font-size: 14px;
      color: var(--color-foreground-primary, #000);
    `;
    return container;
  },

  // Create remember me checkbox
  createRememberCheckbox() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'kizu-remember-me';
    checkbox.checked = true;
    checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
    return checkbox;
  },

  // Create remember me label
  createRememberLabel() {
    const label = document.createElement('label');
    label.htmlFor = 'kizu-remember-me';
    label.textContent = 'Remember me for 30 days';
    label.style.cssText = 'cursor: pointer; user-select: none;';
    return label;
  },
};

// Credential management functionality
const CredentialManager = {
  // Helper function to get cookie value
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  },

  // Get profile from API
  async fetchProfile() {
    try {
      const response = await fetch('/api/rpc/query/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('🔐 Could not fetch profile:', error);
    }
    return null;
  },

  // Check if login was successful
  isLoginSuccessful() {
    if (window.location.href.includes('/auth/login')) {
      console.log('🔐 Still on login page, login may have failed');
      return false;
    }

    const authToken = this.getCookie('auth-token');
    if (!authToken) {
      console.log('🔐 No auth token found, login may have failed');
      return false;
    }

    return true;
  },

  // Clear credentials via Electron API
  clearStoredCredentials() {
    if (window.electronAPI && window.electronAPI.auth) {
      window.electronAPI.auth.clearCredentials();
    }
  },
};

// Main authentication integration system
const AuthIntegration = {
  // Find submit button in form
  findSubmitButton(form) {
    return (
      form.querySelector('[type="submit"]') ||
      form.querySelector('button[class*="submit"]') ||
      form.querySelector('button[class*="login"]')
    );
  },

  // Create and insert remember me elements
  insertRememberMeElements(submitButton) {
    const rememberContainer = UIEnhancement.createRememberContainer();
    const checkbox = UIEnhancement.createRememberCheckbox();
    const label = UIEnhancement.createRememberLabel();

    rememberContainer.appendChild(checkbox);
    rememberContainer.appendChild(label);
    submitButton.parentNode.insertBefore(rememberContainer, submitButton);
  },

  // Add "Remember Me" checkbox to login form
  addRememberMeCheckbox(form) {
    try {
      const submitButton = this.findSubmitButton(form);

      if (!submitButton) {
        console.warn('🔐 Could not find submit button to add Remember Me checkbox');
        return;
      }

      this.insertRememberMeElements(submitButton);
      console.log('🔐 Remember Me checkbox added to login form');
    } catch (error) {
      console.error('🔐 Failed to add Remember Me checkbox:', error);
    }
  },

  // Hook into login form submission
  hookLoginSubmission(form) {
    form.addEventListener('submit', async () => {
      console.log('🔐 Login form submitted, will store credentials on success');
      setTimeout(async () => {
        await this.checkAndStoreCredentials();
      }, 2000);
    });

    const submitButton =
      form.querySelector('[type="submit"]') ||
      form.querySelector('button[class*="submit"]') ||
      form.querySelector('button[class*="login"]');

    if (submitButton) {
      submitButton.addEventListener('click', async () => {
        setTimeout(async () => {
          await this.checkAndStoreCredentials();
        }, 2000);
      });
    }
  },

  // Store credentials via Electron API
  async storeCredentialsElectron(credentials) {
    if (window.electronAPI && window.electronAPI.auth) {
      const stored = await window.electronAPI.auth.storeCredentials(credentials);
      if (stored) {
        const duration = credentials.rememberMe ? '30 days' : '7 days';
        console.log('🔐 Credentials stored successfully for', duration);
      } else {
        console.error('🔐 Failed to store credentials');
      }
    }
  },

  // Gather credentials from form and API
  async gatherCredentials() {
    const rememberMeCheckbox = document.getElementById('kizu-remember-me');
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;
    const emailInput = document.querySelector('[type="email"], [name="email"]');
    const email = emailInput ? emailInput.value : '';
    const authToken = CredentialManager.getCookie('auth-token');
    const profile = await CredentialManager.fetchProfile();

    return {
      token: authToken,
      email: email,
      rememberMe: rememberMe,
      profile: profile,
      loginTime: new Date().toISOString(),
    };
  },

  // Check if login was successful and store credentials
  async checkAndStoreCredentials() {
    try {
      if (!CredentialManager.isLoginSuccessful()) {
        return;
      }

      const credentials = await this.gatherCredentials();
      await this.storeCredentialsElectron(credentials);
    } catch (error) {
      console.error('🔐 Error checking and storing credentials:', error);
    }
  },
};

// Form enhancement system
const FormEnhancer = {
  // Enhance existing form
  enhanceExistingForm() {
    const existingForm = UIEnhancement.findLoginForm();
    if (existingForm && !existingForm.dataset.kizuEnhanced) {
      AuthIntegration.addRememberMeCheckbox(existingForm);
      AuthIntegration.hookLoginSubmission(existingForm);
      existingForm.dataset.kizuEnhanced = 'true';
    }
  },

  // Hook into the login form to add "Remember Me" functionality
  enhanceLoginForm() {
    /* global MutationObserver */
    const observer = new MutationObserver(() => {
      const loginForm = UIEnhancement.findLoginForm();

      if (loginForm && !loginForm.dataset.kizuEnhanced) {
        AuthIntegration.addRememberMeCheckbox(loginForm);
        AuthIntegration.hookLoginSubmission(loginForm);
        loginForm.dataset.kizuEnhanced = 'true';
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => this.enhanceExistingForm(), 1000);
  },
};

// Logout monitoring system
const LogoutMonitor = {
  // Watch for URL changes to login page
  watchForLoginRedirect() {
    /* global history */
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      if (window.location.href.includes('/auth/login')) {
        setTimeout(() => CredentialManager.clearStoredCredentials(), 1000);
      }
    };
  },

  // Hook into logout to clear stored credentials
  hookLogout() {
    let lastAuthToken = CredentialManager.getCookie('auth-token');

    setInterval(() => {
      const currentAuthToken = CredentialManager.getCookie('auth-token');
      if (lastAuthToken && !currentAuthToken) {
        console.log('🔐 Logout detected, clearing stored credentials');
        CredentialManager.clearStoredCredentials();
      }
      lastAuthToken = currentAuthToken;
    }, 5000);

    this.watchForLoginRedirect();
  },
};

(function () {
  'use strict';

  console.log('🔐 Kizu Auth Integration loaded');

  // Initialize the authentication integration
  async function initialize() {
    try {
      await AuthUtils.waitForElectronAPI();
      console.log('🔐 ElectronAPI ready');

      await AutoLogin.performAutoLogin();
      await AuthUtils.waitForPenpotAuth();
      console.log('🔐 PenPot auth system ready');

      FormEnhancer.enhanceLoginForm();
      LogoutMonitor.hookLogout();

      console.log('🔐 Kizu auth integration fully initialized');
    } catch (error) {
      console.error('🔐 Failed to initialize Kizu auth integration:', error);
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
