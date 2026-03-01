/**
 * Kizuku Branding Integration
 * Replaces Penpot branding with Kizuku branding throughout the interface
 * Note: KIZUKU_LOGO_SVG is injected by main.js before this script executes
 */

/* global KIZUKU_LOGO_SVG, getComputedStyle */

console.log('🎨 Kizuku branding integration loaded');

/**
 * Build a palette SVG icon for the guidelines button.
 * @returns {string} SVG markup string
 */
function buildPaletteIconSVG() {
  return [
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">',
    '  <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2.5 2.5 0 0 0 ',
    '2.5-2.5c0-.61-.23-1.21-.64-1.67a.528.528 0 0 1 .12-.74c.18-.14.4-.',
    '21.64-.21H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zM6.5 13a1.5 ',
    '1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 ',
    '0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 ',
    '0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
    '</svg>',
  ].join('');
}

/**
 * Inject the guidelines toggle button after the Kizuku logo.
 * @returns {boolean} True if injection succeeded
 */
function injectGuidelinesButton() {
  const logo = document.getElementById('kizuku-logo-container');
  if (!logo) {
    return false;
  }

  if (document.getElementById('kizuku-guidelines-btn')) {
    return true;
  }

  const btn = document.createElement('button');
  btn.id = 'kizuku-guidelines-btn';
  btn.className = 'kizuku-guidelines-btn';
  btn.title = 'Brand Guidelines';
  btn.innerHTML = buildPaletteIconSVG();
  btn.addEventListener('click', () => {
    if (typeof globalThis._kizukuToggleGuidelines === 'function') {
      globalThis._kizukuToggleGuidelines();
    }
  });

  logo.insertAdjacentElement('afterend', btn);
  console.log('✅ Guidelines button injected');
  return true;
}

// Create and inject logo into sidebar
function injectKizukuLogo() {
  // Find the sidebar using multiple selectors
  const sidebar = document.querySelector(
    '.main_ui_dashboard__dashboard-sidebar, ' +
      '.main_ui_workspace__left-sidebar, ' +
      'aside[class*="sidebar"], ' +
      'nav[class*="sidebar"], ' +
      'div[class*="dashboard-sidebar"]'
  );

  if (!sidebar) {
    console.log('⏳ Sidebar not found yet, will retry');
    return false;
  }

  console.log('✅ Sidebar found:', sidebar.className);

  // Remove existing logo if present
  const existing = document.getElementById('kizuku-logo-container');
  if (existing) {
    existing.remove();
  }

  const logoContainer = document.createElement('div');
  logoContainer.id = 'kizuku-logo-container';
  logoContainer.className = 'kizuku-logo-container';

  // Use imported SVG constant
  logoContainer.innerHTML = KIZUKU_LOGO_SVG;

  // Insert logo at the top of the sidebar
  sidebar.prepend(logoContainer);
  console.log('✅ Kizuku logo injected');
  return true;
}

// Helper: Get replacement for case-preserved text
function getCasePreservedReplacement(match) {
  if (match === 'PENPOT') {
    return 'KIZUKU';
  }
  if (match === 'Penpot') {
    return 'Kizuku';
  }
  if (match === 'penpot') {
    return 'kizuku';
  }
  return 'Kizuku';
}

// Helper: Replace text in text nodes
function replaceTextNode(node) {
  const text = node.textContent;
  if (text && /penpot/i.test(text)) {
    node.textContent = text.replaceAll(/penpot/gi, getCasePreservedReplacement);
  }
}

// Helper: Replace text in element attributes
function replaceElementAttributes(node) {
  if (node.hasAttribute('title')) {
    const title = node.getAttribute('title');
    if (/penpot/i.test(title)) {
      node.setAttribute('title', title.replaceAll(/penpot/gi, 'Kizuku'));
    }
  }
  if (node.hasAttribute('placeholder')) {
    const placeholder = node.getAttribute('placeholder');
    if (/penpot/i.test(placeholder)) {
      node.setAttribute('placeholder', placeholder.replaceAll(/penpot/gi, 'Kizuku'));
    }
  }
}

// Function to replace text content
function replacePenpotWithKizuku(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    replaceTextNode(node);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  // Don't replace in script or style tags
  if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
    return;
  }

  // Replace in attributes
  replaceElementAttributes(node);

  // Recurse through children
  for (const child of node.childNodes) {
    replacePenpotWithKizuku(child);
  }
}

// Replace "Your Penpot" with "Kizuku"
function replaceYourPenpot() {
  const elements = document.querySelectorAll('*');
  elements.forEach((el) => {
    if (el.textContent?.trim() === 'Your Penpot') {
      el.textContent = 'Kizuku';
    }
  });
}

/**
 * Replace the favicon with the Kizuku icon
 */
function replaceFavicon() {
  const existing = document.querySelector('link[rel*="icon"]');
  if (existing) {
    existing.remove();
  }
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(KIZUKU_LOGO_SVG);
  document.head.appendChild(link);
  document.title = document.title.replaceAll(/penpot/gi, 'Kizuku');
}

/**
 * Build accent color CSS from theme or defaults
 * @returns {string} CSS text for accent overrides
 */
function buildAccentCSS() {
  const primary =
    getComputedStyle(document.documentElement).getPropertyValue('--kizuku-primary').trim() ||
    '#35f6e6';
  const primaryDark =
    getComputedStyle(document.documentElement).getPropertyValue('--kizuku-primary-dark').trim() ||
    '#27bdb1';
  return [
    ':root {',
    `  --color-primary: ${primary} !important;`,
    `  --color-primary-dark: ${primaryDark} !important;`,
    `  --color-accent: ${primary} !important;`,
    '}',
    '.main-logo, [class*="penpot-logo"] { display: none !important; }',
  ].join('\n');
}

/**
 * Inject CSS to override PenPot accent colors with Kizuku theme
 */
function injectAccentColors() {
  const existingStyle = document.getElementById('kizuku-accent-css');
  if (existingStyle) {
    existingStyle.textContent = buildAccentCSS();
    return;
  }
  const style = document.createElement('style');
  style.id = 'kizuku-accent-css';
  style.textContent = buildAccentCSS();
  document.head.appendChild(style);
}

// Initial replacement
function applyBranding() {
  console.log('🎨 Applying Kizuku branding...');
  replaceFavicon();
  injectAccentColors();
  replacePenpotWithKizuku(document.body);
  replaceYourPenpot();
}

// Global observer reference to prevent duplicates
globalThis._kizukuBrandingObserver = globalThis._kizukuBrandingObserver || null;

// Watch for DOM changes and reapply branding
function setupBrandingObserver() {
  // Disconnect existing observer if present
  if (globalThis._kizukuBrandingObserver) {
    globalThis._kizukuBrandingObserver.disconnect();
  }

  // Create new observer
  globalThis._kizukuBrandingObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          replacePenpotWithKizuku(node);
        }
      }
    }
    replaceYourPenpot();
    // Re-inject guidelines button if logo exists but button was removed
    if (!document.getElementById('kizuku-guidelines-btn')) {
      injectGuidelinesButton();
    }
  });

  // Start observing
  globalThis._kizukuBrandingObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  console.log('✅ Kizuku branding observer active');
}

// Retry function with multiple attempts
function retryInjection(fn, name, attempts = 10, delay = 500) {
  let attempt = 0;
  const tryInject = () => {
    attempt++;
    console.log(`Attempting ${name} (${attempt}/${attempts})...`);
    const success = fn();
    if (!success && attempt < attempts) {
      setTimeout(tryInject, delay);
    } else if (success) {
      console.log(`✅ ${name} successful`);
    } else {
      console.warn(`⚠️ ${name} failed after ${attempts} attempts`);
    }
  };
  tryInject();
}

// Guard to prevent multiple initializations
if (globalThis._kizukuBrandingInitialized) {
  console.log('⏭️  Kizuku branding already initialized, skipping');
} else {
  globalThis._kizukuBrandingInitialized = true;

  // Main initialization function
  const initializeBranding = () => {
    if (!document.body) {
      console.warn('⚠️  document.body not ready, retrying in 100ms');
      setTimeout(initializeBranding, 100);
      return;
    }

    // Start observing after a short delay
    setTimeout(() => {
      retryInjection(injectKizukuLogo, 'Logo injection');
      retryInjection(injectGuidelinesButton, 'Guidelines button');
      applyBranding();
      setupBrandingObserver();
    }, 1000);

    // Also apply on page visibility change (when tab becomes active)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(applyBranding, 100);
      }
    });
  };

  // Start initialization (with DOM ready check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBranding);
  } else {
    initializeBranding();
  }
}
