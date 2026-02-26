/**
 * Tests for Kizuku Auth Integration - Login Modal Bypass
 *
 * These tests verify that the login modal is properly hidden/bypassed
 * for users with a valid Kizuku private license.
 *
 * Uses Playwright's Electron API to test the actual Electron app.
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('node:path');

test.describe('Kizuku Electron App - Login Modal Bypass', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'src', 'main.js')],
    });

    // Wait for the first BrowserWindow to open
    window = await electronApp.firstWindow();

    // Wait for app to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000); // Give PenPot time to initialize
  });

  test.afterEach(async () => {
    // Close the app after each test
    await electronApp.close();
  });

  test('should set kizu-single-user-mode flag in localStorage', async () => {
    const flag = await window.evaluate(() => {
      return localStorage.getItem('kizu-single-user-mode');
    });

    expect(flag).toBe('true');
  });

  test('should set auth-token in localStorage', async () => {
    const token = await window.evaluate(() => {
      return localStorage.getItem('auth-token');
    });

    expect(token).toBeTruthy();
    expect(token).toBe('kizuku-private-license-token');
  });

  test('should NOT show login modal on page load', async () => {
    // Check for login form elements that should NOT be visible
    const loginEmailInput = await window.locator('input[type="email"], input[name="email"]').count();
    const loginPasswordInput = await window.locator('input[type="password"], input[name="password"]').count();
    const loginButton = await window.locator('button:has-text("LOGIN"), button:has-text("Log in")').count();

    // These elements should either not exist or be hidden
    const emailVisible = loginEmailInput > 0 ? await window.locator('input[type="email"], input[name="email"]').first().isVisible() : false;
    const passwordVisible = loginPasswordInput > 0 ? await window.locator('input[type="password"], input[name="password"]').first().isVisible() : false;
    const buttonVisible = loginButton > 0 ? await window.locator('button:has-text("LOGIN"), button:has-text("Log in")').first().isVisible() : false;

    expect(emailVisible).toBe(false);
    expect(passwordVisible).toBe(false);
    expect(buttonVisible).toBe(false);
  });

  test('should navigate to dashboard route instead of login', async () => {
    await window.waitForTimeout(2000);

    const currentUrl = window.url();

    // Should be on dashboard, not login
    expect(currentUrl).toContain('/dashboard');
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).not.toContain('/auth');
  });

  test('should inject kizuku-login-hide CSS style', async () => {
    const hasHideStyle = await window.evaluate(() => {
      // Check for both preload and fallback CSS injection
      return !!document.getElementById('kizuku-login-hide-preload') ||
             !!document.getElementById('kizuku-login-hide');
    });

    expect(hasHideStyle).toBe(true);
  });

  test('should hide main.auth-section elements', async () => {
    const authSections = await window.locator('main.auth-section').count();

    if (authSections > 0) {
      const isVisible = await window.locator('main.auth-section').first().isVisible();
      expect(isVisible).toBe(false);
    }

    // If no auth sections found, that's also a pass
    expect(true).toBe(true);
  });

  test('should show dashboard UI elements', async () => {
    // Check for dashboard elements
    const hasDashboardContent = await window.evaluate(() => {
      // Look for common dashboard indicators
      const hasRecent = document.querySelector('[data-testid*="recent"], [class*="recent"]');
      const hasProjects = document.querySelector('[data-testid*="project"], [class*="project"]');
      const hasDrafts = document.querySelector('[data-testid*="draft"], [class*="draft"]');

      return !!(hasRecent || hasProjects || hasDrafts);
    });

    expect(hasDashboardContent).toBe(true);
  });

  test('should log auth bypass messages in console', async () => {
    const consoleMessages = [];

    window.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Reload to capture console messages from start
    await window.reload();
    await window.waitForLoadState('networkidle');
    await window.waitForTimeout(2000);

    // Check for expected console messages (PRELOAD-based now)
    const hasPreloadMessage = consoleMessages.some(msg =>
      msg.includes('[PRELOAD]') ||
      msg.includes('Login modal hiding initialized')
    );

    const hasCSSInjectionMessage = consoleMessages.some(msg =>
      msg.includes('Injected login hide CSS')
    );

    expect(hasPreloadMessage).toBe(true);
    expect(hasCSSInjectionMessage).toBe(true);
  });
});
