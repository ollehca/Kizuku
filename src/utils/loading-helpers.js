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
  return `
    const logo = document.createElement('div');
    logo.className = 'loading-screen__logo';
    logo.textContent = 'PD';
    
    const title = document.createElement('h1');
    title.className = 'loading-screen__title';
    title.textContent = 'PenPot Desktop';
    
    const subtitle = document.createElement('p');
    subtitle.className = 'loading-screen__subtitle';
    subtitle.textContent = 'Professional Design Tool';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-screen__spinner';
    
    const status = document.createElement('div');
    status.className = 'loading-screen__status loading-screen__status--pulse';
    status.textContent = 'Loading workspace...';
  `;
}

// Helper function to create loading assembly JS
function createLoadingAssemblyJS() {
  return `
    content.appendChild(logo);
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(spinner);
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