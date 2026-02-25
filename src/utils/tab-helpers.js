/**
 * Tab functionality helpers - broken out to keep main.js under 500 lines
 */

/**
 * Create header bar DOM element JS strings
 * @returns {string} JavaScript source for header elements
 */
function createHeaderElements() {
  return `
    var container = document.createElement('div');
    container.className = 'desktop-tabs__container';
    container.id = 'desktop-tab-container';

    var leftDrag = document.createElement('div');
    leftDrag.className = 'desktop-tabs__drag-left';

    var homeBtn = document.createElement('div');
    homeBtn.className = 'desktop-tabs__home-btn';
    homeBtn.title = 'Dashboard';
    homeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">'
      + '<path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"/></svg>';
    homeBtn.addEventListener('click', function() {
      if (window.electronAPI) {
        window.electronAPI.navigateDashboard();
      }
    });
    leftDrag.appendChild(homeBtn);

    var tabBar = document.createElement('div');
    tabBar.className = 'desktop-tabs__bar';
    tabBar.id = 'desktop-tab-bar';

    var newTabBtn = document.createElement('div');
    newTabBtn.className = 'desktop-tabs__new-btn';
    newTabBtn.title = 'New File';
    newTabBtn.textContent = '+';
    newTabBtn.addEventListener('click', function() {
      if (window.electronAPI) {
        window.electronAPI.createNewFile();
      }
    });

    var centerDrag = document.createElement('div');
    centerDrag.className = 'desktop-tabs__drag-center';

    var rightDrag = document.createElement('div');
    rightDrag.className = 'desktop-tabs__drag-right';
  `;
}

/**
 * Create header bar structure JavaScript
 * @returns {string} JavaScript source for header bar
 */
function createHeaderBarJS() {
  const elementsJS = createHeaderElements();

  return `
    console.log('🎨 Creating structured header bar');
    
    const existing = document.getElementById('desktop-tab-container');
    if (existing) existing.remove();
    
    ${elementsJS}
    
    container.appendChild(leftDrag);
    container.appendChild(tabBar);
    container.appendChild(newTabBtn);
    container.appendChild(centerDrag);
    container.appendChild(rightDrag);
    
    document.body.classList.add('has-desktop-tabs');
    document.body.appendChild(container);
    
    console.log('✅ Header bar created with tab functionality');
  `;
}

/**
 * Create tab element rendering JavaScript
 * @returns {string} JavaScript source for tab elements
 */
function createTabElementJS() {
  return `
    tabs.forEach(function(tab, tabIndex) {
      var tabElement = document.createElement('div');
      tabElement.className = 'desktop-tabs__tab' +
        (tab.isActive ? ' desktop-tabs__tab--active' : '');
      tabElement.setAttribute('data-tab-id', tab.id);
      tabElement.setAttribute('data-tab-index', tabIndex);
      tabElement.draggable = true;

      var tabName = document.createElement('div');
      tabName.className = 'desktop-tabs__tab-name';
      tabName.textContent = tab.name;
      tabName.title = tab.name;

      var tabClose = document.createElement('div');
      tabClose.className = 'desktop-tabs__tab-close';
      tabClose.textContent = '×';
  `;
}

/**
 * Create tab event handler JavaScript
 * @returns {string} JavaScript source for tab events
 */
function createTabEventJS() {
  return `
      tabName.addEventListener('click', function() {
        if (window.electronAPI) {
          window.electronAPI.switchTab(tab.id);
        }
      });

      tabClose.addEventListener('click', function(evt) {
        evt.stopPropagation();
        if (window.electronAPI) {
          window.electronAPI.removeTab(tab.id);
        }
      });

      tabElement.addEventListener('dragstart', function(evt) {
        evt.dataTransfer.setData('text/plain', tabIndex);
        tabElement.classList.add('desktop-tabs__tab--dragging');
      });

      tabElement.addEventListener('dragover', function(evt) {
        evt.preventDefault();
        tabElement.classList.add('desktop-tabs__tab--drag-over');
      });

      tabElement.addEventListener('dragleave', function() {
        tabElement.classList.remove('desktop-tabs__tab--drag-over');
      });

      tabElement.addEventListener('drop', function(evt) {
        evt.preventDefault();
        tabElement.classList.remove('desktop-tabs__tab--drag-over');
        var fromIdx = parseInt(evt.dataTransfer.getData('text/plain'), 10);
        var toIdx = tabIndex;
        if (fromIdx !== toIdx && window.electronAPI) {
          window.electronAPI.reorderTabs(fromIdx, toIdx);
        }
      });

      tabElement.addEventListener('dragend', function() {
        tabElement.classList.remove('desktop-tabs__tab--dragging');
      });

      tabElement.appendChild(tabName);
      tabElement.appendChild(tabClose);
      tabBar.appendChild(tabElement);
    });
  `;
}

/**
 * Generate updateTabsDisplay function JavaScript
 * @returns {string} JavaScript source for tab display updater
 */
function createUpdateTabsJS() {
  const tabElementJS = createTabElementJS();
  const tabEventJS = createTabEventJS();

  return `
    window.updateTabsDisplay = function(tabs) {
      console.log('📋 Updating tabs display:', tabs.length, 'tabs');
      var tabBar = document.getElementById('desktop-tab-bar');
      if (!tabBar) { return; }

      tabBar.innerHTML = '';

      ${tabElementJS}
      ${tabEventJS}
    };
  `;
}

/**
 * Create tab functionality JS for injection into renderer
 * @returns {string} JavaScript source code
 */
function createTabFunctionalityJS() {
  const updateTabsJS = createUpdateTabsJS();

  return `
    ${updateTabsJS}

    if (window.electronAPI && !window.__kizukuTabListenerRegistered) {
      window.__kizukuTabListenerRegistered = true;
      window.electronAPI.onTabsUpdated(function(tabs) {
        window.__kizukuCurrentTabs = tabs;
        if (window.updateTabsDisplay) {
          window.updateTabsDisplay(tabs);
        }
      });
      window.electronAPI.getTabs().then(function(tabs) {
        console.log('🔄 Loaded tabs from main:', tabs);
        window.__kizukuCurrentTabs = tabs;
        if (tabs.length > 0 && window.updateTabsDisplay) {
          window.updateTabsDisplay(tabs);
        }
      });
    }
  `;
}

/**
 * Build the persistence JS that keeps the header bar alive
 * @returns {string} JavaScript source code
 */
function buildPersistenceJS() {
  const headerJS = createHeaderBarJS();
  const tabJS = createTabFunctionalityJS();

  return `
    ${tabJS}

    function ensureHeaderBar() {
      if (!document.getElementById('desktop-tab-container')) {
        console.log('🔄 Header bar missing, recreating...');
        ${headerJS}
      }
      var cached = window.__kizukuCurrentTabs;
      if (cached && cached.length > 0 && window.updateTabsDisplay) {
        window.updateTabsDisplay(cached);
      }
    }

    if (typeof window.headerObserver === 'undefined') {
      window.headerObserver = new MutationObserver(function() {
        if (!document.getElementById('desktop-tab-container')) {
          setTimeout(ensureHeaderBar, 100);
        }
      });
      window.headerObserver.observe(document.body, {
        childList: true
      });
    }

    ensureHeaderBar();

    if (typeof window.headerInterval === 'undefined') {
      window.headerInterval = setInterval(ensureHeaderBar, 3000);
    }
  `;
}

/**
 * Create header bar with persistence across navigations
 * @param {object} win - BrowserWindow instance
 */
function createHeaderBar(win) {
  const cssManager = require('./css-manager');

  const injectHeaderWithCSS = () => {
    if (!win || win.isDestroyed()) {
      return;
    }
    cssManager.injectCSSFiles(win);
    const persistenceJS = buildPersistenceJS();
    win.webContents
      .executeJavaScript(persistenceJS)
      .then(() => console.log('✅ Header bar system activated'))
      .catch((err) => {
        console.log('Header creation deferred:', err.message);
      });
  };

  setTimeout(injectHeaderWithCSS, 1000);

  win.webContents.on('did-finish-load', () => {
    setTimeout(injectHeaderWithCSS, 500);
  });

  win.webContents.on('did-navigate-in-page', () => {
    setTimeout(injectHeaderWithCSS, 300);
  });
}

module.exports = {
  createHeaderBar,
};
