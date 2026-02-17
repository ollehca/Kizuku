/**
 * Kizu Branding Integration
 * Replaces Penpot branding with Kizu branding throughout the interface
 * Note: KIZU_LOGO_SVG is injected by main.js before this script executes
 */

/* global KIZU_LOGO_SVG, getComputedStyle */

console.log('🎨 Kizu branding integration loaded');

// Create and inject logo into sidebar
function injectKizuLogo() {
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
  const existing = document.getElementById('kizu-logo-container');
  if (existing) {
    existing.remove();
  }

  const logoContainer = document.createElement('div');
  logoContainer.id = 'kizu-logo-container';
  logoContainer.className = 'kizu-logo-container';

  // Use imported SVG constant
  logoContainer.innerHTML = KIZU_LOGO_SVG;

  // Insert logo at the top of the sidebar
  sidebar.prepend(logoContainer);
  console.log('✅ Kizu logo injected');
  return true;
}

// Helper: Get replacement for case-preserved text
function getCasePreservedReplacement(match) {
  if (match === 'PENPOT') {
    return 'KIZU';
  }
  if (match === 'Penpot') {
    return 'Kizu';
  }
  if (match === 'penpot') {
    return 'kizu';
  }
  return 'Kizu';
}

// Helper: Replace text in text nodes
function replaceTextNode(node) {
  const text = node.textContent;
  if (text && /penpot/i.test(text)) {
    node.textContent = text.replace(/penpot/gi, getCasePreservedReplacement);
  }
}

// Helper: Replace text in element attributes
function replaceElementAttributes(node) {
  if (node.hasAttribute('title')) {
    const title = node.getAttribute('title');
    if (/penpot/i.test(title)) {
      node.setAttribute('title', title.replace(/penpot/gi, 'Kizu'));
    }
  }
  if (node.hasAttribute('placeholder')) {
    const placeholder = node.getAttribute('placeholder');
    if (/penpot/i.test(placeholder)) {
      node.setAttribute('placeholder', placeholder.replace(/penpot/gi, 'Kizu'));
    }
  }
}

// Function to replace text content
function replacePenpotWithKizu(node) {
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
    replacePenpotWithKizu(child);
  }
}

// Replace "Your Penpot" with "Kizu"
function replaceYourPenpot() {
  const elements = document.querySelectorAll('*');
  elements.forEach((el) => {
    if (el.textContent && el.textContent.trim() === 'Your Penpot') {
      el.textContent = 'Kizu';
    }
  });
}

/**
 * Replace the favicon with the Kizu icon
 */
function replaceFavicon() {
  const existing = document.querySelector('link[rel*="icon"]');
  if (existing) {
    existing.remove();
  }
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(KIZU_LOGO_SVG);
  document.head.appendChild(link);
  document.title = document.title.replace(/penpot/gi, 'Kizu');
}

/**
 * Build accent color CSS from theme or defaults
 * @returns {string} CSS text for accent overrides
 */
function buildAccentCSS() {
  const primary =
    getComputedStyle(document.documentElement).getPropertyValue('--kizu-primary').trim() ||
    '#35f6e6';
  const primaryDark =
    getComputedStyle(document.documentElement).getPropertyValue('--kizu-primary-dark').trim() ||
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
 * Inject CSS to override PenPot accent colors with Kizu theme
 */
function injectAccentColors() {
  const existingStyle = document.getElementById('kizu-accent-css');
  if (existingStyle) {
    existingStyle.textContent = buildAccentCSS();
    return;
  }
  const style = document.createElement('style');
  style.id = 'kizu-accent-css';
  style.textContent = buildAccentCSS();
  document.head.appendChild(style);
}

// Initial replacement
function applyBranding() {
  console.log('🎨 Applying Kizu branding...');
  replaceFavicon();
  injectAccentColors();
  replacePenpotWithKizu(document.body);
  replaceYourPenpot();
}

// Global observer reference to prevent duplicates
window._kizuBrandingObserver = window._kizuBrandingObserver || null;

// Watch for DOM changes and reapply branding
function setupBrandingObserver() {
  // Disconnect existing observer if present
  if (window._kizuBrandingObserver) {
    window._kizuBrandingObserver.disconnect();
  }

  // Create new observer
  window._kizuBrandingObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          replacePenpotWithKizu(node);
        }
      }
    }
    replaceYourPenpot();
  });

  // Start observing
  window._kizuBrandingObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  console.log('✅ Kizu branding observer active');
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
if (!window._kizuBrandingInitialized) {
  window._kizuBrandingInitialized = true;

  // Main initialization function
  const initializeBranding = () => {
    if (!document.body) {
      console.warn('⚠️  document.body not ready, retrying in 100ms');
      setTimeout(initializeBranding, 100);
      return;
    }

    // Start observing after a short delay
    setTimeout(() => {
      retryInjection(injectKizuLogo, 'Logo injection');
      // Don't inject user account - PenPot already has one at the bottom
      // retryInjection(injectUserAccount, 'User account injection');
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
} else {
  console.log('⏭️  Kizu branding already initialized, skipping');
}
