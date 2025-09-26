/**
 * Loading screen helpers - broken out to keep main.js under 500 lines
 */

// Helper function to create loading structure JS
function createLoadingStructureJS() {
  return `
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'app-loading-screen';
    loadingOverlay.className = 'loading-screen';
    
    const content = document.createElement('div');
    content.className = 'loading-screen__content';
  `;
}

// Helper function to create loading content JS
function createLoadingContentJS() {
  return createFontImport() + createTitleElement() + createLogoElement() + createSpinnerElement();
}

function createFontImport() {
  return `
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&display=swap';
    document.head.appendChild(link);
  `;
}

function createTitleElement() {
  return `
    const title = document.createElement('h1');
    title.className = 'loading-screen__title loading-title';
    title.textContent = 'Kizu';
    title.style.fontFamily = "'Josefin Sans', sans-serif";
    title.style.fontWeight = '400';
    title.style.fontSize = '4rem';
    title.style.letterSpacing = '-0.02em';
    title.style.color = '#FFFFFF';
    title.style.margin = '0 0 2px 0';
  `;
}

function createLogoElement() {
  return `
    const logoContainer = document.createElement('div');
    logoContainer.style.display = 'flex';
    logoContainer.style.justifyContent = 'center';
    logoContainer.style.alignItems = 'center';
    logoContainer.style.margin = '0 0 16px 0';
    logoContainer.style.padding = '0';
    logoContainer.style.background = 'none';
    logoContainer.style.border = 'none';
    logoContainer.innerHTML = '<svg width="80" height="70" viewBox="0 0 400 350" fill="none">' +
      '<path d="M200 50 L320 280 L80 280 Z" fill="#11605A"/>' +
      '<path d="M200 50 L140 170 L80 280 L200 230 Z" fill="#27BDB1"/>' +
      '<path d="M200 230 L320 280 L80 280 L200 230 Z" fill="#35F6E6"/>' +
      '</svg>';
  `;
}

function createSpinnerElement() {
  const systemFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  return `
    const spinnerContainer = document.createElement('div');
    spinnerContainer.style.display = 'flex';
    spinnerContainer.style.justifyContent = 'center';
    spinnerContainer.style.marginBottom = '24px';

    const spinner = document.createElement('div');
    spinner.className = 'loading-screen__spinner';

    const status = document.createElement('div');
    status.className = 'loading-screen__status loading-screen__status--pulse';
    status.textContent = 'Loading workspace...';
    status.style.fontFamily = "${systemFont}";
    status.style.fontSize = '0.875rem';
    status.style.marginTop = '8px';
  `;
}

// Helper function to create loading assembly JS
function createLoadingAssemblyJS() {
  return `
    spinnerContainer.appendChild(spinner);

    content.appendChild(title);
    content.appendChild(logoContainer);
    content.appendChild(spinnerContainer);
    content.appendChild(status);
    loadingOverlay.appendChild(content);

    document.body.appendChild(loadingOverlay);
  `;
}

// Helper function to create loading screen elements
function createLoadingScreenJS() {
  const structureJS = createLoadingStructureJS();
  const contentJS = createLoadingContentJS();
  const assemblyJS = createLoadingAssemblyJS();

  return `
    console.log('🎬 Creating loading overlay');
    ${structureJS}
    ${contentJS}
    ${assemblyJS}
    console.log('✅ Loading overlay created');
  `;
}

// Helper function to create hide loading JS
function createHideLoadingJS() {
  return `
    console.log('🎬 Hiding loading overlay');
    const loadingScreen = document.getElementById('app-loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('loading-screen--hidden');
      setTimeout(() => {
        loadingScreen.remove();
        console.log('✅ Loading overlay removed');
      }, 500);
    }
  `;
}

// Helper function to show loading screen
function showLoadingScreen(window) {
  setTimeout(() => {
    if (window && !window.isDestroyed()) {
      const jsCode = createLoadingScreenJS();

      window.webContents
        .executeJavaScript(jsCode)
        .catch((err) => console.log('Loading overlay failed:', err));
    }
  }, 100);
}

// Helper function to hide loading screen
function hideLoadingScreen(window) {
  setTimeout(() => {
    if (window && !window.isDestroyed()) {
      const jsCode = createHideLoadingJS();
      window.webContents
        .executeJavaScript(jsCode)
        .catch((err) => console.log('Hide loading failed:', err));
    }
  }, 2500);
}

module.exports = {
  showLoadingScreen,
  hideLoadingScreen,
};
